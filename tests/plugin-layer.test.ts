import { describe, expect, it } from "vitest";

import {
  FUTURE_EXTENSION_DESCRIPTORS,
  FUTURE_INPUT_EXTENSION_DESCRIPTORS,
  FUTURE_VIEW_EXTENSION_DESCRIPTORS,
  SELECTED_EXTENSION_DESCRIPTORS,
  PLUGIN_CAPABILITY_CATALOG,
  auditCapabilityCatalog,
  authorizeCapabilityEffect,
  validateExtensionDescriptor
} from "../src/plugin-layer";

describe("computational plugin-layer governance", () => {
  it("keeps the built-in capability catalog internally consistent", () => {
    expect(auditCapabilityCatalog()).toEqual([]);
    expect(Object.keys(PLUGIN_CAPABILITY_CATALOG)).toHaveLength(18);
    expect(PLUGIN_CAPABILITY_CATALOG["hcc.interaction.candidate"].vocabulary).toHaveLength(32);
    expect(PLUGIN_CAPABILITY_CATALOG["hcc.view.candidate"].vocabulary).toHaveLength(24);
    expect(PLUGIN_CAPABILITY_CATALOG["hcc.presentation.ember-circuit"].allowedEffects).toEqual(["render"]);
    expect(PLUGIN_CAPABILITY_CATALOG["hcc.settings.preferences"].allowedEffects).toEqual(["render", "read-plugin-settings", "persist-settings"]);
    expect(authorizeCapabilityEffect("hcc.settings.preferences", "persist-settings").ok).toBe(true);
    expect(authorizeCapabilityEffect("hcc.settings.preferences", "persist-response").ok).toBe(false);
    expect(authorizeCapabilityEffect("hcc.interaction.candidate", "persist-settings").ok).toBe(false);
    expect(PLUGIN_CAPABILITY_CATALOG["hcc.response.clipboard"].allowedEffects).toEqual(["copy-to-clipboard"]);
    expect(PLUGIN_CAPABILITY_CATALOG["hcc.response.vault-packets"].allowedEffects).toEqual(["read-explicit-source", "persist-response"]);
    expect(PLUGIN_CAPABILITY_CATALOG["hcc.authoring.api"].allowedEffects).toEqual(["render", "copy-to-clipboard"]);
    expect(PLUGIN_CAPABILITY_CATALOG["hcc.runtime.diagnostics"].allowedEffects).toEqual(["render", "copy-to-clipboard"]);
    expect(PLUGIN_CAPABILITY_CATALOG["hcc.dashboard.native"].vocabulary).toHaveLength(7);
    expect(PLUGIN_CAPABILITY_CATALOG["hcc.dashboard.native"].allowedEffects).toEqual(["render", "read-active-document", "read-explicit-authority", "copy-to-clipboard"]);
    expect(authorizeCapabilityEffect("hcc.dashboard.native", "scan-vault").ok).toBe(false);
    expect(PLUGIN_CAPABILITY_CATALOG["hcc.studio.candidate"].vocabulary).toHaveLength(8);
    expect(PLUGIN_CAPABILITY_CATALOG["hcc.studio.candidate"].allowedEffects).toEqual(["render", "copy-to-clipboard"]);
    expect(authorizeCapabilityEffect("hcc.studio.candidate", "mutate-frontmatter").ok).toBe(false);
    expect(PLUGIN_CAPABILITY_CATALOG["hcc.exchange.provider-neutral"].allowedEffects).toEqual(["render", "copy-to-clipboard"]);
    expect(authorizeCapabilityEffect("hcc.exchange.provider-neutral", "network").ok).toBe(false);
    expect(authorizeCapabilityEffect("hcc.exchange.provider-neutral", "persist-response").ok).toBe(false);
    expect(authorizeCapabilityEffect("hcc.runtime.diagnostics", "copy-to-clipboard").ok).toBe(true);
    expect(authorizeCapabilityEffect("hcc.runtime.diagnostics", "render").ok).toBe(true);
    expect(PLUGIN_CAPABILITY_CATALOG["hcc.runtime.diagnostics"].vocabulary).toHaveLength(3);
    expect(authorizeCapabilityEffect("hcc.runtime.diagnostics", "scan-vault").ok).toBe(false);
    expect(authorizeCapabilityEffect("hcc.response.vault-packets", "persist-response").ok).toBe(true);
    for (const effect of ["mutate-frontmatter", "scan-vault", "network", "publish"] as const) {
      expect(authorizeCapabilityEffect("hcc.response.vault-packets", effect).ok).toBe(false);
    }
  });

  it("admits the two human-selected extensions as render-only candidates", () => {
    expect(SELECTED_EXTENSION_DESCRIPTORS).toHaveLength(2);
    for (const descriptor of SELECTED_EXTENSION_DESCRIPTORS) {
      expect(validateExtensionDescriptor(descriptor).ok).toBe(true);
      expect(descriptor.lifecycle).toBe("candidate");
      expect(descriptor.requestedEffects).toEqual(["render"]);
      expect(descriptor.verified).toBe(false);
    }
    expect(authorizeCapabilityEffect("hcc.extension.computed-field", "persist-response").ok).toBe(false);
    expect(authorizeCapabilityEffect("hcc.extension.radar", "network").ok).toBe(false);
  });

  it("admits only declared effects and computationally denies consequential effects", () => {
    expect(authorizeCapabilityEffect("hcc.view.candidate", "render")).toMatchObject({ ok: true, code: "HCC-CAPABILITY-ALLOWED" });
    expect(authorizeCapabilityEffect("hcc.view.candidate", "read-explicit-source")).toMatchObject({ ok: true });
    for (const effect of ["persist-response", "mutate-frontmatter", "scan-vault", "network", "publish"] as const) {
      expect(authorizeCapabilityEffect("hcc.interaction.candidate", effect)).toMatchObject({ ok: false, code: "HCC-CAPABILITY-DENIED" });
    }
  });

  it("admits a bounded candidate extension descriptor", () => {
    const result = validateExtensionDescriptor({
      id: "hcc.input.example", extendsCapability: "hcc.interaction.candidate", rendererId: "hcc.candidate.input.example",
      contractVersion: "0.1-candidate.1", lifecycle: "candidate", vocabulary: ["example"], requestedEffects: ["render"],
      sourceRef: "docs/projectization/extension-contract.md", owner: "human-review-required", reviewState: "human-review-required",
      verified: false, fallback: "Labeled text value"
    });
    expect(result.ok).toBe(true);
  });

  it("rejects extensions that self-verify or request writes, network, or publication", () => {
    for (const effect of ["persist-response", "network", "publish"] as const) {
      const result = validateExtensionDescriptor({
        id: "hcc.input.unsafe", extendsCapability: "hcc.interaction.candidate", rendererId: "hcc.candidate.input.unsafe",
        contractVersion: "0.1-candidate.1", lifecycle: "candidate", vocabulary: ["unsafe"], requestedEffects: [effect],
        sourceRef: "proposal", owner: "unknown", reviewState: "human-review-required", verified: true, fallback: "none"
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.diagnostics.some((item) => item.path === "$.requestedEffects[0]")).toBe(true);
        expect(result.diagnostics.some((item) => item.path === "$.verified")).toBe(true);
      }
    }
  });

  it("governs all eight input and eight view proposals as render-only extensions", () => {
    expect(FUTURE_INPUT_EXTENSION_DESCRIPTORS).toHaveLength(8);
    expect(FUTURE_VIEW_EXTENSION_DESCRIPTORS).toHaveLength(8);
    expect(FUTURE_EXTENSION_DESCRIPTORS).toHaveLength(16);
    expect(new Set(FUTURE_EXTENSION_DESCRIPTORS.map((item) => item.id)).size).toBe(16);
    for (const descriptor of FUTURE_EXTENSION_DESCRIPTORS) {
      expect(validateExtensionDescriptor(descriptor).ok).toBe(true);
      expect(descriptor.lifecycle).toBe("proposal");
      expect(descriptor.requestedEffects).toEqual(["render"]);
      expect(descriptor.reviewState).toBe("human-review-required");
      expect(descriptor.verified).toBe(false);
    }
  });
});
