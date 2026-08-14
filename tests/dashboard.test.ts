// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildDashboardProjection,
  buildDashboardProjectionReport,
  DASHBOARD_MODES,
  renderDashboardProjection,
  type DashboardContext,
  type DashboardSourceRecord
} from "../src/dashboard";

const records: DashboardSourceRecord[] = [
  {
    path: "Programs/Alpha.md", title: "Alpha", relationship: "active_document",
    frontmatter: { program_id: "alpha", program_status: "active", lane: "implementation", lane_status: "in-progress", verified: false, review_status: "review-ready", program_refs: ["[[Programs/Alpha]]"], thread_refs: ["[[Threads/T-01]]"], handoff_to: "release steward" }
  },
  {
    path: "Programs/Beta.md", title: "Beta", relationship: "related",
    frontmatter: { program: "beta", status: "approved", verified: true, review_status: "accepted", programs: ["beta"], thread_id: "T-02", handoff_refs: ["[[Handoffs/H-02]]"] }
  },
  {
    path: "Restricted/Hidden.md", title: "Hidden", relationship: "source_refs",
    frontmatter: { sensitivity: "restricted", program_id: "hidden", status: "active", verified: false, thread_id: "private-thread" }
  }
];

const context: DashboardContext = {
  sourcePath: "Programs/Alpha.md",
  sourceDigest: `sha256:${"a".repeat(64)}`,
  records,
  diagnostics: [],
  explicitRecordCap: 12,
  moreNotShown: 0
};

beforeEach(() => document.body.replaceChildren());

describe("bounded native dashboard projection", () => {
  it("implements exactly seven source-named selectors without inferring restricted values", () => {
    expect(DASHBOARD_MODES).toHaveLength(7);
    for (const mode of DASHBOARD_MODES) {
      const projection = buildDashboardProjection(mode, context, "2026-08-11T22:00:00.000Z");
      expect(projection.mode).toBe(mode);
      expect(projection.scope.boundary).toBe("active-document-and-explicit-one-hop");
      expect(projection.scope.included_record_count).toBe(2);
      expect(projection.sources.map((source) => source.path)).toEqual(["Programs/Alpha.md", "Programs/Beta.md"]);
      expect(projection.scope.excluded_restricted_count).toBe(1);
      expect(projection.items.length, mode).toBeGreaterThan(0);
      expect(JSON.stringify(projection.items), mode).not.toContain("hidden");
      expect(JSON.stringify(projection.items), mode).not.toContain("private-thread");
      expect(projection.diagnostics).toContainEqual(expect.objectContaining({ code: "HCC-DASHBOARD-RESTRICTED", path: "Restricted/Hidden.md" }));
      expect(projection.effects).toEqual({ vault_scan: "prohibited", body_read: "active-document-only", mutation: "prohibited", canonical_update: "prohibited" });
    }
  });

  it("uses explicit fields and stable source-path ordering", () => {
    const threads = buildDashboardProjection("threads", context, "2026-08-11T22:00:00.000Z");
    expect(threads.items.map((item) => item.value)).toEqual(["[[Threads/T-01]]", "T-02"]);
    const handoffs = buildDashboardProjection("handoffs", {
      ...context,
      records: [{ path: "Only.md", title: "Only", relationship: "active_document", frontmatter: { next_action: "must not become a handoff" } }]
    }, "2026-08-11T22:00:00.000Z");
    expect(handoffs.items).toEqual([]);
  });

  it("renders an accessible table, explicit scope, and bounded diagnostics", () => {
    const container = document.createElement("section"); document.body.append(container);
    renderDashboardProjection(container, buildDashboardProjection("review_queue", context, "2026-08-11T22:00:00.000Z"));
    expect(container.querySelector("caption")?.textContent).toBe("Review queue projection");
    expect(container.querySelectorAll("thead th[scope=col]")).toHaveLength(5);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(container.querySelector("[role=note]")?.textContent).toContain("does not scan the vault");
    expect(Array.from(container.querySelectorAll("details summary")).some((item) => item.textContent?.includes("1 bounded diagnostic"))).toBe(true);
    expect(container.querySelector("figure figcaption")?.textContent).toBe("Projection provenance trail");
    expect(container.querySelectorAll(".hcc-dashboard__trail li")).toHaveLength(4);
  });

  it("opens exact admitted records and prepares visible copyable no-write governance proposals", async () => {
    const projection = buildDashboardProjection("program_status", context, "2026-08-11T22:00:00.000Z");
    const openSource = vi.fn<(path: string) => void>();
    const copyText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    const prepareGovernanceProposal = vi.fn(() => "authority: proposal-only\neffects:\n  frontmatter_write: prohibited-step-8-held\n");
    const container = document.createElement("section");
    renderDashboardProjection(container, projection, { openSource, copyText, prepareGovernanceProposal });

    const sourceOpen = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "Open source")!;
    sourceOpen.click();
    expect(openSource).toHaveBeenCalledWith("Programs/Alpha.md");

    const prepare = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "Prepare verification proposal")!;
    prepare.click();
    expect(prepareGovernanceProposal).toHaveBeenCalledWith("prepare_verification");
    expect(container.querySelector(".hcc-dashboard__proposal-output code")?.textContent).toContain("frontmatter_write: prohibited-step-8-held");
    const copy = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "Copy proposal YAML")!;
    copy.click();
    await vi.waitFor(() => expect(copyText).toHaveBeenCalledWith(expect.stringContaining("authority: proposal-only")));
  });

  it("copies the exact bounded projection without raw restricted metadata", async () => {
    const projection = buildDashboardProjection("program_status", context, "2026-08-11T22:00:00.000Z");
    const copyText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    const container = document.createElement("section");
    renderDashboardProjection(container, projection, { copyText });
    const copy = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "Copy projection report")!;
    copy.click();
    await vi.waitFor(() => expect(copyText).toHaveBeenCalledWith(buildDashboardProjectionReport(projection)));
    const report = JSON.parse(copyText.mock.calls[0]![0]);
    expect(report).toMatchObject({ record_type: "hcc-native-dashboard-projection", authority: "projection-only", mode: "program_status" });
    expect(report.scope).toMatchObject({ boundary: "active-document-and-explicit-one-hop", excluded_restricted_count: 1 });
    expect(copyText.mock.calls[0]![0]).not.toContain("private-thread");
    expect(copyText.mock.calls[0]![0]).not.toContain('"program_id": "hidden"');
    expect(container.querySelector("[role=status]")?.textContent).toContain("bounded projection report copied");
  });

  it("keeps the visible projection when explicit clipboard copying fails", async () => {
    const projection = buildDashboardProjection("review_queue", context, "2026-08-11T22:00:00.000Z");
    const container = document.createElement("section");
    renderDashboardProjection(container, projection, { copyText: vi.fn().mockRejectedValue(new Error("denied")) });
    const copy = container.querySelector<HTMLButtonElement>(".hcc-dashboard__projection-toolbar button")!; copy.click();
    await vi.waitFor(() => expect(container.querySelector("[role=status]")?.textContent).toContain("Copy failed"));
    expect(container.querySelector("table")).not.toBeNull();
    expect(copy.disabled).toBe(false);
  });
});
