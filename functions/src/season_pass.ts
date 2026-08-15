// ═══════════════════════════════════════════════════════════════════════════
// season_pass.ts — серверная сторона Season Pass. Клиент: app/season_pass_server.ts.
// Сервер сохраняет claim-маркер и выдаёт только серверный entitlement Plus.
// Обычный Season-жемчуг принадлежит клиентскому ledger: этот callable не
// создаёт balance projection и не возвращает серверный баланс.
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
import { assertTournamentsReleased } from './tournament_release_gate';

const REWARD_CLAIMS_COLLECTION = 'reward_claims';
const SEASON_ID_RE = /^\d{4}-Q[1-4]$/;
const SEASON_PASS_PRICE_PEARLS = 250;

// Compatibility mirror for rollout diagnostics only. It is not consulted by
// seasonClaimReward and is never an authority for the personal pearl wallet.
export const PEARLS_BY_LEVEL: Readonly<Record<number, number>> = {
  3: 2, 5: 15, 9: 4, 14: 20, 17: 5, 21: 8, 23: 20, 31: 16, 32: 25, 37: 5,
  41: 25, 43: 32, 49: 25, 53: 5, 55: 64, 57: 40,
};
const PLUS_DAYS_BY_LEVEL: Readonly<Record<number, number>> = { 12: 3, 33: 7 };

function isValidSeasonId(v: unknown): v is string {
  return typeof v === 'string' && SEASON_ID_RE.test(v);
}

/**
 * seasonClaimReward — compatibility claim marker plus the server-only Plus
 * entitlement. Ordinary pearls and other local effects are client-owned.
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
        vipUntilMs: typeof data.vipUntilMs === 'number' ? data.vipUntilMs : undefined,
      };
    }

    const progress = (userSnap.data()?.progress ?? {}) as Record<string, unknown>;
    const isProLifetime = String((progress as { premium_plan?: unknown }).premium_plan ?? '')
      .trim().toLowerCase() === 'lifetime';

    let vipUntilMs: number | undefined;
    const patch: Record<string, unknown> = {};

    if (kind === 'pearls') {
      // Ordinary Season Pass pearls are client-owned. This legacy callable may
      // record the claim for compatibility, but never creates a wallet fact.
      void amount;
    } else if (kind === 'plus_days') {
      const days = PLUS_DAYS_BY_LEVEL[lvl];
      if (days) {
        if (isProLifetime) {
          // Pro already has permanent access. The server must not convert an
          // ordinary Season reward into a server-authored pearl balance fact.
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

    tx.set(claimRef, { /* guard-ok: НОВЫЙ маркер-документ в подколлекции (claimSnap.exists проверен строкой выше, транзакция коммитится атомарно при выходе из колбэка — не «запись без await») — merge не нужен */
      seasonId, level: lvl, side, kind, vipUntilMs: vipUntilMs ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (Object.keys(patch).length > 0) tx.set(userRef, patch, { merge: true });

    return { ok: true, alreadyClaimed: false, vipUntilMs };
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
  // Old installed clients may still submit a saved Season Pass ticket. Keep
  // the wire kind compatible, but never create tournament state while the
  // owner lock is active.
  if (kind === 'tournament_ticket') assertTournamentsReleased();

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
    const ownedSnap = await tx.get(ownedRef);
    if (ownedSnap.exists) {
      return { ok: true, alreadyOwned: true };
    }

    tx.set(ownedRef, { /* guard-ok: НОВЫЙ маркер-документ владения (ownedSnap.exists проверен строкой выше) — merge не нужен, та же логика что claimRef в seasonClaimReward */ purchasedAt: admin.firestore.FieldValue.serverTimestamp(), priceShards: SEASON_PASS_PRICE_PEARLS });

    return { ok: true, alreadyOwned: false };
  });
});
