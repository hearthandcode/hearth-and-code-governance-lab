import yaml from "js-yaml";

import type { Diagnostic, ParseResult } from "./types";
import { validateInteraction } from "./validate";

export function parseInteraction(source: string): ParseResult {
  let candidate: unknown;
  try {
    candidate = yaml.load(source, { schema: yaml.JSON_SCHEMA });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown YAML parse error";
    return {
      ok: false,
      diagnostics: [diagnostic("HCC-PARSE-001", "$", `The YAML could not be parsed: ${detail}`)]
    };
  }

  return validateInteraction(candidate);
}

function diagnostic(code: Diagnostic["code"], path: string, message: string): Diagnostic {
  return { code, failure: "schema-invalid", path, message };
}
