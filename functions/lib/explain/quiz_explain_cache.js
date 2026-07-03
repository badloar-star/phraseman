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
exports.QUIZ_REJECTED_RETRY_TTL_MS = exports.QUIZ_SCHEMA_VERSION = exports.QUIZ_LOCK_TTL_MS = exports.QUIZ_COLLECTION = void 0;
exports.normalizeQuizOption = normalizeQuizOption;
exports.quizHashFor = quizHashFor;
exports.isRetryableRejectedQuiz = isRetryableRejectedQuiz;
exports.readCachedQuizExplanation = readCachedQuizExplanation;
exports.claimQuizPendingLock = claimQuizPendingLock;
exports.writeReadyQuizExplanation = writeReadyQuizExplanation;
exports.writeRejectedQuizExplanation = writeRejectedQuizExplanation;
/**
 * Global cache for THEMATIC-QUIZ explanations ("разбор" of each option in a thematic quiz
 * question: Кухня/Дом/… — NOT the easy/medium/hard difficulty quizzes, which keep their
 * hand-authored static explanations). Sibling of choice_explain_cache.ts.
 *
 * One (correct phrase, option-set, language) = one doc at quiz_explanations/{quizHash} =
 * one AI generation for the WHOLE product. The first learner who answers a given thematic
 * question generates the whole batch (a warm "разбор" for the correct option + a short
 * "почему этот не тот" for EACH wrong option); every later reader who taps any option reads
 * it free ($0). This is the "warm the cache, give it to everyone" model — no per-user read cap.
 *
 * KEY DETAIL — option ORDER must not fork the cache: thematic quiz choices are shuffled at
 * runtime (shuffleThematicQuizPhraseChoices). So the hash is built from the SORTED option set,
 * and the per-option texts are keyed by the EXACT option string (not by index). The client maps
 * each shown option → its explanation by text, so shuffling never misaligns the "разбор".
 *
 * SECURITY: only the Cloud Function (Admin SDK) writes here. firestore.rules makes the
 * collection read-only for clients (read: if true; create/update: if false; delete: if isAdmin()).
 * Never trust a client hash — the server derives quizHash from the inputs.
 */
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const explain_cache_1 = require("./explain_cache");
exports.QUIZ_COLLECTION = 'quiz_explanations';
/** Generation lock TTL — slightly above the CF timeout so a crashed generation is re-claimable. */
exports.QUIZ_LOCK_TTL_MS = 30000;
/** Bump to invalidate stale cached quiz explanations on read.
 *  The prompt is NOT part of the hash, so any prompt/voice change must bump this manually.
 *  v1 (2026-06-21): initial batched разбор — correct-option confirm + per-wrong-option line,
 *  in the easy/medium/hard voice (на «ты», тёплый, лёгкий юмор, без воды), keyed by exact option.
 *  v2 (2026-06-30): never serve partial ready docs; every requested wrong option must have a line. */
exports.QUIZ_SCHEMA_VERSION = 2;
/** How long a judge-rejected batch serves nothing before one request may retry generation. */
exports.QUIZ_REJECTED_RETRY_TTL_MS = 10 * 60000;
function isCurrentSchema(data) {
    return Number(data?.schemaVersion ?? 0) >= exports.QUIZ_SCHEMA_VERSION;
}
/** Normalize a single option string for use as a stable map key. Reuses the phrase normalizer. */
function normalizeQuizOption(option) {
    return (0, explain_cache_1.normalizePhrase)(option);
}
/**
 * Deterministic 40-hex cache id for a (correct phrase, option-set, LANGUAGE) triple.
 * The FULL option set (correct + wrong) is normalized + sorted so option ORDER never forks the
 * cache, but a genuinely different option SET is correctly a different doc — the разбор references
 * the specific options. Pass the CANONICAL langKey from resolvePromptLangKey().
 */
function quizHashFor(correctEn, allChoices, langKey) {
    const normalizedChoices = [...new Set(allChoices.map(normalizeQuizOption).filter(Boolean))].sort();
    const seed = `${String(langKey ?? '').trim().toLowerCase()}|${(0, explain_cache_1.normalizePhrase)(correctEn)}|${normalizedChoices.join('|')}`;
    return (0, crypto_1.createHash)('sha256').update(seed).digest('hex').slice(0, 40);
}
function docRef(quizHash) {
    return admin.firestore().collection(exports.QUIZ_COLLECTION).doc(quizHash);
}
/** True iff a rejected doc may be regenerated now (judge false-positive recovery after TTL). */
function isRetryableRejectedQuiz(data, nowMs) {
    if (!data || data.status !== 'rejected')
        return false;
    const updatedAtMs = Number(data.updatedAtMs ?? 0);
    return nowMs - updatedAtMs > exports.QUIZ_REJECTED_RETRY_TTL_MS;
}
/** Read the cached doc, or null if absent OR written by an older schema (stale → regenerate). */
async function readCachedQuizExplanation(quizHash) {
    const snap = await docRef(quizHash).get();
    const data = snap.data();
    if (!data)
        return null;
    if (!isCurrentSchema(data))
        return null;
    return data;
}
/** Claim the generation lock in a transaction. Returns true iff the caller should generate. */
async function claimQuizPendingLock(quizHash, nowMs) {
    const ref = docRef(quizHash);
    const db = admin.firestore();
    return db.runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data();
        if (data && isCurrentSchema(data)) {
            if (data.status === 'ready')
                return false;
            if (data.status === 'rejected' && !isRetryableRejectedQuiz(data, nowMs))
                return false;
            if (data.status === 'pending') {
                const createdAtMs = Number(data.createdAtMs ?? 0);
                const stale = nowMs - createdAtMs > exports.QUIZ_LOCK_TTL_MS;
                if (!stale)
                    return false;
            }
        }
        tx.set(ref, {
            status: 'pending',
            schemaVersion: exports.QUIZ_SCHEMA_VERSION,
            reason: null,
            createdAtMs: nowMs,
            updatedAtMs: nowMs,
        }, { merge: true });
        return true;
    });
}
/** Publish a validated batch to the global cache (status=ready). */
async function writeReadyQuizExplanation(quizHash, payload, meta) {
    await docRef(quizHash).set({
        status: 'ready',
        schemaVersion: exports.QUIZ_SCHEMA_VERSION,
        confirm: payload.confirm,
        options: payload.options,
        lang: meta.lang,
        correctEn: meta.correctEn,
        questionPrompt: meta.questionPrompt ?? null,
        model: meta.model ?? null,
        reason: null,
        updatedAtMs: Date.now(),
    }, { merge: true });
}
/** Mark a batch rejected (judge). Serves nothing; regenerates after the retry TTL. */
async function writeRejectedQuizExplanation(quizHash, reason) {
    await docRef(quizHash).set({
        status: 'rejected',
        schemaVersion: exports.QUIZ_SCHEMA_VERSION,
        reason,
        updatedAtMs: Date.now(),
    }, { merge: true });
}
//# sourceMappingURL=quiz_explain_cache.js.map