import fs from 'fs';
import path from 'path';

describe('premium modal dispatcher contract', () => {
  const root = process.cwd();
  // CRLF в рабочей копии Windows — нормализуем: проверка entryToShow многострочная (сторож source_guard_eol_normalized)
  const dispatcher = fs.readFileSync(path.join(root, 'app', 'premium_modal.tsx'), 'utf8').replace(/\r\n/g, '\n');
  const navigation = fs.readFileSync(path.join(root, 'app', 'paywall_navigation.ts'), 'utf8');
  const manageSubscription = fs.readFileSync(path.join(root, 'app', 'manage_subscription.tsx'), 'utf8');
  const purchase = fs.readFileSync(path.join(root, 'app', 'paywall_purchase.ts'), 'utf8');

  it('keeps /premium_modal as a dispatcher only, with no retired paywall UI', () => {
    expect(dispatcher).toContain('PremiumModalDispatcher');
    // 2026-09-30 (D78): A/B-маршруты A–G удалены — диспетчер сам рисует
    // единственный пейвол Plus после проверки доступа.
    expect(navigation).not.toContain('PAYWALL_ROUTES');
    expect(dispatcher).toContain('openPremiumPaywall');
    // зачем (разбор красных 15.10): 6e1b16df6 (R58 #12) — экран берёт entryToShow: решение «show» или удержание после своей покупки
    expect(dispatcher).toMatch(/const entryToShow = entryResolution\?\.decision === 'show'\s*\n\s*\? entryResolution\.entry\s*\n\s*: \(keepShownForSelfClose \? shownEntryRef\.current : null\);/);
    expect(dispatcher).toContain('<PaywallPlusScreen entry={entryToShow} />');
    expect(dispatcher).not.toMatch(/\/paywall_[a-g]\b/);
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

  it('does not block routing on any remote A/B config read', () => {
    // Выбора варианта больше нет: ни Firestore-конфига, ни ожидания stableId.
    expect(navigation).not.toContain('refreshPaywallAbConfigInBackground');
    expect(navigation).not.toContain('resolvePaywallAbVariant');
    expect(dispatcher).not.toContain('resolveCurrentPaywallRoute');
    expect(purchase).toContain('usePaywallPurchase');
  });

  it('keeps purchase and restore safety in the shared purchase hook', () => {
    const purchaseStart = purchase.indexOf('const handlePurchase = useCallback');
    const restoreStart = purchase.indexOf('const handleRestore = useCallback');
    expect(purchaseStart).toBeGreaterThan(-1);
    expect(restoreStart).toBeGreaterThan(-1);

    const purchaseBody = purchase.slice(purchaseStart, restoreStart);
    const restoreBody = purchase.slice(restoreStart, purchase.indexOf('const handleClose = useCallback', restoreStart));

    // зачем (D158, M4): старт магазина идёт под потолком (withLoadTimeout / awaitWithinInitCap) — «зависший старт» не крутит спиннер вечно; смысл прежний: магазин поднят ДО оплаты.
    expect(purchaseBody).toContain('initRevenueCat(isOperationAccountCurrent)');
    expect(purchaseBody.indexOf('initRevenueCat(isOperationAccountCurrent)')).toBeLessThan(purchaseBody.indexOf('Purchases.purchasePackage(pkg)'));
    // зачем (D158, d33ab1b66): личность сверяется до оплаты с потолком (withLoadTimeout) — смысл тот же:
    // нет подтверждённой личности RevenueCat → оплата не начинается.
    expect(purchaseBody).toContain('withLoadTimeout(syncRevenueCatIdentity(isOperationAccountCurrent)');
    // зачем (D158, M4): вторая ветка — под потолком awaitWithinInitCap; результат идёт в тот же identityReady, и оплата без него не начинается (проверка ниже)
    expect(purchaseBody).toContain("awaitWithinInitCap('syncRevenueCatIdentity', syncRevenueCatIdentity(isOperationAccountCurrent)");
    expect(purchaseBody).toContain('identityReady = capped.value;');
    expect(purchaseBody.indexOf('if (!identityReady) {')).toBeLessThan(purchaseBody.indexOf('Purchases.purchasePackage(pkg)'));
    expect(purchaseBody).toContain('Purchases.purchasePackage(pkg)');
    expect(purchaseBody).toContain('revenueCatPremiumMetadata(customerInfo, pkg.product.identifier)');
    expect(purchaseBody).toContain('persistStorePremiumLocally');

    // зачем (15.10, d6e5470c9): инициализация и сверка личности идут под потолком awaitWithinInitCap, по таймауту магазин не вызывается
    expect(restoreBody).toContain("awaitWithinInitCap('initRevenueCat', initRevenueCat(isOperationAccountCurrent)");
    expect(restoreBody).toContain("awaitWithinInitCap('syncRevenueCatIdentity', syncRevenueCatIdentity(isOperationAccountCurrent)");
    expect(restoreBody).toContain("stopRestoreBeforeStore('initRevenueCat'");
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
