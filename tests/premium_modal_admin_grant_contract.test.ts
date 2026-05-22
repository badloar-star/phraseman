import fs from 'fs';
import path from 'path';

describe('premium modal VIP separation purchase guard', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');

  it('rechecks cloud real Premium before opening the store purchase flow', () => {
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

  it('does not treat legacy admin_grant as manage mode for the Premium paywall', () => {
    const effectStart = source.indexOf('if (openManageFromSettings) return;');
    expect(effectStart).toBeGreaterThan(-1);

    const premiumHydrationEffect = source.slice(effectStart, source.indexOf('useFocusEffect(', effectStart));

    expect(premiumHydrationEffect).toContain('if (isPremium) {');
    expect(premiumHydrationEffect).toContain("const effectivePlan = plan ?? 'yearly'");
    expect(premiumHydrationEffect).toContain('setViewMode(\'manage\')');
    expect(source).toContain('legacyAdminGrant');
    expect(source).toContain('!legacyAdminGrant');
  });

  it('loads store prices through RevenueCat init and keeps the CTA retryable while prices are missing', () => {
    const loaderStart = source.indexOf('const loadPremiumPackages = useCallback');
    expect(loaderStart).toBeGreaterThan(-1);
    const loader = source.slice(loaderStart, source.indexOf('}, []);', loaderStart));
    expect(loader.indexOf('await initRevenueCat();')).toBeGreaterThan(-1);
    expect(loader.indexOf('await initRevenueCat();')).toBeLessThan(loader.indexOf('Purchases.getOfferings()'));
    expect(loader).toContain('setPackages(nextPackages)');

    const focusEffectStart = source.indexOf('useFocusEffect(');
    const focusEffect = source.slice(focusEffectStart, source.indexOf('const activateFreezeIfNeeded', focusEffectStart));
    expect(focusEffect).toContain('void loadPremiumPackages();');
    expect(focusEffect).not.toContain('Purchases.getOfferings()');

    const ctaStart = source.indexOf('const ctaLabel = !canPurchaseSelectedPlan');
    const cta = source.slice(ctaStart, source.indexOf('{/* Мелкие хуки */', ctaStart));
    expect(cta).toContain("LP('Загрузить цену'");
    expect(cta).toContain('loadPremiumPackages().then');
    expect(cta).toContain('disabled={purchasing || loadingPackages}');
    expect(cta).not.toContain("LP('Premium', 'Premium', 'Premium'");
  });

  it('does not open the store purchase sheet until RevenueCat is on the stable account id', () => {
    const handlePurchaseStart = source.indexOf('const handlePurchase = async');
    expect(handlePurchaseStart).toBeGreaterThan(-1);
    const purchaseBody = source.slice(handlePurchaseStart, source.indexOf('const handleRestore = async', handlePurchaseStart));

    expect(source).toContain('syncRevenueCatIdentity');
    expect(purchaseBody).toContain('if (!(await syncRevenueCatIdentity()))');
    expect(purchaseBody.indexOf('if (!(await syncRevenueCatIdentity()))')).toBeLessThan(
      purchaseBody.indexOf('Purchases.purchasePackage(pkg)'),
    );
    expect(purchaseBody.indexOf('if (!(await syncRevenueCatIdentity()))')).toBeLessThan(
      purchaseBody.indexOf('Purchases.purchaseSubscriptionOption(trialOption)'),
    );
  });

  it('tells admin-granted users that store subscriptions must be cancelled in the store', () => {
    expect(source).toContain('Admin Premium does not cancel a separate store subscription');
    expect(source).toContain('Revisar suscripciones en Google Play');
  });
});
