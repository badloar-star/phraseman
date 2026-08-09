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

/**
 * Дневной кап платных генераций для FREE-юзера по конкретному джобу
 * ('choice' | 'quiz' | 'phrase' | 'mistake' | …). Считает ТОЛЬКО cache-miss
 * (платный путь) — чтение кэша остаётся бесплатным и безлимитным для всех.
 * Premium этот кап не проходит вовсе (вызывающий передаёт freeCap=null).
 */
export async function enforceFreeJobGenLimit(
  job: string,
  authUid: string,
  stableUid: string,
  cap: number,
  nowMs: number = Date.now(),
): Promise<void> {
  if (cap <= 0) return;
  const ref = admin.firestore().collection(USER_LIMIT_COLLECTION).doc(docId(`free_${job}`, authUid, stableUid));
  await admin.firestore().runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const resetAtMs = Number(data.resetAtMs ?? 0);
    const fresh = nowMs >= resetAtMs;
    const used = fresh ? 0 : Number(data.dailyCount ?? 0);
    if (used >= cap) {
      throw new HttpsError('resource-exhausted', 'explain_free_daily_limit');
    }
    tx.set(ref, {
      authUid,
      stableUid,
      job,
      dailyCount: used + 1,
      resetAtMs: fresh ? startOfNextUtcDay(nowMs) : resetAtMs,
      updatedAtMs: nowMs,
    }, { merge: true });
  });
}

function normalizeUsageId(value: unknown): string {
  return String(value ?? '').trim().slice(0, 96);
}

async function refundFreeJobGenLimit(
  job: string,
  authUid: string,
  stableUid: string,
  nowMs: number,
  usageId?: string,
): Promise<void> {
  const ref = admin.firestore().collection(USER_LIMIT_COLLECTION).doc(docId(`free_${job}`, authUid, stableUid));
  await admin.firestore().runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const resetAtMs = Number(data.resetAtMs ?? 0);
    // A late provider response may finish after UTC midnight. Never decrement the
    // next day's counter while refunding a reservation made on the previous day.
    if (resetAtMs !== startOfNextUtcDay(nowMs)) return;
    const current = Number(data.dailyCount ?? 0);
    const normalizedId = normalizeUsageId(usageId);
    const usageIds = Array.isArray(data.usageIds)
      ? data.usageIds.map((value: unknown) => normalizeUsageId(value)).filter(Boolean)
      : [];
    tx.set(ref, {
      dailyCount: Math.max(0, current - 1),
      ...(normalizedId ? { usageIds: usageIds.filter((id: string) => id !== normalizedId) } : {}),
      updatedAtMs: Date.now(),
    }, { merge: true });
  });
}

/**
 * A refundable reservation of one user-visible Free use.
 *
 * The product cap measures explanations the learner actually receives. Callers
 * reserve atomically before cache/generation work, commit by simply keeping the
 * reservation after a successful response, and refund every path that produces
 * no usable explanation (provider/validator failure, pending lock, kill switch,
 * budget breaker, persistence failure, etc.).
 */
export interface FreeJobUsageReservation {
  job: string;
  authUid: string;
  stableUid: string;
  nowMs: number;
  reserved: boolean;
  /** Stable across retries of one UI action; prevents timeout-after-success double charging. */
  usageId?: string;
  /** true when this logical action had already been committed by an earlier server attempt. */
  alreadyCounted: boolean;
}

export async function reserveFreeJobUsage(
  job: string,
  authUid: string,
  stableUid: string,
  cap: number,
  nowMs: number = Date.now(),
  usageId?: string,
): Promise<FreeJobUsageReservation> {
  const normalizedId = normalizeUsageId(usageId);
  if (cap <= 0) {
    return { job, authUid, stableUid, nowMs, reserved: false, usageId: normalizedId || undefined, alreadyCounted: false };
  }

  const ref = admin.firestore().collection(USER_LIMIT_COLLECTION).doc(docId(`free_${job}`, authUid, stableUid));
  let reserved = false;
  let alreadyCounted = false;
  await admin.firestore().runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const resetAtMs = Number(data.resetAtMs ?? 0);
    const fresh = nowMs >= resetAtMs;
    const used = fresh ? 0 : Number(data.dailyCount ?? 0);
    const usageIds = fresh || !Array.isArray(data.usageIds)
      ? []
      : data.usageIds.map((value: unknown) => normalizeUsageId(value)).filter(Boolean);

    // Same UI action may reach the callable again after a client timeout even
    // though the first invocation already produced a usable answer. It is one
    // explanation, not another daily use.
    if (normalizedId && usageIds.includes(normalizedId)) {
      alreadyCounted = true;
      return;
    }
    if (used >= cap) {
      throw new HttpsError('resource-exhausted', 'explain_free_daily_limit');
    }

    const nextUsageIds = normalizedId
      ? [...usageIds.filter((id: string) => id !== normalizedId), normalizedId].slice(-100)
      : usageIds;
    tx.set(ref, {
      authUid,
      stableUid,
      job,
      dailyCount: used + 1,
      usageIds: nextUsageIds,
      resetAtMs: fresh ? startOfNextUtcDay(nowMs) : resetAtMs,
      updatedAtMs: nowMs,
    }, { merge: true });
    reserved = true;
  });

  return {
    job,
    authUid,
    stableUid,
    nowMs,
    reserved,
    usageId: normalizedId || undefined,
    alreadyCounted,
  };
}

/** Idempotently returns a reserved Free use. Refund failures are logged, never surfaced to users. */
export async function refundFreeJobUsageReservation(
  reservation: FreeJobUsageReservation | null | undefined,
  reason: string,
): Promise<void> {
  if (!reservation?.reserved) return;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await refundFreeJobGenLimit(
        reservation.job,
        reservation.authUid,
        reservation.stableUid,
        reservation.nowMs,
        reservation.usageId,
      );
      reservation.reserved = false;
      return;
    } catch (error) {
      lastError = error;
    }
  }
  console.error('explain free usage refund failed', reason, lastError);
}

/** Free-кап генераций для одного джоба: null → кап не применяется (premium). */
export interface ExplainFreeCap {
  job: string;
  cap: number;
}

export interface ExplainBudgetReservation {
  authUid: string;
  stableUid: string;
  globalCap: number;
  nowMs: number;
  userReserved: boolean;
  globalReserved: boolean;
  freeCap?: ExplainFreeCap | null;
  freeReserved?: boolean;
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

/** Global-only wallet reservation for surfaces whose paid entitlement is unlimited per user. */
export interface GlobalExplainBudgetReservation {
  cap: number;
  nowMs: number;
  reserved: boolean;
}

export async function reserveGlobalExplainBudget(
  cap: number = GLOBAL_DAILY_CAP,
  nowMs: number = Date.now(),
): Promise<GlobalExplainBudgetReservation> {
  await enforceGlobalBudget(cap, nowMs);
  return { cap, nowMs, reserved: cap > 0 };
}

/** Idempotently returns a global-only reservation when no provider generation happened. */
export async function refundGlobalExplainBudgetReservation(
  reservation: GlobalExplainBudgetReservation | null | undefined,
  reason: string,
): Promise<void> {
  if (!reservation?.reserved) return;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await refundGlobalBudget(reservation.cap, reservation.nowMs);
      reservation.reserved = false;
      return;
    } catch (error) {
      lastError = error;
    }
  }
  console.error('explain global budget refund failed', reason, lastError);
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
  freeCap: ExplainFreeCap | null = null,
): Promise<ExplainBudgetReservation> {
  const reservation: ExplainBudgetReservation = {
    authUid,
    stableUid,
    globalCap,
    nowMs,
    userReserved: false,
    globalReserved: false,
    freeCap,
    freeReserved: false,
  };

  try {
    // Free-кап джоба ПЕРВЫМ: он самый узкий, и не должен тратить общие счётчики.
    if (freeCap) {
      await enforceFreeJobGenLimit(freeCap.job, authUid, stableUid, freeCap.cap, nowMs);
      reservation.freeReserved = freeCap.cap > 0;
    }
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
    if (reservation.freeReserved && !reservation.userReserved) {
      await refundFreeJobGenLimit(freeCap!.job, authUid, stableUid, nowMs)
        .catch((refundErr) => console.error('explain budget free refund failed', refundErr));
      reservation.freeReserved = false;
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
  if (reservation.freeReserved && reservation.freeCap) {
    await refundFreeJobGenLimit(reservation.freeCap.job, reservation.authUid, reservation.stableUid, reservation.nowMs)
      .catch((err) => failures.push(err));
  }
  if (failures.length > 0) {
    console.error('explain budget refund failed', reason, failures);
  }
}
