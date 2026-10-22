import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { buildUserNotification, userNotificationRef } from './user_notifications';
// зачем (координатор 22.10, 10 · ПЕРЕВОДЧИК): «Дать пять» — пуш и строка ленты на языке получателя
import { friendsPushLangOf, friendsPushText } from './friends_push_copy';
import { sendExpoPush, type ExpoPushTransport } from './expo_push';
import { isQuietHours } from './friends_together_core';
import {
  FRIEND_HELLO_COOLDOWN_COLLECTION,
  friendHelloNotifyDecision,
} from './friend_hello_policy';
import { FRIEND_BLOCKED_COLLECTION } from './friend_block';

const REGION = 'us-central1';
const MAX_ID_LEN = 160;
/**
 * Stable event id for a profile-level (eventless) like.
 *
 * зачем именно такое имя (ИНЦИДЕНТ 2026-08-29): раньше здесь стояло
 * `__profile__`. Firestore РЕЗЕРВИРУЕТ любой id вида `__…__`, поэтому
 * `my_events/.doc('__profile__')` всегда отвечал `INVALID_ARGUMENT: Resource id
 * is invalid because it is reserved` — лайк профиля (без конкретного события)
 * не мог быть записан НИКОГДА. Значение выводится сервером из пустого
 * `eventId`, по сети не передаётся и в клиентских ключах кэша не участвует
 * (там своя константа), поэтому переименование безопасно и не требует миграции:
 * ни одного документа с прежним id физически не существует.
 *
 * Точка в имени делает коллизию с настоящим id события невозможной.
 * Сторож: tests/firestore_reserved_document_id_guard.test.ts.
 */
const PROFILE_LIKE_EVENT_ID = 'like.profile';

function cleanId(value: unknown): string {
  return String(value ?? '').trim();
}

/**
 * зачем (ИНЦИДЕНТ 2026-08-29): id вида `__x__` зарезервирован Firestore и
 * бросает INVALID_ARGUMENT прямо из `.doc()`. Раньше проверка его пропускала,
 * и бросок улетал наружу как отказ всей операции. Отсекаем здесь же, наравне
 * с `/`, `.` и `..`.
 */
export function isReservedFirestoreDocId(id: string): boolean {
  return /^__.*__$/.test(id);
}

function cleanDocId(value: unknown): string {
  const id = cleanId(value);
  if (!id || id.length > MAX_ID_LEN || id.includes('/') || id === '.' || id === '..') return '';
  if (isReservedFirestoreDocId(id)) return '';
  return id;
}

function todayStrUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function cleanDisplayName(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

function resolveSenderName(senderData: Record<string, unknown>, requestDisplayName: unknown): string {
  const senderProgress = (senderData.progress && typeof senderData.progress === 'object')
    ? senderData.progress as Record<string, unknown>
    : {};
  return (
    cleanDisplayName(requestDisplayName) ||
    cleanDisplayName(senderData.displayName) ||
    cleanDisplayName(senderProgress.user_name) ||
    'Friend'
  );
}

function resolveSenderAvatar(senderData: Record<string, unknown>): string {
  const senderProgress = (senderData.progress && typeof senderData.progress === 'object')
    ? senderData.progress as Record<string, unknown>
    : {};
  return String(senderProgress.user_avatar ?? '').trim().slice(0, 200);
}

function readFriendsPushPref(data: Record<string, unknown> | undefined): Record<string, unknown> {
  const progress = (data?.progress && typeof data.progress === 'object' && !Array.isArray(data.progress))
    ? data.progress as Record<string, unknown>
    : {};
  const raw = data?.friends_push_v1 ?? progress.friends_push_v1;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch (error) {
    console.warn('[PUSH-PREFS] activity_like friends_push_v1 unparsable', {
      code: error instanceof Error ? error.name : typeof error,
    });
    return {};
  }
}

/**
 * Почему push «даёт пять» НЕ шлём (null = шлём).
 *
 * зачем: PM-200 — лайк слал push без оглядки на выбор человека. В разделе
 * «Уведомления» за соцсобытия отвечает категория «Друзья»; клиент зеркалит её
 * (вместе с мастер-тумблером) в `friends_push_v1 = { enabled, tz }` — ровно это
 * поле уже уважает «Позвать» (friend_nudge). Берём то же правило и те же тихие
 * часы 22–09 по поясу из friends_push_v1.tz. Сам лайк и запись в колокольчике
 * остаются — глушим только push. Документ получателя уже прочитан в транзакции,
 * лишних чтений нет.
 */
export function activityLikePushBlockReason(
  targetData: Record<string, unknown> | undefined,
  nowMs: number,
  isFriend = true,
): 'friends_opt_out' | 'quiet_hours' | 'not_friend' | null {
  // зачем (Q42): «Привет» от НЕ-друга засчитывается, но push не шлём — незнакомец не будит человека.
  if (!isFriend) return 'not_friend';
  const pref = readFriendsPushPref(targetData);
  if (pref.enabled === false) return 'friends_opt_out';
  const tz = typeof pref.tz === 'number' && Number.isFinite(pref.tz) ? pref.tz : null;
  if (isQuietHours(nowMs, tz)) return 'quiet_hours';
  return null;
}

/** Persistent state belongs to the sender, so target + event are unique in that subcollection. */
function activityLikeRecordId(targetStableId: string, eventId: string): string {
  const digest = createHash('sha256')
    .update(`activity-like-v2\0${targetStableId}\0${eventId}`, 'utf8')
    .digest('hex')
    .slice(0, 48);
  return `al_${digest}`;
}

/**
 * Receiver-side history is shared by every sender. Include both actors so two people liking
 * the same post cannot overwrite each other's audit row or notification.
 */
function activityLikeReceiptId(senderStableId: string, targetStableId: string, eventId: string): string {
  const digest = createHash('sha256')
    .update(`activity-like-received-v2\0${senderStableId}\0${targetStableId}\0${eventId}`, 'utf8')
    .digest('hex')
    .slice(0, 48);
  return `alr_${digest}`;
}

function likeNotificationId(receiptId: string): string {
  return `like_${receiptId}`;
}

/**
 * Validates the call envelope (auth + ids) and that the claimed sender stable id is
 * really owned by the authed user. Returns the resolved ids; throws HttpsError otherwise.
 * `eventId` is optional: when empty the caller is a profile-level (eventless) like from a
 * user card, where any user — friend or not — may be liked.
 */
function readIds(request: { auth?: { uid?: string } | null; data?: unknown }): {
  authUid: string;
  senderStableId: string;
  targetStableId: string;
  eventId: string;
  isProfileLike: boolean;
} {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const data = (request.data ?? {}) as Record<string, unknown>;
  const senderStableId = cleanDocId(data.senderStableId);
  const targetStableId = cleanDocId(data.targetStableId);
  const rawEventId = cleanId(data.eventId);
  const isProfileLike = rawEventId === '';
  const eventId = isProfileLike ? PROFILE_LIKE_EVENT_ID : cleanDocId(data.eventId);

  if (!senderStableId || !targetStableId || !eventId) {
    throw new HttpsError('invalid-argument', 'Valid sender, target and event ids required');
  }
  if (senderStableId === targetStableId) {
    throw new HttpsError('failed-precondition', 'Self activity likes are not allowed');
  }
  return { authUid: request.auth.uid, senderStableId, targetStableId, eventId, isProfileLike };
}

/**
 * Like a friend's activity.
 *
 * Two modes, chosen by whether `eventId` is supplied:
 *  • event-mode (eventId present) — one persistent like per sender + target event. Requires
 *    the target's my_events/{eventId} doc to exist AND the users to be friends.
 *  • profile-mode (eventId absent) — one persistent like per sender + user card. ANY user may
 *    be liked (friend or not); no activity event is required.
 *
 * There is deliberately no global daily quota. Replaying the same unique like is idempotent,
 * while liking another post or another user card is independent.
 */
export const friendLikeActivity = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { authUid, senderStableId, targetStableId, eventId, isProfileLike } = readIds(request);

  const db = admin.firestore();
  const senderRef = db.collection('users').doc(senderStableId);
  const targetRef = db.collection('users').doc(targetStableId);
  const targetFriendRef = targetRef.collection('friends').doc(senderStableId);
  const eventRef = targetRef.collection('my_events').doc(eventId);
  const statsRef = targetRef.collection('activity_like_stats').doc('summary');
  const today = todayStrUtc();
  const recordId = activityLikeRecordId(targetStableId, eventId);
  const receiptId = activityLikeReceiptId(senderStableId, targetStableId, eventId);
  const sentLikeRef = senderRef.collection('friend_activity_likes_sent').doc(recordId);
  // Legacy one-per-day documents are queried across every date only to migrate an
  // already placed like. This prevents a pre-cutover like from being counted again.
  const legacyLikeQuery = senderRef.collection('friend_activity_like_daily_limits')
    .where('targetUid', '==', targetStableId)
    .where('eventId', '==', eventId)
    .limit(1);
  const receivedRef = targetRef
    .collection('activity_likes_received')
    .doc(receiptId);
  // PM-164: окно тишины «Привет» хранится у отправителя — по документу на получателя.
  const helloCooldownRef = senderRef.collection(FRIEND_HELLO_COOLDOWN_COLLECTION).doc(targetStableId);
  // Q41: получатель мог заблокировать отправителя — одно чтение в той же пачке.
  const blockedRef = targetRef.collection(FRIEND_BLOCKED_COLLECTION).doc(senderStableId);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const result = await db.runTransaction(async (tx) => {
    const [senderSnap, targetSnap, targetFriendSnap, eventSnap, statsSnap, sentLikeSnap, legacyLikeSnap,
      receivedSnap, helloCooldownSnap, blockedSnap] = await Promise.all([
      tx.get(senderRef),
      tx.get(targetRef),
      tx.get(targetFriendRef),
      isProfileLike ? Promise.resolve(null) : tx.get(eventRef),
      tx.get(statsRef),
      tx.get(sentLikeRef),
      tx.get(legacyLikeQuery),
      tx.get(receivedRef),
      tx.get(helloCooldownRef),
      tx.get(blockedRef),
    ]);

    if (!senderSnap.exists) {
      throw new HttpsError('not-found', 'Sender user not found');
    }
    // Event-mode requires a real activity event to attach the like to.
    if (!isProfileLike && (!eventSnap || !eventSnap.exists)) {
      throw new HttpsError('not-found', 'Activity event not found');
    }
    const senderData = senderSnap.data() ?? {};
    const linkedAuthUid = typeof senderData.firebaseAuthUid === 'string' ? senderData.firebaseAuthUid : '';
    if (linkedAuthUid !== authUid && senderStableId !== authUid) {
      throw new HttpsError('permission-denied', 'Sender does not match auth user');
    }
    const eventData = (eventSnap?.data?.() ?? {}) as Record<string, unknown>;
    if (sentLikeSnap.exists) {
      return {
        ok: true,
        date: today,
        targetUid: targetStableId,
        eventId,
        activityLikeCount: parseCount(eventData.activityLikeCount),
        targetActivityLikeTotal: parseCount(statsSnap.data()?.total),
        idempotentReplay: true,
      };
    }
    const legacyLikeDoc = legacyLikeSnap.docs[0];
    const dailyLimitData = legacyLikeDoc?.data() ?? null;
    const alreadyLikedSameEvent =
      !!dailyLimitData &&
      cleanDocId(dailyLimitData.targetUid) === targetStableId &&
      cleanDocId(dailyLimitData.eventId) === eventId;
    if (alreadyLikedSameEvent) {
      const legacyCreatedAt = Number(dailyLimitData.createdAt);
      tx.set(sentLikeRef, {
        targetUid: targetStableId,
        eventId,
        kind: isProfileLike ? 'profile' : 'event',
        createdAt: Number.isFinite(legacyCreatedAt) ? legacyCreatedAt : now,
        createdAtIso: String(dailyLimitData.createdAtIso || nowIso),
        legacyDate: legacyLikeDoc.id,
        migratedAt: now,
      });
      tx.delete(legacyLikeDoc.ref);
      return {
        ok: true,
        date: today,
        targetUid: targetStableId,
        eventId,
        activityLikeCount: parseCount(eventData.activityLikeCount),
        targetActivityLikeTotal: parseCount(statsSnap.data()?.total),
        idempotentReplay: true,
        migratedLegacy: true,
      };
    }
    // Event-mode keeps the original friends-only gate. Profile-mode (card) is open to all.
    if (!isProfileLike && !targetFriendSnap.exists) {
      throw new HttpsError('failed-precondition', 'Users are not friends');
    }

    const eventLikeCount = parseCount(eventData.activityLikeCount) + 1;
    // зачем (Q41): получатель заблокировал отправителя — тихо не доставляем: ни счётчиков, ни строки,
    // ни push, ни записи у отправителя. Ответ такой же по форме, как при успехе, чтобы не раскрывать блокировку.
    if (blockedSnap.exists) {
      console.log('[FRIEND-BLOCK] hello dropped silently', { kind: isProfileLike ? 'profile' : 'event' });
      return {
        ok: true,
        date: today,
        targetUid: targetStableId,
        eventId,
        activityLikeCount: eventLikeCount,
        targetActivityLikeTotal: parseCount(statsSnap.data()?.total) + 1,
        _pushToken: '',
        _pushBlockReason: 'blocked',
        _senderName: '',
        _notificationId: '',
      };
    }
    const totalLikeCount = parseCount(statsSnap.data()?.total) + 1;
    const senderName = resolveSenderName(senderData, (request.data as Record<string, unknown>)?.senderDisplayName);
    const notificationId = likeNotificationId(receiptId);
    // зачем (PM-164): получатель видит событие один раз, а частые «Привет» от одного
    // человека в окне тишины засчитываются без строки и без push (friend_hello_policy.ts).
    const lastNotifiedRaw = Number(helloCooldownSnap.data()?.lastNotifiedAt);
    const delivery = friendHelloNotifyDecision({
      receiptExists: receivedSnap.exists,
      lastNotifiedAtMs: helloCooldownSnap.exists && Number.isFinite(lastNotifiedRaw) ? lastNotifiedRaw : null,
      nowMs: now,
    });
    console.log('[FRIEND-HELLO] delivery', {
      kind: isProfileLike ? 'profile' : 'event',
      reason: delivery.reason,
      notify: delivery.notify,
      receiptExists: receivedSnap.exists,
      lastNotifiedAgoMs: Number.isFinite(lastNotifiedRaw) ? now - lastNotifiedRaw : null,
    });

    if (!isProfileLike) {
      tx.set(eventRef, {
        uid: targetStableId,
        activityLikeCount: eventLikeCount,
        activityLikedAt: now,
        lastActivityLikeFromUid: senderStableId,
        lastActivityLikeFromName: senderName,
      }, { merge: true });
    }

    tx.set(statsRef, {
      total: totalLikeCount,
      updatedAt: now,
      lastFromUid: senderStableId,
      lastFromName: senderName,
      lastEventId: eventId,
    }, { merge: true });

    tx.set(sentLikeRef, {
      date: today,
      targetUid: targetStableId,
      eventId,
      kind: isProfileLike ? 'profile' : 'event',
      createdAt: now,
      createdAtIso: nowIso,
    });

    if (delivery.writeReceipt) {
      tx.set(receivedRef, {
        date: today,
        eventId,
        kind: isProfileLike ? 'profile' : 'event',
        fromUid: senderStableId,
        fromName: senderName,
        ts: now,
        tsIso: nowIso,
      });
    }

    if (!delivery.notify) {
      return {
        ok: true,
        date: today,
        targetUid: targetStableId,
        eventId,
        activityLikeCount: eventLikeCount,
        targetActivityLikeTotal: totalLikeCount,
        _pushToken: '',
        _pushBlockReason: delivery.reason,
        _senderName: senderName,
        _notificationId: '',
      };
    }

    tx.set(helloCooldownRef, { targetUid: targetStableId, lastNotifiedAt: now, lastEventId: eventId }, { merge: true });

    // Единый центр событий: «X поставил вам лайк» (раньше жило только в ленте друзей).
    tx.set(
      userNotificationRef(db, targetStableId, notificationId),
      buildUserNotification({
        type: 'activity_like',
        fromUid: senderStableId,
        fromName: senderName,
        fromAvatar: resolveSenderAvatar(senderData),
        text: friendsPushText(friendsPushLangOf(targetSnap.data()), 'highFiveFeed'),
        nav: {
          kind: 'friend_event',
          actorStableUid: senderStableId,
          eventId: notificationId,
          action: 'high_five',
        },
      }, now),
    );


    return {
      ok: true,
      date: today,
      targetUid: targetStableId,
      eventId,
      activityLikeCount: eventLikeCount,
      targetActivityLikeTotal: totalLikeCount,
      _pushToken: typeof targetSnap.data()?.expoPushToken === 'string'
        ? targetSnap.data()!.expoPushToken as string
        : '',
      _pushBlockReason: activityLikePushBlockReason(targetSnap.data(), now, targetFriendSnap.exists),
      _senderName: senderName,
      _notificationId: notificationId,
      _targetLang: friendsPushLangOf(targetSnap.data()),
    };
  });

  const pushToken = (result as { _pushToken?: string })._pushToken ?? '';
  const senderName = (result as { _senderName?: string })._senderName ?? 'Friend';
  const notificationId = (result as { _notificationId?: string })._notificationId ?? '';
  const pushBlockReason = (result as { _pushBlockReason?: string | null })._pushBlockReason ?? null;
  if (!notificationId) {
    // PM-164: событие уже доставлялось или окно тишины — строки и push нет, причина выше в [FRIEND-HELLO].
    console.log('[FRIEND-HELLO] notify skipped', { reason: pushBlockReason });
  } else if (pushToken && notificationId && pushBlockReason) {
    console.log('[PUSH-PREFS] activity_like push skipped', { type: 'activity_like', reason: pushBlockReason });
  } else if (pushToken && notificationId) {
    const targetLang = friendsPushLangOf({ lang: (result as { _targetLang?: string })._targetLang });
    void sendExpoPush(
      pushToken,
      friendsPushText(targetLang, 'highFiveTitle', { name: senderName }),
      friendsPushText(targetLang, 'highFiveBody'),
      {
        type: 'activity_like',
        eventId: notificationId,
        actorStableUid: senderStableId,
        nav: 'friends',
      },
    ).then((transport: ExpoPushTransport) => {
      if (transport !== 'sent' && transport !== 'skipped') {
        console.warn('[PUSH-PREFS] activity_like push failed', { type: 'activity_like', code: transport });
      }
    }).catch((error: unknown) => {
      // зачем: PM-200 — немой catch прятал сбой отправки; код без PII.
      console.warn('[PUSH-PREFS] activity_like push threw', {
        type: 'activity_like',
        code: error instanceof Error ? error.name : typeof error,
      });
    });
  }

  const { _pushToken, _senderName, _notificationId, _pushBlockReason, _targetLang, ...publicResult } = result as Record<string, unknown>;
  return publicResult;
});

/**
 * Remove the sender's persistent like for this exact target + event/profile. A stale client
 * cannot decrement an unrelated counter because the sent record is deterministic and its
 * payload must match. Idempotent: removing an already absent like is a no-op.
 */
export const friendUnlikeActivity = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { authUid, senderStableId, targetStableId, eventId, isProfileLike } = readIds(request);

  const db = admin.firestore();
  const senderRef = db.collection('users').doc(senderStableId);
  const targetRef = db.collection('users').doc(targetStableId);
  const eventRef = targetRef.collection('my_events').doc(eventId);
  const statsRef = targetRef.collection('activity_like_stats').doc('summary');
  const today = todayStrUtc();
  const recordId = activityLikeRecordId(targetStableId, eventId);
  const sentLikeRef = senderRef.collection('friend_activity_likes_sent').doc(recordId);
  const legacyLikeQuery = senderRef.collection('friend_activity_like_daily_limits')
    .where('targetUid', '==', targetStableId)
    .where('eventId', '==', eventId)
    .limit(1);
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const [senderSnap, eventSnap, statsSnap, sentLikeSnap, legacyLikeSnap] = await Promise.all([
      tx.get(senderRef),
      isProfileLike ? Promise.resolve(null) : tx.get(eventRef),
      tx.get(statsRef),
      tx.get(sentLikeRef),
      tx.get(legacyLikeQuery),
    ]);

    if (!senderSnap.exists) {
      throw new HttpsError('not-found', 'Sender user not found');
    }
    const senderData = senderSnap.data() ?? {};
    const linkedAuthUid = typeof senderData.firebaseAuthUid === 'string' ? senderData.firebaseAuthUid : '';
    if (linkedAuthUid !== authUid && senderStableId !== authUid) {
      throw new HttpsError('permission-denied', 'Sender does not match auth user');
    }

    const eventData = (eventSnap?.data?.() ?? {}) as Record<string, unknown>;
    const sentLikeData = sentLikeSnap.exists ? (sentLikeSnap.data() ?? {}) : null;
    const sentLikeMatches =
      !!sentLikeData &&
      cleanDocId(sentLikeData.targetUid) === targetStableId &&
      cleanDocId(sentLikeData.eventId) === eventId;
    const legacyLikeDoc = legacyLikeSnap.docs[0];
    const limitData = legacyLikeDoc?.data() ?? null;
    const limitMatchesThisLike =
      !!limitData &&
      cleanDocId(limitData.targetUid) === targetStableId &&
      cleanDocId(limitData.eventId) === eventId;

    // Legacy daily state remains removable during the rolling migration.
    if (!sentLikeMatches && !limitMatchesThisLike) {
      return {
        ok: true,
        removed: false,
        date: today,
        targetUid: targetStableId,
        eventId,
        activityLikeCount: parseCount(eventData.activityLikeCount),
        targetActivityLikeTotal: parseCount(statsSnap.data()?.total),
      };
    }

    const eventLikeCount = Math.max(0, parseCount(eventData.activityLikeCount) - 1);
    const totalLikeCount = Math.max(0, parseCount(statsSnap.data()?.total) - 1);

    if (!isProfileLike && eventSnap?.exists) {
      tx.set(eventRef, {
        uid: targetStableId,
        activityLikeCount: eventLikeCount,
        activityLikeRemovedAt: now,
      }, { merge: true });
    }

    tx.set(statsRef, {
      total: totalLikeCount,
      updatedAt: now,
    }, { merge: true });

    if (sentLikeMatches) tx.delete(sentLikeRef);
    if (limitMatchesThisLike) tx.delete(legacyLikeDoc.ref);
    // A delivered high-five is historical recipient state. Turning off the sender-side
    // toggle adjusts counters but must not erase the receiver event or bell entry.


    return {
      ok: true,
      removed: true,
      date: today,
      targetUid: targetStableId,
      eventId,
      activityLikeCount: eventLikeCount,
      targetActivityLikeTotal: totalLikeCount,
    };
  });
});
