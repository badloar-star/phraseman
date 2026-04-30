// Аудит «выдуманных» distractors: ищем слова, которых нет в словаре английского языка.
// Для каждого fake distractor предлагает кандидатов-замены — настоящие слова, близкие
// к correct (Levenshtein + edit distance) или к самому fake.
//
// Запуск: node scripts/audit_fake_distractors.mjs
// Опционально автозамена: node scripts/audit_fake_distractors.mjs --fix

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const requireCJS = createRequire(import.meta.url);
const wordsArr = requireCJS('an-array-of-english-words');
const DICT = new Set(wordsArr);

// ── Допустимые «не-словарные» исключения: имена собственные, аббревиатуры, числа, спецслова.
const EXCEPTIONS = new Set([
  'i', "i'm", "i'd", "i've", "i'll",
  'usa', 'uk', 'ok', 'okay', 'tv', 'pc', 'cd', 'dvd', 'wifi', 'wi-fi',
  // местоимения / усечения
  "isn't", "aren't", "wasn't", "weren't", "doesn't", "don't", "didn't",
  "won't", "wouldn't", "can't", "cannot", "couldn't", "shouldn't",
  "haven't", "hasn't", "hadn't", "mustn't", "needn't", "let's",
  "you're", "you've", "you'll", "you'd",
  "he's", "she's", "it's", "they're", "they've", "they'll", "they'd",
  "we're", "we've", "we'll", "we'd",
  "what's", "where's", "when's", "who's", "how's", "that's", "there's",
  "here's", "ain't",
  // proper nouns: дни недели
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  // месяцы
  'january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december',
  // города
  'london', 'moscow', 'kyiv', 'kiev', 'paris', 'berlin', 'rome', 'madrid',
  'tokyo', 'beijing', 'lisbon', 'vienna', 'prague', 'warsaw', 'athens', 'dublin', 'oslo',
  'lyon', 'leiden', 'louvre', 'lincoln',
  // страны
  'spain', 'france', 'germany', 'italy', 'japan', 'china', 'india', 'usa',
  'poland', 'greece', 'egypt', 'brazil', 'canada', 'mexico', 'russia', 'turkey', 'sweden',
  'ukraine',
  // языки (заглавные в английском)
  'english', 'spanish', 'french', 'german', 'italian', 'russian', 'polish',
  'greek', 'turkish', 'chinese', 'japanese', 'arabic',
  // имена
  'mary', 'john', 'tom', 'kate', 'anna', 'bob', 'mike',
  'lucy', 'peter', 'sara', 'mark', 'jane', 'david', 'emma', 'alex', 'lisa',
]);

function loadTsModule(absPath) {
  const code = fs.readFileSync(absPath, 'utf8');
  const out = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
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
  new Function('module', 'exports', 'require', out.outputText)(module, module.exports, requireShim);
  return module.exports;
}

const ALL = loadTsModule(path.join(ROOT, 'app', 'lesson_data_all.ts'));
const LESSON_DATA = ALL.LESSON_DATA;

// Нормализация: lowercase + срезаем финальную пунктуацию (мы храним в text слова с точкой типа "code.")
function normalize(w) {
  return String(w || '').toLowerCase().replace(/[.?!,;:]+$/, '').trim();
}

function isReal(word) {
  const n = normalize(word);
  if (n.length === 0) return true;
  if (/^\d+$/.test(n)) return true; // числа
  if (EXCEPTIONS.has(n)) return true;
  if (DICT.has(n)) return true;
  // Возможно слово с апострофом-сокращением (it's, can't) — проверяем без апострофа: но обычно их нет в словаре, всё равно EXCEPTIONS
  // Слово с дефисом: проверяем обе части
  if (n.includes('-')) {
    const parts = n.split('-').filter(Boolean);
    return parts.every((p) => DICT.has(p) || EXCEPTIONS.has(p));
  }
  // Слово с пробелом (например "no one"): проверяем все части
  if (n.includes(' ')) {
    const parts = n.split(/\s+/).filter(Boolean);
    return parts.every((p) => DICT.has(p) || EXCEPTIONS.has(p));
  }
  return false;
}

// Левенштейн (классика, без оптимизаций — уроков мало)
function lev(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n; if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

// Кандидаты — реальные слова из словаря, близкие к correct (приоритет) и к fake
// Возвращаем 5 разных слов (не равны correct, не равны другим distractors).
function suggestReplacements(correct, fake, otherDistractors) {
  const corrN = normalize(correct);
  const fakeN = normalize(fake);
  // Простые морфологические соседи correct: -s, -ed, -ing, -er, -est, без последней буквы и т.д.
  const morphCandidates = new Set();
  const stems = [corrN];
  if (corrN.length > 3) stems.push(corrN.replace(/e$/, ''));
  if (corrN.length > 3) stems.push(corrN.replace(/y$/, 'i'));
  for (const stem of stems) {
    [
      stem,
      stem + 's', stem + 'es', stem + 'ed', stem + 'ing', stem + 'er', stem + 'est',
      stem + 'ly', stem + 'ies',
      stem.slice(0, -1), // отрезать последнюю букву
    ].forEach((c) => morphCandidates.add(c));
  }
  // Замены 1 буквы (для коротких слов даёт много кандидатов)
  if (corrN.length <= 6) {
    for (let i = 0; i < corrN.length; i += 1) {
      for (let c = 97; c <= 122; c += 1) {
        const ch = String.fromCharCode(c);
        if (ch === corrN[i]) continue;
        const cand = corrN.slice(0, i) + ch + corrN.slice(i + 1);
        morphCandidates.add(cand);
      }
    }
  }

  const used = new Set([corrN, fakeN, ...otherDistractors.map(normalize)]);
  const results = [];
  for (const c of morphCandidates) {
    if (used.has(c) || c.length < 2) continue;
    if (DICT.has(c)) {
      results.push({ word: c, distance: lev(c, corrN), source: 'morph' });
      used.add(c);
    }
  }

  // Сортировка: ближе к correct → выше; равные расстояния — стабильно (lex)
  results.sort((a, b) => a.distance - b.distance || a.word.localeCompare(b.word));
  return results.slice(0, 8);
}

// ── Сбор всех distractors ──────────────────────────────────────────────────
const items = [];
const ids = Object.keys(LESSON_DATA).map(Number).filter((n) => n >= 1 && n <= 32).sort((a, b) => a - b);

for (const lessonId of ids) {
  const lesson = LESSON_DATA[lessonId];
  for (const phrase of (lesson?.phrases || [])) {
    for (const w of (phrase.words || [])) {
      if (!Array.isArray(w?.distractors)) continue;
      for (let k = 0; k < w.distractors.length; k += 1) {
        const d = w.distractors[k];
        if (!isReal(d)) {
          items.push({
            lessonId,
            phraseId: phrase.id,
            correct: w.correct ?? w.text,
            distractor: d,
            distractorIndex: k,
            allDistractors: w.distractors,
          });
        }
      }
    }
  }
}

// Уникальные fake-слова (для отчёта)
const uniqFake = new Map();
for (const it of items) {
  const key = `${normalize(it.distractor)}|${normalize(it.correct)}`;
  if (!uniqFake.has(key)) {
    uniqFake.set(key, { fake: it.distractor, correct: it.correct, count: 0, suggestions: null, contexts: [] });
  }
  const u = uniqFake.get(key);
  u.count += 1;
  if (u.contexts.length < 3) u.contexts.push({ lessonId: it.lessonId, phraseId: it.phraseId });
}
for (const u of uniqFake.values()) {
  u.suggestions = suggestReplacements(u.correct, u.fake, []).map((s) => s.word);
}

// ── Группировка по урокам
const byLesson = {};
for (const it of items) {
  byLesson[it.lessonId] = byLesson[it.lessonId] || 0;
  byLesson[it.lessonId] += 1;
}

const lines = [];
lines.push(`# Аудит выдуманных distractors (${new Date().toISOString()})`);
lines.push('');
lines.push(`Найдено fake-вхождений: ${items.length}, уникальных слов: ${uniqFake.size}`);
lines.push(`Словарь: an-array-of-english-words (${DICT.size} слов).`);
lines.push('');
lines.push('## По урокам');
for (const id of ids) {
  const n = byLesson[id] || 0;
  const flag = n === 0 ? '✅' : '⚠️';
  lines.push(`- ${flag} Урок ${id}: ${n} fake-distractor(ов)`);
}
lines.push('');
lines.push('## Уникальные выдуманные слова с предложениями замен');
const sortedUniq = [...uniqFake.values()].sort((a, b) => b.count - a.count);
for (const u of sortedUniq) {
  const ctxStr = u.contexts.map((c) => `L${c.lessonId}/${c.phraseId}`).join(', ');
  lines.push(`- **${u.fake}** → правильное «${u.correct}», встречается ${u.count}× (${ctxStr})${u.contexts.length < u.count ? '…' : ''}`);
  if (u.suggestions.length > 0) {
    lines.push(`  - Кандидаты: ${u.suggestions.join(', ')}`);
  } else {
    lines.push(`  - Кандидатов нет (нужно подобрать вручную)`);
  }
}

const outDir = path.join(ROOT, 'docs', 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'fake_distractors_1_27.md'), lines.join('\n'), 'utf8');
fs.writeFileSync(path.join(outDir, 'fake_distractors_1_27.json'), JSON.stringify({ items, uniqFake: [...uniqFake.values()] }, null, 2), 'utf8');

console.log(lines.join('\n'));
console.log(`\nReport: docs/reports/fake_distractors_1_27.md`);
