export const DASHBOARD_MODES = [
  "program_status",
  "active_lanes",
  "pending_seals",
  "review_queue",
  "programs",
  "threads",
  "handoffs"
] as const;

export type DashboardMode = (typeof DASHBOARD_MODES)[number];

export interface DashboardSourceRecord {
  path: string;
  title: string;
  relationship: "active_document" | string;
  frontmatter: Record<string, unknown>;
}

export interface DashboardDiagnostic {
  code: "HCC-DASHBOARD-UNRESOLVED" | "HCC-DASHBOARD-METADATA" | "HCC-DASHBOARD-RESTRICTED" | "HCC-DASHBOARD-CAP";
  path: string;
  message: string;
}

export interface DashboardContext {
  sourcePath: string;
  sourceDigest: string;
  records: DashboardSourceRecord[];
  diagnostics: DashboardDiagnostic[];
  explicitRecordCap: number;
  moreNotShown: number;
}

export interface DashboardItem {
  id: string;
  sourcePath: string;
  title: string;
  relationship: string;
  signal: string;
  value: string;
}

export interface DashboardSourceSummary {
  path: string;
  title: string;
  relationship: string;
}

export interface DashboardProjection {
  record_type: "hcc-native-dashboard-projection";
  contract_version: "0.1-candidate.1";
  authority: "projection-only";
  mode: DashboardMode;
  source: { path: string; digest: string };
  scope: {
    boundary: "active-document-and-explicit-one-hop";
    explicit_record_cap: number;
    included_record_count: number;
    excluded_restricted_count: number;
    more_not_shown: number;
  };
  sources: DashboardSourceSummary[];
  items: DashboardItem[];
  diagnostics: DashboardDiagnostic[];
  prepared_at: string;
  effects: {
    vault_scan: "prohibited";
    body_read: "active-document-only";
    mutation: "prohibited";
    canonical_update: "prohibited";
  };
}
