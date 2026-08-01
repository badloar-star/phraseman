import {
  LEVEL_UP_ANNUAL_GIFT_ATTEMPT_ATTRIBUTE,
  applyLevelUpAnnualGiftAccessProjection,
  assertAdminLevelUpAnnualGiftPreviewAccess,
  buildAdminLevelUpAnnualGiftPreview,
  decideLevelUpAnnualGiftWebhook,
  isExistingAnnualGiftProductId,
  hasActiveStorePremiumEntitlement,
  publicLevelUpAnnualGiftOffer,
  resolveAuthoritativeLevelUpAnnualGiftEligibility,
  validateLevelUpAnnualGiftPurchaseBinding,
  adminPreviewLevelUpAnnualGift,
  levelUpAnnualGiftBindPurchase,
  levelUpAnnualGiftGetOrCreate,
  type LevelUpAnnualGiftOfferRecord,
  type LevelUpAnnualGiftPurchaseAttemptRecord,
} from './level_up_annual_gift_server';
import { LEVEL_UP_ANNUAL_GIFT_OFFERING_ID } from './level_up_annual_gift';
import { totalXPForLevel } from './xp_levels';
import { __revenueCatWebhookTestHooks } from './revenuecat_shards';
import * as fs from 'fs';
import * as path from 'path';

const UID = 'stable-user-123';
const OFFER_ID = 'gift-offer-123';
const ATTEMPT_ID = 'purchase-attempt-123';
const PRODUCT_ID = 'phraseman_yearly';
const CREATED_AT_MS = Date.UTC(2026, 6, 29, 12);
const EXPIRES_AT_MS = CREATED_AT_MS + 24 * 60 * 60 * 1_000;

const offer = (overrides: Partial<LevelUpAnnualGiftOfferRecord> = {}): LevelUpAnnualGiftOfferRecord => ({
  offerId: OFFER_ID,
  uid: UID,
  level: 12,
  state: 'trial_pending',
  offeringId: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
  createdAtMs: CREATED_AT_MS,
  offerExpiresAtMs: EXPIRES_AT_MS,
  activePurchaseAttemptId: ATTEMPT_ID,
  ...overrides,
});

const attempt = (
  overrides: Partial<LevelUpAnnualGiftPurchaseAttemptRecord> = {},
): LevelUpAnnualGiftPurchaseAttemptRecord => ({
  purchaseAttemptId: ATTEMPT_ID,
  offerId: OFFER_ID,
  uid: UID,
  revenueCatAppUserId: UID,
  offeringId: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
  annualProductId: PRODUCT_ID,
  createdAtMs: CREATED_AT_MS + 1_000,
  expiresAtMs: CREATED_AT_MS + 15 * 60 * 1_000,
  preview: false,
  ...overrides,
});

const event = (overrides: Record<string, unknown> = {}) => ({
  id: 'rc-event-1',
  type: 'INITIAL_PURCHASE',
  app_user_id: UID,
  original_app_user_id: UID,
  product_id: PRODUCT_ID,
  transaction_id: 'tx-1',
  original_transaction_id: 'original-tx-1',
  environment: 'PRODUCTION',
  period_type: 'NORMAL',
  presented_offering_id: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
  purchased_at_ms: CREATED_AT_MS + 2_000,
  expiration_at_ms: Date.UTC(2027, 6, 29, 12),
  price: 29.99,
  subscriber_attributes: {
    [LEVEL_UP_ANNUAL_GIFT_ATTEMPT_ATTRIBUTE]: { value: ATTEMPT_ID, updated_at_ms: CREATED_AT_MS + 1_000 },
  },
  ...overrides,
});

describe('level-up annual gift server boundary', () => {
  it('enforces App Check on all money-adjacent callables', () => {
    expect(levelUpAnnualGiftGetOrCreate).toBeDefined();
    expect(levelUpAnnualGiftBindPurchase).toBeDefined();
    expect(adminPreviewLevelUpAnnualGift).toBeDefined();
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'level_up_annual_gift_server.ts'), 'utf8');
    expect(source.match(/onCall\(\{ region: REGION, enforceAppCheck: true \}/g)).toHaveLength(3);
  });

  it('uses a durable authoritative crossing after later same-level XP and ignores client level claims', () => {
    const level = 12;
    const crossingXp = totalXPForLevel(level);
    const currentXp = crossingXp + 100;
    const eventId = 'lesson_complete:level-12';
    expect(resolveAuthoritativeLevelUpAnnualGiftEligibility({
      progressServerAuthoritative: true,
      progressServerState: {
        totalXp: currentXp,
        level,
        levelUpAnnualGiftTransition: {
          source: 'progress_event_v1',
          eventId,
          previousLevel: level - 1,
          level,
          recordedAtMs: CREATED_AT_MS,
        },
      },
      progress: {
        user_prev_xp: String(currentXp - 100),
        user_total_xp: String(currentXp),
        user_level: String(level),
      },
    }, 99_999)).toEqual({
      level,
      previousLevel: level - 1,
      eventId,
      recordedAtMs: CREATED_AT_MS,
    });
  });

  it('rejects non-crossing, unauthoritative and consumed transition markers', () => {
    const level = 12;
    const currentXp = totalXPForLevel(level) + 100;
    const transition = {
      source: 'progress_event_v1',
      eventId: 'lesson_complete:level-12',
      previousLevel: level - 1,
      level,
      recordedAtMs: CREATED_AT_MS,
    };
    expect(resolveAuthoritativeLevelUpAnnualGiftEligibility({
      progressServerAuthoritative: false,
      progressServerState: { totalXp: currentXp, level, levelUpAnnualGiftTransition: transition },
      progress: { user_total_xp: String(currentXp), user_level: String(level) },
    }, level)).toBeNull();
    expect(resolveAuthoritativeLevelUpAnnualGiftEligibility({
      progressServerAuthoritative: true,
      progressServerState: { totalXp: currentXp, level },
      progress: { user_total_xp: String(currentXp), user_level: String(level) },
    }, level)).toBeNull();
    expect(resolveAuthoritativeLevelUpAnnualGiftEligibility({
      progressServerAuthoritative: true,
      progressServerState: {
        totalXp: currentXp,
        level,
        levelUpAnnualGiftTransition: {
          ...transition,
          consumedOfferId: OFFER_ID,
          consumedAtMs: CREATED_AT_MS + 1,
        },
      },
      progress: { user_total_xp: String(currentXp), user_level: String(level) },
    }, level)).toBeNull();
  });

  it('suppresses the offer for an active existing store Premium subscriber', () => {
    const level = 12;
    const currentXp = totalXPForLevel(level) + 100;
    const eligibleUser = {
      progressServerAuthoritative: true,
      progressServerState: {
        totalXp: currentXp,
        level,
        levelUpAnnualGiftTransition: {
          source: 'progress_event_v1',
          eventId: 'lesson_complete:level-12',
          previousLevel: level - 1,
          level,
          recordedAtMs: CREATED_AT_MS,
        },
      },
      progress: { user_total_xp: String(currentXp), user_level: String(level) },
    };
    expect(hasActiveStorePremiumEntitlement({
      premium_plan: 'yearly',
      premium_expiry: String(CREATED_AT_MS + 30 * 24 * 60 * 60 * 1_000),
      premium_rc_active_lineage: 'active-lineage',
    }, CREATED_AT_MS)).toBe(true);
    expect(hasActiveStorePremiumEntitlement({ premium_plan: 'yearly' }, CREATED_AT_MS)).toBe(true);
    expect(hasActiveStorePremiumEntitlement({
      premium_plan: 'admin_grant', premium_expiry: String(CREATED_AT_MS + 1),
    }, CREATED_AT_MS)).toBe(false);
    expect(resolveAuthoritativeLevelUpAnnualGiftEligibility({
      ...eligibleUser,
      progress: {
        ...eligibleUser.progress,
        premium_plan: 'yearly',
        premium_expiry: String(CREATED_AT_MS + 30 * 24 * 60 * 60 * 1_000),
        premium_rc_active_lineage: 'active-lineage',
      },
    }, level, CREATED_AT_MS)).toBeNull();
    expect(resolveAuthoritativeLevelUpAnnualGiftEligibility({
      ...eligibleUser,
      progress: {
        ...eligibleUser.progress,
        premium_plan: 'yearly',
        premium_expiry: String(CREATED_AT_MS - 1),
        premium_rc_expiry_ms: String(CREATED_AT_MS - 1),
      },
    }, level, CREATED_AT_MS)).not.toBeNull();
  });

  it('checks an existing matching attempt before active-Premium suppression in bind', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'level_up_annual_gift_server.ts'), 'utf8');
    const bindSource = source.slice(source.indexOf('export const levelUpAnnualGiftBindPurchase'));
    expect(bindSource.indexOf('existingOffer.activePurchaseAttemptId')).toBeGreaterThanOrEqual(0);
    expect(bindSource.indexOf('hasActiveStorePremiumEntitlement')).toBeGreaterThanOrEqual(0);
    expect(bindSource.indexOf('existingOffer.activePurchaseAttemptId')).toBeLessThan(
      bindSource.indexOf('hasActiveStorePremiumEntitlement'),
    );
  });

  it('returns a safe read-only admin preview and denies non-admin callers', () => {
    const preview = buildAdminLevelUpAnnualGiftPreview(CREATED_AT_MS);
    expect(preview).toEqual(expect.objectContaining({
      offerId: 'preview-level-up-annual-gift-v1',
      preview: true,
      purchasable: false,
      state: 'available',
      offeringId: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
      createdAtMs: CREATED_AT_MS,
      offerExpiresAtMs: CREATED_AT_MS + 24 * 60 * 60 * 1_000,
    }));
    expect(() => assertAdminLevelUpAnnualGiftPreviewAccess({
      app: { appId: 'app-1' },
      auth: { uid: 'owner-1', token: { admin: true, adminRole: 'owner' } },
    })).not.toThrow();
    expect(() => assertAdminLevelUpAnnualGiftPreviewAccess({
      app: { appId: 'app-1' },
      auth: { uid: 'user-1', token: { admin: false } },
    })).toThrow('admin_only');
    expect(() => assertAdminLevelUpAnnualGiftPreviewAccess({
      app: { appId: 'app-1' },
      auth: { uid: 'support-1', token: { admin: true, adminRole: 'support' } },
    })).toThrow('money_read_required');
    expect(() => assertAdminLevelUpAnnualGiftPreviewAccess({
      auth: { uid: 'owner-1', token: { admin: true, adminRole: 'owner' } },
    })).toThrow('app_check_required');
  });

  it('exposes the authoritative first-paid timestamp after a trial without exposing bindings', () => {
    const firstPaidExpectedAtMs = Date.UTC(2026, 7, 5, 12);
    expect(publicLevelUpAnnualGiftOffer(offer({
      state: 'awaiting_first_paid_renewal',
      firstPaidExpectedAtMs,
    }))).toEqual({
      offerId: OFFER_ID,
      level: 12,
      state: 'awaiting_first_paid_renewal',
      offeringId: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
      createdAtMs: CREATED_AT_MS,
      offerExpiresAtMs: EXPIRES_AT_MS,
      grantedAtMs: null,
      bonusExpiryAtMs: null,
      firstPaidExpectedAtMs,
    });
  });

  it('allows only the existing explicitly-known annual products', () => {
    expect(isExistingAnnualGiftProductId('phraseman_yearly')).toBe(true);
    expect(isExistingAnnualGiftProductId('premium_yearly')).toBe(true);
    expect(isExistingAnnualGiftProductId('phraseman_premium_yearly')).toBe(true);
    expect(isExistingAnnualGiftProductId('phraseman_premium_yearly_2399')).toBe(true);
    expect(isExistingAnnualGiftProductId('phraseman_premium_yearly_2999')).toBe(true);
    expect(isExistingAnnualGiftProductId('phraseman_premium_monthly')).toBe(false);
    expect(isExistingAnnualGiftProductId('phraseman_premium_yearly_9999')).toBe(false);
  });

  it('routes the existing phraseman_yearly product through the premium webhook', () => {
    expect(__revenueCatWebhookTestHooks.looksLikePremiumSubscription({
      product_id: 'phraseman_yearly',
      entitlement_ids: ['premium'],
    })).toBe(true);
  });

  it('binds a real purchase to the authenticated UID, exact RC identity and offer', () => {
    expect(validateLevelUpAnnualGiftPurchaseBinding({
      authenticatedUid: UID,
      stableUid: UID,
      offerId: OFFER_ID,
      revenueCatAppUserId: UID,
      annualProductId: PRODUCT_ID,
      preview: false,
    })).toEqual({
      stableUid: UID,
      offerId: OFFER_ID,
      revenueCatAppUserId: UID,
      annualProductId: PRODUCT_ID,
    });
  });

  it.each([
    ['preview', { preview: true }, 'preview_not_purchasable'],
    ['different auth owner', { authenticatedUid: 'other' }, 'account_identity_mismatch'],
    ['different RevenueCat owner', { revenueCatAppUserId: 'other' }, 'revenuecat_identity_mismatch'],
    ['monthly product', { annualProductId: 'phraseman_premium_monthly' }, 'annual_product_required'],
  ])('rejects a %s binding', (_name, overrides, reason) => {
    expect(() => validateLevelUpAnnualGiftPurchaseBinding({
      authenticatedUid: UID,
      stableUid: UID,
      offerId: OFFER_ID,
      revenueCatAppUserId: UID,
      annualProductId: PRODUCT_ID,
      preview: false,
      ...overrides,
    })).toThrow(reason);
  });

  it('grants a paid production purchase only when every server binding matches', () => {
    expect(decideLevelUpAnnualGiftWebhook({
      ownerUid: UID,
      offer: offer(),
      attempt: attempt(),
      event: event(),
    })).toMatchObject({
      action: 'grant',
      originalTransactionId: 'original-tx-1',
      bonusExpiryAtMs: Date.UTC(2028, 0, 29, 12),
    });
  });

  it('accepts only the exact pre-merge RevenueCat identity recorded on a migrated attempt', () => {
    const migratedAttempt = attempt({
      uid: UID,
      revenueCatAppUserId: 'pre-merge-stable-user',
      identityMigration: {
        source: 'account_merge_v1',
        fromStableUid: 'pre-merge-stable-user',
        toStableUid: UID,
        boundRevenueCatAppUserId: 'pre-merge-stable-user',
        migratedAtMs: CREATED_AT_MS + 1_500,
      },
    });
    expect(decideLevelUpAnnualGiftWebhook({
      ownerUid: UID,
      offer: offer(),
      attempt: migratedAttempt,
      event: event({ app_user_id: 'pre-merge-stable-user' }),
    })).toMatchObject({ action: 'grant' });
    expect(decideLevelUpAnnualGiftWebhook({
      ownerUid: UID,
      offer: offer(),
      attempt: migratedAttempt,
      event: event({ app_user_id: UID }),
    })).toEqual({ action: 'reject', reason: 'revenuecat_identity_mismatch' });
    expect(decideLevelUpAnnualGiftWebhook({
      ownerUid: UID,
      offer: offer(),
      attempt: {
        ...migratedAttempt,
        identityMigration: {
          ...migratedAttempt.identityMigration!,
          toStableUid: 'another-owner',
        },
      },
      event: event({ app_user_id: 'pre-merge-stable-user' }),
    })).toEqual({ action: 'reject', reason: 'revenuecat_identity_mismatch' });
    expect(decideLevelUpAnnualGiftWebhook({
      ownerUid: UID,
      offer: offer(),
      attempt: { ...migratedAttempt, identityMigration: undefined },
      event: event({ app_user_id: 'pre-merge-stable-user' }),
    })).toEqual({ action: 'reject', reason: 'revenuecat_identity_mismatch' });
  });

  it('accepts a paid RevenueCat lifecycle event when optional price estimates are unavailable', () => {
    expect(decideLevelUpAnnualGiftWebhook({
      ownerUid: UID,
      offer: offer(),
      attempt: attempt(),
      event: event({ price: undefined, price_in_purchased_currency: null }),
    })).toMatchObject({ action: 'grant', originalTransactionId: 'original-tx-1' });
  });

  it.each([
    ['zero reported price', { price: 0 }],
    ['negative paid price', { price: -1 }],
  ])('rejects a normal grant with %s', (_name, eventOverrides) => {
    expect(decideLevelUpAnnualGiftWebhook({
      ownerUid: UID,
      offer: offer(),
      attempt: attempt(),
      event: event(eventOverrides),
    })).toEqual({ action: 'reject', reason: 'purchase_not_paid' });
  });

  it.each([
    ['missing attempt attribute', { subscriber_attributes: {} }, {}, {}, 'missing_attempt_binding'],
    ['different RC identity', { app_user_id: 'other' }, {}, {}, 'revenuecat_identity_mismatch'],
    ['different offering', { presented_offering_id: 'default' }, {}, {}, 'wrong_offering'],
    ['different product', { product_id: 'premium_yearly' }, {}, {}, 'wrong_product'],
    ['sandbox', { environment: 'SANDBOX' }, {}, {}, 'invalid_environment'],
    ['restore', { type: 'RESTORE' }, {}, {}, 'ineligible_event'],
    ['preview attempt', {}, {}, { preview: true }, 'preview_not_purchasable'],
    ['expired purchase', { purchased_at_ms: EXPIRES_AT_MS }, {}, {}, 'expired'],
  ])('rejects webhook evidence with %s', (_name, eventOverrides, offerOverrides, attemptOverrides, reason) => {
    expect(decideLevelUpAnnualGiftWebhook({
      ownerUid: UID,
      offer: offer(offerOverrides as Partial<LevelUpAnnualGiftOfferRecord>),
      attempt: attempt(attemptOverrides as Partial<LevelUpAnnualGiftPurchaseAttemptRecord>),
      event: event(eventOverrides as Record<string, unknown>),
    })).toEqual({ action: 'reject', reason });
  });

  it('records a trial lineage but grants only its first paid renewal', () => {
    expect(decideLevelUpAnnualGiftWebhook({
      ownerUid: UID,
      offer: offer(),
      attempt: attempt(),
      event: event({ period_type: 'TRIAL' }),
    })).toEqual({
      action: 'wait',
      originalTransactionId: 'original-tx-1',
      firstPaidExpectedAtMs: Date.UTC(2027, 6, 29, 12),
    });

    expect(decideLevelUpAnnualGiftWebhook({
      ownerUid: UID,
      offer: offer({
        state: 'awaiting_first_paid_renewal',
        originalTransactionId: 'original-tx-1',
      }),
      attempt: attempt(),
      event: event({
        id: 'rc-renewal-1',
        type: 'RENEWAL',
        period_type: 'NORMAL',
        transaction_id: 'tx-renewal-1',
        purchased_at_ms: EXPIRES_AT_MS + 5_000,
        expiration_at_ms: Date.UTC(2027, 6, 29, 12),
      }),
    })).toMatchObject({ action: 'grant', originalTransactionId: 'original-tx-1' });

    expect(decideLevelUpAnnualGiftWebhook({
      ownerUid: UID,
      offer: offer({
        state: 'awaiting_first_paid_renewal',
        originalTransactionId: 'another-lineage',
      }),
      attempt: attempt(),
      event: event({ type: 'RENEWAL', period_type: 'NORMAL' }),
    })).toEqual({ action: 'reject', reason: 'transaction_lineage_mismatch' });
  });

  it('projects six extra months without allowing a duplicate grant to stack them', () => {
    const baseExpiryAtMs = Date.UTC(2027, 6, 29, 12);
    const projected = applyLevelUpAnnualGiftAccessProjection({
      progressPatch: { premium_plan: 'yearly', premium_expiry: '0', premium_rc_expiry_ms: String(baseExpiryAtMs) },
      existingProgress: {
        premium_level_up_annual_gift_granted: 'true',
        premium_level_up_annual_gift_lineage_hash: 'lineage-1',
        premium_level_up_annual_gift_bonus_expiry_ms: String(Date.UTC(2028, 0, 29, 12)),
      },
      giftLineageHash: 'lineage-1',
      giftLineageActiveThroughMs: baseExpiryAtMs,
      giftLineageLastEventType: 'CANCELLATION',
      nowMs: CREATED_AT_MS,
    });
    expect(projected.premium_rc_expiry_ms).toBe(String(Date.UTC(2028, 0, 29, 12)));
    expect(projected.premium_level_up_annual_gift_bonus_expiry_ms).toBe(String(Date.UTC(2028, 0, 29, 12)));
  });

  it('never extends the fixed six-month gift again on a later paid renewal', () => {
    const fixedBonusExpiryAtMs = Date.UTC(2028, 0, 29, 12);
    const laterRenewalExpiryAtMs = Date.UTC(2028, 6, 29, 12);
    const projected = applyLevelUpAnnualGiftAccessProjection({
      progressPatch: {
        premium_plan: 'yearly',
        premium_expiry: '0',
        premium_rc_expiry_ms: String(laterRenewalExpiryAtMs),
        premium_rc_active_lineage: 'lineage-1',
      },
      existingProgress: {
        premium_level_up_annual_gift_granted: 'true',
        premium_level_up_annual_gift_lineage_hash: 'lineage-1',
        premium_level_up_annual_gift_bonus_expiry_ms: String(fixedBonusExpiryAtMs),
      },
      giftLineageHash: 'lineage-1',
      giftLineageActiveThroughMs: laterRenewalExpiryAtMs,
      giftLineageLastEventType: 'RENEWAL',
      nowMs: CREATED_AT_MS,
    });
    expect(projected.premium_rc_expiry_ms).toBe(String(laterRenewalExpiryAtMs));
    expect(projected.premium_level_up_annual_gift_bonus_expiry_ms).toBe(String(fixedBonusExpiryAtMs));
  });

  it('integrates the bound attempt decision and immutable receipt into the production webhook transaction', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'revenuecat_shards.ts'), 'utf8');
    const premiumHandler = source.slice(
      source.indexOf('async function handlePremiumSubscriptionEvent('),
      source.indexOf('async function handleShardPurchaseEvent'),
    );
    expect(source).toContain("from './level_up_annual_gift_server'");
    expect(premiumHandler).toContain('decideLevelUpAnnualGiftWebhook');
    expect(premiumHandler).toContain("collection('grant_receipts').doc('bonus_v1')");
    expect(premiumHandler).toContain('grantedLineageHash: canonicalEvent.lineageHash');
    expect(premiumHandler).toContain('applyLevelUpAnnualGiftAccessProjection');
    const index = fs.readFileSync(path.join(process.cwd(), 'src', 'index.ts'), 'utf8');
    expect(premiumHandler).toContain('firstPaidExpectedAtMs: giftDecision.firstPaidExpectedAtMs');
    expect(index).toContain("export { levelUpAnnualGiftGetOrCreate, levelUpAnnualGiftBindPurchase, adminPreviewLevelUpAnnualGift } from './level_up_annual_gift_server';");
  });
});
