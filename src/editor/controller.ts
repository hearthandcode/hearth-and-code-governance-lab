import type { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";

import {
  focusNextHccWidget,
  focusPreviousHccWidget,
  returnToHccSource
} from "./navigation";
import {
  createHccLivePreviewExtension,
  type HccEditorWidgetRenderer
} from "./live-preview";

export interface HccEditorController {
  extension: Extension;
  focusNext: () => boolean;
  focusPrevious: () => boolean;
  returnToEditor: () => boolean;
}

/**
 * Provides a public command bridge without relying on Obsidian's private
 * CodeMirror properties. Commands act only on the most recently focused view.
 */
export function createHccEditorController(render: HccEditorWidgetRenderer): HccEditorController {
  let lastFocusedView: EditorView | null = null;
  let lastWidgetFrom: number | null = null;
  const liveViews = new Set<EditorView>();

  const trackingExtension = ViewPlugin.fromClass(class {
    private readonly rememberFocus: () => void;

    constructor(private readonly view: EditorView) {
      liveViews.add(view);
      this.rememberFocus = (event?: Event) => {
        lastFocusedView = view;
        const target = event?.target;
        const widget = target instanceof HTMLElement
          ? target.closest<HTMLElement>("[data-hcc-widget-from]")
          : null;
        const position = Number(widget?.dataset.hccWidgetFrom);
        lastWidgetFrom = Number.isSafeInteger(position) ? position : null;
      };
      view.dom.addEventListener("focusin", this.rememberFocus);
    }

    destroy(): void {
      this.view.dom.removeEventListener("focusin", this.rememberFocus);
      liveViews.delete(this.view);
      if (lastFocusedView === this.view) {
        lastFocusedView = null;
        lastWidgetFrom = null;
      }
    }
  });

  const currentView = (): EditorView | null => {
    if (lastFocusedView !== null && liveViews.has(lastFocusedView)) {
      return lastFocusedView;
    }
    return null;
  };

  return {
    extension: [createHccLivePreviewExtension(render), trackingExtension],
    focusNext: () => {
      const view = currentView();
      return view === null ? false : focusNextHccWidget(view, lastWidgetFrom);
    },
    focusPrevious: () => {
      const view = currentView();
      return view === null ? false : focusPreviousHccWidget(view, lastWidgetFrom);
    },
    returnToEditor: () => {
      const view = currentView();
      if (view === null) {
        return false;
      }
      const active = view.dom.ownerDocument.activeElement;
      const widget = active instanceof HTMLElement
        ? active.closest<HTMLElement>("[data-hcc-widget-from]")
        : null;
      const activePosition = Number(widget?.dataset.hccWidgetFrom);
      const position = Number.isSafeInteger(activePosition) ? activePosition : lastWidgetFrom;
      return position !== null ? returnToHccSource(view, position) : false;
    }
  };
}
