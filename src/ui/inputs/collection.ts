import type { CandidateInteraction, CandidateOption, CandidateRepeatableField, CandidateResponseValue } from "../../grammar";
import { button, fieldsetFor, labeled, node } from "../dom";
import { numericStepper } from "./numeric";

export function tagsControl(
  id: string,
  config: { suggestions?: CandidateOption[]; min_items?: number; max_items?: number; max_length?: number },
  initial: string[],
  changed: (value: CandidateResponseValue, message: string) => void
): HTMLElement {
  const wrapper = node("div", "hcc-widget__tags");
  const tags = [...new Set(initial)];
  const list = node("ul", "hcc-widget__tag-list");
  const input = document.createElement("input");
  input.id = `${id}-tag-input`;
  input.className = "hcc-widget__input";
  input.type = "text";
  input.placeholder = "Enter a tag";
  if (config.max_length) input.maxLength = config.max_length;
  if (config.suggestions?.length) {
    const datalist = document.createElement("datalist");
    datalist.id = `${id}-tag-suggestions`;
    config.suggestions.forEach((suggestion) => {
      const option = document.createElement("option"); option.value = suggestion.id; option.label = suggestion.label; datalist.append(option);
    });
    input.setAttribute("list", datalist.id);
    wrapper.append(datalist);
  }
  const redraw = (): void => {
    list.replaceChildren();
    tags.forEach((tag, index) => {
      const item = node("li", "hcc-widget__tag-item", tag);
      item.append(button(`Remove ${tag}`, () => {
        tags.splice(index, 1); changed([...tags], "Session tag removed."); redraw();
      }));
      list.append(item);
    });
  };
  const add = button("Add tag", () => {
    const value = input.value.trim();
    if (!value || tags.some((tag) => tag.toLowerCase() === value.toLowerCase()) || tags.length >= (config.max_items ?? 64)) return;
    tags.push(value); input.value = ""; changed([...tags], "Session tag added."); redraw(); input.focus();
  });
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); add.click(); } });
  wrapper.append(labeled(input.id, "Add plain-text tag", input), add, list);
  redraw();
  return wrapper;
}

export function repeatableControl(
  block: Extract<CandidateInteraction, { kind: "repeatable_group" }>,
  initial: Record<string, unknown>[],
  changed: (value: CandidateResponseValue, message: string) => void
): HTMLElement {
  const wrapper = node("div", "hcc-widget__repeatable");
  const items = initial.map((item) => ({ ...item }));
  const list = node("div", "hcc-widget__repeatable-list");
  const redraw = (): void => {
    list.replaceChildren();
    items.forEach((item, index) => {
      const group = fieldsetFor(`Item ${index + 1}`);
      block.config.fields.forEach((field) => group.append(repeatableField(block.id, index, field, item, () => {
        changed(items.map((entry) => ({ ...entry })), "Session repeatable item changed.");
      })));
      const remove = button(`Remove item ${index + 1}`, () => {
        items.splice(index, 1);
        changed(items.map((entry) => ({ ...entry })), "Session repeatable item removed.");
        redraw();
      });
      group.append(remove);
      list.append(group);
    });
  };
  const add = button("Add item", () => {
    const limit = block.config.max_items ?? 16;
    if (items.length >= limit) return;
    items.push({});
    changed(items.map((entry) => ({ ...entry })), "Session repeatable item added.");
    redraw();
  });
  wrapper.append(list, add);
  redraw();
  return wrapper;
}

function repeatableField(
  blockId: string,
  itemIndex: number,
  field: CandidateRepeatableField,
  item: Record<string, unknown>,
  changed: () => void
): HTMLElement {
  if (field.kind === "number") {
    const current = item[field.id];
    return labeled(`${blockId}-${itemIndex}-${field.id}`, field.label, numericStepper(
      `${blockId}-${itemIndex}-${field.id}`,
      typeof current === "number" ? current : null,
      { min: field.min, max: field.max, step: field.step },
      (value) => { item[field.id] = value; changed(); }
    ));
  }
  const input = document.createElement("input");
  input.id = `${blockId}-${itemIndex}-${field.id}`;
  input.type = field.kind === "short_text" ? "text" : field.kind === "boolean" ? "checkbox" : field.kind;
  input.required = field.required;
  if (field.kind === "boolean") input.checked = item[field.id] === true;
  else if (item[field.id] !== undefined) input.value = String(item[field.id]);
  input.addEventListener("input", () => {
    item[field.id] = field.kind === "boolean" ? input.checked
      : input.value;
    changed();
  });
  return labeled(input.id, field.label, input);
}
