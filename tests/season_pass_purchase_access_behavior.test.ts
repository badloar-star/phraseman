import fs from 'node:fs';
import path from 'node:path';
import {
  resolveSeasonPassPurchaseAccess,
} from '../app/season_pass_purchase_access';

describe('season pass purchase access decision', () => {
  test.each([
    [{ entitlementResolved: false, plusActive: false, passOwned: false }, 'waiting'],
    [{ entitlementResolved: true, plusActive: true, passOwned: false }, 'plus'],
    [{ entitlementResolved: true, plusActive: false, passOwned: true }, 'owned'],
    [{ entitlementResolved: true, plusActive: false, passOwned: false }, 'buyable'],
  ] as const)('%j resolves to %s', (input, expected) => {
    expect(resolveSeasonPassPurchaseAccess(input)).toBe(expected);
  });
});

describe('season pass purchase wiring', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app/season_pass.tsx'), 'utf8');

  test('the 250-pearl CTA is rendered only from the resolved purchase decision', () => {
    expect(source).toMatch(/const purchaseAccess = resolveSeasonPassPurchaseAccess\(\{/);
    expect(source).toMatch(/\{purchaseAccess === 'buyable' && \(/);
    expect(source).toMatch(/if \(purchaseAccess !== 'buyable'\) return;/);
  });

  test('Plus and pass entitlement hydrate together before access resolves', () => {
    expect(source).toMatch(/Promise\.all\(\[\s*getVerifiedPremiumAccessStatus\(\{ generation: token \}\)/);
    expect(source).toMatch(/setEntitlementResolved\(true\)/);
  });

  test('fresh canonical Plus is checked after local write preparation and before debit', () => {
    const prepareIndex = source.indexOf('prepareSeasonPassEntitlementLocalWrite(');
    const recheckIndex = source.indexOf('bypassCache: true', prepareIndex);
    const commitIndex = source.indexOf('commitShardCompositeOperation({', recheckIndex);
    expect(prepareIndex).toBeGreaterThan(-1);
    expect(recheckIndex).toBeGreaterThan(prepareIndex);
    expect(commitIndex).toBeGreaterThan(recheckIndex);
  });
});
