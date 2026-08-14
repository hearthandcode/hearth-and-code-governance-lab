import { describe, expect, it } from "vitest";

import { buildGovernanceProposal, collectAuthorityReferences } from "../src/governance/model";
import type { GovernanceContext } from "../src/governance/types";

const context: GovernanceContext = {
  source_path: "Worksheets/01 Orientation.md",
  source_digest: `sha256:${"a".repeat(64)}`,
  frontmatter: {
    review_status: "draft",
    verified: false,
    sensitivity: "private",
    source_refs: ["[[Protocol]]"],
    supersedes: "[[Old Worksheet]]"
  },
  authority_chain: [
    { relationship: "source_refs", reference: "[[Protocol]]", resolved_path: "Protocol.md", authority: "source", review_status: "accepted", verified: true }
  ]
};

describe("power-of-two governance workbench", () => {
  it("collects only explicit authority references and caps them", () => {
    const refs = collectAuthorityReferences({
      source_refs: ["A", "B"], authority_refs: ["C"], inferred: ["must not appear"]
    }, 2);
    expect(refs).toEqual([
      { relationship: "source_refs", reference: "A" },
      { relationship: "source_refs", reference: "B" }
    ]);
  });

  it("prepares review and verification patches without authorizing a write", () => {
    const review = buildGovernanceProposal("prepare_review", context, "2026-08-10T12:00:00.000Z");
    expect(review.proposed_frontmatter_patch).toMatchObject({ review_status: "reviewed", reviewed_by: null });
    expect(review.effects.frontmatter_write).toBe("prohibited-step-8-held");

    const verification = buildGovernanceProposal("prepare_verification", context, "2026-08-10T12:00:00.000Z");
    expect(verification.proposed_frontmatter_patch).toMatchObject({ verified: true, verified_by: null });
    expect(verification.gates).toContain("verified-true-must-be-a-human-attestation");
  });

  it("builds an explicit knowledge-system candidate without external effects", () => {
    const packet = buildGovernanceProposal("build_knowledge_system_packet", context, "2026-08-10T12:00:00.000Z");
    expect(packet.provenance.knowledge_system).toBe("candidate-packet-only");
    expect(packet.knowledge_system_packet).toMatchObject({
      interaction_class: "projection",
      canonical_source_path: null,
      automatic_write_back: "prohibited"
    });
    expect(packet.proposed_frontmatter_patch).toBeNull();
    expect(packet.effects.external_write).toBe("prohibited");
  });

  it("keeps source and supersession projections semantically separate", () => {
    const expanded = {
      ...context,
      authority_chain: [
        ...context.authority_chain,
        { relationship: "supersedes", reference: "[[Old]]", resolved_path: "Old.md", authority: "historical", review_status: "superseded", verified: false }
      ]
    };
    expect(buildGovernanceProposal("inspect_source_authority", expanded, "2026-08-10T12:00:00.000Z").authority_chain.map((item) => item.relationship)).toEqual(["source_refs"]);
    expect(buildGovernanceProposal("inspect_supersession", expanded, "2026-08-10T12:00:00.000Z").authority_chain.map((item) => item.relationship)).toEqual(["supersedes"]);
  });

  it("does not invent a sensitivity value", () => {
    const missing = { ...context, frontmatter: { ...context.frontmatter, sensitivity: undefined } };
    const proposal = buildGovernanceProposal("confirm_sensitivity", missing, "2026-08-10T12:00:00.000Z");
    expect(proposal.proposed_frontmatter_patch).toBeNull();
    expect(proposal.gates).toContain("sensitivity-value-absent-no-value-inferred");
  });
});
