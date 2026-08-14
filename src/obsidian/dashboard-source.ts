import { TFile, type App } from "obsidian";

import { ADJACENT_ITEM_CAP, collectExplicitRelationships, linkPathFromRelationship } from "../core/relations";
import type { DashboardContext, DashboardDiagnostic, DashboardSourceRecord } from "../dashboard";
import { sha256Digest } from "./view-source";

/** Reads one active Markdown body and metadata for only its explicit one-hop links. */
export async function loadDashboardContext(app: App, sourceFile: TFile): Promise<DashboardContext> {
  const content = await app.vault.cachedRead(sourceFile);
  const sourceDigest = await sha256Digest(content);
  const sourceMetadata = asRecord(app.metadataCache.getFileCache(sourceFile)?.frontmatter);
  const diagnostics: DashboardDiagnostic[] = [];
  if (!sourceMetadata) {
    diagnostics.push({
      code: "HCC-DASHBOARD-METADATA",
      path: sourceFile.path,
      message: "The active source has no readable frontmatter; no values were inferred."
    });
  }
  const records: DashboardSourceRecord[] = [{
    path: sourceFile.path,
    title: sourceFile.basename,
    relationship: "active_document",
    frontmatter: sourceMetadata ?? {}
  }];
  const relationships = collectExplicitRelationships(sourceMetadata, []);
  const seenPaths = new Set([sourceFile.path]);
  for (const relationship of relationships.shown) {
    const linkPath = linkPathFromRelationship(relationship.target);
    const target = linkPath === "" ? null : app.metadataCache.getFirstLinkpathDest(linkPath, sourceFile.path);
    if (!(target instanceof TFile)) {
      diagnostics.push({
        code: "HCC-DASHBOARD-UNRESOLVED",
        path: relationship.target,
        message: `The explicit ${relationship.relationship} target could not be resolved.`
      });
      continue;
    }
    if (seenPaths.has(target.path)) continue;
    seenPaths.add(target.path);
    const metadata = asRecord(app.metadataCache.getFileCache(target)?.frontmatter);
    if (!metadata) {
      diagnostics.push({
        code: "HCC-DASHBOARD-METADATA",
        path: target.path,
        message: "The explicitly linked record has no readable frontmatter; no values were inferred."
      });
    }
    records.push({
      path: target.path,
      title: target.basename,
      relationship: relationship.relationship,
      frontmatter: metadata ?? {}
    });
  }
  if (relationships.moreNotShown > 0) {
    diagnostics.push({
      code: "HCC-DASHBOARD-CAP",
      path: sourceFile.path,
      message: `${relationships.moreNotShown} explicit relationship${relationships.moreNotShown === 1 ? " was" : "s were"} held beyond the ${ADJACENT_ITEM_CAP}-record cap.`
    });
  }
  return {
    sourcePath: sourceFile.path,
    sourceDigest,
    records,
    diagnostics,
    explicitRecordCap: ADJACENT_ITEM_CAP,
    moreNotShown: relationships.moreNotShown
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
