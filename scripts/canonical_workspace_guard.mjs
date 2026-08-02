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
const ALLOWED_BRANCHES = Array.isArray(config.allowedBranches) ? config.allowedBranches : [];
const CANONICAL_BRANCH = config.primaryBranch ?? ALLOWED_BRANCHES[0];

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
  console.error(`Каноническая папка: ${CANONICAL_ROOT}`);
  console.error(`Разрешённые ветки: ${ALLOWED_BRANCHES.join(', ') || '(список пуст)'}`);
  console.error('Как разрешить ветку:');
  console.error('  - навсегда: добавить её в config/canonical-workspace.json → allowedBranches');
  console.error('  - разово:   PHRASEMAN_ALLOW_BRANCH=<ветка> npm run <команда>');
  console.error('');
  process.exit(1);
}

if (ALLOWED_BRANCHES.length === 0) {
  fail('В config/canonical-workspace.json пустой список allowedBranches.');
}

let expectedRoot;
let actualRoot;
try {
  expectedRoot = normalizedRealPath(CANONICAL_ROOT);
  actualRoot = normalizedRealPath(process.cwd());
} catch (error) {
  fail(`Не удалось проверить рабочую папку: ${error instanceof Error ? error.message : String(error)}`);
}

if (actualRoot !== expectedRoot) {
  fail(`Текущая папка запрещена: ${process.cwd()}`);
}

let gitRoot;
let branch;
try {
  gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: CANONICAL_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  branch = execFileSync('git', ['branch', '--show-current'], {
    cwd: CANONICAL_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
} catch (error) {
  fail(`Не удалось проверить Git: ${error instanceof Error ? error.message : String(error)}`);
}

if (normalizedRealPath(gitRoot) !== expectedRoot) {
  fail(`Git указывает на другой checkout: ${gitRoot}`);
}

const branchAllowed =
  ALLOWED_BRANCHES.includes(branch) || (BRANCH_OVERRIDE !== '' && BRANCH_OVERRIDE === branch);

if (!branchAllowed) {
  fail(`Текущая ветка запрещена: ${branch || '(detached HEAD)'}`);
}

if (branch !== CANONICAL_BRANCH) {
  console.log(`[workspace] запуск с ветки ${branch} (основная: ${CANONICAL_BRANCH})`);
}
