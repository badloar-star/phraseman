import type { DialogueV2StudyTarget } from '../../shared/dialogue_v2_language_pack_contract';
import {
  createDialogueV2SessionCompletionReleaseSnapshot,
  type DialogueV2SessionCompletionReleaseSnapshot,
} from './dialogue_v2_session_completion_core';

const CLAIM_TTL_MS = 60_000;
const SESSION_ID_RE = /^d2s_[A-Za-z0-9_-]{32,96}$/;
const CLAIM_TOKEN_RE = /^d2c_[A-Za-z0-9_-]{32,96}$/;
const OWNER_RE = /^[a-f0-9]{64}$/;
const SCENARIO_RE = /^(?=.{1,64}$)[a-z0-9]+(?:_[a-z0-9]+)*$/;
const STUDY_TARGETS = new Set(['en', 'es', 'fr', 'de']);
const INTERFACE_LANGUAGES = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'fr', 'de']);
const CONTROL_RE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u;

type TimestampLike = Readonly<{ toMillis(): number }>;
type RefLike = Readonly<{ path?: string }>;
type SnapshotLike = Readonly<{ exists: boolean; data(): unknown }>;
export type DialogueV2SessionTerminalTransaction = Readonly<{
  get(ref: RefLike): Promise<SnapshotLike>;
  create(ref: RefLike, value: Record<string, unknown>): void;
  set(ref: RefLike, value: Record<string, unknown>): void;
  delete(ref: RefLike): void;
}>;
type FirestoreLike = Readonly<{
  doc(path: string): RefLike;
  runTransaction<T>(work: (transaction: DialogueV2SessionTerminalTransaction) => Promise<T>): Promise<T>;
}>;

export type DialogueV2SessionTerminalRuntime = Readonly<{
  db: FirestoreLike;
  timestampFromMillis(millis: number): TimestampLike;
}>;

export type DialogueV2SessionTerminalClaim = Readonly<{
  sessionId: string;
  ownerBinding: string;
  studyTarget: DialogueV2StudyTarget;
  scenarioId: string;
  interfaceLang: string;
  nowMs: number;
  claimToken: string;
}>;

export type DialogueV2SessionTerminalMemoryReceipt = Readonly<{
  sharedMemoryStored: true;
  scenarioCheckpointStored: boolean;
}>;

export type DialogueV2SessionTerminalClaimResult = Readonly<{
  kind: 'new' | 'resume' | 'replay';
  session: unknown;
  assessmentRaw?: string;
  releaseSnapshot?: DialogueV2SessionCompletionReleaseSnapshot;
  memoryReceipt?: DialogueV2SessionTerminalMemoryReceipt;
}>;

export type DialogueV2SessionTerminalErrorCode =
  | 'request_invalid'
  | 'session_not_found'
  | 'session_invalid'
  | 'session_expired'
  | 'access_denied'
  | 'selection_mismatch'
  | 'completion_in_progress'
  | 'completion_invalid'
  | 'store_unavailable';

export class DialogueV2SessionTerminalError extends Error {
  constructor(readonly code: DialogueV2SessionTerminalErrorCode) {
    super(code);
    this.name = 'DialogueV2SessionTerminalError';
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function timestampMillis(value: unknown): number | null {
  const timestamp = value as Partial<TimestampLike> | null;
  if (!timestamp || typeof timestamp.toMillis !== 'function') return null;
  try {
    const millis = timestamp.toMillis();
    return positiveInteger(millis) ? millis : null;
  } catch {
    return null;
  }
}

function validClaim(value: DialogueV2SessionTerminalClaim): boolean {
  return SESSION_ID_RE.test(value.sessionId)
    && OWNER_RE.test(value.ownerBinding)
    && STUDY_TARGETS.has(value.studyTarget)
    && SCENARIO_RE.test(value.scenarioId)
    && INTERFACE_LANGUAGES.has(value.interfaceLang)
    && positiveInteger(value.nowMs)
    && CLAIM_TOKEN_RE.test(value.claimToken);
}

function decodedSession(value: unknown): Readonly<{
  sessionId: string;
  ownerBinding: string;
  studyTarget: DialogueV2StudyTarget;
  scenarioId: string;
  createdAtMs: number;
  expiresAtMs: number;
  revision: number;
  turns: unknown[];
  receipts: unknown[];
}> | null {
  const session = record(value);
  if (!session || !exactKeys(session, [
    'schemaVersion', 'sessionId', 'ownerBinding', 'studyTarget', 'scenarioId',
    'createdAt', 'expiresAt', 'revision', 'turns', 'receipts',
  ])) return null;
  const createdAtMs = timestampMillis(session.createdAt);
  const expiresAtMs = timestampMillis(session.expiresAt);
  if (session.schemaVersion !== 1
    || typeof session.sessionId !== 'string' || !SESSION_ID_RE.test(session.sessionId)
    || typeof session.ownerBinding !== 'string' || !OWNER_RE.test(session.ownerBinding)
    || typeof session.studyTarget !== 'string' || !STUDY_TARGETS.has(session.studyTarget)
    || typeof session.scenarioId !== 'string' || !SCENARIO_RE.test(session.scenarioId)
    || !createdAtMs || !expiresAtMs
    || !Number.isSafeInteger(session.revision) || Number(session.revision) < 0
    || !Array.isArray(session.turns) || !Array.isArray(session.receipts)) return null;
  return Object.freeze({
    schemaVersion: 1 as const,
    sessionId: session.sessionId,
    ownerBinding: session.ownerBinding,
    studyTarget: session.studyTarget as DialogueV2StudyTarget,
    scenarioId: session.scenarioId,
    createdAtMs,
    expiresAtMs,
    revision: session.revision as number,
    turns: session.turns,
    receipts: session.receipts,
  });
}

function memoryReceipt(value: unknown): DialogueV2SessionTerminalMemoryReceipt | null {
  const receipt = record(value);
  return receipt && exactKeys(receipt, ['sharedMemoryStored', 'scenarioCheckpointStored'])
    && receipt.sharedMemoryStored === true
    && typeof receipt.scenarioCheckpointStored === 'boolean'
    ? Object.freeze({
      sharedMemoryStored: true,
      scenarioCheckpointStored: receipt.scenarioCheckpointStored,
    })
    : null;
}

function safeAssessment(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 5_000
    && !CONTROL_RE.test(value);
}

function sameReleaseSnapshot(
  left: DialogueV2SessionCompletionReleaseSnapshot,
  right: DialogueV2SessionCompletionReleaseSnapshot,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function terminalAuthority(
  terminal: Record<string, unknown>,
  claim: DialogueV2SessionTerminalClaim,
): void {
  if (terminal.ownerBinding !== claim.ownerBinding) {
    throw new DialogueV2SessionTerminalError('access_denied');
  }
  if (terminal.studyTarget !== claim.studyTarget || terminal.scenarioId !== claim.scenarioId) {
    throw new DialogueV2SessionTerminalError('selection_mismatch');
  }
  if (terminal.interfaceLang !== claim.interfaceLang) {
    throw new DialogueV2SessionTerminalError('selection_mismatch');
  }
}

export async function claimDialogueV2SessionTerminal(
  runtime: DialogueV2SessionTerminalRuntime,
  claim: DialogueV2SessionTerminalClaim,
): Promise<DialogueV2SessionTerminalClaimResult> {
  if (!validClaim(claim)) throw new DialogueV2SessionTerminalError('request_invalid');
  const sessionRef = runtime.db.doc(`dialogue_v2_sessions/${claim.sessionId}`);
  const terminalRef = runtime.db.doc(`dialogue_v2_session_terminals/${claim.sessionId}`);
  try {
    return await runtime.db.runTransaction(async (transaction) => {
      const [sessionSnapshot, terminalSnapshot] = await Promise.all([
        transaction.get(sessionRef),
        transaction.get(terminalRef),
      ]);
      if (!sessionSnapshot.exists) throw new DialogueV2SessionTerminalError('session_not_found');
      const session = decodedSession(sessionSnapshot.data());
      if (!session || session.sessionId !== claim.sessionId) {
        throw new DialogueV2SessionTerminalError('session_invalid');
      }
      if (session.ownerBinding !== claim.ownerBinding) {
        throw new DialogueV2SessionTerminalError('access_denied');
      }
      if (session.studyTarget !== claim.studyTarget || session.scenarioId !== claim.scenarioId) {
        throw new DialogueV2SessionTerminalError('selection_mismatch');
      }
      if (claim.nowMs >= session.expiresAtMs) {
        throw new DialogueV2SessionTerminalError('session_expired');
      }
      for (const rawReceipt of session.receipts) {
        const receipt = record(rawReceipt);
        if (!receipt
          || typeof receipt.state !== 'string'
          || !['pending', 'completed', 'evicted'].includes(receipt.state)
          || !positiveInteger(receipt.claimExpiresAtMs)) {
          throw new DialogueV2SessionTerminalError('session_invalid');
        }
        if (receipt.state === 'pending' && claim.nowMs < receipt.claimExpiresAtMs) {
          throw new DialogueV2SessionTerminalError('completion_in_progress');
        }
      }
      if (terminalSnapshot.exists) {
        const terminal = record(terminalSnapshot.data());
        if (!terminal) throw new DialogueV2SessionTerminalError('completion_invalid');
        terminalAuthority(terminal, claim);
        const expiresAtMs = timestampMillis(terminal.expiresAt);
        if (!expiresAtMs || expiresAtMs !== session.expiresAtMs || claim.nowMs >= expiresAtMs) {
          throw new DialogueV2SessionTerminalError('session_expired');
        }
        if (terminal.state === 'completed') {
          const receipt = memoryReceipt(terminal.memoryReceipt);
          const releaseSnapshot = createDialogueV2SessionCompletionReleaseSnapshot(terminal.releaseSnapshot);
          if (!safeAssessment(terminal.assessmentRaw) || !releaseSnapshot
            || releaseSnapshot.studyTarget !== claim.studyTarget
            || releaseSnapshot.scenarioId !== claim.scenarioId || !receipt) {
            throw new DialogueV2SessionTerminalError('completion_invalid');
          }
          return Object.freeze({
            kind: 'replay' as const,
            session,
            assessmentRaw: terminal.assessmentRaw,
            releaseSnapshot,
            memoryReceipt: receipt,
          });
        }
        const claimExpiresAtMs = timestampMillis(terminal.claimExpiresAt);
        if (terminal.state !== 'pending' || !claimExpiresAtMs) {
          throw new DialogueV2SessionTerminalError('completion_invalid');
        }
        if (claim.nowMs < claimExpiresAtMs) {
          throw new DialogueV2SessionTerminalError('completion_in_progress');
        }
        const stagedAssessment = safeAssessment(terminal.assessmentRaw)
          ? terminal.assessmentRaw
          : null;
        const stagedRelease = createDialogueV2SessionCompletionReleaseSnapshot(terminal.releaseSnapshot);
        if ((stagedAssessment === null) !== (stagedRelease === null)) {
          throw new DialogueV2SessionTerminalError('completion_invalid');
        }
        if (stagedRelease && (stagedRelease.studyTarget !== claim.studyTarget
          || stagedRelease.scenarioId !== claim.scenarioId)) {
          throw new DialogueV2SessionTerminalError('completion_invalid');
        }
        transaction.set(terminalRef, {
          schemaVersion: 1,
          sessionId: claim.sessionId,
          ownerBinding: claim.ownerBinding,
          studyTarget: claim.studyTarget,
          scenarioId: claim.scenarioId,
          interfaceLang: claim.interfaceLang,
          state: 'pending',
          claimToken: claim.claimToken,
          claimExpiresAt: runtime.timestampFromMillis(Math.min(
            claim.nowMs + CLAIM_TTL_MS,
            session.expiresAtMs,
          )),
          expiresAt: runtime.timestampFromMillis(session.expiresAtMs),
          ...(stagedAssessment && stagedRelease ? {
            assessmentRaw: stagedAssessment,
            releaseSnapshot: stagedRelease,
          } : {}),
        });
        return stagedAssessment && stagedRelease
          ? Object.freeze({
            kind: 'resume' as const,
            session,
            assessmentRaw: stagedAssessment,
            releaseSnapshot: stagedRelease,
          })
          : Object.freeze({ kind: 'new' as const, session });
      }
      transaction.create(terminalRef, {
        schemaVersion: 1,
        sessionId: claim.sessionId,
        ownerBinding: claim.ownerBinding,
        studyTarget: claim.studyTarget,
        scenarioId: claim.scenarioId,
        interfaceLang: claim.interfaceLang,
        state: 'pending',
        claimToken: claim.claimToken,
        claimExpiresAt: runtime.timestampFromMillis(Math.min(
          claim.nowMs + CLAIM_TTL_MS,
          session.expiresAtMs,
        )),
        expiresAt: runtime.timestampFromMillis(session.expiresAtMs),
      });
      return Object.freeze({ kind: 'new' as const, session });
    });
  } catch (error) {
    if (error instanceof DialogueV2SessionTerminalError) throw error;
    throw new DialogueV2SessionTerminalError('store_unavailable');
  }
}

/** Removes only an unassessed claim owned by the exact failed worker. */
export async function releaseDialogueV2SessionTerminalClaim(
  runtime: DialogueV2SessionTerminalRuntime,
  claim: DialogueV2SessionTerminalClaim,
): Promise<boolean> {
  if (!validClaim(claim)) throw new DialogueV2SessionTerminalError('request_invalid');
  const terminalRef = runtime.db.doc(`dialogue_v2_session_terminals/${claim.sessionId}`);
  try {
    return await runtime.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(terminalRef);
      const terminal = snapshot.exists ? record(snapshot.data()) : null;
      if (!terminal) return false;
      terminalAuthority(terminal, claim);
      if (terminal.state !== 'pending'
        || terminal.claimToken !== claim.claimToken
        || terminal.assessmentRaw !== undefined
        || terminal.releaseSnapshot !== undefined) return false;
      transaction.delete(terminalRef);
      return true;
    });
  } catch (error) {
    if (error instanceof DialogueV2SessionTerminalError) throw error;
    throw new DialogueV2SessionTerminalError('store_unavailable');
  }
}

/** Durably fixes the unique validated assessment before any memory publication. */
export async function stageDialogueV2SessionTerminalAssessment(
  runtime: DialogueV2SessionTerminalRuntime,
  input: DialogueV2SessionTerminalClaim & Readonly<{
    assessmentRaw: string;
    releaseSnapshot: DialogueV2SessionCompletionReleaseSnapshot;
  }>,
): Promise<void> {
  const releaseSnapshot = createDialogueV2SessionCompletionReleaseSnapshot(input.releaseSnapshot);
  if (!validClaim(input) || !safeAssessment(input.assessmentRaw) || !releaseSnapshot
    || releaseSnapshot.studyTarget !== input.studyTarget
    || releaseSnapshot.scenarioId !== input.scenarioId) {
    throw new DialogueV2SessionTerminalError('request_invalid');
  }
  const terminalRef = runtime.db.doc(`dialogue_v2_session_terminals/${input.sessionId}`);
  try {
    await runtime.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(terminalRef);
      const terminal = snapshot.exists ? record(snapshot.data()) : null;
      if (!terminal) throw new DialogueV2SessionTerminalError('completion_invalid');
      terminalAuthority(terminal, input);
      const claimExpiresAtMs = timestampMillis(terminal.claimExpiresAt);
      const expiresAtMs = timestampMillis(terminal.expiresAt);
      if (terminal.state !== 'pending'
        || terminal.claimToken !== input.claimToken
        || !claimExpiresAtMs || !expiresAtMs || input.nowMs >= expiresAtMs
        || terminal.assessmentRaw !== undefined
        || terminal.releaseSnapshot !== undefined) {
        throw new DialogueV2SessionTerminalError('completion_invalid');
      }
      transaction.set(terminalRef, {
        schemaVersion: 1,
        sessionId: input.sessionId,
        ownerBinding: input.ownerBinding,
        studyTarget: input.studyTarget,
        scenarioId: input.scenarioId,
        interfaceLang: input.interfaceLang,
        state: 'pending',
        claimToken: input.claimToken,
        claimExpiresAt: runtime.timestampFromMillis(claimExpiresAtMs),
        expiresAt: runtime.timestampFromMillis(expiresAtMs),
        assessmentRaw: input.assessmentRaw,
        releaseSnapshot,
      });
    });
  } catch (error) {
    if (error instanceof DialogueV2SessionTerminalError) throw error;
    throw new DialogueV2SessionTerminalError('store_unavailable');
  }
}

export async function completeDialogueV2SessionTerminal(
  runtime: DialogueV2SessionTerminalRuntime,
  input: DialogueV2SessionTerminalClaim & Readonly<{
    assessmentRaw: string;
    releaseSnapshot: DialogueV2SessionCompletionReleaseSnapshot;
    memoryReceipt: DialogueV2SessionTerminalMemoryReceipt;
    publishMemory?: (transaction: DialogueV2SessionTerminalTransaction) => Promise<void>;
  }>,
): Promise<void> {
  const releaseSnapshot = createDialogueV2SessionCompletionReleaseSnapshot(input.releaseSnapshot);
  if (!validClaim(input) || !safeAssessment(input.assessmentRaw) || !releaseSnapshot
    || releaseSnapshot.studyTarget !== input.studyTarget
    || releaseSnapshot.scenarioId !== input.scenarioId
    || !memoryReceipt(input.memoryReceipt)) {
    throw new DialogueV2SessionTerminalError('request_invalid');
  }
  const terminalRef = runtime.db.doc(`dialogue_v2_session_terminals/${input.sessionId}`);
  try {
    await runtime.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(terminalRef);
      const terminal = snapshot.exists ? record(snapshot.data()) : null;
      if (!terminal) throw new DialogueV2SessionTerminalError('completion_invalid');
      terminalAuthority(terminal, input);
      const expiresAtMs = timestampMillis(terminal.expiresAt);
      if (terminal.state !== 'pending'
        || terminal.claimToken !== input.claimToken
        || !expiresAtMs || input.nowMs >= expiresAtMs
        || terminal.assessmentRaw !== input.assessmentRaw) {
        throw new DialogueV2SessionTerminalError('completion_invalid');
      }
      const stagedRelease = createDialogueV2SessionCompletionReleaseSnapshot(terminal.releaseSnapshot);
      if (!stagedRelease || !sameReleaseSnapshot(stagedRelease, releaseSnapshot)) {
        throw new DialogueV2SessionTerminalError('completion_invalid');
      }
      await input.publishMemory?.(transaction);
      transaction.set(terminalRef, {
        schemaVersion: 1,
        sessionId: input.sessionId,
        ownerBinding: input.ownerBinding,
        studyTarget: input.studyTarget,
        scenarioId: input.scenarioId,
        interfaceLang: input.interfaceLang,
        state: 'completed',
        assessmentRaw: input.assessmentRaw,
        releaseSnapshot,
        memoryReceipt: input.memoryReceipt,
        completedAt: runtime.timestampFromMillis(input.nowMs),
        expiresAt: runtime.timestampFromMillis(expiresAtMs),
      });
    });
  } catch (error) {
    if (error instanceof DialogueV2SessionTerminalError) throw error;
    throw new DialogueV2SessionTerminalError('store_unavailable');
  }
}
