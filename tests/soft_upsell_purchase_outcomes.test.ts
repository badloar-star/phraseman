import { classifyPurchaseActivation } from '../app/paywall_purchase_outcomes';

const active = (periodType: string) => ({
  entitlements: { active: { premium: { periodType } } },
  activeSubscriptions: ['product'],
});

test('only a confirmed active annual TRIAL is a trial conversion', () => {
  expect(classifyPurchaseActivation(active('TRIAL'), 'yearly')).toBe('trial');
  expect(classifyPurchaseActivation(active('NORMAL'), 'yearly')).toBe('paid');
  expect(classifyPurchaseActivation(active('TRIAL'), 'monthly')).toBe('paid');
  expect(classifyPurchaseActivation(active('TRIAL'), 'lifetime')).toBe('paid');
});

test('eligibility without an applied entitlement is pending, not trial or failure', () => {
  expect(classifyPurchaseActivation({ entitlements: { active: {} }, activeSubscriptions: [] }, 'yearly')).toBe('pending');
  expect(classifyPurchaseActivation(undefined, 'yearly')).toBe('pending');
});

test('an active subscription without entitlement metadata is still paid activation', () => {
  expect(classifyPurchaseActivation({ entitlements: { active: {} }, activeSubscriptions: ['monthly'] }, 'monthly')).toBe('paid');
});
