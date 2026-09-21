/**
 * Premium video-watch runes client.
 *
 * Durations are never sent by the device. Playback opens a server-timestamped
 * session and closing/pausing claims that exact immutable session. One pending
 * `{sessionId, requestId}` receipt is persisted and all operations are
 * serialized per account, so pause/resume races cannot clear or mutate newer
 * work and a lost response retries the same operation.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { isCurrentAccountGeneration, type AccountGenerationToken } from './account_generation';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { DebugLogger } from './debug-logger';
import { mergeLevelSpinServerStars } from './level_spin_star_grants';

const REGION = 'us-central1';
const ID_RE = /^[A-Za-z0-9_-]{12,96}$/;

/**
 * Трассировка рун за просмотр (владелец 2026-09-21: «нет начисления рун»).
 *
 * зачем не под `__DEV__`: каждый ранний выход ниже гасит начисление молча, и в
 * прод-сборке «руны не капают» не оставляло ни строчки. Правило владельца
 * «сперва логи, потом починка»: причина КАЖДОГО раннего выхода обязана попасть
 * в журнал под общим префиксом, чтобы цепочка вытаскивалась одним поиском.
 */
function trace(step: string, payload: Readonly<Record<string, unknown>>): void {
  try {
    console.log(`[VIDEO-RUNES] client:${step} ${JSON.stringify(payload)}`);
  } catch (error: unknown) {
    console.log(`[VIDEO-RUNES] client:${step} trace_serialize_failed`, // guard-ok: причина обязана писаться
      error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  }
}

export const VIDEO_WATCH_RUNES_PER_MINUTE = 3;
/** 600 base runes = 200 rewarded minutes (3 h 20 min) per UTC day. */
export const VIDEO_WATCH_RUNES_DAILY_CAP = 600;

type PendingClaim = Readonly<{ sessionId: string; requestId: string }>;
type PendingProgress = Readonly<{ sessionId: string; requestId: string; progressSeq: number; positionMs: number }>;
type ProgressCursor = Readonly<{ sessionId: string; nextSeq: number }>;

type ClaimWire = {
  ok?: boolean;
  granted?: number;
  reason?: string;
  grantedToday?: number;
  dailyCap?: number;
  stars?: number;
  starsEarnedTotal?: number;
  starsSeq?: number;
  carryMs?: number;
  creditedMs?: number;
  verifiedMs?: number;
};

export type VideoWatchClaimResult =
  | { ok: false; reason: string }
  | { ok: true; granted: number; grantedToday: number; reason: string };

export type VideoWatchSessionStartResult =
  | { ok: false; reason: string }
  | { ok: true; sessionId: string; grantedToday: number; carryMs: number };

function pendingClaimKey(stableId: string): string {
  return `video_watch_runes_pending_claim_v2:${stableId}`;
}

function pendingProgressKey(stableId: string): string {
  return `video_watch_runes_pending_progress_v2:${stableId}`;
}

function progressCursorKey(stableId: string): string {
  return `video_watch_runes_progress_cursor_v2:${stableId}`;
}

function legacyPendingKeys(stableId: string): string[] {
  return [
    `video_watch_runes_pending_v1:${stableId}`,
    `video_watch_runes_request_v1:${stableId}`,
  ];
}

function makeId(prefix: 'vws' | 'vwc'): string {
  const rand = Math.random().toString(36).slice(2, 12);
  return `${prefix}${Date.now().toString(36)}${rand}`.slice(0, 96);
}

function parsePendingClaim(raw: string | null): PendingClaim | null {
  if (!raw) return null;
  try {
    const row = JSON.parse(raw) as Partial<PendingClaim>;
    if (!ID_RE.test(String(row.sessionId ?? '')) || !ID_RE.test(String(row.requestId ?? ''))) return null;
    return { sessionId: String(row.sessionId), requestId: String(row.requestId) };
  } catch {
    return null;
  }
}

function parsePendingProgress(raw: string | null): PendingProgress | null {
  if (!raw) return null;
  try {
    const row = JSON.parse(raw) as Partial<PendingProgress>;
    const positionMs = Number(row.positionMs);
    const progressSeq = Number(row.progressSeq);
    if (!ID_RE.test(String(row.sessionId ?? '')) || !ID_RE.test(String(row.requestId ?? ''))
      || !Number.isSafeInteger(progressSeq) || progressSeq < 1
      || !Number.isFinite(positionMs) || positionMs < 0) return null;
    return { sessionId: String(row.sessionId), requestId: String(row.requestId), progressSeq, positionMs };
  } catch {
    return null;
  }
}

function parseProgressCursor(raw: string | null, sessionId: string): ProgressCursor {
  try {
    const row = raw ? JSON.parse(raw) as Partial<ProgressCursor> : null;
    if (row?.sessionId === sessionId && Number.isSafeInteger(row.nextSeq) && Number(row.nextSeq) >= 1) {
      return { sessionId, nextSeq: Number(row.nextSeq) };
    }
  } catch (error: unknown) {
    // Немой catch запрещён (владелец): битый курсор тихо откатывал
    // прогресс начало и сжигал уже начисленные руны без следа в журнале.
    console.warn('[VIDEO-RUNES] cursor_parse_failed — счёт начат заново', // guard-ok: проглоченная ошибка обязана писать причину
      error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  }
  return { sessionId, nextSeq: 1 };
}

const accountTails = new Map<string, Promise<void>>();

async function serializeAccountOperation<T>(stableId: string, work: () => Promise<T>): Promise<T> {
  const prior = accountTails.get(stableId) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => { release = resolve; });
  const tail = prior.then(() => next, () => next);
  accountTails.set(stableId, tail);
  await prior.catch(() => {});
  try {
    return await work();
  } finally {
    release();
    if (accountTails.get(stableId) === tail) accountTails.delete(stableId);
  }
}

function callable() {
  return httpsCallable<{
    stableId: string;
    action: 'start' | 'progress' | 'claim';
    sessionId: string;
    requestId?: string;
    progressSeq?: number;
    positionMs?: number;
  }, ClaimWire>(getFunctions(getApp(), REGION), 'videoWatchRunesClaim');
}

async function mergeAuthoritativeStars(
  token: AccountGenerationToken,
  data: ClaimWire,
): Promise<void> {
  const stars = Number(data.stars);
  const earned = Number(data.starsEarnedTotal);
  const seq = Number(data.starsSeq);
  await mergeLevelSpinServerStars(token, {
    ...(Number.isFinite(stars) ? { stars: Math.max(0, Math.trunc(stars)) } : {}),
    ...(Number.isFinite(earned) ? { starsEarnedTotal: Math.max(0, Math.trunc(earned)) } : {}),
    ...(Number.isSafeInteger(seq) && seq >= 0 ? { starsSeq: seq } : {}),
  });
}

async function flushPendingProgressUnlocked(
  token: AccountGenerationToken,
  stableId: string,
): Promise<{ ok: boolean; reason: string; verifiedMs?: number }> {
  const key = pendingProgressKey(stableId);
  const pending = parsePendingProgress(await AsyncStorage.getItem(key).catch(() => null));
  if (!pending) return { ok: true, reason: 'nothing_pending' };
  if (!isCurrentAccountGeneration(token, stableId)) {
    trace('progress_blocked', { reason: 'account_changed_before_progress', sessionId: pending.sessionId });
    return { ok: false, reason: 'account_changed_before_progress' };
  }
  const progressStartedMs = Date.now();
  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const response = await callable()({
      stableId,
      action: 'progress',
      sessionId: pending.sessionId,
      requestId: pending.requestId,
      progressSeq: pending.progressSeq,
      positionMs: pending.positionMs,
    });
    // Ответ сервера на progress: `creditedMs` и `verifiedMs` показывают, сколько
    // времени сервер реально засчитал — расхождение с локальным счётом и есть
    // корень «бейдж двигается, а рун нет».
    trace('progress_response', {
      sessionId: pending.sessionId,
      progressSeq: pending.progressSeq,
      sentPositionMs: pending.positionMs,
      reason: response.data.reason ?? null,
      creditedMs: response.data.creditedMs ?? null,
      verifiedMs: response.data.verifiedMs ?? null,
      tookMs: Date.now() - progressStartedMs,
    });
    if (!isCurrentAccountGeneration(token, stableId)) {
      trace('progress_blocked', { reason: 'account_changed_after_progress', sessionId: pending.sessionId });
      return { ok: false, reason: 'account_changed_after_progress' };
    }
    const stillPending = parsePendingProgress(await AsyncStorage.getItem(key).catch(() => null));
    if (stillPending?.requestId === pending.requestId) {
      await AsyncStorage.setItem(
        progressCursorKey(stableId),
        JSON.stringify({ sessionId: pending.sessionId, nextSeq: pending.progressSeq + 1 }),
      );
      await AsyncStorage.removeItem(key);
    }
    return { ok: true, reason: String(response.data.reason ?? 'progress_accepted'), verifiedMs: Number(response.data.verifiedMs) || 0 };
  } catch (error) {
    const code = String((error as { code?: unknown })?.code ?? '');
    const dropped = code.includes('failed-precondition') || code.includes('permission-denied');
    if (dropped) {
      await AsyncStorage.removeItem(key).catch(() => {});
    }
    // `dropped: true` = этот отрезок просмотра выброшен НАВСЕГДА. Без лога такая
    // потеря времени была полностью невидимой.
    trace('progress_threw', {
      code: code || 'unknown',
      message: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      sessionId: pending.sessionId,
      progressSeq: pending.progressSeq,
      droppedPendingProgress: dropped,
      tookMs: Date.now() - progressStartedMs,
    });
    return { ok: false, reason: `progress_failed:${code || 'unknown'}` };
  }
}

export async function reportVideoWatchRuneProgress(
  token: AccountGenerationToken,
  stableId: string,
  sessionId: string,
  positionMs: number,
): Promise<{ ok: boolean; reason: string; verifiedMs?: number }> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    trace('progress_blocked', { reason: 'cloud_disabled', isExpoGo: IS_EXPO_GO, cloudSyncEnabled: CLOUD_SYNC_ENABLED });
    return { ok: false, reason: 'cloud_disabled' };
  }
  if (!ID_RE.test(sessionId) || !Number.isFinite(positionMs) || positionMs < 0) {
    trace('progress_blocked', { reason: 'invalid_progress', sessionId, positionMs });
    return { ok: false, reason: 'invalid_progress' };
  }
  return serializeAccountOperation(stableId, async () => {
    const flushed = await flushPendingProgressUnlocked(token, stableId);
    if (!flushed.ok) return flushed;
    const cursor = parseProgressCursor(
      await AsyncStorage.getItem(progressCursorKey(stableId)).catch(() => null),
      sessionId,
    );
    const pending: PendingProgress = {
      sessionId,
      requestId: makeId('vwc'),
      progressSeq: cursor.nextSeq,
      positionMs: Math.floor(positionMs),
    };
    await AsyncStorage.setItem(pendingProgressKey(stableId), JSON.stringify(pending));
    return flushPendingProgressUnlocked(token, stableId);
  });
}

async function flushPendingClaimUnlocked(
  token: AccountGenerationToken,
  stableId: string,
): Promise<VideoWatchClaimResult> {
  const pending = parsePendingClaim(await AsyncStorage.getItem(pendingClaimKey(stableId)).catch(() => null));
  if (!pending) {
    trace('claim_blocked', { reason: 'nothing_pending', stableId });
    return { ok: false, reason: 'nothing_pending' };
  }
  if (!isCurrentAccountGeneration(token, stableId)) {
    trace('claim_blocked', { reason: 'account_changed_before_claim', sessionId: pending.sessionId });
    return { ok: false, reason: 'account_changed_before_claim' };
  }

  const claimStartedMs = Date.now();
  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const response = await callable()({
      stableId,
      action: 'claim',
      sessionId: pending.sessionId,
      requestId: pending.requestId,
    });
    // Финальный результат: сколько рун сервер реально начислил и почему.
    // `granted: 0` при `reason: 'no_complete_minute'` = сервер не засчитал ни
    // одной полной минуты, хотя человек смотрел.
    trace('claim_response', {
      sessionId: pending.sessionId,
      reason: response.data.reason ?? null,
      granted: response.data.granted ?? null,
      grantedToday: response.data.grantedToday ?? null,
      dailyCap: response.data.dailyCap ?? null,
      serverStars: response.data.stars ?? null,
      starsSeq: response.data.starsSeq ?? null,
      carryMs: response.data.carryMs ?? null,
      tookMs: Date.now() - claimStartedMs,
    });
    if (!isCurrentAccountGeneration(token, stableId)) {
      trace('claim_blocked', { reason: 'account_changed_after_claim', sessionId: pending.sessionId });
      return { ok: false, reason: 'account_changed_after_claim' };
    }
    await mergeAuthoritativeStars(token, response.data);
    // Remove only the exact immutable batch that just received confirmation.
    const stillPending = parsePendingClaim(
      await AsyncStorage.getItem(pendingClaimKey(stableId)).catch(() => null),
    );
    if (stillPending?.sessionId === pending.sessionId && stillPending.requestId === pending.requestId) {
      await AsyncStorage.removeItem(pendingClaimKey(stableId)).catch(() => {});
    }
    return {
      ok: true,
      granted: Math.max(0, Math.trunc(Number(response.data.granted) || 0)),
      grantedToday: Math.max(0, Math.trunc(Number(response.data.grantedToday) || 0)),
      reason: String(response.data.reason ?? 'granted'),
    };
  } catch (error) {
    const code = String((error as { code?: unknown })?.code ?? '');
    const dropped = code.includes('permission-denied') || code.includes('failed-precondition');
    if (dropped) {
      await AsyncStorage.removeItem(pendingClaimKey(stableId)).catch(() => {});
    }
    // `dropped: true` = весь сеанс просмотра выброшен без начисления.
    trace('claim_threw', {
      code: code || 'unknown',
      message: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      sessionId: pending.sessionId,
      droppedPendingClaim: dropped,
      tookMs: Date.now() - claimStartedMs,
    });
    DebugLogger.error(
      'video_watch_runes_client:claim_failed',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return {
      ok: false,
      reason: code.includes('permission-denied')
        ? 'premium_required'
        : `claim_failed:${code || 'unknown'}`,
    };
  }
}

export async function flushPendingVideoWatchRuneClaim(
  token: AccountGenerationToken,
  stableId: string,
): Promise<VideoWatchClaimResult> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { ok: false, reason: 'cloud_disabled' };
  return serializeAccountOperation(stableId, () => flushPendingClaimUnlocked(token, stableId));
}

async function recoverPendingVideoWatchRuneSessionUnlocked(
  token: AccountGenerationToken,
  stableId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const storedProgress = parsePendingProgress(
    await AsyncStorage.getItem(pendingProgressKey(stableId)).catch(() => null),
  );
  let storedClaim = parsePendingClaim(
    await AsyncStorage.getItem(pendingClaimKey(stableId)).catch(() => null),
  );
  if (storedProgress && storedClaim && storedProgress.sessionId !== storedClaim.sessionId) {
    return { ok: false, reason: 'pending_session_conflict' };
  }
  // Older builds could crash with verified progress durable but no claim
  // intent. Bind that session to one immutable request before touching the
  // network, so an offline retry cannot strand or replace its carry.
  if (storedProgress && !storedClaim) {
    storedClaim = { sessionId: storedProgress.sessionId, requestId: makeId('vwc') };
    await AsyncStorage.setItem(pendingClaimKey(stableId), JSON.stringify(storedClaim));
  }
  const progress = await flushPendingProgressUnlocked(token, stableId);
  if (!progress.ok) return { ok: false, reason: progress.reason };
  if (storedClaim) {
    const claim = await flushPendingClaimUnlocked(token, stableId);
    if (!claim.ok) return { ok: false, reason: claim.reason };
  }
  return { ok: true };
}

export async function startVideoWatchRuneSession(
  token: AccountGenerationToken,
  stableId: string,
): Promise<VideoWatchSessionStartResult> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    // Самый частый молчаливый отказ: в Expo Go руны за видео не работают вовсе.
    trace('start_blocked', { reason: 'cloud_disabled', isExpoGo: IS_EXPO_GO, cloudSyncEnabled: CLOUD_SYNC_ENABLED });
    return { ok: false, reason: 'cloud_disabled' };
  }
  return serializeAccountOperation(stableId, async () => {
    const recovered = await recoverPendingVideoWatchRuneSessionUnlocked(token, stableId);
    if (!recovered.ok) {
      trace('start_blocked', { reason: 'recover_failed', detail: recovered.reason, stableId });
      return recovered;
    }
    if (!isCurrentAccountGeneration(token, stableId)) {
      trace('start_blocked', { reason: 'account_changed_before_start', stableId, generation: token.generation });
      return { ok: false, reason: 'account_changed_before_start' };
    }

    const startedAtMs = Date.now();
    try {
      await initFirebaseAppCheckIfAvailable().catch(() => {});
      const sessionId = makeId('vws');
      const response = await callable()({ stableId, action: 'start', sessionId });
      trace('start_response', {
        sessionId,
        reason: response.data.reason ?? null,
        grantedToday: response.data.grantedToday ?? null,
        dailyCap: response.data.dailyCap ?? null,
        carryMs: response.data.carryMs ?? null,
        tookMs: Date.now() - startedAtMs,
      });
      if (!isCurrentAccountGeneration(token, stableId)) {
        trace('start_blocked', { reason: 'account_changed_after_start', sessionId });
        return { ok: false, reason: 'account_changed_after_start' };
      }
      // Old client-side minute totals are intentionally not migrated into the
      // currency protocol: the server cannot prove their elapsed time.
      await AsyncStorage.multiRemove(legacyPendingKeys(stableId)).catch(() => {});
      await AsyncStorage.setItem(progressCursorKey(stableId), JSON.stringify({ sessionId, nextSeq: 1 }));
      return {
        ok: true,
        sessionId,
        grantedToday: Math.max(0, Math.trunc(Number(response.data.grantedToday) || 0)),
        carryMs: Math.max(0, Math.min(59_999, Math.trunc(Number(response.data.carryMs) || 0))),
      };
    } catch (error) {
      const code = String((error as { code?: unknown })?.code ?? '');
      // `permission-denied` здесь означает «нет премиума» — самая вероятная
      // причина, по которой у владельца счётчик не двигается вообще.
      trace('start_threw', {
        code: code || 'unknown',
        message: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        tookMs: Date.now() - startedAtMs,
        stableId,
      });
      DebugLogger.error(
        'video_watch_runes_client:start_failed',
        error instanceof Error ? error : new Error(String(error)),
        'warning',
      );
      return {
        ok: false,
        reason: code.includes('permission-denied')
          ? 'premium_required'
          : `start_failed:${code || 'unknown'}`,
      };
    }
  });
}

export async function claimVideoWatchRuneSession(
  token: AccountGenerationToken,
  stableId: string,
  sessionId: string,
): Promise<VideoWatchClaimResult> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { ok: false, reason: 'cloud_disabled' };
  if (!ID_RE.test(sessionId)) return { ok: false, reason: 'invalid_session_id' };
  return serializeAccountOperation(stableId, async () => {
    let existing = parsePendingClaim(await AsyncStorage.getItem(pendingClaimKey(stableId)).catch(() => null));
    if (existing && existing.sessionId !== sessionId) {
      const recovered = await recoverPendingVideoWatchRuneSessionUnlocked(token, stableId);
      if (!recovered.ok) return recovered;
      existing = null;
    }
    const pending = existing?.sessionId === sessionId
      ? existing
      : { sessionId, requestId: makeId('vwc') };
    if (!existing) {
      // The claim identity must survive a crash/offline failure in the final
      // progress heartbeat. Persist it before that heartbeat is attempted.
      await AsyncStorage.setItem(pendingClaimKey(stableId), JSON.stringify(pending));
    }
    const progress = await flushPendingProgressUnlocked(token, stableId);
    if (!progress.ok) return { ok: false, reason: progress.reason };
    return flushPendingClaimUnlocked(token, stableId);
  });
}

export default function __RouteShim() {
  return null;
}
