import { shouldDevUnlockStatsPremiumContent } from '../app/stats_premium_access';

test('keeps premium stats locked while tester premium override is loading', () => {
  expect(shouldDevUnlockStatsPremiumContent(true, null)).toBe(false);
});

test('unlocks premium stats in dev only after tester override confirms premium is not stripped', () => {
  expect(shouldDevUnlockStatsPremiumContent(true, false)).toBe(true);
  expect(shouldDevUnlockStatsPremiumContent(true, true)).toBe(false);
  expect(shouldDevUnlockStatsPremiumContent(false, false)).toBe(false);
});

/**
 * СТОРОЖ (владелец 2026-09-14: «статистика не скрыта в DEV, когда фри-мод
 * включаю»). DEV-центр снимает Plus через dev_local_plus_override = 'removed';
 * раньше обход блюра этот механизм не читал и статистика оставалась открытой
 * поверх isPremium === false. Любое явное снятие Plus — замки на месте.
 */
test('DEV-«Фри» (dev_local_plus_override removed) выключает обход блюра при любом тестерском флаге', () => {
  expect(shouldDevUnlockStatsPremiumContent(true, false, 'removed')).toBe(false);
  expect(shouldDevUnlockStatsPremiumContent(true, null, 'removed')).toBe(false);
  expect(shouldDevUnlockStatsPremiumContent(true, true, 'removed')).toBe(false);
});

test('локальная DEV-выдача Plus и наследование не мешают обходу', () => {
  expect(shouldDevUnlockStatsPremiumContent(true, false, 'granted')).toBe(true);
  expect(shouldDevUnlockStatsPremiumContent(true, false, 'inherit')).toBe(true);
  // Вне DEV-сборки обхода нет ни при каком переключателе.
  expect(shouldDevUnlockStatsPremiumContent(false, false, 'granted')).toBe(false);
});
