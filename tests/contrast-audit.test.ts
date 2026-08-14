import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { auditEmberContrast, contrastRatio, EMBER_CONTRAST_REQUIREMENTS, extractEmberTokens } from "../src/accessibility";

const css = readFileSync(resolve(import.meta.dirname, "../styles.css"), "utf8");

describe("Ember Circuit contrast contract", () => {
  it("passes the closed sixteen-pair text, control, and focus contract", () => {
    const report = auditEmberContrast(css);
    expect(EMBER_CONTRAST_REQUIREMENTS).toHaveLength(16);
    expect(report).toMatchObject({ record_type: "hcc-ember-contrast-audit", contract_version: "0.1-candidate.1", passed: 16, failed: 0, wcag_conformance_claim: false });
    expect(report.requirements).toHaveLength(16);
  });

  it("keeps operational link and control boundaries above their thresholds", () => {
    const report = auditEmberContrast(css);
    expect(report.requirements.find((item) => item.id === "link-base")?.ratio).toBeGreaterThanOrEqual(4.5);
    expect(report.requirements.find((item) => item.id === "control-raised")?.ratio).toBeGreaterThanOrEqual(3);
    expect(report.requirements.find((item) => item.id === "focus-base")?.ratio).toBeGreaterThanOrEqual(3);
  });

  it("detects the earlier inaccessible link and border colors", () => {
    const historical = css.replace("--hcc-link: #6f968f", "--hcc-link: #5e7e78").replace("--hcc-border-strong: #8f6b52", "--hcc-border-strong: #5c4332");
    const report = auditEmberContrast(historical);
    expect(report.requirements.filter((item) => !item.passed).map((item) => item.id)).toEqual(["link-base", "control-inset", "control-raised"]);
  });

  it("uses the WCAG relative-luminance formula and rejects ambiguous colors", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.478, 3);
    expect(() => contrastRatio("#fff", "#000000")).toThrow("HCC-CONTRAST-COLOR");
    expect(extractEmberTokens(css)).toMatchObject({ link: "#6f968f", "border-strong": "#8f6b52", focus: "#3fe0d0" });
  });
});
