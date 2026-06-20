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
exports.dailyPhraseSetSaved = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const REGION = 'us-central1';
const DAILY_PHRASES = 'daily_phrases';
const DAILY_PHRASE_SAVES = 'daily_phrase_saves';
const DAILY_PHRASE_SAVE_COUNTS = 'daily_phrase_save_counts';
function cleanPhraseId(raw) {
    const id = String(raw ?? '').trim();
    if (!id || id.length > 120 || !/^[A-Za-z0-9_-]+$/.test(id)) {
        throw new https_1.HttpsError('invalid-argument', 'Bad phraseId');
    }
    return id;
}
async function resolveStableUid(authUid) {
    const db = admin.firestore();
    const direct = await db.collection('users').doc(authUid).get().catch(() => null);
    if (direct?.exists)
        return authUid;
    const byAuth = await db.collection('users').where('firebaseAuthUid', '==', authUid).limit(1).get().catch(() => null);
    if (byAuth && !byAuth.empty)
        return byAuth.docs[0].id;
    return authUid;
}
exports.dailyPhraseSetSaved = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    const authUid = request.auth?.uid;
    if (!authUid)
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    const phraseId = cleanPhraseId(request.data?.phraseId);
    const saved = request.data?.saved === true;
    const stableUid = await resolveStableUid(authUid);
    const db = admin.firestore();
    const phraseRef = db.collection(DAILY_PHRASES).doc(phraseId);
    const saveRef = db.collection(DAILY_PHRASE_SAVES).doc(`${phraseId}_${stableUid}`);
    const countRef = db.collection(DAILY_PHRASE_SAVE_COUNTS).doc(phraseId);
    const savedCount = await db.runTransaction(async (tx) => {
        const [phraseSnap, saveSnap, countSnap] = await Promise.all([
            tx.get(phraseRef),
            tx.get(saveRef),
            tx.get(countRef),
        ]);
        if (!phraseSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Phrase not found');
        }
        const current = Math.max(0, Number(countSnap.data()?.savedCount ?? phraseSnap.data()?.savedCount ?? 0) || 0);
        let delta = 0;
        if (saved && !saveSnap.exists) {
            delta = 1;
            tx.set(saveRef, {
                phraseId,
                uid: stableUid,
                authUid,
                savedAt: Date.now(),
            });
        }
        else if (!saved && saveSnap.exists) {
            delta = -1;
            tx.delete(saveRef);
        }
        const next = Math.max(0, current + delta);
        if (delta !== 0) {
            tx.set(countRef, {
                phraseId,
                savedCount: next,
                updatedAt: Date.now(),
            }, { merge: true });
            tx.set(phraseRef, {
                savedCount: next,
                updatedAt: Date.now(),
            }, { merge: true });
        }
        return next;
    });
    return { ok: true, savedCount };
});
//# sourceMappingURL=daily_phrases.js.map