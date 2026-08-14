export function node<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}

export function button(label: string, callback: () => void): HTMLButtonElement {
  const control = document.createElement("button");
  control.type = "button";
  control.className = "hcc-widget__button";
  control.textContent = label;
  control.addEventListener("click", callback);
  return control;
}

export function actionRow(...buttons: HTMLButtonElement[]): HTMLElement {
  const row = node("div", "hcc-widget__actions");
  row.append(...buttons);
  return row;
}

export function labeled(id: string, text: string, control: HTMLElement): HTMLElement {
  const wrapper = node("div", "hcc-widget__field");
  const label = node("label", "hcc-widget__label", text);
  label.htmlFor = id;
  wrapper.append(label, control);
  return wrapper;
}

export function fieldsetFor(legend: string): HTMLFieldSetElement {
  const fieldset = node("fieldset", "hcc-widget__fieldset");
  fieldset.append(node("legend", "hcc-widget__legend", legend));
  return fieldset;
}

export function optionLabel(input: HTMLInputElement, text: string): HTMLLabelElement {
  const label = node("label", "hcc-widget__option");
  label.append(input, document.createTextNode(text));
  return label;
}

export function codeDisclosure(summary: string, content: string, open: boolean): HTMLDetailsElement {
  const details = document.createElement("details");
  details.open = open;
  details.append(node("summary", undefined, summary));
  const pre = node("pre", "hcc-widget__preview-json");
  const code = document.createElement("code");
  code.textContent = content;
  pre.append(code);
  details.append(pre);
  return details;
}

export function descriptionList(items: ReadonlyArray<readonly [string, string]>): HTMLDListElement {
  const list = node("dl", "hcc-widget__description-list");
  items.forEach(([key, value]) => list.append(node("dt", undefined, key), node("dd", undefined, value)));
  return list;
}
