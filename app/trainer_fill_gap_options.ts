import { WORD_POOLS_L1 } from './constants/word_pools';
import {
  normalizeTokenKey,
  normalizeWordCategory,
  type WordCategory,
} from './pos_taxonomy';
import type { RuntimeStudyTarget } from './target_storage_keys';
import { shuffle } from './utils_shuffle';

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
const INDEFINITE_SUBJECT_PRONOUNS = new Set([
  'someone', 'anyone', 'everyone', 'nobody',
  'somebody', 'anybody', 'everybody',
]);
const SUBJECT_CAPABLE_PRONOUNS = new Set([
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those',
  ...INDEFINITE_SUBJECT_PRONOUNS,
]);
const MODAL_WORDS = new Set([
  'can', 'cannot', "can't", 'could', 'will', 'would', 'shall', 'should',
  'may', 'might', 'must', 'need', 'dare', 'ought',
]);
const ARTICLE_OR_DEMONSTRATIVE_WORDS = new Set([
  'a', 'an', 'the', 'this', 'that', 'these', 'those',
]);
const INVALID_MODAL_SLOT_FILLERS = ['is', 'does', 'has', 'are', 'was', 'were'] as const;
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
// ── Subject–verb agreement for pronoun gaps ──────────────────────────────────
// When the gap is a subject pronoun ("____ doesn't have an umbrella"), any other
// pronoun that agrees with the SAME following verb is an alternative correct
// answer, not a distractor (he/she/it/this/that all fit "____ doesn't have").
// We classify the following verb into an agreement group and drop candidate
// pronouns that share the correct answer's group. With tense-neutral verbs
// (Past Simple, modals), every nominative subject is interchangeable and is
// therefore rejected as a distractor.
type PronounAgreement = 'third_singular' | 'plural';

// Subject pronouns whose verb agreement we reason about. "you" is intentionally
// in BOTH groups via the plural set (you take/are), and "I" pairs with plural
// present verbs (I take/have) but with "was" — handled per-verb below.
const THIRD_SINGULAR_SUBJECTS = new Set(['he', 'she', 'it', 'this', 'that']);
const PLURAL_SUBJECTS = new Set(['i', 'you', 'we', 'they', 'these', 'those']);
const SUBJECT_PRONOUNS = SUBJECT_CAPABLE_PRONOUNS;

// Auxiliaries / copulas whose agreement is unambiguous from the surface form.
const THIRD_SINGULAR_VERBS = new Set([
  'is', "isn't", 'was', "wasn't",
  'does', "doesn't",
  'has', "hasn't",
]);
const PLURAL_PRESENT_VERBS = new Set([
  'are', "aren't", 'were', "weren't",
  'do', "don't",
  'have', "haven't",
]);

// Lexical present-tense 3rd-person-singular ("-s") verbs agree with he/she/it.
// Conservative: require a real "-s" ending that is not a known non-verb token.
function lexicalVerbAgreement(verbKey: string): PronounAgreement | null {
  if (!verbKey) return null;
  if (THIRD_SINGULAR_VERBS.has(verbKey)) return 'third_singular';
  if (PLURAL_PRESENT_VERBS.has(verbKey)) return 'plural';
  return null;
}

function pronounSubjectGroup(pronounKey: string): PronounAgreement | null {
  if (INDEFINITE_SUBJECT_PRONOUNS.has(pronounKey)) return 'third_singular';
  if (THIRD_SINGULAR_SUBJECTS.has(pronounKey)) return 'third_singular';
  if (PLURAL_SUBJECTS.has(pronounKey)) return 'plural';
  return null;
}

// зачем: категорийные пулы (adjectives/adverbs/verbs) заполняют недостающие
// дистракторы словами того же типа речи, но некоторые пары внутри пула —
// почти синонимы (awful/terrible, happy/glad) и одинаково подходят по смыслу,
// из-за чего юзер видит два "правильных на вид" варианта. Кластеры ниже — это
// курируемый список близких синонимов среди слов, которые реально есть в
// WORD_POOLS_L1 (adjectives/adverbs/verbs), не общий словарь синонимов.
const SYNONYM_CLUSTERS: readonly (readonly string[])[] = [
  ['happy', 'glad', 'pleased'],
  ['big', 'large', 'huge'],
  ['small', 'little', 'tiny'],
  ['fast', 'quick', 'rapid'],
  ['sad', 'upset', 'unhappy'],
  ['good', 'great', 'nice'],
  ['bad', 'terrible', 'awful'],
  ['easy', 'simple'],
  ['hard', 'difficult', 'tough'],
  ['tired', 'exhausted'],
  ['scared', 'afraid', 'frightened'],
  ['angry', 'mad', 'furious'],
  ['smart', 'clever', 'intelligent'],
  ['beautiful', 'lovely', 'gorgeous'],
  ['important', 'significant'],
  ['quickly', 'rapidly', 'fast'],
  ['often', 'frequently'],
  ['always', 'constantly'],
  ['buy', 'purchase', 'get'],
  ['begin', 'start'],
  ['finish', 'complete', 'end'],
  ['show', 'demonstrate'],
  ['help', 'assist'],
  ['want', 'wish', 'desire'],
  ['like', 'enjoy', 'love'],
];

const SYNONYM_CLUSTER_BY_WORD: Map<string, number> = new Map();
SYNONYM_CLUSTERS.forEach((cluster, clusterIndex) => {
  cluster.forEach((word) => {
    SYNONYM_CLUSTER_BY_WORD.set(normalizeTokenKey(word), clusterIndex);
  });
});

function isSynonymOfCorrect(candidateKey: string, correctKey: string): boolean {
  const candidateCluster = SYNONYM_CLUSTER_BY_WORD.get(candidateKey);
  if (candidateCluster === undefined) return false;
  return SYNONYM_CLUSTER_BY_WORD.get(correctKey) === candidateCluster;
}

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
      if (isLikelyAlsoValidInSlot(key, correctKey, category, context)) continue;
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

function isLikelyAlsoValidInSlot(candidateKey: string, correctKey: string, category: WordCategory, context: FillGapSlotContext): boolean {
  const lemma = simpleLemma(candidateKey);
  // зачем: близкий синоним верного слова одинаково хорошо подходит по смыслу в
  // любом контексте — это не дистрактор, а второй "правильный" ответ, который
  // путает юзера. Проверяем ДО остальных category-specific правил и для всех
  // content-word категорий (verb/noun/adjective/adverb), т.к. кластеры выше
  // покрывают именно эти части речи.
  if (
    (category === 'verb' || category === 'noun' || category === 'adjective' || category === 'adverb') &&
    isSynonymOfCorrect(candidateKey, correctKey)
  ) {
    return true;
  }
  if (category === 'verb' && context.next && OBJECT_PRONOUNS.has(context.next)) {
    return PLAUSIBLE_OBJECT_VERBS.has(lemma);
  }
  if (category === 'noun' && context.previous === 'the' && context.previous2 && PLACE_SLOT_PREPOSITIONS.has(context.previous2)) {
    return PLACE_NOUNS.has(lemma);
  }
  // Other modals create valid sentences with different meanings
  // (can/could/will/would), so they are not honest wrong answers.
  if (category === 'modal' && MODAL_WORDS.has(candidateKey)) return true;
  // Articles and demonstratives often differ only by intended reference:
  // "the/this/that food" can all be grammatical.
  if (category === 'article' && ARTICLE_OR_DEMONSTRATIVE_WORDS.has(candidateKey)) return true;
  // Subject-pronoun gap ("____ doesn't have an umbrella"): drop candidate
  // pronouns that agree with the SAME following verb as the correct answer —
  // they are alternative correct answers, not distractors. Only constrain when
  // the gap is sentence-initial (a real subject slot) and the following verb's
  // agreement is unambiguous; tense-neutral verbs (past simple, modals) drop
  // through and every pronoun stays a valid distractor.
  if (
    category === 'pronoun' &&
    !context.previous && // subject position: nothing before the gap
    context.next &&
    SUBJECT_PRONOUNS.has(candidateKey) &&
    SUBJECT_PRONOUNS.has(correctKey)
  ) {
    const verbAgreement = lexicalVerbAgreement(context.next);
    // Past Simple and other agreement-neutral forms accept every nominative
    // subject, so every alternative subject is equally grammatical.
    if (!verbAgreement) return true;
    if (verbAgreement) {
      const correctGroup = pronounSubjectGroup(correctKey);
      const candidateGroup = pronounSubjectGroup(candidateKey);
      // Both the answer and the candidate agree with this verb → interchangeable.
      return correctGroup === verbAgreement && candidateGroup === verbAgreement;
    }
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
  return shouldShuffle ? shuffle(options) : options;
}

function alignOptionInitialCase(options: readonly string[], correctWord: string): string[] {
  const first = correctWord[0];
  if (!first) return [...options];
  const hasLetterCase = first.toLocaleLowerCase() !== first.toLocaleUpperCase();
  if (!hasLetterCase) return [...options];

  const useUppercase = first === first.toLocaleUpperCase();
  return options.map((option) => {
    const optionFirst = option[0];
    if (!optionFirst) return option;
    const alignedFirst = useUppercase
      ? optionFirst.toLocaleUpperCase()
      : optionFirst.toLocaleLowerCase();
    return `${alignedFirst}${option.slice(1)}`;
  });
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
    [
      sourceDistractors ?? [],
      primaryPool,
      ...(resolvedCategory === 'modal' ? [INVALID_MODAL_SLOT_FILLERS] : []),
      fallbackPool,
    ],
    correctKey,
    blockedKeys,
    distractorCount,
    resolvedCategory,
    context,
    true,
  );

  if (distractors.length === 0) return [correct];
  const caseAlignedOptions = alignOptionInitialCase([correct, ...distractors], correct);
  return shuffleOptions(caseAlignedOptions, shuffle);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
