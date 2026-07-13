import fs from 'fs';
import path from 'path';
import {
  assertSafetySnapshotBatchFits,
  assertModerationOperationReplay,
  assertSafetyApprovalCanBeApproved,
  assertSafetyApprovalForApply,
  buildSafetyModerationPreview,
  buildModerationAuditProjection,
  decodeSafetyModerationCursor,
  encodeSafetyModerationCursor,
  packSafetyModerationSnapshot,
  parseSafetyModerationMutationInput,
  parseSafetyModerationRequest,
  requiredSafetyModerationMutationPermission,
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

  test('normalizes every supported mutation and bounds bulk manifests', () => {
    expect(parseSafetyModerationMutationInput({
      action: 'report_set_status', targetId: 'report-1', reason: ' Reviewed by moderator ', requestId: 'req-1',
      payload: { status: 'archived' },
    })).toMatchObject({ action: 'report_set_status', targetId: 'report-1', reason: 'Reviewed by moderator', requestId: 'req-1', payload: { status: 'archived' } });
    expect(parseSafetyModerationMutationInput({
      action: 'safety_handle_bulk', targetId: 'visible-selection', reason: 'Reviewed queue', requestId: 'req-2',
      payload: { targetIds: ['f1', 'f1', 'f2'], disposition: 'resolved', note: 'Checked' },
    })).toMatchObject({ payload: { targetIds: ['f1', 'f2'], disposition: 'resolved', note: 'Checked' } });
    expect(() => parseSafetyModerationMutationInput({ action: 'safety_handle_bulk', targetId: 'bulk', reason: 'x', requestId: 'r', payload: { targetIds: Array.from({ length: 401 }, (_, index) => `f-${index}`) } })).toThrow('bulk_target_limit');
    expect(() => parseSafetyModerationMutationInput({ action: 'user_ban', targetId: 'u1', reason: '', requestId: 'r' })).toThrow('mutation_fields_required');
    expect(() => parseSafetyModerationMutationInput({ action: 'unknown', targetId: 'u1', reason: 'x', requestId: 'r' })).toThrow('safety_action_invalid');
  });

  test('assigns narrow permissions and second approval only to dangerous identity actions', () => {
    expect(requiredSafetyModerationMutationPermission('report_set_status')).toBe('reports.status.write');
    expect(requiredSafetyModerationMutationPermission('report_warn')).toBe('users.moderation.write');
    expect(requiredSafetyModerationMutationPermission('safety_set_disposition')).toBe('users.moderation.write');
    expect(requiredSafetyModerationMutationPermission('report_rename')).toBe('users.moderation.identity.write');
    expect(requiredSafetyModerationMutationPermission('user_ban')).toBe('users.moderation.ban.write');
    expect(requiredSafetyModerationMutationPermission('user_unban')).toBe('users.moderation.ban.write');
    expect(requiredSafetyModerationMutationPermission('restore_operation')).toBe('users.moderation.restore');

    const safe = buildSafetyModerationPreview(parseSafetyModerationMutationInput({ action: 'report_set_status', targetId: 'r1', reason: 'Archive duplicate', requestId: 'req-1', payload: { status: 'archived' } }), { status: 'new' }, 100, 'moderator-1', 'moderator');
    expect(safe).toMatchObject({ requiresApproval: false, irreversible: false, beforeFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/), confirmation: expect.stringMatching(/^REPORT_SET_STATUS\/r1\/[a-f0-9]{12}$/) });

    const dangerous = buildSafetyModerationPreview(parseSafetyModerationMutationInput({ action: 'user_ban', targetId: 'u1', reason: 'Confirmed abuse', requestId: 'req-2', payload: { name: 'Alice', sourceReportId: 'r1' } }), { banned: false }, 100, 'admin-1', 'admin');
    expect(dangerous).toMatchObject({ requiresApproval: true, irreversible: false, risk: expect.stringContaining('global'), rollbackPath: expect.stringContaining('CAS') });

    const warning = buildSafetyModerationPreview(parseSafetyModerationMutationInput({ action: 'report_warn', targetId: 'r1', reason: 'First warning', requestId: 'req-3', payload: { uid: 'u1', message: 'Please change the nickname' } }), { status: 'new' }, 100, 'moderator-1', 'moderator');
    expect(warning).toMatchObject({ requiresApproval: false, irreversible: true, rollbackPath: 'Warning delivery cannot be recalled by the current client protocol.' });
  });

  test('binds idempotent operation replay to both actor and request fingerprint', () => {
    expect(() => assertModerationOperationReplay({ actorUid: 'a1', requestFingerprint: 'f1' }, 'a1', 'f1')).not.toThrow();
    expect(() => assertModerationOperationReplay({ actorUid: 'a1', requestFingerprint: 'f1' }, 'a2', 'f1')).toThrow('idempotency_conflict');
    expect(() => assertModerationOperationReplay({ actorUid: 'a1', requestFingerprint: 'f1' }, 'a1', 'f2')).toThrow('idempotency_conflict');
  });

  test('requires a different administrator and binds approval to the exact preview', () => {
    const approval = { type: 'safety_moderation', status: 'pending', requestedBy: 'admin-1', previewId: 'p1', fingerprint: 'fp1', expiresAtMs: 1_000 };
    expect(() => assertSafetyApprovalCanBeApproved(approval, 'admin-1', 500)).toThrow('self_approval_forbidden');
    expect(() => assertSafetyApprovalCanBeApproved(approval, 'admin-2', 500)).not.toThrow();
    expect(() => assertSafetyApprovalCanBeApproved({ ...approval, expiresAtMs: 400 }, 'admin-2', 500)).toThrow('approval_invalid');

    const approved = { ...approval, status: 'approved', approvedBy: 'admin-2' };
    const preview = { id: 'p1', actorUid: 'admin-1', fingerprint: 'fp1', expiresAtMs: 1_000 };
    expect(() => assertSafetyApprovalForApply(approved, preview, 'admin-1', 500)).not.toThrow();
    expect(() => assertSafetyApprovalForApply({ ...approved, fingerprint: 'other' }, preview, 'admin-1', 500)).toThrow('approval_mismatch');
    expect(() => assertSafetyApprovalForApply({ ...approved, approvedBy: 'admin-1' }, preview, 'admin-1', 500)).toThrow('approval_mismatch');
  });

  test('registers strict preview and approval callables', () => {
    const source = fs.readFileSync(path.join(__dirname, 'admin_safety_moderation.ts'), 'utf8');
    for (const callable of ['adminPreviewSafetyModerationMutation', 'adminRequestSafetyModerationApproval', 'adminApproveSafetyModerationMutation']) {
      expect(source).toMatch(new RegExp(`${callable}\\s*=\\s*onCall\\([\\s\\S]*?enforceAppCheck:\\s*true`));
    }
    const indexSource = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(indexSource).toContain('adminPreviewSafetyModerationMutation');
    expect(indexSource).toContain('adminRequestSafetyModerationApproval');
    expect(indexSource).toContain('adminApproveSafetyModerationMutation');
  });

  test('keeps mutation audit projections free of messages and sensitive payloads', () => {
    const projection = buildModerationAuditProjection({
      action: 'report_warn', targetId: 'r1', beforeFingerprint: 'before', fingerprint: 'after',
      payload: { uid: 'u1', message: 'sensitive warning text', note: 'private note' },
    }, 1);
    expect(projection).toEqual({ action: 'report_warn', targetId: 'r1', targetCount: 1, beforeFingerprint: 'before', afterFingerprint: 'after' });
    expect(JSON.stringify(projection)).not.toContain('sensitive warning text');
    expect(JSON.stringify(projection)).not.toContain('private note');
  });

  test('registers a strict transactional apply callable', () => {
    const source = fs.readFileSync(path.join(__dirname, 'admin_safety_moderation.ts'), 'utf8');
    expect(source).toMatch(/adminApplySafetyModerationMutation\s*=\s*onCall\([\s\S]*?enforceAppCheck:\s*true/);
    expect(source).toMatch(/adminApplySafetyModerationMutation[\s\S]*?runTransaction/);
    const indexSource = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(indexSource).toContain('adminApplySafetyModerationMutation');
  });
});
