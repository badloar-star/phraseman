import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';

import {
  DIALOGUE_V2_FREEFORM_MAX_USER_MESSAGE_BYTES,
} from '../../shared/dialogue_v2_freeform_session_contract';
import {
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2StudyTarget,
} from '../../shared/dialogue_v2_language_pack_contract';
import {
  accountStateFromSnapshots,
  assertAccountUsable,
} from './account_gate';
import {
  ACCOUNT_DELETE_AUTH_MARKERS,
  ACCOUNT_DELETE_PERMANENT_DENIALS,
  ACCOUNT_DELETE_TOMBSTONES,
  accountDeletePermanentDenialId,
} from './account_delete_job';
import {
  DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE,
  DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_BYTES,
  DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_TURNS,
  DIALOGUE_V2_FREEFORM_SESSION_TTL_MS,
  DialogueV2FreeformSessionLedgerError,
  type DialogueV2FreeformSessionActor,
  type DialogueV2FreeformSessionLedgerRecord,
  type DialogueV2FreeformSessionLedgerRepository,
} from './dialogue_v2_freeform_session_ledger';

const COLLECTION = 'dialogue_v2_freeform_sessions';
const AUTH_LINK_COLLECTION = 'auth_links';
const USER_COLLECTION = 'users';
const BOT_VOICE_CLAIM_COLLECTION = 'dialogue_v2_bot_voice_claims';
const COMPLETION_EVIDENCE_SCHEMA_VERSION = 1;
const MAX_IDEMPOTENCY_RECEIPTS = 64;
const MAX_ASSISTANT_MESSAGE_BYTES = 3_072;

const SESSION_ID_RE = /^d2fs_[A-Za-z0-9_-]{32,96}$/;
const TURN_ID_RE = /^d2ft_[A-Za-z0-9_-]{16,80}$/;
const CLAIM_TOKEN_RE = /^d2fc_[A-Za-z0-9_-]{32,96}$/;
const IDENTITY_RE = /^(?=.{1,256}$)[^/\u0000-\u001f\u007f]+$/;
const OWNER_BINDING_RE = /^[A-Za-z0-9_-]{32,128}$/;
const DIGEST_RE = /^[a-f0-9]{64}$/;
const UNSAFE_TEXT_RE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u;
const createSha256Hash = createHash;
const isProxyObject = nodeTypes.isProxy;
const freeformMaxUserMessageBytes = DIALOGUE_V2_FREEFORM_MAX_USER_MESSAGE_BYTES;
const freeformStudyTargets = Object.freeze([...DIALOGUE_V2_STUDY_TARGETS]);
const freeformOwnerHmacNamespace = DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE;
const freeformSessionMaxRawBytes = DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_BYTES;
const freeformSessionMaxRawTurns = DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_TURNS;
const freeformSessionTtlMs = DIALOGUE_V2_FREEFORM_SESSION_TTL_MS;
const FreeformSessionLedgerError = DialogueV2FreeformSessionLedgerError;

type DocumentReferenceLike = Readonly<{ path?: string }>;
type SnapshotLike = Readonly<{ exists: boolean; data(): unknown }>;
export type DialogueV2FreeformSessionFirestoreTransaction = Readonly<{
  get(reference: DocumentReferenceLike): Promise<SnapshotLike>;
  create(reference: DocumentReferenceLike, value: Record<string, unknown>): void;
  set(reference: DocumentReferenceLike, value: Record<string, unknown>): void;
}>;
type FirestoreLike = Readonly<{
  collection(path: string): Readonly<{ doc(id: string): DocumentReferenceLike }>;
  runTransaction<T>(operation: (
    transaction: DialogueV2FreeformSessionFirestoreTransaction,
  ) => Promise<T>): Promise<T>;
}>;
type TimestampLike = Readonly<{ toMillis(): number }>;

type OwnerBindingInput = Readonly<{
  namespace: typeof DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE;
  actor: DialogueV2FreeformSessionActor;
}>;

export type DialogueV2FreeformSessionFirestoreRuntime = Readonly<{
  db: FirestoreLike;
  nowMs(): number;
  bindOwner(input: OwnerBindingInput): string;
  timestampFromMillis(millis: number): TimestampLike;
}>;

export type DialogueV2FreeformAuthorizedStartAccess = () => Readonly<{
  actor: DialogueV2FreeformSessionActor;
  transaction: FirebaseFirestore.Transaction;
  nowMs: number;
}>;

export type DialogueV2FreeformAuthorizedTurnAccess = DialogueV2FreeformAuthorizedStartAccess;

type PlainRecord = Record<string, unknown>;

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
    const copy: PlainRecord = Object.create(null) as PlainRecord;
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (!descriptor?.enumerable || !('value' in descriptor)) return null;
      copy[key] = descriptor.value;
    }
    return copy;
  } catch {
    return null;
  }
}

function exactKeys(value: PlainRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function exactArray(value: unknown): readonly unknown[] | null {
  if (!Array.isArray(value) || isProxyObject(value)
    || Object.getPrototypeOf(value) !== Array.prototype) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value) as unknown as PropertyDescriptorMap;
  const keys = Reflect.ownKeys(descriptors);
  const lengthDescriptor = descriptors.length;
  if (!lengthDescriptor || !('value' in lengthDescriptor)
    || keys.some((key) => typeof key !== 'string')
    || keys.length !== value.length + 1) return null;
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor?.enumerable || !('value' in descriptor)) return null;
    result.push(descriptor.value);
  }
  return result;
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

function positiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function canonicalText(value: unknown, maxBytes: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\r\n?/gu, '\n').normalize('NFC').trim();
  if (!normalized || normalized !== value || UNSAFE_TEXT_RE.test(normalized)) return null;
  return Buffer.byteLength(normalized, 'utf8') <= maxBytes ? normalized : null;
}

function exactActor(value: unknown): DialogueV2FreeformSessionActor | null {
  const actor = plainRecord(value);
  if (!actor || !exactKeys(actor, ['authUid', 'stableAccountId'])
    || typeof actor.authUid !== 'string' || !IDENTITY_RE.test(actor.authUid)
    || typeof actor.stableAccountId !== 'string' || !IDENTITY_RE.test(actor.stableAccountId)) {
    return null;
  }
  return Object.freeze({
    authUid: actor.authUid,
    stableAccountId: actor.stableAccountId,
  });
}

function exactStudyTarget(value: unknown): DialogueV2StudyTarget | null {
  return typeof value === 'string'
    && (freeformStudyTargets as readonly string[]).includes(value)
    ? value as DialogueV2StudyTarget
    : null;
}

function exactTurn(value: unknown): DialogueV2FreeformSessionLedgerRecord['turns'][number] | null {
  const turn = plainRecord(value);
  if (!turn || !exactKeys(turn, ['turnId', 'userMessage', 'assistantMessage'])
    || typeof turn.turnId !== 'string' || !TURN_ID_RE.test(turn.turnId)) return null;
  const userMessage = canonicalText(
    turn.userMessage,
    freeformMaxUserMessageBytes,
  );
  const assistantMessage = canonicalText(turn.assistantMessage, MAX_ASSISTANT_MESSAGE_BYTES);
  return userMessage && assistantMessage
    ? Object.freeze({ turnId: turn.turnId, userMessage, assistantMessage })
    : null;
}

function exactReceipt(
  value: unknown,
): DialogueV2FreeformSessionLedgerRecord['receipts'][number] | null {
  const receipt = plainRecord(value);
  if (!receipt || !exactKeys(receipt, [
    'turnId', 'requestDigest', 'claimToken', 'claimExpiresAtMs', 'state',
  ])
    || typeof receipt.turnId !== 'string' || !TURN_ID_RE.test(receipt.turnId)
    || typeof receipt.requestDigest !== 'string' || !DIGEST_RE.test(receipt.requestDigest)
    || typeof receipt.claimToken !== 'string' || !CLAIM_TOKEN_RE.test(receipt.claimToken)
    || !positiveSafeInteger(receipt.claimExpiresAtMs)
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

function decodeLogicalRecord(
  value: unknown,
  timestamps: 'millis' | 'firestore',
): DialogueV2FreeformSessionLedgerRecord | null {
  const stored = plainRecord(value);
  const expected = timestamps === 'millis'
    ? [
      'schemaVersion', 'kind', 'sessionId', 'ownerBinding', 'studyTarget',
      'createdAtMs', 'expiresAtMs', 'revision', 'turns', 'receipts',
    ]
    : [
      'schemaVersion', 'kind', 'sessionId', 'ownerBinding', 'studyTarget',
      'createdAt', 'expiresAt', 'revision', 'turns', 'receipts',
    ];
  if (!stored || !exactKeys(stored, expected)
    || stored.schemaVersion !== 1
    || stored.kind !== 'dialogue_v2_plus_freeform'
    || typeof stored.sessionId !== 'string' || !SESSION_ID_RE.test(stored.sessionId)
    || typeof stored.ownerBinding !== 'string' || !OWNER_BINDING_RE.test(stored.ownerBinding)
    || !positiveSafeInteger(stored.revision)) return null;
  const studyTarget = exactStudyTarget(stored.studyTarget);
  const createdAtMs = timestamps === 'millis'
    ? (positiveSafeInteger(stored.createdAtMs) ? stored.createdAtMs : null)
    : timestampMillis(stored.createdAt);
  const expiresAtMs = timestamps === 'millis'
    ? (positiveSafeInteger(stored.expiresAtMs) ? stored.expiresAtMs : null)
    : timestampMillis(stored.expiresAt);
  const rawTurns = exactArray(stored.turns);
  const rawReceipts = exactArray(stored.receipts);
  if (!studyTarget || !createdAtMs || !expiresAtMs
    || expiresAtMs !== createdAtMs + freeformSessionTtlMs
    || !rawTurns || !rawReceipts
    || rawTurns.length > freeformSessionMaxRawTurns
    || rawReceipts.length > MAX_IDEMPOTENCY_RECEIPTS) return null;

  const turns: DialogueV2FreeformSessionLedgerRecord['turns'][number][] = [];
  const turnIds = new Set<string>();
  for (const candidate of rawTurns) {
    const turn = exactTurn(candidate);
    if (!turn || turnIds.has(turn.turnId)) return null;
    turns.push(turn);
    turnIds.add(turn.turnId);
  }
  if (Buffer.byteLength(JSON.stringify(turns), 'utf8')
    > freeformSessionMaxRawBytes) return null;

  const receipts: DialogueV2FreeformSessionLedgerRecord['receipts'][number][] = [];
  const receiptIds = new Set<string>();
  for (const candidate of rawReceipts) {
    const receipt = exactReceipt(candidate);
    if (!receipt || receiptIds.has(receipt.turnId)) return null;
    receipts.push(receipt);
    receiptIds.add(receipt.turnId);
  }
  for (const turn of turns) {
    if (!receipts.some((receipt) => (
      receipt.turnId === turn.turnId && receipt.state === 'completed'
    ))) return null;
  }
  for (const receipt of receipts) {
    const hasTurn = turnIds.has(receipt.turnId);
    if (receipt.state === 'completed' ? !hasTurn : hasTurn) return null;
  }

  return Object.freeze({
    schemaVersion: 1,
    kind: 'dialogue_v2_plus_freeform',
    sessionId: stored.sessionId,
    ownerBinding: stored.ownerBinding,
    studyTarget,
    createdAtMs,
    expiresAtMs,
    revision: stored.revision,
    turns: Object.freeze(turns),
    receipts: Object.freeze(receipts),
  });
}

function encodeStoredRecord(
  value: DialogueV2FreeformSessionLedgerRecord,
  timestampFromMillis: DialogueV2FreeformSessionFirestoreRuntime['timestampFromMillis'],
): Record<string, unknown> {
  return {
    schemaVersion: value.schemaVersion,
    kind: value.kind,
    sessionId: value.sessionId,
    ownerBinding: value.ownerBinding,
    studyTarget: value.studyTarget,
    createdAt: timestampFromMillis(value.createdAtMs),
    expiresAt: timestampFromMillis(value.expiresAtMs),
    revision: value.revision,
    turns: value.turns,
    receipts: value.receipts,
  };
}

type TrustedCompletionEvidence = Readonly<{
  schemaVersion: 1;
  sessionId: string;
  turnId: string;
  studyTarget: DialogueV2StudyTarget;
  replyTextSha256: string;
  completedAtMs: number;
  expiresAtMs: number;
}>;

function sha256(value: string): string {
  return createSha256Hash('sha256').update(value, 'utf8').digest('hex');
}

function completionEvidenceDocumentId(sessionId: string, turnId: string): string {
  const operationId = createSha256Hash('sha256')
    .update(sessionId, 'utf8')
    .update('\u0000')
    .update(turnId, 'utf8')
    .digest('hex');
  return `completion_${operationId}`;
}

function newlyCompletedTurnEvidence(
  current: DialogueV2FreeformSessionLedgerRecord,
  next: DialogueV2FreeformSessionLedgerRecord,
  completedAtMs: number,
): TrustedCompletionEvidence | null {
  const transitions = next.receipts.filter((nextReceipt) => {
    const currentReceipt = current.receipts.find((receipt) => (
      receipt.turnId === nextReceipt.turnId
    ));
    return currentReceipt?.state === 'pending' && nextReceipt.state === 'completed';
  });
  if (transitions.length === 0) return null;
  if (transitions.length !== 1
    || completedAtMs < current.createdAtMs
    || completedAtMs >= current.expiresAtMs) {
    throw new Error('dialogue_v2_freeform_completion_evidence_conflict');
  }
  const receipt = transitions[0];
  const turn = next.turns.find((candidate) => candidate.turnId === receipt.turnId);
  if (!turn || current.turns.some((candidate) => candidate.turnId === receipt.turnId)) {
    throw new Error('dialogue_v2_freeform_completion_evidence_conflict');
  }
  return Object.freeze({
    schemaVersion: COMPLETION_EVIDENCE_SCHEMA_VERSION,
    sessionId: current.sessionId,
    turnId: turn.turnId,
    studyTarget: current.studyTarget,
    replyTextSha256: sha256(turn.assistantMessage),
    completedAtMs,
    expiresAtMs: current.expiresAtMs,
  });
}

function decodeStoredCompletionEvidence(value: unknown): TrustedCompletionEvidence | null {
  const stored = plainRecord(value);
  if (!stored || !exactKeys(stored, [
    'schemaVersion', 'sessionId', 'turnId', 'studyTarget', 'replyTextSha256',
    'completedAt', 'expiresAt',
  ])
    || stored.schemaVersion !== COMPLETION_EVIDENCE_SCHEMA_VERSION
    || typeof stored.sessionId !== 'string' || !SESSION_ID_RE.test(stored.sessionId)
    || typeof stored.turnId !== 'string' || !TURN_ID_RE.test(stored.turnId)
    || typeof stored.replyTextSha256 !== 'string' || !DIGEST_RE.test(stored.replyTextSha256)) {
    return null;
  }
  const studyTarget = exactStudyTarget(stored.studyTarget);
  const completedAtMs = timestampMillis(stored.completedAt);
  const expiresAtMs = timestampMillis(stored.expiresAt);
  if (!studyTarget || !completedAtMs || !expiresAtMs
    || completedAtMs >= expiresAtMs) return null;
  return Object.freeze({
    schemaVersion: COMPLETION_EVIDENCE_SCHEMA_VERSION,
    sessionId: stored.sessionId,
    turnId: stored.turnId,
    studyTarget,
    replyTextSha256: stored.replyTextSha256,
    completedAtMs,
    expiresAtMs,
  });
}

function sameCompletionEvidence(
  left: TrustedCompletionEvidence,
  right: TrustedCompletionEvidence,
): boolean {
  return left.schemaVersion === right.schemaVersion
    && left.sessionId === right.sessionId
    && left.turnId === right.turnId
    && left.studyTarget === right.studyTarget
    && left.replyTextSha256 === right.replyTextSha256
    && left.completedAtMs === right.completedAtMs
    && left.expiresAtMs === right.expiresAtMs;
}

function encodeStoredCompletionEvidence(
  evidence: TrustedCompletionEvidence,
  timestampFromMillis: DialogueV2FreeformSessionFirestoreRuntime['timestampFromMillis'],
): Record<string, unknown> {
  return {
    schemaVersion: evidence.schemaVersion,
    sessionId: evidence.sessionId,
    turnId: evidence.turnId,
    studyTarget: evidence.studyTarget,
    replyTextSha256: evidence.replyTextSha256,
    completedAt: timestampFromMillis(evidence.completedAtMs),
    expiresAt: timestampFromMillis(evidence.expiresAtMs),
  };
}

function safeNowMs(runtime: DialogueV2FreeformSessionFirestoreRuntime): number {
  let value: unknown;
  try {
    value = runtime.nowMs();
  } catch {
    throw new Error('dialogue_v2_freeform_repository_time_unavailable');
  }
  if (!positiveSafeInteger(value)) {
    throw new Error('dialogue_v2_freeform_repository_time_unavailable');
  }
  return value;
}

function safeOwnerBinding(
  runtime: DialogueV2FreeformSessionFirestoreRuntime,
  actor: DialogueV2FreeformSessionActor,
): string {
  let value: unknown;
  try {
    value = runtime.bindOwner(Object.freeze({
      namespace: freeformOwnerHmacNamespace,
      actor,
    }));
  } catch {
    throw new Error('dialogue_v2_freeform_repository_owner_unavailable');
  }
  if (typeof value !== 'string' || !OWNER_BINDING_RE.test(value)) {
    throw new Error('dialogue_v2_freeform_repository_owner_unavailable');
  }
  return value;
}

function assertCanonicalOwnership(
  actor: DialogueV2FreeformSessionActor,
  authLinkSnapshot: SnapshotLike,
  userSnapshot: SnapshotLike,
): void {
  const authLink = plainRecord(authLinkSnapshot.data());
  const user = plainRecord(userSnapshot.data());
  const linkedAuth = plainRecord(user?.linkedAuth);
  const ownsStableAccount = user?.firebaseAuthUid === actor.authUid
    || linkedAuth?.providerUid === actor.authUid;
  if (!authLinkSnapshot.exists || authLink?.stable_id !== actor.stableAccountId
    || !userSnapshot.exists || !ownsStableAccount) {
    throw new FreeformSessionLedgerError('access_denied');
  }
}

function sameLogicalRecord(
  left: DialogueV2FreeformSessionLedgerRecord,
  right: DialogueV2FreeformSessionLedgerRecord,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertImmutableIdentity(
  current: DialogueV2FreeformSessionLedgerRecord,
  next: DialogueV2FreeformSessionLedgerRecord,
): void {
  if (next.schemaVersion !== current.schemaVersion
    || next.kind !== current.kind
    || next.sessionId !== current.sessionId
    || next.ownerBinding !== current.ownerBinding
    || next.studyTarget !== current.studyTarget
    || next.createdAtMs !== current.createdAtMs
    || next.expiresAtMs !== current.expiresAtMs
    || (next.revision !== current.revision && next.revision !== current.revision + 1)
    || (next.revision === current.revision && !sameLogicalRecord(current, next))) {
    throw new Error('dialogue_v2_freeform_storage_invalid');
  }
}

/**
 * Actor-scoped, server-only repository for the separate Plus freeform ledger.
 * The actor is supplied by trusted server code, while every transaction still
 * re-reads the canonical auth bridge, owner and deletion fences. Only opaque
 * session IDs are accepted; storage paths are constructed internally.
 */
export function createDialogueV2FreeformSessionFirestoreRepository(
  runtime: DialogueV2FreeformSessionFirestoreRuntime,
  actorInput: unknown,
): DialogueV2FreeformSessionLedgerRepository {
  const actor = exactActor(actorInput);
  if (!actor) throw new Error('dialogue_v2_freeform_repository_request_invalid');

  const authorityReferences = () => Object.freeze({
    authLink: runtime.db.collection(AUTH_LINK_COLLECTION).doc(actor.authUid),
    user: runtime.db.collection(USER_COLLECTION).doc(actor.stableAccountId),
    authMarker: runtime.db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(actor.authUid),
    authDenial: runtime.db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
      .doc(accountDeletePermanentDenialId(actor.authUid)),
    stableTombstone: runtime.db.collection(ACCOUNT_DELETE_TOMBSTONES)
      .doc(actor.stableAccountId),
    stableDenial: runtime.db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
      .doc(accountDeletePermanentDenialId(actor.stableAccountId)),
  });

  const assertTransactionAuthority = (
    snapshots: Readonly<{
      authLink: SnapshotLike;
      user: SnapshotLike;
      authMarker: SnapshotLike;
      authDenial: SnapshotLike;
      stableTombstone: SnapshotLike;
      stableDenial: SnapshotLike;
    }>,
    nowMs: number,
  ): void => {
    assertCanonicalOwnership(actor, snapshots.authLink, snapshots.user);
    assertAccountUsable(accountStateFromSnapshots({
      marker: snapshots.authMarker as FirebaseFirestore.DocumentSnapshot,
      denial: snapshots.authDenial as FirebaseFirestore.DocumentSnapshot,
      subject: 'auth',
    }, nowMs));
    assertAccountUsable(accountStateFromSnapshots({
      marker: snapshots.stableTombstone as FirebaseFirestore.DocumentSnapshot,
      denial: snapshots.stableDenial as FirebaseFirestore.DocumentSnapshot,
      subject: 'stable',
    }, nowMs));
  };

  return Object.freeze({
    createIfAbsent: async (recordInput) => {
      const record = decodeLogicalRecord(recordInput, 'millis');
      if (!record) throw new Error('dialogue_v2_freeform_repository_request_invalid');
      const expectedOwnerBinding = safeOwnerBinding(runtime, actor);
      if (record.ownerBinding !== expectedOwnerBinding) {
        throw new FreeformSessionLedgerError('access_denied');
      }
      const nowMs = safeNowMs(runtime);
      if (nowMs >= record.expiresAtMs) {
        throw new FreeformSessionLedgerError('session_expired');
      }
      const sessionReference = runtime.db.collection(COLLECTION).doc(record.sessionId);
      const refs = authorityReferences();
      return runtime.db.runTransaction(async (transaction) => {
        const [
          sessionSnapshot,
          authLinkSnapshot,
          userSnapshot,
          authMarkerSnapshot,
          authDenialSnapshot,
          stableTombstoneSnapshot,
          stableDenialSnapshot,
        ] = await Promise.all([
          transaction.get(sessionReference),
          transaction.get(refs.authLink),
          transaction.get(refs.user),
          transaction.get(refs.authMarker),
          transaction.get(refs.authDenial),
          transaction.get(refs.stableTombstone),
          transaction.get(refs.stableDenial),
        ]);
        assertTransactionAuthority({
          authLink: authLinkSnapshot,
          user: userSnapshot,
          authMarker: authMarkerSnapshot,
          authDenial: authDenialSnapshot,
          stableTombstone: stableTombstoneSnapshot,
          stableDenial: stableDenialSnapshot,
        }, nowMs);
        if (sessionSnapshot.exists) return null;
        transaction.create(
          sessionReference,
          encodeStoredRecord(record, runtime.timestampFromMillis),
        );
        return record;
      });
    },

    mutate: async (sessionId, transition) => {
      if (!SESSION_ID_RE.test(sessionId) || typeof transition !== 'function') {
        throw new Error('dialogue_v2_freeform_repository_request_invalid');
      }
      const expectedOwnerBinding = safeOwnerBinding(runtime, actor);
      const nowMs = safeNowMs(runtime);
      const sessionReference = runtime.db.collection(COLLECTION).doc(sessionId);
      const refs = authorityReferences();
      return runtime.db.runTransaction(async (transaction) => {
        const [
          sessionSnapshot,
          authLinkSnapshot,
          userSnapshot,
          authMarkerSnapshot,
          authDenialSnapshot,
          stableTombstoneSnapshot,
          stableDenialSnapshot,
        ] = await Promise.all([
          transaction.get(sessionReference),
          transaction.get(refs.authLink),
          transaction.get(refs.user),
          transaction.get(refs.authMarker),
          transaction.get(refs.authDenial),
          transaction.get(refs.stableTombstone),
          transaction.get(refs.stableDenial),
        ]);
        assertTransactionAuthority({
          authLink: authLinkSnapshot,
          user: userSnapshot,
          authMarker: authMarkerSnapshot,
          authDenial: authDenialSnapshot,
          stableTombstone: stableTombstoneSnapshot,
          stableDenial: stableDenialSnapshot,
        }, nowMs);
        if (!sessionSnapshot.exists) return null;
        const current = decodeLogicalRecord(sessionSnapshot.data(), 'firestore');
        if (!current || current.sessionId !== sessionId) {
          throw new Error('dialogue_v2_freeform_storage_invalid');
        }
        if (current.ownerBinding !== expectedOwnerBinding) {
          throw new FreeformSessionLedgerError('access_denied');
        }
        if (nowMs >= current.expiresAtMs) {
          throw new FreeformSessionLedgerError('session_expired');
        }
        const next = decodeLogicalRecord(transition(current), 'millis');
        if (!next) throw new Error('dialogue_v2_freeform_storage_invalid');
        assertImmutableIdentity(current, next);
        if (next.revision === current.revision) return current;
        transaction.set(
          sessionReference,
          encodeStoredRecord(next, runtime.timestampFromMillis),
        );
        return next;
      });
    },
  });
}

/**
 * Transaction-scoped start-only repository. The capability can only be issued
 * by the production authorization adapter after identity, deletion and Plus
 * checks pass in this exact transaction. Unlike the standalone repository it
 * therefore reads only the new opaque session id before creating it. It has no
 * mutation surface and is never exported by the Cloud Functions index.
 */
export function createDialogueV2FreeformAuthorizedStartRepository(
  runtime: DialogueV2FreeformSessionFirestoreRuntime,
  requireAuthorization: DialogueV2FreeformAuthorizedStartAccess,
): DialogueV2FreeformSessionLedgerRepository {
  if (typeof requireAuthorization !== 'function') {
    throw new Error('dialogue_v2_freeform_repository_authorization_required');
  }
  const initialAuthorization = requireAuthorization();
  const actor = exactActor(initialAuthorization.actor);
  if (!actor || !positiveSafeInteger(initialAuthorization.nowMs)) {
    throw new Error('dialogue_v2_freeform_repository_authorization_required');
  }
  const expectedOwnerBinding = safeOwnerBinding(runtime, actor);

  return Object.freeze({
    createIfAbsent: async (recordInput) => {
      const activeAuthorization = requireAuthorization();
      const record = decodeLogicalRecord(recordInput, 'millis');
      if (!record
        || record.createdAtMs !== activeAuthorization.nowMs
        || record.ownerBinding !== expectedOwnerBinding) {
        throw new Error('dialogue_v2_freeform_repository_request_invalid');
      }
      const sessionReference = runtime.db.collection(COLLECTION).doc(record.sessionId);
      const firestoreReference = sessionReference as FirebaseFirestore.DocumentReference;
      const sessionSnapshot = await activeAuthorization.transaction.get(firestoreReference);
      if (sessionSnapshot.exists) return null;
      activeAuthorization.transaction.create(
        firestoreReference,
        encodeStoredRecord(record, runtime.timestampFromMillis),
      );
      return record;
    },
    mutate: async () => {
      requireAuthorization();
      throw new Error('dialogue_v2_freeform_repository_authorization_required');
    },
  });
}

/**
 * Single-mutation repository bound to the exact transaction in which stable
 * identity, deletion fences and Plus entitlement were just rechecked. A fresh
 * instance is required for every ledger mutation so no capability or
 * Firestore transaction can escape the authorization callback.
 */
export function createDialogueV2FreeformAuthorizedTurnRepository(
  runtime: DialogueV2FreeformSessionFirestoreRuntime,
  requireAuthorization: DialogueV2FreeformAuthorizedTurnAccess,
): DialogueV2FreeformSessionLedgerRepository {
  if (typeof requireAuthorization !== 'function') {
    throw new Error('dialogue_v2_freeform_repository_authorization_required');
  }
  const initialAuthorization = requireAuthorization();
  const actor = exactActor(initialAuthorization.actor);
  if (!actor || !positiveSafeInteger(initialAuthorization.nowMs)) {
    throw new Error('dialogue_v2_freeform_repository_authorization_required');
  }
  const expectedOwnerBinding = safeOwnerBinding(runtime, actor);
  let used = false;

  return Object.freeze({
    createIfAbsent: async () => {
      requireAuthorization();
      throw new Error('dialogue_v2_freeform_repository_authorization_required');
    },
    mutate: async (sessionId, transition) => {
      const activeAuthorization = requireAuthorization();
      if (used || !SESSION_ID_RE.test(sessionId) || typeof transition !== 'function') {
        throw new Error('dialogue_v2_freeform_repository_request_invalid');
      }
      used = true;
      const sessionReference = runtime.db.collection(COLLECTION).doc(sessionId);
      const firestoreReference = sessionReference as FirebaseFirestore.DocumentReference;
      const sessionSnapshot = await activeAuthorization.transaction.get(firestoreReference);
      if (!sessionSnapshot.exists) return null;
      const current = decodeLogicalRecord(sessionSnapshot.data(), 'firestore');
      if (!current || current.sessionId !== sessionId) {
        throw new Error('dialogue_v2_freeform_storage_invalid');
      }
      if (current.ownerBinding !== expectedOwnerBinding) {
        throw new FreeformSessionLedgerError('access_denied');
      }
      if (activeAuthorization.nowMs >= current.expiresAtMs) {
        throw new FreeformSessionLedgerError('session_expired');
      }
      const next = decodeLogicalRecord(transition(current), 'millis');
      if (!next) throw new Error('dialogue_v2_freeform_storage_invalid');
      assertImmutableIdentity(current, next);
      if (next.revision === current.revision) return current;
      const completionEvidence = newlyCompletedTurnEvidence(
        current,
        next,
        activeAuthorization.nowMs,
      );
      let completionReference: FirebaseFirestore.DocumentReference | null = null;
      let createCompletionEvidence = false;
      let encodedCompletionEvidence: Record<string, unknown> | null = null;
      if (completionEvidence) {
        completionReference = runtime.db.collection(
          `${USER_COLLECTION}/${actor.stableAccountId}/${BOT_VOICE_CLAIM_COLLECTION}`,
        ).doc(completionEvidenceDocumentId(
          completionEvidence.sessionId,
          completionEvidence.turnId,
        )) as FirebaseFirestore.DocumentReference;
        const completionSnapshot = await activeAuthorization.transaction.get(
          completionReference,
        );
        if (completionSnapshot.exists) {
          const storedEvidence = decodeStoredCompletionEvidence(completionSnapshot.data());
          if (!storedEvidence || !sameCompletionEvidence(storedEvidence, completionEvidence)) {
            throw new Error('dialogue_v2_freeform_completion_evidence_conflict');
          }
        } else {
          createCompletionEvidence = true;
          encodedCompletionEvidence = encodeStoredCompletionEvidence(
            completionEvidence,
            runtime.timestampFromMillis,
          );
        }
      }
      if (createCompletionEvidence && completionReference && encodedCompletionEvidence) {
        activeAuthorization.transaction.create(
          completionReference,
          encodedCompletionEvidence,
        );
      }
      activeAuthorization.transaction.set(
        firestoreReference,
        encodeStoredRecord(next, runtime.timestampFromMillis),
      );
      return next;
    },
  });
}
