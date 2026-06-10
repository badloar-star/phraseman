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
exports.EXPLAIN_SCHEMA_VERSION = exports.LOCK_TTL_MS = exports.EXPLAIN_COLLECTION = void 0;
exports.normalizePhrase = normalizePhrase;
exports.phraseHashFor = phraseHashFor;
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
/** Cache doc schema version — lets a future ai_content migration version-check on read. */
exports.EXPLAIN_SCHEMA_VERSION = 1;
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
/** Deterministic 40-hex cache id for a phrase. */
function phraseHashFor(phraseEn) {
    return (0, crypto_1.createHash)('sha256').update(normalizePhrase(phraseEn)).digest('hex').slice(0, 40);
}
function docRef(phraseHash) {
    return admin.firestore().collection(exports.EXPLAIN_COLLECTION).doc(phraseHash);
}
/** Read the cached doc, or null if absent. */
async function readCachedExplanation(phraseHash) {
    const snap = await docRef(phraseHash).get();
    const data = snap.data();
    if (!data)
        return null;
    return data;
}
/**
 * Try to claim the generation lock in a transaction.
 * Returns true (caller should generate) iff the doc is absent OR is a STALE pending
 * (now - createdAtMs > LOCK_TTL_MS). Returns false for ready / rejected / fresh-pending
 * (caller serves cache or fallback). Writes createdAtMs so staleness is computable.
 */
async function claimPendingLock(phraseHash, nowMs) {
    const ref = docRef(phraseHash);
    const db = admin.firestore();
    return db.runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data();
        if (data) {
            if (data.status !== 'pending')
                return false; // ready or rejected → don't regenerate
            const createdAtMs = Number(data.createdAtMs ?? 0);
            const stale = nowMs - createdAtMs > exports.LOCK_TTL_MS;
            if (!stale)
                return false; // another request is actively generating
        }
        tx.set(ref, {
            status: 'pending',
            schemaVersion: exports.EXPLAIN_SCHEMA_VERSION,
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