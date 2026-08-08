// ═══════════════════════════════════════════════════════════════════════════
// ДЕВ-НАЧИСЛЕНИЕ ЖЕМЧУЖИН — СЕРВЕРНАЯ СТОРОНА
//
// ЖЕЛЕЗНОЕ ПРАВИЛО ВЛАДЕЛЬЦА (2026-07-27, дословно): «когда я в дев режиме —
// начисление на ЛЮБОЙ аккаунт через дев ВСЕГДА админское и ВСЕГДА идёт на
// сервер». Закреплено тестами (tests/dev_shards_grant_contract.test.ts и
// functions/src/dev_shards_grant.test.ts) — менять нельзя без решения владельца.
//
// Зачем понадобилось: дев-кнопка магазина писала баланс ТОЛЬКО в телефон.
// Серверная запись идёт через shardsApplyDelta, а тот сверяет причину с
// каталогом shard_reward_catalog — каталог намеренно обнулён и причины
// 'shards_store_purchase' в нём нет. Сервер отклонял начисление, серверный
// баланс не менялся, и турнир (он читает users/{uid}.shards) честно отвечал
// not_enough_gems при «500 жемчужинах» на экране.
//
// Почему НЕ adminGrantReward: она требует claim admin: true, а его в проекте
// никто не выдаёт (setCustomUserClaims не вызывается нигде). Требовать claim
// значило бы нарушить правило «на ЛЮБОЙ аккаунт».
//
// ПОЧЕМУ ЭТО БЕЗОПАСНО В ПРОДЕ: функция закрыта серверным рубильником
// remote_config/app.numbers.dev_shards_grant_enabled. По умолчанию — ВЫКЛЮЧЕНА
// (fail-closed): если ключа нет или он не 1, любой вызов отклоняется. То есть
// стор-сборка не может начислить себе жемчужины, даже зная имя функции: гейт
// живёт на СЕРВЕРЕ, а не в клиентском флаге, который подделывается.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';

/** Потолок одной операции — защита от опечатки «500000» в дев-панели. */
const DEV_GRANT_MAX = 100000;

const REMOTE_CONFIG_COLLECTION = 'remote_config';
const REMOTE_CONFIG_DOC = 'app';
/** Рубильник владельца. Отсутствует или не 1 → функция мертва. */
const DEV_GRANT_FLAG = 'dev_shards_grant_enabled';

function readBalance(value: unknown): number {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Рубильник: включено ли дев-начисление на этом проекте.
 *
 * fail-closed: любая неопределённость (нет документа, нет ключа, кривое
 * значение, ошибка чтения) означает ВЫКЛЮЧЕНО. Дыра в экономике не должна
 * открываться из-за отсутствующего документа конфигурации.
 */
export function isDevShardsGrantEnabled(remoteConfig: unknown): boolean {
  if (!remoteConfig || typeof remoteConfig !== 'object') return false;
  const numbers = (remoteConfig as { numbers?: unknown }).numbers;
  if (!numbers || typeof numbers !== 'object') return false;
  return Number((numbers as Record<string, unknown>)[DEV_GRANT_FLAG]) === 1;
}

/**
 * Дев-начисление жемчужин: пишет СЕРВЕРНЫЙ баланс напрямую, минуя каталог
 * начислений. Работает для ЛЮБОГО авторизованного аккаунта — по правилу
 * владельца, — но только пока включён серверный рубильник.
 *
 * Идемпотентность: по opId. Повтор с тем же opId (сетевой ретрай) не удвоит
 * начисление; новое нажатие дев-кнопки шлёт новый opId и начисляет снова —
 * это осознанно, дев-кнопка обязана работать сколько угодно раз.
 *
 * Стоимость: одна транзакция на нажатие (чтение конфига + чтение юзера +
 * чтение чека + запись). В проде путь мёртв — рубильник выключен.
 */
export const devShardsGrant = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const rawAmount = Math.trunc(Number((request.data as { amount?: unknown })?.amount));
  if (!Number.isSafeInteger(rawAmount) || rawAmount <= 0 || rawAmount > DEV_GRANT_MAX) {
    throw new HttpsError('invalid-argument', 'dev_grant_amount_invalid');
  }
  const opId = String((request.data as { opId?: unknown })?.opId ?? '').trim();
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(opId)) {
    throw new HttpsError('invalid-argument', 'dev_grant_op_id_invalid');
  }

  const db = admin.firestore();
  const configSnap = await db.collection(REMOTE_CONFIG_COLLECTION).doc(REMOTE_CONFIG_DOC).get();
  if (!isDevShardsGrantEnabled(configSnap.data())) {
    // Прод/выключенный проект: функция существует, но ничего не делает.
    throw new HttpsError('permission-denied', 'dev_shards_grant_disabled');
  }

  // Тот же документ, под которым живёт баланс игрока (и который читает турнир).
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, undefined, {
    repairLinks: false,
    requireKnownIdentity: true,
  });
  const userRef = db.collection('users').doc(stableUid);
  const receiptRef = userRef.collection('dev_grant_receipts').doc(opId);
  const nowMs = Date.now();

  return db.runTransaction(async (tx) => {
    const [userSnap, receiptSnap] = await tx.getAll(userRef, receiptRef);
    if (receiptSnap.exists) {
      // Идемпотентный повтор: возвращаем прежний результат, не начисляя снова.
      return {
        ok: true,
        alreadyApplied: true,
        balance: readBalance(userSnap.data()?.shards),
        granted: 0,
      };
    }
    const before = readBalance(userSnap.data()?.shards);
    const after = before + rawAmount;

    tx.set(userRef, {
      shards: after,
      shards_updated_at_ms: nowMs,
      shards_updated_op: 'earn',
      shards_updated_reason: 'dev_grant',
      updatedAt: nowMs,
    }, { merge: true });

    // Чек делает операцию идемпотентной и оставляет след: что, кому, когда.
    tx.create(receiptRef, {
      opId,
      amount: rawAmount,
      balanceBefore: before,
      balanceAfter: after,
      authUid: request.auth?.uid ?? null,
      createdAtMs: nowMs,
    });

    tx.create(userRef.collection('shard_log').doc(`dev_${opId}`), {
      ts: new Date(nowMs).toISOString(),
      type: 'earn',
      amount: rawAmount,
      reason: 'dev_grant',
      balanceBefore: before,
      balanceAfter: after,
    });

    return { ok: true, alreadyApplied: false, balance: after, granted: rawAmount };
  });
});
