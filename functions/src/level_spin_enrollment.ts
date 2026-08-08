import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ACCOUNT_DELETE_AUTH_MARKERS, ACCOUNT_DELETE_TOMBSTONES } from './account_delete_job';
import { resolveStableUidForAuth } from './auth_identity';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { LEVEL_SPIN_PROTOCOL } from './level_reward_spins';
import { getLevelFromXP } from './xp_levels';

type EnrollmentState = {
  protocol?: typeof LEVEL_SPIN_PROTOCOL;
  levelBaseline: number;
  balance: number;
  activeRequestId: string | null;
};

function safeNonNegativeInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizedState(raw: unknown): EnrollmentState {
  const state = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    ...(state.protocol === LEVEL_SPIN_PROTOCOL ? { protocol: LEVEL_SPIN_PROTOCOL } : {}),
    levelBaseline: Number.isInteger(state.levelBaseline)
      ? Math.max(1, Math.min(60, Number(state.levelBaseline)))
      : 1,
    balance: safeNonNegativeInt(state.balance),
    activeRequestId: typeof state.activeRequestId === 'string' && state.activeRequestId.trim()
      ? state.activeRequestId.trim()
      : null,
  };
}

export function prepareLevelSpinEnrollment(userData: Record<string, unknown>): {
  changed: boolean;
  state: EnrollmentState;
} {
  const current = normalizedState(userData.levelSpinServerState);
  if (current.protocol === LEVEL_SPIN_PROTOCOL) return { changed: false, state: current };
  const progress = userData.progress && typeof userData.progress === 'object'
    ? userData.progress as Record<string, unknown>
    : {};
  const serverState = userData.progressServerState && typeof userData.progressServerState === 'object'
    ? userData.progressServerState as Record<string, unknown>
    : {};
  const totalXp = Math.max(
    safeNonNegativeInt(serverState.totalXp),
    safeNonNegativeInt(progress.user_total_xp),
  );
  return {
    changed: true,
    state: {
      protocol: LEVEL_SPIN_PROTOCOL,
      levelBaseline: getLevelFromXP(totalXp),
      balance: current.balance,
      activeRequestId: current.activeRequestId,
    },
  };
}

export const levelRewardSpinEnrollV1 = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId, {
    requireKnownIdentity: true,
    repairLinks: false,
  });
  const userRef = db.collection('users').doc(stableUid);
  return db.runTransaction(async (tx) => {
    const [userSnap, authLinkSnap, authDeleteSnap, stableDeleteSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(db.collection('auth_links').doc(authUid)),
      tx.get(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid)),
      tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableUid)),
    ]);
    const userData = userSnap.data() ?? {};
    if (!userSnap.exists
      || userData.identityHidden === true
      || userData.levelSpinMergePending === true
      || (userData.canonicalStableId && userData.canonicalStableId !== stableUid)
      || !authLinkSnap.exists
      || authLinkSnap.data()?.stable_id !== stableUid
      || authDeleteSnap.exists
      || stableDeleteSnap.exists) {
      throw new HttpsError('failed-precondition', 'level_spin_identity_transition_pending');
    }
    const prepared = prepareLevelSpinEnrollment(userData);
    if (prepared.changed) {
      tx.set(userRef, {
        levelSpinServerState: prepared.state,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    return { ok: true, stableUid, enrolled: prepared.changed, levelBaseline: prepared.state.levelBaseline };
  });
});
