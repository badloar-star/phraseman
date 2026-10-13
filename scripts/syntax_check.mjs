#!/usr/bin/env node
/**
 * Синтаксический сторож — разбор файлов @babel/parser, БЕЗ проверки типов (tsc не нужен): <1–2 с, мало памяти.
 *
 * зачем (координатор 13.10, инцидент ~15:4x): в SpireHomeScreen.tsx комментарий «// зачем…» встал в одну строку с кодом и
 * съел хвост выражения «: null),» — SyntaxError ушёл в коммит, красный экран Шпиля, робот Сверки встал. Класс ошибки ловится
 * разбором за миллисекунды — до коммита и до пачки кадров.
 *
 * Использование:
 *   node scripts/syntax_check.mjs --staged      # pre-commit: staged-файлы, содержимое ИЗ ИНДЕКСА (то, что уйдёт в коммит;
 *                                               # с временным индексом safe_commit — через GIT_INDEX_FILE)
 *   node scripts/syntax_check.mjs --worktree    # изменённые и новые файлы рабочего дерева (Сверка / сторож Metro)
 *   node scripts/syntax_check.mjs --files a b   # заданные файлы
 * Выход: 0 — чисто, 1 — есть ошибки (`[SYNTAX] файл:строка:столбец сообщение`), 2 — сбой самого сторожа.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const TAG = '[SYNTAX]';
const EXT = /\.(tsx?|jsx?|mjs|cjs)$/i;
const MAX_BYTES = 2 * 1024 * 1024;
const SKIP = /(^|\/)(node_modules|dist|dist-store|build|android|ios|\.expo|coverage)\//;

/** Плагины по расширению: в .ts НЕТ jsx — там `<T>x` это приведение типа, а не тег. */
export function parserPluginsFor(file) {
  const lower = file.toLowerCase();
  if (lower.endsWith('.tsx')) return ['typescript', 'jsx'];
  if (lower.endsWith('.ts') || lower.endsWith('.mts') || lower.endsWith('.cts')) return ['typescript'];
  return ['jsx'];
}

/** Разобрать текст; вернуть null или { line, column, message }. */
export function checkSource(file, source) {
  const { parse } = require('@babel/parser');
  try {
    parse(source, {
      sourceType: 'unambiguous',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      errorRecovery: false,
      plugins: parserPluginsFor(file),
    });
    return null;
  } catch (error) {
    const loc = error && typeof error === 'object' && 'loc' in error ? error.loc : null;
    const message = String(error && error.message ? error.message : error).replace(/\s*\(\d+:\d+\)\s*$/, '');
    return { line: loc?.line ?? 0, column: (loc?.column ?? -1) + 1, message };
  }
}

function git(args) {
  // stderr git (предупреждения о переводах строк) не нужен — только список путей.
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

function candidates(list) {
  return list.map((f) => f.trim().replace(/\\/g, '/')).filter((f) => f && EXT.test(f) && !SKIP.test(f));
}

/** Содержимое staged-файлов из индекса одним `git cat-file --batch` (быстро на десятках файлов). */
function readStaged(files) {
  if (files.length === 0) return new Map();
  const res = spawnSync('git', ['cat-file', '--batch'], { cwd: ROOT, input: files.map((f) => `:${f}`).join('\n') + '\n', maxBuffer: 256 * 1024 * 1024 });
  if (res.status !== 0) throw new Error(`git cat-file --batch: код ${res.status} ${String(res.stderr || '').slice(0, 200)}`);
  const buf = res.stdout;
  const out = new Map();
  let pos = 0;
  for (const file of files) {
    const nl = buf.indexOf(0x0a, pos);
    const header = buf.subarray(pos, nl).toString('utf8');
    pos = nl + 1;
    if (header.endsWith(' missing')) { console.warn(`${TAG} ${file}: нет в индексе — пропуск`); continue; }
    const size = Number(header.split(' ')[2]);
    out.set(file, size > MAX_BYTES ? null : buf.subarray(pos, pos + size).toString('utf8'));
    pos += size + 1;
  }
  return out;
}

function readWorktree(files) {
  const out = new Map();
  for (const file of files) {
    try {
      const abs = path.resolve(ROOT, file); // относительный — от корня репозитория, абсолютный (--files) — как есть
      const st = statSync(abs);
      out.set(file, !st.isFile() || st.size > MAX_BYTES ? null : readFileSync(abs, 'utf8'));
    } catch (error) {
      console.warn(`${TAG} ${file}: не прочитан (${error instanceof Error ? error.message : String(error)}) — пропуск`);
    }
  }
  return out;
}

function main(argv) {
  const started = Date.now();
  let mode = 'staged';
  let files = [];
  if (argv.includes('--worktree')) mode = 'worktree';
  const fi = argv.indexOf('--files');
  if (fi >= 0) { mode = 'files'; files = candidates(argv.slice(fi + 1)); }
  let sources;
  if (mode === 'staged') {
    files = candidates(git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']).split('\n'));
    sources = readStaged(files);
  } else if (mode === 'worktree') {
    const changed = git(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']).split('\n');
    const untracked = git(['ls-files', '--others', '--exclude-standard']).split('\n');
    files = candidates([...new Set([...changed, ...untracked])]);
    sources = readWorktree(files);
  } else {
    sources = readWorktree(files);
  }
  const errors = [];
  let skippedBig = 0;
  for (const [file, src] of sources) {
    if (src === null) { skippedBig += 1; continue; }
    const err = checkSource(file, src);
    if (err) errors.push({ file, ...err });
  }
  for (const e of errors) console.error(`${TAG} ${e.file}:${e.line}:${e.column} ${e.message}`);
  const ms = Date.now() - started;
  if (errors.length > 0) {
    console.error(`${TAG} ОТКАЗ (${mode}): синтаксических ошибок ${errors.length} в ${sources.size} файлах за ${ms} мс — исправь до коммита/кадров.`);
    return 1;
  }
  console.log(`${TAG} ok (${mode}): файлов ${sources.size}${skippedBig ? `, больших пропущено ${skippedBig}` : ''}, ${ms} мс`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`${TAG} сбой сторожа: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
