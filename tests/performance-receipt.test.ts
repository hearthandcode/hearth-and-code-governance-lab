// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";

import { parseCandidateInteraction, type CandidateInteraction } from "../src/grammar";
import { createSyntheticBenchmarkReceipt, measureWorkload, type BenchmarkWorkload } from "../src/performance";
import { renderCandidateInteraction } from "../src/render-candidate";

const source = `version: 0.3-candidate.1
id: benchmark-ranking
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
  version: "0.3-candidate.1", id: "benchmark-ranking", kind: "ranked_choice", prompt: "Order the directions",
  config: { options: [{ id: "alpha", label: "Alpha" }, { id: "beta", label: "Beta" }, { id: "gamma", label: "Gamma" }, { id: "delta", label: "Delta" }] },
  response: { value: null, note: null, state: "unanswered", author: null, responded_at: null }
};

afterEach(() => document.body.replaceChildren());

describe("synthetic performance receipt", () => {
  it("measures a deterministic workload without hiding a failed ceiling", () => {
    const times = [0, 12, 20, 36];
    let cursor = 0;
    const result = measureWorkload({ id: "deterministic", operation: "parse", unitsPerSample: 2, samples: 2, budgetMs: 15, run: () => undefined }, () => times[cursor++]!);
    expect(result).toMatchObject({ durationsMs: [12, 16], medianMs: 14, maximumMs: 16, medianPerUnitMs: 7, passed: false });
  });

  it("records four power-of-two workloads with four samples and explicit limits", () => {
    const workloads: BenchmarkWorkload[] = [
      { id: "parse-1024", operation: "parse", unitsPerSample: 1024, samples: 4, budgetMs: 2000, run: () => {
        if (!parseCandidateInteraction(source).ok) throw new Error("representative parse failed");
      } },
      ...[1, 16, 64].map((count): BenchmarkWorkload => ({
        id: `render-${count}`,
        operation: "render",
        unitsPerSample: count,
        samples: 4,
        budgetMs: 2000,
        beforeSample: () => document.body.replaceChildren(),
        run: (unit, sample) => {
          const container = document.createElement("div");
          document.body.append(container);
          renderCandidateInteraction(container, { ...block, id: `${block.id}-${sample}-${unit}` }, source);
        }
      }))
    ];
    const receipt = createSyntheticBenchmarkReceipt(workloads, { runtime: `Node ${process.version}`, dom: "happy-dom 20.11.2", host: "synthetic-not-obsidian" });
    console.log(`HCC_SYNTHETIC_PERFORMANCE_RECEIPT ${JSON.stringify(receipt)}`);
    expect(receipt.workloads).toHaveLength(4);
    expect(receipt.workloads.map((item) => item.unitsPerSample)).toEqual([1024, 1, 16, 64]);
    expect(receipt.workloads.every((item) => item.samples === 4 && item.durationsMs.length === 4)).toBe(true);
    expect(receipt.workloads.every((item) => item.maximumMs < item.budgetMs)).toBe(true);
    expect(receipt.passed).toBe(true);
    expect(receipt.effects).toEqual({ vaultRead: false, vaultMutation: false, network: false, canonicalApply: false });
    expect(receipt.limits).toHaveLength(3);
  });
});
