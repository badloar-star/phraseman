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
exports.friendUnlikeActivity = exports.friendLikeActivity = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const REGION = 'us-central1';
const MAX_ID_LEN = 160;
/** Stable doc id for a profile-level (eventless) like, so daily-limit + audit + toggle agree. */
const PROFILE_LIKE_EVENT_ID = '__profile__';
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
function resolveSenderName(senderData, requestDisplayName) {
    const senderProgress = (senderData.progress && typeof senderData.progress === 'object')
        ? senderData.progress
        : {};
    return (cleanDisplayName(requestDisplayName) ||
        cleanDisplayName(senderData.displayName) ||
        cleanDisplayName(senderProgress.user_name) ||
        'Friend');
}
/**
 * Validates the call envelope (auth + ids) and that the claimed sender stable id is
 * really owned by the authed user. Returns the resolved ids; throws HttpsError otherwise.
 * `eventId` is optional: when empty the caller is a profile-level (eventless) like from a
 * user card, where any user — friend or not — may be liked.
 */
function readIds(request) {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const data = (request.data ?? {});
    const senderStableId = cleanDocId(data.senderStableId);
    const targetStableId = cleanDocId(data.targetStableId);
    const rawEventId = cleanId(data.eventId);
    const isProfileLike = rawEventId === '';
    const eventId = isProfileLike ? PROFILE_LIKE_EVENT_ID : cleanDocId(data.eventId);
    if (!senderStableId || !targetStableId || !eventId) {
        throw new https_1.HttpsError('invalid-argument', 'Valid sender, target and event ids required');
    }
    if (senderStableId === targetStableId) {
        throw new https_1.HttpsError('failed-precondition', 'Self activity likes are not allowed');
    }
    return { authUid: request.auth.uid, senderStableId, targetStableId, eventId, isProfileLike };
}
/**
 * Like a friend's activity.
 *
 * Two modes, chosen by whether `eventId` is supplied:
 *  • event-mode (eventId present) — the original feed/league-group-boost like. Requires the
 *    target's my_events/{eventId} doc to exist AND the users to be friends. Idempotent: a
 *    second call for the same event replays without incrementing. Mirrors league group boosts.
 *  • profile-mode (eventId absent) — a like placed straight on a user card. ANY user may be
 *    liked (friend or not); no activity event is required. Still capped at one like per UTC
 *    day per sender (shared with event-mode), and a same-day re-call replays idempotently.
 *
 * Both modes bump users/{target}/activity_like_stats/summary.total and write an audit doc to
 * users/{target}/activity_likes_received so the target can see who liked them.
 */
exports.friendLikeActivity = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const { authUid, senderStableId, targetStableId, eventId, isProfileLike } = readIds(request);
    const db = admin.firestore();
    const senderRef = db.collection('users').doc(senderStableId);
    const targetRef = db.collection('users').doc(targetStableId);
    const targetFriendRef = targetRef.collection('friends').doc(senderStableId);
    const eventRef = targetRef.collection('my_events').doc(eventId);
    const statsRef = targetRef.collection('activity_like_stats').doc('summary');
    const today = todayStrUtc();
    const dailyLimitRef = senderRef.collection('friend_activity_like_daily_limits').doc(today);
    const receivedRef = targetRef
        .collection('activity_likes_received')
        .doc(`${today}_${senderStableId}_${eventId}`);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    return db.runTransaction(async (tx) => {
        const [senderSnap, targetFriendSnap, eventSnap, statsSnap, dailyLimitSnap] = await Promise.all([
            tx.get(senderRef),
            tx.get(targetFriendRef),
            isProfileLike ? Promise.resolve(null) : tx.get(eventRef),
            tx.get(statsRef),
            tx.get(dailyLimitRef),
        ]);
        if (!senderSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Sender user not found');
        }
        // Event-mode requires a real activity event to attach the like to.
        if (!isProfileLike && (!eventSnap || !eventSnap.exists)) {
            throw new https_1.HttpsError('not-found', 'Activity event not found');
        }
        const senderData = senderSnap.data() ?? {};
        const linkedAuthUid = typeof senderData.firebaseAuthUid === 'string' ? senderData.firebaseAuthUid : '';
        if (linkedAuthUid !== authUid && senderStableId !== authUid) {
            throw new https_1.HttpsError('permission-denied', 'Sender does not match auth user');
        }
        const eventData = (eventSnap?.data?.() ?? {});
        if (dailyLimitSnap.exists) {
            const dailyLimitData = dailyLimitSnap.data() ?? {};
            const alreadyLikedSameTarget = cleanDocId(dailyLimitData.targetUid) === targetStableId &&
                cleanDocId(dailyLimitData.eventId) === eventId;
            if (alreadyLikedSameTarget) {
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
            throw new https_1.HttpsError('resource-exhausted', 'Daily activity like limit reached');
        }
        // Event-mode keeps the original friends-only gate. Profile-mode (card) is open to all.
        if (!isProfileLike && !targetFriendSnap.exists) {
            throw new https_1.HttpsError('failed-precondition', 'Users are not friends');
        }
        const eventLikeCount = parseCount(eventData.activityLikeCount) + 1;
        const totalLikeCount = parseCount(statsSnap.data()?.total) + 1;
        const eventType = cleanId(eventData.type);
        const leagueGroupId = cleanDocId(eventData.groupId);
        const senderName = resolveSenderName(senderData, request.data?.senderDisplayName);
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
        tx.set(dailyLimitRef, {
            date: today,
            targetUid: targetStableId,
            eventId,
            kind: isProfileLike ? 'profile' : 'event',
            createdAt: now,
            createdAtIso: nowIso,
        });
        tx.set(receivedRef, {
            date: today,
            eventId,
            kind: isProfileLike ? 'profile' : 'event',
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
/**
 * Remove today's activity like (toggle off). Only the like the sender placed today can be
 * removed, and only while it still points at this target+event — so a stale client cannot
 * decrement an unrelated counter. Decrements the target's summary total, clears the sender's
 * daily-limit doc (freeing the daily quota), and removes the audit record so the target no
 * longer sees it. Idempotent: removing a like that is already gone returns ok without writing.
 */
exports.friendUnlikeActivity = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const { authUid, senderStableId, targetStableId, eventId, isProfileLike } = readIds(request);
    const db = admin.firestore();
    const senderRef = db.collection('users').doc(senderStableId);
    const targetRef = db.collection('users').doc(targetStableId);
    const eventRef = targetRef.collection('my_events').doc(eventId);
    const statsRef = targetRef.collection('activity_like_stats').doc('summary');
    const today = todayStrUtc();
    const dailyLimitRef = senderRef.collection('friend_activity_like_daily_limits').doc(today);
    const receivedRef = targetRef
        .collection('activity_likes_received')
        .doc(`${today}_${senderStableId}_${eventId}`);
    const now = Date.now();
    return db.runTransaction(async (tx) => {
        const [senderSnap, eventSnap, statsSnap, dailyLimitSnap] = await Promise.all([
            tx.get(senderRef),
            isProfileLike ? Promise.resolve(null) : tx.get(eventRef),
            tx.get(statsRef),
            tx.get(dailyLimitRef),
        ]);
        if (!senderSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Sender user not found');
        }
        const senderData = senderSnap.data() ?? {};
        const linkedAuthUid = typeof senderData.firebaseAuthUid === 'string' ? senderData.firebaseAuthUid : '';
        if (linkedAuthUid !== authUid && senderStableId !== authUid) {
            throw new https_1.HttpsError('permission-denied', 'Sender does not match auth user');
        }
        const eventData = (eventSnap?.data?.() ?? {});
        const limitData = dailyLimitSnap.exists ? (dailyLimitSnap.data() ?? {}) : null;
        const limitMatchesThisLike = !!limitData &&
            cleanDocId(limitData.targetUid) === targetStableId &&
            cleanDocId(limitData.eventId) === eventId;
        // Nothing of ours to remove today → idempotent no-op (keeps the toggle resilient to retries).
        if (!limitMatchesThisLike) {
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
        const eventType = cleanId(eventData.type);
        const leagueGroupId = cleanDocId(eventData.groupId);
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
        tx.delete(dailyLimitRef);
        tx.delete(receivedRef);
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
            removed: true,
            date: today,
            targetUid: targetStableId,
            eventId,
            activityLikeCount: eventLikeCount,
            targetActivityLikeTotal: totalLikeCount,
        };
    });
});
//# sourceMappingURL=friend_activity_likes.js.map