// @vitest-environment happy-dom

import { dump } from "js-yaml";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildStudioDiagnosticReport, buildStudioProjection, parseStudioContract, renderStudioDiagnostics, renderStudioProjection } from "../src/studio";
import { VALID_STUDIO_SOURCE } from "./fixtures/studio";

beforeEach(() => document.body.replaceChildren());

describe("C5 schema and workflow studio renderer", () => {
  it("renders semantic tables, toggleable layers, and visible effect boundaries", () => {
    const parsed = parseStudioContract(VALID_STUDIO_SOURCE); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const container = document.createElement("div"); document.body.append(container);
    renderStudioProjection(container, buildStudioProjection(parsed.studio));
    expect(container.querySelectorAll("details").length).toBeGreaterThanOrEqual(8);
    expect(container.querySelectorAll("table caption").length).toBeGreaterThanOrEqual(10);
    expect(container.querySelectorAll("thead th[scope=col]").length).toBeGreaterThan(20);
    expect(container.textContent).toContain("4 dimensions / 8 families / 16 contracts");
    expect(container.textContent).toContain("Workflow advance");
    expect(Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.startsWith("Advance workflow"))?.disabled).toBe(true);
  });

  it("copies only deterministic normalized YAML through an injected clipboard effect", async () => {
    const parsed = parseStudioContract(VALID_STUDIO_SOURCE); expect(parsed.ok).toBe(true); if (!parsed.ok) return;
    const copyText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    const container = document.createElement("div"); renderStudioProjection(container, buildStudioProjection(parsed.studio), { copyText });
    const copy = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "Copy normalized design YAML")!; copy.click();
    await vi.waitFor(() => expect(copyText).toHaveBeenCalledWith(dump(parsed.studio, { lineWidth: -1, noRefs: true })));
    expect(container.querySelector("[role=status]")?.textContent).toContain("no vault file changed");
  });

  it("keeps failed source selectable and copies one deterministic inert diagnostic report", async () => {
    const source = VALID_STUDIO_SOURCE.replace("purpose: Propose", "execute: <img src=x onerror=alert(1)>\npurpose: Propose");
    const parsed = parseStudioContract(source); expect(parsed.ok).toBe(false); if (parsed.ok) return;
    const copyText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    const container = document.createElement("div");
    renderStudioDiagnostics(container, parsed.diagnostics, source, { copyText });

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("code")?.textContent).toBe(source);
    expect(container.querySelector("pre")?.tabIndex).toBe(0);
    const copy = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "Copy diagnostic report")!;
    copy.click();
    await vi.waitFor(() => expect(copyText).toHaveBeenCalledWith(buildStudioDiagnosticReport(parsed.diagnostics, source)));
    const report = JSON.parse(copyText.mock.calls[0]![0]);
    expect(report).toMatchObject({ record_type: "hcc-schema-workflow-studio-diagnostic-report", authority: "diagnostic-only", source });
    expect(report.diagnostics[0].path).toMatch(/^\$/);
    expect(report.effects).toEqual({ source_mutation: "prohibited", schema_admission: "prohibited", workflow_advance: "prohibited", network: "prohibited" });
    expect(container.querySelector("[role=status]")?.textContent).toContain("original YAML copied");
  });
});
