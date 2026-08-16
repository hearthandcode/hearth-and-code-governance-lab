import { describe, expect, it } from "vitest";

import { parseWorksheetPacketLocator } from "../src/workbook";

const digest = `sha256:${"a".repeat(64)}`;
const valid = `packet_path: Intake/HCC Responses/review--session.yaml\npacket_digest: ${digest}\n`;
const realCanaryPath = [
  "Intake/HCC Responses/vault-response-packet-canary-review",
  "--Worksheets-11-Vault-Response-Packet-Canary-Revie",
  "--", "session", "-20260812130016189.yaml"
].join("");

describe("strict reload locator block", () => {
  it("accepts the exact copied two-field locator", () => {
    expect(parseWorksheetPacketLocator(valid)).toEqual({ path: "Intake/HCC Responses/review--session.yaml", digest });
  });

  it("accepts the exact mixed-case locator emitted by the create-only canary", () => {
    const source = `packet_path: ${realCanaryPath}\npacket_digest: sha256:fa51230430ad403da45c7794e576eaa3931373d893ab9b01e80cc0e15bc6a212\n`;
    expect(parseWorksheetPacketLocator(source)).toEqual({
      path: realCanaryPath,
      digest: "sha256:fa51230430ad403da45c7794e576eaa3931373d893ab9b01e80cc0e15bc6a212"
    });
  });

  it.each([
    ["unknown field", `${valid}scan: true\n`, "HCC-LOCATOR-FIELDS"],
    ["missing digest", "packet_path: Intake/HCC Responses/review.yaml\n", "HCC-LOCATOR-FIELDS"],
    ["duplicate key", `${valid}packet_path: Intake/HCC Responses/other.yaml\n`, "HCC-LOCATOR-PARSE"],
    ["wrong folder", valid.replace("Intake/HCC Responses/", "Worksheets/"), "HCC-LOCATOR-PATH"],
    ["nested packet", valid.replace("review--session.yaml", "nested/review--session.yaml"), "HCC-LOCATOR-PATH"],
    ["punctuated leaf", valid.replace("review--session.yaml", "review.session.yaml"), "HCC-LOCATOR-PATH"],
    ["bad digest", valid.replace(digest, "sha256:ABC"), "HCC-LOCATOR-DIGEST"],
    ["sequence", `- packet_path: Intake/HCC Responses/review.yaml\n- packet_digest: ${digest}\n`, "HCC-LOCATOR-SHAPE"],
    ["oversized", `packet_path: ${"x".repeat(600)}\npacket_digest: ${digest}\n`, "HCC-LOCATOR-SIZE"]
  ])("rejects %s", (_name, source, code) => {
    expect(() => parseWorksheetPacketLocator(source)).toThrow(String(code));
  });

  it("accepts a packet path under a configured-folder override distinct from the legacy prefix", () => {
    const overrideFolder = "04-workspace--scriptorium/projects/ember-circuit-brand-system/intake/_responses";
    const validOverride = `packet_path: ${overrideFolder}/override--session.yaml\npacket_digest: ${digest}\n`;
    expect(parseWorksheetPacketLocator(validOverride, overrideFolder)).toEqual({ path: `${overrideFolder}/override--session.yaml`, digest });
  });

  it("rejects a packet path under a configured-folder override when the locator does not match", () => {
    const overrideFolder = "04-workspace--scriptorium/projects/ember-circuit-brand-system/intake/_responses";
    const mismatched = `packet_path: Intake/HCC Responses/override--session.yaml\npacket_digest: ${digest}\n`;
    expect(() => parseWorksheetPacketLocator(mismatched, overrideFolder)).toThrow("HCC-LOCATOR-PATH");
  });
});
