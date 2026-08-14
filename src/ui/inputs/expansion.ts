import type { CandidateInteraction, CandidateResponseValue } from "../../grammar";
import { button, fieldsetFor, labeled, node, optionLabel } from "../dom";
import { numericStepper } from "./numeric";

type Changed = (value: CandidateResponseValue, message: string) => void;

function record(value: CandidateResponseValue): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

export function radioGroupControl(block: Extract<CandidateInteraction, { kind: "radio_group" }>, initial: CandidateResponseValue, changed: Changed): HTMLElement {
  const wrapper = fieldsetFor("Choose one");
  wrapper.classList.add(`hcc-widget__radio-group--${block.config.orientation ?? "vertical"}`);
  block.config.options.forEach((option) => {
    const input = document.createElement("input");
    input.type = "radio";
    input.name = `${block.id}-radio-group`;
    input.value = option.id;
    input.checked = initial === option.id;
    input.addEventListener("change", () => changed(option.id, `Session selection changed to ${option.label}.`));
    wrapper.append(optionLabel(input, option.label));
  });
  return wrapper;
}

export function ratingControl(block: Extract<CandidateInteraction, { kind: "rating" }>, initial: CandidateResponseValue, changed: Changed): HTMLElement {
  const wrapper = fieldsetFor(`Rating ${block.config.min}–${block.config.max}`);
  wrapper.classList.add("hcc-widget__rating");
  const values: number[] = [];
  for (let value = block.config.min; value <= block.config.max + block.config.step / 10; value += block.config.step) values.push(Number(value.toFixed(10)));
  const controls = node("div", "hcc-widget__rating-values");
  const redraw = (selected: number | null): void => {
    controls.querySelectorAll<HTMLButtonElement>("button").forEach((item) => item.setAttribute("aria-pressed", String(Number(item.dataset.value) === selected)));
  };
  values.forEach((value) => {
    const control = button(String(value), () => { changed(value, `Session rating changed to ${value}.`); redraw(value); });
    control.dataset.value = String(value);
    control.setAttribute("aria-pressed", String(initial === value));
    control.setAttribute("aria-label", `Rate ${value} of ${block.config.max}`);
    controls.append(control);
  });
  wrapper.append(controls);
  if (block.config.min_label || block.config.max_label) wrapper.append(node("p", "hcc-widget__help", `${block.config.min_label ?? block.config.min} · ${block.config.max_label ?? block.config.max}`));
  return wrapper;
}

export function temporalRangeControl(
  block: Extract<CandidateInteraction, { kind: "date_range" | "time_range" }>,
  initial: CandidateResponseValue,
  changed: Changed
): HTMLElement {
  const current = record(initial);
  const value: Record<string, string> = {};
  if (typeof current.start === "string") value.start = current.start;
  if (typeof current.end === "string") value.end = current.end;
  const wrapper = fieldsetFor(block.kind === "date_range" ? "Date range" : "Local time range");
  const update = (key: "start" | "end", next: string): void => {
    if (next) value[key] = next; else delete value[key];
    changed(Object.keys(value).length === 0 ? null : { ...value }, `Session ${block.kind.replace("_", " ")} changed.`);
  };
  for (const key of ["start", "end"] as const) {
    const input = document.createElement("input");
    input.id = `${block.id}-${key}`;
    input.className = "hcc-widget__input";
    input.type = block.kind === "date_range" ? "date" : "time";
    input.value = value[key] ?? "";
    if (block.config.min) input.min = block.config.min;
    if (block.config.max) input.max = block.config.max;
    if (block.kind === "time_range" && block.config.step_minutes) input.step = String(block.config.step_minutes * 60);
    input.addEventListener("input", () => update(key, input.value));
    wrapper.append(labeled(input.id, key === "start" ? "Start" : "End", input));
  }
  return wrapper;
}

export function unitValueControl(block: Extract<CandidateInteraction, { kind: "unit_value" }>, initial: CandidateResponseValue, changed: Changed): HTMLElement {
  const current = record(initial);
  const result: Record<string, unknown> = {};
  if (typeof current.value === "number") result.value = current.value;
  if (typeof current.unit === "string") result.unit = current.unit;
  const update = (): void => changed(Object.keys(result).length === 0 ? null : { ...result }, "Session measured value changed.");
  const wrapper = fieldsetFor("Value and unit");
  const amount = numericStepper(`${block.id}-value`, typeof result.value === "number" ? result.value : null, block.config, (value) => { if (value === null) delete result.value; else result.value = value; update(); });
  const select = document.createElement("select");
  select.id = `${block.id}-unit`;
  select.className = "hcc-widget__select";
  const blank = document.createElement("option"); blank.value = ""; blank.textContent = "Choose a unit"; select.append(blank);
  block.config.units.forEach((unit) => { const option = document.createElement("option"); option.value = unit.id; option.textContent = unit.label; select.append(option); });
  select.value = typeof result.unit === "string" ? result.unit : "";
  select.addEventListener("change", () => { if (select.value) result.unit = select.value; else delete result.unit; update(); });
  wrapper.append(labeled(`${block.id}-value`, "Value", amount), labeled(select.id, "Unit", select));
  return wrapper;
}

export function keyValueListControl(block: Extract<CandidateInteraction, { kind: "key_value_list" }>, initial: CandidateResponseValue, changed: Changed): HTMLElement {
  const entries = Array.isArray(initial) ? initial.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item)).map((item) => ({ key: String(item.key ?? ""), value: String(item.value ?? "") })) : [];
  const wrapper = node("div", "hcc-widget__key-values");
  const list = node("div", "hcc-widget__key-value-list");
  const emit = (message: string): void => changed(entries.map((item) => ({ ...item })), message);
  const redraw = (): void => {
    list.replaceChildren();
    entries.forEach((entry, index) => {
      const row = fieldsetFor(`Entry ${index + 1}`);
      for (const key of ["key", "value"] as const) {
        const input = document.createElement("input");
        input.id = `${block.id}-${index}-${key}`;
        input.className = "hcc-widget__input";
        input.type = "text";
        input.value = entry[key];
        if (block.config.max_length) input.maxLength = block.config.max_length;
        input.addEventListener("input", () => { entry[key] = input.value; emit("Session key-value entry changed."); });
        row.append(labeled(input.id, key === "key" ? block.config.key_label ?? "Key" : block.config.value_label ?? "Value", input));
      }
      row.append(button(`Remove entry ${index + 1}`, () => { entries.splice(index, 1); emit("Session key-value entry removed."); redraw(); }));
      list.append(row);
    });
  };
  const add = button("Add entry", () => {
    if (entries.length >= (block.config.max_items ?? 16)) return;
    entries.push({ key: "", value: "" }); emit("Session key-value entry added."); redraw();
    list.querySelector<HTMLInputElement>(`#${block.id}-${entries.length - 1}-key`)?.focus();
  });
  wrapper.append(list, add); redraw(); return wrapper;
}

export function coordinatesControl(block: Extract<CandidateInteraction, { kind: "coordinates" }>, initial: CandidateResponseValue, changed: Changed): HTMLElement {
  const current = record(initial);
  const result: Record<string, number> = {};
  if (typeof current.latitude === "number") result.latitude = current.latitude;
  if (typeof current.longitude === "number") result.longitude = current.longitude;
  const wrapper = fieldsetFor("Manual coordinates");
  const update = (key: "latitude" | "longitude", value: number | null): void => {
    if (value === null) delete result[key]; else result[key] = value;
    changed(Object.keys(result).length === 0 ? null : { ...result }, "Session manual coordinates changed; no device location was requested.");
  };
  const step = 10 ** -(block.config.precision ?? 6);
  wrapper.append(
    labeled(`${block.id}-latitude`, block.config.latitude_label ?? "Latitude", numericStepper(`${block.id}-latitude`, result.latitude ?? null, { min: -90, max: 90, step }, (value) => update("latitude", value))),
    labeled(`${block.id}-longitude`, block.config.longitude_label ?? "Longitude", numericStepper(`${block.id}-longitude`, result.longitude ?? null, { min: -180, max: 180, step }, (value) => update("longitude", value))),
    node("p", "hcc-widget__help", "Manual entry only. This control does not request or infer device location.")
  );
  return wrapper;
}
