import { dump } from "js-yaml";

import { STUDIO_VERSION, type StudioDiagnostic, type StudioProjectionModel } from "./types";

export interface StudioRenderActions { copyText?: (value: string) => Promise<void>; }

export function renderStudioProjection(container: HTMLElement, model: StudioProjectionModel, actions: StudioRenderActions = {}): void {
  container.replaceChildren();
  const root = element("article", "hcc-studio hcc-workbook");
  root.dataset.studioId = model.studio.id;
  root.append(
    element("p", "hcc-widget__identity", "HCC schema and workflow studio candidate"),
    element("h3", "hcc-workbook__title", model.studio.title),
    element("p", "hcc-workbook__purpose", model.studio.purpose),
    notice("Local projection only. This studio cannot admit a schema, advance a workflow, mutate a source, or call a provider.")
  );
  root.append(descriptionList([
    ["Studio ID", model.studio.id], ["Contract", model.contract_version], ["Schema", `${model.studio.schema.id}@${model.studio.schema.version}`],
    ["Workflow", `${model.studio.workflow.id}@${model.studio.workflow.version}`], ["Semantic owner", model.studio.schema.semantic_owner],
    ["Sources", String(model.counts.sources)], ["Transitions", String(model.counts.transitions)], ["Authority", model.authority]
  ]));

  const toolbar = element("div", "hcc-studio__toolbar");
  toolbar.setAttribute("role", "toolbar"); toolbar.setAttribute("aria-label", "Studio candidate actions");
  const copy = button("Copy normalized design YAML");
  const status = element("span", "hcc-studio__status"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
  copy.disabled = !actions.copyText;
  copy.addEventListener("click", () => {
    if (!actions.copyText) return;
    const source = dump(model.studio, { lineWidth: -1, noRefs: true });
    void actions.copyText(source).then(() => { status.textContent = "Normalized candidate YAML copied; no vault file changed."; }, () => { status.textContent = "Clipboard copy failed; no vault file changed."; });
  });
  const held = button("Advance workflow · human authority required"); held.disabled = true;
  toolbar.append(copy, held, status); root.append(toolbar);

  const context = disclosure("Governed context", true);
  context.append(table("Explicit source bindings", ["ID", "Path", "Digest", "Authority", "Sensitivity"], model.studio.context.sources.map((source) => [source.id, source.path, source.digest, source.authority, source.sensitivity])));
  context.append(table("Context axes", ["ID", "Label", "Question"], model.studio.context.axes.map((axis) => [axis.id, axis.label, axis.question])));
  context.append(descriptionList([["Charter references", model.studio.context.charter_refs.join(", ")]]));
  root.append(context);

  const schema = disclosure("Schema candidate", true);
  schema.append(descriptionList([["Schema ID", model.studio.schema.id], ["Version", model.studio.schema.version], ["Semantic owner", model.studio.schema.semantic_owner]]));
  for (const record of model.studio.schema.record_types) {
    const recordDetails = disclosure(`${record.label} · ${record.id}`, false);
    recordDetails.append(element("p", undefined, record.description));
    recordDetails.append(table("Fields", ["ID", "Label", "Type", "Required", "Vocabulary"], record.fields.map((field) => [field.id, field.label, field.type, String(field.required), field.vocabulary_ref ?? "none"])));
    schema.append(recordDetails);
  }
  schema.append(table("Vocabulary bindings", ["ID", "Source", "Version", "Terms"], model.studio.schema.vocabularies.map((item) => [item.id, item.source_ref, item.version, item.terms.join(", ")])));
  schema.append(table("Invariants", ["ID", "Kind", "Fields", "Failure message"], model.studio.schema.invariants.map((item) => [item.id, item.kind, item.field_refs.join(", "), item.message])));
  const migration = model.studio.schema.migration;
  const migrationDetails = disclosure(`Migration · ${migration.from_version} → ${migration.to_version}`, false);
  migrationDetails.append(descriptionList([["Compatibility", migration.compatibility], ["Loss report", migration.loss_report.join("; ") || "No declared loss"], ["Reversal", migration.reversal]]));
  migrationDetails.append(table("Migration mappings", ["From", "To", "Action"], migration.mappings.map((item) => [item.from, item.to ?? "none", item.action])));
  schema.append(migrationDetails); root.append(schema);

  const workflow = disclosure("Workflow candidate", true);
  workflow.append(table("States", ["ID", "Label", "Terminal"], model.studio.workflow.states.map((item) => [item.id, item.label, String(item.terminal)])));
  workflow.append(table("Actors", ["ID", "Label", "Authority"], model.studio.workflow.actors.map((item) => [item.id, item.label, item.authority])));
  workflow.append(table("Declarative guards", ["ID", "Kind", "Fields", "Gate/source"], model.studio.workflow.guards.map((item) => [item.id, item.kind, item.field_refs.join(", ") || "none", item.gate_ref ?? item.source_ref ?? "none"])));
  workflow.append(table("Proposal-only effects", ["ID", "Kind", "Target", "Authority"], model.studio.workflow.effects.map((item) => [item.id, item.kind, item.target, item.authority])));
  workflow.append(table("Recovery rules", ["ID", "Kind", "Description"], model.studio.workflow.recoveries.map((item) => [item.id, item.kind, item.description])));
  workflow.append(table("HumanGates", ["ID", "Label", "Required", "Authority"], model.studio.workflow.human_gates.map((item) => [item.id, item.label, String(item.required), item.authority])));
  workflow.append(table("Transitions · inspection only", ["ID", "From → to", "Actor", "Guards", "Effects", "Recovery", "HumanGate", "Receipt"], model.studio.workflow.transitions.map((item) => [item.id, `${item.from} → ${item.to}`, item.actor_ref, item.guard_refs.join(", "), item.effect_refs.join(", ") || "none", item.recovery_ref, item.human_gate_ref, item.receipt])));
  root.append(workflow);

  const projections = disclosure("Dashboard specifications", false);
  projections.append(table("Candidate dashboard selectors", ["ID", "Title", "Selector"], model.studio.projections.map((item) => [item.id, item.title, item.selector])));
  root.append(projections);

  const scale = disclosure("Power-of-two architecture · 4 dimensions / 8 families / 16 contracts", false);
  scale.append(orderedList("Four dimensions", model.scale.dimensions.map((item) => `${item.id}: ${item.label}`)));
  scale.append(orderedList("Eight feature families", model.scale.featureFamilies.map((item) => `${item.id}: ${item.label}`)));
  scale.append(orderedList("Sixteen review contracts", model.scale.reviewContracts.map((item) => `${item.id}: ${item.label}`)));
  root.append(scale);

  const governance = disclosure("Governance and effect ceiling", false);
  governance.append(descriptionList([
    ["Authority", model.studio.governance.authority], ["Review required", String(model.studio.governance.review_required)],
    ["Verification required", String(model.studio.governance.verification_required)], ["Admission", model.studio.governance.admission],
    ["Schema admission", model.effects.schema_admission], ["Workflow advance", model.effects.workflow_advance],
    ["Source mutation", model.effects.source_mutation], ["Network", model.effects.network]
  ]));
  root.append(governance); container.append(root);
}

export function buildStudioDiagnosticReport(diagnostics: readonly StudioDiagnostic[], source: string): string {
  return JSON.stringify({
    record_type: "hcc-schema-workflow-studio-diagnostic-report",
    contract_version: STUDIO_VERSION,
    authority: "diagnostic-only",
    source,
    diagnostics: diagnostics.map((item) => ({ code: item.code, path: item.path, message: item.message })),
    effects: { source_mutation: "prohibited", schema_admission: "prohibited", workflow_advance: "prohibited", network: "prohibited" }
  }, null, 2);
}

export function renderStudioDiagnostics(
  container: HTMLElement,
  diagnostics: readonly StudioDiagnostic[],
  source: string,
  actions: StudioRenderActions = {}
): void {
  container.replaceChildren();
  const root = element("article", "hcc-studio hcc-workbook hcc-widget--error"); root.setAttribute("role", "alert");
  root.append(element("h3", undefined, "HCC schema/workflow studio could not be rendered"), notice("The YAML remains unchanged. Unknown fields, references, transitions, versions, and authority claims fail closed."));
  const list = document.createElement("ul");
  for (const diagnostic of diagnostics) list.append(element("li", undefined, `${diagnostic.code} at ${diagnostic.path}: ${diagnostic.message}`));
  const toolbar = element("div", "hcc-studio__toolbar");
  toolbar.setAttribute("role", "toolbar"); toolbar.setAttribute("aria-label", "Studio diagnostic actions");
  const copy = button("Copy diagnostic report");
  const status = element("span", "hcc-studio__status"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
  copy.disabled = !actions.copyText;
  copy.addEventListener("click", () => {
    if (!actions.copyText) return;
    copy.disabled = true;
    void actions.copyText(buildStudioDiagnosticReport(diagnostics, source)).then(
      () => { copy.textContent = "Copied"; status.textContent = "Complete diagnostics and original YAML copied; no vault file changed."; },
      () => { copy.textContent = "Copy diagnostic report"; status.textContent = "Clipboard copy failed; diagnostics and original YAML remain selectable."; }
    ).finally(() => { copy.disabled = false; });
  });
  toolbar.append(copy, status);
  const pre = document.createElement("pre"); pre.className = "hcc-widget__preview-json hcc-studio__diagnostic-source"; pre.tabIndex = 0;
  const code = document.createElement("code"); code.textContent = source; pre.append(code);
  root.append(list, toolbar, pre); container.append(root);
}

function disclosure(label: string, open: boolean): HTMLDetailsElement { const details = document.createElement("details"); details.className = "hcc-studio__section"; details.open = open; details.append(element("summary", undefined, label)); return details; }
function table(captionText: string, headers: readonly string[], rows: readonly (readonly string[])[]): HTMLElement {
  const wrap = element("div", "hcc-studio__table-wrap"); const tableElement = document.createElement("table"); tableElement.className = "hcc-studio__table";
  const caption = document.createElement("caption"); caption.textContent = captionText; const head = document.createElement("thead"); const headRow = document.createElement("tr");
  headers.forEach((label) => { const cell = document.createElement("th"); cell.scope = "col"; cell.textContent = label; headRow.append(cell); }); head.append(headRow);
  const body = document.createElement("tbody"); rows.forEach((row) => { const tr = document.createElement("tr"); row.forEach((value) => { const cell = document.createElement("td"); cell.textContent = value; tr.append(cell); }); body.append(tr); });
  tableElement.append(caption, head, body); wrap.append(tableElement); return wrap;
}
function orderedList(title: string, entries: readonly string[]): HTMLElement { const section = element("section", "hcc-studio__scale-list"); section.append(element("h4", undefined, title)); const list = document.createElement("ol"); entries.forEach((entry) => list.append(element("li", undefined, entry))); section.append(list); return section; }
function descriptionList(entries: readonly (readonly [string, string])[]): HTMLDListElement { const list = document.createElement("dl"); list.className = "hcc-widget__description-list"; entries.forEach(([term, value]) => { list.append(element("dt", undefined, term), element("dd", undefined, value)); }); return list; }
function notice(text: string): HTMLElement { const item = element("p", "hcc-widget__phase-notice", text); item.setAttribute("role", "note"); return item; }
function button(text: string): HTMLButtonElement { const item = document.createElement("button"); item.type = "button"; item.textContent = text; return item; }
function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] { const item = document.createElement(tag); if (className) item.className = className; if (text !== undefined) item.textContent = text; return item; }
