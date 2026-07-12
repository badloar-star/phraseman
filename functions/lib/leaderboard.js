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
exports.nameReleaseMine = exports.nameReserve = exports.nameGenerateAndReserve = exports.nameCheckAvailability = exports.leaderboardUpdateDailyAnalytics = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const node_crypto_1 = require("node:crypto");
const MAX_DAILY7_XP = 500000;
const MAX_DAILY7_TIME_MS = 7 * 24 * 60 * 60 * 1000;
const NAME_INDEX = 'name_index';
const NICKNAME_CHANGE_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const GENERATED_NICKNAME_WORDS = [
    'Alpha', 'Axiom', 'Cosmos', 'Delta', 'Helium', 'Ion', 'Lambda', 'Neon',
    'Nova', 'Omega', 'Orbit', 'Photon', 'Quark', 'Quantum', 'Radium', 'Sigma',
    'Tensor', 'Vector', 'Vertex', 'Xenon', 'Zenith',
];
const GENERATED_NICKNAME_ATTEMPTS = 16;
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
function readProgressString(data, key) {
    const value = data?.progress?.[key];
    return typeof value === 'string' ? value.trim() : '';
}
function readProgressMs(data, key) {
    const raw = data?.progress?.[key];
    const value = typeof raw === 'string' ? Number(raw) : Number(raw ?? 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
}
function readProgressFlag(data, key) {
    const raw = data?.progress?.[key];
    return raw === true || raw === '1' || raw === 'true';
}
function readProgressCount(data, key) {
    const raw = data?.progress?.[key];
    if (raw === undefined || raw === null || raw === '')
        return null;
    const value = Math.trunc(Number(raw));
    return Number.isFinite(value) ? Math.max(0, value) : null;
}
function generateNicknameCandidates() {
    const candidates = new Set();
    while (candidates.size < GENERATED_NICKNAME_ATTEMPTS) {
        const word = GENERATED_NICKNAME_WORDS[(0, node_crypto_1.randomInt)(GENERATED_NICKNAME_WORDS.length)];
        candidates.add(`${word} ${(0, node_crypto_1.randomInt)(10000, 100000)}`);
    }
    return [...candidates];
}
function assertValidName(name) {
    if (name.length < 2 || name.length > 32) {
        throw new https_1.HttpsError('invalid-argument', 'name_length');
    }
    if (/[\r\n\t]/.test(name) || /https?:\/\//i.test(name) || /www\./i.test(name) || /[@#]/.test(name)) {
        throw new https_1.HttpsError('invalid-argument', 'name_invalid');
    }
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
/**
 * Whether the current owner of a name reservation is a LIVE account.
 *
 * A reservation may only be reclaimed by a different user if its owner is
 * genuinely gone — i.e. the owner's users/{uid} doc is missing OR has been
 * tombstoned (identityHidden / banned). Crucially this is keyed on the OWNER'S
 * USER DOC only, NOT on whether they happen to have a visible leaderboard row.
 *
 * The previous implementation treated "no visible leaderboard row" as "inactive",
 * which let a second user STEAL the name of any real account that simply hadn't
 * reached the leaderboard yet. That was the root cause of duplicate usernames.
 */
async function nameOwnerIsLive(db, uid) {
    const cleanUid = sanitizeString(uid, 180);
    if (!cleanUid)
        return false;
    const userSnap = await db.collection('users').doc(cleanUid).get().catch(() => null);
    if (!userSnap?.exists)
        return false;
    const data = userSnap.data() ?? {};
    if (data.identityHidden === true)
        return false;
    if (data.banned === true)
        return false;
    return true;
}
async function txNameOwnerIsLive(tx, db, uid) {
    const cleanUid = sanitizeString(uid, 180);
    if (!cleanUid)
        return false;
    const userSnap = await tx.get(db.collection('users').doc(cleanUid));
    if (!userSnap.exists)
        return false;
    const data = userSnap.data() ?? {};
    if (data.identityHidden === true)
        return false;
    if (data.banned === true)
        return false;
    return true;
}
/** A name_index doc that is itself tombstoned never blocks a new reservation. */
function nameIndexDocIsHidden(data) {
    return data?.identityHidden === true;
}
async function txAssertNoLiveLegacyNameOwner(tx, db, stableUid, name, nameLower) {
    const queries = [
        db.collection('users').where('progress.user_name_lower', '==', nameLower).limit(5),
        db.collection('users').where('progress.user_name', '==', name).limit(5),
        db.collection('leaderboard').where('nameLower', '==', nameLower).limit(5),
    ];
    for (const query of queries) {
        const snap = await tx.get(query);
        for (const doc of snap.docs) {
            const ownerUid = sanitizeString(doc.id, 180);
            if (!ownerUid || ownerUid === stableUid)
                continue;
            if (await txNameOwnerIsLive(tx, db, ownerUid)) {
                throw new https_1.HttpsError('already-exists', 'name_taken');
            }
        }
    }
}
async function legacyNameHasLiveOwner(db, stableUid, name, nameLower) {
    const queries = [
        db.collection('users').where('progress.user_name_lower', '==', nameLower).limit(5),
        db.collection('users').where('progress.user_name', '==', name).limit(5),
        db.collection('leaderboard').where('nameLower', '==', nameLower).limit(5),
    ];
    for (const query of queries) {
        const snap = await query.get();
        for (const doc of snap.docs) {
            const ownerUid = sanitizeString(doc.id, 180);
            if (!ownerUid || ownerUid === stableUid)
                continue;
            if (await nameOwnerIsLive(db, ownerUid))
                return true;
        }
    }
    return false;
}
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
    // Source of truth = name_index/{nameLower}. A reservation owned by another,
    // still-live account makes the name unavailable. (No leaderboard fallback —
    // that was the steal vector that let unreached-leaderboard accounts lose names.)
    const idxSnap = await db.collection(NAME_INDEX).doc(nameLower).get();
    const indexOwner = sanitizeString(idxSnap.data()?.uid, 180);
    if (idxSnap.exists &&
        !nameIndexDocIsHidden(idxSnap.data()) &&
        indexOwner !== stableUid &&
        (await nameOwnerIsLive(db, indexOwner))) {
        return { ok: true, available: false };
    }
    if (await legacyNameHasLiveOwner(db, stableUid, name, nameLower)) {
        return { ok: true, available: false };
    }
    return { ok: true, available: true };
});
exports.nameGenerateAndReserve = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUid(db, authUid, request.data?.stableId);
    await assertNotBanned(db, stableUid);
    const candidates = generateNicknameCandidates();
    let assignedName = '';
    await db.runTransaction(async (tx) => {
        const now = Date.now();
        const userRef = db.collection('users').doc(stableUid);
        const userSnap = await tx.get(userRef);
        const userData = userSnap.data();
        const existingName = readProgressString(userData, 'user_name');
        const existingNameLower = readProgressString(userData, 'user_name_lower') || existingName.toLowerCase();
        if (existingName && existingNameLower) {
            const existingRef = db.collection(NAME_INDEX).doc(existingNameLower);
            const existingSnap = await tx.get(existingRef);
            if (existingSnap.exists &&
                existingSnap.data()?.uid === stableUid &&
                !nameIndexDocIsHidden(existingSnap.data())) {
                assignedName = existingName;
                return;
            }
        }
        let chosen = null;
        for (const candidate of candidates) {
            const normalized = normalizeName(candidate);
            const ref = db.collection(NAME_INDEX).doc(normalized.nameLower);
            const snap = await tx.get(ref);
            if (!snap.exists || nameIndexDocIsHidden(snap.data())) {
                try {
                    await txAssertNoLiveLegacyNameOwner(tx, db, stableUid, normalized.name, normalized.nameLower);
                    chosen = { ...normalized, ref };
                    break;
                }
                catch (error) {
                    if (error instanceof https_1.HttpsError && error.message === 'name_taken')
                        continue;
                    throw error;
                }
            }
        }
        if (!chosen)
            throw new https_1.HttpsError('resource-exhausted', 'nickname_generation_exhausted');
        assignedName = chosen.name;
        tx.set(chosen.ref, {
            uid: stableUid,
            authUid,
            name: chosen.name,
            nameLower: chosen.nameLower,
            identityHidden: admin.firestore.FieldValue.delete(),
            updatedAt: now,
        }, { merge: true });
        tx.set(db.collection('leaderboard').doc(stableUid), { name: chosen.name, nameLower: chosen.nameLower, firebaseAuthUid: authUid, updatedAt: now }, { merge: true });
        tx.set(userRef, {
            progress: {
                user_name: chosen.name,
                user_name_lower: chosen.nameLower,
                nickname_changed_at: String(now),
                nickname_change_available_at: String(now + NICKNAME_CHANGE_COOLDOWN_MS),
                nickname_grace_renames_remaining: '3',
            },
            updatedAt: now,
        }, { merge: true });
        tx.set(db.collection('public_profiles').doc(stableUid), { uid: stableUid, name: chosen.name, nameLower: chosen.nameLower, updatedAt: now }, { merge: true });
    });
    return { ok: true, status: 'ok', name: assignedName };
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
    // Atomic reservation. The ONLY source of truth is name_index/{nameLower}.
    // Every concurrent claimant reads that exact doc inside the transaction, so
    // Firestore serializes them: the first commit wins, the rest retry and then
    // see the now-owned doc → 'taken'. There is NO out-of-transaction pre-check
    // (that was a TOCTOU race) and NO "owner has a leaderboard row" escape hatch
    // (that let live-but-unranked accounts get their name stolen).
    //
    // The single legitimate takeover is a genuinely DEAD reservation — the owner's
    // users/{uid} doc is missing or tombstoned (identityHidden/banned). That is
    // checked transactionally via txNameOwnerIsLive, keyed on the owner's USER doc.
    let cooldownUntil = 0;
    try {
        await db.runTransaction(async (tx) => {
            const now = Date.now();
            const nameRef = db.collection(NAME_INDEX).doc(nameLower);
            const userRef = db.collection('users').doc(stableUid);
            const profileRef = db.collection('public_profiles').doc(stableUid);
            const nameSnap = await tx.get(nameRef);
            const userSnap = await tx.get(userRef);
            const userData = userSnap.data();
            const currentNameLower = readProgressString(userData, 'user_name_lower') ||
                readProgressString(userData, 'user_name').toLowerCase() ||
                oldNameLower;
            const oldIndexNameLower = oldNameLower || currentNameLower;
            const oldRef = oldIndexNameLower && oldIndexNameLower !== nameLower ? db.collection(NAME_INDEX).doc(oldIndexNameLower) : null;
            const oldSnap = oldRef ? await tx.get(oldRef) : null;
            const previousChangeAt = readProgressMs(userData, 'nickname_changed_at');
            const isNameChange = Boolean(currentNameLower && currentNameLower !== nameLower);
            const isInitialNameSet = !currentNameLower;
            const freeChangeAvailable = readProgressFlag(userData, 'nickname_free_change_available');
            const storedGraceChanges = readProgressCount(userData, 'nickname_grace_renames_remaining');
            const graceChangesRemaining = storedGraceChanges ?? (freeChangeAvailable ? 1 : 0);
            const consumesGraceChange = isNameChange && graceChangesRemaining > 0;
            const grantsFreeChange = isInitialNameSet;
            const nicknameChangedAt = isNameChange || previousChangeAt <= 0 ? now : previousChangeAt;
            if (isNameChange && previousChangeAt > 0 && !consumesGraceChange) {
                const nextChangeAt = previousChangeAt + NICKNAME_CHANGE_COOLDOWN_MS;
                if (now < nextChangeAt) {
                    cooldownUntil = nextChangeAt;
                    throw new https_1.HttpsError('failed-precondition', 'name_change_cooldown');
                }
            }
            if (nameSnap.exists && !nameIndexDocIsHidden(nameSnap.data())) {
                const indexOwner = sanitizeString(nameSnap.data()?.uid, 180);
                if (indexOwner && indexOwner !== stableUid) {
                    // Owned by someone else → block UNLESS that owner is provably dead.
                    const ownerLive = await txNameOwnerIsLive(tx, db, indexOwner);
                    if (ownerLive) {
                        throw new https_1.HttpsError('already-exists', 'name_taken');
                    }
                    // Dead owner → reclaim is allowed; fall through to overwrite below.
                }
            }
            // Legacy protection until the full backfill has run: older accounts may
            // still have names only in users.progress / leaderboard, not name_index.
            // This path only blocks live owners; it never treats a missing leaderboard
            // row as proof that a name can be reclaimed.
            await txAssertNoLiveLegacyNameOwner(tx, db, stableUid, name, nameLower);
            tx.set(nameRef, {
                uid: stableUid,
                authUid,
                name,
                nameLower,
                identityHidden: admin.firestore.FieldValue.delete(),
                updatedAt: now,
            }, { merge: true });
            if (oldRef && oldSnap?.exists && oldSnap.data()?.uid === stableUid) {
                tx.delete(oldRef);
            }
            tx.set(db.collection('leaderboard').doc(stableUid), {
                name,
                nameLower,
                firebaseAuthUid: authUid,
                updatedAt: now,
            }, { merge: true });
            tx.set(userRef, {
                progress: {
                    user_name: name,
                    user_name_lower: nameLower,
                    nickname_changed_at: String(nicknameChangedAt),
                    nickname_change_available_at: String(nicknameChangedAt + NICKNAME_CHANGE_COOLDOWN_MS),
                    ...(grantsFreeChange && storedGraceChanges === null ? { nickname_free_change_available: '1' } : {}),
                    ...(consumesGraceChange ? {
                        nickname_grace_renames_remaining: String(graceChangesRemaining - 1),
                        nickname_free_change_available: '0',
                    } : {}),
                },
                updatedAt: now,
            }, { merge: true });
            tx.set(profileRef, {
                uid: stableUid,
                name,
                nameLower,
                updatedAt: now,
            }, { merge: true });
        });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'already-exists') {
            return { ok: true, status: 'taken' };
        }
        if (e instanceof https_1.HttpsError && e.message === 'name_change_cooldown') {
            return { ok: true, status: 'cooldown', nextChangeAt: cooldownUntil };
        }
        throw e;
    }
    return { ok: true, status: 'ok' };
});
exports.nameReleaseMine = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUid(db, authUid, request.data?.stableId);
    const candidates = new Set();
    // Cap the client-supplied names hint: it is only a supplement — the authoritative
    // candidates are re-derived below from the caller's own leaderboard doc and a
    // limit(20) uid-index query. Without a cap, a huge names array forced one
    // sequential Firestore read per entry (cost/DoS amplification). Legitimate clients
    // release at most a handful of their own past names, so slice(0, 20) is ample.
    const names = (Array.isArray(request.data?.names) ? request.data.names : []).slice(0, 20);
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