import { explicitResponsePacketPath, webCryptoSha256, type CreateOnlyCandidatePlan, type VaultPacketWriteReceipt } from "../writer";

/**
 * The default response-packet folder used when a worksheet or caller does not
 * declare a per-workspace override. The legacy literal is preserved for one
 * release; the configured-folder path is preferred in new code.
 */
export const RESPONSE_PACKET_DEFAULT_FOLDER = "Intake/HCC Responses" as const;
/** @deprecated use RESPONSE_PACKET_DEFAULT_FOLDER; legacy alias retained for one release */
export const RESPONSE_PACKET_FOLDER = RESPONSE_PACKET_DEFAULT_FOLDER;
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

export interface VaultResponsePacketAdapterOptions {
  /** Configured target folder; defaults to the legacy `Intake/HCC Responses` literal when omitted. */
  folder?: string;
}

export interface ResponsePacketFolderConfig {
  folder: string;
  source: "default" | "configured";
}

/**
 * Resolve the configured response-packet folder for a worksheet context.
 * Falls back to the legacy default when no override is provided.
 * Validates the configured folder against the same shape rule used by
 * the writer policy validator.
 */
export function resolveResponsePacketFolder(worksheetFolder?: string): ResponsePacketFolderConfig {
  if (typeof worksheetFolder === "string" && worksheetFolder.trim().length > 0) {
    assertValidVaultFolder(worksheetFolder);
    return { folder: worksheetFolder.replace(/\/+$/, ""), source: "configured" };
  }
  return { folder: RESPONSE_PACKET_DEFAULT_FOLDER, source: "default" };
}

function assertValidVaultFolder(value: string): void {
  if (value.length > 200 || value.trim() !== value || value === "" || value.startsWith("/") || value.includes("\\") || value.includes("\0") || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    throw new Error(`HCC-VAULT-CFG: configured folder ${value || "<empty>"} fails shape rule; expected a bounded, normalized, non-hidden vault-relative path without traversal or a URI scheme.`);
  }
  for (const part of value.split("/")) {
    if (part === "" || part === "." || part === ".." || part.startsWith(".")) {
      throw new Error(`HCC-VAULT-CFG: configured folder ${value} contains a hidden, empty, or traversal segment.`);
    }
  }
}

export class VaultResponsePacketAdapter {
  private readonly folderConfig: ResponsePacketFolderConfig;

  constructor(private readonly vault: ResponsePacketVaultPort, options: VaultResponsePacketAdapterOptions = {}) {
    this.folderConfig = resolveResponsePacketFolder(options.folder);
  }

  getResponsePacketFolder(): ResponsePacketFolderConfig {
    return this.folderConfig;
  }

  async readExplicit(packetPath: string): Promise<string> {
    assertPacketPath(packetPath, this.folderConfig.folder);
    if (this.vault.kind(packetPath) !== "file") throw new Error(`HCC-VAULT-READ-MISSING: ${packetPath}`);
    return this.vault.read(packetPath);
  }

  async createOnly(plan: CreateOnlyCandidatePlan, confirmed: boolean): Promise<VaultPacketWriteReceipt> {
    if (!confirmed) throw new Error("HCC-VAULT-CONFIRMATION: explicit per-write confirmation is required.");
    assertPacketPath(plan.targetPath, this.folderConfig.folder);
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

function assertPacketPath(value: string, configuredFolder: string): void {
  if (!explicitResponsePacketPath(value, configuredFolder)) {
    throw new Error(`HCC-VAULT-TARGET: response packets are restricted to ${configuredFolder}/ (configure the adapter's folder option for a different project home).`);
  }
}
