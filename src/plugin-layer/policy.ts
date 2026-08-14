import { PLUGIN_CAPABILITY_CATALOG } from "./catalog";
import {
  PLUGIN_EFFECTS,
  type CapabilityDecision,
  type ExtensionDescriptor,
  type ExtensionDiagnostic,
  type ExtensionValidationResult,
  type PluginCapabilityId,
  type PluginEffect
} from "./types";

export function authorizeCapabilityEffect(capabilityId: PluginCapabilityId, effect: PluginEffect): CapabilityDecision {
  const capability = PLUGIN_CAPABILITY_CATALOG[capabilityId];
  if (!capability) return { ok: false, capabilityId, effect, code: "HCC-CAPABILITY-UNKNOWN", message: `Unknown capability: ${capabilityId}.` };
  const allowed = capability.allowedEffects.includes(effect);
  return {
    ok: allowed, capabilityId, effect,
    code: allowed ? "HCC-CAPABILITY-ALLOWED" : "HCC-CAPABILITY-DENIED",
    message: allowed ? `${effect} is admitted for ${capabilityId}.` : `${effect} is not admitted for ${capabilityId}.`
  };
}

export function assertCapabilityEffect(capabilityId: PluginCapabilityId, effect: PluginEffect): void {
  const decision = authorizeCapabilityEffect(capabilityId, effect);
  if (!decision.ok) throw new Error(`${decision.code}: ${decision.message}`);
}

export function auditCapabilityCatalog(): ExtensionDiagnostic[] {
  const diagnostics: ExtensionDiagnostic[] = [];
  const knownEffects = new Set<PluginEffect>(PLUGIN_EFFECTS);
  Object.values(PLUGIN_CAPABILITY_CATALOG).forEach((capability) => {
    const overlap = capability.allowedEffects.filter((effect) => capability.deniedEffects.includes(effect));
    if (overlap.length) diagnostics.push({ path: `${capability.id}.effects`, message: `Effects cannot be both allowed and denied: ${overlap.join(", ")}.` });
    capability.allowedEffects.forEach((effect) => { if (!knownEffects.has(effect)) diagnostics.push({ path: `${capability.id}.allowedEffects`, message: `Unknown effect: ${effect}.` }); });
    if (capability.contractVersions.length === 0 || capability.vocabulary.length === 0) diagnostics.push({ path: capability.id, message: "Capabilities require a version and vocabulary." });
  });
  return diagnostics;
}

export function assertCapabilityCatalog(): void {
  const diagnostics = auditCapabilityCatalog();
  if (diagnostics.length) throw new Error(`HCC capability catalog invalid: ${diagnostics.map((item) => `${item.path}: ${item.message}`).join("; ")}`);
}

export function validateExtensionDescriptor(value: unknown): ExtensionValidationResult {
  const diagnostics: ExtensionDiagnostic[] = [];
  if (!record(value)) return { ok: false, diagnostics: [{ path: "$", message: "Extension descriptor must be an object." }] };
  const allowed = new Set(["id", "extendsCapability", "rendererId", "contractVersion", "lifecycle", "vocabulary", "requestedEffects", "sourceRef", "owner", "reviewState", "verified", "fallback"]);
  Object.keys(value).filter((key) => !allowed.has(key)).forEach((key) => diagnostics.push({ path: `$.${key}`, message: "Unknown extension field." }));
  const capability = typeof value.extendsCapability === "string" ? PLUGIN_CAPABILITY_CATALOG[value.extendsCapability as PluginCapabilityId] : undefined;
  if (!/^[a-z][a-z0-9.-]{2,79}$/.test(String(value.id ?? ""))) diagnostics.push({ path: "$.id", message: "Extension ID must be a bounded dotted identifier." });
  if (!capability) diagnostics.push({ path: "$.extendsCapability", message: "A known base capability is required." });
  if (!/^hcc\.[a-z0-9.-]+$/.test(String(value.rendererId ?? ""))) diagnostics.push({ path: "$.rendererId", message: "Renderer ID must be an hcc.* identifier." });
  if (typeof value.contractVersion !== "string" || !/^\d+\.\d+-candidate\.\d+$/.test(value.contractVersion)) diagnostics.push({ path: "$.contractVersion", message: "Extensions require an explicit candidate contract version." });
  if (value.lifecycle !== "candidate" && value.lifecycle !== "proposal") diagnostics.push({ path: "$.lifecycle", message: "Extension lifecycle must be candidate or proposal." });
  const vocabulary = stringList(value.vocabulary, "$.vocabulary", diagnostics);
  const requestedEffects = effectList(value.requestedEffects, diagnostics);
  if (capability && requestedEffects) requestedEffects.forEach((effect, index) => {
    if (!capability.allowedEffects.includes(effect)) diagnostics.push({ path: `$.requestedEffects[${index}]`, message: `${effect} exceeds the base capability.` });
  });
  for (const key of ["sourceRef", "owner", "fallback"]) if (typeof value[key] !== "string" || !(value[key] as string).trim()) diagnostics.push({ path: `$.${key}`, message: "A non-empty string is required." });
  if (value.reviewState !== "human-review-required") diagnostics.push({ path: "$.reviewState", message: "Extensions remain human-review-required." });
  if (value.verified !== false) diagnostics.push({ path: "$.verified", message: "An extension descriptor cannot self-verify." });
  if (diagnostics.length || !capability || !vocabulary || !requestedEffects) return { ok: false, diagnostics };
  return { ok: true, diagnostics: [], descriptor: value as unknown as ExtensionDescriptor };
}

function effectList(value: unknown, diagnostics: ExtensionDiagnostic[]): PluginEffect[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || !(PLUGIN_EFFECTS as readonly string[]).includes(item))) {
    diagnostics.push({ path: "$.requestedEffects", message: "A non-empty list of known effects is required." }); return null;
  }
  if (new Set(value).size !== value.length) diagnostics.push({ path: "$.requestedEffects", message: "Effects must be unique." });
  return value as PluginEffect[];
}

function stringList(value: unknown, path: string, diagnostics: ExtensionDiagnostic[]): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || !item.trim())) { diagnostics.push({ path, message: "A non-empty string list is required." }); return null; }
  if (new Set(value).size !== value.length) diagnostics.push({ path, message: "Entries must be unique." });
  return value as string[];
}

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
