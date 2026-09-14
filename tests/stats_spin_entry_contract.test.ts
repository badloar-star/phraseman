import { readFileSync } from 'fs';
import { join } from 'path';

test('Statistics keeps a compact Spin button next to Gifts', () => {
  const source = readFileSync(join(process.cwd(), 'app', 'streak_stats.tsx'), 'utf8');
  expect(source).toContain('testID="stats-header-spins"');
  expect(source).toContain("router.push('/level_reward_spin' as any)");
  expect(source).toContain('readLocalLevelSpinBalance');
  expect(source).toContain("onAppEvent('level_spin_balance_changed'");
  expect(source).toContain('spinBalance > 0');
  expect(source).toContain('withRepeat(withSequence(withTiming(1.07');
  expect(source).toContain('const refreshRewardInventoryCounts = useCallback');
  expect(source).toContain('readAttemptRestoreGiftCount');
  expect(source).toContain('legacyPendingGiftCount + attemptRestoreGiftCount + currentSpinBalance');
  expect(source).toContain("onAppEvent('level_gift_inventory_changed', refreshRewardInventoryCounts)");
  expect(source).toContain("onAppEvent('level_spin_balance_changed', refreshRewardInventoryCounts)");
});
