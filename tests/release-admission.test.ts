import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface AdmissionGate {
  id: string;
  label: string;
  state: "pass" | "pending" | "held";
  requiredForPublicRelease: boolean;
  evidence: string[];
  unresolved: string[];
}

const root = resolve(import.meta.dirname, "..");
const contract = JSON.parse(readFileSync(resolve(root, "config/release-admission.json"), "utf8")) as {
  version: string;
  requiredGateCount: number;
  gates: AdmissionGate[];
};

describe("eight-gate public release admission contract", () => {
  it("keeps exactly eight unique required gates with closed states", () => {
    expect(contract).toMatchObject({ version: "0.1-candidate.1", requiredGateCount: 8 });
    expect(contract.gates).toHaveLength(8);
    expect(new Set(contract.gates.map((gate) => gate.id)).size).toBe(8);
    expect(contract.gates.every((gate) => gate.requiredForPublicRelease)).toBe(true);
    expect(contract.gates.every((gate) => ["pass", "pending", "held"].includes(gate.state))).toBe(true);
  });

  it("admits C1-C7 while keeping the remaining release gates pending or held", () => {
    expect(contract.gates.filter((gate) => gate.state === "pass").map((gate) => gate.id)).toEqual(["component-admission", "stewardship"]);
    expect(contract.gates.filter((gate) => gate.state === "pending")).toHaveLength(4);
    expect(contract.gates.filter((gate) => gate.state === "held").map((gate) => gate.id)).toEqual(["hosted-assurance", "external-release"]);
    expect(contract.gates.every((gate) => gate.state === "pass" || gate.unresolved.length > 0)).toBe(true);
    const publicSource = contract.gates.find((gate) => gate.id === "reproducible-public-source")?.unresolved.join(" ") ?? "";
    expect(publicSource).toContain("exact provider-neutral public projection");
    expect(publicSource).toContain("before materializing a clean repository");
  });

  it("binds every declared evidence locator to an existing repository file", () => {
    for (const gate of contract.gates) {
      expect(gate.evidence.length, gate.id).toBeGreaterThan(0);
      for (const path of gate.evidence) expect(() => readFileSync(resolve(root, path), "utf8"), `${gate.id}: ${path}`).not.toThrow();
    }
  });

  it("makes public readiness impossible while any required gate is not passed", () => {
    expect(contract.gates.every((gate) => gate.state === "pass")).toBe(false);
  });
});
