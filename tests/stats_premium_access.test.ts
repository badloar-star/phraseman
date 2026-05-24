import { shouldDevUnlockStatsPremiumContent } from '../app/stats_premium_access';

test('keeps premium stats locked while tester premium override is loading', () => {
  expect(shouldDevUnlockStatsPremiumContent(true, null)).toBe(false);
});

test('unlocks premium stats in dev only after tester override confirms premium is not stripped', () => {
  expect(shouldDevUnlockStatsPremiumContent(true, false)).toBe(true);
  expect(shouldDevUnlockStatsPremiumContent(true, true)).toBe(false);
  expect(shouldDevUnlockStatsPremiumContent(false, false)).toBe(false);
});
