import {
  attributionDeadlineMs,
  existingQualifiedDrainEligible,
  type ReferralCreditSource,
  type ReferralRoulettePolicy,
} from './referral_roulette_policy';

type DrainAttribution = Readonly<{
  status: string;
  createdAtMs: number;
  qualifiedAtMs?: number;
}>;

type DrainCredit = Readonly<{
  status: string;
  source: ReferralCreditSource | string;
  expiresAtMs: number;
}>;

export function summarizeReferralAdminDrain(input: Readonly<{
  policy: ReferralRoulettePolicy;
  nowMs: number;
  attributions: readonly DrainAttribution[];
  credits: readonly DrainCredit[];
}>): Readonly<{
  pendingAttributions: number;
  qualifiedAwaitingCredit: number;
  availableLedgerCredits: number;
  latestGrandfatherDeadlineMs: number;
  earliestCreditExpiryMs: number;
}> {
  const { policy, nowMs } = input;
  // Emergency stop pauses execution but does not erase obligations from the
  // operational health view.
  const obligationPolicy = { ...policy, emergencyStop: false };
  const activePending = input.attributions.filter((row) => {
    if (row.status !== 'pending' || row.createdAtMs <= 0) return false;
    if (policy.softEnabled) return true;
    const deadlineAtMs = attributionDeadlineMs(row.createdAtMs);
    return policy.softOffAtMs > 0
      && row.createdAtMs <= policy.softOffAtMs
      && nowMs <= deadlineAtMs;
  });
  const qualified = input.attributions.filter((row) => (
    (row.status === 'qualified' || row.status === 'skipped_referrer_cap')
    && existingQualifiedDrainEligible({
      createdAtMs: row.createdAtMs,
      qualifiedAtMs: row.qualifiedAtMs ?? 0,
    }, obligationPolicy)
  ));
  const availableCredits = input.credits.filter((row) => (
    row.status === 'available'
    && row.expiresAtMs >= nowMs
    && (row.source === 'referral' || row.source === 'legacy_aggregate')
  ));
  return {
    pendingAttributions: activePending.length,
    qualifiedAwaitingCredit: qualified.length,
    availableLedgerCredits: availableCredits.length,
    latestGrandfatherDeadlineMs: activePending.reduce(
      (latest, row) => Math.max(latest, attributionDeadlineMs(row.createdAtMs)),
      0,
    ),
    earliestCreditExpiryMs: availableCredits.reduce(
      (earliest, row) => earliest === 0 ? row.expiresAtMs : Math.min(earliest, row.expiresAtMs),
      0,
    ),
  };
}
