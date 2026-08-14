import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const identity = json("config/identity-migration.json");
const sourceManifestBytes = readFileSync(join(root, "manifest.json"));
const sourceManifest = JSON.parse(sourceManifestBytes.toString("utf8"));
const builtRoot = join(root, "scratch-vault/.obsidian/plugins", identity.prototypeId);
const temporaryParent = mkdtempSync(join(tmpdir(), "hcc-install-layout-"));
const projectedRoot = join(temporaryParent, identity.candidatePublicId);
const findings = [];
let checks = {};
let assetEvidence = [];
let removed = false;

try {
  mkdirSync(projectedRoot, { recursive: true });
  copyFileSync(join(builtRoot, "main.js"), join(projectedRoot, "main.js"));
  copyFileSync(join(builtRoot, "styles.css"), join(projectedRoot, "styles.css"));
  const projectedManifest = { ...sourceManifest, id: identity.candidatePublicId };
  writeFileSync(join(projectedRoot, "manifest.json"), `${JSON.stringify(projectedManifest, null, 2)}\n`, { flag: "wx" });

  const names = readdirSync(projectedRoot).sort();
  const readProjectedManifest = JSON.parse(readFileSync(join(projectedRoot, "manifest.json"), "utf8"));
  const sourceManifestAfter = readFileSync(join(root, "manifest.json"));
  const mainMatches = digest(join(projectedRoot, "main.js")) === digest(join(builtRoot, "main.js"));
  const stylesMatch = digest(join(projectedRoot, "styles.css")) === digest(join(builtRoot, "styles.css"));
  checks = {
    candidate_identity_accepted: identity.candidatePublicIdAccepted === true && identity.candidatePublicDisplayNameAccepted === true,
    directory_name: basename(projectedRoot) === identity.candidatePublicId,
    exact_three_assets: JSON.stringify(names) === JSON.stringify(["main.js", "manifest.json", "styles.css"]),
    projected_manifest_id: readProjectedManifest.id === identity.candidatePublicId,
    display_version_and_compatibility_preserved: ["name", "version", "minAppVersion", "description", "author", "authorUrl", "isDesktopOnly"].every((key) => readProjectedManifest[key] === sourceManifest[key]),
    main_asset_exact: mainMatches,
    stylesheet_asset_exact: stylesMatch,
    source_manifest_unchanged: sourceManifestAfter.equals(sourceManifestBytes)
  };
  for (const [id, passed] of Object.entries(checks)) if (!passed) findings.push(`install-layout check failed: ${id}`);
  assetEvidence = names.map((name) => ({ name, bytes: statSync(join(projectedRoot, name)).size, sha256: digest(join(projectedRoot, name)) }));
} catch (error) {
  findings.push(error instanceof Error ? error.message : String(error));
} finally {
  rmSync(temporaryParent, { recursive: true, force: true });
  removed = !exists(temporaryParent);
  if (!removed) findings.push("temporary install-layout projection was not removed");
}

const receipt = {
  record_type: "hcc-install-layout-projection-proof",
  contract_version: "0.1-candidate.1",
  prototype_id: identity.prototypeId,
  candidate_public_id: identity.candidatePublicId,
  candidate_public_id_accepted: true,
  checks,
  passed: Object.values(checks).filter(Boolean).length,
  failed: Object.values(checks).filter((value) => !value).length,
  projected_assets: assetEvidence,
  temporary_projection: removed ? "removed" : "removal-failed",
  real_obsidian_install: "not-performed",
  effects: { source_manifest_change: "not-performed", vault_write: "not-performed", git: "not-performed", network: "not-performed", release: "not-performed", publication: "not-performed" },
  limits: [
    "This proves a temporary three-file layout for the accepted identity only; it is not an Obsidian installation.",
    "It does not prove enablement, upgrade, rollback, disable/re-enable, uninstall, mobile behavior, or data retention.",
    "The generated candidate manifest existed only in the removed temporary directory."
  ],
  findings
};

console.log(JSON.stringify(receipt, null, 2));
if (findings.length) process.exitCode = 1;

function json(path) { return JSON.parse(readFileSync(join(root, path), "utf8")); }
function digest(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function exists(path) { try { statSync(path); return true; } catch { return false; } }
