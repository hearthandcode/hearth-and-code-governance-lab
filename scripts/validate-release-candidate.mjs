import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const manifest = json("manifest.json");
const packageJson = json("package.json");
const versions = json("versions.json");
const admission = json("config/release-admission.json");
const developmentInstall = json("config/development-install.json");
const buildConfiguration = readFileSync(join(root, "esbuild.config.mjs"), "utf8");
const installedRoot = join(root, "scratch-vault/.obsidian/plugins/hcc-widget-lab");
const findings = [];

check(/^\d+\.\d+\.\d+$/.test(manifest.version), "manifest version must use exact x.y.z semantic versioning");
check(manifest.version === packageJson.version, "manifest and package versions must match");
check(versions[manifest.version] === manifest.minAppVersion, "versions.json must bind the current plugin version");
check(typeof manifest.id === "string" && /^[a-z0-9][a-z0-9-]*$/.test(manifest.id) && !manifest.id.includes("obsidian"), "plugin ID must be normalized and must not contain obsidian");
check(manifest.id === "hearth-and-code-governance-lab" && manifest.name === "Hearth and Code Governance Lab", "accepted public identity must remain aligned");
check(manifest.author === "Scott Rallya" && manifest.authorUrl === "https://hearthandcode.dev" && manifest.isDesktopOnly === true, "accepted public stewardship and desktop-only metadata must remain aligned");
check(developmentInstall.directoryId === "hcc-widget-lab" && developmentInstall.manifestOverrides?.id === "hcc-widget-lab", "disposable-vault compatibility identity must remain hcc-widget-lab");
check(buildConfiguration.includes("minify: production"), "production build configuration must enable minification");
check(packageJson.license === "MIT" && exists("LICENSE"), "MIT package metadata and root license are required");
for (const path of ["README.md", "ROADMAP.md", "manifest.json", "versions.json", "package-lock.json", "PRIVACY.md", "SECURITY.md", "SUPPORT.md", "CONTRIBUTING.md", "config/release-admission.json", "config/identity-migration.json", "config/provider-neutral-semantic-interoperability.json", "config/development-install.json", "config/public-stewardship.json", "scripts/check-identity-migration.mjs", "scripts/check-provider-neutral-semantic-interoperability.ts", "scripts/verify-install-layout.mjs", "docs/reference/native-dashboard.md", "docs/reference/schema-workflow-studio.md", "docs/reference/provider-neutral-exchange.md", "docs/reference/semantic-interoperability.md", "docs/guides/first-use-and-manual-install.md", "docs/guides/ai-assisted-governed-workflow.md", "docs/guides/project-setup-and-integration.md", "docs/guides/response-packets.md", "docs/guides/troubleshooting-and-recovery.md", "docs/maintainers/compatibility-matrix.md", ".github/ISSUE_TEMPLATE/bug-report.yml", ".github/ISSUE_TEMPLATE/feature-proposal.yml", ".github/pull_request_template.md"]) check(exists(path), `required repository file is missing: ${path}`);

const admissionGates = Array.isArray(admission.gates) ? admission.gates : [];
check(admission.version === "0.1-candidate.1", "release-admission contract version must be 0.1-candidate.1");
check(admission.requiredGateCount === 8 && admissionGates.length === 8, "release admission must contain exactly eight gates");
check(new Set(admissionGates.map((gate) => gate.id)).size === admissionGates.length, "release-admission gate IDs must be unique");
for (const gate of admissionGates) {
  check(typeof gate.id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(gate.id), "release-admission gate IDs must be normalized");
  check(["pass", "pending", "held"].includes(gate.state), `release-admission gate has an unknown state: ${gate.id ?? "unknown"}`);
  check(gate.requiredForPublicRelease === true, `release-admission gate must remain required: ${gate.id ?? "unknown"}`);
  check(Array.isArray(gate.evidence) && gate.evidence.length > 0, `release-admission gate lacks evidence locators: ${gate.id ?? "unknown"}`);
  for (const path of Array.isArray(gate.evidence) ? gate.evidence : []) check(exists(path), `release-admission evidence is missing: ${path}`);
  check(gate.state === "pass" ? Array.isArray(gate.unresolved) && gate.unresolved.length === 0 : Array.isArray(gate.unresolved) && gate.unresolved.length > 0, `release-admission unresolved conditions disagree with state: ${gate.id ?? "unknown"}`);
}
const internalEvidencePresent = exists("reviews/phase-0.5/final-readiness-response-packet.yaml");
if (internalEvidencePresent) for (const path of [
  "reviews/phase-1.0/v0.0.24-clean-room-proof.yaml",
  "reviews/phase-1.0/v0.0.24-structural-accessibility-proof.yaml",
  "reviews/phase-1.0/v0.0.24-synthetic-performance-proof.yaml",
  "reviews/phase-1.0/v0.0.24-writer-security-corpus-proof.yaml",
  "reviews/phase-1.0/v0.0.24-dom-injection-corpus-proof.yaml",
  "reviews/phase-1.0/v0.0.24-native-dashboard-proof.yaml",
  "reviews/phase-1.0/v0.0.25-studio-proof.yaml",
  "reviews/phase-1.0/v0.0.25-dom-injection-corpus-proof.yaml",
  "reviews/phase-1.0/v0.0.25-clean-room-proof.yaml",
  "reviews/phase-1.0/v0.0.25-local-release-readiness-receipt.yaml",
  "reviews/phase-1.0/v0.0.25-community-surface-proof.yaml",
  "reviews/phase-1.0/v0.0.25-public-source-boundary-proof.yaml",
  "reviews/phase-1.0/v0.0.25-compatibility-matrix-proof.yaml",
  "reviews/phase-1.0/v0.0.25-ember-contrast-proof.yaml",
  "reviews/phase-1.0/v0.0.25-identity-migration-proof.yaml",
  "reviews/phase-1.0/v0.0.25-public-source-disclosure-review.md"
]) check(exists(path), `bounded internal evidence receipt is missing: ${path}`);

const releaseAssets = ["main.js", "manifest.json", "styles.css"];
for (const asset of releaseAssets) {
  const path = join(installedRoot, asset);
  check(file(path) && statSync(path).size > 0, `built release asset is missing or empty: ${asset}`);
}
if (file(join(installedRoot, "manifest.json"))) {
  const installedManifest = JSON.parse(readFileSync(join(installedRoot, "manifest.json"), "utf8"));
  check(installedManifest.id === developmentInstall.manifestOverrides.id && installedManifest.name === developmentInstall.manifestOverrides.name, "built disposable manifest identity differs from its compatibility contract");
  check(installedManifest.version === manifest.version && installedManifest.minAppVersion === manifest.minAppVersion, "built disposable and public manifests differ on version compatibility");
}
if (file(join(installedRoot, "main.js"))) {
  const bundle = readFileSync(join(installedRoot, "main.js"), "utf8");
  check(!bundle.includes("sourceMappingURL=data:"), "production main.js must not contain an inline source map");
  check(!/require\(["'](?:fs|path|electron)["']\)/.test(bundle), "mobile candidate bundle must not require Node filesystem, path, or Electron modules");
  check(!/\b(?:fetch|XMLHttpRequest|requestUrl)\s*\(/.test(bundle), "candidate bundle must not contain a network call surface");
}

const blockers = admissionGates.filter((gate) => gate.state !== "pass").flatMap((gate) => gate.unresolved.map((item) => `${gate.id}: ${item}`));
const publicReleaseReady = findings.length === 0 && admissionGates.length === 8 && admissionGates.every((gate) => gate.state === "pass");

const receipt = {
  record_type: "hcc-open-source-release-candidate-check",
  checked_at: new Date().toISOString(),
  version: manifest.version,
  official_contract_checked: "2026-08-12",
  local_candidate_consistent: findings.length === 0,
  public_release_ready: publicReleaseReady,
  release_assets: releaseAssets,
  checks: {
    semantic_version: /^\d+\.\d+\.\d+$/.test(manifest.version),
    metadata_alignment: manifest.version === packageJson.version && versions[manifest.version] === manifest.minAppVersion,
    root_documents: true,
    evidence_mode: internalEvidencePresent ? "private-development" : "public-source-projection",
    built_assets: releaseAssets.every((asset) => file(join(installedRoot, asset)) && statSync(join(installedRoot, asset)).size > 0),
    production_bundle_boundary: findings.every((finding) => !finding.includes("bundle"))
  },
  release_admission: {
    contract_version: admission.version,
    required_gate_count: admission.requiredGateCount,
    passed: admissionGates.filter((gate) => gate.state === "pass").length,
    pending: admissionGates.filter((gate) => gate.state === "pending").length,
    held: admissionGates.filter((gate) => gate.state === "held").length,
    gates: admissionGates.map((gate) => ({ id: gate.id, state: gate.state }))
  },
  findings,
  public_release_blockers: blockers,
  effects: { remote: "not-performed", release: "not-performed", submission: "not-performed", publication: "not-performed" }
};

console.log(JSON.stringify(receipt, null, 2));
if (findings.length) process.exitCode = 1;

function json(path) { return JSON.parse(readFileSync(join(root, path), "utf8")); }
function exists(path) { try { return statSync(join(root, path)).isFile(); } catch { return false; } }
function file(path) { try { return statSync(path).isFile(); } catch { return false; } }
function check(condition, message) { if (!condition) findings.push(message); }
