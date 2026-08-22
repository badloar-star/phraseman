import AsyncStorage from '@react-native-async-storage/async-storage';

import { maxVoiceCallable } from './max_call_mint_request';
import {
  listPendingMaxFinalize,
  recordMaxFinalizeAttempt,
  removeMaxFinalizeEnvelope,
} from './max_voice_finalize_outbox';
import type { MaxVoiceReviewReceiptV1 } from './max_voice_finalize_types';

const RECEIPT_KEY_PREFIX = 'max_voice_review_receipt_v1';
const RECEIPT_MAP_KEY_PREFIX = 'max_voice_review_receipts_v1';
const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 60_000, 5 * 60_000] as const;
const RETRYABLE_CODES = new Set(['unavailable', 'deadline-exceeded', 'internal']);

export interface MaxVoiceFinalizeClientDependencies {
  call(request: Record<string, unknown>): Promise<unknown>;
  nowMs(): number;
}

export type MaxVoiceFinalizeDrainResult =
  | { status: 'idle' }
  | { status: 'ready'; receipt: MaxVoiceReviewReceiptV1 }
  | { status: 'retry_scheduled'; retryAtMs: number }
  | { status: 'terminal'; code: string };

function receiptKey(accountKey: string): string {
  return `${RECEIPT_KEY_PREFIX}:${encodeURIComponent(accountKey)}`;
}

function receiptMapKey(accountKey: string): string {
  return `${RECEIPT_MAP_KEY_PREFIX}:${encodeURIComponent(accountKey)}`;
}

async function persistReceipt(accountKey: string, receipt: MaxVoiceReviewReceiptV1): Promise<void> {
  const mapKey = receiptMapKey(accountKey);
  let map: Record<string, MaxVoiceReviewReceiptV1> = {};
  try {
    const raw = await AsyncStorage.getItem(mapKey);
    const parsed = raw ? JSON.parse(raw) as unknown : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      map = parsed as Record<string, MaxVoiceReviewReceiptV1>;
    }
  } catch {
    map = {};
  }
  map[receipt.sessionId] = receipt;
  // The session map makes correction-practice return deterministic. The latest
  // key stays for backward compatibility with already installed builds.
  await AsyncStorage.multiSet([
    [mapKey, JSON.stringify(map)],
    [receiptKey(accountKey), JSON.stringify(receipt)],
  ]);
}

function text(value: unknown, max = 240): value is string {
  return typeof value === 'string' && Array.from(value).length <= max;
}

function textList(value: unknown, max: number): value is string[] {
  return Array.isArray(value) && value.length <= max && value.every((item) => text(item));
}

export function parseMaxVoiceReviewReceipt(
  value: unknown,
  accountKey: string,
  sessionId: string,
): MaxVoiceReviewReceiptV1 | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (row.schemaVersion !== 'max-voice-review.v1'
    || row.sessionId !== sessionId
    || row.stableUid !== accountKey
    || (row.status !== 'ready' && row.status !== 'limited')
    || !Number.isFinite(row.completedAtMs)
    || !Number.isFinite(row.durationSec)
    || (row.speechSec !== undefined && !Number.isFinite(row.speechSec))
    || !['completed', 'capped', 'dropped', 'background', 'failed'].includes(String(row.endReason))
    || !textList(row.worked, 3)
    || !textList(row.tomorrowActions, 3)
    || row.tomorrowActions.length < 1
    || (row.targetPhrase !== null && !text(row.targetPhrase))
    || (row.nextTopic !== null && !text(row.nextTopic))) return null;
  if (row.correction !== null) {
    if (!row.correction || typeof row.correction !== 'object') return null;
    const correction = row.correction as Record<string, unknown>;
    if (!text(correction.said) || !text(correction.target) || !text(correction.explanation)) return null;
  }
  if (row.goal !== null) {
    if (!row.goal || typeof row.goal !== 'object') return null;
    const goal = row.goal as Record<string, unknown>;
    if (!text(goal.id) || ![0, 1, 2, 3].includes(Number(goal.masteryBefore)) || ![0, 1, 2, 3].includes(Number(goal.masteryAfter))) return null;
  }
  if (!Array.isArray(row.phraseEvidence) || row.phraseEvidence.length > 20) return null;
  for (const item of row.phraseEvidence) {
    if (!item || typeof item !== 'object') return null;
    const evidence = item as Record<string, unknown>;
    if (!text(evidence.phraseId) || !['pass', 'retry', 'uncertain'].includes(String(evidence.result))) return null;
  }
  return value as MaxVoiceReviewReceiptV1;
}

function normalizeCode(error: unknown): string {
  const raw = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : 'internal';
  return raw.includes('/') ? raw.slice(raw.lastIndexOf('/') + 1) : raw || 'internal';
}

function retryDelay(attempts: number): number {
  return RETRY_DELAYS_MS[Math.min(Math.max(0, attempts), RETRY_DELAYS_MS.length - 1)];
}

async function scheduleRetry(
  accountKey: string,
  sessionId: string,
  attempts: number,
  delayMs: number,
  nowMs: number,
): Promise<MaxVoiceFinalizeDrainResult> {
  const retryAtMs = nowMs + Math.max(1_000, Math.min(5 * 60_000, delayMs));
  const updated = await recordMaxFinalizeAttempt(accountKey, sessionId, retryAtMs, nowMs);
  return updated ? { status: 'retry_scheduled', retryAtMs } : { status: 'idle' };
}

export async function drainOneMaxFinalize(
  accountKey: string,
  requestedSessionId?: string,
  dependencies: MaxVoiceFinalizeClientDependencies = {
    call: maxVoiceCallable<unknown>('maxVoiceFinalize'),
    nowMs: () => Date.now(),
  },
): Promise<MaxVoiceFinalizeDrainResult> {
  const nowMs = dependencies.nowMs();
  const pending = await listPendingMaxFinalize(accountKey, nowMs);
  const envelope = requestedSessionId
    ? pending.find((item) => item.sessionId === requestedSessionId)
    : pending.find((item) => item.nextAttemptAtMs <= nowMs);
  if (!envelope || envelope.nextAttemptAtMs > nowMs) return { status: 'idle' };
  try {
    const response = await dependencies.call({
      version: envelope.version,
      sessionId: envelope.sessionId,
      request: envelope.request,
    });
    if (response && typeof response === 'object' && (response as Record<string, unknown>).status === 'processing') {
      const serverDelay = Number((response as Record<string, unknown>).retryAfterMs);
      return scheduleRetry(
        accountKey,
        envelope.sessionId,
        envelope.attempts,
        Number.isFinite(serverDelay) ? serverDelay : retryDelay(envelope.attempts),
        nowMs,
      );
    }
    const receipt = parseMaxVoiceReviewReceipt(response, accountKey, envelope.sessionId);
    if (!receipt) {
      return scheduleRetry(accountKey, envelope.sessionId, envelope.attempts, retryDelay(envelope.attempts), nowMs);
    }
    // Receipt must survive a process death before the expiring transcript is removed.
    await persistReceipt(accountKey, receipt);
    await removeMaxFinalizeEnvelope(accountKey, envelope.sessionId);
    return { status: 'ready', receipt };
  } catch (error) {
    const code = normalizeCode(error);
    if (RETRYABLE_CODES.has(code)) {
      return scheduleRetry(accountKey, envelope.sessionId, envelope.attempts, retryDelay(envelope.attempts), nowMs);
    }
    // A permanent ownership/consent/validation failure must not retain a full transcript.
    await removeMaxFinalizeEnvelope(accountKey, envelope.sessionId);
    return { status: 'terminal', code };
  }
}

export async function readLastMaxVoiceReviewReceipt(accountKey: string): Promise<MaxVoiceReviewReceiptV1 | null> {
  try {
    const raw = await AsyncStorage.getItem(receiptKey(accountKey));
    if (!raw) return null;
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object') return null;
    const sessionId = String((value as Record<string, unknown>).sessionId ?? '');
    return parseMaxVoiceReviewReceipt(value, accountKey, sessionId);
  } catch {
    return null;
  }
}


export async function readMaxVoiceReviewReceipt(
  accountKey: string,
  sessionId: string,
): Promise<MaxVoiceReviewReceiptV1 | null> {
  if (!sessionId) return null;
  try {
    const raw = await AsyncStorage.getItem(receiptMapKey(accountKey));
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const candidate = (parsed as Record<string, unknown>)[sessionId];
        const receipt = parseMaxVoiceReviewReceipt(candidate, accountKey, sessionId);
        if (receipt) return receipt;
      }
    }
    const latest = await readLastMaxVoiceReviewReceipt(accountKey);
    return latest?.sessionId === sessionId ? latest : null;
  } catch {
    return null;
  }
}

/** Remove account-scoped durable review caches during sign-out/switch/deletion. */
export async function clearMaxVoiceReviewReceipts(accountKey: string): Promise<void> {
  await AsyncStorage.multiRemove([receiptKey(accountKey), receiptMapKey(accountKey)]);
}
