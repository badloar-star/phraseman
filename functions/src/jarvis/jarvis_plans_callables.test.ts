import { parsePlanStatusUpdate, parsePlanId, PLAN_LIFECYCLE_STATUSES } from './jarvis_plans_callables';

/**
 * Чистый разбор входных данных callable — без Firestore/авторизации (те уже
 * покрыты паттерном requireAllDepartmentsAccess, общим со всеми jarvis-callables).
 */

describe('parsePlanId', () => {
  test('accepts a non-empty string id', () => {
    expect(parsePlanId({ id: 'abc123' })).toBe('abc123');
  });

  test('rejects missing/empty/non-string id', () => {
    expect(parsePlanId({})).toBeNull();
    expect(parsePlanId({ id: '' })).toBeNull();
    expect(parsePlanId({ id: 42 })).toBeNull();
    expect(parsePlanId(null)).toBeNull();
  });
});

describe('parsePlanStatusUpdate', () => {
  test('accepts a valid id+status pair', () => {
    const parsed = parsePlanStatusUpdate({ id: 'abc', status: 'resolved' });
    expect(parsed).toEqual({ id: 'abc', status: 'resolved' });
  });

  test.each(PLAN_LIFECYCLE_STATUSES)('accepts every documented lifecycle status: %s', (status) => {
    expect(parsePlanStatusUpdate({ id: 'abc', status })).toEqual({ id: 'abc', status });
  });

  test('rejects an unknown status string — no silent coercion to a default', () => {
    expect(parsePlanStatusUpdate({ id: 'abc', status: 'done' })).toBeNull();
  });

  test('rejects a missing id or status', () => {
    expect(parsePlanStatusUpdate({ status: 'resolved' })).toBeNull();
    expect(parsePlanStatusUpdate({ id: 'abc' })).toBeNull();
  });
});
