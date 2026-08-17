/**
 * «Вместе» — сервер (docs/plans/2026-08-16-friends-together-implementation.ru.md §3).
 *
 * Callable-обёртки вокруг чистых функций friends_together_core.ts:
 *  - friendsTogetherClaimLevel — веха уровня дружбы (звёзды вызывающему).
 *  - friendsClaimWeeklyChest — сундук недели (звёзды + xp_boost + streak_shield + avatar_aura).
 *  - friendsNudge — «Позвать» (пуш другу, дневные лимиты, тихие часы).
 *  - applyReferralPairBonus — хук из referral.ts: пара стартует с bonusDays=3 и boostUntilWeekKey.
 *
 * Идемпотентность — receipt-паттерн из arena_expansion.ts (tx.create на doc requestId,
 * повторный вызов с тем же requestId либо реплеит прежний ответ, либо кидает already-exists
 * при несовпадении параметров — как friend_gifts.ts replayFriendGiftResult).
 * Звёзды — ТОЛЬКО через stars_ledger.ts (prepareStarOperations/commitStarOperations),
 * xp_boost/streak_shield/avatar_aura — те же помощники, что league_chest.ts (buildRewardProgressPatch).
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { ensureStableLinkForAuth } from './auth_identity';
import { buildUserNotification, userNotificationRef } from './user_notifications';
import { sendExpoPush, type FriendGiftPushTransport } from './friend_gifts';
import { buildRewardProgressPatch, type RewardDrop } from './league_chest';
import { prepareStarOperations, commitStarOperations, type StarOpRequest } from './stars_ledger';
import {
  type ActiveDaysState,
  type ChestFriendContribution,
  type FriendsTogetherConfig,
  FRIENDS_TOGETHER_DEFAULTS,
  friendsTogetherConfigFromNumbers,
  daysTogether,
  levelForDays,
  starsForLevel,
  weeklyChestProgress,
  weeklyChestTopContributors,
  chestTierForProgress,
  chestClaimBlockReason,
  chestRewardMultiplier,
  isQuietHours,
  nudgeLimitBlockReason,
} from './friends_together_core';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Awarded chest reward window mirrors league_chest's xp_boost expiry (1 week is plenty for a 60m boost). */
const CHEST_REWARD_EXPIRES_MS = 7 * DAY_MS;

/* ------------------------------------ helpers -------------------------------- */

function cleanId(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanRequestId(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (!/^[A-Za-z0-9_-]{12,96}$/.test(raw)) {
    throw new HttpsError('invalid-argument', 'invalid_request_id');
  }
  return raw;
}

function parseInt0(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function getProgress(data: FirebaseFirestore.DocumentData | undefined): Record<string, unknown> {
  const raw = data?.progress;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

function getField(data: FirebaseFirestore.DocumentData | undefined, key: string): unknown {
  const progress = getProgress(data);
  return data?.[key] ?? progress[key];
}

function activeDaysFromUser(data: FirebaseFirestore.DocumentData | undefined): ActiveDaysState | null {
  const raw = parseJsonObject(getField(data, 'active_days_v1'));
  const anchor = typeof raw.anchor === 'string' ? raw.anchor : '';
  const bits = typeof raw.bits === 'string' ? raw.bits : '';
  if (!anchor || !bits) return null;
  return { anchor, bits };
}

function userMatchesAuth(
  stableId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  authUid: string,
): boolean {
  if (!data || data.identityHidden === true) return false;
  const canonicalStableId = typeof data.canonicalStableId === 'string' ? data.canonicalStableId.trim() : '';
  if (canonicalStableId && canonicalStableId !== stableId) return false;
  const linkedAuthUid = typeof data?.firebaseAuthUid === 'string' ? data.firebaseAuthUid : '';
  return (linkedAuthUid && linkedAuthUid === authUid) || stableId === authUid;
}

function isoWeekKey(nowMs: number): string {
  const date = new Date(nowMs);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Следующий недельный ключ — для boostUntilWeekKey (§1.4: буст на первую неделю приглашённого). */
function nextIsoWeekKey(nowMs: number): string {
  return isoWeekKey(nowMs + 7 * DAY_MS);
}

function todayDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function pairId(a: string, b: string): string {
  return [a, b].sort().join('__');
}

/** Server-cached remote_config/app.numbers overlay — 60s TTL, same spirit as friendsGetProfiles. */
const CONFIG_CACHE_TTL_MS = 60_000;
let cachedConfig: { expiresAtMs: number; value: FriendsTogetherConfig } | null = null;

async function resolveConfig(db: admin.firestore.Firestore): Promise<FriendsTogetherConfig> {
  const now = Date.now();
  if (cachedConfig && cachedConfig.expiresAtMs > now) return cachedConfig.value;
  try {
    const snap = await db.collection('remote_config').doc('app').get();
    const data = snap.data() as { numbers?: Record<string, unknown> } | undefined;
    const value = friendsTogetherConfigFromNumbers(data?.numbers);
    cachedConfig = { expiresAtMs: now + CONFIG_CACHE_TTL_MS, value };
    return value;
  } catch (e) {
    console.warn('friends_together: resolveConfig failed, using defaults', e);
    return { ...FRIENDS_TOGETHER_DEFAULTS };
  }
}

/* -------------------------------- friendsTogetherClaimLevel ------------------------------- */

export const friendsTogetherClaimLevel = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const stableUid = cleanId(request.data?.stableId);
  const friendUid = cleanId(request.data?.friendUid);
  const level = parseInt0(request.data?.level);
  const requestId = cleanRequestId(request.data?.requestId);
  if (!stableUid || !friendUid || stableUid === friendUid) {
    throw new HttpsError('invalid-argument', 'valid_stable_and_friend_required');
  }
  if (!level || level < 2 || level > 5) {
    throw new HttpsError('invalid-argument', 'invalid_level');
  }
  if (!requestId) throw new HttpsError('invalid-argument', 'request_id_required');

  const db = admin.firestore();
  const signInProvider = String(request.auth.token?.firebase?.sign_in_provider ?? '').trim();
  const linked = await ensureStableLinkForAuth(db, request.auth.uid, stableUid, signInProvider);
  if (linked.stableUid !== stableUid) throw new HttpsError('failed-precondition', 'stable_id_changed');

  const config = await resolveConfig(db);
  const userRef = db.collection('users').doc(stableUid);
  const friendRef = db.collection('users').doc(friendUid);
  const pairRef = db.collection('friend_pairs').doc(pairId(stableUid, friendUid));
  const receiptRef = userRef.collection('friends_together_claims').doc(requestId);
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const [userSnap, friendSnap, ownFriend, reciprocal, pairSnap, receiptSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(friendRef),
      tx.get(userRef.collection('friends').doc(friendUid)),
      tx.get(friendRef.collection('friends').doc(stableUid)),
      tx.get(pairRef),
      tx.get(receiptRef),
    ]);

    if (receiptSnap.exists) {
      const receipt = receiptSnap.data() ?? {};
      if (receipt.friendUid !== friendUid || receipt.level !== level) {
        throw new HttpsError('already-exists', 'request_id_reused');
      }
      return receipt.response as Record<string, unknown>;
    }

    if (!userSnap.exists || !friendSnap.exists) throw new HttpsError('not-found', 'user_not_found');
    if (!userMatchesAuth(stableUid, userSnap.data(), request.auth!.uid)) {
      throw new HttpsError('permission-denied', 'user_does_not_match_auth');
    }
    if (!ownFriend.exists || !reciprocal.exists) {
      throw new HttpsError('failed-precondition', 'not_friends');
    }

    const pairData = pairSnap.data() ?? {};
    const bonusDays = parseInt0(pairData.bonusDays);
    const days = daysTogether(activeDaysFromUser(userSnap.data()), activeDaysFromUser(friendSnap.data()), bonusDays);
    const currentLevel = levelForDays(days, config.levelThresholds);
    if (currentLevel < level) {
      throw new HttpsError('failed-precondition', 'not_reached');
    }
    const claimedLevel = parseInt0(parseJsonObject(pairData.claimedLevel)[stableUid]);
    if (claimedLevel >= level) {
      throw new HttpsError('already-exists', 'claimed');
    }

    const stars = starsForLevel(level);
    const starOps: StarOpRequest[] = stars > 0 ? [{
      opId: `friends_level:${requestId}`,
      delta: stars,
      reason: 'friends_together_level',
      sourceKind: 'friends_together_level',
      sourceId: `${pairId(stableUid, friendUid)}:${level}`,
      ruleVersion: 1,
      earnedAtMs: now,
      meta: { friendUid, level },
    }] : [];

    let starsResult: { balance: number } | null = null;
    if (starOps.length > 0) {
      const prepared = await prepareStarOperations(tx, db, stableUid, userSnap, starOps, {
        nowMs: now,
        activeSeasonId: '',
        weekKeyNow: isoWeekKey(now),
        authUid: request.auth!.uid,
      });
      const committed = commitStarOperations(tx, prepared);
      starsResult = { balance: committed.balance };
    }

    const nextClaimed = { ...parseJsonObject(pairData.claimedLevel), [stableUid]: level };
    tx.set(pairRef, {
      uids: [stableUid, friendUid],
      claimedLevel: nextClaimed,
      updatedAt: now,
    }, { merge: true });

    const response = {
      ok: true,
      level,
      daysTogether: days,
      starsAwarded: stars,
      starsBalance: starsResult?.balance ?? null,
      requestId,
    };
    tx.set(receiptRef, { friendUid, level, response, createdAt: now });
    return response;
  });
});

/* -------------------------------- friendsClaimWeeklyChest ------------------------------- */

export const friendsClaimWeeklyChest = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const stableUid = cleanId(request.data?.stableId);
  const requestedWeekKey = cleanId(request.data?.weekKey);
  const requestId = cleanRequestId(request.data?.requestId);
  if (!stableUid) throw new HttpsError('invalid-argument', 'stable_id_required');
  if (!requestId) throw new HttpsError('invalid-argument', 'request_id_required');

  const db = admin.firestore();
  const signInProvider = String(request.auth.token?.firebase?.sign_in_provider ?? '').trim();
  const linked = await ensureStableLinkForAuth(db, request.auth.uid, stableUid, signInProvider);
  if (linked.stableUid !== stableUid) throw new HttpsError('failed-precondition', 'stable_id_changed');

  const now = Date.now();
  const currentWeekKey = isoWeekKey(now);
  const weekKey = requestedWeekKey || currentWeekKey;
  // Только текущая (в процессе) или уже прошедшая неделя — будущее не пускаем.
  if (weekKey > currentWeekKey) throw new HttpsError('failed-precondition', 'week_open');

  const config = await resolveConfig(db);
  const userRef = db.collection('users').doc(stableUid);
  const claimRef = userRef.collection('friends_chest_claims').doc(weekKey);

  // Читаем список друзей ДО транзакции (может быть большим, ограничиваем разумным пределом —
  // как friendsGetProfiles: топ-N всё равно берёт немного, но users не бесконечны в друзьях).
  const friendsSnap = await userRef.collection('friends').limit(200).get();
  const friendUids = friendsSnap.docs.map((d) => d.id);

  return db.runTransaction(async (tx) => {
    const [userSnap, claimSnap] = await Promise.all([tx.get(userRef), tx.get(claimRef)]);
    if (!userSnap.exists) throw new HttpsError('not-found', 'user_not_found');
    if (!userMatchesAuth(stableUid, userSnap.data(), request.auth!.uid)) {
      throw new HttpsError('permission-denied', 'user_does_not_match_auth');
    }
    if (claimSnap.exists) {
      return { ok: true, alreadyClaimed: true, ...(claimSnap.data() as Record<string, unknown>) };
    }

    const pairRefs = friendUids.map((uid) => db.collection('friend_pairs').doc(pairId(stableUid, uid)));
    const friendUserRefs = friendUids.map((uid) => db.collection('users').doc(uid));
    const [pairSnaps, friendUserSnaps] = await Promise.all([
      Promise.all(pairRefs.map((r) => tx.get(r))),
      Promise.all(friendUserRefs.map((r) => tx.get(r))),
    ]);

    const myActiveDays = activeDaysFromUser(userSnap.data());
    const myProgress = getProgress(userSnap.data());
    const myWeeklyXp = weeklyXpFromProgress(myProgress, currentWeekKey, now);
    const myDaysThisWeek = activeDaysCountForWeek(myActiveDays, weekKey);

    const contributions: ChestFriendContribution[] = friendUids.map((uid, idx) => {
      const pairData = pairSnaps[idx].data() ?? {};
      const bonusDays = parseInt0(pairData.bonusDays);
      const friendData = friendUserSnaps[idx].data();
      const days = daysTogether(myActiveDays, activeDaysFromUser(friendData), bonusDays);
      const pairLevel = levelForDays(days, config.levelThresholds);
      const boostUntilWeekKey = typeof pairData.boostUntilWeekKey === 'string' ? pairData.boostUntilWeekKey : '';
      const friendWeeklyXp = weeklyXpFromProgress(getProgress(friendData), currentWeekKey, now);
      return {
        friendUid: uid,
        pairLevel,
        weeklyXp: friendWeeklyXp,
        boosted: boostUntilWeekKey >= weekKey && boostUntilWeekKey !== '',
      };
    });

    const progress = weeklyChestProgress(
      contributions, config.chestCapPerFriend, config.chestTopN, config.chestMinPairLevel,
    );
    const tier = chestTierForProgress(progress, config.chestTiers);
    const blockReason = chestClaimBlockReason({
      myDaysThisWeek,
      myWeeklyXp,
      tier,
      minDays: config.chestMinMyDays,
      minXp: config.chestMinMyWeeklyXp,
    });
    if (blockReason) throw new HttpsError('failed-precondition', blockReason);

    const multiplier = chestRewardMultiplier(myDaysThisWeek);
    const drops = buildChestRewardDrops(tier, multiplier, now);
    const starsAwarded = drops
      .filter((d) => d.kind === 'shards')
      .reduce((sum, d) => sum + Math.floor((d.amount ?? 0)), 0);

    const userData = userSnap.data();
    const rewardPatch = buildRewardProgressPatch({
      drops,
      user: userData,
      now,
      expiresAt: now + CHEST_REWARD_EXPIRES_MS,
    });

    let starsBalance: number | null = null;
    if (starsAwarded > 0) {
      const starOps: StarOpRequest[] = [{
        opId: `friends_chest:${requestId}`,
        delta: starsAwarded,
        reason: 'friends_together_chest',
        sourceKind: 'friends_together_chest',
        sourceId: `${stableUid}:${weekKey}`,
        ruleVersion: 1,
        earnedAtMs: now,
        meta: { weekKey, tier },
      }];
      const prepared = await prepareStarOperations(tx, db, stableUid, userSnap, starOps, {
        nowMs: now,
        activeSeasonId: '',
        weekKeyNow: isoWeekKey(now),
        authUid: request.auth!.uid,
      });
      const committed = commitStarOperations(tx, prepared, rewardPatch);
      starsBalance = committed.balance;
    } else if (Object.keys(rewardPatch).length > 0) {
      tx.set(userRef, { ...rewardPatch, updatedAt: now }, { merge: true });
    }

    const topContributors = weeklyChestTopContributors(
      contributions, config.chestTopN, config.chestCapPerFriend, config.chestMinPairLevel,
    );
    const claimData = {
      tier,
      progress,
      myDays: myDaysThisWeek,
      multiplier,
      rewards: { drops, stars: starsAwarded },
      topContributors,
      claimedAt: now,
    };
    tx.set(claimRef, claimData);

    return { ok: true, alreadyClaimed: false, starsBalance, ...claimData };
  });
});

/** Same source-of-truth as sync_leaderboard.ts (week_points_v2 first, weekly_xp fallback). */
function weeklyXpFromProgress(
  progress: Record<string, unknown>,
  currentWeekKey: string,
  now: number,
): number {
  let weekPoints = 0;
  try {
    const wpRaw = progress['week_points_v2'];
    if (wpRaw) {
      const wpData = JSON.parse(String(wpRaw)) as { weekKey?: string; points?: number };
      weekPoints = wpData.weekKey === currentWeekKey ? (wpData.points ?? 0) : 0;
    }
  } catch { /* ignore malformed json — fall through to 0 */ }
  const currentWeekStart = weekStartIso(now);
  if (progress['weekly_xp_period_start'] === currentWeekStart) {
    weekPoints = Math.max(weekPoints, Number(progress['weekly_xp'] ?? 0) || 0);
  }
  return Math.max(0, Math.floor(weekPoints));
}

function weekStartIso(nowMs: number): string {
  const date = new Date(nowMs);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

/** Сколько дней этой ISO-недели у меня стоял бит активности (для myDaysThisWeek). */
function activeDaysCountForWeek(active: ActiveDaysState | null, weekKey: string): number {
  if (!active) return 0;
  const weekStartMs = Date.parse(`${weekKey.slice(0, 4)}-01-01T00:00:00.000Z`);
  if (Number.isNaN(weekStartMs)) return 0;
  // Простая и надёжная реализация: находим понедельник этой ISO-недели через isoWeekKey сравнение
  // по каждому из 7 дней вокруг anchor — избегаем ручной ISO-арифметики недель.
  const anchorMs = Date.parse(`${active.anchor}T00:00:00.000Z`);
  let count = 0;
  const bits = active.bits;
  for (let i = 0; i < bits.length; i += 1) {
    if (bits[i] !== '1') continue;
    const dayMs = anchorMs - i * DAY_MS;
    if (isoWeekKey(dayMs) === weekKey) count += 1;
  }
  return count;
}

/** §0/§1.2: I — ×2 XP 60 мин + 10★ · II — + щит цепи + 25★ · III — + 100★ + аура из каталога сундука лиги. */
function buildChestRewardDrops(tier: number, multiplier: number, now: number): RewardDrop[] {
  if (tier <= 0) return [];
  const drops: RewardDrop[] = [];
  const scaledStars = (base: number) => Math.floor(base * multiplier);

  // Tier I: xp_boost 60 min + 10 stars.
  drops.push({
    id: 'friends_chest_xp_boost_60m',
    kind: 'xp_boost',
    rarity: 'rare',
    multiplier: 2,
    uses: 999,
    expiresAt: now + 60 * 60 * 1000,
  });
  drops.push({ id: 'friends_chest_stars_t1', kind: 'shards', rarity: 'common', amount: scaledStars(10) });

  if (tier >= 2) {
    drops.push({ id: 'friends_chest_streak_shield', kind: 'streak_shield', rarity: 'rare', amount: 1 });
    drops.push({ id: 'friends_chest_stars_t2', kind: 'shards', rarity: 'rare', amount: scaledStars(25) });
  }
  if (tier >= 3) {
    drops.push({ id: 'friends_chest_stars_t3', kind: 'shards', rarity: 'epic', amount: scaledStars(100) });
    // зачем: аура берётся из ТОГО ЖЕ каталога, что и league_chest (owner rule §0 — «без новых
    // валют/сущностей»); avatar_aura без auraId в buildRewardProgressPatch просто не применится,
    // поэтому конкретный auraId выбираем по тому же пулу AVATAR_AURA_IDS через league_chest —
    // здесь достаточно kind:'avatar_aura' с auraId, т.к. league_chest сам фильтрует уже владеемые.
    drops.push({ id: 'friends_chest_aura', kind: 'avatar_aura', rarity: 'epic', auraId: 'aura-prism' });
  }
  return drops;
}

/* -------------------------------- friendsNudge ------------------------------- */

export const friendsNudge = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const stableUid = cleanId(request.data?.stableId);
  const friendUid = cleanId(request.data?.friendUid);
  const requestId = cleanRequestId(request.data?.requestId);
  if (!stableUid || !friendUid || stableUid === friendUid) {
    throw new HttpsError('invalid-argument', 'valid_stable_and_friend_required');
  }
  if (!requestId) throw new HttpsError('invalid-argument', 'request_id_required');

  const db = admin.firestore();
  const signInProvider = String(request.auth.token?.firebase?.sign_in_provider ?? '').trim();
  const linked = await ensureStableLinkForAuth(db, request.auth.uid, stableUid, signInProvider);
  if (linked.stableUid !== stableUid) throw new HttpsError('failed-precondition', 'stable_id_changed');

  const config = await resolveConfig(db);
  const now = Date.now();
  const dayKey = todayDayKey(now);
  const userRef = db.collection('users').doc(stableUid);
  const friendRef = db.collection('users').doc(friendUid);
  const senderNudgeRef = userRef.collection('friend_nudges').doc(dayKey);
  const receiverNudgeRef = friendRef.collection('friend_nudges').doc(dayKey);
  const receiptRef = userRef.collection('friends_together_nudge_receipts').doc(requestId);

  const result = await db.runTransaction(async (tx) => {
    const [userSnap, friendSnap, ownFriend, reciprocal, senderNudgeSnap, receiverNudgeSnap, receiptSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(friendRef),
      tx.get(userRef.collection('friends').doc(friendUid)),
      tx.get(friendRef.collection('friends').doc(stableUid)),
      tx.get(senderNudgeRef),
      tx.get(receiverNudgeRef),
      tx.get(receiptRef),
    ]);

    if (receiptSnap.exists) {
      const receipt = receiptSnap.data() ?? {};
      if (receipt.friendUid !== friendUid) throw new HttpsError('already-exists', 'request_id_reused');
      return receipt.response as Record<string, unknown>;
    }

    if (!userSnap.exists || !friendSnap.exists) throw new HttpsError('not-found', 'user_not_found');
    if (!userMatchesAuth(stableUid, userSnap.data(), request.auth!.uid)) {
      throw new HttpsError('permission-denied', 'user_does_not_match_auth');
    }
    if (!ownFriend.exists || !reciprocal.exists) {
      throw new HttpsError('failed-precondition', 'not_friends');
    }

    const friendPush = parseJsonObject(getField(friendSnap.data(), 'friends_push_v1'));
    if (friendPush.enabled === false) {
      throw new HttpsError('failed-precondition', 'disabled');
    }
    const tzRaw = friendPush.tz;
    const tzOffsetMinutes = typeof tzRaw === 'number' && Number.isFinite(tzRaw) ? tzRaw : null;
    if (isQuietHours(now, tzOffsetMinutes, config.nudgeQuietStartHour, config.nudgeQuietEndHour, config.nudgeDefaultTzOffsetMinutes)) {
      throw new HttpsError('failed-precondition', 'quiet_hours');
    }

    const senderData = senderNudgeSnap.data() ?? {};
    const receiverData = receiverNudgeSnap.data() ?? {};
    const sentMap = parseJsonObject(senderData.sent);
    const blockReason = nudgeLimitBlockReason({
      sentToThisFriendToday: Boolean(sentMap[friendUid]),
      senderSentCountToday: parseInt0(senderData.sentCount),
      receiverReceivedCountToday: parseInt0(receiverData.receivedCount),
      maxPerFriend: config.nudgeMaxPerFriendPerDay,
      maxSender: config.nudgeMaxSenderPerDay,
      maxReceiver: config.nudgeMaxReceiverPerDay,
    });
    if (blockReason) throw new HttpsError('resource-exhausted', blockReason);

    const senderName =
      String(request.data?.senderDisplayName ?? '').trim().slice(0, 80) ||
      String(getField(userSnap.data(), 'user_name') ?? '').trim().slice(0, 80) ||
      String(userSnap.data()?.displayName ?? '').trim().slice(0, 80) ||
      'Friend';

    tx.set(senderNudgeRef, {
      sent: { ...sentMap, [friendUid]: now },
      sentCount: parseInt0(senderData.sentCount) + 1,
      updatedAt: now,
    }, { merge: true });
    tx.set(receiverNudgeRef, {
      receivedCount: parseInt0(receiverData.receivedCount) + 1,
      updatedAt: now,
    }, { merge: true });

    tx.set(userNotificationRef(db, friendUid, `friends_together_nudge_${stableUid}_${dayKey}`), buildUserNotification({
      type: 'friend_nudge',
      fromUid: stableUid,
      fromName: senderName,
      text: 'friends_together_nudge',
      nav: { kind: 'friends' },
    }, now));

    const response = { ok: true, requestId, sentAtMs: now };
    tx.set(receiptRef, { friendUid, response, createdAt: now });

    return {
      ...response,
      _friendPushToken: typeof friendSnap.data()?.expoPushToken === 'string' ? friendSnap.data()!.expoPushToken as string : '',
      _senderName: senderName,
    };
  });

  const pushToken = (result as { _friendPushToken?: string })._friendPushToken;
  const senderName = (result as { _senderName?: string })._senderName ?? 'Friend';
  if (pushToken) {
    void sendExpoPush(
      pushToken,
      `👋 ${senderName}`,
      `${senderName} зовёт: 5 минут — и цепь цела`,
      { type: 'friend_nudge', fromName: senderName, nav: 'friends' },
    ).then((transport: FriendGiftPushTransport) => {
      if (transport !== 'sent' && transport !== 'skipped') {
        console.warn('friends_together_nudge_push_failed', { transport });
      }
    }).catch(() => {});
  }

  return { ok: true, requestId: result.requestId, sentAtMs: result.sentAtMs };
});

/* -------------------------------- referral hook ------------------------------- */

/**
 * Хук из referral.ts::markRefereeQualified (единая точка квалификации — обе точки входа,
 * apply-мгновенная и вебхук-триггер, сходятся туда). Пара стартует с bonusDays=3
 * «дней вместе» и boostUntilWeekKey = следующая неделя (§1.4: первую неделю weeklyXp
 * приглашённого считается в сундук пригласившего ×2). Идемпотентно: повторный вызов
 * для той же пары НЕ прибавляет бонус повторно — bonusDays только устанавливается, если
 * пары ещё не было (set с merge на новый док) или явно ещё не проставлен.
 *
 * Вызывающий (referral.ts) оборачивает это в try/catch — реферальная квалификация
 * НИКОГДА не должна падать из-за этой фичи (сформулировано в задании).
 */
export async function applyReferralPairBonus(
  db: admin.firestore.Firestore,
  inviterUid: string,
  inviteeUid: string,
  now: number,
): Promise<void> {
  const a = cleanId(inviterUid);
  const b = cleanId(inviteeUid);
  if (!a || !b || a === b) return;
  const ref = db.collection('friend_pairs').doc(pairId(a, b));
  const boostUntilWeekKey = nextIsoWeekKey(now);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() ?? {};
    // Идемпотентность: если bonusDays уже стоит (>=3), реферальный бонус этой паре уже выдан —
    // повторный вызов (retry вебхука, двойной триггер) ничего не делает.
    if (parseInt0(data.bonusDays) >= 3) return;
    tx.set(ref, {
      uids: [a, b],
      bonusDays: 3,
      boostUntilWeekKey,
      updatedAt: now,
    }, { merge: true });
  });
}
