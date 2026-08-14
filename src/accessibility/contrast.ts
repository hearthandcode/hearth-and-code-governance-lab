export const CONTRAST_AUDIT_VERSION = "0.1-candidate.1" as const;

export interface ContrastRequirement {
  id: string;
  foreground: string;
  background: string;
  minimum: 3 | 4.5;
  role: "normal-text" | "non-text";
}

export interface ContrastResult extends ContrastRequirement {
  foregroundValue: string;
  backgroundValue: string;
  ratio: number;
  passed: boolean;
}

export interface ContrastAuditReport {
  record_type: "hcc-ember-contrast-audit";
  contract_version: typeof CONTRAST_AUDIT_VERSION;
  requirements: readonly ContrastResult[];
  passed: number;
  failed: number;
  wcag_conformance_claim: false;
  limits: readonly string[];
}

export const EMBER_CONTRAST_REQUIREMENTS: readonly ContrastRequirement[] = Object.freeze([
  requirement("body-base", "text", "surface", 4.5, "normal-text"),
  requirement("body-raised", "text", "surface-raised", 4.5, "normal-text"),
  requirement("body-inset", "text", "surface-inset", 4.5, "normal-text"),
  requirement("body-message", "text", "surface-message", 4.5, "normal-text"),
  requirement("muted-base", "text-muted", "surface", 4.5, "normal-text"),
  requirement("muted-raised", "text-muted", "surface-raised", 4.5, "normal-text"),
  requirement("muted-inset", "text-muted", "surface-inset", 4.5, "normal-text"),
  requirement("link-base", "link", "surface", 4.5, "normal-text"),
  requirement("danger-base", "danger", "surface", 4.5, "normal-text"),
  requirement("warning-base", "warning", "surface", 4.5, "normal-text"),
  requirement("success-base", "success", "surface", 4.5, "normal-text"),
  requirement("accent-button", "accent-contrast", "accent", 4.5, "normal-text"),
  requirement("focus-base", "focus", "surface", 3, "non-text"),
  requirement("focus-raised", "focus", "surface-raised", 3, "non-text"),
  requirement("control-inset", "border-strong", "surface-inset", 3, "non-text"),
  requirement("control-raised", "border-strong", "surface-raised", 3, "non-text")
]);

export function auditEmberContrast(css: string): ContrastAuditReport {
  const tokens = extractEmberTokens(css);
  const requirements = Object.freeze(EMBER_CONTRAST_REQUIREMENTS.map((item) => {
    const foregroundValue = requiredToken(tokens, item.foreground);
    const backgroundValue = requiredToken(tokens, item.background);
    const ratio = contrastRatio(foregroundValue, backgroundValue);
    return Object.freeze({ ...item, foregroundValue, backgroundValue, ratio, passed: ratio >= item.minimum });
  }));
  return Object.freeze({
    record_type: "hcc-ember-contrast-audit",
    contract_version: CONTRAST_AUDIT_VERSION,
    requirements,
    passed: requirements.filter((item) => item.passed).length,
    failed: requirements.filter((item) => !item.passed).length,
    wcag_conformance_claim: false,
    limits: Object.freeze([
      "This checks sixteen declared opaque sRGB token pairs, not computed styles or every CSS color mix.",
      "It does not prove focus order, keyboard operation, zoom, touch, forced-colors behavior, or assistive-technology output.",
      "Passing ratios are bounded evidence, not a WCAG conformance claim."
    ])
  });
}

export function extractEmberTokens(css: string): Readonly<Record<string, string>> {
  const marker = ":is(.hcc-theme-ember-circuit, .hcc-ember-circuit, .hcc-plugin-ember-circuit-session) :is(.hcc-widget, .hcc-view, .hcc-workbook, .hcc-extension) {";
  const start = css.indexOf(marker);
  if (start < 0) throw new Error("HCC-CONTRAST-THEME: Ember Circuit token block is absent.");
  const bodyStart = start + marker.length;
  const bodyEnd = css.indexOf("}", bodyStart);
  if (bodyEnd < 0) throw new Error("HCC-CONTRAST-THEME: Ember Circuit token block is incomplete.");
  const tokens: Record<string, string> = {};
  for (const match of css.slice(bodyStart, bodyEnd).matchAll(/--hcc-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) tokens[match[1]!] = match[2]!.toLowerCase();
  return Object.freeze(tokens);
}

export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function relativeLuminance(value: string): number {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) throw new Error(`HCC-CONTRAST-COLOR: expected opaque #rrggbb; received ${value}.`);
  const channels = [1, 3, 5].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function requiredToken(tokens: Readonly<Record<string, string>>, name: string): string {
  const value = tokens[name];
  if (!value) throw new Error(`HCC-CONTRAST-TOKEN: required Ember token --hcc-${name} is absent or is not opaque #rrggbb.`);
  return value;
}

function requirement(id: string, foreground: string, background: string, minimum: 3 | 4.5, role: ContrastRequirement["role"]): ContrastRequirement {
  return Object.freeze({ id, foreground, background, minimum, role });
}
