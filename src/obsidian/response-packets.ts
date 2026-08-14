import { normalizePath, TFile, TFolder, type Vault } from "obsidian";

import {
  responsePacketHostProfile,
  type ResponsePacketVaultPort,
  VaultResponsePacketAdapter
} from "./vault-response-packet-adapter";

export {
  responsePacketHostProfile,
  RESPONSE_PACKET_CANARY_VAULT,
  RESPONSE_PACKET_FOLDER,
  RESPONSE_PACKET_PROTOTYPE_PLUGIN_ID,
  RESPONSE_PACKET_PUBLIC_PLUGIN_ID,
  VaultResponsePacketAdapter
} from "./vault-response-packet-adapter";
export type { ResponsePacketVaultPort } from "./vault-response-packet-adapter";

/**
 * The sole production factory for the response-packet writer. Keeping the
 * identity-and-host assertion here makes an unguarded adapter impossible to obtain
 * from the Obsidian bridge, even if the plugin lifecycle is later refactored.
 */
export function createResponsePacketAdapter(pluginId: string, vault: Vault): VaultResponsePacketAdapter {
  responsePacketHostProfile(pluginId, vault.getName());
  return new VaultResponsePacketAdapter(createObsidianResponsePacketPort(vault));
}

export function createObsidianResponsePacketPort(vault: Vault): ResponsePacketVaultPort {
  return {
    kind: (path) => {
      const item = vault.getAbstractFileByPath(normalizePath(path));
      if (item instanceof TFile) return "file";
      if (item instanceof TFolder) return "folder";
      return null;
    },
    read: async (path) => {
      const item = vault.getAbstractFileByPath(normalizePath(path));
      if (!(item instanceof TFile)) throw new Error(`HCC-VAULT-READ-MISSING: ${path}`);
      return vault.cachedRead(item);
    },
    createFolder: async (path) => { await vault.createFolder(normalizePath(path)); },
    create: async (path, bytes) => { await vault.create(normalizePath(path), bytes); }
  };
}
