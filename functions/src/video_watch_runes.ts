/**
 * Premium video-watch runes: 3 base runes per complete server-observed minute.
 *
 * The client starts one session, advances it with monotonic player-position
 * samples, then claims it on pause/close. Position deltas are clamped by the
 * server wall-clock between samples; idle, stalls, seeks and replay add zero.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolvePremiumAccess } from './premium_status';
import {
  commitStarOperations,
  normalizeStars,
  prepareStarOperations,
  STAR_OPERATIONS_COLLECTION,
  type StarOpRequest,
} from './stars_ledger';
import { applySuperSundayRuneMultiplier } from '../../modules/economy/super_sunday_runes';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const MAX_SESSION_MS = 180 * MINUTE_MS;

export const VIDEO_WATCH_RUNES_PER_MINUTE = 3;
/** 600 base runes = 200 rewarded minutes (3 h 20 min) per UTC day. */
export const VIDEO_WATCH_RUNES_DAILY_CAP = 600;

const DAILY_FIELD = 'videoWatchRunesDaily';
const SESSION_FIELD = 'videoWatchRuneSessionV1';
const CARRY_FIELD = 'videoWatchRuneCarryMsV1';
const ID_RE = /^[A-Za-z0-9_-]{12,96}$/;

type VideoWatchSession = Readonly<{
  sessionId: string;
  status: 'active' | 'claimed';
  startedAt: number;
  claimedAt?: number;
  requestId?: string;
  elapsedMs?: number;
  baseGranted?: number;
  walletGranted?: number;
  reason?: string;
  lastProgressAt?: number;
  lastPositionMs?: number;
  verifiedMs?: number;
  progressSeq?: number;
  lastProgressRequestId?: string;
  lastProgressCreditedMs?: number;
  maxCreditedPositionMs?: number;
}>;

function userMatchesAuth(
  stableId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  authUid: string,
): boolean {
  if (!data || data.identityHidden === true) return false;
  const canonicalStableId = typeof data.canonicalStableId === 'string' ? data.canonicalStableId.trim() : '';
  if (canonicalStableId && canonicalStableId !== stableId) return false;
  const linkedAuthUid = typeof data.firebaseAuthUid === 'string' ? data.firebaseAuthUid : '';
  return (linkedAuthUid && linkedAuthUid === authUid) || stableId === authUid;
}

export function utcDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function isoWeekKey(nowMs: number): string {
  const date = new Date(nowMs);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function readSession(raw: unknown): VideoWatchSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const sessionId = String(row.sessionId ?? '');
  const status = row.status === 'active' || row.status === 'claimed' ? row.status : null;
  const startedAt = Number(row.startedAt);
  if (!ID_RE.test(sessionId) || !status || !Number.isFinite(startedAt)) return null;
  return {
    sessionId,
    status,
    startedAt,
    ...(Number.isFinite(Number(row.claimedAt)) ? { claimedAt: Number(row.claimedAt) } : {}),
    ...(ID_RE.test(String(row.requestId ?? '')) ? { requestId: String(row.requestId) } : {}),
    ...(Number.isFinite(Number(row.elapsedMs)) ? { elapsedMs: Number(row.elapsedMs) } : {}),
    ...(Number.isFinite(Number(row.baseGranted)) ? { baseGranted: Number(row.baseGranted) } : {}),
    ...(Number.isFinite(Number(row.walletGranted)) ? { walletGranted: Number(row.walletGranted) } : {}),
    ...(typeof row.reason === 'string' ? { reason: row.reason } : {}),
    ...(Number.isFinite(Number(row.lastProgressAt)) ? { lastProgressAt: Number(row.lastProgressAt) } : {}),
    ...(Number.isFinite(Number(row.lastPositionMs)) ? { lastPositionMs: Number(row.lastPositionMs) } : {}),
    ...(Number.isFinite(Number(row.verifiedMs)) ? { verifiedMs: Number(row.verifiedMs) } : {}),
    ...(Number.isSafeInteger(Number(row.progressSeq)) ? { progressSeq: Number(row.progressSeq) } : {}),
    ...(ID_RE.test(String(row.lastProgressRequestId ?? '')) ? { lastProgressRequestId: String(row.lastProgressRequestId) } : {}),
    ...(Number.isFinite(Number(row.lastProgressCreditedMs)) ? { lastProgressCreditedMs: Number(row.lastProgressCreditedMs) } : {}),
    ...(Number.isFinite(Number(row.maxCreditedPositionMs)) ? { maxCreditedPositionMs: Number(row.maxCreditedPositionMs) } : {}),
  };
}

export function verifiedVideoWatchProgress(
  previousPositionMs: number | undefined,
  previousServerAtMs: number | undefined,
  positionMs: number,
  serverNowMs: number,
  maxCreditedPositionMs?: number,
): number {
  if (!Number.isFinite(previousPositionMs) || !Number.isFinite(previousServerAtMs)) return 0;
  const positionDelta = Math.floor(positionMs - Number(previousPositionMs));
  const wallDelta = Math.floor(serverNowMs - Number(previousServerAtMs));
  if (positionDelta <= 0 || wallDelta <= 0 || positionDelta > wallDelta + 2_000) return 0;
  const floor = Math.max(Number(previousPositionMs), Number(maxCreditedPositionMs) || Number(previousPositionMs));
  return Math.min(Math.max(0, Math.floor(positionMs - floor)), wallDelta);
}

export function grantableVideoWatchRunes(
  requestedMinutes: number,
  alreadyGrantedToday: number,
): number {
  if (!Number.isFinite(requestedMinutes) || requestedMinutes <= 0) return 0;
  const minutes = Math.min(Math.floor(requestedMinutes), MAX_SESSION_MS / MINUTE_MS);
  const wanted = minutes * VIDEO_WATCH_RUNES_PER_MINUTE;
  const left = Math.max(0, VIDEO_WATCH_RUNES_DAILY_CAP - Math.max(0, alreadyGrantedToday));
  return Math.min(wanted, left);
}

export function resolveVideoWatchRuneAward(
  requestedMinutes: number,
  alreadyConsumedBaseToday: number,
  awardedAtMs: number,
): Readonly<{ baseGranted: number; walletGranted: number }> {
  const baseGranted = grantableVideoWatchRunes(requestedMinutes, alreadyConsumedBaseToday);
  return Object.freeze({
    baseGranted,
    walletGranted: applySuperSundayRuneMultiplier(baseGranted, awardedAtMs),
  });
}

/** Server-clock accounting with a sub-minute carry shared across honest pauses. */
export function observedVideoWatchDuration(
  startedAtMs: number,
  claimedAtMs: number,
  priorCarryMs: number,
): Readonly<{ elapsedMs: number; completeMinutes: number; carryMs: number }> {
  const elapsedMs = Math.max(0, Math.min(MAX_SESSION_MS, claimedAtMs - startedAtMs));
  const carry = Math.max(0, Math.min(MINUTE_MS - 1, Math.floor(priorCarryMs) || 0));
  const total = elapsedMs + carry;
  return Object.freeze({
    elapsedMs,
    completeMinutes: Math.floor(total / MINUTE_MS),
    carryMs: total % MINUTE_MS,
  });
}

export function isExactVideoWatchReplay(
  receipt: Readonly<Record<string, unknown>> | undefined,
  input: Readonly<{ stableUid: string; requestId: string; sessionId?: string; minutes?: number }>,
): boolean {
  if (!receipt) return false;
  const meta = receipt.meta as Readonly<Record<string, unknown>> | undefined;
  const ruleVersion = Number(receipt.ruleVersion);
  const common = receipt.opId === `video_watch:${input.requestId}`
    && receipt.reason === 'video_watch'
    && receipt.sourceKind === 'video_watch'
    && receipt.sourceId === input.stableUid
    && Number.isSafeInteger(receipt.delta)
    && Number(receipt.delta) > 0
    && Number.isFinite(receipt.earnedAtMs)
    && meta?.requestId === input.requestId;
  if (!common) return false;
  if (ruleVersion === 4) return ID_RE.test(input.sessionId ?? '') && meta?.sessionId === input.sessionId;
  return (ruleVersion === 1 || ruleVersion === 2 || ruleVersion === 3)
    && Number.isFinite(input.minutes)
    && meta?.minutes === Math.floor(Number(input.minutes));
}

function currentStars(data: FirebaseFirestore.DocumentData | undefined) {
  return normalizeStars(data?.stars);
}

export const videoWatchRunesClaim = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const stableUid = String(request.data?.stableId ?? '').trim();
  const action = String(request.data?.action ?? '').trim();
  const sessionId = String(request.data?.sessionId ?? '').trim();
  const requestId = String(request.data?.requestId ?? '').trim();
  if (!stableUid) throw new HttpsError('invalid-argument', 'stable_id_required');
  if (!ID_RE.test(stableUid)) throw new HttpsError('invalid-argument', 'invalid_stable_id');
  if (action !== 'start' && action !== 'progress' && action !== 'claim') {
    throw new HttpsError('invalid-argument', 'session_action_required');
  }
  if (!ID_RE.test(sessionId)) throw new HttpsError('invalid-argument', 'invalid_session_id');
  if ((action === 'claim' || action === 'progress') && !ID_RE.test(requestId)) {
    throw new HttpsError('invalid-argument', 'invalid_request_id');
  }
  const positionMs = Number(request.data?.positionMs);
  const progressSeq = Number(request.data?.progressSeq);
  if (action === 'progress' && (!Number.isFinite(positionMs) || positionMs < 0)) {
    throw new HttpsError('invalid-argument', 'invalid_position');
  }
  if (action === 'progress' && (!Number.isSafeInteger(progressSeq) || progressSeq < 1)) {
    throw new HttpsError('invalid-argument', 'invalid_progress_seq');
  }

  const db = admin.firestore();
  const userRef = db.collection('users').doc(stableUid);
  const now = Date.now();
  const dayKey = utcDayKey(now);
  const opId = `video_watch:${requestId}`;

  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpsError('not-found', 'user_not_found');
    const data = userSnap.data();
    if (!userMatchesAuth(stableUid, data, request.auth!.uid)) {
      throw new HttpsError('permission-denied', 'user_does_not_match_auth');
    }

    const session = readSession(data?.[SESSION_FIELD]);
    const dailyRaw = (data?.[DAILY_FIELD] ?? {}) as { dayKey?: unknown; granted?: unknown };
    const sameDay = String(dailyRaw.dayKey ?? '') === dayKey;
    const grantedToday = sameDay ? Math.max(0, Number(dailyRaw.granted) || 0) : 0;

    const priorReceiptSnap = action === 'claim'
      ? await tx.get(userRef.collection(STAR_OPERATIONS_COLLECTION).doc(opId))
      : null;

    if (priorReceiptSnap?.exists) {
      if (!isExactVideoWatchReplay(priorReceiptSnap.data(), { stableUid, requestId, sessionId })) {
        throw new HttpsError('failed-precondition', 'op_conflict');
      }
      const stars = currentStars(data);
      return {
        ok: true,
        granted: 0,
        reason: 'already_applied',
        grantedToday,
        dailyCap: VIDEO_WATCH_RUNES_DAILY_CAP,
        stars: stars.balance,
        starsEarnedTotal: stars.earnedTotal,
        starsSeq: stars.seq,
      };
    }

    // A zero-award claim has no star-operation receipt. The claimed session is
    // its durable receipt, so a lost response cannot turn into a grant tomorrow.
    if (action === 'claim' && session?.status === 'claimed' && session.sessionId === sessionId) {
      if (session.requestId !== requestId) throw new HttpsError('failed-precondition', 'op_conflict');
      const stars = currentStars(data);
      return {
        ok: true,
        granted: 0,
        reason: session.reason ?? 'already_applied',
        grantedToday,
        dailyCap: VIDEO_WATCH_RUNES_DAILY_CAP,
        stars: stars.balance,
        starsEarnedTotal: stars.earnedTotal,
        starsSeq: stars.seq,
      };
    }

    const premiumOk = await resolvePremiumAccess(db, stableUid, now, request.auth!.uid, tx);
    if (!premiumOk) throw new HttpsError('permission-denied', 'premium_required');

    if (action === 'start') {
      if (session?.status === 'active' && session.sessionId === sessionId) {
        return {
          ok: true,
          granted: 0,
          reason: 'session_started',
          grantedToday,
          dailyCap: VIDEO_WATCH_RUNES_DAILY_CAP,
          carryMs: Math.max(0, Math.min(MINUTE_MS - 1, Number(data?.[CARRY_FIELD]) || 0)),
        };
      }
      tx.set(userRef, {
        [SESSION_FIELD]: {
          sessionId,
          status: 'active',
          startedAt: now,
          verifiedMs: 0,
          progressSeq: 0,
        },
      }, { merge: true });
      return {
        ok: true,
        granted: 0,
        reason: 'session_started',
        grantedToday,
        dailyCap: VIDEO_WATCH_RUNES_DAILY_CAP,
        carryMs: Math.max(0, Math.min(MINUTE_MS - 1, Number(data?.[CARRY_FIELD]) || 0)),
      };
    }

    if (action === 'progress') {
      if (!session || session.sessionId !== sessionId || session.status !== 'active') {
        throw new HttpsError('failed-precondition', 'watch_session_not_active');
      }
      if (session.lastProgressRequestId === requestId && session.progressSeq === progressSeq) {
        return {
          ok: true,
          reason: 'progress_replayed',
          creditedMs: session.lastProgressCreditedMs ?? 0,
          verifiedMs: session.verifiedMs ?? 0,
        };
      }
      if (progressSeq !== (session.progressSeq ?? 0) + 1) {
        throw new HttpsError('failed-precondition', 'progress_sequence_conflict');
      }
      const creditedMs = verifiedVideoWatchProgress(
        session.lastPositionMs,
        session.lastProgressAt,
        positionMs,
        now,
        session.maxCreditedPositionMs,
      );
      const verifiedMs = Math.min(MAX_SESSION_MS, Math.max(0, session.verifiedMs ?? 0) + creditedMs);
      tx.set(userRef, {
        [SESSION_FIELD]: {
          ...session,
          lastProgressAt: now,
          lastPositionMs: Math.floor(positionMs),
          verifiedMs,
          progressSeq,
          lastProgressRequestId: requestId,
          lastProgressCreditedMs: creditedMs,
          maxCreditedPositionMs: positionMs >= (session.lastPositionMs ?? positionMs)
            ? Math.max(session.maxCreditedPositionMs ?? 0, Math.floor(positionMs))
            : session.maxCreditedPositionMs ?? Math.floor(session.lastPositionMs ?? positionMs),
        },
      }, { merge: true });
      return { ok: true, reason: creditedMs > 0 ? 'progress_accepted' : 'progress_baseline', creditedMs, verifiedMs };
    }

    if (!session || session.sessionId !== sessionId || session.status !== 'active') {
      throw new HttpsError('failed-precondition', 'watch_session_not_active');
    }

    const duration = observedVideoWatchDuration(0, Math.max(0, session.verifiedMs ?? 0), Number(data?.[CARRY_FIELD]) || 0);
    const award = resolveVideoWatchRuneAward(duration.completeMinutes, grantedToday, now);
    const reason = duration.completeMinutes <= 0
      ? 'no_complete_minute'
      : award.baseGranted <= 0 ? 'daily_cap_reached' : 'granted';
    const claimedSession = {
      sessionId,
      status: 'claimed',
      startedAt: session.startedAt,
      claimedAt: now,
      requestId,
      elapsedMs: duration.elapsedMs,
      baseGranted: award.baseGranted,
      walletGranted: award.walletGranted,
      reason,
    } as const;

    if (award.baseGranted <= 0) {
      const stars = currentStars(data);
      tx.set(userRef, {
        [SESSION_FIELD]: claimedSession,
        [CARRY_FIELD]: duration.carryMs,
      }, { merge: true });
      return {
        ok: true,
        granted: 0,
        reason,
        grantedToday,
        dailyCap: VIDEO_WATCH_RUNES_DAILY_CAP,
        stars: stars.balance,
        starsEarnedTotal: stars.earnedTotal,
        starsSeq: stars.seq,
      };
    }

    const starOps: StarOpRequest[] = [{
      opId,
      delta: award.walletGranted,
      reason: 'video_watch',
      sourceKind: 'video_watch',
      sourceId: stableUid,
      ruleVersion: 4,
      earnedAtMs: now,
      meta: { requestId, sessionId, observedMinutes: duration.completeMinutes, elapsedMs: duration.elapsedMs },
    }];
    const prepared = await prepareStarOperations(tx, db, stableUid, userSnap, starOps, {
      nowMs: now,
      activeSeasonId: '',
      weekKeyNow: isoWeekKey(now),
      authUid: request.auth!.uid,
    });
    const applied = Math.max(0, prepared.outcomes[0]?.appliedDelta ?? 0);
    const appliedBase = applied === award.walletGranted ? award.baseGranted : 0;
    const committed = commitStarOperations(tx, prepared, {
      [DAILY_FIELD]: { dayKey, granted: grantedToday + appliedBase, updatedAt: now },
      [SESSION_FIELD]: claimedSession,
      [CARRY_FIELD]: duration.carryMs,
    });

    return {
      ok: true,
      granted: applied,
      reason: applied > 0 ? 'granted' : 'already_applied',
      grantedToday: grantedToday + appliedBase,
      dailyCap: VIDEO_WATCH_RUNES_DAILY_CAP,
      stars: committed.balance,
      starsEarnedTotal: committed.earnedTotal,
      starsSeq: committed.seq,
    };
  });
});
