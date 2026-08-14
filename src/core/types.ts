export const SUPPORTED_VERSION = "0.1" as const;
export const SUPPORTED_KINDS = ["choose_one", "choose_many", "long_text"] as const;
export const RESPONSE_STATES = ["unanswered", "answered", "deferred", "not_applicable"] as const;

export type SupportedKind = (typeof SUPPORTED_KINDS)[number];
export type ResponseState = (typeof RESPONSE_STATES)[number];

export interface InteractionOption {
  id: string;
  label: string;
}

export interface InteractionResponse {
  value: string | string[] | null;
  note: string | null;
  state: ResponseState;
  author: string | null;
  responded_at: string | null;
}

export interface InteractionBlock {
  version: typeof SUPPORTED_VERSION;
  id: string;
  kind: SupportedKind;
  prompt: string;
  help?: string;
  options?: InteractionOption[];
  response: InteractionResponse;
  visibility?: "private" | "restricted" | "internal" | "public";
  source_refs?: string[];
}

export type CompanionFailureCode =
  | "unsupported-contract-version"
  | "unknown-interaction-kind"
  | "schema-invalid"
  | "semantic-invalid"
  | "source-digest-mismatch"
  | "relationship-target-unresolved"
  | "relationship-metadata-unknown"
  | "adjacent-item-cap-reached"
  | "privacy-boundary-unresolved"
  | "consent-state-unresolved"
  | "route-unresolved"
  | "stale-source"
  | "capability-denied"
  | "human-gate-required"
  | "public-projection-response-prohibited";

export type DiagnosticCode =
  | "HCC-PARSE-001"
  | "HCC-SCHEMA-001"
  | "HCC-VERSION-001"
  | "HCC-KIND-001"
  | "HCC-OPTIONS-001"
  | "HCC-RESPONSE-001"
  | "HCC-UNKNOWN-001";

export interface Diagnostic {
  code: DiagnosticCode;
  failure: CompanionFailureCode;
  path: string;
  message: string;
}

export type ParseResult =
  | { ok: true; block: InteractionBlock; diagnostics: [] }
  | { ok: false; block?: undefined; diagnostics: Diagnostic[] };

export interface InteractionViewModel {
  version: typeof SUPPORTED_VERSION;
  id: string;
  kind: SupportedKind;
  prompt: string;
  help: string | null;
  options: InteractionOption[];
  response: InteractionResponse;
  visibility: "private" | "restricted" | "internal" | "public";
  sourceRefs: string[];
  widgetCatalogId: string;
  phaseNotice: string;
}

export const RELATIONSHIP_FIELDS = ["related", "graph_refs", "thread_refs", "work_item_refs", "source_refs"] as const;
export type RelationshipField = (typeof RELATIONSHIP_FIELDS)[number];

export interface RelationshipCandidate {
  relationship: RelationshipField;
  target: string;
}

export interface AdjacentItem {
  relationship: RelationshipField;
  target: string;
  resolvedPath: string | null;
  title: string;
  authorityLabel: string | null;
  reviewLabel: string | null;
  verifiedLabel: string | null;
}

export interface AdjacentWorkModel {
  items: AdjacentItem[];
  moreNotShown: number;
  diagnostics: Array<{
    failure: Extract<CompanionFailureCode,
      "relationship-target-unresolved" | "relationship-metadata-unknown" | "adjacent-item-cap-reached">;
    message: string;
  }>;
}

export interface CompanionContext {
  sourcePath: string;
  sourceDigest: string | null;
  adjacentWork: AdjacentWorkModel;
  openTarget?: (target: string) => void;
  copyPath?: (target: string) => Promise<void>;
}

export interface HeldIntakePreview {
  label: "candidate preview — not saved, not submitted, not canonical";
  locallyValid: true;
  projection: {
    contract: "intake-response-envelope-v0.2-shape-preview";
    contractVersion: "0.2.0-candidate.1";
    immutable: true;
    effectRequest: "evaluate-only";
    interactionBinding: {
      interactionId: string;
      interactionVersion: typeof SUPPORTED_VERSION;
      interactionKind: SupportedKind;
      sourcePath: string;
      sourceDigest: string | null;
    };
    localDraft: InteractionResponse;
    intakeMapping: {
      rendererId: null;
      formBinding: null;
      route: null;
      consent: "unresolved";
      privacy: "unresolved" | "declared-local-only";
    };
  };
  gates: Array<{ failure: CompanionFailureCode; message: string }>;
}

export interface AdjacentResponseCandidate {
  record_type: "hcc-response-candidate";
  contract_version: "0.1-candidate.1";
  authority: "proposal-only";
  immutable: true;
  id: string;
  interaction_ref: string;
  source_binding: {
    path: string;
    digest: string | null;
    interaction_version: typeof SUPPORTED_VERSION;
  };
  response: InteractionResponse;
  review: {
    state: "draft";
    human_gate: "required";
  };
  integrity: {
    canonicalization: "unreleased";
    payload_digest: null;
    idempotency_key: null;
  };
  effects: {
    save: "prohibited";
    submit: "prohibited";
  };
}

export interface AdjacentResponseReview {
  label: "proposal only — not written, submitted, or admitted";
  candidate: AdjacentResponseCandidate;
  yaml: string;
  proposedDiff: string;
  gates: Array<{ failure: CompanionFailureCode; message: string }>;
}
