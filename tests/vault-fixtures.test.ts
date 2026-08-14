import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

import { parseInteraction } from "../src/core/parse";
import { parseCandidateInteraction } from "../src/grammar";
import { buildHccViewModel, validateHccViewCandidate } from "../src/visualization";
import { parseWorkbook, parseWorksheet } from "../src/workbook";

const vaultRoot = resolve(process.cwd(), "scratch-vault");
const markdownFiles = walk(vaultRoot).filter((path) => path.endsWith(".md"));

describe("scratch-vault evaluation fixtures", () => {
  it("parses every declared frontmatter document", () => {
    for (const path of markdownFiles) {
      const source = readFileSync(path, "utf8");
      if (!source.startsWith("---\n")) continue;
      const end = source.indexOf("\n---\n", 4);
      expect(end, path).toBeGreaterThan(4);
      expect(() => yaml.load(source.slice(4, end), { schema: yaml.JSON_SCHEMA }), path).not.toThrow();
    }
  });

  it("keeps all non-diagnostic interaction fences valid", () => {
    for (const path of markdownFiles) {
      if (path.endsWith("Test Hub/03 Diagnostics and Drift Lab.md") || path.endsWith("Phase 0 Fixture Gallery.md")) continue;
      for (const source of interactionFences(readFileSync(path, "utf8"))) {
        const released = parseInteraction(source);
        const result = released.ok ? released : parseCandidateInteraction(source);
        expect(result, `${path}\n${JSON.stringify(result)}`).toMatchObject({ ok: true });
      }
    }
  });

  it("keeps every declarative visualization fixture valid", () => {
    for (const path of markdownFiles) {
      for (const source of viewFences(readFileSync(path, "utf8"))) {
        const candidate = yaml.load(source, { schema: yaml.JSON_SCHEMA });
        const result = validateHccViewCandidate(candidate);
        expect(result, path).toMatchObject({ ok: true });
        if (result.ok) expect(buildHccViewModel(result.view).state, path).not.toBe("invalid");
      }
    }
  });

  it("keeps every worksheet and workbook composition fixture valid", () => {
    for (const path of markdownFiles) {
      const source = readFileSync(path, "utf8");
      formFences(source).forEach((fence) => expect(parseWorksheet(fence), path).toMatchObject({ ok: true }));
      workbookFences(source).forEach((fence) => expect(parseWorkbook(fence), path).toMatchObject({ ok: true }));
    }
  });

  it("keeps every diagnostics-lab fence invalid", () => {
    const path = join(vaultRoot, "Test Hub/03 Diagnostics and Drift Lab.md");
    if (!existsSync(path)) return;
    const fences = interactionFences(readFileSync(path, "utf8"));
    expect(fences).toHaveLength(7);
    fences.forEach((source) => expect(parseInteraction(source).ok).toBe(false));
  });

  it("retains the original gallery's three valid and two invalid fixtures", () => {
    const path = join(vaultRoot, "Phase 0 Fixture Gallery.md");
    if (!existsSync(path)) return;
    const results = interactionFences(readFileSync(path, "utf8")).map((source) => parseInteraction(source).ok);
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("contains exact one, ten, and fifty block performance fixtures", () => {
    if (!existsSync(join(vaultRoot, "Performance"))) return;
    expect(fenceCount("Performance/01 One Block Fixture.md")).toBe(1);
    expect(fenceCount("Performance/10 Ten Block Fixture.md")).toBe(10);
    expect(fenceCount("Performance/50 Fifty Block Fixture.md")).toBe(50);
  });

  it("resolves every synthetic wikilink except the intentional missing-target fixture", () => {
    const unresolved: string[] = [];
    for (const path of markdownFiles) {
      const source = readFileSync(path, "utf8");
      for (const match of source.matchAll(/\[\[([^\]]+)\]\]/g)) {
        const raw = match[1]!;
        const target = raw.split("|", 1)[0]!.split("#", 1)[0]!.trim();
        if (target === "Reference Notes/Missing Synthetic Target") continue;
        const candidates = [join(vaultRoot, `${target}.md`), join(vaultRoot, target)];
        if (!candidates.some(existsSync)) unresolved.push(`${path}: ${target}`);
      }
    }
    expect(unresolved).toEqual([]);
  });

  it("ships the complete fifteen-note public guided route", () => {
    const guided = [
      "00 Start Here.md", "README.md",
      ...Array.from({ length: 8 }, (_, index) => `Guided Tour/0${index + 1} ${[
        "Orientation and Safety", "Configure the Plugin", "Ask an Agent to Author", "Validate the Artifact",
        "Complete a Worksheet", "Preserve and Amend Responses", "Review Projections and Governance", "Integrate with a Knowledge System"
      ][index]}.md`),
      "Workbooks/Governance Lab Guided Workbook.md",
      "Worksheets/01 Guided Orientation.md", "Worksheets/02 Agent Authoring Request.md",
      "Worksheets/03 Response Lifecycle Practice.md", "Worksheets/04 Integration Readiness Review.md"
    ];
    for (const path of guided) expect(existsSync(join(vaultRoot, path)), path).toBe(true);
  });
});

function interactionFences(source: string): string[] {
  return [...source.matchAll(/```hcc-interaction\n([\s\S]*?)\n```/g)].map((match) => match[1]!);
}

function viewFences(source: string): string[] {
  return [...source.matchAll(/```hcc-view\n([\s\S]*?)\n```/g)].map((match) => match[1]!);
}

function formFences(source: string): string[] {
  return [...source.matchAll(/```hcc-form\n([\s\S]*?)\n```/g)].map((match) => match[1]!);
}

function workbookFences(source: string): string[] {
  return [...source.matchAll(/```hcc-workbook\n([\s\S]*?)\n```/g)].map((match) => match[1]!);
}

function fenceCount(relativePath: string): number {
  return interactionFences(readFileSync(join(vaultRoot, relativePath), "utf8")).length;
}

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
