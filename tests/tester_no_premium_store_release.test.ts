import fs from 'fs';
import path from 'path';

describe('tester_no_premium release boundary', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('ignores and best-effort clears the legacy QA flag in store releases', async () => {
    jest.doMock('../app/config', () => ({ IS_STORE_RELEASE: true }));
    const { resolveTesterNoPremiumOverride } = await import('../app/tester_premium_override');
    const asyncStorage = (await import('@react-native-async-storage/async-storage')).default;

    expect(resolveTesterNoPremiumOverride('true')).toBe(false);
    expect(asyncStorage.removeItem).toHaveBeenCalledWith('tester_no_premium');
  });

  it('preserves the QA flag in development and preview builds', async () => {
    jest.doMock('../app/config', () => ({ IS_STORE_RELEASE: false }));
    const { resolveTesterNoPremiumOverride } = await import('../app/tester_premium_override');
    const asyncStorage = (await import('@react-native-async-storage/async-storage')).default;

    expect(resolveTesterNoPremiumOverride('true')).toBe(true);
    expect(asyncStorage.removeItem).not.toHaveBeenCalled();
  });

  it('routes every entitlement decision through the release-aware resolver', () => {
    const guard = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_guard.ts'), 'utf8');
    const context = fs.readFileSync(path.join(process.cwd(), 'components', 'PremiumContext.tsx'), 'utf8');
    const activationGuard = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_activation_event_guard.ts'), 'utf8');
    const revenueCat = fs.readFileSync(path.join(process.cwd(), 'app', 'revenuecat_init.ts'), 'utf8');
    const stats = fs.readFileSync(path.join(process.cwd(), 'app', 'streak_stats.tsx'), 'utf8');

    expect(guard).toContain("from './tester_premium_override'");
    expect((guard.match(/resolveTesterNoPremiumOverride/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(context).toContain("from '../app/tester_premium_override'");
    expect(context).toContain('resolveTesterNoPremiumOverride(testerValues.tester_no_premium)');
    expect(activationGuard).toContain('resolveTesterNoPremiumOverride(values.tester_no_premium, isStoreRelease)');
    expect((revenueCat.match(/resolveTesterNoPremiumOverride\(noPremium\)/g) ?? [])).toHaveLength(2);
    expect(stats).toContain('setTesterStripsPremium(resolveTesterNoPremiumOverride(v))');
  });
});
