export const CANDIDATE_INTERACTION_VERSION = "0.3-candidate.1" as const;
export const CANDIDATE_FAMILIES = ["hcc-interaction", "hcc-form", "hcc-view"] as const;
export const CANDIDATE_INPUT_KINDS = [
  "short_text", "number", "boolean", "date",
  "scale", "ranked_choice", "matrix", "repeatable_group",
  "dropdown", "multi_select", "time", "datetime",
  "duration", "currency", "email", "url",
  "month", "week", "percentage", "color",
  "phone", "tags", "numeric_range", "file_reference",
  "long_text", "radio_group", "rating", "date_range",
  "time_range", "unit_value", "key_value_list", "coordinates"
] as const;
export const CANDIDATE_RESPONSE_STATES = ["unanswered", "answered", "deferred", "not_applicable"] as const;

export type CandidateFamily = (typeof CANDIDATE_FAMILIES)[number];
export type CandidateInputKind = (typeof CANDIDATE_INPUT_KINDS)[number];
export type CandidateResponseState = (typeof CANDIDATE_RESPONSE_STATES)[number];
export type CandidateVisibility = "private" | "restricted" | "internal" | "public";

export type GrammarDiagnosticCode =
  | "HCC-GRAMMAR-PARSE-001"
  | "HCC-GRAMMAR-FAMILY-001"
  | "HCC-GRAMMAR-VERSION-001"
  | "HCC-GRAMMAR-KIND-001"
  | "HCC-GRAMMAR-SCHEMA-001"
  | "HCC-GRAMMAR-CONFIG-001"
  | "HCC-GRAMMAR-RESPONSE-001"
  | "HCC-GRAMMAR-UNKNOWN-001";

export interface GrammarDiagnostic {
  code: GrammarDiagnosticCode;
  failure: "parse-invalid" | "unknown-family" | "unsupported-version" | "unknown-kind" | "schema-invalid" | "semantic-invalid";
  path: string;
  message: string;
}

export interface CandidateOption { id: string; label: string }
export interface CandidateMatrixRow { id: string; label: string }
export interface CandidateRepeatableField {
  id: string;
  label: string;
  kind: "short_text" | "number" | "boolean" | "date";
  required: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export type CandidateResponseValue = string | number | boolean | string[] | Record<string, unknown> | Array<Record<string, unknown>> | null;
export interface CandidateResponse {
  value: CandidateResponseValue;
  note: string | null;
  state: CandidateResponseState;
  author: string | null;
  responded_at: string | null;
}

interface CandidateInteractionBase<K extends CandidateInputKind, C> {
  version: typeof CANDIDATE_INTERACTION_VERSION;
  id: string;
  kind: K;
  prompt: string;
  help?: string;
  config: C;
  response: CandidateResponse;
  visibility?: CandidateVisibility;
  source_refs?: string[];
}

export type CandidateInteraction =
  | CandidateInteractionBase<"short_text", { placeholder?: string; min_length?: number; max_length?: number }>
  | CandidateInteractionBase<"number", { min?: number; max?: number; step?: number; unit?: string }>
  | CandidateInteractionBase<"boolean", { true_label?: string; false_label?: string }>
  | CandidateInteractionBase<"date", { min?: string; max?: string }>
  | CandidateInteractionBase<"scale", { min: number; max: number; step: number; labels?: CandidateOption[] }>
  | CandidateInteractionBase<"ranked_choice", { options: CandidateOption[] }>
  | CandidateInteractionBase<"matrix", { rows: CandidateMatrixRow[]; columns: CandidateOption[]; selection: "one" | "many"; require_all_rows?: boolean }>
  | CandidateInteractionBase<"repeatable_group", { fields: CandidateRepeatableField[]; min_items?: number; max_items?: number }>
  | CandidateInteractionBase<"dropdown", { options: CandidateOption[]; placeholder?: string }>
  | CandidateInteractionBase<"multi_select", { options: CandidateOption[]; min_selections?: number; max_selections?: number }>
  | CandidateInteractionBase<"time", { min?: string; max?: string; step_minutes?: number }>
  | CandidateInteractionBase<"datetime", { min?: string; max?: string }>
  | CandidateInteractionBase<"duration", { min_minutes?: number; max_minutes?: number; step_minutes?: number; display_unit?: "minutes" | "hours" }>
  | CandidateInteractionBase<"currency", { currency: string; min?: number; max?: number; step?: number }>
  | CandidateInteractionBase<"email", { placeholder?: string; allow_multiple?: boolean }>
  | CandidateInteractionBase<"url", { placeholder?: string; allowed_schemes?: Array<"https" | "http"> }>
  | CandidateInteractionBase<"month", { min?: string; max?: string }>
  | CandidateInteractionBase<"week", { min?: string; max?: string }>
  | CandidateInteractionBase<"percentage", { min?: number; max?: number; step?: number }>
  | CandidateInteractionBase<"color", { format?: "hex" }>
  | CandidateInteractionBase<"phone", { placeholder?: string; min_length?: number; max_length?: number }>
  | CandidateInteractionBase<"tags", { suggestions?: CandidateOption[]; min_items?: number; max_items?: number; max_length?: number }>
  | CandidateInteractionBase<"numeric_range", { min?: number; max?: number; step?: number; unit?: string }>
  | CandidateInteractionBase<"file_reference", { extensions?: string[]; allow_missing?: boolean }>
  | CandidateInteractionBase<"long_text", { placeholder?: string; min_length?: number; max_length?: number; rows?: number }>
  | CandidateInteractionBase<"radio_group", { options: CandidateOption[]; orientation?: "vertical" | "horizontal" }>
  | CandidateInteractionBase<"rating", { min: number; max: number; step: number; min_label?: string; max_label?: string }>
  | CandidateInteractionBase<"date_range", { min?: string; max?: string }>
  | CandidateInteractionBase<"time_range", { min?: string; max?: string; step_minutes?: number }>
  | CandidateInteractionBase<"unit_value", { units: CandidateOption[]; min?: number; max?: number; step?: number }>
  | CandidateInteractionBase<"key_value_list", { key_label?: string; value_label?: string; min_items?: number; max_items?: number; max_length?: number }>
  | CandidateInteractionBase<"coordinates", { precision?: number; latitude_label?: string; longitude_label?: string }>;

export type CandidateGrammarParseResult =
  | { ok: true; family: "hcc-interaction"; block: CandidateInteraction; diagnostics: [] }
  | { ok: false; family: CandidateFamily | null; block?: undefined; diagnostics: GrammarDiagnostic[] };

export type FamilyIdentification =
  | { ok: true; family: CandidateFamily; support: "parse-and-validate" | "identified-only"; authority: "candidate-only" }
  | { ok: false; family: null; diagnostics: [GrammarDiagnostic] };

export interface RendererCatalogEntry {
  kind: CandidateInputKind;
  rendererId: string;
  contractVersions: readonly [typeof CANDIDATE_INTERACTION_VERSION];
  lifecycle: "candidate";
  reviewState: "human-review-required";
  accessibility: readonly string[];
  fallback: string;
  migration: "no-automatic-migration-before-admission";
}
