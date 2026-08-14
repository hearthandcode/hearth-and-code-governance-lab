import type { GovernanceContext, GovernanceOperation, GovernanceProposal } from "./types";

export const AUTHORITY_REFERENCE_FIELDS = [
  "source_refs",
  "authority_refs",
  "governed_by",
  "supersedes",
  "superseded_by",
  "related"
] as const;

export function collectAuthorityReferences(frontmatter: Record<string, unknown>, cap = 16): Array<{ relationship: string; reference: string }> {
  const result: Array<{ relationship: string; reference: string }> = [];
  for (const field of AUTHORITY_REFERENCE_FIELDS) {
    const value = frontmatter[field];
    const refs = typeof value === "string" ? [value] : Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    for (const reference of refs) {
      if (result.length >= cap) return result;
      result.push({ relationship: field, reference });
    }
  }
  return result;
}

export function buildGovernanceProposal(
  operation: GovernanceOperation,
  context: GovernanceContext,
  preparedAt: string
): GovernanceProposal {
  const patch = patchFor(operation, context.frontmatter, preparedAt);
  const authorityChain = chainFor(operation, context.authority_chain);
  const gates = [
    "step-8-writer-held",
    "exact-frontmatter-contract-review-required",
    "source-digest-recheck-required"
  ];
  if (["prepare_review", "prepare_verification", "prepare_review_ready", "confirm_sensitivity"].includes(operation)) {
    gates.push("human-identity-and-attestation-required");
  }
  if (operation === "prepare_verification") {
    gates.push("verified-true-must-be-a-human-attestation");
  }
  if (operation === "confirm_sensitivity" && typeof context.frontmatter.sensitivity !== "string") {
    gates.push("sensitivity-value-absent-no-value-inferred");
  }
  if (authorityChain.some((node) => node.resolved_path === null)) {
    gates.push("authority-reference-unresolved");
  }

  return {
    record_type: "hcc-governance-operation-proposal",
    contract_version: "0.1-candidate.1",
    authority: "proposal-only",
    operation,
    target: { source_path: context.source_path, source_digest: context.source_digest },
    observed: {
      review_status: context.frontmatter.review_status ?? null,
      verified: context.frontmatter.verified ?? null,
      status: context.frontmatter.status ?? null,
      sensitivity: context.frontmatter.sensitivity ?? null
    },
    proposed_frontmatter_patch: patch,
    authority_chain: authorityChain.map((node) => ({ ...node })),
    provenance: {
      prepared_at: preparedAt,
      prepared_by: null,
      interaction_class: "projection",
      knowledge_system: operation === "build_knowledge_system_packet" ? "candidate-packet-only" : "not-requested"
    },
    knowledge_system_packet: operation === "build_knowledge_system_packet" ? {
      interaction_class: "projection",
      source_authority: "obsidian-native-state-evidence",
      canonical_source_path: null,
      target: "knowledge-system-return-intake-candidate",
      return_intake: "required-before-canonical-effect",
      automatic_write_back: "prohibited"
    } : null,
    gates,
    effects: {
      frontmatter_write: "prohibited-step-8-held",
      canonical_update: "prohibited",
      external_write: "prohibited"
    }
  };
}

function chainFor(operation: GovernanceOperation, chain: GovernanceContext["authority_chain"]): GovernanceContext["authority_chain"] {
  if (operation === "inspect_source_authority") {
    return chain.filter((node) => ["source_refs", "authority_refs", "governed_by"].includes(node.relationship));
  }
  if (operation === "inspect_supersession") {
    return chain.filter((node) => node.relationship === "supersedes" || node.relationship === "superseded_by");
  }
  return chain;
}

function patchFor(
  operation: GovernanceOperation,
  frontmatter: Record<string, unknown>,
  preparedAt: string
): Record<string, unknown> | null {
  if (operation === "prepare_review") {
    return { review_status: "reviewed", reviewed_at: preparedAt, reviewed_by: null };
  }
  if (operation === "prepare_verification") {
    return { verified: true, verified_at: preparedAt, verified_by: null };
  }
  if (operation === "prepare_review_ready") {
    return { status: "review-ready", status_changed_at: preparedAt, status_changed_by: null };
  }
  if (operation === "confirm_sensitivity") {
    return typeof frontmatter.sensitivity === "string"
      ? { sensitivity: frontmatter.sensitivity, sensitivity_reviewed_at: preparedAt, sensitivity_reviewed_by: null }
      : null;
  }
  return null;
}
