import { HttpsError } from 'firebase-functions/v2/https';
import {
  requireAdminExplainCacheRead,
  sanitizeAdminMistakeExplainCacheRow,
} from './admin_explain_cache';

describe('admin mistake explanation cache read boundary', () => {
  it('requires a verified admin with reports.read permission', () => {
    expect(() => requireAdminExplainCacheRead(null)).toThrow(HttpsError);
    expect(() => requireAdminExplainCacheRead({ uid: 'user-1', token: { admin: false } })).toThrow('Admin only');
    expect(() => requireAdminExplainCacheRead({ uid: 'admin-1', token: { admin: true, adminRole: 'content_editor' } })).toThrow('Admin only');
    expect(() => requireAdminExplainCacheRead({ uid: 'admin-1', token: { admin: true } })).not.toThrow();
    expect(() => requireAdminExplainCacheRead({ uid: 'support-1', token: { admin: true, adminRole: 'support' } })).not.toThrow();
  });

  it('returns only the fields the cache review screen needs', () => {
    const row = sanitizeAdminMistakeExplainCacheRow('abc123', {
      status: 'ready',
      schemaVersion: 6,
      full: 'Подробный разбор',
      eli5: 'Простое объяснение',
      lang: 'ru',
      reason: null,
      model: 'model-name',
      updatedAtMs: 123,
      uid: 'must-not-leak',
      authUid: 'must-not-leak',
      targetEn: 'must-not-leak',
      userAnswer: 'must-not-leak',
      arbitrarySecret: 'must-not-leak',
    });

    expect(row).toEqual({
      id: 'abc123',
      status: 'ready',
      schemaVersion: 6,
      full: 'Подробный разбор',
      eli5: 'Простое объяснение',
      lang: 'ru',
      reason: null,
      model: 'model-name',
      createdAtMs: 0,
      updatedAtMs: 123,
      eli5PendingAtMs: null,
    });
    expect(row).not.toHaveProperty('uid');
    expect(row).not.toHaveProperty('authUid');
    expect(row).not.toHaveProperty('targetEn');
    expect(row).not.toHaveProperty('userAnswer');
    expect(row).not.toHaveProperty('arbitrarySecret');
  });

  it('normalizes malformed cache metadata and bounds returned explanation text', () => {
    const row = sanitizeAdminMistakeExplainCacheRow('doc-1', {
      status: 'unexpected',
      schemaVersion: '6',
      full: 'x'.repeat(4_100),
      eli5: 42,
      lang: 'r'.repeat(40),
      reason: { nested: true },
      model: 'm'.repeat(200),
      createdAtMs: Number.POSITIVE_INFINITY,
      updatedAtMs: -7,
      eli5PendingAtMs: 55,
    });

    expect(row.status).toBe('?');
    expect(row.schemaVersion).toBe(6);
    expect(row.full).toHaveLength(4_000);
    expect(row.eli5).toBeNull();
    expect(row.lang).toHaveLength(16);
    expect(row.reason).toBeNull();
    expect(row.model).toHaveLength(120);
    expect(row.createdAtMs).toBe(0);
    expect(row.updatedAtMs).toBe(0);
    expect(row.eli5PendingAtMs).toBe(55);
  });
});
