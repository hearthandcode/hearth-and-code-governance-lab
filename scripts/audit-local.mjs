import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { load } from "js-yaml";

const root = new URL("../", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const versions = JSON.parse(readFileSync(join(root, "versions.json"), "utf8"));
const developmentInstall = JSON.parse(readFileSync(join(root, "config/development-install.json"), "utf8"));

const findings = [];
if (manifest.version !== packageJson.version) findings.push("manifest.json and package.json versions differ");
if (versions[manifest.version] !== manifest.minAppVersion) findings.push("versions.json does not bind the current version to minAppVersion");
if (packageJson.private !== true) findings.push("the disposable package must remain private until the release gate");
if (packageJson.license !== "MIT") findings.push("package metadata must carry the accepted MIT license");
if (manifest.id !== "hearth-and-code-governance-lab" || manifest.name !== "Hearth and Code Governance Lab") findings.push("accepted public identity is not aligned");
if (manifest.author !== "Scott Rallya" || manifest.authorUrl !== "https://hearthandcode.dev" || manifest.isDesktopOnly !== true) findings.push("public Obsidian author or platform metadata is incomplete or misaligned");
if (packageJson.name !== "hearth-and-code-governance-lab" || packageJson.author !== manifest.author || packageJson.homepage !== manifest.authorUrl) findings.push("package and public Obsidian identity metadata are not aligned");
if (developmentInstall.directoryId !== "hcc-widget-lab" || developmentInstall.manifestOverrides?.id !== "hcc-widget-lab") findings.push("disposable-vault compatibility identity is not preserved");

const publicRequired = [
  "README.md", "ROADMAP.md", "llms.txt", "SECURITY.md", "PRIVACY.md", "ACCESSIBILITY.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "SUPPORT.md", "CHANGELOG.md", "LICENSE",
  "docs/guides/authoring.md", "docs/guides/styling.md", "docs/reference/catalog.md", "docs/concepts/governance-and-provenance.md", "docs/concepts/plugin-identity.md",
  "docs/agents/authoring-hcc-content.md", "docs/reference/grammar.md", "docs/reference/grammar-example-catalog.md", "docs/reference/authoring-api.md", "docs/guides/power-of-two-workbook-design.md",
  "docs/reference/native-dashboard.md", "docs/reference/schema-workflow-studio.md", "docs/reference/provider-neutral-exchange.md", "docs/reference/semantic-interoperability.md", "docs/guides/first-use-and-manual-install.md",
  "docs/guides/ai-assisted-governed-workflow.md", "docs/guides/project-setup-and-integration.md", "docs/guides/response-packets.md", "docs/guides/troubleshooting-and-recovery.md",
  "docs/tutorials/README.md", "docs/tutorials/00-first-orientation.md", "docs/tutorials/01-install-and-verify.md", "docs/tutorials/02-first-form.md",
  "docs/tutorials/03-workbooks.md", "docs/tutorials/04-response-packets.md", "docs/tutorials/05-views-and-styling.md", "docs/tutorials/06-governance-studio-exchange.md", "docs/tutorials/07-agent-operations-and-recovery.md",
  "skills/author-hcc-content/SKILL.md", "skills/author-hcc-content/agents/openai.yaml", "skills/design-hcc-workbook/SKILL.md", "skills/design-hcc-workbook/agents/openai.yaml",
  "skills/operate-hcc-responses/SKILL.md", "skills/operate-hcc-responses/agents/openai.yaml", "skills/project-hcc-governance/SKILL.md", "skills/project-hcc-governance/agents/openai.yaml",
  "docs/maintainers/architecture.md", "docs/maintainers/threat-model.md", "docs/maintainers/testing.md", "docs/maintainers/release.md",
  "docs/maintainers/runtime-readiness.md", "docs/maintainers/compatibility-matrix.md", "docs/maintainers/public-source-boundary.md",
  "config/public-source-policy.json", "config/release-admission.json", "config/identity-migration.json", "config/provider-neutral-semantic-interoperability.json", "config/development-install.json", "config/public-stewardship.json", "scripts/check-identity-migration.mjs", "scripts/check-provider-neutral-semantic-interoperability.ts", "scripts/verify-install-layout.mjs", "scripts/validate-release-candidate.mjs", "scripts/verify-clean-room.mjs", "scripts/verify-public-source-boundary.mjs",
  ".github/ISSUE_TEMPLATE/bug-report.yml", ".github/ISSUE_TEMPLATE/feature-proposal.yml", ".github/pull_request_template.md"
];
const internalRequired = [
  "docs/projectization/identity-and-metadata.md", "docs/projectization/release-candidate-hardening-plan.md", "docs/projectization/phased-implementation-and-release-plan.md",
  "docs/projectization/open-source-readiness-contract.md", "docs/projectization/goal-prompts/downstream-feature-program-goal-prompt.md", "docs/projectization/exocore-ui-projection-rules.md",
  "reviews/phase-1.0/v0.0.29-agent-onboarding-public-source-disclosure-review.md",
  "reviews/phase-1.0/v0.0.32-private-public-projection-exclusions.json"
];
const internalEvidencePresent = pathIsFile("reviews/phase-0.5/final-readiness-response-packet.yaml");
const required = [...publicRequired, ...(internalEvidencePresent ? internalRequired : [])];
for (const path of required) {
  try { if (!statSync(join(root, path)).isFile()) findings.push(`required path is not a file: ${path}`); }
  catch { findings.push(`required document is missing: ${path}`); }
}

for (const path of [".github/ISSUE_TEMPLATE/bug-report.yml", ".github/ISSUE_TEMPLATE/feature-proposal.yml"]) {
  try {
    const form = load(readFileSync(join(root, path), "utf8"));
    if (!form || typeof form !== "object" || !Array.isArray(form.body) || form.body.length < 4) findings.push(`GitHub issue form is structurally incomplete: ${path}`);
  } catch (error) {
    findings.push(`GitHub issue form does not parse: ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
try {
  if (readdirSync(join(root, ".github/workflows")).length > 0) findings.push("hosted workflow files are present before the held CI activation gate");
} catch { /* no workflow directory is the intended held state */ }

const prohibited = [
  ["innerHTML", /\binnerHTML\b/],
  ["dynamic evaluation", /\beval\s*\(|\bnew\s+Function\b/],
  ["network", /\bfetch\s*\(|\bXMLHttpRequest\b|\brequestUrl\s*\(/],
  ["browser persistence", /\blocalStorage\b|\bsessionStorage\b/],
  ["vault scan", /\bvault\.(getFiles|getMarkdownFiles)\s*\(/],
  ["prohibited vault mutation", /\bvault\.(modify|delete|rename|process)\s*\(|\bprocessFrontMatter\s*\(/]
];

function files(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

for (const path of files(join(root, "src")).filter((item) => item.endsWith(".ts"))) {
  const source = readFileSync(path, "utf8");
  for (const [label, pattern] of prohibited) if (pattern.test(source)) findings.push(`${label} surface found in ${relative(root, path)}`);
}

const canaryBridgePath = join(root, "src/obsidian/response-packets.ts");
const canaryAdapterPath = join(root, "src/obsidian/vault-response-packet-adapter.ts");
const responseControllerPath = join(root, "src/obsidian/response-packet-controller.ts");
const canaryBridge = readFileSync(canaryBridgePath, "utf8");
const canaryAdapter = readFileSync(canaryAdapterPath, "utf8");
const responseController = readFileSync(responseControllerPath, "utf8");
const dashboardSource = readFileSync(join(root, "src/obsidian/dashboard-source.ts"), "utf8");
const pluginEntry = readFileSync(join(root, "src/main.ts"), "utf8");
const settingsModel = readFileSync(join(root, "src/settings.ts"), "utf8");
const vaultCreates = canaryBridge.match(/\bvault\.create\s*\(/g) ?? [];
const folderCreates = canaryBridge.match(/\bvault\.createFolder\s*\(/g) ?? [];
if (vaultCreates.length !== 1 || folderCreates.length !== 1) findings.push("the response-packet bridge must expose exactly one Vault.create and one Vault.createFolder call");
if ((canaryAdapter.match(/\bthis\.vault\.create\s*\(/g) ?? []).length !== 1) findings.push("the response-packet adapter must expose exactly one create-only port call");
for (const path of files(join(root, "src")).filter((item) => item.endsWith(".ts") && item !== canaryBridgePath && item !== canaryAdapterPath)) {
  const source = readFileSync(path, "utf8");
  if (/\bvault\.(create|createFolder)\s*\(/.test(source)) findings.push(`unauthorized vault create surface found in ${relative(root, path)}`);
}
if (!canaryBridge.includes("vault.cachedRead(item)") || !canaryBridge.includes("vault.getAbstractFileByPath")) findings.push("the response-packet bridge lacks explicit-path read-back primitives");
if (!canaryBridge.includes("responsePacketHostProfile(pluginId, vault.getName())")) findings.push("the production response-packet factory lacks the two-profile identity-and-host guard");
if (!pluginEntry.includes("createResponsePacketAdapter(this.manifest.id, this.app.vault)")) findings.push("the plugin lifecycle must obtain the writer through the guarded production factory");
if ((pluginEntry.match(/\bthis\.loadData\s*\(/g) ?? []).length !== 1 || (pluginEntry.match(/\bthis\.saveData\s*\(/g) ?? []).length !== 1) findings.push("the settings layer must expose exactly one Obsidian loadData and one saveData call");
if (!pluginEntry.includes('assertCapabilityEffect("hcc.settings.preferences", "read-plugin-settings")') || !pluginEntry.includes('assertCapabilityEffect("hcc.settings.preferences", "persist-settings")')) findings.push("the settings read/write path lacks capability assertions");
for (const forbiddenSetting of ["responseRoot", "allowOverwrite", "allowDelete", "networkProvider", "canonicalWriteBack"]) {
  if (settingsModel.includes(forbiddenSetting)) findings.push(`prohibited configurable setting found: ${forbiddenSetting}`);
}
for (const signal of ["RESPONSE_PACKET_PROTOTYPE_PLUGIN_ID", "RESPONSE_PACKET_PUBLIC_PLUGIN_ID", "prototype-disposable-vault", "public-current-vault", "HCC-PLUGIN-SCOPE"]) {
  if (!canaryAdapter.includes(signal)) findings.push(`the response-packet host policy lacks ${signal}`);
}
if (/new\s+VaultResponsePacketAdapter\s*\(/.test(pluginEntry)) findings.push("the plugin lifecycle must not instantiate the response-packet adapter directly");
if (/from\s+["']obsidian["']/.test(responseController)) findings.push("the response-packet controller must not import Obsidian");
if (/\bcompileResponse(?:Write|Reload|Amendment)Plan\b/.test(pluginEntry)) findings.push("the plugin lifecycle must delegate response planning to the controller");
if (!responseController.includes("interface ResponsePacketEffectPort") || !responseController.includes("readExplicit(path: string)") || !responseController.includes("createOnly(plan: CreateOnlyCandidatePlan")) findings.push("the response-packet controller must retain its two-method effect port");
if ((dashboardSource.match(/\bcachedRead\s*\(/g) ?? []).length !== 1 || !dashboardSource.includes("cachedRead(sourceFile)")) findings.push("the dashboard source adapter must read only the selected source body once");
if (!dashboardSource.includes("collectExplicitRelationships(sourceMetadata, [])") || !dashboardSource.includes("getFirstLinkpathDest(linkPath, sourceFile.path)")) findings.push("the dashboard source adapter must retain explicit one-hop metadata resolution");
if (/\b(getFiles|getMarkdownFiles)\s*\(|\bvault\.(create|createFolder|modify|process|delete|rename)\s*\(/.test(dashboardSource)) findings.push("the dashboard source adapter exposes a scan or mutation surface");

for (const path of files(join(root, "src/studio")).filter((item) => item.endsWith(".ts"))) {
  const source = readFileSync(path, "utf8");
  if (/from\s+["']obsidian["']/.test(source)) findings.push(`studio pure core imports Obsidian in ${relative(root, path)}`);
  if (/\b(?:eval|Function)\s*\(|\b(?:fetch|XMLHttpRequest|requestUrl)\s*\(/.test(source)) findings.push(`studio executable or provider surface found in ${relative(root, path)}`);
}

for (const path of files(join(root, "src/exchange")).filter((item) => item.endsWith(".ts"))) {
  const source = readFileSync(path, "utf8");
  if (/from\s+["']obsidian["']/.test(source)) findings.push(`exchange pure core imports Obsidian in ${relative(root, path)}`);
  if (/\b(?:eval|Function)\s*\(|\b(?:fetch|XMLHttpRequest|requestUrl)\s*\(/.test(source)) findings.push(`exchange executable or provider surface found in ${relative(root, path)}`);
}

const mobileUnsafeImports = /from\s+["'](?:node:)?(?:fs|path|process|electron|child_process|os|net|tls|http|https)["']|require\s*\(\s*["'](?:node:)?(?:fs|path|process|electron|child_process|os|net|tls|http|https)["']\s*\)/;
for (const path of files(join(root, "src")).filter((item) => item.endsWith(".ts"))) {
  const source = readFileSync(path, "utf8");
  if (mobileUnsafeImports.test(source)) findings.push(`desktop-only runtime dependency found in ${relative(root, path)}`);
  if (/\bapp\.vault\.adapter\b|\bvault\.adapter\b/.test(source)) findings.push(`raw Vault.adapter access found in ${relative(root, path)}`);
  if (/\bglobalThis\.app\b|\bwindow\.app\b/.test(source)) findings.push(`global Obsidian app access found in ${relative(root, path)}`);
}

const receipt = {
  record_type: "hcc-local-audit-receipt",
  checked_at: new Date().toISOString(),
  scope: "source, package metadata, and required-document presence",
  version: manifest.version,
  checks: { version_alignment: true, private_prerelease: true, prohibited_surface_scan: true, required_docs: required.length, evidence_mode: internalEvidencePresent ? "private-development" : "public-source-projection" },
  findings,
  limits: ["does not prove host runtime behavior", "does not perform dependency vulnerability lookup", "does not authorize release"]
};
console.log(JSON.stringify(receipt, null, 2));
if (findings.length) process.exitCode = 1;

function pathIsFile(path) { try { return statSync(join(root, path)).isFile(); } catch { return false; } }
