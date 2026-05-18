import fs from 'fs';
import path from 'path';

describe('premium modal admin grant purchase guard', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');

  it('rechecks cloud/admin premium before opening the store purchase flow', () => {
    const handlePurchaseStart = source.indexOf('const handlePurchase = async');
    expect(handlePurchaseStart).toBeGreaterThan(-1);

    const beforeRevenueCatInit = source.slice(
      handlePurchaseStart,
      source.indexOf('await initRevenueCat();', handlePurchaseStart),
    );

    expect(beforeRevenueCatInit).toContain('restoreFromCloud');
    expect(beforeRevenueCatInit).toContain('latestPremiumState?.isPremium');
    expect(beforeRevenueCatInit).toContain("const effectivePlan = latestPremiumState.plan ?? 'yearly'");
  });

  it('treats active admin_grant without a store plan as manage mode, not purchase mode', () => {
    const effectStart = source.indexOf('if (openManageFromSettings) return;');
    expect(effectStart).toBeGreaterThan(-1);

    const premiumHydrationEffect = source.slice(effectStart, source.indexOf('useFocusEffect(', effectStart));

    expect(premiumHydrationEffect).toContain('if (isPremium) {');
    expect(premiumHydrationEffect).toContain("const effectivePlan = plan ?? 'yearly'");
    expect(premiumHydrationEffect).toContain('setViewMode(\'manage\')');
  });

  it('tells admin-granted users that store subscriptions must be cancelled in the store', () => {
    expect(source).toContain('Admin Premium does not cancel a separate store subscription');
    expect(source).toContain('Revisar suscripciones en Google Play');
  });
});
