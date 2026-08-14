export function reorderRankedIds(
  selected: readonly string[],
  draggedId: string,
  targetId: string
): string[] {
  const from = selected.indexOf(draggedId);
  const to = selected.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return [...selected];
  const result = [...selected];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved!);
  return result;
}

export type RankedInsertionEdge = "before" | "after";

export function reorderRankedIdsAtEdge(
  selected: readonly string[],
  draggedId: string,
  targetId: string,
  edge: RankedInsertionEdge
): string[] {
  const from = selected.indexOf(draggedId);
  if (from < 0 || !selected.includes(targetId) || draggedId === targetId) return [...selected];
  const result = selected.filter((id) => id !== draggedId);
  const target = result.indexOf(targetId);
  if (target < 0) return [...selected];
  result.splice(target + (edge === "after" ? 1 : 0), 0, draggedId);
  return result;
}
