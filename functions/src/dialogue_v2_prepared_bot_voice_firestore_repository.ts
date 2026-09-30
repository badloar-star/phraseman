import { createHash } from 'node:crypto';

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
import type { DialogueV2BotVoiceDailyClaimState } from './dialogue_v2_bot_voice_daily_claim';
import {
  transitionDialogueV2PreparedBotVoiceSelection,
  type DialogueV2PreparedBotVoiceCommittedTurn,
  type DialogueV2PreparedBotVoiceSelection,
} from './dialogue_v2_prepared_bot_voice_selection';
import type { DialogueV2SessionActor } from './dialogue_v2_session_ledger';

const SESSION_COLLECTION = 'dialogue_v2_sessions';
const SESSION_TERMINAL_COLLECTION = 'dialogue_v2_session_terminals';
const AUTH_LINK_COLLECTION = 'auth_links';
const USER_COLLECTION = 'users';
const CLAIM_COLLECTION = 'dialogue_v2_bot_voice_claims';
const DAILY_DOCUMENT_ID = 'daily';
const STORED_SELECTION_SCHEMA_VERSION = 1;
const STORED_DAILY_SCHEMA_VERSION = 1;

const SESSION_ID_RE = /^d2s_[A-Za-z0-9_-]{32,96}$/;
const TURN_ID_RE = /^d2t_[A-Za-z0-9_-]{16,80}$/;
const IDENTITY_RE = /^(?=.{1,256}$)[^/\u0000-\u001f\u007f]+$/;
const OWNER_BINDING_RE = /^[A-Za-z0-9_-]{32,128}$/;
const UTC_DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const REQUEST_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const SHA256_RE = /^[a-f0-9]{64}$/;

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

export type DialogueV2PreparedBotVoiceFirestoreRuntime = Readonly<{
  db: FirestoreLike;
  nowMs(): number;
  bindOwner(actor: DialogueV2SessionActor): string;
  timestampFromMillis(millis: number): TimestampLike;
}>;

export type DialogueV2PreparedBotVoiceFirestoreRepository = Readonly<{
  selectAfterCommittedTurn(
    actor: DialogueV2SessionActor,
    committedTurn: DialogueV2PreparedBotVoiceCommittedTurn,
    serverCatalog: unknown,
  ): Promise<DialogueV2PreparedBotVoiceSelection | null>;
}>;

type StoredSessionTurn = Readonly<{
  turnId: string;
  assistantReplies: readonly Readonly<{ personaId: string; text: string }>[];
}>;

type StoredSessionAuthority = Readonly<{
  ownerBinding: string;
  studyTarget: string;
  scenarioId: string;
  expiresAtMs: number;
  turn: StoredSessionTurn;
}>;

function plainRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null
    ? value as Record<string, unknown>
    : null;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
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

function exactActor(value: unknown): DialogueV2SessionActor | null {
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

function turnDocumentId(sessionId: string, turnId: string): string {
  const digest = createHash('sha256')
    .update(sessionId, 'utf8')
    .update('\u0000')
    .update(turnId, 'utf8')
    .digest('hex');
  return `turn_${digest}`;
}

function safeOwnerBinding(runtime: DialogueV2PreparedBotVoiceFirestoreRuntime, actor: DialogueV2SessionActor): string {
  let ownerBinding: unknown;
  try {
    ownerBinding = runtime.bindOwner(actor);
  } catch {
    throw new Error('dialogue_v2_bot_voice_owner_binding_unavailable');
  }
  if (typeof ownerBinding !== 'string' || !OWNER_BINDING_RE.test(ownerBinding)) {
    throw new Error('dialogue_v2_bot_voice_owner_binding_unavailable');
  }
  return ownerBinding;
}

function safeNowMs(runtime: DialogueV2PreparedBotVoiceFirestoreRuntime): number {
  let nowMs: unknown;
  try {
    nowMs = runtime.nowMs();
  } catch {
    throw new Error('dialogue_v2_bot_voice_time_unavailable');
  }
  if (!Number.isSafeInteger(nowMs) || Number(nowMs) < 0) {
    throw new Error('dialogue_v2_bot_voice_time_unavailable');
  }
  return nowMs as number;
}

function assertActorOwnership(
  actor: DialogueV2SessionActor,
  authLinkSnapshot: SnapshotLike,
  userSnapshot: SnapshotLike,
): void {
  const authLink = plainRecord(authLinkSnapshot.data());
  const user = plainRecord(userSnapshot.data());
  const linkedAuth = plainRecord(user?.linkedAuth);
  const userOwnsStableAccount = user?.firebaseAuthUid === actor.authUid
    || linkedAuth?.providerUid === actor.authUid;
  if (!authLinkSnapshot.exists || authLink?.stable_id !== actor.stableAccountId
    || !userSnapshot.exists || !userOwnsStableAccount) {
    throw new Error('dialogue_v2_bot_voice_account_authority_invalid');
  }
}

function exactAssistantReplies(value: unknown): StoredSessionTurn['assistantReplies'] | null {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype
    || value.length < 1 || value.length > 2) return null;
  const replies: Readonly<{ personaId: string; text: string }>[] = [];
  for (const candidate of value) {
    const reply = plainRecord(candidate);
    if (!reply || !exactKeys(reply, ['personaId', 'text'])
      || typeof reply.personaId !== 'string'
      || typeof reply.text !== 'string') return null;
    replies.push(Object.freeze({ personaId: reply.personaId, text: reply.text }));
  }
  return Object.freeze(replies);
}

function decodeDurableSessionTurn(
  snapshot: SnapshotLike,
  committedTurn: DialogueV2PreparedBotVoiceCommittedTurn,
): StoredSessionAuthority {
  const session = plainRecord(snapshot.data());
  if (!snapshot.exists || !session
    || session.schemaVersion !== 1
    || session.sessionId !== committedTurn.sessionId
    || typeof session.ownerBinding !== 'string'
    || session.studyTarget !== committedTurn.studyTarget
    || session.scenarioId !== committedTurn.scenarioId
    || !Array.isArray(session.turns)
    || !Array.isArray(session.receipts)) {
    throw new Error('dialogue_v2_bot_voice_turn_not_durable');
  }
  const expiresAtMs = timestampMillis(session.expiresAt);
  const matchingTurns = session.turns.filter((candidate) => (
    plainRecord(candidate)?.turnId === committedTurn.turnId
  ));
  const matchingReceipts = session.receipts.filter((candidate) => (
    plainRecord(candidate)?.turnId === committedTurn.turnId
  ));
  if (!expiresAtMs || matchingTurns.length !== 1 || matchingReceipts.length !== 1
    || plainRecord(matchingReceipts[0])?.state !== 'completed') {
    throw new Error('dialogue_v2_bot_voice_turn_not_durable');
  }
  const storedTurn = plainRecord(matchingTurns[0]);
  const assistantReplies = exactAssistantReplies(storedTurn?.assistantReplies);
  if (!storedTurn || !assistantReplies
    || assistantReplies.length !== committedTurn.replies.length
    || assistantReplies.some((reply, index) => (
      reply.personaId !== committedTurn.replies[index]?.personaId
      || reply.text !== committedTurn.replies[index]?.text
    ))) {
    throw new Error('dialogue_v2_bot_voice_turn_not_durable');
  }
  return Object.freeze({
    ownerBinding: session.ownerBinding,
    studyTarget: session.studyTarget as string,
    scenarioId: session.scenarioId as string,
    expiresAtMs,
    turn: Object.freeze({
      turnId: committedTurn.turnId,
      assistantReplies,
    }),
  });
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
    || !Number.isSafeInteger(state.claimedCount)
    || (state.claimedRequestId !== null && typeof state.claimedRequestId !== 'string')
    || (typeof state.claimedRequestId === 'string' && !REQUEST_ID_RE.test(state.claimedRequestId))
    || (state.claimedOperationFingerprint !== null
      && (typeof state.claimedOperationFingerprint !== 'string'
        || !SHA256_RE.test(state.claimedOperationFingerprint)))) {
    throw new Error('dialogue_v2_bot_voice_storage_invalid');
  }
  return Object.freeze({
    dayKey: state.dayKey,
    claimedCount: state.claimedCount as number,
    claimedRequestId: state.claimedRequestId as string | null,
    claimedOperationFingerprint: state.claimedOperationFingerprint as string | null,
  });
}

function decodeStoredSelection(snapshot: SnapshotLike): Readonly<{
  selection: DialogueV2PreparedBotVoiceSelection;
  expiresAtMs: number;
}> | null {
  if (!snapshot.exists) return null;
  const stored = plainRecord(snapshot.data());
  const expiresAtMs = timestampMillis(stored?.expiresAt);
  if (!stored || !exactKeys(stored, ['schemaVersion', 'selection', 'expiresAt'])
    || stored.schemaVersion !== STORED_SELECTION_SCHEMA_VERSION
    || !expiresAtMs) {
    throw new Error('dialogue_v2_bot_voice_storage_invalid');
  }
  return Object.freeze({
    selection: stored.selection as DialogueV2PreparedBotVoiceSelection,
    expiresAtMs,
  });
}

/**
 * Server-only Firestore adapter. Every authority/fence read and both optional
 * writes share one transaction. Paths are derived from the stable account and
 * committed session/turn IDs; no client-provided selection or storage path is
 * accepted by this API.
 */
export function createDialogueV2PreparedBotVoiceFirestoreRepository(
  runtime: DialogueV2PreparedBotVoiceFirestoreRuntime,
): DialogueV2PreparedBotVoiceFirestoreRepository {
  return Object.freeze({
    selectAfterCommittedTurn: async (actorInput, committedTurn, serverCatalog) => {
      const actor = exactActor(actorInput);
      if (!actor
        || !SESSION_ID_RE.test(committedTurn.sessionId)
        || !TURN_ID_RE.test(committedTurn.turnId)) {
        throw new Error('dialogue_v2_bot_voice_request_invalid');
      }
      const nowMs = safeNowMs(runtime);
      const expectedOwnerBinding = safeOwnerBinding(runtime, actor);
      const sessionReference = runtime.db.collection(SESSION_COLLECTION).doc(committedTurn.sessionId);
      const terminalReference = runtime.db.collection(SESSION_TERMINAL_COLLECTION).doc(committedTurn.sessionId);
      const authLinkReference = runtime.db.collection(AUTH_LINK_COLLECTION).doc(actor.authUid);
      const userReference = runtime.db.collection(USER_COLLECTION).doc(actor.stableAccountId);
      const authMarkerReference = runtime.db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(actor.authUid);
      const authDenialReference = runtime.db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
        .doc(accountDeletePermanentDenialId(actor.authUid));
      const stableTombstoneReference = runtime.db.collection(ACCOUNT_DELETE_TOMBSTONES)
        .doc(actor.stableAccountId);
      const stableDenialReference = runtime.db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
        .doc(accountDeletePermanentDenialId(actor.stableAccountId));
      const claimCollection = runtime.db.collection(
        `${USER_COLLECTION}/${actor.stableAccountId}/${CLAIM_COLLECTION}`,
      );
      const dailyReference = claimCollection.doc(DAILY_DOCUMENT_ID);
      const turnReference = claimCollection.doc(
        turnDocumentId(committedTurn.sessionId, committedTurn.turnId),
      );

      return runtime.db.runTransaction(async (transaction) => {
        const [
          sessionSnapshot,
          terminalSnapshot,
          authLinkSnapshot,
          userSnapshot,
          authMarkerSnapshot,
          authDenialSnapshot,
          stableTombstoneSnapshot,
          stableDenialSnapshot,
          turnSelectionSnapshot,
          dailySnapshot,
        ] = await Promise.all([
          transaction.get(sessionReference),
          transaction.get(terminalReference),
          transaction.get(authLinkReference),
          transaction.get(userReference),
          transaction.get(authMarkerReference),
          transaction.get(authDenialReference),
          transaction.get(stableTombstoneReference),
          transaction.get(stableDenialReference),
          transaction.get(turnReference),
          transaction.get(dailyReference),
        ]);

        assertActorOwnership(actor, authLinkSnapshot, userSnapshot);
        assertAccountUsable(accountStateFromSnapshots({
          marker: authMarkerSnapshot as FirebaseFirestore.DocumentSnapshot,
          denial: authDenialSnapshot as FirebaseFirestore.DocumentSnapshot,
          subject: 'auth',
        }, nowMs));
        assertAccountUsable(accountStateFromSnapshots({
          marker: stableTombstoneSnapshot as FirebaseFirestore.DocumentSnapshot,
          denial: stableDenialSnapshot as FirebaseFirestore.DocumentSnapshot,
          subject: 'stable',
        }, nowMs));
        if (terminalSnapshot.exists) {
          throw new Error('dialogue_v2_bot_voice_session_terminal');
        }

        const session = decodeDurableSessionTurn(sessionSnapshot, committedTurn);
        if (session.ownerBinding !== expectedOwnerBinding || session.expiresAtMs <= nowMs) {
          throw new Error('dialogue_v2_bot_voice_session_authority_invalid');
        }
        const storedSelection = decodeStoredSelection(turnSelectionSnapshot);
        if (storedSelection && storedSelection.expiresAtMs !== session.expiresAtMs) {
          throw new Error('dialogue_v2_bot_voice_storage_invalid');
        }
        const dailyState = decodeDailyState(dailySnapshot);
        const transition = transitionDialogueV2PreparedBotVoiceSelection({
          nowMs,
          committedTurn,
          serverCatalog,
          existingTurnSelection: storedSelection?.selection ?? null,
          trustedDailyState: dailyState,
        });

        if (transition.kind === 'no_selection') return null;
        if (transition.kind === 'replay') {
          if (!storedSelection) {
            throw new Error('dialogue_v2_bot_voice_storage_invalid');
          }
          return transition.selection;
        }
        if (!transition.nextDailyState) {
          throw new Error('dialogue_v2_bot_voice_storage_invalid');
        }

        transaction.create(turnReference, {
          schemaVersion: STORED_SELECTION_SCHEMA_VERSION,
          selection: transition.selection,
          expiresAt: runtime.timestampFromMillis(session.expiresAtMs),
        });
        transaction.set(dailyReference, {
          schemaVersion: STORED_DAILY_SCHEMA_VERSION,
          state: transition.nextDailyState,
        });
        return transition.selection;
      });
    },
  });
}
