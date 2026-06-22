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
exports.MISTAKE_REJECTED_RETRY_TTL_MS = exports.MISTAKE_SCHEMA_VERSION = exports.MISTAKE_LOCK_TTL_MS = exports.MISTAKE_COLLECTION = void 0;
exports.mistakeHashFor = mistakeHashFor;
exports.isRetryableRejectedMistake = isRetryableRejectedMistake;
exports.readCachedMistakeExplanation = readCachedMistakeExplanation;
exports.claimMistakePendingLock = claimMistakePendingLock;
exports.writeReadyMistakeExplanation = writeReadyMistakeExplanation;
exports.writeEli5MistakeExplanation = writeEli5MistakeExplanation;
exports.writeRejectedMistakeExplanation = writeRejectedMistakeExplanation;
/**
 * Global cache for MISTAKE explanations (lesson "build the phrase" exercise).
 *
 * One (target phrase, user's wrong answer, language) = one doc at
 * mistake_explanations/{mistakeHash} = one AI generation for the WHOLE product.
 * The first learner who makes a given mistake generates it; every later learner
 * who repeats the SAME mistake on the SAME phrase reads it free ($0). This is the
 * "warm the cache, give it to everyone" model — no per-user daily cap on reads.
 *
 * Each doc holds TWO texts:
 *   - full: the careful breakdown (every wrong word + the mini-rule + why).
 *   - eli5: the "explain like I'm five" version shown in the modal (optional,
 *     generated lazily on first tap of «Объяснить»).
 *
 * SECURITY: only the Cloud Function (Admin SDK) writes here. firestore.rules makes
 * the collection read-only for clients (read: if true; write: if false; delete: if isAdmin()).
 * Never trust a client hash — the server derives mistakeHash from the inputs.
 *
 * Sibling of choice_explain_cache.ts — same lock/schema discipline.
 */
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const explain_cache_1 = require("./explain_cache");
exports.MISTAKE_COLLECTION = 'mistake_explanations';
/** Generation lock TTL — slightly above the CF timeout so a crashed generation is re-claimable. */
exports.MISTAKE_LOCK_TTL_MS = 35000;
/** Bump to invalidate stale cached mistake explanations on read.
 *  v1 (2026-06-20): full breakdown + lazy ELI5 variant.
 *  v2 (2026-06-20): fix — explanations were generated in English; prompts now enforce interfaceLang.
 *  v3 (2026-06-20): prompts re-aimed to teach the SINGLE governing distinction behind each wrong
 *  word (e.g. "that" vs "it") with a minimal pair + a runnable test, on the strong model tier,
 *  instead of generic "short rule, max 4 sentences" filler — old breakdowns AND old ELI5 text are
 *  watered-down and must be regenerated.
 *  v4 (2026-06-21): prompts now (a) address the learner as "ты" with a light, friendly touch of humor
 *  (Phraseman Bible voice), and (b) added an ANTONYM / plain-wrong-word branch so trivial opposites
 *  like "bad"→"good" get ONE short line instead of водянистые tirades about "what the question
 *  implies" — old cached breakdowns/ELI5 for such cases are exactly that water and must regenerate.
 *  v5 (2026-06-21): prompts now BAN guessing the learner's reason for the mistake ("you translated
 *  literally", "you didn't think about the context") — a false, unkind mind-read when the learner may
 *  have simply mis-tapped (user report: goodbye→thanks). Old v3/v4 breakdowns contain exactly this
 *  invented-cause water and must regenerate. */
exports.MISTAKE_SCHEMA_VERSION = 6;
/** How long a judge-rejected breakdown serves nothing before one request may retry generation. */
exports.MISTAKE_REJECTED_RETRY_TTL_MS = 10 * 60000;
function isCurrentSchema(data) {
    return Number(data?.schemaVersion ?? 0) >= exports.MISTAKE_SCHEMA_VERSION;
}
/**
 * Deterministic 40-hex cache id for a (target phrase, user wrong answer, LANGUAGE) triple.
 * Both phrases are normalized so trivial spacing/case/punctuation differences collapse to one
 * doc, but a genuinely different wrong answer is correctly a different doc — the breakdown
 * references the specific words the learner got wrong.
 */
function mistakeHashFor(targetEn, userAnswer, langKey) {
    const seed = `${String(langKey ?? '').trim().toLowerCase()}|${(0, explain_cache_1.normalizePhrase)(targetEn)}|${(0, explain_cache_1.normalizePhrase)(userAnswer)}`;
    return (0, crypto_1.createHash)('sha256').update(seed).digest('hex').slice(0, 40);
}
function docRef(mistakeHash) {
    return admin.firestore().collection(exports.MISTAKE_COLLECTION).doc(mistakeHash);
}
/** True iff a rejected doc may be regenerated now (judge false-positive recovery after TTL). */
function isRetryableRejectedMistake(data, nowMs) {
    if (!data || data.status !== 'rejected')
        return false;
    const updatedAtMs = Number(data.updatedAtMs ?? 0);
    return nowMs - updatedAtMs > exports.MISTAKE_REJECTED_RETRY_TTL_MS;
}
/** Read the cached doc, or null if absent OR written by an older schema (stale → regenerate). */
async function readCachedMistakeExplanation(mistakeHash) {
    const snap = await docRef(mistakeHash).get();
    const data = snap.data();
    if (!data)
        return null;
    if (!isCurrentSchema(data))
        return null;
    return data;
}
/**
 * Claim the generation lock for the FULL breakdown in a transaction.
 * Returns true iff the caller should generate it.
 */
async function claimMistakePendingLock(mistakeHash, nowMs) {
    const ref = docRef(mistakeHash);
    const db = admin.firestore();
    return db.runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data();
        if (data && isCurrentSchema(data)) {
            if (data.status === 'ready')
                return false;
            if (data.status === 'rejected' && !isRetryableRejectedMistake(data, nowMs))
                return false;
            if (data.status === 'pending') {
                const createdAtMs = Number(data.createdAtMs ?? 0);
                const stale = nowMs - createdAtMs > exports.MISTAKE_LOCK_TTL_MS;
                if (!stale)
                    return false;
            }
        }
        tx.set(ref, {
            status: 'pending',
            schemaVersion: exports.MISTAKE_SCHEMA_VERSION,
            reason: null,
            createdAtMs: nowMs,
            updatedAtMs: nowMs,
        }, { merge: true });
        return true;
    });
}
/** Publish a validated full breakdown to the global cache (status=ready). */
async function writeReadyMistakeExplanation(mistakeHash, full, meta) {
    await docRef(mistakeHash).set({
        status: 'ready',
        schemaVersion: exports.MISTAKE_SCHEMA_VERSION,
        full,
        lang: meta.lang,
        targetEn: meta.targetEn,
        userAnswer: meta.userAnswer,
        model: meta.model ?? null,
        reason: null,
        updatedAtMs: Date.now(),
    }, { merge: true });
}
/** Attach a lazily-generated ELI5 variant to an existing ready doc. */
async function writeEli5MistakeExplanation(mistakeHash, eli5) {
    await docRef(mistakeHash).set({
        eli5,
        updatedAtMs: Date.now(),
    }, { merge: true });
}
/** Mark a breakdown rejected (judge). Serves nothing; regenerates after the retry TTL. */
async function writeRejectedMistakeExplanation(mistakeHash, reason) {
    await docRef(mistakeHash).set({
        status: 'rejected',
        schemaVersion: exports.MISTAKE_SCHEMA_VERSION,
        reason,
        updatedAtMs: Date.now(),
    }, { merge: true });
}
//# sourceMappingURL=mistake_explain_cache.js.map