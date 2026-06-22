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
exports.REJECTED_RETRY_TTL_MS = exports.REPORT_REJECT_REASON = exports.EXPLAIN_SCHEMA_VERSION = exports.LOCK_TTL_MS = exports.EXPLAIN_COLLECTION = void 0;
exports.normalizePhrase = normalizePhrase;
exports.phraseHashFor = phraseHashFor;
exports.isRetryableRejected = isRetryableRejected;
exports.readCachedExplanation = readCachedExplanation;
exports.claimPendingLock = claimPendingLock;
exports.writeReadyExplanation = writeReadyExplanation;
exports.writeRejectedExplanation = writeRejectedExplanation;
/**
 * Global explanation cache for "Explain like I'm five".
 *
 * One phrase = one doc at phrase_explanations/{phraseHash} = one AI generation for the WHOLE
 * product, ever. The first caller generates; after the AI judge passes, the doc becomes public
 * and every later read is free (0 tokens).
 *
 * SECURITY: only the Cloud Function (Admin SDK) writes here. firestore.rules makes this
 * collection read-only for clients (read: if true; write: if false). Never trust a client hash —
 * the server derives phraseHash from phraseEn via normalizePhrase.
 *
 * The pure hashing/normalization is dependency-free; the read/lock/write touch Firestore.
 * `now` is passed in (not read from Date.now()) so lock-staleness is deterministically testable.
 */
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
exports.EXPLAIN_COLLECTION = 'phrase_explanations';
/** Generation lock TTL. Slightly above the 30s CF timeout so a crashed generation's lock
 *  becomes re-claimable right after the request that held it dies. */
exports.LOCK_TTL_MS = 30000;
/** Cache doc schema version — also used to invalidate stale cached explanations on read.
 *  v2 (2026-06-10): prompt rewritten to explain ENGLISH grammar instead of restating the meaning.
 *  v3 (2026-06-10): explanation became LONGER and structured (short paragraphs, quoted English
 *  words for client-side highlighting) — v2 short texts are stale and must be regenerated.
 *  v4 (2026-06-20): prompt re-aimed to teach the SINGLE most-confusable distinction of THIS phrase
 *  (e.g. "it" vs "that") with a minimal pair, instead of narrating every obvious word — the old
 *  90-word "walk through every word" texts are watered-down and must be regenerated.
 *  v5 (2026-06-21): prompt now addresses the learner as "ты" with a light, friendly touch of humor
 *  (Phraseman Bible voice) — older texts use a neutral/formal tone and are regenerated for consistency.
 *  v6 (2026-06-21): audit fixes — removed "simply" (leaked into «просто», a banned filler), banned
 *  filler words, tightened anti-hallucination for out-of-bank traps, softened the single-trap rule,
 *  added the Phraseman word-swap bridge — older texts predate these, regenerate.
 *  A doc whose schemaVersion is below this is treated as absent (see isCurrentSchema). */
exports.EXPLAIN_SCHEMA_VERSION = 6;
/** The `reason` written when the REPORT threshold rejects a phrase (explain_reports.ts).
 *  Report-rejected docs are STICKY: they never auto-regenerate (mass-report regen abuse) and can
 *  only be reset by an admin. Judge-rejected docs, by contrast, retry after a TTL — the judge has
 *  false positives (prod 2026-06-10: a fine RU explanation rejected as non_target_language because
 *  it quotes English words), and a transient verdict must not poison a phrase forever. */
exports.REPORT_REJECT_REASON = 'report_threshold';
/** How long a JUDGE-rejected phrase serves the fallback before one request may retry generation.
 *  Bounded cost: one retry per TTL per phrase, still inside user/global budgets. */
exports.REJECTED_RETRY_TTL_MS = 10 * 60000;
/** True iff a cached doc was written by the CURRENT prompt/schema. Older docs are stale and
 *  must be ignored on read + re-claimable for regeneration. */
function isCurrentSchema(data) {
    return Number(data?.schemaVersion ?? 0) >= exports.EXPLAIN_SCHEMA_VERSION;
}
/**
 * Canonical normalization. trim → lowercase → collapse internal whitespace → strip trailing
 * punctuation. So "Hello!", "  hello " and "HELLO?" all map to one cache key (aggressive dedup
 * → one generation per phrase). This is the SINGLE source of truth; the report CF reuses it.
 */
function normalizePhrase(phraseEn) {
    return String(phraseEn ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[!?.,;:'"]+$/u, '')
        .trim();
}
/**
 * Deterministic 40-hex cache id for a (phrase, LANGUAGE) pair.
 *
 * langKey is REQUIRED (audit bug 2026-06-10): the cached text is written in one language, so the
 * key must include it — hashing the phrase alone let an es-user receive the ru-cached explanation.
 * Pass the CANONICAL key from resolvePromptLangKey() (explain_prompts), never the raw client lang —
 * both the generation CF and the report CF must derive the key the same way to hit the same doc.
 * Side effect of the key change: all pre-2026-06-10 docs (keyed without lang) are orphaned —
 * unreachable by reads, regenerated under new keys. Acceptable: the cache was just invalidated.
 */
function phraseHashFor(phraseEn, langKey) {
    return (0, crypto_1.createHash)('sha256')
        .update(`${String(langKey ?? '').trim().toLowerCase()}|${normalizePhrase(phraseEn)}`)
        .digest('hex')
        .slice(0, 40);
}
function docRef(phraseHash) {
    return admin.firestore().collection(exports.EXPLAIN_COLLECTION).doc(phraseHash);
}
/**
 * True iff a rejected doc may be retried (regenerated) now.
 *  - report_threshold rejects are STICKY — only an admin reset revives them;
 *  - judge rejects become retryable once REJECTED_RETRY_TTL_MS has passed (false-positive recovery);
 *  - a rejected doc with no timestamp (legacy/corrupt) is retryable — better to regenerate than
 *    to stay broken forever.
 */
function isRetryableRejected(data, nowMs) {
    if (!data || data.status !== 'rejected')
        return false;
    if (String(data.reason ?? '') === exports.REPORT_REJECT_REASON)
        return false;
    const updatedAtMs = Number(data.updatedAtMs ?? 0);
    return nowMs - updatedAtMs > exports.REJECTED_RETRY_TTL_MS;
}
/** Read the cached doc, or null if absent OR written by an older schema (stale → regenerate). */
async function readCachedExplanation(phraseHash) {
    const snap = await docRef(phraseHash).get();
    const data = snap.data();
    if (!data)
        return null;
    if (!isCurrentSchema(data))
        return null; // stale v1 explanation → treat as cache miss
    return data;
}
/**
 * Try to claim the generation lock in a transaction.
 * Returns true (caller should generate) iff the doc is absent, is a STALE pending
 * (now - createdAtMs > LOCK_TTL_MS), OR is a retryable judge-rejected doc (TTL passed —
 * see isRetryableRejected). Returns false for ready / sticky-rejected / fresh-pending
 * (caller serves cache or fallback). Writes createdAtMs so staleness is computable.
 * The rejected→pending flip happens INSIDE this tx, so concurrent retries cannot stampede.
 */
async function claimPendingLock(phraseHash, nowMs) {
    const ref = docRef(phraseHash);
    const db = admin.firestore();
    return db.runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data();
        // A doc from an older schema is stale content → allow re-claim (regenerate over it).
        if (data && isCurrentSchema(data)) {
            if (data.status === 'ready')
                return false; // current-schema ready → never regenerate here
            if (data.status === 'rejected' && !isRetryableRejected(data, nowMs))
                return false;
            if (data.status === 'pending') {
                const createdAtMs = Number(data.createdAtMs ?? 0);
                const stale = nowMs - createdAtMs > exports.LOCK_TTL_MS;
                if (!stale)
                    return false; // another request is actively generating
            }
        }
        tx.set(ref, {
            status: 'pending',
            schemaVersion: exports.EXPLAIN_SCHEMA_VERSION,
            // Clear a leftover reject reason (retry over a judge-rejected doc), so a later
            // `ready` merge does not keep a stale `reason` field around.
            reason: null,
            createdAtMs: nowMs,
            updatedAtMs: nowMs,
        }, { merge: true });
        return true;
    });
}
/** Publish a validated explanation to the global cache (status=ready). */
async function writeReadyExplanation(phraseHash, text, meta) {
    await docRef(phraseHash).set({
        status: 'ready',
        schemaVersion: exports.EXPLAIN_SCHEMA_VERSION,
        text,
        lang: meta.lang,
        phraseEn: meta.phraseEn,
        model: meta.model ?? null,
        updatedAtMs: Date.now(),
    }, { merge: true });
}
/** Mark a phrase rejected (judge or report threshold). Serves fallback; never regenerated
 *  automatically (prevents mass-report → expensive regen abuse). */
async function writeRejectedExplanation(phraseHash, reason) {
    await docRef(phraseHash).set({
        status: 'rejected',
        schemaVersion: exports.EXPLAIN_SCHEMA_VERSION,
        reason,
        updatedAtMs: Date.now(),
    }, { merge: true });
}
//# sourceMappingURL=explain_cache.js.map