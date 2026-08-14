import type { HccViewModel } from "./types";
import { addText, baseSvg, label, number, scale, svgElement } from "./svg";

export function renderBar(model: HccViewModel): SVGSVGElement {
  const svg = baseSvg(model);
  const encoding = model.encoding;
  if (encoding.kind !== "bar") return svg;
  const values = model.rows.map((row) => number(row, encoding.value));
  const max = Math.max(0, ...values);
  const rowHeight = Math.min(36, 210 / Math.max(1, values.length));
  model.rows.forEach((row, index) => {
    const y = 20 + index * rowHeight;
    const rect = svgElement("rect");
    rect.setAttribute("x", "160");
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", String(max === 0 ? 0 : (number(row, encoding.value) / max) * 430));
    rect.setAttribute("height", String(Math.max(4, rowHeight - 8)));
    rect.setAttribute("fill", "currentColor");
    rect.setAttribute("class", "hcc-view__mark");
    svg.appendChild(rect);
    addText(svg, 150, y + rowHeight / 2 + 4, label(row[encoding.category]), "end");
    addText(svg, 600, y + rowHeight / 2 + 4, label(row[encoding.value]), "end");
  });
  return svg;
}

export function renderXy(model: HccViewModel): SVGSVGElement {
  const svg = baseSvg(model);
  const encoding = model.encoding;
  if (encoding.kind !== "xy") return svg;
  const sx = scale(model.rows.map((row) => number(row, encoding.x)), 45, 600);
  const sy = scale(model.rows.map((row) => number(row, encoding.y)), 220, 25);
  const points = model.rows.map((row) => `${sx(number(row, encoding.x))},${sy(number(row, encoding.y))}`);
  if (encoding.mark === "line") {
    const polyline = svgElement("polyline"); polyline.setAttribute("points", points.join(" ")); polyline.setAttribute("fill", "none"); polyline.setAttribute("stroke", "currentColor"); polyline.setAttribute("class", "hcc-view__line"); svg.appendChild(polyline);
  }
  model.rows.forEach((row) => {
    const circle = svgElement("circle"); circle.setAttribute("cx", String(sx(number(row, encoding.x)))); circle.setAttribute("cy", String(sy(number(row, encoding.y)))); circle.setAttribute("r", "5"); circle.setAttribute("fill", "currentColor"); circle.setAttribute("class", "hcc-view__mark"); svg.appendChild(circle);
  });
  return svg;
}

export function renderHeatmap(model: HccViewModel): SVGSVGElement {
  const svg = baseSvg(model);
  const encoding = model.encoding;
  if (encoding.kind !== "heatmap") return svg;
  const xs = [...new Set(model.rows.map((row) => label(row[encoding.x])))];
  const ys = [...new Set(model.rows.map((row) => label(row[encoding.y])))];
  const values = model.rows.map((row) => number(row, encoding.value));
  const max = Math.max(1, ...values.map(Math.abs));
  model.rows.forEach((row) => {
    const x = xs.indexOf(label(row[encoding.x]));
    const y = ys.indexOf(label(row[encoding.y]));
    const rect = svgElement("rect");
    rect.setAttribute("x", String(80 + x * (500 / Math.max(1, xs.length))));
    rect.setAttribute("y", String(25 + y * (190 / Math.max(1, ys.length))));
    rect.setAttribute("width", String(500 / Math.max(1, xs.length) - 2));
    rect.setAttribute("height", String(190 / Math.max(1, ys.length) - 2));
    rect.setAttribute("fill", "currentColor");
    rect.setAttribute("opacity", String(0.2 + 0.8 * Math.abs(number(row, encoding.value)) / max));
    rect.setAttribute("class", "hcc-view__mark"); svg.appendChild(rect);
  });
  xs.forEach((value, index) => addText(svg, 80 + (index + 0.5) * (500 / Math.max(1, xs.length)), 240, value, "middle"));
  ys.forEach((value, index) => addText(svg, 70, 25 + (index + 0.5) * (190 / Math.max(1, ys.length)), value, "end"));
  return svg;
}
