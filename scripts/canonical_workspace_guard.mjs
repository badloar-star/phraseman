#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// зачем: владелец работает в нескольких ветках подряд (learning-v2 и т.д.) и не хочет
// править этот скрипт руками — список разрешённых веток вынесен в config/canonical-workspace.json,
// откуда его читают и гард, и контрактный тест. Правило «одна папка» остаётся жёстким:
// оно защищает от 97 копий рабочего дерева, а не от смены ветки.
const CONFIG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'config',
  'canonical-workspace.json',
);

let config;
try {
  config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
} catch (error) {
  console.error('');
  console.error('STOP: не удалось прочитать config/canonical-workspace.json.');
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  process.exit(1);
}

const CANONICAL_ROOT = config.root;
const CANONICAL_BRANCH = config.primaryBranch;

// зачем: владелец должен тестировать релизную ветку, пока Codex занимает основную папку
// своей незакоммиченной работой. Разрешено РОВНО две папки из закрытого списка в конфиге —
// правило «не плодить копии дерева» остаётся: агенты сюда ничего не дописывают.
const WORKSPACES = Array.isArray(config.workspaces) ? config.workspaces : [];

// зачем: разовый запуск с временной ветки без правки конфига —
// PHRASEMAN_ALLOW_BRANCH=имя-ветки npm run metro:dev
const BRANCH_OVERRIDE = (process.env.PHRASEMAN_ALLOW_BRANCH ?? '').trim();

function normalizedRealPath(value) {
  const resolved = realpathSync.native(path.resolve(value));
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function fail(message) {
  console.error('');
  console.error('STOP: запуск заблокирован правилом единого рабочего места.');
  console.error(message);
  console.error('Разрешённые папки:');
  for (const workspace of WORKSPACES) {
    console.error(`  - ${workspace.path} — ${workspace.role}`);
  }
  console.error('  Разово другую ветку: PHRASEMAN_ALLOW_BRANCH=<ветка> npm run <команда>');
  console.error('');
  process.exit(1);
}

if (WORKSPACES.length === 0) {
  fail('В config/canonical-workspace.json пустой список workspaces.');
}

let actualRoot;
try {
  actualRoot = normalizedRealPath(process.cwd());
} catch (error) {
  fail(`Не удалось проверить рабочую папку: ${error instanceof Error ? error.message : String(error)}`);
}

const workspace = WORKSPACES.find((entry) => {
  try {
    return normalizedRealPath(entry.path) === actualRoot;
  } catch {
    return false;
  }
});

if (!workspace) {
  fail(`Текущая папка запрещена: ${process.cwd()}`);
}

const ALLOWED_BRANCHES = Array.isArray(workspace.allowedBranches) ? workspace.allowedBranches : [];

let gitRoot;
let branch;
try {
  gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  branch = execFileSync('git', ['branch', '--show-current'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
} catch (error) {
  fail(`Не удалось проверить Git: ${error instanceof Error ? error.message : String(error)}`);
}

if (normalizedRealPath(gitRoot) !== actualRoot) {
  fail(`Git указывает на другой checkout: ${gitRoot}`);
}

const branchAllowed =
  ALLOWED_BRANCHES.includes('*') ||
  ALLOWED_BRANCHES.includes(branch) ||
  (BRANCH_OVERRIDE !== '' && BRANCH_OVERRIDE === branch);

if (!branchAllowed) {
  fail(
    `В папке ${workspace.path} ветка ${branch || '(detached HEAD)'} запрещена. ` +
      `Разрешены: ${ALLOWED_BRANCHES.join(', ')}`,
  );
}

if (branch !== CANONICAL_BRANCH) {
  console.log(`[workspace] запуск с ветки ${branch} (релизная: ${CANONICAL_BRANCH})`);
}
