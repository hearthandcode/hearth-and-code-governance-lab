import yaml from "js-yaml";
import { renderExtensionDiagnostics, type ExtensionDiagnostic } from "./computed-field";
import { layoutRadarLabels } from "./radar-layout";

export const RADAR_VIEW_VERSION = "0.1-candidate.1" as const;
interface RadarRow { subject: string; dimension: string; value: number; scale: number }
interface RadarContract { version: typeof RADAR_VIEW_VERSION; id: string; kind: "radar"; title: string; summary: string; source: { mode: "inline"; digest: string }; data: RadarRow[] }
type RadarParseResult = { ok: true; contract: RadarContract; diagnostics: [] } | { ok: false; diagnostics: ExtensionDiagnostic[] };
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function text(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0 && value.length <= 256; }

export function parseRadarView(source: string): RadarParseResult {
  const diagnostics: ExtensionDiagnostic[] = []; let input: unknown;
  try { input = yaml.load(source, { schema: yaml.JSON_SCHEMA }); }
  catch (error) { return { ok: false, diagnostics: [{ code: "HCC-EXT-SCHEMA", path: "$", message: error instanceof Error ? error.message : "Invalid YAML." }] }; }
  if (!record(input)) return { ok: false, diagnostics: [{ code: "HCC-EXT-SCHEMA", path: "$", message: "Radar view must be an object." }] };
  const allowed = ["version", "id", "kind", "title", "summary", "source", "data"];
  Object.keys(input).filter((key) => !allowed.includes(key)).forEach((key) => diagnostics.push({ code: "HCC-EXT-UNKNOWN", path: `$.${key}`, message: "Unknown fields are not accepted." }));
  if (input.version !== RADAR_VIEW_VERSION) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: "$.version", message: `Only ${RADAR_VIEW_VERSION} is supported.` });
  if (input.kind !== "radar") diagnostics.push({ code: "HCC-EXT-SCHEMA", path: "$.kind", message: "Kind must be radar." });
  for (const key of ["id", "title", "summary"] as const) if (!text(input[key])) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: `$.${key}`, message: "A non-empty bounded string is required." });
  if (!record(input.source) || input.source.mode !== "inline" || !text(input.source.digest) || Object.keys(input.source).some((key) => !["mode", "digest"].includes(key))) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: "$.source", message: "Radar proof requires an inline source and non-empty digest." });
  const rows: RadarRow[] = [];
  if (!Array.isArray(input.data) || input.data.length < 3 || input.data.length > 96) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: "$.data", message: "Radar data requires 3 to 96 rows." });
  else input.data.forEach((item, index) => {
    const path = `$.data[${index}]`;
    if (!record(item) || Object.keys(item).some((key) => !["subject", "dimension", "value", "scale"].includes(key)) || !text(item.subject) || !text(item.dimension) || typeof item.value !== "number" || !Number.isFinite(item.value) || typeof item.scale !== "number" || !Number.isFinite(item.scale) || item.scale <= 0 || item.value < 0 || item.value > item.scale) diagnostics.push({ code: "HCC-EXT-SCHEMA", path, message: "Each row requires subject, dimension, and a finite value within a positive scale." });
    else rows.push({ subject: item.subject, dimension: item.dimension, value: item.value, scale: item.scale });
  });
  const dimensions = [...new Set(rows.map((row) => row.dimension))]; const subjects = [...new Set(rows.map((row) => row.subject))];
  if (dimensions.length < 3 || dimensions.length > 12) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: "$.data", message: "Radar views require 3 to 12 dimensions." });
  if (subjects.length < 1 || subjects.length > 8) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: "$.data", message: "Radar views support 1 to 8 subjects." });
  for (const subject of subjects) for (const dimension of dimensions) if (rows.filter((row) => row.subject === subject && row.dimension === dimension).length !== 1) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: "$.data", message: `Subject ${subject} must declare dimension ${dimension} exactly once.` });
  for (const dimension of dimensions) if (new Set(rows.filter((row) => row.dimension === dimension).map((row) => row.scale)).size !== 1) diagnostics.push({ code: "HCC-EXT-SCHEMA", path: "$.data", message: `Dimension ${dimension} must use one consistent scale.` });
  if (diagnostics.length || typeof input.id !== "string" || typeof input.title !== "string" || typeof input.summary !== "string" || !record(input.source) || typeof input.source.digest !== "string") return { ok: false, diagnostics };
  return { ok: true, diagnostics: [], contract: { version: RADAR_VIEW_VERSION, id: input.id, kind: "radar", title: input.title, summary: input.summary, source: { mode: "inline", digest: input.source.digest }, data: rows } };
}

export function renderRadarViewFence(container: HTMLElement, source: string): void {
  const parsed = parseRadarView(source); if (!parsed.ok) { renderExtensionDiagnostics(container, "Radar view could not be rendered", parsed.diagnostics, source); return; }
  const { contract } = parsed; const dimensions = [...new Set(contract.data.map((row) => row.dimension))]; const subjects = [...new Set(contract.data.map((row) => row.subject))];
  const article = document.createElement("article"); article.className = "hcc-extension hcc-extension--radar"; article.dataset.extension = "radar";
  const title = document.createElement("h4"); title.textContent = contract.title; const summary = document.createElement("p"); summary.textContent = contract.summary;
  const status = document.createElement("p"); status.className = "hcc-view__status"; status.textContent = "Candidate native SVG projection from inline data.";
  const provenance = document.createElement("small"); provenance.textContent = `Source: inline data · digest ${contract.source.digest}`;
  const layout = layoutRadarLabels(dimensions);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", `${layout.viewBox.left} ${layout.viewBox.top} ${layout.viewBox.width} ${layout.viewBox.height}`); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", `${contract.title}. ${contract.summary}`); svg.setAttribute("data-renderer-backend", "native-static-svg");
  const radius = layout.radius; const point = (index: number, ratio: number) => { const angle = -Math.PI / 2 + index * Math.PI * 2 / dimensions.length; return [Math.cos(angle) * radius * ratio, Math.sin(angle) * radius * ratio] as const; };
  for (let ring = 1; ring <= 4; ring += 1) { const polygon = document.createElementNS(svg.namespaceURI, "polygon"); polygon.setAttribute("points", dimensions.map((_, index) => point(index, ring / 4).join(",")).join(" ")); polygon.setAttribute("class", "hcc-radar__grid"); svg.append(polygon); }
  dimensions.forEach((dimension, index) => {
    const outer = point(index, 1);
    const axis = document.createElementNS(svg.namespaceURI, "line");
    axis.setAttribute("x1", "0"); axis.setAttribute("y1", "0");
    axis.setAttribute("x2", String(outer[0])); axis.setAttribute("y2", String(outer[1]));
    axis.setAttribute("class", "hcc-radar__axis"); svg.append(axis);

    const labelLayout = layout.labels[index]!;
    const leader = document.createElementNS(svg.namespaceURI, "line");
    leader.setAttribute("x1", String(outer[0])); leader.setAttribute("y1", String(outer[1]));
    leader.setAttribute("x2", String(labelLayout.x)); leader.setAttribute("y2", String(labelLayout.y));
    leader.setAttribute("class", "hcc-radar__leader"); svg.append(leader);
    const group = document.createElementNS(svg.namespaceURI, "g"); group.setAttribute("class", "hcc-radar__label-group");
    const plaque = document.createElementNS(svg.namespaceURI, "rect");
    plaque.setAttribute("x", String(labelLayout.bounds.left)); plaque.setAttribute("y", String(labelLayout.bounds.top));
    plaque.setAttribute("width", String(labelLayout.width)); plaque.setAttribute("height", String(labelLayout.height)); plaque.setAttribute("rx", "6");
    plaque.setAttribute("class", "hcc-radar__label-box");
    const label = document.createElementNS(svg.namespaceURI, "text");
    label.setAttribute("x", String(labelLayout.x)); label.setAttribute("y", String(labelLayout.y + 5));
    label.setAttribute("text-anchor", "middle"); label.setAttribute("class", "hcc-radar__label"); label.textContent = dimension;
    group.append(plaque, label); svg.append(group);
  });
  subjects.forEach((subject, subjectIndex) => { const rows = dimensions.map((dimension) => contract.data.find((row) => row.subject === subject && row.dimension === dimension)!); const polygon = document.createElementNS(svg.namespaceURI, "polygon") as SVGPolygonElement; polygon.setAttribute("points", rows.map((row, index) => point(index, row.value / row.scale).join(",")).join(" ")); polygon.setAttribute("class", "hcc-view__mark hcc-radar__series"); polygon.dataset.seriesIndex = String(subjectIndex); polygon.setAttribute("aria-label", subject); svg.append(polygon); });
  const legend = document.createElement("ul"); legend.className = "hcc-radar__legend"; subjects.forEach((subject, index) => { const item = document.createElement("li"); item.dataset.seriesIndex = String(index); item.textContent = subject; legend.append(item); });
  const details = document.createElement("details"); const detailsTitle = document.createElement("summary"); detailsTitle.textContent = "Accessible data table"; details.append(detailsTitle); const table = document.createElement("table"); const caption = document.createElement("caption"); caption.textContent = `${contract.title}: subject-by-dimension data`; table.append(caption); const head = document.createElement("thead"); const headRow = document.createElement("tr"); for (const value of ["Subject", ...dimensions]) { const th = document.createElement("th"); th.scope = "col"; th.textContent = value; headRow.append(th); } head.append(headRow); table.append(head); const body = document.createElement("tbody"); subjects.forEach((subject) => { const row = document.createElement("tr"); const heading = document.createElement("th"); heading.scope = "row"; heading.textContent = subject; row.append(heading); dimensions.forEach((dimension) => { const datum = contract.data.find((item) => item.subject === subject && item.dimension === dimension)!; const cell = document.createElement("td"); cell.textContent = `${datum.value} / ${datum.scale}`; row.append(cell); }); body.append(row); }); table.append(body); details.append(table);
  const notice = document.createElement("p"); notice.className = "hcc-widget__phase-notice"; notice.textContent = "Candidate extension · native static SVG with table parity · no source or vault write effect.";
  article.append(title, summary, status, provenance, svg, legend, details, notice); container.replaceChildren(article);
}
