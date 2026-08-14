import type { HccViewModel } from "./types";
import { addText, baseSvg, label, number, scale, svgElement } from "./svg";

export function renderArea(model: HccViewModel): SVGSVGElement {
  const svg = baseSvg(model); const encoding = model.encoding;
  if (encoding.kind !== "area") return svg;
  const sx = scale(model.rows.map((row) => number(row, encoding.x)), 45, 600); const sy = scale(model.rows.map((row) => number(row, encoding.y)), 220, 25);
  const sorted = [...model.rows].sort((a, b) => number(a, encoding.x) - number(b, encoding.x));
  const polygon = svgElement("polygon");
  polygon.setAttribute("points", [`${sx(number(sorted[0] ?? {}, encoding.x))},220`, ...sorted.map((row) => `${sx(number(row, encoding.x))},${sy(number(row, encoding.y))}`), `${sx(number(sorted.at(-1) ?? {}, encoding.x))},220`].join(" "));
  polygon.setAttribute("fill", "currentColor"); polygon.setAttribute("opacity", "0.35"); polygon.setAttribute("class", "hcc-view__mark"); svg.append(polygon);
  return svg;
}

export function renderCalendarHeatmap(model: HccViewModel): SVGSVGElement {
  const svg = baseSvg(model); const encoding = model.encoding;
  if (encoding.kind !== "calendar_heatmap") return svg;
  const max = Math.max(1, ...model.rows.map((row) => Math.abs(number(row, encoding.value))));
  model.rows.forEach((row, index) => { const rect = svgElement("rect"); const column = Math.floor(index / 7); const day = index % 7;
    rect.setAttribute("x", String(65 + column * 18)); rect.setAttribute("y", String(35 + day * 28)); rect.setAttribute("width", "15"); rect.setAttribute("height", "22"); rect.setAttribute("fill", "currentColor"); rect.setAttribute("opacity", String(.15 + .85 * Math.abs(number(row, encoding.value)) / max)); rect.setAttribute("class", "hcc-view__mark"); svg.append(rect);
  }); return svg;
}

export function renderTimeline(model: HccViewModel): SVGSVGElement {
  const svg = baseSvg(model);
  const encoding = model.encoding;
  if (encoding.kind !== "timeline") return svg;
  const line = svgElement("line");
  line.setAttribute("x1", "45"); line.setAttribute("x2", "595"); line.setAttribute("y1", "125"); line.setAttribute("y2", "125");
  line.setAttribute("class", "hcc-view__axis"); svg.appendChild(line);
  line.setAttribute("stroke", "currentColor");
  model.rows.forEach((row, index) => {
    const x = model.rows.length === 1 ? 320 : 45 + index * (550 / (model.rows.length - 1));
    const circle = svgElement("circle"); circle.setAttribute("cx", String(x)); circle.setAttribute("cy", "125"); circle.setAttribute("r", "6"); circle.setAttribute("fill", "currentColor"); circle.setAttribute("class", "hcc-view__mark"); svg.appendChild(circle);
    addText(svg, x, index % 2 === 0 ? 92 : 165, label(row[encoding.label]), "middle");
    addText(svg, x, index % 2 === 0 ? 108 : 181, label(row[encoding.date]), "middle");
  });
  return svg;
}
