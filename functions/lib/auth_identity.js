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
exports.authEnsureStableLink = void 0;
exports.linkStableAuthUid = linkStableAuthUid;
exports.resolveStableUidForAuth = resolveStableUidForAuth;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const USERS = 'users';
const AUTH_LINKS = 'auth_links';
const LEADERBOARD = 'leaderboard';
function normalizeStableId(value) {
    return String(value ?? '').trim();
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
    if (!userAuthUid || userAuthUid === authUid)
        return;
    const linkedStableId = String(linkSnap?.data()?.stable_id ?? '').trim();
    if (linkedStableId === stableId)
        return;
    throw new https_1.HttpsError('permission-denied', 'stable_id_mismatch');
}
async function linkStableAuthUid(db, stableId, authUid) {
    const now = Date.now();
    await db.collection(USERS).doc(stableId).set({
        firebaseAuthUid: authUid,
        updatedAt: now,
    }, { merge: true });
    const lbRef = db.collection(LEADERBOARD).doc(stableId);
    const lbSnap = await lbRef.get().catch(() => null);
    if (lbSnap?.exists) {
        await lbRef.set({ firebaseAuthUid: authUid, updatedAt: now }, { merge: true });
    }
}
async function resolveStableUidForAuth(db, authUid, requestedStableId) {
    const stableId = normalizeStableId(requestedStableId);
    if (stableId) {
        await assertStableOwner(db, authUid, stableId);
        await linkStableAuthUid(db, stableId, authUid);
        return stableId;
    }
    const direct = await db.collection(USERS).doc(authUid).get().catch(() => null);
    if (direct?.exists)
        return authUid;
    const byAuth = await db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(1).get();
    if (!byAuth.empty)
        return byAuth.docs[0].id;
    return authUid;
}
exports.authEnsureStableLink = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableId = normalizeStableId(request.data?.stableId);
    const stableUid = await resolveStableUidForAuth(db, authUid, stableId);
    return { ok: true, stableUid, authUid };
});
//# sourceMappingURL=auth_identity.js.map