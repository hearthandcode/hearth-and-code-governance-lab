import type { CandidateInteraction, CandidateResponseValue } from "../../grammar";
import { node } from "../dom";

let matrixInstanceCounter = 0;

export function matrixControl(
  block: Extract<CandidateInteraction, { kind: "matrix" }>,
  initial: Record<string, unknown>,
  changed: (value: CandidateResponseValue, message: string) => void
): HTMLElement {
  const instanceId = matrixInstanceCounter++;
  const answers: Record<string, string | string[]> = {};
  Object.entries(initial).forEach(([key, value]) => {
    if (typeof value === "string" || (Array.isArray(value) && value.every((item) => typeof item === "string"))) answers[key] = value;
  });
  const table = node("table", "hcc-widget__matrix");
  const caption = node("caption", undefined, block.prompt);
  const head = node("thead");
  const headRow = node("tr");
  headRow.append(node("th", undefined, "Item"));
  block.config.columns.forEach((column) => headRow.append(node("th", undefined, column.label)));
  head.append(headRow);
  const body = node("tbody");
  const cells: Array<{ input: HTMLInputElement; marker: HTMLElement; td: HTMLElement; rowId: string; columnId: string }> = [];
  const rowStatuses = new Map<string, HTMLElement>();
  const syncCheckedState = (): void => {
    cells.forEach(({ input, marker, td, rowId, columnId }) => {
      const selected = block.config.selection === "one"
        ? answers[rowId] === columnId
        : Array.isArray(answers[rowId]) && answers[rowId].includes(columnId);
      input.checked = selected;
      td.dataset.selected = String(selected);
      marker.textContent = selected ? "✓ Selected" : "Choose";
    });
    block.config.rows.forEach((row) => {
      const value = answers[row.id];
      const selectedIds = typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
      const labels = selectedIds.map((id) => block.config.columns.find((column) => column.id === id)?.label ?? id);
      const status = rowStatuses.get(row.id);
      if (status) status.textContent = labels.length > 0 ? `Selected: ${labels.join(", ")}` : "Not selected";
    });
  };
  block.config.rows.forEach((row) => {
    const tr = node("tr");
    const heading = node("th");
    heading.setAttribute("scope", "row");
    const rowLabel = node("span", "hcc-widget__matrix-row-label", row.label);
    const rowStatus = node("span", "hcc-widget__matrix-row-status", "Not selected");
    rowStatus.id = `${block.id}-${instanceId}-${row.id}-status`;
    rowStatus.setAttribute("aria-live", "polite");
    rowStatuses.set(row.id, rowStatus);
    heading.append(rowLabel, rowStatus);
    tr.append(heading);
    block.config.columns.forEach((column) => {
      const td = node("td");
      const input = document.createElement("input");
      input.id = `${block.id}-${instanceId}-${row.id}-${column.id}`;
      input.type = block.config.selection === "one" ? "radio" : "checkbox";
      input.name = `${block.id}-${instanceId}-${row.id}`;
      input.value = column.id;
      input.required = block.config.require_all_rows === true;
      input.setAttribute("aria-label", `${row.label}: ${column.label}`);
      input.setAttribute("aria-describedby", rowStatus.id);
      input.checked = block.config.selection === "one"
        ? answers[row.id] === column.id
        : Array.isArray(answers[row.id]) && answers[row.id].includes(column.id);
      input.addEventListener("change", () => {
        if (block.config.selection === "one") {
          if (input.checked) answers[row.id] = column.id;
        }
        else {
          const values = new Set(Array.isArray(answers[row.id]) ? answers[row.id] : []);
          if (input.checked) values.add(column.id);
          else values.delete(column.id);
          if (values.size === 0) delete answers[row.id];
          else answers[row.id] = [...values];
        }
        syncCheckedState();
        changed({ ...answers }, "Session matrix response changed.");
      });
      const label = document.createElement("label");
      label.className = "hcc-widget__matrix-choice";
      label.htmlFor = input.id;
      const marker = node("span", "hcc-widget__matrix-choice-state", "Choose");
      label.append(input, marker);
      cells.push({ input, marker, td, rowId: row.id, columnId: column.id });
      td.append(label);
      tr.append(td);
    });
    body.append(tr);
  });
  syncCheckedState();
  table.append(caption, head, body);
  return table;
}
