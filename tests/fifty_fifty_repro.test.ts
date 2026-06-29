import {
  getPerWordDistracts,
  getContractionFor,
  lookupContraction,
} from '../app/lesson1_smart_options';

// Regression for the "50/50 dims the correct tile" bug.
// Phrase lesson1_phrase_24 ("Ты добрый" = "You are kind"). Screenshot showed tiles
// [important, thick, long, thin, short, kind] with "kind" dimmed by 50/50.
const phrase = {
  id: 'lesson1_phrase_24',
  english: 'You are kind',
  russian: 'Ты добрый',
  words: [
    { text: 'You', correct: 'You', distractors: ['your', 'yew', 'youth', 'year', 'yore'], category: 'pronoun' },
    { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
    { text: 'kind', correct: 'kind', distractors: ['king', 'kids', 'kiss', 'mind', 'find'], category: 'adjective' },
  ],
};

const stripMarkers = (word: string): string => {
  const stripped = word
    .replace(/^\/|\/$/g, '')
    .replace(/«-»/g, '')
    .replace(/[«»]/g, '')
    .replace(/[.!?,;]+$/, '')
    .trim();
  return stripped === '-' ? '' : stripped;
};

const getPhraseTokens = (p: any): string[] => p.words.map((w: any) => w.correct ?? w.text);

// Mirror of the FIXED isCorrectOption computation in lesson1.tsx (~717-728):
// the genuine correct word is accepted in BOTH branches so a stale contrExpanded
// can never dim it.
function computeIsCorrect(
  word: string,
  contrExpanded: string[] | null,
  currentCorrectWord: string | null,
  currentValidContraction: string | null,
): boolean {
  const stripped = stripMarkers(word).toLowerCase();
  const expansionCorrect = contrExpanded !== null && contrExpanded.length > 0 ? contrExpanded[0] : null;
  return contrExpanded !== null
    ? (expansionCorrect != null && stripped === expansionCorrect.toLowerCase())
      || (currentCorrectWord != null && stripped === currentCorrectWord.toLowerCase())
    : currentCorrectWord != null && (
        stripped === currentCorrectWord.toLowerCase() ||
        (currentValidContraction != null && stripped === currentValidContraction.toLowerCase())
      );
}

describe('50/50 — correct tile is never dimmed (You are kind)', () => {
  const tokens = getPhraseTokens(phrase); // ["You","are","kind"]

  it('tiles for the final slot are exactly the screenshot tiles', () => {
    const opts = getPerWordDistracts(phrase, 2, 'en');
    expect(opts).toEqual(expect.arrayContaining(['important', 'thick', 'long', 'thin', 'short', 'kind']));
    expect(opts).toContain('kind');
  });

  it('normal state: exactly one correct tile (kind)', () => {
    const phraseWordIdx = 2;
    const currentCorrectWord = tokens[phraseWordIdx]; // "kind"
    const opts = getPerWordDistracts(phrase, phraseWordIdx, 'en');
    const correctCount = opts.filter(o => computeIsCorrect(o, null, currentCorrectWord, null)).length;
    expect(correctCount).toBe(1);
  });

  it('STALE contrExpanded leak: correct tile STILL flagged (the fix)', () => {
    // Before the fix this produced correctCount===0 → 50/50 dimmed "kind".
    const phraseWordIdx = 2;
    const leakedContrExpanded = ['are']; // stale carryover from a contraction phrase
    const currentCorrectWord = tokens[phraseWordIdx]; // "kind"
    const opts = getPerWordDistracts(phrase, phraseWordIdx, 'en');
    const correctCount = opts.filter(o => computeIsCorrect(o, leakedContrExpanded, currentCorrectWord, null)).length;
    expect(correctCount).toBe(1);
    const kindTile = opts.find(o => stripMarkers(o).toLowerCase() === 'kind')!;
    expect(computeIsCorrect(kindTile, leakedContrExpanded, currentCorrectWord, null)).toBe(true);
  });

  it('legitimate expansion mode is unchanged (don\'t → not)', () => {
    // In real expansion mode shuffled = expansion options for the 2nd token; the
    // original contraction ("don't") is NOT among them, so the added clause adds nothing.
    const expansionTiles = ['not', 'never', 'already', 'still', 'always', 'also'];
    const contrExpanded = ['not'];
    const currentCorrectWord = "don't"; // original contraction token, absent from tiles
    const flagged = expansionTiles.filter(o => computeIsCorrect(o, contrExpanded, currentCorrectWord, null));
    expect(flagged).toEqual(['not']); // only the expansion token, as before
  });

  it('picking "you\'re" directly keeps contrExpanded null (PATH A sanity)', () => {
    expect(getContractionFor(tokens[0], tokens[1])).toBe("you're");
    // lesson-1 tokens are never contraction keys, so expansion mode never legitimately fires here
    expect(lookupContraction(tokens[0])).toBeNull();
  });
});

describe('50/50 keeps half of ALL tiles (regression: removed 2 instead of 3)', () => {
  // Mirror of the FIXED dimCount math in lesson1.tsx onPress (~1391-1402).
  // keepCount = ceil(total/2) tiles stay (1 correct + rest wrong); dim the remainder.
  const dimCount = (totalTiles: number): number => {
    const wrongCount = totalTiles - 1; // exactly one correct tile in a slot
    const keepCount = Math.max(2, Math.ceil(totalTiles / 2)); // never strand the correct tile alone
    return Math.min(wrongCount, Math.max(0, totalTiles - keepCount));
  };

  it('removes exactly half, rounding the KEPT set up', () => {
    expect(dimCount(6)).toBe(3); // 6 tiles → keep 3, remove 3 (the bug removed only 2)
    expect(dimCount(5)).toBe(2); // 5 tiles → keep 3, remove 2
    expect(dimCount(4)).toBe(2); // 4 tiles → keep 2, remove 2
    expect(dimCount(7)).toBe(3); // 7 tiles → keep 4, remove 3
  });

  it('never dims more wrong tiles than exist (correct always survives)', () => {
    for (let total = 2; total <= 8; total += 1) {
      const removed = dimCount(total);
      const wrongCount = total - 1;
      expect(removed).toBeLessThanOrEqual(wrongCount); // never hides the lone correct tile
      expect(total - removed).toBeGreaterThanOrEqual(2); // at least correct + 1 wrong remain
    }
  });

  it('source uses total tile count, not wrong-tile count, for dimCount', () => {
    const fs = require('fs');
    const path = require('path');
    const source: string = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'lesson1.tsx'),
      'utf8',
    );
    // Guard against regressing to `Math.ceil(wrongIdx.length / 2)`.
    expect(source).toContain('const keepCount = Math.max(2, Math.ceil(totalTiles / 2))');
    expect(source).not.toMatch(/dimCount\s*=\s*Math\.ceil\(wrongIdx\.length\s*\/\s*2\)/);
  });
});

describe('50/50 dim resets when the tile bank changes', () => {
  const fs = require('fs');
  const path = require('path');
  const source: string = fs.readFileSync(
    path.join(__dirname, '..', 'app', 'lesson1.tsx'),
    'utf8',
  );

  it('reset effect depends on phraseWordIdx and shuffled, not only status', () => {
    // fiftyFiftyDimmed is a Set of tile INDICES. When the bank changes (next word
    // slot / reshuffle) those indices fall onto different tiles — including the
    // correct one — so the dim MUST be cleared on bank change, not only on status.
    const m = source.match(
      /setFiftyFiftyDimmed\(new Set\(\)\);\s*\n\s*\}, \[([^\]]*)\]\);/,
    );
    expect(m).not.toBeNull();
    const deps = m![1];
    expect(deps).toContain('phraseWordIdx');
    expect(deps).toContain('shuffled');
  });
});
