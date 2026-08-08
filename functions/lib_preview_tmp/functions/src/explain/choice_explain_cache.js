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
exports.CHOICE_REJECTED_RETRY_TTL_MS = exports.CHOICE_SCHEMA_VERSION = exports.CHOICE_LOCK_TTL_MS = exports.CHOICE_COLLECTION = void 0;
exports.normalizeChoiceOption = normalizeChoiceOption;
exports.choiceHashFor = choiceHashFor;
exports.isRetryableRejectedChoice = isRetryableRejectedChoice;
exports.readCachedChoiceExplanation = readCachedChoiceExplanation;
exports.claimChoicePendingLock = claimChoicePendingLock;
exports.writeReadyChoiceExplanation = writeReadyChoiceExplanation;
exports.writeRejectedChoiceExplanation = writeRejectedChoiceExplanation;
/**
 * Global cache for CHOICE-exercise explanations (correct confirmation + per-distractor
 * "why this one doesn't fit"). Sibling of explain_cache.ts but with its own collection,
 * shape and schema versioning — see functions/src/explain_choice.ts for the orchestrator.
 *
 * One (correct phrase, option-set, language) = one doc at choice_explanations/{choiceHash} =
 * one AI generation for the WHOLE product. The first caller (whoever answers the exercise
 * first) generates the whole batch; every later reader who taps any option reads it free.
 *
 * SECURITY: only the Cloud Function (Admin SDK) writes here. firestore.rules makes the
 * collection read-only for clients (read: if true; write: if false; delete: if isAdmin()).
 * Never trust a client hash — the server derives choiceHash from the inputs.
 */
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const explain_cache_1 = require("./explain_cache");
exports.CHOICE_COLLECTION = 'choice_explanations';
/** Generation lock TTL — slightly above the CF timeout so a crashed generation is re-claimable. */
exports.CHOICE_LOCK_TTL_MS = 30000;
/** Bump to invalidate stale cached choice explanations on read.
 *  v1 (2026-06-20): initial batched correct-confirm + per-distractor explanations.
 *  v2 (2026-06-21): prompt now addresses the learner as "ты" (Phraseman Bible) and BANS guessing the
 *  reason a wrong option was picked ("you translated literally") — old v1 batches may use "вы" and
 *  invented causes, so regenerate.
 *  v3 (2026-06-21): audit fixes — dropped the "WRONG option" framing (no «ошибка»/«wrong» to the
 *  learner), tightened length to ≤12 words, added "don't invent a definition you're unsure of", warm
 *  marker + forward nudge in the confirm — old v2 batches predate these, regenerate. */
exports.CHOICE_SCHEMA_VERSION = 3;
/** How long a judge-rejected batch serves nothing before one request may retry generation. */
exports.CHOICE_REJECTED_RETRY_TTL_MS = 10 * 60000;
function isCurrentSchema(data) {
    return Number(data?.schemaVersion ?? 0) >= exports.CHOICE_SCHEMA_VERSION;
}
/** Normalize a single option string for use as a stable map key. Reuses the phrase normalizer. */
function normalizeChoiceOption(option) {
    return (0, explain_cache_1.normalizePhrase)(option);
}
/**
 * Deterministic 40-hex cache id for a (correct phrase, option-set, LANGUAGE) triple.
 * Distractors are normalized + sorted so option ORDER never forks the cache, but a different
 * option SET (different distractors) is correctly a different doc — explanations reference
 * specific wrong options. Pass the CANONICAL langKey from resolvePromptLangKey().
 */
function choiceHashFor(correctEn, distractors, langKey, studyTarget = 'en') {
    const normalizedDistractors = [...new Set(distractors.map(normalizeChoiceOption).filter(Boolean))].sort();
    // studyTarget in the key so a fr-learner never gets the en-cached batch for the same string.
    // 'en' emits no segment ⇒ existing English docs keep their hash (see phraseHashFor rationale).
    const target = String(studyTarget ?? 'en').trim().toLowerCase() || 'en';
    const targetSegment = target === 'en' ? '' : `${target}::`;
    const seed = `${targetSegment}${String(langKey ?? '').trim().toLowerCase()}|${(0, explain_cache_1.normalizePhrase)(correctEn)}|${normalizedDistractors.join('|')}`;
    return (0, crypto_1.createHash)('sha256').update(seed).digest('hex').slice(0, 40);
}
function docRef(choiceHash) {
    return admin.firestore().collection(exports.CHOICE_COLLECTION).doc(choiceHash);
}
/** True iff a rejected doc may be regenerated now (judge false-positive recovery after TTL). */
function isRetryableRejectedChoice(data, nowMs) {
    if (!data || data.status !== 'rejected')
        return false;
    const updatedAtMs = Number(data.updatedAtMs ?? 0);
    return nowMs - updatedAtMs > exports.CHOICE_REJECTED_RETRY_TTL_MS;
}
/** Read the cached doc, or null if absent OR written by an older schema (stale → regenerate). */
async function readCachedChoiceExplanation(choiceHash) {
    const snap = await docRef(choiceHash).get();
    const data = snap.data();
    if (!data)
        return null;
    if (!isCurrentSchema(data))
        return null;
    return data;
}
/** Claim the generation lock in a transaction. Returns true iff the caller should generate. */
async function claimChoicePendingLock(choiceHash, nowMs) {
    const ref = docRef(choiceHash);
    const db = admin.firestore();
    return db.runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data();
        if (data && isCurrentSchema(data)) {
            if (data.status === 'ready')
                return false;
            if (data.status === 'rejected' && !isRetryableRejectedChoice(data, nowMs))
                return false;
            if (data.status === 'pending') {
                const createdAtMs = Number(data.createdAtMs ?? 0);
                const stale = nowMs - createdAtMs > exports.CHOICE_LOCK_TTL_MS;
                if (!stale)
                    return false;
            }
        }
        tx.set(ref, {
            status: 'pending',
            schemaVersion: exports.CHOICE_SCHEMA_VERSION,
            reason: null,
            createdAtMs: nowMs,
            updatedAtMs: nowMs,
        }, { merge: true });
        return true;
    });
}
/** Publish a validated batch to the global cache (status=ready). */
async function writeReadyChoiceExplanation(choiceHash, payload, meta) {
    await docRef(choiceHash).set({
        status: 'ready',
        schemaVersion: exports.CHOICE_SCHEMA_VERSION,
        confirm: payload.confirm,
        distractors: payload.distractors,
        lang: meta.lang,
        correctEn: meta.correctEn,
        model: meta.model ?? null,
        reason: null,
        updatedAtMs: Date.now(),
    }, { merge: true });
}
/** Mark a batch rejected (judge). Serves nothing; regenerates after the retry TTL. */
async function writeRejectedChoiceExplanation(choiceHash, reason) {
    await docRef(choiceHash).set({
        status: 'rejected',
        schemaVersion: exports.CHOICE_SCHEMA_VERSION,
        reason,
        updatedAtMs: Date.now(),
    }, { merge: true });
}
//# sourceMappingURL=choice_explain_cache.js.map