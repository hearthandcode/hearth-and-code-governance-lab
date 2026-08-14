import {
  HCC_VIEW_KINDS,
  HCC_VIEW_VERSION,
  type HccViewKind,
  type ViewDiagnostic,
  type ViewEncoding,
  type ViewRow,
  type ViewScalar,
  type ViewSource,
  type ViewValidationResult
} from "./types";

const ROOT_KEYS = ["version", "id", "kind", "title", "summary", "source", "encoding", "data"] as const;
const SOURCE_KEYS = ["mode", "path", "digest"] as const;
const ENCODING_KEYS: Record<HccViewKind, readonly string[]> = {
  metric: ["kind", "value", "label"],
  table: ["kind", "columns"],
  bar: ["kind", "category", "value"],
  timeline: ["kind", "date", "label"],
  xy: ["kind", "x", "y", "mark"],
  heatmap: ["kind", "x", "y", "value"],
  hierarchy: ["kind", "id", "parent", "value"],
  network: ["kind", "node", "source", "target"],
  donut: ["kind", "category", "value"],
  stacked_bar: ["kind", "category", "series", "value"],
  area: ["kind", "x", "y"],
  histogram: ["kind", "value", "bins"],
  box_plot: ["kind", "category", "value"],
  gauge: ["kind", "value", "min", "max"],
  calendar_heatmap: ["kind", "date", "value"],
  treemap: ["kind", "label", "value", "group"],
  bullet: ["kind", "category", "value", "target", "max"],
  lollipop: ["kind", "category", "value"],
  dot_plot: ["kind", "category", "value"],
  range_bar: ["kind", "category", "start", "end"],
  slope: ["kind", "category", "start", "end"],
  waterfall: ["kind", "category", "value"],
  funnel: ["kind", "stage", "value"],
  waffle: ["kind", "category", "value"]
};
const MAX_ROWS = 512;
const MAX_FIELDS_PER_ROW = 64;
const MAX_TEXT_LENGTH = 4096;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function scalar(value: unknown): value is ViewScalar {
  return value === null
    || typeof value === "string" && value.length <= MAX_TEXT_LENGTH
    || typeof value === "boolean"
    || typeof value === "number" && Number.isFinite(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function unknownKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): ViewDiagnostic[] {
  return Object.keys(value)
    .filter((key) => !allowed.includes(key))
    .map((key) => ({ code: "HCC-VIEW-UNKNOWN" as const, path: `${path}.${key}`, message: "Unknown fields are not accepted." }));
}

function validVaultPath(path: string): boolean {
  const segments = path.split("/");
  return !path.startsWith("/")
    && !path.includes("\\")
    && segments.every((segment) => segment !== "" && segment !== ".." && !segment.startsWith("."))
    && !/^[a-z][a-z0-9+.-]*:/i.test(path)
    && /\.(?:json|ya?ml)$/i.test(path);
}

function parseRows(value: unknown, diagnostics: ViewDiagnostic[]): ViewRow[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    diagnostics.push({ code: "HCC-VIEW-SCHEMA", path: "$.data", message: "Data must be an array of flat scalar rows." });
    return undefined;
  }
  if (value.length > MAX_ROWS) {
    diagnostics.push({ code: "HCC-VIEW-SCHEMA", path: "$.data", message: `Data is capped at ${MAX_ROWS} rows.` });
    return undefined;
  }
  const rows: ViewRow[] = [];
  value.forEach((item, index) => {
    if (!record(item) || Object.keys(item).length > MAX_FIELDS_PER_ROW || Object.values(item).some((cell) => !scalar(cell))) {
      diagnostics.push({ code: "HCC-VIEW-SCHEMA", path: `$.data[${index}]`, message: "Each row must contain only string, number, boolean, or null values." });
      return;
    }
    rows.push({ ...item } as ViewRow);
  });
  return rows;
}

function parseSource(value: unknown, diagnostics: ViewDiagnostic[]): ViewSource | undefined {
  if (!record(value)) {
    diagnostics.push({ code: "HCC-VIEW-SCHEMA", path: "$.source", message: "A provenance source is required." });
    return undefined;
  }
  diagnostics.push(...unknownKeys(value, SOURCE_KEYS, "$.source"));
  if ((value.mode !== "inline" && value.mode !== "vault") || !text(value.digest)) {
    diagnostics.push({ code: "HCC-VIEW-SOURCE", path: "$.source", message: "Source mode and non-empty digest are required." });
    return undefined;
  }
  if (value.mode === "inline") {
    if (value.path !== undefined) diagnostics.push({ code: "HCC-VIEW-UNKNOWN", path: "$.source.path", message: "Inline sources cannot declare a path." });
    return { mode: "inline", digest: value.digest };
  }
  if (!text(value.path) || !validVaultPath(value.path)) {
    diagnostics.push({ code: "HCC-VIEW-SOURCE", path: "$.source.path", message: "Vault sources require an explicit non-hidden vault-relative YAML or JSON path without traversal or a URI scheme." });
    return undefined;
  }
  if (!/^sha256:[a-f0-9]{64}$/i.test(value.digest)) {
    diagnostics.push({ code: "HCC-VIEW-SOURCE", path: "$.source.digest", message: "Vault sources require a full sha256 hexadecimal digest." });
    return undefined;
  }
  return { mode: "vault", path: value.path, digest: value.digest };
}

function parseEncoding(value: unknown, kind: HccViewKind, diagnostics: ViewDiagnostic[]): ViewEncoding | undefined {
  if (!record(value)) {
    diagnostics.push({ code: "HCC-VIEW-SCHEMA", path: "$.encoding", message: "A declarative encoding is required." });
    return undefined;
  }
  diagnostics.push(...unknownKeys(value, ENCODING_KEYS[kind], "$.encoding"));
  if (value.kind !== kind) {
    diagnostics.push({ code: "HCC-VIEW-SEMANTIC", path: "$.encoding.kind", message: "Encoding kind must match the view kind." });
    return undefined;
  }
  const requiredByKind: Record<HccViewKind, string[]> = {
    metric: ["value"], table: ["columns"], bar: ["category", "value"], timeline: ["date", "label"],
    xy: ["x", "y", "mark"], heatmap: ["x", "y", "value"], hierarchy: ["id", "parent"], network: ["node", "source", "target"],
    donut: ["category", "value"], stacked_bar: ["category", "series", "value"], area: ["x", "y"],
    histogram: ["value"], box_plot: ["category", "value"], gauge: ["value"],
    calendar_heatmap: ["date", "value"], treemap: ["label", "value"],
    bullet: ["category", "value", "target", "max"], lollipop: ["category", "value"], dot_plot: ["category", "value"],
    range_bar: ["category", "start", "end"], slope: ["category", "start", "end"], waterfall: ["category", "value"],
    funnel: ["stage", "value"], waffle: ["category", "value"]
  };
  const invalid = requiredByKind[kind].some((key) => key === "columns"
    ? !Array.isArray(value[key]) || value[key].length === 0 || value[key].some((item) => !text(item))
    : !text(value[key]));
  const histogramInvalid = kind === "histogram" && (!Number.isInteger(value.bins) || (value.bins as number) < 2 || (value.bins as number) > 64);
  const gaugeInvalid = kind === "gauge" && (typeof value.min !== "number" || !Number.isFinite(value.min) || typeof value.max !== "number" || !Number.isFinite(value.max) || value.min >= value.max);
  if (invalid || (kind === "xy" && value.mark !== "line" && value.mark !== "scatter") || histogramInvalid || gaugeInvalid) {
    diagnostics.push({ code: "HCC-VIEW-SCHEMA", path: "$.encoding", message: "Encoding fields must be non-empty and use an admitted value." });
    return undefined;
  }
  if ((kind === "metric" && value.label !== undefined && !text(value.label))
    || (kind === "hierarchy" && value.value !== undefined && !text(value.value))
    || (kind === "treemap" && value.group !== undefined && !text(value.group))) {
    diagnostics.push({ code: "HCC-VIEW-SCHEMA", path: "$.encoding", message: "Optional encoding fields must be non-empty strings when present." });
    return undefined;
  }
  return { ...value } as ViewEncoding;
}

function referencedFields(encoding: ViewEncoding): string[] {
  switch (encoding.kind) {
    case "metric": return [encoding.value, ...(encoding.label ? [encoding.label] : [])];
    case "table": return encoding.columns;
    case "bar": return [encoding.category, encoding.value];
    case "timeline": return [encoding.date, encoding.label];
    case "xy": return [encoding.x, encoding.y];
    case "heatmap": return [encoding.x, encoding.y, encoding.value];
    case "hierarchy": return [encoding.id, encoding.parent, ...(encoding.value ? [encoding.value] : [])];
    case "network": return [encoding.node, encoding.source, encoding.target];
    case "donut": return [encoding.category, encoding.value];
    case "stacked_bar": return [encoding.category, encoding.series, encoding.value];
    case "area": return [encoding.x, encoding.y];
    case "histogram": return [encoding.value];
    case "box_plot": return [encoding.category, encoding.value];
    case "gauge": return [encoding.value];
    case "calendar_heatmap": return [encoding.date, encoding.value];
    case "treemap": return [encoding.label, encoding.value, ...(encoding.group ? [encoding.group] : [])];
    case "bullet": return [encoding.category, encoding.value, encoding.target, encoding.max];
    case "lollipop": return [encoding.category, encoding.value];
    case "dot_plot": return [encoding.category, encoding.value];
    case "range_bar": return [encoding.category, encoding.start, encoding.end];
    case "slope": return [encoding.category, encoding.start, encoding.end];
    case "waterfall": return [encoding.category, encoding.value];
    case "funnel": return [encoding.stage, encoding.value];
    case "waffle": return [encoding.category, encoding.value];
  }
}

export function validateHccViewCandidate(input: unknown): ViewValidationResult {
  const diagnostics: ViewDiagnostic[] = [];
  if (!record(input)) return { ok: false, diagnostics: [{ code: "HCC-VIEW-SCHEMA", path: "$", message: "View must be an object." }] };
  diagnostics.push(...unknownKeys(input, ROOT_KEYS, "$"));
  if (input.version !== HCC_VIEW_VERSION) diagnostics.push({ code: "HCC-VIEW-SCHEMA", path: "$.version", message: `Only ${HCC_VIEW_VERSION} is supported.` });
  if (!text(input.id)) diagnostics.push({ code: "HCC-VIEW-SCHEMA", path: "$.id", message: "A non-empty ID is required." });
  if (!HCC_VIEW_KINDS.includes(input.kind as HccViewKind)) diagnostics.push({ code: "HCC-VIEW-SCHEMA", path: "$.kind", message: "Unknown projection kind." });
  if (!text(input.title)) diagnostics.push({ code: "HCC-VIEW-SCHEMA", path: "$.title", message: "An accessible title is required." });
  if (!text(input.summary)) diagnostics.push({ code: "HCC-VIEW-SCHEMA", path: "$.summary", message: "An accessible summary is required." });
  const kind = HCC_VIEW_KINDS.includes(input.kind as HccViewKind) ? input.kind as HccViewKind : undefined;
  const source = parseSource(input.source, diagnostics);
  const encoding = kind ? parseEncoding(input.encoding, kind, diagnostics) : undefined;
  const data = parseRows(input.data, diagnostics);
  if (source?.mode === "inline" && data === undefined) diagnostics.push({ code: "HCC-VIEW-SOURCE", path: "$.data", message: "Inline sources require inline data." });
  if (source?.mode === "vault" && data !== undefined) diagnostics.push({ code: "HCC-VIEW-SOURCE", path: "$.data", message: "Vault-bound candidates cannot embed data; an adapter must supply a digest-matched resolution." });
  if (encoding && data) {
    const fields = referencedFields(encoding);
    data.forEach((row, index) => fields.forEach((field) => {
      if (!(field in row)) diagnostics.push({ code: "HCC-VIEW-SEMANTIC", path: `$.data[${index}].${field}`, message: "Encoded field is absent from this row." });
    }));
  }
  if (diagnostics.length > 0 || !kind || !source || !encoding || !text(input.id) || !text(input.title) || !text(input.summary)) return { ok: false, diagnostics };
  return { ok: true, diagnostics: [], view: {
    version: HCC_VIEW_VERSION, id: input.id, kind, title: input.title, summary: input.summary,
    source, encoding, ...(data === undefined ? {} : { data })
  } };
}
