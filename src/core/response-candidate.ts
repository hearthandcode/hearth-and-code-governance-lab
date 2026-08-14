import { dump } from "js-yaml";

import type {
  AdjacentResponseCandidate,
  AdjacentResponseReview,
  CompanionContext,
  InteractionResponse,
  InteractionViewModel
} from "./types";
import { cloneResponse } from "./view-model";

export function buildAdjacentResponseReview(
  model: InteractionViewModel,
  draft: InteractionResponse,
  context: CompanionContext
): AdjacentResponseReview {
  const candidate: AdjacentResponseCandidate = {
    record_type: "hcc-response-candidate",
    contract_version: "0.1-candidate.1",
    authority: "proposal-only",
    immutable: true,
    id: `${model.id}--response-preview`,
    interaction_ref: model.id,
    source_binding: {
      path: context.sourcePath,
      digest: context.sourceDigest,
      interaction_version: model.version
    },
    response: cloneResponse(draft),
    review: {
      state: "draft",
      human_gate: "required"
    },
    integrity: {
      canonicalization: "unreleased",
      payload_digest: null,
      idempotency_key: null
    },
    effects: {
      save: "prohibited",
      submit: "prohibited"
    }
  };
  const yaml = dump(candidate, {
    lineWidth: -1,
    noRefs: true,
    noCompatMode: true,
    quotingType: '"',
    forceQuotes: false
  });
  const proposedDiff = [
    "Proposed append-only adjacent record (not applied):",
    "+ ```hcc-response-candidate",
    ...yaml.trimEnd().split("\n").map((line) => `+ ${line}`),
    "+ ```"
  ].join("\n");

  const gates: AdjacentResponseReview["gates"] = [
    {
      failure: "capability-denied",
      message: "No Phase 0 vault-write capability exists, and this candidate contract is not released HCC grammar."
    },
    {
      failure: "human-gate-required",
      message: "A human must approve the response contract, target, diff semantics, and write boundary before persistence work begins."
    },
    {
      failure: "route-unresolved",
      message: "No canonical or accepted-intake destination has been selected."
    }
  ];
  if (context.sourceDigest === null) {
    gates.push({
      failure: "stale-source",
      message: "Payload digest and idempotency key remain null until source canonicalization and digest binding are released."
    });
  }

  return {
    label: "proposal only — not written, submitted, or admitted",
    candidate,
    yaml,
    proposedDiff,
    gates
  };
}
