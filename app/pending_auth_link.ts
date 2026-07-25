/**
 * Журнал отложенной привязки провайдера (тихий deferred link).
 *
 * Сценарий: native/Google-вход прошёл, Firebase-сессия провайдера жива, но
 * серверный ensure auth_link упал ТРАНЗИЕНТНО (сеть/холодный старт/App Check).
 * Вместо ошибки-тупика юзер входит в приложение, а намерение привязки пишется
 * сюда. Сходимость БЕЗ нашего кода: обычный boot-restore на следующих запусках
 * зовёт тот же ensureStableAuthLinkForStableIdDetailed для того же stableId —
 * как только он успешен, облачный прогресс подтягивается штатно и молча.
 * Журнал даёт: (а) фоновый ретрай в той же/следующей сессии, (b) наблюдаемость,
 * (c) единую точку очистки при смене/удалении аккаунта.
 *
 * Безопасность: сюда попадают ТОЛЬКО транзиентные failure-классы локальной
 * ветки (stableId остаётся локальным, swap не требуется, чужой прогресс не
 * показывается). stable_id_mismatch сюда не доходит — он обрабатывается выше
 * как защитный отказ.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logEvent } from './firebase';
import { ensureStableAuthLinkForStableIdDetailed } from './cloud_sync';

const PENDING_AUTH_LINK_KEY = 'pending_auth_link_v1';

export type PendingAuthLink = {
  v: 1;
  provider: 'google' | 'apple';
  email: string | null;
  displayName: string | null;
  stableId: string;
  failure: string;
  queuedAt: number;
  lastAttemptAt: number;
  attempts: number;
};

export type PendingAuthLinkInput = Readonly<{
  provider: 'google' | 'apple';
  email: string | null;
  displayName: string | null;
  stableId: string;
  failure: string;
}>;

export async function recordPendingAuthLink(input: PendingAuthLinkInput): Promise<void> {
  try {
    const now = Date.now();
    const record: PendingAuthLink = {
      v: 1,
      provider: input.provider,
      email: input.email,
      displayName: input.displayName,
      stableId: input.stableId,
      failure: input.failure,
      queuedAt: now,
      lastAttemptAt: now,
      attempts: 0,
    };
    await AsyncStorage.setItem(PENDING_AUTH_LINK_KEY, JSON.stringify(record));
  } catch {
    // Журнал best-effort: его потеря не ломает вход — boot-restore всё равно сойдётся.
  }
}

export async function readPendingAuthLink(): Promise<PendingAuthLink | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_AUTH_LINK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingAuthLink>;
    if (parsed?.v !== 1 || typeof parsed.stableId !== 'string' || !parsed.stableId) return null;
    if (parsed.provider !== 'google' && parsed.provider !== 'apple') return null;
    return parsed as PendingAuthLink;
  } catch {
    return null;
  }
}

export async function clearPendingAuthLink(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_AUTH_LINK_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Фоновая дожимка: один ensure-ретрай по журналу. При успехе журнал снимается,
 * дальше обычный restoreFromCloud (он же boot-restore) подтянет облако штатно.
 * Никакого UI и уведомлений — юзер не должен знать, что что-то догонялось.
 */
export async function processPendingAuthLink(): Promise<'none' | 'completed' | 'still_pending'> {
  const pending = await readPendingAuthLink();
  if (!pending) return 'none';
  try {
    const devicePlatform: 'ios' | 'android' | 'web' =
      Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    const link = await ensureStableAuthLinkForStableIdDetailed(pending.stableId, {
      provider: pending.provider,
      email: pending.email,
      displayName: pending.displayName,
      lastSignInAt: Date.now(),
      devicePlatform,
    });
    if (link.ok && link.stableUid === pending.stableId) {
      await clearPendingAuthLink();
      try {
        logEvent('auth_recovery_completed_silently', { provider: pending.provider, attempts: pending.attempts + 1 });
      } catch {
        /* ignore */
      }
      return 'completed';
    }
    // Сервер ответил, но anchor указывает не на наш stableId — это уже не
    // транзиент: журнал снимаем, дальше разруливает обычный sign-in flow.
    if (link.ok && link.stableUid && link.stableUid !== pending.stableId) {
      await clearPendingAuthLink();
      return 'completed';
    }
    const next: PendingAuthLink = { ...pending, attempts: pending.attempts + 1, lastAttemptAt: Date.now() };
    await AsyncStorage.setItem(PENDING_AUTH_LINK_KEY, JSON.stringify(next)).catch(() => {});
    return 'still_pending';
  } catch {
    return 'still_pending';
  }
}

/* expo-router route shim: утилитный модуль, не экран */
export default function __RouteShim() { return null; }
