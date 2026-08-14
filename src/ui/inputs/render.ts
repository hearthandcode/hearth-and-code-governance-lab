import type { CandidateInteraction, CandidateResponseValue } from "../../grammar";
import { fieldsetFor, labeled, node, optionLabel } from "../dom";
import { multiSelectControl, rankedControl } from "./choice";
import { repeatableControl, tagsControl } from "./collection";
import { matrixControl } from "./composite";
import { coordinatesControl, keyValueListControl, radioGroupControl, ratingControl, temporalRangeControl, unitValueControl } from "./expansion";
import { numericStepper } from "./numeric";

export function renderCandidateControl(
  block: CandidateInteraction,
  initial: CandidateResponseValue,
  changed: (value: CandidateResponseValue, message: string) => void
): HTMLElement {
  if (block.kind === "number") {
    return labeled(block.id, block.config.unit ? `Response (${block.config.unit})` : "Response", numericStepper(
      `${block.id}-input`,
      typeof initial === "number" ? initial : null,
      { min: block.config.min, max: block.config.max, step: block.config.step },
      (value) => changed(value, "Session candidate value changed.")
    ));
  }

  if (block.kind === "long_text") {
    const input = document.createElement("textarea");
    input.className = "hcc-widget__input hcc-widget__textarea";
    input.id = `${block.id}-long-text`;
    input.value = typeof initial === "string" ? initial : "";
    input.rows = block.config.rows ?? 6;
    if (block.config.placeholder) input.placeholder = block.config.placeholder;
    if (block.config.min_length !== undefined) input.minLength = block.config.min_length;
    if (block.config.max_length !== undefined) input.maxLength = block.config.max_length;
    input.addEventListener("input", () => changed(input.value, "Session long-text value changed."));
    return labeled(input.id, "Response", input);
  }

  if (block.kind === "short_text" || block.kind === "date") {
    const input = document.createElement("input");
    input.className = "hcc-widget__input";
    input.id = `${block.id}-input`;
    input.type = block.kind === "short_text" ? "text" : "date";
    if (block.kind === "short_text") {
      input.value = typeof initial === "string" ? initial : "";
      if (block.config.placeholder) input.placeholder = block.config.placeholder;
      if (block.config.min_length !== undefined) input.minLength = block.config.min_length;
      if (block.config.max_length !== undefined) input.maxLength = block.config.max_length;
    } else {
      input.value = typeof initial === "string" ? initial : "";
      if (block.config.min) input.min = block.config.min;
      if (block.config.max) input.max = block.config.max;
    }
    input.addEventListener("input", () => changed(
      input.value,
      "Session candidate value changed."
    ));
    return labeled(block.id, "Response", input);
  }

  if (block.kind === "boolean") {
    const fieldset = fieldsetFor("Choose one");
    const labels: Array<[boolean, string]> = [
      [true, block.config.true_label ?? "Yes"],
      [false, block.config.false_label ?? "No"]
    ];
    labels.forEach(([value, text]) => {
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `${block.id}-boolean`;
      input.checked = initial === value;
      input.addEventListener("change", () => changed(value, `Session candidate changed to ${text}.`));
      fieldset.append(optionLabel(input, text));
    });
    return fieldset;
  }

  if (block.kind === "scale") {
    const input = document.createElement("input");
    input.type = "range";
    input.id = `${block.id}-scale`;
    input.min = String(block.config.min);
    input.max = String(block.config.max);
    input.step = String(block.config.step);
    input.value = String(typeof initial === "number" ? initial : block.config.min);
    const output = node("output", "hcc-widget__scale-output", typeof initial === "number" ? String(initial) : "Not answered");
    output.htmlFor = input.id;
    input.addEventListener("input", () => {
      output.value = input.value;
      changed(input.valueAsNumber, "Session scale value changed.");
    });
    const wrapper = labeled(block.id, `Scale ${block.config.min}–${block.config.max}`, input);
    wrapper.append(output);
    if (block.config.labels && block.config.labels.length > 0) {
      const labels = node("p", "hcc-widget__help", block.config.labels.map((item) => `${item.id}: ${item.label}`).join(" · "));
      labels.id = `${block.id}-scale-labels`;
      input.setAttribute("aria-describedby", labels.id);
      wrapper.append(labels);
    }
    return wrapper;
  }

  if (block.kind === "ranked_choice") {
    return rankedControl(block.id, block.config.options, Array.isArray(initial) ? initial.filter((item): item is string => typeof item === "string") : [], changed);
  }
  if (block.kind === "matrix") {
    return matrixControl(block, isRecord(initial) ? initial : {}, changed);
  }
  if (block.kind === "repeatable_group") return repeatableControl(block, Array.isArray(initial) ? initial.filter(isRecord) : [], changed);
  if (block.kind === "dropdown") {
    const select = document.createElement("select");
    select.id = `${block.id}-dropdown`;
    select.className = "hcc-widget__select";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = block.config.placeholder ?? "Choose an option";
    select.append(placeholder);
    block.config.options.forEach((option) => {
      const item = document.createElement("option");
      item.value = option.id;
      item.textContent = option.label;
      select.append(item);
    });
    select.value = typeof initial === "string" ? initial : "";
    select.addEventListener("change", () => changed(select.value || null, "Session dropdown selection changed."));
    return labeled(select.id, "Choose one", select);
  }
  if (block.kind === "multi_select") {
    return multiSelectControl(block.id, block.config.options, Array.isArray(initial) ? initial.filter((item): item is string => typeof item === "string") : [], changed);
  }
  if (block.kind === "radio_group") return radioGroupControl(block, initial, changed);
  if (block.kind === "rating") return ratingControl(block, initial, changed);
  if (block.kind === "date_range" || block.kind === "time_range") return temporalRangeControl(block, initial, changed);
  if (block.kind === "unit_value") return unitValueControl(block, initial, changed);
  if (block.kind === "key_value_list") return keyValueListControl(block, initial, changed);
  if (block.kind === "coordinates") return coordinatesControl(block, initial, changed);
  if (block.kind === "time" || block.kind === "datetime") {
    const input = document.createElement("input");
    input.id = `${block.id}-temporal`;
    input.className = "hcc-widget__input";
    input.type = block.kind === "time" ? "time" : "datetime-local";
    input.value = typeof initial === "string" ? initial : "";
    if (block.config.min) input.min = block.config.min;
    if (block.config.max) input.max = block.config.max;
    if (block.kind === "time" && block.config.step_minutes) input.step = String(block.config.step_minutes * 60);
    input.addEventListener("input", () => changed(input.value || null, "Session temporal value changed."));
    return labeled(input.id, block.kind === "time" ? "Local time" : "Local date and time", input);
  }
  if (block.kind === "duration") {
    const unit = block.config.display_unit ?? "minutes";
    return labeled(block.id, `Duration (canonical minutes${unit === "hours" ? "; preferred projection: hours" : ""})`, numericStepper(
      `${block.id}-duration`, typeof initial === "number" ? initial : null,
      { min: block.config.min_minutes, max: block.config.max_minutes, step: block.config.step_minutes },
      (value) => changed(value, "Session duration changed.")
    ));
  }
  if (block.kind === "currency") {
    return labeled(block.id, `Amount (${block.config.currency})`, numericStepper(
      `${block.id}-currency`, typeof initial === "number" ? initial : null,
      { min: block.config.min, max: block.config.max, step: block.config.step },
      (value) => changed(value, "Session currency amount changed.")
    ));
  }
  if (block.kind === "email" || block.kind === "url") {
    const input = document.createElement("input");
    input.id = `${block.id}-input`;
    input.className = "hcc-widget__input";
    input.type = block.kind;
    input.value = typeof initial === "string" ? initial : "";
    if (block.config.placeholder) input.placeholder = block.config.placeholder;
    if (block.kind === "email") input.multiple = block.config.allow_multiple === true;
    input.addEventListener("input", () => changed(input.value || null, `Session ${block.kind} value changed.`));
    return labeled(input.id, block.kind === "email" ? "Email address" : "Web address", input);
  }
  if (block.kind === "month" || block.kind === "week") {
    const input = document.createElement("input");
    input.id = `${block.id}-temporal-period`;
    input.className = "hcc-widget__input";
    input.type = block.kind;
    input.value = typeof initial === "string" ? initial : "";
    if (block.config.min) input.min = block.config.min;
    if (block.config.max) input.max = block.config.max;
    input.addEventListener("input", () => changed(input.value || null, `Session ${block.kind} changed.`));
    return labeled(input.id, block.kind === "month" ? "Calendar month" : "ISO week", input);
  }
  if (block.kind === "percentage") {
    return labeled(`${block.id}-percentage`, "Percentage", numericStepper(
      `${block.id}-percentage`, typeof initial === "number" ? initial : null,
      { min: block.config.min, max: block.config.max, step: block.config.step },
      (value) => changed(value, "Session percentage changed.")
    ));
  }
  if (block.kind === "color") {
    const input = document.createElement("input");
    input.id = `${block.id}-color`;
    input.className = "hcc-widget__color-input";
    input.type = "color";
    input.value = typeof initial === "string" && /^#[0-9a-f]{6}$/i.test(initial) ? initial : "#6750a4";
    input.addEventListener("input", () => changed(input.value, "Session color changed."));
    return labeled(input.id, "Color and hex value", input);
  }
  if (block.kind === "phone") {
    const input = document.createElement("input");
    input.id = `${block.id}-phone`;
    input.className = "hcc-widget__input";
    input.type = "tel";
    input.value = typeof initial === "string" ? initial : "";
    if (block.config.placeholder) input.placeholder = block.config.placeholder;
    if (block.config.min_length) input.minLength = block.config.min_length;
    if (block.config.max_length) input.maxLength = block.config.max_length;
    input.addEventListener("input", () => changed(input.value || null, "Session phone text changed; no call is made."));
    return labeled(input.id, "Telephone number", input);
  }
  if (block.kind === "tags") {
    return tagsControl(block.id, block.config, Array.isArray(initial) ? initial.filter((item): item is string => typeof item === "string") : [], changed);
  }
  if (block.kind === "numeric_range") {
    const value = isRecord(initial) ? initial : {};
    const wrapper = fieldsetFor(block.config.unit ? `Range (${block.config.unit})` : "Numeric range");
    const range: Record<string, unknown> = {
      ...(typeof value.lower === "number" ? { lower: value.lower } : {}),
      ...(typeof value.upper === "number" ? { upper: value.upper } : {})
    };
    const update = (key: "lower" | "upper", next: number | null): void => {
      if (next === null) delete range[key]; else range[key] = next;
      changed(Object.keys(range).length === 0 ? null : { ...range }, "Session numeric range changed.");
    };
    wrapper.append(
      labeled(`${block.id}-lower`, "Lower bound", numericStepper(`${block.id}-lower`, typeof value.lower === "number" ? value.lower : null, block.config, (next) => update("lower", next))),
      labeled(`${block.id}-upper`, "Upper bound", numericStepper(`${block.id}-upper`, typeof value.upper === "number" ? value.upper : null, block.config, (next) => update("upper", next)))
    );
    return wrapper;
  }
  if (block.kind === "file_reference") {
    const input = document.createElement("input");
    input.id = `${block.id}-file-reference`;
    input.className = "hcc-widget__input";
    input.type = "text";
    input.value = typeof initial === "string" ? initial : "";
    input.placeholder = "Folder/Document.md";
    input.addEventListener("input", () => changed(input.value || null, "Session file locator changed; no file is opened."));
    const wrapper = labeled(input.id, "Vault-relative file locator", input);
    if (block.config.extensions?.length) wrapper.append(node("p", "hcc-widget__help", `Allowed extensions: ${block.config.extensions.join(", ")}`));
    return wrapper;
  }
  return node("p", "hcc-widget__held-note", "No renderer is available for this candidate kind.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
