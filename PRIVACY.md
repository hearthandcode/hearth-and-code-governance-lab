# Privacy and Data Lifecycle

Hearth and Code Governance Lab processes HCC blocks and responses locally inside Obsidian. It has no telemetry, analytics, network requests, remote assets, or provider integration.

The optional settings panel stores one versioned plugin-owned `data.json` file in Obsidian's plugin configuration directory only after the user changes a preference. It contains one presentation-profile selector and exactly thirteen presentation preferences covering theme, explanatory detail, interaction density, routine notices, worksheet navigation, question-list scope, focus controls and behavior, progress, primary and secondary actions, and completed-question treatment. Loading the plugin with no settings file does not create one. The file contains no responses, note contents, paths, packet locators, vault name, account data, credentials, governance decisions, or telemetry. Obsidian Sync or another vault synchronization tool may copy plugin configuration according to that tool's own configuration and boundary.

Responses begin in plugin memory. Disabling or reloading the plugin clears unsaved answers. After explicit per-write confirmation, the response provider can create a new immutable YAML packet as one generated ASCII `.yaml` leaf directly under `Intake/HCC Responses/`; that packet remains in the current vault until the user removes it manually. The disposable `hcc-widget-lab` profile works only in `scratch-vault`; the public `hearth-and-code-governance-lab` profile works in its currently open named local vault. Unknown plugin identities are denied. The plugin never overwrites, appends, renames, deletes, scans for, submits, or automatically routes those files. Loading requires one exact path and expected SHA-256 digest.

Packet files may contain every response and note in the worksheet. Before saving, users must treat the target vault and its backups or synchronization providers as part of the data boundary. The plugin itself performs no network transfer and does not write to the canonical Hearth & Code Hub.

Do not collect secrets, signatures, media, precise location, regulated data, or other sensitive material. Those capabilities appear only as future proposals with unresolved storage, consent, and lifecycle requirements.

Studio source bindings and workflow effects are local declarative text. The studio does not resolve or read bound source paths, contact an LLM, execute a transition, or persist the normalized copy. Clipboard contents leave plugin memory only through the user's explicit copy action and then follow the operating system clipboard boundary.

Any persistence beyond this fixed create-only provider requires a new data-lifecycle contract covering purpose, exact destination, consent, retention, deletion, conflict handling, backup, recovery, provenance, and direct verification. It cannot be enabled by changing this policy document alone.

The settings panel cannot change the response root, enable overwrite or deletion, bypass schemas or digests, alter privacy or HumanGates, configure providers or credentials, use the network, or authorize canonical write-back, release, or publication. Its governance section is read-only.
