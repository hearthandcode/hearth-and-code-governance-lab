// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CandidateInteraction } from "../src/grammar";
import { reorderRankedIdsAtEdge } from "../src/grammar";
import { renderCandidateInteraction } from "../src/render-candidate";
import { numericStepper } from "../src/ui";

beforeEach(() => document.body.replaceChildren());

function rankedBlock(): Extract<CandidateInteraction, { kind: "ranked_choice" }> {
  return {
    version: "0.3-candidate.1",
    id: "dom-ranking",
    kind: "ranked_choice",
    prompt: "Put the directions in order",
    config: { options: [
      { id: "alpha", label: "Alpha" },
      { id: "beta", label: "Beta" },
      { id: "gamma", label: "Gamma" }
    ] },
    response: { value: null, note: null, state: "unanswered", author: null, responded_at: null },
    visibility: "private"
  };
}

function click(root: ParentNode, label: string): void {
  const control = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((item) => item.textContent === label);
  expect(control, `button ${label}`).toBeDefined();
  control?.click();
}

describe("candidate interaction DOM", () => {
  it("renders ranking as a complete reorder-only list with no checkboxes", () => {
    const container = document.createElement("div");
    document.body.append(container);
    renderCandidateInteraction(container, rankedBlock(), "version: 0.3-candidate.1");

    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(container.querySelectorAll("ol.hcc-widget__ranking > li")).toHaveLength(3);
    expect(Array.from(container.querySelectorAll("ol > li")).map((item) => item.firstChild?.textContent)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(container.querySelector("ol > li")?.getAttribute("aria-label")).toBe("Alpha, rank 1 of 3");
    expect(Array.from(container.querySelectorAll("button")).some((item) => item.textContent === "Use shown order")).toBe(true);
  });

  it("supports keyboard-button reordering and records the full shown order in the review proposal", () => {
    const container = document.createElement("div");
    document.body.append(container);
    renderCandidateInteraction(container, rankedBlock(), "version: 0.3-candidate.1");

    const firstRow = container.querySelector("ol > li");
    click(firstRow ?? container, "Move down");
    expect(Array.from(container.querySelectorAll("ol > li")).map((item) => item.firstChild?.textContent)).toEqual(["Beta", "Alpha", "Gamma"]);
    click(container, "Use shown order");
    click(container, "Review candidate response");
    const proposal = Array.from(container.querySelectorAll("code")).map((item) => item.textContent ?? "").find((text) => text.includes("record_type: hcc-response-candidate"));
    expect(proposal).toContain("- beta\n    - alpha\n    - gamma");
    expect(proposal).toContain("state: answered");
  });

  it("previews pointer-relative ranking insertion without adding selection controls", () => {
    expect(reorderRankedIdsAtEdge(["alpha", "beta", "gamma"], "gamma", "alpha", "before")).toEqual(["gamma", "alpha", "beta"]);
    expect(reorderRankedIdsAtEdge(["alpha", "beta", "gamma"], "alpha", "gamma", "after")).toEqual(["beta", "gamma", "alpha"]);
    expect(reorderRankedIdsAtEdge(["alpha", "beta", "gamma"], "missing", "gamma", "after")).toEqual(["alpha", "beta", "gamma"]);

    const container = document.createElement("div"); document.body.append(container);
    renderCandidateInteraction(container, rankedBlock(), "version: 0.3-candidate.1");
    const target = container.querySelectorAll<HTMLElement>("ol > li")[1]!;
    target.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 200, bottom: 100, width: 200, height: 100, toJSON: () => ({}) });
    const dragover = new DragEvent("dragover", { bubbles: true, cancelable: true });
    Object.defineProperty(dragover, "clientY", { value: 10 });
    target.dispatchEvent(dragover);
    expect(target.dataset.insertionEdge).toBe("before");
    expect(container.querySelector(".hcc-widget__ranking-status")?.textContent).toContain("before Beta");
    target.dispatchEvent(new DragEvent("dragleave", { bubbles: true }));
    expect(target.dataset.insertionEdge).toBeUndefined();
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it("keeps multi-select checkboxes scoped to the multi-select control", () => {
    const block: Extract<CandidateInteraction, { kind: "multi_select" }> = {
      version: "0.3-candidate.1", id: "dom-multi", kind: "multi_select", prompt: "Choose signals",
      config: { options: [{ id: "one", label: "One" }, { id: "two", label: "Two" }] },
      response: { value: null, note: null, state: "unanswered", author: null, responded_at: null }
    };
    const container = document.createElement("div");
    document.body.append(container);
    renderCandidateInteraction(container, block, "version: 0.3-candidate.1");
    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('.hcc-widget__multi-select input[type="checkbox"]'));
    expect(inputs).toHaveLength(2);
    inputs[1]!.checked = true;
    inputs[1]!.dispatchEvent(new Event("change", { bubbles: true }));
    expect(container.querySelector(".hcc-widget__multi-select summary")?.textContent).toBe("1 selected: Two");
    expect(container.querySelector(".hcc-widget__status")?.textContent).toContain("source file is unchanged");
  });

  it("adds and removes plain-text tags without leaving the session surface", () => {
    const block: Extract<CandidateInteraction, { kind: "tags" }> = {
      version: "0.3-candidate.1", id: "dom-tags", kind: "tags", prompt: "Tag the finding",
      config: { max_items: 3, max_length: 20 },
      response: { value: null, note: null, state: "unanswered", author: null, responded_at: null }
    };
    const container = document.createElement("div"); document.body.append(container);
    renderCandidateInteraction(container, block, "version: 0.3-candidate.1");
    const input = container.querySelector<HTMLInputElement>("#dom-tags-tag-input");
    expect(input).not.toBeNull();
    if (!input) return;
    input.value = "governed";
    click(container, "Add tag");
    expect(container.querySelector(".hcc-widget__tag-item")?.firstChild?.textContent).toBe("governed");
    expect(document.activeElement).toBe(input);
    click(container, "Remove governed");
    expect(container.querySelectorAll(".hcc-widget__tag-item")).toHaveLength(0);
  });

  it("retains an independent single-choice answer for every matrix row", () => {
    const block: Extract<CandidateInteraction, { kind: "matrix" }> = {
      version: "0.3-candidate.1", id: "dom-matrix", kind: "matrix", prompt: "Disposition",
      config: {
        rows: [{ id: "governance", label: "Governance" }, { id: "accessibility", label: "Accessibility" }],
        columns: [{ id: "keep", label: "Keep" }, { id: "revise", label: "Revise" }],
        selection: "one", require_all_rows: true
      },
      response: { value: null, note: null, state: "unanswered", author: null, responded_at: null }
    };
    const container = document.createElement("div"); document.body.append(container);
    renderCandidateInteraction(container, block, "version: 0.3-candidate.1");
    expect(container.querySelector("caption")?.textContent).toBe("Disposition");
    expect(container.querySelector('th[scope="row"]')?.textContent).toContain("Governance");
    const revise = container.querySelector<HTMLInputElement>('[aria-label="Governance: Revise"]');
    revise?.click();
    expect(revise?.checked).toBe(true);
    const keepAccessibility = container.querySelector<HTMLInputElement>('[aria-label="Accessibility: Keep"]');
    keepAccessibility?.click();
    expect(keepAccessibility?.checked).toBe(true);
    expect(revise?.checked).toBe(true);
    expect(revise?.name).not.toBe(keepAccessibility?.name);
    expect(revise?.closest("td")?.dataset.selected).toBe("true");
    expect(revise?.closest("label")?.textContent).toContain("Selected");
    expect(container.querySelectorAll(".hcc-widget__matrix-row-status")[0]?.textContent).toBe("Selected: Revise");
    expect(container.querySelectorAll(".hcc-widget__matrix-row-status")[1]?.textContent).toBe("Selected: Keep");
    expect(container.querySelector(".hcc-widget__status")?.textContent).toContain("matrix response changed");
    click(container, "Review candidate response");
    const proposal = container.querySelector(".hcc-widget__review-region")?.textContent ?? "";
    expect(proposal).toContain("governance: revise");
    expect(proposal).toContain("accessibility: keep");
  });

  it("adds a repeatable item with a real numeric stepper", () => {
    const block: Extract<CandidateInteraction, { kind: "repeatable_group" }> = {
      version: "0.3-candidate.1", id: "dom-repeatable", kind: "repeatable_group", prompt: "Record findings",
      config: { fields: [{ id: "severity", label: "Severity", kind: "number", required: true, min: 1, max: 5, step: 1 }], max_items: 2 },
      response: { value: null, note: null, state: "unanswered", author: null, responded_at: null }
    };
    const container = document.createElement("div"); document.body.append(container);
    renderCandidateInteraction(container, block, "version: 0.3-candidate.1");
    click(container, "Add item");
    const number = container.querySelector<HTMLInputElement>('#dom-repeatable-0-severity[type="number"]');
    expect(number?.min).toBe("1");
    expect(number?.max).toBe("5");
    const item = container.querySelector(".hcc-widget__repeatable fieldset");
    click(item ?? container, "+");
    expect(number?.value).toBe("1");
    expect(container.querySelector(".hcc-widget__status")?.textContent).toContain("repeatable item changed");
  });

  it("renders a labeled numeric stepper and blocks exponent entry", () => {
    const changed = vi.fn<(value: number | null) => void>();
    const wrapper = numericStepper("severity", 5, { min: 0, max: 10, step: 1 }, changed);
    document.body.append(wrapper);
    const input = document.querySelector<HTMLInputElement>("#severity");
    expect(input?.type).toBe("number");
    expect(document.querySelector('[aria-label="Decrement value"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Increment value"]')).not.toBeNull();

    const exponent = new KeyboardEvent("keydown", { key: "e", bubbles: true, cancelable: true });
    input?.dispatchEvent(exponent);
    expect(exponent.defaultPrevented).toBe(true);

    click(document, "+");
    expect(input?.value).toBe("6");
    expect(changed).toHaveBeenLastCalledWith(6);
    expect(document.activeElement).toBe(input);
  });
});
