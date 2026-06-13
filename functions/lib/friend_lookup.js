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
exports.friendLookupUser = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const NAME_INDEX = 'name_index';
function sanitizeString(value, max) {
    return String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max);
}
function normalizeNameQuery(value) {
    const name = sanitizeString(String(value ?? '').replace(/^@+/, ''), 32);
    return { name, nameLower: name.toLowerCase() };
}
function nameIndexDocIsHidden(data) {
    return data?.identityHidden === true;
}
async function targetIsVisible(db, uid) {
    const cleanUid = sanitizeString(uid, 180);
    if (!cleanUid)
        return false;
    const [userSnap, bannedSnap] = await Promise.all([
        db.collection('users').doc(cleanUid).get().catch(() => null),
        db.collection('banned_users').doc(cleanUid).get().catch(() => null),
    ]);
    if (bannedSnap?.exists || !userSnap?.exists)
        return false;
    const data = userSnap.data() ?? {};
    if (data.identityHidden === true || data.banned === true)
        return false;
    return true;
}
exports.friendLookupUser = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    await (0, auth_identity_1.resolveStableUidForAuth)(db, request.auth.uid, request.data?.stableId, { requireKnownIdentity: true });
    const { name, nameLower } = normalizeNameQuery(request.data?.query);
    if (name.length < 2 || name.length > 32) {
        throw new https_1.HttpsError('invalid-argument', 'query_length');
    }
    const idxSnap = await db.collection(NAME_INDEX).doc(nameLower).get();
    const idx = idxSnap.data();
    const uid = sanitizeString(idx?.uid, 180);
    if (!idxSnap.exists || nameIndexDocIsHidden(idx) || !uid) {
        return { ok: true, user: null };
    }
    if (!(await targetIsVisible(db, uid))) {
        return { ok: true, user: null };
    }
    return {
        ok: true,
        user: {
            uid,
            source: 'name_index',
            name: sanitizeString(idx?.name || name, 32),
        },
    };
});
//# sourceMappingURL=friend_lookup.js.map