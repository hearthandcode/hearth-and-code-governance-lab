import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

import {
  CANDIDATE_INPUT_KINDS,
  CANDIDATE_RENDERER_CATALOG,
  FUTURE_INPUT_PROPOSALS,
  futureInputsDoNotOverlap,
  getCandidateRenderer,
  identifyCandidateFamily,
  parseCandidateInteraction,
  type CandidateInputKind
} from "../src/grammar/index";

const cases: Record<CandidateInputKind, { config: Record<string, unknown>; value: unknown }> = {
  short_text: { config: { placeholder: "One line", min_length: 1, max_length: 80 }, value: "A response" },
  number: { config: { min: 0, max: 10, step: 0.5, unit: "hours" }, value: 2.5 },
  boolean: { config: { true_label: "Yes", false_label: "No" }, value: true },
  date: { config: { min: "2026-01-01", max: "2026-12-31" }, value: "2026-08-10" },
  scale: {
    config: { min: 1, max: 5, step: 1, labels: [{ id: "1", label: "Low" }, { id: "5", label: "High" }] },
    value: 4
  },
  ranked_choice: {
    config: { options: [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }] },
    value: ["b", "a"]
  },
  matrix: {
    config: {
      rows: [{ id: "clarity", label: "Clarity" }],
      columns: [{ id: "low", label: "Low" }, { id: "high", label: "High" }],
      selection: "one"
    },
    value: { clarity: "high" }
  },
  repeatable_group: {
    config: {
      fields: [
        { id: "name", label: "Name", kind: "short_text", required: true },
        { id: "active", label: "Active", kind: "boolean" }
      ],
      min_items: 1,
      max_items: 3
    },
    value: [{ name: "First", active: false }]
  },
  dropdown: { config: { options: [{ id: "alpha", label: "Alpha" }, { id: "beta", label: "Beta" }], placeholder: "Choose" }, value: "beta" },
  multi_select: { config: { options: [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }], min_selections: 1, max_selections: 2 }, value: ["a", "b"] },
  time: { config: { min: "08:00", max: "18:00", step_minutes: 15 }, value: "09:30" },
  datetime: { config: { min: "2026-01-01T08:00", max: "2026-12-31T18:00" }, value: "2026-08-10T09:30" },
  duration: { config: { min_minutes: 15, max_minutes: 240, step_minutes: 15, display_unit: "minutes" }, value: 45 },
  currency: { config: { currency: "USD", min: 0, max: 1000, step: 0.01 }, value: 12.5 },
  email: { config: { placeholder: "name@example.org", allow_multiple: false }, value: "reviewer@example.org" },
  url: { config: { placeholder: "https://example.org", allowed_schemes: ["https"] }, value: "https://example.org/intake" },
  month: { config: { min: "2026-01", max: "2027-12" }, value: "2026-08" },
  week: { config: { min: "2026-W01", max: "2027-W52" }, value: "2026-W33" },
  percentage: { config: { min: 0, max: 100, step: 5 }, value: 75 },
  color: { config: { format: "hex" }, value: "#6750a4" },
  phone: { config: { placeholder: "+1 555 0100", min_length: 7, max_length: 24 }, value: "+1 555 0100" },
  tags: { config: { suggestions: [{ id: "review", label: "Review" }], min_items: 1, max_items: 4, max_length: 24 }, value: ["review", "candidate"] },
  numeric_range: { config: { min: 0, max: 100, step: 5, unit: "points" }, value: { lower: 25, upper: 75 } },
  file_reference: { config: { extensions: [".md", ".yaml"], allow_missing: true }, value: "Reference Notes/01 Protocol Source.md" },
  long_text: { config: { placeholder: "Explain", min_length: 1, max_length: 4000, rows: 8 }, value: "A governed multiline response." },
  radio_group: { config: { options: [{ id: "keep", label: "Keep" }, { id: "revise", label: "Revise" }], orientation: "horizontal" }, value: "revise" },
  rating: { config: { min: 1, max: 5, step: 1, min_label: "Weak", max_label: "Strong" }, value: 4 },
  date_range: { config: { min: "2026-01-01", max: "2027-12-31" }, value: { start: "2026-08-10", end: "2026-08-14" } },
  time_range: { config: { min: "08:00", max: "18:00", step_minutes: 15 }, value: { start: "09:00", end: "10:30" } },
  unit_value: { config: { units: [{ id: "minutes", label: "Minutes" }, { id: "hours", label: "Hours" }], min: 0, max: 100, step: 0.5 }, value: { value: 2.5, unit: "hours" } },
  key_value_list: { config: { key_label: "Term", value_label: "Definition", min_items: 1, max_items: 4, max_length: 80 }, value: [{ key: "source", value: "Canonical authority" }] },
  coordinates: { config: { precision: 4, latitude_label: "Latitude", longitude_label: "Longitude" }, value: { latitude: 40.7128, longitude: -74.006 } }
};

function source(kind: CandidateInputKind, overrides: Record<string, unknown> = {}): string {
  return yaml.dump({
    version: "0.3-candidate.1",
    id: `candidate-${kind}`,
    kind,
    prompt: `Capture ${kind}`,
    config: cases[kind].config,
    response: {
      value: cases[kind].value,
      note: null,
      state: "answered",
      author: null,
      responded_at: null
    },
    visibility: "private",
    source_refs: ["[[Candidate source]]"],
    ...overrides
  }, { noRefs: true, sortKeys: false });
}

describe("candidate grammar family integration API", () => {
  it("identifies interaction, form, and view without claiming admission", () => {
    expect(identifyCandidateFamily("hcc-interaction")).toMatchObject({ ok: true, support: "parse-and-validate", authority: "candidate-only" });
    expect(identifyCandidateFamily("hcc-form")).toMatchObject({ ok: true, support: "identified-only", authority: "candidate-only" });
    expect(identifyCandidateFamily("hcc-view")).toMatchObject({ ok: true, support: "identified-only", authority: "candidate-only" });
  });

  it("fails visibly for unknown families and identified-only parsers", () => {
    expect(identifyCandidateFamily("javascript")).toMatchObject({ ok: false, family: null });
    const result = parseCandidateInteraction("id: no", "hcc-form");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.family).toBe("hcc-form");
    expect(result.diagnostics[0]?.code).toBe("HCC-GRAMMAR-FAMILY-001");
  });
});

describe("thirty-two proposed interaction kinds", () => {
  for (const kind of CANDIDATE_INPUT_KINDS) {
    it(`strictly parses ${kind}`, () => {
      const first = parseCandidateInteraction(source(kind));
      const second = parseCandidateInteraction(source(kind));
      expect(first).toEqual(second);
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.block.kind).toBe(kind);
      expect(first.block.version).toBe("0.3-candidate.1");
    });
  }

  it("rejects unknown top-level, nested, and executable-expression-shaped fields", () => {
    const top = parseCandidateInteraction(source("short_text", { html: "<button>Run</button>" }));
    expect(top.ok).toBe(false);
    if (!top.ok) expect(top.diagnostics.map((item) => item.path)).toContain("$.html");

    const nested = parseCandidateInteraction(source("short_text", { config: { placeholder: "Text", expression: "vault.delete()" } }));
    expect(nested.ok).toBe(false);
    if (!nested.ok) expect(nested.diagnostics.map((item) => item.path)).toContain("$.config.expression");
  });

  it("rejects unknown versions, kinds, invalid dates, and hidden deferred values", () => {
    const version = parseCandidateInteraction(source("date").replace("0.3-candidate.1", "9.0"));
    expect(version.ok).toBe(false);
    if (!version.ok) expect(version.diagnostics.map((item) => item.code)).toContain("HCC-GRAMMAR-VERSION-001");

    const kind = parseCandidateInteraction(source("short_text").replace("kind: short_text", "kind: script"));
    expect(kind.ok).toBe(false);
    if (!kind.ok) expect(kind.diagnostics.map((item) => item.code)).toContain("HCC-GRAMMAR-KIND-001");

    const invalidDate = parseCandidateInteraction(source("date").replace("2026-08-10", "2026-02-31"));
    expect(invalidDate.ok).toBe(false);

    const deferred = parseCandidateInteraction(source("boolean").replace("state: answered", "state: deferred"));
    expect(deferred.ok).toBe(false);
    if (!deferred.ok) expect(deferred.diagnostics.some((item) => item.message.includes("hidden value"))).toBe(true);
  });

  it("rejects duplicate ranking values and undeclared matrix/repeatable keys", () => {
    const ranked = parseCandidateInteraction(source("ranked_choice").replace("    - b\n    - a", "    - a\n    - a"));
    expect(ranked.ok).toBe(false);

    const matrix = parseCandidateInteraction(source("matrix").replace("clarity: high", "unknown: high"));
    expect(matrix.ok).toBe(false);
    if (!matrix.ok) expect(matrix.diagnostics.some((item) => item.message.includes("Unknown matrix row"))).toBe(true);

    const repeatable = parseCandidateInteraction(source("repeatable_group").replace("active: false", "extra: false"));
    expect(repeatable.ok).toBe(false);
    if (!repeatable.ok) expect(repeatable.diagnostics.some((item) => item.message.includes("Unknown repeatable field"))).toBe(true);
  });

  it("can require a response for every declared matrix row", () => {
    const required = source("matrix")
      .replace("selection: one", "selection: one\n  require_all_rows: true")
      .replace("rows:\n    - id: clarity\n      label: Clarity", "rows:\n    - id: clarity\n      label: Clarity\n    - id: trust\n      label: Trust");
    const result = parseCandidateInteraction(required);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics.some((item) => item.path === "$.response.value.trust")).toBe(true);
  });

  it("enforces text length, date bounds, and complete rankings", () => {
    const short = parseCandidateInteraction(source("short_text").replace("min_length: 1", "min_length: 20"));
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.diagnostics.some((item) => item.message.includes("min_length"))).toBe(true);

    const date = parseCandidateInteraction(source("date").replace("2026-08-10", "2027-01-01"));
    expect(date.ok).toBe(false);
    if (!date.ok) expect(date.diagnostics.some((item) => item.message.includes("after max"))).toBe(true);

    const tooFew = parseCandidateInteraction(source("ranked_choice").replace("    - b\n    - a", "    - b"));
    expect(tooFew.ok).toBe(false);
    if (!tooFew.ok) expect(tooFew.diagnostics.some((item) => item.message.includes("every declared option"))).toBe(true);
  });

  it("caps repeatable item cardinality before rendering", () => {
    const result = parseCandidateInteraction(source("repeatable_group").replace("max_items: 3", "max_items: 17"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics.some((item) => item.message.includes("capped at 16"))).toBe(true);
  });

  it("validates the expanded constrained value families", () => {
    expect(parseCandidateInteraction(source("dropdown").replace("value: beta", "value: missing")).ok).toBe(false);
    expect(parseCandidateInteraction(source("time").replace("09:30", "29:30")).ok).toBe(false);
    expect(parseCandidateInteraction(source("datetime").replace("2026-08-10T09:30", "2026-02-31T09:30")).ok).toBe(false);
    expect(parseCandidateInteraction(source("duration").replace("value: 45", "value: 46")).ok).toBe(false);
    expect(parseCandidateInteraction(source("currency").replace("currency: USD", "currency: usd")).ok).toBe(false);
    expect(parseCandidateInteraction(source("email").replace("reviewer@example.org", "not-an-email")).ok).toBe(false);
    expect(parseCandidateInteraction(source("url").replace("https://example.org/intake", "file:///tmp/intake")).ok).toBe(false);
  });

  it("validates the third input tranche without pretending to resolve files", () => {
    expect(parseCandidateInteraction(source("month").replace("2026-08", "2026-19")).ok).toBe(false);
    expect(parseCandidateInteraction(source("percentage").replace("value: 75", "value: 101")).ok).toBe(false);
    expect(parseCandidateInteraction(source("color").replace("#6750a4", "not-a-color")).ok).toBe(false);
    expect(parseCandidateInteraction(source("numeric_range").replace("lower: 25", "lower: 80")).ok).toBe(false);
    expect(parseCandidateInteraction(source("file_reference").replace("Reference Notes/01 Protocol Source.md", "../outside.md")).ok).toBe(false);
    expect(parseCandidateInteraction(source("file_reference").replace("allow_missing: true", "allow_missing: false")).ok).toBe(false);
  });

  it("validates the fourth input tranche and its structured boundaries", () => {
    expect(parseCandidateInteraction(source("long_text").replace("max_length: 4000", "max_length: 4")).ok).toBe(false);
    expect(parseCandidateInteraction(source("radio_group").replace("value: revise", "value: missing")).ok).toBe(false);
    expect(parseCandidateInteraction(source("rating").replace("value: 4", "value: 9")).ok).toBe(false);
    expect(parseCandidateInteraction(source("date_range").replace("start: '2026-08-10'", "start: '2026-08-20'")).ok).toBe(false);
    expect(parseCandidateInteraction(source("unit_value").replace("unit: hours", "unit: days")).ok).toBe(false);
    expect(parseCandidateInteraction(source("coordinates").replace("latitude: 40.7128", "latitude: 140.7128")).ok).toBe(false);
  });
});

describe("candidate renderer catalog", () => {
  it("has one human-gated entry for every kind with accessibility, fallback, and migration posture", () => {
    expect(Object.keys(CANDIDATE_RENDERER_CATALOG).sort()).toEqual([...CANDIDATE_INPUT_KINDS].sort());
    for (const kind of CANDIDATE_INPUT_KINDS) {
      const entry = getCandidateRenderer(kind);
      expect(entry.kind).toBe(kind);
      expect(entry.rendererId).toMatch(/^hcc\.candidate\.input\./);
      expect(entry.contractVersions).toEqual(["0.3-candidate.1"]);
      expect(entry.lifecycle).toBe("candidate");
      expect(entry.reviewState).toBe("human-review-required");
      expect(entry.accessibility.length).toBeGreaterThanOrEqual(4);
      expect(entry.fallback.length).toBeGreaterThan(0);
      expect(entry.migration).toBe("no-automatic-migration-before-admission");
    }
  });

  it("keeps eight future inputs proposal-only and non-overlapping", () => {
    expect(FUTURE_INPUT_PROPOSALS).toHaveLength(8);
    expect(new Set(FUTURE_INPUT_PROPOSALS.map((item) => item.id)).size).toBe(8);
    expect(futureInputsDoNotOverlap()).toBe(true);
    FUTURE_INPUT_PROPOSALS.forEach((item) => {
      expect(item.gate).toBe("proposal-only");
      expect(item.prerequisite.length).toBeGreaterThan(0);
      expect(item.accessibleFallback.length).toBeGreaterThan(0);
    });
  });
});
