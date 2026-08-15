import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { isLifetimePlanActive, isPremiumAccessActive, isVipActive } from './premium_status';
import { getLevelFromXP } from './xp_levels';

type ProfileReason = 'daily_xp' | 'display_change' | 'entitlement_change';

export type PublicProfileProjectionInput = {
  reason?: ProfileReason;
  name?: unknown;
  lang?: unknown;
  avatar?: unknown;
  frame?: unknown;
  aura?: unknown;
  profileCardLevel?: unknown;
  profileCardTheme?: unknown;
  profileCardMotion?: unknown;
  profileCardPublicFocus?: unknown;
  profileCardLegendNo?: unknown;
  seasonProfileFrameId?: unknown;
  displayHash?: unknown;
  // Explicitly accepted by the type so callers cannot accidentally make these
  // trusted through a future spread. The projection intentionally ignores them.
  leagueId?: unknown;
  totalXp?: unknown;
  level?: unknown;
  weekPoints?: unknown;
  streak?: unknown;
  isPremium?: unknown;
  isVip?: unknown;
  isLifetime?: unknown;
  cardWordsLearned?: unknown;
  cardPhrasesLearned?: unknown;
  cardAppDays?: unknown;
  cardLongestStreak?: unknown;
};

type UserProjectionSource = Record<string, unknown>;

function cleanString(value: unknown, max: number): string {
  return typeof value === 'string'
    ? value.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max)
    : '';
}

function optionalString(value: unknown, max: number): string | null {
  const cleaned = cleanString(value, max);
  return cleaned || null;
}

function nonnegativeInt(value: unknown): number {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function boundedInt(value: unknown, min: number, max: number, fallback: number): number {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function readServerLeagueId(progress: Record<string, unknown>): number | undefined {
  const raw = progress.league_state_v3;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) as { leagueId?: unknown } : raw as { leagueId?: unknown };
    const leagueId = Math.trunc(Number(parsed?.leagueId));
    return Number.isFinite(leagueId) && leagueId >= 0 ? leagueId : undefined;
  } catch {
    return undefined;
  }
}

/** Pure builder used by the callable and deterministic repair tooling/tests. */
export function buildAuthoritativePublicProfileProjection(
  stableUid: string,
  user: UserProjectionSource,
  input: PublicProfileProjectionInput,
  nowMs: number,
): Record<string, unknown> {
  const progress = user.progress && typeof user.progress === 'object'
    ? user.progress as Record<string, unknown>
    : {};
  const name = cleanString(input.name, 32);
  const projection: Record<string, unknown> = {
    uid: stableUid,
    name,
    nameLower: name.toLowerCase(),
    lang: cleanString(input.lang, 12) || 'ru',
    avatar: optionalString(input.avatar, 80),
    frame: optionalString(input.frame, 80),
    aura: optionalString(input.aura, 80),
    profileCardLevel: boundedInt(input.profileCardLevel, 1, 3, 1),
    profileCardTheme: cleanString(input.profileCardTheme, 40) || 'classic',
    profileCardMotion: cleanString(input.profileCardMotion, 40) || 'still',
    profileCardPublicFocus: cleanString(input.profileCardPublicFocus, 40) || 'words',
    seasonProfileFrameId: optionalString(input.seasonProfileFrameId, 80),
    displayHash: cleanString(input.displayHash, 1000),
    updatedAt: nowMs,
    updatedReason: input.reason === 'display_change' || input.reason === 'entitlement_change'
      ? input.reason
      : 'daily_xp',
    isPremium: isPremiumAccessActive(progress, nowMs),
    isVip: isVipActive(progress, nowMs),
    isLifetime: isLifetimePlanActive(progress, nowMs),
  };

  const legendNo = nonnegativeInt(input.profileCardLegendNo);
  if (legendNo > 0) projection.profileCardLegendNo = legendNo;
  // League/card-detail fields are presentation contracts, not entitlement or
  // score authority. Preserve them with explicit bounds; prefer server league
  // state whenever it is available.
  projection.leagueId = readServerLeagueId(progress) ?? boundedInt(input.leagueId, 0, 100, 0);
  if (input.cardWordsLearned !== undefined) {
    projection.cardWordsLearned = boundedInt(input.cardWordsLearned, 0, 10_000_000, 0);
  }
  if (input.cardPhrasesLearned !== undefined) {
    projection.cardPhrasesLearned = boundedInt(input.cardPhrasesLearned, 0, 10_000_000, 0);
  }
  if (input.cardAppDays !== undefined) {
    projection.cardAppDays = boundedInt(input.cardAppDays, 0, 100_000, 0);
  }
  if (input.cardLongestStreak !== undefined) {
    projection.cardLongestStreak = boundedInt(input.cardLongestStreak, 0, 100_000, 0);
  }

  const serverState = user.progressServerState && typeof user.progressServerState === 'object'
    ? user.progressServerState as Record<string, unknown>
    : null;
  if (user.progressServerAuthoritative === true && serverState) {
    const totalXp = nonnegativeInt(serverState.totalXp);
    projection.totalXp = totalXp;
    projection.level = getLevelFromXP(totalXp);
    projection.weekPoints = nonnegativeInt(serverState.weekPoints);
    projection.streak = nonnegativeInt(serverState.streakCount);
    projection.progressAuthority = 'server';
  } else {
    projection.progressAuthority = 'unavailable';
  }

  return projection;
}

export const publicProfileProjectMine = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId, {
    repairLinks: false,
    requireKnownIdentity: true,
  });
  const profileInput = request.data?.profile && typeof request.data.profile === 'object'
    ? { ...request.data.profile as PublicProfileProjectionInput, reason: request.data?.reason }
    : {};
  return db.runTransaction(async (transaction) => {
    const userRef = db.collection('users').doc(stableUid);
    const profileRef = db.collection('public_profiles').doc(stableUid);
    const [userSnapshot, authDeletionMarker, stableDeletionTombstone] = await Promise.all([
      transaction.get(userRef),
      transaction.get(db.collection('account_deletion_auth_markers').doc(request.auth!.uid)),
      transaction.get(db.collection('account_deletion_tombstones').doc(stableUid)),
    ]);
    if (authDeletionMarker.exists || stableDeletionTombstone.exists) {
      throw new HttpsError('failed-precondition', 'account_delete_pending');
    }
    if (!userSnapshot.exists) throw new HttpsError('failed-precondition', 'canonical_user_missing');
    const user = userSnapshot.data() ?? {};
    if (user.identityHidden === true) throw new HttpsError('failed-precondition', 'identity_hidden');

    const projection = buildAuthoritativePublicProfileProjection(stableUid, user, profileInput, Date.now());
    const writePayload: Record<string, unknown> = {
      ...projection,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (projection.progressAuthority !== 'server') {
      // Do not leave a previously client-claimed progress snapshot looking current.
      writePayload.totalXp = admin.firestore.FieldValue.delete();
      writePayload.level = admin.firestore.FieldValue.delete();
      writePayload.weekPoints = admin.firestore.FieldValue.delete();
      writePayload.streak = admin.firestore.FieldValue.delete();
    }
    transaction.set(profileRef, writePayload, { merge: true });
    return {
      ok: true,
      stableUid,
      isPremium: projection.isPremium === true,
      isVip: projection.isVip === true,
      isLifetime: projection.isLifetime === true,
      progressAuthority: projection.progressAuthority,
    };
  });
});
