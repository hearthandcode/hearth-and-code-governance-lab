import { dump } from "js-yaml";

import { explicitYamlPath, packetIdentity, parseReloadableResponsePacket, validAmendmentReason } from "./lineage";
import { canonicalYamlBytes } from "./plan";
import { parseResponsePacket, parseResponseWritePolicy } from "./parse";
import { RESPONSE_PACKET_AMENDMENT_VERSION, type DigestFunction, type ResponseAmendmentContext, type ResponseAmendmentResult, type WriterDiagnostic } from "./types";

export async function compileResponseAmendmentPlan(
  predecessorSource: string,
  nextPacketSource: string,
  policySource: string,
  context: ResponseAmendmentContext,
  digest: DigestFunction
): Promise<ResponseAmendmentResult> {
  const predecessorResult = parseReloadableResponsePacket(predecessorSource);
  const nextResult = parseResponsePacket(nextPacketSource);
  const policyResult = parseResponseWritePolicy(policySource);
  const diagnostics: WriterDiagnostic[] = [
    ...(predecessorResult.ok ? [] : predecessorResult.diagnostics),
    ...(nextResult.ok ? [] : nextResult.diagnostics),
    ...(policyResult.ok ? [] : policyResult.diagnostics)
  ];
  if (!predecessorResult.ok || !nextResult.ok || !policyResult.ok) return { ok: false, diagnostics };
  if (!explicitYamlPath(context.predecessorPath)) diagnostics.push({ code: "HCC-WRITER-LINEAGE", path: "$.predecessorPath", message: "Amendment requires one explicit predecessor YAML path." });
  const predecessorBytes = canonicalYamlBytes(predecessorSource);
  const predecessorDigest = await digest(predecessorBytes);
  if (predecessorDigest !== context.predecessorDigest) diagnostics.push({ code: "HCC-WRITER-LINEAGE", path: "$.predecessorDigest", message: "The predecessor digest does not match its exact bytes." });
  const predecessor = predecessorResult.packet; const next = nextResult.packet; const policy = policyResult.policy;
  for (const [path, previous, current] of [
    ["$.worksheet_binding.worksheet_id", predecessor.worksheet_binding.worksheet_id, next.worksheet_binding.worksheet_id],
    ["$.worksheet_binding.source_path", predecessor.worksheet_binding.source_path, next.worksheet_binding.source_path],
    ["$.worksheet_binding.source_digest", predecessor.worksheet_binding.source_digest, next.worksheet_binding.source_digest]
  ] as const) if (previous !== current) diagnostics.push({ code: "HCC-WRITER-LINEAGE", path, message: "An amendment cannot change worksheet identity or source binding." });
  if (next.worksheet_binding.worksheet_id !== context.worksheetId || next.worksheet_binding.source_path !== context.sourcePath || next.worksheet_binding.source_digest !== context.sourceDigest) diagnostics.push({ code: "HCC-WRITER-SOURCE", path: "$.worksheet_binding", message: "The successor packet does not match the current worksheet context." });
  if (next.session_id === predecessor.session_id) diagnostics.push({ code: "HCC-WRITER-LINEAGE", path: "$.session_id", message: "A successor requires a new session ID." });
  if (!next.review.required_complete || next.review.missing_required.length) diagnostics.push({ code: "HCC-WRITER-AUTHORITY", path: "$.review", message: "Every required response must be complete before an amendment plan is offered." });
  if (!policy.allowed_privacy.includes(context.privacy)) diagnostics.push({ code: "HCC-WRITER-AUTHORITY", path: "$.allowed_privacy", message: `The policy does not admit ${context.privacy} worksheet content.` });
  if (!validAmendmentReason(context.amendmentReason)) diagnostics.push({ code: "HCC-WRITER-LINEAGE", path: "$.amendmentReason", message: "An evaluator-supplied amendment reason of 1 to 1000 characters is required; interface guidance is not accepted." });
  if (diagnostics.length) return { ok: false, diagnostics };

  const identity = packetIdentity(predecessor); const revision = identity.revision + 1;
  const successor = {
    record_type: next.record_type,
    contract_version: RESPONSE_PACKET_AMENDMENT_VERSION,
    authority: next.authority,
    immutable: next.immutable,
    record_id: identity.recordId,
    revision,
    session_id: next.session_id,
    lineage: {
      root_session_id: identity.recordId,
      predecessor_session_id: predecessor.session_id,
      predecessor_path: context.predecessorPath,
      predecessor_digest: predecessorDigest,
      amendment_reason: context.amendmentReason
    },
    worksheet_binding: next.worksheet_binding,
    started_at: next.started_at,
    prepared_at: next.prepared_at,
    respondent: next.respondent,
    responses: next.responses,
    review: next.review,
    downstream: next.downstream,
    effects: next.effects
  };
  const bytes = canonicalYamlBytes(dump(successor, { lineWidth: -1, noRefs: true }));
  const targetPath = `${policy.target_folder}/${next.session_id}--r${revision}.yaml`;
  if (targetPath.length > 240 || !explicitYamlPath(targetPath)) return { ok: false, diagnostics: [{ code: "HCC-WRITER-TARGET", path: "$.targetPath", message: "The successor target is not a bounded explicit YAML path." }] };
  const successorDigest = await digest(bytes);
  return {
    ok: true,
    plan: {
      recordType: "hcc-response-amendment-plan-candidate",
      contractVersion: RESPONSE_PACKET_AMENDMENT_VERSION,
      targetPath,
      contentFormat: "yaml",
      bytes,
      byteLength: new TextEncoder().encode(bytes).byteLength,
      digest: successorDigest,
      conflict: "fail",
      confirmation: "required-per-write",
      source: { path: context.sourcePath, digest: context.sourceDigest, worksheetId: context.worksheetId },
      authority: "immutable-intake-candidate-only",
      declaredNonEffects: ["no-overwrite", "no-append", "no-frontmatter-mutation", "no-canonical-apply"],
      lineage: { recordId: identity.recordId, revision, predecessorPath: context.predecessorPath, predecessorDigest }
    },
    diagnostics: []
  };
}
