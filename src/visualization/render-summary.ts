import type { HccViewModel } from "./types";
import { addText, baseSvg, label, number, svgElement } from "./svg";

export function renderGauge(model: HccViewModel): SVGSVGElement {
  const svg = baseSvg(model); const encoding = model.encoding;
  if (encoding.kind !== "gauge") return svg;
  const value = number(model.rows[0] ?? {}, encoding.value); const ratio = Math.max(0, Math.min(1, (value - encoding.min) / (encoding.max - encoding.min)));
  const background = svgElement("rect"); background.setAttribute("x", "70"); background.setAttribute("y", "100"); background.setAttribute("width", "500"); background.setAttribute("height", "42"); background.setAttribute("fill", "none"); background.setAttribute("stroke", "currentColor"); svg.append(background);
  const fill = svgElement("rect"); fill.setAttribute("x", "70"); fill.setAttribute("y", "100"); fill.setAttribute("width", String(500 * ratio)); fill.setAttribute("height", "42"); fill.setAttribute("fill", "currentColor"); fill.setAttribute("class", "hcc-view__mark"); svg.append(fill);
  addText(svg, 70, 165, String(encoding.min)); addText(svg, 570, 165, String(encoding.max), "end"); addText(svg, 320, 90, String(value), "middle"); return svg;
}

export function renderMetric(model: HccViewModel): HTMLElement {
  const output = document.createElement("div"); output.className = "hcc-view__metric";
  if (model.encoding.kind !== "metric") return output;
  const first = model.rows[0];
  const value = document.createElement("strong"); value.textContent = label(first?.[model.encoding.value]); output.appendChild(value);
  const caption = document.createElement("span"); caption.textContent = model.encoding.label ? label(first?.[model.encoding.label]) : model.title; output.appendChild(caption);
  return output;
}

export function appendTable(parent: HTMLElement, model: HccViewModel): void {
  const table = document.createElement("table");
  const caption = document.createElement("caption"); caption.textContent = `${model.title}: accessible data fallback`; table.appendChild(caption);
  const head = document.createElement("thead"); const headRow = document.createElement("tr");
  model.fallback.columns.forEach((column) => { const th = document.createElement("th"); th.scope = "col"; th.textContent = column; headRow.appendChild(th); });
  head.appendChild(headRow); table.appendChild(head);
  const body = document.createElement("tbody");
  model.fallback.rows.forEach((row) => { const tr = document.createElement("tr"); row.forEach((cell) => { const td = document.createElement("td"); td.textContent = cell; tr.appendChild(td); }); body.appendChild(tr); });
  table.appendChild(body); parent.appendChild(table);
}
