import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';

/**
 * Shared factory for "record this AI-feature opt-in choice" callables.
 * Each AI feature with its own consent gate (mistake-explain, AI dialogs, ...)
 * writes its own field on the SAME `user_consents/{stableId}` document used by
 * recordAgeConsentSnapshot — one document per canonical identity carrying all
 * consent fields, so the admin panel and future readers only ever look in one
 * place. No intentId/dedup transaction: a single choice, not a multi-field
 * cohort snapshot, so a plain idempotent merge is enough.
 */

export type AiConsentValue = 'granted' | 'denied' | 'unset';

function isAiConsentValue(value: unknown): value is AiConsentValue {
  return value === 'granted' || value === 'denied' || value === 'unset';
}

export async function applyAiConsentField(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  field: string,
  state: AiConsentValue,
  nowMs = Date.now(),
): Promise<{ ok: true }> {
  const ref = db.collection('user_consents').doc(stableUid);
  await ref.set({
    [field]: state,
    [`${field}UpdatedAt`]: admin.firestore.Timestamp.fromMillis(nowMs),
  }, { merge: true });
  return { ok: true };
}

export async function handleRecordAiConsent(
  dependencies: { resolveStableUid(authUid: string): Promise<string> },
  field: string,
  request: { authUid: string; data: unknown },
): Promise<{ ok: true }> {
  const authUid = request.authUid.trim();
  if (!authUid) throw new HttpsError('unauthenticated', 'Authentication required');
  const state = (request.data as { state?: unknown } | null)?.state;
  if (!isAiConsentValue(state)) throw new HttpsError('invalid-argument', 'Invalid consent state');
  const stableUid = await dependencies.resolveStableUid(authUid);
  if (!stableUid.trim()) throw new HttpsError('failed-precondition', 'Stable identity required');
  return applyAiConsentField(admin.firestore(), stableUid, field, state);
}

export function createRecordAiConsentCallable(field: string) {
  return onCall({
    region: 'us-central1',
    enforceAppCheck: false,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 40,
  }, async (request) => {
    const authUid = request.auth?.uid ?? '';
    return handleRecordAiConsent({
      resolveStableUid: (uid) => resolveStableUidForAuth(admin.firestore(), uid, undefined, {
        requireKnownIdentity: true,
        repairLinks: false,
      }),
    }, field, { authUid, data: request.data });
  });
}
