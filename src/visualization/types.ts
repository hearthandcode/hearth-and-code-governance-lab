export const HCC_VIEW_VERSION = "0.2-candidate.1" as const;

export const HCC_VIEW_KINDS = [
  "metric",
  "table",
  "bar",
  "timeline",
  "xy",
  "heatmap",
  "hierarchy",
  "network",
  "donut",
  "stacked_bar",
  "area",
  "histogram",
  "box_plot",
  "gauge",
  "calendar_heatmap",
  "treemap",
  "bullet",
  "lollipop",
  "dot_plot",
  "range_bar",
  "slope",
  "waterfall",
  "funnel",
  "waffle"
] as const;

export type HccViewKind = (typeof HCC_VIEW_KINDS)[number];
export type ViewScalar = string | number | boolean | null;
export type ViewRow = Record<string, ViewScalar>;

export interface InlineViewSource {
  mode: "inline";
  digest: string;
}

export interface VaultViewSource {
  mode: "vault";
  path: string;
  digest: string;
}

export type ViewSource = InlineViewSource | VaultViewSource;

export type ViewEncoding =
  | { kind: "metric"; value: string; label?: string }
  | { kind: "table"; columns: string[] }
  | { kind: "bar"; category: string; value: string }
  | { kind: "timeline"; date: string; label: string }
  | { kind: "xy"; x: string; y: string; mark: "line" | "scatter" }
  | { kind: "heatmap"; x: string; y: string; value: string }
  | { kind: "hierarchy"; id: string; parent: string; value?: string }
  | { kind: "network"; node: string; source: string; target: string }
  | { kind: "donut"; category: string; value: string }
  | { kind: "stacked_bar"; category: string; series: string; value: string }
  | { kind: "area"; x: string; y: string }
  | { kind: "histogram"; value: string; bins: number }
  | { kind: "box_plot"; category: string; value: string }
  | { kind: "gauge"; value: string; min: number; max: number }
  | { kind: "calendar_heatmap"; date: string; value: string }
  | { kind: "treemap"; label: string; value: string; group?: string }
  | { kind: "bullet"; category: string; value: string; target: string; max: string }
  | { kind: "lollipop"; category: string; value: string }
  | { kind: "dot_plot"; category: string; value: string }
  | { kind: "range_bar"; category: string; start: string; end: string }
  | { kind: "slope"; category: string; start: string; end: string }
  | { kind: "waterfall"; category: string; value: string }
  | { kind: "funnel"; stage: string; value: string }
  | { kind: "waffle"; category: string; value: string };

export interface HccViewCandidate {
  version: typeof HCC_VIEW_VERSION;
  id: string;
  kind: HccViewKind;
  title: string;
  summary: string;
  source: ViewSource;
  encoding: ViewEncoding;
  data?: ViewRow[];
}

export interface ResolvedViewSource {
  path: string;
  digest: string;
  rows: ViewRow[];
}

export interface ViewDiagnostic {
  code: "HCC-VIEW-SCHEMA" | "HCC-VIEW-UNKNOWN" | "HCC-VIEW-SEMANTIC" | "HCC-VIEW-SOURCE";
  path: string;
  message: string;
}

export type ViewValidationResult =
  | { ok: true; view: HccViewCandidate; diagnostics: [] }
  | { ok: false; diagnostics: ViewDiagnostic[] };

export type ViewModelState = "ready" | "empty" | "stale" | "invalid";

export interface ViewTableFallback {
  columns: string[];
  rows: string[][];
}

export interface HccViewModel {
  id: string;
  kind: HccViewKind;
  title: string;
  summary: string;
  sourceLabel: string;
  sourceDigest: string;
  state: ViewModelState;
  stateMessage: string;
  encoding: ViewEncoding;
  rows: ViewRow[];
  fallback: ViewTableFallback;
  diagnostics: ViewDiagnostic[];
  rendererBackend: "native-static-svg";
}

/** A narrow seam for a future reviewed renderer such as modular D3. */
export interface HccViewRendererBackend {
  readonly id: string;
  readonly supportedKinds: readonly HccViewKind[];
  render(model: HccViewModel, container: HTMLElement): void;
}
