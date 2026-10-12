/**
 * Account-global client mirror of the server-owned Dialogue reply quota.
 *
 * The mirror never invents a reset boundary. Only a versioned server
 * observation can close the gate; old target-scoped v1 rows are retained on
 * disk for compatibility but are not authoritative.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { REVENUE_MONTHLY_LIMITS } from './revenue_daily_limits';
import { resolveDialogueStudyTarget } from './dialogue_language_registry';
import { withStorageLock } from './storage_mutex';

export const AI_DIALOG_MONTHLY_QUOTA_PREFIX = 'ai_dialog_monthly_quota:v3:';
export const AI_DIALOG_LEGACY_DAILY_QUOTA_PREFIX = 'ai_dialog_daily_quota:v2:';
/** @deprecated Rollback-build compatibility. New writes use the monthly v3 key. */
export const AI_DIALOG_DAILY_QUOTA_PREFIX = AI_DIALOG_LEGACY_DAILY_QUOTA_PREFIX;

export type AiDialogQuotaObservation = Readonly<{
  remainingQuota: number;
  resetAtMs: number;
  quotaVersion: number;
}>;

export type AiDialogMonthlyQuotaMirror = Readonly<{
  schemaVersion: 3;
  quotaPeriod: 'calendar_month';
  remaining: number;
  limit: number;
  resetAtMs: number;
  quotaVersion: number;
  updatedAtMs: number;
}>;

export type AiDialogMonthlyQuotaState =
  | Readonly<{ status: 'unavailable'; limit: number }>
  | Readonly<{ status: 'unknown'; limit: number }>
  | Readonly<{ status: 'allowed'; remaining: number; limit: number; resetAtMs: number; quotaVersion: number }>
  | Readonly<{ status: 'exhausted'; remaining: 0; limit: number; resetAtMs: number; quotaVersion: number }>;

function validStableUid(stableUid: string): boolean {
  return !!stableUid.trim() && stableUid.length <= 160 && !stableUid.includes('/');
}

export function aiDialogDailyQuotaStorageKey(studyTarget: unknown, stableUid: string): string | null {
  return aiDialogMonthlyQuotaStorageKey(studyTarget, stableUid);
}

export function aiDialogMonthlyQuotaStorageKey(studyTarget: unknown, stableUid: string): string | null {
  if (!resolveDialogueStudyTarget(studyTarget) || !validStableUid(stableUid)) return null;
  return `${AI_DIALOG_MONTHLY_QUOTA_PREFIX}${encodeURIComponent(stableUid.trim())}`;
}

function legacyDailyQuotaStorageKey(studyTarget: unknown, stableUid: string): string | null {
  if (!resolveDialogueStudyTarget(studyTarget) || !validStableUid(stableUid)) return null;
  return `${AI_DIALOG_LEGACY_DAILY_QUOTA_PREFIX}${encodeURIComponent(stableUid.trim())}`;
}

function isUtcCalendarMonthBoundary(resetAtMs: number): boolean {
  const reset = new Date(resetAtMs);
  return reset.getUTCDate() === 1
    && reset.getUTCHours() === 0
    && reset.getUTCMinutes() === 0
    && reset.getUTCSeconds() === 0
    && reset.getUTCMilliseconds() === 0;
}

export function parseAiDialogQuotaObservation(value: unknown): AiDialogQuotaObservation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Partial<AiDialogQuotaObservation>;
  const remainingQuota = row.remainingQuota;
  const resetAtMs = row.resetAtMs;
  const quotaVersion = row.quotaVersion;
  if (typeof remainingQuota !== 'number' || !Number.isSafeInteger(remainingQuota) || remainingQuota < 0
    || typeof resetAtMs !== 'number' || !Number.isSafeInteger(resetAtMs) || resetAtMs <= 0
    || !isUtcCalendarMonthBoundary(resetAtMs)
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

function monthlyLimitForRemaining(remaining: number): number {
  return Math.max(REVENUE_MONTHLY_LIMITS.ai_dialog_replies, remaining);
}

function parseMonthlyMirror(raw: string | null): AiDialogMonthlyQuotaMirror | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AiDialogMonthlyQuotaMirror> | null;
    if (!parsed || parsed.schemaVersion !== 3 || parsed.quotaPeriod !== 'calendar_month') return null;
    const observation = parseAiDialogQuotaObservation({
      remainingQuota: parsed.remaining,
      resetAtMs: parsed.resetAtMs,
      quotaVersion: parsed.quotaVersion,
    });
    if (!observation) return null;
    return Object.freeze({
      schemaVersion: 3,
      quotaPeriod: 'calendar_month',
      remaining: observation.remainingQuota,
      limit: Math.max(
        monthlyLimitForRemaining(observation.remainingQuota),
        Math.floor(Number(parsed.limit) || 0),
      ),
      resetAtMs: observation.resetAtMs,
      quotaVersion: observation.quotaVersion,
      updatedAtMs: Math.max(0, Math.floor(Number(parsed.updatedAtMs) || 0)),
    });
  } catch (error: unknown) {
    console.warn('[DIALOG-QUOTA] mirror:parse → unknown', error instanceof Error ? error.message : String(error));
    return null;
  }
}

function parseLegacyMonthlyCompatibleMirror(raw: string | null): AiDialogMonthlyQuotaMirror | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || parsed.schemaVersion !== 2) return null;
    const observation = parseAiDialogQuotaObservation({
      remainingQuota: parsed.remaining,
      resetAtMs: parsed.resetAtMs,
      quotaVersion: parsed.quotaVersion,
    });
    if (!observation) return null;
    return Object.freeze({
      schemaVersion: 3,
      quotaPeriod: 'calendar_month',
      remaining: observation.remainingQuota,
      limit: monthlyLimitForRemaining(observation.remainingQuota),
      resetAtMs: observation.resetAtMs,
      quotaVersion: observation.quotaVersion,
      updatedAtMs: Math.max(0, Math.floor(Number(parsed.updatedAtMs) || 0)),
    });
  } catch {
    return null;
  }
}

export async function readAiDialogMonthlyQuota(
  studyTarget: unknown,
  stableUid: string | null,
  nowMs: number = Date.now(),
): Promise<AiDialogMonthlyQuotaState> {
  const limit = REVENUE_MONTHLY_LIMITS.ai_dialog_replies;
  // зачем (координатор 12.10, «сперва логи»): пилюля «N/30» на первой реплике была пустой — каждый выход «unknown»
  // называет причину, чтобы видеть, почему зеркало не дало остаток. Форма ответа прежняя.
  const unknownBecause = (reason: string) => {
    console.log(`[DIALOG-QUOTA-OPT] mirror:read → unknown reason=${reason}`);
    return { status: 'unknown', limit } as const;
  };
  if (!resolveDialogueStudyTarget(studyTarget)) {
    console.log('[DIALOG-QUOTA-OPT] mirror:read → unavailable reason=no_study_target');
    return { status: 'unavailable', limit };
  }
  if (!stableUid) return unknownBecause('no_stable_uid');
  const storageKey = aiDialogMonthlyQuotaStorageKey(studyTarget, stableUid);
  if (!storageKey) return unknownBecause('no_storage_key');
  try {
    return await withStorageLock(async () => {
      let mirror = parseMonthlyMirror(await AsyncStorage.getItem(storageKey));
      let source = 'monthly';
      if (!mirror) {
        const legacyKey = legacyDailyQuotaStorageKey(studyTarget, stableUid);
        mirror = parseLegacyMonthlyCompatibleMirror(
          legacyKey ? await AsyncStorage.getItem(legacyKey) : null,
        );
        source = 'legacy';
        if (mirror) await AsyncStorage.setItem(storageKey, JSON.stringify(mirror));
      }
      if (!mirror) return unknownBecause('no_mirror');
      if (nowMs >= mirror.resetAtMs) return unknownBecause(`mirror_expired resetAgoMs=${nowMs - mirror.resetAtMs}`);
      console.log(`[DIALOG-QUOTA-OPT] mirror:read → remaining=${mirror.remaining} source=${source} quotaVersion=${mirror.quotaVersion}`);
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

export async function recordAiDialogMonthlyQuotaFromServer(
  studyTarget: unknown,
  stableUid: string | null,
  value: unknown,
  nowMs: number = Date.now(),
): Promise<void> {
  if (!resolveDialogueStudyTarget(studyTarget) || !stableUid) return;
  const storageKey = aiDialogMonthlyQuotaStorageKey(studyTarget, stableUid);
  const observation = parseAiDialogQuotaObservation(value);
  if (!storageKey || !observation) return;
  try {
    await withStorageLock(async () => {
      const current = parseMonthlyMirror(await AsyncStorage.getItem(storageKey));
      if (current && current.quotaVersion >= observation.quotaVersion) return;
      const mirror: AiDialogMonthlyQuotaMirror = Object.freeze({
        schemaVersion: 3,
        quotaPeriod: 'calendar_month',
        remaining: observation.remainingQuota,
        limit: monthlyLimitForRemaining(observation.remainingQuota),
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

export async function markAiDialogMonthlyQuotaExhausted(
  studyTarget: unknown,
  stableUid: string | null,
  observation?: unknown,
  nowMs: number = Date.now(),
): Promise<void> {
  await recordAiDialogMonthlyQuotaFromServer(studyTarget, stableUid, observation, nowMs);
}

/** @deprecated Compatibility exports while call sites move to monthly naming. */
export type AiDialogDailyQuotaMirror = AiDialogMonthlyQuotaMirror;
export type AiDialogDailyQuotaState = AiDialogMonthlyQuotaState;
export const readAiDialogDailyQuota = readAiDialogMonthlyQuota;
export const recordAiDialogDailyQuotaFromServer = recordAiDialogMonthlyQuotaFromServer;
export const markAiDialogDailyQuotaExhausted = markAiDialogMonthlyQuotaExhausted;

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
