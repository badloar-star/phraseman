import { HttpsError } from 'firebase-functions/v2/https';
import {
  reconcileLedgerRowsForClaim,
  type ReferralSpinCreditRow,
} from './referral_spin_ledger';

/** Dev issuance is acquisition, so it closes with the public soft-sunset gate. */
export function assertReferralDevGrantAcquisitionAllowed(policy: Readonly<{
  softEnabled: boolean;
  emergencyStop: boolean;
}>): void {
  if (policy.emergencyStop) {
    throw new HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP');
  }
  if (!policy.softEnabled) {
    throw new HttpsError('failed-precondition', 'REFERRAL_ROULETTE_SOFT_SUNSET');
  }
}

export function reconcileDevGrantLedger(
  rows: readonly ReferralSpinCreditRow[],
  nowMs: number,
): Readonly<{ expiredIds: string[]; spinsTotalAfterGrant: number }> {
  const reconciled = reconcileLedgerRowsForClaim(rows, nowMs, { softEnabled: true }, 1);
  return {
    expiredIds: reconciled.expiredIds,
    spinsTotalAfterGrant: reconciled.availableCountAfterClaim,
  };
}
