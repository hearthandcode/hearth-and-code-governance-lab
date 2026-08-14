import { explicitResponsePacketPath, webCryptoSha256, type CreateOnlyCandidatePlan, type VaultPacketWriteReceipt } from "../writer";

export const RESPONSE_PACKET_FOLDER = "Intake/HCC Responses" as const;
export const RESPONSE_PACKET_CANARY_VAULT = "scratch-vault" as const;
export const RESPONSE_PACKET_PROTOTYPE_PLUGIN_ID = "hcc-widget-lab" as const;
export const RESPONSE_PACKET_PUBLIC_PLUGIN_ID = "hearth-and-code-governance-lab" as const;

export type ResponsePacketHostProfile = "prototype-disposable-vault" | "public-current-vault";

export function responsePacketHostProfile(pluginId: string, vaultName: string): ResponsePacketHostProfile {
  if (pluginId === RESPONSE_PACKET_PROTOTYPE_PLUGIN_ID && vaultName === RESPONSE_PACKET_CANARY_VAULT) return "prototype-disposable-vault";
  if (pluginId === RESPONSE_PACKET_PUBLIC_PLUGIN_ID && vaultName.trim().length > 0) return "public-current-vault";
  if (pluginId === RESPONSE_PACKET_PROTOTYPE_PLUGIN_ID) {
    throw new Error(`HCC-VAULT-SCOPE: prototype response packets are enabled only in the disposable ${RESPONSE_PACKET_CANARY_VAULT} vault.`);
  }
  if (pluginId === RESPONSE_PACKET_PUBLIC_PLUGIN_ID) throw new Error("HCC-VAULT-SCOPE: the public response-packet profile requires one named current vault.");
  throw new Error(`HCC-PLUGIN-SCOPE: response-packet effects are denied for unknown plugin identity ${pluginId || "<empty>"}.`);
}

export interface ResponsePacketVaultPort {
  kind(path: string): "file" | "folder" | null;
  read(path: string): Promise<string>;
  createFolder(path: string): Promise<void>;
  create(path: string, bytes: string): Promise<void>;
}

export class VaultResponsePacketAdapter {
  constructor(private readonly vault: ResponsePacketVaultPort) {}

  async readExplicit(packetPath: string): Promise<string> {
    assertPacketPath(packetPath);
    if (this.vault.kind(packetPath) !== "file") throw new Error(`HCC-VAULT-READ-MISSING: ${packetPath}`);
    return this.vault.read(packetPath);
  }

  async createOnly(plan: CreateOnlyCandidatePlan, confirmed: boolean): Promise<VaultPacketWriteReceipt> {
    if (!confirmed) throw new Error("HCC-VAULT-CONFIRMATION: explicit per-write confirmation is required.");
    assertPacketPath(plan.targetPath);
    await this.ensureFolders(plan.targetPath);
    if (this.vault.kind(plan.targetPath) !== null) throw new Error(`HCC-VAULT-COLLISION: ${plan.targetPath} already exists.`);
    await this.vault.create(plan.targetPath, plan.bytes);
    const readBack = await this.readExplicit(plan.targetPath);
    if (readBack !== plan.bytes) throw new Error(`HCC-VAULT-READBACK: exact bytes differ for ${plan.targetPath}; the created file is preserved for diagnosis.`);
    const digest = await webCryptoSha256(readBack);
    if (digest !== plan.digest) throw new Error(`HCC-VAULT-DIGEST: read-back digest differs for ${plan.targetPath}; the created file is preserved for diagnosis.`);
    return {
      recordType: "hcc-vault-response-write-receipt",
      targetPath: plan.targetPath,
      digest,
      byteLength: new TextEncoder().encode(readBack).byteLength,
      result: "created",
      readBack: "verified",
      effect: "vault-local-create-only"
    };
  }

  private async ensureFolders(targetPath: string): Promise<void> {
    const parts = targetPath.split("/").slice(0, -1);
    for (let index = 0; index < parts.length; index += 1) {
      const path = parts.slice(0, index + 1).join("/");
      const kind = this.vault.kind(path);
      if (kind === "file") throw new Error(`HCC-VAULT-TARGET: ${path} is a file, not a folder.`);
      if (kind === null) await this.vault.createFolder(path);
    }
  }
}

function assertPacketPath(value: string): void {
  if (!explicitResponsePacketPath(value)) {
    throw new Error(`HCC-VAULT-TARGET: response packets are restricted to ${RESPONSE_PACKET_FOLDER}/.`);
  }
}
