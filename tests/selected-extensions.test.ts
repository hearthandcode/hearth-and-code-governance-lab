// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";

import {
  evaluateComputedField,
  layoutRadarLabels,
  parseComputedField,
  parseRadarView,
  radarBoundsOutsideCircle,
  radarBoundsOverlap,
  renderComputedFieldFence,
  renderRadarViewFence
} from "../src/extensions";

beforeEach(() => document.body.replaceChildren());

const computedSource = `version: 0.1-candidate.1
id: extension-readiness
kind: computed_field
title: Extension readiness
summary: Average of declared review lenses.
inputs:
  - { id: features, label: Features, value: 5 }
  - { id: governance, label: Governance, value: 5 }
fields:
  - id: readiness
    label: Readiness
    formula:
      op: average
      args: [{ ref: features }, { ref: governance }]
    precision: 1
    unit: /5
output: readiness`;

const radarSource = `version: 0.1-candidate.1
id: extension-lenses
kind: radar
title: Extension lenses
summary: Compare two bounded design candidates.
source: { mode: inline, digest: candidate-review-packet }
data:
  - { subject: Current, dimension: Modularity, value: 3, scale: 5 }
  - { subject: Current, dimension: Governance, value: 4, scale: 5 }
  - { subject: Current, dimension: Styling, value: 2, scale: 5 }
  - { subject: Target, dimension: Modularity, value: 5, scale: 5 }
  - { subject: Target, dimension: Governance, value: 5, scale: 5 }
  - { subject: Target, dimension: Styling, value: 5, scale: 5 }`;

describe("selected candidate extensions", () => {
  it("evaluates an allowlisted declarative formula without script execution", () => {
    const parsed = parseComputedField(computedSource);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(evaluateComputedField(parsed.contract).output).toBe(5);
  });

  it("rejects dependency cycles before evaluation", () => {
    const source = computedSource.replace("{ ref: features }, { ref: governance }", "{ ref: readiness }, { ref: governance }");
    const parsed = parseComputedField(source);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.diagnostics.some((item) => item.code === "HCC-EXT-CYCLE")).toBe(true);
  });

  it("renders a computed output with a transparent table fallback", () => {
    const container = document.createElement("div"); renderComputedFieldFence(container, computedSource);
    expect(container.querySelector("output")?.textContent).toBe("5.0 /5");
    expect(container.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(container.textContent).toContain("no script evaluation or write effect");
  });

  it("validates and renders radar SVG with subject-by-dimension table parity", () => {
    expect(parseRadarView(radarSource).ok).toBe(true);
    const container = document.createElement("div"); renderRadarViewFence(container, radarSource);
    expect(container.querySelector("svg")?.getAttribute("role")).toBe("img");
    expect(container.querySelectorAll(".hcc-radar__series")).toHaveLength(2);
    expect(Array.from(container.querySelectorAll<SVGElement>(".hcc-radar__series"), (item) => item.dataset.seriesIndex)).toEqual(["0", "1"]);
    expect(Array.from(container.querySelectorAll<SVGElement>(".hcc-radar__series"), (item) => item.getAttribute("style"))).toEqual([null, null]);
    expect(Array.from(container.querySelectorAll<HTMLElement>(".hcc-radar__legend li"), (item) => item.dataset.seriesIndex)).toEqual(["0", "1"]);
    expect(container.querySelectorAll(".hcc-radar__label-group")).toHaveLength(3);
    expect(container.querySelectorAll(".hcc-radar__label-box")).toHaveLength(3);
    expect(container.querySelectorAll(".hcc-radar__leader")).toHaveLength(3);
    expect(container.querySelector("svg")?.getAttribute("viewBox")).not.toBe("0 0 640 520");
    expect(Array.from(container.querySelectorAll(".hcc-radar__label"), (item) => item.textContent)).toEqual(["Modularity", "Governance", "Styling"]);
    expect(container.querySelectorAll("details tbody tr")).toHaveLength(2);
    expect(container.textContent).toContain("no source or vault write effect");
  });

  it.each([3, 4, 8, 12])("keeps %i radar plaques outside the plot and mutually separated", (count) => {
    const layout = layoutRadarLabels(Array.from({ length: count }, (_, index) => `Dimension ${index + 1} with bounded label`));
    expect(layout.labels).toHaveLength(count);
    layout.labels.forEach((label, index) => {
      expect(radarBoundsOutsideCircle(label.bounds, layout.radius + 16)).toBe(true);
      layout.labels.slice(index + 1).forEach((other) => expect(radarBoundsOverlap(label.bounds, other.bounds, 5)).toBe(false));
      expect(label.bounds.left).toBeGreaterThanOrEqual(layout.viewBox.left);
      expect(label.bounds.right).toBeLessThanOrEqual(layout.viewBox.right);
      expect(label.bounds.top).toBeGreaterThanOrEqual(layout.viewBox.top);
      expect(label.bounds.bottom).toBeLessThanOrEqual(layout.viewBox.bottom);
    });
  });

  it("rejects incomplete subject axes and out-of-range values", () => {
    const invalid = radarSource.replace("value: 5, scale: 5", "value: 6, scale: 5").replace("  - { subject: Target, dimension: Styling, value: 5, scale: 5 }", "");
    expect(parseRadarView(invalid).ok).toBe(false);
  });
});
