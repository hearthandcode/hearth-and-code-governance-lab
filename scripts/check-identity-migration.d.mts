export interface IdentityMigrationProofReceipt {
  record_type: "hcc-identity-migration-proof";
  contract_version: string;
  display_name: string;
  prototype_id: string;
  candidate_public_id: string;
  candidate_public_id_accepted: false;
  scenarios: Array<{ id: string; expected: string; derived: string; passed: boolean }>;
  counts: { total: number; passed: number; allow_current: number; candidate_only: number; blocked: number };
  real_host_proof: false;
  effects: { manifest_change: false; directory_change: false; vault_write: false; git: false; network: false; release: false; publication: false };
  findings: string[];
  limits: string[];
}

export const receipt: IdentityMigrationProofReceipt;
