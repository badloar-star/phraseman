import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(__dirname, '..');
const guardPath = path.join(repoRoot, 'scripts/admin_hosting_deploy_guard.mjs');

type GuardInput = {
  root: string;
  gitTopLevel: string;
  gitCommonDir: string;
  firebaseConfig: unknown;
  liveAdminExists: boolean;
};

function evaluateGuard(input: GuardInput): { ok: boolean; errors: string[] } {
  const moduleUrl = pathToFileURL(guardPath).href;
  const program = `import(${JSON.stringify(moduleUrl)}).then(({ evaluateAdminHostingWorkspace }) => process.stdout.write(JSON.stringify(evaluateAdminHostingWorkspace(${JSON.stringify(input)}))))`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', program], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as { ok: boolean; errors: string[] };
}

describe('admin hosting deploy guard', () => {
  test('is mandatory for every package script that can publish hosting:admin', () => {
    const scripts = (JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    }).scripts;

    expect(existsSync(guardPath)).toBe(true);
    for (const [name, command] of Object.entries(scripts).filter(([, command]) => command.includes('hosting:admin'))) {
      expect(command).toContain('node scripts/admin_hosting_deploy_guard.mjs');
      expect(command.indexOf('admin_hosting_deploy_guard.mjs')).toBeLessThan(command.indexOf('firebase deploy'));
      expect(name).toBeTruthy();
    }
  });

  test('accepts the primary worktree with the exact live hosting directory', () => {
    const root = path.resolve('C:/repo');
    const result = evaluateGuard({
      root,
      gitTopLevel: root,
      gitCommonDir: path.join(root, '.git'),
      firebaseConfig: { hosting: [{ target: 'admin', public: 'admin/v2' }] },
      liveAdminExists: true,
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('fails closed in a linked or stale worktree', () => {
    const primaryRoot = path.resolve('C:/repo');
    const linkedRoot = path.join(primaryRoot, '.worktrees', 'stale-release');
    const result = evaluateGuard({
      root: linkedRoot,
      gitTopLevel: linkedRoot,
      gitCommonDir: path.join(primaryRoot, '.git'),
      firebaseConfig: { hosting: [{ target: 'admin', public: 'admin/v2' }] },
      liveAdminExists: true,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('primary worktree');
  });

  test('fails closed when Firebase would publish another directory', () => {
    const root = path.resolve('C:/repo');
    const result = evaluateGuard({
      root,
      gitTopLevel: root,
      gitCommonDir: path.join(root, '.git'),
      firebaseConfig: { hosting: [{ target: 'admin', public: 'admin' }] },
      liveAdminExists: true,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('admin/v2');
  });
});
