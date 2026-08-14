export const RESPONSE_PACKET_VERSION = "0.1-candidate.1" as const;
export const RESPONSE_PACKET_AMENDMENT_VERSION = "0.2-candidate.1" as const;
export const RESPONSE_WRITE_POLICY_VERSION = "0.1-candidate.1" as const;

export interface ResponsePacketEntry {
  interaction_id: string;
  interaction_kind: string;
  interaction_version: string;
  response: unknown;
  observed_at: string;
}

export interface ResponsePacketCandidate {
  record_type: "hcc-worksheet-response-packet";
  contract_version: typeof RESPONSE_PACKET_VERSION;
  authority: "immutable-intake-candidate-proposal";
  immutable: true;
  session_id: string;
  worksheet_binding: { worksheet_id: string; worksheet_version: string; source_path: string; source_digest: string };
  started_at: string;
  prepared_at: string;
  respondent: string | null;
  responses: ResponsePacketEntry[];
  review: { required_complete: boolean; missing_required: string[]; human_gate: "required" };
  downstream: {
    action_candidates: "not-generated";
    decision_candidates: "not-generated";
    work_item_candidates: "not-generated";
    canonical_write_back: "prohibited";
  };
  effects: { persistence: "prohibited-step-8-held" | "vault-local-create-only"; submission: "prohibited" };
}

export interface ResponsePacketLineage {
  root_session_id: string;
  predecessor_session_id: string;
  predecessor_path: string;
  predecessor_digest: string;
  amendment_reason: string;
}

export type AmendedResponsePacketCandidate = Omit<ResponsePacketCandidate, "contract_version"> & {
  contract_version: typeof RESPONSE_PACKET_AMENDMENT_VERSION;
  record_id: string;
  revision: number;
  lineage: ResponsePacketLineage;
};

export type ReloadableResponsePacket = ResponsePacketCandidate | AmendedResponsePacketCandidate;

export interface ResponseWritePolicyCandidate {
  record_type: "hcc-response-write-policy-candidate";
  contract_version: typeof RESPONSE_WRITE_POLICY_VERSION;
  mode: "immutable-new-file";
  vault_scope: "current-vault";
  target_folder: string;
  filename_template: "{worksheet_id}--{session_id}.yaml";
  content_format: "yaml";
  conflict: "fail";
  require_source_digest: true;
  require_complete: true;
  allowed_privacy: readonly ("private" | "restricted" | "internal" | "public")[];
  human_gate: "per-write";
  canonical_apply: "prohibited";
}

export interface WriterSourceContext {
  worksheetId: string;
  sourcePath: string;
  sourceDigest: string;
  privacy: "private" | "restricted" | "internal" | "public";
}

export interface WriterDiagnostic {
  code: "HCC-WRITER-PARSE" | "HCC-WRITER-SCHEMA" | "HCC-WRITER-SOURCE" | "HCC-WRITER-TARGET" | "HCC-WRITER-AUTHORITY" | "HCC-WRITER-LINEAGE";
  path: string;
  message: string;
}

export interface ResponseWritePlan {
  recordType: "hcc-response-write-plan-candidate";
  contractVersion: "0.1-candidate.1";
  targetPath: string;
  contentFormat: "yaml";
  bytes: string;
  byteLength: number;
  digest: string;
  conflict: "fail";
  confirmation: "required-per-write";
  source: { path: string; digest: string; worksheetId: string };
  authority: "immutable-intake-candidate-only";
  declaredNonEffects: readonly ["no-overwrite", "no-append", "no-frontmatter-mutation", "no-canonical-apply"];
}

export type WriterPlanResult = { ok: true; plan: ResponseWritePlan; diagnostics: [] } | { ok: false; diagnostics: WriterDiagnostic[] };
export type DigestFunction = (value: string) => Promise<string>;

export interface ResponseReloadContext extends WriterSourceContext {
  packetPath: string;
  packetDigest: string;
  interactionIds: readonly string[];
}

export interface ResponseReloadPlan {
  recordType: "hcc-response-reload-plan-candidate";
  contractVersion: "0.1-candidate.1";
  packet: { path: string; digest: string; sessionId: string; recordId: string; revision: number };
  worksheet: { id: string; path: string; digest: string };
  responses: ResponsePacketEntry[];
  declaredNonEffects: readonly ["no-vault-read", "no-write", "no-overwrite", "no-canonical-apply"];
}

export type ResponseReloadResult = { ok: true; plan: ResponseReloadPlan; diagnostics: [] } | { ok: false; diagnostics: WriterDiagnostic[] };

export interface ResponseAmendmentContext extends WriterSourceContext {
  predecessorPath: string;
  predecessorDigest: string;
  amendmentReason: string;
}

export type ResponseAmendmentPlan = Omit<ResponseWritePlan, "recordType" | "contractVersion"> & {
  recordType: "hcc-response-amendment-plan-candidate";
  contractVersion: "0.2-candidate.1";
  lineage: { recordId: string; revision: number; predecessorPath: string; predecessorDigest: string };
};

export type CreateOnlyCandidatePlan = Pick<ResponseWritePlan, "targetPath" | "bytes" | "digest">;

export type ResponseAmendmentResult = { ok: true; plan: ResponseAmendmentPlan; diagnostics: [] } | { ok: false; diagnostics: WriterDiagnostic[] };

export interface CreateOnlyReceipt {
  recordType: "hcc-create-only-memory-receipt";
  targetPath: string;
  digest: string;
  result: "created";
  effect: "in-memory-test-only";
}

export interface VaultPacketWriteReceipt {
  recordType: "hcc-vault-response-write-receipt";
  targetPath: string;
  digest: string;
  byteLength: number;
  result: "created";
  readBack: "verified";
  effect: "vault-local-create-only";
}
