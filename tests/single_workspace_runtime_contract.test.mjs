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
const CANONICAL_BRANCH = CONFIG.primaryBranch;

test('project instructions prohibit branches and worktrees without an explicit owner request', () => {
  const agents = readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');

  assert.match(agents, /## Single Workspace And Branch Invariant/);
  assert.match(agents, /C:\\appsprojects\\phraseman/);
  assert.match(agents, new RegExp(CANONICAL_BRANCH.replace('/', '\\/')));
  assert.match(agents, /config\/canonical-workspace\.json/);
  assert.match(agents, /explicit owner request/);
});

test('workspace list stays closed: exactly one owner-approved folder', () => {
  assert.equal(CONFIG.root, 'C:\\appsprojects\\phraseman');
  assert.ok(Array.isArray(CONFIG.workspaces));

  // зачем: правило «не плодить копии дерева» держится ровно этим — список закрытый.
  // Если папок стало больше, кто-то (агент) их дописал: тест должен упасть.
  assert.equal(CONFIG.workspaces.length, 1, 'разрешена ровно одна папка');
  assert.equal(CONFIG.workspaces[0].path, 'C:\\appsprojects\\phraseman');
  assert.ok(CONFIG.allowedBranches.includes(CANONICAL_BRANCH));
});

test('guard rejects a branch that is not in the allowed list', () => {
  const blocked = spawnSync(process.execPath, [GUARD], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, PHRASEMAN_ALLOW_BRANCH: 'definitely-not-a-real-branch' },
  });

  const currentBranch = spawnSync('git', ['branch', '--show-current'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).stdout.trim();

  // зачем: override не должен обходить проверку папки и не должен «разрешать» чужое имя ветки —
  // он совпадает только с реально выбранной веткой.
  if (CONFIG.allowedBranches.includes(currentBranch)) {
    assert.equal(blocked.status, 0, 'ветка уже в списке — override ничего не ломает');
  } else {
    assert.notEqual(blocked.status, 0);
  }
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

test('guard allows the canonical checkout and rejects another directory', () => {
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
    assert.match(`${blocked.stdout}\n${blocked.stderr}`, /C:\\appsprojects\\phraseman/);
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
