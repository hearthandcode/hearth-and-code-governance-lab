import type { HccViewModel } from "./types";
import { addText, baseSvg, HEIGHT, label, number, scale, svgElement, WIDTH } from "./svg";

function mark<K extends "rect" | "circle" | "line" | "polygon">(kind: K): SVGElementTagNameMap[K] {
  const element = svgElement(kind);
  element.setAttribute("class", "hcc-view__mark");
  element.setAttribute("fill", kind === "line" ? "none" : "currentColor");
  element.setAttribute("stroke", "currentColor");
  return element;
}

export function renderBullet(model: HccViewModel): SVGSVGElement {
  if (model.encoding.kind !== "bullet") throw new Error("bullet encoding required");
  const svg = baseSvg(model); const e = model.encoding; const height = Math.max(24, 190 / Math.max(model.rows.length, 1));
  model.rows.forEach((row, index) => {
    const y = 30 + index * height; const max = Math.max(number(row, e.max), 1); const width = 460;
    const track = svgElement("rect"); track.setAttribute("x", "150"); track.setAttribute("y", String(y)); track.setAttribute("width", String(width)); track.setAttribute("height", "12"); track.setAttribute("class", "hcc-view__track"); svg.append(track);
    const value = mark("rect"); value.setAttribute("x", "150"); value.setAttribute("y", String(y)); value.setAttribute("width", String(width * number(row, e.value) / max)); value.setAttribute("height", "12"); svg.append(value);
    const targetX = 150 + width * number(row, e.target) / max; const target = mark("line"); target.setAttribute("x1", String(targetX)); target.setAttribute("x2", String(targetX)); target.setAttribute("y1", String(y - 4)); target.setAttribute("y2", String(y + 16)); svg.append(target);
    addText(svg, 140, y + 11, label(row[e.category]), "end");
  });
  return svg;
}

function renderDots(model: HccViewModel, lollipop: boolean): SVGSVGElement {
  if (model.encoding.kind !== "lollipop" && model.encoding.kind !== "dot_plot") throw new Error("dot encoding required");
  const svg = baseSvg(model); const e = model.encoding; const values = model.rows.map((row) => number(row, e.value)); const x = scale([0, ...values], 150, 610); const gap = 190 / Math.max(model.rows.length, 1);
  model.rows.forEach((row, index) => {
    const y = 35 + index * gap; const pointX = x(number(row, e.value));
    if (lollipop) { const line = mark("line"); line.setAttribute("x1", String(x(0))); line.setAttribute("x2", String(pointX)); line.setAttribute("y1", String(y)); line.setAttribute("y2", String(y)); svg.append(line); }
    const dot = mark("circle"); dot.setAttribute("cx", String(pointX)); dot.setAttribute("cy", String(y)); dot.setAttribute("r", lollipop ? "7" : "9"); svg.append(dot);
    addText(svg, 140, y + 4, label(row[e.category]), "end"); addText(svg, pointX + 12, y + 4, String(number(row, e.value)));
  });
  return svg;
}

export function renderLollipop(model: HccViewModel): SVGSVGElement { return renderDots(model, true); }
export function renderDotPlot(model: HccViewModel): SVGSVGElement { return renderDots(model, false); }

export function renderRangeBar(model: HccViewModel): SVGSVGElement {
  if (model.encoding.kind !== "range_bar") throw new Error("range_bar encoding required");
  const svg = baseSvg(model); const e = model.encoding; const values = model.rows.flatMap((row) => [number(row, e.start), number(row, e.end)]); const x = scale(values, 150, 610); const gap = 190 / Math.max(model.rows.length, 1);
  model.rows.forEach((row, index) => { const y = 28 + index * gap; const start = x(number(row, e.start)); const end = x(number(row, e.end)); const bar = mark("rect"); bar.setAttribute("x", String(start)); bar.setAttribute("y", String(y)); bar.setAttribute("width", String(Math.max(2, end - start))); bar.setAttribute("height", "14"); svg.append(bar); addText(svg, 140, y + 12, label(row[e.category]), "end"); });
  return svg;
}

export function renderSlope(model: HccViewModel): SVGSVGElement {
  if (model.encoding.kind !== "slope") throw new Error("slope encoding required");
  const svg = baseSvg(model); const e = model.encoding; const values = model.rows.flatMap((row) => [number(row, e.start), number(row, e.end)]); const y = scale(values, HEIGHT - 35, 35);
  addText(svg, 150, 20, "Start", "middle"); addText(svg, 490, 20, "End", "middle");
  model.rows.forEach((row) => { const y1 = y(number(row, e.start)); const y2 = y(number(row, e.end)); const line = mark("line"); line.setAttribute("x1", "150"); line.setAttribute("x2", "490"); line.setAttribute("y1", String(y1)); line.setAttribute("y2", String(y2)); svg.append(line); for (const [x, cy] of [[150, y1], [490, y2]] as const) { const dot = mark("circle"); dot.setAttribute("cx", String(x)); dot.setAttribute("cy", String(cy)); dot.setAttribute("r", "6"); svg.append(dot); } addText(svg, 505, y2 + 4, label(row[e.category])); });
  return svg;
}

export function renderWaterfall(model: HccViewModel): SVGSVGElement {
  if (model.encoding.kind !== "waterfall") throw new Error("waterfall encoding required");
  const svg = baseSvg(model); const e = model.encoding; let total = 0; const intervals = model.rows.map((row) => { const start = total; total += number(row, e.value); return { row, start, end: total }; }); const y = scale([0, ...intervals.flatMap((item) => [item.start, item.end])], HEIGHT - 35, 25); const width = 500 / Math.max(intervals.length, 1);
  intervals.forEach((item, index) => { const top = Math.min(y(item.start), y(item.end)); const bar = mark("rect"); bar.setAttribute("x", String(90 + index * width)); bar.setAttribute("y", String(top)); bar.setAttribute("width", String(Math.max(8, width - 12))); bar.setAttribute("height", String(Math.max(2, Math.abs(y(item.end) - y(item.start))))); bar.dataset.sign = item.end >= item.start ? "positive" : "negative"; svg.append(bar); addText(svg, 90 + index * width + width / 2, HEIGHT - 12, label(item.row[e.category]), "middle"); });
  return svg;
}

export function renderFunnel(model: HccViewModel): SVGSVGElement {
  if (model.encoding.kind !== "funnel") throw new Error("funnel encoding required");
  const svg = baseSvg(model); const e = model.encoding; const maximum = Math.max(...model.rows.map((row) => number(row, e.value)), 1); const height = 190 / Math.max(model.rows.length, 1);
  model.rows.forEach((row, index) => { const width = 500 * number(row, e.value) / maximum; const next = model.rows[index + 1]; const nextWidth = next ? 500 * number(next, e.value) / maximum : width * 0.75; const y = 25 + index * height; const polygon = mark("polygon"); polygon.setAttribute("points", `${WIDTH / 2 - width / 2},${y} ${WIDTH / 2 + width / 2},${y} ${WIDTH / 2 + nextWidth / 2},${y + height - 4} ${WIDTH / 2 - nextWidth / 2},${y + height - 4}`); svg.append(polygon); addText(svg, WIDTH / 2, y + height / 2 + 4, `${label(row[e.stage])}: ${number(row, e.value)}`, "middle"); });
  return svg;
}

export function renderWaffle(model: HccViewModel): SVGSVGElement {
  if (model.encoding.kind !== "waffle") throw new Error("waffle encoding required");
  const svg = baseSvg(model); const e = model.encoding; const values = model.rows.map((row) => Math.max(0, number(row, e.value))); const total = values.reduce((sum, value) => sum + value, 0) || 1; const cells = 64; let cursor = 0;
  model.rows.forEach((row, index) => {
    const cumulative = values.slice(0, index + 1).reduce((sum, value) => sum + value, 0);
    const boundary = index === model.rows.length - 1 ? cells : Math.round(cumulative / total * cells);
    const count = Math.max(0, boundary - cursor);
    for (let offset = 0; offset < count && cursor < cells; offset += 1, cursor += 1) { const cell = mark("rect"); cell.setAttribute("x", String(70 + cursor % 8 * 24)); cell.setAttribute("y", String(28 + Math.floor(cursor / 8) * 24)); cell.setAttribute("width", "18"); cell.setAttribute("height", "18"); cell.setAttribute("rx", "3"); cell.dataset.opacityLevel = String(Math.max(1, Math.ceil((index + 1) / model.rows.length * 8))); svg.append(cell); }
    addText(svg, 310, 45 + index * 24, `${label(row[e.category])}: ${number(row, e.value)}`);
  });
  return svg;
}
