import { types as nodeTypes } from 'node:util';

import {
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2StudyTarget,
} from '../../shared/dialogue_v2_language_pack_contract';

export const DIALOGUE_V2_SESSION_TTL_MS = 24 * 60 * 60 * 1_000;
export const DIALOGUE_V2_SESSION_MAX_RAW_TURNS = 8;
export const DIALOGUE_V2_SESSION_MAX_RAW_BYTES = 12 * 1_024;
export const DIALOGUE_V2_SESSION_PENDING_CLAIM_TTL_MS = 60_000;

const MAX_IDEMPOTENCY_RECEIPTS = 64;
const MAX_GROUP_PERSONAS = 6;
const DEFAULT_GROUP_RELEVANCE = 5;
const RECENT_SPEAKER_RELEVANCE = 3;
const MAX_USER_TEXT_BYTES = 2_048;
const MAX_ASSISTANT_TEXT_BYTES = 3_072;
const MAX_CREATE_ATTEMPTS = 3;
const SESSION_ID_RE = /^d2s_[A-Za-z0-9_-]{32,96}$/;
const TURN_ID_RE = /^d2t_[A-Za-z0-9_-]{16,80}$/;
const CLAIM_TOKEN_RE = /^d2c_[A-Za-z0-9_-]{32,96}$/;
const SCENARIO_ID_RE = /^(?=.{1,64}$)[a-z0-9]+(?:_[a-z0-9]+)*$/;
const IDENTITY_RE = /^(?=.{1,256}$)[^/\u0000-\u001f\u007f]+$/;
const OWNER_BINDING_RE = /^[A-Za-z0-9_-]{32,128}$/;
const DIGEST_RE = /^[a-f0-9]{64}$/;
const PERSONA_ID_RE = /^(?=.{1,128}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const UNSAFE_TEXT_RE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u;

type PlainRecord = Record<string, unknown>;

export type DialogueV2SessionActor = Readonly<{
  authUid: string;
  stableAccountId: string;
}>;

export type DialogueV2SessionSelection = Readonly<{
  studyTarget: DialogueV2StudyTarget;
  scenarioId: string;
}>;

export type DialogueV2SessionAssistantReply = Readonly<{
  personaId: string;
  text: string;
}>;

/**
 * Minimal server-owned scheduler state. It deliberately contains no dialogue
 * text, personal facts, authored persona data, or client-controlled values.
 */
export type DialogueV2SessionGroupState = Readonly<{
  schemaVersion: 1;
  turnCount: number;
  lastSpeakerId: string | null;
  relevanceByPersonaId: Readonly<Record<string, number>>;
}>;

type StoredTurn = Readonly<{
  turnId: string;
  userText: string;
  assistantReplies: readonly DialogueV2SessionAssistantReply[] | null;
}>;

export type DialogueV2ServerConversationTurn = StoredTurn;

type TurnReceipt = Readonly<{
  turnId: string;
  requestDigest: string;
  claimToken: string;
  claimExpiresAtMs: number;
  state: 'pending' | 'completed' | 'evicted';
}>;

export type DialogueV2SessionLedgerRecord = Readonly<{
  schemaVersion: 1;
  sessionId: string;
  ownerBinding: string;
  studyTarget: DialogueV2StudyTarget;
  scenarioId: string;
  createdAtMs: number;
  expiresAtMs: number;
  revision: number;
  groupState: DialogueV2SessionGroupState;
  turns: readonly StoredTurn[];
  receipts: readonly TurnReceipt[];
}>;

export type DialogueV2SessionLedgerRepository = Readonly<{
  /** Returns null on an ID collision, otherwise the committed stored value. */
  createIfAbsent(record: DialogueV2SessionLedgerRecord): Promise<unknown | null>;
  /** Atomically applies transition and returns the committed value, or null if absent. */
  mutate(
    sessionId: string,
    transition: (stored: unknown) => DialogueV2SessionLedgerRecord,
  ): Promise<unknown | null>;
}>;

type TurnRequestDigestInput = Readonly<{
  sessionId: string;
  turnId: string;
  studyTarget: DialogueV2StudyTarget;
  scenarioId: string;
  userText: string;
}>;

export type DialogueV2SessionLedgerDependencies = Readonly<{
  repository: DialogueV2SessionLedgerRepository;
  nowMs(): number;
  generateSessionId(): string;
  generateClaimToken(): string;
  bindOwner(actor: DialogueV2SessionActor): string;
  digestTurnRequest(input: TurnRequestDigestInput): string;
}>;

export type DialogueV2ServerTurnInput = Readonly<{
  sessionId: string;
  turnId: string;
  studyTarget: DialogueV2StudyTarget;
  scenarioId: string;
  userText: string;
  sessionExpiresAtMs: number;
  groupState: DialogueV2SessionGroupState;
  priorTurns: readonly DialogueV2ServerConversationTurn[];
}>;

export type DialogueV2ServerTurnProducer = (
  input: DialogueV2ServerTurnInput,
) => Promise<unknown>;

export type DialogueV2SessionTurnResult = Readonly<{
  ok: true;
  kind: 'new' | 'replay';
  sessionId: string;
  turnId: string;
  replies: readonly DialogueV2SessionAssistantReply[];
}>;

export type DialogueV2SessionLedgerErrorCode =
  | 'request_invalid'
  | 'ledger_unavailable'
  | 'session_not_found'
  | 'session_expired'
  | 'session_completed'
  | 'access_denied'
  | 'selection_mismatch'
  | 'turn_conflict'
  | 'turn_in_progress'
  | 'turn_replay_expired'
  | 'session_full'
  | 'assistant_response_invalid'
  | 'turn_execution_failed'
  | 'completion_absent'
  | 'completion_unknown';

export class DialogueV2SessionLedgerError extends Error {
  constructor(readonly code: DialogueV2SessionLedgerErrorCode) {
    super(code);
    this.name = 'DialogueV2SessionLedgerError';
  }
}

function exactPlainRecord(value: unknown): PlainRecord | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) || nodeTypes.isProxy(value)) {
      return null;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== 'string')) return null;
    const snapshot: PlainRecord = Object.create(null) as PlainRecord;
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (!descriptor?.enumerable || !('value' in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function hasExactKeys(record: PlainRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(record);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function safeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function safeNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function safeIdentity(value: unknown): value is string {
  return typeof value === 'string' && IDENTITY_RE.test(value);
}

function exactActor(value: unknown): DialogueV2SessionActor | null {
  const actor = exactPlainRecord(value);
  if (!actor || !hasExactKeys(actor, ['authUid', 'stableAccountId'])
    || !safeIdentity(actor.authUid)
    || !safeIdentity(actor.stableAccountId)) return null;
  return Object.freeze({
    authUid: actor.authUid,
    stableAccountId: actor.stableAccountId,
  });
}

function exactSelection(value: unknown): DialogueV2SessionSelection | null {
  const selection = exactPlainRecord(value);
  if (!selection || !hasExactKeys(selection, ['studyTarget', 'scenarioId'])
    || typeof selection.studyTarget !== 'string'
    || !(DIALOGUE_V2_STUDY_TARGETS as readonly string[]).includes(selection.studyTarget)
    || typeof selection.scenarioId !== 'string'
    || !SCENARIO_ID_RE.test(selection.scenarioId)) return null;
  return Object.freeze({
    studyTarget: selection.studyTarget as DialogueV2StudyTarget,
    scenarioId: selection.scenarioId,
  });
}

function safeText(value: unknown, maxBytes: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\r\n?/gu, '\n').normalize('NFC').trim();
  if (!normalized || normalized !== value || UNSAFE_TEXT_RE.test(normalized)) return null;
  return Buffer.byteLength(normalized, 'utf8') <= maxBytes ? normalized : null;
}

function exactTurnRequest(value: unknown): TurnRequestDigestInput | null {
  const input = exactPlainRecord(value);
  const expected = ['sessionId', 'turnId', 'studyTarget', 'scenarioId', 'userText'];
  if (!input || !hasExactKeys(input, expected)
    || typeof input.sessionId !== 'string' || !SESSION_ID_RE.test(input.sessionId)
    || typeof input.turnId !== 'string' || !TURN_ID_RE.test(input.turnId)
    || typeof input.studyTarget !== 'string'
    || !(DIALOGUE_V2_STUDY_TARGETS as readonly string[]).includes(input.studyTarget)
    || typeof input.scenarioId !== 'string' || !SCENARIO_ID_RE.test(input.scenarioId)) return null;
  const userText = safeText(input.userText, MAX_USER_TEXT_BYTES);
  if (!userText) return null;
  return Object.freeze({
    sessionId: input.sessionId,
    turnId: input.turnId,
    studyTarget: input.studyTarget as DialogueV2StudyTarget,
    scenarioId: input.scenarioId,
    userText,
  });
}

function exactAssistantReplies(value: unknown): readonly DialogueV2SessionAssistantReply[] | null {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype
    || value.length > 2) return null;
  const replies: DialogueV2SessionAssistantReply[] = [];
  const personaIds = new Set<string>();
  for (const candidate of value) {
    const reply = exactPlainRecord(candidate);
    if (!reply || !hasExactKeys(reply, ['personaId', 'text'])
      || typeof reply.personaId !== 'string'
      || !PERSONA_ID_RE.test(reply.personaId)
      || personaIds.has(reply.personaId)) return null;
    const text = safeText(reply.text, MAX_ASSISTANT_TEXT_BYTES);
    if (!text) return null;
    personaIds.add(reply.personaId);
    replies.push(Object.freeze({ personaId: reply.personaId, text }));
  }
  return Object.freeze(replies);
}

function exactStoredTurn(value: unknown): StoredTurn | null {
  const turn = exactPlainRecord(value);
  if (!turn || !hasExactKeys(turn, ['turnId', 'userText', 'assistantReplies'])
    || typeof turn.turnId !== 'string' || !TURN_ID_RE.test(turn.turnId)) return null;
  const userText = safeText(turn.userText, MAX_USER_TEXT_BYTES);
  if (!userText) return null;
  const assistantReplies = turn.assistantReplies === null
    ? null
    : exactAssistantReplies(turn.assistantReplies);
  if (turn.assistantReplies !== null && !assistantReplies) return null;
  return Object.freeze({ turnId: turn.turnId, userText, assistantReplies });
}

function exactReceipt(value: unknown): TurnReceipt | null {
  const receipt = exactPlainRecord(value);
  if (!receipt || !hasExactKeys(
    receipt,
    ['turnId', 'requestDigest', 'claimToken', 'claimExpiresAtMs', 'state'],
  )
    || typeof receipt.turnId !== 'string' || !TURN_ID_RE.test(receipt.turnId)
    || typeof receipt.requestDigest !== 'string' || !DIGEST_RE.test(receipt.requestDigest)
    || typeof receipt.claimToken !== 'string' || !CLAIM_TOKEN_RE.test(receipt.claimToken)
    || !safeInteger(receipt.claimExpiresAtMs)
    || (receipt.state !== 'pending'
      && receipt.state !== 'completed'
      && receipt.state !== 'evicted')) return null;
  return Object.freeze({
    turnId: receipt.turnId,
    requestDigest: receipt.requestDigest,
    claimToken: receipt.claimToken,
    claimExpiresAtMs: receipt.claimExpiresAtMs,
    state: receipt.state,
  });
}

function initialGroupState(): DialogueV2SessionGroupState {
  return Object.freeze({
    schemaVersion: 1,
    turnCount: 0,
    lastSpeakerId: null,
    relevanceByPersonaId: Object.freeze({}),
  });
}

function exactGroupState(value: unknown): DialogueV2SessionGroupState | null {
  const state = exactPlainRecord(value);
  if (!state || !hasExactKeys(state, [
    'schemaVersion', 'turnCount', 'lastSpeakerId', 'relevanceByPersonaId',
  ])
    || state.schemaVersion !== 1
    || !safeNonNegativeInteger(state.turnCount)
    || state.turnCount > MAX_IDEMPOTENCY_RECEIPTS
    || (state.lastSpeakerId !== null
      && (typeof state.lastSpeakerId !== 'string' || !PERSONA_ID_RE.test(state.lastSpeakerId)))) {
    return null;
  }
  const relevanceRecord = exactPlainRecord(state.relevanceByPersonaId);
  if (!relevanceRecord) return null;
  const personaIds = Object.keys(relevanceRecord);
  if (personaIds.length > MAX_GROUP_PERSONAS) return null;
  const relevanceByPersonaId: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const personaId of personaIds) {
    const relevance = relevanceRecord[personaId];
    if (!PERSONA_ID_RE.test(personaId)
      || !Number.isInteger(relevance)
      || Number(relevance) < 0
      || Number(relevance) > 10) return null;
    relevanceByPersonaId[personaId] = relevance as number;
  }
  if (state.lastSpeakerId !== null
    && !Object.prototype.hasOwnProperty.call(relevanceByPersonaId, state.lastSpeakerId)) return null;
  return Object.freeze({
    schemaVersion: 1,
    turnCount: state.turnCount,
    lastSpeakerId: state.lastSpeakerId as string | null,
    relevanceByPersonaId: Object.freeze(relevanceByPersonaId),
  });
}

function advanceGroupState(
  current: DialogueV2SessionGroupState,
  replies: readonly DialogueV2SessionAssistantReply[],
): DialogueV2SessionGroupState {
  const relevanceByPersonaId: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const [personaId, relevance] of Object.entries(current.relevanceByPersonaId)) {
    relevanceByPersonaId[personaId] = Math.min(DEFAULT_GROUP_RELEVANCE, relevance + 1);
  }
  for (const reply of replies) {
    if (!Object.prototype.hasOwnProperty.call(relevanceByPersonaId, reply.personaId)
      && Object.keys(relevanceByPersonaId).length >= MAX_GROUP_PERSONAS) {
      throw new DialogueV2SessionLedgerError('assistant_response_invalid');
    }
    relevanceByPersonaId[reply.personaId] = RECENT_SPEAKER_RELEVANCE;
  }
  return Object.freeze({
    schemaVersion: 1,
    turnCount: current.turnCount + 1,
    lastSpeakerId: replies.at(-1)?.personaId ?? current.lastSpeakerId,
    relevanceByPersonaId: Object.freeze(relevanceByPersonaId),
  });
}

function rawTurnsBytes(turns: readonly StoredTurn[]): number {
  return Buffer.byteLength(JSON.stringify(turns), 'utf8');
}

function exactLedgerRecord(value: unknown): DialogueV2SessionLedgerRecord | null {
  const record = exactPlainRecord(value);
  const legacyExpected = [
    'schemaVersion', 'sessionId', 'ownerBinding', 'studyTarget', 'scenarioId',
    'createdAtMs', 'expiresAtMs', 'revision', 'turns', 'receipts',
  ];
  const currentExpected = [...legacyExpected, 'groupState'];
  if (!record || (!hasExactKeys(record, legacyExpected) && !hasExactKeys(record, currentExpected))
    || record.schemaVersion !== 1
    || typeof record.sessionId !== 'string' || !SESSION_ID_RE.test(record.sessionId)
    || typeof record.ownerBinding !== 'string' || !OWNER_BINDING_RE.test(record.ownerBinding)
    || typeof record.studyTarget !== 'string'
    || !(DIALOGUE_V2_STUDY_TARGETS as readonly string[]).includes(record.studyTarget)
    || typeof record.scenarioId !== 'string' || !SCENARIO_ID_RE.test(record.scenarioId)
    || !safeInteger(record.createdAtMs)
    || !safeInteger(record.expiresAtMs)
    || record.expiresAtMs !== record.createdAtMs + DIALOGUE_V2_SESSION_TTL_MS
    || !safeInteger(record.revision)
    || !Array.isArray(record.turns) || Object.getPrototypeOf(record.turns) !== Array.prototype
    || !Array.isArray(record.receipts) || Object.getPrototypeOf(record.receipts) !== Array.prototype
    || record.turns.length > DIALOGUE_V2_SESSION_MAX_RAW_TURNS
    || record.receipts.length > MAX_IDEMPOTENCY_RECEIPTS) return null;

  const groupState = Object.prototype.hasOwnProperty.call(record, 'groupState')
    ? exactGroupState(record.groupState)
    : initialGroupState();
  if (!groupState) return null;

  const turns: StoredTurn[] = [];
  const turnIds = new Set<string>();
  for (const candidate of record.turns) {
    const turn = exactStoredTurn(candidate);
    if (!turn || turnIds.has(turn.turnId)) return null;
    turnIds.add(turn.turnId);
    turns.push(turn);
  }
  if (rawTurnsBytes(turns) > DIALOGUE_V2_SESSION_MAX_RAW_BYTES) return null;

  const receipts: TurnReceipt[] = [];
  const receiptIds = new Set<string>();
  for (const candidate of record.receipts) {
    const receipt = exactReceipt(candidate);
    if (!receipt || receiptIds.has(receipt.turnId)) return null;
    receiptIds.add(receipt.turnId);
    receipts.push(receipt);
  }
  for (const turn of turns) {
    const receipt = receipts.find((entry) => entry.turnId === turn.turnId);
    if (!receipt || receipt.state !== 'completed' || turn.assistantReplies === null) return null;
  }
  for (const receipt of receipts) {
    const turn = turns.find((entry) => entry.turnId === receipt.turnId);
    if (receipt.state === 'completed' ? !turn : Boolean(turn)) return null;
  }

  return Object.freeze({
    schemaVersion: 1,
    sessionId: record.sessionId,
    ownerBinding: record.ownerBinding,
    studyTarget: record.studyTarget as DialogueV2StudyTarget,
    scenarioId: record.scenarioId,
    createdAtMs: record.createdAtMs,
    expiresAtMs: record.expiresAtMs,
    revision: record.revision,
    groupState,
    turns: Object.freeze(turns),
    receipts: Object.freeze(receipts),
  });
}

function immutableRecord(
  record: DialogueV2SessionLedgerRecord,
  changes: Partial<Pick<
    DialogueV2SessionLedgerRecord,
    'revision' | 'groupState' | 'turns' | 'receipts'
  >>,
): DialogueV2SessionLedgerRecord {
  return Object.freeze({
    ...record,
    ...changes,
    groupState: changes.groupState ?? record.groupState,
    turns: Object.freeze([...(changes.turns ?? record.turns)]),
    receipts: Object.freeze([...(changes.receipts ?? record.receipts)]),
  });
}

function evictRawTurns(
  turnsInput: readonly StoredTurn[],
  receiptsInput: readonly TurnReceipt[],
): Readonly<{ turns: readonly StoredTurn[]; receipts: readonly TurnReceipt[] }> {
  const turns = [...turnsInput];
  const receipts = [...receiptsInput];
  while (turns.length > DIALOGUE_V2_SESSION_MAX_RAW_TURNS
    || rawTurnsBytes(turns) > DIALOGUE_V2_SESSION_MAX_RAW_BYTES) {
    const evictionIndex = turns.findIndex((turn) => turn.assistantReplies !== null);
    if (evictionIndex < 0) throw new DialogueV2SessionLedgerError('session_full');
    const [evicted] = turns.splice(evictionIndex, 1);
    const receiptIndex = receipts.findIndex((receipt) => receipt.turnId === evicted.turnId);
    if (receiptIndex < 0) throw new DialogueV2SessionLedgerError('ledger_unavailable');
    receipts[receiptIndex] = Object.freeze({
      ...receipts[receiptIndex],
      state: 'evicted',
    });
  }
  return Object.freeze({
    turns: Object.freeze(turns),
    receipts: Object.freeze(receipts),
  });
}

function assertSessionAuthority(
  record: DialogueV2SessionLedgerRecord,
  ownerBinding: string,
  selection: DialogueV2SessionSelection,
  nowMs: number,
): void {
  if (record.ownerBinding !== ownerBinding) {
    throw new DialogueV2SessionLedgerError('access_denied');
  }
  if (record.studyTarget !== selection.studyTarget
    || record.scenarioId !== selection.scenarioId) {
    throw new DialogueV2SessionLedgerError('selection_mismatch');
  }
  if (nowMs >= record.expiresAtMs) {
    throw new DialogueV2SessionLedgerError('session_expired');
  }
}

function publicResult(
  kind: 'new' | 'replay',
  sessionId: string,
  turnId: string,
  replies: readonly DialogueV2SessionAssistantReply[],
): DialogueV2SessionTurnResult {
  return Object.freeze({ ok: true, kind, sessionId, turnId, replies });
}

function ledgerFailure(error: unknown): never {
  if (error instanceof DialogueV2SessionLedgerError) throw error;
  throw new DialogueV2SessionLedgerError('ledger_unavailable');
}

export function createDialogueV2SessionLedger(
  dependencies: DialogueV2SessionLedgerDependencies,
): Readonly<{
  createSession(
    actorInput: unknown,
    selectionInput: unknown,
  ): Promise<Readonly<{ sessionId: string; expiresAtMs: number }>>;
  runTurn(
    actorInput: unknown,
    requestInput: unknown,
    produceAssistant: DialogueV2ServerTurnProducer,
  ): Promise<DialogueV2SessionTurnResult>;
}> {
  const ownerBinding = (actor: DialogueV2SessionActor): string => {
    let binding: unknown;
    try {
      binding = dependencies.bindOwner(actor);
    } catch {
      throw new DialogueV2SessionLedgerError('ledger_unavailable');
    }
    if (typeof binding !== 'string' || !OWNER_BINDING_RE.test(binding)) {
      throw new DialogueV2SessionLedgerError('ledger_unavailable');
    }
    return binding;
  };

  const now = (): number => {
    let value: unknown;
    try {
      value = dependencies.nowMs();
    } catch {
      throw new DialogueV2SessionLedgerError('ledger_unavailable');
    }
    if (!safeInteger(value)) throw new DialogueV2SessionLedgerError('ledger_unavailable');
    return value;
  };

  const mutate = async (
    sessionId: string,
    transition: (record: DialogueV2SessionLedgerRecord) => DialogueV2SessionLedgerRecord,
  ): Promise<DialogueV2SessionLedgerRecord> => {
    let committed: unknown | null;
    try {
      committed = await dependencies.repository.mutate(sessionId, (stored) => {
        const record = exactLedgerRecord(stored);
        if (!record) throw new DialogueV2SessionLedgerError('ledger_unavailable');
        return transition(record);
      });
    } catch (error) {
      return ledgerFailure(error);
    }
    if (committed === null) throw new DialogueV2SessionLedgerError('session_not_found');
    const record = exactLedgerRecord(committed);
    if (!record) throw new DialogueV2SessionLedgerError('ledger_unavailable');
    return record;
  };

  const abandonClaim = async (
    input: TurnRequestDigestInput,
    claimToken: string,
  ): Promise<void> => {
    await mutate(input.sessionId, (record) => {
      const receipt = record.receipts.find((entry) => entry.turnId === input.turnId);
      if (!receipt || receipt.state !== 'pending' || receipt.claimToken !== claimToken) {
        return record;
      }
      return immutableRecord(record, {
        revision: record.revision + 1,
        turns: record.turns.filter((turn) => turn.turnId !== input.turnId),
        receipts: record.receipts.filter((entry) => entry.turnId !== input.turnId),
      });
    });
  };

  return Object.freeze({
    createSession: async (actorInput, selectionInput) => {
      const actor = exactActor(actorInput);
      const selection = exactSelection(selectionInput);
      if (!actor || !selection) throw new DialogueV2SessionLedgerError('request_invalid');
      const binding = ownerBinding(actor);
      const createdAtMs = now();

      for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
        let sessionId: unknown;
        try {
          sessionId = dependencies.generateSessionId();
        } catch {
          throw new DialogueV2SessionLedgerError('ledger_unavailable');
        }
        if (typeof sessionId !== 'string' || !SESSION_ID_RE.test(sessionId)) {
          throw new DialogueV2SessionLedgerError('ledger_unavailable');
        }
        const record: DialogueV2SessionLedgerRecord = Object.freeze({
          schemaVersion: 1,
          sessionId,
          ownerBinding: binding,
          studyTarget: selection.studyTarget,
          scenarioId: selection.scenarioId,
          createdAtMs,
          expiresAtMs: createdAtMs + DIALOGUE_V2_SESSION_TTL_MS,
          revision: 1,
          groupState: initialGroupState(),
          turns: Object.freeze([]),
          receipts: Object.freeze([]),
        });
        let stored: unknown | null;
        try {
          stored = await dependencies.repository.createIfAbsent(record);
        } catch (error) {
          return ledgerFailure(error);
        }
        if (stored === null) continue;
        const committed = exactLedgerRecord(stored);
        if (!committed) {
          throw new DialogueV2SessionLedgerError('ledger_unavailable');
        }
        if (committed.sessionId !== sessionId
          || committed.ownerBinding !== binding
          || committed.studyTarget !== selection.studyTarget
          || committed.scenarioId !== selection.scenarioId) {
          throw new DialogueV2SessionLedgerError('ledger_unavailable');
        }
        return Object.freeze({ sessionId, expiresAtMs: committed.expiresAtMs });
      }
      throw new DialogueV2SessionLedgerError('ledger_unavailable');
    },

    runTurn: async (actorInput, requestInput, produceAssistant) => {
      const actor = exactActor(actorInput);
      const input = exactTurnRequest(requestInput);
      if (!actor || !input || typeof produceAssistant !== 'function') {
        throw new DialogueV2SessionLedgerError('request_invalid');
      }
      const binding = ownerBinding(actor);
      const selection = Object.freeze({
        studyTarget: input.studyTarget,
        scenarioId: input.scenarioId,
      });
      let requestDigest: unknown;
      try {
        requestDigest = dependencies.digestTurnRequest(input);
      } catch {
        throw new DialogueV2SessionLedgerError('ledger_unavailable');
      }
      if (typeof requestDigest !== 'string' || !DIGEST_RE.test(requestDigest)) {
        throw new DialogueV2SessionLedgerError('ledger_unavailable');
      }
      let claimToken: unknown;
      try {
        claimToken = dependencies.generateClaimToken();
      } catch {
        throw new DialogueV2SessionLedgerError('ledger_unavailable');
      }
      if (typeof claimToken !== 'string' || !CLAIM_TOKEN_RE.test(claimToken)) {
        throw new DialogueV2SessionLedgerError('ledger_unavailable');
      }
      const observedNow = now();

      const claimed = await mutate(input.sessionId, (record) => {
        assertSessionAuthority(record, binding, selection, observedNow);
        const existing = record.receipts.find((receipt) => receipt.turnId === input.turnId);
        if (existing) {
          if (existing.requestDigest !== requestDigest) {
            throw new DialogueV2SessionLedgerError('turn_conflict');
          }
          if (existing.state === 'pending'
            && observedNow >= existing.claimExpiresAtMs) {
            return immutableRecord(record, {
              revision: record.revision + 1,
              receipts: record.receipts.map((receipt) => (
                receipt.turnId === input.turnId
                  ? Object.freeze({
                    ...receipt,
                    claimToken,
                    claimExpiresAtMs: Math.min(
                      observedNow + DIALOGUE_V2_SESSION_PENDING_CLAIM_TTL_MS,
                      record.expiresAtMs,
                    ),
                  })
                  : receipt
              )),
            });
          }
          return record;
        }
        if (record.receipts.length >= MAX_IDEMPOTENCY_RECEIPTS) {
          throw new DialogueV2SessionLedgerError('session_full');
        }
        const pending = record.receipts.find((receipt) => receipt.state === 'pending');
        if (pending && observedNow < pending.claimExpiresAtMs) {
          throw new DialogueV2SessionLedgerError('turn_in_progress');
        }
        const receipts = record.receipts.map((receipt) => (
          receipt.state === 'pending'
            ? Object.freeze({ ...receipt, state: 'evicted' as const })
            : receipt
        ));
        return immutableRecord(record, {
          revision: record.revision + 1,
          receipts: [...receipts, Object.freeze({
            turnId: input.turnId,
            requestDigest,
            claimToken,
            claimExpiresAtMs: Math.min(
              observedNow + DIALOGUE_V2_SESSION_PENDING_CLAIM_TTL_MS,
              record.expiresAtMs,
            ),
            state: 'pending' as const,
          })],
        });
      });

      const receipt = claimed.receipts.find((entry) => entry.turnId === input.turnId);
      if (!receipt || receipt.requestDigest !== requestDigest) {
        throw new DialogueV2SessionLedgerError('ledger_unavailable');
      }
      if (receipt.state === 'completed') {
        const turn = claimed.turns.find((entry) => entry.turnId === input.turnId);
        if (!turn?.assistantReplies) throw new DialogueV2SessionLedgerError('ledger_unavailable');
        return publicResult('replay', input.sessionId, input.turnId, turn.assistantReplies);
      }
      if (receipt.state === 'evicted') {
        throw new DialogueV2SessionLedgerError('turn_replay_expired');
      }
      if (receipt.claimToken !== claimToken) {
        throw new DialogueV2SessionLedgerError('turn_in_progress');
      }

      let replies: readonly DialogueV2SessionAssistantReply[];
      try {
        const generated = await produceAssistant(Object.freeze({
          ...input,
          sessionExpiresAtMs: claimed.expiresAtMs,
          groupState: claimed.groupState,
          priorTurns: claimed.turns,
        }));
        const sanitized = exactAssistantReplies(generated);
        if (!sanitized) {
          throw new DialogueV2SessionLedgerError('assistant_response_invalid');
        }
        replies = sanitized;
      } catch (error) {
        await abandonClaim(input, claimToken);
        if (error instanceof DialogueV2SessionLedgerError) throw error;
        throw new DialogueV2SessionLedgerError('turn_execution_failed');
      }

      let completed: DialogueV2SessionLedgerRecord;
      try {
        completed = await mutate(input.sessionId, (record) => {
          assertSessionAuthority(record, binding, selection, now());
          const currentReceipt = record.receipts.find((entry) => entry.turnId === input.turnId);
          if (!currentReceipt || currentReceipt.requestDigest !== requestDigest
            || currentReceipt.claimToken !== claimToken) {
            throw new DialogueV2SessionLedgerError('ledger_unavailable');
          }
          if (currentReceipt.state === 'completed') return record;
          if (currentReceipt.state !== 'pending') {
            throw new DialogueV2SessionLedgerError('ledger_unavailable');
          }
          const turns = [...record.turns, Object.freeze({
            turnId: input.turnId,
            userText: input.userText,
            assistantReplies: replies,
          })];
          const receipts = record.receipts.map((entry) => (
            entry.turnId === input.turnId
              ? Object.freeze({ ...entry, state: 'completed' as const })
              : entry
          ));
          const bounded = evictRawTurns(turns, receipts);
          return immutableRecord(record, {
            revision: record.revision + 1,
            groupState: advanceGroupState(record.groupState, replies),
            turns: bounded.turns,
            receipts: bounded.receipts,
          });
        });
      } catch {
        let reconciled: DialogueV2SessionLedgerRecord;
        try {
          reconciled = await mutate(input.sessionId, (record) => {
            if (record.ownerBinding !== binding) {
              throw new DialogueV2SessionLedgerError('access_denied');
            }
            if (record.studyTarget !== selection.studyTarget
              || record.scenarioId !== selection.scenarioId) {
              throw new DialogueV2SessionLedgerError('selection_mismatch');
            }
            const currentReceipt = record.receipts.find(
              (entry) => entry.turnId === input.turnId,
            );
            if (!currentReceipt || currentReceipt.requestDigest !== requestDigest
              || currentReceipt.claimToken !== claimToken) {
              throw new DialogueV2SessionLedgerError('ledger_unavailable');
            }
            if (currentReceipt.state === 'completed') return record;
            if (currentReceipt.state !== 'pending') {
              throw new DialogueV2SessionLedgerError('ledger_unavailable');
            }
            return immutableRecord(record, {
              revision: record.revision + 1,
              receipts: record.receipts.filter((entry) => entry.turnId !== input.turnId),
            });
          });
        } catch {
          throw new DialogueV2SessionLedgerError('completion_unknown');
        }
        const durableTurn = reconciled.turns.find(
          (turn) => turn.turnId === input.turnId,
        );
        if (durableTurn?.assistantReplies) {
          return publicResult(
            'new',
            input.sessionId,
            input.turnId,
            durableTurn.assistantReplies,
          );
        }
        throw new DialogueV2SessionLedgerError('completion_absent');
      }
      const completedTurn = completed.turns.find((turn) => turn.turnId === input.turnId);
      if (!completedTurn?.assistantReplies) {
        throw new DialogueV2SessionLedgerError('ledger_unavailable');
      }
      return publicResult('new', input.sessionId, input.turnId, completedTurn.assistantReplies);
    },
  });
}
