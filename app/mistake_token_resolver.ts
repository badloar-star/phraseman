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
