import { createHash } from 'node:crypto';
import {
  REFERRAL_LEDGER_ROLLOUT_AT_MS,
  canConsumeCreditSource,
  creditExpiryMs,
  type ReferralCreditSource,
} from './referral_roulette_policy';

export const REFERRAL_SPIN_LEDGER = 'referral_spin_credit_ledger';
export const REFERRAL_SPIN_LEDGER_VERSION = 1;
export const REFERRAL_SPIN_LEDGER_MIGRATION_MARKER_ID = '_migration_v1';
/** Leaves transaction capacity for user, attribution, reward, receipt, and expiry writes. */
export const MAX_LEGACY_CREDITS_PER_TRANSACTION = 350;

export type ReferralSpinCreditStatus = 'available' | 'consumed' | 'expired';

/**
 * Legacy aggregate migration is authorized only by durable server-owned
 * subcollection state. The client-writable user progress map is deliberately
 * absent from this decision so downgrading its compatibility version cannot
 * mint the same historical balance again.
 */
export function shouldMigrateLegacyAggregate(input: Readonly<{
  migrationMarkerExists: boolean;
  anyLedgerDocumentExists: boolean;
}>): boolean {
  return !input.migrationMarkerExists && !input.anyLedgerDocumentExists;
}

export type ReferralSpinCreditRow = Readonly<{
  id: string;
  ownerStableId: string;
  source: ReferralCreditSource;
  attributionId?: string;
  earnedAtMs: number;
  expiresAtMs: number;
  status: ReferralSpinCreditStatus;
  consumedAtMs?: number;
  spinRequestId?: string;
  expiredAtMs?: number;
}>;

export function referralCreditId(attributionId: string): string {
  const digest = createHash('sha256').update(String(attributionId)).digest('hex').slice(0, 40);
  return `referral_${digest}`;
}

export function legacyCreditId(index: number): string {
  return `legacy_${String(index + 1).padStart(6, '0')}`;
}

export function buildAvailableCredit(input: Readonly<{
  id: string;
  ownerStableId: string;
  source: ReferralCreditSource;
  attributionId?: string;
  earnedAtMs: number;
}>): ReferralSpinCreditRow {
  const earnedAtMs = Math.max(0, Math.floor(input.earnedAtMs));
  return {
    id: input.id,
    ownerStableId: input.ownerStableId,
    source: input.source,
    ...(input.attributionId ? { attributionId: input.attributionId } : {}),
    earnedAtMs,
    expiresAtMs: creditExpiryMs(earnedAtMs),
    status: 'available',
  };
}

export function buildLegacyCreditRows(ownerStableId: string, aggregateCredits: number): ReferralSpinCreditRow[] {
  const count = Math.max(0, Math.floor(Number(aggregateCredits) || 0));
  if (count > MAX_LEGACY_CREDITS_PER_TRANSACTION) {
    throw new Error('LEGACY_CREDIT_MIGRATION_TOO_LARGE');
  }
  return Array.from({ length: count }, (_, index) => buildAvailableCredit({
    id: legacyCreditId(index),
    ownerStableId,
    source: 'legacy_aggregate',
    earnedAtMs: REFERRAL_LEDGER_ROLLOUT_AT_MS,
  }));
}

export function reconcileLedgerRows(
  rows: readonly ReferralSpinCreditRow[],
  nowMs: number,
  policy: Readonly<{ softEnabled: boolean }>,
): Readonly<{
  expiredIds: string[];
  oldestValid?: ReferralSpinCreditRow;
  availableCount: number;
  earliestExpiryMs: number;
}> {
  const ordered = [...rows].sort((a, b) => a.earnedAtMs - b.earnedAtMs || a.id.localeCompare(b.id));
  const expiredIds = ordered
    .filter((row) => row.status === 'available' && row.expiresAtMs < nowMs)
    .map((row) => row.id);
  const valid = ordered.filter((row) => (
    row.status === 'available'
    && row.expiresAtMs >= nowMs
    && canConsumeCreditSource(policy.softEnabled, row.source)
  ));
  return {
    expiredIds,
    oldestValid: valid[0],
    availableCount: valid.length,
    earliestExpiryMs: valid.reduce(
      (earliest, row) => earliest === 0 ? row.expiresAtMs : Math.min(earliest, row.expiresAtMs),
      0,
    ),
  };
}

/**
 * Claim reconciliation is computed from the durable ledger first, then the
 * credits created by this same transaction are added to the post-claim count.
 * This prevents an expired aggregate-cache value from surviving an award.
 */
export function reconcileLedgerRowsForClaim(
  rows: readonly ReferralSpinCreditRow[],
  nowMs: number,
  policy: Readonly<{ softEnabled: boolean }>,
  awardedCount: number,
): Readonly<{
  expiredIds: string[];
  availableCountAfterClaim: number;
  earliestExpiryMs: number;
}> {
  const reconciled = reconcileLedgerRows(rows, nowMs, policy);
  return {
    expiredIds: reconciled.expiredIds,
    availableCountAfterClaim: reconciled.availableCount + Math.max(0, Math.floor(awardedCount)),
    earliestExpiryMs: reconciled.earliestExpiryMs,
  };
}

export function ledgerRowFromData(
  id: string,
  data: Record<string, unknown> | undefined,
): ReferralSpinCreditRow | null {
  if (!data) return null;
  const source = data.source;
  const status = data.status;
  if (source !== 'referral' && source !== 'legacy_aggregate' && source !== 'dev_grant') return null;
  if (status !== 'available' && status !== 'consumed' && status !== 'expired') return null;
  const earnedAtMs = Math.max(0, Math.floor(Number(data.earnedAtMs) || 0));
  const expiresAtMs = Math.max(0, Math.floor(Number(data.expiresAtMs) || 0));
  return {
    id,
    ownerStableId: String(data.ownerStableId ?? ''),
    source,
    ...(data.attributionId ? { attributionId: String(data.attributionId) } : {}),
    earnedAtMs,
    expiresAtMs,
    status,
    ...(data.consumedAtMs ? { consumedAtMs: Math.floor(Number(data.consumedAtMs)) } : {}),
    ...(data.spinRequestId ? { spinRequestId: String(data.spinRequestId) } : {}),
    ...(data.expiredAtMs ? { expiredAtMs: Math.floor(Number(data.expiredAtMs)) } : {}),
  };
}
