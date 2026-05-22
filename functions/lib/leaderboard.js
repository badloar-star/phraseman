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
exports.nameReleaseMine = exports.nameReserve = exports.nameCheckAvailability = exports.leaderboardUpdateDailyAnalytics = exports.leaderboardUpdatePremium = exports.leaderboardPushMyScore = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const MAX_POINTS = 1000000000;
const MAX_WEEK_POINTS = 50000000;
const MAX_SINGLE_SCORE_JUMP = 50000;
const MAX_INITIAL_POINTS = 250000;
const MAX_DAILY7_XP = 500000;
const MAX_DAILY7_TIME_MS = 7 * 24 * 60 * 60 * 1000;
const NAME_INDEX = 'name_index';
const MAX_PROFILE_CARD_LEVEL = 5;
function sanitizeString(value, max) {
    return String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max);
}
function readInt(value, fallback = 0) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) ? n : fallback;
}
function normalizeName(value) {
    const name = sanitizeString(value, 32);
    return { name, nameLower: name.toLowerCase() };
}
function fallbackNameForUid(stableUid) {
    const suffix = stableUid.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'user';
    return normalizeName(`Player_${suffix}`);
}
function assertValidName(name) {
    if (name.length < 2 || name.length > 32) {
        throw new https_1.HttpsError('invalid-argument', 'name_length');
    }
    if (/[\r\n\t]/.test(name) || /https?:\/\//i.test(name) || /www\./i.test(name) || /[@#]/.test(name)) {
        throw new https_1.HttpsError('invalid-argument', 'name_invalid');
    }
}
function getWeekKey(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
async function resolveStableUid(db, authUid, requestedStableId) {
    return (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, requestedStableId, { requireKnownIdentity: true });
}
async function assertNotBanned(db, stableUid) {
    const [userSnap, bannedSnap] = await Promise.all([
        db.collection('users').doc(stableUid).get().catch(() => null),
        db.collection('banned_users').doc(stableUid).get().catch(() => null),
    ]);
    if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
        throw new https_1.HttpsError('permission-denied', 'user_banned');
    }
}
function leaderboardDocIsVisible(doc) {
    return doc.exists && doc.data()?.identityHidden !== true;
}
async function nameOwnerIsActive(db, uid) {
    const cleanUid = sanitizeString(uid, 180);
    if (!cleanUid)
        return false;
    const [lbSnap, userSnap] = await Promise.all([
        db.collection('leaderboard').doc(cleanUid).get().catch(() => null),
        db.collection('users').doc(cleanUid).get().catch(() => null),
    ]);
    if (lbSnap?.exists && lbSnap.data()?.identityHidden !== true)
        return true;
    if (userSnap?.exists && userSnap.data()?.identityHidden !== true)
        return true;
    return false;
}
async function txNameOwnerIsActive(tx, db, uid) {
    const cleanUid = sanitizeString(uid, 180);
    if (!cleanUid)
        return false;
    const [lbSnap, userSnap] = await Promise.all([
        tx.get(db.collection('leaderboard').doc(cleanUid)),
        tx.get(db.collection('users').doc(cleanUid)),
    ]);
    if (lbSnap.exists && lbSnap.data()?.identityHidden !== true)
        return true;
    if (userSnap.exists && userSnap.data()?.identityHidden !== true)
        return true;
    return false;
}
exports.leaderboardPushMyScore = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUid(db, authUid, request.data?.stableId);
    await assertNotBanned(db, stableUid);
    const requestedName = normalizeName(request.data?.name);
    if (!requestedName.name)
        throw new https_1.HttpsError('invalid-argument', 'name_required');
    const requestedPoints = Math.max(0, Math.min(MAX_POINTS, readInt(request.data?.points, 0)));
    const requestedWeekPoints = Math.max(0, Math.min(MAX_WEEK_POINTS, readInt(request.data?.weekPoints, 0)));
    const weekKey = getWeekKey();
    const ref = db.collection('leaderboard').doc(stableUid);
    const now = Date.now();
    const sameName = await db.collection('leaderboard').where('nameLower', '==', requestedName.nameLower).limit(8).get();
    const requestedNameTakenByOther = sameName.docs.some((d) => d.id !== stableUid && leaderboardDocIsVisible(d));
    let written = {};
    await db.runTransaction(async (tx) => {
        const nameRef = db.collection(NAME_INDEX).doc(requestedName.nameLower);
        const [snap, nameSnap] = await Promise.all([
            tx.get(ref),
            tx.get(nameRef),
        ]);
        const cur = snap.data() || {};
        let safeName = requestedName;
        const indexOwner = sanitizeString(nameSnap.data()?.uid, 180);
        const requestedNameTaken = requestedNameTakenByOther ||
            (nameSnap.exists && indexOwner !== stableUid && await txNameOwnerIsActive(tx, db, indexOwner));
        if (requestedNameTaken) {
            const currentName = normalizeName(cur.name);
            safeName = currentName.name && currentName.nameLower !== requestedName.nameLower
                ? currentName
                : fallbackNameForUid(stableUid);
        }
        const safeNameRef = safeName.nameLower === requestedName.nameLower
            ? nameRef
            : db.collection(NAME_INDEX).doc(safeName.nameLower);
        if (safeName.nameLower !== requestedName.nameLower) {
            const safeNameSnap = await tx.get(safeNameRef);
            const safeIndexOwner = sanitizeString(safeNameSnap.data()?.uid, 180);
            if (safeNameSnap.exists && safeIndexOwner !== stableUid && await txNameOwnerIsActive(tx, db, safeIndexOwner)) {
                safeName = fallbackNameForUid(`${stableUid}${now}`);
            }
        }
        const oldPoints = Math.max(0, readInt(cur.points, 0));
        const oldWeekPoints = cur.weekKey === weekKey ? Math.max(0, readInt(cur.weekPoints, 0)) : 0;
        const points = snap.exists
            ? Math.max(oldPoints, Math.min(requestedPoints, oldPoints + MAX_SINGLE_SCORE_JUMP))
            : Math.min(requestedPoints, MAX_INITIAL_POINTS);
        const weekPoints = Math.max(oldWeekPoints, Math.min(requestedWeekPoints, oldWeekPoints + MAX_SINGLE_SCORE_JUMP));
        written = {
            name: safeName.name,
            nameLower: safeName.nameLower,
            points,
            weekPoints,
            weekKey,
            lang: sanitizeString(request.data?.lang, 12) || 'ru',
            avatar: sanitizeString(request.data?.avatar, 64) || null,
            frame: sanitizeString(request.data?.frame, 64) || null,
            aura: sanitizeString(request.data?.aura, 64) || null,
            streak: Math.max(0, Math.min(100000, readInt(request.data?.streak, 0))),
            leagueId: Math.max(0, Math.min(50, readInt(request.data?.leagueId, 0))),
            isPremium: request.data?.isPremium === true,
            isVip: request.data?.isVip === true,
            profileCardLevel: Math.max(0, Math.min(MAX_PROFILE_CARD_LEVEL, readInt(request.data?.profileCardLevel, 0))),
            profileCardTheme: sanitizeString(request.data?.profileCardTheme, 32) || 'classic',
            profileCardMotion: sanitizeString(request.data?.profileCardMotion, 32) || 'none',
            profileCardPublicFocus: sanitizeString(request.data?.profileCardPublicFocus, 32) || 'balanced',
            firebaseAuthUid: authUid,
            updatedAt: now,
        };
        tx.set(db.collection(NAME_INDEX).doc(safeName.nameLower), {
            uid: stableUid,
            authUid,
            name: safeName.name,
            nameLower: safeName.nameLower,
            updatedAt: now,
        }, { merge: true });
        tx.set(ref, written, { merge: true });
    });
    await db.collection('arena_profiles').doc(authUid).set({
        courseTotalXp: written.points,
        courseAvatar: written.avatar,
        courseFrame: written.frame,
        courseAura: written.aura,
        courseIsPremium: written.isPremium,
        courseIsVip: written.isVip,
        courseProfileCardLevel: written.profileCardLevel,
        courseProfileCardTheme: written.profileCardTheme,
        courseProfileCardMotion: written.profileCardMotion,
        courseProfileCardPublicFocus: written.profileCardPublicFocus,
        courseDisplayAt: now,
        mirrorStableId: stableUid,
    }, { merge: true }).catch(() => { });
    return { ok: true, points: written.points, weekPoints: written.weekPoints };
});
exports.leaderboardUpdatePremium = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUid(db, authUid, request.data?.stableId);
    await assertNotBanned(db, stableUid);
    const updates = { firebaseAuthUid: authUid, updatedAt: Date.now() };
    const arenaUpdates = { courseDisplayAt: Date.now() };
    if (Object.prototype.hasOwnProperty.call(request.data ?? {}, 'isPremium')) {
        updates.isPremium = request.data?.isPremium === true;
        arenaUpdates.courseIsPremium = updates.isPremium;
    }
    if (Object.prototype.hasOwnProperty.call(request.data ?? {}, 'isVip')) {
        updates.isVip = request.data?.isVip === true;
        arenaUpdates.courseIsVip = updates.isVip;
    }
    await Promise.all([
        db.collection('leaderboard').doc(stableUid).set(updates, { merge: true }),
        db.collection('arena_profiles').doc(authUid).set(arenaUpdates, { merge: true }),
    ]);
    return { ok: true };
});
exports.leaderboardUpdateDailyAnalytics = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUid(db, authUid, request.data?.stableId);
    await assertNotBanned(db, stableUid);
    const daily7xp = Math.max(0, Math.min(MAX_DAILY7_XP, readInt(request.data?.daily7xp, 0)));
    const daily7time_ms = Math.max(0, Math.min(MAX_DAILY7_TIME_MS, readInt(request.data?.daily7time_ms, 0)));
    await db.collection('leaderboard').doc(stableUid).set({
        daily7xp,
        daily7time_ms,
        dailyAnalyticsUpdatedAt: Date.now(),
        firebaseAuthUid: authUid,
    }, { merge: true });
    return { ok: true };
});
exports.nameCheckAvailability = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const stableUid = await resolveStableUid(db, request.auth.uid, request.data?.stableId);
    const { name, nameLower } = normalizeName(request.data?.name);
    assertValidName(name);
    const idxSnap = await db.collection(NAME_INDEX).doc(nameLower).get();
    const indexOwner = sanitizeString(idxSnap.data()?.uid, 180);
    if (idxSnap.exists && indexOwner !== stableUid && await nameOwnerIsActive(db, indexOwner)) {
        return { ok: true, available: false };
    }
    const sameName = await db.collection('leaderboard').where('nameLower', '==', nameLower).limit(8).get();
    const takenByOther = sameName.docs.some((d) => d.id !== stableUid && leaderboardDocIsVisible(d));
    return { ok: true, available: !takenByOther };
});
exports.nameReserve = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUid(db, authUid, request.data?.stableId);
    await assertNotBanned(db, stableUid);
    const { name, nameLower } = normalizeName(request.data?.name);
    const oldNameLower = sanitizeString(request.data?.oldName, 32).toLowerCase();
    assertValidName(name);
    const sameName = await db.collection('leaderboard').where('nameLower', '==', nameLower).limit(8).get();
    if (sameName.docs.some((d) => d.id !== stableUid && leaderboardDocIsVisible(d))) {
        return { ok: true, status: 'taken' };
    }
    await db.runTransaction(async (tx) => {
        const nameRef = db.collection(NAME_INDEX).doc(nameLower);
        const nameSnap = await tx.get(nameRef);
        const oldRef = oldNameLower && oldNameLower !== nameLower ? db.collection(NAME_INDEX).doc(oldNameLower) : null;
        const oldSnap = oldRef ? await tx.get(oldRef) : null;
        const indexOwner = sanitizeString(nameSnap.data()?.uid, 180);
        if (nameSnap.exists && indexOwner !== stableUid && await txNameOwnerIsActive(tx, db, indexOwner)) {
            throw new https_1.HttpsError('already-exists', 'name_taken');
        }
        tx.set(nameRef, {
            uid: stableUid,
            authUid,
            name,
            nameLower,
            updatedAt: Date.now(),
        }, { merge: true });
        if (oldRef && oldSnap?.exists && oldSnap.data()?.uid === stableUid) {
            tx.delete(oldRef);
        }
        tx.set(db.collection('leaderboard').doc(stableUid), {
            name,
            nameLower,
            firebaseAuthUid: authUid,
            updatedAt: Date.now(),
        }, { merge: true });
    });
    return { ok: true, status: 'ok' };
});
exports.nameReleaseMine = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUid(db, authUid, request.data?.stableId);
    const candidates = new Set();
    const names = Array.isArray(request.data?.names) ? request.data.names : [];
    for (const n of names) {
        const { nameLower } = normalizeName(n);
        if (nameLower)
            candidates.add(nameLower);
    }
    const lbSnap = await db.collection('leaderboard').doc(stableUid).get().catch(() => null);
    const lb = lbSnap?.data() || {};
    if (typeof lb.nameLower === 'string' && lb.nameLower.trim())
        candidates.add(lb.nameLower.trim().toLowerCase());
    if (typeof lb.name === 'string' && lb.name.trim())
        candidates.add(lb.name.trim().toLowerCase());
    const byUid = await db.collection(NAME_INDEX).where('uid', '==', stableUid).limit(20).get().catch(() => null);
    byUid?.docs.forEach((doc) => candidates.add(doc.id));
    const batch = db.batch();
    let deleted = 0;
    for (const nameLower of candidates) {
        const ref = db.collection(NAME_INDEX).doc(nameLower);
        const snap = await ref.get().catch(() => null);
        if (snap?.exists && snap.data()?.uid === stableUid) {
            batch.delete(ref);
            deleted += 1;
        }
    }
    if (deleted > 0)
        await batch.commit();
    return { ok: true, deleted };
});
//# sourceMappingURL=leaderboard.js.map