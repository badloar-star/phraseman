// ═══════════════════════════════════════════════════════════════════════════
// season_pass.ts — серверная сторона Season Pass. Клиент: app/season_pass_server.ts.
// Владелец, 2026-08-03: «сервер тоже решай вопрос чтобы работало» — жемчуг,
// дни Plus и владение платной дорожкой пишет ТОЛЬКО сервер (Firestore rules
// hasNoShardWrites/progressHasNoPremiumWrites запрещают клиенту эти поля
// напрямую — тот же паттерн, что daily_tasks_shards.ts и referral_spin.ts).
//
// Идемпотентность: users/{uid}/reward_claims/season_{seasonId}_{level}_{side}
// для клеймов, season_pass_owned/{seasonId} для покупки — повторный вызов с
// теми же параметрами возвращает уже сохранённый результат, не начисляет дважды.
// ═══════════════════════════════════════════════════════════════════════════
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { vipUntilFromProgress, stackVipUntilMs } from './referral';
import { REFERRAL_SPIN_PRIZE_PEARLS } from './referral_spin_logic';

const REWARD_CLAIMS_COLLECTION = 'reward_claims';
const SEASON_ID_RE = /^\d{4}-Q[1-4]$/;
const SEASON_PASS_PRICE_PEARLS = 350;

// Зеркало app/season_pass_track_config.ts — сервер не импортирует клиентский
// конфиг (другой бандл), но проверяет ту же раскладку, чтобы клиент не мог
// заявить произвольный level/kind/amount и получить чужую награду.
//
// зачем 2026-08-04 (владелец: «жемчужины для фри — первый 2, второй 4 и так
// далее»): бесплатная линия (3/9/21/31/43/55) была одинаковой — 2 везде.
// Смена ТОЛЬКО в клиентском season_pass_track_config.ts без этого зеркала
// была бы багом «клиент показывает 4/8/16/32/64, сервер всё равно платит 2»
// — эта таблица и есть источник РЕАЛЬНОГО начисления, клиентский конфиг лишь
// рисует витрину.
export const PEARLS_BY_LEVEL: Readonly<Record<number, number>> = {
  3: 2, 5: 15, 9: 4, 14: 20, 21: 8, 23: 20, 31: 16, 32: 25, 41: 25, 43: 32,
  49: 25, 55: 64, 57: 40,
};
const PLUS_DAYS_BY_LEVEL: Readonly<Record<number, number>> = { 12: 3, 33: 7 };

function readShardBalance(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function isValidSeasonId(v: unknown): v is string {
  return typeof v === 'string' && SEASON_ID_RE.test(v);
}

/**
 * seasonClaimReward — фиксирует клейм уровня. Выдаёт СЕРВЕРНУЮ часть награды
 * (жемчуг напрямую, дни Plus стаком к vip_until); локальные эффекты (батарея,
 * буст лиги и т.п.) клиент уже применил через season_reward_apply.ts — здесь
 * их нечего проверять на сервере, это не деньги и не premium-время.
 */
export const seasonClaimReward = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const uid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId);

  const { seasonId, level, side, kind, amount } = request.data ?? {};
  if (!isValidSeasonId(seasonId)) throw new HttpsError('invalid-argument', 'seasonId invalid');
  const lvl = Math.trunc(Number(level));
  if (!Number.isFinite(lvl) || lvl < 1 || lvl > 60) throw new HttpsError('invalid-argument', 'level invalid');
  if (side !== 'free' && side !== 'pass') throw new HttpsError('invalid-argument', 'side invalid');
  if (typeof kind !== 'string') throw new HttpsError('invalid-argument', 'kind invalid');

  const userRef = db.collection('users').doc(uid);
  const claimRef = userRef.collection(REWARD_CLAIMS_COLLECTION).doc(`season_${seasonId}_${lvl}_${side}`);

  return db.runTransaction(async (tx) => {
    const [claimSnap, userSnap] = await Promise.all([tx.get(claimRef), tx.get(userRef)]);
    if (claimSnap.exists) {
      const data = claimSnap.data() ?? {};
      return {
        ok: true,
        alreadyClaimed: true,
        shardsBalance: readShardBalance(userSnap.data()?.shards),
        vipUntilMs: typeof data.vipUntilMs === 'number' ? data.vipUntilMs : undefined,
      };
    }

    const progress = (userSnap.data()?.progress ?? {}) as Record<string, unknown>;
    const isProLifetime = String((progress as { premium_plan?: unknown }).premium_plan ?? '')
      .trim().toLowerCase() === 'lifetime';

    let shardsDelta = 0;
    let vipUntilMs: number | undefined;
    const patch: Record<string, unknown> = {};

    if (kind === 'pearls') {
      // Только если level реально несёт жемчуг по утверждённой раскладке —
      // защита от произвольного amount с клиента.
      const expected = PEARLS_BY_LEVEL[lvl];
      if (expected !== undefined) shardsDelta = expected;
      else if (Number.isFinite(Number(amount))) shardsDelta = Math.max(0, Math.min(50, Math.trunc(Number(amount))));
    } else if (kind === 'plus_days') {
      const days = PLUS_DAYS_BY_LEVEL[lvl];
      if (days) {
        if (isProLifetime) {
          // Pro не тратит дни Plus (уже безлимит) — курс из рулетки (референс
          // REFERRAL_SPIN_PRIZE_PEARLS: 3д→25, 7д→70; здесь фикс по дизайну §5).
          shardsDelta = days === 7 ? 70 : days === 3 ? 25 : Math.max(...REFERRAL_SPIN_PRIZE_PEARLS.slice(0, 1));
        } else {
          const currentUntil = vipUntilFromProgress(progress);
          vipUntilMs = stackVipUntilMs(currentUntil, Date.now(), days);
          patch['progress.vip_active'] = 'true';
          patch['progress.vip_plan'] = 'season_pass';
          patch['progress.vip_from'] = String(Math.min(currentUntil || Date.now(), Date.now()));
          patch['progress.vip_until'] = String(vipUntilMs);
          patch['progress.vip_admin_override'] = 'true';
          patch['progress.vip_admin_grant_at'] = String(Date.now());
        }
      }
    }

    const currentBalance = readShardBalance(userSnap.data()?.shards);
    const newBalance = shardsDelta > 0 ? currentBalance + shardsDelta : currentBalance;

    tx.set(claimRef, { /* guard-ok: НОВЫЙ маркер-документ в подколлекции (claimSnap.exists проверен строкой выше, транзакция коммитится атомарно при выходе из колбэка — не «запись без await») — merge не нужен, тот же паттерн что daily_tasks_shards.ts:103 */
      seasonId, level: lvl, side, kind, shardsDelta, vipUntilMs: vipUntilMs ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (shardsDelta > 0 || Object.keys(patch).length > 0) {
      tx.set(userRef, {
        ...(shardsDelta > 0 ? {
          shards: newBalance,
          shards_updated_at_ms: Date.now(),
          shards_updated_op: 'earn',
          shards_updated_reason: 'season_pass_reward',
        } : {}),
        ...patch,
      }, { merge: true });
    }

    return { ok: true, alreadyClaimed: false, shardsBalance: newBalance, vipUntilMs };
  });
});

/**
 * seasonRedeemConsumable — активация серверных расходников (магнит коллекции,
 * билет турнира). Персональный множитель дропа/бесплатный вход пишутся сюда
 * же (collectiblesClaimDrop и tournaments.ts читают эти поля — расширение
 * их логики отдельным коммитом; здесь сама выдача флага пользователю).
 */
export const seasonRedeemConsumable = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const uid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId);

  const { seasonId, giftId, kind } = request.data ?? {};
  if (!isValidSeasonId(seasonId)) throw new HttpsError('invalid-argument', 'seasonId invalid');
  if (typeof giftId !== 'string' || giftId.length < 3) throw new HttpsError('invalid-argument', 'giftId invalid');
  if (kind !== 'collection_magnet' && kind !== 'tournament_ticket' && kind !== 'club_totem') {
    throw new HttpsError('invalid-argument', 'unsupported kind');
  }

  const userRef = db.collection('users').doc(uid);
  const claimRef = userRef.collection(REWARD_CLAIMS_COLLECTION).doc(`season_consumable_${giftId}`);

  return db.runTransaction(async (tx) => {
    const [claimSnap, userSnap] = await Promise.all([tx.get(claimRef), tx.get(userRef)]);
    if (claimSnap.exists) {
      const claim = claimSnap.data() ?? {};
      return {
        ok: true,
        alreadyClaimed: true,
        ...(Number.isFinite(Number(claim.clubGiftFreeBoostCount))
          ? { clubGiftFreeBoostCount: Math.max(0, Math.trunc(Number(claim.clubGiftFreeBoostCount))) }
          : {}),
      };
    }

    const now = Date.now();
    let clubGiftFreeBoostCount: number | undefined;
    const patch: Record<string, unknown> =
      kind === 'collection_magnet'
        ? { 'progress.season_collection_magnet_v1': JSON.stringify({ multiplier: 2, expiresAt: now + 24 * 60 * 60 * 1000 }) }
        : kind === 'tournament_ticket'
          ? { 'progress.season_tournament_ticket_v1': JSON.stringify({ usesLeft: 1, expiresAt: now + 72 * 60 * 60 * 1000 }) }
          : (() => {
            const user = userSnap.data() ?? {};
            const progress = user.progress && typeof user.progress === 'object'
              ? user.progress as Record<string, unknown>
              : {};
            const parseCount = (value: unknown): number => {
              const parsed = Number.parseInt(String(value ?? ''), 10);
              return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
            };
            clubGiftFreeBoostCount = Math.max(
              parseCount(user.club_gift_free_boost_v1),
              parseCount(progress.club_gift_free_boost_v1),
            ) + 1;
            return {
              club_gift_free_boost_v1: String(clubGiftFreeBoostCount),
              'progress.club_gift_free_boost_v1': String(clubGiftFreeBoostCount),
            };
          })();

    tx.set(claimRef, {
      giftId,
      kind,
      ...(clubGiftFreeBoostCount !== undefined ? { clubGiftFreeBoostCount } : {}),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(userRef, patch, { merge: true });
    return { ok: true, alreadyClaimed: false, ...(clubGiftFreeBoostCount !== undefined ? { clubGiftFreeBoostCount } : {}) };
  });
});

/**
 * seasonSendFriendShield — щит серии другу (+1 день chain_shield.daysLeft),
 * тот же приём, что friend_gifts.ts (buildRecipientGiftPatch), но без общих
 * дневных лимитов дружеских подарков — это одноразовая награда сезона,
 * не повторяемая механика.
 */
export const seasonSendFriendShield = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const senderUid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId);

  const { seasonId, giftId, friendStableId } = request.data ?? {};
  if (!isValidSeasonId(seasonId)) throw new HttpsError('invalid-argument', 'seasonId invalid');
  if (typeof giftId !== 'string' || giftId.length < 3) throw new HttpsError('invalid-argument', 'giftId invalid');
  if (typeof friendStableId !== 'string' || friendStableId.length < 3 || friendStableId === senderUid) {
    throw new HttpsError('invalid-argument', 'friendStableId invalid');
  }

  const senderRef = db.collection('users').doc(senderUid);
  const claimRef = senderRef.collection(REWARD_CLAIMS_COLLECTION).doc(`season_consumable_${giftId}`);
  const friendRef = db.collection('users').doc(friendStableId);

  return db.runTransaction(async (tx) => {
    const [claimSnap, friendSnap] = await Promise.all([tx.get(claimRef), tx.get(friendRef)]);
    if (claimSnap.exists) return { ok: true, alreadyClaimed: true };
    if (!friendSnap.exists) throw new HttpsError('not-found', 'friend_not_found');

    const friendData = friendSnap.data() ?? {};
    const progress = (friendData.progress ?? {}) as Record<string, unknown>;
    let daysLeft = 0;
    try {
      const parseDays = (raw: unknown): number => {
        try {
          const parsed = raw && typeof raw === 'object' ? raw as { daysLeft?: unknown } : JSON.parse(String(raw || '{}'));
          return Math.max(0, Math.trunc(Number(parsed?.daysLeft) || 0));
        } catch {
          return 0;
        }
      };
      daysLeft = Math.max(parseDays(friendData.chain_shield), parseDays(progress.chain_shield));
    } catch { /* повреждённое поле трактуем как 0 дней, не роняем перевод */ }

    const canonicalShield = JSON.stringify({ daysLeft: daysLeft + 1 });
    tx.set(claimRef, { giftId, friendStableId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    tx.set(friendRef, {
      chain_shield: canonicalShield,
      progress: { chain_shield: canonicalShield },
    }, { merge: true });
    return { ok: true, alreadyClaimed: false };
  });
});

/**
 * seasonBuyPass — покупка платной дорожки за 350 жемчужин. Списывает атомарно
 * в той же транзакции, что фиксирует владение — списание без владения (или
 * наоборот) невозможно даже при обрыве сети между двумя отдельными запросами.
 */
export const seasonBuyPass = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const uid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId);

  const { seasonId } = request.data ?? {};
  if (!isValidSeasonId(seasonId)) throw new HttpsError('invalid-argument', 'seasonId invalid');

  const userRef = db.collection('users').doc(uid);
  const ownedRef = userRef.collection('season_pass_owned').doc(seasonId);

  return db.runTransaction(async (tx) => {
    const [ownedSnap, userSnap] = await Promise.all([tx.get(ownedRef), tx.get(userRef)]);
    if (ownedSnap.exists) {
      return { ok: true, alreadyOwned: true, shardsBalance: readShardBalance(userSnap.data()?.shards) };
    }

    const currentBalance = readShardBalance(userSnap.data()?.shards);
    if (currentBalance < SEASON_PASS_PRICE_PEARLS) {
      return { ok: false, error: 'insufficient_shards', shardsBalance: currentBalance };
    }
    const newBalance = currentBalance - SEASON_PASS_PRICE_PEARLS;

    tx.set(ownedRef, { /* guard-ok: НОВЫЙ маркер-документ владения (ownedSnap.exists проверен строкой выше) — merge не нужен, та же логика что claimRef в seasonClaimReward */ purchasedAt: admin.firestore.FieldValue.serverTimestamp(), priceShards: SEASON_PASS_PRICE_PEARLS });
    tx.set(userRef, {
      shards: newBalance,
      shards_updated_at_ms: Date.now(),
      shards_updated_op: 'spend',
      shards_updated_reason: 'season_pass_purchase',
    }, { merge: true });

    return { ok: true, alreadyOwned: false, shardsBalance: newBalance };
  });
});
