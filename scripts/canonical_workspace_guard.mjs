#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Владелец отменил жёсткую привязку к C:\appsprojects\phraseman и к одной ветке.
// Страж оставлен как кросс-платформенная защита от случайного запуска npm-команды
// из подпапки или другого репозитория. Любой checkout и любая текущая ветка разрешены.
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

if (config.policy !== 'current-checkout-root'
  || config.enforceFixedWorkspace !== false
  || config.enforceFixedBranch !== false) {
  console.error('');
  console.error('STOP: config/canonical-workspace.json не соответствует актуальной политике checkout.');
  console.error('');
  process.exit(1);
}

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function normalizedRealPath(value) {
  const resolved = realpathSync.native(path.resolve(value));
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function fail(message) {
  console.error('');
  console.error('STOP: команду нужно запускать из корня текущего checkout.');
  console.error(message);
  console.error(`Корень этого checkout: ${PROJECT_ROOT}`);
  console.error('');
  process.exit(1);
}

let actualRoot;
let expectedRoot;
try {
  actualRoot = normalizedRealPath(process.cwd());
  expectedRoot = normalizedRealPath(PROJECT_ROOT);
} catch (error) {
  fail(`Не удалось проверить рабочую папку: ${error instanceof Error ? error.message : String(error)}`);
}

if (actualRoot !== expectedRoot) fail(`Текущая папка: ${process.cwd()}`);

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

console.log(`[workspace] ${actualRoot} · ветка ${branch || '(detached HEAD)'}`);
