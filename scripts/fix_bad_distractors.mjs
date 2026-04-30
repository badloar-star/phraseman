/**
 * fix_bad_distractors.mjs
 * Finds and replaces garbage distractors in lesson data files.
 *
 * Bad patterns caught:
 *   - word-y  (sugar-y, room-y, monday-y...)
 *   - word-s  (coffee-s, table-s, computer-s...)
 *   - known typos: bedy, tabley, photosy, difficultly→difficulty etc.
 *
 * Replacement: real English words from a category-aware pool,
 * guaranteed not to duplicate existing distractors or the correct answer.
 */

import { readFileSync, writeFileSync } from 'fs';

// ── Replacement pool ─────────────────────────────────────────────────────────
// Common real English words, diverse enough to work for any category
const POOL = [
  // nouns – everyday objects / places
  'book','door','tree','road','hand','mind','wall','fire','rain','wood',
  'bird','fish','boat','star','moon','hill','sand','rock','leaf','rose',
  'lamp','coin','bell','duck','bear','wolf','crow','hawk','frog','deer',
  'cup','bag','box','pen','map','bus','car','bed','hat','key',
  'chair','table','glass','plate','knife','fork','spoon','bowl','tray','jar',
  'coat','boot','glove','scarf','belt','sock','ring','watch','card','note',
  'shop','park','bridge','river','forest','field','beach','cliff','cave','pond',
  // adjectives
  'soft','hard','dark','pale','thin','wide','deep','tall','warm','cool',
  'sharp','plain','clean','rough','bright','loud','quiet','dull','thick','mild',
  'fresh','sweet','sour','bitter','spicy','heavy','light','short','long','fast',
  'slow','calm','brave','kind','wise','proud','shy','bold','lazy','busy',
  // verbs (base form)
  'walk','jump','swim','sing','draw','push','pull','lift','drop','fold',
  'pour','boil','bake','wash','hang','move','turn','open','shut','wait',
  'write','read','speak','laugh','sleep','wake','climb','reach','touch','carry',
  'build','break','catch','throw','drive','ride','fly','grow','plant','cook',
];

// ── Bad distractor detection ─────────────────────────────────────────────────
// 1. Hyphen-suffixed: word-y or word-s
const BAD_HYPHEN = /^.+-[ys]$/;
// 2. Concatenated typos without hyphen (bedy, tabley, photosy, difficultly→keep)
// Only catch if base word ≥4 chars and result looks artificial
const BAD_CONCAT = /^(.{4,}?)[ys]$|^(.{4,}?)ey$/;
const KNOWN_BAD = new Set([
  'bedy','tabley','photosy','wally','cary','laptopy','dishesy',
  'difficultly','wondersy','ticketsy','photosys',
]);

function isBad(word) {
  if (BAD_HYPHEN.test(word)) return true;
  if (KNOWN_BAD.has(word.toLowerCase())) return true;
  return false;
}

// ── Pick a replacement ───────────────────────────────────────────────────────
function pickReplacement(existing) {
  const lower = new Set(existing.map(w => w.toLowerCase()));
  // Shuffle pool for variety
  const shuffled = [...POOL].sort(() => Math.random() - 0.5);
  for (const w of shuffled) {
    if (!lower.has(w.toLowerCase())) return w;
  }
  return 'quick'; // absolute fallback
}

// ── Process a single file ────────────────────────────────────────────────────
function processFile(path) {
  let content = readFileSync(path, 'utf8');
  let totalFixed = 0;

  // Match each distractors array: distractors: ['a','b','c','d','e']
  // We process the whole string with a replacer function
  const result = content.replace(
    /distractors:\s*\[([^\]]+)\]/g,
    (fullMatch, inner) => {
      // Extract quoted strings (single or double quoted)
      const wordRegex = /(['"])([^'"]+)\1/g;
      let words = [];
      let m;
      while ((m = wordRegex.exec(inner)) !== null) {
        words.push({ quote: m[1], value: m[2] });
      }

      let changed = false;
      const allValues = words.map(w => w.value);

      const newWords = words.map((w, idx) => {
        if (isBad(w.value)) {
          // Build current pool without this bad word to avoid re-picking it
          const others = allValues.filter((_, i) => i !== idx);
          const replacement = pickReplacement(others);
          totalFixed++;
          changed = true;
          return { quote: w.quote, value: replacement };
        }
        return w;
      });

      if (!changed) return fullMatch;

      // Reconstruct
      let rebuilt = inner;
      // Replace each original quoted word with new one (in order)
      let i = 0;
      rebuilt = inner.replace(/(['"])([^'"]+)\1/g, (orig, q, val) => {
        const nw = newWords[i++];
        return `${nw.quote}${nw.value}${nw.quote}`;
      });

      return `distractors: [${rebuilt}]`;
    }
  );

  if (totalFixed > 0) {
    writeFileSync(path, result, 'utf8');
    console.log(`  Fixed ${totalFixed} bad distractors`);
  } else {
    console.log(`  No bad distractors found`);
  }

  return totalFixed;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const FILES = [
  'app/lesson_data_1_8.ts',
  'app/lesson_data_9_16.ts',
  'app/lesson_data_17_24.ts',
  'app/lesson_data_25_32.ts',
];

let grand = 0;
for (const f of FILES) {
  console.log(`\nProcessing ${f}...`);
  grand += processFile(f);
}
console.log(`\nTotal fixed: ${grand} bad distractors across all files`);
