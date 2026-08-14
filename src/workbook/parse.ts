import yaml from "js-yaml";

import {
  WORKBOOK_VERSION,
  WORKSHEET_VERSION,
  type WorkbookContract,
  type WorkbookDiagnostic,
  type WorkbookParseResult,
  type WorkbookWorksheetRef,
  type WorksheetContract,
  type WorksheetParseResult,
  type WorksheetPrivacy,
  type WorksheetSection
} from "./types";

const WORKSHEET_FIELDS = new Set(["version", "id", "title", "purpose", "privacy", "sections", "completion", "workbook_ref", "governance"]);
const WORKBOOK_FIELDS = new Set(["version", "id", "title", "purpose", "worksheets", "navigation", "governance"]);
const MAX_SECTIONS = 16;
const MAX_INTERACTIONS = 64;
const MAX_WORKSHEETS = 32;

export function parseWorksheet(source: string): WorksheetParseResult {
  const parsed = load(source);
  if (!parsed.ok) return parsed;
  const value = parsed.value;
  const diagnostics: WorkbookDiagnostic[] = [];
  unknown(value, WORKSHEET_FIELDS, "$", diagnostics);
  if (value.version !== WORKSHEET_VERSION) diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", "$.version", `Only ${WORKSHEET_VERSION} is supported.`);
  const id = text(value.id, "$.id", diagnostics);
  const title = text(value.title, "$.title", diagnostics);
  const purpose = text(value.purpose, "$.purpose", diagnostics);
  const privacy = privacyValue(value.privacy, diagnostics);
  const sections = sectionList(value.sections, diagnostics);
  const completion = completionValue(value.completion, sections, diagnostics);
  const workbookRef = optionalPath(value.workbook_ref, "$.workbook_ref", diagnostics);
  const governance = worksheetGovernance(value.governance, diagnostics);
  if (diagnostics.length || !id || !title || !purpose || !privacy || !sections || !completion || !governance) return { ok: false, diagnostics };
  return { ok: true, diagnostics: [], worksheet: {
    version: WORKSHEET_VERSION, id, title, purpose, privacy, sections, completion, governance,
    ...(workbookRef === undefined ? {} : { workbook_ref: workbookRef })
  } };
}

export function parseWorkbook(source: string): WorkbookParseResult {
  const parsed = load(source);
  if (!parsed.ok) return parsed;
  const value = parsed.value;
  const diagnostics: WorkbookDiagnostic[] = [];
  unknown(value, WORKBOOK_FIELDS, "$", diagnostics);
  if (value.version !== WORKBOOK_VERSION) diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", "$.version", `Only ${WORKBOOK_VERSION} is supported.`);
  const id = text(value.id, "$.id", diagnostics);
  const title = text(value.title, "$.title", diagnostics);
  const purpose = text(value.purpose, "$.purpose", diagnostics);
  const worksheets = worksheetRefs(value.worksheets, diagnostics);
  const navigation = value.navigation;
  if (navigation !== "sequential" && navigation !== "free") diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", "$.navigation", "navigation must be sequential or free.");
  const governance = workbookGovernance(value.governance, diagnostics);
  if (diagnostics.length || !id || !title || !purpose || !worksheets || !governance || (navigation !== "sequential" && navigation !== "free")) return { ok: false, diagnostics };
  return { ok: true, diagnostics: [], workbook: { version: WORKBOOK_VERSION, id, title, purpose, worksheets, navigation, governance } };
}

function load(source: string): { ok: true; value: Record<string, unknown> } | { ok: false; diagnostics: WorkbookDiagnostic[] } {
  let value: unknown;
  try { value = yaml.load(source, { schema: yaml.JSON_SCHEMA }); }
  catch (error) {
    return { ok: false, diagnostics: [{ code: "HCC-WORKBOOK-PARSE", path: "$", message: error instanceof Error ? error.message : "Unknown YAML parse error" }] };
  }
  if (!record(value)) return { ok: false, diagnostics: [{ code: "HCC-WORKBOOK-SCHEMA", path: "$", message: "The contract must be a YAML object." }] };
  return { ok: true, value };
}

function sectionList(value: unknown, diagnostics: WorkbookDiagnostic[]): WorksheetSection[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SECTIONS) {
    diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", "$.sections", `sections must contain 1–${MAX_SECTIONS} entries.`); return null;
  }
  const result: WorksheetSection[] = [];
  const sectionIds = new Set<string>();
  const interactionIds = new Set<string>();
  value.forEach((item, index) => {
    const path = `$.sections[${index}]`;
    if (!record(item)) { diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", path, "Section must be an object."); return; }
    unknown(item, new Set(["id", "title", "interactions"]), path, diagnostics);
    const id = text(item.id, `${path}.id`, diagnostics);
    const title = text(item.title, `${path}.title`, diagnostics);
    const interactions = stringList(item.interactions, `${path}.interactions`, diagnostics, true);
    if (id && sectionIds.has(id)) diagnostic(diagnostics, "HCC-WORKBOOK-SEMANTIC", `${path}.id`, "Section IDs must be unique.");
    interactions?.forEach((interaction, interactionIndex) => {
      if (interactionIds.has(interaction)) diagnostic(diagnostics, "HCC-WORKBOOK-SEMANTIC", `${path}.interactions[${interactionIndex}]`, "Interaction IDs may appear only once per worksheet.");
      interactionIds.add(interaction);
    });
    if (id && title && interactions) { sectionIds.add(id); result.push({ id, title, interactions }); }
  });
  if (interactionIds.size > MAX_INTERACTIONS) diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", "$.sections", `Worksheets are capped at ${MAX_INTERACTIONS} interactions.`);
  return result;
}

function completionValue(value: unknown, sections: WorksheetSection[] | null, diagnostics: WorkbookDiagnostic[]): { required: string[] } | null {
  if (!record(value)) { diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", "$.completion", "completion must be an object."); return null; }
  unknown(value, new Set(["required"]), "$.completion", diagnostics);
  const required = stringList(value.required, "$.completion.required", diagnostics, false);
  if (!required) return null;
  const admitted = new Set(sections?.flatMap((section) => section.interactions) ?? []);
  required.forEach((id, index) => { if (!admitted.has(id)) diagnostic(diagnostics, "HCC-WORKBOOK-SEMANTIC", `$.completion.required[${index}]`, "Required interaction is not declared in a section."); });
  return { required };
}

function worksheetRefs(value: unknown, diagnostics: WorkbookDiagnostic[]): WorkbookWorksheetRef[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_WORKSHEETS) {
    diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", "$.worksheets", `worksheets must contain 1–${MAX_WORKSHEETS} entries.`); return null;
  }
  const result: WorkbookWorksheetRef[] = [];
  const ids = new Set<string>();
  value.forEach((item, index) => {
    const path = `$.worksheets[${index}]`;
    if (!record(item)) { diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", path, "Worksheet reference must be an object."); return; }
    unknown(item, new Set(["id", "label", "ref"]), path, diagnostics);
    const id = text(item.id, `${path}.id`, diagnostics);
    const label = text(item.label, `${path}.label`, diagnostics);
    const ref = optionalPath(item.ref, `${path}.ref`, diagnostics);
    if (id && ids.has(id)) diagnostic(diagnostics, "HCC-WORKBOOK-SEMANTIC", `${path}.id`, "Worksheet IDs must be unique.");
    if (id && label && ref) { ids.add(id); result.push({ id, label, ref }); }
  });
  return result;
}

function worksheetGovernance(value: unknown, diagnostics: WorkbookDiagnostic[]): WorksheetContract["governance"] | null {
  if (!record(value)) { diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", "$.governance", "governance must be an object."); return null; }
  unknown(value, new Set(["authority_refs", "review_required", "verification_required"]), "$.governance", diagnostics);
  const authorityRefs = stringList(value.authority_refs, "$.governance.authority_refs", diagnostics, false);
  if (typeof value.review_required !== "boolean") diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", "$.governance.review_required", "review_required must be boolean.");
  if (typeof value.verification_required !== "boolean") diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", "$.governance.verification_required", "verification_required must be boolean.");
  return authorityRefs && typeof value.review_required === "boolean" && typeof value.verification_required === "boolean"
    ? { authority_refs: authorityRefs, review_required: value.review_required, verification_required: value.verification_required } : null;
}

function workbookGovernance(value: unknown, diagnostics: WorkbookDiagnostic[]): WorkbookContract["governance"] | null {
  if (!record(value)) { diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", "$.governance", "governance must be an object."); return null; }
  unknown(value, new Set(["authority_refs", "review_required"]), "$.governance", diagnostics);
  const authorityRefs = stringList(value.authority_refs, "$.governance.authority_refs", diagnostics, false);
  if (typeof value.review_required !== "boolean") diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", "$.governance.review_required", "review_required must be boolean.");
  return authorityRefs && typeof value.review_required === "boolean" ? { authority_refs: authorityRefs, review_required: value.review_required } : null;
}

function privacyValue(value: unknown, diagnostics: WorkbookDiagnostic[]): WorksheetPrivacy | null {
  const admitted = ["private", "restricted", "internal", "public"];
  if (typeof value !== "string" || !admitted.includes(value)) { diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", "$.privacy", "privacy is not recognized."); return null; }
  return value as WorksheetPrivacy;
}

function stringList(value: unknown, path: string, diagnostics: WorkbookDiagnostic[], nonEmpty: boolean): string[] | null {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", path, "Expected a list of non-empty strings."); return null;
  }
  if (new Set(value).size !== value.length) diagnostic(diagnostics, "HCC-WORKBOOK-SEMANTIC", path, "List entries must be unique.");
  return [...value] as string[];
}

function optionalPath(value: unknown, path: string, diagnostics: WorkbookDiagnostic[]): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "" || value.startsWith("/") || value.includes("\\") || value.split("/").some((segment) => segment === ".." || segment.startsWith(".")) || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", path, "Expected an explicit non-hidden vault-relative reference."); return undefined;
  }
  return value;
}

function text(value: unknown, path: string, diagnostics: WorkbookDiagnostic[]): string | null {
  if (typeof value !== "string" || value.trim() === "" || value.length > 4096) { diagnostic(diagnostics, "HCC-WORKBOOK-SCHEMA", path, "Expected a non-empty bounded string."); return null; }
  return value;
}

function unknown(value: Record<string, unknown>, allowed: Set<string>, path: string, diagnostics: WorkbookDiagnostic[]): void {
  Object.keys(value).filter((key) => !allowed.has(key)).forEach((key) => diagnostic(diagnostics, "HCC-WORKBOOK-UNKNOWN", `${path}.${key}`, "Unknown fields are not accepted."));
}

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function diagnostic(list: WorkbookDiagnostic[], code: WorkbookDiagnostic["code"], path: string, message: string): void { list.push({ code, path, message }); }
