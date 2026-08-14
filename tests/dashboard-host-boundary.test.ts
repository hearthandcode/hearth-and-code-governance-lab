import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("native dashboard host boundary", () => {
  it("uses one active body read plus explicit metadata resolution and exposes no scan or mutation API", () => {
    const source = readFileSync(resolve(root, "src/obsidian/dashboard-source.ts"), "utf8");
    expect(source).toContain("collectExplicitRelationships(sourceMetadata, [])");
    expect(source).toContain("app.vault.cachedRead(sourceFile)");
    expect(source).toContain("getFirstLinkpathDest(linkPath, sourceFile.path)");
    expect(source.match(/cachedRead\s*\(/g)).toHaveLength(1);
    expect(source).not.toMatch(/getFiles|getMarkdownFiles|iterateAllLeaves|vault\.(create|createFolder|modify|process|delete|rename)\s*\(/);
  });

  it("permits explicit clipboard export and exact-source navigation without adding a write surface", () => {
    const view = readFileSync(resolve(root, "src/obsidian/dashboard-view.ts"), "utf8");
    expect(view).toContain('assertCapabilityEffect("hcc.dashboard.native", "copy-to-clipboard")');
    expect(view).toContain('assertCapabilityEffect("hcc.dashboard.native", "read-explicit-authority")');
    expect(view).toContain("navigator.clipboard.writeText(value)");
    expect(view).toContain("this.app.workspace.openLinkText(path, projection.source.path, true)");
    expect(view).not.toMatch(/vault\.(create|createFolder|modify|process|delete|rename)\s*\(|fetch\s*\(|requestUrl\s*\(/);
  });
});
