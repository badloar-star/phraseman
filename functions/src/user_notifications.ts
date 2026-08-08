import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const REGION = 'us-central1';

/**
 * Единый центр событий пользователя: users/{stableUid}/notifications/{id}.
 * Пишут ТОЛЬКО cloud functions (admin SDK) — клиент читает, помечает read и удаляет.
 * Клиентский зеркальный слой: app/user_notifications.ts.
 */
export const USER_NOTIFICATIONS = 'notifications';

/** Старше 30 дней — событие мертво, чистим кроном (лента не бесконечная). */
const NOTIFICATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 400;

export type UserNotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'activity_like'
  | 'friend_gift_received'
  | 'friend_gift_thanks'
  | 'report_reply'
  // Недельный банк турниров начисляется кроном ночью — без уведомления
  // игрок не узнал бы о награде.
  | 'tournament_weekly_bank';

export interface UserNotificationInput {
  type: UserNotificationType;
  fromUid: string;
  fromName: string;
  fromAvatar?: string;
  /** Короткий текст-контекст (сниппет сообщения/ответа), уже обрезанный. */
  text?: string;
  /** Payload навигации — клиент открывает нужный экран/чат на нужном месте. */
  nav?: Record<string, unknown>;
}

export function buildUserNotification(input: UserNotificationInput, now: number): Record<string, unknown> {
  return {
    type: input.type,
    fromUid: String(input.fromUid || '').slice(0, 160),
    fromName: String(input.fromName || '').slice(0, 48),
    fromAvatar: String(input.fromAvatar || '').slice(0, 200),
    text: String(input.text || '').slice(0, 160),
    nav: input.nav || null,
    read: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function userNotificationRef(
  db: FirebaseFirestore.Firestore,
  targetStableUid: string,
  id?: string,
): FirebaseFirestore.DocumentReference {
  const col = db.collection('users').doc(targetStableUid).collection(USER_NOTIFICATIONS);
  return id ? col.doc(id) : col.doc();
}

/**
 * «Вам заявка в друзья». Клиент пишет request-док напрямую (без callable),
 * поэтому единственная надёжная точка — Firestore-триггер.
 */
export const notifyOnFriendRequestCreated = onDocumentCreated(
  { region: REGION, document: 'users/{targetUid}/friend_requests/{senderUid}' },
  async (event) => {
    const data = event.data?.data() || {};
    if (String(data.status || '') !== 'pending') return;
    const targetUid = String(event.params.targetUid || '');
    const senderUid = String(event.params.senderUid || '');
    if (!targetUid || !senderUid || targetUid === senderUid) return;
    const now = Date.now();
    // Детерминированный id: повторная заявка того же юзера обновляет, а не плодит дубли.
    await userNotificationRef(admin.firestore(), targetUid, `friend_request_${senderUid}`).set(
      buildUserNotification({
        type: 'friend_request',
        fromUid: senderUid,
        fromName: String(data.fromName || ''),
        nav: { kind: 'friends' },
      }, now),
    );
  },
);

/**
 * «X принял вашу заявку». При принятии заявки принимающий batch-ом создаёт
 * реверс-док users/{отправитель}/friends/{принявший} с acceptedAt — ловим его.
 */
export const notifyOnFriendAccepted = onDocumentCreated(
  { region: REGION, document: 'users/{ownerUid}/friends/{friendUid}' },
  async (event) => {
    const data = event.data?.data() || {};
    // acceptedAt стоит только на стороне отправителя заявки (см. acceptFriendRequest).
    if (!Number(data.acceptedAt || 0)) return;
    const ownerUid = String(event.params.ownerUid || '');
    const friendUid = String(event.params.friendUid || '');
    if (!ownerUid || !friendUid || ownerUid === friendUid) return;
    const db = admin.firestore();
    const now = Date.now();
    await userNotificationRef(db, ownerUid, `friend_accepted_${friendUid}`).set(
      buildUserNotification({
        type: 'friend_accepted',
        fromUid: friendUid,
        fromName: String(data.displayName || ''),
        nav: { kind: 'friends' },
      }, now),
    );
    // Заявка принята — событие «вам заявка» отработано, убираем его из центра.
    await userNotificationRef(db, friendUid, `friend_request_${ownerUid}`).delete().catch(() => {});
  },
);

/** Ежедневная чистка: сносим события старше 30 дней по всем пользователям. */
export const userNotificationsCleanupCron = onSchedule(
  { region: REGION, schedule: 'every day 04:20', timeZone: 'UTC' },
  async () => {
    const db = admin.firestore();
    const cutoff = Date.now() - NOTIFICATION_MAX_AGE_MS;
    // Ограниченное число итераций за прогон — хвост доберёт следующий день.
    for (let i = 0; i < 20; i++) {
      const snap = await db
        .collectionGroup(USER_NOTIFICATIONS)
        .where('createdAt', '<', cutoff)
        .limit(CLEANUP_BATCH_SIZE)
        .get();
      if (snap.empty) return;
      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      if (snap.size < CLEANUP_BATCH_SIZE) return;
    }
  },
);
