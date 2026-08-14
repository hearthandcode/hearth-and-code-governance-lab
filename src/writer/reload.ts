import { explicitYamlPath, packetIdentity, parseReloadableResponsePacket } from "./lineage";
import { canonicalYamlBytes } from "./plan";
import type { DigestFunction, ResponseReloadContext, ResponseReloadResult, WriterDiagnostic } from "./types";

export async function compileResponseReloadPlan(packetSource: string, context: ResponseReloadContext, digest: DigestFunction): Promise<ResponseReloadResult> {
  const parsed = parseReloadableResponsePacket(packetSource);
  if (!parsed.ok) return parsed;
  const diagnostics: WriterDiagnostic[] = [];
  if (!explicitYamlPath(context.packetPath)) diagnostics.push({ code: "HCC-WRITER-TARGET", path: "$.packetPath", message: "Reload requires one explicit bounded vault-relative YAML path." });
  const bytes = canonicalYamlBytes(packetSource);
  const actualDigest = await digest(bytes);
  if (actualDigest !== context.packetDigest) diagnostics.push({ code: "HCC-WRITER-SOURCE", path: "$.packetDigest", message: "The explicit packet digest does not match the supplied packet bytes." });
  const packet = parsed.packet;
  if (packet.worksheet_binding.worksheet_id !== context.worksheetId) diagnostics.push({ code: "HCC-WRITER-SOURCE", path: "$.worksheet_binding.worksheet_id", message: "The packet belongs to a different worksheet." });
  if (packet.worksheet_binding.source_path !== context.sourcePath) diagnostics.push({ code: "HCC-WRITER-SOURCE", path: "$.worksheet_binding.source_path", message: "The packet is bound to a different worksheet path." });
  if (packet.worksheet_binding.source_digest !== context.sourceDigest) diagnostics.push({ code: "HCC-WRITER-SOURCE", path: "$.worksheet_binding.source_digest", message: "The worksheet source digest changed; reload is stale." });
  const admitted = new Set(context.interactionIds);
  packet.responses.forEach((entry, index) => {
    if (!admitted.has(entry.interaction_id)) diagnostics.push({ code: "HCC-WRITER-SOURCE", path: `$.responses[${index}].interaction_id`, message: "The packet contains an interaction absent from the current worksheet." });
  });
  if (diagnostics.length) return { ok: false, diagnostics };
  const identity = packetIdentity(packet);
  return {
    ok: true,
    plan: {
      recordType: "hcc-response-reload-plan-candidate",
      contractVersion: "0.1-candidate.1",
      packet: { path: context.packetPath, digest: actualDigest, sessionId: packet.session_id, recordId: identity.recordId, revision: identity.revision },
      worksheet: { id: context.worksheetId, path: context.sourcePath, digest: context.sourceDigest },
      responses: packet.responses.map((entry) => structuredClone(entry)),
      declaredNonEffects: ["no-vault-read", "no-write", "no-overwrite", "no-canonical-apply"]
    },
    diagnostics: []
  };
}
