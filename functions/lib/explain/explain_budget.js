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
exports.GLOBAL_DAILY_CAP = exports.USER_DAILY_GEN_CAP = exports.GLOBAL_BUDGET_COLLECTION = exports.USER_LIMIT_COLLECTION = void 0;
exports.enforceUserGenLimit = enforceUserGenLimit;
exports.enforceGlobalBudget = enforceGlobalBudget;
/**
 * Cost guards for "Explain like I'm five":
 *  - enforceUserGenLimit: per-user daily GENERATION cap (cache reads are free & unlimited;
 *    this only limits cache MISSES, i.e. the paid path).
 *  - enforceGlobalBudget: product-wide daily breaker — protects the wallet from a viral spike.
 *
 * Both do an ATOMIC check-and-increment inside a Firestore transaction (mirrors
 * premium_dialog.enforceDailyQuota), so concurrent calls cannot bypass the cap by both passing
 * the check before either increments. `now` is injected for deterministic UTC-day tests.
 *
 * ORDER (enforced by the CF, plan 02): per-user FIRST, then global — so an abuser hits their own
 * cap before they can spin the shared budget counter.
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const crypto_1 = require("crypto");
exports.USER_LIMIT_COLLECTION = 'explain_user_limits';
exports.GLOBAL_BUDGET_COLLECTION = 'explain_global_budget';
/** Per-user new generations per UTC day. Raised 20→50 (2026-06-10): post-answer use is
 *  positioned as "unlimited", so the per-user cap must be high enough that a real learner never
 *  hits it in a day; it still blocks single-account spam-DoS. Cache reads stay free & unlimited —
 *  this only counts cache MISSES (the paid path). */
exports.USER_DAILY_GEN_CAP = 50;
/** New phrases generated per UTC day across the WHOLE product. Raised 100→3000 (2026-06-10):
 *  the cache was just invalidated (schema v2) so for a while EVERY phrase is a fresh miss — a cap of
 *  100 would push everyone past the ~100th distinct phrase onto the fallback. At ~230 tokens/miss,
 *  3000 misses ≈ $0.60/day worst case; daily reset = circuit breaker against a viral spike. As the
 *  cache re-warms, real daily misses fall well below this. */
exports.GLOBAL_DAILY_CAP = 3000;
/** sha256 doc id, same shape as premium_dialog.docId(). */
function docId(prefix, authUid, stableUid) {
    const hash = (0, crypto_1.createHash)('sha256').update(`${prefix}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
    return `${prefix}_${hash}`;
}
/** Start of the next UTC day in ms — identical to premium_dialog, so resets align app-wide. */
function startOfNextUtcDay(nowMs) {
    const d = new Date(nowMs);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}
/** UTC date key (YYYY-MM-DD) for the global budget doc. */
function utcDateKey(nowMs) {
    return new Date(nowMs).toISOString().slice(0, 10);
}
/**
 * Per-user daily generation limiter. Atomic check+increment. Throws resource-exhausted when the
 * user has already consumed USER_DAILY_GEN_CAP generations this UTC day.
 */
async function enforceUserGenLimit(authUid, stableUid, nowMs = Date.now()) {
    const ref = admin.firestore().collection(exports.USER_LIMIT_COLLECTION).doc(docId('gen', authUid, stableUid));
    await admin.firestore().runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data() ?? {};
        const resetAtMs = Number(data.resetAtMs ?? 0);
        const fresh = nowMs >= resetAtMs;
        const used = fresh ? 0 : Number(data.dailyCount ?? 0);
        if (used >= exports.USER_DAILY_GEN_CAP) {
            throw new https_1.HttpsError('resource-exhausted', 'explain_user_daily_limit');
        }
        tx.set(ref, {
            authUid,
            stableUid,
            dailyCount: used + 1,
            resetAtMs: fresh ? startOfNextUtcDay(nowMs) : resetAtMs,
            updatedAtMs: nowMs,
        }, { merge: true });
    });
}
/**
 * Product-wide daily budget breaker. Atomic check+increment on explain_global_budget/{YYYY-MM-DD}.
 * Throws resource-exhausted once the day's generation count would exceed GLOBAL_DAILY_CAP.
 * (Read-then-throw-else-increment inside one tx — NOT increment-then-read, which races.)
 */
async function enforceGlobalBudget(nowMs = Date.now()) {
    const ref = admin.firestore().collection(exports.GLOBAL_BUDGET_COLLECTION).doc(utcDateKey(nowMs));
    await admin.firestore().runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data() ?? {};
        const genCount = Number(data.genCount ?? 0);
        if (genCount >= exports.GLOBAL_DAILY_CAP) {
            throw new https_1.HttpsError('resource-exhausted', 'explain_global_budget');
        }
        tx.set(ref, {
            genCount: genCount + 1,
            updatedAtMs: nowMs,
        }, { merge: true });
    });
}
//# sourceMappingURL=explain_budget.js.map