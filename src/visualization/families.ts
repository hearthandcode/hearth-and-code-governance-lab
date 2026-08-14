import { HCC_VIEW_KINDS, type HccViewKind } from "./types";

export const VIEW_FAMILY_IDS = ["summary", "comparison", "composition", "sequence", "relation", "distribution", "process", "target"] as const;
export type ViewFamilyId = (typeof VIEW_FAMILY_IDS)[number];

export interface ViewFamilyDefinition {
  id: ViewFamilyId;
  kinds: readonly HccViewKind[];
  integrityQuestion: string;
  rendererModule: string;
}

export const VIEW_FAMILIES: readonly ViewFamilyDefinition[] = Object.freeze([
  { id: "summary", kinds: ["metric", "table", "gauge"], integrityQuestion: "Does the text/table expose the same declared measure and bounds?", rendererModule: "ui/views/summary" },
  { id: "comparison", kinds: ["bar", "xy", "heatmap", "lollipop", "dot_plot", "range_bar"], integrityQuestion: "Are scales, categories, intervals, and missing values explicit?", rendererModule: "ui/views/comparison" },
  { id: "composition", kinds: ["donut", "stacked_bar", "treemap", "waffle"], integrityQuestion: "Are part-to-whole rules and totals valid?", rendererModule: "ui/views/composition" },
  { id: "sequence", kinds: ["timeline", "area", "calendar_heatmap", "slope"], integrityQuestion: "Are ordering, intervals, endpoints, and gaps preserved?", rendererModule: "ui/views/sequence" },
  { id: "relation", kinds: ["hierarchy", "network"], integrityQuestion: "Are identifiers, roots, edges, and cycles governed?", rendererModule: "ui/views/relation" },
  { id: "distribution", kinds: ["histogram", "box_plot"], integrityQuestion: "Are bins, quantiles, sample size, and outliers represented honestly?", rendererModule: "ui/views/distribution" },
  { id: "process", kinds: ["waterfall", "funnel"], integrityQuestion: "Are cumulative changes, stage order, counts, and losses declared rather than inferred?", rendererModule: "ui/views/process" },
  { id: "target", kinds: ["bullet"], integrityQuestion: "Are the value, target, and maximum explicit and mutually valid?", rendererModule: "ui/views/target" }
]);

const VIEW_KIND_TO_FAMILY = new Map<HccViewKind, ViewFamilyDefinition>(
  VIEW_FAMILIES.flatMap((family) => family.kinds.map((kind) => [kind, family] as const))
);

export function getViewFamily(kind: HccViewKind): ViewFamilyDefinition {
  const family = VIEW_KIND_TO_FAMILY.get(kind);
  if (!family) throw new Error(`HCC-VIEW-FAMILY-UNKNOWN: ${kind}`);
  return family;
}

export function auditViewFamilies(): string[] {
  const counts = new Map<HccViewKind, number>();
  for (const family of VIEW_FAMILIES) for (const kind of family.kinds) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  return HCC_VIEW_KINDS.flatMap((kind) => {
    const count = counts.get(kind) ?? 0;
    return count === 1 ? [] : [`${kind} belongs to ${count} view families; expected exactly one.`];
  });
}
