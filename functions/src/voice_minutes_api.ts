import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import {
  readVoiceMinuteWallet,
  voiceMinutePurchaseEventId,
  type VoiceMinuteWallet,
} from './voice_minutes';

type ExpectedCreditInput = Readonly<{
  expectedTransactionId: string;
  expectedProductId: string;
  stableUid: string;
  event: Record<string, unknown> | null | undefined;
}>;

function clean(value: unknown, max = 256): string {
  const out = String(value ?? '').trim();
  return out.length <= max && !out.includes('/') ? out : '';
}

export function voiceMinuteExpectedCredit(input: ExpectedCreditInput): boolean {
  const transactionId = clean(input.expectedTransactionId);
  const productId = clean(input.expectedProductId);
  const stableUid = clean(input.stableUid, 160);
  const event = input.event ?? {};
  return Boolean(transactionId && productId && stableUid)
    && event.kind === 'purchase_grant'
    && clean(event.ownerStableId, 160) === stableUid
    && clean(event.productId) === productId;
}

export function voiceMinuteWalletResponse(wallet: VoiceMinuteWallet, credited: boolean) {
  return Object.freeze({
    ok: true as const,
    availableSeconds: wallet.availableSeconds,
    reservedSeconds: wallet.reservedSeconds,
    eventCount: wallet.eventCount,
    lastEventId: wallet.lastEventId,
    updatedAtMs: wallet.updatedAtMs,
    credited,
  });
}

export const voiceMinuteWalletMine = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, undefined, {
    repairLinks: false,
    requireKnownIdentity: true,
  });
  const data = request.data && typeof request.data === 'object'
    ? request.data as Record<string, unknown>
    : {};
  const expectedTransactionId = clean(data.expectedTransactionId);
  const expectedProductId = clean(data.expectedProductId);
  const [wallet, eventSnap] = await Promise.all([
    readVoiceMinuteWallet(db, stableUid),
    expectedTransactionId && expectedProductId
      ? db.collection('voice_minute_events').doc(voiceMinutePurchaseEventId(expectedTransactionId)).get()
      : Promise.resolve(null),
  ]);
  const credited = voiceMinuteExpectedCredit({
    expectedTransactionId,
    expectedProductId,
    stableUid,
    event: eventSnap?.exists ? (eventSnap.data() ?? {}) : null,
  });
  return voiceMinuteWalletResponse(wallet, credited);
});
