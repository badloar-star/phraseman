#!/usr/bin/env node
/**
 * Храповик: язык интерфейса не сужать. Находка — язык, суженный до части языков (тип `…ContentLang` / союз 2–8 кодов /
 * тернарник `=== 'uk' ? 'uk' : … : 'ru'`), подан в переводчик (`triLang(x, …)`) или индексом в словарь (`STR[x]`).
 *
 * зачем (координатор 12.10, EN-проход Сверки cards-007/010/021): тексты переведены на 9 языков, а английский интерфейс видел
 * русский — сужен был выбор языка. Сторож литералов (scan_untranslated_ui) этот класс не видит. Контентные сужения законны
 * (материал есть только на ru/uk/es), они живут в базе; новое место — отказ.
 *
 *   node scripts/scan_narrowed_ui_lang.mjs            # проверить против базы
 *   node scripts/scan_narrowed_ui_lang.mjs --report   # показать места
 *   node scripts/scan_narrowed_ui_lang.mjs --update   # зафиксировать базу (только вниз)
 *   node scripts/scan_narrowed_ui_lang.mjs --staged   # pre-commit: в staged-файлах находок не больше, чем в HEAD
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findNarrowedUiLangUses } from './narrowed_ui_lang_scan.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'config', 'narrowed-ui-lang-baseline.json');
const SCAN_DIRS = ['app', 'components', 'hooks'];
const SKIP_DIR = /^(node_modules|__tests__|\.git|\.claude|\.codex-tmp|\.worktrees|tmp|_archive)$/;
const SOURCE = /\.(ts|tsx)$/;

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    console.warn(`[NARROWED-UI-LANG] не прочитать папку ${dir}: ${error instanceof Error ? error.message : String(error)}`);
    return out;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIR.test(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (SOURCE.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function scanAll() {
  const results = [];
  for (const dir of SCAN_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      const hits = findNarrowedUiLangUses(fs.readFileSync(file, 'utf8'), rel);
      if (hits.length) results.push({ file: rel, hits });
    }
  }
  return results.sort((a, b) => b.hits.length - a.hits.length || a.file.localeCompare(b.file));
}

function readBaseline() {
  try {
    return JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  } catch (error) {
    console.warn(`[NARROWED-UI-LANG] база не прочитана (${error instanceof Error ? error.message : String(error)}) — считаем 0`);
    return { total: 0 };
  }
}

function gitShow(spec) {
  try {
    return execFileSync('git', ['show', spec], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null; // нового файла нет в HEAD — для него «было» = 0 находок
  }
}

function checkStaged() {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { cwd: ROOT, encoding: 'utf8' });
  const files = out.split('\n').map((f) => f.trim()).filter((f) => SOURCE.test(f) && SCAN_DIRS.some((d) => f.startsWith(`${d}/`)) && !f.includes('/_archive/'));
  const grown = [];
  for (const rel of files) {
    const staged = gitShow(`:${rel}`);
    if (staged === null) continue;
    const before = gitShow(`HEAD:${rel}`);
    const now = findNarrowedUiLangUses(staged, rel);
    const was = before === null ? 0 : findNarrowedUiLangUses(before, rel).length;
    if (now.length > was) grown.push({ rel, was, now });
  }
  if (grown.length === 0) {
    console.log('[NARROWED-UI-LANG] OK: в staged-файлах суженный язык интерфейса не добавлен.');
    return 0;
  }
  console.error('[NARROWED-UI-LANG] Язык интерфейса сужен — английский (и pt-BR/vi/id/tr/pl) увидит русский:');
  for (const { rel, was, now } of grown) {
    console.error(`  ${rel}: было ${was}, стало ${now.length}`);
    for (const hit of now) console.error(`    :${hit.line} ${hit.kind} ${hit.name} — ${hit.text}`);
  }
  console.error('Подписи интерфейса — по языку интерфейса (useLang().lang, тип Lang), не по языку контента и не через тернарник с запасным ru.');
  return 1;
}

function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--staged')) return checkStaged();
  const results = scanAll();
  const total = results.reduce((sum, r) => sum + r.hits.length, 0);
  if (args.has('--report')) {
    console.log(`Файлов: ${results.length}, мест: ${total}`);
    for (const r of results) {
      console.log(`  ${r.hits.length}  ${r.file}`);
      for (const hit of r.hits) console.log(`      :${hit.line} ${hit.kind} ${hit.name} — ${hit.text}`);
    }
    return 0;
  }
  const baseline = readBaseline();
  if (args.has('--update')) {
    if (total > baseline.total && baseline.total > 0) {
      console.error(`[NARROWED-UI-LANG] база только вниз: ${total} > ${baseline.total}`);
      return 1;
    }
    fs.writeFileSync(BASELINE, `${JSON.stringify({ total, files: results.length, updatedAt: new Date().toISOString().slice(0, 10), note: 'Храповик: число может только уменьшаться. Обновлять через --update.' }, null, 2)}\n`);
    console.log(`[NARROWED-UI-LANG] база: ${total}`);
    return 0;
  }
  if (total > baseline.total) {
    console.error(`[NARROWED-UI-LANG] Стало хуже: ${total} против ${baseline.total} в базе. Смотри --report.`);
    return 1;
  }
  console.log(total < baseline.total ? `Стало лучше: ${total} против ${baseline.total}. Зафиксируй: --update` : `OK: ${total}, как в базе.`);
  return 0;
}

process.exit(main());
