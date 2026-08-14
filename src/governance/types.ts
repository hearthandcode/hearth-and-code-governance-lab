export const GOVERNANCE_OPERATIONS = [
  "prepare_review",
  "prepare_verification",
  "prepare_review_ready",
  "confirm_sensitivity",
  "inspect_source_authority",
  "inspect_supersession",
  "build_authority_packet",
  "build_knowledge_system_packet"
] as const;

export type GovernanceOperation = (typeof GOVERNANCE_OPERATIONS)[number];

export interface AuthorityNode {
  relationship: string;
  reference: string;
  resolved_path: string | null;
  authority: string | null;
  review_status: string | null;
  verified: boolean | null;
}

export interface GovernanceContext {
  source_path: string;
  source_digest: string;
  frontmatter: Record<string, unknown>;
  authority_chain: AuthorityNode[];
}

export interface GovernanceProposal {
  record_type: "hcc-governance-operation-proposal";
  contract_version: "0.1-candidate.1";
  authority: "proposal-only";
  operation: GovernanceOperation;
  target: {
    source_path: string;
    source_digest: string;
  };
  observed: {
    review_status: unknown;
    verified: unknown;
    status: unknown;
    sensitivity: unknown;
  };
  proposed_frontmatter_patch: Record<string, unknown> | null;
  authority_chain: AuthorityNode[];
  provenance: {
    prepared_at: string;
    prepared_by: null;
    interaction_class: "projection";
    knowledge_system: "candidate-packet-only" | "not-requested";
  };
  knowledge_system_packet: {
    interaction_class: "projection";
    source_authority: "obsidian-native-state-evidence";
    canonical_source_path: null;
    target: "knowledge-system-return-intake-candidate";
    return_intake: "required-before-canonical-effect";
    automatic_write_back: "prohibited";
  } | null;
  gates: string[];
  effects: {
    frontmatter_write: "prohibited-step-8-held";
    canonical_update: "prohibited";
    external_write: "prohibited";
  };
}
