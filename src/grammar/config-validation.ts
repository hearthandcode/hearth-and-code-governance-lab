import type { CandidateInputKind, CandidateOption, CandidateRepeatableField, GrammarDiagnostic } from "./types";

const MAX_OPTIONS = 64;
const MAX_MATRIX_CELLS = 256;
const MAX_REPEATABLE_FIELDS = 16;
const MAX_REPEATABLE_ITEMS = 16;

export function validateCandidateConfig(value: unknown, kind: CandidateInputKind, diagnostics: GrammarDiagnostic[]): Record<string, unknown> | null {
  if (!isRecord(value)) {
    diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", "$.config", "config must be an object, including when empty."));
    return null;
  }
  if (kind === "short_text") return shortTextConfig(value, diagnostics);
  if (kind === "number") return numberConfig(value, diagnostics);
  if (kind === "boolean") return booleanConfig(value, diagnostics);
  if (kind === "date") return dateConfig(value, diagnostics);
  if (kind === "scale") return scaleConfig(value, diagnostics);
  if (kind === "ranked_choice") return rankedChoiceConfig(value, diagnostics);
  if (kind === "matrix") return matrixConfig(value, diagnostics);
  if (kind === "repeatable_group") return repeatableConfig(value, diagnostics);
  if (kind === "dropdown") return dropdownConfig(value, diagnostics);
  if (kind === "multi_select") return multiSelectConfig(value, diagnostics);
  if (kind === "time") return timeConfig(value, diagnostics);
  if (kind === "datetime") return dateTimeConfig(value, diagnostics);
  if (kind === "duration") return durationConfig(value, diagnostics);
  if (kind === "currency") return currencyConfig(value, diagnostics);
  if (kind === "email") return emailConfig(value, diagnostics);
  if (kind === "url") return urlConfig(value, diagnostics);
  if (kind === "month") return boundedTemporalConfig(value, diagnostics, isIsoMonth, "calendar month (YYYY-MM)");
  if (kind === "week") return boundedTemporalConfig(value, diagnostics, isIsoWeek, "ISO week (YYYY-Www)");
  if (kind === "percentage") return percentageConfig(value, diagnostics);
  if (kind === "color") return colorConfig(value, diagnostics);
  if (kind === "phone") return phoneConfig(value, diagnostics);
  if (kind === "tags") return tagsConfig(value, diagnostics);
  if (kind === "numeric_range") return numberConfig(value, diagnostics);
  if (kind === "file_reference") return fileReferenceConfig(value, diagnostics);
  if (kind === "long_text") return longTextConfig(value, diagnostics);
  if (kind === "radio_group") return radioGroupConfig(value, diagnostics);
  if (kind === "rating") return ratingConfig(value, diagnostics);
  if (kind === "date_range") return boundedTemporalConfig(value, diagnostics, isIsoDate, "ISO calendar date (YYYY-MM-DD)");
  if (kind === "time_range") return timeConfig(value, diagnostics);
  if (kind === "unit_value") return unitValueConfig(value, diagnostics);
  if (kind === "key_value_list") return keyValueListConfig(value, diagnostics);
  return coordinatesConfig(value, diagnostics);
}

function shortTextConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["placeholder", "min_length", "max_length"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  copyOptionalString(value, config, "placeholder", diagnostics);
  copyOptionalInteger(value, config, "min_length", diagnostics, 0);
  copyOptionalInteger(value, config, "max_length", diagnostics, 1);
  if (typeof config.min_length === "number" && typeof config.max_length === "number" && config.min_length > config.max_length) semantic("$.config", "min_length must not exceed max_length.", diagnostics);
  return config;
}

function longTextConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["placeholder", "min_length", "max_length", "rows"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  copyOptionalString(value, config, "placeholder", diagnostics);
  copyOptionalInteger(value, config, "min_length", diagnostics, 0);
  copyOptionalInteger(value, config, "max_length", diagnostics, 1);
  copyOptionalInteger(value, config, "rows", diagnostics, 2);
  if (typeof config.rows === "number" && config.rows > 32) semantic("$.config.rows", "rows is capped at 32.", diagnostics);
  if (typeof config.min_length === "number" && typeof config.max_length === "number" && config.min_length > config.max_length) semantic("$.config", "min_length must not exceed max_length.", diagnostics);
  return config;
}

function radioGroupConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["options", "orientation"]), "$.config", diagnostics);
  const config: Record<string, unknown> = { options: optionList(value.options, "$.config.options", diagnostics, true) };
  if (value.orientation !== undefined) {
    if (value.orientation !== "vertical" && value.orientation !== "horizontal") diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", "$.config.orientation", "orientation must be vertical or horizontal."));
    else config.orientation = value.orientation;
  }
  return config;
}

function ratingConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["min", "max", "step", "min_label", "max_label"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  copyRequiredNumber(value, config, "min", diagnostics);
  copyRequiredNumber(value, config, "max", diagnostics);
  copyRequiredNumber(value, config, "step", diagnostics, true);
  copyOptionalString(value, config, "min_label", diagnostics);
  copyOptionalString(value, config, "max_label", diagnostics);
  validateRange(config, diagnostics);
  if (typeof config.min === "number" && typeof config.max === "number" && typeof config.step === "number") {
    const count = Math.floor((config.max - config.min) / config.step) + 1;
    if (count < 2 || count > 16) semantic("$.config", "rating must declare between 2 and 16 selectable values.", diagnostics);
  }
  return config;
}

function unitValueConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["units", "min", "max", "step"]), "$.config", diagnostics);
  const config: Record<string, unknown> = { units: optionList(value.units, "$.config.units", diagnostics, true) };
  copyOptionalNumber(value, config, "min", diagnostics);
  copyOptionalNumber(value, config, "max", diagnostics);
  copyOptionalNumber(value, config, "step", diagnostics, true);
  validateRange(config, diagnostics);
  return config;
}

function keyValueListConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["key_label", "value_label", "min_items", "max_items", "max_length"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  copyOptionalString(value, config, "key_label", diagnostics);
  copyOptionalString(value, config, "value_label", diagnostics);
  copyOptionalInteger(value, config, "min_items", diagnostics, 0);
  copyOptionalInteger(value, config, "max_items", diagnostics, 1);
  copyOptionalInteger(value, config, "max_length", diagnostics, 1);
  if (typeof config.max_items === "number" && config.max_items > MAX_REPEATABLE_ITEMS) semantic("$.config.max_items", `max_items is capped at ${MAX_REPEATABLE_ITEMS}.`, diagnostics);
  if (typeof config.min_items === "number" && typeof config.max_items === "number" && config.min_items > config.max_items) semantic("$.config", "min_items must not exceed max_items.", diagnostics);
  return config;
}

function coordinatesConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["precision", "latitude_label", "longitude_label"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  copyOptionalInteger(value, config, "precision", diagnostics, 0);
  copyOptionalString(value, config, "latitude_label", diagnostics);
  copyOptionalString(value, config, "longitude_label", diagnostics);
  if (typeof config.precision === "number" && config.precision > 8) semantic("$.config.precision", "precision is capped at 8 decimal places.", diagnostics);
  return config;
}

function numberConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["min", "max", "step", "unit"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  copyOptionalNumber(value, config, "min", diagnostics);
  copyOptionalNumber(value, config, "max", diagnostics);
  copyOptionalNumber(value, config, "step", diagnostics, true);
  copyOptionalString(value, config, "unit", diagnostics);
  validateRange(config, diagnostics);
  return config;
}

function booleanConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["true_label", "false_label"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  copyOptionalString(value, config, "true_label", diagnostics);
  copyOptionalString(value, config, "false_label", diagnostics);
  return config;
}

function dateConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["min", "max"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  for (const key of ["min", "max"]) {
    if (value[key] !== undefined) {
      if (!isIsoDate(value[key])) diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", `$.config.${key}`, "Expected an ISO calendar date (YYYY-MM-DD)."));
      else config[key] = value[key];
    }
  }
  if (typeof config.min === "string" && typeof config.max === "string" && config.min > config.max) semantic("$.config", "min must not exceed max.", diagnostics);
  return config;
}

function scaleConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["min", "max", "step", "labels"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  copyRequiredNumber(value, config, "min", diagnostics);
  copyRequiredNumber(value, config, "max", diagnostics);
  copyRequiredNumber(value, config, "step", diagnostics, true);
  validateRange(config, diagnostics);
  if (value.labels !== undefined) config.labels = optionList(value.labels, "$.config.labels", diagnostics, false);
  return config;
}

function rankedChoiceConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["options"]), "$.config", diagnostics);
  return { options: optionList(value.options, "$.config.options", diagnostics, true) };
}

function matrixConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["rows", "columns", "selection", "require_all_rows"]), "$.config", diagnostics);
  const rows = optionList(value.rows, "$.config.rows", diagnostics, true);
  const columns = optionList(value.columns, "$.config.columns", diagnostics, true);
  const selection = value.selection;
  if (rows.length * columns.length > MAX_MATRIX_CELLS) semantic("$.config", `Matrix size is capped at ${MAX_MATRIX_CELLS} cells.`, diagnostics);
  if (selection !== "one" && selection !== "many") diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", "$.config.selection", "selection must be one or many."));
  if (value.require_all_rows !== undefined && typeof value.require_all_rows !== "boolean") diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", "$.config.require_all_rows", "require_all_rows must be boolean."));
  return { rows, columns, selection: selection === "many" ? "many" : "one", ...(value.require_all_rows === true ? { require_all_rows: true } : {}) };
}

function repeatableConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["fields", "min_items", "max_items"]), "$.config", diagnostics);
  const config: Record<string, unknown> = { fields: repeatableFields(value.fields, diagnostics) };
  copyOptionalInteger(value, config, "min_items", diagnostics, 0);
  copyOptionalInteger(value, config, "max_items", diagnostics, 1);
  if (typeof config.min_items === "number" && config.min_items > MAX_REPEATABLE_ITEMS) semantic("$.config.min_items", `min_items is capped at ${MAX_REPEATABLE_ITEMS}.`, diagnostics);
  if (typeof config.max_items === "number" && config.max_items > MAX_REPEATABLE_ITEMS) semantic("$.config.max_items", `max_items is capped at ${MAX_REPEATABLE_ITEMS}.`, diagnostics);
  if (typeof config.min_items === "number" && typeof config.max_items === "number" && config.min_items > config.max_items) semantic("$.config", "min_items must not exceed max_items.", diagnostics);
  return config;
}

function dropdownConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["options", "placeholder"]), "$.config", diagnostics);
  const config: Record<string, unknown> = { options: optionList(value.options, "$.config.options", diagnostics, true) };
  copyOptionalString(value, config, "placeholder", diagnostics);
  return config;
}

function multiSelectConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["options", "min_selections", "max_selections"]), "$.config", diagnostics);
  const config: Record<string, unknown> = { options: optionList(value.options, "$.config.options", diagnostics, true) };
  copyOptionalInteger(value, config, "min_selections", diagnostics, 0);
  copyOptionalInteger(value, config, "max_selections", diagnostics, 1);
  const count = (config.options as CandidateOption[]).length;
  if (typeof config.max_selections === "number" && config.max_selections > count) semantic("$.config.max_selections", "max_selections must not exceed the option count.", diagnostics);
  if (typeof config.min_selections === "number" && typeof config.max_selections === "number" && config.min_selections > config.max_selections) semantic("$.config", "min_selections must not exceed max_selections.", diagnostics);
  return config;
}

function timeConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["min", "max", "step_minutes"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  for (const key of ["min", "max"]) {
    if (value[key] !== undefined) {
      if (!isIsoTime(value[key])) diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", `$.config.${key}`, "Expected a 24-hour time (HH:MM)."));
      else config[key] = value[key];
    }
  }
  copyOptionalInteger(value, config, "step_minutes", diagnostics, 1);
  if (typeof config.min === "string" && typeof config.max === "string" && config.min > config.max) semantic("$.config", "min must not exceed max.", diagnostics);
  return config;
}

function dateTimeConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["min", "max"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  for (const key of ["min", "max"]) {
    if (value[key] !== undefined) {
      if (!isIsoDateTime(value[key])) diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", `$.config.${key}`, "Expected a local ISO date and time (YYYY-MM-DDTHH:MM)."));
      else config[key] = value[key];
    }
  }
  if (typeof config.min === "string" && typeof config.max === "string" && config.min > config.max) semantic("$.config", "min must not exceed max.", diagnostics);
  return config;
}

function durationConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["min_minutes", "max_minutes", "step_minutes", "display_unit"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  copyOptionalNumber(value, config, "min_minutes", diagnostics);
  copyOptionalNumber(value, config, "max_minutes", diagnostics);
  copyOptionalNumber(value, config, "step_minutes", diagnostics, true);
  if (value.display_unit !== undefined) {
    if (value.display_unit !== "minutes" && value.display_unit !== "hours") diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", "$.config.display_unit", "display_unit must be minutes or hours."));
    else config.display_unit = value.display_unit;
  }
  if (typeof config.min_minutes === "number" && typeof config.max_minutes === "number" && config.min_minutes >= config.max_minutes) semantic("$.config", "min_minutes must be less than max_minutes.", diagnostics);
  return config;
}

function currencyConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["currency", "min", "max", "step"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  if (typeof value.currency !== "string" || !/^[A-Z]{3}$/.test(value.currency)) diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", "$.config.currency", "An uppercase three-letter currency code is required."));
  else config.currency = value.currency;
  copyOptionalNumber(value, config, "min", diagnostics);
  copyOptionalNumber(value, config, "max", diagnostics);
  copyOptionalNumber(value, config, "step", diagnostics, true);
  validateRange(config, diagnostics);
  return config;
}

function emailConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["placeholder", "allow_multiple"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  copyOptionalString(value, config, "placeholder", diagnostics);
  if (value.allow_multiple !== undefined) {
    if (typeof value.allow_multiple !== "boolean") diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", "$.config.allow_multiple", "allow_multiple must be boolean."));
    else config.allow_multiple = value.allow_multiple;
  }
  return config;
}

function urlConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["placeholder", "allowed_schemes"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  copyOptionalString(value, config, "placeholder", diagnostics);
  if (value.allowed_schemes !== undefined) {
    if (!Array.isArray(value.allowed_schemes) || value.allowed_schemes.length === 0 || value.allowed_schemes.some((item) => item !== "https" && item !== "http")) diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", "$.config.allowed_schemes", "allowed_schemes must be a non-empty list containing only https or http."));
    else config.allowed_schemes = [...new Set(value.allowed_schemes)];
  }
  return config;
}

function boundedTemporalConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[], validator: (value: unknown) => boolean, label: string): Record<string, unknown> {
  rejectUnknown(value, new Set(["min", "max"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  for (const key of ["min", "max"]) {
    if (value[key] === undefined) continue;
    if (!validator(value[key])) diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", `$.config.${key}`, `Expected a ${label}.`));
    else config[key] = value[key];
  }
  if (typeof config.min === "string" && typeof config.max === "string" && config.min > config.max) semantic("$.config", "min must not exceed max.", diagnostics);
  return config;
}

function percentageConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["min", "max", "step"]), "$.config", diagnostics);
  const config: Record<string, unknown> = { min: 0, max: 100, step: 1 };
  copyOptionalNumber(value, config, "min", diagnostics);
  copyOptionalNumber(value, config, "max", diagnostics);
  copyOptionalNumber(value, config, "step", diagnostics, true);
  validateRange(config, diagnostics);
  if ((config.min as number) < 0 || (config.max as number) > 100) semantic("$.config", "Percentage bounds must remain between 0 and 100.", diagnostics);
  return config;
}

function colorConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["format"]), "$.config", diagnostics);
  if (value.format !== undefined && value.format !== "hex") diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", "$.config.format", "Only the hex color format is supported."));
  return { format: "hex" };
}

function phoneConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["placeholder", "min_length", "max_length"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  copyOptionalString(value, config, "placeholder", diagnostics);
  copyOptionalInteger(value, config, "min_length", diagnostics, 3);
  copyOptionalInteger(value, config, "max_length", diagnostics, 3);
  if (typeof config.min_length === "number" && typeof config.max_length === "number" && config.min_length > config.max_length) semantic("$.config", "min_length must not exceed max_length.", diagnostics);
  return config;
}

function tagsConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["suggestions", "min_items", "max_items", "max_length"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  if (value.suggestions !== undefined) config.suggestions = optionList(value.suggestions, "$.config.suggestions", diagnostics, false);
  copyOptionalInteger(value, config, "min_items", diagnostics, 0);
  copyOptionalInteger(value, config, "max_items", diagnostics, 1);
  copyOptionalInteger(value, config, "max_length", diagnostics, 1);
  if (typeof config.min_items === "number" && typeof config.max_items === "number" && config.min_items > config.max_items) semantic("$.config", "min_items must not exceed max_items.", diagnostics);
  return config;
}

function fileReferenceConfig(value: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): Record<string, unknown> {
  rejectUnknown(value, new Set(["extensions", "allow_missing"]), "$.config", diagnostics);
  const config: Record<string, unknown> = {};
  if (value.extensions !== undefined) {
    if (!Array.isArray(value.extensions) || value.extensions.length === 0 || value.extensions.some((item) => typeof item !== "string" || !/^\.[a-z0-9]+$/i.test(item))) diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", "$.config.extensions", "extensions must be a non-empty list such as [.md, .yaml]."));
    else config.extensions = [...new Set(value.extensions.map((item) => item.toLowerCase()))];
  }
  if (value.allow_missing !== undefined) {
    if (typeof value.allow_missing !== "boolean") diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", "$.config.allow_missing", "allow_missing must be boolean."));
    else if (value.allow_missing === false) diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", "$.config.allow_missing", "Phase 0 cannot prove file existence; allow_missing must remain true."));
    else config.allow_missing = true;
  }
  return config;
}

function optionList(value: unknown, path: string, diagnostics: GrammarDiagnostic[], required: boolean): CandidateOption[] {
  if (!Array.isArray(value) || (required && value.length === 0)) {
    diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", path, required ? "A non-empty option list is required." : "Expected an option list."));
    return [];
  }
  if (value.length > MAX_OPTIONS) diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", path, `Option lists are capped at ${MAX_OPTIONS} entries.`));
  const result: CandidateOption[] = [];
  const ids = new Set<string>();
  value.forEach((item, index) => {
    if (!isRecord(item)) { diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", `${path}[${index}]`, "Option must be an object.")); return; }
    rejectUnknown(item, new Set(["id", "label"]), `${path}[${index}]`, diagnostics);
    const id = stringRequired(item.id, `${path}[${index}].id`, diagnostics);
    const label = stringRequired(item.label, `${path}[${index}].label`, diagnostics);
    if (id && ids.has(id)) semantic(`${path}[${index}].id`, "IDs must be unique.", diagnostics);
    if (id && label) { ids.add(id); result.push({ id, label }); }
  });
  return result;
}

function repeatableFields(value: unknown, diagnostics: GrammarDiagnostic[]): CandidateRepeatableField[] {
  if (!Array.isArray(value) || value.length === 0) { diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", "$.config.fields", "A non-empty fields list is required.")); return []; }
  if (value.length > MAX_REPEATABLE_FIELDS) diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", "$.config.fields", `Repeatable groups are capped at ${MAX_REPEATABLE_FIELDS} fields.`));
  const result: CandidateRepeatableField[] = [];
  const ids = new Set<string>();
  value.forEach((item, index) => {
    const path = `$.config.fields[${index}]`;
    if (!isRecord(item)) { diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", path, "Field must be an object.")); return; }
    rejectUnknown(item, new Set(["id", "label", "kind", "required", "min", "max", "step"]), path, diagnostics);
    const id = stringRequired(item.id, `${path}.id`, diagnostics);
    const label = stringRequired(item.label, `${path}.label`, diagnostics);
    const validKinds = ["short_text", "number", "boolean", "date"];
    if (typeof item.kind !== "string" || !validKinds.includes(item.kind)) diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", `${path}.kind`, "Repeatable fields allow only short_text, number, boolean, or date."));
    if (item.required !== undefined && typeof item.required !== "boolean") diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", `${path}.required`, "required must be boolean."));
    if (id && ids.has(id)) semantic(`${path}.id`, "Field IDs must be unique.", diagnostics);
    const numeric: Pick<CandidateRepeatableField, "min" | "max" | "step"> = {};
    for (const key of ["min", "max", "step"] as const) {
      if (item[key] === undefined) continue;
      if (item.kind !== "number") diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", `${path}.${key}`, `${key} is allowed only for number fields.`));
      else if (!finiteNumber(item[key]) || (key === "step" && item[key] <= 0)) diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", `${path}.${key}`, key === "step" ? "Expected a positive finite number." : "Expected a finite number."));
      else numeric[key] = item[key];
    }
    if (numeric.min !== undefined && numeric.max !== undefined && numeric.min >= numeric.max) semantic(path, "min must be less than max.", diagnostics);
    if (id && label && typeof item.kind === "string" && validKinds.includes(item.kind)) {
      ids.add(id); result.push({ id, label, kind: item.kind as CandidateRepeatableField["kind"], required: item.required === true, ...numeric });
    }
  });
  return result;
}

function rejectUnknown(value: Record<string, unknown>, allowed: Set<string>, path: string, diagnostics: GrammarDiagnostic[]): void {
  for (const key of Object.keys(value)) if (!allowed.has(key)) diagnostics.push(diag("HCC-GRAMMAR-UNKNOWN-001", `${path}.${key}`, `Unknown field: ${key}.`));
}

function stringRequired(value: unknown, path: string, diagnostics: GrammarDiagnostic[]): string | null {
  if (typeof value !== "string" || !value.trim()) { diagnostics.push(diag("HCC-GRAMMAR-SCHEMA-001", path, "A non-empty string is required.")); return null; }
  return value;
}

function copyOptionalString(source: Record<string, unknown>, target: Record<string, unknown>, key: string, diagnostics: GrammarDiagnostic[]): void {
  if (source[key] === undefined) return;
  const value = stringRequired(source[key], `$.config.${key}`, diagnostics);
  if (value) target[key] = value;
}

function copyOptionalInteger(source: Record<string, unknown>, target: Record<string, unknown>, key: string, diagnostics: GrammarDiagnostic[], minimum: number): void {
  if (source[key] === undefined) return;
  if (!Number.isInteger(source[key]) || (source[key] as number) < minimum) diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", `$.config.${key}`, `Expected an integer of at least ${minimum}.`));
  else target[key] = source[key];
}

function copyOptionalNumber(source: Record<string, unknown>, target: Record<string, unknown>, key: string, diagnostics: GrammarDiagnostic[], positive = false): void {
  if (source[key] === undefined) return;
  if (!finiteNumber(source[key]) || (positive && source[key] <= 0)) diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", `$.config.${key}`, positive ? "Expected a positive finite number." : "Expected a finite number."));
  else target[key] = source[key];
}

function copyRequiredNumber(source: Record<string, unknown>, target: Record<string, unknown>, key: string, diagnostics: GrammarDiagnostic[], positive = false): void {
  if (!finiteNumber(source[key]) || (positive && source[key] <= 0)) diagnostics.push(diag("HCC-GRAMMAR-CONFIG-001", `$.config.${key}`, positive ? "A positive finite number is required." : "A finite number is required."));
  else target[key] = source[key];
}

function validateRange(config: Record<string, unknown>, diagnostics: GrammarDiagnostic[]): void {
  if (typeof config.min === "number" && typeof config.max === "number" && config.min >= config.max) semantic("$.config", "min must be less than max.", diagnostics);
}

function semantic(path: string, message: string, diagnostics: GrammarDiagnostic[], response = false): void {
  diagnostics.push(diag(response ? "HCC-GRAMMAR-RESPONSE-001" : "HCC-GRAMMAR-CONFIG-001", path, message));
}

function finiteNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function isIsoTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
function isIsoDateTime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4}-\d{2}-\d{2})T(([01]\d|2[0-3]):[0-5]\d)$/.exec(value);
  return match !== null && isIsoDate(match[1]) && isIsoTime(match[2]);
}
function isIsoMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
function isIsoWeek(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(value)) return false;
  const [yearText, weekText] = value.split("-W");
  const year = Number(yearText); const week = Number(weekText);
  const december28 = new Date(Date.UTC(year, 11, 28));
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const maxWeek = Math.ceil(((december28.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7);
  return week <= maxWeek;
}

function diag(code: GrammarDiagnostic["code"], path: string, message: string): GrammarDiagnostic {
  const failure: GrammarDiagnostic["failure"] = code === "HCC-GRAMMAR-PARSE-001" ? "parse-invalid"
    : code === "HCC-GRAMMAR-FAMILY-001" ? "unknown-family"
      : code === "HCC-GRAMMAR-VERSION-001" ? "unsupported-version"
        : code === "HCC-GRAMMAR-KIND-001" ? "unknown-kind"
          : code === "HCC-GRAMMAR-CONFIG-001" || code === "HCC-GRAMMAR-RESPONSE-001" ? "semantic-invalid"
            : "schema-invalid";
  return { code, failure, path, message };
}
