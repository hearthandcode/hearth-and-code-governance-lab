import { describe, expect, it } from "vitest";

import { responsePacketHostProfile, VaultResponsePacketAdapter, type ResponsePacketVaultPort } from "../src/obsidian/vault-response-packet-adapter";
import { webCryptoSha256, type CreateOnlyCandidatePlan } from "../src/writer";

class FakeVault implements ResponsePacketVaultPort {
  readonly files = new Map<string, string>();
  readonly folders = new Set<string>();
  readonly createdFolders: string[] = [];
  reads: string[] = [];

  kind(path: string): "file" | "folder" | null {
    if (this.files.has(path)) return "file";
    if (this.folders.has(path)) return "folder";
    return null;
  }
  async read(path: string): Promise<string> {
    this.reads.push(path);
    const value = this.files.get(path);
    if (value === undefined) throw new Error(`missing ${path}`);
    return value;
  }
  async createFolder(path: string): Promise<void> {
    this.folders.add(path);
    this.createdFolders.push(path);
  }
  async create(path: string, bytes: string): Promise<void> {
    if (this.kind(path) !== null) throw new Error(`collision ${path}`);
    this.files.set(path, bytes);
  }
}

async function plan(path = "Intake/HCC Responses/proof.yaml", bytes = "proof: true\n"): Promise<CreateOnlyCandidatePlan> {
  return { targetPath: path, bytes, digest: await webCryptoSha256(bytes) };
}

describe("Obsidian vault response-packet canary adapter", () => {
  it("enforces the eight-case two-profile host policy and rejects unknown identities", () => {
    expect(responsePacketHostProfile("hcc-widget-lab", "scratch-vault")).toBe("prototype-disposable-vault");
    expect(() => responsePacketHostProfile("hcc-widget-lab", "release-canary")).toThrow("HCC-VAULT-SCOPE");
    expect(responsePacketHostProfile("hearth-and-code-governance-lab", "release-canary")).toBe("public-current-vault");
    expect(responsePacketHostProfile("hearth-and-code-governance-lab", "personal-vault")).toBe("public-current-vault");
    expect(() => responsePacketHostProfile("unknown-plugin", "scratch-vault")).toThrow("HCC-PLUGIN-SCOPE");
    expect(() => responsePacketHostProfile("unknown-plugin", "release-canary")).toThrow("HCC-PLUGIN-SCOPE");
    expect(() => responsePacketHostProfile("", "scratch-vault")).toThrow("HCC-PLUGIN-SCOPE");
    expect(() => responsePacketHostProfile("hearth-and-code-governance-lab", "")).toThrow("HCC-VAULT-SCOPE");
  });
  it("creates only the fixed Intake hierarchy and verifies exact read-back bytes and digest", async () => {
    const vault = new FakeVault();
    const adapter = new VaultResponsePacketAdapter(vault);
    const candidate = await plan();
    const receipt = await adapter.createOnly(candidate, true);
    expect(vault.createdFolders).toEqual(["Intake", "Intake/HCC Responses"]);
    expect(vault.files.get(candidate.targetPath)).toBe(candidate.bytes);
    expect(vault.reads).toEqual([candidate.targetPath]);
    expect(receipt).toMatchObject({ targetPath: candidate.targetPath, digest: candidate.digest, result: "created", readBack: "verified", effect: "vault-local-create-only" });
  });

  it("reads only one explicit YAML packet inside the fixed response folder", async () => {
    const vault = new FakeVault();
    vault.files.set("Intake/HCC Responses/existing.yaml", "record: existing\n");
    const adapter = new VaultResponsePacketAdapter(vault);
    await expect(adapter.readExplicit("Intake/HCC Responses/existing.yaml")).resolves.toBe("record: existing\n");
    await expect(adapter.readExplicit("Elsewhere/existing.yaml")).rejects.toThrow("restricted");
    await expect(adapter.readExplicit("Intake/HCC Responses/missing.yaml")).rejects.toThrow("HCC-VAULT-READ-MISSING");
    expect(vault.reads).toEqual(["Intake/HCC Responses/existing.yaml"]);
  });

  it("requires per-write confirmation and fails closed on collision without altering the predecessor", async () => {
    const vault = new FakeVault();
    const adapter = new VaultResponsePacketAdapter(vault);
    const candidate = await plan();
    await expect(adapter.createOnly(candidate, false)).rejects.toThrow("HCC-VAULT-CONFIRMATION");
    await adapter.createOnly(candidate, true);
    await expect(adapter.createOnly({ ...candidate, bytes: "changed: true\n" }, true)).rejects.toThrow("HCC-VAULT-COLLISION");
    expect(vault.files.get(candidate.targetPath)).toBe(candidate.bytes);
  });

  it("rejects paths outside the fixed folder before creating any folder or file", async () => {
    const vault = new FakeVault();
    const adapter = new VaultResponsePacketAdapter(vault);
    await expect(adapter.createOnly(await plan("Intake/Other/proof.yaml"), true)).rejects.toThrow("restricted");
    await expect(adapter.createOnly(await plan("Intake/HCC Responses/../proof.yaml"), true)).rejects.toThrow("restricted");
    expect(vault.createdFolders).toEqual([]);
    expect(vault.files.size).toBe(0);
  });
});
