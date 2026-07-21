import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

function functionBlock(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

function expectActionBranchReachable(handler: string, actionId: string): string {
  const marker = `if (action === '${actionId}')`;
  const branchIndex = handler.indexOf(marker);
  expect(branchIndex).toBeGreaterThanOrEqual(0);
  const prefix = handler.slice(0, branchIndex);
  const actionSpecificEarlyExits = [...prefix.matchAll(/if\s*\(([^;\n]*\baction\b[^;\n]*)\)\s*(?:return|throw)\b/g)]
    .map((match) => match[1])
    .filter((condition) => [...condition.matchAll(/['"]([^'"]+)['"]/g)].some((match) => match[1] === actionId));
  expect(actionSpecificEarlyExits).toEqual([]);

  const nextBranchIndex = handler.indexOf('\n  if (action === ', branchIndex + marker.length);
  return handler.slice(branchIndex, nextBranchIndex > branchIndex ? nextBranchIndex : undefined);
}

describe('Admin v2 audit log native contract', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');
  const capabilities = read('admin/v2/scripts/admin-capabilities.js');
  const router = read('admin/v2/scripts/admin-router.js');
  const index = read('functions/src/index.ts');

  test('keeps the native diagnostics panel while retired audit routes stay out of navigation', () => {
    const diagnosticsRenderer = core.slice(
      core.indexOf('function renderDiagnostics()'),
      core.indexOf('function renderSupport()'),
    );

    expect(capabilities).not.toMatch(/\{\s*id: 'audit(?:-log)?'/);
    expect(router).not.toMatch(/['"]audit(?:-log)?['"]\s*:/);
    expect(diagnosticsRenderer).toContain('${renderAuditLogPanel()}');
    expect(core).not.toMatch(/href=["'][^"']*admin\/index\.html#audit/);
    expect(core).not.toContain('Нативная временная шкала переносится следующим этапом.');
  });

  test('uses a server callable rather than direct browser Firestore access', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminListAuditLog')");
    expect(firebase).toContain('listAuditLog: async (input) => unwrap(await listAuditLogCallable(input))');
    expect(core).toContain('actions.listAuditLog');
    expect(index).toContain("export { adminListAuditLog } from './admin_audit_log'");
  });

  test('dispatches both audit actions to the stateful callable loader without an earlier action exit', () => {
    const handler = functionBlock(core, 'async function handleAction(action, target)', 'async function handleClick(event)');
    const loadBranch = expectActionBranchReachable(handler, 'load-audit-log');
    const nextBranch = expectActionBranchReachable(handler, 'load-audit-next');
    const loader = functionBlock(core, 'async function loadAuditLog(append = false)', 'async function loadAgentOffice(');

    expect(loadBranch).toMatch(/state\.audit\s*=\s*\{[\s\S]*action:[\s\S]*query:[\s\S]*sinceDays:/);
    expect(loadBranch).toMatch(/return runBusy\(loadAuditLog,/);
    expect(nextBranch).toMatch(/state\.audit\.nextCursor[\s\S]*loadAuditLog\(true\)/);
    expect(loader).toMatch(/state\.audit\s*=\s*\{[^;]*state:\s*'loading'/);
    expect(loader).toMatch(/await actions\.listAuditLog\(\{/);
    expect(loader).toMatch(/state\.audit\s*=\s*\{[\s\S]*state:\s*String\(result\?\.state \|\| 'ready'\)/);
    expect(loader).toMatch(/state\.audit\s*=\s*\{[^;]*state:\s*'error'/);
  });

  test('renders safe native read-only controls and states', () => {
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
  const sharedSource = read('functions/src/admin_log_projection.ts');

  test('is diagnostics.read-gated, bounded and never exposes raw message bodies', () => {
    expect(serverSource).toContain("requireAuditPermission(request as { auth?: { uid?: string; token?: Row } }, 'diagnostics.read')");
    expect(serverSource).toContain('MAX_AUDIT_LIMIT');
    expect(serverSource).toContain('MAX_AUDIT_SCAN_LIMIT');
    expect(serverSource).toContain("db.collection('admin_log')");
    expect(serverSource).toContain('DEFAULT_TIMESTAMP_FIELDS');
    expect(serverSource).toContain('collectTimestampRows');
    expect(sharedSource).toContain("DEFAULT_TIMESTAMP_FIELDS = ['timestamp', 'ts', 'createdAt'] as const");
    expect(sharedSource).toContain("orderBy(field, 'desc')");
    expect(serverSource).toContain('projectAuditRow');
    expect(serverSource).toContain('mergeAuditRowsForList');
    expect(serverSource).toContain('nextCursor');
    expect(sharedSource).toContain('SENSITIVE_KEY_RE');
    expect(sharedSource).toContain('MAX_PUBLIC_OBJECT_DEPTH');
    expect(sharedSource).toContain('MAX_PUBLIC_STRING_LENGTH');
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
