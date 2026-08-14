import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { EphemeralWorkbookSessions } from "../src/workbook";
import {
  InMemoryCreateOnlyWriter,
  compileResponseAmendmentPlan,
  compileResponseReloadPlan,
  parseReloadableResponsePacket
} from "../src/writer";

const sourceDigest = `sha256:${"a".repeat(64)}`;
const digest = async (value: string): Promise<string> => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const policy = `record_type: hcc-response-write-policy-candidate
contract_version: 0.1-candidate.1
mode: immutable-new-file
vault_scope: current-vault
target_folder: Intake/HCC Responses
filename_template: "{worksheet_id}--{session_id}.yaml"
content_format: yaml
conflict: fail
require_source_digest: true
require_complete: true
allowed_privacy: [private, restricted]
human_gate: per-write
canonical_apply: prohibited
`;

function packet(sessionId: string, value: string): string {
  return `record_type: hcc-worksheet-response-packet
contract_version: 0.1-candidate.1
authority: immutable-intake-candidate-proposal
immutable: true
session_id: ${sessionId}
worksheet_binding:
  worksheet_id: reload-proof
  worksheet_version: 0.1-candidate.1
  source_path: Worksheets/Reload Proof.md
  source_digest: ${sourceDigest}
started_at: '2026-08-11T12:00:00.000Z'
prepared_at: '2026-08-11T12:01:00.000Z'
respondent: null
responses:
  - interaction_id: answer
    interaction_kind: long_text
    interaction_version: 0.3-candidate.1
    response: { value: ${JSON.stringify(value)}, note: null, state: answered, author: null, responded_at: null }
    observed_at: '2026-08-11T12:00:30.000Z'
review:
  required_complete: true
  missing_required: []
  human_gate: required
downstream:
  action_candidates: not-generated
  decision_candidates: not-generated
  work_item_candidates: not-generated
  canonical_write_back: prohibited
effects:
  persistence: prohibited-step-8-held
  submission: prohibited
`;
}

const predecessor = packet("reload-root-session", "Original answer");
const sourceContext = { worksheetId: "reload-proof", sourcePath: "Worksheets/Reload Proof.md", sourceDigest, privacy: "private" as const };

describe("pure response reload planning", () => {
  it("verifies one explicit packet and hydrates an editable in-memory worksheet session", async () => {
    const packetDigest = await digest(predecessor);
    const result = await compileResponseReloadPlan(predecessor, {
      ...sourceContext,
      packetPath: "Intake/HCC Responses/reload-root-session.yaml",
      packetDigest,
      interactionIds: ["answer"]
    }, digest);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.declaredNonEffects).toEqual(["no-vault-read", "no-write", "no-overwrite", "no-canonical-apply"]);
    const sessions = new EphemeralWorkbookSessions(() => new Date("2026-08-11T13:00:00.000Z"));
    sessions.hydrate(sourceContext.sourcePath, result.plan.responses);
    const binding = sessions.binding<Record<string, unknown>>(sourceContext.sourcePath, "answer");
    expect(binding.get({}).value).toBe("Original answer");
    binding.update({ value: "Amended answer", note: null, state: "answered", author: null, responded_at: null }, "long_text", "0.3-candidate.1");
    expect(binding.get({}).value).toBe("Amended answer");
    expect(() => sessions.hydrate(sourceContext.sourcePath, result.plan.responses)).toThrow("HCC-WORKBOOK-HYDRATE-NONEMPTY");
  });

  it("blocks digest, path, binding, source, and interaction mismatches", async () => {
    const packetDigest = await digest(predecessor);
    const base = { ...sourceContext, packetPath: "Intake/HCC Responses/reload-root-session.yaml", packetDigest, interactionIds: ["answer"] };
    const cases = [
      { ...base, packetDigest: `sha256:${"b".repeat(64)}` },
      { ...base, packetPath: "../Outside.yaml" },
      { ...base, worksheetId: "other" },
      { ...base, sourcePath: "Worksheets/Other.md" },
      { ...base, sourceDigest: `sha256:${"c".repeat(64)}` },
      { ...base, interactionIds: ["other"] }
    ];
    for (const candidate of cases) expect((await compileResponseReloadPlan(predecessor, candidate, digest)).ok).toBe(false);
  });
});

describe("immutable response amendment planning", () => {
  it("creates a deterministic revision-two successor and never targets the predecessor", async () => {
    const predecessorDigest = await digest(predecessor);
    const next = packet("reload-amendment-session", "Amended answer");
    const context = { ...sourceContext, predecessorPath: "Intake/HCC Responses/reload-root-session.yaml", predecessorDigest, amendmentReason: "Correct the reviewed answer." };
    const first = await compileResponseAmendmentPlan(predecessor, next, policy, context, digest);
    const second = await compileResponseAmendmentPlan(predecessor, next, policy, context, digest);
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.plan.targetPath).not.toBe(context.predecessorPath);
    expect(first.plan.targetPath).toContain("--r2.yaml");
    expect(first.plan.lineage).toMatchObject({ recordId: "reload-root-session", revision: 2, predecessorDigest });
    const parsed = parseReloadableResponsePacket(first.plan.bytes);
    expect(parsed.ok).toBe(true);
    if (parsed.ok && parsed.packet.contract_version === "0.2-candidate.1") {
      expect(parsed.packet.revision).toBe(2);
      expect(parsed.packet.lineage.predecessor_path).toBe(context.predecessorPath);
      expect(parsed.packet.responses[0]?.response).toMatchObject({ value: "Amended answer" });
    }
    const historicalGuidancePacket = first.plan.bytes.replace(
      "amendment_reason: Correct the reviewed answer.",
      "amendment_reason: Explain why this immutable successor is required."
    );
    expect(parseReloadableResponsePacket(historicalGuidancePacket).ok).toBe(true);
    const writer = new InMemoryCreateOnlyWriter();
    expect(writer.create(first.plan, true).result).toBe("created");
    expect(writer.read(context.predecessorPath)).toBeUndefined();
    expect(() => writer.create(first.plan, true)).toThrow("HCC-WRITER-COLLISION");
  });

  it("increments a validated successor chain without changing the root identity", async () => {
    const rootDigest = await digest(predecessor);
    const revisionTwo = await compileResponseAmendmentPlan(predecessor, packet("reload-amendment-two", "Second"), policy, {
      ...sourceContext, predecessorPath: "Intake/HCC Responses/reload-root-session.yaml", predecessorDigest: rootDigest, amendmentReason: "First amendment."
    }, digest);
    expect(revisionTwo.ok).toBe(true);
    if (!revisionTwo.ok) return;
    const revisionThree = await compileResponseAmendmentPlan(revisionTwo.plan.bytes, packet("reload-amendment-three", "Third"), policy, {
      ...sourceContext, predecessorPath: revisionTwo.plan.targetPath, predecessorDigest: revisionTwo.plan.digest, amendmentReason: "Second amendment."
    }, digest);
    expect(revisionThree.ok).toBe(true);
    if (!revisionThree.ok) return;
    expect(revisionThree.plan.lineage).toMatchObject({ recordId: "reload-root-session", revision: 3, predecessorPath: revisionTwo.plan.targetPath });
  });

  it("blocks stale lineage, identity changes, same-session reuse, incomplete packets, and invalid policies", async () => {
    const predecessorDigest = await digest(predecessor);
    const next = packet("reload-amendment-session", "Amended answer");
    const context = { ...sourceContext, predecessorPath: "Intake/HCC Responses/reload-root-session.yaml", predecessorDigest, amendmentReason: "Correction." };
    const cases = [
      [predecessor, next, policy, { ...context, predecessorDigest: `sha256:${"b".repeat(64)}` }],
      [predecessor, next, policy, { ...context, predecessorPath: "../Outside.yaml" }],
      [predecessor, next.replace("worksheet_id: reload-proof", "worksheet_id: other"), policy, context],
      [predecessor, next.replace("session_id: reload-amendment-session", "session_id: reload-root-session"), policy, context],
      [predecessor, next.replace("required_complete: true", "required_complete: false"), policy, context],
      [predecessor, next, policy.replace("conflict: fail", "conflict: overwrite"), context],
      [predecessor, next, policy, { ...context, amendmentReason: "" }],
      [predecessor, next, policy, { ...context, amendmentReason: "Explain why this immutable successor is required." }]
    ] as const;
    for (const [prior, successor, candidatePolicy, candidateContext] of cases) {
      expect((await compileResponseAmendmentPlan(prior, successor, candidatePolicy, candidateContext, digest)).ok).toBe(false);
    }
  });
});
