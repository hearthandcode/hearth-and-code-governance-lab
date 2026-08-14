// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";

import { buildDashboardProjection, renderDashboardProjection, type DashboardContext } from "../src/dashboard";
import { buildStudioProjection, parseStudioContract, renderStudioProjection } from "../src/studio";
import { VALID_STUDIO_SOURCE } from "./fixtures/studio";
import { renderCandidateDiagnostics, renderCandidateInteraction } from "../src/render-candidate";
import { buildHccViewModel, renderHccView, type HccViewCandidate } from "../src/visualization";
import { EphemeralWorkbookSessions, renderWorkbook, type WorkbookContract } from "../src/workbook";

const payloads = [
  "<script>globalThis.hccInjected=true</script>",
  "<img src=x onerror=alert(1)>",
  "<svg onload=alert(1)><script>alert(1)</script></svg>",
  "<iframe srcdoc=\"<script>alert(1)</script>\"></iframe>",
  "<a href=\"javascript:alert(1)\">click</a>",
  "<style>body{display:none}</style>",
  "</textarea><script>alert(document.domain)</script>",
  "\" onfocus=\"alert(1)\" autofocus=\"",
  "' onclick='alert(1)' data-x='",
  "&lt;script&gt;alert(1)&lt;/script&gt;",
  "[click](javascript:alert(1))",
  "<object data=\"data:text/html,<script>alert(1)</script>\"></object>",
  "<meta http-equiv=\"refresh\" content=\"0;javascript:alert(1)\">",
  "<form action=\"https://example.test\"><button>send</button></form>",
  "{{constructor.constructor('alert(1)')()}}",
  "\u202E>tpircs/<)1(trela>tpircs<"
] as const;

beforeEach(() => document.body.replaceChildren());

describe("cross-surface inert-text injection corpus", () => {
  it("keeps sixteen hostile strings inert across six renderer families", () => {
    expect(payloads).toHaveLength(16);
    const studioParsed = parseStudioContract(VALID_STUDIO_SOURCE); expect(studioParsed.ok).toBe(true); if (!studioParsed.ok) return;
    let renderedCases = 0;
    for (const [index, payload] of payloads.entries()) {
      const candidate = document.createElement("div");
      renderCandidateInteraction(candidate, {
        version: "0.3-candidate.1", id: `injection-${index}`, kind: "short_text", prompt: payload, help: payload,
        config: {}, response: { value: null, note: null, state: "unanswered", author: null, responded_at: null }
      }, `prompt: ${payload}`);
      assertInert(candidate, payload); renderedCases += 1;

      const visualization = document.createElement("div");
      const view: HccViewCandidate = {
        version: "0.2-candidate.1", id: `injection-view-${index}`, kind: "metric", title: payload, summary: payload,
        source: { mode: "inline", digest: "a".repeat(64) }, encoding: { kind: "metric", value: "value", label: "label" },
        data: [{ value: 1, label: payload }]
      };
      renderHccView(buildHccViewModel(view), visualization);
      assertInert(visualization, payload); renderedCases += 1;

      const workbook = document.createElement("div");
      const contract: WorkbookContract = {
        version: "0.1-candidate.1", id: `injection-workbook-${index}`, title: payload, purpose: payload,
        worksheets: [{ id: "review", label: payload, ref: "Worksheets/Review" }], navigation: "sequential",
        governance: { authority_refs: [payload], review_required: true }
      };
      renderWorkbook(workbook, contract, new EphemeralWorkbookSessions());
      assertInert(workbook, payload); renderedCases += 1;

      const diagnostics = document.createElement("div");
      renderCandidateDiagnostics(diagnostics, [{ code: "HCC-GRAMMAR-SCHEMA-001", failure: "schema-invalid", path: "$.prompt", message: payload }], payload);
      assertInert(diagnostics, payload); renderedCases += 1;

      const dashboard = document.createElement("div");
      const dashboardContext: DashboardContext = {
        sourcePath: "Dashboard/Source.md", sourceDigest: `sha256:${"a".repeat(64)}`, explicitRecordCap: 12, moreNotShown: 0, diagnostics: [],
        records: [{ path: `Dashboard/${index}.md`, title: payload, relationship: "related", frontmatter: { thread_id: payload } }]
      };
      renderDashboardProjection(dashboard, buildDashboardProjection("threads", dashboardContext, "2026-08-11T22:00:00.000Z"));
      assertInert(dashboard, payload); renderedCases += 1;

      const studio = document.createElement("div");
      renderStudioProjection(studio, buildStudioProjection({ ...studioParsed.studio, title: payload }));
      assertInert(studio, payload); renderedCases += 1;
    }
    expect(renderedCases).toBe(96);
    expect((globalThis as Record<string, unknown>).hccInjected).toBeUndefined();
  });
});

function assertInert(container: HTMLElement, payload: string): void {
  expect(container.textContent, payload).toContain(payload);
  expect(container.querySelectorAll("script,img,iframe,object,embed,style,link,meta,base,form,audio,video"), payload).toHaveLength(0);
  for (const element of Array.from(container.querySelectorAll("*"))) {
    for (const attribute of Array.from(element.attributes)) {
      expect(attribute.name, `${payload}: ${element.tagName}`).not.toMatch(/^on/i);
      expect(attribute.value.trim().toLowerCase(), `${payload}: ${attribute.name}`).not.toMatch(/^javascript:/);
    }
  }
}
