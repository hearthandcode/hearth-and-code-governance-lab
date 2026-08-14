import { CANDIDATE_INPUT_KINDS, type CandidateInputKind } from "./types";

export const INPUT_FAMILY_IDS = ["choice", "textual", "numeric", "temporal", "collection", "composite"] as const;
export type InputFamilyId = (typeof INPUT_FAMILY_IDS)[number];

export interface InputFamilyDefinition {
  id: InputFamilyId;
  kinds: readonly CandidateInputKind[];
  responseShape: string;
  rendererModule: string;
}

export const INPUT_FAMILIES: readonly InputFamilyDefinition[] = Object.freeze([
  { id: "choice", kinds: ["boolean", "dropdown", "multi_select", "ranked_choice", "radio_group", "rating"], responseShape: "boolean, option ID, rating, or option ID list", rendererModule: "ui/inputs/choice" },
  { id: "textual", kinds: ["short_text", "long_text", "email", "url", "phone", "file_reference"], responseShape: "bounded string", rendererModule: "ui/inputs/textual" },
  { id: "numeric", kinds: ["number", "scale", "duration", "currency", "percentage", "numeric_range", "unit_value", "coordinates"], responseShape: "finite number or bounded numeric record", rendererModule: "ui/inputs/numeric" },
  { id: "temporal", kinds: ["date", "time", "datetime", "month", "week", "date_range", "time_range"], responseShape: "validated local temporal string or ordered pair", rendererModule: "ui/inputs/temporal" },
  { id: "collection", kinds: ["tags", "repeatable_group", "key_value_list"], responseShape: "bounded string or record collection", rendererModule: "ui/inputs/collection" },
  { id: "composite", kinds: ["matrix", "color"], responseShape: "declared mapping or formatted scalar", rendererModule: "ui/inputs/composite" }
]);

const INPUT_KIND_TO_FAMILY = new Map<CandidateInputKind, InputFamilyDefinition>(
  INPUT_FAMILIES.flatMap((family) => family.kinds.map((kind) => [kind, family] as const))
);

export function getInputFamily(kind: CandidateInputKind): InputFamilyDefinition {
  const family = INPUT_KIND_TO_FAMILY.get(kind);
  if (!family) throw new Error(`HCC-INPUT-FAMILY-UNKNOWN: ${kind}`);
  return family;
}

export function auditInputFamilies(): string[] {
  const counts = new Map<CandidateInputKind, number>();
  for (const family of INPUT_FAMILIES) for (const kind of family.kinds) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  return CANDIDATE_INPUT_KINDS.flatMap((kind) => {
    const count = counts.get(kind) ?? 0;
    return count === 1 ? [] : [`${kind} belongs to ${count} input families; expected exactly one.`];
  });
}
