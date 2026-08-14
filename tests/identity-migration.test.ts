import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { receipt } from "../scripts/check-identity-migration.mjs";

const root = resolve(import.meta.dirname, "..");
const contract = JSON.parse(readFileSync(resolve(root, "config/identity-migration.json"), "utf8")) as {
  candidatePublicDisplayName: string;
  candidatePublicDisplayNameAccepted: boolean;
  candidatePublicIdAccepted: boolean;
  requiredScenarioCount: number;
  scenarios: Array<{ id: string; expected: string; humanEvidence: string }>;
};

describe("candidate public identity migration proof", () => {
  it("records the accepted public identity and covers eight distinct scenarios", () => {
    expect(contract.candidatePublicIdAccepted).toBe(true);
    expect(contract.candidatePublicDisplayName).toBe("Hearth and Code Governance Lab");
    expect(contract.candidatePublicDisplayNameAccepted).toBe(true);
    expect(contract.requiredScenarioCount).toBe(8);
    expect(contract.scenarios).toHaveLength(8);
    expect(new Set(contract.scenarios.map((scenario) => scenario.id)).size).toBe(8);
  });

  it("blocks in-place rename and side-by-side registration", () => {
    expect(contract.scenarios.filter((scenario) => scenario.expected === "block").map((scenario) => scenario.id)).toEqual(["in-place-rename", "side-by-side-install"]);
  });

  it("requires bounded real-host evidence for every scenario", () => {
    expect(contract.scenarios.every((scenario) => scenario.humanEvidence.length > 20)).toBe(true);
  });

  it("emits a passing no-effect eight-scenario receipt", () => {
    expect(receipt).toMatchObject({
      record_type: "hcc-identity-migration-proof",
      candidate_public_display_name: "Hearth and Code Governance Lab",
      candidate_public_display_name_accepted: true,
      candidate_public_id_accepted: true,
      real_host_proof: false,
      findings: []
    });
    expect(receipt.counts).toEqual({ total: 8, passed: 8, allow_current: 1, candidate_only: 5, blocked: 2 });
    expect(receipt.effects).toEqual({ manifest_change: false, directory_change: false, vault_write: false, git: false, network: false, release: false, publication: false });
  });
});
