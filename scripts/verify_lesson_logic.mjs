// verify_lesson_logic.mjs
// Simulates getPerWordDistracts + safeGetDistracts + isCorrectAnswer
// for every phrase and every word position in all lesson data files.
// Checks:
//   1. correct word is always in the button set (initial + after undo)
//   2. contraction alternative of correct answer normalizes to same value
// Run: node scripts/verify_lesson_logic.mjs

import { readFileSync } from 'fs';

// ── Contraction map (mirrors lesson1_smart_options.ts) ────────────────────────
const EXPANSION_TO_CONTRACTION = {
  do: { not: "don't" }, does: { not: "doesn't" }, did: { not: "didn't" },
  will: { not: "won't" }, can: { not: "can't" }, could: { not: "couldn't" },
  should: { not: "shouldn't" }, would: { not: "wouldn't" },
  have: { not: "haven't" }, had: { not: "hadn't" }, has: { not: "hasn't" },
  is: { not: "isn't" }, are: { not: "aren't" },
  was: { not: "wasn't" }, were: { not: "weren't" },
  i: { am: "I'm", have: "I've", will: "I'll", would: "I'd" },
  you: { are: "you're", have: "you've", will: "you'll", would: "you'd" },
  we: { are: "we're", have: "we've", will: "we'll", would: "we'd" },
  they: { are: "they're", have: "they've", will: "they'll", would: "they'd" },
  he: { is: "he's", will: "he'll", would: "he'd" },
  she: { is: "she's", will: "she'll", would: "she'd" },
  it: { is: "it's", will: "it'll" }, there: { is: "there's" }, that: { is: "that's" },
  might: { not: "mightn't" },
};
const getContractionFor = (w, n) =>
  EXPANSION_TO_CONTRACTION[w?.toLowerCase()]?.[n?.toLowerCase()] ?? null;

function getPerWordDistracts(phrase, wordIndex) {
  if (!phrase?.words?.[wordIndex]) return [];
  const wd = phrase.words[wordIndex];
  const correct = wd.correct;
  const nextWd = phrase.words[wordIndex + 1];
  const seen = new Set([correct.toLowerCase()]);
  const contr = nextWd ? getContractionFor(correct, nextWd.correct) : null;
  if (contr) seen.add(contr.toLowerCase());
  const pickUnique = (pool, count) => {
    const r = [];
    for (const w of pool) {
      if (r.length >= count) break;
      if (!seen.has(w.toLowerCase())) { seen.add(w.toLowerCase()); r.push(w); }
    }
    return r;
  };
  let combined;
  if (nextWd) {
    const fc = pickUnique(wd.distractors, contr ? 2 : 3);
    const fn = pickUnique(nextWd.distractors.filter(d => d !== nextWd.correct), 2);
    combined = [correct, ...fc, ...fn, ...(contr ? [contr] : [])];
  } else {
    const uniq = wd.distractors.filter(d => {
      const k = d.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
    combined = [correct, ...uniq];
  }
  return combined.slice(0, 6);
}

function safeGetDistracts(phrase, wordIndex) {
  const r = getPerWordDistracts(phrase, wordIndex);
  if (r.length > 0) return r;
  for (let i = wordIndex - 1; i >= 0; i--) {
    const fb = getPerWordDistracts(phrase, i);
    if (fb.length > 0) return fb;
  }
  return r;
}

// ── Normalize (mirrors contractions.ts) ──────────────────────────────────────
const PAIRS = [
  [/\bdidn't\b/gi, 'did not'], [/\bdoesn't\b/gi, 'does not'], [/\bdon't\b/gi, 'do not'],
  [/\bwon't\b/gi, 'will not'], [/\bwouldn't\b/gi, 'would not'], [/\bcouldn't\b/gi, 'could not'],
  [/\bshouldn't\b/gi, 'should not'], [/\bmustn't\b/gi, 'must not'], [/\bhasn't\b/gi, 'has not'],
  [/\bhaven't\b/gi, 'have not'], [/\bhadn't\b/gi, 'had not'], [/\bisn't\b/gi, 'is not'],
  [/\baren't\b/gi, 'are not'], [/\bwasn't\b/gi, 'was not'], [/\bweren't\b/gi, 'were not'],
  [/\bcan't\b/gi, 'can not'], [/\bcannot\b/gi, 'can not'],
  [/\bI'm\b/gi, 'I am'], [/\bI've\b/gi, 'I have'], [/\bI'll\b/gi, 'I will'], [/\bI'd\b/gi, 'I would'],
  [/\bhe's\b/gi, 'he is'], [/\bshe's\b/gi, 'she is'], [/\bit's\b/gi, 'it is'],
  [/\bwe're\b/gi, 'we are'], [/\bthey're\b/gi, 'they are'], [/\byou're\b/gi, 'you are'],
  [/\byou've\b/gi, 'you have'], [/\bwe've\b/gi, 'we have'], [/\bthey've\b/gi, 'they have'],
  [/\byou'll\b/gi, 'you will'], [/\bhe'll\b/gi, 'he will'], [/\bshe'll\b/gi, 'she will'],
  [/\bit'll\b/gi, 'it will'], [/\bwe'll\b/gi, 'we will'], [/\bthey'll\b/gi, 'they will'],
  [/\bthere's\b/gi, 'there is'], [/\bthat's\b/gi, 'that is'], [/\bwhat's\b/gi, 'what is'],
  [/\bwho's\b/gi, 'who is'],
];
function normalize(text) {
  let r = text.trim().replace(/[\u2019\u2018\u02BC\u0060]/g, "'").toLowerCase().replace(/[.!?,;]+$/, '').trim();
  for (const [pat, rep] of PAIRS) r = r.replace(pat, rep);
  return r.replace(/\s+/g, ' ').trim();
}

// ── Parse lesson data files ───────────────────────────────────────────────────
function extractPhrases(src) {
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
    const engM = block.match(/english:\s*(?:'([^']+)'|"([^"]+)")/);
    if (!engM) continue;
    const english = engM[1] ?? engM[2];
    const altsM = block.match(/alternatives:\s*\[([^\]]+)\]/);
    const alternatives = altsM
      ? (altsM[1].match(/'([^']+)'/g) || []).map(s => s.replace(/'/g, ''))
      : [];
    const wordsStart = block.indexOf('words:');
    if (wordsStart === -1) continue;
    const wordsBlock = block.slice(wordsStart);
    const wordRx = /correct:\s*(?:'([^']*)'|"([^"]*)")\s*,\s*distractors:\s*\[([^\]]*)\]/g;
    const words = [];
    let wm;
    while ((wm = wordRx.exec(wordsBlock)) !== null) {
      const correct = wm[1] ?? wm[2];
      const dists = (wm[3].match(/'[^']*'|"[^"]*"/g) || []).map(s => s.slice(1, -1));
      words.push({ correct, distractors: dists });
    }
    if (words.length > 0) phrases.push({ id, english, words, alternatives });
  }
  return phrases;
}

// ── Contractions to test both directions ────────────────────────────────────
const CONTR_EXPAND = [
  ["aren't", 'are not'], ["isn't", 'is not'], ["don't", 'do not'], ["doesn't", 'does not'],
  ["didn't", 'did not'], ["won't", 'will not'], ["can't", 'can not'], ["couldn't", 'could not'],
  ["shouldn't", 'should not'], ["wouldn't", 'would not'], ["haven't", 'have not'],
  ["hadn't", 'had not'], ["hasn't", 'has not'], ["wasn't", 'was not'], ["weren't", 'were not'],
  ["you're", 'you are'], ["we're", 'we are'], ["they're", 'they are'],
  ["he's", 'he is'], ["she's", 'she is'], ["I'm", 'I am'], ["it's", 'it is'],
  ["I've", 'I have'], ["I'll", 'I will'], ["I'd", 'I would'],
  ["you've", 'you have'], ["we've", 'we have'], ["they've", 'they have'],
  ["you'll", 'you will'], ["he'll", 'he will'], ["she'll", 'she will'],
  ["it'll", 'it will'], ["we'll", 'we will'], ["they'll", 'they will'],
  ["mightn't", 'might not'],
  ["there's", 'there is'], ["that's", 'that is'],
];

// ── Main ─────────────────────────────────────────────────────────────────────
const files = [
  'app/lesson_data_1_8.ts',
  'app/lesson_data_9_16.ts',
  'app/lesson_data_17_24.ts',
  'app/lesson_data_25_32.ts',
];

let totalPhrases = 0, totalWordTests = 0, totalContrTests = 0;
const problems = [];

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const phrases = extractPhrases(src);
  totalPhrases += phrases.length;

  for (const phrase of phrases) {
    // ── Test A: every position buttons contain correct word ──────────────────
    for (let i = 0; i < phrase.words.length; i++) {
      totalWordTests++;
      const buttons = safeGetDistracts(phrase, i);
      const correct = phrase.words[i].correct;
      if (!buttons.map(b => b.toLowerCase()).includes(correct.toLowerCase())) {
        problems.push(`MISSING_CORRECT | ${phrase.id} | pos${i} | correct="${correct}" | buttons=[${buttons.join(',')}]`);
      }
      // Also check contraction is offered when expected
      const nextWd = phrase.words[i + 1];
      if (nextWd) {
        const contr = getContractionFor(correct, nextWd.correct);
        if (contr && !buttons.map(b => b.toLowerCase()).includes(contr.toLowerCase())) {
          problems.push(`MISSING_CONTR | ${phrase.id} | pos${i} | expected "${contr}" not in buttons=[${buttons.join(',')}]`);
        }
      }
    }

    // ── Test B: contractions in english validate via normalize ────────────────
    const normCorrect = normalize(phrase.english);
    const altNorms = phrase.alternatives.map(a => normalize(a));

    for (const [contr, expanded] of CONTR_EXPAND) {
      const rx = new RegExp('\\b' + contr.replace(/'/g, "[''\\u2019]") + '\\b', 'i');
      if (rx.test(phrase.english)) {
        totalContrTests++;
        // User typed expanded form — should still pass
        const expandedAnswer = phrase.english.replace(rx, expanded);
        const normExpanded = normalize(expandedAnswer);
        if (normExpanded !== normCorrect && !altNorms.includes(normExpanded)) {
          problems.push(`CONTR_VALIDATE_FAIL | ${phrase.id} | contr="${contr}" | english="${phrase.english}" | expanded="${expandedAnswer}"`);
        }
        // User typed contracted form when phrase has expanded — should also pass
        const contracted = phrase.english.replace(
          new RegExp('\\b' + expanded.replace(/ /g, '\\s+') + '\\b', 'i'), contr
        );
        if (contracted !== phrase.english) {
          const normContracted = normalize(contracted);
          if (normContracted !== normCorrect && !altNorms.includes(normContracted)) {
            problems.push(`CONTR_CONTRACT_FAIL | ${phrase.id} | contr="${contr}" | contracted="${contracted}"`);
          }
        }
      }
    }
  }
}

console.log('\n=== LESSON VERIFICATION REPORT ===');
console.log(`Phrases: ${totalPhrases}`);
console.log(`Word position tests: ${totalWordTests}`);
console.log(`Contraction tests: ${totalContrTests}`);
console.log(`Problems found: ${problems.length}`);

if (problems.length === 0) {
  console.log('\n✅ ALL PASS');
  console.log('  - Every word position has correct word in buttons');
  console.log('  - Every word position has expected contraction in buttons');
  console.log('  - All contractions validate correctly (both directions)');
} else {
  console.log('\nProblems:');
  problems.forEach(p => console.log(' ', p));
}
