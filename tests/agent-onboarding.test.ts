import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const skills = ["author-hcc-content", "design-hcc-workbook", "hearthandcode-governance-obsidian", "operate-hcc-responses", "project-hcc-governance"];
const lessons = [
  "00-first-orientation.md",
  "01-install-and-verify.md",
  "02-first-form.md",
  "03-workbooks.md",
  "04-response-packets.md",
  "05-views-and-styling.md",
  "06-governance-studio-exchange.md",
  "07-agent-operations-and-recovery.md"
];

describe("power-of-two agent onboarding surface", () => {
  it("keeps llms.txt at exactly 256 physical lines in sixteen equal sections", () => {
    const source = readFileSync(resolve(root, "llms.txt"), "utf8");
    expect(source.endsWith("\n")).toBe(true);
    const lines = source.split("\n").slice(0, -1);
    expect(lines).toHaveLength(256);
    const headings = lines.map((line, index) => ({ line, index: index + 1 })).filter(({ line }) => line.startsWith("## "));
    expect(headings).toHaveLength(15);
    expect(headings.map(({ index }) => index)).toEqual([17, 33, 49, 65, 81, 97, 113, 129, 145, 161, 177, 193, 209, 225, 241]);
  });

  it("ships one orchestration skill plus four triggerable specialist skills with matching harness metadata", () => {
    expect(readdirSync(resolve(root, "skills")).sort()).toEqual(skills);
    for (const name of skills) {
      const skill = readFileSync(resolve(root, "skills", name, "SKILL.md"), "utf8");
      const metadata = readFileSync(resolve(root, "skills", name, "agents/openai.yaml"), "utf8");
      expect(skill).toMatch(new RegExp(`^---\\nname: ${name}\\ndescription: .+\\n---\\n`));
      expect(skill).not.toContain("TODO");
      expect(metadata).toContain(`$${name}`);
      expect(metadata).toContain("display_name:");
      expect(metadata).toContain("short_description:");
      expect(metadata).toContain("default_prompt:");
    }
  });

  it("ships eight progressive lessons plus one routed tutorial index", () => {
    const tutorialRoot = resolve(root, "docs/tutorials");
    expect(readdirSync(tutorialRoot).filter((path) => path.endsWith(".md")).sort()).toEqual([...lessons, "README.md"]);
    const index = readFileSync(resolve(tutorialRoot, "README.md"), "utf8");
    for (const lesson of lessons) {
      expect(statSync(resolve(tutorialRoot, lesson)).isFile()).toBe(true);
      expect(index).toContain(`](${lesson})`);
    }
    for (const id of ["01-plugin-identity", "02-first-form", "03-workbook", "04-response-preview", "05-view-ember", "06-dashboard", "07-studio", "08-host-assurance"]) {
      expect(index).toContain(`\`${id}\``);
    }
    expect(index).toContain("Do not simulate or generate product screenshots");
  });

  it("routes tutorials and skills through the public allowlist and disclosure categories", () => {
    const policy = JSON.parse(readFileSync(resolve(root, "config/public-source-policy.json"), "utf8")) as { includeDirectories: string[] };
    expect(policy.includeDirectories).toContain("docs/tutorials");
    expect(policy.includeDirectories).toContain("skills");
    const verifier = readFileSync(resolve(root, "scripts/verify-public-source-boundary.mjs"), "utf8");
    expect(verifier).toContain('path.startsWith("docs/tutorials/")');
    expect(verifier).toContain('path.startsWith("skills/")');
  });

  it("keeps vault-agent procedures inside the bounded effect ceiling", () => {
    const llms = readFileSync(resolve(root, "llms.txt"), "utf8");
    const responseSkill = readFileSync(resolve(root, "skills/operate-hcc-responses/SKILL.md"), "utf8");
    const governanceSkill = readFileSync(resolve(root, "skills/project-hcc-governance/SKILL.md"), "utf8");
    const orchestrationSkill = readFileSync(resolve(root, "skills/hearthandcode-governance-obsidian/SKILL.md"), "utf8");
    expect(llms).toContain("Never search the vault for a likely packet");
    expect(llms).toContain("No plugin surface writes to a canonical library or external knowledge system");
    expect(responseSkill).toContain("Do not overwrite, append, rename, delete");
    expect(governanceSkill).toContain("Never crawl backlinks, folders, tags, graphs, or packet directories");
    expect(orchestrationSkill).toContain("run `python3 05-mechanism-annex--forge/scripts/hub-artifact-path.py propose ...`");
    expect(orchestrationSkill).toContain("Never update a canonical source merely because a packet exists");
  });
});
