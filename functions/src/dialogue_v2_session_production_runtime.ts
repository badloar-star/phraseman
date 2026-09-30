import { createHmac, randomBytes } from 'node:crypto';
import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';

import { createDialogueV2FirestoreSessionRepository } from './dialogue_v2_session_firestore_repository';
import {
  createDialogueV2SessionLedger,
  type DialogueV2SessionActor,
} from './dialogue_v2_session_ledger';

export const DIALOGUE_V2_SESSION_HMAC_KEY = defineSecret(
  'DIALOGUE_V2_SESSION_HMAC_KEY',
);

function secretKey(): string {
  const value = String(
    DIALOGUE_V2_SESSION_HMAC_KEY.value()
      || process.env.DIALOGUE_V2_SESSION_HMAC_KEY
      || '',
  );
  if (value.length < 32 || value.length > 512) {
    throw new Error('dialogue_v2_session_secret_unavailable');
  }
  return value;
}

function digest(namespace: string, fields: readonly string[]): string {
  const hmac = createHmac('sha256', secretKey());
  hmac.update(namespace);
  for (const field of fields) {
    hmac.update('\u0000');
    hmac.update(field);
  }
  return hmac.digest('hex');
}

export function createProductionDialogueV2SessionLedger(
  db: FirebaseFirestore.Firestore = admin.firestore(),
) {
  return createDialogueV2SessionLedger({
    repository: createDialogueV2FirestoreSessionRepository({
      db,
      timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
    }),
    nowMs: () => Date.now(),
    generateSessionId: () => `d2s_${randomBytes(24).toString('base64url')}`,
    generateClaimToken: () => `d2c_${randomBytes(24).toString('base64url')}`,
    bindOwner: (actor: DialogueV2SessionActor) => digest('dialogue-v2-owner.v1', [
      actor.authUid,
      actor.stableAccountId,
    ]),
    digestTurnRequest: (input) => digest('dialogue-v2-turn.v1', [
      input.sessionId,
      input.turnId,
      input.studyTarget,
      input.scenarioId,
      input.userText,
    ]),
  });
}
