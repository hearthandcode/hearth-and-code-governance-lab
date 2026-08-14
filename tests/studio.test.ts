import { describe, expect, it } from "vitest";

import { buildStudioProjection, inspectStudioTransition, parseStudioContract, STUDIO_SCALE_PROFILE } from "../src/studio";
import { VALID_STUDIO_SOURCE } from "./fixtures/studio";

describe("C5 schema and workflow studio contract", () => {
  it("validates a representative digital-vault design packet and derives 4/8/16 architecture", () => {
    const result = parseStudioContract(VALID_STUDIO_SOURCE); expect(result.ok, result.ok ? "" : JSON.stringify(result.diagnostics)).toBe(true); if (!result.ok) return;
    const model = buildStudioProjection(result.studio);
    expect(model.counts).toMatchObject({ sources: 1, axes: 4, record_types: 1, fields: 4, states: 3, transitions: 2, projections: 2 });
    expect(STUDIO_SCALE_PROFILE.dimensions).toHaveLength(4);
    expect(STUDIO_SCALE_PROFILE.featureFamilies).toHaveLength(8);
    expect(STUDIO_SCALE_PROFILE.reviewContracts).toHaveLength(16);
    expect(model.effects).toEqual({ schema_admission: "prohibited", workflow_advance: "prohibited", source_mutation: "prohibited", network: "prohibited" });
  });

  it("inspects declared transitions but never advances them and fails unknown transitions closed", () => {
    const result = parseStudioContract(VALID_STUDIO_SOURCE); expect(result.ok, result.ok ? "" : JSON.stringify(result.diagnostics)).toBe(true); if (!result.ok) return;
    expect(inspectStudioTransition(result.studio, "request-review")).toMatchObject({ ok: true, structural_status: "valid-reference-graph", advancement: "prohibited" });
    expect(inspectStudioTransition(result.studio, "missing")).toMatchObject({ ok: false, advancement: "prohibited" });
  });

  it("rejects sixteen authority, migration, reference, path, digest, and grammar failures", () => {
    const cases = [
      VALID_STUDIO_SOURCE.replace("version: 0.1-candidate.1", "version: 9.0"),
      VALID_STUDIO_SOURCE.replace("purpose: Propose", "execute: now\npurpose: Propose"),
      VALID_STUDIO_SOURCE.replace("type: enum, required: true, vocabulary_ref: workflow-status", "type: enum, required: true"),
      VALID_STUDIO_SOURCE.replace("field_refs: [artifact.id, artifact.title, artifact.source_ref]", "field_refs: [artifact.missing, artifact.title, artifact.source_ref]"),
      VALID_STUDIO_SOURCE.replace("authority: proposal-only }", "authority: execute-now }"),
      VALID_STUDIO_SOURCE.replace("required: true, authority: human", "required: false, authority: agent"),
      VALID_STUDIO_SOURCE.replace("from: review-ready\n      to: accepted", "from: accepted\n      to: review-ready"),
      VALID_STUDIO_SOURCE.replace("{ from: legacy_artifact.name, to: artifact.title, action: manual }", "{ from: legacy_artifact.name, to: null, action: drop }"),
      VALID_STUDIO_SOURCE.replace("path: Governance/Operational Charter.md", "path: ../Operational Charter.md"),
      VALID_STUDIO_SOURCE.replace("digest: sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "digest: sha256:bad"),
      VALID_STUDIO_SOURCE.replace("{ id: title, label: Title", "{ id: id, label: Title"),
      VALID_STUDIO_SOURCE.replace("to: artifact.title, action: manual", "to: artifact.missing, action: manual"),
      VALID_STUDIO_SOURCE.replace("actor_ref: author-agent", "actor_ref: missing-actor"),
      VALID_STUDIO_SOURCE.replace("guard_refs: [required-identity, source-fresh]", "guard_refs: [missing-guard]"),
      VALID_STUDIO_SOURCE.replace("effect_refs: [prepare-review]", "effect_refs: [missing-effect]"),
      VALID_STUDIO_SOURCE.replace("recovery_ref: fail-closed", "recovery_ref: missing-recovery")
    ];
    expect(cases).toHaveLength(16);
    for (const source of cases) {
      const result = parseStudioContract(source);
      expect(result.ok, source.slice(0, 80)).toBe(false);
      if (!result.ok) expect(result.diagnostics.every((item) => item.path.startsWith("$") && item.message.length > 0)).toBe(true);
    }
  });
});
