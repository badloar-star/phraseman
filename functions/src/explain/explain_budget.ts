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

/** Per-user new generations per UTC day. Raised 20→50 (2026-06-10): post-answer use is
 *  positioned as "unlimited", so the per-user cap must be high enough that a real learner never
 *  hits it in a day; it still blocks single-account spam-DoS. Cache reads stay free & unlimited —
 *  this only counts cache MISSES (the paid path). */
export const USER_DAILY_GEN_CAP = 50;

/** New phrases generated per UTC day across the WHOLE product. Raised 100→3000 (2026-06-10):
 *  the cache was just invalidated (schema v2) so for a while EVERY phrase is a fresh miss — a cap of
 *  100 would push everyone past the ~100th distinct phrase onto the fallback. At ~230 tokens/miss,
 *  3000 misses ≈ $0.60/day worst case; daily reset = circuit breaker against a viral spike. As the
 *  cache re-warms, real daily misses fall well below this. */
export const GLOBAL_DAILY_CAP = 3000;

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
export async function enforceGlobalBudget(cap: number = GLOBAL_DAILY_CAP, nowMs: number = Date.now()): Promise<void> {
  // cap=0 → глобального дневного капа нет (админ может снять ограничение).
  if (cap <= 0) return;
  const ref = admin.firestore().collection(GLOBAL_BUDGET_COLLECTION).doc(utcDateKey(nowMs));
  await admin.firestore().runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const genCount = Number(data.genCount ?? 0);
    if (genCount >= cap) {
      throw new HttpsError('resource-exhausted', 'explain_global_budget');
    }
    tx.set(ref, {
      genCount: genCount + 1,
      updatedAtMs: nowMs,
    }, { merge: true });
  });
}

export interface ExplainBudgetReservation {
  authUid: string;
  stableUid: string;
  globalCap: number;
  nowMs: number;
  userReserved: boolean;
  globalReserved: boolean;
}

async function refundUserGenLimit(authUid: string, stableUid: string, nowMs: number): Promise<void> {
  const ref = admin.firestore().collection(USER_LIMIT_COLLECTION).doc(docId('gen', authUid, stableUid));
  await admin.firestore().runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const resetAtMs = Number(data.resetAtMs ?? 0);
    const fresh = nowMs >= resetAtMs;
    const current = fresh ? 0 : Number(data.dailyCount ?? 0);
    tx.set(ref, {
      dailyCount: Math.max(0, current - 1),
      updatedAtMs: nowMs,
    }, { merge: true });
  });
}

async function refundGlobalBudget(cap: number, nowMs: number): Promise<void> {
  if (cap <= 0) return;
  const ref = admin.firestore().collection(GLOBAL_BUDGET_COLLECTION).doc(utcDateKey(nowMs));
  await admin.firestore().runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const current = Number(data.genCount ?? 0);
    tx.set(ref, {
      genCount: Math.max(0, current - 1),
      updatedAtMs: nowMs,
    }, { merge: true });
  });
}

/**
 * Reserves both user and global generation budget for a cache miss. If the
 * global breaker fails after the user counter increments, the user counter is
 * refunded immediately so a wallet-wide cap does not consume personal quota.
 */
export async function reserveExplainBudget(
  authUid: string,
  stableUid: string,
  globalCap: number = GLOBAL_DAILY_CAP,
  nowMs: number = Date.now(),
): Promise<ExplainBudgetReservation> {
  const reservation: ExplainBudgetReservation = {
    authUid,
    stableUid,
    globalCap,
    nowMs,
    userReserved: false,
    globalReserved: false,
  };

  try {
    await enforceUserGenLimit(authUid, stableUid, nowMs);
    reservation.userReserved = true;
    await enforceGlobalBudget(globalCap, nowMs);
    reservation.globalReserved = globalCap > 0;
    return reservation;
  } catch (err) {
    if (reservation.userReserved && !reservation.globalReserved) {
      await refundUserGenLimit(authUid, stableUid, nowMs)
        .catch((refundErr) => console.error('explain budget user refund failed', refundErr));
      reservation.userReserved = false;
    }
    throw err;
  }
}

/**
 * Returns reserved budget when no generation happened, for example a lost cache
 * lock race or an OpenAI provider failure before a usable response.
 */
export async function refundExplainBudgetReservation(
  reservation: ExplainBudgetReservation | null | undefined,
  reason: string,
): Promise<void> {
  if (!reservation) return;
  const failures: unknown[] = [];
  if (reservation.globalReserved) {
    await refundGlobalBudget(reservation.globalCap, reservation.nowMs)
      .catch((err) => failures.push(err));
  }
  if (reservation.userReserved) {
    await refundUserGenLimit(reservation.authUid, reservation.stableUid, reservation.nowMs)
      .catch((err) => failures.push(err));
  }
  if (failures.length > 0) {
    console.error('explain budget refund failed', reason, failures);
  }
}
