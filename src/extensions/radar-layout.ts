export interface RadarBounds { left: number; top: number; right: number; bottom: number }
export interface RadarLabelLayout {
  angle: number;
  axisX: number;
  axisY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  bounds: RadarBounds;
}
export interface RadarLayout {
  radius: number;
  labels: readonly RadarLabelLayout[];
  viewBox: RadarBounds & { width: number; height: number };
}

function overlaps(a: RadarBounds, b: RadarBounds, gap: number): boolean {
  return a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;
}

function outsidePlot(bounds: RadarBounds, radius: number): boolean {
  const closestX = Math.max(bounds.left, Math.min(0, bounds.right));
  const closestY = Math.max(bounds.top, Math.min(0, bounds.bottom));
  return Math.hypot(closestX, closestY) >= radius;
}

export function layoutRadarLabels(dimensions: readonly string[], radius = 170, plotGap = 16): RadarLayout {
  if (dimensions.length < 3 || dimensions.length > 12) throw new Error("Radar layout requires 3 to 12 dimensions.");
  const height = 28;
  const labels: RadarLabelLayout[] = [];
  dimensions.forEach((dimension, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / dimensions.length;
    const width = Math.min(180, Math.max(72, dimension.length * 8 + 20));
    let distance = radius + plotGap;
    let bounds: RadarBounds;
    do {
      distance += 2;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      bounds = { left: x - width / 2, top: y - height / 2, right: x + width / 2, bottom: y + height / 2 };
    } while ((!outsidePlot(bounds, radius + plotGap) || labels.some((label) => overlaps(bounds, label.bounds, 6))) && distance < radius + 500);
    const x = (bounds.left + bounds.right) / 2;
    const y = (bounds.top + bounds.bottom) / 2;
    labels.push({ angle, axisX: Math.cos(angle) * radius, axisY: Math.sin(angle) * radius, x, y, width, height, bounds });
  });
  const margin = 24;
  const left = Math.min(-radius, ...labels.map((label) => label.bounds.left)) - margin;
  const top = Math.min(-radius, ...labels.map((label) => label.bounds.top)) - margin;
  const right = Math.max(radius, ...labels.map((label) => label.bounds.right)) + margin;
  const bottom = Math.max(radius, ...labels.map((label) => label.bounds.bottom)) + margin;
  return { radius, labels, viewBox: { left, top, right, bottom, width: right - left, height: bottom - top } };
}

export function radarBoundsOverlap(a: RadarBounds, b: RadarBounds, gap = 0): boolean { return overlaps(a, b, gap); }
export function radarBoundsOutsideCircle(bounds: RadarBounds, radius: number): boolean { return outsidePlot(bounds, radius); }
