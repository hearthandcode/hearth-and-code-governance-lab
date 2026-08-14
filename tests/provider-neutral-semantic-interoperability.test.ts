import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { receipt } from "../scripts/check-provider-neutral-semantic-interoperability";

const root = resolve(import.meta.dirname, "..");
const contract = JSON.parse(readFileSync(resolve(root, "config/provider-neutral-semantic-interoperability.json"), "utf8"));

describe("provider-neutral semantic interoperability specification", () => {
  it("defines eight portable meanings without implementing an adapter", () => {
    expect(contract.normalizedTypes).toHaveLength(8);
    expect(contract.fixturePairs).toHaveLength(8);
    expect(contract).toMatchObject({ status: "accepted-specification-only", effectCeiling: "no-external-runtime-adapter" });
  });

  it("holds canonical write-back behind eight retirement conditions", () => {
    expect(contract.responsePort).toMatchObject({ immutable: true, digestRequired: true, canonicalWriteBack: false, implementation: "held" });
    expect(contract.retirementCriteria).toHaveLength(8);
  });

  it("proves eight digest-bound public-safe fixture correspondences", () => {
    expect(receipt).toMatchObject({
      record_type: "hcc-provider-neutral-semantic-interoperability-proof",
      fixture_count: 8,
      normalized_type_count: 8,
      findings: []
    });
    expect(receipt.fixtures.every((fixture) => /^sha256:[a-f0-9]{64}$/.test(fixture.source_digest))).toBe(true);
  });
});
