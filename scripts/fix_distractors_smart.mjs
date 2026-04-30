// Умная замена выдуманных distractors на реальные английские слова, похожие на correct.
// Подход:
//  1. Если correct ∈ curated function-word list — используем других членов того же списка.
//  2. Иначе — пробуем регулярную морфологию (-s/-es/-ed/-ing) и фильтруем через словарь.
//  3. Fallback: ближайшие реальные слова по Levenshtein.
//
// Запуск:
//   node scripts/fix_distractors_smart.mjs           # dry-run, отчёт изменений
//   node scripts/fix_distractors_smart.mjs --apply   # применить к файлам lesson_data_*.ts
//
// Файлы изменяются в-place; перед запуском убедись, что коммит сделан.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const requireCJS = createRequire(import.meta.url);
const wordsArr = requireCJS('an-array-of-english-words');
const DICT = new Set(wordsArr);

const APPLY = process.argv.includes('--apply');

// ── Curated списки служебных слов ──────────────────────────────────────────
// Класс «pronoun_personal» — личные местоимения (subject + object)
const PRONOUN_PERSONAL = ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
// Притяжательные
const PRONOUN_POSSESSIVE = ['my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs'];
// Указательные
const DEMONSTRATIVE = ['this', 'that', 'these', 'those'];
// Возвратные
const REFLEXIVE = ['myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'yourselves', 'themselves'];
// Вопросительные / относительные
const WH_WORDS = ['who', 'whom', 'whose', 'what', 'which', 'where', 'when', 'why', 'how'];
// Артикли + детерминанты
const ARTICLE_DET = ['a', 'an', 'the', 'some', 'any', 'no', 'every', 'each', 'all', 'most', 'few', 'many', 'much', 'several'];
// Формы to be
const TO_BE = ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being'];
// Have-формы
const TO_HAVE = ['have', 'has', 'had', 'having'];
// Do-формы
const TO_DO = ['do', 'does', 'did', 'done', 'doing'];
// Модальные
const MODAL = ['can', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would', 'ought'];
// Базовые предлоги
const PREPOSITION = [
  'in', 'on', 'at', 'to', 'for', 'by', 'of', 'from', 'with', 'about',
  'into', 'onto', 'over', 'under', 'after', 'before', 'between', 'among',
  'against', 'during', 'since', 'until', 'across', 'through', 'around',
  'near', 'next', 'inside', 'outside', 'above', 'below', 'beside',
];
// Союзы
const CONJUNCTION = ['and', 'or', 'but', 'so', 'because', 'if', 'unless', 'while', 'when', 'although', 'though', 'since', 'as', 'than', 'whether', 'while'];
// Отрицания / частицы
const NEGATION = ['not', 'no', 'never', 'none', 'nothing', 'nobody', 'nowhere'];
// Неопределённые местоимения
const INDEFINITE = [
  'someone', 'somebody', 'something', 'somewhere',
  'anyone', 'anybody', 'anything', 'anywhere',
  'no one', 'nobody', 'nothing', 'nowhere',
  'everyone', 'everybody', 'everything', 'everywhere',
];
// Числительные количественные / порядковые
const CARDINAL = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'twenty', 'thirty', 'forty', 'fifty', 'hundred', 'thousand'];
const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'twentieth'];
// Вспомогательные часто-используемые наречия
const COMMON_ADVERB = [
  'very', 'really', 'quite', 'too', 'just', 'only', 'also', 'even', 'still', 'already',
  'always', 'never', 'often', 'sometimes', 'usually', 'rarely', 'seldom',
  'now', 'then', 'today', 'yesterday', 'tomorrow', 'soon', 'later', 'early', 'late',
  'here', 'there', 'everywhere', 'somewhere', 'anywhere',
  'well', 'badly', 'fast', 'slowly', 'quickly', 'carefully', 'easily',
];
// Города (proper nouns — без морфологии)
const CITIES = ['London', 'Paris', 'Berlin', 'Moscow', 'Kyiv', 'Rome', 'Madrid', 'Tokyo', 'Beijing', 'Lisbon', 'Vienna', 'Prague', 'Warsaw', 'Athens', 'Dublin', 'Oslo'];
// Имена собственные
const NAMES = ['Mary', 'John', 'Tom', 'Kate', 'Anna', 'Bob', 'Mike', 'Lucy', 'Peter', 'Sara', 'Mark', 'Jane', 'David', 'Emma', 'Alex', 'Lisa'];
// Страны
const COUNTRIES = ['Spain', 'France', 'Germany', 'Italy', 'Japan', 'China', 'India', 'Poland', 'Greece', 'Egypt', 'Brazil', 'Canada', 'Mexico', 'Russia', 'Turkey', 'Sweden'];
// Языки
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Russian', 'Polish', 'Greek', 'Turkish', 'Chinese', 'Japanese', 'Arabic'];
// Дни недели / месяцы
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Слова, которые НЕЛЬЗЯ предлагать как distractor (грубые/инаппропрейт/слишком обскурные)
const BLOCKLIST = new Set([
  'condom', 'condoms', 'sex', 'sexy', 'porn', 'porno', 'damn', 'shit', 'fuck', 'fucking', 'bitch', 'ass', 'arse',
  'kill', 'kills', 'killed', 'killing', 'killer', 'die', 'dies', 'dying',
  'bomb', 'bombs', 'gun', 'guns', 'rape', 'raped', 'rapes', 'raping', 'rapist',
  'drug', 'drugs', 'cocaine', 'heroin', 'meth', 'crack',
  // редкие / архаичные / странные
  'aggry', 'adry', 'aery', 'aggri', 'afald', 'afeard', 'abraid', 'abraids',
  'doctorly', 'angary',
]);

const CLASSES = [
  { name: 'PRONOUN_PERSONAL', set: PRONOUN_PERSONAL },
  { name: 'PRONOUN_POSSESSIVE', set: PRONOUN_POSSESSIVE },
  { name: 'DEMONSTRATIVE', set: DEMONSTRATIVE },
  { name: 'REFLEXIVE', set: REFLEXIVE },
  { name: 'WH_WORDS', set: WH_WORDS },
  { name: 'ARTICLE_DET', set: ARTICLE_DET },
  { name: 'TO_BE', set: TO_BE },
  { name: 'TO_HAVE', set: TO_HAVE },
  { name: 'TO_DO', set: TO_DO },
  { name: 'MODAL', set: MODAL },
  { name: 'PREPOSITION', set: PREPOSITION },
  { name: 'CONJUNCTION', set: CONJUNCTION },
  { name: 'NEGATION', set: NEGATION },
  { name: 'INDEFINITE', set: INDEFINITE },
  { name: 'CARDINAL', set: CARDINAL },
  { name: 'ORDINAL', set: ORDINAL },
  { name: 'COMMON_ADVERB', set: COMMON_ADVERB },
];
const CLASS_LOOKUP = (() => {
  const m = new Map();
  for (const cls of CLASSES) for (const w of cls.set) m.set(w, cls);
  return m;
})();

// Группы proper-noun (case-sensitive lookup по lower-case)
const PROPER_NOUN_GROUPS = [
  { name: 'CITIES', set: CITIES },
  { name: 'COUNTRIES', set: COUNTRIES },
  { name: 'NAMES', set: NAMES },
  { name: 'LANGUAGES', set: LANGUAGES },
  { name: 'WEEKDAYS', set: WEEKDAYS },
  { name: 'MONTHS', set: MONTHS },
];
const PROPER_NOUN_LOOKUP = (() => {
  const m = new Map();
  for (const g of PROPER_NOUN_GROUPS) for (const w of g.set) m.set(w.toLowerCase(), g);
  return m;
})();

// ── Допустимые исключения для ISREAL (имена/сокращения) ───────────────────
const EXCEPTIONS = new Set([
  'i', 'usa', 'uk', 'ok', 'okay', 'tv', 'pc', 'cd', 'dvd', 'wifi', 'wi-fi',
  "isn't", "aren't", "wasn't", "weren't", "doesn't", "don't", "didn't",
  "won't", "wouldn't", "can't", "cannot", "couldn't", "shouldn't",
  "haven't", "hasn't", "hadn't", "let's",
  "you're", "you've", "you'll", "you'd",
  "he's", "she's", "it's", "they're", "they've",
  "we're", "we've", "we'll",
  "what's", "where's", "that's", "there's", "here's",
  // proper nouns: дни недели
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  // месяцы
  'january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december',
  // города/страны/языки
  'london', 'moscow', 'kyiv', 'kiev', 'paris', 'berlin', 'rome', 'madrid',
  'tokyo', 'beijing', 'lisbon', 'vienna', 'prague', 'warsaw', 'athens', 'dublin', 'oslo',
  'lyon', 'leiden', 'louvre', 'lincoln',
  'spain', 'france', 'germany', 'italy', 'japan', 'china', 'india',
  'poland', 'greece', 'egypt', 'brazil', 'canada', 'mexico', 'russia', 'turkey', 'sweden',
  'ukraine',
  'english', 'spanish', 'french', 'german', 'italian', 'russian', 'polish',
  'greek', 'turkish', 'chinese', 'japanese', 'arabic',
  'mary', 'john', 'tom', 'kate', 'anna', 'bob', 'mike',
  'lucy', 'peter', 'sara', 'mark', 'jane', 'david', 'emma', 'alex', 'lisa',
]);

function normalize(w) {
  return String(w || '').toLowerCase().replace(/[.?!,;:]+$/, '').trim();
}

function isReal(word) {
  const n = normalize(word);
  if (!n) return true;
  if (/^\d+$/.test(n)) return true;
  if (EXCEPTIONS.has(n)) return true;
  if (DICT.has(n)) return true;
  if (n.includes('-')) return n.split('-').filter(Boolean).every((p) => DICT.has(p) || EXCEPTIONS.has(p));
  if (n.includes(' ')) return n.split(/\s+/).filter(Boolean).every((p) => DICT.has(p) || EXCEPTIONS.has(p));
  return false;
}

// Левенштейн
function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) for (let j = 1; j <= n; j += 1) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + c);
  }
  return dp[m][n];
}

// Сохраняет стиль capitalization у correct (если correct = "He" то distractor "him" → "Him").
function matchCase(target, model) {
  if (!model) return target;
  if (model[0] === model[0].toUpperCase() && model.toLowerCase() !== model) {
    return target[0].toUpperCase() + target.slice(1);
  }
  return target;
}

// Сохраняет финальную пунктуацию: если correct="code." то distractor "cold." должен иметь точку.
function matchTrailingPunct(target, model) {
  const m = String(model || '').match(/[.?!,;:]+$/);
  return m ? target + m[0] : target;
}

// Морфологические формы для глагола/существительного, фильтр через DICT.
function morphForms(stem) {
  const s = stem.toLowerCase();
  const cands = new Set();
  // Основные суффиксы
  const tries = [s + 's', s + 'es', s + 'ed', s + 'ing', s + 'er', s + 'est', s + 'ly', s + 'ness'];
  // -y → -ies / -ied
  if (s.endsWith('y') && s.length > 2) {
    tries.push(s.slice(0, -1) + 'ies', s.slice(0, -1) + 'ied', s.slice(0, -1) + 'ier', s.slice(0, -1) + 'iest');
  }
  // -e → -es / -ed (без удвоения)
  if (s.endsWith('e')) {
    tries.push(s + 'd', s.slice(0, -1) + 'ing', s.slice(0, -1) + 'ed');
  }
  // -ie → -ying
  if (s.endsWith('ie')) tries.push(s.slice(0, -2) + 'ying');
  // удвоение последней согласной перед -ing/-ed: run → running
  if (s.length >= 3 && /[bcdfghjklmnpqrstvwxz]$/.test(s) && /[aeiou]/.test(s[s.length - 2]) && !/[aeiou]/.test(s[s.length - 3])) {
    const c = s[s.length - 1];
    tries.push(s + c + 'ing', s + c + 'ed', s + c + 'er', s + c + 'est');
  }
  // Базовая форма (без -s/-ed/-ing) — для случаев когда correct в past
  if (s.endsWith('ed') && s.length > 3) tries.push(s.slice(0, -2), s.slice(0, -1));
  if (s.endsWith('ing') && s.length > 4) tries.push(s.slice(0, -3), s.slice(0, -3) + 'e');
  if (s.endsWith('s') && s.length > 2) tries.push(s.slice(0, -1));
  for (const t of tries) if (DICT.has(t)) cands.add(t);
  cands.delete(s); // убираем сам correct
  return [...cands];
}

// Подбор реальных слов из DICT, близких к correct (Levenshtein <=2), с фильтрами
function nearestRealWords(correct, exclude, limit = 30) {
  const c = correct.toLowerCase();
  const exc = new Set(exclude.map((x) => x.toLowerCase()));
  exc.add(c);
  const result = [];
  const minLen = Math.max(2, c.length - 2);
  const maxLen = c.length + 2;
  for (const w of DICT) {
    if (w.length < minLen || w.length > maxLen) continue;
    if (exc.has(w)) continue;
    const d = lev(w, c);
    if (d > 0 && d <= 2) result.push({ w, d });
    if (result.length > 800) break; // hard cap, итог важнее точности
  }
  result.sort((a, b) => a.d - b.d || a.w.localeCompare(b.w));
  return result.slice(0, limit).map((x) => x.w);
}

// Lesson vocab — соберём все реальные английские слова из уроков (correct + real distractors)
// чтобы predпочтительно использовать их при генерации distractors (учащемуся знакомы).
const LESSON_VOCAB = new Set();

function isProperNoun(s) {
  // Эвристика: первая буква заглавная и lowercase-форма не служебное слово.
  if (!s || s.length < 2) return false;
  const first = s[0];
  if (first !== first.toUpperCase() || first.toLowerCase() === first) return false;
  return !CLASS_LOOKUP.has(s.toLowerCase()) && !TO_BE.includes(s.toLowerCase());
}

// Найти ближайшие слова из заданного пула (вместо всего словаря)
function nearestFromPool(correct, pool, exclude, limit = 12) {
  const c = correct.toLowerCase();
  const exc = new Set([...exclude].map((x) => x.toLowerCase()));
  exc.add(c);
  const out = [];
  for (const w of pool) {
    if (exc.has(w)) continue;
    const d = lev(w, c);
    if (d > 0 && d <= 3) out.push({ w, d });
  }
  out.sort((a, b) => a.d - b.d || a.w.length - c.length || a.w.localeCompare(b.w));
  return out.slice(0, limit).map((x) => x.w);
}

// Главный генератор: возвращает >=count distractors для correct, lowercase.
function generateDistractors(correctRaw, existingDistractors, count = 5) {
  const correct = normalize(correctRaw);
  const correctLower = correct;
  const properGroup = PROPER_NOUN_LOOKUP.get(correctLower);
  const cls = CLASS_LOOKUP.get(correct);
  const used = new Set([correct]);
  const out = [];
  const target = Math.max(5, count);

  const push = (w) => {
    const n = normalize(w);
    if (!n) return false;
    if (used.has(n)) return false;
    if (BLOCKLIST.has(n)) return false;
    out.push(n); used.add(n);
    return out.length >= target;
  };

  // 0) Имя собственное — приоритет: другие имена той же группы.
  if (properGroup) {
    for (const w of properGroup.set) if (push(w.toLowerCase())) return out;
    // Если того же типа закончилось — фоллбэк к другим proper-noun группам
    for (const g of PROPER_NOUN_GROUPS) {
      if (g === properGroup) continue;
      for (const w of g.set) if (push(w.toLowerCase())) return out;
    }
    return out;
  }

  // 1) Класс служебного слова
  if (cls) {
    for (const w of cls.set) if (push(w)) return out;
  }

  // 2) Морфология correct
  for (const w of morphForms(correct)) if (push(w)) return out;

  // 3) Близкие слова из лесон-вокабуляра (приоритет — учащемуся знакомы)
  for (const w of nearestFromPool(correct, LESSON_VOCAB, used, 50)) if (push(w)) return out;

  // 4) Близкие из общего словаря
  for (const w of nearestRealWords(correct, [...used], 50)) if (push(w)) return out;

  // 5) Fallback: общеупотребительные
  const fallback = ['the', 'and', 'but', 'with', 'from', 'when', 'where', 'why', 'how', 'good', 'bad', 'big', 'small', 'old', 'new', 'first', 'last'];
  for (const w of fallback) if (push(w)) return out;
  return out;
}

// ── Применение к файлам lesson_data_*.ts ─────────────────────────────────
const FILES = [
  'app/lesson_data_1_8.ts',
  'app/lesson_data_9_16.ts',
  'app/lesson_data_17_24.ts',
  'app/lesson_data_25_32.ts',
];

// Регулярка извлекает {text:'X', correct:'X', distractors:[...]} с поддержкой
// экранированных кавычек внутри строк (например, 'you\'re').
const STR = `(?:'(?:\\\\.|[^'\\\\])*'|"(?:\\\\.|[^"\\\\])*")`;
const phraseWordRe = new RegExp(
  `\\{\\s*text:\\s*(${STR})\\s*,\\s*correct:\\s*(${STR})\\s*,\\s*distractors:\\s*\\[([^\\]]*)\\]`,
  'g',
);

// Парсер JS-строки в литерале (берёт content между кавычками, сохраняя escape-семантику)
function parseJsString(literal) {
  if (!literal) return '';
  const q = literal[0];
  if (q !== `'` && q !== `"`) return literal;
  const inner = literal.slice(1, -1);
  return inner.replace(/\\(.)/g, (_, c) => {
    if (c === 'n') return '\n';
    if (c === 't') return '\t';
    if (c === 'r') return '\r';
    return c; // \', \", \\ → ', ", \
  });
}

function escapeForJsSingleQuote(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function quoteCSV(arr) {
  return arr.map((w) => `'${escapeForJsSingleQuote(w)}'`).join(', ');
}

// Первый проход: собираем LESSON_VOCAB — все настоящие английские слова из всех уроков.
{
  const distrRe = /'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"/g;
  for (const rel of FILES) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const txt = fs.readFileSync(abs, 'utf8');
    const collect = new RegExp(phraseWordRe.source, 'g');
    let m;
    while ((m = collect.exec(txt)) !== null) {
      const text = parseJsString(m[1]);
      const correct = parseJsString(m[2]);
      const distrInner = m[3];
      const candidates = [text, correct];
      let dm;
      while ((dm = distrRe.exec(distrInner)) !== null) {
        const raw = (dm[1] !== undefined) ? dm[1] : dm[2];
        candidates.push(raw.replace(/\\(.)/g, (_, c) => c));
      }
      for (const w of candidates) {
        const n = normalize(w);
        if (!n) continue;
        if (DICT.has(n)) LESSON_VOCAB.add(n);
      }
    }
  }
  console.error(`LESSON_VOCAB собран: ${LESSON_VOCAB.size} уникальных слов`);
}

const stats = {
  filesScanned: 0, wordsScanned: 0, fakeFound: 0, replaced: 0, kept: 0,
  byLesson: {}, sampleChanges: [],
};

for (const rel of FILES) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  stats.filesScanned += 1;
  const orig = fs.readFileSync(abs, 'utf8');
  let changed = orig;
  let lastChangedOffset = 0; // не используем — replaceAll иначе
  changed = changed.replace(phraseWordRe, (full, textLit, correctLit, distrInner) => {
    stats.wordsScanned += 1;
    const correct = parseJsString(correctLit);
    // Вычленяем строки distractors: матчим '...' или "..." с escape поддержкой
    const distrRe = /'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"/g;
    const items = [];
    let mm;
    while ((mm = distrRe.exec(distrInner)) !== null) {
      const raw = (mm[1] !== undefined) ? mm[1] : mm[2];
      // Раскрываем escape-последовательности (\\' → ', \\\\ → \\)
      const decoded = raw.replace(/\\(.)/g, (_, c) => c);
      items.push(decoded);
    }
    if (items.length === 0) return full;
    let needFix = false;
    const fakeIdx = [];
    items.forEach((d, i) => { if (!isReal(d)) { needFix = true; fakeIdx.push(i); } });
    if (!needFix) { stats.kept += 1; return full; }
    stats.fakeFound += fakeIdx.length;

    // Соберём финальный список: реальные сохраняем, fake заменяем по очереди.
    // Для генерации просим столько кандидатов, сколько fake нужно заменить.
    const usedLower = new Set([normalize(correct)]);
    const result = [];
    const fakeCount = fakeIdx.length;
    const generated = generateDistractors(correct, items, Math.max(5, fakeCount + 3));
    let genPtr = 0;
    for (let i = 0; i < items.length; i += 1) {
      const cur = items[i];
      const curN = normalize(cur);
      if (isReal(cur) && !usedLower.has(curN) && !BLOCKLIST.has(curN)) {
        result.push(cur); usedLower.add(curN);
        continue;
      }
      // Подбираем чистую замену из generated — пропускаем уже использованные и blocklist
      let replacement = null;
      while (genPtr < generated.length) {
        const w = generated[genPtr++];
        const n = normalize(w);
        if (!n) continue;
        if (usedLower.has(n)) continue;
        if (BLOCKLIST.has(n)) continue;
        replacement = w; break;
      }
      if (!replacement) replacement = 'word'; // последний fallback
      replacement = matchTrailingPunct(matchCase(replacement, correct), cur);
      result.push(replacement);
      usedLower.add(normalize(replacement));
    }
    stats.replaced += fakeIdx.length;
    // запомним для отчёта
    if (stats.sampleChanges.length < 25) {
      stats.sampleChanges.push({ correct, before: items, after: result });
    }
    const newDistr = quoteCSV(result);
    return full.replace(/distractors:\s*\[[^\]]*\]/, `distractors: [${newDistr}]`);
  });

  if (changed !== orig && APPLY) {
    fs.writeFileSync(abs, changed, 'utf8');
  }
}

const lines = [];
lines.push(`# Smart fix distractors — ${APPLY ? 'APPLIED' : 'DRY RUN'} — ${new Date().toISOString()}`);
lines.push('');
lines.push(`Файлов отсканировано: ${stats.filesScanned}, слов: ${stats.wordsScanned}`);
lines.push(`Найдено fake: ${stats.fakeFound}, заменено: ${stats.replaced}, оставлено как было: ${stats.kept}`);
lines.push('');
lines.push('## Примеры замен');
for (const c of stats.sampleChanges) {
  lines.push(`- correct «${c.correct}»`);
  lines.push(`  - было: ${JSON.stringify(c.before)}`);
  lines.push(`  - стало: ${JSON.stringify(c.after)}`);
}
const out = lines.join('\n');
const outDir = path.join(ROOT, 'docs', 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `fix_distractors_${APPLY ? 'applied' : 'dryrun'}.md`), out, 'utf8');
console.log(out);
console.log(`\n${APPLY ? 'Изменения записаны.' : 'Это dry-run. Запусти с --apply чтобы изменить файлы.'}`);
