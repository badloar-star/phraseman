// зачем (владелец 11.11, U20 «Точный смысл»): подсказка должна вести к той же конструкции, что и цель
// («I am early» — состояние сейчас, а не «Я пришёл рано»). Штатный путь — слой
// docs/work/classic_translation_fixes_u20_exact_sense_*.json + пересборка classic_course_pack.mjs,
// но исходный архив английского курса на машине не найден. Поэтому этот скрипт идемпотентно вносит те же
// значения в готовые lessons-NN.json (только sourceLocales; id/target/плитки/rev фраз не трогает) и
// пересчитывает <lang>/index.json и manifest.json так же, как сборщик (rev = sha256 всех lessons-файлов).
// Запуск: node scripts/u20_apply_exact_sense_hints.cjs [en|es|fr|de|it] [--check]   (--check — ничего не пишет)
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const ROOT = path.join(__dirname, '..');
const LANG = process.argv.slice(2).find((a) => /^(en|es|fr|de|it)$/.test(a)) || 'en';
const DIR = path.join(ROOT, 'modules', 'classic-courses', LANG);
const PICKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'work', 'u20_exact_sense_2026_11_11', `applied_${LANG}.json`), 'utf8'));
const CHECK = process.argv.includes('--check');
const QUIET = process.argv.includes('--quiet');
const sha = (s) => createHash('sha256').update(s).digest('hex');
// подсказка на языке самого курса — это цель, её не правим
const LOCALES = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'].filter((l) => l !== LANG));
// зачем: у английского курса id вида en-classic-r1:LL.NN, у остальных — <lang>:LL:NN
const phraseId = (id) => (LANG === 'en' ? `en-classic-r1:${id}` : `${LANG}:${id.replace('.', ':')}`);
const byLesson = {};
for (const id of Object.keys(PICKS)) (byLesson[id.slice(0, 2)] = byLesson[id.slice(0, 2)] || []).push(id);
let changed = 0, same = 0; const touched = [];
for (const n of Object.keys(byLesson).sort()) {
  const file = path.join(DIR, `lessons-${n}.json`);
  const before = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(before);
  if (JSON.stringify(data) + '\n' !== before) throw new Error(`[U20] ${file}: файл не в каноническом виде сборщика — не трогаю`);
  for (const id of byLesson[n]) {
    const ph = data.phrases.find((p) => p.id === phraseId(id));
    if (!ph) throw new Error(`[U20] фраза ${LANG} ${id} не найдена`);
    for (const [loc, text] of Object.entries(PICKS[id])) {
      if (!LOCALES.has(loc) || typeof text !== 'string' || !text.trim()) throw new Error(`[U20] ${LANG} ${id}.${loc}: пустое или чужое поле`);
      if (typeof ph.sourceLocales[loc] !== 'string') throw new Error(`[U20] ${LANG} ${id}: нет подсказки ${loc}`);
      if (ph.sourceLocales[loc] === text) { same++; continue; }
      if (!QUIET) console.log(`[U20] ${LANG} ${id} ${loc}: ${ph.sourceLocales[loc]}  =>  ${text}   (${ph.target})`);
      ph.sourceLocales[loc] = text; changed++;
    }
  }
  const after = JSON.stringify(data) + '\n';
  if (after !== before) { touched.push(`lessons-${n}.json`); if (!CHECK) fs.writeFileSync(file, after); }
}
console.log(`[U20] ${LANG}: изменено значений: ${changed}, уже совпадало: ${same}, файлов: ${touched.length}${CHECK ? ' (проверка, ничего не записано)' : ''}`);
if (!CHECK && touched.length) {
  const manifestPath = path.join(DIR, '..', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const cur = manifest.languages[LANG];
  const lessonHash = createHash('sha256');
  for (const name of Object.keys(cur.files)) {
    if (!name.startsWith('lessons-')) continue;
    const text = fs.readFileSync(path.join(DIR, name), 'utf8');
    lessonHash.update(text);
    cur.files[name] = { bytes: Buffer.byteLength(text), sha256: sha(text) };
  }
  const index = { lang: LANG, lessons: 32, phrases: cur.phrases, rev: lessonHash.digest('hex'), sourceZipSha256: cur.sourceZipSha256 };
  const indexText = JSON.stringify(index) + '\n';
  fs.writeFileSync(path.join(DIR, 'index.json'), indexText);
  cur.files['index.json'] = { bytes: Buffer.byteLength(indexText), sha256: sha(indexText) };
  manifest.languages[LANG] = { ...index, files: cur.files };
  // зачем: manifest.json бывает открыт другим процессом, и Windows тогда отклоняет перезапись и усечение (11.11 так остался
  // «хвост» старого содержимого и файл стал невалидным); замена через временный файл и переименование проходит.
  const tmpPath = manifestPath + '.u20tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(manifest) + '\n');
  fs.renameSync(tmpPath, manifestPath);
  console.log(`[U20] ${LANG}: index.rev = ${index.rev}; manifest.json обновлён`);
}
