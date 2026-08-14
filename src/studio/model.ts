import type { StudioContract, StudioProjectionModel, StudioScaleProfile, StudioTransitionInspection } from "./types";
import { STUDIO_VERSION } from "./types";

export const STUDIO_SCALE_PROFILE: StudioScaleProfile = Object.freeze({
  dimensions: Object.freeze([
    { id: "governed_context", label: "Governed context" },
    { id: "schema_workflow_synthesis", label: "Schema and workflow synthesis" },
    { id: "dashboard_projection", label: "Dashboard projection" },
    { id: "return_intake_effects", label: "Return intake and effects" }
  ]),
  featureFamilies: Object.freeze([
    { id: "charter_intake", label: "Charter intake workspace" },
    { id: "context_domain_mapper", label: "Context and domain mapper" },
    { id: "schema_studio", label: "Schema studio" },
    { id: "workflow_composer", label: "Workflow composer" },
    { id: "dashboard_builder", label: "Dashboard projection builder" },
    { id: "library_planner", label: "Library organization planner" },
    { id: "llm_exchange", label: "LLM exchange surface" },
    { id: "return_intake", label: "Governed return intake" }
  ]),
  reviewContracts: Object.freeze([
    { id: "source_identity", label: "Source identity" },
    { id: "freshness", label: "Freshness" },
    { id: "authority", label: "Authority" },
    { id: "handling", label: "Handling" },
    { id: "schema_identity", label: "Schema identity" },
    { id: "invariants", label: "Invariants" },
    { id: "migration", label: "Migration" },
    { id: "diagnostics", label: "Diagnostics" },
    { id: "projection_parity", label: "Projection parity" },
    { id: "accessibility", label: "Accessibility" },
    { id: "performance", label: "Performance" },
    { id: "provenance_display", label: "Provenance display" },
    { id: "effect_target", label: "Effect target" },
    { id: "human_gate", label: "Human gate" },
    { id: "atomicity_recovery", label: "Atomicity and recovery" },
    { id: "receipt_verification", label: "Receipt and verification" }
  ])
});

export function buildStudioProjection(studio: StudioContract): StudioProjectionModel {
  return {
    record_type: "hcc-schema-workflow-studio-projection",
    contract_version: STUDIO_VERSION,
    authority: "projection-only",
    studio,
    counts: {
      sources: studio.context.sources.length,
      axes: studio.context.axes.length,
      record_types: studio.schema.record_types.length,
      fields: studio.schema.record_types.reduce((count, record) => count + record.fields.length, 0),
      vocabularies: studio.schema.vocabularies.length,
      invariants: studio.schema.invariants.length,
      states: studio.workflow.states.length,
      actors: studio.workflow.actors.length,
      guards: studio.workflow.guards.length,
      effects: studio.workflow.effects.length,
      recoveries: studio.workflow.recoveries.length,
      human_gates: studio.workflow.human_gates.length,
      transitions: studio.workflow.transitions.length,
      projections: studio.projections.length
    },
    scale: STUDIO_SCALE_PROFILE,
    effects: { schema_admission: "prohibited", workflow_advance: "prohibited", source_mutation: "prohibited", network: "prohibited" }
  };
}

export function inspectStudioTransition(studio: StudioContract, transitionId: string): StudioTransitionInspection {
  const transition = studio.workflow.transitions.find((candidate) => candidate.id === transitionId);
  if (!transition) return {
    ok: false,
    diagnostics: [{ code: "HCC-STUDIO-REFERENCE", path: "$.workflow.transitions", message: `Unknown transition: ${transitionId}.` }],
    advancement: "prohibited"
  };
  return { ok: true, transition: { ...transition, guard_refs: [...transition.guard_refs], effect_refs: [...transition.effect_refs] }, structural_status: "valid-reference-graph", advancement: "prohibited" };
}
