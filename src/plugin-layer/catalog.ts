import { SUPPORTED_KINDS, SUPPORTED_VERSION } from "../core/types";
import { CANDIDATE_INPUT_KINDS, CANDIDATE_INTERACTION_VERSION } from "../grammar";
import { HCC_VIEW_KINDS, HCC_VIEW_VERSION } from "../visualization";
import { WORKBOOK_VERSION, WORKSHEET_VERSION } from "../workbook";
import { COMPUTED_FIELD_VERSION, RADAR_VIEW_VERSION } from "../extensions";
import type { PluginCapability, PluginCapabilityId, PluginEffect } from "./types";

const consequential: readonly PluginEffect[] = ["persist-settings", "persist-response", "mutate-frontmatter", "scan-vault", "network", "publish"];

function capability(value: PluginCapability): PluginCapability { return Object.freeze(value); }

export const PLUGIN_CAPABILITY_CATALOG: Readonly<Record<PluginCapabilityId, PluginCapability>> = Object.freeze({
  "hcc.interaction.released": capability({
    id: "hcc.interaction.released", surface: "interaction", lifecycle: "released-fixture",
    contractVersions: [SUPPORTED_VERSION], vocabulary: SUPPORTED_KINDS,
    allowedEffects: ["render"], deniedEffects: consequential, provenanceRequired: true, humanReviewRequired: true
  }),
  "hcc.interaction.candidate": capability({
    id: "hcc.interaction.candidate", surface: "interaction", lifecycle: "candidate",
    contractVersions: [CANDIDATE_INTERACTION_VERSION], vocabulary: CANDIDATE_INPUT_KINDS,
    allowedEffects: ["render"], deniedEffects: consequential, provenanceRequired: true, humanReviewRequired: true
  }),
  "hcc.view.candidate": capability({
    id: "hcc.view.candidate", surface: "view", lifecycle: "candidate",
    contractVersions: [HCC_VIEW_VERSION], vocabulary: HCC_VIEW_KINDS,
    allowedEffects: ["render", "read-explicit-source"], deniedEffects: consequential, provenanceRequired: true, humanReviewRequired: true
  }),
  "hcc.form.candidate": capability({
    id: "hcc.form.candidate", surface: "form", lifecycle: "candidate",
    contractVersions: [WORKSHEET_VERSION], vocabulary: ["worksheet"],
    allowedEffects: ["render"], deniedEffects: consequential, provenanceRequired: true, humanReviewRequired: true
  }),
  "hcc.workbook.candidate": capability({
    id: "hcc.workbook.candidate", surface: "workbook", lifecycle: "candidate",
    contractVersions: [WORKBOOK_VERSION], vocabulary: ["workbook"],
    allowedEffects: ["render"], deniedEffects: consequential, provenanceRequired: true, humanReviewRequired: true
  }),
  "hcc.governance.workbench": capability({
    id: "hcc.governance.workbench", surface: "governance", lifecycle: "candidate",
    contractVersions: ["0.1-candidate.1"], vocabulary: ["review", "verification", "lifecycle", "sensitivity", "authority", "supersession", "provenance", "hub-intelligence"],
    allowedEffects: ["render", "read-active-document", "read-explicit-authority"], deniedEffects: consequential, provenanceRequired: true, humanReviewRequired: true
  }),
  "hcc.dashboard.native": capability({
    id: "hcc.dashboard.native", surface: "dashboard", lifecycle: "candidate",
    contractVersions: ["0.1-candidate.1"], vocabulary: ["program_status", "active_lanes", "pending_seals", "review_queue", "programs", "threads", "handoffs"],
    allowedEffects: ["render", "read-active-document", "read-explicit-authority", "copy-to-clipboard"], deniedEffects: consequential, provenanceRequired: true, humanReviewRequired: true
  }),
  "hcc.studio.candidate": capability({
    id: "hcc.studio.candidate", surface: "studio", lifecycle: "candidate",
    contractVersions: ["0.1-candidate.1"], vocabulary: ["schema", "workflow", "migration", "invariant", "guard", "effect", "recovery", "human-gate"],
    allowedEffects: ["render", "copy-to-clipboard"], deniedEffects: consequential, provenanceRequired: true, humanReviewRequired: true
  }),
  "hcc.exchange.provider-neutral": capability({
    id: "hcc.exchange.provider-neutral", surface: "exchange", lifecycle: "candidate",
    contractVersions: ["0.1-candidate.1"], vocabulary: ["fixed-prompt-packet", "paste-import", "studio-candidate", "digest-verification"],
    allowedEffects: ["render", "copy-to-clipboard"], deniedEffects: consequential,
    provenanceRequired: true, humanReviewRequired: true
  }),
  "hcc.presentation.ember-circuit": capability({
    id: "hcc.presentation.ember-circuit", surface: "presentation", lifecycle: "candidate",
    contractVersions: ["0.1-candidate.1"], vocabulary: ["ember-circuit-session", "ember-circuit-note-class"],
    allowedEffects: ["render"], deniedEffects: consequential, provenanceRequired: true, humanReviewRequired: true
  }),
  "hcc.settings.preferences": capability({
    id: "hcc.settings.preferences", surface: "settings", lifecycle: "candidate",
    contractVersions: ["1"], vocabulary: ["presentation-mode", "detail-level", "interaction-density", "notice-level", "read-only-governance-status"],
    allowedEffects: ["render", "read-plugin-settings", "persist-settings"],
    deniedEffects: ["persist-response", "mutate-frontmatter", "scan-vault", "network", "publish"],
    provenanceRequired: false, humanReviewRequired: false
  }),
  "hcc.template.clipboard": capability({
    id: "hcc.template.clipboard", surface: "template", lifecycle: "candidate",
    contractVersions: [WORKSHEET_VERSION, WORKBOOK_VERSION], vocabulary: ["worksheet-template", "workbook-template"],
    allowedEffects: ["copy-to-clipboard"], deniedEffects: consequential, provenanceRequired: false, humanReviewRequired: false
  }),
  "hcc.response.clipboard": capability({
    id: "hcc.response.clipboard", surface: "response", lifecycle: "candidate",
    contractVersions: ["0.1-candidate.1"], vocabulary: ["prepared-yaml-block"],
    allowedEffects: ["copy-to-clipboard"], deniedEffects: consequential, provenanceRequired: true, humanReviewRequired: false
  }),
  "hcc.response.vault-packets": capability({
    id: "hcc.response.vault-packets", surface: "response", lifecycle: "candidate",
    contractVersions: ["0.1-candidate.1", "0.2-candidate.1"], vocabulary: ["explicit-packet-reload", "immutable-packet-create", "immutable-successor-create"],
    allowedEffects: ["read-explicit-source", "persist-response"],
    deniedEffects: ["mutate-frontmatter", "scan-vault", "network", "publish"],
    provenanceRequired: true, humanReviewRequired: true
  }),
  "hcc.authoring.api": capability({
    id: "hcc.authoring.api", surface: "authoring", lifecycle: "candidate",
    contractVersions: ["0.1-candidate.1"], vocabulary: ["eight-case-self-test-report"],
    allowedEffects: ["render", "copy-to-clipboard"], deniedEffects: consequential, provenanceRequired: false, humanReviewRequired: false
  }),
  "hcc.runtime.diagnostics": capability({
    id: "hcc.runtime.diagnostics", surface: "runtime", lifecycle: "candidate",
    contractVersions: ["0.1-candidate.1"], vocabulary: ["eight-check-runtime-readiness-report", "four-target-compatibility-matrix", "combined-host-assurance-packet"],
    allowedEffects: ["render", "copy-to-clipboard"], deniedEffects: consequential, provenanceRequired: true, humanReviewRequired: false
  }),
  "hcc.extension.computed-field": capability({
    id: "hcc.extension.computed-field", surface: "extension", lifecycle: "candidate",
    contractVersions: [COMPUTED_FIELD_VERSION], vocabulary: ["computed_field"],
    allowedEffects: ["render"], deniedEffects: consequential, provenanceRequired: true, humanReviewRequired: true
  }),
  "hcc.extension.radar": capability({
    id: "hcc.extension.radar", surface: "extension", lifecycle: "candidate",
    contractVersions: [RADAR_VIEW_VERSION], vocabulary: ["radar"],
    allowedEffects: ["render"], deniedEffects: consequential, provenanceRequired: true, humanReviewRequired: true
  })
});
