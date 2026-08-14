# Compatibility Matrix

Status: bounded host-observation candidate. It prevents untested platforms or versions from being reported as supported.

## Command

In Obsidian, run **Hearth and Code Governance Lab: Run and copy compatibility matrix**. The command first produces the existing eight-check runtime observation, then opens a selectable four-target projection with a compact **Copy report** control while preserving the compatibility clipboard copy:

1. declared-minimum desktop at the exact `minAppVersion`;
2. the exact observed host version and platform;
3. Android at the observed API version; and
4. iOS/iPadOS at the observed API version.

Each target has one closed status:

| Status | Meaning |
|---|---|
| `observed-pass` | This exact version/platform matches the current host and all runtime checks pass. |
| `observed-fail` | This exact host was observed but its minimum/API primitive checks are incomplete. |
| `pending-host-evidence` | No exact host observation exists. This means untested, not compatible by inference. |
| `outside-declared-range` | The target version is below the manifest minimum. |

The accepted Obsidian 1.13.4 desktop canary makes the observed-host and declared-minimum rows the same direct observation for candidate `0.0.29`. Android and iOS/iPadOS remain pending and unsupported, and no unobserved desktop operating system becomes supported by inference.

## Pure API

`buildCompatibilityMatrix` and `compareAppVersions` are exported from `src/compatibility`. The side-effect-free authoring API exposes the builder under contract `0.1-candidate.1`. Versions must be exact numeric `x.y.z`; malformed or partial versions fail visibly.

## Required real-host evidence

Before making a public compatibility claim, collect the matrix and manual receipt separately for:

- the exact minimum supported desktop version;
- the chosen current desktop version on every claimed desktop operating system;
- Android on a declared phone/tablet configuration, if claimed; and
- iOS/iPadOS on a declared device class, if claimed.

For each target, inspect plugin load, Reading view, Live Preview, source return, keyboard/touch operation, Ember Circuit and native theme, zoom/narrow pane, response reload/write where permitted, disable/re-enable, restart, upgrade, rollback, uninstall, accessibility, and performance.

## Boundary

The receipt reads no note, path, vault name, or response. It performs no vault or filesystem write and no network, Git, release, submission, or publication action. Passing runtime primitives do not establish rendering, accessibility, touch, performance, data-lifecycle, migration, or support fitness. Human review remains mandatory.
