import { describe, expect, it } from "vitest";

import { HCC_AUTHORING_API } from "../src/api";
import { VALID_STUDIO_SOURCE } from "./fixtures/studio";
import { VALID_EXCHANGE_SOURCE } from "./fixtures/exchange";

describe("side-effect-free HCC authoring API", () => {
  it("publishes pinned contract and exhaustive catalog identities", () => {
    expect(HCC_AUTHORING_API).toMatchObject({
      apiVersion: "0.1-candidate.1",
      lifecycle: "candidate",
      authority: "validation-and-description-only",
      contracts: {
        releasedInteraction: "0.1",
        candidateInteraction: "0.3-candidate.1",
        worksheet: "0.1-candidate.1",
        workbook: "0.1-candidate.1",
        view: "0.2-candidate.1",
        studio: "0.1-candidate.1",
        exchange: "0.1-candidate.1",
        compatibility: "0.1-candidate.1"
      },
      effects: {
        filesystemWrite: false,
        vaultMutation: false,
        network: false,
        submission: false,
        canonicalApply: false
      }
    });
    expect(HCC_AUTHORING_API.catalogs.candidateInputKinds).toHaveLength(32);
    expect(HCC_AUTHORING_API.catalogs.viewKinds).toHaveLength(24);
    expect(HCC_AUTHORING_API.catalogs.inputFamilies).toHaveLength(6);
    expect(HCC_AUTHORING_API.catalogs.viewFamilies).toHaveLength(8);
  });

  it("validates interaction, worksheet, workbook, and view sources without effects", () => {
    expect(HCC_AUTHORING_API.parseCandidateInteraction(`
version: 0.3-candidate.1
id: api-proof
kind: boolean
prompt: Is the candidate ready for review?
config: { true_label: Ready, false_label: Not ready }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
`).ok).toBe(true);
    expect(HCC_AUTHORING_API.parseWorksheet(`
version: 0.1-candidate.1
id: api-worksheet
title: API worksheet
purpose: Prove the public parser seam.
privacy: private
sections: [{ id: review, title: Review, interactions: [api-proof] }]
completion: { required: [api-proof] }
governance: { authority_refs: [], review_required: true, verification_required: false }
`).ok).toBe(true);
    expect(HCC_AUTHORING_API.parseWorkbook(`
version: 0.1-candidate.1
id: api-workbook
title: API workbook
purpose: Prove the workbook parser seam.
worksheets: [{ id: review, label: Review, ref: Worksheets/API Review }]
navigation: sequential
governance: { authority_refs: [], review_required: true }
`).ok).toBe(true);
    expect(HCC_AUTHORING_API.parseView(`
version: 0.2-candidate.1
id: api-metric
kind: metric
title: API metric
summary: One deterministic value.
source: { mode: inline, digest: fixture:api-metric }
encoding: { kind: metric, value: value, label: label }
data: [{ value: 8, label: Ready }]
`).ok).toBe(true);
    expect(HCC_AUTHORING_API.parseStudio(VALID_STUDIO_SOURCE).ok).toBe(true);
    expect(HCC_AUTHORING_API.parseExchange(VALID_EXCHANGE_SOURCE).ok).toBe(true);
    expect(HCC_AUTHORING_API.validateExchangeImport(VALID_STUDIO_SOURCE).ok).toBe(true);
    expect(HCC_AUTHORING_API.buildCompatibilityMatrix({
      pluginVersion: "0.0.27", minimumAppVersion: "1.12.0",
      observation: { appVersion: "1.13.4", platform: "desktop", minimumApiSatisfied: true, runtimePassed: 8, runtimeTotal: 8 }
    }, "2026-08-11T22:00:00.000Z").summary["observed-pass"]).toBe(1);
  });

  it("fails unknown contracts visibly", () => {
    const result = HCC_AUTHORING_API.parseView("version: unknown");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it("runs an eight-case, power-of-two local self-test with no effects", () => {
    const report = HCC_AUTHORING_API.runSelfTest();
    expect(report).toMatchObject({ total: 8, passed: 8, failed: 0 });
    expect(report.cases).toHaveLength(8);
    expect(new Set(report.cases.map((testCase) => testCase.contract))).toEqual(new Set(["candidate-interaction", "worksheet", "workbook", "view"]));
    expect(report.effects).toEqual({ filesystemWrite: false, vaultMutation: false, network: false, submission: false, canonicalApply: false });
  });
});
