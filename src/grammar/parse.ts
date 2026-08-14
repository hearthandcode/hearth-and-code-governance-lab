import yaml from "js-yaml";

import { validateCandidateConfig } from "./config-validation";

import {
  CANDIDATE_FAMILIES,
  CANDIDATE_INPUT_KINDS,
  CANDIDATE_INTERACTION_VERSION,
  CANDIDATE_RESPONSE_STATES,
  type CandidateFamily,
  type CandidateGrammarParseResult,
  type CandidateInputKind,
  type CandidateInteraction,
  type CandidateOption,
  type CandidateRepeatableField,
  type CandidateResponse,
  type CandidateResponseValue,
  type FamilyIdentification,
  type GrammarDiagnostic
} from "./types";

const TOP_FIELDS = new Set(["version", "id", "kind", "prompt", "help", "config", "response", "visibility", "source_refs"]);
const RESPONSE_FIELDS = new Set(["value", "note", "state", "author", "responded_at"]);
const VISIBILITIES = new Set(["private", "restricted", "internal", "public"]);

export function identifyCandidateFamily(language: string): FamilyIdentification {
  if ((CANDIDATE_FAMILIES as readonly string[]).includes(language)) {
    const family = language as CandidateFamily;
    return {
      ok: true,
      family,
      support: family === "hcc-interaction" ? "parse-and-validate" : "identified-only",
      authority: "candidate-only"
    };
  }
  return {
    ok: false,
    family: null,
    diagnostics: [diag("HCC-GRAMMAR-FAMILY-001", "$fence", `Unknown HCC grammar family: ${language || "(empty)"}.`)]
  };
}

export function parseCandidateInteraction(source: string, family = "hcc-interaction"): CandidateGrammarParseResult {
  const identified = identifyCandidateFamily(family);
  if (!identified.ok) return { ok: false, family: null, diagnostics: identified.diagnostics };
  if (identified.family !== "hcc-interaction") {
    return {
      ok: false,
      family: identified.family,
      diagnostics: [diag("HCC-GRAMMAR-FAMILY-001", "$fence", `${identified.family} is identified but has no admitted parser in this candidate layer.`)]
    };
  }
  let value: unknown;
  try {
    value = yaml.load(source, { schema: yaml.JSON_SCHEMA });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown YAML parse error";
    return { ok: false, family: "hcc-interaction", diagnostics: [diag("HCC-GRAMMAR-PARSE-001", "$", `The YAML could not be parsed: ${message}`)] };
  }
  return validateCandidateInteraction(value);
}

function validateCandidateInteraction(value: unknown): CandidateGrammarParseResult {
  const diagnostics: GrammarDiagnostic[] = [];
  if (!isRecord(value)) return { ok: false, family: "hcc-interaction", diagnostics: [diag("HCC-GRAMMAR-SCHEMA-001", "$", "The candidate interaction must be an object.")] };
  rejectUnknown(value, TOP_FIELDS, "$", diagnostics);
  if (value.version !== CANDIDATE_INTERACTION_VERSION) {
    diagnostics.push(diag("HCC-GRAMMAR-VERSION-001", "$.version", `Candidate version must be ${CANDIDATE_INTERACTION_VERSION}; received ${String(value.version)}.`));
  }
  const id = stringRequired(value.id, "$.id", diagnostics);
  const prompt = stringRequired(value.prompt, "$.prompt", diagnostics);
  const kind = candidateKind(value.kind, diagnostics);
  const help = optionalString(value.help, "$.help", diagnostics);
  const visibility = optionalEnum(value.visibility, VISIBILITIES, "$.visibility", diagnostics);
  const sourceRefs = optionalStringList(value.source_refs, "$.source_refs", diagnostics);
  const config = kind === null ? null : validateCandidateConfig(value.config, kind, diagnostics);
  const response = validateResponse(value.response, diagnostics);
  if (kind && config && response) validateResponseValue(response, kind, config, diagnostics);
  if (diagnostics.length || !id || !prompt || !kind || !config || !response) {
    return { ok: false, family: "hcc-interaction", diagnostics };
  }
  const block = {
    version: CANDIDATE_INTERACTION_VERSION,
    id,
    kind,
    prompt,
    config,
    response,
    ...(help === undefined ? {} : { help }),
    ...(visibility === undefined ? {} : { visibility }),
    ...(sourceRefs === undefined ? {} : { source_refs: sourceRefs })
  } as CandidateInteraction;
  return { ok: true, family: "hcc-interaction", block, diagnostics: [] };
}

function candidateKind(value: unknown, diagnostics: GrammarDiagnostic[]): CandidateInputKind | null {
  if (typeof value !== "string" || !(CANDIDATE_INPUT_KINDS as readonly string[]).includes(value)) {
    diagnostics.push(diag("HCC-GRAMMAR-KIND-001", "$.kind", `Candidate kinds are ${CANDIDATE_INPUT_KINDS.join(", ")}; received ${String(value)}.`));
    return null;
  }
  return value as CandidateInputKind;
}

function validateResponse(value: unknown, diagnostics: GrammarDiagnostic[]): CandidateResponse | null {
  if (!isRecord(value)) {
    diagnostics.push(diag("HCC-GRAMMAR-RESPONSE-001", "$.response", "response must be an object."));
    return null;
  }
  rejectUnknown(value, RESPONSE_FIELDS, "$.response", diagnostics);
  for (const key of RESPONSE_FIELDS) if (!(key in value)) diagnostics.push(diag("HCC-GRAMMAR-RESPONSE-001", `$.response.${key}`, `${key} must be present, even when null.`));
  const state = value.state;
  if (typeof state !== "string" || !(CANDIDATE_RESPONSE_STATES as readonly string[]).includes(state)) diagnostics.push(diag("HCC-GRAMMAR-RESPONSE-001", "$.response.state", `Unknown response state: ${String(state)}.`));
  const note = nullableString(value.note, "$.response.note", diagnostics);
  const author = nullableString(value.author, "$.response.author", diagnostics);
  const respondedAt = nullableString(value.responded_at, "$.response.responded_at", diagnostics);
  return { value: value.value as CandidateResponseValue, note, state: (typeof state === "string" && (CANDIDATE_RESPONSE_STATES as readonly string[]).includes(state) ? state : "unanswered") as CandidateResponse["state"], author, responded_at: respondedAt };
}

function validateResponseValue(response: CandidateResponse, kind: CandidateInputKind, config: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): void {
  const value = response.value;
  let valid = value === null;
  if (kind === "short_text" || kind === "long_text") valid = value === null || typeof value === "string";
  if (kind === "number" || kind === "scale") valid = value === null || finiteNumber(value);
  if (kind === "boolean") valid = value === null || typeof value === "boolean";
  if (kind === "date") valid = value === null || isIsoDate(value);
  if (kind === "ranked_choice") valid = rankedValue(value, config.options as CandidateOption[]);
  if (kind === "dropdown") valid = value === null || (typeof value === "string" && (config.options as CandidateOption[]).some((option) => option.id === value));
  if (kind === "multi_select") valid = rankedValue(value, config.options as CandidateOption[]);
  if (kind === "time") valid = value === null || isIsoTime(value);
  if (kind === "datetime") valid = value === null || isIsoDateTime(value);
  if (kind === "duration" || kind === "currency") valid = value === null || finiteNumber(value);
  if (kind === "email") valid = value === null || (typeof value === "string" && emailValue(value, config.allow_multiple === true));
  if (kind === "url") valid = value === null || (typeof value === "string" && urlValue(value, config.allowed_schemes as string[] | undefined));
  if (kind === "month") valid = value === null || isIsoMonth(value);
  if (kind === "week") valid = value === null || isIsoWeek(value);
  if (kind === "percentage") valid = value === null || finiteNumber(value);
  if (kind === "color") valid = value === null || (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value));
  if (kind === "phone") valid = value === null || (typeof value === "string" && phoneValue(value));
  if (kind === "tags") valid = value === null || stringListValue(value, config);
  if (kind === "numeric_range") valid = value === null || numericRangeValue(value, config, diagnostics);
  if (kind === "file_reference") valid = value === null || (typeof value === "string" && fileReferenceValue(value, config.extensions as string[] | undefined));
  if (kind === "matrix") valid = matrixValue(value, config, diagnostics);
  if (kind === "repeatable_group") valid = repeatableValue(value, config, diagnostics);
  if (kind === "radio_group") valid = value === null || (typeof value === "string" && (config.options as CandidateOption[]).some((option) => option.id === value));
  if (kind === "rating") valid = value === null || finiteNumber(value);
  if (kind === "date_range") valid = temporalRangeValue(value, isIsoDate, config, diagnostics);
  if (kind === "time_range") valid = temporalRangeValue(value, isIsoTime, config, diagnostics);
  if (kind === "unit_value") valid = unitValue(value, config, diagnostics);
  if (kind === "key_value_list") valid = keyValueListValue(value, config, diagnostics);
  if (kind === "coordinates") valid = coordinateValue(value, diagnostics);
  if (!valid) diagnostics.push(diag("HCC-GRAMMAR-RESPONSE-001", "$.response.value", `Response value does not match ${kind}.`));
  if (finiteNumber(value)) validateNumericResponse(value, kind, config, diagnostics);
  if ((kind === "short_text" || kind === "long_text") && typeof value === "string") {
    if (typeof config.min_length === "number" && value.length < config.min_length) {
      semantic("$.response.value", "Value is shorter than min_length.", diagnostics, true);
    }
    if (typeof config.max_length === "number" && value.length > config.max_length) {
      semantic("$.response.value", "Value is longer than max_length.", diagnostics, true);
    }
  }
  if (kind === "rating" && finiteNumber(value)) validateNumericResponse(value, kind, config, diagnostics);
  if (kind === "date" && typeof value === "string") {
    if (typeof config.min === "string" && value < config.min) {
      semantic("$.response.value", "Date is before min.", diagnostics, true);
    }
    if (typeof config.max === "string" && value > config.max) {
      semantic("$.response.value", "Date is after max.", diagnostics, true);
    }
  }
  if (kind === "ranked_choice" && Array.isArray(value) && value.length !== (config.options as CandidateOption[]).length) {
    semantic("$.response.value", "A ranking must contain every declared option exactly once.", diagnostics, true);
  }
  if (kind === "multi_select" && Array.isArray(value)) {
    if (typeof config.min_selections === "number" && value.length < config.min_selections) {
      semantic("$.response.value", "Selection count is below min_selections.", diagnostics, true);
    }
    if (typeof config.max_selections === "number" && value.length > config.max_selections) {
      semantic("$.response.value", "Selection count exceeds max_selections.", diagnostics, true);
    }
  }
  if ((kind === "time" || kind === "datetime" || kind === "month" || kind === "week") && typeof value === "string") {
    if (typeof config.min === "string" && value < config.min) semantic("$.response.value", "Value is before min.", diagnostics, true);
    if (typeof config.max === "string" && value > config.max) semantic("$.response.value", "Value is after max.", diagnostics, true);
  }
  if (kind === "phone" && typeof value === "string") {
    if (typeof config.min_length === "number" && value.length < config.min_length) semantic("$.response.value", "Value is shorter than min_length.", diagnostics, true);
    if (typeof config.max_length === "number" && value.length > config.max_length) semantic("$.response.value", "Value is longer than max_length.", diagnostics, true);
  }
  if (kind === "time" && typeof value === "string" && typeof config.step_minutes === "number") {
    const [hours, minutes] = value.split(":").map(Number);
    const origin = typeof config.min === "string" ? timeToMinutes(config.min) : 0;
    if (((hours * 60 + minutes) - origin) % config.step_minutes !== 0) semantic("$.response.value", "Time does not align to step_minutes from min.", diagnostics, true);
  }
  const empty = value === null || value === "" || (Array.isArray(value) && value.length === 0) || (isRecord(value) && Object.keys(value).length === 0);
  if (response.state === "answered" && empty) semantic("$.response", "answered responses require a non-empty value.", diagnostics, true);
  if (response.state !== "answered" && !empty) semantic("$.response", `${response.state} responses must not retain a hidden value.`, diagnostics, true);
}

function temporalRangeValue(
  value: unknown,
  validator: (value: unknown) => boolean,
  config: Record<string, unknown>,
  diagnostics: GrammarDiagnostic[]
): boolean {
  if (value === null) return true;
  if (!isRecord(value) || Object.keys(value).some((key) => key !== "start" && key !== "end")) return false;
  if (!validator(value.start) || !validator(value.end)) return false;
  const start = value.start as string;
  const end = value.end as string;
  let valid = true;
  if (start > end) { semantic("$.response.value", "Range start must not be after end.", diagnostics, true); valid = false; }
  if (typeof config.min === "string" && start < config.min) { semantic("$.response.value.start", "Range starts before min.", diagnostics, true); valid = false; }
  if (typeof config.max === "string" && end > config.max) { semantic("$.response.value.end", "Range ends after max.", diagnostics, true); valid = false; }
  if (validator === isIsoTime && typeof config.step_minutes === "number") {
    const origin = typeof config.min === "string" ? timeToMinutes(config.min) : 0;
    for (const [key, item] of [["start", start], ["end", end]] as const) {
      if ((timeToMinutes(item) - origin) % config.step_minutes !== 0) { semantic(`$.response.value.${key}`, "Time does not align to step_minutes from min.", diagnostics, true); valid = false; }
    }
  }
  return valid;
}

function unitValue(value: unknown, config: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): boolean {
  if (value === null) return true;
  if (!isRecord(value) || Object.keys(value).some((key) => key !== "value" && key !== "unit") || !finiteNumber(value.value) || typeof value.unit !== "string") return false;
  let valid = (config.units as CandidateOption[]).some((option) => option.id === value.unit);
  if (!valid) semantic("$.response.value.unit", "Unit must be one of the declared unit IDs.", diagnostics, true);
  const before = diagnostics.length;
  validateNumericResponse(value.value, "unit_value", config, diagnostics);
  return valid && diagnostics.length === before;
}

function keyValueListValue(value: unknown, config: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): boolean {
  if (value === null) return true;
  if (!Array.isArray(value)) return false;
  let valid = true;
  const keys = new Set<string>();
  value.forEach((item, index) => {
    if (!isRecord(item) || Object.keys(item).some((key) => key !== "key" && key !== "value") || typeof item.key !== "string" || typeof item.value !== "string" || !item.key.trim()) { valid = false; return; }
    if (keys.has(item.key)) { semantic(`$.response.value[${index}].key`, "Keys must be unique.", diagnostics, true); valid = false; }
    keys.add(item.key);
    if (typeof config.max_length === "number" && (item.key.length > config.max_length || item.value.length > config.max_length)) { semantic(`$.response.value[${index}]`, "Key or value exceeds max_length.", diagnostics, true); valid = false; }
  });
  if (typeof config.min_items === "number" && value.length < config.min_items) valid = false;
  if (typeof config.max_items === "number" && value.length > config.max_items) valid = false;
  return valid;
}

function coordinateValue(value: unknown, diagnostics: GrammarDiagnostic[]): boolean {
  if (value === null) return true;
  if (!isRecord(value) || Object.keys(value).some((key) => key !== "latitude" && key !== "longitude") || !finiteNumber(value.latitude) || !finiteNumber(value.longitude)) return false;
  let valid = true;
  if (value.latitude < -90 || value.latitude > 90) { semantic("$.response.value.latitude", "Latitude must be between -90 and 90.", diagnostics, true); valid = false; }
  if (value.longitude < -180 || value.longitude > 180) { semantic("$.response.value.longitude", "Longitude must be between -180 and 180.", diagnostics, true); valid = false; }
  return valid;
}

function validateNumericResponse(value: number, kind: CandidateInputKind, config: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): void {
  const min = kind === "duration" ? config.min_minutes : config.min;
  const max = kind === "duration" ? config.max_minutes : config.max;
  const step = kind === "duration" ? config.step_minutes : config.step;
  if (typeof min === "number" && value < min) semantic("$.response.value", "Value is below min.", diagnostics, true);
  if (typeof max === "number" && value > max) semantic("$.response.value", "Value is above max.", diagnostics, true);
  if (typeof step === "number") {
    const quotient = (value - (typeof min === "number" ? min : 0)) / step;
    if (Math.abs(quotient - Math.round(quotient)) > 1e-9) semantic("$.response.value", "Value does not align to step from min.", diagnostics, true);
  }
}

function rankedValue(value: unknown, options: CandidateOption[]): boolean {
  if (value === null) return true;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return false;
  const ids = value as string[];
  const allowed = new Set(options.map((option) => option.id));
  return new Set(ids).size === ids.length && ids.every((id) => allowed.has(id));
}

function matrixValue(value: unknown, config: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): boolean {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  const rows = config.rows as CandidateOption[];
  const columns = config.columns as CandidateOption[];
  const rowIds = new Set(rows.map((row) => row.id));
  const columnIds = new Set(columns.map((column) => column.id));
  let valid = true;
  for (const [row, answer] of Object.entries(value)) {
    if (!rowIds.has(row)) { semantic(`$.response.value.${row}`, "Unknown matrix row.", diagnostics, true); valid = false; continue; }
    const answers = config.selection === "many" ? answer : [answer];
    if (!Array.isArray(answers) || answers.some((item) => typeof item !== "string" || !columnIds.has(item))) valid = false;
  }
  if (config.require_all_rows === true) {
    for (const row of rows) if (!(row.id in value)) { semantic(`$.response.value.${row.id}`, "A response is required for this matrix row.", diagnostics, true); valid = false; }
  }
  return valid;
}

function repeatableValue(value: unknown, config: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): boolean {
  if (value === null) return true;
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) return false;
  const fields = config.fields as CandidateRepeatableField[];
  const byId = new Map(fields.map((field) => [field.id, field]));
  let valid = true;
  value.forEach((item, index) => {
    if (!isRecord(item)) return;
    for (const key of Object.keys(item)) if (!byId.has(key)) { semantic(`$.response.value[${index}].${key}`, "Unknown repeatable field.", diagnostics, true); valid = false; }
    for (const field of fields) {
      const answer = item[field.id];
      if (field.required && (answer === undefined || answer === null || answer === "")) { semantic(`$.response.value[${index}].${field.id}`, "Required repeatable field is empty.", diagnostics, true); valid = false; }
      if (answer !== undefined && answer !== null && !leafValueMatches(field.kind, answer)) valid = false;
      if (field.kind === "number" && finiteNumber(answer)) {
        if (typeof field.min === "number" && answer < field.min) valid = false;
        if (typeof field.max === "number" && answer > field.max) valid = false;
        if (typeof field.step === "number") {
          const quotient = (answer - (field.min ?? 0)) / field.step;
          if (Math.abs(quotient - Math.round(quotient)) > 1e-9) valid = false;
        }
      }
    }
  });
  if (typeof config.min_items === "number" && value.length < config.min_items) valid = false;
  if (typeof config.max_items === "number" && value.length > config.max_items) valid = false;
  return valid;
}

function leafValueMatches(kind: CandidateRepeatableField["kind"], value: unknown): boolean {
  if (kind === "short_text") return typeof value === "string";
  if (kind === "number") return finiteNumber(value);
  if (kind === "boolean") return typeof value === "boolean";
  return isIsoDate(value);
}

function rejectUnknown(value: Record<string, unknown>, allowed: Set<string>, path: string, diagnostics: GrammarDiagnostic[]): void {
  for (const key of Object.keys(value)) if (!allowed.has(key)) diagnostics.push(diag("HCC-GRAMMAR-UNKNOWN-001", `${path}.${key}`, `Unknown field: ${key}.`));
}

function stringRequired(value: unknown, path: string, diagnostics: GrammarDiagnostic[]): string | null {
  if (typeof value !== "string" || !value.trim()) { diagnostics.push(diag("HCC-GRAMMAR-SCHEMA-001", path, "A non-empty string is required.")); return null; }
  return value;
}

function optionalString(value: unknown, path: string, diagnostics: GrammarDiagnostic[]): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") diagnostics.push(diag("HCC-GRAMMAR-SCHEMA-001", path, "Expected a string."));
  return typeof value === "string" ? value : undefined;
}

function nullableString(value: unknown, path: string, diagnostics: GrammarDiagnostic[]): string | null {
  if (value === null) return null;
  if (typeof value !== "string") diagnostics.push(diag("HCC-GRAMMAR-RESPONSE-001", path, "Expected a string or null."));
  return typeof value === "string" ? value : null;
}

function optionalStringList(value: unknown, path: string, diagnostics: GrammarDiagnostic[]): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) { diagnostics.push(diag("HCC-GRAMMAR-SCHEMA-001", path, "Expected non-empty strings.")); return undefined; }
  return [...value];
}

function optionalEnum(value: unknown, allowed: Set<string>, path: string, diagnostics: GrammarDiagnostic[]): CandidateInteraction["visibility"] | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !allowed.has(value)) { diagnostics.push(diag("HCC-GRAMMAR-SCHEMA-001", path, "Unknown visibility.")); return undefined; }
  return value as CandidateInteraction["visibility"];
}

function semantic(path: string, message: string, diagnostics: GrammarDiagnostic[], response = false): void {
  diagnostics.push(diag(response ? "HCC-GRAMMAR-RESPONSE-001" : "HCC-GRAMMAR-CONFIG-001", path, message));
}

function finiteNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function isIsoTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
function isIsoDateTime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4}-\d{2}-\d{2})T(([01]\d|2[0-3]):[0-5]\d)$/.exec(value);
  return match !== null && isIsoDate(match[1]) && isIsoTime(match[2]);
}
function isIsoMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
function isIsoWeek(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(value)) return false;
  const [yearText, weekText] = value.split("-W");
  const year = Number(yearText); const week = Number(weekText);
  const december28 = new Date(Date.UTC(year, 11, 28));
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const maxWeek = Math.ceil(((december28.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7);
  return week <= maxWeek;
}
function emailValue(value: string, multiple: boolean): boolean {
  const values = multiple ? value.split(",").map((item) => item.trim()) : [value];
  return values.length > 0 && values.every((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
}
function urlValue(value: string, schemes: string[] | undefined): boolean {
  try {
    const parsed = new URL(value);
    const allowed = new Set((schemes ?? ["https"]).map((scheme) => `${scheme}:`));
    return allowed.has(parsed.protocol) && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}
function phoneValue(value: string): boolean {
  return /^\+?[0-9][0-9 .()\-]{2,31}$/.test(value);
}
function stringListValue(value: unknown, config: Record<string, unknown>): boolean {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) return false;
  const tags = value as string[];
  if (new Set(tags.map((item) => item.toLowerCase())).size !== tags.length) return false;
  if (typeof config.min_items === "number" && tags.length < config.min_items) return false;
  if (typeof config.max_items === "number" && tags.length > config.max_items) return false;
  const maxLength = typeof config.max_length === "number" ? config.max_length : undefined;
  return !(maxLength !== undefined && tags.some((item) => item.length > maxLength));
}
function numericRangeValue(value: unknown, config: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): boolean {
  if (!isRecord(value) || Object.keys(value).some((key) => key !== "lower" && key !== "upper") || !finiteNumber(value.lower) || !finiteNumber(value.upper)) return false;
  if (value.lower > value.upper) { semantic("$.response.value", "Range lower must not exceed upper.", diagnostics, true); return false; }
  for (const bound of [value.lower, value.upper]) {
    if (typeof config.min === "number" && bound < config.min) return false;
    if (typeof config.max === "number" && bound > config.max) return false;
    if (typeof config.step === "number") {
      const quotient = (bound - (typeof config.min === "number" ? config.min : 0)) / config.step;
      if (Math.abs(quotient - Math.round(quotient)) > 1e-9) return false;
    }
  }
  return true;
}
function fileReferenceValue(value: string, extensions: string[] | undefined): boolean {
  if (value.startsWith("/") || value.includes("\\") || value.split("/").some((segment) => segment === "" || segment === ".." || segment.startsWith(".")) || /^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  return !extensions || extensions.some((extension) => value.toLowerCase().endsWith(extension));
}

function diag(code: GrammarDiagnostic["code"], path: string, message: string): GrammarDiagnostic {
  const failure: GrammarDiagnostic["failure"] = code === "HCC-GRAMMAR-PARSE-001" ? "parse-invalid"
    : code === "HCC-GRAMMAR-FAMILY-001" ? "unknown-family"
      : code === "HCC-GRAMMAR-VERSION-001" ? "unsupported-version"
        : code === "HCC-GRAMMAR-KIND-001" ? "unknown-kind"
          : code === "HCC-GRAMMAR-CONFIG-001" || code === "HCC-GRAMMAR-RESPONSE-001" ? "semantic-invalid"
            : "schema-invalid";
  return { code, failure, path, message };
}
