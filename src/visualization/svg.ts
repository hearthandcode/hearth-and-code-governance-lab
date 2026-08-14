import type { HccViewModel, ViewRow, ViewScalar } from "./types";

const SVG_NS = "http://www.w3.org/2000/svg";
export const WIDTH = 640;
export const HEIGHT = 260;

export function svgElement<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, name);
}

export function addText(parent: SVGElement, x: number, y: number, value: string, anchor = "start"): void {
  const node = svgElement("text");
  node.setAttribute("x", String(x));
  node.setAttribute("y", String(y));
  node.setAttribute("text-anchor", anchor);
  node.textContent = value;
  parent.appendChild(node);
}

export function number(row: ViewRow, field: string): number {
  const value = row[field];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function label(value: ViewScalar | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

export function scale(values: number[], low: number, high: number): (value: number) => number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return () => (low + high) / 2;
  return (value) => low + ((value - min) / (max - min)) * (high - low);
}

export function baseSvg(model: HccViewModel): SVGSVGElement {
  const svg = svgElement("svg");
  svg.setAttribute("viewBox", `0 0 ${WIDTH} ${HEIGHT}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${model.title}. ${model.summary}`);
  svg.setAttribute("data-renderer-backend", model.rendererBackend);
  return svg;
}
