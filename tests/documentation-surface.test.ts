import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const guideRoot = resolve(root, "docs/guides");
const expectedGuides = [
  "ai-assisted-governed-workflow.md",
  "authoring.md",
  "first-use-and-manual-install.md",
  "power-of-two-workbook-design.md",
  "project-setup-and-integration.md",
  "response-packets.md",
  "styling.md",
  "troubleshooting-and-recovery.md"
];

describe("power-of-two public guide surface", () => {
  it("contains exactly eight distinct procedural guides", () => {
    expect(readdirSync(guideRoot).filter((path) => path.endsWith(".md")).sort()).toEqual(expectedGuides);
  });

  it("routes every guide from the human README and keeps the agent start file at 256 physical lines", () => {
    const readme = readFileSync(resolve(root, "README.md"), "utf8");
    const llms = readFileSync(resolve(root, "llms.txt"), "utf8");
    for (const guide of expectedGuides) expect(readme).toContain(`docs/guides/${guide}`);
    for (const guide of ["ai-assisted-governed-workflow.md", "authoring.md", "power-of-two-workbook-design.md", "project-setup-and-integration.md", "response-packets.md", "styling.md", "troubleshooting-and-recovery.md"]) {
      expect(llms).toContain(`docs/guides/${guide}`);
    }
    expect(llms.endsWith("\n")).toBe(true);
    expect(llms.split("\n").slice(0, -1)).toHaveLength(256);
  });

  it("keeps each component guide bounded by its implemented effect ceiling", () => {
    const packets = readFileSync(resolve(guideRoot, "response-packets.md"), "utf8");
    const workflow = readFileSync(resolve(guideRoot, "ai-assisted-governed-workflow.md"), "utf8");
    const setup = readFileSync(resolve(guideRoot, "project-setup-and-integration.md"), "utf8");
    expect(packets).toContain("cannot overwrite, append, rename, delete, search, scan");
    expect(workflow).toContain("The plugin has no automatic knowledge-system write-back");
    expect(setup).toContain("does not implement a general admission port");
  });

  it("keeps current identity, version, settings, and release guidance aligned", () => {
    const llms = readFileSync(resolve(root, "llms.txt"), "utf8");
    const firstUse = readFileSync(resolve(guideRoot, "first-use-and-manual-install.md"), "utf8");
    const release = readFileSync(resolve(root, "docs/maintainers/release.md"), "utf8");
    expect(llms).toContain("Current source version: read root `manifest.json` rather than cached prose");
    expect(llms).not.toContain("Current candidate: `0.0.29`");
    expect(firstUse).toContain("matches the root manifest version");
    expect(firstUse).toContain("Plugin presentation preferences live in plugin-owned `data.json`");
    expect(firstUse).not.toContain("when present in a later candidate");
    expect(release).toContain("Worksheet 18 accepted `hearth-and-code-governance-lab`");
    expect(release).not.toContain("Governance Lab pair is a proposal");
    expect(release.match(/^\d+\./gm)).toHaveLength(8);
  });
});
