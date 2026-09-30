import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';

import {
  parseDialogueV2FreeformPreparedBotVoiceSelection,
  type DialogueV2FreeformPreparedBotVoiceSelection,
} from '../../shared/dialogue_v2_freeform_prepared_bot_voice_selection_contract';
import {
  validateDialogueV2FreeformPreparedBotVoiceCatalogRelease,
} from '../../shared/dialogue_v2_freeform_prepared_bot_voice_catalog';
import type { DialogueV2StudyTarget } from '../../shared/dialogue_v2_language_pack_contract';
import {
  assertAccountUsable,
  readAuthAccountStateInTx,
  readStableAccountStateInTx,
} from './account_gate';
import { resolveStableUidForAuthInTransaction } from './auth_identity';
import type { DialogueV2BotVoiceDailyClaimState } from './dialogue_v2_bot_voice_daily_claim';
import {
  transitionDialogueV2FreeformPreparedBotVoiceSelection,
  type DialogueV2FreeformPreparedBotVoiceCommittedTurn,
} from './dialogue_v2_freeform_prepared_bot_voice_selection';
import {
  DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE,
  type DialogueV2FreeformSessionActor,
} from './dialogue_v2_freeform_session_ledger';
import { resolvePremiumAccess } from './premium_status';

const resolveStableAccountInTransaction = resolveStableUidForAuthInTransaction;
const readAuthStateInTransaction = readAuthAccountStateInTx;
const readStableStateInTransaction = readStableAccountStateInTx;
const assertUsableAccount = assertAccountUsable;
const resolveServerPremiumAccess = resolvePremiumAccess;
const validateServerCatalog = validateDialogueV2FreeformPreparedBotVoiceCatalogRelease;
const parseStoredSelection = parseDialogueV2FreeformPreparedBotVoiceSelection;
const transitionSelection = transitionDialogueV2FreeformPreparedBotVoiceSelection;
const createSha256Hash = createHash;
const isProxyObject = nodeTypes.isProxy;
const freeformOwnerHmacNamespace = DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE;

const SESSION_COLLECTION = 'dialogue_v2_freeform_sessions';
const USER_COLLECTION = 'users';
const CLAIM_COLLECTION = 'dialogue_v2_bot_voice_claims';
const DAILY_DOCUMENT_ID = 'daily';
const STORED_DAILY_SCHEMA_VERSION = 1;
const STORED_SELECTION_SCHEMA_VERSION = 1;
const TRUSTED_COMPLETION_SCHEMA_VERSION = 1;

const AUTH_UID_RE = /^(?=.{1,128}$)[^/\u0000-\u001f\u007f]+$/;
const SESSION_ID_RE = /^d2fs_[A-Za-z0-9_-]{32,96}$/;
const TURN_ID_RE = /^d2ft_[A-Za-z0-9_-]{16,80}$/;
const OWNER_BINDING_RE = /^[A-Za-z0-9_-]{32,128}$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const REQUEST_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const UTC_DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const FREEFORM_STUDY_TARGETS = Object.freeze(['en', 'es', 'fr', 'de'] as const);
const MAX_ASSISTANT_MESSAGE_BYTES = 3_072;
const UNSAFE_TEXT_RE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u;

type PlainRecord = Record<string, unknown>;
type TimestampLike = Readonly<{ toMillis(): number }>;
type SnapshotLike = Readonly<{ exists: boolean; data(): unknown }>;

export type DialogueV2FreeformPreparedBotVoiceResolveRequest = Readonly<{
  sessionId: string;
  turnId: string;
  studyTarget: DialogueV2StudyTarget;
}>;

export type DialogueV2FreeformPreparedBotVoiceFirestoreRuntime = Readonly<{
  db: FirebaseFirestore.Firestore;
  nowMs(): number;
  bindOwner(input: Readonly<{
    namespace: typeof DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE;
    actor: DialogueV2FreeformSessionActor;
  }>): string;
  computeEligibilityHmac(material: string): string;
  timestampFromMillis(millis: number): TimestampLike;
  /** Server-owned release only. Production currently supplies null. */
  serverCatalog: unknown;
}>;

export type DialogueV2FreeformPreparedBotVoiceFirestoreRepository = Readonly<{
  resolveAfterCommittedTurn(
    authUid: string,
    request: DialogueV2FreeformPreparedBotVoiceResolveRequest,
  ): Promise<DialogueV2FreeformPreparedBotVoiceSelection | null>;
}>;

function plainRecord(value: unknown): PlainRecord | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) || isProxyObject(value)) {
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

function exactKeys(value: PlainRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function exactArray(value: unknown): unknown[] | null {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
  return [...value];
}

function timestampMillis(value: unknown): number | null {
  const timestamp = value as Partial<TimestampLike> | null;
  if (!timestamp || typeof timestamp.toMillis !== 'function') return null;
  try {
    const millis = timestamp.toMillis();
    return Number.isSafeInteger(millis) && millis > 0 ? millis : null;
  } catch {
    return null;
  }
}

function exactRequest(value: unknown): DialogueV2FreeformPreparedBotVoiceResolveRequest | null {
  const request = plainRecord(value);
  if (!request || !exactKeys(request, ['sessionId', 'turnId', 'studyTarget'])
    || typeof request.sessionId !== 'string' || !SESSION_ID_RE.test(request.sessionId)
    || typeof request.turnId !== 'string' || !TURN_ID_RE.test(request.turnId)
    || typeof request.studyTarget !== 'string'
    || !(FREEFORM_STUDY_TARGETS as readonly string[]).includes(request.studyTarget)) return null;
  return Object.freeze({
    sessionId: request.sessionId,
    turnId: request.turnId,
    studyTarget: request.studyTarget as DialogueV2StudyTarget,
  });
}

function canonicalAssistantMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const canonical = value.replace(/\r\n?/gu, '\n').normalize('NFC').trim();
  if (!canonical || canonical !== value || UNSAFE_TEXT_RE.test(canonical)) return null;
  return Buffer.byteLength(canonical, 'utf8') <= MAX_ASSISTANT_MESSAGE_BYTES
    ? canonical
    : null;
}

function safeNowMs(runtime: DialogueV2FreeformPreparedBotVoiceFirestoreRuntime): number {
  let nowMs: unknown;
  try {
    nowMs = runtime.nowMs();
  } catch {
    throw new Error('dialogue_v2_freeform_bot_voice_unavailable');
  }
  if (!Number.isSafeInteger(nowMs) || Number(nowMs) <= 0) {
    throw new Error('dialogue_v2_freeform_bot_voice_unavailable');
  }
  return nowMs as number;
}

function operationId(sessionId: string, turnId: string): string {
  return createSha256Hash('sha256')
    .update(sessionId, 'utf8')
    .update('\u0000')
    .update(turnId, 'utf8')
    .digest('hex');
}

function documentReadKey(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Readonly<{ kind?: unknown; id?: unknown; path?: unknown }>;
  if (typeof candidate.path !== 'string') return null;
  return candidate.kind === 'doc' || typeof candidate.id === 'string'
    ? candidate.path
    : null;
}

function memoizeDocumentReads(
  transaction: FirebaseFirestore.Transaction,
): FirebaseFirestore.Transaction {
  const reads = new Map<string, Promise<unknown>>();
  const memoizedGet = ((reference: unknown) => {
    const key = documentReadKey(reference);
    if (!key) return Reflect.apply(transaction.get, transaction, [reference]);
    const existing = reads.get(key);
    if (existing) return existing;
    const read = Reflect.apply(transaction.get, transaction, [reference]) as Promise<unknown>;
    reads.set(key, read);
    return read;
  }) as FirebaseFirestore.Transaction['get'];
  return new Proxy(transaction, {
    get: (target, property) => {
      if (property === 'get') return memoizedGet;
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

function safeOwnerBinding(
  runtime: DialogueV2FreeformPreparedBotVoiceFirestoreRuntime,
  actor: DialogueV2FreeformSessionActor,
): string {
  let binding: unknown;
  try {
    binding = runtime.bindOwner(Object.freeze({
      namespace: freeformOwnerHmacNamespace,
      actor,
    }));
  } catch {
    throw new Error('dialogue_v2_freeform_bot_voice_unavailable');
  }
  if (typeof binding !== 'string' || !OWNER_BINDING_RE.test(binding)) {
    throw new Error('dialogue_v2_freeform_bot_voice_unavailable');
  }
  return binding;
}

function decodeCompletedTurn(
  snapshot: SnapshotLike,
  request: DialogueV2FreeformPreparedBotVoiceResolveRequest,
  expectedOwnerBinding: string,
  nowMs: number,
): Readonly<{
  turn: DialogueV2FreeformPreparedBotVoiceCommittedTurn;
  expiresAtMs: number;
  createdAtMs: number;
}> {
  const session = plainRecord(snapshot.data());
  if (!snapshot.exists || !session || !exactKeys(session, [
    'schemaVersion', 'kind', 'sessionId', 'ownerBinding', 'studyTarget',
    'createdAt', 'expiresAt', 'revision', 'turns', 'receipts',
  ])
    || session.schemaVersion !== 1
    || session.kind !== 'dialogue_v2_plus_freeform'
    || session.sessionId !== request.sessionId
    || session.ownerBinding !== expectedOwnerBinding
    || session.studyTarget !== request.studyTarget
    || !Number.isSafeInteger(session.revision) || Number(session.revision) <= 0) {
    throw new Error('dialogue_v2_freeform_bot_voice_unavailable');
  }
  const createdAtMs = timestampMillis(session.createdAt);
  const expiresAtMs = timestampMillis(session.expiresAt);
  const turns = exactArray(session.turns);
  const receipts = exactArray(session.receipts);
  if (!createdAtMs || !expiresAtMs || createdAtMs >= expiresAtMs || nowMs >= expiresAtMs
    || !turns || !receipts) {
    throw new Error('dialogue_v2_freeform_bot_voice_unavailable');
  }
  const matchingTurns = turns.filter((candidate) => plainRecord(candidate)?.turnId === request.turnId);
  const matchingReceipts = receipts.filter((candidate) => (
    plainRecord(candidate)?.turnId === request.turnId
  ));
  if (matchingTurns.length !== 1 || matchingReceipts.length !== 1) {
    throw new Error('dialogue_v2_freeform_bot_voice_unavailable');
  }
  const turn = plainRecord(matchingTurns[0]);
  const receipt = plainRecord(matchingReceipts[0]);
  const assistantMessage = canonicalAssistantMessage(turn?.assistantMessage);
  if (!turn || !exactKeys(turn, ['turnId', 'userMessage', 'assistantMessage'])
    || !assistantMessage
    || !receipt || !exactKeys(receipt, [
      'turnId', 'requestDigest', 'claimToken', 'claimExpiresAtMs', 'state',
    ])
    || receipt.state !== 'completed') {
    throw new Error('dialogue_v2_freeform_bot_voice_unavailable');
  }
  return Object.freeze({
    turn: Object.freeze({
      sessionId: request.sessionId,
      turnId: request.turnId,
      studyTarget: request.studyTarget,
      assistantMessage,
      completedAtMs: null,
    }),
    expiresAtMs,
    createdAtMs,
  });
}

function decodeTrustedCompletion(
  snapshot: SnapshotLike,
  committed: Readonly<{
    turn: DialogueV2FreeformPreparedBotVoiceCommittedTurn;
    expiresAtMs: number;
    createdAtMs: number;
  }>,
  nowMs: number,
): number | null {
  if (!snapshot.exists) return null;
  const evidence = plainRecord(snapshot.data());
  const completedAtMs = timestampMillis(evidence?.completedAt);
  const evidenceExpiresAtMs = timestampMillis(evidence?.expiresAt);
  if (!evidence || !exactKeys(evidence, [
    'schemaVersion', 'sessionId', 'turnId', 'studyTarget', 'replyTextSha256',
    'completedAt', 'expiresAt',
  ])
    || evidence.schemaVersion !== TRUSTED_COMPLETION_SCHEMA_VERSION
    || evidence.sessionId !== committed.turn.sessionId
    || evidence.turnId !== committed.turn.turnId
    || evidence.studyTarget !== committed.turn.studyTarget
    || evidence.replyTextSha256 !== createSha256Hash('sha256')
      .update(committed.turn.assistantMessage, 'utf8').digest('hex')
    || !completedAtMs
    || evidenceExpiresAtMs !== committed.expiresAtMs
    || completedAtMs < committed.createdAtMs
    || completedAtMs > nowMs
    || completedAtMs >= committed.expiresAtMs) {
    throw new Error('dialogue_v2_freeform_bot_voice_unavailable');
  }
  return completedAtMs;
}

function decodeDailyState(snapshot: SnapshotLike): DialogueV2BotVoiceDailyClaimState | null {
  if (!snapshot.exists) return null;
  const stored = plainRecord(snapshot.data());
  const state = plainRecord(stored?.state);
  if (!stored || !exactKeys(stored, ['schemaVersion', 'state'])
    || stored.schemaVersion !== STORED_DAILY_SCHEMA_VERSION
    || !state || !exactKeys(state, [
      'dayKey', 'claimedCount', 'claimedRequestId', 'claimedOperationFingerprint',
    ])
    || typeof state.dayKey !== 'string' || !UTC_DAY_KEY_RE.test(state.dayKey)
    || new Date(`${state.dayKey}T00:00:00.000Z`).toISOString().slice(0, 10) !== state.dayKey
    || !Number.isSafeInteger(state.claimedCount)
    || (state.claimedCount !== 0 && state.claimedCount !== 1)
    || (state.claimedRequestId !== null
      && (typeof state.claimedRequestId !== 'string'
        || !REQUEST_ID_RE.test(state.claimedRequestId)))
    || (state.claimedOperationFingerprint !== null
      && (typeof state.claimedOperationFingerprint !== 'string'
        || !SHA256_RE.test(state.claimedOperationFingerprint)))
    || (state.claimedCount === 0
      && (state.claimedRequestId !== null || state.claimedOperationFingerprint !== null))
    || (state.claimedCount === 1
      && (state.claimedRequestId === null || state.claimedOperationFingerprint === null))) {
    throw new Error('dialogue_v2_freeform_bot_voice_unavailable');
  }
  return Object.freeze({
    dayKey: state.dayKey,
    claimedCount: state.claimedCount as number,
    claimedRequestId: state.claimedRequestId as string | null,
    claimedOperationFingerprint: state.claimedOperationFingerprint as string | null,
  });
}

function decodeStoredSelection(snapshot: SnapshotLike): Readonly<{
  selection: DialogueV2FreeformPreparedBotVoiceSelection;
  expiresAtMs: number;
}> | null {
  if (!snapshot.exists) return null;
  const stored = plainRecord(snapshot.data());
  const expiresAtMs = timestampMillis(stored?.expiresAt);
  const selection = parseStoredSelection(stored?.selection);
  if (!stored || !exactKeys(stored, ['schemaVersion', 'kind', 'selection', 'expiresAt'])
    || stored.schemaVersion !== STORED_SELECTION_SCHEMA_VERSION
    || stored.kind !== 'dialogue_v2_freeform_prepared_bot_voice_selection'
    || !selection || !expiresAtMs) {
    throw new Error('dialogue_v2_freeform_bot_voice_unavailable');
  }
  return Object.freeze({ selection, expiresAtMs });
}

/**
 * Server-only resolver repository. Canonical identity, deletion fences, Plus,
 * the exact completed turn, trusted completion evidence, replay selection and
 * the global daily slot are read and optionally written in one transaction.
 */
export function createDialogueV2FreeformPreparedBotVoiceFirestoreRepository(
  runtime: DialogueV2FreeformPreparedBotVoiceFirestoreRuntime,
): DialogueV2FreeformPreparedBotVoiceFirestoreRepository {
  let serverCatalog: unknown;
  try {
    serverCatalog = validateServerCatalog(runtime.serverCatalog);
  } catch {
    throw new Error('dialogue_v2_freeform_bot_voice_catalog_unavailable');
  }
  return Object.freeze({
    resolveAfterCommittedTurn: async (authUid, requestInput) => {
      const request = exactRequest(requestInput);
      if (typeof authUid !== 'string' || !AUTH_UID_RE.test(authUid) || !request) {
        throw new Error('dialogue_v2_freeform_bot_voice_request_invalid');
      }
      const nowMs = safeNowMs(runtime);
      try {
        return await runtime.db.runTransaction(async (rawTransaction) => {
          const transaction = memoizeDocumentReads(rawTransaction);
          const stableAccountId = await resolveStableAccountInTransaction(
            runtime.db,
            transaction,
            authUid,
          );
          const [authState, stableState] = await Promise.all([
            readAuthStateInTransaction(transaction, runtime.db, authUid, nowMs),
            readStableStateInTransaction(transaction, runtime.db, stableAccountId, nowMs),
          ]);
          assertUsableAccount(authState);
          assertUsableAccount(stableState);
          const isPlus = await resolveServerPremiumAccess(
            runtime.db,
            stableAccountId,
            nowMs,
            authUid,
            transaction,
          );
          if (isPlus !== true) throw new Error('plus_required');

          const actor = Object.freeze({ authUid, stableAccountId });
          const expectedOwnerBinding = safeOwnerBinding(runtime, actor);
          const digest = operationId(request.sessionId, request.turnId);
          const claimCollection = runtime.db.collection(
            `${USER_COLLECTION}/${stableAccountId}/${CLAIM_COLLECTION}`,
          );
          const sessionReference = runtime.db.collection(SESSION_COLLECTION).doc(request.sessionId);
          const completionReference = claimCollection.doc(`completion_${digest}`);
          const selectionReference = claimCollection.doc(`turn_${digest}`);
          const dailyReference = claimCollection.doc(DAILY_DOCUMENT_ID);
          const [sessionSnapshot, completionSnapshot, selectionSnapshot, dailySnapshot] = (
            await Promise.all([
              transaction.get(sessionReference),
              transaction.get(completionReference),
              transaction.get(selectionReference),
              transaction.get(dailyReference),
            ])
          ) as unknown as [SnapshotLike, SnapshotLike, SnapshotLike, SnapshotLike];

          const committed = decodeCompletedTurn(
            sessionSnapshot,
            request,
            expectedOwnerBinding,
            nowMs,
          );
          const completedAtMs = decodeTrustedCompletion(completionSnapshot, committed, nowMs);
          const storedSelection = decodeStoredSelection(selectionSnapshot);
          if (storedSelection && storedSelection.expiresAtMs !== committed.expiresAtMs) {
            throw new Error('dialogue_v2_freeform_bot_voice_unavailable');
          }
          const dailyState = decodeDailyState(dailySnapshot);
          const transition = transitionSelection({
            nowMs,
            committedTurn: Object.freeze({ ...committed.turn, completedAtMs }),
            serverCatalog,
            existingTurnSelection: storedSelection?.selection ?? null,
            trustedDailyState: dailyState,
            computeEligibilityHmac: runtime.computeEligibilityHmac,
          });
          if (transition.kind === 'no_selection') return null;
          if (transition.kind === 'replay') {
            if (!storedSelection) {
              throw new Error('dialogue_v2_freeform_bot_voice_unavailable');
            }
            return transition.selection;
          }
          if (!transition.nextDailyState) {
            throw new Error('dialogue_v2_freeform_bot_voice_unavailable');
          }
          transaction.create(selectionReference, {
            schemaVersion: STORED_SELECTION_SCHEMA_VERSION,
            kind: 'dialogue_v2_freeform_prepared_bot_voice_selection',
            selection: transition.selection,
            expiresAt: runtime.timestampFromMillis(committed.expiresAtMs),
          });
          transaction.set(dailyReference, {
            schemaVersion: STORED_DAILY_SCHEMA_VERSION,
            state: transition.nextDailyState,
          });
          return transition.selection;
        });
      } catch {
        throw new Error('dialogue_v2_freeform_bot_voice_unavailable');
      }
    },
  });
}
