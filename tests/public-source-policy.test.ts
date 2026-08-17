import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const policy = JSON.parse(readFileSync(resolve(root, "config/public-source-policy.json"), "utf8")) as {
  version: string;
  mode: string;
  includeFiles: string[];
  includeDirectories: string[];
  excludePaths: string[];
  prohibitedSourceRoots: string[];
  effects: Record<string, boolean>;
};

describe("public-source disclosure policy", () => {
  it("uses a closed versioned allowlist", () => {
    expect(policy).toMatchObject({ version: "0.1-candidate.1", mode: "allowlist" });
    expect(policy.includeDirectories).toEqual(expect.arrayContaining(["src", "tests", "scripts", "docs/tutorials", "skills"]));
    expect(policy.includeDirectories.every((path: string) => !path.startsWith("scratch-vault/"))).toBe(true);
    expect(policy.includeDirectories).not.toContain("scratch-vault");
    expect(policy.includeFiles).toEqual(expect.arrayContaining([
      "README.md", "LICENSE", "manifest.json", "package-lock.json", "scratch-vault/README.md", "scratch-vault/00 Start Here.md",
      "scratch-vault/Workbooks/Governance Lab Guided Workbook.md", "scratch-vault/Worksheets/04 Integration Readiness Review.md"
    ]));
    expect(readFileSync(resolve(root, "config/release-admission.json"), "utf8")).toContain('"requiredGateCount": 8');
  });

  it("excludes every private source class and runtime-state root", () => {
    expect(policy.prohibitedSourceRoots).toEqual(["reviews", "docs/reviews", "docs/projectization"]);
    expect(policy.excludePaths).toEqual(expect.arrayContaining([
      "scratch-vault/.obsidian", "scratch-vault/Intake", "scratch-vault/.trash",
      "scratch-vault/cosmatrexis-cognitive-personality-ai-interaction-guide.md",
      "scratch-vault/Evaluation/25 Public Source Disclosure Gate.md",
      "scratch-vault/Worksheets/16 Public Source Disclosure Review.md",
      "tests/public-disclosure-response-packet.test.ts"
    ]));
  });

  it("keeps private packet-evidence tests out without excluding product tests", () => {
    for (const path of [
      "tests/final-readiness-packet.test.ts", "tests/host-projectization-packet.test.ts",
      "tests/release-candidate-acceptance-packet.test.ts", "tests/catalog-visualization-response-packet.test.ts",
      "tests/initial-release-hub-integration-packet.test.ts", "tests/authoring-writer-response-packet.test.ts",
      "tests/vault-canary-authorization.test.ts"
    ]) expect(policy.excludePaths, path).toContain(path);
    for (const path of ["tests/writer-core.test.ts", "tests/writer-security-corpus.test.ts", "tests/vault-response-adapter.test.ts", "tests/studio.test.ts"]) {
      expect(policy.excludePaths, path).not.toContain(path);
    }
  });

  it("admits only the read-only hosted-assurance workflow", () => {
    expect(policy.excludePaths).not.toContain(".github/workflows");
    const workflow = readFileSync(resolve(root, ".github/workflows/public-source-assurance.yml"), "utf8");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("npm run proof");
    expect(workflow).toContain("npm run proof:public-source");
    expect(workflow).toContain("npm audit --omit=dev");
    for (const prohibited of ["contents: write", "actions/upload-artifact", "secrets.", "deployment", "release create"]) expect(workflow).not.toContain(prohibited);
  });

  it("declares no external, Git, release, or publication effect", () => {
    expect(policy.effects).toEqual({ temporaryCopy: true, network: false, git: false, remote: false, release: false, publication: false });
    expect(JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).scripts["proof:public-source"]).toBe("node scripts/verify-public-source-boundary.mjs");
    expect(JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).scripts["review:public-disclosure"]).toContain("--manifest-only --write-disclosure-review reviews/phase-1.0/");
  });

  it("prepares an eight-category human disclosure packet without broadening effects", () => {
    const verifier = readFileSync(resolve(root, "scripts/verify-public-source-boundary.mjs"), "utf8");
    expect(verifier).toContain("const DISCLOSURE_CATEGORIES = [");
    expect((verifier.match(/\{ id: \"[a-z_]+\", label:/g) ?? [])).toHaveLength(8);
    expect(verifier).toContain('authority: "candidate-review-only"');
    expect(verifier).toContain("accept_exact_digest");
    expect(verifier).toContain("creates no Git repository, remote, hosted workflow, release, submission, or publication");
  });

  it("materializes only a fully proved, new, byte-identical local candidate", () => {
    const verifier = readFileSync(resolve(root, "scripts/verify-public-source-boundary.mjs"), "utf8");
    expect(verifier).toContain('process.argv.indexOf("--materialize")');
    expect(verifier).toContain("materialization requires the complete offline proof");
    expect(verifier).toContain("materialization target must not already exist");
    expect(verifier).toContain("materialized projection differs from the proved source set");
    expect(verifier).not.toContain('run("git"');
    expect(JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).scripts["materialize:public-source"]).toContain("--materialize");
  });
});
