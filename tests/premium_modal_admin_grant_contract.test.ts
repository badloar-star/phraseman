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

  it('treats admin VIP storage as active Premium management state', () => {
    const resolverStart = source.indexOf('const resolveCurrentPremiumState = useCallback');
    expect(resolverStart).toBeGreaterThan(-1);
    const resolver = source.slice(resolverStart, source.indexOf('const loadPremiumPackages = useCallback', resolverStart));

    expect(source).toContain('getVerifiedVipStatus');
    expect(resolver).toContain("'vip_active'");
    expect(resolver).toContain("'vip_plan'");
    expect(resolver).toContain("'vip_until'");
    expect(resolver).toContain("'vip_admin_override'");
    expect(resolver).toContain('const isAdmin = verifiedVip || vipStorageActive || legacyAdminActive');
    expect(resolver).toContain('verifiedReal || hasLocalActive || isAdmin');
    expect(resolver).toContain('plan: isAdmin ? adminPlan : plan');
    expect(resolver).toContain('expiry: isAdmin ? adminExpiry : expiry');
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

  it('changes monthly to yearly on Android with a deferred RevenueCat product change', () => {
    const changeStart = source.indexOf('const handleChangePlan = async');
    expect(changeStart).toBeGreaterThan(-1);
    const changeBody = source.slice(changeStart, source.indexOf('const handleRestore = async', changeStart));

    expect(changeBody).toContain("activePlan !== 'monthly'");
    expect(changeBody).toContain('packages.yearly');
    expect(changeBody).toContain('packages.monthly');
    expect(changeBody).toContain('oldProductIdentifier: currentPkg.product.identifier');
    expect(changeBody).toContain('prorationMode: Purchases.PRORATION_MODE.DEFERRED');
    expect(changeBody).toContain('Purchases.purchasePackage(nextPkg, null, googleProductChangeInfo)');
    expect(changeBody).toContain('await Purchases.getCustomerInfo()');
    expect(changeBody).toContain("if (isDevStorePreview)");
    expect(changeBody).toContain("await savePremiumLocally('yearly')");
    expect(changeBody).not.toContain("await savePremiumLocally('yearly', revenueCatPremiumMetadata");
  });

  it('shows a real yearly switch CTA only for active monthly store subscriptions', () => {
    expect(source).toContain("const canChangeMonthlyToYearly = activePlan === 'monthly'");
    expect(source).toContain("LP('Перейти на годовой план'");
    expect(source).toContain('handleChangePlan();');
    expect(source).toContain("LP('Изменение применится через магазин");
  });

  it('allows the yearly switch CTA in dev store preview even for admin-granted monthly Premium', () => {
    expect(source).toContain('const isDevStorePreview = IS_EXPO_GO || DEV_IAP_BYPASS');
    expect(source).toContain("(isAdminGrantedPremium && !isDevStorePreview)");
    expect(source).toContain("(!isAdminGrantedPremium || isDevStorePreview)");
  });

  it('initializes RevenueCat and syncs identity before restoring purchases', () => {
    const restoreStart = source.indexOf('const handleRestore = async');
    expect(restoreStart).toBeGreaterThan(-1);
    const restoreBody = source.slice(restoreStart, source.indexOf('const openManageWithToast', restoreStart));

    expect(restoreBody.indexOf('await initRevenueCat();')).toBeGreaterThan(-1);
    expect(restoreBody.indexOf('await initRevenueCat();')).toBeLessThan(
      restoreBody.indexOf('Purchases.restorePurchases()'),
    );
    expect(restoreBody.indexOf('await syncRevenueCatIdentity()')).toBeGreaterThan(-1);
    expect(restoreBody.indexOf('await syncRevenueCatIdentity()')).toBeLessThan(
      restoreBody.indexOf('Purchases.restorePurchases()'),
    );
  });

  it('restores the local plan from RevenueCat product metadata instead of activeSubscriptions only', () => {
    const restoreStart = source.indexOf('const handleRestore = async');
    const restoreBody = source.slice(restoreStart, source.indexOf('const openManageWithToast', restoreStart));

    expect(source).toContain('inferPremiumPlanFromProductId');
    expect(restoreBody).toContain('const metadata = revenueCatPremiumMetadata(info)');
    expect(restoreBody).toContain('inferPremiumPlanFromProductId(');
    expect(restoreBody).toContain('metadata.productId');
    expect(restoreBody).not.toContain("const plan: Plan = info.activeSubscriptions.some");
    expect(restoreBody).toContain('await savePremiumLocally(plan, metadata)');
  });
});
