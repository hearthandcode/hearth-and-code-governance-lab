// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";

import { buildHccViewModel, renderHccView, type HccViewCandidate } from "../src/visualization";

beforeEach(() => document.body.replaceChildren());

const digest = "a".repeat(64);

const compositionViews: HccViewCandidate[] = [
  {
    version: "0.2-candidate.1", id: "dom-donut", kind: "donut", title: "Disposition", summary: "Share by disposition",
    source: { mode: "inline", digest }, encoding: { kind: "donut", category: "state", value: "count" },
    data: [{ state: "keep", count: 5 }, { state: "revise", count: 11 }]
  },
  {
    version: "0.2-candidate.1", id: "dom-stacked", kind: "stacked_bar", title: "Work by lens", summary: "Tier composition",
    source: { mode: "inline", digest }, encoding: { kind: "stacked_bar", category: "lens", series: "tier", value: "count" },
    data: [{ lens: "governance", tier: "contract", count: 2 }, { lens: "governance", tier: "surface", count: 3 }]
  },
  {
    version: "0.2-candidate.1", id: "dom-treemap", kind: "treemap", title: "Catalog", summary: "Kinds by family",
    source: { mode: "inline", digest }, encoding: { kind: "treemap", label: "family", value: "count" },
    data: [{ family: "choice", count: 4 }, { family: "numeric", count: 6 }]
  }
];

const expansionViews: HccViewCandidate[] = [
  { version: "0.2-candidate.1", id: "dom-bullet", kind: "bullet", title: "Coverage", summary: "Value and target", source: { mode: "inline", digest }, encoding: { kind: "bullet", category: "label", value: "value", target: "target", max: "max" }, data: [{ label: "Tests", value: 72, target: 80, max: 100 }] },
  { version: "0.2-candidate.1", id: "dom-lollipop", kind: "lollipop", title: "Findings", summary: "Lollipop comparison", source: { mode: "inline", digest }, encoding: { kind: "lollipop", category: "label", value: "value" }, data: [{ label: "A", value: 2 }, { label: "B", value: 5 }] },
  { version: "0.2-candidate.1", id: "dom-dot", kind: "dot_plot", title: "Scores", summary: "Dot comparison", source: { mode: "inline", digest }, encoding: { kind: "dot_plot", category: "label", value: "value" }, data: [{ label: "A", value: 2 }, { label: "B", value: 5 }] },
  { version: "0.2-candidate.1", id: "dom-range", kind: "range_bar", title: "Ranges", summary: "Bound intervals", source: { mode: "inline", digest }, encoding: { kind: "range_bar", category: "label", start: "start", end: "end" }, data: [{ label: "A", start: 1, end: 4 }] },
  { version: "0.2-candidate.1", id: "dom-slope", kind: "slope", title: "Change", summary: "Two endpoints", source: { mode: "inline", digest }, encoding: { kind: "slope", category: "label", start: "start", end: "end" }, data: [{ label: "A", start: 1, end: 4 }] },
  { version: "0.2-candidate.1", id: "dom-waterfall", kind: "waterfall", title: "Cumulative", summary: "Signed changes", source: { mode: "inline", digest }, encoding: { kind: "waterfall", category: "label", value: "value" }, data: [{ label: "Start", value: 5 }, { label: "Cost", value: -2 }] },
  { version: "0.2-candidate.1", id: "dom-funnel", kind: "funnel", title: "Stages", summary: "Declared stage values", source: { mode: "inline", digest }, encoding: { kind: "funnel", stage: "stage", value: "value" }, data: [{ stage: "Seen", value: 10 }, { stage: "Done", value: 4 }] },
  { version: "0.2-candidate.1", id: "dom-waffle", kind: "waffle", title: "Disposition share", summary: "Sixty-four-cell composition", source: { mode: "inline", digest }, encoding: { kind: "waffle", category: "state", value: "value" }, data: [{ state: "Keep", value: 5 }, { state: "Revise", value: 3 }] }
];

const representativeFamilyViews: Array<{ family: string; view: HccViewCandidate; svg: boolean }> = [
  { family: "summary", svg: false, view: {
    version: "0.2-candidate.1", id: "dom-metric", kind: "metric", title: "Open findings", summary: "Current total",
    source: { mode: "inline", digest }, encoding: { kind: "metric", value: "count", label: "label" }, data: [{ count: 2, label: "open" }]
  } },
  { family: "comparison", svg: true, view: {
    version: "0.2-candidate.1", id: "dom-bar", kind: "bar", title: "Disposition counts", summary: "Compare states",
    source: { mode: "inline", digest }, encoding: { kind: "bar", category: "state", value: "count" }, data: [{ state: "keep", count: 5 }, { state: "revise", count: 11 }]
  } },
  { family: "sequence", svg: true, view: {
    version: "0.2-candidate.1", id: "dom-timeline", kind: "timeline", title: "Review sequence", summary: "Ordered gates",
    source: { mode: "inline", digest }, encoding: { kind: "timeline", date: "date", label: "gate" }, data: [{ date: "2026-08-10", gate: "design" }, { date: "2026-08-11", gate: "review" }]
  } },
  { family: "relation", svg: true, view: {
    version: "0.2-candidate.1", id: "dom-network", kind: "network", title: "Authority links", summary: "Declared source relations",
    source: { mode: "inline", digest }, encoding: { kind: "network", node: "node", source: "source", target: "target" }, data: [{ node: "source", source: "source", target: "projection" }]
  } },
  { family: "distribution", svg: true, view: {
    version: "0.2-candidate.1", id: "dom-histogram", kind: "histogram", title: "Severity distribution", summary: "Counts by bounded bin",
    source: { mode: "inline", digest }, encoding: { kind: "histogram", value: "severity", bins: 5 }, data: [{ severity: 1 }, { severity: 3 }, { severity: 5 }]
  } }
];

describe("composition visualization DOM", () => {
  for (const view of expansionViews) {
    it(`renders expanded ${view.kind} with semantic SVG and table parity`, () => {
      const container = document.createElement("div"); document.body.append(container);
      renderHccView(buildHccViewModel(view), container);
      expect(container.querySelector("svg")?.getAttribute("role")).toBe("img");
      expect(container.querySelectorAll("svg .hcc-view__mark").length).toBeGreaterThan(0);
      expect(container.querySelectorAll("details table tbody tr")).toHaveLength(view.data?.length ?? 0);
      expect(container.querySelector("article")?.dataset.state).toBe("ready");
      if (view.kind === "waffle") {
        const cells = Array.from(container.querySelectorAll<SVGElement>('rect[data-opacity-level]'));
        expect(cells).toHaveLength(64);
        expect(cells.every((cell) => cell.getAttribute("style") === null)).toBe(true);
        expect(new Set(cells.map((cell) => cell.dataset.opacityLevel))).toEqual(new Set(["4", "8"]));
      }
    });
  }
  for (const view of compositionViews) {
    it(`renders ${view.kind} through the extracted composition backend with table parity`, () => {
      const container = document.createElement("div");
      document.body.append(container);
      renderHccView(buildHccViewModel(view), container);

      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("role")).toBe("img");
      expect(svg?.getAttribute("aria-label")).toBe(`${view.title}. ${view.summary}`);
      expect(svg?.getAttribute("data-renderer-backend")).toBe("native-static-svg");
      expect(svg?.querySelectorAll(".hcc-view__mark").length).toBeGreaterThan(0);
      const fallback = container.querySelector("details table");
      expect(fallback).not.toBeNull();
      expect(fallback?.querySelectorAll("tbody tr")).toHaveLength(view.data?.length ?? 0);
      expect(container.textContent).toContain("Accessible data table");
    });
  }

  for (const { family, view, svg } of representativeFamilyViews) {
    it(`preserves ${family} family DOM and accessible table parity`, () => {
      const container = document.createElement("div"); document.body.append(container);
      renderHccView(buildHccViewModel(view), container);
      expect(container.querySelector<HTMLElement>("article.hcc-view")?.dataset.state).toBe("ready");
      expect(container.querySelectorAll("details table tbody tr")).toHaveLength(view.data?.length ?? 0);
      if (svg) {
        expect(container.querySelector("svg")?.getAttribute("data-renderer-backend")).toBe("native-static-svg");
        expect(container.querySelectorAll("svg .hcc-view__mark").length).toBeGreaterThan(0);
      } else {
        expect(container.querySelector(".hcc-view__metric strong")?.textContent).toBe("2");
      }
    });
  }
});
