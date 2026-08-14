export const WORKSHEET_VERSION = "0.1-candidate.1" as const;
export const WORKBOOK_VERSION = "0.1-candidate.1" as const;

export type WorksheetPrivacy = "private" | "restricted" | "internal" | "public";

export interface WorksheetSection {
  id: string;
  title: string;
  interactions: string[];
}

export interface WorksheetContract {
  version: typeof WORKSHEET_VERSION;
  id: string;
  title: string;
  purpose: string;
  privacy: WorksheetPrivacy;
  sections: WorksheetSection[];
  completion: { required: string[] };
  workbook_ref?: string;
  governance: {
    authority_refs: string[];
    review_required: boolean;
    verification_required: boolean;
  };
}

export interface WorkbookWorksheetRef {
  id: string;
  label: string;
  ref: string;
}

export interface WorkbookContract {
  version: typeof WORKBOOK_VERSION;
  id: string;
  title: string;
  purpose: string;
  worksheets: WorkbookWorksheetRef[];
  navigation: "sequential" | "free";
  governance: {
    authority_refs: string[];
    review_required: boolean;
  };
}

export interface WorkbookDiagnostic {
  code: "HCC-WORKBOOK-PARSE" | "HCC-WORKBOOK-SCHEMA" | "HCC-WORKBOOK-UNKNOWN" | "HCC-WORKBOOK-SEMANTIC";
  path: string;
  message: string;
}

export type WorksheetParseResult =
  | { ok: true; worksheet: WorksheetContract; diagnostics: [] }
  | { ok: false; diagnostics: WorkbookDiagnostic[] };

export type WorkbookParseResult =
  | { ok: true; workbook: WorkbookContract; diagnostics: [] }
  | { ok: false; diagnostics: WorkbookDiagnostic[] };

export interface SessionResponseEntry {
  interaction_id: string;
  interaction_kind: string;
  interaction_version: string;
  response: unknown;
  observed_at: string;
}

export interface DraftSessionProposal {
  record_type: "hcc-worksheet-session-draft";
  contract_version: "0.1-candidate.1";
  authority: "noncanonical-mutable-draft-proposal";
  session_id: string;
  worksheet_binding: {
    worksheet_id: string;
    worksheet_version: string;
    source_path: string;
    source_digest: string | null;
  };
  started_at: string;
  prepared_at: string;
  respondent: null;
  responses: SessionResponseEntry[];
  effects: { persistence: "prohibited-step-8-held" };
}

export interface FinalSessionProposal {
  record_type: "hcc-worksheet-response-packet";
  contract_version: "0.1-candidate.1";
  authority: "immutable-intake-candidate-proposal";
  immutable: true;
  session_id: string;
  worksheet_binding: DraftSessionProposal["worksheet_binding"];
  started_at: string;
  prepared_at: string;
  respondent: null;
  responses: SessionResponseEntry[];
  review: {
    required_complete: boolean;
    missing_required: string[];
    human_gate: "required";
  };
  downstream: {
    action_candidates: "not-generated";
    decision_candidates: "not-generated";
    work_item_candidates: "not-generated";
    canonical_write_back: "prohibited";
  };
  effects: { persistence: "prohibited-step-8-held" | "vault-local-create-only"; submission: "prohibited" };
}
