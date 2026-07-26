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
exports.syncFriendActivityMirrorCron = void 0;
exports.syncFriendActivityMirrorBatch = syncFriendActivityMirrorBatch;
/**
 * Дублирует «ленту для друзей» при любых правках users/{uid}.progress в Firestore:
 * админка, синк приложения, скрипты — всё даёт те же события, что клиент пишет в my_events.
 *
 * Формула уровня должна совпадать с constants/theme.ts (getLevelFromXP).
 */
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v2"));
const xp_levels_1 = require("./xp_levels");
const REGION = 'us-central1';
const MAX_EVENTS_PER_FRIEND = 15;
const USERS_PAGE_SIZE = 500;
const MIRROR_FIELD = 'friendActivityMirror';
function parseProgressInt(v) {
    if (typeof v === 'number' && Number.isFinite(v))
        return Math.max(0, Math.trunc(v));
    const n = parseInt(String(v ?? '0'), 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
}
async function pruneOldEvents(db, userId) {
    const col = db.collection('users').doc(userId).collection('my_events');
    const snap = await col.orderBy('ts', 'desc').get();
    const docs = snap.docs;
    if (docs.length <= MAX_EVENTS_PER_FRIEND)
        return;
    const tail = docs.slice(MAX_EVENTS_PER_FRIEND);
    await Promise.all(tail.map((d) => d.ref.delete()));
}
function friendActivityDocId(type, payload) {
    if (type === 'level_up') {
        const lv = Number(payload.level);
        if (Number.isFinite(lv))
            return `level_up_${Math.trunc(lv)}`;
    }
    if (type === 'streak_milestone') {
        const d = Number(payload.days);
        if (Number.isFinite(d))
            return `streak_milestone_${Math.trunc(d)}`;
    }
    const ts = Date.now();
    return `${type}_${ts}_${Math.random().toString(36).slice(2, 8)}`;
}
async function appendFriendEvent(db, userId, type, payload) {
    const ts = Date.now();
    const eventId = friendActivityDocId(type, payload);
    await db
        .collection('users')
        .doc(userId)
        .collection('my_events')
        .doc(eventId)
        .set({ type, payload, ts, uid: userId });
    await pruneOldEvents(db, userId);
}
/** Порог для streak_milestone — как «заметная серия», без спама на 1–2 дня. */
const STREAK_FEED_MIN_DAYS = 7;
function readMirrorState(data) {
    const raw = data[MIRROR_FIELD];
    if (!raw || typeof raw !== 'object')
        return null;
    const rec = raw;
    return {
        xp: parseProgressInt(rec.xp),
        streak: parseProgressInt(rec.streak),
    };
}
function queueMirrorStateUpdate(batch, ref, xp, streak, now) {
    batch.set(ref, {
        [MIRROR_FIELD]: {
            xp,
            streak,
            checkedAt: now,
        },
    }, { merge: true });
}
async function syncFriendActivityMirrorBatch() {
    const db = admin.firestore();
    const now = Date.now();
    let scanned = 0;
    let updated = 0;
    let events = 0;
    let lastDoc = null;
    let batch = db.batch();
    let pendingWrites = 0;
    while (true) {
        let query = db.collection('users').orderBy('__name__').limit(USERS_PAGE_SIZE);
        if (lastDoc)
            query = query.startAfter(lastDoc);
        const snap = await query.get();
        if (snap.empty)
            break;
        for (const doc of snap.docs) {
            scanned += 1;
            const data = doc.data() || {};
            const progress = data.progress;
            const newXp = parseProgressInt(progress?.user_total_xp);
            const newStreak = parseProgressInt(progress?.streak_count);
            const state = readMirrorState(data);
            if (!state) {
                queueMirrorStateUpdate(batch, doc.ref, newXp, newStreak, now);
                pendingWrites += 1;
            }
            else if (state.xp !== newXp || state.streak !== newStreak) {
                if (newXp !== state.xp) {
                    const oldLvl = (0, xp_levels_1.getLevelFromXP)(state.xp);
                    const newLvl = (0, xp_levels_1.getLevelFromXP)(newXp);
                    if (newLvl > oldLvl) {
                        await appendFriendEvent(db, doc.id, 'level_up', { level: newLvl });
                        events += 1;
                    }
                }
                if (newStreak > state.streak && newStreak >= STREAK_FEED_MIN_DAYS) {
                    await appendFriendEvent(db, doc.id, 'streak_milestone', { days: newStreak });
                    events += 1;
                }
                queueMirrorStateUpdate(batch, doc.ref, newXp, newStreak, now);
                pendingWrites += 1;
                updated += 1;
            }
            if (pendingWrites >= 400) {
                await batch.commit();
                batch = db.batch();
                pendingWrites = 0;
            }
        }
        lastDoc = snap.docs[snap.docs.length - 1] ?? null;
        if (snap.size < USERS_PAGE_SIZE)
            break;
    }
    if (pendingWrites > 0)
        await batch.commit();
    console.log(JSON.stringify({ event: 'friend_activity_mirror_sync_done', scanned, updated, events }));
    return { scanned, updated, events };
}
// memory: 1GiB + timeout 540s — полный постраничный скан users/ каждые 12ч с появлением
// событий ленты друзей. На дефолтных 256MiB падал OOM (лента активности переставала
// обновляться). На росте базы дополнительно нужен стриминг, но память — первый барьер.
exports.syncFriendActivityMirrorCron = functions.scheduler.onSchedule({ schedule: 'every 12 hours', timeZone: 'UTC', region: REGION, memory: '1GiB', timeoutSeconds: 540 }, async () => {
    await syncFriendActivityMirrorBatch();
});
//# sourceMappingURL=friend_activity_mirror.js.map