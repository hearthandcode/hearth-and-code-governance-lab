// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";

import type { CandidateInputKind, CandidateInteraction } from "../src/grammar";
import { renderCandidateInteraction } from "../src/render-candidate";

beforeEach(() => document.body.replaceChildren());

function render(kind: CandidateInputKind, config: Record<string, unknown>): HTMLElement {
  const container = document.createElement("div"); document.body.append(container);
  const block = {
    version: "0.3-candidate.1", id: `dom-${kind}`, kind, prompt: `Capture ${kind}`, config,
    response: { value: null, note: null, state: "unanswered", author: null, responded_at: null }
  } as CandidateInteraction;
  renderCandidateInteraction(container, block, "version: 0.3-candidate.1");
  return container;
}

describe("fourth-tranche input DOM", () => {
  it("renders bounded long text", () => {
    const root = render("long_text", { rows: 8, max_length: 4000 });
    expect(Number(root.querySelector<HTMLTextAreaElement>("textarea")?.rows)).toBe(8);
    expect(Number(root.querySelector<HTMLTextAreaElement>("textarea")?.maxLength)).toBe(4000);
  });

  it("renders a visible single-choice radio group without checkboxes", () => {
    const root = render("radio_group", { options: [{ id: "keep", label: "Keep" }, { id: "revise", label: "Revise" }], orientation: "horizontal" });
    expect(root.querySelectorAll('input[type="radio"]')).toHaveLength(2);
    expect(root.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it("renders discrete rating buttons with selected-state semantics", () => {
    const root = render("rating", { min: 1, max: 5, step: 1, min_label: "Weak", max_label: "Strong" });
    const four = root.querySelector<HTMLButtonElement>('[aria-label="Rate 4 of 5"]');
    four?.click();
    expect(four?.getAttribute("aria-pressed")).toBe("true");
    expect(root.querySelector(".hcc-widget__status")?.textContent).toContain("rating changed to 4");
  });

  it("renders ordered date and time range pairs", () => {
    const dates = render("date_range", { min: "2026-01-01", max: "2027-12-31" });
    const times = render("time_range", { min: "08:00", max: "18:00", step_minutes: 15 });
    expect(dates.querySelectorAll('input[type="date"]')).toHaveLength(2);
    expect(times.querySelectorAll('input[type="time"]')).toHaveLength(2);
    expect(times.querySelector<HTMLInputElement>('input[type="time"]')?.step).toBe("900");
  });

  it("renders a measured value with an explicit unit selector", () => {
    const root = render("unit_value", { units: [{ id: "minutes", label: "Minutes" }, { id: "hours", label: "Hours" }], min: 0, max: 100, step: 0.5 });
    expect(root.querySelector('input[type="number"]')).not.toBeNull();
    expect(root.querySelectorAll("select option")).toHaveLength(3);
  });

  it("adds a bounded key-value row with named removal", () => {
    const root = render("key_value_list", { key_label: "Term", value_label: "Definition", max_items: 4, max_length: 80 });
    const add = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((item) => item.textContent === "Add entry");
    add?.click();
    expect(root.querySelectorAll(".hcc-widget__key-value-list fieldset")).toHaveLength(1);
    expect(Array.from(root.querySelectorAll("button")).some((item) => item.textContent === "Remove entry 1")).toBe(true);
  });

  it("renders manual coordinates without requesting device location", () => {
    const root = render("coordinates", { precision: 4 });
    expect(root.querySelectorAll('input[type="number"]')).toHaveLength(2);
    expect(root.textContent).toContain("does not request or infer device location");
  });
});
