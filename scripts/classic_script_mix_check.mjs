// Смесь кириллицы и латиницы внутри одного слова (владелец/Макеты 05.11: «уо» набрано кириллицей вместо «yo»). Проверка всех текстов классики:
// lessons (ru/uk/target/alternatives/tiles), theory, intro, glossary, ui. Запуск: node scripts/classic_script_mix_check.mjs [--list]
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CYR = /[Ѐ-ӿ]/; const LAT = /[A-Za-zÀ-ɏ]/;
const found = [];
function walk(node, path, lang, file) {
  if (typeof node === 'string') {
    for (const w of node.split(/[\s.,;:!?¿¡«»"“”()\[\]/—–-]+/)) if (w && CYR.test(w) && LAT.test(w)) found.push({ lang, file, path, word: w, ctx: node.slice(Math.max(0, node.indexOf(w) - 30), node.indexOf(w) + 30) });
  } else if (Array.isArray(node)) node.forEach((x, i) => walk(x, `${path}[${i}]`, lang, file));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`, lang, file);
}
for (const lang of ['en', 'es', 'fr', 'de', 'it']) {
  const dir = join(ROOT, 'modules', 'classic-courses', lang);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json') && x !== 'index.json')) walk(JSON.parse(readFileSync(join(dir, f), 'utf8')), '', lang, f);
}
const by = {};
for (const x of found) by[`${x.lang}/${x.file.replace(/lessons-\d+/, 'lessons')}`] = (by[`${x.lang}/${x.file.replace(/lessons-\d+/, 'lessons')}`] ?? 0) + 1;
console.log(`слов со смесью алфавитов: ${found.length}`, JSON.stringify(by));
if (process.argv.includes('--list')) for (const x of found.slice(0, 80)) console.log(x.lang, x.file, x.path, '«' + x.word + '»', '…' + x.ctx.replace(/\n/g, ' ') + '…');
