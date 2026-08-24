import {
  assertAdminReferralRepairAccess,
  continueAdminReferralPurchaseRepair,
  evaluateReferralPurchaseRepair,
  evaluateReferralRepairContinuation,
  normalizeAdminReferralPurchaseRepairInput,
  normalizeAdminReferralRepairResumeInput,
  storedReferralRepairOperatorReason,
  referralRepairFingerprint,
  assertReferralRepairReplayIdentity,
} from './admin_referral_purchase_repair';

const NOW_MS = 1_000_000_000;
const COMMAND = {
  refereeStableId: 'invitee-1',
  reason: 'Confirmed stuck purchase after incident review',
  requestId: 'request-1',
  idempotencyKey: 'operation-1',
};

describe('admin pending referral purchase repair', () => {
  test('allows only an authenticated owner with manual-access permission', () => {
    expect(() => assertAdminReferralRepairAccess({ uid: 'owner-1', token: { admin: true } }))
      .not.toThrow();
    expect(() => assertAdminReferralRepairAccess({
      uid: 'owner-1', token: { admin: true, adminRole: 'owner' },
    })).not.toThrow();
    for (const adminRole of ['admin', 'analyst', 'support', 'content_editor']) {
      expect(() => assertAdminReferralRepairAccess({
        uid: `${adminRole}-1`, token: { admin: true, adminRole },
      })).toThrow('OWNER_MANUAL_ACCESS_REQUIRED');
    }
    expect(() => assertAdminReferralRepairAccess(null)).toThrow('Auth required');
  });

  test('requires a bounded exact-target command', () => {
    expect(normalizeAdminReferralPurchaseRepairInput(COMMAND)).toEqual(COMMAND);
    expect(() => normalizeAdminReferralPurchaseRepairInput({ ...COMMAND, reason: '' }))
      .toThrow('referral purchase repair command required');
    expect(() => normalizeAdminReferralPurchaseRepairInput({ ...COMMAND, refereeStableId: 'bad/id' }))
      .toThrow('referral purchase repair command required');
  });

  test('stores and replays the exact bounded operator reason', () => {
    const reason = 'Reviewed incident evidence; resume the same command.';
    expect(storedReferralRepairOperatorReason({ operatorReason: reason })).toBe(reason);
    expect(() => storedReferralRepairOperatorReason({})).toThrow('REFERRAL_REPAIR_OPERATOR_REASON_INVALID');
    expect(() => storedReferralRepairOperatorReason({ operatorReason: 'x'.repeat(501) }))
      .toThrow('REFERRAL_REPAIR_OPERATOR_REASON_INVALID');
  });

  test('binds an idempotency key to actor, target and reason while allowing transport request retries', () => {
    const fingerprint = referralRepairFingerprint(COMMAND);
    expect(referralRepairFingerprint({ ...COMMAND, requestId: 'retry-request' })).toBe(fingerprint);
    expect(referralRepairFingerprint({ ...COMMAND, reason: 'different reason' })).not.toBe(fingerprint);
    expect(referralRepairFingerprint({ ...COMMAND, refereeStableId: 'invitee-2' })).not.toBe(fingerprint);
    expect(() => assertReferralRepairReplayIdentity(
      { actorUid: 'owner-1', requestFingerprint: fingerprint },
      'owner-1',
      fingerprint,
    )).not.toThrow();
    expect(() => assertReferralRepairReplayIdentity(
      { actorUid: 'other-owner', requestFingerprint: fingerprint },
      'owner-1',
      fingerprint,
    )).toThrow('idempotency key replay mismatch');
  });

  test.each([
    ['missing attribution', null, {}, { softEnabled: true, emergencyStop: false, softOffAtMs: 0 }, 'not_eligible'],
    ['already qualified', { status: 'qualified', referrerStableId: 'inviter-1', createdAtMs: 1 }, {}, { softEnabled: true, emergencyStop: false, softOffAtMs: 0 }, 'already_qualified'],
    ['inactive store plan', { status: 'pending', referrerStableId: 'inviter-1', createdAtMs: 1 }, {}, { softEnabled: true, emergencyStop: false, softOffAtMs: 0 }, 'not_eligible'],
    ['emergency stop', { status: 'pending', referrerStableId: 'inviter-1', createdAtMs: 1 }, { premium_plan: 'yearly', premium_expiry: NOW_MS + 1 }, { softEnabled: true, emergencyStop: true, softOffAtMs: 0 }, 'blocked'],
    ['expired grandfather window', { status: 'pending', referrerStableId: 'inviter-1', createdAtMs: 1 }, { premium_plan: 'yearly', premium_expiry: NOW_MS + 1 }, { softEnabled: false, emergencyStop: false, softOffAtMs: 1 }, 'expired'],
  ] as const)('%s returns %s', (_label, attribution, progress, policy, outcome) => {
    expect(evaluateReferralPurchaseRepair({ attribution, refereeProgress: progress, policy, nowMs: NOW_MS }))
      .toMatchObject({ outcome });
  });

  test('qualifies using the referrer reread in the transaction', () => {
    expect(evaluateReferralPurchaseRepair({
      attribution: { status: 'pending', referrerStableId: 'current-inviter', createdAtMs: 1 },
      refereeProgress: { premium_plan: 'yearly', premium_expiry: NOW_MS + 1 },
      policy: { softEnabled: true, emergencyStop: false, softOffAtMs: 0 },
      nowMs: NOW_MS,
    })).toEqual({ outcome: 'qualified', referrerStableId: 'current-inviter', deadlineAtMs: 604_800_001 });
  });

  test('resume accepts only a bounded opaque operation id', () => {
    expect(normalizeAdminReferralRepairResumeInput({
      operationId: 'referral_purchase_repair_operation-1',
    })).toEqual({ operationId: 'referral_purchase_repair_operation-1' });
    expect(() => normalizeAdminReferralRepairResumeInput({ operationId: 'bad/id' }))
      .toThrow('referral repair resume command required');
  });

  test.each([
    ['valid qualification', { status: 'qualified', referrerStableId: 'inviter-1', qualificationOperationId: 'op-1' }, 'qualified'],
    ['reward claimed after qualification', { status: 'rewarded', referrerStableId: 'inviter-1', qualificationOperationId: 'op-1' }, 'qualified'],
    ['revoked relation', { status: 'revoked', referrerStableId: 'inviter-1', qualificationOperationId: 'op-1' }, 'revoked'],
    ['changed referrer', { status: 'qualified', referrerStableId: 'other', qualificationOperationId: 'op-1' }, 'blocked'],
    ['foreign qualification marker', { status: 'qualified', referrerStableId: 'inviter-1', qualificationOperationId: 'other-op' }, 'blocked'],
    ['missing relation', null, 'blocked'],
  ] as const)('%s is classified as %s before the pair grant', (_label, attribution, outcome) => {
    expect(evaluateReferralRepairContinuation({
      operationId: 'op-1',
      refereeStableId: 'invitee-1',
      referrerStableId: 'inviter-1',
      qualifiedAtMs: NOW_MS,
      attribution,
    })).toBe(outcome);
  });

  test('replays a completed receipt without applying effects again', async () => {
    const finalize = jest.fn();
    const receipt = { ok: true as const, outcome: 'qualified' as const, operationId: 'op', auditId: 'audit' };
    await expect(continueAdminReferralPurchaseRepair({
      reserve: async () => ({ phase: 'completed', result: receipt, replayed: true }),
      finalize,
    })).resolves.toEqual({ ...receipt, replayed: true });
    expect(finalize).not.toHaveBeenCalled();
  });

  test('does not complete before the atomic finalizer succeeds and safely retries after a crash', async () => {
    const finalize = jest.fn(async () => ({
      ok: true as const,
      outcome: 'qualified' as const,
      operationId: 'op',
      auditId: 'audit',
      replayed: false,
    }));
    const failedFinalize = jest.fn(async () => { throw new Error('transaction unavailable'); });
    const phase = {
      phase: 'qualification_committed' as const,
      refereeStableId: 'invitee-1',
      referrerStableId: 'current-inviter',
      nowMs: NOW_MS,
    };

    await expect(continueAdminReferralPurchaseRepair({
      reserve: async () => phase,
      finalize: failedFinalize,
    })).rejects.toThrow('transaction unavailable');

    await expect(continueAdminReferralPurchaseRepair({
      reserve: async () => phase,
      finalize,
    })).resolves.toMatchObject({ outcome: 'qualified', replayed: false });
    expect(finalize).toHaveBeenCalledWith(phase);
  });
});
