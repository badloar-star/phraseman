"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.userNotificationsCleanupCron = exports.notifyOnFriendAccepted = exports.notifyOnFriendRequestCreated = exports.USER_NOTIFICATIONS = void 0;
exports.buildUserNotification = buildUserNotification;
exports.userNotificationRef = userNotificationRef;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const REGION = 'us-central1';
/**
 * Единый центр событий пользователя: users/{stableUid}/notifications/{id}.
 * Пишут ТОЛЬКО cloud functions (admin SDK) — клиент читает, помечает read и удаляет.
 * Клиентский зеркальный слой: app/user_notifications.ts.
 */
exports.USER_NOTIFICATIONS = 'notifications';
/** Старше 30 дней — событие мертво, чистим кроном (лента не бесконечная). */
const NOTIFICATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 400;
function buildUserNotification(input, now) {
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
function userNotificationRef(db, targetStableUid, id) {
    const col = db.collection('users').doc(targetStableUid).collection(exports.USER_NOTIFICATIONS);
    return id ? col.doc(id) : col.doc();
}
/**
 * «Вам заявка в друзья». Клиент пишет request-док напрямую (без callable),
 * поэтому единственная надёжная точка — Firestore-триггер.
 */
exports.notifyOnFriendRequestCreated = (0, firestore_1.onDocumentCreated)({ region: REGION, document: 'users/{targetUid}/friend_requests/{senderUid}' }, async (event) => {
    const data = event.data?.data() || {};
    if (String(data.status || '') !== 'pending')
        return;
    const targetUid = String(event.params.targetUid || '');
    const senderUid = String(event.params.senderUid || '');
    if (!targetUid || !senderUid || targetUid === senderUid)
        return;
    const now = Date.now();
    // Детерминированный id: повторная заявка того же юзера обновляет, а не плодит дубли.
    await userNotificationRef(admin.firestore(), targetUid, `friend_request_${senderUid}`).set(buildUserNotification({
        type: 'friend_request',
        fromUid: senderUid,
        fromName: String(data.fromName || ''),
        nav: { kind: 'friends' },
    }, now));
});
/**
 * «X принял вашу заявку». При принятии заявки принимающий batch-ом создаёт
 * реверс-док users/{отправитель}/friends/{принявший} с acceptedAt — ловим его.
 */
exports.notifyOnFriendAccepted = (0, firestore_1.onDocumentCreated)({ region: REGION, document: 'users/{ownerUid}/friends/{friendUid}' }, async (event) => {
    const data = event.data?.data() || {};
    // acceptedAt стоит только на стороне отправителя заявки (см. acceptFriendRequest).
    if (!Number(data.acceptedAt || 0))
        return;
    const ownerUid = String(event.params.ownerUid || '');
    const friendUid = String(event.params.friendUid || '');
    if (!ownerUid || !friendUid || ownerUid === friendUid)
        return;
    const db = admin.firestore();
    const now = Date.now();
    await userNotificationRef(db, ownerUid, `friend_accepted_${friendUid}`).set(buildUserNotification({
        type: 'friend_accepted',
        fromUid: friendUid,
        fromName: String(data.displayName || ''),
        nav: { kind: 'friends' },
    }, now));
    // Заявка принята — событие «вам заявка» отработано, убираем его из центра.
    await userNotificationRef(db, friendUid, `friend_request_${ownerUid}`).delete().catch(() => { });
});
/** Ежедневная чистка: сносим события старше 30 дней по всем пользователям. */
exports.userNotificationsCleanupCron = (0, scheduler_1.onSchedule)({ region: REGION, schedule: 'every day 04:20', timeZone: 'UTC' }, async () => {
    const db = admin.firestore();
    const cutoff = Date.now() - NOTIFICATION_MAX_AGE_MS;
    // Ограниченное число итераций за прогон — хвост доберёт следующий день.
    for (let i = 0; i < 20; i++) {
        const snap = await db
            .collectionGroup(exports.USER_NOTIFICATIONS)
            .where('createdAt', '<', cutoff)
            .limit(CLEANUP_BATCH_SIZE)
            .get();
        if (snap.empty)
            return;
        const batch = db.batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        if (snap.size < CLEANUP_BATCH_SIZE)
            return;
    }
});
//# sourceMappingURL=user_notifications.js.map