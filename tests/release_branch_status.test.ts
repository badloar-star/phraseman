import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'release_branch_status.mjs');

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function repo(): string {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-release-status-'));
  git(cwd, 'init', '-q');
  git(cwd, 'config', 'user.name', 'Release Status Test');
  git(cwd, 'config', 'user.email', 'release-status@example.invalid');
  fs.writeFileSync(path.join(cwd, 'file.txt'), 'base\n');
  git(cwd, 'add', 'file.txt');
  git(cwd, 'commit', '-q', '-m', 'base');
  git(cwd, 'branch', 'codex/all-development-integration');
  return cwd;
}

function status(cwd: string, args: string[] = [], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

describe('release branch status', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('reports an integrated commit', () => {
    const cwd = repo(); dirs.push(cwd);
    const result = status(cwd);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('RELEASE: integrated');
    expect(result.stdout).toContain('codex/all-development-integration');
  });

  it('reports a commit that is pending integration', () => {
    const cwd = repo(); dirs.push(cwd);
    fs.appendFileSync(path.join(cwd, 'file.txt'), 'feature\n');
    git(cwd, 'commit', '-qam', 'feature');
    const result = status(cwd);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('RELEASE: pending');
    expect(result.stdout).toContain('codex/all-development-integration');
  });

  it('accepts an explicit commit and release branch override', () => {
    const cwd = repo(); dirs.push(cwd);
    git(cwd, 'branch', 'release/custom');
    const sha = git(cwd, 'rev-parse', 'HEAD');
    const result = status(cwd, ['--commit', sha], { PHRASEMAN_RELEASE_BRANCH: 'release/custom' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('RELEASE: integrated');
    expect(result.stdout).toContain('release/custom');
  });

  it('reports an unavailable configured release branch without blocking the commit', () => {
    const cwd = repo(); dirs.push(cwd);
    const result = status(cwd, [], { PHRASEMAN_RELEASE_BRANCH: 'release/missing' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('RELEASE: unknown');
    expect(result.stdout).toContain('release/missing');
  });

  it('keeps the managed post-commit status available on branches without the Node script', () => {
    const installer = fs.readFileSync(path.resolve(__dirname, '..', 'scripts', 'install-git-hooks.mjs'), 'utf8');
    expect(installer).toContain('if [ -f scripts/release_branch_status.mjs ]; then');
    expect(installer).toContain('git merge-base --is-ancestor HEAD "$release_branch"');
    expect(installer).toContain('RELEASE: pending');
  });
});
