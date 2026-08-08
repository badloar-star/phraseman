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
exports.leaguePodiumReaction = exports.LEAGUE_PODIUM_REACTION_EMOJIS = void 0;
exports.emptyLeaguePodiumReactionDoc = emptyLeaguePodiumReactionDoc;
exports.applyLeaguePodiumReactionToggle = applyLeaguePodiumReactionToggle;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
/**
 * Реакции на подиуме лиги (👑 crown / 🔥 fire / 😤 grumpy).
 * Один участник группы — одна реакция на одну цель в рамках недельной группы:
 * повтор того же эмодзи снимает реакцию (toggle), другой эмодзи — переключает.
 * Счётчики лежат в league_groups/{groupId}/podium_reactions/{targetUid},
 * клиент их только читает; все записи — только через этот callable.
 */
exports.LEAGUE_PODIUM_REACTION_EMOJIS = ['crown', 'fire', 'grumpy'];
function emptyLeaguePodiumReactionDoc() {
    return { counts: { crown: 0, fire: 0, grumpy: 0 }, reactors: {} };
}
/** Чистый редьюсер toggle-реакции — покрыт юнит-тестами. */
function applyLeaguePodiumReactionToggle(doc, uid, emoji) {
    const prev = doc.reactors[uid] ?? null;
    const counts = { ...doc.counts };
    const reactors = { ...doc.reactors };
    let status;
    if (prev === emoji) {
        counts[emoji] = Math.max(0, (counts[emoji] ?? 0) - 1);
        delete reactors[uid];
        status = 'removed';
    }
    else if (prev) {
        counts[prev] = Math.max(0, (counts[prev] ?? 0) - 1);
        counts[emoji] = (counts[emoji] ?? 0) + 1;
        reactors[uid] = emoji;
        status = 'switched';
    }
    else {
        counts[emoji] = (counts[emoji] ?? 0) + 1;
        reactors[uid] = emoji;
        status = 'added';
    }
    return { next: { counts, reactors }, status };
}
function sanitizeString(value, max) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function readInt(value) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) && n > 0 ? n : 0;
}
function getWeekId(at = new Date()) {
    const date = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
async function assertCanUseLeague(db, stableUid) {
    const [userSnap, bannedSnap] = await Promise.all([
        db.collection('users').doc(stableUid).get().catch(() => null),
        db.collection('banned_users').doc(stableUid).get().catch(() => null),
    ]);
    if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
        throw new https_1.HttpsError('permission-denied', 'user_banned');
    }
}
exports.leaguePodiumReaction = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, request.auth.uid, request.data?.stableId, { requireKnownIdentity: true, repairLinks: false });
    await assertCanUseLeague(db, stableUid);
    const groupId = sanitizeString(request.data?.groupId, 64);
    const targetUid = sanitizeString(request.data?.targetUid, 64);
    const emoji = sanitizeString(request.data?.emoji, 16);
    if (!groupId || !targetUid)
        throw new https_1.HttpsError('invalid-argument', 'group_target_required');
    if (!exports.LEAGUE_PODIUM_REACTION_EMOJIS.includes(emoji))
        throw new https_1.HttpsError('invalid-argument', 'bad_emoji');
    if (targetUid === stableUid)
        throw new https_1.HttpsError('failed-precondition', 'self_reaction');
    const groupRef = db.collection('league_groups').doc(groupId);
    const groupSnap = await groupRef.get();
    const weekId = getWeekId();
    if (!groupSnap.exists || groupSnap.data()?.weekId !== weekId) {
        throw new https_1.HttpsError('failed-precondition', 'league_group_not_current');
    }
    const members = (groupSnap.data()?.members ?? {});
    if (!members[stableUid])
        throw new https_1.HttpsError('permission-denied', 'not_a_group_member');
    if (!members[targetUid])
        throw new https_1.HttpsError('failed-precondition', 'target_not_in_group');
    const docRef = groupRef.collection('podium_reactions').doc(targetUid);
    let applied = {
        next: emptyLeaguePodiumReactionDoc(),
        status: 'added',
    };
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const raw = (snap.exists ? snap.data() ?? {} : {});
        const rawCounts = (raw.counts ?? {});
        const current = {
            counts: { crown: readInt(rawCounts.crown), fire: readInt(rawCounts.fire), grumpy: readInt(rawCounts.grumpy) },
            reactors: (raw.reactors ?? {}),
        };
        applied = applyLeaguePodiumReactionToggle(current, stableUid, emoji);
        tx.set(docRef, {
            weekId,
            targetUid,
            counts: applied.next.counts,
            reactors: applied.next.reactors,
            updatedAt: Date.now(),
        }, { merge: true });
    });
    return {
        ok: true,
        status: applied.status,
        counts: applied.next.counts,
        myReaction: applied.next.reactors[stableUid] ?? null,
    };
});
//# sourceMappingURL=league_podium_reactions.js.map