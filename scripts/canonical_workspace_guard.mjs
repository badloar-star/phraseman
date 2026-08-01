#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import path from 'node:path';

const CANONICAL_ROOT = 'C:\\appsprojects\\phraseman';
const CANONICAL_BRANCH = 'feature/referral-roulette';

function normalizedRealPath(value) {
  const resolved = realpathSync.native(path.resolve(value));
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function fail(message) {
  console.error('');
  console.error('STOP: запуск заблокирован правилом единого рабочего места.');
  console.error(message);
  console.error(`Каноническая папка: ${CANONICAL_ROOT}`);
  console.error(`Каноническая ветка: ${CANONICAL_BRANCH}`);
  console.error('');
  process.exit(1);
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

if (branch !== CANONICAL_BRANCH) {
  fail(`Текущая ветка запрещена: ${branch || '(detached HEAD)'}`);
}
