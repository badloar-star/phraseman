import { readFileSync } from 'fs';
import { join } from 'path';

// зачем (PM-046, владелец): раздел /level_reward_spin снят — кнопка спина в
// шапке статистики (stats-header-spins) удалена вместе с её пульсом и
// состоянием (spinBalance/spinButtonPulse). Прежний тест требовал их
// присутствия, то есть сторожил отменённое правило. Что осталось важным:
// счётчик подарков по-прежнему учитывает прежний баланс спинов через
// currentSpinBalance (локальная переменная, не state) — старые начисленные
// спины не должны потеряться молча, поэтому эта часть контракта остаётся.
test('Statistics dropped the Spin button but still folds any leftover spin balance into Gifts', () => {
  const source = readFileSync(join(process.cwd(), 'app', 'streak_stats.tsx'), 'utf8');
  expect(source).not.toContain('testID="stats-header-spins"');
  expect(source).not.toContain("router.push('/level_reward_spin' as any)");
  expect(source).toContain('readLocalLevelSpinBalance');
  expect(source).toContain('const refreshRewardInventoryCounts = useCallback');
  expect(source).toContain('readAttemptRestoreGiftCount');
  expect(source).toContain('legacyPendingGiftCount + attemptRestoreGiftCount + currentSpinBalance');
  expect(source).toContain("onAppEvent('level_gift_inventory_changed', refreshRewardInventoryCounts)");
  expect(source).toContain("onAppEvent('level_spin_balance_changed', refreshRewardInventoryCounts)");
});
