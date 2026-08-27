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
import { patchAppSnapshot, getAppSnapshot } from './app_snapshot_store';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import {
  type PracticeRuneActivity,
  type PracticeRuneEarnings,
  practiceRuneSettlementOperationId,
} from './practice_rune_earnings';

const FUNCTIONS_REGION = 'us-central1';

type PracticeRuneComposite = Readonly<{
  schemaVersion: 'client-practice-rune-operation.v1';
  operationId: string;
  ownerStableId: string;
  activity: PracticeRuneActivity;
  sessionKey: string;
  completionOrdinal: number;
  amount: number;
  reason: 'practice_session_reward';
  createdAtMs: number;
  requestFingerprint: string;
}>;

type PracticeRuneMaterializationAck = Readonly<{
  materialized: true;
  operationId: string;
  requestFingerprint: string;
  replayed: boolean;
  starsBalance: number;
  starsEarnedTotal: number;
  starsSeq: number;
}>;

async function fingerprintFor(input: Readonly<{
  ownerStableId: string;
  activity: PracticeRuneActivity;
  sessionKey: string;
  completionOrdinal: number;
  amount: number;
}>): Promise<string> {
  const canonical = JSON.stringify({
    schemaVersion: 1,
    ownerStableId: input.ownerStableId,
    activity: input.activity,
    sessionKey: input.sessionKey,
    completionOrdinal: input.completionOrdinal,
    amount: input.amount,
    reason: 'practice_session_reward',
  });
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonical);
}

async function callPracticeRuneGrant(
  operation: PracticeRuneComposite,
): Promise<PracticeRuneMaterializationAck> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = httpsCallable<{ operation: PracticeRuneComposite }, PracticeRuneMaterializationAck>(
    getFunctions(getApp(), FUNCTIONS_REGION),
    'practiceRuneGrant',
  );
  const res = await fn({ operation });
  return res.data;
}

export type PracticeRuneSettlementResult = Readonly<{
  /** true — сервер подтвердил (или это был повтор уже подтверждённого зачёта). */
  settled: boolean;
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
): Promise<PracticeRuneSettlementResult> {
  if (earnings.pendingRunes <= 0) return { settled: true };
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return { settled: false };

  const ownerStableId = (await getStableId()).trim();
  if (!ownerStableId) return { settled: false };

  const operationId = practiceRuneSettlementOperationId({
    activity: earnings.activity,
    sessionKey: earnings.sessionKey,
    completionOrdinal,
  });
  const amount = earnings.pendingRunes;
  const createdAtMs = Date.now();
  const requestFingerprint = await fingerprintFor({
    ownerStableId, activity: earnings.activity, sessionKey: earnings.sessionKey,
    completionOrdinal, amount,
  });
  const operation: PracticeRuneComposite = Object.freeze({
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

  // Оптимистичный бамп локального баланса — руны видны в кошельке ДО ответа
  // сервера. Откат не нужен: расписка идемпотентна, при следующем заходе она
  // либо применится, либо сервер подтвердит уже применённую — баланс никогда
  // не откатывается назад из-за неудавшегося запроса.
  //
  // Патчим только если снапшот уже гидрирован (progress существует): частичный
  // AppSnapshotProgress без streak/shards нарушил бы контракт типа и мог бы
  // стереть поля, которых мы здесь не знаем. Если снапшота ещё нет, бамп просто
  // пропускается — авторитетный ответ сервера ниже всё равно подтвердит баланс.
  const snapshotProgress = getAppSnapshot().progress;
  if (snapshotProgress) {
    patchAppSnapshot({
      progress: {
        ...snapshotProgress,
        stars: Math.max(0, snapshotProgress.stars ?? 0) + amount,
        starsEarnedTotal: Math.max(0, snapshotProgress.starsEarnedTotal ?? 0) + amount,
      },
    });
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const ack = await callPracticeRuneGrant(operation);
      if (ack.materialized) {
        // guard-ok: НЕ перезаписываем баланс значением сервера напрямую — между
        // отправкой запроса и ответом снепшот мог обновиться из другого
        // источника (трата в магазине, спин, обмен монет), и слепая перезапись
        // откатила бы более свежее значение назад (класс бага «сервер понижал
        // баланс», см. project_league_shared_pool_ghosts.md). Берём MAX между
        // тем, что уже в снепшоте, и подтверждённым сервером — тот же приём,
        // что и в runes_system.ts:129-132 для спина.
        // Снапшот всё ещё может быть не гидрирован — тогда патчить нечего,
        // авторитетное значение подтянется обычной гидрацией прогресса.
        patchAppSnapshot((current) => (current.progress ? {
          progress: {
            ...current.progress,
            stars: Math.max(current.progress.stars ?? 0, ack.starsBalance),
            starsEarnedTotal: Math.max(current.progress.starsEarnedTotal ?? 0, ack.starsEarnedTotal),
          },
        } : {}));
        return { settled: true };
      }
    } catch {
      // Сетевая ошибка или конфликт — пробуем ещё раз один раз, дальше сдаёмся
      // молча: копилка на диске остаётся неотмеченной как зачтённая, и её
      // подхватит flushStalePracticeRuneSettlements при следующем запуске.
    }
  }
  return { settled: false };
}

const PENDING_SETTLEMENT_PREFIX = 'practice_rune_pending_settlement_v1';

function pendingSettlementKey(ownerStableId: string, activity: PracticeRuneActivity, sessionKey: string): string {
  return `${PENDING_SETTLEMENT_PREFIX}:${encodeURIComponent(ownerStableId)}:${activity}:${encodeURIComponent(sessionKey)}`;
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
}>): Promise<void> {
  if (input.earnings.pendingRunes <= 0) return;
  await AsyncStorage.setItem(
    pendingSettlementKey(input.ownerStableId, input.earnings.activity, input.earnings.sessionKey),
    JSON.stringify({ earnings: input.earnings, completionOrdinal: input.completionOrdinal }),
  );
}

/** Снимает отметку "ждёт досылки" после успешного зачёта. */
export async function clearPracticeRuneSettlementPending(input: Readonly<{
  ownerStableId: string;
  activity: PracticeRuneActivity;
  sessionKey: string;
}>): Promise<void> {
  await AsyncStorage.removeItem(
    pendingSettlementKey(input.ownerStableId, input.activity, input.sessionKey),
  );
}
