import { claimInitialInventoryResolution, classifyPaywallInventory } from '../app/paywall_inventory_analytics';

describe('paywall inventory analytics classifier', () => {
  test.each([
    [{ monthly: true, yearly: true, lifetime: false }, true, 'ready'],
    [{ monthly: true, yearly: false, lifetime: false }, true, 'partial_core'],
    [{ monthly: false, yearly: true, lifetime: false }, true, 'partial_core'],
    [{ monthly: false, yearly: false, lifetime: false }, true, 'no_core_packages'],
    [{ monthly: true, yearly: true, lifetime: true }, false, 'load_failed'],
  ] as const)('classifies finite package readiness %#', (packages, loadSucceeded, status) => {
    expect(classifyPaywallInventory(packages, {
      loadSucceeded,
      lifetimeExpected: true,
      loadAttempts: 4,
    })).toEqual({
      inventory_status: status,
      monthly_available: packages.monthly ? 1 : 0,
      yearly_available: packages.yearly ? 1 : 0,
      lifetime_available: packages.lifetime ? 1 : 0,
      lifetime_expected: 1,
      load_attempts: 2,
    });
  });

  it('never exposes arbitrary values', () => {
    const result = classifyPaywallInventory({}, {
      loadSucceeded: false,
      lifetimeExpected: false,
      loadAttempts: -10,
    });
    expect(result.inventory_status).toBe('load_failed');
    expect(result.load_attempts).toBe(1);
    expect(Object.keys(result).sort()).toEqual([
      'inventory_status', 'lifetime_available', 'lifetime_expected',
      'load_attempts', 'monthly_available', 'yearly_available',
    ]);
  });

  it('claims an initial resolution only once per impression gate', () => {
    const gate = { emitted: false };
    expect(claimInitialInventoryResolution(gate)).toBe(true);
    expect(claimInitialInventoryResolution(gate)).toBe(false);
  });
});
