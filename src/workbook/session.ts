import type {
  DraftSessionProposal,
  FinalSessionProposal,
  SessionResponseEntry,
  WorksheetContract
} from "./types";

interface SessionState {
  sessionId: string;
  startedAt: string;
  responses: Map<string, SessionResponseEntry>;
  listeners: Set<() => void>;
}

export interface InteractionSessionBinding<T> {
  get: (fallback: T) => T;
  update: (response: T, kind: string, version: string) => void;
  reset: () => void;
}

export interface WorksheetProgress {
  answered: number;
  declared: number;
  requiredComplete: boolean;
  missingRequired: string[];
  states: Record<string, string>;
}

export interface FinalProposalOptions {
  sourceDigest?: string;
  persistence?: "prohibited-step-8-held" | "vault-local-create-only";
}

export class EphemeralWorkbookSessions {
  private readonly sessions = new Map<string, SessionState>();
  private successorSequence = 0;

  constructor(private readonly now: () => Date = () => new Date()) {}

  binding<T>(sourcePath: string, interactionId: string): InteractionSessionBinding<T> {
    const key = sessionKey(sourcePath);
    return {
      get: (fallback) => {
        const value = this.sessions.get(key)?.responses.get(interactionId)?.response;
        return value === undefined ? clone(fallback) : clone(value as T);
      },
      update: (response, kind, version) => {
        const session = this.ensure(key);
        session.responses.set(interactionId, {
          interaction_id: interactionId,
          interaction_kind: kind,
          interaction_version: version,
          response: clone(response),
          observed_at: this.now().toISOString()
        });
        this.notify(session);
      },
      reset: () => {
        const session = this.sessions.get(key);
        if (!session) return;
        session.responses.delete(interactionId);
        this.notify(session);
      }
    };
  }

  subscribe(sourcePath: string, listener: () => void): () => void {
    const session = this.ensure(sessionKey(sourcePath));
    session.listeners.add(listener);
    return () => session.listeners.delete(listener);
  }

  hydrate(sourcePath: string, entries: readonly SessionResponseEntry[]): void {
    const key = sessionKey(sourcePath);
    const existing = this.sessions.get(key);
    if (existing && existing.responses.size > 0) throw new Error("HCC-WORKBOOK-HYDRATE-NONEMPTY: discard the current in-memory draft before loading a packet.");
    const ids = new Set<string>();
    for (const entry of entries) {
      if (ids.has(entry.interaction_id)) throw new Error(`HCC-WORKBOOK-HYDRATE-DUPLICATE: ${entry.interaction_id}`);
      ids.add(entry.interaction_id);
    }
    const session = existing ?? this.ensure(key);
    entries.forEach((entry) => session.responses.set(entry.interaction_id, clone(entry)));
    this.notify(session);
  }

  progress(sourcePath: string, worksheet: WorksheetContract): WorksheetProgress {
    const responses = this.sessions.get(sessionKey(sourcePath))?.responses;
    const declared = worksheet.sections.flatMap((section) => section.interactions);
    const states: Record<string, string> = {};
    declared.forEach((id) => {
      const response = responses?.get(id)?.response;
      states[id] = responseState(response);
    });
    const missingRequired = worksheet.completion.required.filter((id) => states[id] !== "answered");
    return {
      answered: Object.values(states).filter((state) => state === "answered").length,
      declared: declared.length,
      requiredComplete: missingRequired.length === 0,
      missingRequired,
      states
    };
  }

  draftProposal(sourcePath: string, worksheet: WorksheetContract): DraftSessionProposal {
    const session = this.ensure(sessionKey(sourcePath));
    return {
      record_type: "hcc-worksheet-session-draft",
      contract_version: "0.1-candidate.1",
      authority: "noncanonical-mutable-draft-proposal",
      session_id: session.sessionId,
      worksheet_binding: {
        worksheet_id: worksheet.id,
        worksheet_version: worksheet.version,
        source_path: sourcePath,
        source_digest: null
      },
      started_at: session.startedAt,
      prepared_at: this.now().toISOString(),
      respondent: null,
      responses: this.entries(session),
      effects: { persistence: "prohibited-step-8-held" }
    };
  }

  finalProposal(sourcePath: string, worksheet: WorksheetContract, options: FinalProposalOptions = {}): FinalSessionProposal {
    const draft = this.draftProposal(sourcePath, worksheet);
    const progress = this.progress(sourcePath, worksheet);
    return {
      record_type: "hcc-worksheet-response-packet",
      contract_version: "0.1-candidate.1",
      authority: "immutable-intake-candidate-proposal",
      immutable: true,
      session_id: draft.session_id,
      worksheet_binding: { ...draft.worksheet_binding, source_digest: options.sourceDigest ?? null },
      started_at: draft.started_at,
      prepared_at: draft.prepared_at,
      respondent: null,
      responses: draft.responses,
      review: {
        required_complete: progress.requiredComplete,
        missing_required: progress.missingRequired,
        human_gate: "required"
      },
      downstream: {
        action_candidates: "not-generated",
        decision_candidates: "not-generated",
        work_item_candidates: "not-generated",
        canonical_write_back: "prohibited"
      },
      effects: { persistence: options.persistence ?? "prohibited-step-8-held", submission: "prohibited" }
    };
  }

  beginSuccessor(sourcePath: string): void {
    const session = this.ensure(sessionKey(sourcePath));
    const now = this.now();
    session.sessionId = createSessionId(sourcePath, now, ++this.successorSequence);
    session.startedAt = now.toISOString();
    this.notify(session);
  }

  /**
   * Return the current set of response entries for the source path.
   * Used by the response-packet controller to enumerate existing entries
   * for the discard path of `importDraftFromYaml`.
   */
  snapshot(sourcePath: string): SessionResponseEntry[] {
    const session = this.sessions.get(sessionKey(sourcePath));
    return session ? Array.from(session.responses.values()) : [];
  }

  /**
   * Clear all response entries for the source path and notify subscribers.
   * Used by the response-packet controller when an import operation is
   * authorized with `discard: true`.
   */
  clear(sourcePath: string): void {
    const key = sessionKey(sourcePath);
    const session = this.sessions.get(key);
    if (!session) return;
    session.responses.clear();
    this.notify(session);
  }

  discard(sourcePath: string): void {
    const session = this.sessions.get(sessionKey(sourcePath));
    if (!session) return;
    session.responses.clear();
    this.notify(session);
  }

  hasResponses(sourcePath: string): boolean {
    return (this.sessions.get(sessionKey(sourcePath))?.responses.size ?? 0) > 0;
  }

  private ensure(sourcePath: string): SessionState {
    const existing = this.sessions.get(sourcePath);
    if (existing) return existing;
    const startedAt = this.now().toISOString();
    const session: SessionState = {
      sessionId: createSessionId(sourcePath, new Date(startedAt)),
      startedAt,
      responses: new Map(),
      listeners: new Set()
    };
    this.sessions.set(sourcePath, session);
    return session;
  }

  private entries(session: SessionState): SessionResponseEntry[] {
    return [...session.responses.values()]
      .sort((left, right) => left.interaction_id.localeCompare(right.interaction_id))
      .map((entry) => clone(entry));
  }

  private notify(session: SessionState): void { session.listeners.forEach((listener) => listener()); }
}

function createSessionId(sourcePath: string, now: Date, successorSequence?: number): string {
  const safePath = sourcePath.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "untitled";
  const base = `${safePath}--session-${now.toISOString().replace(/[^0-9]/g, "").slice(0, 17)}`;
  return successorSequence === undefined ? base : `${base}-${successorSequence}`;
}

function responseState(value: unknown): string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return "unanswered";
  const state = (value as Record<string, unknown>).state;
  return typeof state === "string" ? state : "unanswered";
}

function sessionKey(sourcePath: string): string {
  return sourcePath.replace(/\.md$/i, "");
}

function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => clone(item)) as T;
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) as T;
  }
  return value;
}
