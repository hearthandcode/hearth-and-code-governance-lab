export const STUDIO_VERSION = "0.1-candidate.1" as const;

export const STUDIO_FIELD_TYPES = ["string", "number", "boolean", "date", "enum", "reference", "object", "array"] as const;
export type StudioFieldType = (typeof STUDIO_FIELD_TYPES)[number];

export const STUDIO_INVARIANT_KINDS = ["required_fields", "unique_field", "allowed_values", "reference_exists", "chronological_order"] as const;
export type StudioInvariantKind = (typeof STUDIO_INVARIANT_KINDS)[number];

export const STUDIO_GUARD_KINDS = ["all_required", "value_equals", "human_gate_satisfied", "source_digest_matches"] as const;
export type StudioGuardKind = (typeof STUDIO_GUARD_KINDS)[number];

export const STUDIO_EFFECT_KINDS = ["prepare_candidate", "prepare_receipt", "copy_projection", "request_human_review"] as const;
export type StudioEffectKind = (typeof STUDIO_EFFECT_KINDS)[number];

export const STUDIO_RECOVERY_KINDS = ["fail_closed", "retry_manual", "create_successor", "revert_candidate"] as const;
export type StudioRecoveryKind = (typeof STUDIO_RECOVERY_KINDS)[number];

export const STUDIO_MIGRATION_ACTIONS = ["rename", "copy", "drop", "manual"] as const;
export type StudioMigrationAction = (typeof STUDIO_MIGRATION_ACTIONS)[number];

export type StudioScalar = string | number | boolean | null;

export interface StudioSourceBinding {
  id: string;
  path: string;
  digest: string;
  authority: "source" | "evidence" | "proposal" | "projection";
  sensitivity: "private" | "internal" | "public" | "restricted";
}

export interface StudioContextAxis { id: string; label: string; question: string; }
export interface StudioField { id: string; label: string; type: StudioFieldType; required: boolean; vocabulary_ref?: string; }
export interface StudioRecordType { id: string; label: string; description: string; fields: StudioField[]; }
export interface StudioVocabulary { id: string; source_ref: string; version: string; terms: string[]; }
export interface StudioInvariant { id: string; kind: StudioInvariantKind; field_refs: string[]; message: string; }
export interface StudioMigrationMapping { from: string; to: string | null; action: StudioMigrationAction; }
export interface StudioMigration {
  from_version: string;
  to_version: string;
  compatibility: "compatible" | "conditional" | "breaking";
  mappings: StudioMigrationMapping[];
  loss_report: string[];
  reversal: string;
}

export interface StudioSchemaCandidate {
  id: string;
  version: string;
  semantic_owner: string;
  record_types: StudioRecordType[];
  vocabularies: StudioVocabulary[];
  invariants: StudioInvariant[];
  migration: StudioMigration;
}

export interface StudioState { id: string; label: string; terminal: boolean; }
export interface StudioActor { id: string; label: string; authority: "human" | "agent" | "system"; }
export interface StudioGuard {
  id: string;
  kind: StudioGuardKind;
  field_refs: string[];
  expected?: StudioScalar;
  gate_ref?: string;
  source_ref?: string;
  digest?: string;
}
export interface StudioEffect { id: string; kind: StudioEffectKind; target: string; authority: "proposal-only"; }
export interface StudioRecovery { id: string; kind: StudioRecoveryKind; description: string; }
export interface StudioHumanGate { id: string; label: string; required: true; authority: "human"; }
export interface StudioTransition {
  id: string;
  label: string;
  from: string;
  to: string;
  actor_ref: string;
  guard_refs: string[];
  effect_refs: string[];
  recovery_ref: string;
  human_gate_ref: string;
  receipt: string;
}
export interface StudioWorkflowCandidate {
  id: string;
  version: string;
  states: StudioState[];
  actors: StudioActor[];
  guards: StudioGuard[];
  effects: StudioEffect[];
  recoveries: StudioRecovery[];
  human_gates: StudioHumanGate[];
  transitions: StudioTransition[];
}

export type StudioDashboardSelector = "program_status" | "active_lanes" | "pending_seals" | "review_queue" | "programs" | "threads" | "handoffs";
export interface StudioProjectionSpec { id: string; title: string; selector: StudioDashboardSelector; }

export interface StudioContract {
  version: typeof STUDIO_VERSION;
  id: string;
  title: string;
  purpose: string;
  context: { charter_refs: string[]; sources: StudioSourceBinding[]; axes: StudioContextAxis[]; };
  schema: StudioSchemaCandidate;
  workflow: StudioWorkflowCandidate;
  projections: StudioProjectionSpec[];
  governance: {
    authority: "proposal-only";
    review_required: true;
    verification_required: false;
    admission: "prohibited";
  };
}

export interface StudioDiagnostic {
  code: "HCC-STUDIO-PARSE" | "HCC-STUDIO-SCHEMA" | "HCC-STUDIO-UNKNOWN" | "HCC-STUDIO-SEMANTIC" | "HCC-STUDIO-REFERENCE" | "HCC-STUDIO-LIMIT" | "HCC-STUDIO-AUTHORITY";
  path: string;
  message: string;
}

export type StudioParseResult = { ok: true; studio: StudioContract; diagnostics: [] } | { ok: false; diagnostics: StudioDiagnostic[] };

export interface StudioScaleProfile {
  dimensions: readonly { id: string; label: string }[];
  featureFamilies: readonly { id: string; label: string }[];
  reviewContracts: readonly { id: string; label: string }[];
}

export interface StudioProjectionModel {
  record_type: "hcc-schema-workflow-studio-projection";
  contract_version: typeof STUDIO_VERSION;
  authority: "projection-only";
  studio: StudioContract;
  counts: {
    sources: number; axes: number; record_types: number; fields: number; vocabularies: number; invariants: number;
    states: number; actors: number; guards: number; effects: number; recoveries: number; human_gates: number; transitions: number; projections: number;
  };
  scale: StudioScaleProfile;
  effects: { schema_admission: "prohibited"; workflow_advance: "prohibited"; source_mutation: "prohibited"; network: "prohibited"; };
}

export type StudioTransitionInspection =
  | { ok: true; transition: StudioTransition; structural_status: "valid-reference-graph"; advancement: "prohibited" }
  | { ok: false; diagnostics: StudioDiagnostic[]; advancement: "prohibited" };
