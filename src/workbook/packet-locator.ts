import { JSON_SCHEMA, load } from "js-yaml";

import { explicitResponsePacketPath } from "../writer";

export interface WorksheetPacketLocator {
  path: string;
  digest: string;
}

const MAX_LOCATOR_BYTES = 512;
const PACKET_DIGEST = /^sha256:[a-f0-9]{64}$/;

export function parseWorksheetPacketLocator(source: string): WorksheetPacketLocator {
  if (new TextEncoder().encode(source).byteLength > MAX_LOCATOR_BYTES) throw new Error("HCC-LOCATOR-SIZE: reload locator exceeds 512 UTF-8 bytes.");
  let value: unknown;
  try { value = load(source, { schema: JSON_SCHEMA }); }
  catch (error) { throw new Error(`HCC-LOCATOR-PARSE: ${error instanceof Error ? error.message : "invalid YAML"}`); }
  if (!isRecord(value)) throw new Error("HCC-LOCATOR-SHAPE: reload locator must be one YAML mapping.");
  const keys = Object.keys(value).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["packet_digest", "packet_path"])) throw new Error("HCC-LOCATOR-FIELDS: reload locator requires exactly packet_path and packet_digest.");
  if (typeof value.packet_path !== "string" || !explicitResponsePacketPath(value.packet_path)) throw new Error("HCC-LOCATOR-PATH: packet_path must match a create-only packet path: one ASCII letter/digit-leading .yaml leaf using only letters, digits, underscore, or hyphen directly under Intake/HCC Responses/.");
  if (typeof value.packet_digest !== "string" || !PACKET_DIGEST.test(value.packet_digest)) throw new Error("HCC-LOCATOR-DIGEST: packet_digest must be lowercase sha256 followed by 64 hexadecimal characters.");
  return Object.freeze({ path: value.packet_path, digest: value.packet_digest });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
