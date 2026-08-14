import type {
  HccViewCandidate,
  HccViewModel,
  ResolvedViewSource,
  ViewDiagnostic,
  ViewEncoding,
  ViewRow,
  ViewScalar,
  ViewTableFallback
} from "./types";

function display(value: ViewScalar | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function fieldsFor(encoding: ViewEncoding): string[] {
  switch (encoding.kind) {
    case "metric": return [encoding.label ?? "label", encoding.value];
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

function fallbackFor(encoding: ViewEncoding, rows: ViewRow[]): ViewTableFallback {
  const columns = [...new Set(fieldsFor(encoding))];
  return { columns, rows: rows.map((row) => columns.map((column) => display(row[column]))) };
}

function semanticDiagnostics(encoding: ViewEncoding, rows: ViewRow[]): ViewDiagnostic[] {
  const diagnostics: ViewDiagnostic[] = [];
  const numeric = encoding.kind === "metric" ? [encoding.value]
    : encoding.kind === "bar" ? [encoding.value]
    : encoding.kind === "xy" ? [encoding.x, encoding.y]
    : encoding.kind === "heatmap" ? [encoding.value]
    : encoding.kind === "hierarchy" && encoding.value ? [encoding.value] : [];
  if (encoding.kind === "donut" || encoding.kind === "stacked_bar" || encoding.kind === "histogram" || encoding.kind === "box_plot" || encoding.kind === "gauge" || encoding.kind === "calendar_heatmap" || encoding.kind === "treemap") numeric.push(encoding.value);
  if (encoding.kind === "area") numeric.push(encoding.x, encoding.y);
  if (encoding.kind === "bullet") numeric.push(encoding.value, encoding.target, encoding.max);
  if (encoding.kind === "lollipop" || encoding.kind === "dot_plot" || encoding.kind === "waterfall" || encoding.kind === "funnel" || encoding.kind === "waffle") numeric.push(encoding.value);
  if (encoding.kind === "range_bar" || encoding.kind === "slope") numeric.push(encoding.start, encoding.end);
  rows.forEach((row, index) => numeric.forEach((field) => {
    if (typeof row[field] !== "number" || !Number.isFinite(row[field])) diagnostics.push({ code: "HCC-VIEW-SEMANTIC", path: `$.data[${index}].${field}`, message: "This encoded field requires a finite number." });
  }));
  if (encoding.kind === "donut" || encoding.kind === "stacked_bar" || encoding.kind === "treemap") {
    rows.forEach((row, index) => {
      const value = row[encoding.value];
      if (typeof value === "number" && value < 0) diagnostics.push({ code: "HCC-VIEW-SEMANTIC", path: `$.data[${index}].${encoding.value}`, message: "This projection requires a non-negative value." });
    });
  }
  if (encoding.kind === "gauge") {
    rows.forEach((row, index) => {
      const value = row[encoding.value];
      if (typeof value === "number" && (value < encoding.min || value > encoding.max)) diagnostics.push({ code: "HCC-VIEW-SEMANTIC", path: `$.data[${index}].${encoding.value}`, message: "Gauge value must remain within its declared bounds." });
    });
  }
  if (encoding.kind === "bullet") {
    rows.forEach((row, index) => {
      const value = row[encoding.value]; const target = row[encoding.target]; const max = row[encoding.max];
      if (typeof value === "number" && typeof target === "number" && typeof max === "number" && (max <= 0 || value < 0 || target < 0 || value > max || target > max)) diagnostics.push({ code: "HCC-VIEW-SEMANTIC", path: `$.data[${index}]`, message: "Bullet value and target must remain between zero and a positive max." });
    });
  }
  if (encoding.kind === "range_bar" || encoding.kind === "slope") {
    rows.forEach((row, index) => {
      const start = row[encoding.start]; const end = row[encoding.end];
      if (typeof start === "number" && typeof end === "number" && start > end) diagnostics.push({ code: "HCC-VIEW-SEMANTIC", path: `$.data[${index}]`, message: "Start must not exceed end." });
    });
  }
  if (encoding.kind === "funnel") {
    rows.forEach((row, index) => { const value = row[encoding.value]; if (typeof value === "number" && value < 0) diagnostics.push({ code: "HCC-VIEW-SEMANTIC", path: `$.data[${index}].${encoding.value}`, message: "Funnel stages require non-negative values." }); });
  }
  if (encoding.kind === "waffle") {
    rows.forEach((row, index) => { const value = row[encoding.value]; if (typeof value === "number" && value < 0) diagnostics.push({ code: "HCC-VIEW-SEMANTIC", path: `$.data[${index}].${encoding.value}`, message: "Waffle categories require non-negative values." }); });
  }
  if (encoding.kind === "timeline" || encoding.kind === "calendar_heatmap") {
    const dateField = encoding.date;
    rows.forEach((row, index) => {
      const value = row[dateField];
      if (typeof value !== "string" || !isIsoDate(value)) diagnostics.push({ code: "HCC-VIEW-SEMANTIC", path: `$.data[${index}].${dateField}`, message: "This projection requires an ISO calendar date." });
    });
  }
  return diagnostics;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number); const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function buildHccViewModel(view: HccViewCandidate, resolved?: ResolvedViewSource): HccViewModel {
  let rows: ViewRow[] = view.data?.map((row) => ({ ...row })) ?? [];
  let state: HccViewModel["state"] = rows.length === 0 ? "empty" : "ready";
  let stateMessage = rows.length === 0 ? "No data is available for this projection." : "Static local projection.";
  const diagnostics: ViewDiagnostic[] = [];

  if (view.source.mode === "vault") {
    if (!resolved || resolved.path !== view.source.path) {
      state = "stale";
      stateMessage = "Vault source is unresolved; no cached projection is shown.";
      rows = [];
    } else if (resolved.digest !== view.source.digest) {
      state = "stale";
      stateMessage = "Vault source digest changed; projection is withheld until reviewed.";
      rows = [];
    } else {
      rows = resolved.rows.map((row) => ({ ...row }));
      state = rows.length === 0 ? "empty" : "ready";
      stateMessage = rows.length === 0 ? "The resolved source contains no rows." : "Static local projection from a digest-matched vault source.";
    }
  }
  diagnostics.push(...semanticDiagnostics(view.encoding, rows));
  if (diagnostics.length > 0) {
    state = "invalid";
    stateMessage = "Projection data does not satisfy its encoding.";
  }
  return {
    id: view.id, kind: view.kind, title: view.title, summary: view.summary,
    sourceLabel: view.source.mode === "inline" ? "inline data" : view.source.path,
    sourceDigest: view.source.digest, state, stateMessage, encoding: view.encoding,
    rows, fallback: fallbackFor(view.encoding, rows), diagnostics, rendererBackend: "native-static-svg"
  };
}
