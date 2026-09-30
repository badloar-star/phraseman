import { types as nodeTypes } from 'node:util';

import {
  DIALOGUE_V2_FREEFORM_MAX_USER_MESSAGE_BYTES,
  parseDialogueV2FreeformSessionStartShape,
  parseDialogueV2FreeformSessionTurnShape,
  type DialogueV2FreeformSessionStart,
  type DialogueV2FreeformSessionTurn,
} from '../../shared/dialogue_v2_freeform_session_contract';
import type { DialogueV2StudyTarget } from '../../shared/dialogue_v2_language_pack_contract';

export const DIALOGUE_V2_FREEFORM_SESSION_TTL_MS = 24 * 60 * 60 * 1_000;
export const DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_TURNS = 8;
export const DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_BYTES = 12 * 1_024;
export const DIALOGUE_V2_FREEFORM_SESSION_PENDING_CLAIM_TTL_MS = 60_000;
export const DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE =
  'dialogue_v2_plus_freeform_owner_v1' as const;
export const DIALOGUE_V2_FREEFORM_TURN_HMAC_NAMESPACE =
  'dialogue_v2_plus_freeform_turn_v1' as const;

const MAX_IDEMPOTENCY_RECEIPTS = 64;
const MAX_ASSISTANT_MESSAGE_BYTES = 3_072;
const MAX_CREATE_ATTEMPTS = 3;
const SESSION_ID_RE = /^d2fs_[A-Za-z0-9_-]{32,96}$/;
const TURN_ID_RE = /^d2ft_[A-Za-z0-9_-]{16,80}$/;
const CLAIM_TOKEN_RE = /^d2fc_[A-Za-z0-9_-]{32,96}$/;
const IDENTITY_RE = /^(?=.{1,256}$)[^/\u0000-\u001f\u007f]+$/;
const OWNER_BINDING_RE = /^[A-Za-z0-9_-]{32,128}$/;
const DIGEST_RE = /^[a-f0-9]{64}$/;
const UNSAFE_TEXT_RE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u;

type PlainRecord = Record<string, unknown>;

export type DialogueV2FreeformSessionActor = Readonly<{
  authUid: string;
  stableAccountId: string;
}>;

export type DialogueV2FreeformServerConversationTurn = Readonly<{
  turnId: string;
  userMessage: string;
  assistantMessage: string;
}>;

type TurnReceipt = Readonly<{
  turnId: string;
  requestDigest: string;
  claimToken: string;
  claimExpiresAtMs: number;
  state: 'pending' | 'completed' | 'evicted';
}>;

export type DialogueV2FreeformSessionLedgerRecord = Readonly<{
  schemaVersion: 1;
  kind: 'dialogue_v2_plus_freeform';
  sessionId: string;
  ownerBinding: string;
  studyTarget: DialogueV2StudyTarget;
  createdAtMs: number;
  expiresAtMs: number;
  revision: number;
  turns: readonly DialogueV2FreeformServerConversationTurn[];
  receipts: readonly TurnReceipt[];
}>;

export type DialogueV2FreeformSessionLedgerRepository = Readonly<{
  createIfAbsent(record: DialogueV2FreeformSessionLedgerRecord): Promise<unknown | null>;
  mutate(
    sessionId: string,
    transition: (stored: unknown) => DialogueV2FreeformSessionLedgerRecord,
  ): Promise<unknown | null>;
}>;

type OwnerBindingInput = Readonly<{
  namespace: typeof DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE;
  actor: DialogueV2FreeformSessionActor;
}>;

type TurnDigestInput = Readonly<{
  namespace: typeof DIALOGUE_V2_FREEFORM_TURN_HMAC_NAMESPACE;
  request: DialogueV2FreeformSessionTurn;
}>;

export type DialogueV2FreeformSessionLedgerDependencies = Readonly<{
  repository: DialogueV2FreeformSessionLedgerRepository;
  nowMs(): number;
  generateSessionId(): string;
  generateClaimToken(): string;
  bindOwner(input: OwnerBindingInput): string;
  digestTurnRequest(input: TurnDigestInput): string;
}>;

export type DialogueV2FreeformServerTurnInput = DialogueV2FreeformSessionTurn & Readonly<{
  sessionExpiresAtMs: number;
  priorTurns: readonly DialogueV2FreeformServerConversationTurn[];
}>;

export type DialogueV2FreeformServerTurnProducer = (
  input: DialogueV2FreeformServerTurnInput,
) => Promise<unknown>;

export type DialogueV2FreeformSessionTurnResult = Readonly<{
  ok: true;
  kind: 'new' | 'replay';
  sessionId: string;
  turnId: string;
  assistantMessage: string;
  expiresAtMs: number;
}>;

export type DialogueV2FreeformSessionLedgerErrorCode =
  | 'request_invalid'
  | 'ledger_unavailable'
  | 'session_not_found'
  | 'session_expired'
  | 'access_denied'
  | 'selection_mismatch'
  | 'turn_conflict'
  | 'turn_in_progress'
  | 'turn_replay_expired'
  | 'session_full'
  | 'assistant_response_invalid'
  | 'turn_execution_failed'
  | 'commit_absent'
  | 'commit_unknown';

export class DialogueV2FreeformSessionLedgerError extends Error {
  constructor(readonly code: DialogueV2FreeformSessionLedgerErrorCode) {
    super(code);
    this.name = 'DialogueV2FreeformSessionLedgerError';
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

function positiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function exactActor(value: unknown): DialogueV2FreeformSessionActor | null {
  const actor = exactPlainRecord(value);
  if (!actor || !hasExactKeys(actor, ['authUid', 'stableAccountId'])
    || typeof actor.authUid !== 'string' || !IDENTITY_RE.test(actor.authUid)
    || typeof actor.stableAccountId !== 'string' || !IDENTITY_RE.test(actor.stableAccountId)) {
    return null;
  }
  return Object.freeze({
    authUid: actor.authUid,
    stableAccountId: actor.stableAccountId,
  });
}

/** Authoritative Node trust boundary; portable shared shape parsing is not one. */
function parseStartAtServerBoundary(value: unknown): DialogueV2FreeformSessionStart | null {
  if (nodeTypes.isProxy(value)) return null;
  return parseDialogueV2FreeformSessionStartShape(value);
}

/** Authoritative Node trust boundary; portable shared shape parsing is not one. */
function parseTurnAtServerBoundary(value: unknown): DialogueV2FreeformSessionTurn | null {
  if (nodeTypes.isProxy(value)) return null;
  return parseDialogueV2FreeformSessionTurnShape(value);
}

function canonicalText(value: unknown, maxBytes: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\r\n?/gu, '\n').normalize('NFC').trim();
  if (!normalized || normalized !== value || UNSAFE_TEXT_RE.test(normalized)) return null;
  return Buffer.byteLength(normalized, 'utf8') <= maxBytes ? normalized : null;
}

function exactStoredTurn(value: unknown): DialogueV2FreeformServerConversationTurn | null {
  const turn = exactPlainRecord(value);
  if (!turn || !hasExactKeys(turn, ['turnId', 'userMessage', 'assistantMessage'])
    || typeof turn.turnId !== 'string' || !TURN_ID_RE.test(turn.turnId)) return null;
  const userMessage = canonicalText(
    turn.userMessage,
    DIALOGUE_V2_FREEFORM_MAX_USER_MESSAGE_BYTES,
  );
  const assistantMessage = canonicalText(turn.assistantMessage, MAX_ASSISTANT_MESSAGE_BYTES);
  if (!userMessage || !assistantMessage) return null;
  return Object.freeze({ turnId: turn.turnId, userMessage, assistantMessage });
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

function rawTurnsBytes(turns: readonly DialogueV2FreeformServerConversationTurn[]): number {
  return Buffer.byteLength(JSON.stringify(turns), 'utf8');
}

function exactLedgerRecord(value: unknown): DialogueV2FreeformSessionLedgerRecord | null {
  const record = exactPlainRecord(value);
  if (!record || !hasExactKeys(record, [
    'schemaVersion', 'kind', 'sessionId', 'ownerBinding', 'studyTarget',
    'createdAtMs', 'expiresAtMs', 'revision', 'turns', 'receipts',
  ])
    || record.schemaVersion !== 1
    || record.kind !== 'dialogue_v2_plus_freeform'
    || typeof record.sessionId !== 'string' || !SESSION_ID_RE.test(record.sessionId)
    || typeof record.ownerBinding !== 'string' || !OWNER_BINDING_RE.test(record.ownerBinding)
    || !parseDialogueV2FreeformSessionStartShape({ studyTarget: record.studyTarget })
    || !positiveSafeInteger(record.createdAtMs)
    || !positiveSafeInteger(record.expiresAtMs)
    || record.expiresAtMs !== record.createdAtMs + DIALOGUE_V2_FREEFORM_SESSION_TTL_MS
    || !positiveSafeInteger(record.revision)
    || !Array.isArray(record.turns) || Object.getPrototypeOf(record.turns) !== Array.prototype
    || !Array.isArray(record.receipts) || Object.getPrototypeOf(record.receipts) !== Array.prototype
    || record.turns.length > DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_TURNS
    || record.receipts.length > MAX_IDEMPOTENCY_RECEIPTS) return null;

  const turns: DialogueV2FreeformServerConversationTurn[] = [];
  const turnIds = new Set<string>();
  for (const candidate of record.turns) {
    const turn = exactStoredTurn(candidate);
    if (!turn || turnIds.has(turn.turnId)) return null;
    turns.push(turn);
    turnIds.add(turn.turnId);
  }
  if (rawTurnsBytes(turns) > DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_BYTES) return null;

  const receipts: TurnReceipt[] = [];
  const receiptIds = new Set<string>();
  for (const candidate of record.receipts) {
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
    sessionId: record.sessionId,
    ownerBinding: record.ownerBinding,
    studyTarget: record.studyTarget as DialogueV2StudyTarget,
    createdAtMs: record.createdAtMs,
    expiresAtMs: record.expiresAtMs,
    revision: record.revision,
    turns: Object.freeze(turns),
    receipts: Object.freeze(receipts),
  });
}

function immutableRecord(
  record: DialogueV2FreeformSessionLedgerRecord,
  changes: Partial<Pick<DialogueV2FreeformSessionLedgerRecord, 'revision' | 'turns' | 'receipts'>>,
): DialogueV2FreeformSessionLedgerRecord {
  return Object.freeze({
    ...record,
    ...changes,
    turns: Object.freeze([...(changes.turns ?? record.turns)]),
    receipts: Object.freeze([...(changes.receipts ?? record.receipts)]),
  });
}

function evictRawTurns(
  turnsInput: readonly DialogueV2FreeformServerConversationTurn[],
  receiptsInput: readonly TurnReceipt[],
): Readonly<{
  turns: readonly DialogueV2FreeformServerConversationTurn[];
  receipts: readonly TurnReceipt[];
}> {
  const turns = [...turnsInput];
  const receipts = [...receiptsInput];
  while (turns.length > DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_TURNS
    || rawTurnsBytes(turns) > DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_BYTES) {
    const evicted = turns.shift();
    if (!evicted) throw new DialogueV2FreeformSessionLedgerError('session_full');
    const index = receipts.findIndex((receipt) => receipt.turnId === evicted.turnId);
    if (index < 0) throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
    receipts[index] = Object.freeze({ ...receipts[index], state: 'evicted' });
  }
  return Object.freeze({
    turns: Object.freeze(turns),
    receipts: Object.freeze(receipts),
  });
}

function assertAuthority(
  record: DialogueV2FreeformSessionLedgerRecord,
  ownerBinding: string,
  studyTarget: DialogueV2StudyTarget,
  nowMs: number,
): void {
  if (record.ownerBinding !== ownerBinding) {
    throw new DialogueV2FreeformSessionLedgerError('access_denied');
  }
  if (record.studyTarget !== studyTarget) {
    throw new DialogueV2FreeformSessionLedgerError('selection_mismatch');
  }
  if (nowMs >= record.expiresAtMs) {
    throw new DialogueV2FreeformSessionLedgerError('session_expired');
  }
}

function ledgerFailure(error: unknown): never {
  if (error instanceof DialogueV2FreeformSessionLedgerError) throw error;
  throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
}

function publicResult(
  kind: 'new' | 'replay',
  input: DialogueV2FreeformSessionTurn,
  assistantMessage: string,
  expiresAtMs: number,
): DialogueV2FreeformSessionTurnResult {
  return Object.freeze({
    ok: true,
    kind,
    sessionId: input.sessionId,
    turnId: input.turnId,
    assistantMessage,
    expiresAtMs,
  });
}

export function createDialogueV2FreeformSessionLedger(
  dependencies: DialogueV2FreeformSessionLedgerDependencies,
): Readonly<{
  createSession(
    actorInput: unknown,
    startInput: unknown,
  ): Promise<Readonly<{ sessionId: string; expiresAtMs: number }>>;
  runTurn(
    actorInput: unknown,
    requestInput: unknown,
    produceAssistant: DialogueV2FreeformServerTurnProducer,
  ): Promise<DialogueV2FreeformSessionTurnResult>;
}> {
  const ownerBinding = (actor: DialogueV2FreeformSessionActor): string => {
    let binding: unknown;
    try {
      binding = dependencies.bindOwner(Object.freeze({
        namespace: DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE,
        actor,
      }));
    } catch {
      throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
    }
    if (typeof binding !== 'string' || !OWNER_BINDING_RE.test(binding)) {
      throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
    }
    return binding;
  };

  const now = (): number => {
    let value: unknown;
    try {
      value = dependencies.nowMs();
    } catch {
      throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
    }
    if (!positiveSafeInteger(value)) {
      throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
    }
    return value;
  };

  const mutate = async (
    sessionId: string,
    transition: (
      record: DialogueV2FreeformSessionLedgerRecord,
    ) => DialogueV2FreeformSessionLedgerRecord,
  ): Promise<DialogueV2FreeformSessionLedgerRecord> => {
    let committed: unknown | null;
    try {
      committed = await dependencies.repository.mutate(sessionId, (stored) => {
        const record = exactLedgerRecord(stored);
        if (!record) throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
        return transition(record);
      });
    } catch (error) {
      return ledgerFailure(error);
    }
    if (committed === null) throw new DialogueV2FreeformSessionLedgerError('session_not_found');
    const record = exactLedgerRecord(committed);
    if (!record) throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
    return record;
  };

  const abandonClaim = async (
    input: DialogueV2FreeformSessionTurn,
    claimToken: string,
  ): Promise<void> => {
    await mutate(input.sessionId, (record) => {
      const receipt = record.receipts.find((entry) => entry.turnId === input.turnId);
      if (!receipt || receipt.state !== 'pending' || receipt.claimToken !== claimToken) {
        return record;
      }
      return immutableRecord(record, {
        revision: record.revision + 1,
        receipts: record.receipts.filter((entry) => entry.turnId !== input.turnId),
      });
    });
  };

  return Object.freeze({
    createSession: async (actorInput, startInput) => {
      const actor = exactActor(actorInput);
      const start = parseStartAtServerBoundary(startInput);
      if (!actor || !start) {
        throw new DialogueV2FreeformSessionLedgerError('request_invalid');
      }
      const binding = ownerBinding(actor);
      const createdAtMs = now();
      for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
        let sessionId: unknown;
        try {
          sessionId = dependencies.generateSessionId();
        } catch {
          throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
        }
        if (typeof sessionId !== 'string' || !SESSION_ID_RE.test(sessionId)) {
          throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
        }
        const record: DialogueV2FreeformSessionLedgerRecord = Object.freeze({
          schemaVersion: 1,
          kind: 'dialogue_v2_plus_freeform',
          sessionId,
          ownerBinding: binding,
          studyTarget: start.studyTarget,
          createdAtMs,
          expiresAtMs: createdAtMs + DIALOGUE_V2_FREEFORM_SESSION_TTL_MS,
          revision: 1,
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
        if (!committed
          || committed.sessionId !== sessionId
          || committed.ownerBinding !== binding
          || committed.studyTarget !== start.studyTarget) {
          throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
        }
        return Object.freeze({ sessionId, expiresAtMs: committed.expiresAtMs });
      }
      throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
    },

    runTurn: async (actorInput, requestInput, produceAssistant) => {
      const actor = exactActor(actorInput);
      const input = parseTurnAtServerBoundary(requestInput);
      if (!actor || !input || typeof produceAssistant !== 'function') {
        throw new DialogueV2FreeformSessionLedgerError('request_invalid');
      }
      const binding = ownerBinding(actor);
      let requestDigest: unknown;
      try {
        requestDigest = dependencies.digestTurnRequest(Object.freeze({
          namespace: DIALOGUE_V2_FREEFORM_TURN_HMAC_NAMESPACE,
          request: input,
        }));
      } catch {
        throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
      }
      if (typeof requestDigest !== 'string' || !DIGEST_RE.test(requestDigest)) {
        throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
      }
      let claimToken: unknown;
      try {
        claimToken = dependencies.generateClaimToken();
      } catch {
        throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
      }
      if (typeof claimToken !== 'string' || !CLAIM_TOKEN_RE.test(claimToken)) {
        throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
      }
      const observedNow = now();
      const claimed = await mutate(input.sessionId, (record) => {
        assertAuthority(record, binding, input.studyTarget, observedNow);
        const existing = record.receipts.find((receipt) => receipt.turnId === input.turnId);
        if (existing) {
          if (existing.requestDigest !== requestDigest) {
            throw new DialogueV2FreeformSessionLedgerError('turn_conflict');
          }
          if (existing.state === 'pending' && observedNow >= existing.claimExpiresAtMs) {
            return immutableRecord(record, {
              revision: record.revision + 1,
              receipts: record.receipts.map((receipt) => (
                receipt.turnId === input.turnId
                  ? Object.freeze({
                    ...receipt,
                    claimToken,
                    claimExpiresAtMs: Math.min(
                      observedNow + DIALOGUE_V2_FREEFORM_SESSION_PENDING_CLAIM_TTL_MS,
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
          throw new DialogueV2FreeformSessionLedgerError('session_full');
        }
        const pending = record.receipts.find((receipt) => receipt.state === 'pending');
        if (pending && observedNow < pending.claimExpiresAtMs) {
          throw new DialogueV2FreeformSessionLedgerError('turn_in_progress');
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
              observedNow + DIALOGUE_V2_FREEFORM_SESSION_PENDING_CLAIM_TTL_MS,
              record.expiresAtMs,
            ),
            state: 'pending' as const,
          })],
        });
      });

      const receipt = claimed.receipts.find((entry) => entry.turnId === input.turnId);
      if (!receipt || receipt.requestDigest !== requestDigest) {
        throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
      }
      if (receipt.state === 'completed') {
        const turn = claimed.turns.find((entry) => entry.turnId === input.turnId);
        if (!turn) throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
        return publicResult('replay', input, turn.assistantMessage, claimed.expiresAtMs);
      }
      if (receipt.state === 'evicted') {
        throw new DialogueV2FreeformSessionLedgerError('turn_replay_expired');
      }
      if (receipt.claimToken !== claimToken) {
        throw new DialogueV2FreeformSessionLedgerError('turn_in_progress');
      }

      let assistantMessage: string;
      try {
        const generated = await produceAssistant(Object.freeze({
          ...input,
          sessionExpiresAtMs: claimed.expiresAtMs,
          priorTurns: claimed.turns,
        }));
        const sanitized = canonicalText(generated, MAX_ASSISTANT_MESSAGE_BYTES);
        if (!sanitized) {
          throw new DialogueV2FreeformSessionLedgerError('assistant_response_invalid');
        }
        assistantMessage = sanitized;
      } catch (error) {
        await abandonClaim(input, claimToken);
        if (error instanceof DialogueV2FreeformSessionLedgerError) throw error;
        throw new DialogueV2FreeformSessionLedgerError('turn_execution_failed');
      }

      let completed: DialogueV2FreeformSessionLedgerRecord;
      try {
        completed = await mutate(input.sessionId, (record) => {
          assertAuthority(record, binding, input.studyTarget, now());
          const current = record.receipts.find((entry) => entry.turnId === input.turnId);
          if (!current || current.requestDigest !== requestDigest
            || current.claimToken !== claimToken) {
            throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
          }
          if (current.state === 'completed') return record;
          if (current.state !== 'pending') {
            throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
          }
          const turns = [...record.turns, Object.freeze({
            turnId: input.turnId,
            userMessage: input.userMessage,
            assistantMessage,
          })];
          const receipts = record.receipts.map((entry) => (
            entry.turnId === input.turnId
              ? Object.freeze({ ...entry, state: 'completed' as const })
              : entry
          ));
          const bounded = evictRawTurns(turns, receipts);
          return immutableRecord(record, {
            revision: record.revision + 1,
            turns: bounded.turns,
            receipts: bounded.receipts,
          });
        });
      } catch {
        let reconciled: DialogueV2FreeformSessionLedgerRecord;
        try {
          reconciled = await mutate(input.sessionId, (record) => {
            if (record.ownerBinding !== binding) {
              throw new DialogueV2FreeformSessionLedgerError('access_denied');
            }
            if (record.studyTarget !== input.studyTarget) {
              throw new DialogueV2FreeformSessionLedgerError('selection_mismatch');
            }
            const current = record.receipts.find((entry) => entry.turnId === input.turnId);
            if (!current || current.requestDigest !== requestDigest
              || current.claimToken !== claimToken) {
              throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
            }
            if (current.state === 'completed') return record;
            if (current.state !== 'pending') {
              throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
            }
            return immutableRecord(record, {
              revision: record.revision + 1,
              receipts: record.receipts.filter((entry) => entry.turnId !== input.turnId),
            });
          });
        } catch {
          throw new DialogueV2FreeformSessionLedgerError('commit_unknown');
        }
        const durableTurn = reconciled.turns.find((turn) => turn.turnId === input.turnId);
        if (durableTurn) {
          return publicResult(
            'new',
            input,
            durableTurn.assistantMessage,
            reconciled.expiresAtMs,
          );
        }
        throw new DialogueV2FreeformSessionLedgerError('commit_absent');
      }
      const completedTurn = completed.turns.find((turn) => turn.turnId === input.turnId);
      if (!completedTurn) throw new DialogueV2FreeformSessionLedgerError('ledger_unavailable');
      return publicResult('new', input, completedTurn.assistantMessage, completed.expiresAtMs);
    },
  });
}
