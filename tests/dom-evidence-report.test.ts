import { Window } from "happy-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderEvidenceReport } from "../src/ui/evidence-report";

beforeEach(() => {
  const window = new Window();
  vi.stubGlobal("window", window);
  vi.stubGlobal("document", window.document);
});

describe("selectable evidence report", () => {
  it("renders exact inert text and copies the complete report on demand", async () => {
    const copyText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    const content = `{\n  "result": "<img src=x onerror=alert(1)>"\n}`;
    const container = document.createElement("div");
    renderEvidenceReport(container, { title: "Host assurance", summary: "8/8 checks passed.", content, copyText });

    expect(container.querySelector(".hcc-evidence-report__summary")?.textContent).toBe("8/8 checks passed.");
    expect(container.querySelector("code")?.textContent).toBe(content);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("pre")?.tabIndex).toBe(0);
    const copy = container.querySelector<HTMLButtonElement>(".hcc-evidence-report__copy")!;
    expect(copy.getAttribute("aria-label")).toBe("Copy complete host assurance");
    copy.click();
    await vi.waitFor(() => expect(copyText).toHaveBeenCalledWith(content));
    expect(copy.textContent).toBe("Copied");
    expect(container.querySelector("[role=status]")?.textContent).toContain("complete report");
  });

  it("keeps the report selectable when clipboard access is unavailable", () => {
    const container = document.createElement("div");
    renderEvidenceReport(container, { title: "Evidence", summary: "Inspect locally.", content: "selectable: true" });
    expect(container.querySelector<HTMLButtonElement>("button")?.disabled).toBe(true);
    expect(container.querySelector("code")?.textContent).toBe("selectable: true");
  });
});
