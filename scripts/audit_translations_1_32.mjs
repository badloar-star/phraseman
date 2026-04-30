// Семантический аудит переводов уроков 1-32.
// Цель — найти неочевидные ошибки перевода:
//   1) Англицизмы / транслитерации в RU/UK ("имейл", "кофешоп", "лайк" и т.п.).
//   2) Несоответствия числа single/plural между EN и RU/UK.
//   3) Узкие/неточные эквиваленты типа "insurance" → "страховка" вместо "travel insurance".
//   4) Подозрительные термины (false friends, омонимы).
//
// Запуск: node scripts/audit_translations_1_32.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadTsModule(absPath) {
  const code = fs.readFileSync(absPath, 'utf8');
  const out = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: absPath,
  });
  const module = { exports: {} };
  const requireShim = (rel) => {
    if (rel === './lesson_data_types' || rel.endsWith('lesson_data_types')) return {};
    if (rel.startsWith('./')) {
      const next = path.resolve(path.dirname(absPath), rel + '.ts');
      if (fs.existsSync(next)) return loadTsModule(next);
    }
    return {};
  };
  // eslint-disable-next-line no-new-func
  const fn = new Function('module', 'exports', 'require', out.outputText);
  fn(module, module.exports, requireShim);
  return module.exports;
}

const ALL = loadTsModule(path.join(ROOT, 'app', 'lesson_data_all.ts'));
const LESSON_DATA = ALL.LESSON_DATA;

// ── Извлекаем плоский массив фраз
const flat = [];
for (let id = 1; id <= 32; id += 1) {
  const lesson = LESSON_DATA[id];
  if (!lesson) continue;
  for (const p of lesson.phrases || []) {
    flat.push({
      lesson: id,
      id: p.id,
      en: String(p.english || ''),
      ru: String(p.russian || ''),
      uk: String(p.ukrainian || ''),
    });
  }
}

// Сохраняем «сырой» JSON — пригодится для ручного просмотра
const outDir = path.join(ROOT, 'docs', 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'lessons_translations_flat.json'),
  JSON.stringify(flat, null, 2),
  'utf8',
);

// ── Эвристики

const issues = [];
function add(kind, p, msg) {
  issues.push({ kind, lesson: p.lesson, id: p.id, en: p.en, ru: p.ru, uk: p.uk, msg });
}

// 1) Англицизмы / транслит в RU/UK
const ANGLO_PATTERNS = [
  { rx: /\bимейл/i,        why: '«имейл» → «электронная почта/почта/email»' },
  { rx: /\bе?мейл\b/i,     why: '«емейл/мейл» → «почта/email»' },
  { rx: /\bкофешоп/i,      why: '«кофешоп» → «кофейня»' },
  { rx: /\bкафешка/i,      why: '«кафешка» — разговорное, лучше «кафе»' },
  { rx: /\bлайк(а|и|ов)?\b/i, why: '«лайк» — жаргон; в учебном курсе лучше «отметка „Нравится"»' },
  { rx: /\bлайкнуть/i,     why: '«лайкнуть» — жаргон' },
  { rx: /\bзачекинить/i,   why: '«зачекинить» — жаргон' },
  { rx: /\bзашерить/i,     why: '«зашерить» — жаргон, «поделиться»' },
  { rx: /\bапдейт/i,       why: '«апдейт» → «обновление»' },
  { rx: /\bапгрейд/i,      why: '«апгрейд» → «обновление/улучшение»' },
  { rx: /\bдедлайн/i,      why: '«дедлайн» → «срок»' },
  { rx: /\bкэшбэк/i,       why: '«кэшбэк» — допустимо, но в учебнике лучше «возврат»' },
  { rx: /\bхайп/i,         why: '«хайп» — жаргон' },
  { rx: /\bокей\b/i,       why: '«окей» — лучше «хорошо/ладно»' },
  { rx: /\bЛОЛ\b/i,        why: '«ЛОЛ» — жаргон' },
  { rx: /\bпиар\b/i,       why: '«пиар» — допустимо, но лучше «реклама/продвижение»' },
  { rx: /\bлогин\b/i,      why: '«логин» → «имя пользователя»' },
  { rx: /\bлогиниться/i,   why: '«логиниться» → «входить»' },
  { rx: /\bбэкграунд/i,    why: '«бэкграунд» → «фон/опыт»' },
];

for (const p of flat) {
  for (const text of [p.ru, p.uk]) {
    for (const ap of ANGLO_PATTERNS) {
      if (ap.rx.test(text)) add('ANGLICISM', p, ap.why);
    }
  }
}

// 2) Number mismatch: явное "S/are/were/many/some" в EN с pluralным существительным,
//    но в RU/UK слово в единственном числе (или наоборот). Простая эвристика на маркерах.
const PLURAL_EN_MARKERS = /\b(are|were|have been|many|several|few|some|two|three|four|five|six|seven|eight|nine|ten|both|all|these|those|my|our|your|their)\s+([a-z]+s)\b/i;
// Слова-исключения, которые на -s в EN, но не множественное:
const EN_S_NOT_PLURAL = new Set([
  'news','physics','mathematics','politics','economics','ethics','statistics',
  'gymnastics','athletics','genetics','linguistics','series','species','means',
  'glasses','scissors','jeans','trousers','pants','clothes',
  'this','his','its','us','as','was','is','has','does','goes','says','class','glass','dress','grass',
  'business','address','process','progress','success','access','express','press','stress',
  'kids', // допустим
]);

const RU_PLURAL_HINTS = /\b(они|мы|вы|эти|те|многие|несколько|двое|трое|две|три|четыре|пять|шесть|семь|восемь|девять|десять|оба|обе|все|мои|твои|его|её|наши|ваши|их)\b/i;
const UK_PLURAL_HINTS = /\b(вони|ми|ви|ці|ті|багато|кілька|двоє|троє|дві|три|чотири|п['’]?ять|шість|сім|вісім|дев['’]?ять|десять|обоє|обидва|обидві|всі|мої|твої|його|її|наші|ваші|їх)\b/i;

// Просто считаем кол-во очевидно множественных существительных в EN и в RU/UK
function looksPluralEnNoun(word) {
  if (word.length < 4) return false;
  const lw = word.toLowerCase();
  if (EN_S_NOT_PLURAL.has(lw)) return false;
  return /[a-z]s$/.test(lw) && !/(ss|us|is)$/.test(lw);
}

for (const p of flat) {
  const enWords = p.en.replace(/[.,!?;:]/g, '').split(/\s+/);
  const enHasPluralNoun = enWords.some(looksPluralEnNoun) || PLURAL_EN_MARKERS.test(p.en);
  if (!enHasPluralNoun) continue;
  // Если EN явно про множ. число, а в RU/UK нет ни одного маркера множ. — подсветим.
  // Это лишь подсказка, не приговор.
  if (!/они|мы|вы|эти|те|многие|несколько|двое|трое|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|оба|обе|все|мои|твои|его|её|наши|ваши|их|[аеоиыя]ми\b|[аеоиыя]х\b|[ыи]\b/i.test(p.ru)) {
    add('NUMBER_HINT_RU', p, 'EN, похоже, во множественном числе — проверьте RU');
  }
  if (!/вони|ми|ви|ці|ті|багато|кілька|двоє|троє|дві|три|чотири|п['’]?ять|шість|сім|вісім|дев['’]?ять|десять|обоє|обидва|обидві|всі|мої|твої|його|її|наші|ваші|їх|[аеоиия]ми\b|[аеоиія]х\b|[иі]\b/i.test(p.uk)) {
    add('NUMBER_HINT_UK', p, 'EN, похоже, во множественном числе — проверьте UK');
  }
}

// 3) Узкие/контекстные термины — пары EN-слово + слабый перевод
const NARROW_PAIRS = [
  // {en: regex, ruBad: regex, why}
  { en: /\binsurance\b/i,      ruBad: /\bстрахов(ка|ание)\b/i, why: '"insurance" в путешествии — обычно "travel insurance" → "страховка для поездки"' },
  { en: /\binsurance\b/i,      ukBad: /\bстрахуванн[яі]\b/i,    why: '"insurance" в подорожі — зазвичай "страхування для поїздки"' },
  { en: /\bemail\b/i,          ruBad: /\b(имейл|емейл|мейл)\b/i, why: '"email" → "почта/электронная почта"' },
  { en: /\bemail\b/i,          ukBad: /\b(імейл|емейл|мейл)\b/i, why: '"email" → "пошта/електронна пошта"' },
  { en: /\bphone\b/i,          ruBad: /\bфон\b/i,                why: '"phone" → "телефон", не "фон"' },
  { en: /\bdinner\b/i,         ruBad: /\bобед\b/i,               why: '"dinner" в современном англ. — "ужин", не "обед"' },
  { en: /\bdinner\b/i,         ukBad: /\bобід\b/i,               why: '"dinner" — "вечеря", не "обід"' },
  { en: /\blunch\b/i,          ruBad: /\bужин\b/i,               why: '"lunch" — "обед", не "ужин"' },
  { en: /\blunch\b/i,          ukBad: /\bвечеря\b/i,             why: '"lunch" — "обід", не "вечеря"' },
  { en: /\bsupper\b/i,         ruBad: /\bобед\b/i,               why: '"supper" — поздний ужин, не "обед"' },
  { en: /\bholiday(s)?\b/i,    ruBad: /\bпраздник/i,             why: '"holiday" в брит. — чаще "отпуск/каникулы"; "праздник" только если контекст про праздничный день' },
  { en: /\bvacation\b/i,       ruBad: /\bвакация/i,              why: '"vacation" → "отпуск/каникулы"' },
  { en: /\bcabinet\b/i,        ruBad: /\bкабинет\b/i,            why: '"cabinet" в EN — это "шкаф/тумба" (или политическое "кабинет министров"). Чаще НЕ "рабочий кабинет"' },
  { en: /\bsympathetic\b/i,    ruBad: /\bсимпатичн/i,            why: '"sympathetic" → "сочувствующий", а не "симпатичный"' },
  { en: /\bsympathy\b/i,       ruBad: /\bсимпати/i,              why: '"sympathy" → "сочувствие/соболезнование"' },
  { en: /\bactual\b/i,         ruBad: /\bактуальн/i,             why: '"actual" → "фактический/настоящий", а не "актуальный"' },
  { en: /\bactually\b/i,       ruBad: /\bактуально\b/i,          why: '"actually" → "на самом деле/вообще-то"' },
  { en: /\baccurate\b/i,       ruBad: /\bаккуратн/i,             why: '"accurate" → "точный", а не "аккуратный"' },
  { en: /\bfabric\b/i,         ruBad: /\bфабрик/i,               why: '"fabric" → "ткань", а не "фабрика" (factory)' },
  { en: /\bmagazine\b/i,       ruBad: /\bмагазин\b/i,            why: '"magazine" → "журнал", а не "магазин"' },
  { en: /\bfamily\b/i,         ruBad: /\bфамили/i,               why: '"family" → "семья", а не "фамилия"' },
  { en: /\bartist\b/i,         ruBad: /\bартист/i,               why: '"artist" → чаще "художник", а не "артист"' },
  { en: /\bchef\b/i,           ruBad: /\bшеф\b/i,                why: '"chef" → "шеф-повар", не просто "шеф"' },
  { en: /\bdecade\b/i,         ruBad: /\bдекад[ау]\b/i,          why: '"decade" → "десятилетие", не "декада"' },
  { en: /\bcomplexion\b/i,     ruBad: /\bкомплекци/i,            why: '"complexion" → "цвет лица", не "комплекция"' },
  { en: /\bintelligent\b/i,    ruBad: /\bинтеллигент/i,          why: '"intelligent" → "умный", не "интеллигентный"' },
  { en: /\bintelligence\b/i,   ruBad: /\bинтеллигентн/i,         why: '"intelligence" → "интеллект/разведка"' },
  { en: /\bsensible\b/i,       ruBad: /\bсенсибельн|чувствительн/i, why: '"sensible" → "разумный/здравомыслящий", не "чувствительный" (sensitive)' },
  { en: /\beventually\b/i,     ruBad: /\bэвентуально|возможно\b/i, why: '"eventually" → "в конце концов", не "возможно"' },
  { en: /\bcurrent\b/i,        ruBad: /\bкурант/i,               why: '"current" → "текущий"' },
  { en: /\bgenius\b/i,         ruBad: /\bгениус/i,               why: '"genius" → "гений"' },
  { en: /\bcomfortable\b/i,    ruBad: /\bкомфортабельн/i,        why: '"comfortable" → "удобный", не "комфортабельный" (это calque)' },
  { en: /\bsalad\b/i,          ruBad: /\bсалат\b/i,              why: 'OK для блюда, но "lettuce" ≠ "салат" — проверьте' },
  { en: /\bbiscuit(s)?\b/i,    ruBad: /\bбисквит/i,              why: '"biscuit" (BrE) → "печенье", не "бисквит" (sponge cake)' },
  { en: /\bcake\b/i,           ruBad: /\bкекс\b/i,               why: '"cake" → "торт/пирожное", "кекс" = cupcake' },
  { en: /\bclass(room)?\b/i,   ruBad: /\bкласс\b/i,              why: 'OK как "класс/группа"; для помещения — "класс/кабинет"' },
  { en: /\bschedule\b/i,       ruBad: /\bграфик\b/i,             why: '"schedule" → "расписание/график" — норм, проверьте контекст' },
  { en: /\bsmart\b/i,          ruBad: /\bсмарт\b/i,              why: '"smart" → "умный/смышлёный", не "смарт"' },
  { en: /\boffice\b/i,         ruBad: /\bофис\b/i,               why: 'OK, но "post office" → "почта", "doctor\'s office" → "кабинет"' },
  { en: /\bgarden\b/i,         ruBad: /\bгород\b/i,              why: 'опечатка? "garden" → "сад", "огород"; "город" — это city' },
  { en: /\binterview\b/i,      ruBad: /\bинтервью\b/i,           why: '"interview" чаще "собеседование", "интервью" — только для журналистики' },
  { en: /\bcareer\b/i,         ruBad: /\bкарьер\b/i,             why: '"career" → "карьера" (ж.р.), "карьер" — quarry' },
  { en: /\bjob\b/i,            ruBad: /\bджоб\b/i,               why: '"job" → "работа"' },
  { en: /\bweek-?end\b/i,      ruBad: /\bвыходной\b/i,           why: '"weekend" чаще множ. "выходные"; ед.ч. "выходной" = day off' },
  { en: /\bweek-?end\b/i,      ukBad: /\bвихідний\b/i,           why: '"weekend" чаще "вихідні"; ед.ч. "вихідний" = day off' },
];

for (const p of flat) {
  for (const np of NARROW_PAIRS) {
    if (!np.en.test(p.en)) continue;
    if (np.ruBad && np.ruBad.test(p.ru)) add('NARROW_RU', p, np.why);
    if (np.ukBad && np.ukBad.test(p.uk)) add('NARROW_UK', p, np.why);
  }
}

// 4) Простой поиск "ё/е" — устаревший «ё» в учебнике принят, отсутствие «ё» в спорных словах:
const E_YO_WORDS = /(всем(?!и)|жен[аы]|пер[её]рыв|сл[её]зы|щ[её]ки|т[её]тя|с[её]стры?)/i;
// (специально не подсвечиваем — много шума; пропустим)

// 5) Похожие EN→разные RU (рассинхрон): один и тот же EN-токен переводится по-разному
//    в разных уроках. Нормализуем по lowercase + punctuation strip.
const enToTranslations = new Map();
for (const p of flat) {
  const key = p.en.toLowerCase().replace(/[.,!?;:]+$/,'').trim();
  if (!enToTranslations.has(key)) enToTranslations.set(key, []);
  enToTranslations.get(key).push(p);
}
for (const [key, list] of enToTranslations) {
  if (list.length < 2) continue;
  const ruSet = new Set(list.map((x) => x.ru.toLowerCase().trim()));
  const ukSet = new Set(list.map((x) => x.uk.toLowerCase().trim()));
  if (ruSet.size > 1) {
    // Только если расхождение значимое
    add('CONSISTENCY_RU', list[0], `EN "${key}" имеет разные RU-переводы: ${[...ruSet].map(s=>'«'+s+'»').join(', ')} (см. ${list.map(x=>`L${x.lesson}/${x.id}`).join(', ')})`);
  }
  if (ukSet.size > 1) {
    add('CONSISTENCY_UK', list[0], `EN "${key}" имеет разные UK-переводы: ${[...ukSet].map(s=>'«'+s+'»').join(', ')} (см. ${list.map(x=>`L${x.lesson}/${x.id}`).join(', ')})`);
  }
}

// ── Отчёт
const byKind = {};
for (const it of issues) byKind[it.kind] = (byKind[it.kind] || 0) + 1;

const lines = [];
lines.push(`# Аудит переводов уроков 1-32 (${new Date().toISOString()})`);
lines.push('');
lines.push(`Всего фраз: ${flat.length}, найдено пометок: ${issues.length}`);
lines.push('');
lines.push('## Сводка по типам');
for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
  lines.push(`- **${k}**: ${n}`);
}
lines.push('');
lines.push('## Подробности (по типам)');

const byKindGroups = {};
for (const it of issues) {
  byKindGroups[it.kind] = byKindGroups[it.kind] || [];
  byKindGroups[it.kind].push(it);
}

for (const kind of Object.keys(byKindGroups)) {
  lines.push('');
  lines.push(`### ${kind} (${byKindGroups[kind].length})`);
  for (const it of byKindGroups[kind]) {
    lines.push(`- **L${it.lesson}** \`${it.id}\` — ${it.msg}`);
    lines.push(`  - EN: ${it.en}`);
    lines.push(`  - RU: ${it.ru}`);
    lines.push(`  - UK: ${it.uk}`);
  }
}

const reportMd = lines.join('\n');
fs.writeFileSync(path.join(outDir, 'lessons_translations_audit.md'), reportMd, 'utf8');
fs.writeFileSync(
  path.join(outDir, 'lessons_translations_audit.json'),
  JSON.stringify({ flat: flat.length, issues, byKind }, null, 2),
  'utf8',
);

console.log(`Готово. Фраз: ${flat.length}, пометок: ${issues.length}`);
console.log('Сводка по типам:', byKind);
console.log('→ docs/reports/lessons_translations_audit.md');
console.log('→ docs/reports/lessons_translations_audit.json');
console.log('→ docs/reports/lessons_translations_flat.json');
