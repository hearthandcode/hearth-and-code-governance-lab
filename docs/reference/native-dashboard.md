# Native Governance Dashboard Contract

Status: C4 candidate `0.1-candidate.1`. Human admission and real-host review remain pending.

## Purpose

The native dashboard turns explicit frontmatter signals into seven small read-only projections without building a second vault index. Run **Hearth and Code Governance Lab: Open governance dashboard for active note** from a Markdown note. The resulting Obsidian view binds to that note, reads its body once to establish a SHA-256 source digest, and resolves metadata for no more than twelve one-hop links declared through the existing relationship fields. A four-stage provenance trail makes the route from source to bounded resolver to selector to result explicit.

## Fixed source boundary

The dashboard admits only:

1. the explicitly selected active Markdown note; and
2. unique one-hop targets declared by `related`, `graph_refs`, `thread_refs`, `work_item_refs`, or `source_refs`, in that order, up to twelve relationships.

It does not enumerate files, search tags, crawl links, read linked note bodies, infer relationships, persist a cache, or mutate a source. An unresolved or metadata-free target becomes one diagnostic. A record whose `sensitivity` is `restricted`, `confidential`, or `secret` is excluded from every projection and represented only by a non-content diagnostic.

## Seven selector modes

All matching is field-explicit. Missing values produce no row rather than an inferred default.

| Mode | Admitted fields | Projection rule |
|---|---|---|
| Program status | identity: `program_id`, `program`, `program_ref`; state: `program_status`, `status`, `lifecycle` | Requires one identity and one state. |
| Active lanes | identity: `active_lane`, `lane`, `lane_id`; state: `lane_status`, `status`, `lifecycle` | State must normalize to `active`, `current`, `executing`, `in-progress`, or `open`. |
| Pending seals | `verified`, `verification_required` | Includes explicit `verified: false`, or required verification not explicitly true. |
| Review queue | `review_status`, `review_required` | Explicit states other than accepted, approved, complete, passed, or reviewed remain queued; a bare `review_required: true` is also queued. |
| Programs | `program_refs`, `programs`, `program_ref`, `program_id` | Emits declared string values only. |
| Threads | `thread_refs`, `thread_ref`, `thread_id` | Emits declared string values only. |
| Handoffs | `handoff_refs`, `handoff_to`, `handoff` | Emits declared string values only; `next_action` is intentionally not treated as a handoff. |

Arrays accept only string entries. Duplicate values within a record are collapsed. Output ordering is deterministic by source path, signal, and declared value.

## Projection envelope

Every in-memory projection declares:

- record type and contract version;
- `projection-only` authority;
- selected mode;
- source path and source-body digest;
- bounded scope counts and restricted exclusions;
- admitted source summaries containing only path, title, and declared relationship;
- exact items and diagnostics;
- preparation timestamp; and
- prohibited scan, mutation, and canonical-update effects.

This envelope is an inspectable runtime model, not a persisted canonical record or a verification seal. **Copy projection report** copies the exact deterministic JSON envelope currently displayed. It contains only already-admitted projection items, bounded diagnostics, provenance, scope, and the effect ceiling; it never includes raw frontmatter or values excluded with a restricted record.

## Refresh and failure behavior

The view refreshes when metadata changes for the selected note or an admitted one-hop target. **Refresh exact sources** reruns the same bounded load. **Use active Markdown note** changes the explicit root. Concurrent refreshes use last-request-wins behavior so a slower stale result cannot replace a newer source selection.

A source read failure empties the projection and reports that no file changed. Unknown metadata does not fail the whole dashboard. Clipboard failure leaves the visible table, scope, and diagnostics intact. **Open source** and row-level **Open record** controls navigate to exact admitted paths without reading additional bodies for the projection.

The collapsed governance-action surface reuses the workbench proposal contract for reviewed and verification candidates. A proposal binds the source path and current body digest, leaves reviewer identity null, records its human-attestation gates, and declares frontmatter writes prohibited. The dashboard can show and copy this YAML but cannot apply it. The plugin exposes no dashboard write, scan, network, Git, canonical-system, release, or publication operation.

## Agent authoring guidance

Agents should use canonical vocabulary from the owning source where one exists. These candidate aliases support local evaluation; they do not amend the destination system's naming law. To make a dashboard useful:

1. choose one orientation note as the explicit source;
2. declare only necessary one-hop relationships;
3. put source-owned state in recognized frontmatter fields;
4. preserve sensitivity and authority labels;
5. treat dashboard rows as projections that link back to sources; and
6. preserve a HumanGate before any canonical disposition or operational effect.

Do not add fields merely to make a dashboard look full. An empty selector is valid evidence that no admitted signal was declared.
