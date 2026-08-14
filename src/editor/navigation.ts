import type { EditorView } from "@codemirror/view";
import { EditorView as CodeMirrorEditorView } from "@codemirror/view";

import { scanHccInteractionFences, type OffsetRange } from "./fences";

export type NavigationDirection = "next" | "previous";

/**
 * Selects a fence deterministically and wraps at the document boundary.
 * activeFrom is used when focus is already inside a rendered widget.
 */
export function findDirectionalFence(
  fences: readonly OffsetRange[],
  origin: number,
  direction: NavigationDirection,
  activeFrom: number | null = null
): OffsetRange | null {
  if (fences.length === 0) {
    return null;
  }

  const ordered = [...fences].sort((left, right) => left.from - right.from || left.to - right.to);
  const activeIndex = activeFrom === null
    ? -1
    : ordered.findIndex((fence) => fence.from === activeFrom);

  if (activeIndex >= 0) {
    const delta = direction === "next" ? 1 : -1;
    return ordered[(activeIndex + delta + ordered.length) % ordered.length];
  }

  if (direction === "next") {
    return ordered.find((fence) => fence.from >= origin) ?? ordered[0];
  }

  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    if (ordered[index].to <= origin) {
      return ordered[index];
    }
  }
  return ordered[ordered.length - 1];
}

export function focusNextHccWidget(view: EditorView, rememberedFrom: number | null = null): boolean {
  return focusDirectionalHccWidget(view, "next", rememberedFrom);
}

export function focusPreviousHccWidget(view: EditorView, rememberedFrom: number | null = null): boolean {
  return focusDirectionalHccWidget(view, "previous", rememberedFrom);
}

export function returnToHccSource(view: EditorView, position: number): boolean {
  const cursor = Math.max(0, Math.min(position, view.state.doc.length));
  view.dispatch({
    selection: { anchor: cursor },
    scrollIntoView: true
  });
  view.focus();
  return true;
}

function focusDirectionalHccWidget(
  view: EditorView,
  direction: NavigationDirection,
  rememberedFrom: number | null
): boolean {
  const fences = scanHccInteractionFences(view.state.doc.toString());
  const activeFrom = activeWidgetFrom(view) ?? rememberedFrom;
  const target = findDirectionalFence(
    fences,
    view.state.selection.main.head,
    direction,
    activeFrom
  );
  if (target === null) {
    return false;
  }

  view.dispatch({ effects: CodeMirrorEditorView.scrollIntoView(target.from, { y: "center" }) });
  requestAnimationFrame(() => focusRenderedWidget(view, target.from));
  return true;
}

function activeWidgetFrom(view: EditorView): number | null {
  const active = view.dom.ownerDocument.activeElement;
  if (!(active instanceof HTMLElement)) {
    return null;
  }
  const widget = active.closest<HTMLElement>("[data-hcc-widget-from]");
  const encoded = widget?.dataset.hccWidgetFrom;
  if (encoded === undefined) {
    return null;
  }
  const parsed = Number(encoded);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function focusRenderedWidget(view: EditorView, from: number): void {
  const widget = view.dom.querySelector<HTMLElement>(`[data-hcc-widget-from="${from}"]`);
  if (widget === null) {
    return;
  }
  const focusTarget = widget.querySelector<HTMLElement>(
    "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex='-1'])"
  );
  (focusTarget ?? widget).focus();
}
