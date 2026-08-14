import { describe, expect, it } from "vitest";

import { VaultResponsePacketAdapter, type ResponsePacketVaultPort } from "../src/obsidian/vault-response-packet-adapter";
import { explicitYamlPath, parseResponsePacket } from "../src/writer";

class NoEffectVault implements ResponsePacketVaultPort {
  calls: string[] = [];
  kind(path: string): "file" | "folder" | null { this.calls.push(`kind:${path}`); return null; }
  async read(path: string): Promise<string> { this.calls.push(`read:${path}`); return ""; }
  async createFolder(path: string): Promise<void> { this.calls.push(`folder:${path}`); }
  async create(path: string): Promise<void> { this.calls.push(`create:${path}`); }
}

const folder = "Intake/HCC Responses";
const adversarialPaths = [
  `${folder}/../escape.yaml`, `${folder}/./packet.yaml`, `${folder}/.hidden.yaml`, `${folder}/nested/.hidden.yaml`,
  `${folder}/packet.yml`, `${folder}/packet.YAML`, `${folder}/packet.yaml/extra`, `${folder}/packet.yaml?query`,
  `${folder}/packet.yaml#fragment`, `${folder}/packet\\name.yaml`, `${folder}/packet\0.yaml`, `${folder}/packet\nname.yaml`,
  `${folder}/packet\rname.yaml`, `${folder}/packet\tname.yaml`, `${folder}/file://packet.yaml`, `${folder}/nested/packet.yaml`,

  "Elsewhere/packet.yaml", "Intake/Other/packet.yaml", "HCC Responses/packet.yaml", "Intake/HCC Response/packet.yaml",
  "Intake/HCC Responses-old/packet.yaml", "Intake/HCC-Responses/packet.yaml", "intake/HCC Responses/packet.yaml", "Intake/hcc responses/packet.yaml",
  "Responses/packet.yaml", "packet.yaml", "Intake/packet.yaml", "Archive/Intake/HCC Responses/packet.yaml",
  "./Intake/HCC Responses/packet.yaml", "../Intake/HCC Responses/packet.yaml", "Private/Intake/HCC Responses/packet.yaml", "Intake/HCC Responses",

  "/Intake/HCC Responses/packet.yaml", "//server/share/packet.yaml", "C:/packet.yaml", "C:\\packet.yaml",
  "file:packet.yaml", "file://packet.yaml", "https://example.test/packet.yaml", "http://example.test/packet.yaml",
  "obsidian://open/packet.yaml", "data:text/yaml,packet.yaml", "javascript:packet.yaml", "ftp://example.test/packet.yaml",
  "s3://bucket/packet.yaml", "ssh://host/packet.yaml", "mailto:packet.yaml", "urn:packet.yaml",

  `${folder}/name:stream.yaml`, `${folder}/name*glob.yaml`, `${folder}/name?query.yaml`, `${folder}/name\"quote.yaml`,
  `${folder}/name<left.yaml`, `${folder}/name>right.yaml`, `${folder}/name|pipe.yaml`, `${folder}/trailing..yaml`,
  `${folder}/CON.yaml`, `${folder}/PRN.yaml`, `${folder}/AUX.yaml`, `${folder}/NUL.yaml`,
  `${folder}/COM1.yaml`, `${folder}/LPT9.yaml`, `${folder}/ leading.yaml`, `${folder}/emoji-🔥.yaml`
] as const;

const acceptedPaths = Array.from({ length: 16 }, (_, index) => `${folder}/worksheet_${index}--session-20260811210000-${index}.yaml`);

const validPacket = `record_type: hcc-worksheet-response-packet
contract_version: 0.1-candidate.1
authority: immutable-intake-candidate-proposal
immutable: true
session_id: security-corpus-session
worksheet_binding:
  worksheet_id: security-corpus
  worksheet_version: 0.1-candidate.1
  source_path: Worksheets/Security Corpus.md
  source_digest: sha256:${"a".repeat(64)}
started_at: '2026-08-11T21:00:00.000Z'
prepared_at: '2026-08-11T21:01:00.000Z'
respondent: null
responses: []
review: { required_complete: true, missing_required: [], human_gate: required }
downstream: { action_candidates: not-generated, decision_candidates: not-generated, work_item_candidates: not-generated, canonical_write_back: prohibited }
effects: { persistence: vault-local-create-only, submission: prohibited }
`;

const hostilePackets = [
  "[]", "{}", `${validPacket}\n---\nsecond: document\n`, "payload: !!js/function 'function () { return 1; }'",
  `${validPacket}execute: now\n`, validPacket.replace("hcc-worksheet-response-packet", "executable-packet"),
  validPacket.replace("0.1-candidate.1", "99.0"), validPacket.replace("immutable: true", "immutable: false"),
  validPacket.replace("security-corpus-session", "../escape"), validPacket.replace("Worksheets/Security Corpus.md", "../Security.md"),
  validPacket.replace(`sha256:${"a".repeat(64)}`, "null"), validPacket.replace("2026-08-11T21:00:00.000Z", "not-a-time"),
  validPacket.replace("respondent: null", "respondent: { __proto__: polluted }"), validPacket.replace("responses: []", "responses: { __proto__: polluted }"),
  validPacket.replace("required_complete: true", "required_complete: yes"), `record_type: packet\npadding: ${"x".repeat(1_048_576)}`
] as const;

describe("writer security corpus", () => {
  it("rejects exactly sixty-four adversarial paths before any vault-port call", async () => {
    expect(adversarialPaths).toHaveLength(64);
    expect(new Set(adversarialPaths).size).toBe(64);
    for (const path of adversarialPaths) {
      const vault = new NoEffectVault();
      const adapter = new VaultResponsePacketAdapter(vault);
      await expect(adapter.readExplicit(path), path).rejects.toThrow("HCC-VAULT-TARGET");
      await expect(adapter.createOnly({ targetPath: path, bytes: "proof: true\n", digest: `sha256:${"a".repeat(64)}` }, true), path).rejects.toThrow("HCC-VAULT-TARGET");
      expect(vault.calls, path).toEqual([]);
    }
  });

  it("admits sixteen generated cross-platform packet leaf names", () => {
    expect(acceptedPaths).toHaveLength(16);
    acceptedPaths.forEach((path) => expect(explicitYamlPath(path), path).toBe(true));
  });

  it("rejects sixteen malformed or injection-shaped packets", () => {
    expect(hostilePackets).toHaveLength(16);
    hostilePackets.forEach((source, index) => expect(parseResponsePacket(source), `case ${index}`).toMatchObject({ ok: false }));
  });
});
