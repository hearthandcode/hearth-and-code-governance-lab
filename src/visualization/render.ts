import { renderDonut, renderStackedBar, renderTreemap } from "./render-composition";
import { renderBar, renderHeatmap, renderXy } from "./render-comparison";
import { renderBoxPlot, renderHistogram } from "./render-distribution";
import { renderBullet, renderDotPlot, renderFunnel, renderLollipop, renderRangeBar, renderSlope, renderWaffle, renderWaterfall } from "./render-expansion";
import { renderHierarchy, renderNetwork } from "./render-relation";
import { renderArea, renderCalendarHeatmap, renderTimeline } from "./render-sequence";
import { appendTable, renderGauge, renderMetric } from "./render-summary";
import { HCC_VIEW_KINDS, type HccViewModel, type HccViewRendererBackend } from "./types";

function renderNativeHccView(model: HccViewModel, container: HTMLElement): void {
  const article = document.createElement("article"); article.className = "hcc-view"; article.dataset.state = model.state;
  const title = document.createElement("h4"); title.textContent = model.title; article.appendChild(title);
  const summary = document.createElement("p"); summary.textContent = model.summary; article.appendChild(summary);
  const status = document.createElement("p"); status.className = "hcc-view__status"; status.textContent = model.stateMessage; status.setAttribute("role", "status"); article.appendChild(status);
  const provenance = document.createElement("small"); provenance.textContent = `Source: ${model.sourceLabel} · digest ${model.sourceDigest}`; article.appendChild(provenance);
  if (model.state === "ready") {
    if (model.kind === "metric") article.appendChild(renderMetric(model));
    else if (model.kind === "table") appendTable(article, model);
    else {
      const renderers = { bar: renderBar, timeline: renderTimeline, xy: renderXy, heatmap: renderHeatmap, hierarchy: renderHierarchy, network: renderNetwork, donut: renderDonut, stacked_bar: renderStackedBar, area: renderArea, histogram: renderHistogram, box_plot: renderBoxPlot, gauge: renderGauge, calendar_heatmap: renderCalendarHeatmap, treemap: renderTreemap, bullet: renderBullet, lollipop: renderLollipop, dot_plot: renderDotPlot, range_bar: renderRangeBar, slope: renderSlope, waterfall: renderWaterfall, funnel: renderFunnel, waffle: renderWaffle } as const;
      article.appendChild(renderers[model.kind](model));
    }
  }
  if (model.kind !== "table") {
    const fallback = document.createElement("details"); const legend = document.createElement("summary"); legend.textContent = "Accessible data table"; fallback.appendChild(legend); appendTable(fallback, model); article.appendChild(fallback);
  }
  if (model.diagnostics.length > 0) {
    const list = document.createElement("ul");
    model.diagnostics.forEach((diagnostic) => { const item = document.createElement("li"); item.textContent = `${diagnostic.path}: ${diagnostic.message}`; list.appendChild(item); });
    article.appendChild(list);
  }
  container.appendChild(article);
}

export const NATIVE_STATIC_SVG_BACKEND: HccViewRendererBackend = Object.freeze({
  id: "native-static-svg",
  supportedKinds: HCC_VIEW_KINDS,
  render: renderNativeHccView
});

export function renderHccView(
  model: HccViewModel,
  container: HTMLElement,
  backend: HccViewRendererBackend = NATIVE_STATIC_SVG_BACKEND
): void {
  if (!backend.supportedKinds.includes(model.kind)) {
    throw new Error(`Renderer ${backend.id} does not support ${model.kind}.`);
  }
  backend.render(model, container);
}
