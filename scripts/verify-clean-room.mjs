import { cpSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";

const sourceRoot = new URL("../", import.meta.url).pathname;
const temporaryParent = mkdtempSync(join(tmpdir(), "hcc-governed-widgets-clean-room-"));
const cleanRoot = join(temporaryParent, "candidate");
const exclusions = Object.freeze([
  ".git",
  "node_modules",
  "coverage",
  "scratch-vault/.obsidian",
  "scratch-vault/Intake",
  "logs and editor/OS transient files"
]);
let installStatus = "not-run";
let proofStatus = "not-run";
let manifestProjectionStatus = "not-run";
let assets = [];
let failure;

try {
  cpSync(sourceRoot, cleanRoot, {
    recursive: true,
    filter: (source) => included(relative(sourceRoot, source))
  });
  run("npm", ["ci", "--offline", "--ignore-scripts"]);
  installStatus = "pass";
  run("npm", ["run", "proof"]);
  proofStatus = "pass";
  const assetRoot = join(cleanRoot, "scratch-vault/.obsidian/plugins/hcc-widget-lab");
  assets = ["main.js", "manifest.json", "styles.css"].map((name) => ({ name, bytes: statSync(join(assetRoot, name)).size }));
  const rootManifest = JSON.parse(readFileSync(join(cleanRoot, "manifest.json"), "utf8"));
  const developmentInstall = JSON.parse(readFileSync(join(cleanRoot, "config/development-install.json"), "utf8"));
  const builtManifest = JSON.parse(readFileSync(join(assetRoot, "manifest.json"), "utf8"));
  const expectedBuiltManifest = { ...rootManifest, ...developmentInstall.manifestOverrides };
  if (JSON.stringify(builtManifest) !== JSON.stringify(expectedBuiltManifest)) throw new Error("Clean-room built manifest does not match the declared development-install projection.");
  if (builtManifest.id !== developmentInstall.directoryId) throw new Error("Clean-room built manifest ID and development plugin directory differ.");
  manifestProjectionStatus = "pass";
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
} finally {
  rmSync(temporaryParent, { recursive: true, force: true });
}

const receipt = {
  record_type: "hcc-clean-room-proof-receipt",
  contract_version: "0.1-candidate.1",
  observed_at: new Date().toISOString(),
  source: "current-working-tree-copy",
  package_manager: "npm-ci-offline-lockfile",
  exclusions,
  checks: {
    dependency_install: installStatus,
    full_proof: proofStatus,
    development_manifest_projection: manifestProjectionStatus,
    release_assets: assets
  },
  temporary_copy: "removed",
  effects: {
    source_repository_mutation: "not-performed",
    git: "not-performed",
    network: "prohibited-by-offline-mode",
    remote: "not-performed",
    release: "not-performed",
    publication: "not-performed"
  },
  limits: [
    "This proves the current working-tree bytes, not a Git commit or remote checkout.",
    "It does not prove hosted CI, Obsidian host behavior, mobile compatibility, assistive-technology behavior, or public release readiness."
  ],
  failure: failure ?? null
};

console.log(JSON.stringify(receipt, null, 2));
if (failure !== undefined) process.exitCode = 1;

function included(relativePath) {
  if (relativePath === "") return true;
  const normalized = relativePath.split(sep).join("/");
  const parts = normalized.split("/");
  if (parts.includes(".git") || parts.includes("node_modules") || parts.includes("coverage")) return false;
  if (normalized === "scratch-vault/.obsidian" || normalized.startsWith("scratch-vault/.obsidian/")) return false;
  if (normalized === "scratch-vault/Intake" || normalized.startsWith("scratch-vault/Intake/")) return false;
  const name = basename(normalized);
  return name !== ".DS_Store" && !name.endsWith(".log") && !name.endsWith(".swp") && !name.endsWith("~");
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: cleanRoot,
    env: { ...process.env, npm_config_update_notifier: "false", npm_config_audit: "false" },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}. ${output.slice(-4000)}`);
  }
}
