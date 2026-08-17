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
});
