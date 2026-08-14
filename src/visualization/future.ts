export interface FutureViewProjection {
  id: "alluvial" | "chord" | "sunburst" | "streamgraph" | "choropleth" | "parallel_coordinates" | "control_chart" | "candlestick";
  purpose: string;
  proposedShape: string;
  accessibleFallback: string;
  gate: "proposal-only";
}

/** Review candidates only. These IDs are deliberately absent from HCC_VIEW_KINDS. */
export const FUTURE_VIEW_PROJECTIONS: readonly FutureViewProjection[] = Object.freeze([
  { id: "alluvial", purpose: "Compare categorical flows across more than two declared stages.", proposedShape: "entity, stage, category, weight", accessibleFallback: "Entity-by-stage transition table", gate: "proposal-only" },
  { id: "chord", purpose: "Show reciprocal quantities among a bounded set of entities.", proposedShape: "source, target, value", accessibleFallback: "Directed source-target matrix", gate: "proposal-only" },
  { id: "sunburst", purpose: "Show hierarchical composition across multiple declared levels.", proposedShape: "id, parent, label, value", accessibleFallback: "Indented hierarchy table with values", gate: "proposal-only" },
  { id: "streamgraph", purpose: "Compare changing composition across a continuous sequence.", proposedShape: "x, series, value", accessibleFallback: "Sequence-by-series table", gate: "proposal-only" },
  { id: "choropleth", purpose: "Project governed regional measures onto declared boundaries.", proposedShape: "region_id, value, boundary_ref", accessibleFallback: "Region-value table", gate: "proposal-only" },
  { id: "parallel_coordinates", purpose: "Compare multivariate records across consistent scales.", proposedShape: "record_id plus declared numeric dimensions", accessibleFallback: "Sortable record-by-dimension table", gate: "proposal-only" },
  { id: "control_chart", purpose: "Distinguish process variation from declared control limits.", proposedShape: "time, value, center, lower_limit, upper_limit", accessibleFallback: "Time-series table with limit flags", gate: "proposal-only" },
  { id: "candlestick", purpose: "Show declared open, high, low, and close values across ordered periods.", proposedShape: "period, open, high, low, close", accessibleFallback: "Ordered OHLC table", gate: "proposal-only" }
]);
