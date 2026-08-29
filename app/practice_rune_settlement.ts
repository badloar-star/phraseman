/**
 * practice_rune_settlement.ts — клиентский зачёт копилки рун учебной сессии.
 *
 * зачем (владелец, 2026-08-27): практика связывает воедино три уже готовых
 * куска — ядро копилки (`practice_rune_earnings.ts`), персист сессии на диске
 * и серверный callable `practiceRuneGrant`. Здесь единственное место, которое
 * зовёт сервер, чтобы все семь экранов делали это одинаково.
 *
 * Владелец сознательно выбрал ПРОСТОЙ вызов вместо durable-очереди (как у
 * спина в `level_spin_star_grants.ts`): один вызов + одна попытка повтора при
 * сетевой ошибке. Если оба не удались — копилка остаётся на диске с флагом
 * "не зачтено", и её досылает следующий заход в ЛЮБУЮ из семи активностей
 * (см. `flushStalePracticeRuneSettlements`). Экран НЕ ждёт этой досылки —
 * он показывает то, что накопил локально, и продолжает жить.
 *
 * Firebase-экономия: один вызов сервера на всю сессию (не на каждый ответ),
 * ровно как решил владелец.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { getStableId } from './stable_id';
import { getAppSnapshot } from './app_snapshot_store';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { DebugLogger } from './debug-logger';
import { waitForActiveAccountGeneration } from './account_generation';
import {
  acknowledgePracticeRuneGrantLocally,
  commitPracticeRuneGrantLocally,
  practiceRuneOperationStorageKey,
  type PracticeRuneMaterializationAck,
  type PracticeRuneOperation,
} from './level_spin_star_grants';
import {
  parsePracticeRuneEarnings,
  type PracticeRuneActivity,
  type PracticeRuneEarnings,
  practiceRuneSettlementOperationId,
} from './practice_rune_earnings';

const FUNCTIONS_REGION = 'us-central1';
const PRACTICE_RUNE_ACTIVITIES: readonly PracticeRuneActivity[] = Object.freeze([
  'lesson', 'vocabulary', 'irregular_verbs', 'flashcards_blitz',
  'flashcards_training', 'mistake_practice', 'speaking_practice',
]);

function tracePracticeRuneSettlement(
  event: string,
  details: Readonly<Record<string, unknown>>,
): void {
  DebugLogger.info(`practice_runes:${event}`, JSON.stringify(details));
}

function firebaseErrorDetails(error: unknown): Readonly<Record<string, unknown>> {
  const candidate = error && typeof error === 'object'
    ? error as { code?: unknown; message?: unknown; name?: unknown }
    : null;
  return Object.freeze({
    code: typeof candidate?.code === 'string' ? candidate.code : null,
    name: typeof candidate?.name === 'string' ? candidate.name : null,
    message: error instanceof Error
      ? error.message
      : (typeof candidate?.message === 'string' ? candidate.message : String(error)),
  });
}

async function fingerprintFor(input: Readonly<{
  ownerStableId: string;
  activity: PracticeRuneActivity;
  sessionKey: string;
  completionOrdinal: number;
  amount: number;
  createdAtMs: number;
}>): Promise<string> {
  const canonical = JSON.stringify({
    schemaVersion: 1,
    ownerStableId: input.ownerStableId,
    activity: input.activity,
    sessionKey: input.sessionKey,
    completionOrdinal: input.completionOrdinal,
    amount: input.amount,
    reason: 'practice_session_reward',
    createdAtMs: input.createdAtMs,
  });
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonical);
}

async function callPracticeRuneGrant(
  operation: PracticeRuneOperation,
): Promise<PracticeRuneMaterializationAck> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = httpsCallable<{ operation: PracticeRuneOperation }, PracticeRuneMaterializationAck>(
    getFunctions(getApp(), FUNCTIONS_REGION),
    'practiceRuneGrant',
  );
  const res = await fn({ operation });
  return res.data;
}

export type PracticeRuneSettlementResult = Readonly<{
  /** true — руны уже надёжно записаны в локальный журнал и видны в кошельке. */
  locallyCommitted: boolean;
  /** true — сервер подтвердил (или это был повтор уже подтверждённого зачёта). */
  settled: boolean;
}>;
type PracticeRunePendingIntent = Readonly<{
  createdAtMs: number;
  requestFingerprint: string;
}>;

/**
 * Зачитывает копилку сессии: строит закрытую расписку и один раз (плюс один
 * повтор при сетевой ошибке) зовёт сервер. Баланс на экране обновляется
 * ОПТИМИСТИЧНО — до ответа сервера, — потому что руны уже честно заработаны
 * локально; сервер лишь делает их частью общего кошелька и очков лиги.
 *
 * Не бросает исключений: сетевая недоступность — обычный сценарий (экран
 * закрыт без интернета), а не ошибка вызывающего кода.
 */
export async function settlePracticeRuneEarningsToServer(
  earnings: PracticeRuneEarnings,
  completionOrdinal: number,
  durableIntent?: PracticeRunePendingIntent,
): Promise<PracticeRuneSettlementResult> {
  tracePracticeRuneSettlement('settlement_enter', {
    activity: earnings.activity,
    sessionKey: earnings.sessionKey,
    completionOrdinal,
    pendingRunes: earnings.pendingRunes,
    cloudSyncEnabled: CLOUD_SYNC_ENABLED,
    isExpoGo: IS_EXPO_GO,
  });
  if (earnings.pendingRunes <= 0) {
    tracePracticeRuneSettlement('settlement_skip_empty', {
      activity: earnings.activity,
      sessionKey: earnings.sessionKey,
    });
    return { locallyCommitted: true, settled: true };
  }

  const ownerStableId = (await getStableId()).trim();
  if (!ownerStableId) {
    tracePracticeRuneSettlement('settlement_skip_owner_missing', {});
    return { locallyCommitted: false, settled: false };
  }
  const accountToken = await waitForActiveAccountGeneration();
  if (!accountToken || accountToken.stableId !== ownerStableId) {
    tracePracticeRuneSettlement('settlement_skip_account_generation', {
      ownerStableId,
      tokenStableId: accountToken?.stableId ?? null,
      tokenPhase: accountToken?.phase ?? null,
    });
    return { locallyCommitted: false, settled: false };
  }

  const operationId = practiceRuneSettlementOperationId({
    activity: earnings.activity,
    sessionKey: earnings.sessionKey,
    completionOrdinal,
  });
  const amount = earnings.pendingRunes;
  const createdAtMs = Number.isSafeInteger(durableIntent?.createdAtMs)
    && Number(durableIntent?.createdAtMs) >= 0
    ? Number(durableIntent?.createdAtMs)
    : Date.now();
  const computedFingerprint = await fingerprintFor({
    ownerStableId, activity: earnings.activity, sessionKey: earnings.sessionKey,
    completionOrdinal, amount, createdAtMs,
  });
  const requestFingerprint = durableIntent?.requestFingerprint?.match(/^[a-f0-9]{64}$/)
    ? durableIntent.requestFingerprint
    : computedFingerprint;
  const operation: PracticeRuneOperation = Object.freeze({
    schemaVersion: 'client-practice-rune-operation.v1',
    operationId,
    ownerStableId,
    activity: earnings.activity,
    sessionKey: earnings.sessionKey,
    completionOrdinal,
    amount,
    reason: 'practice_session_reward',
    createdAtMs,
    requestFingerprint,
  });

  try {
    await commitPracticeRuneGrantLocally(accountToken, operation);
  } catch (error) {
    tracePracticeRuneSettlement('local_commit_failed', {
      operationId,
      ...firebaseErrorDetails(error),
    });
    DebugLogger.error(
      'practice_runes:local_commit_failed',
      error,
      'critical',
    );
    return { locallyCommitted: false, settled: false };
  }
  tracePracticeRuneSettlement('local_commit_succeeded', {
    operationId,
    amount,
    visibleBalance: getAppSnapshot().progress?.stars ?? null,
  });

  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
    tracePracticeRuneSettlement('settlement_skip_runtime', {
      cloudSyncEnabled: CLOUD_SYNC_ENABLED,
      isExpoGo: IS_EXPO_GO,
      operationId,
    });
    return { locallyCommitted: true, settled: false };
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      tracePracticeRuneSettlement('grant_attempt', { operationId, attempt: attempt + 1 });
      const ack = await callPracticeRuneGrant(operation);
      if (ack.materialized) {
        await acknowledgePracticeRuneGrantLocally(accountToken, operation, ack);
        tracePracticeRuneSettlement('grant_ack', {
          operationId,
          attempt: attempt + 1,
          replayed: ack.replayed,
          serverBalance: ack.starsBalance,
          visibleBalance: getAppSnapshot().progress?.stars ?? null,
        });
        return { locallyCommitted: true, settled: true };
      }
      tracePracticeRuneSettlement('grant_invalid_ack', {
        operationId,
        attempt: attempt + 1,
      });
    } catch (error) {
      const details = firebaseErrorDetails(error);
      tracePracticeRuneSettlement('grant_attempt_failed', {
        operationId,
        attempt: attempt + 1,
        ...details,
      });
      DebugLogger.error(
        `practice_runes:grant_attempt_failed:${attempt + 1}`,
        error,
        'warning',
      );
      // Сетевая ошибка или конфликт — пробуем ещё раз один раз, дальше сдаёмся
      // молча: копилка на диске остаётся неотмеченной как зачтённая, и её
      // подхватит flushStalePracticeRuneSettlements при следующем запуске.
    }
  }
  tracePracticeRuneSettlement('grant_exhausted', {
    operationId,
    visibleBalance: getAppSnapshot().progress?.stars ?? null,
  });
  return { locallyCommitted: true, settled: false };
}

const PENDING_SETTLEMENT_PREFIX = 'practice_rune_pending_settlement_v1';

function pendingSettlementKey(
  ownerStableId: string,
  activity: PracticeRuneActivity,
  sessionKey: string,
  completionOrdinal?: number,
): string {
  const base = `${PENDING_SETTLEMENT_PREFIX}:${encodeURIComponent(ownerStableId)}:${activity}:${encodeURIComponent(sessionKey)}`;
  return completionOrdinal === undefined ? base : `${base}:${completionOrdinal}`;
}

/**
 * Помечает копилку как "ждёт досылки на сервер" — вызывается ДО первой
 * попытки, чтобы сбой посреди сессии (крэш, убитый процесс) не потерял факт
 * незачтённых рун. Идемпотентно: повторная запись того же значения не вредит.
 */
export async function markPracticeRuneSettlementPending(input: Readonly<{
  ownerStableId: string;
  earnings: PracticeRuneEarnings;
  completionOrdinal: number;
}>): Promise<PracticeRunePendingIntent> {
  if (input.earnings.pendingRunes <= 0) {
    return Object.freeze({ createdAtMs: 0, requestFingerprint: '0'.repeat(64) });
  }
  const key = pendingSettlementKey(
      input.ownerStableId,
      input.earnings.activity,
      input.earnings.sessionKey,
      input.completionOrdinal,
    );
  const existingRaw = await AsyncStorage.getItem(key);
  let marker: { createdAtMs?: unknown; requestFingerprint?: unknown } | null = null;
  if (existingRaw) {
    try {
      marker = JSON.parse(existingRaw) as { createdAtMs?: unknown; requestFingerprint?: unknown };
    } catch (e) {
      // legacy/corrupt marker is replaced by the exact current intent
      DebugLogger.error('practice_rune_settlement:existingRaw', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  const operationId = practiceRuneSettlementOperationId({
    activity: input.earnings.activity,
    sessionKey: input.earnings.sessionKey,
    completionOrdinal: input.completionOrdinal,
  });
  let durableOperation: Partial<PracticeRuneOperation> | null = null;
  try {
    const operationRaw = await AsyncStorage.getItem(
      practiceRuneOperationStorageKey(input.ownerStableId, operationId),
    );
    durableOperation = operationRaw ? JSON.parse(operationRaw) as Partial<PracticeRuneOperation> : null;
  } catch { durableOperation = null; }
  const matchingDurableOperation = durableOperation
    && durableOperation.operationId === operationId
    && durableOperation.ownerStableId === input.ownerStableId
    && durableOperation.activity === input.earnings.activity
    && durableOperation.sessionKey === input.earnings.sessionKey
    && durableOperation.completionOrdinal === input.completionOrdinal
    && durableOperation.amount === input.earnings.pendingRunes
    && Number.isSafeInteger(durableOperation.createdAtMs)
    && typeof durableOperation.requestFingerprint === 'string'
    && /^[a-f0-9]{64}$/.test(durableOperation.requestFingerprint)
    ? durableOperation as Pick<PracticeRuneOperation, 'createdAtMs' | 'requestFingerprint'>
    : null;
  const createdAtMs = matchingDurableOperation?.createdAtMs
    ?? (Number.isSafeInteger(marker?.createdAtMs) && Number(marker?.createdAtMs) >= 0
      ? Number(marker?.createdAtMs)
      : Date.now());
  const requestFingerprint = matchingDurableOperation?.requestFingerprint
    ?? (typeof marker?.requestFingerprint === 'string'
      && /^[a-f0-9]{64}$/.test(marker.requestFingerprint)
      ? marker.requestFingerprint
      : await fingerprintFor({
        ownerStableId: input.ownerStableId,
        activity: input.earnings.activity,
        sessionKey: input.earnings.sessionKey,
        completionOrdinal: input.completionOrdinal,
        amount: input.earnings.pendingRunes,
        createdAtMs,
      }));
  await AsyncStorage.setItem(key, JSON.stringify({
    earnings: input.earnings,
    completionOrdinal: input.completionOrdinal,
    createdAtMs,
    requestFingerprint,
  }));
  return Object.freeze({ createdAtMs, requestFingerprint });
}

/** Снимает отметку "ждёт досылки" после успешного зачёта. */
export async function clearPracticeRuneSettlementPending(input: Readonly<{
  ownerStableId: string;
  activity: PracticeRuneActivity;
  sessionKey: string;
  completionOrdinal?: number;
}>): Promise<void> {
  const keys = [pendingSettlementKey(input.ownerStableId, input.activity, input.sessionKey)];
  if (input.completionOrdinal !== undefined) {
    keys.push(pendingSettlementKey(
      input.ownerStableId, input.activity, input.sessionKey, input.completionOrdinal,
    ));
  }
  await AsyncStorage.multiRemove(keys);
}

/**
 * Досылает незавершённые серверные синхронизации при следующем входе в любую
 * практику. Локальный баланс уже зафиксирован, поэтому ошибка сети ничего не
 * отнимает и маркер остаётся для следующей попытки.
 */
export async function flushStalePracticeRuneSettlements(
  ownerStableIdInput: string,
): Promise<Readonly<{ synced: number; pending: number }>> {
  const ownerStableId = ownerStableIdInput.trim();
  if (!ownerStableId) return Object.freeze({ synced: 0, pending: 0 });
  const prefix = `${PENDING_SETTLEMENT_PREFIX}:${encodeURIComponent(ownerStableId)}:`;
  const allKeys = await AsyncStorage.getAllKeys();
  if (allKeys.length > 16_384) throw new Error('practice_rune_storage_scan_too_large');
  const keys = allKeys.filter((key) => key.startsWith(prefix)).sort();
  const rows = await AsyncStorage.multiGet(keys);
  let synced = 0;
  let pending = 0;
  for (const [key, raw] of rows) {
    if (raw === null) continue;
    let candidate: unknown;
    try { candidate = JSON.parse(raw) as unknown; } catch {
      pending += 1;
      continue;
    }
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      pending += 1;
      continue;
    }
    const value = candidate as {
      earnings?: unknown; completionOrdinal?: unknown; createdAtMs?: unknown;
      requestFingerprint?: unknown;
    };
    const untrustedEarnings = value.earnings as Partial<PracticeRuneEarnings> | undefined;
    const completionOrdinal = value.completionOrdinal;
    if (!untrustedEarnings
      || !PRACTICE_RUNE_ACTIVITIES.includes(untrustedEarnings.activity as PracticeRuneActivity)
      || typeof untrustedEarnings.sessionKey !== 'string'
      || !Number.isSafeInteger(completionOrdinal)
      || Number(completionOrdinal) < 1
      || (value.createdAtMs !== undefined
        && (!Number.isSafeInteger(value.createdAtMs) || Number(value.createdAtMs) < 0))) {
      pending += 1;
      continue;
    }
    const earnings = parsePracticeRuneEarnings(untrustedEarnings, {
      activity: untrustedEarnings.activity as PracticeRuneActivity,
      sessionKey: untrustedEarnings.sessionKey,
    });
    if (!earnings || earnings.pendingRunes <= 0) {
      pending += 1;
      continue;
    }
    const durableIntent = Number.isSafeInteger(value.createdAtMs)
      && typeof value.requestFingerprint === 'string'
      && /^[a-f0-9]{64}$/.test(value.requestFingerprint)
      ? Object.freeze({
        createdAtMs: Number(value.createdAtMs),
        requestFingerprint: value.requestFingerprint,
      })
      : await markPracticeRuneSettlementPending({
        ownerStableId,
        earnings,
        completionOrdinal: Number(completionOrdinal),
      });
    const result = await settlePracticeRuneEarningsToServer(
      earnings,
      Number(completionOrdinal),
      durableIntent,
    );
    if (result.settled) {
      await AsyncStorage.removeItem(key);
      synced += 1;
    } else {
      pending += 1;
    }
  }
  tracePracticeRuneSettlement('stale_flush_complete', { ownerStableId, synced, pending });
  return Object.freeze({ synced, pending });
}
