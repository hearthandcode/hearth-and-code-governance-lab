import { describe, expect, it, vi } from "vitest";

import { ResponsePacketController, type ResponsePacketEffectPort } from "../src/obsidian/response-packet-controller";
import { EphemeralWorkbookSessions, type WorksheetContract } from "../src/workbook";
import { parseReloadableResponsePacket, type CreateOnlyCandidatePlan, type VaultPacketWriteReceipt } from "../src/writer";

const sourcePath = "Worksheets/Controller Proof.md";
const worksheet: WorksheetContract = {
  version: "0.1-candidate.1",
  id: "controller-proof",
  title: "Controller proof",
  purpose: "Exercise the complete response-packet orchestration boundary.",
  privacy: "private",
  sections: [{ id: "review", title: "Review", interactions: ["answer"] }],
  completion: { required: ["answer"] },
  governance: { authority_refs: [], review_required: true, verification_required: false }
};
const worksheetBytes = "# Controller proof\n\n```hcc-form\nid: controller-proof\n```\n";

class MemoryPacketPort implements ResponsePacketEffectPort {
  readonly files = new Map<string, string>();

  async readExplicit(path: string): Promise<string> {
    const value = this.files.get(path);
    if (value === undefined) throw new Error(`HCC-VAULT-READ-MISSING: ${path}`);
    return value;
  }

  async createOnly(plan: CreateOnlyCandidatePlan, confirmed: boolean): Promise<VaultPacketWriteReceipt> {
    if (!confirmed) throw new Error("HCC-VAULT-CONFIRMATION");
    if (this.files.has(plan.targetPath)) throw new Error("HCC-VAULT-COLLISION");
    this.files.set(plan.targetPath, plan.bytes);
    return {
      recordType: "hcc-vault-response-write-receipt",
      targetPath: plan.targetPath,
      digest: plan.digest,
      byteLength: new TextEncoder().encode(plan.bytes).byteLength,
      result: "created",
      readBack: "verified",
      effect: "vault-local-create-only"
    };
  }
}

function answer(sessions: EphemeralWorkbookSessions, value: string): void {
  sessions.binding(sourcePath, "answer").update(
    { value, note: null, state: "answered", author: null, responded_at: null },
    "long_text",
    "0.3-candidate.1"
  );
}

/**
 * Render a YAML scalar value. Strings are quoted; booleans, numbers, and
 * null pass through; objects/arrays are serialized as JSON.
 */
function formatYamlScalar(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function controller(sessions: EphemeralWorkbookSessions, port: MemoryPacketPort, refreshInteractions = vi.fn()) {
  return {
    controller: new ResponsePacketController({
      sessions,
      adapter: () => port,
      readWorksheetSource: async (path) => {
        if (path !== sourcePath) throw new Error("unexpected source");
        return worksheetBytes;
      },
      refreshInteractions
    }),
    refreshInteractions
  };
}

describe("response-packet orchestration controller", () => {
  it("runs preview, create, explicit reload, amendment preview, and immutable successor creation", async () => {
    const port = new MemoryPacketPort();
    const firstSessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T21:00:00.000Z"));
    answer(firstSessions, "Original answer");
    const first = controller(firstSessions, port).controller;

    const rootPreview = await first.saveInitial(sourcePath, worksheet, false);
    expect(rootPreview).toMatchObject({ result: "previewed", revision: 1, readBack: "not-run" });
    expect(port.files.size).toBe(0);
    const root = await first.saveInitial(sourcePath, worksheet, true, rootPreview);
    expect(root).toMatchObject({ result: "created", revision: 1, readBack: "verified" });
    const rootBytes = port.files.get(root.path);
    expect(rootBytes).toBe(root.yaml);

    const reloadedSessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T22:00:00.000Z"));
    const reloaded = controller(reloadedSessions, port);
    const loadReceipt = await reloaded.controller.load(sourcePath, worksheet, root.path, root.digest);
    expect(loadReceipt).toMatchObject({ path: root.path, digest: root.digest, revision: 1, responseCount: 1 });
    expect(reloaded.refreshInteractions).toHaveBeenCalledOnce();
    expect(reloadedSessions.binding<Record<string, unknown>>(sourcePath, "answer").get({}).value).toBe("Original answer");

    answer(reloadedSessions, "Amended answer");
    const predecessor = { path: root.path, digest: root.digest, recordId: root.recordId, revision: root.revision };
    const successorPreview = await reloaded.controller.saveAmendment(sourcePath, worksheet, predecessor, "Correct after review.", false);
    expect(successorPreview).toMatchObject({ result: "previewed", revision: 2, recordId: root.recordId });
    expect(successorPreview.path).not.toBe(root.path);
    const successor = await reloaded.controller.saveAmendment(sourcePath, worksheet, predecessor, "Correct after review.", true, successorPreview);
    expect(successor).toMatchObject({ result: "created", revision: 2, readBack: "verified" });
    expect(port.files.get(root.path)).toBe(rootBytes);
    expect(port.files.get(successor.path)).toBe(successor.yaml);
    const parsed = parseReloadableResponsePacket(successor.yaml);
    expect(parsed.ok).toBe(true);
    if (parsed.ok && parsed.packet.contract_version === "0.2-candidate.1") {
      expect(parsed.packet.lineage).toMatchObject({ predecessor_path: root.path, predecessor_digest: root.digest });
      expect(parsed.packet.responses[0]?.response).toMatchObject({ value: "Amended answer" });
    }
  });

  it("honors worksheet.target_folder_override for both preview and create", async () => {
    // Fix 2 regression: the per-workspace target_folder_override field on the
    // hcc-form block must flow through buildWritePolicy into plan.targetPath
    // so immutable packets land under the project-local folder instead of
    // the default Intake/HCC Responses literal.
    const overrideFolder = "04-workspace--scriptorium/projects/ember-circuit-brand-system/intake/_responses";
    const worksheetWithOverride: WorksheetContract = {
      ...worksheet,
      target_folder_override: overrideFolder
    };
    const port = new MemoryPacketPort();
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T21:30:00.000Z"));
    answer(sessions, "Override-path answer");
    const responsePackets = controller(sessions, port).controller;

    const preview = await responsePackets.saveInitial(sourcePath, worksheetWithOverride, false);
    expect(preview.path.startsWith(`${overrideFolder}/`)).toBe(true);
    expect(preview.path).not.toContain("Intake/HCC Responses");

    const created = await responsePackets.saveInitial(sourcePath, worksheetWithOverride, true, preview);
    expect(created.path.startsWith(`${overrideFolder}/`)).toBe(true);
    expect(created.path).not.toContain("Intake/HCC Responses");
    expect(port.files.has(created.path)).toBe(true);
    expect(port.files.has(`Intake/HCC Responses/${created.path.split("/").pop()}`)).toBe(false);

    // Note: a reload assertion is omitted here because the in-memory
    // session fixture retains the answered draft, and load() calls
    // EphemeralWorkbookSessions.hydrate() which rejects non-empty drafts.
    // The packet-locator side (which uses resolveResponsePacketFolder
    // on the adapter) is covered separately in tests/packet-locator.test.ts.
  });

  it("falls back to default Intake/HCC Responses when target_folder_override is absent", async () => {
    // Backward-compatibility regression: worksheets without target_folder_override
    // keep using the legacy literal. This protects existing callers and
    // existing response-packet paths that already live under Intake/HCC Responses.
    const port = new MemoryPacketPort();
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T21:30:00.000Z"));
    answer(sessions, "Default-folder answer");
    const responsePackets = controller(sessions, port).controller;

    const preview = await responsePackets.saveInitial(sourcePath, worksheet, false);
    expect(preview.path.startsWith("Intake/HCC Responses/")).toBe(true);

    const created = await responsePackets.saveInitial(sourcePath, worksheet, true, preview);
    expect(created.path.startsWith("Intake/HCC Responses/")).toBe(true);
  });

  it("blocks changed responses and cleared pending plans before any create effect", async () => {
    const port = new MemoryPacketPort();
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T21:30:00.000Z"));
    answer(sessions, "First value");
    const responsePackets = controller(sessions, port).controller;
    const preview = await responsePackets.saveInitial(sourcePath, worksheet, false);
    answer(sessions, "Changed after preview");
    await expect(responsePackets.saveInitial(sourcePath, worksheet, true, preview)).rejects.toThrow("responses changed after preview");
    expect(port.files.size).toBe(0);
    const freshPreview = await responsePackets.saveInitial(sourcePath, worksheet, false);
    responsePackets.clearPending();
    await expect(responsePackets.saveInitial(sourcePath, worksheet, true, freshPreview)).rejects.toThrow("absent or stale");
    expect(port.files.size).toBe(0);
  });

  it("Fix 5: exportDraftAsYaml + importDraftFromYaml round-trip preserves every response", () => {
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T21:30:00.000Z"));
    answer(sessions, "Round-trip value");
    const responsePackets = controller(sessions, new MemoryPacketPort()).controller;

    const yaml = responsePackets.exportDraftAsYaml(sourcePath, worksheet);
    expect(yaml).toContain("record_type: hcc-worksheet-session-draft");
    expect(yaml).toContain("worksheet_id: controller-proof");

    // Fresh session: import the YAML; the in-memory draft must be restored.
    const freshSessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T22:00:00.000Z"));
    const freshController = controller(freshSessions, new MemoryPacketPort()).controller;
    const result = freshController.importDraftFromYaml(sourcePath, worksheet, yaml);
    expect(result.imported).toBe(1);
    expect(result.discarded).toBe(false);
    expect(result.sessionId.length).toBeGreaterThan(0);

    // After import, the draft proposals are equal.
    const before = sessions.draftProposal(sourcePath, worksheet);
    const after = freshSessions.draftProposal(sourcePath, worksheet);
    expect(after.responses).toEqual(before.responses);
  });

  it("Fix 5: import rejects when the YAML's worksheet_id does not match the current worksheet", () => {
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T21:30:00.000Z"));
    answer(sessions, "value");
    const responsePackets = controller(sessions, new MemoryPacketPort()).controller;
    const yaml = responsePackets.exportDraftAsYaml(sourcePath, worksheet);

    const otherWorksheet: WorksheetContract = { ...worksheet, id: "other-worksheet" };
    const fresh = new EphemeralWorkbookSessions(() => new Date("2026-08-11T22:00:00.000Z"));
    const freshController = controller(fresh, new MemoryPacketPort()).controller;
    expect(() => freshController.importDraftFromYaml(sourcePath, otherWorksheet, yaml)).toThrow(/HCC-IMPORT-WORKSHEET/);
  });

  it("Fix 5: import rejects when an interaction_id is not declared in the current worksheet", () => {
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T21:30:00.000Z"));
    answer(sessions, "value");
    const responsePackets = controller(sessions, new MemoryPacketPort()).controller;
    const yaml = responsePackets.exportDraftAsYaml(sourcePath, worksheet);

    // Build a worksheet that does NOT declare the 'answer' interaction.
    const slimWorksheet: WorksheetContract = {
      ...worksheet,
      sections: [{ id: "review", title: "Review", interactions: [] }],
      completion: { required: [] }
    };
    const fresh = new EphemeralWorkbookSessions(() => new Date("2026-08-11T22:00:00.000Z"));
    const freshController = controller(fresh, new MemoryPacketPort()).controller;
    expect(() => freshController.importDraftFromYaml(sourcePath, slimWorksheet, yaml)).toThrow(/HCC-IMPORT-SCOPE/);
  });

  it("Fix 5: import rejects malformed YAML, wrong record_type, and non-empty existing draft without discard", () => {
    const fresh = new EphemeralWorkbookSessions(() => new Date("2026-08-11T22:00:00.000Z"));
    const freshController = controller(fresh, new MemoryPacketPort()).controller;

    // Malformed YAML: unterminated flow sequence + tab-indented mapping (js-yaml rejects).
    expect(() => freshController.importDraftFromYaml(sourcePath, worksheet, "key: [unterminated\n\tother: : : :\n\t\t- - -")).toThrow(/HCC-IMPORT-PARSE/);

    // Wrong record_type: anything other than the two accepted shapes
    expect(() => freshController.importDraftFromYaml(sourcePath, worksheet, "record_type: some-other-shape\n")).toThrow(/HCC-IMPORT-SCHEMA/);

    // Non-empty existing draft is rejected without discard.
    // Export from `fresh` (which has the answer) so the yaml carries one entry,
    // and verify that importing into `fresh` with the existing answer requires discard.
    answer(fresh, "preserved");
    const yaml = freshController.exportDraftAsYaml(sourcePath, worksheet);
    expect(() => freshController.importDraftFromYaml(sourcePath, worksheet, yaml)).toThrow(/HCC-IMPORT-NONDISCARD/);

    // discard: true overwrites
    const result = freshController.importDraftFromYaml(sourcePath, worksheet, yaml, { discard: true });
    expect(result.discarded).toBe(true);
    expect(result.imported).toBe(1);
  });

  it("Fix 6: import also accepts the immutable response packet shape (hcc-worksheet-response-packet)", () => {
    // The user copied an immutable response packet from the 'Copy answer
    // packet YAML' button. Before Fix 6, the import rejected it because
    // the controller only accepted the mutable draft shape. Both shapes
    // carry the same `responses: SessionResponseEntry[]` field; only the
    // record_type discriminator and surrounding envelope differ.
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T21:30:00.000Z"));
    answer(sessions, "Imported from immutable packet");
    const draft = sessions.draftProposal(sourcePath, worksheet);

    // Build a minimal immutable packet shape that reuses the draft's
    // responses, so the test is hermetic and exercises the exact shape
    // a real on-disk packet has. Rendered via a single template literal
    // so there are no nested .concat().map().join() parens to balance.
    const responseEntriesYaml = draft.responses.map((entry) => [
      `  - interaction_id: ${entry.interaction_id}`,
      `    interaction_kind: ${entry.interaction_kind}`,
      `    interaction_version: ${entry.interaction_version}`,
      "    response:",
      `      value: ${formatYamlScalar((entry.response as { value: unknown } | null | undefined)?.value ?? null)}`,
      "      note: null",
      "      state: answered",
      "      author: null",
      "      responded_at: null",
      `    observed_at: '${entry.observed_at}'`
    ].join("\n")).join("\n");
    const immutableYaml = [
      "record_type: hcc-worksheet-response-packet",
      "contract_version: 0.1-candidate.1",
      "authority: immutable-intake-candidate-proposal",
      "immutable: true",
      `session_id: ${draft.session_id}`,
      "worksheet_binding:",
      `  worksheet_id: ${worksheet.id}`,
      `  worksheet_version: ${worksheet.version}`,
      `  source_path: ${sourcePath}`,
      "  source_digest: null",
      `started_at: '${draft.started_at}'`,
      `prepared_at: '${draft.prepared_at}'`,
      "respondent: null",
      "responses:",
      responseEntriesYaml,
      "review:",
      "  required_complete: true",
      "  missing_required: []",
      "  human_gate: required",
      "downstream:",
      "  action_candidates: not-generated",
      "  decision_candidates: not-generated",
      "  work_item_candidates: not-generated",
      "  canonical_write_back: prohibited",
      "effects:",
      "  persistence: vault-local-create-only",
      "  submission: prohibited",
      ""
    ].join("\n");

    // Import the immutable packet into a fresh session; answers must
    // populate the in-memory draft for further editing.
    const fresh = new EphemeralWorkbookSessions(() => new Date("2026-08-11T22:30:00.000Z"));
    const freshController = controller(fresh, new MemoryPacketPort()).controller;
    const result = freshController.importDraftFromYaml(sourcePath, worksheet, immutableYaml);
    expect(result.imported).toBe(1);
    expect(result.discarded).toBe(false);

    // The imported answers must equal the original draft's answers.
    expect(fresh.draftProposal(sourcePath, worksheet).responses).toEqual(draft.responses);
  });
});
