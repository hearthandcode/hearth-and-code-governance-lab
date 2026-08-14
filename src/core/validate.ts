import {
  RESPONSE_STATES,
  SUPPORTED_KINDS,
  SUPPORTED_VERSION,
  type Diagnostic,
  type InteractionBlock,
  type InteractionOption,
  type InteractionResponse,
  type ParseResult,
  type ResponseState,
  type SupportedKind
} from "./types";

const TOP_LEVEL_FIELDS = new Set([
  "version",
  "id",
  "kind",
  "prompt",
  "help",
  "options",
  "response",
  "visibility",
  "source_refs"
]);
const RESPONSE_FIELDS = new Set(["value", "note", "state", "author", "responded_at"]);
const VISIBILITIES = new Set(["private", "restricted", "internal", "public"]);

export function validateInteraction(candidate: unknown): ParseResult {
  const diagnostics: Diagnostic[] = [];
  if (!isRecord(candidate)) {
    return fail("HCC-SCHEMA-001", "$", "The interaction block must be a YAML object.");
  }

  for (const key of Object.keys(candidate)) {
    if (!TOP_LEVEL_FIELDS.has(key)) {
      diagnostics.push(diag("HCC-UNKNOWN-001", `$.${key}`, `Unknown top-level field: ${key}`));
    }
  }

  const version = candidate.version;
  if (version !== SUPPORTED_VERSION) {
    diagnostics.push(
      diag("HCC-VERSION-001", "$.version", `Supported version is ${SUPPORTED_VERSION}; received ${String(version)}.`)
    );
  }

  const id = requireNonEmptyString(candidate.id, "$.id", diagnostics);
  const prompt = requireNonEmptyString(candidate.prompt, "$.prompt", diagnostics);
  const kind = validateKind(candidate.kind, diagnostics);
  const help = optionalString(candidate.help, "$.help", diagnostics);
  const visibility = validateVisibility(candidate.visibility, diagnostics);
  const sourceRefs = validateStringList(candidate.source_refs, "$.source_refs", diagnostics);
  const response = validateResponse(candidate.response, diagnostics);
  const options = validateOptions(candidate.options, kind, diagnostics);

  if (response && kind) {
    validateResponseValue(response, kind, options, diagnostics);
  }

  if (diagnostics.length > 0 || !id || !prompt || !kind || !response) {
    return { ok: false, diagnostics };
  }

  const block: InteractionBlock = {
    version: SUPPORTED_VERSION,
    id,
    kind,
    prompt,
    response,
    ...(help === undefined ? {} : { help }),
    ...(options === undefined ? {} : { options }),
    ...(visibility === undefined ? {} : { visibility }),
    ...(sourceRefs === undefined ? {} : { source_refs: sourceRefs })
  };
  return { ok: true, block, diagnostics: [] };
}

function validateKind(value: unknown, diagnostics: Diagnostic[]): SupportedKind | null {
  if (typeof value !== "string" || !(SUPPORTED_KINDS as readonly string[]).includes(value)) {
    diagnostics.push(
      diag("HCC-KIND-001", "$.kind", `Supported kinds are ${SUPPORTED_KINDS.join(", ")}; received ${String(value)}.`)
    );
    return null;
  }
  return value as SupportedKind;
}

function validateVisibility(
  value: unknown,
  diagnostics: Diagnostic[]
): InteractionBlock["visibility"] | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !VISIBILITIES.has(value)) {
    diagnostics.push(diag("HCC-SCHEMA-001", "$.visibility", "Visibility is not recognized."));
    return undefined;
  }
  return value as InteractionBlock["visibility"];
}

function validateOptions(
  value: unknown,
  kind: SupportedKind | null,
  diagnostics: Diagnostic[]
): InteractionOption[] | undefined {
  if (kind === "long_text") {
    if (value !== undefined) diagnostics.push(diag("HCC-OPTIONS-001", "$.options", "long_text must not declare options."));
    return undefined;
  }
  if (kind === null) return undefined;
  if (!Array.isArray(value) || value.length === 0) {
    diagnostics.push(diag("HCC-OPTIONS-001", "$.options", `${kind} requires at least one option.`));
    return undefined;
  }
  const options: InteractionOption[] = [];
  const ids = new Set<string>();
  value.forEach((item, index) => {
    if (!isRecord(item)) {
      diagnostics.push(diag("HCC-OPTIONS-001", `$.options[${index}]`, "Each option must be an object."));
      return;
    }
    const keys = Object.keys(item);
    if (keys.some((key) => key !== "id" && key !== "label")) {
      diagnostics.push(diag("HCC-UNKNOWN-001", `$.options[${index}]`, "Options allow only id and label."));
    }
    const id = requireNonEmptyString(item.id, `$.options[${index}].id`, diagnostics);
    const label = requireNonEmptyString(item.label, `$.options[${index}].label`, diagnostics);
    if (id && ids.has(id)) diagnostics.push(diag("HCC-OPTIONS-001", `$.options[${index}].id`, "Option IDs must be unique."));
    if (id && label) {
      ids.add(id);
      options.push({ id, label });
    }
  });
  return options;
}

function validateResponse(value: unknown, diagnostics: Diagnostic[]): InteractionResponse | null {
  if (!isRecord(value)) {
    diagnostics.push(diag("HCC-RESPONSE-001", "$.response", "response must be an object."));
    return null;
  }
  for (const key of Object.keys(value)) {
    if (!RESPONSE_FIELDS.has(key)) {
      diagnostics.push(diag("HCC-UNKNOWN-001", `$.response.${key}`, `Unknown response field: ${key}`));
    }
  }
  for (const required of ["value", "note", "state"] as const) {
    if (!(required in value)) {
      diagnostics.push(diag("HCC-RESPONSE-001", `$.response.${required}`, `${required} must be present, even when null.`));
    }
  }
  if (value.note !== null && typeof value.note !== "string") {
    diagnostics.push(diag("HCC-RESPONSE-001", "$.response.note", "note must be a string or null."));
  }
  const state = value.state;
  if (typeof state !== "string" || !(RESPONSE_STATES as readonly string[]).includes(state)) {
    diagnostics.push(diag("HCC-RESPONSE-001", "$.response.state", `Unknown response state: ${String(state)}.`));
    return null;
  }
  const author = nullableString(value.author, "$.response.author", diagnostics);
  const respondedAt = nullableString(value.responded_at, "$.response.responded_at", diagnostics);
  return {
    value: normalizeResponseValue(value.value),
    note: typeof value.note === "string" ? value.note : null,
    state: state as ResponseState,
    author,
    responded_at: respondedAt
  };
}

function validateResponseValue(
  response: InteractionResponse,
  kind: SupportedKind,
  options: InteractionOption[] | undefined,
  diagnostics: Diagnostic[]
): void {
  const optionIds = new Set(options?.map((option) => option.id) ?? []);
  if (kind === "choose_one") {
    if (response.value !== null && typeof response.value !== "string") {
      diagnostics.push(diag("HCC-RESPONSE-001", "$.response.value", "choose_one value must be an option ID or null."));
    } else if (typeof response.value === "string" && !optionIds.has(response.value)) {
      diagnostics.push(diag("HCC-RESPONSE-001", "$.response.value", "choose_one value must reference a declared option ID."));
    }
  }
  if (kind === "choose_many") {
    if (!Array.isArray(response.value)) {
      diagnostics.push(diag("HCC-RESPONSE-001", "$.response.value", "choose_many value must be an array."));
    } else if (response.value.some((item) => !optionIds.has(item))) {
      diagnostics.push(diag("HCC-RESPONSE-001", "$.response.value", "choose_many values must reference declared option IDs."));
    }
  }
  if (kind === "long_text" && response.value !== null && typeof response.value !== "string") {
    diagnostics.push(diag("HCC-RESPONSE-001", "$.response.value", "long_text value must be a string or null."));
  }
  if (response.state === "unanswered") {
    const empty = response.value === null || response.value === "" || (Array.isArray(response.value) && response.value.length === 0);
    if (!empty) diagnostics.push(diag("HCC-RESPONSE-001", "$.response", "unanswered responses must have an empty value."));
  }
}

function normalizeResponseValue(value: unknown): InteractionResponse["value"] {
  if (typeof value === "string" || value === null) return value;
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return [...value];
  return null;
}

function requireNonEmptyString(value: unknown, path: string, diagnostics: Diagnostic[]): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    diagnostics.push(diag("HCC-SCHEMA-001", path, "A non-empty string is required."));
    return null;
  }
  return value;
}

function optionalString(value: unknown, path: string, diagnostics: Diagnostic[]): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") diagnostics.push(diag("HCC-SCHEMA-001", path, "Expected a string."));
  return typeof value === "string" ? value : undefined;
}

function validateStringList(value: unknown, path: string, diagnostics: Diagnostic[]): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    diagnostics.push(diag("HCC-SCHEMA-001", path, "Expected a list of non-empty source reference strings."));
    return undefined;
  }
  return [...value];
}

function nullableString(value: unknown, path: string, diagnostics: Diagnostic[]): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") diagnostics.push(diag("HCC-RESPONSE-001", path, "Expected a string or null."));
  return typeof value === "string" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function diag(code: Diagnostic["code"], path: string, message: string): Diagnostic {
  const failure: Diagnostic["failure"] = code === "HCC-VERSION-001"
    ? "unsupported-contract-version"
    : code === "HCC-KIND-001"
      ? "unknown-interaction-kind"
      : code === "HCC-RESPONSE-001" || code === "HCC-OPTIONS-001"
        ? "semantic-invalid"
        : "schema-invalid";
  return { code, failure, path, message };
}

function fail(code: Diagnostic["code"], path: string, message: string): ParseResult {
  return { ok: false, diagnostics: [diag(code, path, message)] };
}
