import fs from 'fs';
import path from 'path';

describe('RevenueCat Premium access wiring', () => {
  const root = process.cwd();
  const initSource = fs.readFileSync(path.join(root, 'app', 'revenuecat_init.ts'), 'utf8');
  const guardSource = fs.readFileSync(path.join(root, 'app', 'premium_guard.ts'), 'utf8');

  // зачем: сторож охраняет ПРАВИЛО «премиум = канонический entitlement `premium`»,
  // а не то, как записан тип аргумента. Раньше матч был прибит к тексту
  // `(info as any)`; когда денежный путь типизировали по-настоящему
  // (CustomerInfo вместо unknown), сторож упал, хотя правило не нарушено.
  // Теперь матчим сам вызов, игнорируя приведение типа, — сторож переживает
  // типизацию, но по-прежнему ловит возврат к подсчёту всех entitlement'ов
  // (любой посторонний продукт открывал бы премиум).
  const callsCanonicalEntitlement = (source: string) =>
    /revenueCatCustomerInfoHasPremiumAccess\(\s*info(\s+as\s+any)?\s*\)/.test(source);

  it('uses the canonical premium entitlement at startup and in the live listener', () => {
    expect(callsCanonicalEntitlement(initSource)).toBe(true);
    expect(initSource).not.toContain('.entitlements.active).length > 0');
    expect(initSource).not.toContain('const entitlementsActive = Object.keys');
    expect(callsCanonicalEntitlement(guardSource)).toBe(true);
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
