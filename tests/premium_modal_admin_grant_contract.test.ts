import fs from 'fs';
import path from 'path';

describe('premium modal dispatcher contract', () => {
  const root = process.cwd();
  const dispatcher = fs.readFileSync(path.join(root, 'app', 'premium_modal.tsx'), 'utf8');
  const purchase = fs.readFileSync(path.join(root, 'app', 'paywall_purchase.ts'), 'utf8');

  it('keeps /premium_modal as a dispatcher only, with no retired paywall UI', () => {
    expect(dispatcher).toContain('PremiumModalDispatcher');
    expect(dispatcher).toContain('PAYWALL_ROUTES');
    expect(dispatcher).toContain('/paywall_a');
    expect(dispatcher).toContain('/paywall_b');
    expect(dispatcher).toContain('/paywall_c');
    expect(dispatcher).toContain('router.replace({');

    expect(dispatcher).not.toContain('const handlePurchase = async');
    expect(dispatcher).not.toContain('paywall: \'v1\'');
    expect(dispatcher).not.toContain('variant: \'v1\'');
    expect(dispatcher).not.toContain('Учись быстрее с Premium');
    expect(dispatcher).not.toContain('Почему Premium тебе нужен');
  });

  it('does not block routing on a fresh Firestore config read', () => {
    expect(dispatcher).toContain('refreshPaywallAbConfigInBackground');
    expect(dispatcher).toContain('resolvePaywallAbVariant');
    expect(purchase).toContain('usePaywallPurchase');
  });

  it('keeps purchase and restore safety in the shared A/B/C purchase hook', () => {
    const purchaseStart = purchase.indexOf('const handlePurchase = useCallback');
    const restoreStart = purchase.indexOf('const handleRestore = useCallback');
    expect(purchaseStart).toBeGreaterThan(-1);
    expect(restoreStart).toBeGreaterThan(-1);

    const purchaseBody = purchase.slice(purchaseStart, restoreStart);
    const restoreBody = purchase.slice(restoreStart, purchase.indexOf('const handleClose = useCallback', restoreStart));

    expect(purchaseBody).toContain('await initRevenueCat();');
    expect(purchaseBody).toContain('if (!(await syncRevenueCatIdentity()))');
    expect(purchaseBody).toContain('Purchases.purchasePackage(pkg)');
    expect(purchaseBody).toContain('revenueCatPremiumMetadata(customerInfo, pkg.product.identifier)');
    expect(purchaseBody).toContain('persistStorePremiumLocally');

    expect(restoreBody).toContain('await initRevenueCat();');
    expect(restoreBody).toContain('await syncRevenueCatIdentity()');
    expect(restoreBody).toContain('Purchases.restorePurchases()');
    expect(restoreBody).toContain('inferPremiumPlanFromProductId');
    expect(restoreBody).toContain('persistStorePremiumLocally');
  });

  it('keeps manage mode as a store subscription link, not as the retired paywall', () => {
    expect(dispatcher).toContain('getSubscriptionManageUrl');
    expect(dispatcher).toContain('apps.apple.com/account/subscriptions');
    expect(dispatcher).toContain('play.google.com/store/account/subscriptions');
    expect(dispatcher).toContain('safeRouterBack(router)');
  });
});
