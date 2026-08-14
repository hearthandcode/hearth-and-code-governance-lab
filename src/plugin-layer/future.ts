import { FUTURE_INPUT_PROPOSALS } from "../grammar/future";
import { FUTURE_VIEW_PROJECTIONS } from "../visualization/future";
import type { ExtensionDescriptor } from "./types";

function proposalDescriptor(
  id: string,
  capability: ExtensionDescriptor["extendsCapability"],
  contractVersion: string,
  vocabulary: string,
  sourceRef: string,
  fallback: string
): ExtensionDescriptor {
  const descriptor: ExtensionDescriptor = {
    id,
    extendsCapability: capability,
    rendererId: `hcc.proposal.${vocabulary.replaceAll("_", ".")}`,
    contractVersion,
    lifecycle: "proposal",
    vocabulary: [vocabulary],
    requestedEffects: ["render"],
    sourceRef,
    owner: "human-review-required",
    reviewState: "human-review-required",
    verified: false,
    fallback
  };
  return Object.freeze(descriptor);
}

export const FUTURE_INPUT_EXTENSION_DESCRIPTORS: readonly ExtensionDescriptor[] = Object.freeze(
  FUTURE_INPUT_PROPOSALS.map((proposal) => proposalDescriptor(
    `hcc.future.input.${proposal.id.replaceAll("_", ".")}`,
    "hcc.interaction.candidate",
    "0.4-candidate.1",
    proposal.id,
    "src/grammar/future.ts",
    proposal.accessibleFallback
  ))
);

export const FUTURE_VIEW_EXTENSION_DESCRIPTORS: readonly ExtensionDescriptor[] = Object.freeze(
  FUTURE_VIEW_PROJECTIONS.map((proposal) => proposalDescriptor(
    `hcc.future.view.${proposal.id.replaceAll("_", ".")}`,
    "hcc.view.candidate",
    "0.3-candidate.1",
    proposal.id,
    "src/visualization/future.ts",
    proposal.accessibleFallback
  ))
);

export const FUTURE_EXTENSION_DESCRIPTORS: readonly ExtensionDescriptor[] = Object.freeze([
  ...FUTURE_INPUT_EXTENSION_DESCRIPTORS,
  ...FUTURE_VIEW_EXTENSION_DESCRIPTORS
]);

export const SELECTED_EXTENSION_DESCRIPTORS: readonly ExtensionDescriptor[] = Object.freeze([
  Object.freeze<ExtensionDescriptor>({
    id: "hcc.extension.computed-field", extendsCapability: "hcc.extension.computed-field", rendererId: "hcc.candidate.computed-field",
    contractVersion: "0.1-candidate.1", lifecycle: "candidate", vocabulary: ["computed_field"], requestedEffects: ["render"],
    sourceRef: "src/extensions/computed-field.ts", owner: "human-review-required", reviewState: "human-review-required", verified: false,
    fallback: "Calculation input and derived-value table"
  }),
  Object.freeze<ExtensionDescriptor>({
    id: "hcc.extension.radar", extendsCapability: "hcc.extension.radar", rendererId: "hcc.candidate.radar",
    contractVersion: "0.1-candidate.1", lifecycle: "candidate", vocabulary: ["radar"], requestedEffects: ["render"],
    sourceRef: "src/extensions/radar.ts", owner: "human-review-required", reviewState: "human-review-required", verified: false,
    fallback: "Subject-by-dimension table"
  })
]);
