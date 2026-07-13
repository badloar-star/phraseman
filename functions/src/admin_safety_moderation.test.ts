import fs from 'fs';
import path from 'path';
import {
  assertSafetySnapshotBatchFits,
  decodeSafetyModerationCursor,
  encodeSafetyModerationCursor,
  packSafetyModerationSnapshot,
  parseSafetyModerationRequest,
  requiredSafetyModerationPermission,
  unpackSafetyModerationSnapshot,
} from './admin_safety_moderation';

describe('Admin Safety & Moderation read contract', () => {
  test('normalizes supported views, filters and bounded page sizes', () => {
    expect(parseSafetyModerationRequest({ view: 'secrets', pageSize: 999 })).toMatchObject({
      view: 'overview', pageSize: 100, cursor: null, exportCsv: false,
    });
    expect(parseSafetyModerationRequest({
      view: 'user-reports', uid: '../u-1', filters: { status: 'NEW', reason: 'OFFENSIVE_NICKNAME', query: ' Alice ' },
    })).toMatchObject({
      view: 'user-reports', uid: 'u-1',
      filters: { status: 'new', reason: 'offensive_nickname', category: '', query: 'alice', sort: 'date_desc' },
    });
    expect(parseSafetyModerationRequest({ view: 'ban-list', filters: { sort: 'sideways' }, pageSize: 1 })).toMatchObject({
      view: 'ban-list', pageSize: 10, filters: { status: '', reason: '', category: '', query: '', sort: 'date_desc' },
    });
    expect(() => parseSafetyModerationRequest({ cursor: 'broken' })).toThrow('invalid_cursor');
  });

  test('binds cursors to an immutable snapshot and exact request scope', () => {
    const request = parseSafetyModerationRequest({ view: 'safety-flags', uid: 'u1', filters: { status: 'open', category: 'self_harm' } });
    const cursor = encodeSafetyModerationCursor('snap-a', 50, request.scope);
    expect(decodeSafetyModerationCursor(cursor, request.scope)).toEqual({ snapshotId: 'snap-a', offset: 50 });
    const changed = parseSafetyModerationRequest({ view: 'safety-flags', uid: 'u1', filters: { status: 'handled', category: 'self_harm' } });
    expect(() => decodeSafetyModerationCursor(cursor, changed.scope)).toThrow('cursor_mismatch');
  });

  test('round-trips immutable snapshot payloads and enforces atomic batch limits', () => {
    const payload = {
      definitionVersion: 'admin_safety_moderation_v1', generatedAtMs: 1, view: 'user-reports',
      items: Array.from({ length: 5_001 }, (_, index) => ({ id: `r-${index}` })),
      summary: { total: 5_001 }, sources: [{ name: 'user_reports', status: 'partial' }],
    };
    const chunks = packSafetyModerationSnapshot(payload);
    assertSafetySnapshotBatchFits(chunks);
    const restored = unpackSafetyModerationSnapshot(chunks);
    payload.items[5_000].id = 'mutated';
    expect(restored.items[5_000]).toEqual({ id: 'r-5000' });
    expect(() => assertSafetySnapshotBatchFits(Array(12).fill('x'.repeat(700_000)))).toThrow('safety_snapshot_too_large');
  });

  test('selects the narrow permission for every view and reserves export for admins', () => {
    expect(requiredSafetyModerationPermission('overview', false)).toBe('users.moderation.read');
    expect(requiredSafetyModerationPermission('user-reports', false)).toBe('users.moderation.read');
    expect(requiredSafetyModerationPermission('ban-list', false)).toBe('users.moderation.read');
    expect(requiredSafetyModerationPermission('safety-flags', false)).toBe('users.moderation.safety.read');
    expect(requiredSafetyModerationPermission('age-consent', false)).toBe('users.moderation.aggregate.read');
    expect(requiredSafetyModerationPermission('policy-evidence', false)).toBe('users.moderation.aggregate.read');
    expect(requiredSafetyModerationPermission('other-reports', false)).toBe('reports.read');
    expect(requiredSafetyModerationPermission('user-reports', true)).toBe('users.moderation.export');
  });

  test('uses literal strict App Check and never exposes raw safety text in universal audit payloads', () => {
    const source = fs.readFileSync(path.join(__dirname, 'admin_safety_moderation.ts'), 'utf8');
    expect(source).toMatch(/adminGetSafetyModerationWorkspace\s*=\s*onCall\([\s\S]*?enforceAppCheck:\s*true/);
    expect(source).toMatch(/adminGetSafetyModerationSensitiveDetail\s*=\s*onCall\([\s\S]*?enforceAppCheck:\s*true/);
    expect(source).not.toMatch(/createAuditRecord\([\s\S]{0,800}(userText|historyContext)/);
  });

  test('registers both read callables in the Functions entrypoint', () => {
    const indexSource = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(indexSource).toContain('adminGetSafetyModerationWorkspace');
    expect(indexSource).toContain('adminGetSafetyModerationSensitiveDetail');
    expect(indexSource).toContain("from './admin_safety_moderation'");
  });
});
