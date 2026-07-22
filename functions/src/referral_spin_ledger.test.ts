import {
  MAX_LEGACY_CREDITS_PER_TRANSACTION,
  buildAvailableCredit,
  buildLegacyCreditRows,
  referralCreditId,
  reconcileLedgerRows,
  reconcileLedgerRowsForClaim,
  shouldMigrateLegacyAggregate,
  type ReferralSpinCreditRow,
} from './referral_spin_ledger';
import {
  REFERRAL_LEDGER_ROLLOUT_AT_MS,
  THIRTY_DAYS_MS,
} from './referral_roulette_policy';

function row(
  id: string,
  earnedAtMs: number,
  expiresAtMs: number,
  source: ReferralSpinCreditRow['source'] = 'referral',
): ReferralSpinCreditRow {
  return { id, ownerStableId: 'owner', source, earnedAtMs, expiresAtMs, status: 'available' };
}

describe('referral spin credit ledger', () => {
  test('keeps a credit available through its exact expiry millisecond', () => {
    const result = reconcileLedgerRows([
      row('boundary-valid', 10, 50),
      row('new-valid', 40, 110),
      row('old-valid', 30, 100),
      { ...row('already-used', 5, 200), status: 'consumed' },
    ], 50, { softEnabled: true });

    expect(result.expiredIds).toEqual([]);
    expect(result.oldestValid?.id).toBe('boundary-valid');
    expect(result.availableCount).toBe(3);
    expect(result.earliestExpiryMs).toBe(50);
  });

  test('expires and retains a credit for audit one millisecond after expiry', () => {
    const result = reconcileLedgerRows([
      row('just-expired', 10, 50),
      row('valid', 20, 100),
    ], 51, { softEnabled: true });

    expect(result.expiredIds).toEqual(['just-expired']);
    expect(result.oldestValid?.id).toBe('valid');
    expect(result.availableCount).toBe(1);
  });

  test('excludes dev grants from soft-off drain without expiring them', () => {
    const result = reconcileLedgerRows([
      row('dev-oldest', 10, 100, 'dev_grant'),
      row('referral-next', 20, 110, 'referral'),
    ], 50, { softEnabled: false });

    expect(result.expiredIds).toEqual([]);
    expect(result.oldestValid?.id).toBe('referral-next');
    expect(result.availableCount).toBe(1);
  });

  test('reconciles an expired row before adding a newly earned claim credit', () => {
    const result = reconcileLedgerRowsForClaim([
      row('expired-before-claim', 10, 50),
      row('still-available', 20, 120),
    ], 51, { softEnabled: true }, 1);

    expect(result.expiredIds).toEqual(['expired-before-claim']);
    expect(result.availableCountAfterClaim).toBe(2);
  });

  test('uses a deterministic credit id for claim replay', () => {
    expect(referralCreditId('invite-a')).toBe(referralCreditId('invite-a'));
    expect(referralCreditId('invite-a')).not.toBe(referralCreditId('invite-b'));
    expect(referralCreditId('invite-a')).toMatch(/^referral_[a-f0-9]{40}$/);
  });

  test('builds a 30-day referral credit from server-earned time', () => {
    expect(buildAvailableCredit({
      id: 'credit-a',
      ownerStableId: 'owner',
      source: 'referral',
      attributionId: 'invite-a',
      earnedAtMs: 1_000,
    })).toMatchObject({
      id: 'credit-a',
      ownerStableId: 'owner',
      source: 'referral',
      attributionId: 'invite-a',
      earnedAtMs: 1_000,
      expiresAtMs: 1_000 + THIRTY_DAYS_MS,
      status: 'available',
    });
  });

  test('anchors all migrated aggregate credits to rollout rather than first touch', () => {
    const firstTouchA = buildLegacyCreditRows('owner', 2);
    const firstTouchB = buildLegacyCreditRows('owner', 2);
    expect(firstTouchA).toEqual(firstTouchB);
    expect(firstTouchA.map((credit) => credit.expiresAtMs)).toEqual([
      REFERRAL_LEDGER_ROLLOUT_AT_MS + THIRTY_DAYS_MS,
      REFERRAL_LEDGER_ROLLOUT_AT_MS + THIRTY_DAYS_MS,
    ]);
    expect(firstTouchA.map((credit) => credit.id)).toEqual(['legacy_000001', 'legacy_000002']);
  });

  test('fails explicitly instead of truncating a migration too large for one transaction', () => {
    expect(() => buildLegacyCreditRows('owner', MAX_LEGACY_CREDITS_PER_TRANSACTION + 1))
      .toThrow('LEGACY_CREDIT_MIGRATION_TOO_LARGE');
  });

  test('server-owned ledger state, not a downgradeable progress marker, decides migration', () => {
    expect(shouldMigrateLegacyAggregate({
      migrationMarkerExists: true,
      anyLedgerDocumentExists: true,
    })).toBe(false);
    expect(shouldMigrateLegacyAggregate({
      migrationMarkerExists: false,
      anyLedgerDocumentExists: true,
    })).toBe(false);
    expect(shouldMigrateLegacyAggregate({
      migrationMarkerExists: false,
      anyLedgerDocumentExists: false,
    })).toBe(true);
  });
});
