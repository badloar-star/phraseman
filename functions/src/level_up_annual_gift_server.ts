import * as admin from 'firebase-admin';
import { randomUUID } from 'crypto';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { hasClaimedPermission } from './admin/permissions';
import { ensureStableLinkForAuth } from './auth_identity';
import {
  LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
  addLevelUpAnnualGiftBonusMonths,
  applyLevelUpAnnualGiftAccessProjection as applyLevelUpAnnualGiftAccessProjectionCore,
  classifyLevelUpAnnualGiftEvent,
  getLevelUpAnnualGiftExpiresAt,
  parseLevelUpAnnualGiftTransition,
  type LevelUpAnnualGiftState,
} from './level_up_annual_gift';
import { getLevelFromXP } from './xp_levels';

const REGION = 'us-central1';
const OFFER_DOC_ID = LEVEL_UP_ANNUAL_GIFT_OFFERING_ID;
const PURCHASE_ATTEMPT_TTL_MS = 15 * 60 * 1_000;
const PURCHASE_ATTEMPTS_COLLECTION = 'level_up_annual_gift_purchase_attempts';

export const LEVEL_UP_ANNUAL_GIFT_ATTEMPT_ATTRIBUTE = 'level_up_annual_gift_attempt_id' as const;

const EXISTING_ANNUAL_PRODUCT_IDS = new Set([
  'premium_yearly',
  'phraseman_yearly',
  'phraseman_premium_yearly',
  'phraseman_premium_yearly_2399',
  'phraseman_premium_yearly_2999',
]);

export interface LevelUpAnnualGiftOfferRecord {
  offerId: string;
  uid: string;
  level: number;
  state: LevelUpAnnualGiftState;
  offeringId: typeof LEVEL_UP_ANNUAL_GIFT_OFFERING_ID;
  createdAtMs: number;
  offerExpiresAtMs: number;
  activePurchaseAttemptId?: string;
  originalTransactionId?: string;
  grantedEventId?: string;
  grantedLineageHash?: string;
  grantedAtMs?: number;
  bonusExpiryAtMs?: number;
  firstPaidExpectedAtMs?: number;
}

export interface LevelUpAnnualGiftPurchaseAttemptRecord {
  purchaseAttemptId: string;
  offerId: string;
  uid: string;
  revenueCatAppUserId: string;
  offeringId: typeof LEVEL_UP_ANNUAL_GIFT_OFFERING_ID;
  annualProductId: string;
  createdAtMs: number;
  expiresAtMs: number;
  preview: false;
  identityMigration?: {
    source: 'account_merge_v1';
    fromStableUid: string;
    toStableUid: string;
    boundRevenueCatAppUserId: string;
    migratedAtMs: number;
  };
}

type RevenueCatGiftEvent = {
  id?: unknown;
  type?: unknown;
  app_user_id?: unknown;
  original_app_user_id?: unknown;
  product_id?: unknown;
  transaction_id?: unknown;
  original_transaction_id?: unknown;
  environment?: unknown;
  period_type?: unknown;
  presented_offering_id?: unknown;
  purchased_at_ms?: unknown;
  expiration_at_ms?: unknown;
  price?: unknown;
  price_in_purchased_currency?: unknown;
  price_in_usd?: unknown;
  subscriber_attributes?: Record<string, unknown>;
};

export type LevelUpAnnualGiftWebhookDecision =
  | { action: 'reject'; reason: string }
  | {
      action: 'wait';
      originalTransactionId: string;
      firstPaidExpectedAtMs: number;
    }
  | {
      action: 'grant';
      originalTransactionId: string;
      bonusExpiryAtMs: number;
      eventId: string;
    };

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function safeTimestamp(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function storedSafeInt(value: unknown): number | null {
  if (typeof value === 'string' && !/^(?:0|[1-9][0-9]*)$/.test(value)) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function hasPositivePaidPrice(event: RevenueCatGiftEvent): boolean {
  const reportedPrices = [event.price_in_purchased_currency, event.price, event.price_in_usd]
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map((value) => typeof value === 'number' ? value : Number(value))
    .filter(Number.isFinite);
  // RevenueCat documents price estimates as optional/null. In their absence,
  // INITIAL_PURCHASE/RENEWAL + NORMAL is the authoritative paid lifecycle evidence.
  return reportedPrices.length === 0 || reportedPrices.some((value) => value > 0);
}

function subscriberAttributeValue(value: unknown): string {
  if (typeof value === 'string') return clean(value);
  if (!value || typeof value !== 'object') return '';
  return clean((value as { value?: unknown }).value);
}

function hasExactAttemptIdentityMigration(
  attempt: LevelUpAnnualGiftPurchaseAttemptRecord,
  ownerUid: string,
): boolean {
  const migration = attempt.identityMigration;
  const boundRevenueCatAppUserId = clean(attempt.revenueCatAppUserId);
  const migratedAtMs = safeTimestamp(migration?.migratedAtMs);
  return Boolean(migration
    && migration.source === 'account_merge_v1'
    && clean(migration.fromStableUid) === boundRevenueCatAppUserId
    && clean(migration.toStableUid) === ownerUid
    && clean(migration.boundRevenueCatAppUserId) === boundRevenueCatAppUserId
    && migratedAtMs !== null
    && migratedAtMs > 0);
}

export function isExistingAnnualGiftProductId(value: unknown): boolean {
  return EXISTING_ANNUAL_PRODUCT_IDS.has(clean(value));
}

export function resolveAuthoritativeLevelUpAnnualGiftEligibility(
  userData: Record<string, unknown> | null | undefined,
  requestedLevel: unknown,
  nowMs: number = Date.now(),
): { level: number; previousLevel: number; eventId: string; recordedAtMs: number } | null {
  void requestedLevel;
  if (!userData || userData.progressServerAuthoritative !== true) return null;
  const progress = userData.progress && typeof userData.progress === 'object'
    ? userData.progress as Record<string, unknown>
    : null;
  const serverState = userData.progressServerState && typeof userData.progressServerState === 'object'
    ? userData.progressServerState as Record<string, unknown>
    : null;
  if (!progress || !serverState) return null;

  const currentXp = storedSafeInt(progress.user_total_xp);
  const serverTotalXp = storedSafeInt(serverState.totalXp);
  const serverLevel = storedSafeInt(serverState.level);
  const claimedProgressLevel = storedSafeInt(progress.user_level);
  const transition = parseLevelUpAnnualGiftTransition(serverState.levelUpAnnualGiftTransition);
  if (currentXp === null || serverTotalXp === null || serverLevel === null || !transition
    || currentXp !== serverTotalXp) {
    return null;
  }
  const level = getLevelFromXP(currentXp);
  if (serverLevel !== level || transition.level !== level || transition.consumedOfferId) return null;
  if (claimedProgressLevel !== null && claimedProgressLevel !== level) return null;
  if (hasActiveStorePremiumEntitlement(progress, nowMs)) return null;
  return {
    level,
    previousLevel: transition.previousLevel,
    eventId: transition.eventId,
    recordedAtMs: transition.recordedAtMs,
  };
}

export function hasActiveStorePremiumEntitlement(
  progress: Record<string, unknown> | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!progress) return false;
  const plan = clean(progress.premium_plan).toLowerCase();
  if (plan !== 'monthly' && plan !== 'yearly' && plan !== 'annual' && plan !== 'lifetime') {
    return false;
  }
  if (plan === 'lifetime' || clean(progress.premium_rc_active_lineage)) return true;
  const rawExpiries = [progress.premium_expiry, progress.premium_rc_expiry_ms]
    .filter((value) => value !== null && value !== undefined && value !== '');
  if (rawExpiries.length === 0) return true;
  const expiries = rawExpiries.map(storedSafeInt);
  if (expiries.some((value) => value === null || value === 0)) return true;
  return expiries.some((value) => value! > nowMs);
}

export function assertAdminLevelUpAnnualGiftPreviewAccess(request: {
  app?: unknown;
  auth?: { uid?: unknown; token?: Record<string, unknown> };
}): void {
  if (!request.app) throw new HttpsError('failed-precondition', 'app_check_required');
  if (!clean(request.auth?.uid) || request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'admin_only');
  }
  if (!hasClaimedPermission(request.auth.token, 'money.read')) {
    throw new HttpsError('permission-denied', 'money_read_required');
  }
}

export function buildAdminLevelUpAnnualGiftPreview(nowMs: number) {
  const createdAtMs = safeTimestamp(nowMs);
  if (createdAtMs === null) throw new RangeError('valid_now_required');
  return {
    offerId: 'preview-level-up-annual-gift-v1',
    level: 42,
    state: 'available' as const,
    offeringId: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
    createdAtMs,
    offerExpiresAtMs: getLevelUpAnnualGiftExpiresAt(createdAtMs),
    firstPaidExpectedAtMs: null,
    grantedAtMs: null,
    bonusExpiryAtMs: null,
    preview: true as const,
    purchasable: false as const,
  };
}

export function validateLevelUpAnnualGiftPurchaseBinding(input: {
  authenticatedUid: unknown;
  stableUid: unknown;
  offerId: unknown;
  revenueCatAppUserId: unknown;
  annualProductId: unknown;
  preview?: unknown;
}): {
  stableUid: string;
  offerId: string;
  revenueCatAppUserId: string;
  annualProductId: string;
} {
  if (input.preview === true) throw new Error('preview_not_purchasable');
  const authenticatedUid = clean(input.authenticatedUid);
  const stableUid = clean(input.stableUid);
  const offerId = clean(input.offerId);
  const revenueCatAppUserId = clean(input.revenueCatAppUserId);
  const annualProductId = clean(input.annualProductId);
  if (!authenticatedUid || !stableUid || authenticatedUid !== stableUid) {
    throw new Error('account_identity_mismatch');
  }
  if (!offerId) throw new Error('offer_id_required');
  if (!revenueCatAppUserId || revenueCatAppUserId !== stableUid) {
    throw new Error('revenuecat_identity_mismatch');
  }
  if (!isExistingAnnualGiftProductId(annualProductId)) {
    throw new Error('annual_product_required');
  }
  return { stableUid, offerId, revenueCatAppUserId, annualProductId };
}

export function decideLevelUpAnnualGiftWebhook(input: {
  ownerUid: string;
  offer: LevelUpAnnualGiftOfferRecord | null;
  attempt: LevelUpAnnualGiftPurchaseAttemptRecord | null;
  event: RevenueCatGiftEvent;
}): LevelUpAnnualGiftWebhookDecision {
  const { offer, attempt, event } = input;
  if (!offer || !attempt) return { action: 'reject', reason: 'missing_attempt_binding' };
  const attemptAttribute = subscriberAttributeValue(
    event.subscriber_attributes?.[LEVEL_UP_ANNUAL_GIFT_ATTEMPT_ATTRIBUTE],
  );
  if (!attemptAttribute || attemptAttribute !== attempt.purchaseAttemptId) {
    return { action: 'reject', reason: 'missing_attempt_binding' };
  }
  if ((attempt as { preview?: unknown }).preview !== false) {
    return { action: 'reject', reason: 'preview_not_purchasable' };
  }
  const ownerUid = clean(input.ownerUid);
  if (!ownerUid || offer.uid !== ownerUid || attempt.uid !== ownerUid) {
    return { action: 'reject', reason: 'account_identity_mismatch' };
  }
  if (offer.offerId !== attempt.offerId
    || offer.activePurchaseAttemptId !== attempt.purchaseAttemptId) {
    return { action: 'reject', reason: 'offer_attempt_mismatch' };
  }
  const eventRevenueCatAppUserId = clean(event.app_user_id);
  const boundRevenueCatAppUserId = clean(attempt.revenueCatAppUserId);
  if (!boundRevenueCatAppUserId
    || eventRevenueCatAppUserId !== boundRevenueCatAppUserId
    || (boundRevenueCatAppUserId !== ownerUid
      && !hasExactAttemptIdentityMigration(attempt, ownerUid))) {
    return { action: 'reject', reason: 'revenuecat_identity_mismatch' };
  }
  if (offer.offeringId !== LEVEL_UP_ANNUAL_GIFT_OFFERING_ID
    || attempt.offeringId !== LEVEL_UP_ANNUAL_GIFT_OFFERING_ID
    || clean(event.presented_offering_id) !== LEVEL_UP_ANNUAL_GIFT_OFFERING_ID) {
    return { action: 'reject', reason: 'wrong_offering' };
  }
  if (!isExistingAnnualGiftProductId(attempt.annualProductId)
    || clean(event.product_id) !== attempt.annualProductId) {
    return { action: 'reject', reason: 'wrong_product' };
  }
  const purchasedAtMs = safeTimestamp(event.purchased_at_ms);
  if (purchasedAtMs === null) return { action: 'reject', reason: 'invalid_timestamp' };
  const originalTransactionId = clean(event.original_transaction_id);
  if (!originalTransactionId) return { action: 'reject', reason: 'missing_transaction_lineage' };
  if (offer.originalTransactionId && offer.originalTransactionId !== originalTransactionId) {
    return { action: 'reject', reason: 'transaction_lineage_mismatch' };
  }

  const classified = classifyLevelUpAnnualGiftEvent({
    state: offer.state,
    offerExpiresAtMs: offer.offerExpiresAtMs,
    eventAtMs: purchasedAtMs,
    environment: clean(event.environment),
    eventType: clean(event.type),
    periodType: clean(event.period_type),
    presentedOfferingId: clean(event.presented_offering_id),
    productId: clean(event.product_id),
    expectedAnnualProductId: attempt.annualProductId,
    isRestore: clean(event.type).toUpperCase() === 'RESTORE',
  });
  if (classified.action === 'reject') return { action: 'reject', reason: classified.reason };
  if (offer.state !== 'awaiting_first_paid_renewal' && purchasedAtMs > attempt.expiresAtMs) {
    return { action: 'reject', reason: 'purchase_attempt_expired' };
  }
  const baseExpiryAtMs = safeTimestamp(event.expiration_at_ms);
  if (baseExpiryAtMs === null || baseExpiryAtMs <= purchasedAtMs) {
    return { action: 'reject', reason: 'invalid_expiration' };
  }
  if (classified.action === 'wait') {
    return {
      action: 'wait',
      originalTransactionId,
      firstPaidExpectedAtMs: baseExpiryAtMs,
    };
  }
  if (!hasPositivePaidPrice(event)) {
    return { action: 'reject', reason: 'purchase_not_paid' };
  }

  const eventId = clean(event.id);
  if (!eventId) return { action: 'reject', reason: 'missing_event_id' };
  return {
    action: 'grant',
    originalTransactionId,
    bonusExpiryAtMs: addLevelUpAnnualGiftBonusMonths(baseExpiryAtMs),
    eventId,
  };
}

export const applyLevelUpAnnualGiftAccessProjection = applyLevelUpAnnualGiftAccessProjectionCore;

function requireCallableIdentity(request: CallableRequest<unknown>): string {
  if (!request.app) throw new HttpsError('failed-precondition', 'app_check_required');
  const authUid = clean(request.auth?.uid);
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  return authUid;
}

async function resolveStableUid(
  request: CallableRequest<Record<string, unknown>>,
): Promise<string> {
  const authUid = requireCallableIdentity(request);
  const requestedStableId = clean(request.data?.stableId);
  const signInProvider = clean(request.auth?.token?.firebase?.sign_in_provider);
  const linked = await ensureStableLinkForAuth(
    admin.firestore(),
    authUid,
    requestedStableId,
    signInProvider,
  );
  if (!requestedStableId || linked.stableUid !== requestedStableId) {
    throw new HttpsError('failed-precondition', 'account_identity_mismatch');
  }
  return linked.stableUid;
}

function offerRef(db: admin.firestore.Firestore, uid: string) {
  return db.collection('users').doc(uid).collection('level_up_annual_gifts').doc(OFFER_DOC_ID);
}

export function publicLevelUpAnnualGiftOffer(record: LevelUpAnnualGiftOfferRecord) {
  return {
    offerId: record.offerId,
    level: record.level,
    state: record.state,
    offeringId: record.offeringId,
    createdAtMs: record.createdAtMs,
    offerExpiresAtMs: record.offerExpiresAtMs,
    grantedAtMs: record.grantedAtMs ?? null,
    bonusExpiryAtMs: record.bonusExpiryAtMs ?? null,
    firstPaidExpectedAtMs: record.firstPaidExpectedAtMs ?? null,
  };
}

export const levelUpAnnualGiftGetOrCreate = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  const typedRequest = request as CallableRequest<Record<string, unknown>>;
  if (typedRequest.data?.preview === true) {
    throw new HttpsError('failed-precondition', 'preview_not_purchasable');
  }
  const level = Number(typedRequest.data?.level);
  if (!Number.isSafeInteger(level) || level <= 0 || level > 100_000) {
    throw new HttpsError('invalid-argument', 'valid_level_required');
  }
  const stableUid = await resolveStableUid(typedRequest);
  const db = admin.firestore();
  const userRef = db.collection('users').doc(stableUid);
  const ref = offerRef(db, stableUid);
  const now = Date.now();
  const generatedOfferId = randomUUID();
  const record = await db.runTransaction(async (tx): Promise<LevelUpAnnualGiftOfferRecord> => {
    const [snapshot, userSnapshot] = await Promise.all([tx.get(ref), tx.get(userRef)]);
    if (snapshot.exists) {
      const existing = snapshot.data() as LevelUpAnnualGiftOfferRecord;
      const existingProgress = (userSnapshot.data()?.progress ?? {}) as Record<string, unknown>;
      if ((existing.state === 'available' || existing.state === 'trial_pending')
        && hasActiveStorePremiumEntitlement(existingProgress, now)) {
        throw new HttpsError('failed-precondition', 'active_store_premium_ineligible');
      }
      if ((existing.state === 'available' || existing.state === 'trial_pending')
        && now >= existing.offerExpiresAtMs) {
        const expired = { ...existing, state: 'expired' as const };
        tx.set(ref, { state: 'expired', expiredAtMs: now, updatedAtMs: now }, { merge: true });
        return expired;
      }
      return existing;
    }
    const eligibility = resolveAuthoritativeLevelUpAnnualGiftEligibility(
      userSnapshot.exists ? userSnapshot.data() : null,
      level,
    );
    if (!eligibility) {
      throw new HttpsError('failed-precondition', 'authoritative_level_up_required');
    }
    const created: LevelUpAnnualGiftOfferRecord = {
      offerId: generatedOfferId,
      uid: stableUid,
      level: eligibility.level,
      state: 'available',
      offeringId: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
      createdAtMs: now,
      offerExpiresAtMs: getLevelUpAnnualGiftExpiresAt(now),
    };
    const currentServerState = userSnapshot.data()?.progressServerState;
    const consumedTransition = parseLevelUpAnnualGiftTransition(
      currentServerState && typeof currentServerState === 'object'
        ? (currentServerState as Record<string, unknown>).levelUpAnnualGiftTransition
        : null,
    );
    if (!consumedTransition) {
      throw new HttpsError('failed-precondition', 'authoritative_level_up_required');
    }
    tx.create(ref, {
      ...created,
      audit: {
        createdByAuthUid: clean(typedRequest.auth?.uid),
        version: 2,
        eligibility: 'authoritative_progress_transition',
        previousLevel: eligibility.previousLevel,
        progressEventId: eligibility.eventId,
        transitionRecordedAtMs: eligibility.recordedAtMs,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(userRef, {
      progressServerState: {
        ...(currentServerState as Record<string, unknown>),
        levelUpAnnualGiftTransition: {
          ...consumedTransition,
          consumedOfferId: generatedOfferId,
          consumedAtMs: now,
        },
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return created;
  });
  return publicLevelUpAnnualGiftOffer(record);
});

export const adminPreviewLevelUpAnnualGift = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  assertAdminLevelUpAnnualGiftPreviewAccess(request);
  return buildAdminLevelUpAnnualGiftPreview(Date.now());
});

export const levelUpAnnualGiftBindPurchase = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  const typedRequest = request as CallableRequest<Record<string, unknown>>;
  const stableUid = await resolveStableUid(typedRequest);
  let binding: ReturnType<typeof validateLevelUpAnnualGiftPurchaseBinding>;
  try {
    binding = validateLevelUpAnnualGiftPurchaseBinding({
      authenticatedUid: stableUid,
      stableUid,
      offerId: typedRequest.data?.offerId,
      revenueCatAppUserId: typedRequest.data?.revenueCatAppUserId,
      annualProductId: typedRequest.data?.annualProductId,
      preview: typedRequest.data?.preview,
    });
  } catch (error) {
    throw new HttpsError('failed-precondition', clean((error as Error).message) || 'invalid_binding');
  }

  const db = admin.firestore();
  const ref = offerRef(db, stableUid);
  const userRef = db.collection('users').doc(stableUid);
  const now = Date.now();
  const generatedAttemptId = randomUUID();
  const generatedAttempt: LevelUpAnnualGiftPurchaseAttemptRecord = {
    purchaseAttemptId: generatedAttemptId,
    offerId: binding.offerId,
    uid: stableUid,
    revenueCatAppUserId: binding.revenueCatAppUserId,
    offeringId: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
    annualProductId: binding.annualProductId,
    createdAtMs: now,
    expiresAtMs: now + PURCHASE_ATTEMPT_TTL_MS,
    preview: false,
  };

  const bound = await db.runTransaction(async (tx): Promise<LevelUpAnnualGiftPurchaseAttemptRecord> => {
    const [offerSnapshot, userSnapshot] = await Promise.all([tx.get(ref), tx.get(userRef)]);
    if (!offerSnapshot.exists) throw new HttpsError('not-found', 'offer_not_found');
    const existingOffer = offerSnapshot.data() as LevelUpAnnualGiftOfferRecord;
    if (existingOffer.offerId !== binding.offerId || existingOffer.uid !== stableUid) {
      throw new HttpsError('permission-denied', 'offer_owner_mismatch');
    }
    if (now >= existingOffer.offerExpiresAtMs) {
      tx.set(ref, { state: 'expired', expiredAtMs: now, updatedAtMs: now }, { merge: true });
      throw new HttpsError('failed-precondition', 'offer_expired');
    }
    if (existingOffer.state !== 'available' && existingOffer.state !== 'trial_pending') {
      throw new HttpsError('failed-precondition', 'offer_not_purchasable');
    }
    if (existingOffer.activePurchaseAttemptId) {
      const activeRef = db.collection(PURCHASE_ATTEMPTS_COLLECTION)
        .doc(existingOffer.activePurchaseAttemptId);
      const activeSnapshot = await tx.get(activeRef);
      if (activeSnapshot.exists) {
        const active = activeSnapshot.data() as LevelUpAnnualGiftPurchaseAttemptRecord;
        if (active.expiresAtMs > now
          && active.uid === stableUid
          && active.offerId === binding.offerId
          && active.annualProductId === binding.annualProductId
          && active.preview === false) {
          if (active.revenueCatAppUserId !== binding.revenueCatAppUserId) {
            if (hasExactAttemptIdentityMigration(active, stableUid)) {
              throw new HttpsError('failed-precondition', 'purchase_attempt_in_flight');
            }
            throw new HttpsError('failed-precondition', 'purchase_attempt_identity_conflict');
          } else {
            return active;
          }
        }
      }
    }
    if (hasActiveStorePremiumEntitlement(
      (userSnapshot.data()?.progress ?? {}) as Record<string, unknown>,
      now,
    )) {
      throw new HttpsError('failed-precondition', 'active_store_premium_ineligible');
    }
    const attemptRef = db.collection(PURCHASE_ATTEMPTS_COLLECTION).doc(generatedAttemptId);
    tx.create(attemptRef, {
      ...generatedAttempt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(ref, {
      state: 'trial_pending',
      activePurchaseAttemptId: generatedAttemptId,
      purchaseAttemptBoundAtMs: now,
      updatedAtMs: now,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return generatedAttempt;
  });

  return {
    purchaseAttemptId: bound.purchaseAttemptId,
    offerId: bound.offerId,
    revenueCatAppUserId: bound.revenueCatAppUserId,
    offeringId: bound.offeringId,
    annualProductId: bound.annualProductId,
    expiresAtMs: bound.expiresAtMs,
    subscriberAttribute: {
      key: LEVEL_UP_ANNUAL_GIFT_ATTEMPT_ATTRIBUTE,
      value: bound.purchaseAttemptId,
    },
  };
});

export const LEVEL_UP_ANNUAL_GIFT_SERVER_COLLECTIONS = {
  purchaseAttempts: PURCHASE_ATTEMPTS_COLLECTION,
  offerDocId: OFFER_DOC_ID,
} as const;
