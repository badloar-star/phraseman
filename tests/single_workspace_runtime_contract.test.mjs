import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GUARD = path.join(ROOT, 'scripts', 'canonical_workspace_guard.mjs');
const CONFIG = JSON.parse(
  readFileSync(path.join(ROOT, 'config', 'canonical-workspace.json'), 'utf8'),
);
test('project instructions allow the current checkout while prohibiting implicit branch/worktree creation', () => {
  const agents = readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');

  assert.match(agents, /## Workspace And Branch Safety/);
  assert.match(agents, /currently checked-out branch is valid/);
  assert.match(agents, /explicit owner request/);
  assert.doesNotMatch(agents, /The only canonical checkout/);
  assert.doesNotMatch(agents, /The only canonical working branch/);
});

test('fixed OS paths and fixed branches are disabled by owner policy', () => {
  assert.equal(CONFIG.policy, 'current-checkout-root');
  assert.equal(CONFIG.enforceFixedWorkspace, false);
  assert.equal(CONFIG.enforceFixedBranch, false);
  assert.doesNotMatch(JSON.stringify(CONFIG), /C:\\\\appsprojects\\\\phraseman/);
  assert.doesNotMatch(JSON.stringify(CONFIG), /feature\/referral-roulette/);
});

test('runtime entry points invoke the canonical workspace guard', () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const guardedScripts = [
    'start',
    'start:emu',
    'metro:dev',
    'metro:tunnel',
    'metro:localhost',
    'metro:emu',
    'metro:protected',
    'metro:phone',
    'metro',
    'metro:iphone',
    'android:dev-emulator',
    'android:dev-all-emulators',
    'app',
    'bundler',
    'bundler:lan',
    'android',
    'dev',
    'dev:emu',
    'ios',
    'web',
  ];

  for (const name of guardedScripts) {
    assert.match(
      pkg.scripts[name],
      /^node scripts\/canonical_workspace_guard\.mjs && /,
      `${name} must run the canonical workspace guard first`,
    );
  }
});

test('guard allows this checkout root and rejects another directory', () => {
  const allowed = spawnSync(process.execPath, [GUARD], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(allowed.status, 0);

  const otherDirectory = mkdtempSync(path.join(tmpdir(), 'phraseman-worktree-guard-'));
  try {
    const blocked = spawnSync(process.execPath, [GUARD], {
      cwd: otherDirectory,
      encoding: 'utf8',
    });
    assert.notEqual(blocked.status, 0);
    assert.match(`${blocked.stdout}\n${blocked.stderr}`, /корня текущего checkout/);
  } finally {
    rmSync(otherDirectory, { recursive: true, force: true });
  }
});

test('managed git hook blocks implicit branch creation', () => {
  const installer = readFileSync(path.join(ROOT, 'scripts', 'install-git-hooks.mjs'), 'utf8');

  assert.match(installer, /REFERENCE_TRANSACTION_HOOK/);
  assert.match(installer, /refs\/heads\/\*/);
  assert.match(installer, /PHRASEMAN_ALLOW_BRANCH_CREATION/);
});
