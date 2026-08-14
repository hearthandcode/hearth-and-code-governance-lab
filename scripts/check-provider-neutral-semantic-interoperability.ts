import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface Pair { id: string; local: string; portable: string }
interface Contract {
  version: string;
  status: string;
  effectCeiling: string;
  normalizedTypes: string[];
  fixturePairs: Pair[];
  responsePort: { implementation: string; canonicalWriteBack: boolean };
  retirementCriteria: string[];
}
interface Fixture {
  id: string;
  sourceSurface: string;
  source: unknown;
  expected: { recordType: string; authorityState: string };
  effect: string;
}
interface Corpus { contractVersion: string; publicSafe: boolean; fixtures: Fixture[] }

const root = new URL("../", import.meta.url).pathname;
const contract = json<Contract>("config/provider-neutral-semantic-interoperability.json");
const corpus = json<Corpus>("tests/fixtures/provider-neutral-semantic-interoperability.json");
const findings: string[] = [];
const pairs = new Map(contract.fixturePairs.map((pair) => [pair.id, pair]));

check(contract.status === "accepted-specification-only", "interoperability status changed");
check(contract.effectCeiling === "no-external-runtime-adapter", "effect ceiling changed");
check(corpus.contractVersion === contract.version, "fixture and specification versions differ");
check(corpus.publicSafe === true, "fixture corpus must be public-safe");
check(corpus.fixtures.length === 8 && pairs.size === 8, "exactly eight fixture pairs are required");
check(contract.retirementCriteria.length === 8, "exactly eight retirement conditions are required");

const fixtures = corpus.fixtures.map((fixture) => {
  const pair = pairs.get(fixture.id);
  check(Boolean(pair), `unknown fixture pair: ${fixture.id}`);
  if (pair) {
    check(fixture.sourceSurface === pair.local, `source surface mismatch: ${fixture.id}`);
    check(fixture.expected.recordType === pair.portable, `normalized type mismatch: ${fixture.id}`);
  }
  check(contract.normalizedTypes.includes(fixture.expected.recordType), `undeclared normalized type: ${fixture.id}`);
  check(fixture.effect === "none", `fixture requests an effect: ${fixture.id}`);
  check(["definition", "candidate", "projection"].includes(fixture.expected.authorityState), `invalid authority state: ${fixture.id}`);
  return {
    id: fixture.id,
    source_surface: fixture.sourceSurface,
    normalized_type: fixture.expected.recordType,
    source_digest: `sha256:${createHash("sha256").update(JSON.stringify(fixture.source)).digest("hex")}`,
    effect: fixture.effect
  };
});

check(new Set(fixtures.map((fixture) => fixture.id)).size === 8, "fixture IDs must be unique");
check(new Set(fixtures.map((fixture) => fixture.normalized_type)).size === 8, "normalized types must be unique");
check(contract.responsePort.implementation === "held" && contract.responsePort.canonicalWriteBack === false, "response-port boundary changed");

export const receipt = {
  record_type: "hcc-provider-neutral-semantic-interoperability-proof",
  contract_version: contract.version,
  status: contract.status,
  fixture_count: fixtures.length,
  normalized_type_count: new Set(fixtures.map((fixture) => fixture.normalized_type)).size,
  fixtures,
  response_port: { implementation: contract.responsePort.implementation, canonical_write_back: contract.responsePort.canonicalWriteBack },
  effects: { external_system_change: "not-performed", adapter: "not-implemented", network: "not-performed", vault_write: "not-performed", git: "not-performed" },
  findings
};

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  console.log(JSON.stringify(receipt, null, 2));
  if (findings.length) process.exitCode = 1;
}

function json<T>(path: string): T { return JSON.parse(readFileSync(join(root, path), "utf8")) as T; }
function check(condition: boolean, message: string): void { if (!condition) findings.push(message); }
