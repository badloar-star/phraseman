const fs = require('fs');
const data = JSON.parse(fs.readFileSync('docs/reports/_phrases_extracted.json', 'utf8'));

const issues = [];

function add(p, type, desc, suggestion) {
  issues.push({ id: p.id, lesson: p.lesson, file: p.file, line: p.line, type, desc, suggestion, en: p.english, ru: p.russian, uk: p.ukrainian });
}

// Calques and non-Ukrainian words (red-flag list)
const russianisms_in_uk = [
  // word: explanation
  { re: /\bще\b/i, hint: '"ще" used; OK in UK, but check context' }, // not actually wrong
];

// Strong red flags — Russian words / non-existent in Ukrainian or wrong-norm spellings
const ukRussianisms = [
  { word: 'этот', hint: 'русское слово в укр.' },
  { word: 'эта', hint: 'русское слово в укр.' },
  { word: 'это', hint: 'русское слово в укр.' },
  { word: 'эти', hint: 'русское слово в укр.' },
  { word: 'который', hint: 'русское слово в укр.' },
  { word: 'которая', hint: 'русское слово в укр.' },
  { word: 'которое', hint: 'русское слово в укр.' },
  { word: 'которые', hint: 'русское слово в укр.' },
  { word: 'если', hint: 'русское слово в укр.' },
  { word: 'когда', hint: 'русское слово, в укр. "коли"' },
  { word: 'тоже', hint: 'русское слово, в укр. "теж" / "також"' },
  { word: 'сейчас', hint: 'русизм, в укр. "зараз" / "тепер"' },
  { word: 'всегда', hint: 'русизм, в укр. "завжди"' },
  { word: 'никогда', hint: 'русизм, в укр. "ніколи"' },
  { word: 'обязательно', hint: 'русизм, в укр. "обовʼязково"' },
];

// Russian Ukrainian-ism markers (not real UK)
const ukSpellRedFlags = [
  // 'и' начало слова (часто русизм/опечатка)
  { re: /\bи\s/, hint: 'союз "и" — в укр. "і" / "та"' },
];

// Look for common calque issues per phrase
for (const p of data) {
  const uk = p.ukrainian || '';
  const ru = p.russian || '';
  const en = p.english || '';
  const ukLow = uk.toLowerCase();
  const ruLow = ru.toLowerCase();

  // 1. Detect Russian words in Ukrainian text
  for (const rf of ukRussianisms) {
    const re = new RegExp('\\b' + rf.word + '\\b', 'i');
    if (re.test(uk)) {
      add(p, 'calque-uk', `В укр. встречается русское слово "${rf.word}". ${rf.hint}`, '');
    }
  }

  // 2. Союз "и" (русский) внутри украинской фразы
  if (/(^|[^а-яіїєґА-ЯІЇЄҐa-zA-Z'])и([\s,])/.test(uk)) {
    // Some UK phrases start with "и"? Rare. Mark for review.
    // But pattern "слово и слово" в укр = должно быть "і"/"та"
    if (/\s+и\s+/.test(' ' + uk + ' ')) {
      add(p, 'calque-uk', 'В укр. встречается русский союз "и" вместо "і"/"та".', 'заменить на "і" или "та"');
    }
  }

  // 3. Look for direct Russian forms inside UK like "ужин", "ребёнок"
  // (less reliable - skipping)

  // 4. Detect missing apostrophe in Ukrainian (e.g., "пять" instead of "пʼять", "имя" instead of "імʼя")
  // Actually let's flag only specific common ones:
  const requireApostrophe = ['пять','девять','семья','имя','объявление','разъезд','компьютер'];
  for (const w of requireApostrophe) {
    const re = new RegExp('\\b' + w + '\\b', 'i');
    if (re.test(uk)) {
      add(p, 'calque-uk', `В укр. слово "${w}" — кажется, без апострофа или вообще не укр.`, 'проверить написание');
    }
  }

  // 5. Punctuation: ё — русская буква, в укр. недопустима
  if (/[ёЁ]/.test(uk)) {
    add(p, 'calque-uk', 'В укр. встречается буква "ё" — русская, в укр. отсутствует.', 'заменить');
  }
  if (/[ыЫъЪэЭ]/.test(uk)) {
    add(p, 'calque-uk', 'В укр. встречается буква "ы/ъ/э" — русская, в укр. отсутствует.', 'заменить');
  }

  // 6. Common ambiguity: present-tense in EN vs past in RU/UK or vice versa
  // skip — too noisy

  // 7. Generic "you" — does RU=Ты vs UK=Ви? Check mismatch
  const ruYouTy = /\b(ты|тебе|тебя|твой|твоя|твое|твои|твоё|тебя|тобой|твоего|твою|твоих|твоему|твоей)\b/i.test(ru);
  const ruYouVy = /\b(вы|вам|вас|ваш|ваша|ваше|ваши|вами|вашего|вашу|вашей|ваших)\b/i.test(ru);
  const ukYouTy = /\b(ти|тобі|тебе|твій|твоя|твоє|твої|тобою|твого|твою|твоїх|твоєму|твоїй)\b/i.test(uk);
  const ukYouVy = /\b(ви|вам|вас|ваш|ваша|ваше|ваші|вами|вашого|вашу|вашої|ваших)\b/i.test(uk);
  if (ruYouTy && ukYouVy && !ruYouVy) {
    add(p, 'mismatch-ru-uk', 'RU использует "ты", UK использует "ви" — несогласованность обращения.', 'привести к одному регистру');
  }
  if (ruYouVy && ukYouTy && !ruYouTy) {
    add(p, 'mismatch-ru-uk', 'RU использует "вы", UK использует "ти" — несогласованность обращения.', 'привести к одному регистру');
  }

  // 8. Detect when EN is question (ends in ?) but RU/UK doesn't (or vice versa)
  const enQ = /\?\s*$/.test(en.trim());
  const ruQ = /\?\s*$/.test(ru.trim());
  const ukQ = /\?\s*$/.test(uk.trim());
  if (enQ !== ruQ || enQ !== ukQ) {
    add(p, 'translation-error', `Несоответствие пунктуации: EN${enQ?'?':'.'} RU${ruQ?'?':'.'} UK${ukQ?'?':'.'}`, 'привести к единому стилю');
  }

  // 9. Generic ambiguity flags: "идет/идёт" в RU мог быть "is going" / "is walking" / "goes"
  // Skip — many false positives

  // 10. Ambiguity: RU "должен" / UK "повинен" can be must/should/have to (вариативность модальности)
  if (/\bmust\b/i.test(en) && /\bдолжн/.test(ruLow)) {
    // potentially OK — flag only if EN distractors include should/have/has
    // We'll check for "should" presence in same word's distractors elsewhere
  }

  // 11. Ambiguity: EN "have to / has to" vs "must" — looks identical to RU "должен"
  // 12. Ambiguity: EN "going to" vs "will" — both translate to RU будущее
  // We'll flag in heuristic-only mode
  if (/\bwill\b/i.test(en) && /\bбуду|будешь|будет|будем|будете|будут\b/i.test(ru)) {
    // OK — fine
  }
}

// Also produce all phrases sorted by lesson
console.log('Total candidate issues:', issues.length);
const byType = {};
for (const i of issues) byType[i.type] = (byType[i.type] || 0) + 1;
console.log('By type:', byType);

fs.writeFileSync('docs/reports/_heuristic_issues.json', JSON.stringify(issues, null, 2));
