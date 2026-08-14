import { createHash } from "node:crypto";
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const sourceRoot = new URL("../", import.meta.url).pathname;
const policy = JSON.parse(readFileSync(join(sourceRoot, "config/public-source-policy.json"), "utf8"));
const privateExclusionPath = "reviews/phase-1.0/v0.0.32-private-public-projection-exclusions.json";
const privateExclusions = exists(join(sourceRoot, privateExclusionPath))
  ? JSON.parse(readFileSync(join(sourceRoot, privateExclusionPath), "utf8"))
  : { version: policy.version, excludePaths: [] };
const effectiveExcludePaths = [...policy.excludePaths, ...privateExclusions.excludePaths];
const identity = JSON.parse(readFileSync(join(sourceRoot, "config/identity-migration.json"), "utf8"));
const temporaryParent = mkdtempSync(join(tmpdir(), "hcc-public-source-proof-"));
const publicRoot = join(temporaryParent, identity.candidatePublicId);
const findings = [];
let proof = "not-run";
let dependencyAudit = "not-run";
let sourceFiles = [];
let sourceDigest = null;
let publicTests = null;
let releaseAssets = [];
let disclosureCategories = [];
let disclosureManifest = [];
let materialization = { requested: false, status: "not-requested", path: null, source_files: 0, projection_sha256: null };

const reviewPacketFlag = process.argv.indexOf("--write-disclosure-review");
const reviewPacketPath = reviewPacketFlag === -1 ? null : process.argv[reviewPacketFlag + 1];
const materializeFlag = process.argv.indexOf("--materialize");
const materializePath = materializeFlag === -1 ? null : process.argv[materializeFlag + 1];
const manifestOnly = process.argv.includes("--manifest-only");
const retainFailedProjection = process.env.HCC_RETAIN_FAILED_PUBLIC_PROJECTION === "1";
const DISCLOSURE_CATEGORIES = [
  { id: "identity_trust", label: "Identity, licensing, privacy, security, and support" },
  { id: "user_documentation", label: "User orientation, accessibility, roadmap, and guides" },
  { id: "agent_grammar", label: "Agent guidance, concepts, grammar, and API references" },
  { id: "maintainer_community", label: "Maintainer, contributor, and community surfaces" },
  { id: "runtime_source", label: "Plugin runtime source and presentation" },
  { id: "assurance_tests", label: "Tests and assurance corpus" },
  { id: "synthetic_vault", label: "Synthetic demo vault and evaluation fixtures" },
  { id: "build_configuration", label: "Build, policy, packaging, and validation tooling" }
];

try {
  validatePolicy();
  mkdirSync(publicRoot, { recursive: true });
  for (const path of policy.includeFiles) copyPath(path);
  for (const path of policy.includeDirectories) copyPath(path);
  sourceFiles = walk(publicRoot).map((path) => normalize(relative(publicRoot, path))).sort();
  verifyProhibitedRoots();
  verifySensitiveMarkers();
  verifyMarkdownLinks();
  sourceDigest = digestProjection(sourceFiles);
  disclosureManifest = buildDisclosureManifest(sourceFiles);
  disclosureCategories = summarizeDisclosureCategories(disclosureManifest);
  if (findings.length) throw new Error(`public source boundary has ${findings.length} finding(s)`);
  if (reviewPacketPath !== null) writeDisclosureReview(reviewPacketPath);
  if (!manifestOnly) {
    run("npm", ["ci", "--offline", "--ignore-scripts"]);
    run("npm", ["run", "proof"]);
    const testReportPath = join(publicRoot, ".hcc-public-test-report.json");
    try {
      run("node", ["node_modules/vitest/vitest.mjs", "run", "--reporter=json", "--outputFile", testReportPath]);
      publicTests = parseTestCounts(readFileSync(testReportPath, "utf8"));
    } finally {
      rmSync(testReportPath, { force: true });
    }
    proof = "pass";
    const assetPaths = { "main.js": "scratch-vault/.obsidian/plugins/hcc-widget-lab/main.js", "manifest.json": "manifest.json", "styles.css": "styles.css" };
    releaseAssets = Object.entries(assetPaths).map(([name, path]) => {
      const bytes = readFileSync(join(publicRoot, path));
      return { name, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") };
    });
    run("npm", ["audit", "--offline", "--omit=dev"]);
    dependencyAudit = "pass";
    if (materializePath !== null) materialization = materializeProjection(materializePath);
  }
} catch (error) {
  findings.push(error instanceof Error ? error.message : String(error));
} finally {
  if (!(retainFailedProjection && findings.length > 0)) rmSync(temporaryParent, { recursive: true, force: true });
  else findings.push(`failed public projection retained for local diagnosis: ${publicRoot}`);
}

const receipt = {
  record_type: "hcc-public-source-boundary-proof-receipt",
  contract_version: policy.version,
  observed_at: new Date().toISOString(),
  policy: "config/public-source-policy.json",
  mode: policy.mode,
  source_files: sourceFiles.length,
  projection_sha256: sourceDigest,
  disclosure_review: {
    category_count: disclosureCategories.length,
    categories: disclosureCategories,
    manifest_entries: disclosureManifest.length,
    review_packet: reviewPacketPath === null ? "not-requested" : normalize(reviewPacketPath),
    authority: "candidate-review-only"
  },
  materialization,
  checks: {
    allowlist_projection: findings.length === 0 ? "pass" : "fail",
    prohibited_roots_absent: findings.some((item) => item.includes("prohibited source root")) ? "fail" : "pass",
    sensitive_marker_scan: findings.some((item) => item.includes("sensitive marker")) ? "fail" : "pass",
    relative_markdown_links: findings.some((item) => item.includes("Markdown link")) ? "fail" : "pass",
    offline_full_proof: proof,
    public_test_suite: publicTests,
    release_assets: releaseAssets,
    offline_production_dependency_audit: dependencyAudit
  },
  excluded_private_classes: ["immutable response packets", "development review history", "internal projectization records", "personal vault material", "Obsidian workspace/runtime state"],
  effects: { temporary_copy: retainFailedProjection && findings.length > 0 ? "retained-for-local-diagnosis" : "removed", local_repository_candidate: materialization.status, git: "not-performed", network: "prohibited-by-offline-mode", remote: "not-performed", release: "not-performed", publication: "not-performed" },
  limits: [
    "This verifies an allowlisted temporary projection of current working-tree bytes, not a reviewed Git commit or public remote.",
    "Pattern scanning cannot prove that all sensitive meaning has been removed; human disclosure review remains required.",
    "It does not authorize repository creation, push, hosted CI, release, submission, or publication."
  ],
  findings
};

console.log(JSON.stringify(receipt, null, 2));
if (findings.length) process.exitCode = 1;

function validatePolicy() {
  if (policy.version !== "0.1-candidate.1" || policy.mode !== "allowlist") throw new Error("unsupported public-source policy");
  if (reviewPacketFlag !== -1 && (!reviewPacketPath || reviewPacketPath.startsWith("-") || !normalize(reviewPacketPath).startsWith("reviews/phase-1.0/") || !reviewPacketPath.endsWith(".md"))) throw new Error("disclosure review output must be one Markdown file under reviews/phase-1.0/");
  if (materializeFlag !== -1) {
    if (!materializePath || materializePath.startsWith("-") || !isAbsolute(materializePath)) throw new Error("materialization target must be one absolute path");
    if (manifestOnly) throw new Error("materialization requires the complete offline proof");
    const target = resolve(materializePath);
    if (basename(target) !== identity.candidatePublicId) throw new Error(`materialization directory must be named ${identity.candidatePublicId}`);
    if (target === resolve(sourceRoot) || target.startsWith(`${resolve(sourceRoot)}${sep}`) || target.startsWith(`${resolve(temporaryParent)}${sep}`)) throw new Error("materialization target must be outside the development and temporary trees");
    if (!exists(dirname(target)) || !statSync(dirname(target)).isDirectory()) throw new Error("materialization parent directory must already exist");
    if (exists(target)) throw new Error("materialization target must not already exist");
  }
  for (const key of ["includeFiles", "includeDirectories", "excludePaths", "prohibitedSourceRoots"]) if (!Array.isArray(policy[key])) throw new Error(`invalid policy list: ${key}`);
  if (privateExclusions.version !== policy.version || !Array.isArray(privateExclusions.excludePaths)) throw new Error("invalid private public-projection exclusion overlay");
  const duplicates = [...policy.includeFiles, ...policy.includeDirectories].filter((value, index, all) => all.indexOf(value) !== index);
  if (duplicates.length) throw new Error(`duplicate public-source includes: ${duplicates.join(", ")}`);
}

function disclosureCategory(path) {
  if (["LICENSE", "CODE_OF_CONDUCT.md", "PRIVACY.md", "SECURITY.md", "SUPPORT.md", "manifest.json", "versions.json"].includes(path)) return "identity_trust";
  if (["README.md", "ACCESSIBILITY.md", "ROADMAP.md"].includes(path) || path.startsWith("docs/guides/") || path.startsWith("docs/tutorials/")) return "user_documentation";
  if (path === "llms.txt" || path.startsWith("docs/agents/") || path.startsWith("docs/concepts/") || path.startsWith("docs/reference/") || path.startsWith("skills/")) return "agent_grammar";
  if (path === "CONTRIBUTING.md" || path.startsWith("docs/maintainers/") || path.startsWith(".github/")) return "maintainer_community";
  if (path === "styles.css" || path.startsWith("src/")) return "runtime_source";
  if (path.startsWith("tests/")) return "assurance_tests";
  if (path.startsWith("scratch-vault/")) return "synthetic_vault";
  return "build_configuration";
}

function buildDisclosureManifest(paths) {
  return paths.map((path) => {
    const bytes = readFileSync(join(publicRoot, path));
    return { path, category: disclosureCategory(path), bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") };
  });
}

function summarizeDisclosureCategories(manifest) {
  return DISCLOSURE_CATEGORIES.map(({ id, label }) => {
    const entries = manifest.filter((entry) => entry.category === id);
    return { id, label, files: entries.length, bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0) };
  });
}

function materializeProjection(requestedPath) {
  const target = resolve(requestedPath);
  let created = false;
  try {
    mkdirSync(target);
    created = true;
    for (const path of sourceFiles) {
      const destination = join(target, path);
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(join(publicRoot, path), destination);
    }
    const projectedFiles = walk(target).map((path) => normalize(relative(target, path))).sort();
    const digest = digestProjectionAt(target, projectedFiles);
    if (projectedFiles.length !== sourceFiles.length || digest !== sourceDigest) throw new Error("materialized projection differs from the proved source set");
    return { requested: true, status: "created-and-byte-verified", path: target, source_files: projectedFiles.length, projection_sha256: digest };
  } catch (error) {
    if (created) rmSync(target, { recursive: true, force: true });
    throw error;
  }
}

function writeDisclosureReview(relativePath) {
  const normalized = normalize(relativePath);
  const target = join(sourceRoot, normalized);
  const summaryRows = disclosureCategories.map((item) => `| \`${item.id}\` | ${item.label} | ${item.files} | ${item.bytes} |`).join("\n");
  const manifestRows = disclosureManifest.map((item) => `| \`${item.path}\` | \`${item.category}\` | ${item.bytes} | \`${item.sha256}\` |`).join("\n");
  const excluded = [...policy.prohibitedSourceRoots, ...effectiveExcludePaths].sort().map((path) => `- \`${path}\``).join("\n");
  const questions = [
    "Do any included files disclose private identity, responses, internal projectization, or personal meaning despite passing marker scans?",
    "Are identity, license, authorship, privacy, security, support, and compatibility claims accurate for a public repository?",
    "Are all synthetic fixtures clearly non-authoritative and safe to publish?",
    "Do user and agent documents describe only implemented behavior and preserve held effects?",
    "Are maintainer and community documents honest about currently unnamed commitments or unsupported platforms?",
    "Do source, tests, build scripts, and configuration expose no credentials, private paths, runtime state, or hidden provider assumptions?",
    "Are relative links, generated assets, dependency boundaries, and the eight-category documentation structure coherent?",
    "Should this exact projection digest be accepted, revised through the allowlist, or held before any local public-repository candidate is created?"
  ].map((question, index) => `${index + 1}. ${question}`).join("\n");
  const markdown = `---\ntype: public-source-disclosure-review-packet\nclass: projection\nauthority_role: candidate-disclosure-review\nstatus: review-required\nverified: false\nsensitivity: private\nprojection_sha256: ${sourceDigest}\nsource_file_count: ${disclosureManifest.length}\ncategory_count: ${disclosureCategories.length}\n---\n\n# Public Source Disclosure Review Packet\n\n> [!important] Non-authority projection\n> This packet describes one exact local allowlist projection. It creates no Git repository, remote, hosted workflow, release, submission, or publication and cannot accept itself.\n\n## Recognition\n\n- Purpose: human disclosure review before a local public-repository candidate is created.\n- Source: \`config/public-source-policy.json\` at the current working-tree bytes.\n- Projection digest: \`${sourceDigest}\`.\n- Included files: ${disclosureManifest.length}.\n- Review state: human disposition required.\n- Next action: accept, revise, or hold this exact digest.\n\n## Eight-category summary\n\n| Category | Scope | Files | Bytes |\n|---|---|---:|---:|\n${summaryRows}\n\n## Excluded boundaries\n\n${excluded}\n\n## Eight review questions\n\n${questions}\n\n## Exact projected-file manifest\n\n| Path | Category | Bytes | SHA-256 |\n|---|---|---:|---|\n${manifestRows}\n\n## Human disposition\n\nRecord one of \`accept_exact_digest\`, \`revise_allowlist\`, or \`hold\`, with findings. Acceptance authorizes only preparation of a local candidate unless a later instruction separately authorizes Git, remote, CI, release, submission, or publication effects.\n`;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, markdown, "utf8");
}

function copyPath(relativePath) {
  const normalized = normalize(relativePath);
  if (excluded(normalized)) return;
  const source = join(sourceRoot, normalized);
  let metadata;
  try { metadata = lstatSync(source); } catch { findings.push(`allowlisted path is missing: ${normalized}`); return; }
  if (metadata.isSymbolicLink()) { findings.push(`symbolic links are prohibited in public projection: ${normalized}`); return; }
  if (metadata.isDirectory()) {
    for (const entry of readdirSync(source).sort()) copyPath(`${normalized}/${entry}`);
    return;
  }
  if (!metadata.isFile()) { findings.push(`unsupported allowlisted path type: ${normalized}`); return; }
  const target = join(publicRoot, normalized);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

function excluded(path) { return effectiveExcludePaths.some((entry) => path === entry || path.startsWith(`${entry}/`)); }

function verifyProhibitedRoots() {
  for (const root of policy.prohibitedSourceRoots) if (exists(join(publicRoot, root))) findings.push(`prohibited source root entered public projection: ${root}`);
  for (const path of sourceFiles) if (path.includes("/.obsidian/") || path.startsWith("scratch-vault/.obsidian/")) findings.push(`Obsidian runtime state entered public projection: ${path}`);
}

function verifySensitiveMarkers() {
  const privateHome = ["/home", "/cosmatrexis"].join("");
  const namedResponse = ["Scott", "(?:'s)?\\s+Response\\s*:"].join("");
  const privateKey = ["-----BEGIN ", "(?:RSA |EC |OPENSSH )?PRIVATE KEY-----"].join("");
  const patterns = [
    ["absolute home path", new RegExp(`${privateHome.replaceAll("/", "\\/")}\\b|[A-Za-z]:\\\\Users\\\\[^\\\\\\s]+`)],
    ["worksheet response session", /Worksheets-[^\s'\"]+--session-\d{14}/],
    ["named response attribution", new RegExp(namedResponse, "i")],
    ["private key", new RegExp(privateKey)],
    ["provider token", /\b(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,})\b/]
  ];
  const textExtensions = new Set([".css", ".json", ".md", ".mjs", ".ts", ".txt", ".yaml", ".yml"]);
  for (const path of sourceFiles.filter((item) => textExtensions.has(extname(item)))) {
    const source = readFileSync(join(publicRoot, path), "utf8");
    for (const [label, pattern] of patterns) if (pattern.test(source)) findings.push(`sensitive marker (${label}) found in ${path}`);
  }
}

function verifyMarkdownLinks() {
  for (const path of sourceFiles.filter((item) => item.endsWith(".md"))) {
    const source = readFileSync(join(publicRoot, path), "utf8");
    for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      let target = match[1].trim().replace(/^<|>$/g, "");
      if (/^(?:https?:|mailto:|#)/.test(target)) continue;
      target = decodeURIComponent(target.split("#")[0]);
      if (!target) continue;
      if (target.startsWith("/")) { findings.push(`absolute Markdown link in ${path}: ${target}`); continue; }
      const resolved = resolve(dirname(join(publicRoot, path)), target);
      if (!resolved.startsWith(`${publicRoot}${sep}`) || !exists(resolved)) findings.push(`unresolved Markdown link in ${path}: ${target}`);
    }
  }
}

function digestProjection(paths) {
  return digestProjectionAt(publicRoot, paths);
}

function digestProjectionAt(root, paths) {
  const hash = createHash("sha256");
  for (const path of paths) hash.update(path).update("\0").update(createHash("sha256").update(readFileSync(join(root, path))).digest("hex")).update("\n");
  return hash.digest("hex");
}

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const metadata = lstatSync(path);
    if (metadata.isSymbolicLink()) { findings.push(`symbolic link found after projection: ${normalize(relative(publicRoot, path))}`); return []; }
    return metadata.isDirectory() ? walk(path) : [path];
  });
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: publicRoot, env: { ...process.env, npm_config_update_notifier: "false", npm_config_audit: "false" }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}: ${`${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim().slice(-5000)}`);
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function parseTestCounts(output) {
  let report;
  const trimmed = output.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  try { report = JSON.parse(start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed); }
  catch { throw new Error("direct Vitest JSON output could not be parsed"); }
  const files = Array.isArray(report.testResults) ? report.testResults.length : 0;
  const cases = report.numTotalTests;
  const allFilesPassed = Array.isArray(report.testResults) && report.testResults.every((item) => item?.status === "passed");
  if (report.success !== true || report.numFailedTests !== 0 || !Number.isInteger(cases) || cases < 1 || files < 1 || !allFilesPassed) {
    throw new Error("direct Vitest JSON report did not prove a complete passing test suite");
  }
  return { files, cases, result: "pass" };
}

function exists(path) { try { return statSync(path).isFile() || statSync(path).isDirectory(); } catch { return false; } }
function normalize(path) { return path.split(sep).join("/").replace(/^\.\//, ""); }
