import type {
  DashboardContext,
  DashboardItem,
  DashboardMode,
  DashboardProjection,
  DashboardSourceRecord
} from "./types";

const ACTIVE_STATES = new Set(["active", "current", "executing", "in-progress", "open"]);
const CLOSED_REVIEW_STATES = new Set(["accepted", "approved", "complete", "passed", "reviewed"]);
const RESTRICTED_SENSITIVITIES = new Set(["confidential", "restricted", "secret"]);

export const DASHBOARD_MODE_LABELS: Readonly<Record<DashboardMode, string>> = Object.freeze({
  program_status: "Program status",
  active_lanes: "Active lanes",
  pending_seals: "Pending seals",
  review_queue: "Review queue",
  programs: "Programs",
  threads: "Threads",
  handoffs: "Handoffs"
});

export function buildDashboardProjection(
  mode: DashboardMode,
  context: DashboardContext,
  preparedAt: string
): DashboardProjection {
  const restricted = context.records.filter(isRestricted);
  const visible = context.records.filter((record) => !isRestricted(record));
  const diagnostics = [
    ...context.diagnostics,
    ...restricted.map((record) => ({
      code: "HCC-DASHBOARD-RESTRICTED" as const,
      path: record.path,
      message: "A restricted record was excluded; no metadata value was projected."
    }))
  ];
  const items = visible.flatMap((record) => selectRecord(mode, record)).sort(compareItems);
  const sources = visible.map(({ path, title, relationship }) => ({ path, title, relationship }));
  return {
    record_type: "hcc-native-dashboard-projection",
    contract_version: "0.1-candidate.1",
    authority: "projection-only",
    mode,
    source: { path: context.sourcePath, digest: context.sourceDigest },
    scope: {
      boundary: "active-document-and-explicit-one-hop",
      explicit_record_cap: context.explicitRecordCap,
      included_record_count: visible.length,
      excluded_restricted_count: restricted.length,
      more_not_shown: context.moreNotShown
    },
    sources,
    items,
    diagnostics,
    prepared_at: preparedAt,
    effects: {
      vault_scan: "prohibited",
      body_read: "active-document-only",
      mutation: "prohibited",
      canonical_update: "prohibited"
    }
  };
}

function selectRecord(mode: DashboardMode, record: DashboardSourceRecord): DashboardItem[] {
  const metadata = record.frontmatter;
  if (mode === "program_status") {
    const program = firstString(metadata, ["program_id", "program", "program_ref"]);
    const status = firstString(metadata, ["program_status", "status", "lifecycle"]);
    return program && status ? [item(record, "program_status", `${program}: ${status}`)] : [];
  }
  if (mode === "active_lanes") {
    const lane = firstString(metadata, ["active_lane", "lane", "lane_id"]);
    const state = firstString(metadata, ["lane_status", "status", "lifecycle"]);
    return lane && state && ACTIVE_STATES.has(normalize(state)) ? [item(record, "active_lane", `${lane}: ${state}`)] : [];
  }
  if (mode === "pending_seals") {
    const pending = metadata.verified === false || (metadata.verification_required === true && metadata.verified !== true);
    return pending ? [item(record, "verification", metadata.verified === false ? "verified: false" : "verification required")] : [];
  }
  if (mode === "review_queue") {
    const review = firstString(metadata, ["review_status"]);
    const pending = review ? !CLOSED_REVIEW_STATES.has(normalize(review)) : metadata.review_required === true;
    return pending ? [item(record, "review_status", review ?? "review required")] : [];
  }
  if (mode === "programs") return values(metadata, ["program_refs", "programs", "program_ref", "program_id"]).map((value) => item(record, "program", value));
  if (mode === "threads") return values(metadata, ["thread_refs", "thread_ref", "thread_id"]).map((value) => item(record, "thread", value));
  return values(metadata, ["handoff_refs", "handoff_to", "handoff"]).map((value) => item(record, "handoff", value));
}

function item(record: DashboardSourceRecord, signal: string, value: string): DashboardItem {
  return {
    id: `${record.path}\u0000${signal}\u0000${value}`,
    sourcePath: record.path,
    title: record.title,
    relationship: record.relationship,
    signal,
    value
  };
}

function values(record: Record<string, unknown>, keys: readonly string[]): string[] {
  const found: string[] = [];
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") found.push(value);
    if (Array.isArray(value)) found.push(...value.filter((entry): entry is string => typeof entry === "string" && entry.trim() !== ""));
  }
  return [...new Set(found)];
}

function firstString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  return values(record, keys)[0] ?? null;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, "-");
}

function isRestricted(record: DashboardSourceRecord): boolean {
  const sensitivity = firstString(record.frontmatter, ["sensitivity"]);
  return sensitivity !== null && RESTRICTED_SENSITIVITIES.has(normalize(sensitivity));
}

function compareItems(left: DashboardItem, right: DashboardItem): number {
  return left.sourcePath.localeCompare(right.sourcePath) || left.signal.localeCompare(right.signal) || left.value.localeCompare(right.value);
}
