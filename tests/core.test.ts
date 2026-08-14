import { describe, expect, it } from "vitest";

import { parseInteraction } from "../src/core/parse";
import { buildHeldIntakePreview, validateLocalDraft } from "../src/core/intake-preview";
import { setAnsweredValue, setExplicitState } from "../src/core/draft";
import { buildAdjacentResponseReview } from "../src/core/response-candidate";
import { collectExplicitRelationships, linkPathFromRelationship } from "../src/core/relations";
import type { CompanionContext } from "../src/core/types";
import { toInteractionViewModel } from "../src/core/view-model";

const chooseOne = `
version: "0.1"
id: direction
kind: choose_one
prompt: "Which direction should we test?"
options:
  - id: alpha
    label: "Alpha"
  - id: beta
    label: "Beta"
response:
  value: null
  note: null
  state: unanswered
  author: null
  responded_at: null
visibility: internal
`;

describe("parseInteraction", () => {
  it("parses and normalizes a valid choose_one block", () => {
    const result = parseInteraction(chooseOne);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.block.options?.map((option) => option.id)).toEqual(["alpha", "beta"]);
    expect(toInteractionViewModel(result.block).visibility).toBe("internal");
  });

  it("parses a valid choose_many block", () => {
    const result = parseInteraction(chooseOne.replace("choose_one", "choose_many").replace("value: null", "value: []"));
    expect(result.ok).toBe(true);
  });

  it("parses a valid long_text block without options", () => {
    const result = parseInteraction(`
version: "0.1"
id: correction
kind: long_text
prompt: "What does the offered framing miss?"
response:
  value: null
  note: null
  state: unanswered
  author: null
  responded_at: null
`);
    expect(result.ok).toBe(true);
  });

  it("blocks unsupported kinds", () => {
    const result = parseInteraction(chooseOne.replace("choose_one", "rank"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.map((item) => item.code)).toContain("HCC-KIND-001");
  });

  it("blocks unsupported versions", () => {
    const result = parseInteraction(chooseOne.replace('version: "0.1"', 'version: "1.0"'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.map((item) => item.code)).toContain("HCC-VERSION-001");
    expect(result.diagnostics.map((item) => item.failure)).toContain("unsupported-contract-version");
  });

  it("blocks unknown fields", () => {
    const result = parseInteraction(`${chooseOne}\nrun: "do something"\n`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.map((item) => item.code)).toContain("HCC-UNKNOWN-001");
  });

  it("requires the response note key", () => {
    const result = parseInteraction(chooseOne.replace("  note: null\n", ""));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.some((item) => item.path === "$.response.note")).toBe(true);
  });

  it("rejects a response option ID that is not declared", () => {
    const result = parseInteraction(chooseOne.replace("value: null", "value: gamma").replace("state: unanswered", "state: answered"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.map((item) => item.code)).toContain("HCC-RESPONSE-001");
  });

  it("does not share response arrays between view models", () => {
    const result = parseInteraction(chooseOne.replace("choose_one", "choose_many").replace("value: null", "value: []"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const first = toInteractionViewModel(result.block);
    const second = toInteractionViewModel(result.block);
    expect(first.response.value).not.toBe(second.response.value);
  });

  it("preserves explicit source references without activating them", () => {
    const result = parseInteraction(`${chooseOne}\nsource_refs:\n  - "[[Reference Notes/Protocol Source]]"\n`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.block.source_refs).toEqual(["[[Reference Notes/Protocol Source]]"]);
  });
});

describe("explicit adjacent work", () => {
  it("collects only allowlisted relationship fields and caps the visible list at twelve", () => {
    const related = Array.from({ length: 14 }, (_, index) => `[[Reference ${index + 1}]]`);
    const result = collectExplicitRelationships({ related, inferred: ["[[Must not appear]]"] }, ["[[Source ref]]"]);
    expect(result.shown).toHaveLength(12);
    expect(result.moreNotShown).toBe(3);
    expect(result.shown.some((item) => item.target.includes("Must not appear"))).toBe(false);
  });

  it("normalizes a wikilink to a vault-relative link path", () => {
    expect(linkPathFromRelationship("[[Reference Notes/Protocol Source#Authority|Protocol]]"))
      .toBe("Reference Notes/Protocol Source");
  });
});

describe("held intake preview", () => {
  const context: CompanionContext = {
    sourcePath: "Test Hub/Packet.md",
    sourceDigest: null,
    adjacentWork: { items: [], moreNotShown: 0, diagnostics: [] }
  };

  it("blocks an answered draft with no value before building a preview", () => {
    const result = parseInteraction(chooseOne);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = toInteractionViewModel(result.block);
    const draft = { ...model.response, state: "answered" as const };
    expect(validateLocalDraft(model, draft).map((item) => item.failure)).toContain("semantic-invalid");
  });

  it("builds an immutable evaluate-only shape and retains every human gate", () => {
    const result = parseInteraction(chooseOne);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = toInteractionViewModel(result.block);
    const preview = buildHeldIntakePreview(model, model.response, context);
    expect(preview.locallyValid).toBe(true);
    if (!preview.locallyValid) return;
    expect(preview.projection.immutable).toBe(true);
    expect(preview.projection.effectRequest).toBe("evaluate-only");
    expect(preview.label).toContain("not saved");
    expect(preview.gates.map((item) => item.failure)).toEqual(expect.arrayContaining([
      "capability-denied",
      "consent-state-unresolved",
      "route-unresolved",
      "human-gate-required",
      "public-projection-response-prohibited",
      "stale-source"
    ]));
  });

  it("makes the HCC deferred to Intake v0.2 mismatch visible", () => {
    const result = parseInteraction(chooseOne.replace("state: unanswered", "state: deferred"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = toInteractionViewModel(result.block);
    const preview = buildHeldIntakePreview(model, model.response, context);
    expect(preview.locallyValid).toBe(true);
    if (!preview.locallyValid) return;
    expect(preview.gates.some((item) => item.message.includes("deferred"))).toBe(true);
  });
});

describe("compact response cycle", () => {
  const context: CompanionContext = {
    sourcePath: "Test Hub/08 Compact Response Review Lab.md",
    sourceDigest: null,
    adjacentWork: { items: [], moreNotShown: 0, diagnostics: [] }
  };

  it("marks a non-empty input answered and an empty input unanswered", () => {
    const draft = {
      value: null,
      note: null,
      state: "unanswered" as const,
      author: null,
      responded_at: null
    };
    setAnsweredValue(draft, "alpha");
    expect(draft.state).toBe("answered");
    setAnsweredValue(draft, "");
    expect(draft.state).toBe("unanswered");
  });

  it("clears hidden values when an explicit non-answer state is selected", () => {
    const draft = {
      value: ["alpha"],
      note: "Keep the context note.",
      state: "answered" as const,
      author: null,
      responded_at: null
    };
    setExplicitState(draft, "deferred", "choose_many");
    expect(draft.value).toEqual([]);
    expect(draft.state).toBe("deferred");
    expect(draft.note).toBe("Keep the context note.");
  });

  it("builds deterministic proposal YAML without inventing identity, time, digests, or idempotency", () => {
    const parsed = parseInteraction(chooseOne);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const model = toInteractionViewModel(parsed.block);
    const draft = { ...model.response, value: "alpha", state: "answered" as const };
    const first = buildAdjacentResponseReview(model, draft, context);
    const second = buildAdjacentResponseReview(model, draft, context);

    expect(first.yaml).toBe(second.yaml);
    expect(first.candidate.authority).toBe("proposal-only");
    expect(first.candidate.response.author).toBeNull();
    expect(first.candidate.response.responded_at).toBeNull();
    expect(first.candidate.integrity.payload_digest).toBeNull();
    expect(first.candidate.integrity.idempotency_key).toBeNull();
    expect(first.candidate.effects).toEqual({ save: "prohibited", submit: "prohibited" });
  });

  it("shows an unapplied append-only diff and the unresolved source-binding gate", () => {
    const parsed = parseInteraction(chooseOne);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const review = buildAdjacentResponseReview(toInteractionViewModel(parsed.block), parsed.block.response, context);
    expect(review.proposedDiff).toContain("not applied");
    expect(review.proposedDiff).toContain("+ ```hcc-response-candidate");
    expect(review.gates.map((item) => item.failure)).toEqual(expect.arrayContaining([
      "capability-denied",
      "human-gate-required",
      "route-unresolved",
      "stale-source"
    ]));
  });
});
