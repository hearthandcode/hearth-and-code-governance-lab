import {
  RELATIONSHIP_FIELDS,
  type RelationshipCandidate,
  type RelationshipField
} from "./types";

export const ADJACENT_ITEM_CAP = 12;

export function collectExplicitRelationships(
  frontmatter: unknown,
  blockSourceRefs: readonly string[]
): { shown: RelationshipCandidate[]; moreNotShown: number } {
  const candidates: RelationshipCandidate[] = [];
  if (isRecord(frontmatter)) {
    for (const field of RELATIONSHIP_FIELDS) {
      for (const value of stringValues(frontmatter[field])) {
        candidates.push({ relationship: field, target: value });
      }
    }
  }
  for (const target of blockSourceRefs) {
    candidates.push({ relationship: "source_refs", target });
  }

  const unique = deduplicate(candidates);
  return {
    shown: unique.slice(0, ADJACENT_ITEM_CAP),
    moreNotShown: Math.max(0, unique.length - ADJACENT_ITEM_CAP)
  };
}

export function linkPathFromRelationship(target: string): string {
  const trimmed = target.trim().replace(/^!/, "");
  const unwrapped = trimmed.startsWith("[[") && trimmed.endsWith("]]" )
    ? trimmed.slice(2, -2)
    : trimmed;
  return unwrapped.split("|", 1)[0]!.split("#", 1)[0]!.trim();
}

function stringValues(value: unknown): string[] {
  if (typeof value === "string" && value.trim() !== "") return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function deduplicate(candidates: RelationshipCandidate[]): RelationshipCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.relationship}\u0000${candidate.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRecord(value: unknown): value is Record<RelationshipField, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
