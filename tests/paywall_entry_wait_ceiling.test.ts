/** PM-214 (04.10): окно Plus не ждёт резолва доступа вечно, если кэша профиля нет (D158). */
import { paywallEntryAccessInputs, resolvePremiumModalEntry } from '../app/paywall_entry_contract';
import { PAYWALL_ENTRY_WAIT_CEILING_MS } from '../app/load_gate_config';

const base = { params: { context: 'no_energy', source: 'direct' }, impressionId: 'imp-1' } as const;

test('ceiling is short — first frame of the paywall, not a 12-second wait', () => {
  expect(PAYWALL_ENTRY_WAIT_CEILING_MS).toBeLessThanOrEqual(2_000);
});

test('before the ceiling an unknown cache keeps waiting (no flash of the paywall to a subscriber)', () => {
  const inputs = paywallEntryAccessInputs({ accessResolved: false, hasPremiumAccess: false, cachedEntitlement: 'unknown', waitCeilingPassed: false });
  expect(inputs.source).toBe('wait');
  expect(resolvePremiumModalEntry({ ...base, ...inputs, cachedEntitlement: 'unknown' }).decision).toBe('wait');
});

test('after the ceiling an unknown cache shows the paywall instead of an endless blank screen', () => {
  const inputs = paywallEntryAccessInputs({ accessResolved: false, hasPremiumAccess: false, cachedEntitlement: 'unknown', waitCeilingPassed: true });
  expect(inputs).toEqual({ accessResolved: true, hasPremiumAccess: false, source: 'ceiling_cache' });
  expect(resolvePremiumModalEntry({ ...base, ...inputs, cachedEntitlement: 'unknown' }).decision).toBe('show');
});

test('after the ceiling a cached subscriber is not shown the paywall', () => {
  const inputs = paywallEntryAccessInputs({ accessResolved: false, hasPremiumAccess: false, cachedEntitlement: 'premium', waitCeilingPassed: true });
  expect(resolvePremiumModalEntry({ ...base, ...inputs, cachedEntitlement: 'premium' }).decision).toBe('dismiss');
});

test('a late live resolution wins over the cache guess', () => {
  const inputs = paywallEntryAccessInputs({ accessResolved: true, hasPremiumAccess: true, cachedEntitlement: 'unknown', waitCeilingPassed: true });
  expect(inputs.source).toBe('live');
  expect(resolvePremiumModalEntry({ ...base, ...inputs, cachedEntitlement: 'unknown' }).decision).toBe('dismiss');
});
