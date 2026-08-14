import yaml from "js-yaml";

import { parseCandidateInteraction, type CandidateGrammarParseResult } from "../grammar";
import { parseInteraction } from "./parse";
import type { ParseResult } from "./types";

export type InteractionRouteResult =
  | { grammar: "released"; result: Extract<ParseResult, { ok: true }> }
  | { grammar: "candidate"; result: Extract<CandidateGrammarParseResult, { ok: true }> }
  | { grammar: "released-invalid"; result: Extract<ParseResult, { ok: false }> }
  | { grammar: "candidate-invalid"; result: Extract<CandidateGrammarParseResult, { ok: false }> };

/**
 * Selects the grammar family before rendering diagnostics. Candidate-looking
 * versions stay on the candidate diagnostic path even when unsupported, so a
 * stale or future candidate never masquerades as an invalid released block.
 */
export function routeInteractionSource(source: string): InteractionRouteResult {
  const released = parseInteraction(source);
  if (released.ok) return { grammar: "released", result: released };

  const candidate = parseCandidateInteraction(source);
  if (candidate.ok) return { grammar: "candidate", result: candidate };

  return declaresCandidateContract(source)
    ? { grammar: "candidate-invalid", result: candidate }
    : { grammar: "released-invalid", result: released };
}

export function declaresCandidateContract(source: string): boolean {
  try {
    const value = yaml.load(source, { schema: yaml.JSON_SCHEMA });
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const version = (value as Record<string, unknown>).version;
    return typeof version === "string" && /^\d+\.\d+-candidate\.\d+$/.test(version);
  } catch {
    return false;
  }
}
