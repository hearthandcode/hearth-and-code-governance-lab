import { load } from "js-yaml";

import {
  EXCHANGE_CONTEXT_CONTENT_LIMIT,
  EXCHANGE_SOURCE_CONTENT_LIMIT,
  EXCHANGE_SOURCE_LIMIT,
  EXCHANGE_VERSION,
  type ExchangeContract,
  type ExchangeDiagnostic,
  type ExchangeParseResult,
  type ExchangeSource
} from "./types";

const ID = /^[a-z0-9]+(?:[a-z0-9_-]*[a-z0-9])?$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;

export function parseExchangeContract(source: string): ExchangeParseResult {
  let value: unknown;
  try { value = load(source, { schema: undefined }); }
  catch (error) { return failure("HCC-EXCHANGE-PARSE", "$", error instanceof Error ? error.message : "YAML could not be parsed."); }
  const diagnostics: ExchangeDiagnostic[] = [];
  const root = object(value, "$", diagnostics); if (!root) return { ok: false, diagnostics };
  unknown(root, ["version", "id", "title", "purpose", "request", "context", "handling", "output", "governance"], "$", diagnostics);
  exact(root.version, EXCHANGE_VERSION, "$.version", diagnostics);
  const id = text(root.id, "$.id", diagnostics, 1, 128); if (id && !ID.test(id)) diagnostic(diagnostics, "HCC-EXCHANGE-SCHEMA", "$.id", "id must be a normalized lowercase identifier.");
  const title = text(root.title, "$.title", diagnostics, 1, 256);
  const purpose = text(root.purpose, "$.purpose", diagnostics, 1, 2_048);
  const request = parseRequest(root.request, diagnostics);
  const sources = parseContext(root.context, diagnostics);
  const handling = parseHandling(root.handling, diagnostics);
  const output = parseOutput(root.output, diagnostics);
  const governance = parseGovernance(root.governance, diagnostics);
  if (diagnostics.length || !id || !title || !purpose || !request || !sources || !handling || !output || !governance) return { ok: false, diagnostics };
  return { ok: true, diagnostics: [], exchange: { version: EXCHANGE_VERSION, id, title, purpose, request, context: { sources }, handling, output, governance } };
}

function parseRequest(value: unknown, diagnostics: ExchangeDiagnostic[]): ExchangeContract["request"] | null {
  const root = object(value, "$.request", diagnostics); if (!root) return null;
  unknown(root, ["task", "constraints"], "$.request", diagnostics);
  const task = text(root.task, "$.request.task", diagnostics, 1, 4_096);
  const constraints = stringList(root.constraints, "$.request.constraints", diagnostics, 1, 16, 1_024);
  return task && constraints ? { task, constraints } : null;
}

function parseContext(value: unknown, diagnostics: ExchangeDiagnostic[]): ExchangeSource[] | null {
  const root = object(value, "$.context", diagnostics); if (!root) return null;
  unknown(root, ["sources"], "$.context", diagnostics);
  if (!Array.isArray(root.sources)) { diagnostic(diagnostics, "HCC-EXCHANGE-SCHEMA", "$.context.sources", "sources must be an array."); return null; }
  if (root.sources.length < 1 || root.sources.length > EXCHANGE_SOURCE_LIMIT) diagnostic(diagnostics, "HCC-EXCHANGE-LIMIT", "$.context.sources", `sources must contain 1-${EXCHANGE_SOURCE_LIMIT} entries.`);
  const sources = root.sources.map((item, index) => parseSource(item, `$.context.sources[${index}]`, diagnostics)).filter((item): item is ExchangeSource => item !== null);
  if (new Set(sources.map((item) => item.id)).size !== sources.length) diagnostic(diagnostics, "HCC-EXCHANGE-SCHEMA", "$.context.sources", "source IDs must be unique.");
  const contentLength = sources.reduce((sum, item) => sum + item.content.length, 0);
  if (contentLength > EXCHANGE_CONTEXT_CONTENT_LIMIT) diagnostic(diagnostics, "HCC-EXCHANGE-LIMIT", "$.context.sources", `combined source content exceeds ${EXCHANGE_CONTEXT_CONTENT_LIMIT} characters.`);
  return sources;
}

function parseSource(value: unknown, path: string, diagnostics: ExchangeDiagnostic[]): ExchangeSource | null {
  const root = object(value, path, diagnostics); if (!root) return null;
  unknown(root, ["id", "path", "digest", "authority", "sensitivity", "disclosure", "content"], path, diagnostics);
  const id = text(root.id, `${path}.id`, diagnostics, 1, 128); if (id && !ID.test(id)) diagnostic(diagnostics, "HCC-EXCHANGE-SCHEMA", `${path}.id`, "id must be normalized lowercase text.");
  const sourcePath = text(root.path, `${path}.path`, diagnostics, 1, 512); if (sourcePath && !safePath(sourcePath)) diagnostic(diagnostics, "HCC-EXCHANGE-SCHEMA", `${path}.path`, "path must be a normalized vault-relative Markdown path without traversal.");
  const digest = text(root.digest, `${path}.digest`, diagnostics, 71, 71); if (digest && !DIGEST.test(digest)) diagnostic(diagnostics, "HCC-EXCHANGE-DIGEST", `${path}.digest`, "digest must use sha256 plus 64 lowercase hexadecimal characters.");
  exact(root.authority, ["source", "evidence"], `${path}.authority`, diagnostics);
  exact(root.sensitivity, ["public", "internal", "private"], `${path}.sensitivity`, diagnostics);
  exact(root.disclosure, "manual-copy-approved", `${path}.disclosure`, diagnostics);
  const content = text(root.content, `${path}.content`, diagnostics, 1, EXCHANGE_SOURCE_CONTENT_LIMIT);
  if (!id || !sourcePath || !digest || !content || !["source", "evidence"].includes(String(root.authority)) || !["public", "internal", "private"].includes(String(root.sensitivity)) || root.disclosure !== "manual-copy-approved") return null;
  return { id, path: sourcePath, digest, authority: root.authority as ExchangeSource["authority"], sensitivity: root.sensitivity as ExchangeSource["sensitivity"], disclosure: "manual-copy-approved", content };
}

function parseHandling(value: unknown, diagnostics: ExchangeDiagnostic[]): ExchangeContract["handling"] | null {
  const root = object(value, "$.handling", diagnostics); if (!root) return null;
  unknown(root, ["disclosure", "destination", "provider", "retention"], "$.handling", diagnostics);
  exact(root.disclosure, "manual-copy-approved", "$.handling.disclosure", diagnostics);
  exact(root.destination, "user-selected", "$.handling.destination", diagnostics);
  exact(root.provider, "not-bound", "$.handling.provider", diagnostics);
  exact(root.retention, "unknown", "$.handling.retention", diagnostics);
  return root.disclosure === "manual-copy-approved" && root.destination === "user-selected" && root.provider === "not-bound" && root.retention === "unknown" ? { disclosure: "manual-copy-approved", destination: "user-selected", provider: "not-bound", retention: "unknown" } : null;
}

function parseOutput(value: unknown, diagnostics: ExchangeDiagnostic[]): ExchangeContract["output"] | null {
  const root = object(value, "$.output", diagnostics); if (!root) return null;
  unknown(root, ["kind", "version", "format"], "$.output", diagnostics);
  exact(root.kind, "hcc-studio", "$.output.kind", diagnostics); exact(root.version, "0.1-candidate.1", "$.output.version", diagnostics); exact(root.format, "yaml-only", "$.output.format", diagnostics);
  return root.kind === "hcc-studio" && root.version === "0.1-candidate.1" && root.format === "yaml-only" ? { kind: "hcc-studio", version: "0.1-candidate.1", format: "yaml-only" } : null;
}

function parseGovernance(value: unknown, diagnostics: ExchangeDiagnostic[]): ExchangeContract["governance"] | null {
  const root = object(value, "$.governance", diagnostics); if (!root) return null;
  unknown(root, ["authority", "human_review_required", "network", "persistence"], "$.governance", diagnostics);
  exact(root.authority, "proposal-only", "$.governance.authority", diagnostics); exact(root.human_review_required, true, "$.governance.human_review_required", diagnostics); exact(root.network, "prohibited", "$.governance.network", diagnostics); exact(root.persistence, "prohibited", "$.governance.persistence", diagnostics);
  return root.authority === "proposal-only" && root.human_review_required === true && root.network === "prohibited" && root.persistence === "prohibited" ? { authority: "proposal-only", human_review_required: true, network: "prohibited", persistence: "prohibited" } : null;
}

function object(value: unknown, path: string, diagnostics: ExchangeDiagnostic[]): Record<string, unknown> | null { if (typeof value !== "object" || value === null || Array.isArray(value)) { diagnostic(diagnostics, "HCC-EXCHANGE-SCHEMA", path, "value must be an object."); return null; } return value as Record<string, unknown>; }
function unknown(value: Record<string, unknown>, fields: readonly string[], path: string, diagnostics: ExchangeDiagnostic[]): void { const allowed = new Set(fields); for (const key of Object.keys(value)) if (!allowed.has(key)) diagnostic(diagnostics, "HCC-EXCHANGE-UNKNOWN", `${path}.${key}`, `Unknown field: ${key}.`); }
function text(value: unknown, path: string, diagnostics: ExchangeDiagnostic[], min: number, max: number): string | null { if (typeof value !== "string" || value.length < min || value.length > max) { diagnostic(diagnostics, "HCC-EXCHANGE-LIMIT", path, `value must be text between ${min} and ${max} characters.`); return null; } return value; }
function stringList(value: unknown, path: string, diagnostics: ExchangeDiagnostic[], min: number, max: number, itemMax: number): string[] | null { if (!Array.isArray(value) || value.length < min || value.length > max || value.some((item) => typeof item !== "string" || item.length < 1 || item.length > itemMax)) { diagnostic(diagnostics, "HCC-EXCHANGE-LIMIT", path, `value must contain ${min}-${max} text entries of at most ${itemMax} characters.`); return null; } return [...value] as string[]; }
function exact(value: unknown, expected: unknown | readonly unknown[], path: string, diagnostics: ExchangeDiagnostic[]): void { const allowed = Array.isArray(expected) ? expected : [expected]; if (!allowed.includes(value)) diagnostic(diagnostics, "HCC-EXCHANGE-AUTHORITY", path, `value must be ${allowed.map(String).join(" or ")}.`); }
function safePath(value: string): boolean { return !value.startsWith("/") && !value.includes("\\") && !value.includes("\0") && value.endsWith(".md") && value.split("/").every((part) => part !== "" && part !== "." && part !== ".."); }
function diagnostic(target: ExchangeDiagnostic[], code: ExchangeDiagnostic["code"], path: string, message: string): void { target.push({ code, path, message }); }
function failure(code: ExchangeDiagnostic["code"], path: string, message: string): ExchangeParseResult { return { ok: false, diagnostics: [{ code, path, message }] }; }
