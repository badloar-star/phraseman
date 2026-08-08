export const DAY_MS = 24 * 60 * 60 * 1000;
export const SEVEN_DAYS_MS = 7 * DAY_MS;
export const THIRTY_DAYS_MS = 30 * DAY_MS;

/**
 * One global compatibility anchor for aggregate credits that predate the ledger.
 * It must never be replaced with a per-user migration or first-touch timestamp.
 */
export const REFERRAL_LEDGER_ROLLOUT_AT_MS = Date.parse('2026-07-22T00:00:00.000Z');

export type ReferralCreditSource = 'referral' | 'legacy_aggregate' | 'dev_grant';

export type ReferralRoulettePolicy = Readonly<{
  softEnabled: boolean;
  emergencyStop: boolean;
  softOffAtMs: number;
}>;

export type ReferralRouletteConfigData = {
  numbers?: Record<string, unknown>;
};

export function policyTimestampMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  }
  if (value instanceof Date) return Math.max(0, Math.floor(value.getTime()));
  if (value && typeof value === 'object' && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    const parsed = Number((value as { toMillis: () => number }).toMillis());
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  }
  return 0;
}

export function referralRoulettePolicyFromData(
  data: ReferralRouletteConfigData | undefined,
): ReferralRoulettePolicy {
  const numbers = data?.numbers;
  return {
    softEnabled: numbers?.referral_roulette_enabled !== false,
    emergencyStop: numbers?.referral_roulette_emergency_stop === true,
    softOffAtMs: policyTimestampMs(numbers?.referral_roulette_soft_off_at_ms),
  };
}

export function canCreateNewReferral(policy: ReferralRoulettePolicy): boolean {
  return policy.softEnabled && !policy.emergencyStop;
}

export function attributionDeadlineMs(createdAtMs: number): number {
  return createdAtMs > 0 ? createdAtMs + SEVEN_DAYS_MS : 0;
}

/** The grandfather deadline is inclusive; one millisecond later is rejected. */
export function canQualifyAt(
  policy: ReferralRoulettePolicy,
  createdAtMs: number,
  passAtMs: number,
): boolean {
  if (policy.emergencyStop) return false;
  if (policy.softEnabled) return true;
  const deadlineAtMs = attributionDeadlineMs(createdAtMs);
  return createdAtMs > 0
    && policy.softOffAtMs > 0
    && createdAtMs <= policy.softOffAtMs
    && passAtMs > 0
    && passAtMs <= deadlineAtMs;
}

/**
 * A row qualified before soft OFF is already earned. Rows qualified after OFF
 * must have been created before the cutoff and completed inside their 7-day window.
 * Missing qualifiedAt is accepted only for pre-ledger legacy qualified rows.
 */
export function existingQualifiedDrainEligible(
  row: Readonly<{ createdAtMs: number; qualifiedAtMs: number }>,
  policy: ReferralRoulettePolicy,
): boolean {
  if (policy.emergencyStop) return false;
  if (policy.softEnabled) return true;
  if (row.createdAtMs <= 0 || policy.softOffAtMs <= 0 || row.createdAtMs > policy.softOffAtMs) return false;
  if (row.qualifiedAtMs <= 0) return true;
  if (row.qualifiedAtMs <= policy.softOffAtMs) return true;
  return row.qualifiedAtMs <= attributionDeadlineMs(row.createdAtMs);
}

export function creditExpiryMs(earnedAtMs: number): number {
  return Math.max(0, Math.floor(earnedAtMs)) + THIRTY_DAYS_MS;
}

export function legacyCreditExpiryMs(): number {
  return creditExpiryMs(REFERRAL_LEDGER_ROLLOUT_AT_MS);
}

export function canConsumeCreditSource(softEnabled: boolean, source: ReferralCreditSource): boolean {
  return softEnabled || source === 'referral' || source === 'legacy_aggregate';
}

export const REFERRAL_ANALYTICS_EVENTS = Object.freeze({
  attributionCreated: 'referral_attribution_created',
  attributionExpired: 'referral_attribution_expired',
  attributionQualified: 'referral_attribution_qualified',
  creditEarned: 'referral_credit_earned',
  creditConsumed: 'referral_credit_consumed',
  creditExpired: 'referral_credit_expired',
});
