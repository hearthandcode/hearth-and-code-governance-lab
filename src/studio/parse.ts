import yaml from "js-yaml";

import {
  STUDIO_EFFECT_KINDS,
  STUDIO_FIELD_TYPES,
  STUDIO_GUARD_KINDS,
  STUDIO_INVARIANT_KINDS,
  STUDIO_MIGRATION_ACTIONS,
  STUDIO_RECOVERY_KINDS,
  STUDIO_VERSION,
  type StudioActor,
  type StudioContextAxis,
  type StudioContract,
  type StudioDiagnostic,
  type StudioEffect,
  type StudioField,
  type StudioGuard,
  type StudioHumanGate,
  type StudioInvariant,
  type StudioMigration,
  type StudioMigrationMapping,
  type StudioParseResult,
  type StudioProjectionSpec,
  type StudioRecordType,
  type StudioRecovery,
  type StudioScalar,
  type StudioSourceBinding,
  type StudioState,
  type StudioTransition,
  type StudioVocabulary,
  type StudioWorkflowCandidate
} from "./types";

const TOP_FIELDS = new Set(["version", "id", "title", "purpose", "context", "schema", "workflow", "projections", "governance"]);
const IDENTIFIER = /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/;
const VERSION = /^\d+\.\d+(?:\.\d+)?(?:-[a-z0-9][a-z0-9.-]*)?$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const SELECTORS = new Set(["program_status", "active_lanes", "pending_seals", "review_queue", "programs", "threads", "handoffs"]);
const LIMITS = Object.freeze({ refs: 8, sources: 8, axes: 8, records: 8, fields: 16, vocabularies: 8, terms: 16, invariants: 16, states: 16, actors: 8, guards: 16, effects: 16, recoveries: 8, gates: 8, transitions: 16, projections: 8 });

export function parseStudioContract(source: string): StudioParseResult {
  let loaded: unknown;
  try { loaded = yaml.load(source, { schema: yaml.JSON_SCHEMA }); }
  catch (error) { return { ok: false, diagnostics: [{ code: "HCC-STUDIO-PARSE", path: "$", message: error instanceof Error ? error.message : "Unknown YAML parse error." }] }; }
  const diagnostics: StudioDiagnostic[] = [];
  const root = object(loaded, "$", diagnostics);
  if (!root) return { ok: false, diagnostics };
  unknown(root, TOP_FIELDS, "$", diagnostics);
  if (root.version !== STUDIO_VERSION) add(diagnostics, "HCC-STUDIO-SCHEMA", "$.version", `Only ${STUDIO_VERSION} is supported.`);
  const id = identifier(root.id, "$.id", diagnostics);
  const title = text(root.title, "$.title", diagnostics);
  const purpose = text(root.purpose, "$.purpose", diagnostics);
  const context = parseContext(root.context, diagnostics);
  const schema = parseSchema(root.schema, diagnostics);
  const workflow = parseWorkflow(root.workflow, diagnostics);
  const projections = parseProjections(root.projections, diagnostics);
  const governance = parseGovernance(root.governance, diagnostics);
  if (!id || !title || !purpose || !context || !schema || !workflow || !projections || !governance || diagnostics.length) return { ok: false, diagnostics };
  validateReferences(context.sources, schema, workflow, diagnostics);
  if (diagnostics.length) return { ok: false, diagnostics };
  const studio: StudioContract = { version: STUDIO_VERSION, id, title, purpose, context, schema, workflow, projections, governance };
  return { ok: true, studio, diagnostics: [] };
}

function parseContext(value: unknown, diagnostics: StudioDiagnostic[]): StudioContract["context"] | null {
  const record = object(value, "$.context", diagnostics); if (!record) return null;
  unknown(record, new Set(["charter_refs", "sources", "axes"]), "$.context", diagnostics);
  const charterRefs = stringList(record.charter_refs, "$.context.charter_refs", diagnostics, 1, LIMITS.refs);
  const sources = objectList(record.sources, "$.context.sources", diagnostics, 1, LIMITS.sources, parseSource);
  const axes = objectList(record.axes, "$.context.axes", diagnostics, 1, LIMITS.axes, parseAxis);
  uniqueIds(sources, "$.context.sources", diagnostics); uniqueIds(axes, "$.context.axes", diagnostics);
  return charterRefs && sources && axes ? { charter_refs: charterRefs, sources, axes } : null;
}

function parseSource(record: Record<string, unknown>, path: string, diagnostics: StudioDiagnostic[]): StudioSourceBinding | null {
  unknown(record, new Set(["id", "path", "digest", "authority", "sensitivity"]), path, diagnostics);
  const id = identifier(record.id, `${path}.id`, diagnostics);
  const sourcePath = vaultPath(record.path, `${path}.path`, diagnostics);
  const digest = literalPattern(record.digest, DIGEST, `${path}.digest`, "Expected sha256:<64 lowercase hexadecimal characters>.", diagnostics);
  const authority = enumeration(record.authority, ["source", "evidence", "proposal", "projection"] as const, `${path}.authority`, diagnostics);
  const sensitivity = enumeration(record.sensitivity, ["private", "internal", "public", "restricted"] as const, `${path}.sensitivity`, diagnostics);
  return id && sourcePath && digest && authority && sensitivity ? { id, path: sourcePath, digest, authority, sensitivity } : null;
}

function parseAxis(record: Record<string, unknown>, path: string, diagnostics: StudioDiagnostic[]): StudioContextAxis | null {
  unknown(record, new Set(["id", "label", "question"]), path, diagnostics);
  const id = identifier(record.id, `${path}.id`, diagnostics); const label = text(record.label, `${path}.label`, diagnostics); const question = text(record.question, `${path}.question`, diagnostics);
  return id && label && question ? { id, label, question } : null;
}

function parseSchema(value: unknown, diagnostics: StudioDiagnostic[]): StudioContract["schema"] | null {
  const record = object(value, "$.schema", diagnostics); if (!record) return null;
  unknown(record, new Set(["id", "version", "semantic_owner", "record_types", "vocabularies", "invariants", "migration"]), "$.schema", diagnostics);
  const id = identifier(record.id, "$.schema.id", diagnostics);
  const version = versionText(record.version, "$.schema.version", diagnostics);
  const semanticOwner = text(record.semantic_owner, "$.schema.semantic_owner", diagnostics);
  const recordTypes = objectList(record.record_types, "$.schema.record_types", diagnostics, 1, LIMITS.records, parseRecordType);
  const vocabularies = objectList(record.vocabularies, "$.schema.vocabularies", diagnostics, 0, LIMITS.vocabularies, parseVocabulary);
  const invariants = objectList(record.invariants, "$.schema.invariants", diagnostics, 1, LIMITS.invariants, parseInvariant);
  const migration = parseMigration(record.migration, diagnostics);
  uniqueIds(recordTypes, "$.schema.record_types", diagnostics); uniqueIds(vocabularies, "$.schema.vocabularies", diagnostics); uniqueIds(invariants, "$.schema.invariants", diagnostics);
  if (recordTypes) recordTypes.forEach((candidate, index) => uniqueIds(candidate.fields, `$.schema.record_types[${index}].fields`, diagnostics));
  if (version && migration && migration.to_version !== version) add(diagnostics, "HCC-STUDIO-SEMANTIC", "$.schema.migration.to_version", "Migration target must equal the schema version.");
  return id && version && semanticOwner && recordTypes && vocabularies && invariants && migration ? { id, version, semantic_owner: semanticOwner, record_types: recordTypes, vocabularies, invariants, migration } : null;
}

function parseRecordType(record: Record<string, unknown>, path: string, diagnostics: StudioDiagnostic[]): StudioRecordType | null {
  unknown(record, new Set(["id", "label", "description", "fields"]), path, diagnostics);
  const id = identifier(record.id, `${path}.id`, diagnostics); const label = text(record.label, `${path}.label`, diagnostics); const description = text(record.description, `${path}.description`, diagnostics);
  const fields = objectList(record.fields, `${path}.fields`, diagnostics, 1, LIMITS.fields, parseField);
  return id && label && description && fields ? { id, label, description, fields } : null;
}

function parseField(record: Record<string, unknown>, path: string, diagnostics: StudioDiagnostic[]): StudioField | null {
  unknown(record, new Set(["id", "label", "type", "required", "vocabulary_ref"]), path, diagnostics);
  const id = identifier(record.id, `${path}.id`, diagnostics); const label = text(record.label, `${path}.label`, diagnostics);
  const type = enumeration(record.type, STUDIO_FIELD_TYPES, `${path}.type`, diagnostics);
  const required = booleanValue(record.required, `${path}.required`, diagnostics);
  const vocabularyRef = optionalIdentifier(record.vocabulary_ref, `${path}.vocabulary_ref`, diagnostics);
  if (type === "enum" && !vocabularyRef) add(diagnostics, "HCC-STUDIO-REFERENCE", `${path}.vocabulary_ref`, "Enum fields require a vocabulary_ref.");
  return id && label && type && required !== null ? { id, label, type, required, ...(vocabularyRef ? { vocabulary_ref: vocabularyRef } : {}) } : null;
}

function parseVocabulary(record: Record<string, unknown>, path: string, diagnostics: StudioDiagnostic[]): StudioVocabulary | null {
  unknown(record, new Set(["id", "source_ref", "version", "terms"]), path, diagnostics);
  const id = identifier(record.id, `${path}.id`, diagnostics); const sourceRef = identifier(record.source_ref, `${path}.source_ref`, diagnostics); const version = versionText(record.version, `${path}.version`, diagnostics);
  const terms = identifierList(record.terms, `${path}.terms`, diagnostics, 1, LIMITS.terms);
  return id && sourceRef && version && terms ? { id, source_ref: sourceRef, version, terms } : null;
}

function parseInvariant(record: Record<string, unknown>, path: string, diagnostics: StudioDiagnostic[]): StudioInvariant | null {
  unknown(record, new Set(["id", "kind", "field_refs", "message"]), path, diagnostics);
  const id = identifier(record.id, `${path}.id`, diagnostics); const kind = enumeration(record.kind, STUDIO_INVARIANT_KINDS, `${path}.kind`, diagnostics);
  const fieldRefs = identifierList(record.field_refs, `${path}.field_refs`, diagnostics, 1, LIMITS.fields); const message = text(record.message, `${path}.message`, diagnostics);
  return id && kind && fieldRefs && message ? { id, kind, field_refs: fieldRefs, message } : null;
}

function parseMigration(value: unknown, diagnostics: StudioDiagnostic[]): StudioMigration | null {
  const path = "$.schema.migration"; const record = object(value, path, diagnostics); if (!record) return null;
  unknown(record, new Set(["from_version", "to_version", "compatibility", "mappings", "loss_report", "reversal"]), path, diagnostics);
  const fromVersion = versionText(record.from_version, `${path}.from_version`, diagnostics); const toVersion = versionText(record.to_version, `${path}.to_version`, diagnostics);
  const compatibility = enumeration(record.compatibility, ["compatible", "conditional", "breaking"] as const, `${path}.compatibility`, diagnostics);
  const mappings = objectList(record.mappings, `${path}.mappings`, diagnostics, 0, LIMITS.fields, parseMigrationMapping);
  const lossReport = stringList(record.loss_report, `${path}.loss_report`, diagnostics, 0, LIMITS.fields); const reversal = text(record.reversal, `${path}.reversal`, diagnostics);
  if (fromVersion && toVersion && fromVersion === toVersion) add(diagnostics, "HCC-STUDIO-SEMANTIC", path, "Migration source and target versions must differ.");
  if (mappings?.some((mapping) => mapping.action === "drop") && lossReport?.length === 0) add(diagnostics, "HCC-STUDIO-SEMANTIC", `${path}.loss_report`, "A drop mapping requires a non-empty loss report.");
  if (mappings?.some((mapping) => mapping.action === "drop") && compatibility !== "breaking") add(diagnostics, "HCC-STUDIO-SEMANTIC", `${path}.compatibility`, "A drop mapping requires breaking compatibility.");
  return fromVersion && toVersion && compatibility && mappings && lossReport && reversal ? { from_version: fromVersion, to_version: toVersion, compatibility, mappings, loss_report: lossReport, reversal } : null;
}

function parseMigrationMapping(record: Record<string, unknown>, path: string, diagnostics: StudioDiagnostic[]): StudioMigrationMapping | null {
  unknown(record, new Set(["from", "to", "action"]), path, diagnostics);
  const from = fieldReference(record.from, `${path}.from`, diagnostics); const action = enumeration(record.action, STUDIO_MIGRATION_ACTIONS, `${path}.action`, diagnostics);
  const to = record.to === null ? null : fieldReference(record.to, `${path}.to`, diagnostics);
  if (action === "drop" && to !== null) add(diagnostics, "HCC-STUDIO-SEMANTIC", `${path}.to`, "Drop mappings require to: null.");
  if (action && action !== "drop" && !to) add(diagnostics, "HCC-STUDIO-SEMANTIC", `${path}.to`, `${action} mappings require a target field.`);
  return from && action && (to !== undefined) ? { from, to: to ?? null, action } : null;
}

function parseWorkflow(value: unknown, diagnostics: StudioDiagnostic[]): StudioWorkflowCandidate | null {
  const record = object(value, "$.workflow", diagnostics); if (!record) return null;
  unknown(record, new Set(["id", "version", "states", "actors", "guards", "effects", "recoveries", "human_gates", "transitions"]), "$.workflow", diagnostics);
  const id = identifier(record.id, "$.workflow.id", diagnostics); const version = versionText(record.version, "$.workflow.version", diagnostics);
  const states = objectList(record.states, "$.workflow.states", diagnostics, 2, LIMITS.states, parseState);
  const actors = objectList(record.actors, "$.workflow.actors", diagnostics, 1, LIMITS.actors, parseActor);
  const guards = objectList(record.guards, "$.workflow.guards", diagnostics, 1, LIMITS.guards, parseGuard);
  const effects = objectList(record.effects, "$.workflow.effects", diagnostics, 0, LIMITS.effects, parseEffect);
  const recoveries = objectList(record.recoveries, "$.workflow.recoveries", diagnostics, 1, LIMITS.recoveries, parseRecovery);
  const gates = objectList(record.human_gates, "$.workflow.human_gates", diagnostics, 1, LIMITS.gates, parseHumanGate);
  const transitions = objectList(record.transitions, "$.workflow.transitions", diagnostics, 1, LIMITS.transitions, parseTransition);
  uniqueIds(states, "$.workflow.states", diagnostics);
  uniqueIds(actors, "$.workflow.actors", diagnostics);
  uniqueIds(guards, "$.workflow.guards", diagnostics);
  uniqueIds(effects, "$.workflow.effects", diagnostics);
  uniqueIds(recoveries, "$.workflow.recoveries", diagnostics);
  uniqueIds(gates, "$.workflow.human_gates", diagnostics);
  uniqueIds(transitions, "$.workflow.transitions", diagnostics);
  return id && version && states && actors && guards && effects && recoveries && gates && transitions ? { id, version, states, actors, guards, effects, recoveries, human_gates: gates, transitions } : null;
}

function parseState(record: Record<string, unknown>, path: string, diagnostics: StudioDiagnostic[]): StudioState | null {
  unknown(record, new Set(["id", "label", "terminal"]), path, diagnostics); const id = identifier(record.id, `${path}.id`, diagnostics); const label = text(record.label, `${path}.label`, diagnostics); const terminal = booleanValue(record.terminal, `${path}.terminal`, diagnostics);
  return id && label && terminal !== null ? { id, label, terminal } : null;
}

function parseActor(record: Record<string, unknown>, path: string, diagnostics: StudioDiagnostic[]): StudioActor | null {
  unknown(record, new Set(["id", "label", "authority"]), path, diagnostics); const id = identifier(record.id, `${path}.id`, diagnostics); const label = text(record.label, `${path}.label`, diagnostics); const authority = enumeration(record.authority, ["human", "agent", "system"] as const, `${path}.authority`, diagnostics);
  return id && label && authority ? { id, label, authority } : null;
}

function parseGuard(record: Record<string, unknown>, path: string, diagnostics: StudioDiagnostic[]): StudioGuard | null {
  unknown(record, new Set(["id", "kind", "field_refs", "expected", "gate_ref", "source_ref", "digest"]), path, diagnostics);
  const id = identifier(record.id, `${path}.id`, diagnostics); const kind = enumeration(record.kind, STUDIO_GUARD_KINDS, `${path}.kind`, diagnostics);
  const fieldRefs = identifierList(record.field_refs ?? [], `${path}.field_refs`, diagnostics, 0, LIMITS.fields);
  const expected = scalar(record.expected, `${path}.expected`, diagnostics); const gateRef = optionalIdentifier(record.gate_ref, `${path}.gate_ref`, diagnostics); const sourceRef = optionalIdentifier(record.source_ref, `${path}.source_ref`, diagnostics);
  const digest = record.digest === undefined ? undefined : literalPattern(record.digest, DIGEST, `${path}.digest`, "Expected sha256:<64 lowercase hexadecimal characters>.", diagnostics) ?? undefined;
  if (kind === "all_required" && fieldRefs?.length === 0) add(diagnostics, "HCC-STUDIO-SEMANTIC", `${path}.field_refs`, "all_required needs at least one field reference.");
  if (kind === "value_equals" && (fieldRefs?.length !== 1 || expected === undefined)) add(diagnostics, "HCC-STUDIO-SEMANTIC", path, "value_equals needs one field reference and an expected scalar.");
  if (kind === "human_gate_satisfied" && !gateRef) add(diagnostics, "HCC-STUDIO-SEMANTIC", `${path}.gate_ref`, "human_gate_satisfied requires gate_ref.");
  if (kind === "source_digest_matches" && (!sourceRef || !digest)) add(diagnostics, "HCC-STUDIO-SEMANTIC", path, "source_digest_matches requires source_ref and digest.");
  if (kind === "all_required" && (expected !== undefined || gateRef || sourceRef || digest)) add(diagnostics, "HCC-STUDIO-SEMANTIC", path, "all_required accepts only field_refs.");
  if (kind === "value_equals" && (gateRef || sourceRef || digest)) add(diagnostics, "HCC-STUDIO-SEMANTIC", path, "value_equals cannot carry gate or source-digest fields.");
  if (kind === "human_gate_satisfied" && (fieldRefs?.length !== 0 || expected !== undefined || sourceRef || digest)) add(diagnostics, "HCC-STUDIO-SEMANTIC", path, "human_gate_satisfied accepts only gate_ref.");
  if (kind === "source_digest_matches" && (fieldRefs?.length !== 0 || expected !== undefined || gateRef)) add(diagnostics, "HCC-STUDIO-SEMANTIC", path, "source_digest_matches accepts only source_ref and digest.");
  return id && kind && fieldRefs ? { id, kind, field_refs: fieldRefs, ...(expected !== undefined ? { expected } : {}), ...(gateRef ? { gate_ref: gateRef } : {}), ...(sourceRef ? { source_ref: sourceRef } : {}), ...(digest ? { digest } : {}) } : null;
}

function parseEffect(record: Record<string, unknown>, path: string, diagnostics: StudioDiagnostic[]): StudioEffect | null {
  unknown(record, new Set(["id", "kind", "target", "authority"]), path, diagnostics); const id = identifier(record.id, `${path}.id`, diagnostics); const kind = enumeration(record.kind, STUDIO_EFFECT_KINDS, `${path}.kind`, diagnostics); const target = text(record.target, `${path}.target`, diagnostics);
  if (record.authority !== "proposal-only") add(diagnostics, "HCC-STUDIO-AUTHORITY", `${path}.authority`, "Every studio effect must remain proposal-only.");
  return id && kind && target && record.authority === "proposal-only" ? { id, kind, target, authority: "proposal-only" } : null;
}

function parseRecovery(record: Record<string, unknown>, path: string, diagnostics: StudioDiagnostic[]): StudioRecovery | null {
  unknown(record, new Set(["id", "kind", "description"]), path, diagnostics); const id = identifier(record.id, `${path}.id`, diagnostics); const kind = enumeration(record.kind, STUDIO_RECOVERY_KINDS, `${path}.kind`, diagnostics); const description = text(record.description, `${path}.description`, diagnostics);
  return id && kind && description ? { id, kind, description } : null;
}

function parseHumanGate(record: Record<string, unknown>, path: string, diagnostics: StudioDiagnostic[]): StudioHumanGate | null {
  unknown(record, new Set(["id", "label", "required", "authority"]), path, diagnostics); const id = identifier(record.id, `${path}.id`, diagnostics); const label = text(record.label, `${path}.label`, diagnostics);
  if (record.required !== true) add(diagnostics, "HCC-STUDIO-AUTHORITY", `${path}.required`, "Studio HumanGates must be required.");
  if (record.authority !== "human") add(diagnostics, "HCC-STUDIO-AUTHORITY", `${path}.authority`, "Studio HumanGates must retain human authority.");
  return id && label && record.required === true && record.authority === "human" ? { id, label, required: true, authority: "human" } : null;
}

function parseTransition(record: Record<string, unknown>, path: string, diagnostics: StudioDiagnostic[]): StudioTransition | null {
  unknown(record, new Set(["id", "label", "from", "to", "actor_ref", "guard_refs", "effect_refs", "recovery_ref", "human_gate_ref", "receipt"]), path, diagnostics);
  const id = identifier(record.id, `${path}.id`, diagnostics); const label = text(record.label, `${path}.label`, diagnostics); const from = identifier(record.from, `${path}.from`, diagnostics); const to = identifier(record.to, `${path}.to`, diagnostics); const actorRef = identifier(record.actor_ref, `${path}.actor_ref`, diagnostics);
  const guardRefs = identifierList(record.guard_refs, `${path}.guard_refs`, diagnostics, 1, LIMITS.guards); const effectRefs = identifierList(record.effect_refs, `${path}.effect_refs`, diagnostics, 0, LIMITS.effects);
  const recoveryRef = identifier(record.recovery_ref, `${path}.recovery_ref`, diagnostics); const humanGateRef = identifier(record.human_gate_ref, `${path}.human_gate_ref`, diagnostics); const receipt = identifier(record.receipt, `${path}.receipt`, diagnostics);
  return id && label && from && to && actorRef && guardRefs && effectRefs && recoveryRef && humanGateRef && receipt ? { id, label, from, to, actor_ref: actorRef, guard_refs: guardRefs, effect_refs: effectRefs, recovery_ref: recoveryRef, human_gate_ref: humanGateRef, receipt } : null;
}

function parseProjections(value: unknown, diagnostics: StudioDiagnostic[]): StudioProjectionSpec[] | null {
  const result = objectList(value, "$.projections", diagnostics, 1, LIMITS.projections, (record, path, list) => {
    unknown(record, new Set(["id", "title", "selector"]), path, list); const id = identifier(record.id, `${path}.id`, list); const title = text(record.title, `${path}.title`, list);
    const selector = typeof record.selector === "string" && SELECTORS.has(record.selector) ? record.selector as StudioProjectionSpec["selector"] : null;
    if (!selector) add(list, "HCC-STUDIO-SCHEMA", `${path}.selector`, "Unknown dashboard selector.");
    return id && title && selector ? { id, title, selector } : null;
  });
  uniqueIds(result, "$.projections", diagnostics); return result;
}

function parseGovernance(value: unknown, diagnostics: StudioDiagnostic[]): StudioContract["governance"] | null {
  const path = "$.governance"; const record = object(value, path, diagnostics); if (!record) return null;
  unknown(record, new Set(["authority", "review_required", "verification_required", "admission"]), path, diagnostics);
  if (record.authority !== "proposal-only") add(diagnostics, "HCC-STUDIO-AUTHORITY", `${path}.authority`, "Studio authority must remain proposal-only.");
  if (record.review_required !== true) add(diagnostics, "HCC-STUDIO-AUTHORITY", `${path}.review_required`, "Human review must be required.");
  if (record.verification_required !== false) add(diagnostics, "HCC-STUDIO-AUTHORITY", `${path}.verification_required`, "The candidate cannot require or claim verification.");
  if (record.admission !== "prohibited") add(diagnostics, "HCC-STUDIO-AUTHORITY", `${path}.admission`, "Automatic schema or workflow admission is prohibited.");
  return record.authority === "proposal-only" && record.review_required === true && record.verification_required === false && record.admission === "prohibited" ? { authority: "proposal-only", review_required: true, verification_required: false, admission: "prohibited" } : null;
}

function validateReferences(sources: StudioSourceBinding[], schema: StudioContract["schema"], workflow: StudioWorkflowCandidate, diagnostics: StudioDiagnostic[]): void {
  const sourceIds = new Set(sources.map((item) => item.id)); const sourceById = new Map(sources.map((item) => [item.id, item])); const vocabularyIds = new Set(schema.vocabularies.map((item) => item.id));
  const fields = new Set(schema.record_types.flatMap((record) => record.fields.map((field) => `${record.id}.${field.id}`)));
  schema.record_types.forEach((record, recordIndex) => record.fields.forEach((field, fieldIndex) => {
    if (field.vocabulary_ref && !vocabularyIds.has(field.vocabulary_ref)) add(diagnostics, "HCC-STUDIO-REFERENCE", `$.schema.record_types[${recordIndex}].fields[${fieldIndex}].vocabulary_ref`, "Unknown vocabulary reference.");
  }));
  schema.vocabularies.forEach((vocabulary, index) => { if (!sourceIds.has(vocabulary.source_ref)) add(diagnostics, "HCC-STUDIO-REFERENCE", `$.schema.vocabularies[${index}].source_ref`, "Vocabulary source_ref must identify a declared context source."); });
  schema.invariants.forEach((invariant, index) => invariant.field_refs.forEach((field, fieldIndex) => { if (!fields.has(field)) add(diagnostics, "HCC-STUDIO-REFERENCE", `$.schema.invariants[${index}].field_refs[${fieldIndex}]`, "Unknown schema field reference."); }));
  schema.migration.mappings.forEach((mapping, index) => { if (mapping.to !== null && !fields.has(mapping.to)) add(diagnostics, "HCC-STUDIO-REFERENCE", `$.schema.migration.mappings[${index}].to`, "Migration target must identify a current schema field."); });
  const stateIds = new Set(workflow.states.map((item) => item.id)); const actorIds = new Set(workflow.actors.map((item) => item.id)); const guardIds = new Set(workflow.guards.map((item) => item.id)); const effectIds = new Set(workflow.effects.map((item) => item.id)); const recoveryIds = new Set(workflow.recoveries.map((item) => item.id)); const gateIds = new Set(workflow.human_gates.map((item) => item.id));
  workflow.guards.forEach((guard, index) => {
    guard.field_refs.forEach((field, fieldIndex) => { if (!fields.has(field)) add(diagnostics, "HCC-STUDIO-REFERENCE", `$.workflow.guards[${index}].field_refs[${fieldIndex}]`, "Unknown schema field reference."); });
    if (guard.gate_ref && !gateIds.has(guard.gate_ref)) add(diagnostics, "HCC-STUDIO-REFERENCE", `$.workflow.guards[${index}].gate_ref`, "Unknown HumanGate reference.");
    if (guard.source_ref && !sourceIds.has(guard.source_ref)) add(diagnostics, "HCC-STUDIO-REFERENCE", `$.workflow.guards[${index}].source_ref`, "Unknown context source reference.");
    if (guard.source_ref && guard.digest && sourceById.get(guard.source_ref)?.digest !== guard.digest) add(diagnostics, "HCC-STUDIO-SEMANTIC", `$.workflow.guards[${index}].digest`, "Guard digest must equal the declared context source digest.");
  });
  if (!workflow.states.some((state) => state.terminal)) add(diagnostics, "HCC-STUDIO-SEMANTIC", "$.workflow.states", "A workflow must declare at least one terminal state.");
  workflow.transitions.forEach((transition, index) => {
    const base = `$.workflow.transitions[${index}]`;
    for (const [value, set, field] of [[transition.from, stateIds, "from"], [transition.to, stateIds, "to"], [transition.actor_ref, actorIds, "actor_ref"], [transition.recovery_ref, recoveryIds, "recovery_ref"], [transition.human_gate_ref, gateIds, "human_gate_ref"]] as const) if (!set.has(value)) add(diagnostics, "HCC-STUDIO-REFERENCE", `${base}.${field}`, `Unknown ${field} reference.`);
    transition.guard_refs.forEach((ref, refIndex) => { if (!guardIds.has(ref)) add(diagnostics, "HCC-STUDIO-REFERENCE", `${base}.guard_refs[${refIndex}]`, "Unknown guard reference."); });
    transition.effect_refs.forEach((ref, refIndex) => { if (!effectIds.has(ref)) add(diagnostics, "HCC-STUDIO-REFERENCE", `${base}.effect_refs[${refIndex}]`, "Unknown effect reference."); });
    if (workflow.states.find((state) => state.id === transition.from)?.terminal === true) add(diagnostics, "HCC-STUDIO-SEMANTIC", `${base}.from`, "Terminal states cannot declare outgoing transitions.");
  });
}

type WithId = { id: string };
function uniqueIds<T extends WithId>(items: T[] | null, path: string, diagnostics: StudioDiagnostic[]): void {
  const seen = new Set<string>(); items?.forEach((item, index) => { if (seen.has(item.id)) add(diagnostics, "HCC-STUDIO-SEMANTIC", `${path}[${index}].id`, "IDs must be unique within this collection."); seen.add(item.id); });
}
function objectList<T>(value: unknown, path: string, diagnostics: StudioDiagnostic[], min: number, max: number, parser: (record: Record<string, unknown>, path: string, diagnostics: StudioDiagnostic[]) => T | null): T[] | null {
  if (!Array.isArray(value) || value.length < min || value.length > max) { add(diagnostics, "HCC-STUDIO-LIMIT", path, `Expected ${min}–${max} entries.`); return null; }
  const result: T[] = []; value.forEach((entry, index) => { const entryPath = `${path}[${index}]`; const record = object(entry, entryPath, diagnostics); if (!record) return; const parsed = parser(record, entryPath, diagnostics); if (parsed) result.push(parsed); }); return result;
}
function object(value: unknown, path: string, diagnostics: StudioDiagnostic[]): Record<string, unknown> | null { if (typeof value !== "object" || value === null || Array.isArray(value)) { add(diagnostics, "HCC-STUDIO-SCHEMA", path, "Expected an object."); return null; } return value as Record<string, unknown>; }
function unknown(record: Record<string, unknown>, allowed: Set<string>, path: string, diagnostics: StudioDiagnostic[]): void { Object.keys(record).filter((key) => !allowed.has(key)).forEach((key) => add(diagnostics, "HCC-STUDIO-UNKNOWN", `${path}.${key}`, "Unknown fields are not accepted.")); }
function text(value: unknown, path: string, diagnostics: StudioDiagnostic[]): string | null { if (typeof value !== "string" || value.trim() === "" || value.length > 4096) { add(diagnostics, "HCC-STUDIO-SCHEMA", path, "Expected non-empty text of at most 4096 characters."); return null; } return value; }
function identifier(value: unknown, path: string, diagnostics: StudioDiagnostic[]): string | null { if (typeof value !== "string" || !IDENTIFIER.test(value) || value.length > 96) { add(diagnostics, "HCC-STUDIO-SCHEMA", path, "Expected a lowercase stable identifier of at most 96 characters."); return null; } return value; }
function optionalIdentifier(value: unknown, path: string, diagnostics: StudioDiagnostic[]): string | undefined { if (value === undefined) return undefined; return identifier(value, path, diagnostics) ?? undefined; }
function fieldReference(value: unknown, path: string, diagnostics: StudioDiagnostic[]): string | null { if (typeof value !== "string" || value.length > 193 || !/^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*\.[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/.test(value)) { add(diagnostics, "HCC-STUDIO-SCHEMA", path, "Expected a record.field reference."); return null; } return value; }
function versionText(value: unknown, path: string, diagnostics: StudioDiagnostic[]): string | null { return literalPattern(value, VERSION, path, "Expected a bounded semantic candidate version.", diagnostics); }
function literalPattern(value: unknown, pattern: RegExp, path: string, message: string, diagnostics: StudioDiagnostic[]): string | null { if (typeof value !== "string" || value.length > 128 || !pattern.test(value)) { add(diagnostics, "HCC-STUDIO-SCHEMA", path, message); return null; } return value; }
function booleanValue(value: unknown, path: string, diagnostics: StudioDiagnostic[]): boolean | null { if (typeof value !== "boolean") { add(diagnostics, "HCC-STUDIO-SCHEMA", path, "Expected a boolean."); return null; } return value; }
function scalar(value: unknown, path: string, diagnostics: StudioDiagnostic[]): StudioScalar | undefined { if (value === undefined) return undefined; if (value === null || typeof value === "string" && value.length <= 1024 || typeof value === "number" && Number.isFinite(value) || typeof value === "boolean") return value as StudioScalar; add(diagnostics, "HCC-STUDIO-SCHEMA", path, "Expected a bounded JSON scalar."); return undefined; }
function enumeration<const T extends readonly string[]>(value: unknown, admitted: T, path: string, diagnostics: StudioDiagnostic[]): T[number] | null { if (typeof value !== "string" || !admitted.includes(value)) { add(diagnostics, "HCC-STUDIO-SCHEMA", path, `Expected one of: ${admitted.join(", ")}.`); return null; } return value as T[number]; }
function stringList(value: unknown, path: string, diagnostics: StudioDiagnostic[], min: number, max: number): string[] | null { if (!Array.isArray(value) || value.length < min || value.length > max || value.some((entry) => typeof entry !== "string" || entry.trim() === "" || entry.length > 1024)) { add(diagnostics, "HCC-STUDIO-LIMIT", path, `Expected ${min}–${max} bounded non-empty strings.`); return null; } if (new Set(value).size !== value.length) add(diagnostics, "HCC-STUDIO-SEMANTIC", path, "Entries must be unique."); return [...value] as string[]; }
function identifierList(value: unknown, path: string, diagnostics: StudioDiagnostic[], min: number, max: number): string[] | null { const values = stringList(value, path, diagnostics, min, max); if (!values) return null; values.forEach((entry, index) => { if (!IDENTIFIER.test(entry) && !/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/.test(entry)) add(diagnostics, "HCC-STUDIO-SCHEMA", `${path}[${index}]`, "Expected a stable identifier or record.field reference."); }); return values; }
function vaultPath(value: unknown, path: string, diagnostics: StudioDiagnostic[]): string | null { if (typeof value !== "string" || value.trim() === "" || value.length > 1024 || value.startsWith("/") || value.includes("\\") || value.split("/").some((part) => part === ".." || part.startsWith(".")) || /^[a-z][a-z0-9+.-]*:/i.test(value)) { add(diagnostics, "HCC-STUDIO-SCHEMA", path, "Expected a non-hidden vault-relative path."); return null; } return value; }
function add(list: StudioDiagnostic[], code: StudioDiagnostic["code"], path: string, message: string): void { list.push({ code, path, message }); }
