import { button, node } from "../dom";

export interface NumericConstraints {
  min?: number;
  max?: number;
  step?: number;
}

export function numericStepper(
  id: string,
  initial: number | null,
  constraints: NumericConstraints,
  changed: (value: number | null) => void
): HTMLElement {
  const wrapper = node("div", "hcc-widget__number-stepper");
  const input = document.createElement("input");
  input.id = id;
  input.className = "hcc-widget__input hcc-widget__number-input";
  input.type = "number";
  input.inputMode = "decimal";
  input.value = initial === null ? "" : String(initial);
  if (constraints.min !== undefined) input.min = String(constraints.min);
  if (constraints.max !== undefined) input.max = String(constraints.max);
  input.step = String(constraints.step ?? 1);
  input.addEventListener("keydown", (event) => {
    if (["e", "E", "+"].includes(event.key) || (event.key === "-" && (constraints.min ?? -1) >= 0)) event.preventDefault();
  });
  input.addEventListener("input", () => {
    if (input.value === "") changed(null);
    else if (Number.isFinite(input.valueAsNumber)) changed(input.valueAsNumber);
  });
  const applyStep = (direction: -1 | 1): void => {
    if (input.value === "") input.value = String(constraints.min ?? 0);
    else if (direction < 0) input.stepDown();
    else input.stepUp();
    changed(input.valueAsNumber);
    input.focus();
  };
  const decrement = button("−", () => applyStep(-1));
  decrement.classList.add("hcc-widget__stepper-button");
  decrement.setAttribute("aria-label", "Decrement value");
  const increment = button("+", () => applyStep(1));
  increment.classList.add("hcc-widget__stepper-button");
  increment.setAttribute("aria-label", "Increment value");
  wrapper.append(decrement, input, increment);
  return wrapper;
}
