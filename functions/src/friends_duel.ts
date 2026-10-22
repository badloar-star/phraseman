/**
 * «Дуэль на 5 фраз» — callable сервера (docs/work/tasks/friends-duel-2026-10-22.md, friends-duel-server-2026-10-22.md).
 *
 *  - friendsDuelChallenge — вызов другу: 5 id фраз + ход вызвавшего, ≤3 вызовов в день, одна открытая дуэль на пару.
 *  - friendsDuelMove      — ход друга: итог в той же транзакции, уведомление вызвавшему.
 *  - friendsDuelDecline   — отказ: тихая строка вызвавшему.
 *
 * Firebase-экономия (координатор 22.10): без where по коллекциям, без слушателей, без плановой функции — срок лениво.
 * Замок «одна открытая дуэль» — поле duel в friend_pairs/{a__b} (тот же документ пары, что у реферального бонуса).
 * Повтор того же requestId отвечает тем же ответом — без второго хода и второго пуша (ход и отказ досылаются без сети).
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { buildUserNotification, userNotificationRef } from './user_notifications';
// зачем (координатор 22.10, 10 · ПЕРЕВОДЧИК): пуш и строка ленты — на языке получателя, а не только по-русски
import { friendsPushLangOf, friendsPushText } from './friends_push_copy';
import { sendExpoPush } from './expo_push';
import {
  FRIENDS_TOGETHER_DEFAULTS,
  type FriendsTogetherConfig,
  friendsTogetherConfigFromNumbers,
  isQuietHours,
} from './friends_together_core';
import {
  DUEL_DAILY_CHALLENGE_LIMIT,
  DUEL_TTL_MS,
  type DuelMove,
  duelDayKey,
  duelDocumentId,
  duelMoveSummary,
  duelOutcome,
  duelPairKey,
  invertDuelOutcome,
  isDuelExpired,
  parseDuelMove,
  parseDuelPhraseIds,
} from './friends_duel_core';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;
const LOG = '[FRIENDS-DUEL]';
// зачем (Ревизор 22.10, 💸): квитанции повторов нужны дни, а не годы — TTL Firestore по полю expireAt стирает их через 30 дней
// (политика TTL на группу коллекций — отдельной командой координатора). Повтор старше 30 дней — новый запрос, как и задумано.
const RECEIPT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/* ------------------------------------ helpers -------------------------------- */

const uidTag = (uid: string): string => (uid ? uid.slice(0, 6) : '-');

/** Каждый ранний выход пишет причину; код ошибки — подстрока контракта (limit, open_duel, not_friends, …). */
function rejectDuel(code: ConstructorParameters<typeof HttpsError>[0], reason: string, ctx: Record<string, unknown> = {}): never {
  console.warn(`${LOG} reject reason=${reason} ${JSON.stringify(ctx)}`);
  throw new HttpsError(code, reason);
}

function cleanId(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanRequestId(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!/^[A-Za-z0-9_-]{12,96}$/.test(raw)) rejectDuel('invalid-argument', 'invalid_request_id');
  return raw;
}

function cleanDuelId(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!/^[A-Za-z0-9_-]{1,200}__[A-Za-z0-9_-]{1,200}_\d{1,9}$/.test(raw)) rejectDuel('invalid-argument', 'invalid_duel_id');
  return raw;
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch (error) {
    console.warn(`${LOG} json_parse_failed ${String(error instanceof Error ? error.message : error).slice(0, 80)}`);
    return {};
  }
}

function parseInt0(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Имя для уведомления — с сервера (public_profiles), клиентское — запасное. */
function displayName(profile: FirebaseFirestore.DocumentData | undefined, fallback: unknown): string {
  return String(profile?.name ?? profile?.displayName ?? '').trim().slice(0, 48)
    || String(fallback ?? '').trim().slice(0, 48)
    || 'Friend';
}

const CONFIG_CACHE_TTL_MS = 60_000;
let cachedConfig: { expiresAtMs: number; enabled: boolean; config: FriendsTogetherConfig } | null = null;

/** remote_config/app: выключатель «Вместе» (тот же, что у «Позвать») + тихие часы. 60 с кеша — одно чтение на тёплый инстанс. */
async function resolveDuelConfig(db: admin.firestore.Firestore): Promise<{ enabled: boolean; config: FriendsTogetherConfig }> {
  const now = Date.now();
  if (cachedConfig && cachedConfig.expiresAtMs > now) return cachedConfig;
  try {
    const data = (await db.collection('remote_config').doc('app').get()).data() as
      { numbers?: Record<string, unknown>; bools?: Record<string, unknown> } | undefined;
    cachedConfig = {
      expiresAtMs: now + CONFIG_CACHE_TTL_MS,
      enabled: data?.bools?.friends_together_enabled === true,
      config: friendsTogetherConfigFromNumbers(data?.numbers),
    };
    return cachedConfig;
  } catch (error) {
    console.warn(`${LOG} config_read_failed ${String(error instanceof Error ? error.message : error).slice(0, 120)}`);
    return { enabled: false, config: { ...FRIENDS_TOGETHER_DEFAULTS } };
  }
}

/** Для тестов: сбросить кеш конфига между случаями. */
export function __resetFriendsDuelConfigCacheForTests(): void {
  cachedConfig = null;
}

function pushAllowed(friendData: FirebaseFirestore.DocumentData | undefined, config: FriendsTogetherConfig, nowMs: number): boolean {
  const progress = friendData?.progress && typeof friendData.progress === 'object' ? friendData.progress as Record<string, unknown> : {};
  const prefs = parseJsonObject(friendData?.friends_push_v1 ?? progress.friends_push_v1);
  if (prefs.enabled === false) return false;
  const tz = typeof prefs.tz === 'number' && Number.isFinite(prefs.tz) ? prefs.tz : null;
  return !isQuietHours(nowMs, tz, config.nudgeQuietStartHour, config.nudgeQuietEndHour, config.nudgeDefaultTzOffsetMinutes);
}

function sendDuelPush(token: string, title: string, body: string, data: Record<string, unknown>, kind: string): void {
  if (!token) {
    console.log(`${LOG} push:skip kind=${kind} reason=no_token`);
    return;
  }
  void sendExpoPush(token, title, body, data)
    .then((transport) => { if (transport !== 'sent') console.warn(`${LOG} push:${transport} kind=${kind}`); })
    .catch((error: unknown) => console.warn(`${LOG} push:threw kind=${kind} ${error instanceof Error ? error.name : typeof error}`));
}

async function callerStableUid(db: admin.firestore.Firestore, authUid: string | undefined, requested: unknown): Promise<string> {
  if (!authUid) rejectDuel('unauthenticated', 'auth_required');
  return resolveStableUidForAuth(db, authUid, cleanId(requested) || undefined);
}

function readMove(data: FirebaseFirestore.DocumentData | undefined, field: string): DuelMove | null {
  return parseDuelMove(data?.[field]);
}

/* --------------------------------- challenge --------------------------------- */

export const friendsDuelChallenge = onCall(CALLABLE_BASE, async (request) => {
  const db = admin.firestore();
  const stableUid = await callerStableUid(db, request.auth?.uid, request.data?.stableId);
  const friendUid = cleanId(request.data?.friendUid);
  const requestId = cleanRequestId(request.data?.requestId);
  const ctx = { from: uidTag(stableUid), friend: uidTag(friendUid), requestId };
  console.log(`${LOG} challenge:enter ${JSON.stringify(ctx)}`);
  if (!friendUid || friendUid === stableUid) rejectDuel('invalid-argument', 'valid_friend_required', ctx);
  const phraseIds = parseDuelPhraseIds(request.data?.phraseIds);
  if (!phraseIds) rejectDuel('invalid-argument', 'invalid_phrase_ids', ctx);
  const move = parseDuelMove(request.data?.move);
  if (!move) rejectDuel('invalid-argument', 'invalid_move', ctx);

  const { enabled, config } = await resolveDuelConfig(db);
  if (!enabled) rejectDuel('failed-precondition', 'disabled', ctx);

  const now = Date.now();
  const pairKey = duelPairKey(stableUid, friendUid);
  const dayKey = duelDayKey(now);
  const userRef = db.collection('users').doc(stableUid);
  const friendRef = db.collection('users').doc(friendUid);
  const pairRef = db.collection('friend_pairs').doc(pairKey);
  const dayRef = userRef.collection('friend_duel_days').doc(dayKey);
  const receiptRef = userRef.collection('friend_duel_receipts').doc(requestId);
  const senderProfileRef = db.collection('public_profiles').doc(stableUid);

  const result = await db.runTransaction(async (tx) => {
    const [receiptSnap, friendSnap, ownFriend, reciprocal, pairSnap, daySnap, profileSnap] = await Promise.all([
      tx.get(receiptRef),
      tx.get(friendRef),
      tx.get(userRef.collection('friends').doc(friendUid)),
      tx.get(friendRef.collection('friends').doc(stableUid)),
      tx.get(pairRef),
      tx.get(dayRef),
      tx.get(senderProfileRef),
    ]);
    if (receiptSnap.exists) {
      const receipt = receiptSnap.data() ?? {};
      if (receipt.kind !== 'challenge' || receipt.friendUid !== friendUid) rejectDuel('already-exists', 'request_id_reused', ctx);
      console.log(`${LOG} challenge:replay ${JSON.stringify(ctx)}`);
      return { response: receipt.response as Record<string, unknown>, push: null };
    }
    if (!friendSnap.exists) rejectDuel('not-found', 'user_not_found', ctx);
    if (!ownFriend.exists || !reciprocal.exists) {
      rejectDuel('failed-precondition', 'not_friends', { ...ctx, ownFriend: ownFriend.exists, reciprocal: reciprocal.exists });
    }
    const sentToday = parseInt0(daySnap.data()?.count);
    if (sentToday >= DUEL_DAILY_CHALLENGE_LIMIT) rejectDuel('resource-exhausted', 'limit', { ...ctx, sentToday });

    const pairDuel = parseJsonObject(pairSnap.data()?.duel);
    const openDuelId = typeof pairDuel.openDuelId === 'string' ? pairDuel.openDuelId : '';
    if (openDuelId && !isDuelExpired(pairDuel.openExpiresAtMs, now)) {
      rejectDuel('failed-precondition', 'open_duel', { ...ctx, openDuelId });
    }
    if (openDuelId) {
      // Ленивый срок: прошлая открытая дуэль пары просрочена — закрываем её здесь же (замок указывает только на открытую).
      tx.set(db.collection('friend_duels').doc(openDuelId), { status: 'expired', closedAtMs: now }, { merge: true });
      console.log(`${LOG} challenge:lazy_expire ${JSON.stringify({ ...ctx, openDuelId })}`);
    }

    const seq = parseInt0(pairDuel.seq) + 1;
    const duelId = duelDocumentId(pairKey, seq);
    const expiresAtMs = now + DUEL_TTL_MS;
    const senderName = displayName(profileSnap.data(), request.data?.senderDisplayName);
    const eventId = `friend_duel_challenge_${duelId}`;

    tx.create(db.collection('friend_duels').doc(duelId), {
      schemaVersion: 1,
      uids: [stableUid, friendUid].sort(),
      challengerUid: stableUid,
      opponentUid: friendUid,
      phraseIds,
      challengerMove: { results: [...move.results], elapsedMs: move.elapsedMs },
      status: 'open',
      createdAtMs: now,
      expiresAtMs,
    });
    tx.set(pairRef, { uids: [stableUid, friendUid].sort(), duel: { seq, openDuelId: duelId, openExpiresAtMs: expiresAtMs }, updatedAt: now }, { merge: true });
    tx.set(dayRef, { count: sentToday + 1, updatedAt: now }, { merge: true });
    tx.set(userNotificationRef(db, friendUid, eventId), buildUserNotification({
      type: 'friend_nudge',
      fromUid: stableUid,
      fromName: senderName,
      text: friendsPushText(friendsPushLangOf(friendSnap.data()), 'duelFeed'),
      nav: { kind: 'friend_event', action: 'duel_challenge', actorStableUid: stableUid, eventId, duelId, expiresAtMs, phraseIds },
    }, now));
    const response = { ok: true, duelId, expiresAtMs };
    tx.set(receiptRef, { kind: 'challenge', friendUid, duelId, response, createdAt: now, expireAt: new Date(now + RECEIPT_TTL_MS) });
    console.log(`${LOG} challenge:created ${JSON.stringify({ ...ctx, duelId, seq, sentToday: sentToday + 1 })}`);
    const friendData = friendSnap.data();
    return {
      response,
      push: pushAllowed(friendData, config, now)
        ? { token: typeof friendData?.expoPushToken === 'string' ? friendData.expoPushToken : '', senderName, eventId, duelId, lang: friendsPushLangOf(friendData) }
        : null,
    };
  });

  if (result.push) {
    sendDuelPush(result.push.token, friendsPushText(result.push.lang, 'duelTitle', { name: result.push.senderName }), friendsPushText(result.push.lang, 'duelBody'), {
      type: 'friend_nudge', eventId: result.push.eventId, actorStableUid: stableUid, nav: 'friends', duelId: result.push.duelId,
    }, 'duel_challenge');
  } else {
    console.log(`${LOG} challenge:push_skipped ${JSON.stringify(ctx)}`);
  }
  return result.response;
});

/* ----------------------------------- move ------------------------------------ */

export const friendsDuelMove = onCall(CALLABLE_BASE, async (request) => {
  const db = admin.firestore();
  const stableUid = await callerStableUid(db, request.auth?.uid, request.data?.stableId);
  const duelId = cleanDuelId(request.data?.duelId);
  const requestId = cleanRequestId(request.data?.requestId);
  const ctx = { by: uidTag(stableUid), duelId, requestId };
  console.log(`${LOG} move:enter ${JSON.stringify(ctx)}`);
  const move = parseDuelMove(request.data?.move);
  if (!move) rejectDuel('invalid-argument', 'invalid_move', ctx);
  const { enabled, config } = await resolveDuelConfig(db);
  if (!enabled) rejectDuel('failed-precondition', 'disabled', ctx);

  const now = Date.now();
  const duelRef = db.collection('friend_duels').doc(duelId);
  const receiptRef = db.collection('users').doc(stableUid).collection('friend_duel_receipts').doc(requestId);

  const result = await db.runTransaction(async (tx) => {
    const [receiptSnap, duelSnap] = await Promise.all([tx.get(receiptRef), tx.get(duelRef)]);
    if (receiptSnap.exists) {
      const receipt = receiptSnap.data() ?? {};
      if (receipt.kind !== 'move' || receipt.duelId !== duelId) rejectDuel('already-exists', 'request_id_reused', ctx);
      console.log(`${LOG} move:replay ${JSON.stringify(ctx)}`);
      return { error: null as string | null, response: receipt.response as Record<string, unknown>, push: null };
    }
    const duel = duelSnap.data();
    if (!duelSnap.exists || duel?.opponentUid !== stableUid) rejectDuel('permission-denied', 'not_invited', { ...ctx, exists: duelSnap.exists });
    if (duel?.status !== 'open') rejectDuel('failed-precondition', 'already_moved', { ...ctx, status: duel?.status });
    const pairKey = duelPairKey(String(duel?.challengerUid), stableUid);
    const pairRef = db.collection('friend_pairs').doc(pairKey);
    const pairSnap = await tx.get(pairRef);
    const pairDuel = parseJsonObject(pairSnap.data()?.duel);
    const releaseLock = pairDuel.openDuelId === duelId;

    if (isDuelExpired(duel?.expiresAtMs, now)) {
      // Ленивый срок: закрываем в этой же транзакции, ошибку отдаём ПОСЛЕ коммита (иначе запись откатится вместе с throw).
      tx.set(duelRef, { status: 'expired', closedAtMs: now }, { merge: true });
      if (releaseLock) tx.set(pairRef, { duel: { openDuelId: null, openExpiresAtMs: 0 }, updatedAt: now }, { merge: true });
      console.log(`${LOG} move:lazy_expire ${JSON.stringify({ ...ctx, releaseLock })}`);
      return { error: 'expired', response: null, push: null };
    }
    const challengerMove = readMove(duel, 'challengerMove');
    if (!challengerMove) rejectDuel('failed-precondition', 'challenger_move_corrupt', ctx);
    const challengerUid = String(duel?.challengerUid);
    const phraseIds = Array.isArray(duel?.phraseIds) ? duel?.phraseIds as string[] : [];

    const opponentOutcome = duelOutcome(move, challengerMove);
    const challengerOutcome = invertDuelOutcome(opponentOutcome);
    const opponentSummary = duelMoveSummary(move);
    const challengerSummary = duelMoveSummary(challengerMove);
    const opponentProfile = await tx.get(db.collection('public_profiles').doc(stableUid));
    const challengerSnap = await tx.get(db.collection('users').doc(challengerUid));
    const opponentName = displayName(opponentProfile.data(), request.data?.senderDisplayName);
    const eventId = `friend_duel_result_${duelId}`;

    tx.set(duelRef, {
      opponentMove: { results: [...move.results], elapsedMs: move.elapsedMs },
      status: 'finished',
      outcomeForChallenger: challengerOutcome,
      finishedAtMs: now,
    }, { merge: true });
    if (releaseLock) tx.set(pairRef, { duel: { openDuelId: null, openExpiresAtMs: 0 }, updatedAt: now }, { merge: true });
    tx.set(userNotificationRef(db, challengerUid, eventId), buildUserNotification({
      type: 'friend_nudge',
      fromUid: stableUid,
      fromName: opponentName,
      text: friendsPushText(friendsPushLangOf(challengerSnap.data()), 'duelResultTitle'),
      nav: {
        kind: 'friend_event', action: 'duel_result', actorStableUid: stableUid, eventId, duelId,
        outcome: challengerOutcome, mine: challengerSummary, theirs: opponentSummary, phraseIds,
      },
    }, now));
    const response = {
      ok: true,
      outcome: opponentOutcome,
      mine: { correct: opponentSummary.correct, elapsedMs: opponentSummary.elapsedMs },
      theirs: challengerSummary,
    };
    tx.set(receiptRef, { kind: 'move', duelId, response, createdAt: now, expireAt: new Date(now + RECEIPT_TTL_MS) });
    console.log(`${LOG} move:finished ${JSON.stringify({ ...ctx, opponentOutcome, mine: opponentSummary.correct, theirs: challengerSummary.correct, releaseLock })}`);
    const challengerData = challengerSnap.data();
    return {
      error: null,
      response,
      push: pushAllowed(challengerData, config, now)
        ? { token: typeof challengerData?.expoPushToken === 'string' ? challengerData.expoPushToken : '', name: opponentName, eventId, challengerUid, lang: friendsPushLangOf(challengerData) }
        : null,
    };
  });

  if (result.error) rejectDuel('failed-precondition', result.error, ctx);
  if (result.push) {
    sendDuelPush(result.push.token, friendsPushText(result.push.lang, 'duelResultTitle'), friendsPushText(result.push.lang, 'duelResultBody', { name: result.push.name }), {
      type: 'friend_nudge', eventId: result.push.eventId, actorStableUid: stableUid, nav: 'friends', duelId,
    }, 'duel_result');
  }
  return result.response;
});

/* ---------------------------------- decline ---------------------------------- */

export const friendsDuelDecline = onCall(CALLABLE_BASE, async (request) => {
  const db = admin.firestore();
  const stableUid = await callerStableUid(db, request.auth?.uid, request.data?.stableId);
  const duelId = cleanDuelId(request.data?.duelId);
  const requestId = cleanRequestId(request.data?.requestId);
  const ctx = { by: uidTag(stableUid), duelId, requestId };
  console.log(`${LOG} decline:enter ${JSON.stringify(ctx)}`);
  const { enabled } = await resolveDuelConfig(db);
  if (!enabled) rejectDuel('failed-precondition', 'disabled', ctx);

  const now = Date.now();
  const duelRef = db.collection('friend_duels').doc(duelId);
  const receiptRef = db.collection('users').doc(stableUid).collection('friend_duel_receipts').doc(requestId);

  const result = await db.runTransaction(async (tx) => {
    const [receiptSnap, duelSnap] = await Promise.all([tx.get(receiptRef), tx.get(duelRef)]);
    if (receiptSnap.exists) {
      const receipt = receiptSnap.data() ?? {};
      if (receipt.kind !== 'decline' || receipt.duelId !== duelId) rejectDuel('already-exists', 'request_id_reused', ctx);
      console.log(`${LOG} decline:replay ${JSON.stringify(ctx)}`);
      return { error: null as string | null };
    }
    const duel = duelSnap.data();
    if (!duelSnap.exists || duel?.opponentUid !== stableUid) rejectDuel('permission-denied', 'not_invited', { ...ctx, exists: duelSnap.exists });
    if (duel?.status !== 'open') rejectDuel('failed-precondition', 'already_moved', { ...ctx, status: duel?.status });
    const challengerUid = String(duel?.challengerUid);
    const pairRef = db.collection('friend_pairs').doc(duelPairKey(challengerUid, stableUid));
    // зачем: в транзакции Firestore все чтения — до первой записи; профиль читаем вместе с парой.
    const [pairSnap, profileSnap, challengerSnap] = await Promise.all([
      tx.get(pairRef),
      tx.get(db.collection('public_profiles').doc(stableUid)),
      tx.get(db.collection('users').doc(challengerUid)),
    ]);
    const releaseLock = parseJsonObject(pairSnap.data()?.duel).openDuelId === duelId;
    if (releaseLock) tx.set(pairRef, { duel: { openDuelId: null, openExpiresAtMs: 0 }, updatedAt: now }, { merge: true });

    if (isDuelExpired(duel?.expiresAtMs, now)) {
      tx.set(duelRef, { status: 'expired', closedAtMs: now }, { merge: true });
      console.log(`${LOG} decline:lazy_expire ${JSON.stringify({ ...ctx, releaseLock })}`);
      return { error: 'expired' };
    }
    const eventId = `friend_duel_declined_${duelId}`;
    tx.set(duelRef, { status: 'declined', closedAtMs: now }, { merge: true });
    tx.set(userNotificationRef(db, challengerUid, eventId), buildUserNotification({
      type: 'friend_nudge',
      fromUid: stableUid,
      fromName: displayName(profileSnap.data(), request.data?.senderDisplayName),
      text: friendsPushText(friendsPushLangOf(challengerSnap.data()), 'duelDeclinedFeed'),
      nav: { kind: 'friend_event', action: 'duel_declined', actorStableUid: stableUid, eventId, duelId },
    }, now));
    tx.set(receiptRef, { kind: 'decline', duelId, response: { ok: true }, createdAt: now, expireAt: new Date(now + RECEIPT_TTL_MS) });
    console.log(`${LOG} decline:done ${JSON.stringify({ ...ctx, releaseLock })}`);
    return { error: null };
  });

  if (result.error) rejectDuel('failed-precondition', result.error, ctx);
  return { ok: true };
});
