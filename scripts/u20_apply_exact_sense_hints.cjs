// зачем (владелец 11.11, U20 «Точный смысл»): подсказка должна вести к той же конструкции, что и цель
// («I am early» — состояние сейчас, а не «Я пришёл рано»). Штатный путь — слой
// docs/work/classic_translation_fixes_u20_exact_sense_2026_11_11.json + пересборка classic_course_pack.mjs,
// но исходный архив английского курса на машине не найден. Поэтому этот скрипт идемпотентно вносит те же
// значения в готовые lessons-NN.json (только sourceLocales; id/target/плитки/rev фраз не трогает) и
// пересчитывает en/index.json и manifest.json так же, как сборщик (rev = sha256 всех lessons-файлов).
// Запуск: node scripts/u20_apply_exact_sense_hints.cjs [--check]   (--check — ничего не пишет)
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'modules', 'classic-courses', 'en');
const PICKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'work', 'u20_exact_sense_2026_11_11', 'applied_en.json'), 'utf8'));
const CHECK = process.argv.includes('--check');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const LOCALES = new Set(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);
const byLesson = {};
for (const id of Object.keys(PICKS)) (byLesson[id.slice(0, 2)] = byLesson[id.slice(0, 2)] || []).push(id);
let changed = 0, same = 0; const touched = [];
for (const n of Object.keys(byLesson).sort()) {
  const file = path.join(DIR, `lessons-${n}.json`);
  const before = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(before);
  if (JSON.stringify(data) + '\n' !== before) throw new Error(`[U20] ${file}: файл не в каноническом виде сборщика — не трогаю`);
  for (const id of byLesson[n]) {
    const ph = data.phrases.find((p) => p.id === `en-classic-r1:${id}`);
    if (!ph) throw new Error(`[U20] фраза ${id} не найдена`);
    for (const [loc, text] of Object.entries(PICKS[id])) {
      if (!LOCALES.has(loc) || typeof text !== 'string' || !text.trim()) throw new Error(`[U20] ${id}.${loc}: пустое или чужое поле`);
      if (typeof ph.sourceLocales[loc] !== 'string') throw new Error(`[U20] ${id}: нет подсказки ${loc}`);
      if (ph.sourceLocales[loc] === text) { same++; continue; }
      console.log(`[U20] ${id} ${loc}: ${ph.sourceLocales[loc]}  =>  ${text}   (${ph.target})`);
      ph.sourceLocales[loc] = text; changed++;
    }
  }
  const after = JSON.stringify(data) + '\n';
  if (after !== before) { touched.push(`lessons-${n}.json`); if (!CHECK) fs.writeFileSync(file, after); }
}
console.log(`[U20] изменено значений: ${changed}, уже совпадало: ${same}, файлов: ${touched.length}${CHECK ? ' (проверка, ничего не записано)' : ''}`);
if (!CHECK && touched.length) {
  const manifestPath = path.join(DIR, '..', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const en = manifest.languages.en;
  const lessonHash = createHash('sha256');
  for (const name of Object.keys(en.files)) {
    if (!name.startsWith('lessons-')) continue;
    const text = fs.readFileSync(path.join(DIR, name), 'utf8');
    lessonHash.update(text);
    en.files[name] = { bytes: Buffer.byteLength(text), sha256: sha(text) };
  }
  const index = { lang: 'en', lessons: 32, phrases: en.phrases, rev: lessonHash.digest('hex'), sourceZipSha256: en.sourceZipSha256 };
  const indexText = JSON.stringify(index) + '\n';
  fs.writeFileSync(path.join(DIR, 'index.json'), indexText);
  en.files['index.json'] = { bytes: Buffer.byteLength(indexText), sha256: sha(indexText) };
  manifest.languages.en = { ...index, files: en.files };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest) + '\n');
  console.log(`[U20] index.rev = ${index.rev}; manifest.json обновлён`);
}
