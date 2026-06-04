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
exports.friendLikeActivity = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const REGION = 'us-central1';
const MAX_ID_LEN = 160;
function cleanId(value) {
    return String(value ?? '').trim();
}
function cleanDocId(value) {
    const id = cleanId(value);
    if (!id || id.length > MAX_ID_LEN || id.includes('/') || id === '.' || id === '..')
        return '';
    return id;
}
function todayStrUtc() {
    return new Date().toISOString().slice(0, 10);
}
function parseCount(value) {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
function cleanDisplayName(value) {
    return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
}
exports.friendLikeActivity = (0, https_1.onCall)({ region: REGION, enforceAppCheck: false }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const senderStableId = cleanDocId(request.data?.senderStableId);
    const targetStableId = cleanDocId(request.data?.targetStableId);
    const eventId = cleanDocId(request.data?.eventId);
    if (!senderStableId || !targetStableId || !eventId) {
        throw new https_1.HttpsError('invalid-argument', 'Valid sender, target and event ids required');
    }
    if (senderStableId === targetStableId) {
        throw new https_1.HttpsError('failed-precondition', 'Self activity likes are not allowed');
    }
    const db = admin.firestore();
    const senderRef = db.collection('users').doc(senderStableId);
    const targetRef = db.collection('users').doc(targetStableId);
    const eventRef = targetRef.collection('my_events').doc(eventId);
    const statsRef = targetRef.collection('activity_like_stats').doc('summary');
    const today = todayStrUtc();
    const dailyLimitRef = senderRef.collection('friend_activity_like_daily_limits').doc(today);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    return db.runTransaction(async (tx) => {
        const [senderSnap, eventSnap, statsSnap, dailyLimitSnap] = await Promise.all([
            tx.get(senderRef),
            tx.get(eventRef),
            tx.get(statsRef),
            tx.get(dailyLimitRef),
        ]);
        if (!senderSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Sender user not found');
        }
        if (!eventSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Activity event not found');
        }
        if (dailyLimitSnap.exists) {
            throw new https_1.HttpsError('resource-exhausted', 'Daily activity like limit reached');
        }
        const senderData = senderSnap.data() ?? {};
        const linkedAuthUid = typeof senderData.firebaseAuthUid === 'string' ? senderData.firebaseAuthUid : '';
        if (linkedAuthUid !== request.auth.uid && senderStableId !== request.auth.uid) {
            throw new https_1.HttpsError('permission-denied', 'Sender does not match auth user');
        }
        const eventData = eventSnap.data() ?? {};
        const eventLikeCount = parseCount(eventData.activityLikeCount) + 1;
        const totalLikeCount = parseCount(statsSnap.data()?.total) + 1;
        const eventType = cleanId(eventData.type);
        const leagueGroupId = cleanDocId(eventData.groupId);
        const senderProgress = (senderData.progress && typeof senderData.progress === 'object')
            ? senderData.progress
            : {};
        const senderName = cleanDisplayName(request.data?.senderDisplayName) ||
            cleanDisplayName(senderData.displayName) ||
            cleanDisplayName(senderProgress.user_name) ||
            'Friend';
        tx.set(eventRef, {
            uid: targetStableId,
            activityLikeCount: eventLikeCount,
            activityLikedAt: now,
            lastActivityLikeFromUid: senderStableId,
            lastActivityLikeFromName: senderName,
        }, { merge: true });
        tx.set(statsRef, {
            total: totalLikeCount,
            updatedAt: now,
            lastFromUid: senderStableId,
            lastFromName: senderName,
            lastEventId: eventId,
        }, { merge: true });
        tx.set(dailyLimitRef, {
            date: today,
            targetUid: targetStableId,
            eventId,
            createdAt: now,
            createdAtIso: nowIso,
        });
        tx.set(targetRef.collection('activity_likes_received').doc(`${today}_${senderStableId}_${eventId}`), {
            date: today,
            eventId,
            fromUid: senderStableId,
            fromName: senderName,
            ts: now,
            tsIso: nowIso,
        });
        if (eventType === 'league_group_boost' && leagueGroupId && eventId.startsWith('league_group_boost_')) {
            tx.set(db.collection('league_groups').doc(leagueGroupId), {
                groupBoost: {
                    likeCount: eventLikeCount,
                },
                updatedAt: now,
            }, { merge: true });
        }
        return {
            ok: true,
            date: today,
            targetUid: targetStableId,
            eventId,
            activityLikeCount: eventLikeCount,
            targetActivityLikeTotal: totalLikeCount,
        };
    });
});
//# sourceMappingURL=friend_activity_likes.js.map