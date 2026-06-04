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
): string[] {
  const picked: string[] = [];
  const seen = new Set<string>();

  for (const pool of pools) {
    for (const candidate of pool) {
      const key = normalizeTokenKey(candidate);
      if (!key || key === correctKey || blockedKeys.has(key) || seen.has(key)) continue;
      seen.add(key);
      picked.push(candidate);
      if (picked.length >= limit) return picked;
    }
  }

  return picked;
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
  const distractorCount = Math.max(1, optionCount - 1);
  const distractors = uniqueCandidates(
    [sourceDistractors ?? [], primaryPool, fallbackPool],
    correctKey,
    blockedKeys,
    distractorCount,
  );

  if (distractors.length === 0) return [correct];
  return shuffleOptions([correct, ...distractors], shuffle);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
