import { dump } from "js-yaml";

import type { EphemeralWorkbookSessions, WorksheetContract, WorksheetPacketReference, WorksheetPacketWriteResult } from "../workbook";
import {
  compileResponseAmendmentPlan,
  compileResponseReloadPlan,
  compileResponseWritePlan,
  webCryptoSha256,
  type CreateOnlyCandidatePlan,
  type ResponseAmendmentPlan,
  type ResponseWritePlan,
  type VaultPacketWriteReceipt
} from "../writer";

export interface ResponsePacketEffectPort {
  readExplicit(path: string): Promise<string>;
  createOnly(plan: CreateOnlyCandidatePlan, confirmed: boolean): Promise<VaultPacketWriteReceipt>;
}

export interface ResponsePacketControllerOptions {
  sessions: EphemeralWorkbookSessions;
  adapter: () => ResponsePacketEffectPort;
  readWorksheetSource: (sourcePath: string) => Promise<string>;
  refreshInteractions: (sourcePath: string) => void;
}

export class ResponsePacketController {
  private readonly pendingInitialWrites = new Map<string, { plan: ResponseWritePlan; packetFingerprint: string; recordId: string }>();
  private readonly pendingAmendmentWrites = new Map<string, { plan: ResponseAmendmentPlan; packetFingerprint: string; predecessor: WorksheetPacketReference; reason: string }>();

  constructor(private readonly options: ResponsePacketControllerOptions) {}

  async saveInitial(
    sourcePath: string,
    worksheet: WorksheetContract,
    confirmed: boolean,
    expected?: WorksheetPacketWriteResult
  ): Promise<WorksheetPacketWriteResult> {
    if (expected !== undefined) {
      if (!confirmed) throw new Error("HCC-VAULT-CONFIRMATION: check the per-write confirmation before creating the previewed packet.");
      const pending = this.pendingInitialWrites.get(sourcePath);
      if (!pending || pending.plan.targetPath !== expected.path || pending.plan.digest !== expected.digest) throw new Error("HCC-VAULT-PREVIEW: the selected write preview is absent or stale; preview again.");
      const sourceDigest = await this.currentWorksheetDigest(sourcePath);
      if (sourceDigest !== pending.plan.source.digest) throw new Error("HCC-VAULT-PREVIEW: the worksheet source changed after preview; preview again.");
      const currentPacket = this.options.sessions.finalProposal(sourcePath, worksheet, { sourceDigest, persistence: "vault-local-create-only" });
      if (packetFingerprint(currentPacket) !== pending.packetFingerprint) throw new Error("HCC-VAULT-PREVIEW: worksheet responses changed after preview; preview again.");
      const receipt = await this.options.adapter().createOnly(pending.plan, true);
      this.pendingInitialWrites.delete(sourcePath);
      this.options.sessions.beginSuccessor(sourcePath);
      return {
        path: receipt.targetPath, digest: receipt.digest, recordId: pending.recordId, revision: 1,
        byteLength: receipt.byteLength, readBack: receipt.readBack, result: "created", yaml: pending.plan.bytes
      };
    }
    const sourceDigest = await this.currentWorksheetDigest(sourcePath);
    const packet = this.options.sessions.finalProposal(sourcePath, worksheet, { sourceDigest, persistence: "vault-local-create-only" });
    const plan = await compileResponseWritePlan(dump(packet, { lineWidth: -1, noRefs: true }), buildWritePolicy(worksheet), {
      worksheetId: worksheet.id, sourcePath, sourceDigest, privacy: worksheet.privacy
    }, webCryptoSha256);
    if (!plan.ok) throw writerFailure(plan.diagnostics);
    this.pendingInitialWrites.set(sourcePath, { plan: plan.plan, packetFingerprint: packetFingerprint(packet), recordId: packet.session_id });
    return {
      path: plan.plan.targetPath, digest: plan.plan.digest, recordId: packet.session_id, revision: 1,
      byteLength: plan.plan.byteLength, readBack: "not-run", result: "previewed", yaml: plan.plan.bytes
    };
  }

  async load(sourcePath: string, worksheet: WorksheetContract, packetPath: string, packetDigest: string) {
    const packetSource = await this.options.adapter().readExplicit(packetPath);
    const sourceDigest = await this.currentWorksheetDigest(sourcePath);
    const result = await compileResponseReloadPlan(packetSource, {
      worksheetId: worksheet.id,
      sourcePath,
      sourceDigest,
      privacy: worksheet.privacy,
      packetPath,
      packetDigest,
      interactionIds: worksheet.sections.flatMap((section) => section.interactions)
    }, webCryptoSha256);
    if (!result.ok) throw writerFailure(result.diagnostics);
    this.options.sessions.hydrate(sourcePath, result.plan.responses);
    this.options.refreshInteractions(sourcePath);
    return {
      path: result.plan.packet.path,
      digest: result.plan.packet.digest,
      recordId: result.plan.packet.recordId,
      revision: result.plan.packet.revision,
      responseCount: result.plan.responses.length
    };
  }

  async saveAmendment(
    sourcePath: string,
    worksheet: WorksheetContract,
    predecessor: WorksheetPacketReference,
    reason: string,
    confirmed: boolean,
    expected?: WorksheetPacketWriteResult
  ): Promise<WorksheetPacketWriteResult> {
    const adapter = this.options.adapter();
    if (expected !== undefined) {
      if (!confirmed) throw new Error("HCC-VAULT-CONFIRMATION: check the per-write confirmation before creating the previewed successor.");
      const pending = this.pendingAmendmentWrites.get(sourcePath);
      if (!pending || pending.plan.targetPath !== expected.path || pending.plan.digest !== expected.digest) throw new Error("HCC-VAULT-PREVIEW: the successor preview is absent or stale; preview again.");
      if (pending.predecessor.path !== predecessor.path || pending.predecessor.digest !== predecessor.digest || pending.reason !== reason) throw new Error("HCC-VAULT-PREVIEW: predecessor or amendment reason changed after preview; preview again.");
      const sourceDigest = await this.currentWorksheetDigest(sourcePath);
      if (sourceDigest !== pending.plan.source.digest) throw new Error("HCC-VAULT-PREVIEW: the worksheet source changed after preview; preview again.");
      const currentPacket = this.options.sessions.finalProposal(sourcePath, worksheet, { sourceDigest, persistence: "vault-local-create-only" });
      if (packetFingerprint(currentPacket) !== pending.packetFingerprint) throw new Error("HCC-VAULT-PREVIEW: worksheet responses changed after preview; preview again.");
      const currentPredecessor = await adapter.readExplicit(predecessor.path);
      if (await webCryptoSha256(currentPredecessor) !== predecessor.digest) throw new Error("HCC-VAULT-PREVIEW: predecessor bytes changed after preview; creation is blocked.");
      const receipt = await adapter.createOnly(pending.plan, true);
      this.pendingAmendmentWrites.delete(sourcePath);
      this.options.sessions.beginSuccessor(sourcePath);
      return {
        path: receipt.targetPath, digest: receipt.digest, recordId: pending.plan.lineage.recordId,
        revision: pending.plan.lineage.revision, byteLength: receipt.byteLength, readBack: receipt.readBack,
        result: "created", yaml: pending.plan.bytes
      };
    }
    const predecessorSource = await adapter.readExplicit(predecessor.path);
    const sourceDigest = await this.currentWorksheetDigest(sourcePath);
    const nextPacket = this.options.sessions.finalProposal(sourcePath, worksheet, { sourceDigest, persistence: "vault-local-create-only" });
    const result = await compileResponseAmendmentPlan(
      predecessorSource,
      dump(nextPacket, { lineWidth: -1, noRefs: true }),
      RESPONSE_WRITE_POLICY,
      {
        worksheetId: worksheet.id,
        sourcePath,
        sourceDigest,
        privacy: worksheet.privacy,
        predecessorPath: predecessor.path,
        predecessorDigest: predecessor.digest,
        amendmentReason: reason
      },
      webCryptoSha256
    );
    if (!result.ok) throw writerFailure(result.diagnostics);
    this.pendingAmendmentWrites.set(sourcePath, {
      plan: result.plan,
      packetFingerprint: packetFingerprint(nextPacket),
      predecessor: { ...predecessor },
      reason
    });
    return {
      path: result.plan.targetPath,
      digest: result.plan.digest,
      recordId: result.plan.lineage.recordId,
      revision: result.plan.lineage.revision,
      byteLength: result.plan.byteLength,
      readBack: "not-run",
      result: "previewed",
      yaml: result.plan.bytes
    };
  }

  clearPending(): void {
    this.pendingInitialWrites.clear();
    this.pendingAmendmentWrites.clear();
  }

  private async currentWorksheetDigest(sourcePath: string): Promise<string> {
    return webCryptoSha256(await this.options.readWorksheetSource(sourcePath));
  }
}

function writerFailure(diagnostics: readonly { code: string; path: string; message: string }[]): Error {
  return new Error(diagnostics.map((item) => `${item.code} at ${item.path}: ${item.message}`).join(" "));
}

function packetFingerprint(packet: object): string {
  const stable = { ...(packet as Record<string, unknown>) };
  delete stable.prepared_at;
  return JSON.stringify(stable);
}

const RESPONSE_WRITE_POLICY = `record_type: hcc-response-write-policy-candidate
contract_version: 0.1-candidate.1
mode: immutable-new-file
vault_scope: current-vault
target_folder: Intake/HCC Responses
filename_template: "{worksheet_id}--{session_id}.yaml"
content_format: yaml
conflict: fail
require_source_digest: true
require_complete: true
allowed_privacy: [private, restricted, internal, public]
human_gate: per-write
canonical_apply: prohibited
`;

/**
 * Build the write policy for a given worksheet. When the worksheet declares
 * a `target_folder_override` in its hcc-form block, substitute it into the
 * policy's `target_folder:` line so immutable response packets land under
 * the project-local folder instead of the default Intake/HCC Responses/.
 *
 * The override value has already been shape-validated by parseWorksheet
 * (via optionalPath); this function performs an additional fail-closed
 * length check and then a literal substitution into the template.
 */
function buildWritePolicy(worksheet: WorksheetContract): string {
  const override = worksheet.target_folder_override;
  if (typeof override !== "string" || override.length === 0) return RESPONSE_WRITE_POLICY;
  // Fail-closed: refuse any override containing characters that could break
  // the YAML policy literal. parseWorksheet's optionalPath already rejects
  // these, but a belt-and-braces check guards against future parser drift.
  if (/[\n\r"'\\:#]/.test(override)) {
    throw new Error(`HCC-WRITER-POLICY: target_folder_override ${override} contains a YAML-unsafe character; refusing to substitute.`);
  }
  return RESPONSE_WRITE_POLICY.replace(/^target_folder: .*$/m, `target_folder: ${override}`);
}
