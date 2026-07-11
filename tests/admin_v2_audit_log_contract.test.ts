import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 audit log native contract', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');
  const capabilities = read('admin/v2/scripts/admin-capabilities.js');
  const router = read('admin/v2/scripts/admin-router.js');
  const index = read('functions/src/index.ts');

  test('promotes Audit log to a guarded native diagnostics capability without losing fallback', () => {
    expect(capabilities).toContain("audit: 'diagnostics'");
    expect(router).toContain("'audit-log': 'diagnostics'");
    expect(core).toContain('renderAuditLogPanel');
    expect(core).toContain('href="../../admin/index.html#audit"');
    expect(core).not.toContain('Нативная временная шкала переносится следующим этапом.');
  });

  test('uses a server callable rather than direct browser Firestore access', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminListAuditLog')");
    expect(firebase).toContain('listAuditLog: async (input) => unwrap(await listAuditLogCallable(input))');
    expect(core).toContain('actions.listAuditLog');
    expect(index).toContain("export { adminListAuditLog } from './admin_audit_log'");
  });

  test('renders safe read-only controls, states and legacy handoff', () => {
    expect(core).toContain('audit-action-filter');
    expect(core).toContain('audit-search-filter');
    expect(core).toContain('audit-days-filter');
    expect(core).toContain('data-action="load-audit-log"');
    expect(core).toContain('data-action="load-audit-next"');
    expect(core).toContain('role="status"');
    expect(core).toContain('role="alert"');
    expect(core).toContain('Изменения здесь только читаются');
    expect(core).toContain('Причина и откат');
    expect(core).toContain('data-audit-user-uid');
    expect(core).toContain('disabledWhenUnauthorized(\'diagnostics.read\')');
  });
});

describe('adminListAuditLog callable contract', () => {
  const serverSource = read('functions/src/admin_audit_log.ts');

  test('is diagnostics.read-gated, bounded and never exposes raw message bodies', () => {
    expect(serverSource).toContain("requireAuditPermission(request as { auth?: { uid?: string; token?: Row } }, 'diagnostics.read')");
    expect(serverSource).toContain('MAX_AUDIT_LIMIT');
    expect(serverSource).toContain('MAX_AUDIT_SCAN_LIMIT');
    expect(serverSource).toContain("db.collection('admin_log')");
    expect(serverSource).toContain("const TIMESTAMP_FIELDS = ['timestamp', 'ts', 'createdAt'] as const");
    expect(serverSource).toContain("orderBy(field, 'desc')");
    expect(serverSource).toContain('projectAuditRow');
    expect(serverSource).toContain('mergeAuditRowsForList');
    expect(serverSource).toContain('nextCursor');
    expect(serverSource).toContain('SENSITIVE_KEY_RE');
    expect(serverSource).toContain('MAX_PUBLIC_OBJECT_DEPTH');
    expect(serverSource).toContain('MAX_PUBLIC_STRING_LENGTH');
  });

  test('has focused function tests for parser and projection edge cases', () => {
    const result = spawnSync(process.execPath, [
      'node_modules/jest/bin/jest.js',
      '--testPathPattern=functions/src/admin_audit_log.test.ts',
      '--runInBand',
      '--no-cache',
    ], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(0);
  });
});
