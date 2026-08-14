import type { HccViewModel } from "./types";
import { addText, baseSvg, label, number, scale, svgElement } from "./svg";

export function renderHistogram(model: HccViewModel): SVGSVGElement {
  const svg = baseSvg(model); const encoding = model.encoding;
  if (encoding.kind !== "histogram") return svg;
  const values = model.rows.map((row) => number(row, encoding.value)); const min = Math.min(...values); const max = Math.max(...values); const width = (max - min || 1) / encoding.bins;
  const counts = Array.from({ length: encoding.bins }, () => 0);
  values.forEach((value) => { const index = Math.min(encoding.bins - 1, Math.floor((value - min) / width)); counts[index] += 1; });
  const peak = Math.max(1, ...counts);
  counts.forEach((count, index) => { const rect = svgElement("rect"); const barWidth = 550 / counts.length;
    rect.setAttribute("x", String(45 + index * barWidth)); rect.setAttribute("y", String(220 - count / peak * 180)); rect.setAttribute("width", String(Math.max(1, barWidth - 2))); rect.setAttribute("height", String(count / peak * 180)); rect.setAttribute("fill", "currentColor"); rect.setAttribute("class", "hcc-view__mark"); svg.append(rect);
  });
  return svg;
}

function quantile(sorted: number[], fraction: number): number { return sorted[Math.round((sorted.length - 1) * fraction)] ?? 0; }
export function renderBoxPlot(model: HccViewModel): SVGSVGElement {
  const svg = baseSvg(model); const encoding = model.encoding;
  if (encoding.kind !== "box_plot") return svg;
  const categories = [...new Set(model.rows.map((row) => label(row[encoding.category])))]; const all = model.rows.map((row) => number(row, encoding.value)); const sx = scale(all, 170, 600);
  categories.forEach((category, index) => { const values = model.rows.filter((row) => label(row[encoding.category]) === category).map((row) => number(row, encoding.value)).sort((a, b) => a - b); const y = 35 + index * Math.min(42, 200 / categories.length);
    const low = values[0] ?? 0; const q1 = quantile(values, .25); const median = quantile(values, .5); const q3 = quantile(values, .75); const high = values.at(-1) ?? 0;
    addText(svg, 155, y + 5, category, "end"); const line = svgElement("line"); line.setAttribute("x1", String(sx(low))); line.setAttribute("x2", String(sx(high))); line.setAttribute("y1", String(y)); line.setAttribute("y2", String(y)); line.setAttribute("stroke", "currentColor"); svg.append(line);
    const box = svgElement("rect"); box.setAttribute("x", String(sx(q1))); box.setAttribute("y", String(y - 12)); box.setAttribute("width", String(Math.max(1, sx(q3) - sx(q1)))); box.setAttribute("height", "24"); box.setAttribute("fill", "none"); box.setAttribute("stroke", "currentColor"); box.setAttribute("class", "hcc-view__mark"); svg.append(box);
    const mid = svgElement("line"); mid.setAttribute("x1", String(sx(median))); mid.setAttribute("x2", String(sx(median))); mid.setAttribute("y1", String(y - 12)); mid.setAttribute("y2", String(y + 12)); mid.setAttribute("stroke", "currentColor"); svg.append(mid);
  }); return svg;
}
