import yaml from "js-yaml";

import { buildCompatibilityMatrix, COMPATIBILITY_MATRIX_VERSION } from "../compatibility";
import { parseInteraction } from "../core/parse";
import { SUPPORTED_KINDS, SUPPORTED_VERSION } from "../core/types";
import { buildProviderNeutralPromptPacket, EXCHANGE_VERSION, parseExchangeContract, validateExchangeImport } from "../exchange";
import {
  CANDIDATE_INPUT_KINDS,
  CANDIDATE_INTERACTION_VERSION,
  CANDIDATE_RENDERER_CATALOG,
  INPUT_FAMILIES,
  parseCandidateInteraction
} from "../grammar";
import { HCC_VIEW_KINDS, HCC_VIEW_VERSION, validateHccViewCandidate, VIEW_FAMILIES } from "../visualization";
import { parseWorkbook, parseWorksheet, WORKBOOK_VERSION, WORKSHEET_VERSION } from "../workbook";
import { parseStudioContract, STUDIO_VERSION } from "../studio";
import type { ViewValidationResult } from "../visualization";
import { runAuthoringApiSelfTest, type AuthoringApiSelfTestReport } from "./self-test";

export const HCC_AUTHORING_API_VERSION = "0.1-candidate.1" as const;

export interface HccAuthoringApi {
  readonly apiVersion: typeof HCC_AUTHORING_API_VERSION;
  readonly lifecycle: "candidate";
  readonly authority: "validation-and-description-only";
  readonly effects: {
    readonly filesystemWrite: false;
    readonly vaultMutation: false;
    readonly network: false;
    readonly submission: false;
    readonly canonicalApply: false;
  };
  readonly contracts: {
    readonly releasedInteraction: typeof SUPPORTED_VERSION;
    readonly candidateInteraction: typeof CANDIDATE_INTERACTION_VERSION;
    readonly worksheet: typeof WORKSHEET_VERSION;
    readonly workbook: typeof WORKBOOK_VERSION;
    readonly view: typeof HCC_VIEW_VERSION;
    readonly studio: typeof STUDIO_VERSION;
    readonly exchange: typeof EXCHANGE_VERSION;
    readonly compatibility: typeof COMPATIBILITY_MATRIX_VERSION;
  };
  readonly catalogs: {
    readonly releasedInteractionKinds: readonly string[];
    readonly candidateInputKinds: readonly string[];
    readonly viewKinds: readonly string[];
    readonly inputFamilies: typeof INPUT_FAMILIES;
    readonly viewFamilies: typeof VIEW_FAMILIES;
    readonly rendererCatalog: typeof CANDIDATE_RENDERER_CATALOG;
  };
  readonly parseReleasedInteraction: typeof parseInteraction;
  readonly parseCandidateInteraction: typeof parseCandidateInteraction;
  readonly parseWorksheet: typeof parseWorksheet;
  readonly parseWorkbook: typeof parseWorkbook;
  readonly parseView: (source: string) => ViewValidationResult;
  readonly parseStudio: typeof parseStudioContract;
  readonly parseExchange: typeof parseExchangeContract;
  readonly buildExchangePrompt: typeof buildProviderNeutralPromptPacket;
  readonly validateExchangeImport: typeof validateExchangeImport;
  readonly buildCompatibilityMatrix: typeof buildCompatibilityMatrix;
  readonly validateViewObject: typeof validateHccViewCandidate;
  readonly runSelfTest: () => AuthoringApiSelfTestReport;
}

export function parseHccViewSource(source: string): ViewValidationResult {
  let candidate: unknown;
  try {
    candidate = yaml.load(source, { schema: yaml.JSON_SCHEMA });
  } catch (error) {
    return {
      ok: false,
      diagnostics: [{
        code: "HCC-VIEW-SCHEMA",
        path: "$",
        message: `The view YAML could not be parsed: ${error instanceof Error ? error.message : "unknown YAML error"}`
      }]
    };
  }
  return validateHccViewCandidate(candidate);
}

export function createHccAuthoringApi(): HccAuthoringApi {
  const parsers = {
    parseCandidateInteraction,
    parseWorksheet,
    parseWorkbook,
    parseView: parseHccViewSource
  };
  return Object.freeze({
    apiVersion: HCC_AUTHORING_API_VERSION,
    lifecycle: "candidate",
    authority: "validation-and-description-only",
    effects: Object.freeze({
      filesystemWrite: false,
      vaultMutation: false,
      network: false,
      submission: false,
      canonicalApply: false
    }),
    contracts: Object.freeze({
      releasedInteraction: SUPPORTED_VERSION,
      candidateInteraction: CANDIDATE_INTERACTION_VERSION,
      worksheet: WORKSHEET_VERSION,
      workbook: WORKBOOK_VERSION,
      view: HCC_VIEW_VERSION,
      studio: STUDIO_VERSION,
      exchange: EXCHANGE_VERSION,
      compatibility: COMPATIBILITY_MATRIX_VERSION
    }),
    catalogs: Object.freeze({
      releasedInteractionKinds: Object.freeze([...SUPPORTED_KINDS]),
      candidateInputKinds: Object.freeze([...CANDIDATE_INPUT_KINDS]),
      viewKinds: Object.freeze([...HCC_VIEW_KINDS]),
      inputFamilies: INPUT_FAMILIES,
      viewFamilies: VIEW_FAMILIES,
      rendererCatalog: CANDIDATE_RENDERER_CATALOG
    }),
    parseReleasedInteraction: parseInteraction,
    parseCandidateInteraction,
    parseWorksheet,
    parseWorkbook,
    parseView: parseHccViewSource,
    parseStudio: parseStudioContract,
    parseExchange: parseExchangeContract,
    buildExchangePrompt: buildProviderNeutralPromptPacket,
    validateExchangeImport,
    buildCompatibilityMatrix,
    validateViewObject: validateHccViewCandidate,
    runSelfTest: () => runAuthoringApiSelfTest(parsers)
  });
}

export const HCC_AUTHORING_API = createHccAuthoringApi();
