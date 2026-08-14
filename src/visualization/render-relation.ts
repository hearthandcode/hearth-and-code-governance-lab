import type { HccViewModel, ViewRow } from "./types";
import { addText, baseSvg, label, svgElement } from "./svg";

export function renderHierarchy(model: HccViewModel): SVGSVGElement {
  const svg = baseSvg(model);
  if (model.encoding.kind !== "hierarchy") return svg;
  const idField = model.encoding.id;
  const parentField = model.encoding.parent;
  const depth = (row: ViewRow): number => {
    let current = label(row[parentField]); let count = 0; const seen = new Set<string>();
    while (current && !seen.has(current) && count < model.rows.length) {
      seen.add(current); count += 1;
      current = label(model.rows.find((candidate) => label(candidate[idField]) === current)?.[parentField]);
    }
    return count;
  };
  const depths = model.rows.map(depth);
  model.rows.forEach((row, index) => {
    const x = 55 + depths[index] * 145; const y = 25 + index * Math.min(32, 210 / Math.max(1, model.rows.length));
    const circle = svgElement("circle"); circle.setAttribute("cx", String(x)); circle.setAttribute("cy", String(y)); circle.setAttribute("r", "5"); circle.setAttribute("fill", "currentColor"); circle.setAttribute("class", "hcc-view__mark"); svg.appendChild(circle);
    addText(svg, x + 10, y + 4, label(row[idField]));
  });
  return svg;
}

export function renderNetwork(model: HccViewModel): SVGSVGElement {
  const svg = baseSvg(model);
  const encoding = model.encoding;
  if (encoding.kind !== "network") return svg;
  const names = [...new Set(model.rows.flatMap((row) => [label(row[encoding.node]), label(row[encoding.source]), label(row[encoding.target])]).filter(Boolean))];
  const positions = new Map(names.map((name, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, names.length);
    return [name, { x: 320 + 205 * Math.cos(angle), y: 130 + 95 * Math.sin(angle) }] as const;
  }));
  model.rows.forEach((row) => {
    const from = positions.get(label(row[encoding.source])); const to = positions.get(label(row[encoding.target]));
    if (!from || !to) return;
    const line = svgElement("line"); line.setAttribute("x1", String(from.x)); line.setAttribute("y1", String(from.y)); line.setAttribute("x2", String(to.x)); line.setAttribute("y2", String(to.y)); line.setAttribute("stroke", "currentColor"); line.setAttribute("class", "hcc-view__axis"); svg.appendChild(line);
  });
  positions.forEach((position, name) => {
    const circle = svgElement("circle"); circle.setAttribute("cx", String(position.x)); circle.setAttribute("cy", String(position.y)); circle.setAttribute("r", "7"); circle.setAttribute("fill", "currentColor"); circle.setAttribute("class", "hcc-view__mark"); svg.appendChild(circle);
    addText(svg, position.x, position.y + 22, name, "middle");
  });
  return svg;
}
