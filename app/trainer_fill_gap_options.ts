import { WORD_POOLS_L1 } from './constants/word_pools';
import {
  normalizeTokenKey,
  normalizeWordCategory,
  type WordCategory,
} from './pos_taxonomy';
import type { RuntimeStudyTarget } from './target_storage_keys';

type FillGapOptionInput = {
  correctWord: string;
  phrase: string;
  category?: WordCategory;
  grammarTag?: string;
  sourceDistractors?: readonly string[];
  studyTarget?: RuntimeStudyTarget;
  optionCount?: number;
  shuffle?: boolean;
};

const FILL_GAP_OPTION_COUNT = 4;

const OBJECT_PRONOUNS = new Set(['me', 'you', 'him', 'her', 'us', 'them', 'it']);
const PLACE_SLOT_PREPOSITIONS = new Set(['in', 'at', 'to', 'from', 'near', 'inside', 'outside']);
const PLAUSIBLE_OBJECT_VERBS = new Set([
  'ask',
  'call',
  'contact',
  'do',
  'email',
  'help',
  'message',
  'phone',
  'show',
  'support',
  'teach',
  'tell',
  'text',
  'visit',
]);
const IRREGULAR_LEMMAS: Record<string, string> = {
  did: 'do',
  does: 'do',
  done: 'do',
  gave: 'give',
  gives: 'give',
  got: 'get',
  has: 'have',
  had: 'have',
  made: 'make',
  makes: 'make',
  saw: 'see',
  sees: 'see',
  took: 'take',
  takes: 'take',
  told: 'tell',
  tells: 'tell',
};
const PLACE_NOUNS = new Set([
  ...WORD_POOLS_L1.places.map((word) => normalizeTokenKey(word)),
  'airport',
  'bank',
  'bathroom',
  'bedroom',
  'cafe',
  'city',
  'classroom',
  'country',
  'home',
  'hospital',
  'hotel',
  'house',
  'kitchen',
  'office',
  'park',
  'restaurant',
  'room',
  'school',
  'shop',
  'station',
  'store',
]);

const CATEGORY_POOLS: Record<WordCategory, readonly string[]> = {
  verb: WORD_POOLS_L1.verbs,
  noun: [
    ...WORD_POOLS_L1.nouns,
    ...WORD_POOLS_L1.people,
    ...WORD_POOLS_L1.places,
    ...WORD_POOLS_L1.objects,
    ...WORD_POOLS_L1.timeUnits,
  ],
  pronoun: WORD_POOLS_L1.pronouns,
  adjective: WORD_POOLS_L1.adjectives,
  adverb: WORD_POOLS_L1.adverbs,
  modifier: ['very', 'really', 'quite', 'too', 'enough', 'so', 'such'],
  preposition: WORD_POOLS_L1.prepositions,
  syntax: [
    'do',
    'does',
    'did',
    'is',
    'are',
    'was',
    'were',
    'have',
    'has',
    'had',
    'will',
    'would',
    'can',
    'could',
  ],
  determiner: [
    'some',
    'any',
    'no',
    'many',
    'much',
    'few',
    'little',
    'this',
    'that',
    'these',
    'those',
    'each',
    'every',
    'all',
    'both',
  ],
  existential: ['there', 'here', 'it', 'this'],
  article: ['a', 'an', 'the'],
  'to-be': WORD_POOLS_L1.toBe,
  conjunction: WORD_POOLS_L1.conjunctions,
  modal: WORD_POOLS_L1.modals,
  phrasal_particle: ['up', 'off', 'out', 'on', 'back', 'away', 'down', 'over', 'in', 'through'],
  other: [
    ...WORD_POOLS_L1.verbs,
    ...WORD_POOLS_L1.nouns,
    ...WORD_POOLS_L1.adjectives,
    ...WORD_POOLS_L1.adverbs,
    ...WORD_POOLS_L1.prepositions,
    ...WORD_POOLS_L1.modals,
  ],
};

function phraseWordKeys(phrase: string): Set<string> {
  return new Set(
    phrase
      .split(/\s+/)
      .map((word) => normalizeTokenKey(word))
      .filter(Boolean),
  );
}

function uniqueCandidates(
  pools: readonly (readonly string[])[],
  correctKey: string,
  blockedKeys: Set<string>,
  limit: number,
  category: WordCategory,
  context: FillGapSlotContext,
  diversifyFallbackInflections = false,
): string[] {
  const picked: string[] = [];
  const seen = new Set<string>();
  const seenFallbackLemmas = new Set<string>([simpleLemma(correctKey)]);

  for (const pool of pools) {
    const shouldDiversifyPool = diversifyFallbackInflections;
    for (const candidate of pool) {
      const key = normalizeTokenKey(candidate);
      if (!key || key === correctKey || blockedKeys.has(key) || seen.has(key)) continue;
      if (isLikelyAlsoValidInSlot(key, category, context)) continue;
      const lemma = simpleLemma(key);
      if (shouldDiversifyPool && seenFallbackLemmas.has(lemma)) continue;
      seen.add(key);
      if (shouldDiversifyPool) seenFallbackLemmas.add(lemma);
      picked.push(candidate);
      if (picked.length >= limit) return picked;
    }
  }

  return picked;
}

interface FillGapSlotContext {
  previous?: string;
  previous2?: string;
  next?: string;
}

function fillGapSlotContext(phrase: string, correctKey: string): FillGapSlotContext {
  const tokens = phrase
    .split(/\s+/)
    .map((word) => normalizeTokenKey(word))
    .filter(Boolean);
  const index = tokens.findIndex((token) => token === correctKey);
  if (index < 0) return {};
  return {
    previous: tokens[index - 1],
    previous2: tokens[index - 2],
    next: tokens[index + 1],
  };
}

function isLikelyAlsoValidInSlot(candidateKey: string, category: WordCategory, context: FillGapSlotContext): boolean {
  const lemma = simpleLemma(candidateKey);
  if (category === 'verb' && context.next && OBJECT_PRONOUNS.has(context.next)) {
    return PLAUSIBLE_OBJECT_VERBS.has(lemma);
  }
  if (category === 'noun' && context.previous === 'the' && context.previous2 && PLACE_SLOT_PREPOSITIONS.has(context.previous2)) {
    return PLACE_NOUNS.has(lemma);
  }
  return false;
}

function simpleLemma(value: string): string {
  const key = normalizeTokenKey(value);
  if (IRREGULAR_LEMMAS[key]) return IRREGULAR_LEMMAS[key];
  if (key.endsWith('ies') && key.length > 4) return `${key.slice(0, -3)}y`;
  if (key.endsWith('ied') && key.length > 4) return `${key.slice(0, -3)}y`;
  if (key.endsWith('ing') && key.length > 5) {
    const stem = key.slice(0, -3);
    if (stem.endsWith(stem.at(-2) ?? '')) return stem.slice(0, -1);
    return stem;
  }
  if (key.endsWith('ed') && key.length > 4) {
    const stem = key.slice(0, -2);
    if (stem.endsWith(stem.at(-2) ?? '')) return stem.slice(0, -1);
    return stem;
  }
  if (key.endsWith('es') && key.length > 4) return key.slice(0, -2);
  if (key.endsWith('s') && key.length > 3 && !key.endsWith('ss')) return key.slice(0, -1);
  return key;
}

function shuffleOptions(options: string[], shouldShuffle: boolean): string[] {
  return shouldShuffle ? [...options].sort(() => Math.random() - 0.5) : options;
}

export function buildTrainerFillGapOptions({
  correctWord,
  phrase,
  category,
  grammarTag,
  sourceDistractors,
  optionCount = FILL_GAP_OPTION_COUNT,
  shuffle = true,
}: FillGapOptionInput): string[] {
  const correct = correctWord.trim();
  if (!correct) return [];

  const correctKey = normalizeTokenKey(correct);
  const resolvedCategory = category ?? normalizeWordCategory(grammarTag, correct).category;
  const primaryPool = CATEGORY_POOLS[resolvedCategory] ?? CATEGORY_POOLS.other;
  const fallbackPool = resolvedCategory === 'other' ? [] : CATEGORY_POOLS.other;
  const blockedKeys = phraseWordKeys(phrase);
  const context = fillGapSlotContext(phrase, correctKey);
  const distractorCount = Math.max(1, optionCount - 1);
  const distractors = uniqueCandidates(
    [sourceDistractors ?? [], primaryPool, fallbackPool],
    correctKey,
    blockedKeys,
    distractorCount,
    resolvedCategory,
    context,
    true,
  );

  if (distractors.length === 0) return [correct];
  return shuffleOptions([correct, ...distractors], shuffle);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
