/**
 * Account-global client mirror of the server-owned Dialogue reply quota.
 *
 * The mirror never invents a reset boundary. Only a versioned server
 * observation can close the gate; old target-scoped v1 rows are retained on
 * disk for compatibility but are not authoritative.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { REVENUE_DAILY_LIMITS } from './revenue_daily_limits';
import { resolveDialogueStudyTarget } from './dialogue_language_registry';
import { withStorageLock } from './storage_mutex';

export const AI_DIALOG_DAILY_QUOTA_PREFIX = 'ai_dialog_daily_quota:v2:';

export type AiDialogQuotaObservation = Readonly<{
  remainingQuota: number;
  resetAtMs: number;
  quotaVersion: number;
}>;

export type AiDialogDailyQuotaMirror = Readonly<{
  schemaVersion: 2;
  remaining: number;
  limit: number;
  resetAtMs: number;
  quotaVersion: number;
  updatedAtMs: number;
}>;

export type AiDialogDailyQuotaState =
  | Readonly<{ status: 'unavailable'; limit: number }>
  | Readonly<{ status: 'unknown'; limit: number }>
  | Readonly<{ status: 'allowed'; remaining: number; limit: number; resetAtMs: number; quotaVersion: number }>
  | Readonly<{ status: 'exhausted'; remaining: 0; limit: number; resetAtMs: number; quotaVersion: number }>;

function validStableUid(stableUid: string): boolean {
  return !!stableUid.trim() && stableUid.length <= 160 && !stableUid.includes('/');
}

export function aiDialogDailyQuotaStorageKey(studyTarget: unknown, stableUid: string): string | null {
  if (!resolveDialogueStudyTarget(studyTarget) || !validStableUid(stableUid)) return null;
  return `${AI_DIALOG_DAILY_QUOTA_PREFIX}${encodeURIComponent(stableUid.trim())}`;
}

export function parseAiDialogQuotaObservation(value: unknown): AiDialogQuotaObservation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Partial<AiDialogQuotaObservation>;
  const remainingQuota = row.remainingQuota;
  const resetAtMs = row.resetAtMs;
  const quotaVersion = row.quotaVersion;
  if (typeof remainingQuota !== 'number' || !Number.isSafeInteger(remainingQuota) || remainingQuota < 0
    || typeof resetAtMs !== 'number' || !Number.isSafeInteger(resetAtMs) || resetAtMs <= 0
    || typeof quotaVersion !== 'number' || !Number.isSafeInteger(quotaVersion) || quotaVersion < 1) return null;
  return Object.freeze({ remainingQuota, resetAtMs, quotaVersion });
}

export function quotaObservationFromDialogError(error: unknown): AiDialogQuotaObservation | null {
  if (!error || typeof error !== 'object' || Array.isArray(error)) return null;
  const row = error as { details?: unknown; quota?: unknown; nativeError?: { details?: unknown } };
  return parseAiDialogQuotaObservation(row.details)
    ?? parseAiDialogQuotaObservation(row.quota)
    ?? parseAiDialogQuotaObservation(row.nativeError?.details);
}

function parseMirror(raw: string | null): AiDialogDailyQuotaMirror | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AiDialogDailyQuotaMirror> | null;
    if (!parsed || parsed.schemaVersion !== 2) return null;
    const observation = parseAiDialogQuotaObservation({
      remainingQuota: parsed.remaining,
      resetAtMs: parsed.resetAtMs,
      quotaVersion: parsed.quotaVersion,
    });
    if (!observation) return null;
    return Object.freeze({
      schemaVersion: 2,
      remaining: observation.remainingQuota,
      limit: Math.max(1, Math.floor(Number(parsed.limit) || REVENUE_DAILY_LIMITS.ai_dialog_replies)),
      resetAtMs: observation.resetAtMs,
      quotaVersion: observation.quotaVersion,
      updatedAtMs: Math.max(0, Math.floor(Number(parsed.updatedAtMs) || 0)),
    });
  } catch (error: unknown) {
    console.warn('[DIALOG-QUOTA] mirror:parse → unknown', error instanceof Error ? error.message : String(error));
    return null;
  }
}

export async function readAiDialogDailyQuota(
  studyTarget: unknown,
  stableUid: string | null,
  nowMs: number = Date.now(),
): Promise<AiDialogDailyQuotaState> {
  const limit = REVENUE_DAILY_LIMITS.ai_dialog_replies;
  if (!resolveDialogueStudyTarget(studyTarget)) return { status: 'unavailable', limit };
  if (!stableUid) return { status: 'unknown', limit };
  const storageKey = aiDialogDailyQuotaStorageKey(studyTarget, stableUid);
  if (!storageKey) return { status: 'unknown', limit };
  try {
    return await withStorageLock(async () => {
      const mirror = parseMirror(await AsyncStorage.getItem(storageKey));
      if (!mirror || nowMs >= mirror.resetAtMs) return { status: 'unknown', limit } as const;
      if (mirror.remaining <= 0) {
        return {
          status: 'exhausted', remaining: 0, limit: mirror.limit,
          resetAtMs: mirror.resetAtMs, quotaVersion: mirror.quotaVersion,
        } as const;
      }
      return {
        status: 'allowed', remaining: mirror.remaining, limit: mirror.limit,
        resetAtMs: mirror.resetAtMs, quotaVersion: mirror.quotaVersion,
      } as const;
    });
  } catch (error: unknown) {
    console.warn('[DIALOG-QUOTA] read:catch → unknown', error instanceof Error ? error.message : String(error));
    return { status: 'unknown', limit };
  }
}

export async function recordAiDialogDailyQuotaFromServer(
  studyTarget: unknown,
  stableUid: string | null,
  value: unknown,
  nowMs: number = Date.now(),
): Promise<void> {
  if (!resolveDialogueStudyTarget(studyTarget) || !stableUid) return;
  const storageKey = aiDialogDailyQuotaStorageKey(studyTarget, stableUid);
  const observation = parseAiDialogQuotaObservation(value);
  if (!storageKey || !observation) return;
  try {
    await withStorageLock(async () => {
      const current = parseMirror(await AsyncStorage.getItem(storageKey));
      if (current && current.quotaVersion >= observation.quotaVersion) return;
      const mirror: AiDialogDailyQuotaMirror = Object.freeze({
        schemaVersion: 2,
        remaining: observation.remainingQuota,
        limit: REVENUE_DAILY_LIMITS.ai_dialog_replies,
        resetAtMs: observation.resetAtMs,
        quotaVersion: observation.quotaVersion,
        updatedAtMs: nowMs,
      });
      await AsyncStorage.setItem(storageKey, JSON.stringify(mirror));
    });
  } catch (error: unknown) {
    console.warn('[DIALOG-QUOTA] record:catch', error instanceof Error ? error.message : String(error));
  }
}

export async function markAiDialogDailyQuotaExhausted(
  studyTarget: unknown,
  stableUid: string | null,
  observation?: unknown,
  nowMs: number = Date.now(),
): Promise<void> {
  await recordAiDialogDailyQuotaFromServer(studyTarget, stableUid, observation, nowMs);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
