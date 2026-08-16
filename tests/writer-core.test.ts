import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InMemoryCreateOnlyWriter, compileResponseWritePlan, parseResponsePacket, parseResponseWritePolicy } from "../src/writer";

const sourceDigest = `sha256:${"a".repeat(64)}`;
const packet = `record_type: hcc-worksheet-response-packet
contract_version: 0.1-candidate.1
authority: immutable-intake-candidate-proposal
immutable: true
session_id: worksheet-session-20260811120000
worksheet_binding:
  worksheet_id: writer-proof
  worksheet_version: 0.1-candidate.1
  source_path: Worksheets/Writer Proof.md
  source_digest: ${sourceDigest}
started_at: '2026-08-11T12:00:00.000Z'
prepared_at: '2026-08-11T12:01:00.000Z'
respondent: null
responses: []
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
const context = { worksheetId: "writer-proof", sourcePath: "Worksheets/Writer Proof.md", sourceDigest, privacy: "private" as const };
const digest = async (value: string): Promise<string> => `sha256:${createHash("sha256").update(value).digest("hex")}`;

describe("pure response writer core", () => {
  it("compiles deterministic exact bytes and a create-only target", async () => {
    const first = await compileResponseWritePlan(packet, policy, context, digest); const second = await compileResponseWritePlan(packet, policy, context, digest);
    expect(first).toEqual(second); expect(first.ok).toBe(true); if (!first.ok) return;
    expect(first.plan.targetPath).toBe("Intake/HCC Responses/writer-proof--worksheet-session-20260811120000.yaml");
    expect(first.plan.bytes).toBe(packet); expect(first.plan.byteLength).toBe(new TextEncoder().encode(packet).byteLength); expect(first.plan.declaredNonEffects).toHaveLength(4);
  });
  it("blocks eight source, target, authority, and schema failures", async () => {
    const cases = [
      [packet.replace(sourceDigest, "null"), policy, context], [packet.replace(sourceDigest, `sha256:${"b".repeat(64)}`), policy, context],
      [packet.replace("required_complete: true", "required_complete: false"), policy, context], [packet.replace("missing_required: []", "missing_required: [answer]"), policy, context],
      [packet, policy.replace("Intake/HCC Responses", "../Outside"), context], [packet, policy.replace("conflict: fail", "conflict: overwrite"), context],
      [packet, policy, { ...context, privacy: "public" as const }], [`${packet}unknown: true\n`, policy, context]
    ] as const;
    expect(cases).toHaveLength(8);
    for (const [candidatePacket, candidatePolicy, candidateContext] of cases) expect((await compileResponseWritePlan(candidatePacket, candidatePolicy, candidateContext, digest)).ok).toBe(false);
  });
  it("validates contracts independently and rejects a held null digest", () => {
    expect(parseResponsePacket(packet).ok).toBe(true); expect(parseResponseWritePolicy(policy).ok).toBe(true); expect(parseResponsePacket(packet.replace(sourceDigest, "null")).ok).toBe(false);
  });
  it("proves create-only collision and confirmation behavior without filesystem access", async () => {
    const result = await compileResponseWritePlan(packet, policy, context, digest); expect(result.ok).toBe(true); if (!result.ok) return;
    const writer = new InMemoryCreateOnlyWriter(); expect(() => writer.create(result.plan, false)).toThrow("explicit per-write confirmation");
    expect(writer.create(result.plan, true)).toMatchObject({ result: "created", effect: "in-memory-test-only" }); expect(writer.read(result.plan.targetPath)).toBe(packet);
    expect(() => writer.create(result.plan, true)).toThrow("HCC-WRITER-COLLISION");
  });
  it("accepts a per-workspace target_folder override pointing at a project home subdirectory", async () => {
    const overrideFolder = "04-workspace--scriptorium/projects/ember-circuit-brand-system/intake/_responses";
    const overridePolicy = policy.replace("target_folder: Intake/HCC Responses", `target_folder: ${overrideFolder}`);
    const result = await compileResponseWritePlan(packet, overridePolicy, context, digest);
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.plan.targetPath).toBe(`${overrideFolder}/writer-proof--worksheet-session-20260811120000.yaml`);
  });
  it("still rejects an override folder that violates the safePath shape rule (traversal segment)", async () => {
    const badFolder = "04-workspace--scriptorium/projects/../escape/intake/_responses";
    const badPolicy = policy.replace("target_folder: Intake/HCC Responses", `target_folder: ${badFolder}`);
    const result = await compileResponseWritePlan(packet, badPolicy, context, digest);
    expect(result.ok).toBe(false);
  });
});
