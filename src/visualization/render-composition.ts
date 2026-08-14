import type { HccViewModel } from "./types";
import { addText, baseSvg, label, number, svgElement } from "./svg";

export function renderDonut(model: HccViewModel): SVGSVGElement {
  const svg = baseSvg(model); const encoding = model.encoding;
  if (encoding.kind !== "donut") return svg;
  const values = model.rows.map((row) => Math.max(0, number(row, encoding.value)));
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  let offset = 0;
  model.rows.forEach((row, index) => {
    const segment = svgElement("circle"); const share = values[index] / total;
    segment.setAttribute("cx", "235"); segment.setAttribute("cy", "130"); segment.setAttribute("r", "75");
    segment.setAttribute("fill", "none"); segment.setAttribute("stroke", "currentColor"); segment.setAttribute("stroke-width", "34");
    segment.setAttribute("pathLength", "100"); segment.setAttribute("stroke-dasharray", `${share * 100} ${100 - share * 100}`);
    segment.setAttribute("stroke-dashoffset", String(-offset * 100)); segment.setAttribute("opacity", String(0.35 + 0.65 * (index + 1) / model.rows.length));
    segment.setAttribute("transform", "rotate(-90 235 130)"); segment.setAttribute("class", "hcc-view__mark"); svg.append(segment);
    addText(svg, 365, 35 + index * 24, `${label(row[encoding.category])}: ${label(row[encoding.value])}`);
    offset += share;
  });
  return svg;
}

export function renderStackedBar(model: HccViewModel): SVGSVGElement {
  const svg = baseSvg(model); const encoding = model.encoding;
  if (encoding.kind !== "stacked_bar") return svg;
  const categories = [...new Set(model.rows.map((row) => label(row[encoding.category])))];
  const totals = categories.map((category) => model.rows.filter((row) => label(row[encoding.category]) === category).reduce((sum, row) => sum + Math.max(0, number(row, encoding.value)), 0));
  const max = Math.max(1, ...totals);
  categories.forEach((category, categoryIndex) => {
    const rows = model.rows.filter((row) => label(row[encoding.category]) === category); let x = 150; const y = 24 + categoryIndex * Math.min(42, 210 / categories.length);
    addText(svg, 140, y + 18, category, "end");
    rows.forEach((row, index) => {
      const width = Math.max(0, number(row, encoding.value)) / max * 430; const rect = svgElement("rect");
      rect.setAttribute("x", String(x)); rect.setAttribute("y", String(y)); rect.setAttribute("width", String(width)); rect.setAttribute("height", "26");
      rect.setAttribute("fill", "currentColor"); rect.setAttribute("opacity", String(0.35 + 0.65 * (index + 1) / rows.length)); rect.setAttribute("class", "hcc-view__mark"); svg.append(rect); x += width;
    });
  });
  return svg;
}

export function renderTreemap(model: HccViewModel): SVGSVGElement {
  const svg = baseSvg(model); const encoding = model.encoding;
  if (encoding.kind !== "treemap") return svg;
  const values = model.rows.map((row) => Math.max(0, number(row, encoding.value))); const total = values.reduce((sum, value) => sum + value, 0) || 1; let x = 35;
  model.rows.forEach((row, index) => { const width = values[index] / total * 570; const rect = svgElement("rect"); rect.setAttribute("x", String(x)); rect.setAttribute("y", "35"); rect.setAttribute("width", String(width)); rect.setAttribute("height", "180"); rect.setAttribute("fill", "currentColor"); rect.setAttribute("opacity", String(.3 + .7 * (index + 1) / model.rows.length)); rect.setAttribute("class", "hcc-view__mark"); svg.append(rect); if (width > 55) addText(svg, x + width / 2, 130, label(row[encoding.label]), "middle"); x += width;
  }); return svg;
}
