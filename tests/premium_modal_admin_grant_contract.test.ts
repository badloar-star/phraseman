import fs from 'fs';
import path from 'path';

describe('premium modal dispatcher contract', () => {
  const root = process.cwd();
  const dispatcher = fs.readFileSync(path.join(root, 'app', 'premium_modal.tsx'), 'utf8');
  const navigation = fs.readFileSync(path.join(root, 'app', 'paywall_navigation.ts'), 'utf8');
  const manageSubscription = fs.readFileSync(path.join(root, 'app', 'manage_subscription.tsx'), 'utf8');
  const purchase = fs.readFileSync(path.join(root, 'app', 'paywall_purchase.ts'), 'utf8');

  it('keeps /premium_modal as a dispatcher only, with no retired paywall UI', () => {
    expect(dispatcher).toContain('PremiumModalDispatcher');
    // Маршруты вариантов живут в paywall_navigation; диспетчер делегирует туда.
    expect(navigation).toContain('PAYWALL_ROUTES');
    expect(dispatcher).toContain('openPremiumPaywall');
    expect(dispatcher).toContain('resolveCurrentPaywallRoute');
    expect(dispatcher).toContain('/paywall_a');
    expect(dispatcher).toContain('/paywall_b');
    expect(dispatcher).toContain('/paywall_c');
    expect(dispatcher).toContain('/paywall_d');
    expect(dispatcher).toContain('/paywall_e');
    expect(dispatcher).toContain('/paywall_f');
    expect(dispatcher).toContain('/paywall_g');
    // Replace на целевой пейвол идёт через openPremiumPaywall (object-form replace
    // живёт внутри paywall_navigation).
    expect(dispatcher).toContain("openPremiumPaywall(router, params, 'replace')");
    expect(navigation).toContain('router[mode]({');

    expect(dispatcher).not.toContain('const handlePurchase = async');
    expect(dispatcher).not.toContain('paywall: \'v1\'');
    expect(dispatcher).not.toContain('variant: \'v1\'');
    expect(dispatcher).not.toContain('Учись быстрее с Premium');
    expect(dispatcher).not.toContain('Почему Premium тебе нужен');
  });

  it('does not block routing on a fresh Firestore config read', () => {
    // Конфиг читается кэш-first и обновляется в фоне — в paywall_navigation.
    expect(navigation).toContain('refreshPaywallAbConfigInBackground');
    expect(navigation).toContain('resolvePaywallAbVariant');
    expect(dispatcher).toContain('resolveCurrentPaywallRoute');
    expect(purchase).toContain('usePaywallPurchase');
  });

  it('keeps purchase and restore safety in the shared A/B/C purchase hook', () => {
    const purchaseStart = purchase.indexOf('const handlePurchase = useCallback');
    const restoreStart = purchase.indexOf('const handleRestore = useCallback');
    expect(purchaseStart).toBeGreaterThan(-1);
    expect(restoreStart).toBeGreaterThan(-1);

    const purchaseBody = purchase.slice(purchaseStart, restoreStart);
    const restoreBody = purchase.slice(restoreStart, purchase.indexOf('const handleClose = useCallback', restoreStart));

    expect(purchaseBody).toContain('await initRevenueCat(isOperationAccountCurrent);');
    expect(purchaseBody).toContain('if (!(await syncRevenueCatIdentity(isOperationAccountCurrent)))');
    expect(purchaseBody).toContain('Purchases.purchasePackage(pkg)');
    expect(purchaseBody).toContain('revenueCatPremiumMetadata(customerInfo, pkg.product.identifier)');
    expect(purchaseBody).toContain('persistStorePremiumLocally');

    expect(restoreBody).toContain('await initRevenueCat(isOperationAccountCurrent);');
    expect(restoreBody).toContain('await syncRevenueCatIdentity(isOperationAccountCurrent)');
    expect(restoreBody).toContain('Purchases.restorePurchases()');
    expect(restoreBody).toContain('inferPremiumPlanFromProductId');
    expect(restoreBody).toContain('persistStorePremiumLocally');
  });

  it('keeps manage mode as a store subscription link, not as the retired paywall', () => {
    // manage=1 уводит на системную страницу подписок — ветка в paywall_navigation.
    expect(navigation).toContain("normalized.manage === '1'");
    expect(navigation).toContain("'/manage_subscription' as any");
    expect(dispatcher).toContain("firstParam(params.manage) === '1'");
    expect(manageSubscription).toContain('getStoreManageUrl');
    expect(manageSubscription).toContain('apps.apple.com/account/subscriptions');
    expect(manageSubscription).toContain('play.google.com/store/account/subscriptions');
    expect(manageSubscription).toContain('safeRouterBack(router, closeFallback)');
  });
});
