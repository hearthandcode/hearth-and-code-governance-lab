import { CANDIDATE_INPUT_KINDS } from "./types";

export interface FutureInputProposal {
  id: "hierarchy_picker" | "conditional_section" | "schema_object" | "citation_picker" | "ontology_term_picker" | "table_editor" | "drawing_annotation" | "collaborative_field";
  purpose: string;
  prerequisite: string;
  accessibleFallback: string;
  gate: "proposal-only";
}

export const FUTURE_INPUT_PROPOSALS: readonly FutureInputProposal[] = Object.freeze([
  { id: "hierarchy_picker", purpose: "Choose one or more nodes from a governed hierarchy.", prerequisite: "Cycle-free hierarchy contract, stable node IDs, and complete keyboard tree semantics.", accessibleFallback: "Indented path list with explicit selection controls", gate: "proposal-only" },
  { id: "conditional_section", purpose: "Reveal dependent questions from declared prior answers.", prerequisite: "Non-executable condition grammar, dependency-cycle checks, and hidden-value policy.", accessibleFallback: "Linear form with applicability statements", gate: "proposal-only" },
  { id: "schema_object", purpose: "Capture an object governed by an external declared schema.", prerequisite: "Schema registry, version pinning, field-level diagnostics, and migration contract.", accessibleFallback: "Schema-described field table", gate: "proposal-only" },
  { id: "citation_picker", purpose: "Bind a response to an exact source citation.", prerequisite: "Approved source index, locator grammar, excerpt limits, and provenance rules.", accessibleFallback: "Manual source locator and page or section fields", gate: "proposal-only" },
  { id: "ontology_term_picker", purpose: "Select a canonical concept with aliases and lineage.", prerequisite: "Versioned ontology, deprecation mapping, search behavior, and authority filtering.", accessibleFallback: "Canonical term ID plus human-readable label", gate: "proposal-only" },
  { id: "table_editor", purpose: "Capture bounded row-and-column records directly.", prerequisite: "Column schema, row limits, paste sanitizer, keyboard grid model, and validation summary.", accessibleFallback: "Repeatable field groups", gate: "proposal-only" },
  { id: "drawing_annotation", purpose: "Mark regions and notes on a governed visual source.", prerequisite: "Coordinate model, source digest, accessible annotation list, and binary lifecycle policy.", accessibleFallback: "Ordered textual annotations with coordinates", gate: "proposal-only" },
  { id: "collaborative_field", purpose: "Collect concurrent attributed contributions.", prerequisite: "Identity, conflict resolution, presence privacy, offline merge, and audit policy.", accessibleFallback: "Sequential attributed response collection", gate: "proposal-only" }
]);

export function futureInputsDoNotOverlap(): boolean {
  const current = new Set<string>(CANDIDATE_INPUT_KINDS);
  return FUTURE_INPUT_PROPOSALS.every((proposal) => !current.has(proposal.id));
}
