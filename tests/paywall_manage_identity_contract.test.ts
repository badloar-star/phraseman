import fs from 'fs';
import path from 'path';

const root = process.cwd();
const paywall = fs.readFileSync(path.join(root, 'app', 'paywall_purchase.ts'), 'utf8');
const manage = fs.readFileSync(path.join(root, 'app', 'manage_subscription.tsx'), 'utf8');
const settings = fs.readFileSync(path.join(root, 'app', '(tabs)', 'settings.tsx'), 'utf8');

describe('paywall and manage subscription account identity wiring', () => {
  it('keeps store UI outside the transition lock and commits only through the exact-identity boundary', () => {
    const purchase = paywall.slice(
      paywall.indexOf('const handlePurchase = useCallback'),
      paywall.indexOf('const handleRestore = useCallback'),
    );
    const restore = paywall.slice(
      paywall.indexOf('const handleRestore = useCallback'),
      paywall.indexOf('const handleClose = useCallback'),
    );

    expect(purchase).toMatch(/runRevenueCatOperationForGeneration\(\s*operationAccount/);
    expect(restore).toMatch(/runRevenueCatOperationForGeneration\(\s*operationAccount/);
    expect(purchase).toContain('commitRevenueCatResultForGeneration(operationAccount');
    expect(restore).toContain('commitRevenueCatResultForGeneration(operationAccount');
    expect(purchase.indexOf('Purchases.purchasePackage(pkg)')).toBeLessThan(
      purchase.indexOf('commitRevenueCatResultForGeneration(operationAccount'),
    );
    expect(restore.indexOf('Purchases.restorePurchases()')).toBeLessThan(
      restore.indexOf('commitRevenueCatResultForGeneration(operationAccount'),
    );
  });

  it('binds manage-subscription bootstrap to one generation and exact RevenueCat identity', () => {
    const bootstrap = manage.slice(manage.indexOf('useEffect(() => {'), manage.indexOf('const metadata = info'));
    expect(bootstrap).toContain('const generation = screenAccount;');
    expect(bootstrap).toContain('readRevenueCatCustomerInfoForGeneration(generation)');
    expect(bootstrap).not.toContain('Purchases.getCustomerInfo()');
    expect(bootstrap).toContain('isCurrentAccountGeneration(generation, generation.stableId)');
  });

  it('clears account A first-frame state and restarts bootstrap when account generation changes', () => {
    expect(manage).toContain('subscribeAccountGeneration(acceptAccount)');
    expect(manage).toContain('setInfo(null);');
    expect(manage).toContain('setFallbackPlan(null);');
    expect(manage).toContain('setLoading(true);');
    expect(manage).toContain('setYearlyPkg(null);');
    expect(manage).toContain("setYearlyPriceStr('');");
    expect(manage).toContain('setChanging(false);');
    expect(manage).toContain('setShowCancelSheet(false);');
    expect(manage).toContain('setCancelReason(null);');
    expect(manage).toContain("setCancelText('');");
    expect(manage).toContain('const generation = screenAccount;');
    expect(manage).toContain('}, [screenAccount]);');
  });

  it('rejects a stale route plan unless the opaque generation matches the mounted account', () => {
    expect(manage).toContain('!!screenAccount.stableId');
    expect(manage).toContain('routeGeneration === screenAccount.generation');
    expect(manage).toMatch(/const routeParamPlan = !!screenAccount\.stableId[\s\S]*?\? normalizeStoredPremiumPlan/);
    expect(manage).not.toMatch(/params\.account(?!Generation)/);
    expect(manage).toContain('setFallbackPlan(null);');
  });

  it('tags the same-account settings hint with its exact owner and generation', () => {
    const press = settings.slice(settings.indexOf('const plusRowPress = () => {'), settings.indexOf('const confirmClearCache'));
    expect(press).toContain('const account = captureAccountGeneration();');
    expect(press).toContain('isCurrentAccountGeneration(account, account.stableId)');
    expect(press).toContain('accountGeneration: String(account.generation)');
    expect(press).not.toContain('account: account.stableId');
  });

  it('does not let a late account A finally clear account B changing state', () => {
    expect(manage).toContain('if (isManageSubscriptionOperationCurrent(generation)) setChanging(false);');
    expect(manage).not.toMatch(/finally\s*\{\s*setChanging\(false\);\s*\}/);
  });

  it('drops a stale A cancellation closure before haptic, logging, or store navigation', () => {
    const submitStart = manage.indexOf('const submitCancel = useCallback');
    const submit = manage.slice(submitStart, manage.indexOf('return (', submitStart));
    const guard = submit.indexOf('if (!isManageSubscriptionOperationCurrent(screenAccount))');
    expect(guard).toBeGreaterThan(-1);
    expect(submit.indexOf('setShowCancelSheet(false);', guard)).toBeGreaterThan(guard);
    expect(submit.indexOf('setCancelReason(null);', guard)).toBeGreaterThan(guard);
    expect(submit.indexOf("setCancelText('');", guard)).toBeGreaterThan(guard);
    expect(submit.indexOf('hapticTap();')).toBeGreaterThan(submit.indexOf('return;', guard));
    expect(submit.indexOf('logCancelSurvey(')).toBeGreaterThan(submit.indexOf('return;', guard));
    expect(submit.indexOf('Linking.openURL(')).toBeGreaterThan(submit.indexOf('return;', guard));
  });
});
