import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const contract = JSON.parse(readFileSync(join(root, "config/identity-migration.json"), "utf8"));
const findings = [];
const allowedResults = new Set(["allow-current", "candidate-only", "block"]);
const scenarios = Array.isArray(contract.scenarios) ? contract.scenarios : [];

check(contract.version === "0.1-candidate.1", "identity migration contract version must be 0.1-candidate.1");
check(contract.candidatePublicDisplayName === "Hearth and Code Governance Lab", "revised public display-name proposal must match Worksheet 15 follow-up");
check(contract.candidatePublicDisplayNameAccepted === true, "public display name must be accepted through Worksheet 18");
check(normalized(contract.prototypeId), "prototype ID must be normalized");
check(normalized(contract.candidatePublicId), "candidate public ID must be normalized");
check(contract.prototypeId !== contract.candidatePublicId, "prototype and candidate public IDs must remain distinct");
check(contract.candidatePublicIdAccepted === true, "public ID must be accepted through Worksheet 18");
check(contract.requiredScenarioCount === 8 && scenarios.length === 8, "identity migration must contain exactly eight scenarios");
check(new Set(scenarios.map((scenario) => scenario.id)).size === scenarios.length, "identity scenario IDs must be unique");

const results = scenarios.map((scenario) => {
  const actual = classify(scenario);
  check(allowedResults.has(scenario.expected), `unknown expected outcome: ${scenario.id}`);
  check(actual === scenario.expected, `scenario outcome mismatch: ${scenario.id}; expected ${scenario.expected}, derived ${actual}`);
  check(typeof scenario.humanEvidence === "string" && scenario.humanEvidence.length > 20, `scenario lacks a bounded human evidence instruction: ${scenario.id}`);
  return { id: scenario.id, expected: scenario.expected, derived: actual, passed: actual === scenario.expected };
});

export const receipt = {
  record_type: "hcc-identity-migration-proof",
  contract_version: contract.version,
  display_name: contract.displayName,
  candidate_public_display_name: contract.candidatePublicDisplayName,
  candidate_public_display_name_accepted: true,
  prototype_id: contract.prototypeId,
  candidate_public_id: contract.candidatePublicId,
  candidate_public_id_accepted: true,
  scenarios: results,
  counts: {
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    allow_current: results.filter((result) => result.derived === "allow-current").length,
    candidate_only: results.filter((result) => result.derived === "candidate-only").length,
    blocked: results.filter((result) => result.derived === "block").length
  },
  real_host_proof: false,
  effects: { manifest_change: false, directory_change: false, vault_write: false, git: false, network: false, release: false, publication: false },
  findings,
  limits: [
    "This proves closed identity classification only; it does not prove Obsidian installation, upgrade, rollback, disable/re-enable, or uninstall behavior.",
    "The accepted public ID still requires a current uniqueness check immediately before release.",
    "No live plugin directory, manifest, vault, Git state, remote, release, or publication surface was changed."
  ]
};

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  console.log(JSON.stringify(receipt, null, 2));
  if (findings.length) process.exitCode = 1;
}

function classify(scenario) {
  const installed = Array.isArray(scenario.installedIds) ? scenario.installedIds : [];
  if (scenario.manifestId !== scenario.directoryId) return "block";
  if (installed.includes(contract.prototypeId) && installed.includes(contract.candidatePublicId)) return "block";
  if (scenario.manifestId === contract.prototypeId && installed.length === 1 && installed[0] === contract.prototypeId) return "allow-current";
  if (scenario.manifestId === contract.candidatePublicId && installed.length === 1 && installed[0] === contract.candidatePublicId) return "candidate-only";
  return "block";
}

function normalized(value) { return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && !value.includes("obsidian"); }
function check(condition, message) { if (!condition) findings.push(message); }
