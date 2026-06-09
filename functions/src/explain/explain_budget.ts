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
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { createHash } from 'crypto';

export const USER_LIMIT_COLLECTION = 'explain_user_limits';
export const GLOBAL_BUDGET_COLLECTION = 'explain_global_budget';

/** Per-user new generations per UTC day. Free-for-all feature → moderate ceiling: allows
 *  casual use, blocks single-account spam-DoS. */
export const USER_DAILY_GEN_CAP = 20;

/** New phrases generated per UTC day across the WHOLE product. At ~230 tokens/miss this is
 *  ~$0.02 per 100 misses; daily reset = circuit breaker against a viral spike. */
export const GLOBAL_DAILY_CAP = 100;

/** sha256 doc id, same shape as premium_dialog.docId(). */
function docId(prefix: string, authUid: string, stableUid: string): string {
  const hash = createHash('sha256').update(`${prefix}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
  return `${prefix}_${hash}`;
}

/** Start of the next UTC day in ms — identical to premium_dialog, so resets align app-wide. */
function startOfNextUtcDay(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}

/** UTC date key (YYYY-MM-DD) for the global budget doc. */
function utcDateKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/**
 * Per-user daily generation limiter. Atomic check+increment. Throws resource-exhausted when the
 * user has already consumed USER_DAILY_GEN_CAP generations this UTC day.
 */
export async function enforceUserGenLimit(authUid: string, stableUid: string, nowMs: number = Date.now()): Promise<void> {
  const ref = admin.firestore().collection(USER_LIMIT_COLLECTION).doc(docId('gen', authUid, stableUid));
  await admin.firestore().runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const resetAtMs = Number(data.resetAtMs ?? 0);
    const fresh = nowMs >= resetAtMs;
    const used = fresh ? 0 : Number(data.dailyCount ?? 0);
    if (used >= USER_DAILY_GEN_CAP) {
      throw new HttpsError('resource-exhausted', 'explain_user_daily_limit');
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
export async function enforceGlobalBudget(nowMs: number = Date.now()): Promise<void> {
  const ref = admin.firestore().collection(GLOBAL_BUDGET_COLLECTION).doc(utcDateKey(nowMs));
  await admin.firestore().runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const genCount = Number(data.genCount ?? 0);
    if (genCount >= GLOBAL_DAILY_CAP) {
      throw new HttpsError('resource-exhausted', 'explain_global_budget');
    }
    tx.set(ref, {
      genCount: genCount + 1,
      updatedAtMs: nowMs,
    }, { merge: true });
  });
}
