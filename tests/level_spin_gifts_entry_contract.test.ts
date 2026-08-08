import { readFileSync } from 'fs';
import { join } from 'path';

describe('Gifts level spin entry', () => {
  const source = readFileSync(join(process.cwd(), 'app', 'level_gifts_inventory.tsx'), 'utf8');

  test('shows a gold cached spin count and navigates to the separate route', () => {
    expect(source).toContain('level-gifts-spins-button');
    expect(source).toContain('readCachedLevelSpinBalance');
    expect(source).toContain('fetchLevelSpinStatus');
    expect(source).toContain("router.push('/level_reward_spin'");
  });

  test('renders a compact honest Spin button in the fixed header, never a scroll plaque', () => {
    const headerEnd = source.indexOf('\n          </View>\n\n          <BouncyScrollView');
    const button = source.indexOf('testID="level-gifts-spins-button"');
    expect(button).toBeGreaterThan(0);
    expect(button).toBeLessThan(headerEnd);
    expect(source).toContain("spinBalance === null");
    expect(source).toContain("ru: 'Спины: количество загружается'");
    expect(source).not.toContain('Вращения');
    expect(source).toContain('useReducedMotion');
    expect(source).toContain("ru: 'Спин'");
    expect(source).toContain('testID="level-gifts-spin-count"');
    expect(source).toContain('styles.spinHeaderButton');
    expect(source).toContain('styles.spinCountBadge');
    expect(source).not.toContain('name="sparkles"');
  });

  test('subscribes only while focused and balance events never trigger a status request loop', () => {
    const listenerStart = source.indexOf("onAppEvent('level_spin_balance_changed'");
    const listener = source.slice(listenerStart, source.indexOf('    return () => {', listenerStart));
    expect(listener).toContain('peekLevelSpinBalance');
    expect(listener).not.toContain('fetchLevelSpinStatus');
    expect(listener).not.toContain('loadSpinBalance');
    expect(source).not.toContain("useEffect(() => {\n    const subscription = onAppEvent('level_spin_balance_changed'");
  });

  test('runs the balance pulse only while the Gifts route and app are active', () => {
    expect(source).toContain("AppState.addEventListener('change'");
    expect(source).toContain("state === 'active'");
    const pulseStart = source.indexOf('const startSpinPulse');
    const focusedRefresh = source.indexOf('useFocusEffect', pulseStart);
    expect(pulseStart).toBeGreaterThan(0);
    expect(focusedRefresh).toBeGreaterThan(pulseStart);
  });

  test('keeps legacy pending and active gift inventory intact', () => {
    expect(source).toContain('loadPendingLevelGiftInventory');
    expect(source).toContain('loadActiveLevelGiftInventory');
    expect(source).toContain('<LevelGiftModal');
    expect(source).toContain('<LevelGiftDualModal');
  });

  test('includes cached spin credits in the existing gifts badge without removing legacy gifts', () => {
    const statsCache = readFileSync(join(process.cwd(), 'app', 'statsCache.ts'), 'utf8');
    const statsScreen = readFileSync(join(process.cwd(), 'app', 'streak_stats.tsx'), 'utf8');
    expect(statsCache).toContain('readCachedLevelSpinBalance');
    expect(statsCache).toContain('legacyPendingGiftCount + spinBalance');
    expect(statsScreen).toContain('readCachedLevelSpinBalance');
    expect(statsScreen).toContain('legacyPendingGiftCount + spinBalance');
  });
});
