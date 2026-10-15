// зачем: собирает макет ВСЕХ экранов сайта (вариант C «Живые темы», выбор владельца 2026-10-15).
// Каждая группа страниц — модуль pages/*.mjs, который экспортирует default: массив описаний страниц
// { file, title, body, css?, js?, states?, group, path, stateList? }. Оболочка (шапка, тема, подвал) — _shell.mjs.
// Запуск: node docs/design/site-2.0/_pages.mjs  → docs/design/site-2.0/c/*.html
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildPage } from './_shell.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'c');
mkdirSync(OUT, { recursive: true });

const mods = readdirSync(join(ROOT, 'pages')).filter((f) => f.endsWith('.mjs')).sort();
const all = [];
for (const m of mods) {
  try {
    const list = (await import(pathToFileURL(join(ROOT, 'pages', m)).href)).default;
    for (const p of list) all.push({ ...p, module: m });
  } catch (e) {
    // зачем: одна сломанная группа не должна валить сборку остальных страниц
    console.error('[SITE-2.0] модуль не собран:', m, '—', e && e.message);
  }
}
const seen = new Set();
for (const p of all) {
  if (seen.has(p.file)) { console.error('[SITE-2.0] повтор файла', p.file, 'в', p.module); continue; }
  seen.add(p.file);
  writeFileSync(join(OUT, p.file), buildPage(p), 'utf8');
  console.log('[SITE-2.0] страница', p.file.padEnd(34), p.states ? `состояний: ${p.states.length}` : '');
}
// Опись для витрины всех экранов (её читает pages/00-home.mjs при следующей сборке — порядок не важен).
writeFileSync(join(ROOT, 'c', 'screens.json'), JSON.stringify(all.map((p) => ({ file: p.file, title: p.title, group: p.group || 'Прочее', path: p.path || '', states: p.states || [] })), null, 1));
console.log('[SITE-2.0] всего страниц:', seen.size);
