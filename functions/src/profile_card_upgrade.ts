// ═══════════════════════════════════════════════════════════════════════════
// profile_card_upgrade.ts — серверная валидация прокачки карточки профиля.
//
// Зачем: карточка профиля стала ПУБЛИЧНЫМ статусом (бейдж «CARD V» в строках
// лидербордов/арены/клуба + полная карточка в профиле). Раньше уровень писался
// клиентом без серверной сверки траты осколков → подделанный клиент мог выставить
// себе level 5, не потратив ничего, и красоваться в чужих лидербордах.
//
// Эта callable — единственный доверенный путь поднять уровень: атомарно проверяет
// серверный баланс осколков, списывает РОВНО стоимость следующего уровня (таблица
// цен живёт на сервере, клиент её не диктует) и инкрементит авторитетный
// users/{uid}.profile_card_level. Баланс осколков и так серверо-авторитетен
// (users/{uid}.shards под транзакцией), поэтому переиспользуем тот же документ.
//
// Идемпотентность по уровню: вход содержит expectedLevel (текущий уровень глазами
// клиента). Если серверный уровень уже >= expectedLevel+1, апгрейд уже случился —
// возвращаем текущее состояние без двойного списания.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';

const PROFILE_CARD_MAX_LEVEL = 5;

/**
 * Стоимость ПЕРЕХОДА на уровень N (индекс = целевой уровень). Должна совпадать с
 * клиентской таблицей PROFILE_CARD_LEVELS в app/profile_card_system.ts. Источник
 * истины по списанию — здесь, на сервере.
 */
const PROFILE_CARD_LEVEL_COST: Record<number, number> = {
  1: 30,
  2: 60,
  3: 100,
  4: 160,
  5: 250,
};

function readShardBalance(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function readCardLevel(value: unknown): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(PROFILE_CARD_MAX_LEVEL, n));
}

type UpgradeResult =
  | { ok: true; alreadyApplied: boolean; level: number; balance: number; spent: number }
  | { ok: false; reason: 'max' | 'insufficient'; level: number; balance: number; cost?: number };

/**
 * Callable: поднять уровень карточки профиля на +1 за осколки.
 *
 * Вход:  { expectedLevel?: number }  — текущий уровень глазами клиента (для идемпотентности)
 * Ответ: UpgradeResult
 */
export const profileCardUpgrade = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Not authenticated');
  const db = admin.firestore();
  // Forward the client's stableId so we read/write the SAME users/{stableId} doc the
  // client stores shards in. Without it we'd fall back to the auth uid (or an auth-link
  // lookup that may not be stamped yet) → a different/empty doc → balance 0 → the upgrade
  // wrongly reports "insufficient" and the UI sends the player to the shard shop.
  const uid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId);

  const expectedLevelRaw = request.data?.expectedLevel;
  const expectedLevel =
    expectedLevelRaw === undefined || expectedLevelRaw === null
      ? null
      : readCardLevel(expectedLevelRaw);

  const userRef = db.collection('users').doc(uid);

  const result: UpgradeResult = await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const data = userSnap.data() ?? {};
    // The badge everyone sees is mirrored from progress.profile_card_level by
    // sync_leaderboard.ts — that is the authoritative field, so read & write it here
    // (and Firestore rules block clients from writing it, leaving this CF the only path).
    const progress = (data.progress ?? {}) as Record<string, unknown>;
    const currentLevel = readCardLevel(progress.profile_card_level);
    const balance = readShardBalance(data.shards);

    // Идемпотентность: клиент думал, что на expectedLevel, но сервер уже выше —
    // значит апгрейд уже применён (повторный/гонка). Не списываем второй раз.
    if (expectedLevel !== null && currentLevel > expectedLevel) {
      return { ok: true, alreadyApplied: true, level: currentLevel, balance, spent: 0 };
    }

    if (currentLevel >= PROFILE_CARD_MAX_LEVEL) {
      return { ok: false, reason: 'max', level: currentLevel, balance };
    }

    const nextLevel = currentLevel + 1;
    const cost = PROFILE_CARD_LEVEL_COST[nextLevel] ?? Number.MAX_SAFE_INTEGER;
    if (balance < cost) {
      return { ok: false, reason: 'insufficient', level: currentLevel, balance, cost };
    }

    const newBalance = balance - cost;
    tx.set(
      userRef,
      {
        shards: newBalance,
        shards_updated_at_ms: Date.now(),
        shards_updated_op: 'spend',
        shards_updated_reason: 'profile_card_upgrade',
        // Nested under progress so sync_leaderboard mirrors it to the public badge.
        // { merge: true } deep-merges nested objects, so sibling progress keys are kept.
        progress: { profile_card_level: nextLevel },
        profile_card_level_updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true, alreadyApplied: false, level: nextLevel, balance: newBalance, spent: cost };
  });

  return result;
});
