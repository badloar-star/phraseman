import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

describe('referral roulette soft sunset integration contract', () => {
  test('qualification and admission use the shared policy with atomic config reads', () => {
    const referral = read('functions/src/referral.ts');
    expect(referral).toContain('referralRoulettePolicyFromData');
    expect(referral).toContain('canCreateNewReferral');
    expect(referral).toContain('canQualifyAt');
    expect(referral).toContain("status: 'expired' as AttributionStatus");
    expect(referral).toContain('REFERRAL_ROULETTE_EMERGENCY_STOP');
    expect(referral).toContain('tx.get(configRef)');
  });

  test('claim awards deterministic individual credits and spin consumes ledger', () => {
    const claim = read('functions/src/referral_claim_spin.ts');
    const spin = read('functions/src/referral_spin.ts');
    const dev = read('functions/src/referral_dev_grant.ts');
    expect(claim).toContain('referralCreditId');
    expect(claim).toContain('REFERRAL_SPIN_LEDGER');
    expect(claim).toContain("source: 'referral'");
    expect(claim).toContain('reconcileLedgerRowsForClaim');
    expect(claim).toContain("where('status', '==', 'available')");
    expect(claim.indexOf("where('status', '==', 'available')"))
      .toBeLessThan(claim.indexOf('tx.create(userRef.collection(REFERRAL_SPIN_LEDGER)'));
    expect(spin).toContain('reconcileLedgerRows');
    expect(spin).toContain("status: 'consumed'");
    expect(spin).toContain('spinRequestId');
    expect(dev).toContain("source: 'dev_grant'");
    expect(dev).toContain('reconcileDevGrantLedger');
    expect(dev).toContain("where('status', '==', 'available')");
    expect(dev).not.toContain('aggregateBefore + 1');
  });

  test('legacy VIP claim cannot bypass soft sunset or emergency stop', () => {
    const referral = read('functions/src/referral.ts');
    const legacyClaim = referral.slice(referral.indexOf('export const referralClaimVipReward'));
    expect(legacyClaim).toContain('resolveReferralRoulettePolicy');
    expect(legacyClaim).toContain('REFERRAL_ROULETTE_EMERGENCY_STOP');
    expect(legacyClaim).toContain('REFERRAL_ROULETTE_SOFT_SUNSET');
    expect(legacyClaim).toContain('tx.get(configRef)');
  });

  test('client read model carries server-derived drain visibility and deadlines', () => {
    const cloud = read('app/referral_cloud.ts');
    const vip = read('app/referral_vip.ts');
    const cache = read('app/referrals_cache.ts');
    expect(cloud).toContain('activePendingCount');
    expect(cloud).toContain('claimableQualifiedCount');
    expect(cloud).toContain('availableCreditCount');
    expect(cloud).toContain('latestPendingDeadlineMs');
    expect(cloud).toContain('earliestCreditExpiryMs');
    expect(vip).toContain('drain');
    expect(cache).toContain('MAX_ENTRIES = 2');
  });

  test('spin credit cache is account-scoped in memory and persistent storage', () => {
    const client = read('app/roulette_spin_client.ts');
    expect(client).toContain('captureAccountGeneration');
    expect(client).toContain('accountScopeKey');
    expect(client).toContain('spinCreditsMemoryByScope');
    expect(client).toContain('encodeURIComponent(stableId)');
  });

  // зачем: отдельный экран рулетки удалён (2026-07-25) — те же серверные
  // инварианты дренажа теперь несёт единый экран /referrals.
  test('soft-off spin uses server drain credits and never a dev-only aggregate', () => {
    const referrals = read('app/referrals.tsx');
    const spin = read('functions/src/referral_spin.ts');
    expect(referrals).toContain('getClaimableReferralState');
    expect(referrals).toContain('state.drain.availableCreditCount');
    expect(referrals).toContain('isCurrentAccountGeneration(spinAccount)');
    expect(referrals).toContain('readReferralDrain(renderToken)');
    expect(referrals).toContain('selectReferralSurfaceState');
    expect(referrals).not.toContain("progress?.referral_spin_credits");
    expect(referrals).toContain('setSpinCredits(state.drain.availableCreditCount)');
    expect(spin).toContain('eligibleSummary.availableCount - 1');
  });

  test('all eight locales have pending-deadline and spin-expiry copy', () => {
    const copy = read('app/referral_sunset_copy.ts');
    for (const lang of ['ru', 'uk', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
      expect(copy).toContain(`${lang}:`);
    }
    expect(copy).toContain('pendingDeadline');
    expect(copy).toContain('spinExpiry');
  });

  test('soft-off UI renders drain only and hides marketing when empty', () => {
    const referrals = read('app/referrals.tsx');
    const friends = read('app/(tabs)/friends.tsx');
    expect(referrals).toContain('drainVisible');
    expect(referrals).toContain('selectReferralSurfaceState');
    expect(referrals).toContain('marketingVisible');
    expect(referrals).toContain('referrals-sunset-pending-deadline');
    expect(referrals).toContain('referrals-sunset-spin-expiry');
    expect(friends).toContain('referralMarketingVisible');
    expect(friends).toContain('isReferralAccountRequestCurrent(requestToken, referralAccountKey)');
    // Drain-видимость для входа в рулетку теперь несёт инвайт-баннер настроек.
    const settings = read('app/(tabs)/settings.tsx');
    expect(settings).toContain('settingsReferralDrainVisible');
    expect(settings).toContain('settingsReferralRowVisible');
    expect(settings).toContain('testID="settings-invite-banner"');
  });

  test('Admin V2 exposes separate audited soft and emergency controls', () => {
    const backend = read('functions/src/admin_referrals.ts');
    const index = read('functions/src/index.ts');
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    const core = read('admin/v2/scripts/admin-core.js');
    expect(backend).toContain('adminSetReferralRouletteEmergencyStop');
    expect(backend).toContain('referral_roulette_soft_off_at_ms');
    expect(backend).toContain('referral_roulette_emergency_stop');
    expect(backend).toContain('drainMetrics');
    expect(index).toContain('adminSetReferralRouletteEmergencyStop');
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSetReferralRouletteEmergencyStop')");
    expect(core).toContain('Новые приглашения и промо');
    expect(core).toContain('Аварийная остановка рулетки');
    expect(core).toContain("can('application.config.write')");
    expect(core).toContain('idempotencyKey');
    expect(core).toContain('globalThis.confirm(');
  });

  test('stable analytics statuses are present in server policy', () => {
    const policy = read('functions/src/referral_roulette_policy.ts');
    for (const event of [
      'referral_attribution_created',
      'referral_attribution_expired',
      'referral_attribution_qualified',
      'referral_credit_earned',
      'referral_credit_consumed',
      'referral_credit_expired',
    ]) {
      expect(policy).toContain(event);
    }
  });
});
