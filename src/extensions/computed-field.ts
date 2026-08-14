import yaml from "js-yaml";

export const COMPUTED_FIELD_VERSION = "0.1-candidate.1" as const;
const OPERATIONS = ["sum", "average", "subtract", "multiply", "divide", "min", "max", "percent"] as const;
type Operation = (typeof OPERATIONS)[number];

export type ComputedExpression =
  | { literal: number }
  | { ref: string }
  | { op: Operation; args: ComputedExpression[] };

export interface ComputedFieldContract {
  version: typeof COMPUTED_FIELD_VERSION;
  id: string;
  kind: "computed_field";
  title: string;
  summary: string;
  inputs: Array<{ id: string; label: string; value: number }>;
  fields: Array<{ id: string; label: string; formula: ComputedExpression; precision: number; unit?: string }>;
  output: string;
}

export interface ExtensionDiagnostic {
  code: "HCC-EXT-SCHEMA" | "HCC-EXT-UNKNOWN" | "HCC-EXT-CYCLE" | "HCC-EXT-EVALUATION";
  path: string;
  message: string;
}

type ComputedParseResult = { ok: true; contract: ComputedFieldContract; diagnostics: [] }
  | { ok: false; diagnostics: ExtensionDiagnostic[] };

const ROOT_KEYS = ["version", "id", "kind", "title", "summary", "inputs", "fields", "output"];
const ID = /^[a-z][a-z0-9_-]{0,63}$/;
const MAX_ITEMS = 64;
const MAX_DEPTH = 12;
const MAX_NODES = 128;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 256;
}

function unknownKeys(value: Record<string, unknown>, allowed: readonly string[], path: string, diagnostics: ExtensionDiagnostic[]): void {
  Object.keys(value).filter((key) => !allowed.includes(key)).forEach((key) => diagnostics.push({ code: "HCC-EXT-UNKNOWN", path: `${path}.${key}`, message: "Unknown fields are not accepted." }));
}

function expression(value: unknown, path: string, diagnostics: ExtensionDiagnostic[], depth = 0, count = { value: 0 }): ComputedExpression | undefined {
  count.value += 1;
  if (depth > MAX_DEPTH || count.value > MAX_NODES) {
    diagnostics.push({ code: "HCC-EXT-SCHEMA", path, message: "Formula exceeds the bounded expression depth or node count." });
    return undefined;
  }
  if (!record(value)) {
    diagnostics.push({ code: "HCC-EXT-SCHEMA", path, message: "Formula nodes must be declarative objects." });
    return undefined;
  }
  if ("literal" in value) {
    unknownKeys(value, ["literal"], path, diagnostics);
    if (typeof value.literal !== "number" || !Number.isFinite(value.literal)) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: `${path}.literal`, message: "Literal must be a finite number." });
    return typeof value.literal === "number" && Number.isFinite(value.literal) ? { literal: value.literal } : undefined;
  }
  if ("ref" in value) {
    unknownKeys(value, ["ref"], path, diagnostics);
    if (typeof value.ref !== "string" || !ID.test(value.ref)) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: `${path}.ref`, message: "Reference must be a bounded identifier." });
    return typeof value.ref === "string" && ID.test(value.ref) ? { ref: value.ref } : undefined;
  }
  unknownKeys(value, ["op", "args"], path, diagnostics);
  if (!OPERATIONS.includes(value.op as Operation) || !Array.isArray(value.args) || value.args.length < 1 || value.args.length > 16) {
    diagnostics.push({ code: "HCC-EXT-SCHEMA", path, message: "Formula requires an allowlisted operation and one to sixteen arguments." });
    return undefined;
  }
  const args = value.args.map((item, index) => expression(item, `${path}.args[${index}]`, diagnostics, depth + 1, count));
  return args.every((item): item is ComputedExpression => item !== undefined) ? { op: value.op as Operation, args } : undefined;
}

function references(value: ComputedExpression): string[] {
  if ("ref" in value) return [value.ref];
  if ("literal" in value) return [];
  return value.args.flatMap(references);
}

export function parseComputedField(source: string): ComputedParseResult {
  const diagnostics: ExtensionDiagnostic[] = [];
  let input: unknown;
  try { input = yaml.load(source, { schema: yaml.JSON_SCHEMA }); }
  catch (error) { return { ok: false, diagnostics: [{ code: "HCC-EXT-SCHEMA", path: "$", message: error instanceof Error ? error.message : "Invalid YAML." }] }; }
  if (!record(input)) return { ok: false, diagnostics: [{ code: "HCC-EXT-SCHEMA", path: "$", message: "Computed field must be an object." }] };
  unknownKeys(input, ROOT_KEYS, "$", diagnostics);
  if (input.version !== COMPUTED_FIELD_VERSION) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: "$.version", message: `Only ${COMPUTED_FIELD_VERSION} is supported.` });
  if (input.kind !== "computed_field") diagnostics.push({ code: "HCC-EXT-SCHEMA", path: "$.kind", message: "Kind must be computed_field." });
  for (const key of ["id", "title", "summary", "output"] as const) if (!text(input[key])) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: `$.${key}`, message: "A non-empty bounded string is required." });
  if (typeof input.id === "string" && !ID.test(input.id)) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: "$.id", message: "ID must be a bounded identifier." });

  const inputs: ComputedFieldContract["inputs"] = [];
  if (!Array.isArray(input.inputs) || input.inputs.length < 1 || input.inputs.length > MAX_ITEMS) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: "$.inputs", message: "One to 64 numeric inputs are required." });
  else input.inputs.forEach((item, index) => {
    const path = `$.inputs[${index}]`;
    if (!record(item)) { diagnostics.push({ code: "HCC-EXT-SCHEMA", path, message: "Input must be an object." }); return; }
    unknownKeys(item, ["id", "label", "value"], path, diagnostics);
    if (typeof item.id !== "string" || !ID.test(item.id) || !text(item.label) || typeof item.value !== "number" || !Number.isFinite(item.value)) diagnostics.push({ code: "HCC-EXT-SCHEMA", path, message: "Input requires id, label, and a finite numeric value." });
    else inputs.push({ id: item.id, label: item.label, value: item.value });
  });

  const fields: ComputedFieldContract["fields"] = [];
  if (!Array.isArray(input.fields) || input.fields.length < 1 || input.fields.length > MAX_ITEMS) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: "$.fields", message: "One to 64 computed fields are required." });
  else input.fields.forEach((item, index) => {
    const path = `$.fields[${index}]`;
    if (!record(item)) { diagnostics.push({ code: "HCC-EXT-SCHEMA", path, message: "Computed field must be an object." }); return; }
    unknownKeys(item, ["id", "label", "formula", "precision", "unit"], path, diagnostics);
    const formula = expression(item.formula, `${path}.formula`, diagnostics);
    const precision = item.precision === undefined ? 2 : item.precision;
    if (typeof item.id !== "string" || !ID.test(item.id) || !text(item.label) || !Number.isInteger(precision) || (precision as number) < 0 || (precision as number) > 8 || (item.unit !== undefined && !text(item.unit))) diagnostics.push({ code: "HCC-EXT-SCHEMA", path, message: "Field requires id, label, formula, precision 0–8, and an optional unit." });
    else if (formula) fields.push({ id: item.id, label: item.label, formula, precision: precision as number, ...(typeof item.unit === "string" ? { unit: item.unit } : {}) });
  });

  const ids = [...inputs.map((item) => item.id), ...fields.map((item) => item.id)];
  if (new Set(ids).size !== ids.length) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: "$", message: "Input and field identifiers must be unique." });
  const known = new Set(ids);
  fields.forEach((field, index) => references(field.formula).forEach((ref) => { if (!known.has(ref)) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: `$.fields[${index}].formula`, message: `Unknown reference: ${ref}.` }); }));
  if (typeof input.output === "string" && !fields.some((field) => field.id === input.output)) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: "$.output", message: "Output must reference a declared computed field." });

  const graph = new Map(fields.map((field) => [field.id, references(field.formula).filter((ref) => fields.some((candidate) => candidate.id === ref))]));
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (id: string): boolean => { if (visiting.has(id)) return true; if (visited.has(id)) return false; visiting.add(id); const cyclic = (graph.get(id) ?? []).some(visit); visiting.delete(id); visited.add(id); return cyclic; };
  if (fields.some((field) => visit(field.id))) diagnostics.push({ code: "HCC-EXT-CYCLE", path: "$.fields", message: "Computed field dependency cycles are prohibited." });
  if (diagnostics.length || typeof input.id !== "string" || typeof input.title !== "string" || typeof input.summary !== "string" || typeof input.output !== "string") return { ok: false, diagnostics };
  return { ok: true, diagnostics: [], contract: { version: COMPUTED_FIELD_VERSION, id: input.id, kind: "computed_field", title: input.title, summary: input.summary, inputs, fields, output: input.output } };
}

function apply(operation: Operation, values: number[]): number {
  if (operation === "sum") return values.reduce((total, value) => total + value, 0);
  if (operation === "average") return values.reduce((total, value) => total + value, 0) / values.length;
  if (operation === "subtract") return values.slice(1).reduce((total, value) => total - value, values[0] ?? 0);
  if (operation === "multiply") return values.reduce((total, value) => total * value, 1);
  if (operation === "divide") return values.slice(1).reduce((total, value) => total / value, values[0] ?? 0);
  if (operation === "min") return Math.min(...values);
  if (operation === "max") return Math.max(...values);
  return ((values[0] ?? 0) / (values[1] ?? 0)) * 100;
}

export function evaluateComputedField(contract: ComputedFieldContract): { values: Map<string, number>; output: number } {
  const values = new Map(contract.inputs.map((item) => [item.id, item.value]));
  const byId = new Map(contract.fields.map((field) => [field.id, field]));
  const evaluate = (node: ComputedExpression): number => {
    if ("literal" in node) return node.literal;
    if ("ref" in node) {
      if (values.has(node.ref)) return values.get(node.ref)!;
      const field = byId.get(node.ref); if (!field) throw new Error(`Unknown reference: ${node.ref}.`);
      const value = evaluate(field.formula); if (!Number.isFinite(value)) throw new Error(`Non-finite result for ${node.ref}.`); values.set(node.ref, value); return value;
    }
    const result = apply(node.op, node.args.map(evaluate));
    if (!Number.isFinite(result)) throw new Error(`Operation ${node.op} produced a non-finite result.`);
    return result;
  };
  contract.fields.forEach((field) => { if (!values.has(field.id)) values.set(field.id, evaluate(field.formula)); });
  return { values, output: values.get(contract.output)! };
}

export function renderComputedFieldFence(container: HTMLElement, source: string): void {
  const parsed = parseComputedField(source);
  if (!parsed.ok) { renderExtensionDiagnostics(container, "Computed field could not be rendered", parsed.diagnostics, source); return; }
  let evaluated: ReturnType<typeof evaluateComputedField>;
  try { evaluated = evaluateComputedField(parsed.contract); }
  catch (error) { renderExtensionDiagnostics(container, "Computed field could not be evaluated", [{ code: "HCC-EXT-EVALUATION", path: "$.fields", message: error instanceof Error ? error.message : "Evaluation failed." }], source); return; }
  const article = document.createElement("article"); article.className = "hcc-extension hcc-extension--computed"; article.dataset.extension = "computed-field";
  const title = document.createElement("h4"); title.textContent = parsed.contract.title;
  const summary = document.createElement("p"); summary.textContent = parsed.contract.summary;
  const output = document.createElement("output"); output.className = "hcc-extension__output"; output.setAttribute("aria-label", `${parsed.contract.title} result`);
  const field = parsed.contract.fields.find((item) => item.id === parsed.contract.output)!;
  output.textContent = `${evaluated.output.toFixed(field.precision)}${field.unit ? ` ${field.unit}` : ""}`;
  const details = document.createElement("details"); const detailsTitle = document.createElement("summary"); detailsTitle.textContent = "Calculation inputs and derived fields"; details.append(detailsTitle);
  const table = document.createElement("table"); const caption = document.createElement("caption"); caption.textContent = "Declared calculation values"; table.append(caption);
  const head = document.createElement("thead"); const row = document.createElement("tr"); for (const label of ["Kind", "Label", "Value"]) { const th = document.createElement("th"); th.scope = "col"; th.textContent = label; row.append(th); } head.append(row); table.append(head);
  const body = document.createElement("tbody");
  for (const item of parsed.contract.inputs) appendValueRow(body, "Input", item.label, String(item.value));
  for (const item of parsed.contract.fields) appendValueRow(body, "Derived", item.label, `${evaluated.values.get(item.id)!.toFixed(item.precision)}${item.unit ? ` ${item.unit}` : ""}`);
  table.append(body); details.append(table);
  const notice = document.createElement("p"); notice.className = "hcc-widget__phase-notice"; notice.textContent = "Candidate extension · deterministic local calculation · no script evaluation or write effect.";
  article.append(title, summary, output, details, notice); container.replaceChildren(article);
}

function appendValueRow(body: HTMLTableSectionElement, kind: string, label: string, value: string): void {
  const row = document.createElement("tr"); for (const cell of [kind, label, value]) { const td = document.createElement("td"); td.textContent = cell; row.append(td); } body.append(row);
}

export function renderExtensionDiagnostics(container: HTMLElement, titleText: string, diagnostics: readonly ExtensionDiagnostic[], source: string): void {
  const article = document.createElement("article"); article.className = "hcc-widget hcc-widget--error"; article.setAttribute("role", "alert");
  const title = document.createElement("h3"); title.textContent = titleText; const list = document.createElement("ul");
  diagnostics.forEach((diagnostic) => { const item = document.createElement("li"); item.textContent = `${diagnostic.code} at ${diagnostic.path}: ${diagnostic.message}`; list.append(item); });
  const pre = document.createElement("pre"); const code = document.createElement("code"); code.textContent = source; pre.append(code); article.append(title, list, pre); container.replaceChildren(article);
}
