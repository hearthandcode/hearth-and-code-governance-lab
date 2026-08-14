import { reorderRankedIdsAtEdge, type CandidateOption, type CandidateResponseValue, type RankedInsertionEdge } from "../../grammar";
import { button, node, optionLabel } from "../dom";

export function rankedControl(
  id: string,
  options: CandidateOption[],
  initial: string[],
  changed: (value: CandidateResponseValue, message: string) => void
): HTMLElement {
  const wrapper = node("fieldset", "hcc-widget__fieldset");
  wrapper.append(node("legend", "hcc-widget__legend", "Order every priority"));
  const admitted = initial.filter((optionId) => options.some((option) => option.id === optionId));
  let selected = [...admitted, ...options.map((option) => option.id).filter((optionId) => !admitted.includes(optionId))];
  const list = node("ol", "hcc-widget__ranking");
  const live = node("p", "hcc-widget__ranking-status", "Drag an item or use Move up and Move down.");
  live.setAttribute("aria-live", "polite");
  let draggedId = "";
  const clearInsertion = (): void => {
    list.querySelectorAll<HTMLElement>("[data-insertion-edge]").forEach((row) => delete row.dataset.insertionEdge);
  };
  const redraw = (): void => {
    clearInsertion();
    list.replaceChildren();
    selected.forEach((optionId, index) => {
      const option = options.find((item) => item.id === optionId);
      if (!option) return;
      const row = node("li", "hcc-widget__ranking-item", option.label);
      row.draggable = true;
      row.dataset.optionId = optionId;
      row.setAttribute("aria-label", `${option.label}, rank ${index + 1} of ${selected.length}`);
      row.addEventListener("dragstart", (event) => {
        draggedId = optionId;
        event.dataTransfer?.setData("text/plain", optionId);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      });
      row.addEventListener("dragover", (event) => {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        const bounds = row.getBoundingClientRect();
        const edge: RankedInsertionEdge = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
        clearInsertion();
        row.dataset.insertionEdge = edge;
        live.textContent = `Insert ${draggedId || "dragged item"} ${edge} ${option.label}.`;
      });
      row.addEventListener("dragleave", () => { delete row.dataset.insertionEdge; });
      row.addEventListener("drop", (event) => {
        event.preventDefault();
        const dragged = event.dataTransfer?.getData("text/plain") || draggedId;
        const edge = row.dataset.insertionEdge === "after" ? "after" : "before";
        selected = reorderRankedIdsAtEdge(selected, dragged, optionId, edge);
        changed([...selected], "Session ranking order changed by drag.");
        draggedId = "";
        live.textContent = `Order changed. ${option.label} was the drop reference.`;
        redraw();
      });
      row.addEventListener("dragend", () => { draggedId = ""; clearInsertion(); live.textContent = "Drag ended."; });
      const up = button("Move up", () => move(index, -1));
      const down = button("Move down", () => move(index, 1));
      up.disabled = index === 0;
      down.disabled = index === selected.length - 1;
      row.append(up, down);
      list.append(row);
    });
  };
  const move = (index: number, delta: number): void => {
    const target = index + delta;
    if (target < 0 || target >= selected.length) return;
    [selected[index], selected[target]] = [selected[target]!, selected[index]!];
    changed([...selected], "Session ranking order changed.");
    redraw();
  };
  const confirm = button("Use shown order", () => changed([...selected], "Session ranking order confirmed."));
  wrapper.append(list, live, confirm);
  redraw();
  return wrapper;
}

export function multiSelectControl(
  id: string,
  options: CandidateOption[],
  initial: string[],
  changed: (value: CandidateResponseValue, message: string) => void
): HTMLElement {
  const details = document.createElement("details");
  details.className = "hcc-widget__multi-select";
  const selected = initial.filter((value) => options.some((option) => option.id === value));
  const summary = node("summary");
  const updateSummary = (): void => {
    summary.textContent = selected.length === 0 ? "Choose one or more options" : `${selected.length} selected: ${options.filter((option) => selected.includes(option.id)).map((option) => option.label).join(", ")}`;
  };
  details.append(summary);
  options.forEach((option) => {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = `${id}-multi-select`;
    input.checked = selected.includes(option.id);
    input.addEventListener("change", () => {
      if (input.checked && !selected.includes(option.id)) selected.push(option.id);
      if (!input.checked) selected.splice(selected.indexOf(option.id), 1);
      updateSummary();
      changed([...selected], "Session multi-selection changed.");
    });
    details.append(optionLabel(input, option.label));
  });
  updateSummary();
  return details;
}
