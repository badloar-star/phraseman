import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'app', 'manage_subscription.tsx'), 'utf8');

describe('manage subscription repeat purchase guard', () => {
  it('does not default unknown RevenueCat plan state to monthly', () => {
    expect(source).toContain('inferPremiumPlanFromCustomerInfo(info, fallbackPlan)');
    expect(source).not.toContain("inferPremiumPlanFromProductId(metadata.productId, 'monthly')");
    expect(source).toContain("LP('Подписка Plus'");
  });

  it('rechecks the active plan before opening the store change-plan sheet', () => {
    const handlerStart = source.indexOf('const handleChangePlan = useCallback');
    const purchaseCall = source.indexOf('Purchases.purchasePackage(yearlyPkg', handlerStart);
    const preflight = source.indexOf('const latestPlan = inferPremiumPlanFromCustomerInfo(latestInfo, fallbackPlan)', handlerStart);
    const alreadyActiveGuard = source.indexOf("latestPlan && latestPlan !== 'monthly'", handlerStart);

    expect(handlerStart).toBeGreaterThan(-1);
    expect(preflight).toBeGreaterThan(handlerStart);
    expect(alreadyActiveGuard).toBeGreaterThan(preflight);
    expect(purchaseCall).toBeGreaterThan(alreadyActiveGuard);
  });
});
