import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { ADMIN_ALERT_EVENTS_COLLECTION } from './admin_alert_outbox';
import {
  CustomCardMilestoneRequestError,
  recordCustomCardMilestone,
  type CustomCardMilestoneStore,
} from './custom_card_milestone_core';

const CALLABLE_OPTIONS = Object.freeze({
  region: 'us-central1',
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 15,
});

function isAlreadyExistsError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const value = error as { code?: unknown; message?: unknown };
  return value.code === 6
    || value.code === 'already-exists'
    || /already exists/iu.test(String(value.message ?? ''));
}

function firestoreStore(db: admin.firestore.Firestore): CustomCardMilestoneStore {
  return {
    createIfAbsent: async (eventId, document) => {
      try {
        await db.collection(ADMIN_ALERT_EVENTS_COLLECTION).doc(eventId).create(document);
        return true;
      } catch (error) {
        if (isAlreadyExistsError(error)) return false;
        throw error;
      }
    },
  };
}

/**
 * Best-effort owner telemetry. The expected UID binds a delayed native call to
 * the Firebase session captured before card I/O; it is never persisted.
 */
export const customCardMilestoneNotify = onCall(CALLABLE_OPTIONS, async (request) => {
  try {
    return await recordCustomCardMilestone({
      authUid: request.auth?.uid ?? null,
      data: request.data,
      nowMs: Date.now(),
    }, firestoreStore(admin.firestore()));
  } catch (error) {
    if (error instanceof CustomCardMilestoneRequestError) {
      throw new HttpsError(error.code, 'Custom-card milestone request rejected');
    }
    throw new HttpsError('internal', 'Custom-card milestone unavailable');
  }
});
