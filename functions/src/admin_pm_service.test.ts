import { derivePmRunIds, validatePmIdempotencyKey } from './admin_pm_service';

test('derives stable ids from the same idempotency key', () => {
  expect(derivePmRunIds('manual-2026-07-11')).toEqual(derivePmRunIds('manual-2026-07-11'));
  expect(derivePmRunIds('manual-2026-07-11').runId).toMatch(/^pmrun_/);
  expect(derivePmRunIds('manual-2026-07-11').briefId).toMatch(/^pmbrief_/);
});

test('validates bounded manual idempotency keys', () => {
  expect(validatePmIdempotencyKey('manual-2026-07-11')).toEqual({ ok: true });
  expect(validatePmIdempotencyKey('x')).toMatchObject({ ok: false });
  expect(validatePmIdempotencyKey('bad key with spaces')).toMatchObject({ ok: false });
  expect(validatePmIdempotencyKey('x'.repeat(81))).toMatchObject({ ok: false });
});
