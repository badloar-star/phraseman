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
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { DebugLogger } from './debug-logger';

const FUNCTIONS_REGION = 'us-central1';

export type AccountDeleteStatus = Readonly<{
  pending: boolean;
  restorable?: boolean;
  daysLeft?: number;
  deadlineMs?: number;
}>;

async function callable<TReq extends object, TRes>(name: string) {
  const { getApp } = await import('@react-native-firebase/app');
  const { getFunctions, httpsCallable } = await import('@react-native-firebase/functions');
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

/** Идёт ли по этому аккаунту удаление и можно ли ещё вернуть. */
export async function fetchAccountDeleteStatus(): Promise<AccountDeleteStatus | null> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return null;
  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
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
    await initFirebaseAppCheckIfAvailable().catch(() => {});
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
