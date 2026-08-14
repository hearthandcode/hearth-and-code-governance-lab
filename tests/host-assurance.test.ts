import { describe, expect, it } from "vitest";

import { buildHostAssurancePacket } from "../src/obsidian/host-assurance";

const desktop = {
  pluginVersion: "0.0.27",
  minimumAppVersion: "1.12.0",
  appApiVersion: "1.13.4",
  minimumApiSatisfied: true,
  platform: { desktopUi: true, mobileUi: false, desktopApp: true, mobileApp: false, iosApp: false, androidApp: false },
  webCryptoAvailable: true,
  textEncoderAvailable: true,
  clipboardAvailable: true,
  exactVaultReadApiAvailable: true,
  createOnlyVaultApiAvailable: true,
  writerHostProfile: "prototype-disposable-vault"
} as const;
const observedAt = "2026-08-11T23:15:00.000Z";

describe("combined host-assurance packet", () => {
  it("binds runtime and compatibility evidence to one instant without broadening claims", () => {
    const packet = buildHostAssurancePacket(desktop, observedAt);
    expect(packet).toMatchObject({
      record_type: "hcc-host-assurance-packet",
      contract_version: "0.1-candidate.1",
      authority: "bounded-host-observation-bundle",
      observed_at: observedAt,
      summary: { runtime_checks: "8/8", exact_host_status: "observed-pass", pending_host_targets: 3, public_support_claim: "prohibited-pending-human-and-host-review" }
    });
    expect(packet.runtime.observed_at).toBe(observedAt);
    expect(packet.compatibility.observed_at).toBe(observedAt);
    expect(packet.compatibility.targets).toHaveLength(4);
  });

  it("contains no vault, note, operating-system, device, network, or write disclosure", () => {
    const packet = buildHostAssurancePacket(desktop, observedAt);
    expect(packet.privacy).toEqual({
      vault_name_disclosed: false, paths_disclosed: false, note_content_read: false, vault_scanned: false,
      operating_system_disclosed: false, device_identity_disclosed: false
    });
    expect(packet.effects).toEqual({ vault_read: false, vault_write: false, network: false, git: false, release: false, publication: false });
    expect(JSON.stringify(packet)).not.toContain("scratch-vault");
  });

  it("maps Android precisely while leaving unrelated targets pending", () => {
    const packet = buildHostAssurancePacket({
      ...desktop,
      platform: { desktopUi: false, mobileUi: true, desktopApp: false, mobileApp: true, iosApp: false, androidApp: true },
      writerHostProfile: "public-current-vault"
    }, observedAt);
    expect(packet.runtime).toMatchObject({ platform: "mobile", mobile_os: "android" });
    expect(packet.compatibility.targets.filter((target) => target.status === "observed-pass").map((target) => target.id)).toEqual(["observed-host", "android-current-api"]);
    expect(packet.summary.pending_host_targets).toBe(2);
  });

  it("preserves failed runtime evidence instead of claiming readiness", () => {
    const packet = buildHostAssurancePacket({ ...desktop, webCryptoAvailable: false }, observedAt);
    expect(packet.summary).toMatchObject({ runtime_checks: "7/8", exact_host_status: "observed-fail" });
    expect(packet.compatibility.summary["observed-fail"]).toBe(1);
  });
});
