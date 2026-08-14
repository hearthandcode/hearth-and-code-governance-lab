export interface AuthoringApiSelfTestCase {
  readonly id: string;
  readonly contract: "candidate-interaction" | "worksheet" | "workbook" | "view";
  readonly expectation: "accept" | "reject";
  readonly passed: boolean;
}

export interface AuthoringApiSelfTestReport {
  readonly recordType: "hcc-authoring-api-self-test-receipt";
  readonly apiVersion: "0.1-candidate.1";
  readonly authority: "bounded-local-test-evidence";
  readonly total: 8;
  readonly passed: number;
  readonly failed: number;
  readonly cases: readonly AuthoringApiSelfTestCase[];
  readonly effects: {
    readonly filesystemWrite: false;
    readonly vaultMutation: false;
    readonly network: false;
    readonly submission: false;
    readonly canonicalApply: false;
  };
}

export interface AuthoringApiSelfTestParsers {
  parseCandidateInteraction(source: string): { ok: boolean };
  parseWorksheet(source: string): { ok: boolean };
  parseWorkbook(source: string): { ok: boolean };
  parseView(source: string): { ok: boolean };
}

const CASES = [
  { id: "interaction-valid", contract: "candidate-interaction", expectation: "accept", source: `
version: 0.3-candidate.1
id: api-self-test
kind: boolean
prompt: Is the local API available?
config: { true_label: Available, false_label: Unavailable }
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
visibility: private
` },
  { id: "interaction-unknown-kind", contract: "candidate-interaction", expectation: "reject", source: `
version: 0.3-candidate.1
id: api-self-test-invalid
kind: executable_script
prompt: This kind must remain unknown.
config: {}
response: { value: null, note: null, state: unanswered, author: null, responded_at: null }
` },
  { id: "worksheet-valid", contract: "worksheet", expectation: "accept", source: `
version: 0.1-candidate.1
id: api-self-test-worksheet
title: API self-test worksheet
purpose: Exercise the pure worksheet parser.
privacy: private
sections: [{ id: test, title: Test, interactions: [api-self-test] }]
completion: { required: [api-self-test] }
governance: { authority_refs: [], review_required: true, verification_required: false }
` },
  { id: "worksheet-unsafe-reference", contract: "worksheet", expectation: "reject", source: `
version: 0.1-candidate.1
id: api-self-test-worksheet-invalid
title: Invalid worksheet
purpose: Exercise traversal rejection.
privacy: private
sections: [{ id: test, title: Test, interactions: [api-self-test] }]
completion: { required: [api-self-test] }
workbook_ref: ../outside
governance: { authority_refs: [], review_required: true, verification_required: false }
` },
  { id: "workbook-valid", contract: "workbook", expectation: "accept", source: `
version: 0.1-candidate.1
id: api-self-test-workbook
title: API self-test workbook
purpose: Exercise the pure workbook parser.
worksheets: [{ id: test, label: Test, ref: Worksheets/API Self Test }]
navigation: sequential
governance: { authority_refs: [], review_required: true }
` },
  { id: "workbook-unknown-field", contract: "workbook", expectation: "reject", source: `
version: 0.1-candidate.1
id: api-self-test-workbook-invalid
title: Invalid workbook
purpose: Exercise unknown-field rejection.
worksheets: [{ id: test, label: Test, ref: Worksheets/API Self Test }]
navigation: sequential
execute: now
governance: { authority_refs: [], review_required: true }
` },
  { id: "view-valid", contract: "view", expectation: "accept", source: `
version: 0.2-candidate.1
id: api-self-test-view
kind: metric
title: API self-test result
summary: One deterministic scalar.
source: { mode: inline, digest: fixture:api-self-test }
encoding: { kind: metric, value: value, label: label }
data: [{ value: 8, label: cases }]
` },
  { id: "view-unknown-version", contract: "view", expectation: "reject", source: "version: unknown" }
] as const;

export function runAuthoringApiSelfTest(parsers: AuthoringApiSelfTestParsers): AuthoringApiSelfTestReport {
  const cases = CASES.map((testCase): AuthoringApiSelfTestCase => {
    const result = testCase.contract === "candidate-interaction" ? parsers.parseCandidateInteraction(testCase.source)
      : testCase.contract === "worksheet" ? parsers.parseWorksheet(testCase.source)
      : testCase.contract === "workbook" ? parsers.parseWorkbook(testCase.source)
      : parsers.parseView(testCase.source);
    return Object.freeze({
      id: testCase.id,
      contract: testCase.contract,
      expectation: testCase.expectation,
      passed: result.ok === (testCase.expectation === "accept")
    });
  });
  const passed = cases.filter((testCase) => testCase.passed).length;
  return Object.freeze({
    recordType: "hcc-authoring-api-self-test-receipt",
    apiVersion: "0.1-candidate.1",
    authority: "bounded-local-test-evidence",
    total: 8,
    passed,
    failed: 8 - passed,
    cases: Object.freeze(cases),
    effects: Object.freeze({ filesystemWrite: false, vaultMutation: false, network: false, submission: false, canonicalApply: false })
  });
}
