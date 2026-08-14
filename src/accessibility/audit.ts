export const ACCESSIBILITY_AUDIT_VERSION = "0.1-candidate.1" as const;

export interface AccessibilityDiagnostic {
  code: "HCC-A11Y-DUPLICATE-ID" | "HCC-A11Y-CONTROL-NAME" | "HCC-A11Y-BUTTON-NAME" | "HCC-A11Y-SVG" | "HCC-A11Y-TABLE" | "HCC-A11Y-DISCLOSURE";
  target: string;
  message: string;
}

export interface AccessibilityAuditReport {
  recordType: "hcc-rendered-accessibility-audit";
  contractVersion: typeof ACCESSIBILITY_AUDIT_VERSION;
  checkedElements: number;
  diagnostics: AccessibilityDiagnostic[];
  passed: boolean;
  limits: readonly string[];
}

export function auditRenderedAccessibility(root: ParentNode): AccessibilityAuditReport {
  const elements = descendants(root);
  const diagnostics: AccessibilityDiagnostic[] = [];
  const ids = new Map<string, Element[]>();
  for (const element of elements) {
    if (element.id) ids.set(element.id, [...(ids.get(element.id) ?? []), element]);
  }
  for (const [id, matches] of ids) {
    if (matches.length > 1) diagnostics.push(diagnostic("HCC-A11Y-DUPLICATE-ID", `#${id}`, `ID ${id} occurs ${matches.length} times in the rendered surface.`));
  }

  for (const control of elements.filter((item): item is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
    item instanceof HTMLInputElement || item instanceof HTMLSelectElement || item instanceof HTMLTextAreaElement)) {
    if (control instanceof HTMLInputElement && control.type === "hidden") continue;
    if (!accessibleName(control, root)) diagnostics.push(diagnostic("HCC-A11Y-CONTROL-NAME", describe(control), "Form control has no programmatic accessible name."));
  }
  for (const button of elements.filter((item): item is HTMLButtonElement => item instanceof HTMLButtonElement)) {
    if (!accessibleName(button, root)) diagnostics.push(diagnostic("HCC-A11Y-BUTTON-NAME", describe(button), "Button has no accessible name."));
  }
  for (const svg of elements.filter((item): item is SVGSVGElement => item instanceof SVGSVGElement)) {
    if (svg.getAttribute("aria-hidden") === "true") continue;
    if (svg.getAttribute("role") !== "img" || !accessibleName(svg, root)) diagnostics.push(diagnostic("HCC-A11Y-SVG", describe(svg), "Informative SVG requires role=img and an accessible name."));
  }
  for (const table of elements.filter((item): item is HTMLTableElement => item instanceof HTMLTableElement)) {
    const caption = table.querySelector(":scope > caption")?.textContent?.trim();
    if (!caption && !accessibleName(table, root)) diagnostics.push(diagnostic("HCC-A11Y-TABLE", describe(table), "Table requires a caption or programmatic accessible name."));
  }
  for (const details of elements.filter((item): item is HTMLDetailsElement => item instanceof HTMLDetailsElement)) {
    const summary = details.querySelector(":scope > summary");
    if (!summary || !accessibleName(summary, root)) diagnostics.push(diagnostic("HCC-A11Y-DISCLOSURE", describe(details), "Disclosure requires a direct, named summary."));
  }

  return {
    recordType: "hcc-rendered-accessibility-audit",
    contractVersion: ACCESSIBILITY_AUDIT_VERSION,
    checkedElements: elements.length,
    diagnostics,
    passed: diagnostics.length === 0,
    limits: Object.freeze([
      "This structural audit is not a WCAG conformance claim.",
      "It does not test computed styles, contrast, zoom, focus order, keyboard operation, touch, or assistive-technology output."
    ])
  };
}

function descendants(root: ParentNode): Element[] {
  const result = Array.from(root.querySelectorAll("*"));
  return root instanceof Element ? [root, ...result] : result;
}

function accessibleName(element: Element, root: ParentNode): string {
  const ariaLabel = element.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;
  const labelledBy = element.getAttribute("aria-labelledby")?.trim();
  if (labelledBy) {
    const labels = labelledBy.split(/\s+/).map((id) => findById(root, id)?.textContent?.trim() ?? "").filter(Boolean);
    if (labels.length) return labels.join(" ");
  }
  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
    const wrappingLabel = element.closest("label")?.textContent?.trim();
    if (wrappingLabel) return wrappingLabel;
    if (element.id) {
      const explicit = descendants(root).find((item): item is HTMLLabelElement => item instanceof HTMLLabelElement && item.htmlFor === element.id);
      if (explicit?.textContent?.trim()) return explicit.textContent.trim();
    }
  }
  if (element instanceof HTMLButtonElement || element instanceof HTMLElement && element.tagName === "SUMMARY") return element.textContent?.trim() ?? "";
  if (element instanceof SVGSVGElement) return element.querySelector("title")?.textContent?.trim() ?? "";
  return "";
}

function findById(root: ParentNode, id: string): Element | undefined {
  return descendants(root).find((item) => item.id === id);
}

function describe(element: Element): string {
  const id = element.id ? `#${element.id}` : "";
  const classes = Array.from(element.classList).slice(0, 2).map((value) => `.${value}`).join("");
  return `${element.tagName.toLowerCase()}${id}${classes}`;
}

function diagnostic(code: AccessibilityDiagnostic["code"], target: string, message: string): AccessibilityDiagnostic {
  return { code, target, message };
}
