import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseCandidateInteraction } from "../src/grammar";

const vaultRoot = resolve(process.cwd(), "scratch-vault");

describe("public guided-vault parser golden surface", () => {
  it("preserves the exact nineteen-interaction learning surface", () => {
    const records = walk(vaultRoot)
      .filter((path) => path.endsWith(".md"))
      .filter((path) => [
        "Worksheets/01 Guided Orientation.md",
        "Worksheets/02 Agent Authoring Request.md",
        "Worksheets/03 Response Lifecycle Practice.md",
        "Worksheets/04 Integration Readiness Review.md"
      ].includes(relative(vaultRoot, path)))
      .sort().flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return Array.from(source.matchAll(/```hcc-interaction\n([\s\S]*?)\n```/g))
        .map((match, index) => ({ path: relative(vaultRoot, path), index, source: match[1]! }))
        .filter((item) => item.source.includes("version: 0.3-candidate.1"))
        .map((item) => ({ path: item.path, index: item.index, result: parseCandidateInteraction(item.source) }));
    });
    const digest = createHash("sha256").update(JSON.stringify(records)).digest("hex");
    expect(records).toHaveLength(19);
    expect(digest).toBe("95fc8d77b5c77f9087abf60ef1bf3e906494af6ecc32bf25a7a8779d7b9b1a2e");
  });
});

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
