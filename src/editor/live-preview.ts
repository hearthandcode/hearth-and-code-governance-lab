import { StateField, type EditorState, type Extension } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  WidgetType
} from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";

import {
  fenceIsBeingEdited,
  scanHccInteractionFences,
  type HccFenceRange
} from "./fences";
import { returnToHccSource } from "./navigation";

export interface HccEditorWidgetContext {
  from: number;
  to: number;
  language: HccFenceRange["language"];
  sourcePath: string;
  returnToEditor: () => void;
}

export type HccEditorWidgetDisposer = () => void;

export type HccEditorWidgetRenderer = (
  source: string,
  container: HTMLElement,
  context: HccEditorWidgetContext
) => void | HccEditorWidgetDisposer;

/**
 * Creates a read-only Live Preview projection. The supplied renderer owns only
 * the container DOM and may return a disposer. It receives no Vault or Adapter.
 */
export function createHccLivePreviewExtension(render: HccEditorWidgetRenderer): Extension {
  const decorationField = StateField.define<DecorationSet>({
    create: (state) => buildDecorations(state, render),
    update: (decorations, transaction) => {
      if (
        transaction.docChanged
        || transaction.selection !== undefined
        || transaction.startState.field(editorLivePreviewField, false)
          !== transaction.state.field(editorLivePreviewField, false)
      ) {
        return buildDecorations(transaction.state, render);
      }
      return decorations;
    },
    provide: (field) => EditorView.decorations.from(field)
  });
  return decorationField;
}

function buildDecorations(state: EditorState, render: HccEditorWidgetRenderer): DecorationSet {
  if (state.field(editorLivePreviewField, false) !== true) {
    return Decoration.none;
  }

  const selections = state.selection.ranges.map((range) => ({
    from: range.from,
    to: range.to
  }));
  // CodeMirror keeps this state-backed block-decoration set for the document,
  // but only mounts each widget's DOM while that range is in the viewport.
  const ranges = scanHccInteractionFences(state.doc.toString())
    .filter((fence) => !fenceIsBeingEdited(fence, selections))
    .map((fence) => Decoration.replace({
      block: true,
      widget: new HccInteractionWidget(fence, render)
    }).range(fence.from, fence.to));

  return Decoration.set(ranges, true);
}

class HccInteractionWidget extends WidgetType {
  private disposer: HccEditorWidgetDisposer | null = null;
  private escapeListener: ((event: KeyboardEvent) => void) | null = null;

  constructor(
    private readonly fence: HccFenceRange,
    private readonly render: HccEditorWidgetRenderer
  ) {
    super();
  }

  override eq(other: HccInteractionWidget): boolean {
    return this.fence.from === other.fence.from
      && this.fence.to === other.fence.to
      && this.fence.language === other.fence.language
      && this.fence.source === other.fence.source
      && this.render === other.render;
  }

  override toDOM(view: EditorView): HTMLElement {
    const container = document.createElement("section");
    container.className = "hcc-widget-live-preview";
    container.dataset.hccWidgetFrom = String(this.fence.from);
    container.dataset.hccWidgetTo = String(this.fence.to);
    container.tabIndex = -1;

    this.escapeListener = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      returnToHccSource(view, this.fence.from);
    };
    container.addEventListener("keydown", this.escapeListener);

    const disposed = this.render(this.fence.source, container, {
      from: this.fence.from,
      to: this.fence.to,
      language: this.fence.language,
      sourcePath: view.state.field(editorInfoField, false)?.file?.path ?? "unknown",
      returnToEditor: () => returnToHccSource(view, this.fence.from)
    });
    this.disposer = typeof disposed === "function" ? disposed : null;
    return container;
  }

  override destroy(dom: HTMLElement): void {
    if (this.escapeListener !== null) {
      dom.removeEventListener("keydown", this.escapeListener);
    }
    this.disposer?.();
    this.escapeListener = null;
    this.disposer = null;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}
