import fs from 'fs';
import path from 'path';
import { HttpsError } from 'firebase-functions/v2/https';

const modulePath = path.join(__dirname, 'telegram_premium_admin.ts');

function loadSubject(): any {
  expect(fs.existsSync(modulePath)).toBe(true);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./telegram_premium_admin');
}

const manualOrder = {
  status: 'paid_pending_manual_activation',
  activationCode: null,
  telegramPaymentChargeId: 'charge-001',
  plan: 'monthly',
};

describe('protected Telegram Premium manual activation', () => {
  it('returns the canonical redeemed recipient for a code order and never grants the clicked nickname candidate', () => {
    const { decideTelegramManualActivation } = loadSubject();
    const decision = decideTelegramManualActivation({
      order: { ...manualOrder, status: 'paid_pending_activation', activationCode: 'TG-CODE-1' },
      promo: { usedCount: 1, lastRedeemedAtMs: 100, lastRedeemedBy: 'redeemed-alias' },
      requestedUid: 'wrong-clicked-user',
      canonicalRequestedUid: 'wrong-clicked-user',
      canonicalRedeemedUid: 'redeemed-canonical',
      canonicalActivatedUid: null,
    });

    expect(decision).toEqual({
      kind: 'already_redeemed',
      uid: 'redeemed-canonical',
      requestedUid: 'wrong-clicked-user',
      activationCode: 'TG-CODE-1',
    });
    expect(decision.kind).not.toBe('grant');
  });

  it('fails closed when a promo redemption marker exists without an attributable recipient', () => {
    const { decideTelegramManualActivation } = loadSubject();
    expect(() => decideTelegramManualActivation({
      order: { ...manualOrder, status: 'paid_pending_activation', activationCode: 'TG-CODE-2' },
      promo: { usedCount: 1, lastRedeemedAtMs: 100 },
      requestedUid: 'clicked-user',
      canonicalRequestedUid: 'clicked-user',
      canonicalRedeemedUid: null,
      canonicalActivatedUid: null,
    })).toThrow(HttpsError);
  });

  it('replays an existing manual activation idempotently without extending access again', () => {
    const { decideTelegramManualActivation } = loadSubject();
    const decision = decideTelegramManualActivation({
      order: {
        ...manualOrder,
        status: 'vip_activated',
        testerActivationStatus: 'activated',
        activatedUserId: 'old-hidden-alias',
        activatedUntil: '999999',
      },
      promo: null,
      requestedUid: 'canonical-user',
      canonicalRequestedUid: 'canonical-user',
      canonicalRedeemedUid: null,
      canonicalActivatedUid: 'canonical-user',
    });

    expect(decision).toEqual({
      kind: 'replayed',
      uid: 'canonical-user',
      requestedUid: 'canonical-user',
      plan: 'monthly',
      expiresAtMs: 999999,
    });
  });

  it('allows a no-code pending order to grant only its paid plan to the canonical profile', () => {
    const { buildTelegramManualVipPatch, decideTelegramManualActivation } = loadSubject();
    const decision = decideTelegramManualActivation({
      order: manualOrder,
      promo: null,
      requestedUid: 'hidden-alias',
      canonicalRequestedUid: 'canonical-user',
      canonicalRedeemedUid: null,
      canonicalActivatedUid: null,
    });
    expect(decision).toEqual({
      kind: 'grant',
      uid: 'canonical-user',
      requestedUid: 'hidden-alias',
      plan: 'monthly',
    });

    const patch = buildTelegramManualVipPatch({ progress: { vip_until: '2000' } }, 'monthly', 1000);
    expect(patch.updates).toMatchObject({
      'progress.vip_active': 'true',
      'progress.vip_plan': 'telegram_tester',
      'progress.vip_admin_override': 'true',
    });
    expect(patch.expiresAtMs).toBeGreaterThan(2000);
    expect(Object.keys(patch.updates).some((key) => key.includes('premium'))).toBe(false);
  });

  it('fails closed when a deletion job is queued for the canonical recipient', () => {
    const { assertTelegramTargetDeletionNotPending } = loadSubject();
    expect(() => assertTelegramTargetDeletionNotPending({
      tombstoneExists: false,
      deletionJobs: [{ status: 'queued', stableUid: 'canonical-user' }],
      authMarkers: [],
    })).toThrow('account_delete_pending');
  });

  it('fails closed when any target auth anchor has an account-deletion marker', () => {
    const { assertTelegramTargetDeletionNotPending, telegramTargetAuthAnchors } = loadSubject();
    const anchors = telegramTargetAuthAnchors(
      { firebaseAuthUid: 'auth-primary', linkedAuth: { providerUid: 'auth-provider' } },
      [{ id: 'auth-link-id', data: { stable_id: 'canonical-user', providerUid: 'auth-provider' } }],
    );
    expect(anchors).toEqual(['auth-primary', 'auth-provider', 'auth-link-id']);
    expect(() => assertTelegramTargetDeletionNotPending({
      tombstoneExists: false,
      deletionJobs: [],
      authMarkers: anchors.map((authUid: string) => ({ authUid, exists: authUid === 'auth-link-id' })),
    })).toThrow('account_delete_pending');
  });

  it('binds the command to the exact order, payment charge, and paid plan', () => {
    const { normalizeTelegramManualActivationInput } = loadSubject();
    const valid = normalizeTelegramManualActivationInput({
      orderId: 'charge-001',
      telegramPaymentChargeId: 'charge-001',
      requestedUid: 'stable-user',
      expectedPlan: 'monthly',
      requestId: 'tester-activation-001',
    });
    expect(valid).toMatchObject({ orderId: 'charge-001', telegramPaymentChargeId: 'charge-001', expectedPlan: 'monthly' });
    expect(() => normalizeTelegramManualActivationInput({ ...valid, telegramPaymentChargeId: 'charge-002' })).toThrow(HttpsError);
    expect(() => normalizeTelegramManualActivationInput({ ...valid, expectedPlan: 'yearly' })).not.toThrow();
  });

  it('uses an admin-only sensitive callable, canonical identity resolution, one transaction, and audit', () => {
    loadSubject();
    const source = fs.readFileSync(modulePath, 'utf8');
    expect(source).toContain('export const adminActivateTelegramPremiumOrder = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS');
    expect(source).toContain('requireAdminAppCheck(request)');
    expect(source).toContain("hasPermission(role, 'money.manual_access.write')");
    expect(source).toContain('resolveCanonicalAdminAccessTarget(tx, db, input.requestedUid)');
    expect(source).toContain('db.runTransaction(async (tx) =>');
    expect(source).toContain("db.collection('admin_log').doc()");
    expect(source).toContain('createAuditRecord({');
    expect(source).toContain('tx.update(orderRef');
    expect(source).toContain('tx.update(target.ref');
    expect(source).toContain("db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(target.uid)");
    expect(source).toContain("db.collection(ACCOUNT_DELETE_JOBS).where('stableUid', '==', target.uid).limit(1)");
    expect(source).toContain("db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid)");
    const deletionGuard = source.indexOf('assertTelegramTargetDeletionNotPending({');
    expect(deletionGuard).toBeGreaterThan(source.indexOf('const target = await resolveCanonicalAdminAccessTarget'));
    expect(deletionGuard).toBeLessThan(source.indexOf('tx.update(target.ref'));

    const redeemedBranch = source.slice(
      source.indexOf("if (decision.kind === 'already_redeemed')"),
      source.indexOf("if (decision.kind === 'replayed')"),
    );
    const replayBranch = source.slice(
      source.indexOf("if (decision.kind === 'replayed')"),
      source.indexOf('const patch = buildTelegramManualVipPatch'),
    );
    expect(redeemedBranch).not.toContain('tx.update(');
    expect(replayBranch).not.toContain('tx.update(');
  });
});
