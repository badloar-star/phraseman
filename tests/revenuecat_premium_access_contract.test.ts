import fs from 'fs';
import path from 'path';

describe('RevenueCat Premium access wiring', () => {
  const root = process.cwd();
  const initSource = fs.readFileSync(path.join(root, 'app', 'revenuecat_init.ts'), 'utf8');
  const guardSource = fs.readFileSync(path.join(root, 'app', 'premium_guard.ts'), 'utf8');

  it('uses the canonical premium entitlement at startup and in the live listener', () => {
    expect(initSource).toContain('revenueCatCustomerInfoHasPremiumAccess(info as any)');
    expect(initSource).not.toContain('Object.keys((info as any).entitlements.active).length > 0');
    expect(initSource).not.toContain('const entitlementsActive = Object.keys');
    expect(guardSource).toContain('revenueCatCustomerInfoHasPremiumAccess(info as any)');
  });

  it('binds delayed listener and startup writes to the same account generation', () => {
    expect(initSource).toContain('const eventAccount = captureAccountGeneration();');
    expect(initSource).toContain('const isEventAccountCurrent = () => isCurrentAccountGeneration(eventAccount);');
    expect(initSource).toContain('readCurrentRevenueCatCustomerInfo(isEventAccountCurrent)');
    expect(initSource).toContain('readCurrentRevenueCatCustomerInfo(isInitAccountCurrent)');
    expect(initSource).toContain('if (!identityReady || !isInitAccountCurrent()) return;');
    expect(initSource).toContain('withAccountTransitionLockWithDeadline(');
    expect(initSource).toContain('applyPushedCustomerInfo(currentInfo, isEventAccountCurrent)');
    expect(initSource).toContain('persistStorePremiumLocally(plan, metadata, isCurrent, false, true)');
    expect(initSource).toContain('persistStorePremiumLocally(plan, metadata, isInitAccountCurrent, false, true)');
    expect(initSource).toContain('isCurrentAccountGeneration(syncAccount)');
    expect(initSource).not.toContain('Purchases.getCustomerInfo(),');
    expect(initSource).not.toContain('persistStorePremiumLocally(plan, metadata, isCurrent);');
  });
});
