import yaml from "js-yaml";
import { normalizePath, TFile, type App } from "obsidian";

import type { ResolvedViewSource, ViewRow, ViewScalar, VaultViewSource } from "../visualization/types";

export type ViewSourceResolution =
  | { ok: true; source: ResolvedViewSource }
  | { ok: false; message: string };

/** Resolves exactly one already-validated vault-relative source. No search or crawl occurs. */
export async function resolveExplicitViewSource(
  app: App,
  binding: VaultViewSource
): Promise<ViewSourceResolution> {
  const path = normalizePath(binding.path);
  const target = app.vault.getAbstractFileByPath(path);
  if (!(target instanceof TFile)) {
    return { ok: false, message: `Explicit view source was not found: ${path}` };
  }
  const content = await app.vault.cachedRead(target);
  if (content.length > 1_048_576) {
    return { ok: false, message: `Explicit view source exceeds the 1 MiB candidate limit: ${path}` };
  }
  const digest = await sha256Digest(content);
  let parsed: unknown;
  try {
    parsed = yaml.load(content, { schema: yaml.JSON_SCHEMA });
  } catch {
    return { ok: false, message: `Explicit view source is not valid JSON-compatible YAML: ${path}` };
  }
  if (!Array.isArray(parsed) || !parsed.every(isViewRow)) {
    return { ok: false, message: `Explicit view source must be an array of flat scalar rows: ${path}` };
  }
  return {
    ok: true,
    source: { path, digest, rows: parsed.map((row) => ({ ...row })) }
  };
}

export async function sha256Digest(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

function isViewRow(value: unknown): value is ViewRow {
  return isRecord(value) && Object.values(value).every(isScalar);
}

function isScalar(value: unknown): value is ViewScalar {
  return value === null || typeof value === "string" || typeof value === "number" && Number.isFinite(value) || typeof value === "boolean";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
