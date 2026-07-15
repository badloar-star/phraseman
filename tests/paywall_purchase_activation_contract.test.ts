import fs from 'fs';
import path from 'path';

describe('new paywalls activate Premium locally after RevenueCat success', () => {
  const sharedHook = fs.readFileSync(path.join(process.cwd(), 'app', 'paywall_purchase.ts'), 'utf8');

  it('keeps the dev preview open and explains that no store purchase was started', () => {
    const purchaseStart = sharedHook.indexOf('const handlePurchase = useCallback');
    const packageSelection = sharedHook.indexOf("const pkg = selected === 'lifetime'", purchaseStart);
    expect(purchaseStart).toBeGreaterThan(-1);
    expect(packageSelection).toBeGreaterThan(purchaseStart);

    const devPreviewBranch = sharedHook.slice(purchaseStart, packageSelection);
    expect(devPreviewBranch).toContain('showDevPurchasePreviewAlert(lang)');
    expect(devPreviewBranch).not.toContain('dismissPaywallModal(router)');
    expect(devPreviewBranch).not.toContain('finishPersonalPlanActivationFlow()');
    expect(sharedHook).toContain('Покупка не запускалась');
    expect(sharedHook).toContain('сборке с подключённым магазином');
  });

  it('shared A/B/C purchase hook persists CustomerInfo metadata and emits activation', () => {
    const purchaseStart = sharedHook.indexOf('const handlePurchase = useCallback');
    const restoreStart = sharedHook.indexOf('const handleRestore = useCallback');
    expect(purchaseStart).toBeGreaterThan(-1);
    expect(restoreStart).toBeGreaterThan(-1);

    const purchaseBody = sharedHook.slice(purchaseStart, restoreStart);

    expect(purchaseBody).toContain('const { customerInfo } = await Purchases.purchasePackage(pkg)');
    expect(purchaseBody).toContain('revenueCatPremiumMetadata(customerInfo, pkg.product.identifier)');
    expect(purchaseBody).toContain('customerInfoConfirmsProductAccess(customerInfo, pkg.product.identifier)');
    expect(purchaseBody).not.toContain('Object.keys(customerInfo?.entitlements?.active ?? {}).length > 0');
    expect(purchaseBody).toContain('persistStorePremiumLocally');
    expect(purchaseBody).toContain("emitAppEvent('premium_activated')");
    expect(purchaseBody).toContain('await refillToMax(isOperationAccountCurrent)');
    expect(purchaseBody).toContain('resumeLessonAfterPremium(router, resumeLessonId)');
  });

  it('does not age-gate the store purchase before RevenueCat', () => {
    const purchaseStart = sharedHook.indexOf('const handlePurchase = useCallback');
    const restoreStart = sharedHook.indexOf('const handleRestore = useCallback');
    expect(purchaseStart).toBeGreaterThan(-1);
    expect(restoreStart).toBeGreaterThan(-1);

    const purchaseBody = sharedHook.slice(purchaseStart, restoreStart);

    expect(sharedHook).not.toContain("import { isFullAccess } from './age_gate';");
    expect(purchaseBody).not.toContain('isFullAccess()');
    expect(purchaseBody.indexOf("void trackEvent('paywall_cta_click'")).toBeLessThan(
      purchaseBody.indexOf('const pkg = selected ==='),
    );
    expect(purchaseBody.indexOf('const pkg = selected ===')).toBeLessThan(
      purchaseBody.indexOf('Purchases.purchasePackage(pkg)'),
    );
  });

  it('shared A/B/C restore path syncs identity and persists active subscriptions locally', () => {
    const restoreStart = sharedHook.indexOf('const handleRestore = useCallback');
    const closeStart = sharedHook.indexOf('const handleClose = useCallback');
    expect(restoreStart).toBeGreaterThan(-1);
    expect(closeStart).toBeGreaterThan(-1);

    const restoreBody = sharedHook.slice(restoreStart, closeStart);

    expect(restoreBody.indexOf('await syncRevenueCatIdentity(isOperationAccountCurrent)')).toBeGreaterThan(-1);
    expect(restoreBody.indexOf('await syncRevenueCatIdentity(isOperationAccountCurrent)')).toBeLessThan(
      restoreBody.indexOf('Purchases.restorePurchases()'),
    );
    expect(restoreBody).toContain('revenueCatCustomerInfoHasPremiumAccess(info)');
    expect(restoreBody).not.toContain('Object.keys(info.entitlements.active).length > 0');
    expect(restoreBody).toContain('revenueCatPremiumMetadata(info)');
    expect(restoreBody).toContain('inferPremiumPlanFromProductId');
    expect(restoreBody).toContain('persistStorePremiumLocally');
    expect(restoreBody).toContain("emitAppEvent('premium_activated')");
    expect(restoreBody).toContain('await refillToMax(isOperationAccountCurrent)');
    expect(restoreBody).toContain('resumeLessonAfterPremium(router, resumeLessonId)');
  });

  it('does not let purchase and restore run at the same time', () => {
    const purchaseStart = sharedHook.indexOf('const handlePurchase = useCallback');
    const restoreStart = sharedHook.indexOf('const handleRestore = useCallback');
    const closeStart = sharedHook.indexOf('const handleClose = useCallback');
    expect(purchaseStart).toBeGreaterThan(-1);
    expect(restoreStart).toBeGreaterThan(-1);
    expect(closeStart).toBeGreaterThan(-1);

    const purchaseBody = sharedHook.slice(purchaseStart, restoreStart);
    const restoreBody = sharedHook.slice(restoreStart, closeStart);

    expect(purchaseBody).toContain("operationRef.current = 'purchase'");
    expect(restoreBody).toContain("operationRef.current = 'restore'");
    expect(sharedHook).toContain('}, [selected, packages, purchasing, restoring, router');
    expect(sharedHook).toContain('}, [router, restoring, purchasing, context');
  });

  it('does not apply a store result to a different account generation', () => {
    expect((sharedHook.match(/const operationAccount = captureAccountGeneration\(\);/g) ?? []).length).toBe(2);
    expect(sharedHook).toContain('const isOperationAccountCurrent = () => isCurrentAccountGeneration(operationAccount);');
    expect(sharedHook).toContain('initRevenueCat(isOperationAccountCurrent)');
    expect(sharedHook).toContain('syncRevenueCatIdentity(isOperationAccountCurrent)');
    expect(sharedHook).toContain('withAccountTransitionLock(async () => {');
    expect(sharedHook).toMatch(/persistStorePremiumLocally\([\s\S]*?isOperationAccountCurrent,[\s\S]*?false,/);
    expect(sharedHook).toContain('if (!persisted || !isOperationAccountCurrent()) return false;');
  });

  it('enforces the lifetime kill-switch in selection and purchase, not only in UI', () => {
    expect(sharedHook).toContain("if (plan === 'lifetime' && !lifetimeAvailable) return;");
    expect(sharedHook).toContain("if (selected === 'lifetime' && !isLifetimeButtonEnabled()) {");
    expect(sharedHook).toContain("onAppEvent('remote_config_changed'");
    expect(sharedHook).toContain("if (!lifetimeAvailable && selected === 'lifetime') setSelected('yearly');");
  });

  it('retired v2 route only redirects into the active A/B/C dispatcher', () => {
    const retiredRoute = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_modal_v2.tsx'), 'utf8');

    expect(retiredRoute).toContain("pathname: '/premium_modal'");
    expect(retiredRoute).not.toContain('const handlePurchase = useCallback');
    expect(retiredRoute).not.toContain('const handleRestore = useCallback');
    expect(retiredRoute).not.toContain("paywall: 'v2'");
  });
});
