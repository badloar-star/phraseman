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
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { logEvent } from './firebase';
import { ensureStableAuthLinkForStableIdDetailed, getCurrentUid } from './cloud_sync';

const PENDING_AUTH_LINK_KEY = 'pending_auth_link_v1';
const PENDING_AUTH_LINK_TTL_MS = 24 * 60 * 60_000;
const PENDING_AUTH_LINK_MAX_ATTEMPTS = 5;
const PENDING_AUTH_LINK_BACKOFF_MS = [30_000, 2 * 60_000, 10 * 60_000, 60 * 60_000, 6 * 60 * 60_000] as const;

type PendingAuthLinkFailure =
  | 'app_check_unavailable'
  | 'identity_unavailable'
  | 'transport_unavailable';

type PendingAuthLinkQuarantineReason =
  | 'expired'
  | 'attempts_exhausted'
  | 'stable_uid_mismatch'
  | 'auth_uid_changed'
  | 'auth_uid_unbound';

export type PendingAuthLink = {
  v: 2;
  provider: 'google' | 'apple';
  stableId: string;
  /** SHA-256 only: never persist the raw Firebase Auth UID in this journal. */
  expectedAuthUidHash: string | null;
  failure: PendingAuthLinkFailure;
  queuedAt: number;
  lastAttemptAt: number;
  nextAttemptAt: number;
  expiresAt: number;
  attempts: number;
  status: 'pending' | 'quarantined';
  quarantineReason?: PendingAuthLinkQuarantineReason;
};

export type PendingAuthLinkInput = Readonly<{
  provider: 'google' | 'apple';
  /** Принимаются для совместимости вызывающего sign-in, но никогда не сохраняются. */
  email: string | null;
  displayName: string | null;
  stableId: string;
  failure: string;
}>;

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeFailure(value: unknown): PendingAuthLinkFailure {
  if (
    value === 'app_check_unavailable'
    || value === 'identity_unavailable'
    || value === 'transport_unavailable'
  ) return value;
  return 'identity_unavailable';
}

async function fingerprintAuthUid(authUid: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `pending-auth-link-v2:${authUid}`,
  );
}

async function writePendingAuthLink(record: PendingAuthLink): Promise<boolean> {
  try {
    await AsyncStorage.setItem(PENDING_AUTH_LINK_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

function normalizePendingAuthLink(value: unknown, now: number): PendingAuthLink | null {
  if (!value || typeof value !== 'object') return null;
  const parsed = value as Partial<Omit<PendingAuthLink, 'v'>> & { v?: unknown };
  if (parsed.v !== 1 && parsed.v !== 2) return null;
  if (parsed.provider !== 'google' && parsed.provider !== 'apple') return null;
  const stableId = typeof parsed.stableId === 'string' ? parsed.stableId.trim() : '';
  if (!stableId || stableId.length > 160) return null;
  const expectedAuthUidHash = parsed.v === 2
    && typeof parsed.expectedAuthUidHash === 'string'
    && /^[a-f0-9]{64}$/i.test(parsed.expectedAuthUidHash)
    ? parsed.expectedAuthUidHash.toLowerCase()
    : null;
  const queuedAt = finiteNumber(parsed.queuedAt, now);
  const attempts = Math.max(0, Math.min(
    PENDING_AUTH_LINK_MAX_ATTEMPTS,
    Math.floor(finiteNumber(parsed.attempts, 0)),
  ));
  // Pre-binding v1/v2 records cannot safely be assigned to whichever account happens
  // to be current at read time. Scrub them, but quarantine them fail-closed.
  const status = parsed.status === 'quarantined' || !expectedAuthUidHash
    ? 'quarantined'
    : 'pending';
  const quarantineReason =
    parsed.quarantineReason === 'expired'
    || parsed.quarantineReason === 'attempts_exhausted'
    || parsed.quarantineReason === 'stable_uid_mismatch'
    || parsed.quarantineReason === 'auth_uid_changed'
    || parsed.quarantineReason === 'auth_uid_unbound'
      ? parsed.quarantineReason
      : !expectedAuthUidHash ? 'auth_uid_unbound' : undefined;
  return {
    v: 2,
    provider: parsed.provider,
    stableId,
    expectedAuthUidHash,
    failure: sanitizeFailure(parsed.failure),
    queuedAt,
    lastAttemptAt: finiteNumber(parsed.lastAttemptAt, queuedAt),
    nextAttemptAt: finiteNumber(parsed.nextAttemptAt, queuedAt),
    expiresAt: finiteNumber(parsed.expiresAt, queuedAt + PENDING_AUTH_LINK_TTL_MS),
    attempts,
    status,
    ...(status === 'quarantined' && quarantineReason ? { quarantineReason } : {}),
  };
}

export async function recordPendingAuthLink(input: PendingAuthLinkInput): Promise<void> {
  try {
    const now = Date.now();
    const expectedAuthUid = getCurrentUid();
    let expectedAuthUidHash: string | null = null;
    if (expectedAuthUid) {
      try {
        expectedAuthUidHash = await fingerprintAuthUid(expectedAuthUid);
      } catch {
        expectedAuthUidHash = null;
      }
    }
    const record: PendingAuthLink = {
      v: 2,
      provider: input.provider,
      stableId: input.stableId.trim(),
      expectedAuthUidHash,
      failure: sanitizeFailure(input.failure),
      queuedAt: now,
      lastAttemptAt: now,
      nextAttemptAt: now,
      expiresAt: now + PENDING_AUTH_LINK_TTL_MS,
      attempts: 0,
      status: expectedAuthUidHash ? 'pending' : 'quarantined',
      ...(!expectedAuthUidHash ? { quarantineReason: 'auth_uid_unbound' as const } : {}),
    };
    await writePendingAuthLink(record);
  } catch {
    // Журнал best-effort: его потеря не ломает вход — boot-restore всё равно сойдётся.
  }
}

export async function readPendingAuthLink(): Promise<PendingAuthLink | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_AUTH_LINK_KEY);
    if (!raw) return null;
    const normalized = normalizePendingAuthLink(JSON.parse(raw), Date.now());
    if (!normalized) {
      await AsyncStorage.removeItem(PENDING_AUTH_LINK_KEY).catch(() => {});
      return null;
    }
    // Перезапись обязательна и для legacy v1: так email/displayName удаляются из
    // локального хранилища при первом чтении, а не только из in-memory объекта.
    if (raw !== JSON.stringify(normalized) && !await writePendingAuthLink(normalized)) {
      await AsyncStorage.removeItem(PENDING_AUTH_LINK_KEY).catch(() => {});
      return null;
    }
    return normalized;
  } catch {
    await AsyncStorage.removeItem(PENDING_AUTH_LINK_KEY).catch(() => {});
    return null;
  }
}

async function quarantinePendingAuthLink(
  pending: PendingAuthLink,
  quarantineReason: PendingAuthLinkQuarantineReason,
  attempts: number = pending.attempts,
): Promise<'quarantined'> {
  await writePendingAuthLink({
    ...pending,
    attempts,
    status: 'quarantined',
    quarantineReason,
    lastAttemptAt: Date.now(),
    nextAttemptAt: Number.MAX_SAFE_INTEGER,
  });
  return 'quarantined';
}

async function schedulePendingAuthLinkRetry(
  pending: PendingAuthLink,
): Promise<'still_pending' | 'quarantined'> {
  const now = Date.now();
  const attempts = pending.attempts + 1;
  if (attempts >= PENDING_AUTH_LINK_MAX_ATTEMPTS) {
    return quarantinePendingAuthLink(pending, 'attempts_exhausted', attempts);
  }
  const backoffIndex = Math.min(attempts - 1, PENDING_AUTH_LINK_BACKOFF_MS.length - 1);
  await writePendingAuthLink({
    ...pending,
    attempts,
    lastAttemptAt: now,
    nextAttemptAt: now + PENDING_AUTH_LINK_BACKOFF_MS[backoffIndex],
    status: 'pending',
  });
  return 'still_pending';
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
export async function processPendingAuthLink(): Promise<
  'none' | 'completed' | 'still_pending' | 'quarantined'
> {
  const pending = await readPendingAuthLink();
  if (!pending) return 'none';
  if (pending.status === 'quarantined') return 'quarantined';
  const now = Date.now();
  if (now >= pending.expiresAt) return quarantinePendingAuthLink(pending, 'expired');
  if (pending.attempts >= PENDING_AUTH_LINK_MAX_ATTEMPTS) {
    return quarantinePendingAuthLink(pending, 'attempts_exhausted');
  }
  if (now < pending.nextAttemptAt) return 'still_pending';
  try {
    const expectedAuthUid = getCurrentUid();
    if (!expectedAuthUid || !pending.expectedAuthUidHash) {
      return quarantinePendingAuthLink(pending, 'auth_uid_unbound');
    }
    const currentAuthUidHash = await fingerprintAuthUid(expectedAuthUid);
    if (currentAuthUidHash !== pending.expectedAuthUidHash) {
      return quarantinePendingAuthLink(pending, 'auth_uid_changed');
    }
    const devicePlatform: 'ios' | 'android' | 'web' =
      Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    const link = await ensureStableAuthLinkForStableIdDetailed(pending.stableId, {
      provider: pending.provider,
      lastSignInAt: Date.now(),
      devicePlatform,
    });
    if (!link.ok) return schedulePendingAuthLinkRetry(pending);
    const currentAuthUid = getCurrentUid();
    if (
      !currentAuthUid
      || await fingerprintAuthUid(currentAuthUid) !== pending.expectedAuthUidHash
      || !link.authUid
      || link.authUid !== currentAuthUid
    ) {
      return quarantinePendingAuthLink(pending, 'auth_uid_changed', pending.attempts + 1);
    }
    if (link.stableUid !== pending.stableId) {
      return quarantinePendingAuthLink(pending, 'stable_uid_mismatch', pending.attempts + 1);
    }
    if (link.ok && link.stableUid === pending.stableId) {
      await clearPendingAuthLink();
      // Смена аккаунта могла попасть в await удаления журнала. Восстанавливаем
      // fail-closed запись вместо ложного completed для уже другого пользователя.
      const finalAuthUid = getCurrentUid();
      if (
        !finalAuthUid
        || finalAuthUid !== link.authUid
        || await fingerprintAuthUid(finalAuthUid) !== pending.expectedAuthUidHash
      ) {
        return quarantinePendingAuthLink(pending, 'auth_uid_changed', pending.attempts + 1);
      }
      try {
        logEvent('auth_recovery_completed_silently', { provider: pending.provider, attempts: pending.attempts + 1 });
      } catch {
        /* ignore */
      }
      return 'completed';
    }
    return schedulePendingAuthLinkRetry(pending);
  } catch {
    return schedulePendingAuthLinkRetry(pending);
  }
}

/* expo-router route shim: утилитный модуль, не экран */
export default function __RouteShim() { return null; }
