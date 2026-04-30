// High-precision linguistic audit of RU/UK translations vs English in lesson_data files.
// Strategy: only flag with HIGH CONFIDENCE. False positives are worse than false negatives here.
// Outputs _audit_issues.json with prioritized issues for human review.

const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '_phrases_full.json'), 'utf8'));

const issues = [];

function add(p, type, problem, suggest, severity = 2) {
  issues.push({
    id: p.id, lesson: p.lesson, file: p.file, line: p.line,
    english: p.english, russian: p.russian, ukrainian: p.ukrainian,
    type, problem, suggest, severity,
  });
}

// We treat each phrase's text in JS string form. Note: \b in JS regex doesn't work for Cyrillic.
// Use explicit non-letter delimiters via custom helper.
function mkRe(word, flags = 'i') {
  // Word delimited by start, end, or any non-Cyrillic-letter
  // letters set: a-zа-яёіїєґА-ЯЁІЇЄҐ
  const pre = '(^|[^a-zа-яёіїєґА-ЯЁІЇЄҐ\'’])';
  const post = '($|[^a-zа-яёіїєґА-ЯЁІЇЄҐ\'’])';
  return new RegExp(pre + word + post, flags);
}

function has(text, word) {
  return mkRe(word).test(text);
}
function hasAny(text, words) {
  return words.some(w => has(text, w));
}

// 1. Forbidden Russian-only letters in Ukrainian text — VERY HIGH CONFIDENCE
const UK_FORBIDDEN_LETTERS = /[ыёэъ]/i;

function checkUkForbiddenLetters(p) {
  const m = p.ukrainian.match(UK_FORBIDDEN_LETTERS);
  if (m) {
    add(p, 'calque',
      `Літера "${m[0]}", якої нема в укр. абетці`,
      `Перекласти на нормальну українську літеру (и/є/е/—)`, 3);
  }
}

// 2. Hard Russian-only words inside Ukrainian text — high confidence.
// CRITICAL: Many Slavic words are shared. Only flag forms that are unambiguously Russian.
// Notes:
//  - "той/та/те/ті/того/тої/тих" — valid UK demonstratives ("that"). DO NOT FLAG.
//  - "цей/ця/це/ці" — valid UK ("this"). DO NOT FLAG.
//  - "сказали/говорить/побачили" etc. — valid UK verb forms.
//  - "часто" — both. "вчора","завтра" — UK.
//  - Russian-only orthographic markers: ы/ё/э/ъ already handled above.
const HARD_RU_WORDS = [
  // Russian-only demonstratives (no UK equivalent in this form)
  'этот','эта','это','эти','этого','этой','этом','этими','этих','эту',
  // Russian-only adverbs/conjunctions
  'сейчас','очень','всегда','никогда','тогда',
  'почему','потому','если','чтобы','чтоб',
  'тоже','также','уже','еще','здесь','сюда','туда','куда','откуда',
  'много','мало','несколько',
  // Russian-only function words / intensifiers
  'нельзя','некогда','нечего',
  // Russian-specific verb forms (UK uses different roots/endings):
  'хочет','хотел','хотела','хотели','хочу','хочешь','хотим','хотите','хотят',
  'был','была','было','были','будет','будут','буду','будем','будешь','будете',
  // Specific RU-only adjectives/nouns:
  'хороший','хорошая','хорошее','хорошие',
  'плохой','плохая','плохое','плохие',
  'интересный','интересная','интересное','интересные',
  'вкусный','вкусная','вкусное','вкусные',
  'трудный','трудная','трудное','трудные',
  'большой','большая','большое','большие','больше',
  'маленький','маленькая','маленькое','маленькие',
  'красивый','красивая','красивое','красивые',
  'дешевый','дешевая','дешевое','дешевые',
  // Common nouns that differ root from UK:
  'дверь','двери','окно','окна','комната','комнаты','деньги',
  // Verbs root-different in UK:
  'говорю','говоришь','говорит','говорим','говорите','говорят',  // UK is also говорю/говориш... actually говорит is also UK
  // Skip говорю/говорите — overlap.
  // 'делать','делает','делал','делала','делали','делаю','делаешь','делаете','делаем',  // overlap with UK дієслова — skip
  // 'видеть','видит','видел','видела','видели','вижу',  // UK has бачити but видеть NOT in UK
  'видеть','видишь','видят','видим','видите','видел','видела','видели','видишь','вижу',
  // Russian temporal/expressions:
  'сегодня',
  // ru "что" vs uk "що" — definitively Russian
  'что','чего','чему','чем',
  // ru "потому что" — uk "тому що"
];
// Keep simpler list. Skip overlap dangers.
const SAFE_RU_ONLY = [
  'этот','эта','это','эти','этого','этой','этом','этими','этих','эту',
  'сейчас','очень','всегда','никогда','тогда',
  'почему','если','чтобы','чтоб','тоже','также','уже','еще','здесь','сюда','туда','откуда',
  'нельзя',
  // Verbs unique to RU (UK has different roots/endings):
  'хочет','хотел','хотела','хотели','хочешь','хотим','хотите','хотят',
  'был','была','было','были','будет','будут','буду','будем','будешь','будете',
  // RU-only adjective endings/roots:
  'плохой','плохая','плохое','плохие',
  'интересный','интересная','интересное','интересные',
  'вкусный','вкусная','вкусное','вкусные',
  'трудный','трудная','трудное','трудные',
  'большой','большая','большое','большие',
  'красивый','красивая','красивое','красивые',
  'дешевый','дешевая','дешевое','дешевые',
  // RU-only nouns:
  'дверь','двери','окно','окна','комната','комнаты','деньги',
  // RU verb (UK = бачити):
  'видеть','видит','видишь','видят','вижу','видела','видели','видел',
  // RU temporal/intensifier:
  'сегодня',
  // RU-only function words:
  'что','чего','чему','чем',
];
const HARD_RU_FILTERED = SAFE_RU_ONLY.map(w => ({w, re: mkRe(w)}));

function checkHardRuInUk(p) {
  for (const {w, re} of HARD_RU_FILTERED) {
    if (re.test(p.ukrainian)) {
      add(p, 'calque',
        `Російське слово в укр.тексті: "${w}"`,
        `Замінити українським відповідником`, 3);
      return; // one issue per phrase to avoid noise
    }
  }
}

// 3. Backslash before apostrophe — display issue (orthography)
function checkApostrophe(p) {
  if (/\\'/.test(p.ukrainian)) {
    add(p, 'orthography',
      `Бек-слеш перед апострофом у тексті: "${p.ukrainian}"`,
      `Замінити \\' на ' (правильний апостроф)`, 2);
  }
}

// 4. Number mismatch RU vs UK — high confidence
function checkNumbersMismatch(p) {
  const ruN = (p.russian.match(/\d+/g) || []).join(',');
  const ukN = (p.ukrainian.match(/\d+/g) || []).join(',');
  if (ruN !== ukN) {
    add(p, 'mismatch',
      `Різні числа в RU(${ruN || '—'}) та UK(${ukN || '—'})`,
      `Звірити числа`, 3);
  }
}

// 5. Question-mark asymmetry (English question, RU/UK statement or vice versa) — high confidence
function checkQuestionAsymmetry(p) {
  const enQ = /\?/.test(p.english);
  const ruQ = /\?/.test(p.russian);
  const ukQ = /\?/.test(p.ukrainian);
  // Only flag if EN and RU disagree, AND EN and UK also disagree (i.e., one side wrong both translations)
  // OR RU and UK disagree.
  if (ruQ !== ukQ) {
    add(p, 'mismatch',
      `Знак "?" в RU(${ruQ}) ≠ UK(${ukQ})`,
      `Узгодити пунктуацію`, 3);
  }
  if (enQ !== ruQ && enQ !== ukQ) {
    add(p, 'mismatch',
      `EN ${enQ ? 'питання' : 'твердження'}, але RU/UK не збігаються`,
      `Узгодити пунктуацію`, 2);
  }
}

// 6. Familiar/formal pronoun mismatch RU vs UK — high confidence
function checkPronounRuUk(p) {
  const ruFamil = hasAny(p.russian, ['ты','тебя','тебе','тобой','твой','твоя','твоё','твои','твоего','твоей','твоих']);
  const ruFormal = hasAny(p.russian, ['вы','вас','вам','вами','ваш','ваша','ваше','ваши','вашего','вашей','ваших']);
  const ukFamil = hasAny(p.ukrainian, ['ти','тебе','тобі','тобою','твій','твоя','твоє','твої','твого','твоєї','твоїх']);
  const ukFormal = hasAny(p.ukrainian, ['ви','вас','вам','вами','ваш','ваша','ваше','ваші','вашого','вашої','ваших']);
  if (ruFamil && ukFormal && !ruFormal && !ukFamil) {
    add(p, 'mismatch',
      `RU "ты" (нефор.) vs UK "ви" (форм.)`,
      `Узгодити: або "ты"/"ти", або "вы"/"ви"`, 3);
  }
  if (ruFormal && ukFamil && !ruFamil && !ukFormal) {
    add(p, 'mismatch',
      `RU "вы" (форм.) vs UK "ти" (нефор.)`,
      `Узгодити: або "ты"/"ти", або "вы"/"ви"`, 3);
  }
}

// 7. Past-tense gender mismatch (rare but real)
function checkGenderMismatch(p) {
  const masc = ['был','пришёл','сказал','купил','сделал','увидел','нашёл','потерял','пошёл','спросил','ответил','работал','любил','жил','забыл'];
  const fem  = ['была','пришла','сказала','купила','сделала','увидела','нашла','потеряла','пошла','спросила','ответила','работала','любила','жила','забыла'];
  const ukMasc = ['був','прийшов','сказав','купив','зробив','побачив','знайшов','загубив','пішов','спитав','відповів','працював','любив','жив','забув'];
  const ukFem  = ['була','прийшла','сказала','купила','зробила','побачила','знайшла','загубила','пішла','спитала','відповіла','працювала','любила','жила','забула'];
  const ruM = hasAny(p.russian, masc);
  const ruF = hasAny(p.russian, fem);
  const ukM = hasAny(p.ukrainian, ukMasc);
  const ukF = hasAny(p.ukrainian, ukFem);
  if (ruM && ukF && !ruF && !ukM) add(p, 'mismatch', `Рід дієслова: RU чол. vs UK жін.`, `Узгодити рід`, 3);
  if (ruF && ukM && !ruM && !ukF) add(p, 'mismatch', `Рід дієслова: RU жін. vs UK чол.`, `Узгодити рід`, 3);
}

// 8. Subject pronoun number mismatch (singular vs plural)
function checkSubjectPlurality(p) {
  // EN subject heuristic (start of sentence)
  const en = p.english.trim().toLowerCase();
  const enSubject =
    /^(i)\b/.test(en) ? 'I' :
    /^(you)\b/.test(en) ? 'you' :
    /^(he)\b/.test(en) ? 'he' :
    /^(she)\b/.test(en) ? 'she' :
    /^(it)\b/.test(en) ? 'it' :
    /^(we)\b/.test(en) ? 'we' :
    /^(they)\b/.test(en) ? 'they' : null;
  if (!enSubject) return;
  const map = {
    'I':   { ru: ['я'],     uk: ['я'] },
    'we':  { ru: ['мы'],    uk: ['ми'] },
    'he':  { ru: ['он'],    uk: ['він'] },
    'she': { ru: ['она'],   uk: ['вона'] },
    'they':{ ru: ['они'],   uk: ['вони'] },
  };
  const exp = map[enSubject];
  if (!exp) return;
  const ruOk = hasAny(p.russian, exp.ru) || /я не /i.test(p.russian) || /я /i.test(p.russian.slice(0,5));
  const ukOk = hasAny(p.ukrainian, exp.uk) || /я /i.test(p.ukrainian.slice(0,5));
  // Skip — too noisy for now (Russian/UK can be subject-dropped). No check.
}

// 9. Major length disparity — flag only egregious cases
function contentTokens(s) {
  return s.toLowerCase()
    .replace(/[.,!?;:()\[\]"'’«»\-–—]/g, ' ')
    .split(/\s+/).filter(Boolean);
}
function checkLengthDisparity(p) {
  const ru = contentTokens(p.russian).length;
  const uk = contentTokens(p.ukrainian).length;
  if (Math.abs(ru - uk) >= 3) {
    add(p, 'mismatch',
      `Сильна різниця кількості слів: RU=${ru}, UK=${uk}`,
      `Перекласти однаково повно`, 2);
  }
}

// 10. RU/UK semantic divergence: check for words known to differ that should match in meaning.
// E.g., RU "получим прибыль" — UK "отримаємо новий прибуток" (UK adds "новий")
// Detect by: count of adjectives differs significantly, or specific extra adjective in UK not in RU.
// Implement as: check whether UK has "новий"/"новій"/"нового" but RU doesn't have "новый"/"нового"/"новой"...
// Disabled — too noisy. RU/UK adjectives have multiple valid translations
// (RU "хороший" → UK "добрий" or "гарний"; both valid). Cannot mechanically detect mismatches.
function checkExtraAdjectiveDivergence(p) { /* disabled */ }

// 11. Negation mismatch: english has "not" but RU/UK lacks "не" (using mkRe)
function checkNegation(p) {
  // English negation markers (be conservative: "no" alone matches negative answers/articles too)
  const enNeg = /\b(not|n['’]t|cannot|never|nobody|nothing|nowhere)\b/i.test(p.english);
  const ruNeg = has(p.russian, 'не') || has(p.russian, 'нет') || has(p.russian, 'нельзя') || has(p.russian, 'никогда') || has(p.russian, 'нечего') || has(p.russian, 'никто') || has(p.russian, 'ничего');
  const ukNeg = has(p.ukrainian, 'не') || has(p.ukrainian, 'немає') || has(p.ukrainian, 'нема') || has(p.ukrainian, 'ніколи') || has(p.ukrainian, 'нічого') || has(p.ukrainian, 'ніхто') || has(p.ukrainian, 'ні');
  if (enNeg && !ruNeg) add(p, 'mismatch', `EN заперечення, RU без "не"/"нет"`, `Перевірити заперечення`, 3);
  if (enNeg && !ukNeg) add(p, 'mismatch', `EN заперечення, UK без "не"/"немає"`, `Перевірити заперечення`, 3);
  if (!enNeg && ruNeg && ukNeg) {
    // Both translations have negation but English doesn't — likely rhetorical question, but suspicious
    // Skip as noisy
  }
}

// 12. Continuous tense ambiguity: english "am/is/are/was/were ___ing" — flag if RU/UK lack any time marker.
// This is not a "bug" but "ambiguity for builder". Flag at low severity.
function checkContinuousAmbiguity(p) {
  const cont = /\b(am|is|are|was|were|be|been|being)\s+\w+ing\b/i.test(p.english);
  if (!cont) return;
  const present = /\b(am|is|are)\s+\w+ing\b/i.test(p.english);
  const past = /\b(was|were)\s+\w+ing\b/i.test(p.english);
  // Time markers RU/UK
  const tmRu = /(сейчас|прямо сейчас|в этот момент|в данный момент|сегодня в|вчера в|в \d|с \d|во время|когда|пока|весь|всё|целый|долго|часами|минутами|вечер|утро|ночь|днём|в полдень|в полночь|круглые сутки|целый день)/i.test(p.russian);
  const tmUk = /(зараз|прямо зараз|у цей момент|в даний момент|сьогодні о|вчора о|о \d|з \d|під час|коли|поки|весь|увесь|цілий|довго|годинами|хвилинами|вечір|ранок|ніч|вдень|опівдні|опівночі|цілий день)/i.test(p.ukrainian);
  // For Past Continuous, time markers are usually present (lessons 25+)
  // For Present Continuous, often no time marker — this is the ambiguity case.
  if (present && !tmRu && !tmUk) {
    add(p, 'ambiguity',
      `EN Present Continuous, у RU/UK нема маркера часу — гравець може зібрати Present Simple`,
      `Додати "сейчас"/"зараз" або "прямо сейчас"/"прямо зараз"`, 2);
  }
}

// 14. this/that demonstrative mismatch with RU/UK
// Conventions: this → этот/эта/это/эти, цей/ця/це/ці
//              that → тот/та/то/те,    той/та/те/ті
// If english correct words have "this" but RU uses "тот"-family — builder may build "that" and fail.
function checkDemonstrativeMismatch(p) {
  const correct = (p.correct || []).map(w => w.toLowerCase().replace(/[^a-z']/g, ''));
  const hasThis = correct.includes('this');
  const hasThat = correct.includes('that');
  const hasThese = correct.includes('these');
  const hasThose = correct.includes('those');
  if (!hasThis && !hasThat && !hasThese && !hasThose) return;

  // Strip indefinite pronouns ending in "-то" so regex doesn't false-match.
  // Use plain word-substring patterns (no Cyrillic word-boundary in JS regex).
  const ruClean = p.russian
    .replace(/(кто|что|где|куда|когда|почему|как|чей|какой|какая|какое|какие|чему|чем|кем|кому)-то/giu, '___')
    .replace(/кое-(кто|что|где|какой)/giu, '___');
  const ukClean = p.ukrainian
    .replace(/(хто|що|де|куди|коли|чому|як|чий)-небудь/giu, '___')
    .replace(/(будь)-(хто|що|де|куди|коли|чому|як)/giu, '___');

  // RU/UK demonstrative groups
  const ruThisAny = hasAny(ruClean, ['этот','эта','это','эти','этого','этой','этом','этими','этих','эту']);
  const ruThatAny = hasAny(ruClean, ['тот','та','то','те','того','той','том','теми','тех','ту']);
  const ukThisAny = hasAny(ukClean, ['цей','ця','це','ці','цього','цієї','цьому','цими','цих','цю']);
  const ukThatAny = hasAny(ukClean, ['той','та','те','ті','того','тієї','тому','тими','тих','ту','тієї','тій']);

  // Case: EN has "this" only (no "that"); RU/UK uses "тот/той" — bad
  if (hasThis && !hasThat && !hasThese && !hasThose) {
    if (ruThatAny && !ruThisAny) {
      add(p, 'mismatch', `EN "this", але RU має "тот/та/те"`, `Замінити RU "тот..." → "этот..."`, 3);
    }
    if (ukThatAny && !ukThisAny) {
      add(p, 'mismatch', `EN "this", але UK має "той/та/те"`, `Замінити UK "той..." → "цей..."`, 3);
    }
  }
  // EN has "that" only — RU/UK should use "тот/той"
  if (hasThat && !hasThis && !hasThese && !hasThose) {
    if (ruThisAny && !ruThatAny) {
      add(p, 'mismatch', `EN "that", але RU має "этот/эта/это"`, `Замінити RU "этот..." → "тот..."`, 3);
    }
    if (ukThisAny && !ukThatAny) {
      add(p, 'mismatch', `EN "that", але UK має "цей/ця/це"`, `Замінити UK "цей..." → "той..."`, 3);
    }
  }
  // these/those plural distinction
  if (hasThese && !hasThose && !hasThis && !hasThat) {
    if (ruThatAny && !ruThisAny) {
      add(p, 'mismatch', `EN "these", але RU має "те/тех/тем"`, `Замінити RU "те..." → "эти..."`, 3);
    }
    if (ukThatAny && !ukThisAny) {
      add(p, 'mismatch', `EN "these", але UK має "ті/тих"`, `Замінити UK "ті..." → "ці..."`, 3);
    }
  }
  if (hasThose && !hasThese && !hasThis && !hasThat) {
    if (ruThisAny && !ruThatAny) {
      add(p, 'mismatch', `EN "those", але RU має "эти..."`, `Замінити RU "эти..." → "те..."`, 3);
    }
    if (ukThisAny && !ukThatAny) {
      add(p, 'mismatch', `EN "those", але UK має "ці..."`, `Замінити UK "ці..." → "ті..."`, 3);
    }
  }
}

// 15. Pronoun "ты"/"ти" vs "вы"/"ви" ambiguity in builder
// English "you" can map to either ты/тебя/твой OR вы/вас/ваш.
// If correct[] specifies words like "your" and RU/UK have both forms — flag.
// Actually we already check RU/UK mismatch in checkPronounRuUk.

// 13. Tense mismatch — DISABLED: false positive rate too high.
// Russian past masculine in -с/-к/-г (принёс, привёз, помог) doesn't match -л heuristic.
// English past forms like "lost"/"found" are also adjectives ("found money", "lost keys").
function checkPastTenseMismatch(p) { /* disabled */ }

// Run
for (const p of data) {
  checkUkForbiddenLetters(p);
  checkHardRuInUk(p);
  checkApostrophe(p);
  checkNumbersMismatch(p);
  checkQuestionAsymmetry(p);
  checkPronounRuUk(p);
  checkGenderMismatch(p);
  checkExtraAdjectiveDivergence(p);
  checkLengthDisparity(p);
  checkNegation(p);
  checkContinuousAmbiguity(p);
  checkPastTenseMismatch(p);
  checkDemonstrativeMismatch(p);
  checkAuxiliaryQuestionAmbiguity(p);
  checkExtraWordInUk(p);
}

// 16. Auxiliary question ambiguity: english correct[0] = Did/Do/Does/Will/Can/Should/etc.
//     If RU/UK is statement word order with just `?`, user may build statement form.
// Only flag the harder cases — perfect tenses (Have/Has/Had ___ + V3) since RU/UK don't distinguish perfect from past/present.
function checkAuxiliaryQuestionAmbiguity(p) {
  const correct = p.correct || [];
  if (correct.length < 1) return;
  const first = String(correct[0] || '').toLowerCase().replace(/[^a-z']/g, '');
  // Only Have/Has/Had — perfect-tense ambiguity is the most painful for builder
  const auxes = ['have','has','had'];
  if (!auxes.includes(first)) return;

  const enQ = /\?/.test(p.english);
  if (!enQ) return;

  // Russian/UK must use clear question marker — Чи/Разве/Неужели or interrogative pronoun
  const ruQuestionWord = /^\s*(кто|что|где|когда|зачем|почему|как|какой|какая|какое|какие|сколько|чей|разве|неужели)/i.test(p.russian);
  const ukQuestionWord = /^\s*(хто|що|де|коли|навіщо|чому|як|який|яка|яке|які|скільки|чий|чи)/i.test(p.ukrainian);

  if (!ruQuestionWord) {
    add(p, 'ambiguity',
      `EN — Present/Past Perfect question (Have/Has/Had), RU без маркера питання`,
      `Додати "Разве..."/"Неужели..." або переробити на ствердження`, 2);
  }
  if (!ukQuestionWord) {
    add(p, 'ambiguity',
      `EN — Present/Past Perfect question (Have/Has/Had), UK без "Чи..."`,
      `Додати "Чи..." на початок`, 2);
  }
}

// 17. Extra word in UK that doesn't appear in RU (calque "тот самый" → "той самий" inserted)
function checkExtraWordInUk(p) {
  // "той самий"/"та сама" — if RU doesn't have "тот самый"/"та самая" — extra word
  const ukExtraSamy = /\b(той самий|та сама|те саме|ті самі|тому самому|тій самій|тих самих|той же|та ж|те ж)\b/iu.test(p.ukrainian);
  const ruSamy = /\b(тот самый|та самая|то самое|те самые|том самом|той самой|тех самых|тот же|та же|то же)\b/iu.test(p.russian);
  if (ukExtraSamy && !ruSamy) {
    add(p, 'mismatch', `UK має "той самий", але RU не має "тот самый"`, `Привести у відповідність`, 2);
  }
}

// Sort by severity desc, then lesson, then id
issues.sort((a, b) => {
  if (b.severity !== a.severity) return b.severity - a.severity;
  if (a.lesson !== b.lesson) return a.lesson - b.lesson;
  return a.id.localeCompare(b.id);
});

fs.writeFileSync(path.join(__dirname, '_audit_issues.json'), JSON.stringify(issues, null, 2), 'utf8');

console.error(`Total issues: ${issues.length}`);
const byType = {}; for (const i of issues) byType[i.type] = (byType[i.type] || 0) + 1;
console.error('By type:', JSON.stringify(byType));
const bySev = {}; for (const i of issues) bySev[i.severity] = (bySev[i.severity] || 0) + 1;
console.error('By severity:', JSON.stringify(bySev));
const byLesson = {}; for (const i of issues) byLesson[i.lesson] = (byLesson[i.lesson] || 0) + 1;
console.error('By lesson:', JSON.stringify(byLesson));
