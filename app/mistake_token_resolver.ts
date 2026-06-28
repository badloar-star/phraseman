import { isUserFacingCategory, normalizeRawCategory, normalizeTokenKey, normalizeWordCategory, type WordCategory } from './pos_taxonomy';

export interface ResolvedMistakeToken {
  tokenText: string;
  tokenIndex: number;
  expected: string;
  picked?: string;
  rawCategory?: string;
}

function splitPhrase(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

function sameToken(a?: string, b?: string): boolean {
  return normalizeTokenKey(a) === normalizeTokenKey(b);
}

const AUX_VERBS = new Set([
  'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'used',
]);
const TO_BE_TOKENS = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);
const PHRASAL_PARTICLES = new Set(['up', 'down', 'out', 'in', 'on', 'off', 'away', 'back', 'over', 'through', 'around', 'along']);

function desiredCategoryFromRaw(rawCategory?: string): WordCategory | undefined {
  const resolved = normalizeWordCategory(rawCategory).category;
  return isUserFacingCategory(resolved) ? resolved : undefined;
}

function isClosedClass(category: WordCategory): boolean {
  return (
    category === 'pronoun' ||
    category === 'article' ||
    category === 'preposition' ||
    category === 'conjunction' ||
    category === 'modal' ||
    category === 'to-be'
  );
}

function scoreTokenForCategory(token: string, desired: WordCategory, rawCategory?: string): number {
  const key = normalizeTokenKey(token);
  if (!key) return 0;
  const rawKey = normalizeRawCategory(rawCategory);
  const plainCategory = normalizeWordCategory(undefined, key).category;
  if (plainCategory === desired) return 100;

  if (desired === 'to-be' && TO_BE_TOKENS.has(key)) return 100;
  if (desired === 'phrasal_particle' && PHRASAL_PARTICLES.has(key)) return 100;

  if (desired === 'verb') {
    if (AUX_VERBS.has(key)) return 90;
    if (/(ing|ed|en)$/.test(key)) return 82;
    if (/(present|past|future|perfect|continuous|gerund|passive|imperative|conditional|used_to|complex_object|povelitel|nakazov)/.test(rawKey)) {
      return isClosedClass(plainCategory) ? 0 : 62;
    }
  }

  if (desired === 'adjective') {
    if (/(er|est)$/.test(key)) return 86;
    if (/(comparison|comparative|superlative|sravnen|porivnian|stupeni)/.test(rawKey)) {
      return isClosedClass(plainCategory) ? 0 : 60;
    }
  }

  if (desired === 'noun' && plainCategory === 'other' && key.length > 2) return 45;
  return 0;
}

function bestCategoryTokenIndex(tokens: string[], rawCategory?: string, diffIndices = new Set<number>()): number {
  const desired = desiredCategoryFromRaw(rawCategory);
  if (!desired) return -1;
  let bestIndex = -1;
  let bestScore = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    const score = scoreTokenForCategory(tokens[i]!, desired, rawCategory) + (diffIndices.has(i) ? 8 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestScore >= 45 ? bestIndex : -1;
}

export function resolveSlotMistake(
  expectedPhrase: string,
  tokenIndex: number,
  picked?: string,
  rawCategory?: string,
): ResolvedMistakeToken | undefined {
  const expectedTokens = splitPhrase(expectedPhrase);
  const expected = expectedTokens[tokenIndex];
  if (!expected) return undefined;
  return {
    tokenText: expected,
    tokenIndex,
    expected,
    picked,
    rawCategory,
  };
}

export function resolvePhraseMistakeToken(
  expectedPhrase: string,
  actualPhrase?: string | null,
  rawCategory?: string,
): ResolvedMistakeToken | undefined {
  const expectedTokens = splitPhrase(expectedPhrase);
  if (expectedTokens.length === 0) return undefined;
  const actualTokens = splitPhrase(actualPhrase ?? '');

  for (let i = 0; i < expectedTokens.length; i += 1) {
    if (!sameToken(expectedTokens[i], actualTokens[i])) {
      return {
        tokenText: expectedTokens[i]!,
        tokenIndex: i,
        expected: expectedTokens[i]!,
        picked: actualTokens[i],
        rawCategory,
      };
    }
  }

  if (actualTokens.length > expectedTokens.length) {
    const lastIndex = expectedTokens.length - 1;
    return {
      tokenText: expectedTokens[lastIndex]!,
      tokenIndex: lastIndex,
      expected: expectedTokens[lastIndex]!,
      picked: actualTokens[expectedTokens.length],
      rawCategory,
    };
  }

  return undefined;
}

export interface MistakeDiffPair {
  expected: string;
  picked: string;
}

/**
 * Contractions expanded BEFORE diffing so a short form and its full form compare
 * as identical — otherwise "don't" vs "do not" shifts every following word by one
 * position and the positional diff invents false pairs (audit 2026-06-28). Keys are
 * normalized (lowercased, punctuation-stripped) to match {@link normalizeTokenKey}.
 */
const CONTRACTION_EXPANSIONS: Record<string, string[]> = {
  "don't": ['do', 'not'], "doesn't": ['does', 'not'], "didn't": ['did', 'not'],
  "isn't": ['is', 'not'], "aren't": ['are', 'not'], "wasn't": ['was', 'not'], "weren't": ['were', 'not'],
  "can't": ['can', 'not'], cannot: ['can', 'not'], "couldn't": ['could', 'not'], "won't": ['will', 'not'],
  "wouldn't": ['would', 'not'], "shouldn't": ['should', 'not'], "mustn't": ['must', 'not'],
  "haven't": ['have', 'not'], "hasn't": ['has', 'not'], "hadn't": ['had', 'not'],
  "i'm": ['i', 'am'], "you're": ['you', 'are'], "he's": ['he', 'is'], "she's": ['she', 'is'],
  "it's": ['it', 'is'], "we're": ['we', 'are'], "they're": ['they', 'are'],
  "i've": ['i', 'have'], "you've": ['you', 'have'], "we've": ['we', 'have'], "they've": ['they', 'have'],
  "i'll": ['i', 'will'], "you'll": ['you', 'will'], "he'll": ['he', 'will'], "she'll": ['she', 'will'],
  "we'll": ['we', 'will'], "they'll": ['they', 'will'],
  "i'd": ['i', 'would'], "you'd": ['you', 'would'], "let's": ['let', 'us'],
};

/** Token stream with every contraction replaced by its full-form words (normalized keys). */
function expandContractions(tokens: string[]): string[] {
  const out: string[] = [];
  for (const tok of tokens) {
    const key = normalizeTokenKey(tok);
    const full = CONTRACTION_EXPANSIONS[key];
    if (full) out.push(...full);
    else out.push(key);
  }
  return out;
}

/**
 * EVERY genuinely mismatched word pair between the correct phrase and the learner's
 * answer — not just the first. Feeds the AI breakdown so it can explain the WHOLE error.
 *
 * Alignment is via longest-common-subsequence over CONTRACTION-EXPANDED tokens, NOT by
 * raw position: a contraction (don't = do + not) or a missing/extra word no longer
 * shifts the whole tail and fabricates false pairs (audit 2026-06-28). A real
 * substitution surfaces as {expected, picked}; a missing word as {expected, picked:''};
 * an extra word as {expected:'', picked:''+word}. Equivalent phrases → empty list.
 */
export function resolveAllMistakeTokens(
  expectedPhrase: string,
  actualPhrase?: string | null,
): MistakeDiffPair[] {
  const expected = expandContractions(splitPhrase(expectedPhrase));
  const actual = expandContractions(splitPhrase(actualPhrase ?? ''));
  const n = expected.length;
  const m = actual.length;

  // LCS length table (dp[i][j] = LCS of expected[i:] and actual[j:]).
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i]![j] = expected[i] === actual[j]
        ? dp[i + 1]![j + 1]! + 1
        : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  // Backtrack into delete (expected-only) / insert (actual-only) operations.
  const ops: Array<{ type: 'del'; word: string } | { type: 'ins'; word: string }> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (expected[i] === actual[j]) {
      i += 1;
      j += 1;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      ops.push({ type: 'del', word: expected[i]! });
      i += 1;
    } else {
      ops.push({ type: 'ins', word: actual[j]! });
      j += 1;
    }
  }
  while (i < n) ops.push({ type: 'del', word: expected[i++]! });
  while (j < m) ops.push({ type: 'ins', word: actual[j++]! });

  // Pair an adjacent delete+insert as a substitution (the common "wrong word" case);
  // lone deletes are missing words, lone inserts are extra words.
  const pairs: MistakeDiffPair[] = [];
  for (let k = 0; k < ops.length; k += 1) {
    const cur = ops[k]!;
    const next = ops[k + 1];
    if (cur.type === 'del' && next && next.type === 'ins') {
      pairs.push({ expected: cur.word, picked: next.word });
      k += 1;
    } else if (cur.type === 'ins' && next && next.type === 'del') {
      pairs.push({ expected: next.word, picked: cur.word });
      k += 1;
    } else if (cur.type === 'del') {
      pairs.push({ expected: cur.word, picked: '' });
    } else {
      pairs.push({ expected: '', picked: cur.word });
    }
  }
  return pairs;
}

export function resolveChoiceMistakeToken(
  expectedPhrase: string,
  actualPhrase?: string | null,
  rawCategory?: string,
): ResolvedMistakeToken | undefined {
  const expectedTokens = splitPhrase(expectedPhrase);
  if (expectedTokens.length === 0) return undefined;
  const actualTokens = splitPhrase(actualPhrase ?? '');
  const diffIndices = new Set<number>();

  for (let i = 0; i < expectedTokens.length; i += 1) {
    if (!sameToken(expectedTokens[i], actualTokens[i])) diffIndices.add(i);
  }

  const categoryIndex = bestCategoryTokenIndex(expectedTokens, rawCategory, diffIndices);
  if (categoryIndex >= 0) {
    const expected = expectedTokens[categoryIndex]!;
    return {
      tokenText: expected,
      tokenIndex: categoryIndex,
      expected,
      picked: actualTokens[categoryIndex],
      rawCategory,
    };
  }

  return resolvePhraseMistakeToken(expectedPhrase, actualPhrase, rawCategory);
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
