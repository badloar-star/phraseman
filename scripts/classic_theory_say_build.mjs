// зачем (владелец 06.11, «Читается» в теории ВСЕХ курсов; в теории старого формата примеры — ссылки на фразы курса без поля чтения): собирает modules/classic-courses/<lang>/say.json —
// { ru: { "<полный id фразы>": "чтение" }, uk: {…} } для всех фраз, которые старая теория показывает примерами (chapters[].samples у es, chapters[].exampleIds у fr/de/it),
// и вписывает запись say.json в manifest.json (bytes, sha256). Приложение (app/classic_theory.ts → classic_theory_view.ts) выводит «Читается: …» под фразой.
// es: чтения строит правиловый транслитератор scripts/classic_say_translit_es.cjs (проверен на 237 чтениях теории es, написанных человеком; тест tests/classic_say_translit_es.test.ts).
// fr/de/it: пока файл пустой ({ru:{},uk:{}}) — наполняют сессии курсов; существующий файл не перезаписывается, а дополняется.
// Запуск: node scripts/classic_theory_say_build.mjs <lang> [--head-out <каталог>] [--manifest-in <manifest.json>] [--regen-extra]
//   --head-out    — основа HEAD, результат в каталог (say.json, manifest.json): для безопасного коммита поверх чужих правок в дереве;
//   --manifest-in — взять manifest из файла (цепочка после classic_intro_say_apply.mjs);
//   --regen-extra — перестроить docs/work/classic_intro_plain/say_extra_<lang>.json тем же транслитератором (только es): единый стиль чтений вступлений и теории.
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const lang = process.argv[2];
const headOut = arg('--head-out');
const manifestIn = arg('--manifest-in');
if (!['es', 'fr', 'de', 'it'].includes(lang)) { console.error('[THEORY-SAY] язык es|fr|de|it'); process.exit(2); }

const readSrc = (rel) => (headOut
  ? execSync(`git show HEAD:${rel}`, { cwd: ROOT, maxBuffer: 1 << 30 }).toString('utf8')
  : fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const dirRel = `modules/classic-courses/${lang}`;
const theoryRaw = JSON.parse(readSrc(`${dirRel}/theory.json`));
const theory = theoryRaw.data ?? theoryRaw;
const targets = new Map();
for (let n = 1; n <= 32; n += 1) {
  const lesson = JSON.parse(readSrc(`${dirRel}/lessons-${String(n).padStart(2, '0')}.json`));
  for (const p of lesson.phrases) targets.set(p.id, p.target);
}

// 1) какие фразы показывает старая теория
const ids = new Set();
for (const d of Object.values(theory)) {
  if (!d || d.plain === true) continue;
  if (d.localized) {
    const loc = d.localized.ru ?? d.localized.en ?? Object.values(d.localized)[0];
    for (const ch of loc?.chapters ?? []) for (const id of ch.samples ?? []) ids.add(String(id));
  } else {
    for (const ch of d.chapters ?? []) for (const id of [...(ch.exampleIds ?? []), ...(ch.examples ?? []).map((e) => e?.phraseId)]) if (id) ids.add(String(id));
  }
}

// 2) чтения
const existingFile = path.join(ROOT, dirRel, 'say.json');
let say = { schema: 'phraseman.classic.say/1', lang, ru: {}, uk: {} };
if (!headOut && fs.existsSync(existingFile)) say = { ...say, ...JSON.parse(fs.readFileSync(existingFile, 'utf8')) };
if (headOut) {
  try { say = { ...say, ...JSON.parse(execSync(`git show HEAD:${dirRel}/say.json`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 }).toString('utf8')) }; } catch { /* файла в HEAD ещё нет — начинаем с пустого */ }
}
let made = 0;
const missing = [];
if (lang === 'es') {
  const { translitEs } = require('./classic_say_translit_es.cjs');
  for (const id of [...ids].sort()) {
    const target = targets.get(id);
    if (!target) { missing.push(id); continue; }
    say.ru[id] = translitEs(target, 'ru');
    say.uk[id] = translitEs(target, 'uk');
    made += 1;
  }
  if (process.argv.includes('--regen-extra')) {
    const extraPath = path.join(ROOT, 'docs', 'work', 'classic_intro_plain', 'say_extra_es.json');
    const extra = JSON.parse(fs.readFileSync(extraPath, 'utf8'));
    let regen = 0;
    for (const id of Object.keys(extra)) {
      if (id.startsWith('_')) continue;
      const target = targets.get(id);
      if (!target) { missing.push(id); continue; }
      extra[id] = { ru: translitEs(target, 'ru'), uk: translitEs(target, 'uk') };
      regen += 1;
    }
    fs.writeFileSync(extraPath, JSON.stringify(extra, null, 2) + '\n');
    console.log(`[THEORY-SAY] ${lang}: say_extra перестроен правилами: ${regen}`);
  }
}
// fr (06.11): полу-ручная разметка — слои phrases.json / готовые чтения Теории / черновик по словарю слов; см. scripts/classic_say_fr_source.cjs
if (lang === 'fr') {
  const { buildFrSay } = require('./classic_say_fr_source.cjs');
  const fr = buildFrSay({ ids: [...ids].sort(), targets, theory, root: ROOT });
  Object.assign(say.ru, fr.ru);
  Object.assign(say.uk, fr.uk);
  made += Object.keys(fr.ru).length;
  missing.push(...fr.missing);
  console.log(`[THEORY-SAY] fr: источники — правки фраз ${fr.source.phrase}, готовые Теории ${fr.source.known}, черновик по словарю ${fr.source.draft}`);
}
const sortObj = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
say = { schema: 'phraseman.classic.say/1', lang, ru: sortObj(say.ru), uk: sortObj(say.uk) };
console.log(`[THEORY-SAY] ${lang}: фраз в старой теории ${ids.size}, чтений построено ${made}, всего в файле ${Object.keys(say.ru).length}, нет фразы курса: ${missing.length}${missing.length ? ' (' + missing.slice(0, 5).join(', ') + ')' : ''}`);
if (missing.length) { console.error('[THEORY-SAY] отказ: id из теории нет среди фраз курса'); process.exit(1); }

// 3) файлы
const sayText = JSON.stringify(say) + '\n';
const manifest = JSON.parse(manifestIn ? fs.readFileSync(manifestIn, 'utf8') : readSrc('modules/classic-courses/manifest.json'));
manifest.languages[lang].files['say.json'] = { bytes: Buffer.byteLength(sayText), sha256: createHash('sha256').update(sayText).digest('hex') };
const manifestText = JSON.stringify(manifest) + '\n';
const outSay = headOut ? path.join(headOut, `say_${lang}.json`) : path.join(ROOT, dirRel, 'say.json');
const outManifest = headOut ? path.join(headOut, 'manifest.json') : path.join(ROOT, 'modules/classic-courses/manifest.json');
if (headOut) fs.mkdirSync(headOut, { recursive: true });
fs.writeFileSync(outSay, sayText);
fs.writeFileSync(outManifest, manifestText);
console.log(`[THEORY-SAY] записано: ${outSay}, ${outManifest}`);
