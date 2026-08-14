import type { App, MarkdownPostProcessorContext } from "obsidian";

import { collectExplicitRelationships, linkPathFromRelationship } from "../core/relations";
import type { AdjacentItem, CompanionContext } from "../core/types";

export function buildCompanionContext(
  app: App,
  markdownContext: MarkdownPostProcessorContext,
  blockSourceRefs: readonly string[]
): CompanionContext {
  const frontmatter = markdownContext.frontmatter
    ?? app.metadataCache.getCache(markdownContext.sourcePath)?.frontmatter
    ?? null;
  return buildContext(app, markdownContext.sourcePath, blockSourceRefs, frontmatter);
}

export function buildEditorCompanionContext(
  app: App,
  sourcePath: string,
  blockSourceRefs: readonly string[]
): CompanionContext {
  const frontmatter = app.metadataCache.getCache(sourcePath)?.frontmatter ?? null;
  return buildContext(app, sourcePath, blockSourceRefs, frontmatter);
}

function buildContext(
  app: App,
  sourcePath: string,
  blockSourceRefs: readonly string[],
  frontmatter: Record<string, unknown> | null
): CompanionContext {
  const collected = collectExplicitRelationships(frontmatter, blockSourceRefs);
  const diagnostics: CompanionContext["adjacentWork"]["diagnostics"] = [];
  const items = collected.shown.map((candidate): AdjacentItem => {
    const linkPath = linkPathFromRelationship(candidate.target);
    const file = linkPath === ""
      ? null
      : app.metadataCache.getFirstLinkpathDest(linkPath, sourcePath);
    if (!file) {
      diagnostics.push({
        failure: "relationship-target-unresolved",
        message: `${candidate.relationship} target could not be resolved: ${candidate.target}`
      });
      return {
        ...candidate,
        resolvedPath: null,
        title: candidate.target,
        authorityLabel: null,
        reviewLabel: null,
        verifiedLabel: null
      };
    }

    const metadata = asRecord(app.metadataCache.getFileCache(file)?.frontmatter);
    const authorityLabel = firstString(metadata, ["authority_role", "class", "kind", "type"]);
    const reviewLabel = firstString(metadata, ["review_status", "status"]);
    const verified = metadata?.verified;
    const verifiedLabel = typeof verified === "boolean" ? String(verified) : null;
    if (authorityLabel === null || reviewLabel === null || verifiedLabel === null) {
      diagnostics.push({
        failure: "relationship-metadata-unknown",
        message: `Some authority or review metadata is unknown for ${file.path}; no value was inferred.`
      });
    }
    return {
      ...candidate,
      resolvedPath: file.path,
      title: file.basename,
      authorityLabel,
      reviewLabel,
      verifiedLabel
    };
  });

  if (collected.moreNotShown > 0) {
    diagnostics.push({
      failure: "adjacent-item-cap-reached",
      message: `${collected.moreNotShown} explicit relationship${collected.moreNotShown === 1 ? " was" : "s were"} not shown after the 12-item cap.`
    });
  }

  return {
    sourcePath,
    sourceDigest: null,
    adjacentWork: { items, moreNotShown: collected.moreNotShown, diagnostics },
    openTarget: (target) => {
      void app.workspace.openLinkText(linkPathFromRelationship(target), sourcePath, false);
    },
    copyPath: async (target) => navigator.clipboard.writeText(target)
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function firstString(record: Record<string, unknown> | null, keys: readonly string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
}
