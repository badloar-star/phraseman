/**
 * Deep distractor quality audit for lesson_data_*.ts
 * Run: node scripts/audit_distractor_quality.mjs
 *
 * Flags:
 *   DUPLICATE — correct answer duplicated inside distractors[]
 *   SHORT_POOL — fewer than 5 distractors
 *   KNOWN_BAD — known non-words / bad patterns (childs, carses, Finnish↔finish, etc.)
 *   INFLECTED — distractor is clear inflection of correct (finished/finish, keys/key) — confusing
 */
import { readFileSync } from 'fs';

const FILES = [
  'app/lesson_data_1_8.ts',
  'app/lesson_data_9_16.ts',
  'app/lesson_data_17_24.ts',
  'app/lesson_data_25_32.ts',
];

const KNOWN_BAD_LOWER = new Set([
  'childs', 'carses', 'chaldron', 'cookings', 'finnish', // Finnish vs finish homophone trap as spelling distractor
  'photosy', 'bedy', 'tabley', 'bookedy', 'hersy', 'agoo',
]);

function extractPhrases(src) {
  const phrases = [];
  const idRx = /id:\s*'([^']+)'/g;
  let m;
  while ((m = idRx.exec(src)) !== null) {
    const start = src.lastIndexOf('{', m.index);
    let depth = 0,
      end = start;
    for (let i = start; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const block = src.slice(start, end + 1);
    const id = m[1];
    const engM = block.match(/english:\s*(?:'([^']+)'|"([^"]+)")/);
    if (!engM) continue;
    const english = engM[1] ?? engM[2];
    const wordsStart = block.indexOf('words:');
    if (wordsStart === -1) continue;
    const wordsBlock = block.slice(wordsStart);
    const wordRx =
      /(?:text:\s*(?:'([^']*)'|"([^"]*)")\s*,\s*)?correct:\s*(?:'([^']*)'|"([^"]*)")\s*,\s*distractors:\s*\[([^\]]*)\]/g;
    const words = [];
    let wm;
    while ((wm = wordRx.exec(wordsBlock)) !== null) {
      const text = wm[1] ?? wm[2] ?? '';
      const correct = wm[3] ?? wm[4];
      const dists = (wm[5].match(/'[^']*'|"[^"]*"/g) || []).map((s) => s.slice(1, -1));
      words.push({ text, correct, distractors: dists });
    }
    if (words.length > 0) phrases.push({ id, english, words });
  }
  return phrases;
}

function stripTrailingPunct(w) {
  return String(w).replace(/^[.,!?;:]+|[.,!?;:]+$/g, '').trim();
}

/** Rough check: plural/singular same lemma confusion */
function inflectionSuspicion(correct, distractor) {
  const c = stripTrailingPunct(correct).toLowerCase();
  const d = stripTrailingPunct(distractor).toLowerCase();
  if (c === d) return false;
  if (d.length < 3 || c.length < 3) return false;
  // keys/key, cars/car
  if ((d === c + 's' || d === c + 'es') && d.startsWith(c)) return true;
  if ((c === d + 's' || c === d + 'es') && c.startsWith(d)) return true;
  // verb forms: finish/finished/finishes
  const suf = ['ed', 'ing', 'es', 's'];
  for (const s of suf) {
    if (d === c + s || c === d + s) return true;
  }
  return false;
}

const findings = {
  DUPLICATE: [],
  SHORT_POOL: [],
  KNOWN_BAD: [],
  INFLECTED: [],
};

for (const f of FILES) {
  const src = readFileSync(f, 'utf8');
  const phrases = extractPhrases(src);
  for (const ph of phrases) {
    ph.words.forEach((wd, idx) => {
      const correct = wd.correct;
      const low = correct.toLowerCase();
      const dists = wd.distractors;

      if (dists.length < 5) {
        findings.SHORT_POOL.push(`${ph.id} pos${idx} "${correct}" — ${dists.length} distractors`);
      }

      for (const d of dists) {
        if (d.toLowerCase() === low) {
          findings.DUPLICATE.push(`${ph.id} pos${idx} duplicate correct "${correct}" inside distractors`);
        }
      }

      for (const d of dists) {
        const dl = d.toLowerCase();
        if (KNOWN_BAD_LOWER.has(dl)) {
          findings.KNOWN_BAD.push(`${ph.id} pos${idx} correct="${correct}" bad="${d}"`);
        }
        if (/childs|carses|cookings|chaldron/i.test(d)) {
          findings.KNOWN_BAD.push(`${ph.id} pos${idx} correct="${correct}" bad="${d}" (pattern)`);
        }
        if (correct.toLowerCase() === 'finish' && dl === 'finnish') {
          findings.KNOWN_BAD.push(`${ph.id} pos${idx} Finnish vs finish (proper noun noise)`);
        }
      }

      for (const d of dists) {
        if (inflectionSuspicion(correct, d)) {
          findings.INFLECTED.push(`${ph.id} pos${idx} correct="${correct}" suspicious="${d}"`);
        }
      }
    });
  }
}

function uniq(arr) {
  return [...new Set(arr)];
}

console.log('\n=== DISTRACTOR QUALITY AUDIT ===\n');
for (const k of Object.keys(findings)) {
  const u = uniq(findings[k]);
  console.log(`## ${k}: ${u.length} issues`);
  u.slice(0, 40).forEach((line) => console.log(' ', line));
  if (u.length > 40) console.log(`  … +${u.length - 40} more`);
  console.log('');
}

console.log('Totals:', Object.fromEntries(Object.keys(findings).map((k) => [k, uniq(findings[k]).length])));
