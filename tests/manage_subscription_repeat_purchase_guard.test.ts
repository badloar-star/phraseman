import fs from 'fs';
import path from 'path';

const screenSource = fs.readFileSync(path.join(process.cwd(), 'app', 'manage_subscription.tsx'), 'utf8');
const purchaseSource = fs.readFileSync(path.join(process.cwd(), 'app', 'manage_subscription_purchase.ts'), 'utf8');

describe('manage subscription repeat purchase guard', () => {
  it('does not default unknown RevenueCat plan state to monthly', () => {
    expect(screenSource).toContain('inferPremiumPlanFromCustomerInfo(info, fallbackPlan)');
    expect(screenSource).not.toContain("inferPremiumPlanFromProductId(metadata.productId, 'monthly')");
    expect(screenSource).toContain("LP('Подписка Plus'");
  });

  it('rechecks the active plan before opening the store change-plan sheet', () => {
    const handlerStart = screenSource.indexOf('const handleChangePlan = useCallback');
    const serviceCall = screenSource.indexOf('changeManageSubscriptionPlanForGeneration', handlerStart);
    const preflight = purchaseSource.indexOf('const latestPlan = inferPremiumPlanFromCustomerInfo(latestInfo, fallbackPlan)');
    const alreadyActiveGuard = purchaseSource.indexOf("latestPlan && latestPlan !== 'monthly'", preflight);
    const purchaseCall = purchaseSource.indexOf('Purchases.purchasePackage(yearlyPackage', alreadyActiveGuard);

    expect(handlerStart).toBeGreaterThan(-1);
    expect(serviceCall).toBeGreaterThan(handlerStart);
    expect(preflight).toBeGreaterThan(-1);
    expect(alreadyActiveGuard).toBeGreaterThan(preflight);
    expect(purchaseCall).toBeGreaterThan(alreadyActiveGuard);
  });

  it('keeps the screen scroll on the responsive fast deceleration, not the sluggish RN default', () => {
    // зачем: аудит скорости скролла (2026-08-04) заменил decelerationRate="normal"
    // на "fast" по всему приложению, включая этот экран. Тест ловит регрессию,
    // если кто-то добавит "normal" сюда заново.
    expect(screenSource).toContain('decelerationRate="fast"');
    expect(screenSource).not.toContain('decelerationRate="normal"');
  });
});
