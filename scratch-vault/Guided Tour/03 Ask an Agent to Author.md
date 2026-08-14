# 3. Ask a Hub Agent to Author

The plugin does not call an AI model. Run the agent with the Hearth & Code Hub as its working directory. If the harness has installed the repository skill, invoke `$hearthandcode-governance-obsidian`; otherwise tell the agent to read the exact `skills/hearthandcode-governance-obsidian/SKILL.md` from a trusted Governance Lab source checkout before acting. The skill reads the Hub charter and routing configuration, selects one canonical owner, validates the proposed path, and writes source-visible Markdown only within the authorized scope. If the Hub is already open as an Obsidian vault, the note appears there without copying or changing `.obsidian`.

```text
Use $hearthandcode-governance-obsidian. If it is not installed, first read the exact SKILL.md from the trusted Governance Lab source checkout and follow it for this task.

Working root: the canonical Hearth & Code Hub.
Objective: Draft one [four-question worksheet / workbook / projection] for [bounded purpose].
Direct sources: [exact Hub-relative paths or explicit absence].
Audience and sensitivity: [values].
Authority class: proposal or projection; verified must remain false.
Destination: resolve it from the current Hub routing, path registry, wing ownership, naming rules, and local charter. Do not invent a wing or folder.
Grammar: use supported Governance Lab contracts, stable IDs, explicit config objects, empty reusable responses, and accessible fallback text.
Validation: run the Hub path propose/validate route before creation and the narrowest available grammar checks afterward.
Held effects: no invented answers, automatic canonical admission, response-packet scan, .obsidian edit, Git, network, publication, or provider action.
Handoff: return exact paths, validation evidence, and the Obsidian review route.
```

Use [[Worksheets/02 Agent Authoring Request]] to shape a real request. The orchestration skill is `skills/hearthandcode-governance-obsidian/SKILL.md`; detailed grammar guidance remains in `llms.txt` and `docs/agents/authoring-hcc-content.md`.

The agent may create the routed Markdown only when the prompt and Hub charter authorize that write. A proposed route is not write authority, and an Obsidian rendering is not canonical admission.

Continue to [[Guided Tour/04 Validate the Artifact]].
