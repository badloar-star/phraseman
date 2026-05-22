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
exports.friendEnsureMyCode = void 0;
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("node:crypto"));
const https_1 = require("firebase-functions/v2/https");
const REGION = 'us-central1';
const USERS = 'users';
const AUTH_LINKS = 'auth_links';
const FRIEND_CODE_INDEX = 'friend_code_index';
const CODE_LEN = 6;
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX_ATTEMPTS = 12;
function normalizeStableId(value) {
    return String(value ?? '').trim();
}
function normalizeCode(value) {
    return String(value ?? '').trim().toUpperCase();
}
function isValidCode(code) {
    if (code.length !== CODE_LEN)
        return false;
    for (const ch of code) {
        if (!CHARSET.includes(ch))
            return false;
    }
    return true;
}
function randomCode() {
    let out = '';
    for (let i = 0; i < CODE_LEN; i += 1) {
        out += CHARSET[crypto.randomInt(0, CHARSET.length)];
    }
    return out;
}
async function assertStableOwner(db, authUid, stableId) {
    if (!stableId || stableId.length > 160) {
        throw new https_1.HttpsError('invalid-argument', 'stable_id_required');
    }
    if (stableId === authUid)
        return;
    const [userSnap, linkSnap] = await Promise.all([
        db.collection(USERS).doc(stableId).get().catch(() => null),
        db.collection(AUTH_LINKS).doc(authUid).get().catch(() => null),
    ]);
    const userAuthUid = String(userSnap?.data()?.firebaseAuthUid ?? '').trim();
    if (userAuthUid && userAuthUid === authUid)
        return;
    if (!userSnap?.exists || !userAuthUid)
        return;
    const linkedAuth = userSnap.data()?.linkedAuth;
    const linkedAuthUid = linkedAuth != null &&
        typeof linkedAuth === 'object' &&
        typeof linkedAuth.providerUid === 'string'
        ? String(linkedAuth.providerUid ?? '').trim()
        : '';
    if (linkedAuthUid === authUid)
        return;
    const linkedStableId = String(linkSnap?.data()?.stable_id ?? '').trim();
    if (linkedStableId && linkedStableId === stableId)
        return;
    throw new https_1.HttpsError('permission-denied', 'stable_id_mismatch');
}
async function assertNotBanned(db, stableId) {
    const [userSnap, bannedSnap] = await Promise.all([
        db.collection(USERS).doc(stableId).get().catch(() => null),
        db.collection('banned_users').doc(stableId).get().catch(() => null),
    ]);
    if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
        throw new https_1.HttpsError('permission-denied', 'user_banned');
    }
}
exports.friendEnsureMyCode = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableId = normalizeStableId(request.data?.stableId);
    await assertStableOwner(db, authUid, stableId);
    await assertNotBanned(db, stableId);
    const userRef = db.collection(USERS).doc(stableId);
    const now = Date.now();
    const userSnap = await userRef.get();
    const existing = normalizeCode(userSnap.data()?.progress?.friend_code);
    if (isValidCode(existing)) {
        const indexRef = db.collection(FRIEND_CODE_INDEX).doc(existing);
        const result = await db.runTransaction(async (tx) => {
            const indexSnap = await tx.get(indexRef);
            const owner = String(indexSnap.data()?.uid ?? '').trim();
            if (indexSnap.exists && owner && owner !== stableId) {
                return null;
            }
            tx.set(indexRef, {
                uid: stableId,
                authUid,
                createdAt: indexSnap.exists ? (indexSnap.data()?.createdAt ?? now) : now,
                updatedAt: now,
            }, { merge: true });
            tx.set(userRef, {
                firebaseAuthUid: authUid,
                progress: { friend_code: existing },
                updatedAt: now,
            }, { merge: true });
            return { code: existing };
        });
        if (result)
            return result;
    }
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const code = randomCode();
        const indexRef = db.collection(FRIEND_CODE_INDEX).doc(code);
        // eslint-disable-next-line no-await-in-loop
        const result = await db.runTransaction(async (tx) => {
            const [freshUserSnap, indexSnap] = await Promise.all([
                tx.get(userRef),
                tx.get(indexRef),
            ]);
            const freshExisting = normalizeCode(freshUserSnap.data()?.progress?.friend_code);
            if (isValidCode(freshExisting))
                return { code: freshExisting };
            if (indexSnap.exists)
                return null;
            tx.set(indexRef, { uid: stableId, authUid, createdAt: now, updatedAt: now });
            tx.set(userRef, {
                firebaseAuthUid: authUid,
                progress: { friend_code: code },
                updatedAt: now,
            }, { merge: true });
            return { code };
        });
        if (result)
            return result;
    }
    throw new https_1.HttpsError('resource-exhausted', 'code_generation_failed');
});
//# sourceMappingURL=friend_codes.js.map