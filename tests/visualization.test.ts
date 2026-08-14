import { describe, expect, it } from "vitest";

import {
  HCC_VIEW_KINDS,
  FUTURE_VIEW_PROJECTIONS,
  buildHccViewModel,
  validateHccViewCandidate,
  type HccViewCandidate,
  type ViewEncoding,
  type ViewRow
} from "../src/visualization";

const EXPECTED_DIGEST = `sha256:${"a".repeat(64)}`;
const CHANGED_DIGEST = `sha256:${"b".repeat(64)}`;

const rowsByKind: Record<string, ViewRow[]> = {
  metric: [{ label: "Completion", value: 72 }],
  table: [{ name: "Alpha", status: "open" }],
  bar: [{ category: "Alpha", value: 4 }, { category: "Beta", value: 7 }],
  timeline: [{ date: "2026-08-01", label: "Opened" }, { date: "2026-08-10", label: "Reviewed" }],
  xy: [{ x: 1, y: 2 }, { x: 2, y: 5 }],
  heatmap: [{ column: "A", row: "One", value: 3 }],
  hierarchy: [{ id: "root", parent: "", value: 2 }, { id: "child", parent: "root", value: 1 }],
  network: [{ node: "Alpha", source: "Alpha", target: "Beta" }, { node: "Beta", source: "Beta", target: "Alpha" }],
  donut: [{ category: "Alpha", value: 4 }, { category: "Beta", value: 6 }],
  stacked_bar: [{ category: "One", series: "A", value: 3 }, { category: "One", series: "B", value: 5 }],
  area: [{ x: 1, y: 2 }, { x: 2, y: 4 }],
  histogram: [{ value: 1 }, { value: 2 }, { value: 3 }],
  box_plot: [{ category: "A", value: 1 }, { category: "A", value: 4 }],
  gauge: [{ value: 72 }],
  calendar_heatmap: [{ date: "2026-08-10", value: 3 }, { date: "2026-08-11", value: 5 }],
  treemap: [{ label: "Alpha", value: 4, group: "One" }, { label: "Beta", value: 6, group: "One" }],
  bullet: [{ category: "Coverage", value: 72, target: 80, max: 100 }],
  lollipop: [{ category: "Alpha", value: 4 }, { category: "Beta", value: 7 }],
  dot_plot: [{ category: "Alpha", value: 4 }, { category: "Beta", value: 7 }],
  range_bar: [{ category: "Alpha", start: 2, end: 6 }, { category: "Beta", start: 4, end: 9 }],
  slope: [{ category: "Alpha", start: 2, end: 6 }, { category: "Beta", start: 7, end: 9 }],
  waterfall: [{ category: "Start", value: 10 }, { category: "Cost", value: -3 }, { category: "Gain", value: 5 }],
  funnel: [{ stage: "Seen", value: 100 }, { stage: "Started", value: 70 }, { stage: "Completed", value: 40 }],
  waffle: [{ category: "Keep", value: 5 }, { category: "Revise", value: 3 }]
};

const encodingByKind: Record<string, ViewEncoding> = {
  metric: { kind: "metric", value: "value", label: "label" },
  table: { kind: "table", columns: ["name", "status"] },
  bar: { kind: "bar", category: "category", value: "value" },
  timeline: { kind: "timeline", date: "date", label: "label" },
  xy: { kind: "xy", x: "x", y: "y", mark: "line" },
  heatmap: { kind: "heatmap", x: "column", y: "row", value: "value" },
  hierarchy: { kind: "hierarchy", id: "id", parent: "parent", value: "value" },
  network: { kind: "network", node: "node", source: "source", target: "target" },
  donut: { kind: "donut", category: "category", value: "value" },
  stacked_bar: { kind: "stacked_bar", category: "category", series: "series", value: "value" },
  area: { kind: "area", x: "x", y: "y" },
  histogram: { kind: "histogram", value: "value", bins: 4 },
  box_plot: { kind: "box_plot", category: "category", value: "value" },
  gauge: { kind: "gauge", value: "value", min: 0, max: 100 },
  calendar_heatmap: { kind: "calendar_heatmap", date: "date", value: "value" },
  treemap: { kind: "treemap", label: "label", value: "value", group: "group" },
  bullet: { kind: "bullet", category: "category", value: "value", target: "target", max: "max" },
  lollipop: { kind: "lollipop", category: "category", value: "value" },
  dot_plot: { kind: "dot_plot", category: "category", value: "value" },
  range_bar: { kind: "range_bar", category: "category", start: "start", end: "end" },
  slope: { kind: "slope", category: "category", start: "start", end: "end" },
  waterfall: { kind: "waterfall", category: "category", value: "value" },
  funnel: { kind: "funnel", stage: "stage", value: "value" },
  waffle: { kind: "waffle", category: "category", value: "value" }
};

function inlineCandidate(kind: string): Record<string, unknown> {
  return {
    version: "0.2-candidate.1",
    id: `${kind}-example`,
    kind,
    title: `${kind} projection`,
    summary: `Accessible summary for ${kind}.`,
    source: { mode: "inline", digest: `sha256:${kind}` },
    encoding: encodingByKind[kind],
    data: rowsByKind[kind]
  };
}

describe("hcc-view candidate validation", () => {
  it("keeps eight non-overlapping future projections proposal-only", () => {
    expect(FUTURE_VIEW_PROJECTIONS).toHaveLength(8);
    expect(new Set(FUTURE_VIEW_PROJECTIONS.map((item) => item.id)).size).toBe(8);
    FUTURE_VIEW_PROJECTIONS.forEach((item) => {
      expect(HCC_VIEW_KINDS).not.toContain(item.id);
      expect(item.gate).toBe("proposal-only");
      expect(item.accessibleFallback.length).toBeGreaterThan(0);
    });
  });

  it("admits exactly twenty-four declarative projection kinds", () => {
    expect(HCC_VIEW_KINDS).toEqual(["metric", "table", "bar", "timeline", "xy", "heatmap", "hierarchy", "network", "donut", "stacked_bar", "area", "histogram", "box_plot", "gauge", "calendar_heatmap", "treemap", "bullet", "lollipop", "dot_plot", "range_bar", "slope", "waterfall", "funnel", "waffle"]);
    HCC_VIEW_KINDS.forEach((kind) => expect(validateHccViewCandidate(inlineCandidate(kind)).ok).toBe(true));
  });

  it("fails closed on unknown fields and executable-looking additions", () => {
    const candidate = { ...inlineCandidate("bar"), expression: "rows.map(run)" };
    const result = validateHccViewCandidate(candidate);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "HCC-VIEW-UNKNOWN", path: "$.expression" }));
  });

  it("rejects remote, absolute, traversing, and backslash source paths", () => {
    for (const path of ["https://example.test/data.json", "/outside.yaml", "../secret.yaml", "folder\\file.yaml", ".obsidian/plugins.json", "Data/notes.md"]) {
      const candidate = { ...inlineCandidate("table"), source: { mode: "vault", path, digest: EXPECTED_DIGEST }, data: undefined };
      expect(validateHccViewCandidate(candidate).ok).toBe(false);
    }
  });

  it("requires a complete SHA-256 binding for vault sources", () => {
    const candidate = {
      ...inlineCandidate("table"),
      source: { mode: "vault", path: "Data/table.yaml", digest: "sha256:expected" },
      data: undefined
    };
    expect(validateHccViewCandidate(candidate).ok).toBe(false);
  });

  it("requires accessible title and summary", () => {
    expect(validateHccViewCandidate({ ...inlineCandidate("metric"), title: "" }).ok).toBe(false);
    expect(validateHccViewCandidate({ ...inlineCandidate("metric"), summary: "" }).ok).toBe(false);
  });

  it("requires inline rows and prevents vault-bound candidates from embedding rows", () => {
    const missing = { ...inlineCandidate("metric") };
    delete missing.data;
    expect(validateHccViewCandidate(missing).ok).toBe(false);
    expect(validateHccViewCandidate({
      ...inlineCandidate("metric"), source: { mode: "vault", path: "Data/metrics.yaml", digest: EXPECTED_DIGEST }
    }).ok).toBe(false);
  });

  it("rejects nested values and absent encoded fields", () => {
    expect(validateHccViewCandidate({ ...inlineCandidate("table"), data: [{ name: { nested: true }, status: "open" }] }).ok).toBe(false);
    expect(validateHccViewCandidate({ ...inlineCandidate("bar"), data: [{ category: "Alpha" }] }).ok).toBe(false);
    expect(validateHccViewCandidate({ ...inlineCandidate("table"), data: [{ name: "Alpha", status: Infinity }] }).ok).toBe(false);
  });
});

describe("hcc-view deterministic model", () => {
  function valid(kind: string): HccViewCandidate {
    const result = validateHccViewCandidate(inlineCandidate(kind));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("fixture invalid");
    return result.view;
  }

  it("builds a ready native-static model and an accessible tabular fallback", () => {
    const model = buildHccViewModel(valid("bar"));
    expect(model.state).toBe("ready");
    expect(model.rendererBackend).toBe("native-static-svg");
    expect(model.fallback).toEqual({ columns: ["category", "value"], rows: [["Alpha", "4"], ["Beta", "7"]] });
    expect(model.sourceLabel).toBe("inline data");
    expect(model.sourceDigest).toBe("sha256:bar");
  });

  it("withholds an unresolved or digest-mismatched vault projection as stale", () => {
    const result = validateHccViewCandidate({
      version: "0.2-candidate.1", id: "bound", kind: "bar", title: "Bound bar", summary: "Bound summary.",
      source: { mode: "vault", path: "Data/bars.yaml", digest: EXPECTED_DIGEST },
      encoding: encodingByKind.bar
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(buildHccViewModel(result.view).state).toBe("stale");
    expect(buildHccViewModel(result.view, { path: "Data/bars.yaml", digest: CHANGED_DIGEST, rows: rowsByKind.bar }).rows).toEqual([]);
    expect(buildHccViewModel(result.view, { path: "Data/bars.yaml", digest: EXPECTED_DIGEST, rows: rowsByKind.bar }).state).toBe("ready");
  });

  it("distinguishes empty from invalid data without inventing values", () => {
    const emptyResult = validateHccViewCandidate({ ...inlineCandidate("bar"), data: [] });
    expect(emptyResult.ok).toBe(true);
    if (!emptyResult.ok) return;
    expect(buildHccViewModel(emptyResult.view).state).toBe("empty");

    const invalid = valid("bar");
    invalid.data = [{ category: "Alpha", value: "not-a-number" }];
    const model = buildHccViewModel(invalid);
    expect(model.state).toBe("invalid");
    expect(model.diagnostics[0]?.path).toBe("$.data[0].value");
  });

  it("rejects misleading values before rendering bounded and calendar projections", () => {
    const donut = valid("donut"); donut.data = [{ category: "A", value: -1 }];
    expect(buildHccViewModel(donut).state).toBe("invalid");
    const gauge = valid("gauge"); gauge.data = [{ value: 150 }];
    expect(buildHccViewModel(gauge).state).toBe("invalid");
    const calendar = valid("calendar_heatmap"); calendar.data = [{ date: "2026-02-31", value: 1 }];
    expect(buildHccViewModel(calendar).state).toBe("invalid");
  });

  it("is deterministic and copies source rows", () => {
    const view = valid("timeline");
    const first = buildHccViewModel(view);
    const second = buildHccViewModel(view);
    expect(first).toEqual(second);
    expect(first.rows).not.toBe(view.data);
  });
});
