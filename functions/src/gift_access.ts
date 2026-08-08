import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
const INTRO_ACCESS_DURATION_MS = 72 * 60 * 60 * 1000;
const INTRO_ENABLED_KEY = 'intro_full_access_enabled';

type GiftAccessDecision = {
  kind: 'grant' | 'replay';
  grantedAtMs: number;
  endsAtMs: number;
};

function positiveInteger(value: unknown): number | null {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function decideIntroFullAccessClaim(
  enabled: boolean,
  progress: Record<string, unknown>,
  nowMs: number,
): GiftAccessDecision {
  const rawGrantedAtMs = progress.intro_access_granted_at_ms;
  const rawEndsAtMs = progress.intro_access_until_ms;
  if (rawGrantedAtMs === undefined && rawEndsAtMs === undefined) {
    if (!enabled) throw new Error('intro_full_access_disabled');
    if (!Number.isSafeInteger(nowMs) || nowMs <= 0) {
      throw new Error('intro_full_access_state_invalid');
    }
    return {
      kind: 'grant',
      grantedAtMs: nowMs,
      endsAtMs: nowMs + INTRO_ACCESS_DURATION_MS,
    };
  }

  const grantedAtMs = positiveInteger(rawGrantedAtMs);
  const endsAtMs = positiveInteger(rawEndsAtMs);
  if (
    grantedAtMs === null
    || endsAtMs === null
    || endsAtMs - grantedAtMs !== INTRO_ACCESS_DURATION_MS
  ) {
    throw new Error('intro_full_access_state_invalid');
  }

  return { kind: 'replay', grantedAtMs, endsAtMs };
}

function callablePolicyError(error: unknown): never {
  if (error instanceof Error && error.message === 'intro_full_access_disabled') {
    throw new HttpsError('failed-precondition', error.message);
  }
  if (error instanceof Error && error.message === 'intro_full_access_state_invalid') {
    throw new HttpsError('failed-precondition', error.message);
  }
  throw error;
}

export const introFullAccessClaim = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 15,
  memory: '256MiB',
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid, undefined, {
    repairLinks: false,
    requireKnownIdentity: true,
  });
  const configRef = db.collection('remote_config').doc('app');
  const userRef = db.collection('users').doc(stableUid);

  return db.runTransaction(async (transaction) => {
    const [configSnapshot, userSnapshot] = await Promise.all([
      transaction.get(configRef),
      transaction.get(userRef),
    ]);
    const config = configSnapshot.data();
    const bools = config && typeof config.bools === 'object' && config.bools !== null
      ? config.bools as Record<string, unknown>
      : undefined;
    const enabled = bools?.[INTRO_ENABLED_KEY] === true;
    const user = userSnapshot.data() ?? {};
    const progress = user.progress && typeof user.progress === 'object'
      ? user.progress as Record<string, unknown>
      : {};

    let decision: GiftAccessDecision;
    try {
      decision = decideIntroFullAccessClaim(enabled, progress, Date.now());
    } catch (error) {
      return callablePolicyError(error);
    }

    if (decision.kind === 'grant') {
      transaction.update(userRef, {
        'progress.intro_access_granted_at_ms': decision.grantedAtMs,
        'progress.intro_access_until_ms': decision.endsAtMs,
      });
    }

    return {
      grantedAtMs: decision.grantedAtMs,
      endsAtMs: decision.endsAtMs,
      alreadyGranted: decision.kind === 'replay',
    };
  });
});

export const __giftAccessTestHooks = {
  decideIntroFullAccessClaim,
};
