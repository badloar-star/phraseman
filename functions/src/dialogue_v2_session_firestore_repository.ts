import {
  DialogueV2SessionLedgerError,
  type DialogueV2SessionGroupState,
  type DialogueV2SessionLedgerRecord,
  type DialogueV2SessionLedgerRepository,
} from './dialogue_v2_session_ledger';

const COLLECTION = 'dialogue_v2_sessions';
const PERSONA_ID_RE = /^(?=.{1,128}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

type DocumentReferenceLike = Readonly<{ path?: string }>;
type SnapshotLike = Readonly<{ exists: boolean; data(): unknown }>;
type TransactionLike = Readonly<{
  get(reference: DocumentReferenceLike): Promise<SnapshotLike>;
  create(reference: DocumentReferenceLike, value: Record<string, unknown>): void;
  set(reference: DocumentReferenceLike, value: Record<string, unknown>): void;
}>;
type FirestoreLike = Readonly<{
  collection(path: string): Readonly<{ doc(id: string): DocumentReferenceLike }>;
  runTransaction<T>(operation: (transaction: TransactionLike) => Promise<T>): Promise<T>;
}>;
type TimestampLike = Readonly<{ toMillis(): number }>;

export type DialogueV2FirestoreSessionRepositoryRuntime = Readonly<{
  db: FirestoreLike;
  timestampFromMillis(millis: number): TimestampLike;
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function timestampMillis(value: unknown): number | null {
  const candidate = value as Partial<TimestampLike> | null;
  if (!candidate || typeof candidate.toMillis !== 'function') return null;
  try {
    const millis = candidate.toMillis();
    return Number.isSafeInteger(millis) && millis > 0 ? millis : null;
  } catch {
    return null;
  }
}

function initialGroupState(): DialogueV2SessionGroupState {
  return Object.freeze({
    schemaVersion: 1,
    turnCount: 0,
    lastSpeakerId: null,
    relevanceByPersonaId: Object.freeze({}),
  });
}

function decodeGroupState(value: unknown): DialogueV2SessionGroupState | null {
  const state = record(value);
  if (!state || !exactKeys(state, [
    'schemaVersion', 'turnCount', 'lastSpeakerId', 'relevanceByPersonaId',
  ])
    || state.schemaVersion !== 1
    || !Number.isSafeInteger(state.turnCount)
    || Number(state.turnCount) < 0
    || Number(state.turnCount) > 64
    || (state.lastSpeakerId !== null
      && (typeof state.lastSpeakerId !== 'string'
        || !PERSONA_ID_RE.test(state.lastSpeakerId)))) return null;
  const rawRelevance = record(state.relevanceByPersonaId);
  if (!rawRelevance || Object.keys(rawRelevance).length > 6) return null;
  const relevanceByPersonaId: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const [personaId, relevance] of Object.entries(rawRelevance)) {
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
    turnCount: state.turnCount as number,
    lastSpeakerId: state.lastSpeakerId as string | null,
    relevanceByPersonaId: Object.freeze(relevanceByPersonaId),
  });
}

function decodeStoredSession(value: unknown): DialogueV2SessionLedgerRecord {
  const stored = record(value);
  const legacyExpected = [
    'schemaVersion', 'sessionId', 'ownerBinding', 'studyTarget', 'scenarioId',
    'createdAt', 'expiresAt', 'revision', 'turns', 'receipts',
  ];
  const currentExpected = [...legacyExpected, 'groupState'];
  if (!stored || (!exactKeys(stored, legacyExpected) && !exactKeys(stored, currentExpected))) {
    throw new Error('dialogue_v2_session_storage_invalid');
  }
  const createdAtMs = timestampMillis(stored.createdAt);
  const expiresAtMs = timestampMillis(stored.expiresAt);
  const groupState = Object.prototype.hasOwnProperty.call(stored, 'groupState')
    ? decodeGroupState(stored.groupState)
    : initialGroupState();
  if (!createdAtMs || !expiresAtMs
    || !groupState
    || stored.schemaVersion !== 1
    || typeof stored.sessionId !== 'string'
    || typeof stored.ownerBinding !== 'string'
    || typeof stored.studyTarget !== 'string'
    || typeof stored.scenarioId !== 'string'
    || !Number.isSafeInteger(stored.revision)
    || !Array.isArray(stored.turns)
    || !Array.isArray(stored.receipts)) {
    throw new Error('dialogue_v2_session_storage_invalid');
  }
  return {
    schemaVersion: 1,
    sessionId: stored.sessionId,
    ownerBinding: stored.ownerBinding,
    studyTarget: stored.studyTarget as DialogueV2SessionLedgerRecord['studyTarget'],
    scenarioId: stored.scenarioId,
    createdAtMs,
    expiresAtMs,
    revision: stored.revision as number,
    groupState,
    turns: stored.turns as DialogueV2SessionLedgerRecord['turns'],
    receipts: stored.receipts as DialogueV2SessionLedgerRecord['receipts'],
  };
}

function encodeStoredSession(
  recordValue: DialogueV2SessionLedgerRecord,
  timestampFromMillis: DialogueV2FirestoreSessionRepositoryRuntime['timestampFromMillis'],
): Record<string, unknown> {
  return {
    schemaVersion: recordValue.schemaVersion,
    sessionId: recordValue.sessionId,
    ownerBinding: recordValue.ownerBinding,
    studyTarget: recordValue.studyTarget,
    scenarioId: recordValue.scenarioId,
    createdAt: timestampFromMillis(recordValue.createdAtMs),
    expiresAt: timestampFromMillis(recordValue.expiresAtMs),
    revision: recordValue.revision,
    groupState: recordValue.groupState,
    turns: recordValue.turns,
    receipts: recordValue.receipts,
  };
}

export function createDialogueV2FirestoreSessionRepository(
  runtime: DialogueV2FirestoreSessionRepositoryRuntime,
): DialogueV2SessionLedgerRepository {
  return Object.freeze({
    createIfAbsent: async (ledgerRecord) => {
      const reference = runtime.db.collection(COLLECTION).doc(ledgerRecord.sessionId);
      return runtime.db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (snapshot.exists) return null;
        transaction.create(
          reference,
          encodeStoredSession(ledgerRecord, runtime.timestampFromMillis),
        );
        return ledgerRecord;
      });
    },
    mutate: async (sessionId, transition) => {
      const reference = runtime.db.collection(COLLECTION).doc(sessionId);
      const terminalReference = runtime.db.collection('dialogue_v2_session_terminals').doc(sessionId);
      return runtime.db.runTransaction(async (transaction) => {
        const [snapshot, terminalSnapshot] = await Promise.all([
          transaction.get(reference),
          transaction.get(terminalReference),
        ]);
        if (!snapshot.exists) return null;
        if (terminalSnapshot.exists) {
          throw new DialogueV2SessionLedgerError('session_completed');
        }
        const current = decodeStoredSession(snapshot.data());
        const next = transition(current);
        transaction.set(reference, encodeStoredSession(next, runtime.timestampFromMillis));
        return next;
      });
    },
  });
}
