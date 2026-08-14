import { parseResponsePacket, parseResponseWritePolicy } from "./parse";
import type { DigestFunction, ResponseWritePlan, WriterDiagnostic, WriterPlanResult, WriterSourceContext } from "./types";

export async function compileResponseWritePlan(packetSource: string, policySource: string, context: WriterSourceContext, digest: DigestFunction): Promise<WriterPlanResult> {
  const packetResult = parseResponsePacket(packetSource);
  const policyResult = parseResponseWritePolicy(policySource);
  const diagnostics: WriterDiagnostic[] = [...(packetResult.ok ? [] : packetResult.diagnostics), ...(policyResult.ok ? [] : policyResult.diagnostics)];
  if (!packetResult.ok || !policyResult.ok) return { ok: false, diagnostics };
  const packet = packetResult.packet; const policy = policyResult.policy;
  if (packet.worksheet_binding.worksheet_id !== context.worksheetId) diagnostics.push({ code: "HCC-WRITER-SOURCE", path: "$.worksheet_binding.worksheet_id", message: "Packet and current worksheet IDs differ." });
  if (packet.worksheet_binding.source_path !== context.sourcePath) diagnostics.push({ code: "HCC-WRITER-SOURCE", path: "$.worksheet_binding.source_path", message: "Packet and current worksheet paths differ." });
  if (packet.worksheet_binding.source_digest !== context.sourceDigest) diagnostics.push({ code: "HCC-WRITER-SOURCE", path: "$.worksheet_binding.source_digest", message: "Packet and current worksheet digests differ; the source is stale." });
  if (!packet.review.required_complete || packet.review.missing_required.length) diagnostics.push({ code: "HCC-WRITER-AUTHORITY", path: "$.review", message: "Every required response must be complete before a write plan is offered." });
  if (!policy.allowed_privacy.includes(context.privacy)) diagnostics.push({ code: "HCC-WRITER-AUTHORITY", path: "$.allowed_privacy", message: `The policy does not admit ${context.privacy} worksheet content.` });
  if (diagnostics.length) return { ok: false, diagnostics };
  const bytes = canonicalYamlBytes(packetSource);
  const targetPath = `${policy.target_folder}/${policy.filename_template.replace("{worksheet_id}", packet.worksheet_binding.worksheet_id).replace("{session_id}", packet.session_id)}`;
  if (targetPath.length > 240) return { ok: false, diagnostics: [{ code: "HCC-WRITER-TARGET", path: "$.targetPath", message: "The resolved target path exceeds the 240-character C2 limit." }] };
  const plan: ResponseWritePlan = {
    recordType: "hcc-response-write-plan-candidate", contractVersion: "0.1-candidate.1", targetPath, contentFormat: "yaml", bytes,
    byteLength: new TextEncoder().encode(bytes).byteLength, digest: await digest(bytes), conflict: "fail", confirmation: "required-per-write",
    source: { path: context.sourcePath, digest: context.sourceDigest, worksheetId: context.worksheetId }, authority: "immutable-intake-candidate-only",
    declaredNonEffects: ["no-overwrite", "no-append", "no-frontmatter-mutation", "no-canonical-apply"]
  };
  return { ok: true, plan, diagnostics: [] };
}

export function canonicalYamlBytes(source: string): string { return `${source.replace(/\r\n?/g, "\n").trimEnd()}\n`; }
export async function webCryptoSha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value); const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
