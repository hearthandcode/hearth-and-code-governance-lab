import { DASHBOARD_MODE_LABELS } from "./model";
import type { DashboardProjection } from "./types";

export type DashboardGovernanceOperation = "prepare_review" | "prepare_verification";

export interface DashboardRenderActions {
  copyText?: (value: string) => Promise<void>;
  openSource?: (path: string) => void;
  prepareGovernanceProposal?: (operation: DashboardGovernanceOperation) => string;
}

export function buildDashboardProjectionReport(projection: DashboardProjection): string {
  return JSON.stringify(projection, null, 2);
}

export function renderDashboardProjection(
  container: HTMLElement,
  projection: DashboardProjection,
  actions: DashboardRenderActions = {}
): void {
  const doc = container.ownerDocument;
  container.replaceChildren();
  container.classList.add("hcc-dashboard__projection");
  const notice = doc.createElement("p");
  notice.className = "hcc-widget__phase-notice";
  notice.setAttribute("role", "note");
  notice.textContent = "Read-only projection. It does not scan the vault or change source records. Exact-source navigation and copied proposals confer no authority.";
  container.append(notice);

  const toolbar = doc.createElement("div"); toolbar.className = "hcc-dashboard__projection-toolbar";
  toolbar.setAttribute("role", "toolbar"); toolbar.setAttribute("aria-label", "Dashboard projection actions");
  const copy = button(doc, "Copy projection report"); copy.disabled = !actions.copyText;
  const copyStatus = status(doc);
  copy.addEventListener("click", () => {
    if (!actions.copyText) return;
    copy.disabled = true;
    void actions.copyText(buildDashboardProjectionReport(projection)).then(
      () => { copy.textContent = "Copied"; copyStatus.textContent = "Complete bounded projection report copied."; },
      () => { copy.textContent = "Copy projection report"; copyStatus.textContent = "Copy failed; the visible projection remains available and no source changed."; }
    ).finally(() => { copy.disabled = false; });
  });
  toolbar.append(copy, copyStatus); container.append(toolbar);

  const scope = doc.createElement("dl");
  scope.className = "hcc-widget__description-list";
  appendDescription(doc, scope, "Mode", DASHBOARD_MODE_LABELS[projection.mode]);
  appendSourceDescription(doc, scope, projection.source.path, actions.openSource);
  appendDescription(doc, scope, "Digest", projection.source.digest);
  appendDescription(doc, scope, "Scope", `${projection.scope.included_record_count} admitted records; ${projection.scope.excluded_restricted_count} restricted exclusions`);
  container.append(scope);

  container.append(renderProvenanceTrail(doc, projection, actions.openSource));

  if (projection.items.length === 0) {
    const empty = doc.createElement("p");
    empty.className = "hcc-dashboard__empty";
    empty.textContent = "No explicit metadata signals matched this selector. No value was inferred.";
    container.append(empty);
  } else {
    const wrap = doc.createElement("div");
    wrap.className = "hcc-dashboard__table-wrap";
    const table = doc.createElement("table");
    table.className = "hcc-dashboard__table";
    const caption = doc.createElement("caption");
    caption.textContent = `${DASHBOARD_MODE_LABELS[projection.mode]} projection`;
    const head = doc.createElement("thead");
    const headRow = doc.createElement("tr");
    for (const label of ["Record", "Declared signal", "Declared value", "Route", "Source action"]) {
      const cell = doc.createElement("th"); cell.scope = "col"; cell.textContent = label; headRow.append(cell);
    }
    head.append(headRow);
    const body = doc.createElement("tbody");
    for (const item of projection.items) {
      const row = doc.createElement("tr");
      for (const value of [item.title, item.signal, item.value, item.relationship]) {
        const cell = doc.createElement("td"); cell.textContent = value; row.append(cell);
      }
      const actionCell = doc.createElement("td");
      const open = button(doc, "Open record"); open.disabled = !actions.openSource;
      open.setAttribute("aria-label", `Open source record ${item.title}`);
      open.addEventListener("click", () => actions.openSource?.(item.sourcePath));
      actionCell.append(open); row.append(actionCell); body.append(row);
    }
    table.append(caption, head, body); wrap.append(table); container.append(wrap);
  }

  if (actions.prepareGovernanceProposal) container.append(renderGovernanceActions(doc, actions));

  if (projection.diagnostics.length > 0) {
    const details = doc.createElement("details");
    const summary = doc.createElement("summary");
    summary.textContent = `${projection.diagnostics.length} bounded diagnostic${projection.diagnostics.length === 1 ? "" : "s"}`;
    const list = doc.createElement("ul");
    for (const diagnostic of projection.diagnostics) {
      const entry = doc.createElement("li");
      entry.textContent = `${diagnostic.code} at ${diagnostic.path}: ${diagnostic.message}`;
      list.append(entry);
    }
    details.append(summary, list); container.append(details);
  }
}

function renderProvenanceTrail(doc: Document, projection: DashboardProjection, openSource?: (path: string) => void): HTMLElement {
  const figure = doc.createElement("figure"); figure.className = "hcc-dashboard__provenance";
  const caption = doc.createElement("figcaption"); caption.textContent = "Projection provenance trail";
  const trail = doc.createElement("ol"); trail.className = "hcc-dashboard__trail";
  const stages: Array<[string, string]> = [
    ["1 · Source", projection.source.path],
    ["2 · Boundary", "Active document + explicit one-hop metadata"],
    ["3 · Projection", DASHBOARD_MODE_LABELS[projection.mode]],
    ["4 · Result", `${projection.items.length} row${projection.items.length === 1 ? "" : "s"}; ${projection.diagnostics.length} diagnostic${projection.diagnostics.length === 1 ? "" : "s"}`]
  ];
  for (const [label, value] of stages) {
    const item = doc.createElement("li");
    const strong = doc.createElement("strong"); strong.textContent = label;
    const span = doc.createElement("span"); span.textContent = value;
    item.append(strong, span); trail.append(item);
  }
  const sources = doc.createElement("details"); sources.className = "hcc-dashboard__sources";
  const summary = doc.createElement("summary"); summary.textContent = `${projection.sources.length} admitted source record${projection.sources.length === 1 ? "" : "s"}`;
  const list = doc.createElement("ul");
  for (const source of projection.sources) {
    const item = doc.createElement("li");
    const text = doc.createElement("span"); text.textContent = `${source.title} · ${source.relationship} · ${source.path}`;
    const open = button(doc, "Open"); open.disabled = !openSource;
    open.setAttribute("aria-label", `Open admitted source ${source.title}`);
    open.addEventListener("click", () => openSource?.(source.path));
    item.append(text, open); list.append(item);
  }
  sources.append(summary, list); figure.append(caption, trail, sources); return figure;
}

function renderGovernanceActions(doc: Document, actions: DashboardRenderActions): HTMLElement {
  const details = doc.createElement("details"); details.className = "hcc-dashboard__governance-actions";
  const summary = doc.createElement("summary"); summary.textContent = "Governance actions · proposal only";
  const explanation = doc.createElement("p");
  explanation.textContent = "Prepare a digest-bound candidate for human review. These controls do not update frontmatter or assert reviewer identity.";
  const controls = doc.createElement("div"); controls.className = "hcc-dashboard__proposal-controls";
  const output = doc.createElement("div"); output.className = "hcc-dashboard__proposal-output"; output.setAttribute("aria-live", "polite");
  const choices: Array<[DashboardGovernanceOperation, string]> = [
    ["prepare_review", "Prepare reviewed proposal"],
    ["prepare_verification", "Prepare verification proposal"]
  ];
  for (const [operation, label] of choices) {
    const control = button(doc, label);
    control.addEventListener("click", () => {
      const source = actions.prepareGovernanceProposal?.(operation);
      if (source === undefined) return;
      output.replaceChildren();
      const heading = doc.createElement("h4"); heading.textContent = label;
      const warning = doc.createElement("p"); warning.className = "hcc-widget__phase-notice";
      warning.textContent = "Candidate only. Human identity, attestation, digest recheck, and a separately admitted writer remain required.";
      const pre = doc.createElement("pre"); pre.className = "hcc-widget__preview-json";
      const code = doc.createElement("code"); code.textContent = source; pre.append(code);
      const copy = button(doc, "Copy proposal YAML"); copy.disabled = !actions.copyText;
      const copyStatus = status(doc);
      copy.addEventListener("click", () => {
        if (!actions.copyText) return;
        copy.disabled = true;
        void actions.copyText(source).then(
          () => { copy.textContent = "Copied"; copyStatus.textContent = "Exact governance proposal copied."; },
          () => { copy.textContent = "Copy proposal YAML"; copyStatus.textContent = "Copy failed; no source changed."; }
        ).finally(() => { copy.disabled = false; });
      });
      output.append(heading, warning, pre, copy, copyStatus);
    });
    controls.append(control);
  }
  details.append(summary, explanation, controls, output); return details;
}

function appendDescription(doc: Document, list: HTMLDListElement, term: string, value: string): void {
  const dt = doc.createElement("dt"); dt.textContent = term;
  const dd = doc.createElement("dd"); dd.textContent = value;
  list.append(dt, dd);
}

function appendSourceDescription(doc: Document, list: HTMLDListElement, path: string, openSource?: (path: string) => void): void {
  const dt = doc.createElement("dt"); dt.textContent = "Source";
  const dd = doc.createElement("dd"); dd.className = "hcc-dashboard__source-value";
  const value = doc.createElement("span"); value.textContent = path;
  const open = button(doc, "Open source"); open.disabled = !openSource;
  open.addEventListener("click", () => openSource?.(path));
  dd.append(value, open); list.append(dt, dd);
}

function button(doc: Document, label: string): HTMLButtonElement {
  const control = doc.createElement("button"); control.type = "button"; control.textContent = label; return control;
}

function status(doc: Document): HTMLSpanElement {
  const value = doc.createElement("span"); value.className = "hcc-widget__copy-status"; value.setAttribute("role", "status"); value.setAttribute("aria-live", "polite"); return value;
}
