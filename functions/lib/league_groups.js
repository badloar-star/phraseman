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
exports.leagueSyncMyBoost = exports.leagueUpdateMyMember = exports.leagueJoinOrUpdateGroup = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const GROUP_SIZE = 30;
const BROAD_GROUP_QUERY_LIMIT = 500;
function sanitizeString(value, max) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function readInt(value, fallback = 0) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) ? n : fallback;
}
function getWeekId() {
    const d = new Date();
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
function makeGroupDocId(weekId, leagueId, uid) {
    const safeUid = uid.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16) || 'user';
    return `${weekId}_${leagueId}_${Date.now()}_${safeUid}_${Math.random().toString(36).slice(2, 8)}`;
}
function countMembers(data) {
    const members = data?.members;
    return members && typeof members === 'object' ? Object.keys(members).length : 0;
}
function sanitizeMember(raw, stableUid) {
    const points = Math.max(0, Math.min(1000000000, readInt(raw.points, 0)));
    const totalXp = Math.max(0, Math.min(1000000000, readInt(raw.totalXp, 0)));
    const streak = Math.max(0, Math.min(100000, readInt(raw.streak, 0)));
    const multiplier = Number(raw.leagueBoostMultiplier);
    const boostExpiresAt = readInt(raw.leagueBoostExpiresAt, 0);
    const member = {
        name: sanitizeString(raw.name, 48) || 'Player',
        points,
        uid: stableUid,
        avatar: sanitizeString(raw.avatar, 64) || null,
        frame: sanitizeString(raw.frame, 64) || null,
        aura: sanitizeString(raw.aura, 64) || null,
        profileCardLevel: Math.max(0, Math.min(5, readInt(raw.profileCardLevel, 0))),
        profileCardTheme: sanitizeString(raw.profileCardTheme, 32) || 'classic',
        profileCardMotion: sanitizeString(raw.profileCardMotion, 32) || 'none',
        profileCardPublicFocus: sanitizeString(raw.profileCardPublicFocus, 32) || 'balanced',
        isPremium: raw.isPremium === true,
        streak,
        totalXp,
    };
    if (Number.isFinite(multiplier) && multiplier > 1 && boostExpiresAt > Date.now()) {
        member.leagueBoostMultiplier = Math.min(10, multiplier);
        member.leagueBoostExpiresAt = boostExpiresAt;
    }
    return member;
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
async function findGroupWithSpace(db, weekId, leagueId, stableUid) {
    try {
        const snap = await db
            .collection('league_groups')
            .where('weekId', '==', weekId)
            .where('leagueId', '==', leagueId)
            .where('memberCount', '<', GROUP_SIZE)
            .orderBy('memberCount', 'desc')
            .limit(25)
            .get();
        for (const doc of snap.docs) {
            const data = doc.data();
            if (readInt(data.leagueId) !== leagueId)
                continue;
            const n = countMembers(data);
            if (n >= GROUP_SIZE)
                continue;
            if (data.members?.[stableUid])
                return doc.id;
            return doc.id;
        }
    }
    catch {
        // Fall through to broad scan if composite index is not ready.
    }
    const broad = await db
        .collection('league_groups')
        .where('weekId', '==', weekId)
        .where('leagueId', '==', leagueId)
        .limit(BROAD_GROUP_QUERY_LIMIT)
        .get();
    const candidates = [];
    for (const doc of broad.docs) {
        const data = doc.data();
        if (readInt(data.leagueId) !== leagueId)
            continue;
        const n = countMembers(data);
        if (data.members?.[stableUid])
            return doc.id;
        if (n < GROUP_SIZE)
            candidates.push({ id: doc.id, n });
    }
    candidates.sort((a, b) => b.n - a.n);
    return candidates[0]?.id ?? null;
}
async function findExistingGroupForUser(db, weekId, leagueId, stableUid) {
    const snap = await db
        .collection('league_groups')
        .where('weekId', '==', weekId)
        .where('leagueId', '==', leagueId)
        .limit(BROAD_GROUP_QUERY_LIMIT)
        .get();
    let best = null;
    for (const doc of snap.docs) {
        const data = doc.data();
        if (readInt(data.leagueId) !== leagueId || !data.members?.[stableUid])
            continue;
        const n = countMembers(data);
        if (!best || n > best.n)
            best = { id: doc.id, n };
    }
    return best?.id ?? null;
}
exports.leagueJoinOrUpdateGroup = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, request.data?.stableId);
    await assertCanUseLeague(db, stableUid);
    const weekId = sanitizeString(request.data?.weekId, 16) || getWeekId();
    if (weekId !== getWeekId())
        throw new https_1.HttpsError('failed-precondition', 'stale_week');
    const leagueId = Math.max(0, Math.min(50, readInt(request.data?.leagueId, 0)));
    const member = sanitizeMember((request.data?.member || {}), stableUid);
    const lbRef = db.collection('leaderboard').doc(stableUid);
    let groupId = await findExistingGroupForUser(db, weekId, leagueId, stableUid);
    if (!groupId) {
        const lbSnap = await lbRef.get().catch(() => null);
        const savedGroupId = lbSnap?.data()?.groupId;
        if (typeof savedGroupId === 'string' && lbSnap?.data()?.groupWeekId === weekId && readInt(lbSnap?.data()?.leagueId) === leagueId) {
            const savedSnap = await db.collection('league_groups').doc(savedGroupId).get().catch(() => null);
            if (savedSnap?.exists && savedSnap.data()?.members?.[stableUid])
                groupId = savedGroupId;
        }
    }
    if (groupId) {
        await db.runTransaction(async (tx) => {
            const ref = db.collection('league_groups').doc(groupId);
            const snap = await tx.get(ref);
            if (!snap.exists)
                throw new https_1.HttpsError('not-found', 'league_group_not_found');
            const data = snap.data() || {};
            if (data.weekId !== weekId || readInt(data.leagueId) !== leagueId)
                throw new https_1.HttpsError('permission-denied', 'room_mismatch');
            const members = { ...(data.members || {}) };
            members[stableUid] = { ...(members[stableUid] || {}), ...member };
            tx.set(ref, { members, memberCount: Object.keys(members).length, updatedAt: Date.now() }, { merge: true });
            tx.set(lbRef, { groupId, groupWeekId: weekId, leagueId }, { merge: true });
        });
        return { ok: true, groupId, weekId, leagueId };
    }
    for (let attempt = 0; attempt < 4; attempt++) {
        const candidate = await findGroupWithSpace(db, weekId, leagueId, stableUid);
        if (!candidate)
            break;
        let joined = false;
        await db.runTransaction(async (tx) => {
            const ref = db.collection('league_groups').doc(candidate);
            const snap = await tx.get(ref);
            if (!snap.exists)
                return;
            const data = snap.data() || {};
            if (data.weekId !== weekId || readInt(data.leagueId) !== leagueId)
                return;
            const members = { ...(data.members || {}) };
            if (!members[stableUid] && Object.keys(members).length >= GROUP_SIZE)
                return;
            members[stableUid] = { ...(members[stableUid] || {}), ...member };
            tx.set(ref, { members, memberCount: Object.keys(members).length, updatedAt: Date.now() }, { merge: true });
            tx.set(lbRef, { groupId: candidate, groupWeekId: weekId, leagueId }, { merge: true });
            joined = true;
        });
        if (joined)
            return { ok: true, groupId: candidate, weekId, leagueId };
    }
    const newGroupId = makeGroupDocId(weekId, leagueId, stableUid);
    await db.runTransaction(async (tx) => {
        const ref = db.collection('league_groups').doc(newGroupId);
        tx.create(ref, {
            weekId,
            leagueId,
            memberCount: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            members: { [stableUid]: member },
        });
        tx.set(lbRef, { groupId: newGroupId, groupWeekId: weekId, leagueId }, { merge: true });
    });
    return { ok: true, groupId: newGroupId, weekId, leagueId };
});
exports.leagueUpdateMyMember = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, request.data?.stableId);
    await assertCanUseLeague(db, stableUid);
    const lbSnap = await db.collection('leaderboard').doc(stableUid).get();
    const groupId = String(lbSnap.data()?.groupId || '');
    const groupWeekId = String(lbSnap.data()?.groupWeekId || '');
    if (!groupId || groupWeekId !== getWeekId())
        return { ok: false, status: 'no_current_group' };
    const raw = (request.data?.member || {});
    const updates = {
        [`members.${stableUid}.uid`]: stableUid,
        updatedAt: Date.now(),
    };
    if (Object.prototype.hasOwnProperty.call(raw, 'name'))
        updates[`members.${stableUid}.name`] = sanitizeString(raw.name, 48) || 'Player';
    if (Object.prototype.hasOwnProperty.call(raw, 'points'))
        updates[`members.${stableUid}.points`] = Math.max(0, Math.min(1000000000, readInt(raw.points, 0)));
    if (Object.prototype.hasOwnProperty.call(raw, 'avatar'))
        updates[`members.${stableUid}.avatar`] = sanitizeString(raw.avatar, 64) || null;
    if (Object.prototype.hasOwnProperty.call(raw, 'frame'))
        updates[`members.${stableUid}.frame`] = sanitizeString(raw.frame, 64) || null;
    if (Object.prototype.hasOwnProperty.call(raw, 'aura'))
        updates[`members.${stableUid}.aura`] = sanitizeString(raw.aura, 64) || null;
    if (Object.prototype.hasOwnProperty.call(raw, 'profileCardLevel'))
        updates[`members.${stableUid}.profileCardLevel`] = Math.max(0, Math.min(5, readInt(raw.profileCardLevel, 0)));
    if (Object.prototype.hasOwnProperty.call(raw, 'profileCardTheme'))
        updates[`members.${stableUid}.profileCardTheme`] = sanitizeString(raw.profileCardTheme, 32) || 'classic';
    if (Object.prototype.hasOwnProperty.call(raw, 'profileCardMotion'))
        updates[`members.${stableUid}.profileCardMotion`] = sanitizeString(raw.profileCardMotion, 32) || 'none';
    if (Object.prototype.hasOwnProperty.call(raw, 'profileCardPublicFocus'))
        updates[`members.${stableUid}.profileCardPublicFocus`] = sanitizeString(raw.profileCardPublicFocus, 32) || 'balanced';
    if (Object.prototype.hasOwnProperty.call(raw, 'isPremium'))
        updates[`members.${stableUid}.isPremium`] = raw.isPremium === true;
    if (Object.prototype.hasOwnProperty.call(raw, 'streak'))
        updates[`members.${stableUid}.streak`] = Math.max(0, Math.min(100000, readInt(raw.streak, 0)));
    if (Object.prototype.hasOwnProperty.call(raw, 'totalXp'))
        updates[`members.${stableUid}.totalXp`] = Math.max(0, Math.min(1000000000, readInt(raw.totalXp, 0)));
    await db.collection('league_groups').doc(groupId).set(updates, { merge: true });
    return { ok: true, groupId };
});
exports.leagueSyncMyBoost = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, request.data?.stableId);
    await assertCanUseLeague(db, stableUid);
    const lbSnap = await db.collection('leaderboard').doc(stableUid).get();
    const groupId = String(lbSnap.data()?.groupId || '');
    const groupWeekId = String(lbSnap.data()?.groupWeekId || '');
    if (!groupId || groupWeekId !== getWeekId())
        return { ok: false, status: 'no_current_group' };
    const multiplier = Number(request.data?.multiplier);
    const expiresAt = readInt(request.data?.expiresAt, 0);
    const ref = db.collection('league_groups').doc(groupId);
    if (!Number.isFinite(multiplier) || multiplier <= 1 || expiresAt <= Date.now()) {
        await ref.set({
            [`members.${stableUid}.leagueBoostMultiplier`]: admin.firestore.FieldValue.delete(),
            [`members.${stableUid}.leagueBoostExpiresAt`]: admin.firestore.FieldValue.delete(),
            updatedAt: Date.now(),
        }, { merge: true });
        return { ok: true, groupId, status: 'cleared' };
    }
    await ref.set({
        [`members.${stableUid}.leagueBoostMultiplier`]: Math.min(10, multiplier),
        [`members.${stableUid}.leagueBoostExpiresAt`]: expiresAt,
        updatedAt: Date.now(),
    }, { merge: true });
    return { ok: true, groupId, status: 'active' };
});
//# sourceMappingURL=league_groups.js.map