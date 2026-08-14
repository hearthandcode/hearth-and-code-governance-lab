// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";

import { auditRenderedAccessibility } from "../src/accessibility";
import { renderCandidateInteraction } from "../src/render-candidate";
import { buildHccViewModel, renderHccView, type HccViewCandidate } from "../src/visualization";
import { EphemeralWorkbookSessions, renderWorkbook, renderWorksheet, type WorkbookContract, type WorksheetContract } from "../src/workbook";

beforeEach(() => document.body.replaceChildren());

const baseResponse = { value: null, note: null, state: "unanswered" as const, author: null, responded_at: null };
const surfaces: Array<{ id: string; render: (container: HTMLElement) => void }> = [
  { id: "matrix", render: (container) => renderCandidateInteraction(container, {
    version: "0.3-candidate.1", id: "a11y-matrix", kind: "matrix", prompt: "Review each lens",
    config: { rows: [{ id: "purpose", label: "Purpose" }, { id: "access", label: "Accessibility" }], columns: [{ id: "pass", label: "Pass" }, { id: "revise", label: "Revise" }], selection: "one", require_all_rows: true }, response: baseResponse
  }, "fixture") },
  { id: "ranking", render: (container) => renderCandidateInteraction(container, {
    version: "0.3-candidate.1", id: "a11y-ranking", kind: "ranked_choice", prompt: "Rank directions",
    config: { options: [{ id: "one", label: "One" }, { id: "two", label: "Two" }, { id: "three", label: "Three" }] }, response: baseResponse
  }, "fixture") },
  { id: "repeatable", render: (container) => renderCandidateInteraction(container, {
    version: "0.3-candidate.1", id: "a11y-repeatable", kind: "repeatable_group", prompt: "Record findings",
    config: { fields: [{ id: "finding", label: "Finding", kind: "short_text", required: true }, { id: "severity", label: "Severity", kind: "number", required: true, min: 1, max: 5, step: 1 }], max_items: 4 }, response: baseResponse
  }, "fixture") },
  { id: "radio", render: (container) => renderCandidateInteraction(container, {
    version: "0.3-candidate.1", id: "a11y-radio", kind: "radio_group", prompt: "Choose disposition",
    config: { options: [{ id: "keep", label: "Keep" }, { id: "revise", label: "Revise" }], orientation: "horizontal" }, response: baseResponse
  }, "fixture") },
  { id: "long-text", render: (container) => renderCandidateInteraction(container, {
    version: "0.3-candidate.1", id: "a11y-text", kind: "long_text", prompt: "Provide context",
    config: { min_length: 1, max_length: 1000, rows: 6 }, response: baseResponse
  }, "fixture") },
  { id: "visualization", render: (container) => {
    const view: HccViewCandidate = { version: "0.2-candidate.1", id: "a11y-bar", kind: "bar", title: "Disposition", summary: "Counts by state", source: { mode: "inline", digest: "a".repeat(64) }, encoding: { kind: "bar", category: "state", value: "count" }, data: [{ state: "pass", count: 7 }, { state: "revise", count: 1 }] };
    renderHccView(buildHccViewModel(view), container);
  } },
  { id: "worksheet", render: (container) => {
    const worksheet: WorksheetContract = { version: "0.1-candidate.1", id: "a11y-worksheet", title: "Accessibility worksheet", purpose: "Review semantics.", privacy: "private", sections: [{ id: "review", title: "Review", interactions: ["a11y-text"] }], completion: { required: ["a11y-text"] }, governance: { authority_refs: [], review_required: true, verification_required: false } };
    renderWorksheet(container, worksheet, "Worksheets/Accessibility.md", new EphemeralWorkbookSessions());
  } },
  { id: "workbook", render: (container) => {
    const workbook: WorkbookContract = { version: "0.1-candidate.1", id: "a11y-workbook", title: "Accessibility workbook", purpose: "Review workbook semantics.", worksheets: [{ id: "review", label: "Review", ref: "Worksheets/Accessibility" }], navigation: "sequential", governance: { authority_refs: [], review_required: true } };
    renderWorkbook(container, workbook, new EphemeralWorkbookSessions());
  } }
];

describe("representative rendered accessibility audit", () => {
  for (const surface of surfaces) {
    it(`${surface.id} has no structural accessibility diagnostic`, () => {
      const container = document.createElement("div"); document.body.append(container);
      surface.render(container);
      const report = auditRenderedAccessibility(container);
      expect(report.diagnostics, JSON.stringify(report.diagnostics, null, 2)).toEqual([]);
      expect(report.passed).toBe(true);
      expect(report.checkedElements).toBeGreaterThan(0);
    });
  }

  it("fails malformed controls, SVG, table, disclosure, and duplicate IDs visibly", () => {
    const container = document.createElement("div");
    container.innerHTML = '<input id="duplicate"><input id="duplicate"><button></button><svg></svg><table><tbody><tr><td>x</td></tr></tbody></table><details><div>x</div></details>';
    const report = auditRenderedAccessibility(container);
    expect(new Set(report.diagnostics.map((item) => item.code))).toEqual(new Set([
      "HCC-A11Y-DUPLICATE-ID", "HCC-A11Y-CONTROL-NAME", "HCC-A11Y-BUTTON-NAME", "HCC-A11Y-SVG", "HCC-A11Y-TABLE", "HCC-A11Y-DISCLOSURE"
    ]));
    expect(report.passed).toBe(false);
  });
});
