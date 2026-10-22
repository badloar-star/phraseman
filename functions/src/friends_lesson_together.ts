/**
 * «Урок вместе» — callable сервера (docs/work/tasks/lesson-together-server-2026-10-22.md).
 *
 *  - friendsLessonInvite        — позвать до 3 друзей на это же занятие (3 приглашения на занятие в день).
 *  - friendsLessonTogetherMark  — телефон друга сообщает «прошёл по приглашению»; сервер хранит отметку и зовёт пригласившего.
 *
 * ЗАМОК ВЛАДЕЛЬЦА 22.10: «сервер для сохранения, а не решений… монеты и всё остальное выдаётся телефоном… сервер
 * сохраняет для синхронизации, чтобы не потерялось». Сервер НЕ сверяет занятие и НЕ начисляет монеты: оба телефона
 * сами начисляют себе +2 через кошелёк (ключ lessonTogetherWalletRequestId — раз в день на пару). Здесь — только
 * целостность хранения: личность из auth, приглашение адресовано вызывающему, повтор = тот же ответ.
 * Лимит «3 приглашения на занятие в день» остаётся: он защищает ДРУГОГО человека от потока пушей (как friendsNudge, Б3).
 * Firebase-экономия: приглашение лежит у адресата (отметка читает свою подколлекцию), без where и плановых функций.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { buildUserNotification, userNotificationRef } from './user_notifications';
import { sendExpoPush } from './expo_push';
// зачем (координатор 22.10, 10 · ПЕРЕВОДЧИК): пуш и строка ленты — на языке получателя, а не только по-русски
import { friendsPushLangOf, friendsPushText } from './friends_push_copy';
import {
  FRIENDS_TOGETHER_DEFAULTS,
  type FriendsTogetherConfig,
  friendsTogetherConfigFromNumbers,
  isQuietHours,
} from './friends_together_core';
import {
  LESSON_INVITE_PER_LESSON_PER_DAY,
  LESSON_TOGETHER_COINS,
  isLessonDayKey,
  lessonInviteId,
  nextLocalMidnightMs,
  parseLessonInviteInput,
  tzOffsetOrDefault,
} from './friends_lesson_together_core';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;
const LOG = '[LESSON-TOGETHER]';
// зачем (Ревизор 22.10, 💸): квитанции повторов нужны дни, а не годы — TTL Firestore по полю expireAt стирает их через 30 дней
// (политика TTL на группу коллекций — отдельной командой координатора). Повтор старше 30 дней — новый запрос, как и задумано.
const RECEIPT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const uidTag = (uid: string): string => (uid ? uid.slice(0, 6) : '-');

function reject(code: ConstructorParameters<typeof HttpsError>[0], reason: string, ctx: Record<string, unknown> = {}): never {
  console.warn(`${LOG} reject reason=${reason} ${JSON.stringify(ctx)}`);
  throw new HttpsError(code, reason);
}

function cleanRequestId(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!/^[A-Za-z0-9_-]{12,96}$/.test(raw)) reject('invalid-argument', 'invalid_request_id');
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

function friendsPushPrefs(data: FirebaseFirestore.DocumentData | undefined): Record<string, unknown> {
  const progress = data?.progress && typeof data.progress === 'object' ? data.progress as Record<string, unknown> : {};
  return parseJsonObject(data?.friends_push_v1 ?? progress.friends_push_v1);
}

function displayName(profile: FirebaseFirestore.DocumentData | undefined): string {
  return String(profile?.name ?? profile?.displayName ?? '').trim().slice(0, 48) || 'Friend';
}

function parseInt0(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

const CONFIG_CACHE_TTL_MS = 60_000;
let cachedConfig: { expiresAtMs: number; enabled: boolean; config: FriendsTogetherConfig } | null = null;

async function resolveConfig(db: admin.firestore.Firestore): Promise<{ enabled: boolean; config: FriendsTogetherConfig }> {
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

export function __resetLessonTogetherConfigCacheForTests(): void {
  cachedConfig = null;
}

/* ---------------------------------- invite ----------------------------------- */

export async function handleFriendsLessonInvite(request: CallableRequest): Promise<Record<string, unknown>> {
  if (!request.auth?.uid) reject('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, String(request.data?.stableId ?? '').trim() || undefined);
  const requestId = cleanRequestId(request.data?.requestId);
  const input = parseLessonInviteInput(request.data as Record<string, unknown> | undefined, stableUid);
  const ctx = { from: uidTag(stableUid), requestId, friends: input?.friendUids.length ?? 0 };
  console.log(`${LOG} invite:enter ${JSON.stringify(ctx)}`);
  if (!input) reject('invalid-argument', 'invalid_invite', ctx);
  const { enabled, config } = await resolveConfig(db);
  if (!enabled) reject('failed-precondition', 'disabled', ctx);

  const now = Date.now();
  const dayKey = new Date(now).toISOString().slice(0, 10);
  const lessonSlot = `l${input.lessonOrdinal}_s${input.sessionOrdinal}`;
  const userRef = db.collection('users').doc(stableUid);
  const dayRef = userRef.collection('friend_lesson_invite_days').doc(dayKey);
  const receiptRef = userRef.collection('friend_lesson_invite_receipts').doc(requestId);

  const result = await db.runTransaction(async (tx) => {
    const friendRefs = input.friendUids.map((uid) => db.collection('users').doc(uid));
    const [receiptSnap, daySnap, profileSnap, ...rest] = await Promise.all([
      tx.get(receiptRef),
      tx.get(dayRef),
      tx.get(db.collection('public_profiles').doc(stableUid)),
      ...input.friendUids.flatMap((uid, index) => [
        tx.get(friendRefs[index]),
        tx.get(userRef.collection('friends').doc(uid)),
        tx.get(friendRefs[index].collection('friends').doc(stableUid)),
      ]),
    ]);
    if (receiptSnap.exists) {
      console.log(`${LOG} invite:replay ${JSON.stringify(ctx)}`);
      return { response: receiptSnap.data()?.response as Record<string, unknown>, pushes: [] as Array<Record<string, string>> };
    }
    const friendSnaps = input.friendUids.map((_, index) => rest[index * 3]);
    input.friendUids.forEach((uid, index) => {
      const [friendSnap, own, reciprocal] = [rest[index * 3], rest[index * 3 + 1], rest[index * 3 + 2]];
      if (!friendSnap.exists || !own.exists || !reciprocal.exists) {
        reject('failed-precondition', 'not_friends', { ...ctx, friend: uidTag(uid), exists: friendSnap.exists, own: own.exists, reciprocal: reciprocal.exists });
      }
    });
    const lessons = parseJsonObject(daySnap.data()?.lessons);
    const usedForLesson = parseInt0(lessons[lessonSlot]);
    if (usedForLesson + input.friendUids.length > LESSON_INVITE_PER_LESSON_PER_DAY) {
      reject('resource-exhausted', 'invite_limit', { ...ctx, lessonSlot, usedForLesson });
    }

    const senderName = displayName(profileSnap.data());
    const inviteIds: Record<string, string> = {};
    const expiresAtMs: Record<string, number> = {};
    const pushes: Array<Record<string, string>> = [];
    input.friendUids.forEach((friendUid, index) => {
      const friendData = friendSnaps[index].data();
      const prefs = friendsPushPrefs(friendData);
      const tz = tzOffsetOrDefault(prefs.tz, config.nudgeDefaultTzOffsetMinutes);
      const inviteId = lessonInviteId(requestId, friendUid);
      const expires = nextLocalMidnightMs(now, tz);
      inviteIds[friendUid] = inviteId;
      expiresAtMs[friendUid] = expires;
      const extras = {
        ...(input.minutes === undefined ? {} : { minutes: input.minutes }),
        ...(input.stars === undefined ? {} : { stars: input.stars }),
      };
      tx.set(db.collection('users').doc(friendUid).collection('friend_lesson_invites').doc(inviteId), {
        schemaVersion: 1,
        fromUid: stableUid,
        toUid: friendUid,
        lessonOrdinal: input.lessonOrdinal,
        sessionOrdinal: input.sessionOrdinal,
        lessonKey: input.lessonKey,
        createdAtMs: now,
        expiresAtMs: expires,
        status: 'open',
        ...extras,
      });
      const eventId = `friend_lesson_invite_${inviteId}`;
      tx.set(userNotificationRef(db, friendUid, eventId), buildUserNotification({
        type: 'friend_nudge',
        fromUid: stableUid,
        fromName: senderName,
        text: friendsPushText(friendsPushLangOf(friendData), 'lessonInviteFeed'),
        nav: {
          kind: 'friend_event', action: 'lesson_invite', actorStableUid: stableUid, eventId, inviteId,
          lessonOrdinal: input.lessonOrdinal, sessionOrdinal: input.sessionOrdinal, lessonKey: input.lessonKey,
          expiresAtMs: expires, ...extras,
        },
      }, now));
      const quiet = isQuietHours(now, tz, config.nudgeQuietStartHour, config.nudgeQuietEndHour, config.nudgeDefaultTzOffsetMinutes);
      const token = typeof friendData?.expoPushToken === 'string' ? friendData.expoPushToken : '';
      if (prefs.enabled !== false && !quiet && token) pushes.push({ token, eventId, inviteId, lang: friendsPushLangOf(friendData) });
      else console.log(`${LOG} invite:push_skipped ${JSON.stringify({ ...ctx, friend: uidTag(friendUid), quiet, enabled: prefs.enabled !== false, token: Boolean(token) })}`);
    });
    tx.set(dayRef, { lessons: { ...lessons, [lessonSlot]: usedForLesson + input.friendUids.length }, updatedAt: now }, { merge: true });
    const response = { ok: true, inviteIds, expiresAtMs };
    tx.set(receiptRef, { response, createdAt: now, expireAt: new Date(now + RECEIPT_TTL_MS) });
    console.log(`${LOG} invite:sent ${JSON.stringify({ ...ctx, lessonSlot, usedAfter: usedForLesson + input.friendUids.length })}`);
    return { response, pushes, senderName };
  });

  for (const push of result.pushes) {
    const lang = friendsPushLangOf({ lang: push.lang });
    void sendExpoPush(push.token, friendsPushText(lang, 'lessonInviteTitle', { name: (result as { senderName?: string }).senderName ?? 'Friend' }),
      friendsPushText(lang, 'lessonInviteBody', { l: input.lessonOrdinal, s: input.sessionOrdinal }),
      { type: 'friend_nudge', eventId: push.eventId, actorStableUid: stableUid, nav: 'friends', inviteId: push.inviteId })
      .then((transport) => { if (transport !== 'sent') console.warn(`${LOG} invite:push_${transport}`); })
      .catch((error: unknown) => console.warn(`${LOG} invite:push_threw ${error instanceof Error ? error.name : typeof error}`));
  }
  return result.response;
}

export const friendsLessonInvite = onCall(CALLABLE_BASE, handleFriendsLessonInvite);

/* ------------------------------------ mark ------------------------------------ */

/**
 * Телефон друга после своего засчитанного занятия (и своего +2 через кошелёк) отмечает приглашение «выполнено».
 * dayKey — его местный день: пригласивший считает тем же днём общий ключ кошелька (раз в день на пару).
 * Отказы только целостные: нет приглашения или оно адресовано не вызывающему. Повтор — тот же ответ, без второго пуша.
 */
export async function handleFriendsLessonTogetherMark(request: CallableRequest): Promise<Record<string, unknown>> {
  if (!request.auth?.uid) reject('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, String(request.data?.stableId ?? '').trim() || undefined);
  const inviteId = String(request.data?.inviteId ?? '').trim();
  const dayKey = request.data?.dayKey;
  const ctx = { by: uidTag(stableUid), inviteId, dayKey: isLessonDayKey(dayKey) ? dayKey : null };
  console.log(`${LOG} mark:enter ${JSON.stringify(ctx)}`);
  if (!/^fli_[a-f0-9]{32}$/.test(inviteId) || !isLessonDayKey(dayKey)) reject('invalid-argument', 'invalid_mark', ctx);
  const { enabled, config } = await resolveConfig(db);
  if (!enabled) reject('failed-precondition', 'disabled', ctx);

  const now = Date.now();
  const inviteRef = db.collection('users').doc(stableUid).collection('friend_lesson_invites').doc(inviteId);

  const result = await db.runTransaction(async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    const invite = inviteSnap.data();
    if (!inviteSnap.exists || invite?.toUid !== stableUid) reject('permission-denied', 'not_invited', ctx);
    const inviterUid = String(invite?.fromUid ?? '');
    const [inviterSnap, inviterProfile, myProfile] = await Promise.all([
      tx.get(db.collection('users').doc(inviterUid)),
      tx.get(db.collection('public_profiles').doc(inviterUid)),
      tx.get(db.collection('public_profiles').doc(stableUid)),
    ]);
    const inviterName = displayName(inviterProfile.data());
    if (invite?.status === 'done') {
      console.log(`${LOG} mark:replay ${JSON.stringify({ ...ctx, storedDayKey: invite?.dayKey ?? null })}`);
      return { response: { ok: true, replay: true, coins: LESSON_TOGETHER_COINS, inviterName, dayKey: String(invite?.dayKey ?? dayKey) }, push: null };
    }
    tx.set(inviteRef, { status: 'done', doneAtMs: now, dayKey }, { merge: true });
    const eventId = `friend_lesson_together_${inviteId}`;
    if (!inviterSnap.exists) {
      // зачем: пригласивший удалил аккаунт — отметку храним, но уведомление-сироту в чужой несуществующий документ не пишем.
      console.warn(`${LOG} mark:inviter_missing ${JSON.stringify({ ...ctx, inviter: uidTag(inviterUid) })}`);
      return { response: { ok: true, replay: false, coins: LESSON_TOGETHER_COINS, inviterName, dayKey }, push: null };
    }
    tx.set(userNotificationRef(db, inviterUid, eventId), buildUserNotification({
      type: 'friend_nudge',
      fromUid: stableUid,
      fromName: displayName(myProfile.data()),
      text: friendsPushText(friendsPushLangOf(inviterSnap.data()), 'lessonDoneFeed', { n: LESSON_TOGETHER_COINS }),
      nav: {
        kind: 'friend_event', action: 'lesson_together', actorStableUid: stableUid, eventId, inviteId, dayKey,
        coins: LESSON_TOGETHER_COINS, lessonOrdinal: Number(invite?.lessonOrdinal), sessionOrdinal: Number(invite?.sessionOrdinal),
      },
    }, now));
    console.log(`${LOG} mark:stored ${JSON.stringify({ ...ctx, inviter: uidTag(inviterUid), inviterExists: inviterSnap.exists })}`);
    const inviterPrefs = friendsPushPrefs(inviterSnap.data());
    const inviterTz = tzOffsetOrDefault(inviterPrefs.tz, config.nudgeDefaultTzOffsetMinutes);
    const quiet = isQuietHours(now, inviterTz, config.nudgeQuietStartHour, config.nudgeQuietEndHour, config.nudgeDefaultTzOffsetMinutes);
    const token = typeof inviterSnap.data()?.expoPushToken === 'string' ? inviterSnap.data()!.expoPushToken as string : '';
    if (!(inviterPrefs.enabled !== false && !quiet && token)) {
      console.log(`${LOG} mark:push_skipped ${JSON.stringify({ ...ctx, quiet, enabled: inviterPrefs.enabled !== false, token: Boolean(token) })}`);
    }
    return {
      response: { ok: true, replay: false, coins: LESSON_TOGETHER_COINS, inviterName, dayKey },
      push: inviterPrefs.enabled !== false && !quiet && token ? { token, eventId, lang: friendsPushLangOf(inviterSnap.data()) } : null,
    };
  });

  if (result.push) {
    void sendExpoPush(result.push.token, friendsPushText(result.push.lang, 'lessonDoneTitle'), friendsPushText(result.push.lang, 'lessonDoneBody', { n: LESSON_TOGETHER_COINS }),
      { type: 'friend_nudge', eventId: result.push.eventId, actorStableUid: stableUid, nav: 'friends' })
      .then((transport) => { if (transport !== 'sent') console.warn(`${LOG} mark:push_${transport}`); })
      .catch((error: unknown) => console.warn(`${LOG} mark:push_threw ${error instanceof Error ? error.name : typeof error}`));
  }
  return result.response;
}

export const friendsLessonTogetherMark = onCall(CALLABLE_BASE, handleFriendsLessonTogetherMark);
