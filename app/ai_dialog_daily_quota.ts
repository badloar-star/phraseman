/**
 * ai_dialog_daily_quota.ts — клиентское зеркало дневной квоты реплик ИИ-диалога.
 *
 * зачем (владелец, 2026-09-13): у обычного аккаунта должен быть настоящий
 * дневной лимит диалогов, а не глухой «только в Plus». Сервер уже считает
 * реплики (functions/src/premium_dialog.ts: enforceDailyQuota, `remainingQuota`
 * в каждом ответе) — он и остаётся источником истины. Клиент лишь запоминает
 * последний ответ сервера на сегодня, чтобы:
 *   • не пускать в диалог с уже исчерпанной квотой (0 сетевых вызовов);
 *   • после `dialog_free_limit` показать контекстный пейвол `dialog_limit`;
 *   • завтра (новый локальный день) снова открыть вход.
 *
 * Никакого локального «счётчика попыток» здесь нет: число всегда с сервера.
 * Пожизненный бесплатный триал остаётся отменённым (см. dialogs_limit_session.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { REVENUE_DAILY_LIMITS } from './revenue_daily_limits';

export const AI_DIALOG_DAILY_QUOTA_PREFIX = 'ai_dialog_daily_quota:v1:';

export type AiDialogDailyQuotaMirror = Readonly<{
  /** Локальная дата `YYYY-MM-DD` в момент ответа сервера. */
  period: string;
  /** Осталось реплик по последнему ответу сервера. */
  remaining: number;
  limit: number;
  updatedAtMs: number;
}>;

export type AiDialogDailyQuotaState =
  | Readonly<{ status: 'unknown'; limit: number }>
  | Readonly<{ status: 'allowed'; remaining: number; limit: number; period: string }>
  | Readonly<{ status: 'exhausted'; remaining: 0; limit: number; period: string }>;

export function aiDialogDailyQuotaStorageKey(stableUid: string): string {
  return `${AI_DIALOG_DAILY_QUOTA_PREFIX}${encodeURIComponent(stableUid)}`;
}

export function localDayPeriod(nowMs: number = Date.now()): string {
  const date = new Date(nowMs);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseMirror(raw: string | null): AiDialogDailyQuotaMirror | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AiDialogDailyQuotaMirror> | null;
    if (!parsed || typeof parsed.period !== 'string' || !Number.isFinite(parsed.remaining)) return null;
    return Object.freeze({
      period: parsed.period,
      remaining: Math.max(0, Math.floor(Number(parsed.remaining))),
      limit: Math.max(1, Math.floor(Number(parsed.limit) || REVENUE_DAILY_LIMITS.ai_dialog_replies)),
      updatedAtMs: Math.max(0, Math.floor(Number(parsed.updatedAtMs) || 0)),
    });
  } catch (error: unknown) {
    console.warn('[DIALOG-QUOTA] mirror:parse → unknown', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Состояние на вход. `unknown` — сегодня сервер ещё не отвечал (или новый день):
 * входим, сервер решит. `exhausted` — сегодня сервер уже сказал «0».
 */
export async function readAiDialogDailyQuota(stableUid: string | null, nowMs: number = Date.now()): Promise<AiDialogDailyQuotaState> {
  const limit = REVENUE_DAILY_LIMITS.ai_dialog_replies;
  if (!stableUid) {
    console.log('[DIALOG-QUOTA] read:out unknown — нет stableUid');
    return { status: 'unknown', limit };
  }
  try {
    const mirror = parseMirror(await AsyncStorage.getItem(aiDialogDailyQuotaStorageKey(stableUid)));
    const today = localDayPeriod(nowMs);
    if (!mirror || mirror.period !== today) {
      console.log('[DIALOG-QUOTA] read:out unknown', JSON.stringify({ hadMirror: mirror != null, mirrorPeriod: mirror?.period ?? null, today }));
      return { status: 'unknown', limit };
    }
    if (mirror.remaining <= 0) {
      console.log('[DIALOG-QUOTA] read:out exhausted', JSON.stringify({ period: today, limit: mirror.limit }));
      return { status: 'exhausted', remaining: 0, limit: mirror.limit, period: today };
    }
    return { status: 'allowed', remaining: mirror.remaining, limit: mirror.limit, period: today };
  } catch (error: unknown) {
    console.warn('[DIALOG-QUOTA] read:catch → unknown', error instanceof Error ? error.message : String(error));
    return { status: 'unknown', limit };
  }
}

/** Ответ сервера пришёл с `remainingQuota` — запоминаем как факт на сегодня. */
export async function recordAiDialogDailyQuotaFromServer(
  stableUid: string | null,
  remainingQuota: unknown,
  nowMs: number = Date.now(),
): Promise<void> {
  if (!stableUid) return;
  const remaining = Number(remainingQuota);
  if (!Number.isFinite(remaining)) {
    console.log('[DIALOG-QUOTA] record:skip — remainingQuota не число', JSON.stringify({ remainingQuota }));
    return;
  }
  const mirror: AiDialogDailyQuotaMirror = Object.freeze({
    period: localDayPeriod(nowMs),
    remaining: Math.max(0, Math.floor(remaining)),
    limit: REVENUE_DAILY_LIMITS.ai_dialog_replies,
    updatedAtMs: nowMs,
  });
  try {
    await AsyncStorage.setItem(aiDialogDailyQuotaStorageKey(stableUid), JSON.stringify(mirror));
    console.log('[DIALOG-QUOTA] record:ok', JSON.stringify(mirror));
  } catch (error: unknown) {
    console.warn('[DIALOG-QUOTA] record:catch', error instanceof Error ? error.message : String(error));
  }
}

/** Сервер отказал `dialog_free_limit` — сегодня квота ноль, независимо от зеркала. */
export async function markAiDialogDailyQuotaExhausted(stableUid: string | null, nowMs: number = Date.now()): Promise<void> {
  await recordAiDialogDailyQuotaFromServer(stableUid, 0, nowMs);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
