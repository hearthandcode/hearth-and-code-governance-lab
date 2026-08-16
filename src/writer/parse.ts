import yaml from "js-yaml";
import type { ResponsePacketCandidate, ResponseWritePolicyCandidate, WriterDiagnostic } from "./types";

const PACKET_FIELDS = ["record_type", "contract_version", "authority", "immutable", "session_id", "worksheet_binding", "started_at", "prepared_at", "respondent", "responses", "review", "downstream", "effects"];
const POLICY_FIELDS = ["record_type", "contract_version", "mode", "vault_scope", "target_folder", "filename_template", "content_format", "conflict", "require_source_digest", "require_complete", "allowed_privacy", "human_gate", "canonical_apply"];
const DIGEST = /^sha256:[a-f0-9]{64}$/i;

export function parseResponsePacket(source: string): { ok: true; packet: ResponsePacketCandidate } | { ok: false; diagnostics: WriterDiagnostic[] } {
  const loaded = load(source); if (!loaded.ok) return loaded;
  const value = loaded.value; const diagnostics: WriterDiagnostic[] = [];
  unknown(value, PACKET_FIELDS, "$", diagnostics);
  exact(value.record_type, "hcc-worksheet-response-packet", "$.record_type", diagnostics);
  exact(value.contract_version, "0.1-candidate.1", "$.contract_version", diagnostics);
  exact(value.authority, "immutable-intake-candidate-proposal", "$.authority", diagnostics);
  exact(value.immutable, true, "$.immutable", diagnostics);
  const sessionId = identifier(value.session_id, "$.session_id", diagnostics);
  const binding = object(value.worksheet_binding, "$.worksheet_binding", diagnostics);
  if (binding) {
    unknown(binding, ["worksheet_id", "worksheet_version", "source_path", "source_digest"], "$.worksheet_binding", diagnostics);
    identifier(binding.worksheet_id, "$.worksheet_binding.worksheet_id", diagnostics);
    nonEmpty(binding.worksheet_version, "$.worksheet_binding.worksheet_version", diagnostics);
    safePath(binding.source_path, "$.worksheet_binding.source_path", diagnostics);
    if (typeof binding.source_digest !== "string" || !DIGEST.test(binding.source_digest)) diagnostic(diagnostics, "HCC-WRITER-SOURCE", "$.worksheet_binding.source_digest", "A full SHA-256 source digest is required; null and placeholder digests cannot be written.");
  }
  isoTime(value.started_at, "$.started_at", diagnostics); isoTime(value.prepared_at, "$.prepared_at", diagnostics);
  if (value.respondent !== null && typeof value.respondent !== "string") diagnostic(diagnostics, "HCC-WRITER-SCHEMA", "$.respondent", "respondent must be text or null.");
  validateResponses(value.responses, diagnostics);
  validateReview(value.review, diagnostics); validateDownstream(value.downstream, diagnostics); validateEffects(value.effects, diagnostics);
  if (diagnostics.length || !sessionId || !binding) return { ok: false, diagnostics };
  return { ok: true, packet: value as unknown as ResponsePacketCandidate };
}

export function parseResponseWritePolicy(source: string): { ok: true; policy: ResponseWritePolicyCandidate } | { ok: false; diagnostics: WriterDiagnostic[] } {
  const loaded = load(source); if (!loaded.ok) return loaded;
  const value = loaded.value; const diagnostics: WriterDiagnostic[] = [];
  unknown(value, POLICY_FIELDS, "$", diagnostics);
  exact(value.record_type, "hcc-response-write-policy-candidate", "$.record_type", diagnostics);
  exact(value.contract_version, "0.1-candidate.1", "$.contract_version", diagnostics);
  exact(value.mode, "immutable-new-file", "$.mode", diagnostics); exact(value.vault_scope, "current-vault", "$.vault_scope", diagnostics);
  safeTargetFolder(value.target_folder, "$.target_folder", diagnostics);
  exact(value.filename_template, "{worksheet_id}--{session_id}.yaml", "$.filename_template", diagnostics);
  exact(value.content_format, "yaml", "$.content_format", diagnostics); exact(value.conflict, "fail", "$.conflict", diagnostics);
  exact(value.require_source_digest, true, "$.require_source_digest", diagnostics); exact(value.require_complete, true, "$.require_complete", diagnostics);
  privacyList(value.allowed_privacy, diagnostics); exact(value.human_gate, "per-write", "$.human_gate", diagnostics); exact(value.canonical_apply, "prohibited", "$.canonical_apply", diagnostics);
  return diagnostics.length ? { ok: false, diagnostics } : { ok: true, policy: value as unknown as ResponseWritePolicyCandidate };
}

function validateReview(value: unknown, diagnostics: WriterDiagnostic[]): void {
  const review = object(value, "$.review", diagnostics); if (!review) return;
  unknown(review, ["required_complete", "missing_required", "human_gate"], "$.review", diagnostics);
  if (typeof review.required_complete !== "boolean") diagnostic(diagnostics, "HCC-WRITER-SCHEMA", "$.review.required_complete", "required_complete must be boolean.");
  if (!Array.isArray(review.missing_required) || review.missing_required.some((item) => typeof item !== "string")) diagnostic(diagnostics, "HCC-WRITER-SCHEMA", "$.review.missing_required", "missing_required must be a string array.");
  exact(review.human_gate, "required", "$.review.human_gate", diagnostics);
}
function validateDownstream(value: unknown, diagnostics: WriterDiagnostic[]): void {
  const item = object(value, "$.downstream", diagnostics); if (!item) return;
  unknown(item, ["action_candidates", "decision_candidates", "work_item_candidates", "canonical_write_back"], "$.downstream", diagnostics);
  exact(item.action_candidates, "not-generated", "$.downstream.action_candidates", diagnostics); exact(item.decision_candidates, "not-generated", "$.downstream.decision_candidates", diagnostics);
  exact(item.work_item_candidates, "not-generated", "$.downstream.work_item_candidates", diagnostics); exact(item.canonical_write_back, "prohibited", "$.downstream.canonical_write_back", diagnostics);
}
function validateEffects(value: unknown, diagnostics: WriterDiagnostic[]): void {
  const item = object(value, "$.effects", diagnostics); if (!item) return;
  unknown(item, ["persistence", "submission"], "$.effects", diagnostics);
  if (item.persistence !== "prohibited-step-8-held" && item.persistence !== "vault-local-create-only") diagnostic(diagnostics, "HCC-WRITER-SCHEMA", "$.effects.persistence", "Expected prohibited-step-8-held or vault-local-create-only.");
  exact(item.submission, "prohibited", "$.effects.submission", diagnostics);
}
function validateResponses(value: unknown, diagnostics: WriterDiagnostic[]): void {
  if (!Array.isArray(value)) { diagnostic(diagnostics, "HCC-WRITER-SCHEMA", "$.responses", "responses must be an array."); return; }
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    const path = `$.responses[${index}]`; const item = object(entry, path, diagnostics); if (!item) return;
    unknown(item, ["interaction_id", "interaction_kind", "interaction_version", "response", "observed_at"], path, diagnostics);
    const id = identifier(item.interaction_id, `${path}.interaction_id`, diagnostics);
    if (id && ids.has(id)) diagnostic(diagnostics, "HCC-WRITER-SCHEMA", `${path}.interaction_id`, "Interaction IDs must be unique within a response packet.");
    if (id) ids.add(id);
    nonEmpty(item.interaction_kind, `${path}.interaction_kind`, diagnostics); nonEmpty(item.interaction_version, `${path}.interaction_version`, diagnostics);
    const response = object(item.response, `${path}.response`, diagnostics);
    if (response) {
      unknown(response, ["value", "note", "state", "author", "responded_at"], `${path}.response`, diagnostics);
      if (!["unanswered", "answered", "deferred", "not_applicable"].includes(String(response.state))) diagnostic(diagnostics, "HCC-WRITER-SCHEMA", `${path}.response.state`, "Response state is not recognized.");
      if (response.note !== null && typeof response.note !== "string") diagnostic(diagnostics, "HCC-WRITER-SCHEMA", `${path}.response.note`, "note must be text or null.");
      if (response.author !== null && typeof response.author !== "string") diagnostic(diagnostics, "HCC-WRITER-SCHEMA", `${path}.response.author`, "author must be text or null.");
      if (response.responded_at !== null) isoTime(response.responded_at, `${path}.response.responded_at`, diagnostics);
    }
    isoTime(item.observed_at, `${path}.observed_at`, diagnostics);
  });
}
function privacyList(value: unknown, diagnostics: WriterDiagnostic[]): void {
  const allowed = new Set(["private", "restricted", "internal", "public"]);
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || !allowed.has(item)) || new Set(value).size !== value.length) diagnostic(diagnostics, "HCC-WRITER-SCHEMA", "$.allowed_privacy", "allowed_privacy must be a unique, non-empty list of recognized privacy values.");
}
function safeTargetFolder(value: unknown, path: string, diagnostics: WriterDiagnostic[]): void { safePath(value, path, diagnostics); }
function safePath(value: unknown, path: string, diagnostics: WriterDiagnostic[]): void {
  if (typeof value !== "string" || value.length > 200 || value.trim() !== value || value === "" || value.startsWith("/") || value.includes("\\") || value.includes("\0") || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.split("/").some((part) => part === "" || part === "." || part === ".." || part.startsWith("."))) diagnostic(diagnostics, "HCC-WRITER-TARGET", path, "Expected a bounded, normalized, non-hidden vault-relative path without traversal or a URI scheme.");
}
function load(source: string): { ok: true; value: Record<string, unknown> } | { ok: false; diagnostics: WriterDiagnostic[] } {
  if (new TextEncoder().encode(source).byteLength > 1_048_576) return { ok: false, diagnostics: [{ code: "HCC-WRITER-SCHEMA", path: "$", message: "The candidate exceeds the 1 MiB writer-core limit." }] };
  let value: unknown; try { value = yaml.load(source, { schema: yaml.JSON_SCHEMA }); } catch (error) { return { ok: false, diagnostics: [{ code: "HCC-WRITER-PARSE", path: "$", message: error instanceof Error ? error.message : "Unknown YAML parse error" }] }; }
  if (!record(value)) return { ok: false, diagnostics: [{ code: "HCC-WRITER-SCHEMA", path: "$", message: "The contract must be a YAML object." }] }; return { ok: true, value };
}
function identifier(value: unknown, path: string, diagnostics: WriterDiagnostic[]): string | null { if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(value)) { diagnostic(diagnostics, "HCC-WRITER-SCHEMA", path, "Expected a bounded filesystem-safe identifier."); return null; } return value; }
function nonEmpty(value: unknown, path: string, diagnostics: WriterDiagnostic[]): void { if (typeof value !== "string" || value.trim() === "") diagnostic(diagnostics, "HCC-WRITER-SCHEMA", path, "Expected non-empty text."); }
function isoTime(value: unknown, path: string, diagnostics: WriterDiagnostic[]): void { if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) diagnostic(diagnostics, "HCC-WRITER-SCHEMA", path, "Expected an ISO-8601 timestamp with timezone."); }
function exact(value: unknown, expected: unknown, path: string, diagnostics: WriterDiagnostic[]): void { if (value !== expected) diagnostic(diagnostics, "HCC-WRITER-SCHEMA", path, `Expected ${String(expected)}.`); }
function object(value: unknown, path: string, diagnostics: WriterDiagnostic[]): Record<string, unknown> | null { if (!record(value)) { diagnostic(diagnostics, "HCC-WRITER-SCHEMA", path, "Expected an object."); return null; } return value; }
function unknown(value: Record<string, unknown>, allowed: readonly string[], path: string, diagnostics: WriterDiagnostic[]): void { Object.keys(value).filter((key) => !allowed.includes(key)).forEach((key) => diagnostic(diagnostics, "HCC-WRITER-SCHEMA", `${path}.${key}`, "Unknown fields are not accepted.")); }
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function diagnostic(list: WriterDiagnostic[], code: WriterDiagnostic["code"], path: string, message: string): void { list.push({ code, path, message }); }
