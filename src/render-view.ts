import yaml from "js-yaml";

import {
  buildHccViewModel,
  renderHccView,
  validateHccViewCandidate,
  type ResolvedViewSource,
  type ViewDiagnostic,
  type VaultViewSource
} from "./visualization";

export type ViewSourceResolver = (binding: VaultViewSource) => Promise<
  { ok: true; source: ResolvedViewSource } | { ok: false; message: string }
>;

export function renderHccViewFence(
  container: HTMLElement,
  source: string,
  resolve?: ViewSourceResolver
): () => void {
  let active = true;
  let candidate: unknown;
  try {
    candidate = yaml.load(source, { schema: yaml.JSON_SCHEMA });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown YAML parse error";
    renderViewDiagnostics(container, [{ code: "HCC-VIEW-SCHEMA", path: "$", message }], source);
    return () => { active = false; };
  }
  const parsed = validateHccViewCandidate(candidate);
  if (!parsed.ok) {
    renderViewDiagnostics(container, parsed.diagnostics, source);
    return () => { active = false; };
  }

  const draw = (resolved?: ResolvedViewSource): void => {
    if (!active) return;
    container.replaceChildren();
    renderHccView(buildHccViewModel(parsed.view, resolved), container);
    const warning = document.createElement("p");
    warning.className = "hcc-widget__phase-notice";
    warning.textContent = "Candidate projection only · no source, response, or vault file was changed.";
    container.firstElementChild?.append(warning);
  };
  draw();
  if (parsed.view.source.mode === "vault" && resolve) {
    void resolve(parsed.view.source).then((result) => {
      if (!active) return;
      if (result.ok) draw(result.source);
      else {
        const note = document.createElement("p");
        note.className = "hcc-validation-summary";
        note.textContent = result.message;
        container.firstElementChild?.append(note);
      }
    });
  }
  return () => { active = false; };
}

export function renderViewDiagnostics(
  container: HTMLElement,
  diagnostics: readonly ViewDiagnostic[],
  source: string
): void {
  container.replaceChildren();
  const root = document.createElement("article");
  root.className = "hcc-widget hcc-widget--error";
  root.setAttribute("role", "alert");
  const title = document.createElement("h3");
  title.textContent = "HCC view could not be rendered";
  const notice = document.createElement("p");
  notice.textContent = "The declarative source remains unchanged and visible below.";
  const list = document.createElement("ul");
  diagnostics.forEach((diagnostic) => {
    const item = document.createElement("li");
    item.textContent = `${diagnostic.code} at ${diagnostic.path}: ${diagnostic.message}`;
    list.append(item);
  });
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = source;
  pre.append(code);
  root.append(title, notice, list, pre);
  container.append(root);
}
