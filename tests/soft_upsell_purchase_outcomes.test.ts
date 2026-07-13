import { classifyPurchaseActivation } from '../app/paywall_purchase_outcomes';

const active = (periodType: string, productIdentifier = 'product') => ({
  entitlements: { active: { premium: { periodType, productIdentifier } } },
  activeSubscriptions: ['product'],
});

test('only a confirmed active annual TRIAL is a trial conversion', () => {
  expect(classifyPurchaseActivation(active('TRIAL'), 'yearly', 'product')).toBe('trial');
  expect(classifyPurchaseActivation(active('NORMAL'), 'yearly', 'product')).toBe('paid');
  expect(classifyPurchaseActivation(active('TRIAL'), 'monthly', 'product')).toBe('paid');
  expect(classifyPurchaseActivation(active('TRIAL'), 'lifetime', 'product')).toBe('paid');
});

test('eligibility without an applied entitlement is pending, not trial or failure', () => {
  expect(classifyPurchaseActivation({ entitlements: { active: {} }, activeSubscriptions: [] }, 'yearly', 'product')).toBe('pending');
  expect(classifyPurchaseActivation(undefined, 'yearly', 'product')).toBe('pending');
});

test('an active subscription without entitlement metadata is still paid activation', () => {
  expect(classifyPurchaseActivation({ entitlements: { active: {} }, activeSubscriptions: ['monthly'] }, 'monthly', 'monthly')).toBe('paid');
});

test('an unrelated active entitlement never confirms the attempted product', () => {
  expect(classifyPurchaseActivation(active('TRIAL', 'old_yearly'), 'yearly', 'new_yearly')).toBe('pending');
});
