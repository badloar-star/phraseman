import { getLevelFromXP } from './xp_levels';

export const LEVEL_UP_ANNUAL_GIFT_OFFERING_ID = 'level_up_annual_gift_v1' as const;
export const LEVEL_UP_ANNUAL_GIFT_TTL_MS = 24 * 60 * 60 * 1_000;
export const LEVEL_UP_ANNUAL_GIFT_BONUS_MONTHS = 6;
export const LEVEL_UP_ANNUAL_GIFT_TRANSITION_SOURCE = 'progress_event_v1' as const;

export interface LevelUpAnnualGiftTransition {
  source: typeof LEVEL_UP_ANNUAL_GIFT_TRANSITION_SOURCE;
  eventId: string;
  previousLevel: number;
  level: number;
  recordedAtMs: number;
  consumedOfferId?: string;
  consumedAtMs?: number;
}

export const LEVEL_UP_ANNUAL_GIFT_STATES = [
  'available',
  'trial_pending',
  'awaiting_first_paid_renewal',
  'granted',
  'expired',
] as const;

export type LevelUpAnnualGiftState = typeof LEVEL_UP_ANNUAL_GIFT_STATES[number];

export interface LevelUpAnnualGiftEventInput {
  state: LevelUpAnnualGiftState;
  offerExpiresAtMs: number;
  eventAtMs: number;
  environment: string;
  eventType: string;
  periodType: string;
  presentedOfferingId: string;
  productId: string;
  expectedAnnualProductId: string;
  isRestore?: boolean;
}

export type LevelUpAnnualGiftRejectionReason =
  | 'expired'
  | 'invalid_timestamp'
  | 'invalid_environment'
  | 'wrong_offering'
  | 'wrong_product'
  | 'ineligible_event'
  | 'ineligible_period'
  | 'unexpected_state';

export type LevelUpAnnualGiftEventDecision =
  | {
      action: 'grant';
      nextState: 'granted';
      reason: 'initial_purchase_paid' | 'first_paid_renewal';
      bonusCalendarMonths: typeof LEVEL_UP_ANNUAL_GIFT_BONUS_MONTHS;
    }
  | {
      action: 'wait';
      nextState: 'awaiting_first_paid_renewal';
      reason: 'trial_started';
    }
  | {
      action: 'reject';
      nextState: LevelUpAnnualGiftState;
      reason: LevelUpAnnualGiftRejectionReason;
    };

function isValidTimestamp(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function cleanString(value: unknown): string {
  return String(value ?? '').trim();
}

function safeNonNegativeInteger(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function parseLevelUpAnnualGiftTransition(raw: unknown): LevelUpAnnualGiftTransition | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const eventId = cleanString(value.eventId);
  const previousLevel = safeNonNegativeInteger(value.previousLevel);
  const level = safeNonNegativeInteger(value.level);
  const recordedAtMs = safeNonNegativeInteger(value.recordedAtMs);
  if (value.source !== LEVEL_UP_ANNUAL_GIFT_TRANSITION_SOURCE
    || !eventId || eventId.length > 180
    || previousLevel === null || level === null || level <= previousLevel
    || recordedAtMs === null) {
    return null;
  }
  const consumedOfferId = cleanString(value.consumedOfferId);
  const consumedAtMs = safeNonNegativeInteger(value.consumedAtMs);
  if ((consumedOfferId && consumedAtMs === null) || (!consumedOfferId && value.consumedAtMs != null)) {
    return null;
  }
  return {
    source: LEVEL_UP_ANNUAL_GIFT_TRANSITION_SOURCE,
    eventId,
    previousLevel,
    level,
    recordedAtMs,
    ...(consumedOfferId ? { consumedOfferId, consumedAtMs: consumedAtMs! } : {}),
  };
}

export function nextLevelUpAnnualGiftTransition(input: {
  existing: unknown;
  eventId: unknown;
  previousTotalXp: unknown;
  totalXp: unknown;
  recordedAtMs: unknown;
}): LevelUpAnnualGiftTransition | null {
  const existing = parseLevelUpAnnualGiftTransition(input.existing);
  const eventId = cleanString(input.eventId);
  const previousTotalXp = safeNonNegativeInteger(input.previousTotalXp);
  const totalXp = safeNonNegativeInteger(input.totalXp);
  const recordedAtMs = safeNonNegativeInteger(input.recordedAtMs);
  if (!eventId || eventId.length > 180 || previousTotalXp === null || totalXp === null
    || recordedAtMs === null || totalXp < previousTotalXp) {
    return existing;
  }
  const previousLevel = getLevelFromXP(previousTotalXp);
  const level = getLevelFromXP(totalXp);
  if (level <= previousLevel) return existing;
  return {
    source: LEVEL_UP_ANNUAL_GIFT_TRANSITION_SOURCE,
    eventId,
    previousLevel,
    level,
    recordedAtMs,
  };
}

function progressTimestamp(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export function applyLevelUpAnnualGiftAccessProjection(input: {
  progressPatch: Record<string, unknown>;
  existingProgress: Record<string, unknown>;
  giftLineageHash: string;
  giftLineageActiveThroughMs?: number | null;
  giftLineageLastEventType?: string;
  nowMs: number;
}): Record<string, unknown> {
  const existingGiftLineageHash = cleanString(
    input.existingProgress.premium_level_up_annual_gift_lineage_hash,
  );
  if (cleanString(input.existingProgress.premium_level_up_annual_gift_granted).toLowerCase() !== 'true'
    || !existingGiftLineageHash
    || existingGiftLineageHash !== input.giftLineageHash
    || cleanString(input.giftLineageLastEventType).toUpperCase() === 'REFUND') {
    return input.progressPatch;
  }
  const bonusExpiryAtMs = progressTimestamp(
    input.existingProgress.premium_level_up_annual_gift_bonus_expiry_ms,
  );
  if (bonusExpiryAtMs <= input.nowMs) return input.progressPatch;
  const projectedRcExpiryAtMs = Math.max(
    progressTimestamp(input.progressPatch.premium_rc_expiry_ms),
    bonusExpiryAtMs,
  );
  const hasActiveRevenueCatLineage = Boolean(cleanString(input.progressPatch.premium_rc_active_lineage));
  return {
    ...input.progressPatch,
    premium_plan: 'yearly',
    premium_expiry: hasActiveRevenueCatLineage ? '0' : String(bonusExpiryAtMs),
    premium_rc_expiry_ms: String(projectedRcExpiryAtMs),
    premium_level_up_annual_gift_bonus_expiry_ms: String(bonusExpiryAtMs),
    had_premium_ever: '1',
  };
}

function normalizedEnum(value: string): string {
  return String(value ?? '').trim().toUpperCase();
}

function isKnownState(value: string): value is LevelUpAnnualGiftState {
  return (LEVEL_UP_ANNUAL_GIFT_STATES as readonly string[]).includes(value);
}

function reject(
  state: LevelUpAnnualGiftState,
  reason: LevelUpAnnualGiftRejectionReason,
): LevelUpAnnualGiftEventDecision {
  return {
    action: 'reject',
    nextState: reason === 'expired' ? 'expired' : state,
    reason,
  };
}

export function getLevelUpAnnualGiftExpiresAt(createdAtMs: number): number {
  if (!isValidTimestamp(createdAtMs)
    || createdAtMs > Number.MAX_SAFE_INTEGER - LEVEL_UP_ANNUAL_GIFT_TTL_MS) {
    throw new RangeError('createdAtMs must be a safe non-negative timestamp');
  }
  return createdAtMs + LEVEL_UP_ANNUAL_GIFT_TTL_MS;
}

export function isLevelUpAnnualGiftExpired(
  state: LevelUpAnnualGiftState,
  offerExpiresAtMs: number,
  atMs: number,
): boolean {
  if (state === 'expired') return true;
  if (state === 'awaiting_first_paid_renewal' || state === 'granted') return false;
  if (!isValidTimestamp(offerExpiresAtMs) || !isValidTimestamp(atMs)) return true;
  return atMs >= offerExpiresAtMs;
}

export function addLevelUpAnnualGiftBonusMonths(baseExpiryAtMs: number): number {
  if (!isValidTimestamp(baseExpiryAtMs)) {
    throw new RangeError('baseExpiryAtMs must be a safe non-negative timestamp');
  }

  const source = new Date(baseExpiryAtMs);
  if (!Number.isFinite(source.getTime())) {
    throw new RangeError('baseExpiryAtMs is outside the supported Date range');
  }

  const originalDay = source.getUTCDate();
  const result = new Date(source.getTime());
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + LEVEL_UP_ANNUAL_GIFT_BONUS_MONTHS);
  const lastDayOfTargetMonth = new Date(Date.UTC(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));

  const resultMs = result.getTime();
  if (!isValidTimestamp(resultMs)) {
    throw new RangeError('bonus expiry is outside the supported Date range');
  }
  return resultMs;
}

export function classifyLevelUpAnnualGiftEvent(
  input: LevelUpAnnualGiftEventInput,
): LevelUpAnnualGiftEventDecision {
  const state = isKnownState(input.state) ? input.state : 'expired';
  if (state === 'expired') return reject(state, 'expired');
  if (!isValidTimestamp(input.offerExpiresAtMs) || !isValidTimestamp(input.eventAtMs)) {
    return reject(state, 'invalid_timestamp');
  }
  if (isLevelUpAnnualGiftExpired(state, input.offerExpiresAtMs, input.eventAtMs)) {
    return reject(state, 'expired');
  }
  if (normalizedEnum(input.environment) !== 'PRODUCTION') {
    return reject(state, 'invalid_environment');
  }
  if (String(input.presentedOfferingId ?? '').trim() !== LEVEL_UP_ANNUAL_GIFT_OFFERING_ID) {
    return reject(state, 'wrong_offering');
  }

  const expectedProductId = String(input.expectedAnnualProductId ?? '').trim();
  const productId = String(input.productId ?? '').trim();
  if (!expectedProductId || productId !== expectedProductId) {
    return reject(state, 'wrong_product');
  }

  const eventType = normalizedEnum(input.eventType);
  if (input.isRestore === true
    || eventType === 'RESTORE'
    || eventType === 'CANCELLATION'
    || eventType === 'TRANSFER') {
    return reject(state, 'ineligible_event');
  }

  const periodType = normalizedEnum(input.periodType);
  if (periodType !== 'NORMAL' && periodType !== 'TRIAL') {
    return reject(state, 'ineligible_period');
  }

  if (eventType === 'INITIAL_PURCHASE' && periodType === 'TRIAL') {
    if (state !== 'available' && state !== 'trial_pending') {
      return reject(state, 'unexpected_state');
    }
    return {
      action: 'wait',
      nextState: 'awaiting_first_paid_renewal',
      reason: 'trial_started',
    };
  }

  if (eventType === 'INITIAL_PURCHASE' && periodType === 'NORMAL') {
    if (state !== 'available' && state !== 'trial_pending') {
      return reject(state, 'unexpected_state');
    }
    return {
      action: 'grant',
      nextState: 'granted',
      reason: 'initial_purchase_paid',
      bonusCalendarMonths: LEVEL_UP_ANNUAL_GIFT_BONUS_MONTHS,
    };
  }

  if (eventType === 'RENEWAL' && periodType === 'NORMAL') {
    if (state !== 'awaiting_first_paid_renewal') {
      return reject(state, 'unexpected_state');
    }
    return {
      action: 'grant',
      nextState: 'granted',
      reason: 'first_paid_renewal',
      bonusCalendarMonths: LEVEL_UP_ANNUAL_GIFT_BONUS_MONTHS,
    };
  }

  return reject(state, 'ineligible_event');
}
