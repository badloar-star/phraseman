#!/usr/bin/env node
/**
 * Сторож «каждый относительный импорт указывает на файл, который есть в git».
 *
 * зачем (координатор 24.10, инцидент 15d7faf14 → 1cd4ec19e): Дизайн закоммитил SpireStepScreen.tsx с импортом dev-кнопки,
 * а сам файл кнопки лежал в рабочем дереве НЕзакоммиченным. У всех сессий всё собиралось (файл на диске есть), а сборка
 * из чистого HEAD (так собирается стор) упала бы на «Unable to resolve module». Класс риска — «коммит импортирует файл,
 * которого нет в git». jest и tsc этого не видят: они читают рабочее дерево.
 *
 * Режимы (без jest, секунды):
 *   node scripts/guard_tracked_imports.mjs                 — весь HEAD: все файлы app/components/constants/hooks/modules/shared
 *   node scripts/guard_tracked_imports.mjs --tree <rev>    — то же для любой ревизии
 *   node scripts/guard_tracked_imports.mjs --staged        — индекс (pre-commit): изменённые файлы + кто импортирует удалённые
 * Код выхода 1 и список «файл:строка → импорт», если хоть один импорт не разрешается в отслеживаемый файл.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';

const LOG = '[TRACKED-IMPORTS]';
const SCOPE = /^(app|components|constants|hooks|modules|shared)\//;
const CODE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const CODE_EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const PLATFORM = ['', '.ios', '.android', '.native', '.web'];
// Тесты и dev-заглушки сборки не входят в бандл приложения; *.d.ts — только типы.
const SKIP = /(\.test\.|\.spec\.|__tests__\/|\.d\.ts$)/;

const args = process.argv.slice(2);
const staged = args.includes('--staged');
const treeArg = args.indexOf('--tree');
const rev = treeArg >= 0 ? args[treeArg + 1] : 'HEAD';

const git = (gitArgs, opts = {}) => execFileSync('git', gitArgs, { encoding: 'utf8', maxBuffer: 1 << 28, ...opts });

const listTracked = () => (staged ? git(['ls-files']) : git(['ls-tree', '-r', '--name-only', rev]))
  .split('\n').filter(Boolean).map((p) => p.replace(/\\/g, '/'));

/** Содержимое пачкой через cat-file --batch: ревизия `rev:путь` или индекс `:путь`. */
function readBlobs(paths) {
  if (paths.length === 0) return new Map();
  const input = paths.map((p) => (staged ? `:${p}` : `${rev}:${p}`)).join('\n') + '\n';
  const out = spawnSync('git', ['cat-file', '--batch'], { input, maxBuffer: 1 << 30 });
  if (out.status !== 0) throw new Error(`cat-file failed: ${String(out.stderr).slice(0, 200)}`);
  const buf = out.stdout;
  const result = new Map();
  let pos = 0;
  for (const p of paths) {
    const nl = buf.indexOf(0x0a, pos);
    const header = buf.subarray(pos, nl).toString('utf8');
    pos = nl + 1;
    if (header.endsWith(' missing')) { result.set(p, ''); continue; }
    const size = Number(header.split(' ')[2]);
    result.set(p, buf.subarray(pos, pos + size).toString('utf8'));
    pos += size + 1;
  }
  return result;
}

/** Относительные импорты с номером строки; комментарии вырезаются, чтобы закомментированный импорт не считался. */
function relativeImports(source) {
  const noBlock = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const lines = noBlock.split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1'));
  const found = [];
  const re = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*|\bjest\.mock\s*\(\s*)['"](\.{1,2}\/[^'"\n]+)['"]/g;
  lines.forEach((line, i) => {
    for (const m of line.matchAll(re)) found.push({ spec: m[1], line: i + 1 });
  });
  return found;
}

function resolves(importer, spec, tracked) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), spec));
  if (tracked.has(base)) return true;
  for (const plat of PLATFORM) {
    for (const ext of CODE_EXT) {
      if (tracked.has(`${base}${plat}${ext}`)) return true;
      if (tracked.has(`${base}/index${plat}${ext}`)) return true;
    }
  }
  return false;
}

const started = Date.now();
const trackedList = listTracked();
const tracked = new Set(trackedList);

let importers;
if (staged) {
  // зачем: в pre-commit смотрим только то, что меняет коммит, — изменённые файлы и тех, кто импортирует удалённые
  const changed = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']).split('\n').filter(Boolean);
  const removed = git(['diff', '--cached', '--name-only', '--diff-filter=D']).split('\n').filter(Boolean);
  const set = new Set(changed.filter((p) => SCOPE.test(p) && CODE.test(p) && !SKIP.test(p)));
  for (const gone of removed) {
    const stem = path.posix.basename(gone).replace(/(\.(ios|android|native|web))?\.[a-z]+$/, '');
    if (!stem) continue;
    const hits = spawnSync('git', ['grep', '--cached', '-l', '-F', stem, '--', 'app', 'components', 'constants', 'hooks', 'modules', 'shared'], { encoding: 'utf8' });
    for (const p of String(hits.stdout).split('\n').filter(Boolean)) if (CODE.test(p) && !SKIP.test(p)) set.add(p);
  }
  importers = [...set].filter((p) => tracked.has(p));
} else {
  importers = trackedList.filter((p) => SCOPE.test(p) && CODE.test(p) && !SKIP.test(p));
}

const blobs = readBlobs(importers);
const broken = [];
for (const file of importers) {
  for (const { spec, line } of relativeImports(blobs.get(file) ?? '')) {
    if (!resolves(file, spec, tracked)) broken.push(`${file}:${line} → ${spec}`);
  }
}
// одна строка может совпасть дважды (например, `import(` внутри `require(` обёртки) — печатаем каждую один раз
broken.splice(0, broken.length, ...new Set(broken));

const where = staged ? 'индекс (коммит)' : rev;
if (broken.length > 0) {
  console.error(`${LOG} ОТКАЗ: ${broken.length} импорт(ов) не разрешаются в файлы git (${where}) — сборка из чистого дерева упадёт:`);
  for (const b of broken.slice(0, 40)) console.error(`  ${b}`);
  if (broken.length > 40) console.error(`  … и ещё ${broken.length - 40}`);
  console.error(`${LOG} закоммитьте недостающие файлы вместе с импортом (или уберите импорт).`);
  process.exit(1);
}
console.log(`${LOG} ok ${where}: файлов ${importers.length}, ${Date.now() - started} мс`);
