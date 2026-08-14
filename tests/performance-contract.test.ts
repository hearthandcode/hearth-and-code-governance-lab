// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";

import { parseCandidateInteraction, type CandidateInteraction } from "../src/grammar";
import { renderCandidateInteraction } from "../src/render-candidate";

const source = `version: 0.3-candidate.1
id: performance-ranking
kind: ranked_choice
prompt: Order the directions
config:
  options:
    - { id: alpha, label: Alpha }
    - { id: beta, label: Beta }
    - { id: gamma, label: Gamma }
    - { id: delta, label: Delta }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
`;

const block: Extract<CandidateInteraction, { kind: "ranked_choice" }> = {
  version: "0.3-candidate.1", id: "performance-ranking", kind: "ranked_choice", prompt: "Order the directions",
  config: { options: [
    { id: "alpha", label: "Alpha" }, { id: "beta", label: "Beta" },
    { id: "gamma", label: "Gamma" }, { id: "delta", label: "Delta" }
  ] },
  response: { value: null, note: null, state: "unanswered", author: null, responded_at: null }
};

afterEach(() => document.body.replaceChildren());

describe("bounded performance smoke contract", () => {
  it("parses one thousand representative candidate blocks within a generous local budget", () => {
    const started = performance.now();
    for (let index = 0; index < 1000; index += 1) expect(parseCandidateInteraction(source).ok).toBe(true);
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it("renders the fifty-block fixture scale within a generous synthetic DOM budget", () => {
    const started = performance.now();
    for (let index = 0; index < 50; index += 1) {
      const container = document.createElement("div");
      document.body.append(container);
      renderCandidateInteraction(container, { ...block, id: `${block.id}-${index}` }, source);
    }
    expect(performance.now() - started).toBeLessThan(2000);
    expect(document.querySelectorAll("article.hcc-widget--candidate")).toHaveLength(50);
  });
});
