// зачем (владелец 11.11, дословно: «фраза "лампы выключены", а собрать надо "the lights are off"… должны быть точные слова!
// не лайтс а лампс, если там лампы или свет»): подсказка обязана совпадать с целевой фразой по точным словам —
// «лампы» = lamps, «свет» = lights. В английском курсе lights переводилось как «лампы» (уроки 1 и теория к ним) и как
// «индикатор» (урок 26). Целевые фразы и плитки НЕ меняются: меняется русская и украинская подсказка и те места теории,
// объяснений «почему?» и словаря, которые её цитируют. Скрипт идемпотентен; исходных архивов курса на машине нет (как в U20),
// поэтому правка вносится в готовые файлы, а index.json и manifest.json пересчитываются так же, как это делает сборщик.
// Запуск: node scripts/u10_exact_words_lights.cjs [--check]
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'modules', 'classic-courses', 'en');
const CHECK = process.argv.includes('--check');
const LOG = '[U10-LIGHTS]';
const sha = (s) => createHash('sha256').update(s).digest('hex');

// подсказки фраз: id → { локаль: текст }
const HINTS = {
  '01.29': { ru: 'Свет включен.', uk: 'Світло ввімкнене.' },
  '01.30': { ru: 'Свет выключен.', uk: 'Світло вимкнене.' },
  // найдены сторожем tests/u10_exact_words_lights_guard.test.ts: lights / light переводилось как «лампы» / «лампа»
  '04.26': { ru: 'Свет не работает.', uk: 'Світло не працює.' },
  '09.48': { ru: 'Есть включённый свет на кухне.', uk: 'Є ввімкнене світло на кухні.' },
  // у велосипеда фонари, а не фары (фары — headlights у машины); решение владельца 11.11 «как лучше»
  '07.37': { ru: 'На моем велосипеде нет фонарей.', uk: 'У мого велосипеда немає ліхтарів.' },
  '26.22': { ru: 'Если мигает свет, позвоните на ресепшн.', uk: 'Якщо блимає світло, зателефонуйте на рецепцію.' },
};
// цитаты в теории, объяснениях и словаре: [файл, было, стало] — «было» обязано встретиться ровно один раз (или уже быть заменено)
const N = '\\n'; // в файлах теории перевод строки записан как \n внутри JSON-строки
const QUOTES = [
  ['theory.json', `The lights are on. — Лампы включены.${N}Слово lights значит «лампы». Слово on значит «включены».${N}The lights are off. — Лампы выключены.${N}Слово off значит «выключены».`,
    `The lights are on. — Свет включен.${N}Слово lights значит «свет». Слово on значит «включен».${N}The lights are off. — Свет выключен.${N}Слово off значит «выключен».`],
  ['theory.json', `The lights are on.${N}Слово lights означає «світильники». Слово on означає «увімкнений».${N}The lights are off.${N}Слово off означає «вимкнений».`,
    `The lights are on.${N}Слово lights означає «світло». Слово on означає «увімкнене».${N}The lights are off.${N}Слово off означає «вимкнене».`],
  ['theory.json', '"ru":"Выберите, как сказать: «Лампы выключены»","uk":"Виберіть, як сказати: «Лампи вимкнені»"', '"ru":"Выберите, как сказать: «Свет выключен»","uk":"Виберіть, як сказати: «Світло вимкнене»"'],
  ['theory.json', 'Раньше lights были «лампы». Здесь light — «светофор».', 'Раньше lights значило «свет». Здесь light — «светофор».'],
  ['theory.json', 'Раніше lights були «лампи». Тут light — «світлофор».', 'Раніше lights означало «світло». Тут light — «світлофор».'],
  ['theory.json', 'Раньше lights были «лампы», а в уроке 13 light — «светофор».', 'Раньше lights значило «свет», а в уроке 13 light — «светофор».'],
  ['theory.json', 'Раніше lights були «лампи», а в уроці 13 light — «світлофор».', 'Раніше lights означало «світло», а в уроці 13 light — «світлофор».'],
  ['theory.json', 'If the light flashes, call reception. — Если мигает индикатор, позвоните на ресепшн.', 'If the light flashes, call reception. — Если мигает свет, позвоните на ресепшн.'],
  ['theory.json', 'If the light flashes, call reception. — Якщо індикатор блимає, зателефонуйте на рецепцію.', 'If the light flashes, call reception. — Якщо блимає світло, зателефонуйте на рецепцію.'],
  ['theory_why.json', 'Lights значит «лампы», а off — «выключены». On — наоборот, «включены».', 'Lights значит «свет», а off — «выключен». On — наоборот, «включен».'],
  ['theory_why.json', 'Lights означає «лампи», а off — «вимкнені». On — навпаки, «увімкнені».', 'Lights означає «світло», а off — «вимкнене». On — навпаки, «увімкнене».'],
  ['theory_why.json', 'В других фразах речь о защёлке и об индикаторе.', 'В других фразах речь о защёлке и о мигающем свете.'],
  ['theory_why.json', 'В інших фразах мова про засувку й про індикатор.', 'В інших фразах мова про засувку й про світло, що блимає.'],
  ['glossary.json', '{"lemma":"lights","meaning":{"ru":"свет, лампы","uk":"світло, лампи"', '{"lemma":"lights","meaning":{"ru":"свет","uk":"світло"'],
];

function writeReplacing(file, text) {
  // зачем: файлы курса бывают открыты другими процессами, и Windows отклоняет перезапись на месте — замена через переименование
  const tmp = `${file}.u10tmp`;
  let lastError = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { fs.writeFileSync(tmp, text); fs.renameSync(tmp, file); return; } catch (error) { lastError = error; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500); }
  }
  throw new Error(`${LOG} не удалось записать ${file}: ${lastError && lastError.message}`);
}

let changed = 0;
const touched = new Set();
const byLesson = {};
for (const id of Object.keys(HINTS)) (byLesson[id.slice(0, 2)] = byLesson[id.slice(0, 2)] || []).push(id);
for (const nn of Object.keys(byLesson).sort()) {
  const name = `lessons-${nn}.json`;
  const before = fs.readFileSync(path.join(DIR, name), 'utf8');
  const data = JSON.parse(before);
  if (JSON.stringify(data) + '\n' !== before) throw new Error(`${LOG} ${name}: файл не в каноническом виде сборщика — не трогаю`);
  for (const id of byLesson[nn]) {
    const phrase = data.phrases.find((p) => p.id === `en-classic-r1:${id}`);
    if (!phrase) throw new Error(`${LOG} фраза ${id} не найдена`);
    for (const [locale, text] of Object.entries(HINTS[id])) {
      if (typeof phrase.sourceLocales[locale] !== 'string') throw new Error(`${LOG} ${id}: нет подсказки ${locale}`);
      if (phrase.sourceLocales[locale] === text) continue;
      console.log(`${LOG} ${id} ${locale}: ${phrase.sourceLocales[locale]}  =>  ${text}   (${phrase.target})`);
      phrase.sourceLocales[locale] = text; changed += 1;
    }
  }
  const after = JSON.stringify(data) + '\n';
  if (after !== before) { touched.add(name); if (!CHECK) writeReplacing(path.join(DIR, name), after); }
}
const texts = new Map();
for (const [name, from, to] of QUOTES) {
  if (!texts.has(name)) texts.set(name, fs.readFileSync(path.join(DIR, name), 'utf8'));
  const text = texts.get(name);
  const count = text.split(from).length - 1;
  if (count === 0 && text.includes(to)) continue; // уже применено
  // зачем: следующий шаг (scripts/u10_replace_traffic_light_phrases.cjs) убрал из теории сами фразы про светофор вместе с этими строками
  if (count === 0 && name === 'theory.json' && /светофор|світлофор/.test(from) && text.includes('This button will turn green in a moment.')) continue;
  if (count !== 1) throw new Error(`${LOG} ${name}: «${from.slice(0, 60)}…» встречается ${count} раз, ожидался 1 — не трогаю`);
  console.log(`${LOG} ${name}: ${from.slice(0, 70)}…  =>  ${to.slice(0, 70)}…`);
  texts.set(name, text.replace(from, to)); touched.add(name); changed += 1;
}
for (const [name, text] of texts) {
  JSON.parse(text); // после замены файл обязан остаться корректным JSON
  if (!CHECK && touched.has(name)) writeReplacing(path.join(DIR, name), text);
}
console.log(`${LOG} изменений: ${changed}, файлов: ${touched.size}${CHECK ? ' (проверка, ничего не записано)' : ''}`);

if (!CHECK && touched.size) {
  const manifestPath = path.join(DIR, '..', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const en = manifest.languages.en;
  const lessonHash = createHash('sha256');
  for (const name of Object.keys(en.files)) {
    if (name === 'index.json') continue;
    const text = fs.readFileSync(path.join(DIR, name), 'utf8');
    if (name.startsWith('lessons-')) lessonHash.update(text);
    if (name.startsWith('lessons-') || touched.has(name)) en.files[name] = { bytes: Buffer.byteLength(text), sha256: sha(text) };
  }
  const index = { lang: 'en', lessons: 32, phrases: en.phrases, rev: lessonHash.digest('hex'), sourceZipSha256: en.sourceZipSha256 };
  const indexText = JSON.stringify(index) + '\n';
  writeReplacing(path.join(DIR, 'index.json'), indexText);
  en.files['index.json'] = { bytes: Buffer.byteLength(indexText), sha256: sha(indexText) };
  manifest.languages.en = { ...index, files: en.files };
  writeReplacing(manifestPath, JSON.stringify(manifest) + '\n');
  console.log(`${LOG} index.json и manifest.json пересчитаны`);
}
