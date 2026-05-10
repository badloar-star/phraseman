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
exports.phraseContentRatingSubmit = exports.phraseContentRatingGetState = void 0;
/**
 * Одноразовая оценка контента (1–3★) на пользователя: users/{stableId}/phrase_content_ratings/{id}
 * + агрегаты phrase_content_rating_stats/{id} для админки.
 *
 * Версия текста (labelFingerprint): тот же itemId, но другая подпись → обнуление count* и обновление label
 * в phrase_content_rating_stats (при открытии экрана с новым текстом или при submit).
 */
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("node:crypto"));
const https_1 = require("firebase-functions/v2/https");
const REGION = 'us-central1';
const STATS = 'phrase_content_rating_stats';
const USERS = 'users';
const ALLOWED_SCOPES = new Set([
    'lesson_practice',
    'lesson_theory',
    'dictionary_word',
    'irregular_verb_drill',
    'preposition_drill',
    'quiz',
    'exam',
]);
function normItemId(raw) {
    return raw.trim().slice(0, 400);
}
function statDocId(scope, itemId) {
    const h = crypto.createHash('sha256').update(`${scope}:${itemId}`, 'utf8').digest('hex');
    return h.slice(0, 40);
}
function trimLabel(s) {
    if (!s)
        return '';
    /** Длиннее подпись — админка показывает фактический текст из приложения. */
    return s.replace(/\s+/g, ' ').trim().slice(0, 1200);
}
/** SHA-256, 32 hex — один itemId + разный текст ⇒ разный отпечаток. */
function labelFingerprint(scope, itemId, trimmedLabel) {
    const payload = trimmedLabel || `${scope}:${itemId}`;
    return crypto.createHash('sha256').update(payload, 'utf8').digest('hex').slice(0, 32);
}
function effectiveStatsFingerprint(statsSnap, scope, itemId) {
    if (!statsSnap.exists)
        return null;
    const d = statsSnap.data();
    if (typeof d.labelFingerprint === 'string' && d.labelFingerprint.length > 0) {
        return d.labelFingerprint;
    }
    return labelFingerprint(scope, itemId, trimLabel(d.label != null ? String(d.label) : ''));
}
const CALLABLE_BASE = { region: REGION, enforceAppCheck: false };
exports.phraseContentRatingGetState = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const stableUserId = String(request.data?.stableUserId ?? '').trim();
    const scope = String(request.data?.scope ?? '').trim();
    const itemId = normItemId(String(request.data?.itemId ?? ''));
    if (!stableUserId || !itemId) {
        throw new https_1.HttpsError('invalid-argument', 'stableUserId and itemId required');
    }
    if (!ALLOWED_SCOPES.has(scope)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid scope');
    }
    const id = statDocId(scope, itemId);
    const db = admin.firestore();
    const userRef = db.collection(USERS).doc(stableUserId).collection('phrase_content_ratings').doc(id);
    const statsRef = db.collection(STATS).doc(id);
    const data = request.data ?? {};
    const legacyMode = !Object.prototype.hasOwnProperty.call(data, 'labelSnippet');
    if (legacyMode) {
        const snap = await userRef.get();
        if (!snap.exists) {
            return { myStars: null };
        }
        const stars = Math.floor(Number(snap.data()?.stars));
        return { myStars: stars >= 1 && stars <= 3 ? stars : null };
    }
    const labelSnippet = trimLabel(data.labelSnippet != null ? String(data.labelSnippet) : '');
    const incomingFp = labelFingerprint(scope, itemId, labelSnippet);
    const [statsSnap, userSnap] = await Promise.all([statsRef.get(), userRef.get()]);
    const effFp = effectiveStatsFingerprint(statsSnap, scope, itemId);
    if (statsSnap.exists && effFp !== null && effFp !== incomingFp) {
        const prev = statsSnap.data();
        const newLabel = trimLabel(labelSnippet) || trimLabel(prev.label != null ? String(prev.label) : '');
        const now = Date.now();
        await statsRef.set({
            scope,
            itemId,
            count1: 0,
            count2: 0,
            count3: 0,
            label: newLabel,
            labelFingerprint: incomingFp,
            updatedAt: now,
        }, { merge: true });
        return { myStars: null };
    }
    if (!userSnap.exists) {
        return { myStars: null };
    }
    const u = userSnap.data();
    const stars = Math.floor(Number(u.stars));
    const valid = stars >= 1 && stars <= 3;
    const userFp = typeof u.labelFingerprint === 'string' ? u.labelFingerprint : null;
    if (userFp !== null) {
        if (userFp !== incomingFp)
            return { myStars: null };
        return { myStars: valid ? stars : null };
    }
    return { myStars: valid ? stars : null };
});
exports.phraseContentRatingSubmit = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const stableUserId = String(request.data?.stableUserId ?? '').trim();
    const scope = String(request.data?.scope ?? '').trim();
    const itemId = normItemId(String(request.data?.itemId ?? ''));
    const stars = Math.floor(Number(request.data?.stars));
    const labelSnippet = trimLabel(request.data?.labelSnippet != null ? String(request.data.labelSnippet) : '');
    if (!stableUserId || !itemId) {
        throw new https_1.HttpsError('invalid-argument', 'stableUserId and itemId required');
    }
    if (!ALLOWED_SCOPES.has(scope)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid scope');
    }
    if (!Number.isFinite(stars) || stars < 1 || stars > 3) {
        throw new https_1.HttpsError('invalid-argument', 'stars must be 1–3');
    }
    const db = admin.firestore();
    const id = statDocId(scope, itemId);
    const userRef = db.collection(USERS).doc(stableUserId).collection('phrase_content_ratings').doc(id);
    const statsRef = db.collection(STATS).doc(id);
    const now = Date.now();
    const cntField = stars === 1 ? 'count1' : stars === 2 ? 'count2' : 'count3';
    const incomingFp = labelFingerprint(scope, itemId, labelSnippet);
    const out = await db.runTransaction(async (tx) => {
        const [existing, statsSnap] = await Promise.all([tx.get(userRef), tx.get(statsRef)]);
        const d = statsSnap.exists ? statsSnap.data() : null;
        const effFp = statsSnap.exists ? effectiveStatsFingerprint(statsSnap, scope, itemId) : null;
        const contentChanged = !!statsSnap.exists && effFp !== null && effFp !== incomingFp;
        if (existing.exists) {
            const u = existing.data();
            const prev = Math.floor(Number(u.stars));
            const valid = prev >= 1 && prev <= 3;
            const userFp = typeof u.labelFingerprint === 'string' ? u.labelFingerprint : null;
            if (userFp !== null) {
                if (userFp === incomingFp && valid) {
                    return { ok: false, alreadyRated: true, stars: prev };
                }
            }
            else if (!contentChanged && valid) {
                return { ok: false, alreadyRated: true, stars: prev };
            }
        }
        const trimmed = trimLabel(labelSnippet);
        const fallbackLabel = trimmed || (d && trimLabel(d.label != null ? String(d.label) : '')) || '';
        tx.set(userRef, {
            scope,
            itemId,
            stars,
            labelFingerprint: incomingFp,
            ...(!existing.exists ? { createdAt: now } : {}),
        }, { merge: true });
        if (contentChanged || !statsSnap.exists) {
            const patch = {
                scope,
                itemId,
                label: fallbackLabel,
                labelFingerprint: incomingFp,
                count1: stars === 1 ? 1 : 0,
                count2: stars === 2 ? 1 : 0,
                count3: stars === 3 ? 1 : 0,
                updatedAt: now,
            };
            if (!statsSnap.exists) {
                patch.createdAt = now;
            }
            tx.set(statsRef, patch, { merge: true });
        }
        else {
            tx.set(statsRef, {
                scope,
                itemId,
                label: trimmed || String(d?.label ?? ''),
                labelFingerprint: incomingFp,
                [cntField]: admin.firestore.FieldValue.increment(1),
                updatedAt: now,
            }, { merge: true });
        }
        return { ok: true, alreadyRated: false, stars };
    });
    if (!out.ok && out.alreadyRated) {
        return { ok: false, alreadyRated: true, stars: out.stars };
    }
    return { ok: true, alreadyRated: false, stars: out.stars };
});
//# sourceMappingURL=phrase_content_rating.js.map