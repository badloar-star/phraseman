class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
}));

import { requireBusinessTierReadAccess, requireBusinessTierBackfillAccess } from './business_tier_access';

function request(token: Record<string, unknown> | null) {
  return { auth: token ? { uid: 'u1', token } : null };
}

describe('requireBusinessTierReadAccess — mirrors all_departments_callables read gate (money+users+diagnostics)', () => {
  test('rejects unauthenticated callers', () => {
    expect(() => requireBusinessTierReadAccess(request(null))).toThrow('Admin only');
  });

  test('rejects a role missing one of the three required read permissions', () => {
    expect(() => requireBusinessTierReadAccess(request({ admin: true, adminRole: 'support' }))).toThrow();
  });

  test('rejects a caller with admin flag but no adminRole claim', () => {
    expect(() => requireBusinessTierReadAccess(request({ admin: true }))).toThrow();
  });

  test('allows owner', () => {
    expect(() => requireBusinessTierReadAccess(request({ admin: true, adminRole: 'owner' }))).not.toThrow();
  });

  test('allows analyst — has users.read + money.read + diagnostics.read', () => {
    expect(() => requireBusinessTierReadAccess(request({ admin: true, adminRole: 'analyst' }))).not.toThrow();
  });
});

describe('requireBusinessTierBackfillAccess — STRICTER gate than read, owner/admin only', () => {
  // зачем: советник (Opus 5) указал риск — analyst имеет money.read и прошёл бы
  // read-гейт, но backfill стоит реальных денег на чтениях Firestore. Запуск
  // тяжёлого пересчёта должен быть доступен только owner/admin, не аналитику.
  test('rejects analyst — has read access but must NOT be able to trigger the expensive backfill', () => {
    expect(() => requireBusinessTierBackfillAccess(request({ admin: true, adminRole: 'analyst' }))).toThrow();
  });

  test('rejects support, moderator, developer, content roles — none may trigger backfill', () => {
    for (const role of ['support', 'moderator', 'developer', 'content_editor', 'content_reviewer']) {
      expect(() => requireBusinessTierBackfillAccess(request({ admin: true, adminRole: role }))).toThrow();
    }
  });

  test('allows owner', () => {
    expect(() => requireBusinessTierBackfillAccess(request({ admin: true, adminRole: 'owner' }))).not.toThrow();
  });

  test('allows admin', () => {
    expect(() => requireBusinessTierBackfillAccess(request({ admin: true, adminRole: 'admin' }))).not.toThrow();
  });

  test('rejects unauthenticated callers', () => {
    expect(() => requireBusinessTierBackfillAccess(request(null))).toThrow('Admin only');
  });

  test('rejects admin flag without adminRole claim', () => {
    expect(() => requireBusinessTierBackfillAccess(request({ admin: true }))).toThrow();
  });
});
