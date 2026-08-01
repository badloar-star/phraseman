import {
  LEVEL_UP_ANNUAL_GIFT_BONUS_MONTHS,
  LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
  LEVEL_UP_ANNUAL_GIFT_STATES,
  LEVEL_UP_ANNUAL_GIFT_TTL_MS,
  addLevelUpAnnualGiftBonusMonths,
  classifyLevelUpAnnualGiftEvent,
  getLevelUpAnnualGiftExpiresAt,
  isLevelUpAnnualGiftExpired,
  nextLevelUpAnnualGiftTransition,
  type LevelUpAnnualGiftEventInput,
} from './level_up_annual_gift';
import { totalXPForLevel } from './xp_levels';

const CREATED_AT_MS = Date.UTC(2026, 6, 29, 12);
const EXPECTED_PRODUCT_ID = 'phraseman_premium_yearly';

function event(
  overrides: Partial<LevelUpAnnualGiftEventInput> = {},
): LevelUpAnnualGiftEventInput {
  return {
    state: 'available',
    offerExpiresAtMs: CREATED_AT_MS + LEVEL_UP_ANNUAL_GIFT_TTL_MS,
    eventAtMs: CREATED_AT_MS + 1_000,
    environment: 'PRODUCTION',
    eventType: 'INITIAL_PURCHASE',
    periodType: 'NORMAL',
    presentedOfferingId: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
    productId: EXPECTED_PRODUCT_ID,
    expectedAnnualProductId: EXPECTED_PRODUCT_ID,
    ...overrides,
  };
}

describe('level-up annual gift contract', () => {
  it('defines one annual offering, an exact 24-hour TTL, six bonus months and closed states', () => {
    expect(LEVEL_UP_ANNUAL_GIFT_OFFERING_ID).toBe('level_up_annual_gift_v1');
    expect(LEVEL_UP_ANNUAL_GIFT_TTL_MS).toBe(24 * 60 * 60 * 1_000);
    expect(LEVEL_UP_ANNUAL_GIFT_BONUS_MONTHS).toBe(6);
    expect(LEVEL_UP_ANNUAL_GIFT_STATES).toEqual([
      'available',
      'trial_pending',
      'awaiting_first_paid_renewal',
      'granted',
      'expired',
    ]);
  });

  it('expires exactly 24 hours after creation and treats the boundary as expired', () => {
    const expiresAtMs = getLevelUpAnnualGiftExpiresAt(CREATED_AT_MS);
    expect(expiresAtMs).toBe(CREATED_AT_MS + 86_400_000);
    expect(isLevelUpAnnualGiftExpired('available', expiresAtMs, expiresAtMs - 1)).toBe(false);
    expect(isLevelUpAnnualGiftExpired('available', expiresAtMs, expiresAtMs)).toBe(true);
  });

  it('keeps a trial-confirmed offer eligible for its first paid renewal after the visual TTL', () => {
    const expiresAtMs = getLevelUpAnnualGiftExpiresAt(CREATED_AT_MS);
    expect(isLevelUpAnnualGiftExpired(
      'awaiting_first_paid_renewal',
      expiresAtMs,
      expiresAtMs + 7 * 24 * 60 * 60 * 1_000,
    )).toBe(false);
  });

  it('adds six calendar months with end-of-month clamping in UTC', () => {
    expect(addLevelUpAnnualGiftBonusMonths(Date.UTC(2024, 7, 31, 8, 15))).toBe(
      Date.UTC(2025, 1, 28, 8, 15),
    );
    expect(addLevelUpAnnualGiftBonusMonths(Date.UTC(2023, 7, 31, 8, 15))).toBe(
      Date.UTC(2024, 1, 29, 8, 15),
    );
  });

  it('grants a paid initial purchase from the dedicated offering', () => {
    expect(classifyLevelUpAnnualGiftEvent(event())).toEqual({
      action: 'grant',
      nextState: 'granted',
      reason: 'initial_purchase_paid',
      bonusCalendarMonths: 6,
    });
  });

  it('waits for the first paid renewal when the initial purchase starts a trial', () => {
    expect(classifyLevelUpAnnualGiftEvent(event({
      state: 'trial_pending',
      periodType: 'TRIAL',
    }))).toEqual({
      action: 'wait',
      nextState: 'awaiting_first_paid_renewal',
      reason: 'trial_started',
    });
  });

  it('grants the first normal renewal only after a recognized trial', () => {
    expect(classifyLevelUpAnnualGiftEvent(event({
      state: 'awaiting_first_paid_renewal',
      eventType: 'RENEWAL',
      periodType: 'NORMAL',
      eventAtMs: CREATED_AT_MS + 8 * 24 * 60 * 60 * 1_000,
    }))).toEqual({
      action: 'grant',
      nextState: 'granted',
      reason: 'first_paid_renewal',
      bonusCalendarMonths: 6,
    });
    expect(classifyLevelUpAnnualGiftEvent(event({ eventType: 'RENEWAL' }))).toMatchObject({
      action: 'reject',
      reason: 'unexpected_state',
    });
  });

  it.each([
    ['expired state', { state: 'expired' as const }, 'expired'],
    ['expired available offer', { eventAtMs: CREATED_AT_MS + LEVEL_UP_ANNUAL_GIFT_TTL_MS }, 'expired'],
    ['sandbox', { environment: 'SANDBOX' }, 'invalid_environment'],
    ['unknown environment', { environment: '' }, 'invalid_environment'],
    ['wrong offering', { presentedOfferingId: 'default' }, 'wrong_offering'],
    ['wrong product', { productId: 'phraseman_premium_monthly' }, 'wrong_product'],
    ['missing expected annual product', { expectedAnnualProductId: '' }, 'wrong_product'],
    ['restore', { eventType: 'RESTORE' }, 'ineligible_event'],
    ['cancellation', { eventType: 'CANCELLATION' }, 'ineligible_event'],
    ['transfer', { eventType: 'TRANSFER' }, 'ineligible_event'],
  ])('rejects %s', (_name, overrides, reason) => {
    expect(classifyLevelUpAnnualGiftEvent(event(overrides))).toMatchObject({
      action: 'reject',
      reason,
    });
  });

  it('rejects already granted and unknown period types fail-closed', () => {
    expect(classifyLevelUpAnnualGiftEvent(event({ state: 'granted' }))).toMatchObject({
      action: 'reject',
      reason: 'unexpected_state',
    });
    expect(classifyLevelUpAnnualGiftEvent(event({ periodType: 'INTRO' }))).toMatchObject({
      action: 'reject',
      reason: 'ineligible_period',
    });
  });

  it('records a level crossing once and preserves it across later same-level XP', () => {
    const crossingXp = totalXPForLevel(12);
    const crossed = nextLevelUpAnnualGiftTransition({
      existing: null,
      eventId: 'lesson_complete:cross-level-12',
      previousTotalXp: crossingXp - 1,
      totalXp: crossingXp,
      recordedAtMs: CREATED_AT_MS,
    });
    expect(crossed).toEqual({
      source: 'progress_event_v1',
      eventId: 'lesson_complete:cross-level-12',
      previousLevel: 11,
      level: 12,
      recordedAtMs: CREATED_AT_MS,
    });
    expect(nextLevelUpAnnualGiftTransition({
      existing: crossed,
      eventId: 'lesson_answer:same-level',
      previousTotalXp: crossingXp,
      totalXp: crossingXp + 100,
      recordedAtMs: CREATED_AT_MS + 1_000,
    })).toEqual(crossed);
  });
});
