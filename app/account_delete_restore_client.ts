// ════════════════════════════════════════════════════════════════════════════
// account_delete_restore_client.ts — «Восстановить аккаунт?» в течение 14 дней.
//
// зачем (владелец, 2026-08-31): удаление больше не мгновенное — 14 дней
// аккаунт ждёт на случай, если человек нажал «Удалить» случайно. Когда он
// пытается войти в такой аккаунт, вход отвечает account_delete_pending, и
// вместо тупика приложение спрашивает: «Восстановить?» Согласие снимает
// заявку на сервере, и тот же тап пускает внутрь как обычно.
//
// Firebase-экономия: статус спрашивается ТОЛЬКО когда вход уже упёрся в
// блокировку (одно чтение по известному id), а не на каждом запуске.
// ════════════════════════════════════════════════════════════════════════════

import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { DebugLogger } from './debug-logger';

const FUNCTIONS_REGION = 'us-central1';

/**
 * Сводка для окна «Восстановить аккаунт?» (координатор 25.10, макет account-delete-variant-b §3): серия, фразы, урок N из 32.
 * Приходит только от нового сервера; старый сервер её не шлёт — окно без цифр.
 */
export type AccountRestoreSummary = Readonly<{
  streakDays: number;
  phrasesLearned: number;
  currentLesson: number;
  lessonTotal: number;
}>;

export type AccountDeleteStatus = Readonly<{
  pending: boolean;
  restorable?: boolean;
  daysLeft?: number;
  deadlineMs?: number;
  summary?: AccountRestoreSummary;
}>;

function wholeNumber(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null;
}

/**
 * Проверка сводки с сервера: любое поле не того вида — сводки нет (окно без цифр), причина в журнале.
 * зачем: ответ сервера — внешние данные; кривая цифра в окне восстановления хуже, чем её отсутствие.
 */
export function parseAccountRestoreSummary(raw: unknown): AccountRestoreSummary | null {
  if (raw == null) {
    console.log('[ACCOUNT-RESTORE] summary absent (old server or read failed)'); // guard-ok: ветка и причина
    return null;
  }
  const row = (typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const lessonTotal = wholeNumber(row.lessonTotal, 1, 999);
  const summary = {
    streakDays: wholeNumber(row.streakDays, 0, 100_000),
    phrasesLearned: wholeNumber(row.phrasesLearned, 0, 10_000_000),
    currentLesson: lessonTotal === null ? null : wholeNumber(row.currentLesson, 1, lessonTotal),
    lessonTotal,
  };
  if (Object.values(summary).some((v) => v === null)) {
    console.warn('[ACCOUNT-RESTORE] summary invalid', JSON.stringify(row).slice(0, 200)); // guard-ok: ранний выход с причиной
    return null;
  }
  return summary as AccountRestoreSummary;
}

async function callable<TReq extends object, TRes>(name: string) {
  const { getApp } = await import('@react-native-firebase/app');
  const { getFunctions, httpsCallable } = await import('@react-native-firebase/functions');
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

/** Идёт ли по этому аккаунту удаление и можно ли ещё вернуть. */
export async function fetchAccountDeleteStatus(): Promise<AccountDeleteStatus | null> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return null;
  try {
    const fn = await callable<Record<string, never>, AccountDeleteStatus>('accountDeleteStatusMine');
    const res = await fn({} as Record<string, never>);
    return res.data ?? null;
  } catch (e) {
    // зачем (запрет немого catch): не смогли узнать статус — модалку не
    // покажем, человек увидит прежний текст ошибки. Причина обязана быть видна.
    DebugLogger.error(
      'account_delete_restore:status_failed',
      e instanceof Error ? e : new Error(String(e)),
      'warning',
    );
    return null;
  }
}

export type RestoreOutcome =
  | { ok: true }
  | { ok: false; reason: 'not_restorable' | 'missing' | 'network' };

/** Отменяет удаление. После успеха вход проходит как обычно. */
export async function restoreDeletedAccount(): Promise<RestoreOutcome> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return { ok: false, reason: 'network' };
  try {
    const fn = await callable<Record<string, never>, { restored: boolean }>('accountDeleteRestoreMine');
    const res = await fn({} as Record<string, never>);
    return res.data?.restored ? { ok: true } : { ok: false, reason: 'not_restorable' };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Восстановление — необратимое решение в обратную сторону: причина отказа
    // обязана доехать до сервера (critical), а не остаться на устройстве.
    DebugLogger.error(
      'account_delete_restore:restore_failed',
      e instanceof Error ? e : new Error(message),
      'critical',
    );
    if (message.includes('not_restorable')) return { ok: false, reason: 'not_restorable' };
    if (message.includes('not-found') || message.includes('job_missing')) {
      return { ok: false, reason: 'missing' };
    }
    return { ok: false, reason: 'network' };
  }
}
