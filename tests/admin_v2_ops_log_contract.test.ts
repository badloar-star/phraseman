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

describe('Admin v2 native ops log contract', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');
  const capabilities = read('admin/v2/scripts/admin-capabilities.js');
  const router = read('admin/v2/scripts/admin-router.js');
  const index = read('functions/src/index.ts');
  const css = read('admin/v2/styles/admin.css');

  test('keeps the native diagnostics panel while the retired ops route stays out of navigation', () => {
    const diagnosticsRenderer = core.slice(
      core.indexOf('function renderDiagnostics()'),
      core.indexOf('function renderSupport()'),
    );

    expect(capabilities).not.toMatch(/\{\s*id: 'ops-log'/);
    expect(router).not.toMatch(/['"]ops-log['"]\s*:/);
    expect(diagnosticsRenderer).toContain('${renderOpsLogPanel()}');
    expect(core).not.toMatch(/href=["'][^"']*admin\/index\.html#ops-log/);
    expect(core).not.toContain('Нативный ops-log переносится отдельным этапом.');
  });

  test('uses a server callable and read-only native controls', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminListOpsLog')");
    expect(firebase).toContain('listOpsLog: async (input) => unwrap(await listOpsLogCallable(input))');
    expect(index).toContain("export { adminListOpsLog } from './admin_ops_log'");
    expect(core).toContain('data-action="load-ops-log"');
    expect(core).toContain('data-action="copy-ops-snapshot"');
    expect(core).toContain('disabledWhenUnauthorized(\'diagnostics.read\')');
    expect(core).toContain('ops-source-filter');
    expect(core).toContain('ops-type-filter');
    expect(core).toContain('ops-search-filter');
  });

  test('dispatches load and copy actions to the stateful ops handlers without an earlier action exit', () => {
    const handler = functionBlock(core, 'async function handleAction(action, target)', 'async function handleClick(event)');
    const loadBranch = expectActionBranchReachable(handler, 'load-ops-log');
    const copyBranch = expectActionBranchReachable(handler, 'copy-ops-snapshot');
    const loader = functionBlock(core, 'async function loadOpsLog()', 'async function loadAssetJobs()');
    const copier = functionBlock(core, 'async function copyOpsSnapshot()', 'async function updateReportStatus(');

    expect(loadBranch).toMatch(/state\.ops\s*=\s*\{[\s\S]*source:[\s\S]*type:[\s\S]*query:/);
    expect(loadBranch).toMatch(/return runBusy\(loadOpsLog,/);
    expect(copyBranch).toMatch(/return copyOpsSnapshot\(\)/);
    expect(loader).toMatch(/state\.ops\s*=\s*\{[^;]*state:\s*'loading'/);
    expect(loader).toMatch(/await actions\.listOpsLog\(\{/);
    expect(loader).toMatch(/state\.ops\s*=\s*\{[\s\S]*state:\s*String\(result\?\.state \|\| 'ready'\)/);
    expect(loader).toMatch(/state\.ops\s*=\s*\{[^;]*state:\s*'error'/);
    expect(copier).toMatch(/navigator\.clipboard\.writeText\(state\.ops\.copyText\)/);
  });

  test('server implementation has focused function tests for normalization, identity and snapshot safety', () => {
    const result = spawnSync(process.execPath, [
      'node_modules/jest/bin/jest.js',
      '--testPathPattern=functions/src/admin_ops_log.test.ts',
      '--runInBand',
      '--no-cache',
    ], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(0);
  });

  test('ops log has a dedicated responsive layout for populated rows and filters', () => {
    expect(css).toContain('.toolbar-grid');
    expect(css).toContain('.ops-row');
    expect(css).toMatch(/@media\s*\(max-width:\s*1080px\)[\s\S]*\.toolbar-grid/);
    expect(css).toMatch(/@media\s*\(max-width:\s*1080px\)[\s\S]*\.toolbar-grid[\s\S]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*\.toolbar-grid/);
    expect(css).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*\.ops-row/);
    expect(css).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*\.ops-row\s+\.actions/);
  });
});
