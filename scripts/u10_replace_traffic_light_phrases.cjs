// зачем (владелец 11.11, дословно: «убери такие фразы тогда и замени их на другие, которые можно перевести без потери
// порядка и смысла (и переозвучить)»): в четырёх фразах английского курса light(s) значило «светофор» — слово в подсказке
// не совпадало с тем, что ученик собирает. Фразы заменены на другие с той же грамматической целью урока и уже пройденными
// словами (hotel — урок 7, bank — 12, button — 6, price — 4); id, порядок и число фраз прежние, прогресс хранится по
// позиции и не сдвигается. Вместе с фразой меняются плитка последнего слова, переводы девяти языков, строки теории,
// объяснение «почему?» и привязки словаря. Озвучка считается по тексту фразы — список на перезапись лежит в
// docs/work/u10_tiles_2026_11_11/revoice_traffic_light_phrases.md. Скрипт идемпотентен.
// Запуск: node scripts/u10_replace_traffic_light_phrases.cjs [--check]
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'modules', 'classic-courses', 'en');
const CHECK = process.argv.includes('--check');
const LOG = '[U10-TRAFFIC-LIGHT]';
const sha = (s) => createHash('sha256').update(s).digest('hex');
const ID = (n) => `en-classic-r1:${n}`;
const NOUNS = ['lamp', 'door', 'room', 'keys', 'phone'];

// id → замена: старая фраза (для сверки), новая фраза, заменяемая плитка, переводы
const PHRASES = {
  '11.27': {
    from: 'We crossed the road at the lights.', to: 'We crossed the road at the hotel.', oldWord: 'lights', newWord: 'hotel',
    locales: { ru: 'Мы перешли дорогу у отеля.', uk: 'Ми перейшли дорогу біля готелю.', en: 'We crossed the road at the hotel.', es: 'Nosotros cruzamos la calle en el hotel.', 'pt-BR': 'Nós atravessamos a rua no hotel.', vi: 'Chúng tôi đã băng qua đường ở chỗ khách sạn.', id: 'Kami menyeberang jalan di hotel.', tr: 'Biz otelin orada karşıya geçtik.', pl: 'My przeszliśmy przez ulicę przy hotelu.' },
  },
  '13.46': {
    from: 'This light will turn green in a moment.', to: 'This button will turn green in a moment.', oldWord: 'light', newWord: 'button',
    locales: { ru: 'Эта кнопка станет зеленой через мгновение.', uk: 'Ця кнопка стане зеленою за мить.', en: 'This button will turn green in a moment.', es: 'Este botón se pondrá verde en un momento.', 'pt-BR': 'Este botão ficará verde em instantes.', vi: 'Nút này sẽ chuyển sang màu xanh trong giây lát.', id: 'Tombol ini akan berubah hijau sebentar lagi.', tr: 'Bu düğme birazdan yeşile dönecek.', pl: 'Ten przycisk zmieni się na zielony za chwilę.' },
  },
  '18.31': {
    from: 'Turn left at the lights.', to: 'Turn left at the bank.', oldWord: 'lights', newWord: 'bank',
    locales: { ru: 'Поверните налево у банка.', uk: 'Поверніть ліворуч біля банку.', en: 'Turn left at the bank.', es: 'Gire a la izquierda en el banco.', 'pt-BR': 'Vire à esquerda no banco.', vi: 'Rẽ trái tại ngân hàng.', id: 'Belok kiri di bank.', tr: 'Bankadan sola dönün.', pl: 'Skręć w lewo przy banku.' },
  },
  '31.08': {
    from: 'She saw the light change.', to: 'She saw the price change.', oldWord: 'light', newWord: 'price',
    locales: { ru: 'Она видела, как изменилась цена.', uk: 'Вона побачила, як змінилася ціна.', en: 'She saw the price change.', es: 'Ella vio el precio cambiar.', 'pt-BR': 'Ela viu o preço mudar.', vi: 'Cô ấy thấy giá thay đổi.', id: 'Dia melihat harga berubah. (Seorang perempuan.)', tr: 'O, fiyatın değiştiğini gördü. (Bir kadın.)', pl: 'Widziała, jak cena się zmieniła.' },
  },
};

// теория: [урок, глава, локали ('*' — все), было (строка целиком), стало (null — строку убрать)]
const EN_COPY = ['en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']; // в этих локалях текст теории — английский
const THEORY_LINES = [
  [11, 'c5', ['ru'], 'We crossed the road at the lights. — Мы перешли дорогу на светофоре.', 'We crossed the road at the hotel. — Мы перешли дорогу у отеля.'],
  [11, 'c5', ['ru'], 'Читается: уи кро́ст зэ ро́уд эт зэ ла́йтс.', 'Читается: уи кро́ст зэ ро́уд эт зэ хоутэ́л.'],
  [11, 'c5', ['ru'], 'Слово lights значит «светофор».', 'Слово hotel значит «отель».'],
  [11, 'c5', ['ru'], 'Слова at the lights вместе значат «на светофоре».', 'Слова at the hotel вместе значат «у отеля».'],
  [11, 'c5', ['uk'], 'We crossed the road at the lights. — Ми перейшли дорогу на світлофорі.', 'We crossed the road at the hotel. — Ми перейшли дорогу біля готелю.'],
  [11, 'c5', ['uk'], 'Читається: уи кро́ст зе ро́уд ет зе ла́йтс.', 'Читається: уи кро́ст зе ро́уд ет зе хоуте́л.'],
  [11, 'c5', ['uk'], 'Слово lights означає «світлофор».', 'Слово hotel означає «готель».'],
  [11, 'c5', ['uk'], 'Слова at the lights разом означають «на світлофорі».', 'Слова at the hotel разом означають «біля готелю».'],
  [11, 'c5', EN_COPY, 'We crossed the road at the lights.', 'We crossed the road at the hotel.'],
  [11, 'c5', EN_COPY, 'The word lights means “red, yellow and green lamps for cars”.', 'The word hotel means “a place to stay for a night”.'],
  [11, 'c5', EN_COPY, 'The words at the lights together mean at the traffic lights.', 'The words at the hotel together mean “near the hotel”.'],
  [13, 'c4', ['ru'], 'This light will turn green in a moment. — Этот светофор через мгновение загорится зеленым.', 'This button will turn green in a moment. — Эта кнопка станет зеленой через мгновение.'],
  [13, 'c4', ['ru'], 'Читается: зи́с ла́йт уил тэ́рн гри́н ин э мо́умент.', 'Читается: зи́с ба́тн уил тэ́рн гри́н ин э мо́умент.'],
  [13, 'c4', ['ru'], 'Раньше lights значило «свет». Здесь light — «светофор».', null],
  [13, 'c4', ['ru'], 'Слова turn green вместе значат «загореться зелёным».', 'Слова turn green вместе значат «стать зелёным».'],
  [13, 'c4', ['uk'], 'This light will turn green in a moment. — Цей світлофор за мить загориться зеленим.', 'This button will turn green in a moment. — Ця кнопка стане зеленою за мить.'],
  [13, 'c4', ['uk'], 'Читається: зі́с ла́йт уил те́рн грі́н ін е мо́умент.', 'Читається: зі́с ба́тн уил те́рн грі́н ін е мо́умент.'],
  [13, 'c4', ['uk'], 'Раніше lights означало «світло». Тут light — «світлофор».', null],
  [13, 'c4', ['uk'], 'Слова turn green разом означають «засвітитися зеленим».', 'Слова turn green разом означають «стати зеленим».'],
  [13, 'c4', EN_COPY, 'This light will turn green in a moment.', 'This button will turn green in a moment.'],
  [13, 'c4', EN_COPY, 'Before, lights were lamps. Here light is a traffic light.', null],
  [14, 'c1', ['ru'], 'Раньше lights значило «свет», а в уроке 13 light — «светофор». Здесь light — «лёгкий».', 'Раньше lights значило «свет». Здесь light — «лёгкий».'],
  [14, 'c1', ['uk'], 'Раніше lights означало «світло», а в уроці 13 light — «світлофор». Тут light — «легкий».', 'Раніше lights означало «світло». Тут light — «легкий».'],
  [14, 'c1', EN_COPY, 'In lesson 13, light was a traffic light.', null],
  [18, 'c7', ['ru'], 'Turn left at the lights. — Поверните налево на светофоре.', 'Turn left at the bank. — Поверните налево у банка.'],
  [18, 'c7', ['ru'], 'Читается: тэ́рн лэ́фт эт зэ ла́йтс.', 'Читается: тэ́рн лэ́фт эт зэ бэ́нк.'],
  [18, 'c7', ['uk'], 'Turn left at the lights. — Поверніть ліворуч на світлофорі.', 'Turn left at the bank. — Поверніть ліворуч біля банку.'],
  [18, 'c7', ['uk'], 'Читається: те́рн ле́фт ет зе ла́йтс.', 'Читається: те́рн ле́фт ет зе бе́нк.'],
  [18, 'c7', EN_COPY, 'Turn left at the lights.', 'Turn left at the bank.'],
];
// «как читается» у примеров главы: [урок, глава, id фразы, локаль, было, стало]
const THEORY_SAY = [
  [11, 'c5', '11.27', 'ru', 'уи кро́ст зэ ро́уд эт зэ ла́йтс', 'уи кро́ст зэ ро́уд эт зэ хоутэ́л'],
  [11, 'c5', '11.27', 'uk', 'уи кро́ст зе ро́уд ет зе ла́йтс', 'уи кро́ст зе ро́уд ет зе хоуте́л'],
  [13, 'c4', '13.46', 'ru', 'зи́с ла́йт уил тэ́рн гри́н ин э мо́умент', 'зи́с ба́тн уил тэ́рн гри́н ин э мо́умент'],
  [13, 'c4', '13.46', 'uk', 'зі́с ла́йт уил те́рн грі́н ін е мо́умент', 'зі́с ба́тн уил те́рн грі́н ін е мо́умент'],
];
// задания главы «Выберите, как сказать»: [урок, глава, id фразы, {локаль: было → стало}]
const THEORY_COMMANDS = [
  [11, 'c5', '11.27', { ru: ['«Мы перешли дорогу на светофоре»', '«Мы перешли дорогу у отеля»'], uk: ['«Ми перейшли дорогу на світлофорі»', '«Ми перейшли дорогу біля готелю»'], en: ['“We crossed the road at the lights.”', '“We crossed the road at the hotel.”'] }],
  [13, 'c4', '13.46', { ru: ['«Этот светофор через мгновение загорится зеленым»', '«Эта кнопка станет зеленой через мгновение»'], uk: ['«Цей світлофор за мить загориться зеленим»', '«Ця кнопка стане зеленою за мить»'], en: ['“This light will turn green in a moment.”', '“This button will turn green in a moment.”'] }],
];
// объяснения «почему?» (файл хранится не в каноническом виде — правка по тексту): [было, стало], «было» ровно один раз
const WHY = [
  ['Light здесь — «светофор», turn green — «загореться зелёным», in a moment — «через мгновение».', 'Button — «кнопка», turn green — «стать зелёным», in a moment — «через мгновение».'],
  ['Light тут — «світлофор», turn green — «загорітися зеленим», in a moment — «за мить».', 'Button — «кнопка», turn green — «стати зеленим», in a moment — «за мить».'],
  ['Light here means the traffic light, and turn green is what it does.', 'Button is a thing you press, and turn green is what it does.'],
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
function readCanonical(name) {
  const text = fs.readFileSync(path.join(DIR, name), 'utf8');
  const data = JSON.parse(text);
  if (JSON.stringify(data) + '\n' !== text) throw new Error(`${LOG} ${name}: файл не в каноническом виде сборщика — не трогаю`);
  return { text, data };
}

let changed = 0;
const touched = new Set();
const note = (message) => { changed += 1; console.log(`${LOG} ${message}`); };
const finish = (name, before, data) => {
  const after = JSON.stringify(data) + '\n';
  if (after === before) return;
  touched.add(name);
  if (!CHECK) writeReplacing(path.join(DIR, name), after);
};

// 1. фразы уроков
for (const [num, spec] of Object.entries(PHRASES)) {
  const name = `lessons-${num.slice(0, 2)}.json`;
  const { text, data } = readCanonical(name);
  const phrase = data.phrases.find((p) => p.id === ID(num));
  if (!phrase) throw new Error(`${LOG} фраза ${num} не найдена`);
  if (phrase.target !== spec.to) {
    if (phrase.target !== spec.from) throw new Error(`${LOG} ${num}: неожиданная фраза «${phrase.target}» — не трогаю`);
    const target = phrase.tiles.filter((t) => t.correct === spec.oldWord);
    if (target.length !== 1) throw new Error(`${LOG} ${num}: плитка «${spec.oldWord}» не единственная`);
    target[0].text = spec.newWord; target[0].correct = spec.newWord; target[0].distractors = NOUNS.slice();
    for (const other of phrase.tiles) if (other !== target[0] && other.distractors.includes(spec.newWord)) throw new Error(`${LOG} ${num}: «${spec.newWord}» уже стоит соблазном у «${other.correct}»`);
    if (phrase.tiles.map((t) => t.correct).join(' ') !== spec.to.replace(/[.?!,]/g, '')) throw new Error(`${LOG} ${num}: плитки не складываются в новую фразу`);
    if ((phrase.alternatives || []).length || (phrase.accepted || []).length) throw new Error(`${LOG} ${num}: у фразы есть допустимые варианты — нужен ручной разбор`);
    for (const locale of Object.keys(phrase.sourceLocales)) if (typeof spec.locales[locale] !== 'string') throw new Error(`${LOG} ${num}: нет перевода ${locale}`);
    note(`${num}: ${spec.from}  =>  ${spec.to}   (${phrase.sourceLocales.ru}  =>  ${spec.locales.ru})`);
    phrase.target = spec.to;
    phrase.sourceLocales = { ...phrase.sourceLocales, ...spec.locales };
    // зачем: та же формула, что у сборщика курса (scripts/classic_course_pack.mjs) для английского
    phrase.rev = sha(JSON.stringify([phrase.target, phrase.tiles, phrase.alternatives])).slice(0, 20);
  }
  finish(name, text, data);
}

// 2. теория
{
  const { text, data } = readCanonical('theory.json');
  const chapter = (lesson, id) => {
    const found = data.data[lesson].chapters.find((c) => c.id === id);
    if (!found) throw new Error(`${LOG} теория: нет главы ${lesson}.${id}`);
    return found;
  };
  for (const [lesson, id, locales, from, to] of THEORY_LINES) {
    const ch = chapter(lesson, id);
    for (const locale of locales) {
      const lines = ch.textByLocale[locale].split('\n');
      const at = lines.indexOf(from);
      if (at < 0) { if (to === null || lines.includes(to)) continue; throw new Error(`${LOG} теория ${lesson}.${id}.${locale}: нет строки «${from}»`); }
      if (lines.indexOf(from, at + 1) >= 0) throw new Error(`${LOG} теория ${lesson}.${id}.${locale}: строка «${from}» встречается дважды`);
      if (to === null) lines.splice(at, 1); else lines[at] = to;
      ch.textByLocale[locale] = lines.join('\n');
      note(`теория ${lesson}.${id}.${locale}: ${from}  =>  ${to === null ? '(строка убрана)' : to}`);
    }
  }
  for (const [lesson, id, num, locale, from, to] of THEORY_SAY) {
    const example = chapter(lesson, id).examples.find((e) => e.phraseId === ID(num));
    if (!example) throw new Error(`${LOG} теория ${lesson}.${id}: нет примера ${num}`);
    if (example.say[locale] === to) continue;
    if (example.say[locale] !== from) throw new Error(`${LOG} теория ${lesson}.${id}: неожиданное чтение примера ${num} (${locale})`);
    example.say[locale] = to; note(`теория ${lesson}.${id}, чтение ${num} ${locale}: ${to}`);
  }
  for (const [lesson, id, num, byLocale] of THEORY_COMMANDS) {
    const task = chapter(lesson, id).practice.find((p) => p.promptPhraseId === ID(num));
    if (!task) throw new Error(`${LOG} теория ${lesson}.${id}: нет задания по фразе ${num}`);
    for (const locale of Object.keys(task.commandByLocale)) {
      const [from, to] = byLocale[locale] || byLocale.en;
      const current = task.commandByLocale[locale];
      if (current.includes(to)) continue;
      if (!current.includes(from)) throw new Error(`${LOG} теория ${lesson}.${id}: неожиданный текст задания ${num} (${locale})`);
      task.commandByLocale[locale] = current.replace(from, to); note(`теория ${lesson}.${id}, задание ${num} ${locale}: ${to}`);
    }
  }
  finish('theory.json', text, data);
}

// 3. объяснения «почему?»
{
  const file = path.join(DIR, 'theory_why.json');
  const before = fs.readFileSync(file, 'utf8');
  let text = before;
  for (const [from, to] of WHY) {
    const count = text.split(from).length - 1;
    if (count === 0 && text.includes(to)) continue;
    if (count !== 1) throw new Error(`${LOG} theory_why.json: «${from.slice(0, 50)}…» встречается ${count} раз, ожидался 1`);
    text = text.replace(from, to); note(`объяснение: ${to}`);
  }
  JSON.parse(text);
  if (text !== before) { touched.add('theory_why.json'); if (!CHECK) writeReplacing(file, text); }
}

// 4. словарь: привязка слова к фразам
{
  const { text, data } = readCanonical('glossary.json');
  for (const [num, spec] of Object.entries(PHRASES)) {
    const oldEntry = data.lemmas.find((e) => e.lemma === spec.oldWord);
    const newEntry = data.lemmas.find((e) => e.lemma === spec.newWord);
    if (!oldEntry || !newEntry) throw new Error(`${LOG} словарь: нет слова ${spec.oldWord} или ${spec.newWord}`);
    if (newEntry.firstLesson > Number(num.slice(0, 2))) throw new Error(`${LOG} словарь: ${spec.newWord} ещё не пройдено к уроку ${num}`);
    if (oldEntry.phraseIds.includes(ID(num))) { oldEntry.phraseIds = oldEntry.phraseIds.filter((x) => x !== ID(num)); note(`словарь: ${spec.oldWord} больше не ссылается на ${num}`); }
    if (!newEntry.phraseIds.includes(ID(num))) { newEntry.phraseIds = [...newEntry.phraseIds, ID(num)].sort(); note(`словарь: ${spec.newWord} ссылается на ${num}`); }
  }
  finish('glossary.json', text, data);
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
