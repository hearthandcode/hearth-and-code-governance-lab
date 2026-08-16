import { dump, JSON_SCHEMA, load } from "js-yaml";

import { parseResponsePacket } from "./parse";
import {
  RESPONSE_PACKET_AMENDMENT_VERSION,
  RESPONSE_PACKET_VERSION,
  type AmendedResponsePacketCandidate,
  type ReloadableResponsePacket,
  type WriterDiagnostic
} from "./types";

const DIGEST = /^sha256:[a-f0-9]{64}$/i;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/;
const AMENDMENT_REASON_GUIDANCE = "Explain why this immutable successor is required.";
const V2_FIELDS = new Set([
  "record_type", "contract_version", "authority", "immutable", "record_id", "revision", "session_id", "lineage",
  "worksheet_binding", "started_at", "prepared_at", "respondent", "responses", "review", "downstream", "effects"
]);
const LINEAGE_FIELDS = new Set(["root_session_id", "predecessor_session_id", "predecessor_path", "predecessor_digest", "amendment_reason"]);

export function parseReloadableResponsePacket(source: string):
  | { ok: true; packet: ReloadableResponsePacket }
  | { ok: false; diagnostics: WriterDiagnostic[] } {
  let value: unknown;
  try { value = load(source, { schema: JSON_SCHEMA }); }
  catch (error) { return { ok: false, diagnostics: [{ code: "HCC-WRITER-PARSE", path: "$", message: error instanceof Error ? error.message : "Unknown YAML parse error" }] }; }
  if (!record(value)) return { ok: false, diagnostics: [{ code: "HCC-WRITER-SCHEMA", path: "$", message: "The response packet must be a YAML object." }] };
  if (value.contract_version === RESPONSE_PACKET_VERSION) return parseResponsePacket(source);
  if (value.contract_version !== RESPONSE_PACKET_AMENDMENT_VERSION) {
    return { ok: false, diagnostics: [{ code: "HCC-WRITER-SCHEMA", path: "$.contract_version", message: "Only response packet versions 0.1-candidate.1 and 0.2-candidate.1 are reloadable." }] };
  }

  const diagnostics: WriterDiagnostic[] = [];
  Object.keys(value).filter((key) => !V2_FIELDS.has(key)).forEach((key) => add(diagnostics, "HCC-WRITER-SCHEMA", `$.${key}`, "Unknown fields are not accepted."));
  const { record_id, revision, lineage, ...base } = value;
  const baseResult = parseResponsePacket(dump({ ...base, contract_version: RESPONSE_PACKET_VERSION }, { lineWidth: -1, noRefs: true }));
  if (!baseResult.ok) diagnostics.push(...baseResult.diagnostics);
  if (typeof record_id !== "string" || !IDENTIFIER.test(record_id)) add(diagnostics, "HCC-WRITER-LINEAGE", "$.record_id", "record_id must be a bounded stable identifier.");
  if (!Number.isInteger(revision) || Number(revision) < 2) add(diagnostics, "HCC-WRITER-LINEAGE", "$.revision", "An amended packet revision must be an integer of at least 2.");
  if (!record(lineage)) add(diagnostics, "HCC-WRITER-LINEAGE", "$.lineage", "lineage must be an object.");
  else {
    Object.keys(lineage).filter((key) => !LINEAGE_FIELDS.has(key)).forEach((key) => add(diagnostics, "HCC-WRITER-SCHEMA", `$.lineage.${key}`, "Unknown lineage fields are not accepted."));
    for (const key of ["root_session_id", "predecessor_session_id"] as const) {
      if (typeof lineage[key] !== "string" || !IDENTIFIER.test(lineage[key])) add(diagnostics, "HCC-WRITER-LINEAGE", `$.lineage.${key}`, `${key} must be a bounded identifier.`);
    }
    if (lineage.root_session_id !== record_id) add(diagnostics, "HCC-WRITER-LINEAGE", "$.lineage.root_session_id", "root_session_id must equal record_id.");
    if (!safePath(lineage.predecessor_path)) add(diagnostics, "HCC-WRITER-LINEAGE", "$.lineage.predecessor_path", "predecessor_path must be a bounded explicit vault-relative YAML path.");
    if (typeof lineage.predecessor_digest !== "string" || !DIGEST.test(lineage.predecessor_digest)) add(diagnostics, "HCC-WRITER-LINEAGE", "$.lineage.predecessor_digest", "predecessor_digest must be a full SHA-256 digest.");
    // Historical prototype packets may contain the former guidance value. Keep
    // them reloadable; compileResponseAmendmentPlan prevents creating it again.
    if (typeof lineage.amendment_reason !== "string" || lineage.amendment_reason.trim() === "" || lineage.amendment_reason.length > 1000) add(diagnostics, "HCC-WRITER-LINEAGE", "$.lineage.amendment_reason", "amendment_reason must be non-empty text of at most 1000 characters.");
  }
  if (!baseResult.ok || diagnostics.length) return { ok: false, diagnostics };
  return { ok: true, packet: value as unknown as AmendedResponsePacketCandidate };
}

export function packetIdentity(packet: ReloadableResponsePacket): { recordId: string; revision: number } {
  return packet.contract_version === RESPONSE_PACKET_VERSION
    ? { recordId: packet.session_id, revision: 1 }
    : { recordId: packet.record_id, revision: packet.revision };
}

export function explicitYamlPath(value: string): boolean { return safePath(value); }

export function validAmendmentReason(value: string): boolean {
  const normalized = value.trim();
  return normalized.length > 0 && value.length <= 1000 && normalized !== AMENDMENT_REASON_GUIDANCE;
}

export function explicitResponsePacketPath(value: string, prefix: string = "Intake/HCC Responses/"): boolean {
  const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  const leaf = value.startsWith(normalizedPrefix) ? value.slice(normalizedPrefix.length) : "";
  return explicitYamlPath(value) && /^[A-Za-z0-9][A-Za-z0-9_-]{0,199}\.yaml$/.test(leaf);
}

function safePath(value: unknown): boolean {
  return typeof value === "string" && value.length <= 240 && value.trim() === value && value.endsWith(".yaml")
    && !value.startsWith("/") && !value.includes("\\") && !/[\x00-\x1f\x7f<>:"|?*]/.test(value)
    && !/^[a-z][a-z0-9+.-]*:/i.test(value) && value.split("/").every(safeSegment);
}
function safeSegment(part: string): boolean {
  if (part === "" || part === "." || part === ".." || part.startsWith(".") || part.endsWith(".") || part.endsWith(" ")) return false;
  const stem = part.split(".")[0]?.toUpperCase() ?? "";
  return !/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/.test(stem);
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function add(list: WriterDiagnostic[], code: WriterDiagnostic["code"], path: string, message: string): void { list.push({ code, path, message }); }
