import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { LEARNING_V2_COURSE_SESSION_COUNT_V1 } from '../../modules/learning-v2/content/course_topology_v1';
import { resolveStableUidForAuth } from './auth_identity';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
const ENTITLEMENTS_FIELD = 'premium_theme_entitlements_v1';
const VIDEO_COLLECTION = 'premium_theme_video_watch';
const FINAL_COIN_RANK = 19;
const FINAL_SPIRE_TIER = 11;
const STREAK_DAYS = 365;
const VIDEO_TARGET_SECONDS = 200 * 60 * 60;
const VIDEO_PREFETCH_SECONDS = 180 * 60 * 60;
const VIDEO_MAX_CHECKPOINT_SECONDS = 60;
const VIDEO_MIN_WALL_SECONDS = 40;
const COURSE_PREFETCH_COUNT = LEARNING_V2_COURSE_SESSION_COUNT_V1 - 16;

export const PREMIUM_THEME_BY_CONDITION = Object.freeze({
  plus_purchase: 'grad_full_olive',
  final_coin_rank: 'grad_full_ref_signal_lime',
  streak_365: 'grad_full_ref_storm_violet',
  final_spire: 'grad_full_titanium',
  video_200_hours: 'grad_full_horizon',
  learning_v2_complete: 'grad_full_ref_gravity_blue',
} as const);

export type PremiumThemeCondition = keyof typeof PREMIUM_THEME_BY_CONDITION;
type Entitlements = Readonly<Record<string, number>>;
type PremiumThemeFacts = Readonly<{
  premiumPurchased: boolean;
  progress: Record<string, unknown>;
  stableUid: string;
  spireTiers: unknown;
  videoSeconds: number;
}>;
type PremiumThemeProgressUnit = 'purchase' | 'rank' | 'days' | 'tier' | 'hours' | 'sessions';
type PremiumThemeProgress = Readonly<{ current: number; target: number; unit: PremiumThemeProgressUnit }>;
type PremiumThemeProgressByCondition = Readonly<Record<PremiumThemeCondition, PremiumThemeProgress>>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function cleanEntitlements(value: unknown): Entitlements {
  const out: Record<string, number> = {};
  const allowed = new Set(Object.values(PREMIUM_THEME_BY_CONDITION));
  for (const [themeId, rawAt] of Object.entries(record(value))) {
    const atMs = Number(rawAt);
    if (allowed.has(themeId as never) && Number.isSafeInteger(atMs) && atMs > 0) out[themeId] = atMs;
  }
  return Object.freeze(out);
}

function condition(value: unknown): PremiumThemeCondition {
  if (typeof value !== 'string' || !(value in PREMIUM_THEME_BY_CONDITION)) {
    throw new HttpsError('invalid-argument', 'premium_theme_condition_invalid');
  }
  return value as PremiumThemeCondition;
}

function coinRank(progress: Record<string, unknown>, stableUid: string): number {
  const raw = progress[`coin_rank_v1:${encodeURIComponent(stableUid)}`];
  if (typeof raw !== 'string') return 0;
  try {
    const parsed = JSON.parse(raw) as { ownerStableId?: unknown; rank?: unknown };
    return parsed.ownerStableId === stableUid && Number.isInteger(parsed.rank) ? Number(parsed.rank) : 0;
  } catch { return 0; }
}

function numericProgress(progress: Record<string, unknown>, key: string): number {
  const value = Number(progress[key]);
  return Number.isFinite(value) ? value : 0;
}

function maxSpireTier(value: unknown): number {
  return Math.max(-1, ...Object.values(record(value)).map((tier) => Number(tier)).filter(Number.isFinite));
}

function truthy(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || String(value ?? '').trim().toLowerCase() === 'true';
}

function hasVerifiedPlusPurchase(progress: Record<string, unknown>): boolean {
  // Эти поля записывает только серверная RevenueCat-проекция. Временный intro,
  // подарок, промокод и admin/VIP не считаются покупкой Plus.
  if (truthy(progress.had_premium_ever)) return true;
  const productId = String(progress.premium_rc_product_id ?? '').trim();
  const purchasedAtMs = Number(progress.premium_rc_purchased_at_ms);
  return productId.length > 0 && Number.isSafeInteger(purchasedAtMs) && purchasedAtMs > 0;
}

export function premiumThemeConditionSatisfied(input: Readonly<{
  condition: PremiumThemeCondition;
  premiumPurchased: boolean;
  progress: Record<string, unknown>;
  stableUid: string;
  spireTiers: unknown;
  videoSeconds: number;
}>): boolean {
  switch (input.condition) {
    // зачем (слово владельца 25.10: «те что Кодекс добавил, там у каждой есть условия, и они должны быть»): Оливковая открывается проверенной покупкой Plus, как в пакете Codex
    case 'plus_purchase': return input.premiumPurchased;
    case 'final_coin_rank': return coinRank(input.progress, input.stableUid) >= FINAL_COIN_RANK;
    case 'streak_365': return numericProgress(input.progress, 'streak_count') >= STREAK_DAYS;
    case 'final_spire': return maxSpireTier(input.spireTiers) >= FINAL_SPIRE_TIER;
    case 'video_200_hours': return input.videoSeconds >= VIDEO_TARGET_SECONDS;
    case 'learning_v2_complete': return numericProgress(input.progress, 'learning_v2_course_progress_sync_v1') >= LEARNING_V2_COURSE_SESSION_COUNT_V1;
    default: return false;
  }
}

function nearUnlockConditions(facts: PremiumThemeFacts): readonly PremiumThemeCondition[] {
  const out: PremiumThemeCondition[] = [];
  if (coinRank(facts.progress, facts.stableUid) >= FINAL_COIN_RANK - 1) out.push('final_coin_rank');
  if (numericProgress(facts.progress, 'streak_count') >= 350) out.push('streak_365');
  if (maxSpireTier(facts.spireTiers) >= FINAL_SPIRE_TIER - 1) out.push('final_spire');
  if (facts.videoSeconds >= VIDEO_PREFETCH_SECONDS) out.push('video_200_hours');
  if (numericProgress(facts.progress, 'learning_v2_course_progress_sync_v1') >= COURSE_PREFETCH_COUNT) out.push('learning_v2_complete');
  return Object.freeze(out);
}

function boundedProgress(rawCurrent: number, target: number, unit: PremiumThemeProgressUnit): PremiumThemeProgress {
  const finite = Number.isFinite(rawCurrent) ? Math.floor(rawCurrent) : 0;
  return Object.freeze({ current: Math.min(target, Math.max(0, finite)), target, unit });
}

/**
 * Авторитетные счётчики для UI закрытых тем. Значения берутся из тех же
 * серверных фактов, которыми выдаётся entitlement, поэтому клиент не может
 * нарисовать себе более высокий прогресс локальной записью.
 */
function progressByCondition(facts: PremiumThemeFacts): PremiumThemeProgressByCondition {
  return Object.freeze({
    plus_purchase: boundedProgress(facts.premiumPurchased ? 1 : 0, 1, 'purchase'),
    final_coin_rank: boundedProgress(coinRank(facts.progress, facts.stableUid), FINAL_COIN_RANK, 'rank'),
    streak_365: boundedProgress(numericProgress(facts.progress, 'streak_count'), STREAK_DAYS, 'days'),
    final_spire: boundedProgress(maxSpireTier(facts.spireTiers), FINAL_SPIRE_TIER, 'tier'),
    video_200_hours: boundedProgress(Math.floor(facts.videoSeconds / 3600), VIDEO_TARGET_SECONDS / 3600, 'hours'),
    learning_v2_complete: boundedProgress(
      numericProgress(facts.progress, 'learning_v2_course_progress_sync_v1'),
      LEARNING_V2_COURSE_SESSION_COUNT_V1,
      'sessions',
    ),
  });
}

async function identity(request: Readonly<{ auth?: Readonly<{ uid?: string }> }>): Promise<{ db: FirebaseFirestore.Firestore; authUid: string; stableUid: string }> {
  const authUid = String(request.auth?.uid ?? '').trim();
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid, undefined, { repairLinks: false, requireKnownIdentity: true });
  return { db, authUid, stableUid };
}

const CALLABLE = Object.freeze({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 15, memory: '256MiB' as const });

async function readFacts(db: FirebaseFirestore.Firestore, stableUid: string): Promise<Readonly<{
  userRef: FirebaseFirestore.DocumentReference;
  entitlements: Entitlements;
  facts: PremiumThemeFacts;
}>> {
  const userRef = db.collection('users').doc(stableUid);
  const [userSnap, leaderboardSnap, videoSnap] = await Promise.all([
    userRef.get(),
    db.collection('leaderboard').doc(stableUid).get(),
    db.collection(VIDEO_COLLECTION).doc(stableUid).get(),
  ]);
  if (!userSnap.exists) throw new HttpsError('not-found', 'user_not_found');
  const progress = record(userSnap.data()?.progress);
  const facts: PremiumThemeFacts = Object.freeze({
    premiumPurchased: hasVerifiedPlusPurchase(progress),
    progress,
    stableUid,
    spireTiers: leaderboardSnap.data()?.spireTiers,
    videoSeconds: Math.max(0, Math.floor(Number(videoSnap.data()?.totalSeconds) || 0)),
  });
  return Object.freeze({ userRef, entitlements: cleanEntitlements(progress[ENTITLEMENTS_FIELD]), facts });
}

async function grantEligibleThemes(
  db: FirebaseFirestore.Firestore,
  userRef: FirebaseFirestore.DocumentReference,
  facts: PremiumThemeFacts,
  requested?: PremiumThemeCondition,
): Promise<Readonly<{ entitlements: Entitlements; newlyGranted: readonly string[] }>> {
  const eligible = (Object.keys(PREMIUM_THEME_BY_CONDITION) as PremiumThemeCondition[])
    .filter((entry) => (!requested || entry === requested) && premiumThemeConditionSatisfied({ condition: entry, ...facts }));
  if (eligible.length === 0) return Object.freeze({ entitlements: cleanEntitlements(facts.progress[ENTITLEMENTS_FIELD]), newlyGranted: Object.freeze([]) });
  return db.runTransaction(async (tx) => {
    const fresh = await tx.get(userRef);
    if (!fresh.exists) throw new HttpsError('not-found', 'user_not_found');
    const current = cleanEntitlements(record(fresh.data()?.progress)[ENTITLEMENTS_FIELD]);
    const next: Record<string, number> = { ...current };
    const newlyGranted: string[] = [];
    const nowMs = Date.now();
    for (const conditionId of eligible) {
      const themeId = PREMIUM_THEME_BY_CONDITION[conditionId];
      if (next[themeId]) continue;
      next[themeId] = nowMs;
      newlyGranted.push(themeId);
    }
    if (newlyGranted.length > 0) tx.update(userRef, { [`progress.${ENTITLEMENTS_FIELD}`]: next });
    return Object.freeze({ entitlements: Object.freeze(next), newlyGranted: Object.freeze(newlyGranted) });
  });
}

export const premiumThemeEntitlementsGet = onCall(CALLABLE, async (request) => {
  const { db, stableUid } = await identity(request);
  const { userRef, facts } = await readFacts(db, stableUid);
  const refreshed = await grantEligibleThemes(db, userRef, facts);
  return {
    schemaVersion: 'premium-theme-entitlements.v1',
    entitlements: refreshed.entitlements,
    newlyGranted: refreshed.newlyGranted,
    nearUnlockConditions: nearUnlockConditions(facts),
    progressByCondition: progressByCondition(facts),
  };
});

export const premiumThemeConditionClaim = onCall(CALLABLE, async (request) => {
  const requested = condition(request.data?.condition);
  const { db, stableUid } = await identity(request);
  const { userRef, entitlements: before, facts } = await readFacts(db, stableUid);
  const eligible = premiumThemeConditionSatisfied({ condition: requested, ...facts });
  if (!eligible) {
    return {
      schemaVersion: 'premium-theme-claim.v1', granted: false, condition: requested,
      entitlements: before, progressByCondition: progressByCondition(facts),
    };
  }
  const themeId = PREMIUM_THEME_BY_CONDITION[requested];
  const refreshed = await grantEligibleThemes(db, userRef, facts, requested);
  return {
    schemaVersion: 'premium-theme-claim.v1', granted: refreshed.newlyGranted.includes(themeId),
    condition: requested, themeId, entitlements: refreshed.entitlements,
    progressByCondition: progressByCondition(facts),
  };
});

export const premiumThemeVideoWatchReport = onCall(CALLABLE, async (request) => {
  const mode = request.data?.mode;
  const sessionId = typeof request.data?.sessionId === 'string' ? request.data.sessionId.trim() : '';
  if ((mode !== 'start' && mode !== 'checkpoint') || !/^[a-zA-Z0-9_-]{12,80}$/.test(sessionId)) {
    throw new HttpsError('invalid-argument', 'premium_theme_video_report_invalid');
  }
  const { db, stableUid } = await identity(request);
  const ref = db.collection(VIDEO_COLLECTION).doc(stableUid);
  const nowMs = Date.now();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = record(snap.data());
    const totalSeconds = Math.max(0, Math.floor(Number(data.totalSeconds) || 0));
    if (mode === 'start') {
      tx.set(ref, { stableUid, totalSeconds, activeSessionId: sessionId, lastHeartbeatAtMs: nowMs, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return { acceptedSeconds: 0, totalSeconds, prefetchEligible: totalSeconds >= VIDEO_PREFETCH_SECONDS, unlockEligible: totalSeconds >= VIDEO_TARGET_SECONDS };
    }
    if (data.activeSessionId !== sessionId) throw new HttpsError('failed-precondition', 'premium_theme_video_session_mismatch');
    const elapsedSeconds = Math.floor((nowMs - Number(data.lastHeartbeatAtMs || 0)) / 1000);
    const acceptedSeconds = elapsedSeconds >= VIDEO_MIN_WALL_SECONDS ? Math.min(VIDEO_MAX_CHECKPOINT_SECONDS, elapsedSeconds) : 0;
    const nextTotal = totalSeconds + acceptedSeconds;
    tx.set(ref, { stableUid, totalSeconds: nextTotal, activeSessionId: sessionId, lastHeartbeatAtMs: nowMs, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { acceptedSeconds, totalSeconds: nextTotal, prefetchEligible: nextTotal >= VIDEO_PREFETCH_SECONDS, unlockEligible: nextTotal >= VIDEO_TARGET_SECONDS };
  });
});

export const __premiumThemesTestHooks = Object.freeze({ cleanEntitlements, coinRank, maxSpireTier, numericProgress, hasVerifiedPlusPurchase, nearUnlockConditions, progressByCondition });

