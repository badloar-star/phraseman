import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 native ops log contract', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');
  const capabilities = read('admin/v2/scripts/admin-capabilities.js');
  const index = read('functions/src/index.ts');
  const css = read('admin/v2/styles/admin.css');

  test('promotes ops-log to guarded native diagnostics without losing legacy handoff', () => {
    expect(capabilities).toContain("'ops-log': 'diagnostics'");
    expect(core).toContain('renderOpsLogPanel');
    expect(core).toContain('href="../../admin/index.html#ops-log"');
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
