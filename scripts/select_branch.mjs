#!/usr/bin/env node

// зачем: владелец не хочет держать список веток в конфиге и править файлы руками —
// при запуске Metro нужно просто выбрать ветку стрелками. Меню строится из живого
// `git branch`, поэтому новые ветки появляются сами. Checkout делается только если
// дерево чистое: в codex/* параллельно работает Codex, и переключение с грязным
// деревом утащило бы его незакоммиченные файлы в другую ветку.

import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const MAX_BRANCHES = 12;

// зачем: в релизной папке владельца ветка всегда одна и та же — меню там только мешает,
// запуск должен идти сразу. Меню показывается лишь в основной папке, где ветки меняются.
const MENU_ROOT = 'c:\\appsprojects\\phraseman';
if (ROOT.toLowerCase() !== MENU_ROOT) {
  process.exit(0);
}

function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

const currentBranch = git(['branch', '--show-current']);
const dirtyFiles = git(['status', '--porcelain'])
  .split('\n')
  .filter((line) => line.trim() !== '').length;

const branches = git([
  'branch',
  '--format=%(refname:short)',
  '--sort=-committerdate',
])
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .slice(0, MAX_BRANCHES);

if (branches.length === 0) {
  console.error('Не нашёл ни одной локальной ветки.');
  process.exit(1);
}

// Текущая ветка всегда первой — её выбор не требует checkout вообще.
const ordered = [currentBranch, ...branches.filter((name) => name !== currentBranch)].filter(Boolean);

const ESC = String.fromCharCode(27) + '[';
const isTTY = process.stdin.isTTY === true && process.stdout.isTTY === true;

function render(selected, firstRender) {
  if (!firstRender) {
    process.stdout.write(`${ESC}${ordered.length + 4}A`);
  }
  process.stdout.write(`${ESC}0J`);
  process.stdout.write('\n  Какую ветку запустить?\n\n');
  ordered.forEach((name, index) => {
    const active = index === selected;
    const marker = active ? '❯' : ' ';
    const label = name === currentBranch ? `${name}  (сейчас)` : name;
    const line = active ? `${ESC}36m${label}${ESC}0m` : label;
    process.stdout.write(`  ${marker} ${line}\n`);
  });
  process.stdout.write('\n  ↑↓ — выбрать · Enter — запустить · Esc — отмена\n');
}

function finish(branch) {
  process.stdout.write(`${ESC}?25h`);
  process.stdin.setRawMode(false);
  process.stdin.pause();
  switchAndExit(branch);
}

function switchAndExit(branch) {
  if (branch === currentBranch) {
    console.log(`\n  Запускаю на ${branch}\n`);
    process.exit(0);
  }

  if (dirtyFiles > 0) {
    console.error('');
    console.error(`  STOP: в рабочем дереве ${dirtyFiles} незакоммиченных файлов.`);
    console.error(`  Переключение с ${currentBranch} на ${branch} утащит их в чужую ветку.`);
    console.error('  Сначала закоммить изменения, потом выбирай ветку.');
    console.error('');
    process.exit(1);
  }

  try {
    git(['checkout', branch]);
  } catch (error) {
    console.error('');
    console.error(`  Не удалось переключиться на ${branch}:`);
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);
    console.error('');
    process.exit(1);
  }

  console.log(`\n  Переключился на ${branch}, запускаю\n`);
  process.exit(0);
}

// Без TTY (CI, запуск из другого скрипта) меню показывать нельзя — идём на текущей ветке.
if (!isTTY) {
  process.exit(0);
}

let selected = 0;
process.stdout.write(`${ESC}?25l`);
render(selected, true);

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', (key) => {
  if (key === String.fromCharCode(27) || key === String.fromCharCode(3)) {
    process.stdout.write(`${ESC}?25h`);
    process.stdin.setRawMode(false);
    console.log('\n  Отменено.\n');
    process.exit(1);
  }

  if (key === '\r' || key === '\n') {
    finish(ordered[selected]);
    return;
  }

  if (key === `${ESC}A`) {
    selected = (selected - 1 + ordered.length) % ordered.length;
    render(selected, false);
    return;
  }

  if (key === `${ESC}B`) {
    selected = (selected + 1) % ordered.length;
    render(selected, false);
  }
});
