import { resolveFeatureAccessDecision } from '../app/feature_access_resolution';

test.each([
  [false, false, 'wait'],
  [false, true, 'wait'],
  [true, false, 'paywall'],
  [true, true, 'allow'],
] as const)('resolved=%s granted=%s -> %s', (accessResolved, granted, expected) => {
  expect(resolveFeatureAccessDecision({ accessResolved, granted })).toBe(expected);
});
