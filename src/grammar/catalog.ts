import { CANDIDATE_INTERACTION_VERSION, type CandidateInputKind, type RendererCatalogEntry } from "./types";

const requirements = ["programmatic label", "keyboard operable", "visible focus", "error text association"] as const;

function entry(kind: CandidateInputKind, suffix: string, fallback: string, extra: readonly string[] = []): RendererCatalogEntry {
  return Object.freeze({
    kind,
    rendererId: `hcc.candidate.input.${suffix}`,
    contractVersions: [CANDIDATE_INTERACTION_VERSION] as const,
    lifecycle: "candidate",
    reviewState: "human-review-required",
    accessibility: [...requirements, ...extra],
    fallback,
    migration: "no-automatic-migration-before-admission"
  });
}

export const CANDIDATE_RENDERER_CATALOG: Readonly<Record<CandidateInputKind, RendererCatalogEntry>> = Object.freeze({
  short_text: entry("short_text", "short-text", "Labeled plain-text value"),
  number: entry("number", "number", "Labeled numeric value with constraints stated in text"),
  boolean: entry("boolean", "boolean", "Labeled true/false choice"),
  date: entry("date", "date", "ISO date text with constraints stated in text"),
  scale: entry("scale", "scale", "Numeric value plus textual range and endpoint labels", ["current value announced"]),
  ranked_choice: entry("ranked_choice", "ranked-choice", "Ordered list of selected option labels", ["ordering available without drag"]),
  matrix: entry("matrix", "matrix", "Table with row and column headers", ["row and column context announced"]),
  repeatable_group: entry("repeatable_group", "repeatable-group", "Numbered field groups", ["add and remove actions named"]),
  dropdown: entry("dropdown", "dropdown", "Labeled option ID and label"),
  multi_select: entry("multi_select", "multi-select", "Selected option labels as a list", ["selection count announced"]),
  time: entry("time", "time", "Local time text in HH:MM form"),
  datetime: entry("datetime", "datetime", "Local date and time text"),
  duration: entry("duration", "duration", "Numeric duration in canonical minutes", ["increment and decrement controls named"]),
  currency: entry("currency", "currency", "Numeric amount with explicit currency code", ["currency code announced"]),
  email: entry("email", "email", "Email address text; no message is sent"),
  url: entry("url", "url", "Validated URL text; no request is made"),
  month: entry("month", "month", "Calendar month in YYYY-MM form"),
  week: entry("week", "week", "ISO week in YYYY-Www form"),
  percentage: entry("percentage", "percentage", "Bounded numeric percentage", ["increment and decrement controls named"]),
  color: entry("color", "color", "Hex color value plus visible swatch"),
  phone: entry("phone", "phone", "Telephone text without dialing or lookup"),
  tags: entry("tags", "tags", "Ordered plain-text tag list", ["remove actions named"]),
  numeric_range: entry("numeric_range", "numeric-range", "Labeled lower and upper numeric bounds", ["each bound has named step controls"]),
  file_reference: entry("file_reference", "file-reference", "Validated vault-relative file locator; no file is opened"),
  long_text: entry("long_text", "long-text", "Plain multiline text with declared length bounds"),
  radio_group: entry("radio_group", "radio-group", "Visible labeled single-choice group", ["arrow-key selection through native radios"]),
  rating: entry("rating", "rating", "Discrete numeric rating with visible endpoints", ["each value is a named button"]),
  date_range: entry("date_range", "date-range", "Start and end ISO dates", ["range order is announced and validated"]),
  time_range: entry("time_range", "time-range", "Start and end local times", ["range order is announced and validated"]),
  unit_value: entry("unit_value", "unit-value", "Numeric amount paired with a declared unit", ["unit selection is programmatically labeled"]),
  key_value_list: entry("key_value_list", "key-value-list", "Bounded ordered key and value rows", ["add and remove actions named"]),
  coordinates: entry("coordinates", "coordinates", "Manually entered latitude and longitude pair", ["no device location request"])
});

export function getCandidateRenderer(kind: CandidateInputKind): RendererCatalogEntry {
  return CANDIDATE_RENDERER_CATALOG[kind];
}
