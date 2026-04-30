// audit_contractions_full.mjs
// Полный аудит сокращений в уроках 1–32.
// Проверяет каждую пару соседних слов в фразе (по words[]) на потенциал
// для сокращения и наличие/отсутствие соответствующей ветки в коде.
//
// Источники истины (зеркалят app/lesson1_smart_options.ts + app/lesson1.tsx +
//                   constants/contractions.ts):
//   1. EXPANSION_TO_CONTRACTION  — какая пара expanded[] → contraction
//   2. CONTRACTION_MAP           — какое contraction → expanded[]
//   3. NORMALIZE_PAIRS           — какие contraction нормализуются в expanded
//
// Запуск: node scripts/audit_contractions_full.mjs
// Опции:  --json  печатать JSON-отчёт
//         --lesson=N  фильтровать по уроку

import { readFileSync } from 'fs';

// ─── 1. Маппинги из кода (зеркало) ───────────────────────────────────────────
const EXPANSION_TO_CONTRACTION = {
  do:       { not: "don't" },
  does:     { not: "doesn't" },
  did:      { not: "didn't" },
  will:     { not: "won't" },
  can:      { not: "can't" },
  could:    { not: "couldn't" },
  should:   { not: "shouldn't" },
  would:    { not: "wouldn't" },
  have:     { not: "haven't" },
  had:      { not: "hadn't" },
  has:      { not: "hasn't" },
  is:       { not: "isn't" },
  are:      { not: "aren't" },
  was:      { not: "wasn't" },
  were:     { not: "weren't" },
  must:     { not: "mustn't" },
  need:     { not: "needn't" },
  might:    { not: "mightn't" },
  i:        { am: "I'm",   have: "I've",   will: "I'll",   would: "I'd"   },
  you:      { are: "you're", have: "you've", will: "you'll", would: "you'd" },
  we:       { are: "we're",  have: "we've",  will: "we'll",  would: "we'd"  },
  they:     { are: "they're",have: "they've",will: "they'll",would: "they'd"},
  he:       { is: "he's",  will: "he'll",  would: "he'd"  },
  she:      { is: "she's", will: "she'll", would: "she'd" },
  it:       { is: "it's", will: "it'll" },
  there:    { is: "there's" },
  that:     { is: "that's" },
  what:     { is: "what's" },
  who:      { is: "who's" },
  let:      { us: "let's" },
};

const getContractionFor = (a, b) =>
  EXPANSION_TO_CONTRACTION[a?.toLowerCase()]?.[b?.toLowerCase()] ?? null;

// ─── 2. CANDIDATE_PAIRS: то, что *должно* быть распознано (расширенный список) ─
// Здесь перечислены ВСЕ грамматически валидные пары, для которых в живом
// английском есть стандартное сокращение. Используем для поиска пробелов.
const CANDIDATE_PAIRS = {
  // Pronoun + be / have / will / would
  i:     { am: "I'm",    have: "I've",    will: "I'll",    would: "I'd"    },
  you:   { are: "you're", have: "you've",  will: "you'll",  would: "you'd"  },
  we:    { are: "we're",  have: "we've",   will: "we'll",   would: "we'd"   },
  they:  { are: "they're",have: "they've", will: "they'll", would: "they'd" },
  he:    { is: "he's",    will: "he'll",   would: "he'd"   },
  she:   { is: "she's",   will: "she'll",  would: "she'd"  },
  it:    { is: "it's",    will: "it'll",   would: "it'd"   },
  // Demonstratives + is
  that:   { is: "that's" },
  there:  { is: "there's" },
  here:   { is: "here's" },
  what:   { is: "what's" },
  who:    { is: "who's" },
  where:  { is: "where's" },
  when:   { is: "when's" },
  how:    { is: "how's" },
  // Aux + not  (Englishes 'n't)
  do:      { not: "don't" },
  does:    { not: "doesn't" },
  did:     { not: "didn't" },
  is:      { not: "isn't" },
  are:     { not: "aren't" },
  was:     { not: "wasn't" },
  were:    { not: "weren't" },
  has:     { not: "hasn't" },
  have:    { not: "haven't" },
  had:     { not: "hadn't" },
  can:     { not: "can't" },
  could:   { not: "couldn't" },
  will:    { not: "won't" },
  would:   { not: "wouldn't" },
  shall:   { not: "shan't" },
  should:  { not: "shouldn't" },
  must:    { not: "mustn't" },
  need:    { not: "needn't" },
  might:   { not: "mightn't" },
  ought:   { not: "oughtn't" },
  // Imperative
  let: { us: "let's" },
};

const getCandidateContraction = (a, b) =>
  CANDIDATE_PAIRS[a?.toLowerCase()]?.[b?.toLowerCase()] ?? null;

// ─── 3. Парсер lesson data (zero-deps) ───────────────────────────────────────
function extractPhrases(src, fileName) {
  const phrases = [];
  const idRx = /id:\s*'([^']+)'/g;
  let m;
  while ((m = idRx.exec(src)) !== null) {
    const start = src.lastIndexOf('{', m.index);
    let depth = 0, end = start;
    for (let i = start; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    const block = src.slice(start, end + 1);
    const id = m[1];
    const engM = block.match(/english:\s*['"]([^'"]+)['"]/);
    if (!engM) continue;
    const english = engM[1];
    const wordsStart = block.indexOf('words:');
    if (wordsStart === -1) continue;
    const wordsBlock = block.slice(wordsStart);
    // Token can be 'word' OR "word" so support both.
    const wordRx = /correct:\s*(?:'([^']*)'|"([^"]*)")\s*,\s*distractors:\s*\[([^\]]*)\]/g;
    const words = [];
    let wm;
    while ((wm = wordRx.exec(wordsBlock)) !== null) {
      const correct = wm[1] ?? wm[2];
      const dRaw = wm[3];
      const dists = (dRaw.match(/'[^']*'|"[^"]*"/g) || []).map((s) => s.slice(1, -1));
      words.push({ correct, distractors: dists });
    }
    if (words.length > 0) phrases.push({ id, english, words, file: fileName });
  }
  return phrases;
}

const lessonIdFromPhraseId = (pid) => {
  // Пытаемся вытащить число урока из id вида "lesson1_phrase_3" / "l24_p7" / "L17p2"
  const m1 = pid.match(/lesson(\d+)/i);
  if (m1) return Number(m1[1]);
  const m2 = pid.match(/^l(\d+)[_p]/i);
  if (m2) return Number(m2[1]);
  const m3 = pid.match(/(?:^|[_-])(\d+)(?:[_-]|p)/i);
  if (m3) return Number(m3[1]);
  return null;
};

// ─── 4. Обход уроков ─────────────────────────────────────────────────────────
const FILES = [
  ['app/lesson_data_1_8.ts',   '1-8'],
  ['app/lesson_data_9_16.ts',  '9-16'],
  ['app/lesson_data_17_24.ts', '17-24'],
  ['app/lesson_data_25_32.ts', '25-32'],
];

const LESSON_FILTER = (() => {
  const a = process.argv.find((x) => x.startsWith('--lesson='));
  return a ? Number(a.split('=')[1]) : null;
})();
const JSON_OUT = process.argv.includes('--json');

const allPhrases = [];
for (const [path, label] of FILES) {
  const src = readFileSync(path, 'utf8');
  const ph = extractPhrases(src, label);
  for (const p of ph) {
    const lid = lessonIdFromPhraseId(p.id);
    p.lessonId = lid ?? -1;
    if (LESSON_FILTER && p.lessonId !== LESSON_FILTER) continue;
    allPhrases.push(p);
  }
}

// ─── 5. Анализ ──────────────────────────────────────────────────────────────
const stats = {
  phrases: allPhrases.length,
  pairsTotal: 0,
  pairsCovered: 0,           // пара даёт сокращение, и оно поддержано в коде
  pairsMissingCoverage: 0,   // пара даёт сокращение, кода нет (gap!)
};

const gaps = []; // pairs that should produce contractions but aren't in the code
const coveredExamples = new Map(); // contraction → [phrase ids]
const missingExamples = new Map(); // contraction → [phrase ids]

for (const p of allPhrases) {
  for (let i = 0; i < p.words.length - 1; i++) {
    const a = p.words[i].correct;
    const b = p.words[i + 1].correct;
    if (!a || !b) continue;
    if (a === '-' || b === '-') continue;

    const inCode = getContractionFor(a, b);
    const candidate = getCandidateContraction(a, b);

    if (candidate) {
      stats.pairsTotal++;
      if (inCode) {
        stats.pairsCovered++;
        const arr = coveredExamples.get(inCode) ?? [];
        arr.push(`L${p.lessonId} ${p.id}`);
        coveredExamples.set(inCode, arr);
      } else {
        stats.pairsMissingCoverage++;
        gaps.push({
          lessonId: p.lessonId,
          phraseId: p.id,
          english: p.english,
          posA: i,
          a, b,
          shouldOffer: candidate,
        });
        const arr = missingExamples.get(candidate) ?? [];
        arr.push(`L${p.lessonId} ${p.id}: "${p.english}"`);
        missingExamples.set(candidate, arr);
      }
    }
  }
}

// ─── 6. Отчёт ────────────────────────────────────────────────────────────────
if (JSON_OUT) {
  console.log(JSON.stringify({ stats, gaps, coveredExamples: [...coveredExamples], missingExamples: [...missingExamples] }, null, 2));
  process.exit(0);
}

console.log('\n=== AUDIT: contractions across lessons 1–32 ===');
console.log(`Phrases analysed: ${stats.phrases}`);
console.log(`Contraction-forming pairs total:   ${stats.pairsTotal}`);
console.log(`  ✅ covered by EXPANSION_TO_CONTRACTION: ${stats.pairsCovered}`);
console.log(`  ❌ missing coverage (gaps):              ${stats.pairsMissingCoverage}`);

if (stats.pairsMissingCoverage === 0) {
  console.log('\n✅ Все обнаруженные пары для сокращений уже поддержаны кодом.');
} else {
  console.log('\n=== GAPS — пары, для которых сокращение НЕ предлагается ===');
  // group by candidate contraction
  const byContraction = new Map();
  for (const g of gaps) {
    const arr = byContraction.get(g.shouldOffer) ?? [];
    arr.push(g);
    byContraction.set(g.shouldOffer, arr);
  }
  for (const [contr, list] of [...byContraction.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  ${contr}  (${list.length} фраз${list.length === 1 ? 'а' : list.length < 5 ? 'ы' : ''})`);
    for (const g of list.slice(0, 5)) {
      console.log(`     L${g.lessonId} ${g.phraseId} pos${g.posA}: "${g.english}"`);
    }
    if (list.length > 5) console.log(`     … +${list.length - 5} ещё`);
  }
}

console.log('\n=== COVERED — пары, корректно работающие сейчас ===');
const coveredSorted = [...coveredExamples.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [contr, arr] of coveredSorted) {
  console.log(`  ${contr.padEnd(10)} : ${arr.length} вхождени${arr.length === 1 ? 'е' : 'й'}`);
}

console.log('\n— конец отчёта —');
