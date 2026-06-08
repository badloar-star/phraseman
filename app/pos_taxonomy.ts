import { WORD_POOLS_L1 } from './constants/word_pools';

export type WordCategory =
  | 'verb'
  | 'noun'
  | 'pronoun'
  | 'adjective'
  | 'adverb'
  | 'modifier'
  | 'preposition'
  | 'syntax'
  | 'determiner'
  | 'existential'
  | 'article'
  | 'to-be'
  | 'conjunction'
  | 'modal'
  | 'phrasal_particle'
  | 'other';

export const WORD_CATEGORIES: readonly WordCategory[] = [
  'verb', 'noun', 'pronoun', 'adjective', 'adverb', 'modifier', 'preposition',
  'syntax', 'determiner', 'existential', 'article', 'to-be', 'conjunction',
  'modal', 'phrasal_particle', 'other',
];

const WORD_CATEGORY_SET: ReadonlySet<string> = new Set(WORD_CATEGORIES);

/**
 * True when `value` is an actual part-of-speech category. Grammar tags such as
 * `present_perfect` or `word_order` are NOT word categories and must not be fed
 * into the rawCategory slot of normalizeWordCategory (they would be regex-coerced
 * into a fabricated POS). Use this to keep grammar tags and POS separate.
 */
export function isWordCategory(value: unknown): value is WordCategory {
  return typeof value === 'string' && WORD_CATEGORY_SET.has(value);
}

export type CategorySource = 'closed_class' | 'raw_category' | 'word_pool' | 'suffix' | 'unknown';

export interface CategoryResolution {
  category: WordCategory;
  grammarTag?: string;
  source: CategorySource;
  confidence: number;
}

const ARTICLES = new Set(['a', 'an', 'the']);
const DETERMINERS = new Set([
  'some', 'any', 'no', 'none', 'many', 'much', 'few', 'little', 'several',
  'enough', 'each', 'every', 'all', 'both', 'either', 'neither', 'another',
  'other', 'such', 'what', 'which', 'whose', 'this', 'that', 'these', 'those',
]);
const TO_BE = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', "isn\'t", "aren\'t", "wasn\'t", "weren\'t"]);
const MODALS = new Set(['can', 'cannot', "can\'t", 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'need', 'dare', 'ought']);
const PRONOUNS = new Set([
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
  'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'yourselves', 'themselves',
  'who', 'whom', 'which', 'that', 'what', 'this', 'these', 'those', 'someone', 'anyone',
  'everyone', 'somebody', 'anybody', 'everybody', 'nobody', 'no one', 'something',
  'anything', 'everything', 'nothing',
]);
const CONJUNCTIONS = new Set([
  'and', 'but', 'or', 'nor', 'so', 'yet', 'for', 'because', 'although', 'though',
  'while', 'when', 'if', 'unless', 'until', 'since', 'after', 'before', 'as', 'than',
  'whether', 'whereas', 'however', 'therefore',
]);
const PREPOSITIONS = new Set([
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'into', 'onto', 'about',
  'above', 'below', 'between', 'behind', 'beside', 'under', 'over', 'through', 'during',
  'before', 'after', 'near', 'without', 'against', 'around', 'among', 'along', 'across',
  'off', 'out', 'up', 'down', 'inside', 'outside', 'opposite', 'past', 'next',
]);
const ADVERBS = new Set([
  'there', 'here', 'now', 'then', 'not', 'never', 'always', 'often', 'still', 'already',
  'just', 'very', 'really', 'quite', 'soon', 'today', 'yesterday', 'tomorrow', 'right',
  'again', 'also', 'too', 'well', 'loudly', 'slowly', 'quickly', 'carefully', 'finally',
  'suddenly', 'recently', 'sometimes', 'usually', 'immediately', 'away', 'back',
  'why', 'where', 'when', 'how', 'much', 'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'may',
  'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'noon', 'morning', 'evening', 'night', 'midnight', 'tonight', 'ago', 'online',
]);

const COMMON_VERBS = new Set([
  'sell', 'waste', 'carry', 'skip', 'cry', 'watch', 'take', 'buy', 'pay', 'cost', 'open',
  'close', 'start', 'finish', 'choose', 'bring', 'send', 'show', 'move', 'change', 'wait',
  'ask', 'answer', 'need', 'use', 'turn', 'stay', 'leave', 'arrive', 'travel', 'drive',
  'keep', 'find', 'meet', 'check', 'wear', 'put', 'leave', 'leaves', 'left', 'rest',
  'sleep', 'walk', 'feel', 'felt', 'hear', 'heard', 'hurt', 'let', 'hate', 'learn',
  'teach', 'understand', 'wake', 'fix', 'forget', 'forgot', 'lose', 'lost', 'avoid',
  'blame', 'control', 'touch', 'sold', 'smoke', 'announce', 'believe', 'burn',
  'care', 'clean', 'demand', 'drain', 'drop', 'face', 'force', 'guard', 'guide',
  'hit', 'inspect', 'invite', 'judge', 'jump', 'keep', 'kept', 'paint', 'perform',
  'pierce', 'protect', 'push', 'ring', 'rang', 'remind', 'restart', 'rewrite',
  'shake', 'shout', 'strike', 'talk', 'thank', 'trust', 'wear', 'wore',
  'know', 'knew', 'known', 'help', 'helped', 'call', 'called', 'vibrate',
]);

const COMMON_NOUNS = new Set([
  'money', 'cash', 'tv', 'breakfast', 'ticket', 'tickets', 'time', 'price', 'prices',
  'shop', 'store', 'market', 'station', 'airport', 'train', 'bus', 'taxi', 'hotel',
  'room', 'kitchen', 'bathroom', 'water', 'coffee', 'tea', 'food', 'phone', 'message',
  'app', 'apps', 'exit', 'exits', 'guest', 'guests', 'mail', 'groceries', 'meeting',
  'meetings', 'luggage', 'route', 'routes', 'bill', 'bills', 'cafe', 'cafés', 'wi-fi',
  'charger', 'chargers', 'lunch', 'rent', 'birthday', 'password', 'place', 'way',
  'engine', 'hand', 'job', 'lesson', 'story', 'wind', 'arm', 'base', 'body',
  'branch', 'bread', 'brick', 'briefcase', 'button', 'cake', 'candidate', 'cart',
  'chocolate', 'couple', 'dog', 'earth', 'earthquake', 'emergency', 'employee',
  'envelope', 'fence', 'flight', 'gold', 'group', 'hair', 'heat', 'hill', 'horse',
  'inbox', 'jazz', 'juice', 'knee', 'laboratory', 'landlord', 'medicine', 'melody',
  'movie', 'needle', 'object', 'procedure', 'quota', 'raindrop', 'refund', 'secret',
  'skin', 'slot', 'soup', 'square', 'steam', 'storm', 'street', 'sunlight', 'tenant',
  'test', 'tree', 'trunk', 'truth', 'verdict',
]);

const COMMON_ADJECTIVES = new Set([
  'last', 'every', 'no', 'many', 'cold', 'huge', 'okay', 'cheapest', 'empty', 'heavy',
  'hot', 'lazy', 'some', 'shy', 'afraid', 'ancient', 'angry', 'bare', 'dirty',
  'done', 'easiest', 'fastest', 'fine', 'firm', 'foreign', 'hardest', 'immediate',
  'little', 'noisy', 'pale', 'sad', 'safest', 'simple', 'slowest', 'solar', 'stray',
  'unknown', 'warm', 'whole', 'wild',
]);

const COMMON_ADVERBS = new Set(['o\'clock', 'yes']);

const RAW_CATEGORY_ALIASES: Record<string, WordCategory> = {
  verb: 'verb',
  verbs: 'verb',
  verbo: 'verb',
  verbos: 'verb',
  verbo_estar: 'verb',
  verbo_ser: 'verb',
  verbo_tener: 'verb',
  verbo_modal: 'modal',
  verbo_reflexivo: 'verb',
  verbo_continuo: 'verb',
  verbe_avoir: 'verb',
  verbe_aller: 'verb',
  verb_present: 'verb',
  reflexive_aux: 'verb',
  object_aux: 'verb',
  imperative: 'verb',
  negative_imperative: 'verb',
  verb_continuous: 'verb',
  continuous_verb: 'verb',
  irregular_verb: 'verb',
  irregular_verbs: 'verb',
  regular_verb: 'verb',
  regular_verbs: 'verb',
  infinitive: 'verb',
  gerund: 'verb',
  infinitive_gerund: 'verb',
  infinitive_vs_gerund: 'verb',
  gerund_infinitive: 'verb',
  imperativo: 'verb',
  exhortativo: 'verb',
  futuro_simple: 'verb',

  noun: 'noun',
  nouns: 'noun',
  sustantivo: 'noun',
  sustantivos: 'noun',
  imennik: 'noun',

  pronoun: 'pronoun',
  pronouns: 'pronoun',
  pronombre: 'pronoun',
  pronombres: 'pronoun',
  object_pronoun: 'pronoun',
  posesivo: 'pronoun',
  possessive: 'pronoun',
  possessive_pronoun: 'pronoun',
  interrogativo: 'pronoun',

  adjective: 'adjective',
  adjectives: 'adjective',
  adj: 'adjective',
  adjetivo: 'adjective',
  adjetivos: 'adjective',
  comparativo: 'adjective',
  superlativo: 'adjective',

  adverb: 'adverb',
  adverbs: 'adverb',
  adverbio: 'adverb',
  adverbios: 'adverb',
  negacion: 'adverb',
  negation: 'adverb',
  negacion_afirmacion: 'adverb',
  lexico_temporal: 'adverb',

  modifier: 'modifier',
  modifiers: 'modifier',
  degree_modifier: 'modifier',
  too_enough: 'modifier',
  too_enough_modifier: 'modifier',
  very_really_quite: 'modifier',
  modifier_very_really_quite: 'modifier',
  degree_intensifier: 'modifier',

  preposition: 'preposition',
  prepositions: 'preposition',
  preposicion: 'preposition',
  preposiciones: 'preposition',

  syntax: 'syntax',
  word_order: 'syntax',
  basic_word_order: 'syntax',
  statement_word_order: 'syntax',
  question_order: 'syntax',
  question_word_order: 'syntax',
  basic_question_order: 'syntax',
  object_order: 'syntax',
  double_object: 'syntax',
  indirect_object: 'syntax',
  sentence_order: 'syntax',
  sentence_part_order: 'syntax',
  svo: 'syntax',

  article: 'article',
  articles: 'article',
  articulo: 'article',
  articulos: 'article',
  determiner: 'determiner',
  determiners: 'determiner',
  quantifier: 'determiner',
  quantifiers: 'determiner',
  demonstrative: 'determiner',
  demonstratives: 'determiner',
  demonstrative_determiner: 'determiner',
  demostrativo: 'determiner',
  existential: 'existential',
  existentials: 'existential',
  existencial: 'existential',
  hay: 'existential',
  there_is: 'existential',
  there_are: 'existential',

  'to-be': 'to-be',
  to_be: 'to-be',
  verbe_être: 'to-be',
  verbe_etre: 'to-be',
  be: 'to-be',

  modal: 'modal',
  modals: 'modal',
  modal_verb: 'modal',
  modal_verbs: 'modal',
  modal_pouvoir: 'modal',
  modal_savoir: 'modal',
  modal_devoir: 'modal',
  modal_devoir_conditionnel: 'modal',

  conjunction: 'conjunction',
  conjunctions: 'conjunction',
  conjuncion: 'conjunction',
  conjunciones: 'conjunction',

  particle: 'phrasal_particle',
  particles: 'phrasal_particle',
  phrasal_particle: 'phrasal_particle',
  phrasal_particles: 'phrasal_particle',

  punctuation: 'other',
  puntuacion: 'other',
};

const RAW_CATEGORY_FALLBACKS: Record<string, WordCategory> = {
  lexico_oracion: 'noun',
};

function toWordSet(values: readonly string[]): Set<string> {
  return new Set(values.map((v) => normalizeTokenKey(v)).filter(Boolean));
}

const POOL_SETS: Array<{ category: WordCategory; words: Set<string> }> = [
  { category: 'pronoun', words: toWordSet(WORD_POOLS_L1.pronouns) },
  { category: 'to-be', words: toWordSet(WORD_POOLS_L1.toBe) },
  { category: 'modal', words: toWordSet(WORD_POOLS_L1.modals) },
  { category: 'verb', words: toWordSet([...WORD_POOLS_L1.verbs, ...WORD_POOLS_L1.gerund, ...WORD_POOLS_L1.have]) },
  { category: 'noun', words: toWordSet([...WORD_POOLS_L1.nouns, ...WORD_POOLS_L1.objects, ...WORD_POOLS_L1.people, ...WORD_POOLS_L1.places, ...WORD_POOLS_L1.jobs, ...WORD_POOLS_L1.timeUnits]) },
  { category: 'adjective', words: toWordSet([...WORD_POOLS_L1.adjectives, ...WORD_POOLS_L1.comparison]) },
  { category: 'modifier', words: toWordSet(['too', 'enough', 'too much', 'too many', 'not enough', 'very', 'really', 'quite']) },
  { category: 'adverb', words: toWordSet([...WORD_POOLS_L1.adverbs, ...WORD_POOLS_L1.there]) },
  { category: 'determiner', words: toWordSet(['some', 'any', 'no', 'many', 'much', 'few', 'little', 'several', 'each', 'every', 'all', 'both', 'enough', 'this', 'that', 'these', 'those']) },
  { category: 'article', words: toWordSet(WORD_POOLS_L1.articles) },
  { category: 'preposition', words: toWordSet(WORD_POOLS_L1.prepositions) },
  { category: 'conjunction', words: toWordSet(WORD_POOLS_L1.conjunctions) },
];

export function normalizeRawCategory(raw?: string | null): string {
  return (raw ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizeTokenKey(word?: string | null): string {
  return (word ?? '')
    .toLowerCase()
    .replace(/^\/|\/$/g, '')
    .replace(/[«»]/g, '')
    .replace(/[.!?,;:¿¡"()[\]{}]+$/g, '')
    .replace(/^[.!?,;:¿¡"()[\]{}]+/g, '')
    .trim();
}

function closedClassCategory(wordKey: string): CategoryResolution | null {
  if (!wordKey) return null;
  if (DETERMINERS.has(wordKey)) {
    return { category: 'determiner', grammarTag: 'determiner_quantifier', source: 'closed_class', confidence: 0.98 };
  }
  if (ARTICLES.has(wordKey)) {
    return {
      category: 'article',
      grammarTag: wordKey === 'the' ? 'article_definite' : 'article_indefinite',
      source: 'closed_class',
      confidence: 1,
    };
  }
  if (TO_BE.has(wordKey)) return { category: 'to-be', grammarTag: 'to_be', source: 'closed_class', confidence: 1 };
  if (MODALS.has(wordKey)) return { category: 'modal', grammarTag: 'modal_verb', source: 'closed_class', confidence: 1 };
  if (PRONOUNS.has(wordKey)) return { category: 'pronoun', source: 'closed_class', confidence: 0.98 };
  if (CONJUNCTIONS.has(wordKey)) return { category: 'conjunction', source: 'closed_class', confidence: 0.98 };
  if (PREPOSITIONS.has(wordKey)) return { category: 'preposition', source: 'closed_class', confidence: 0.92 };
  if (ADVERBS.has(wordKey)) return { category: 'adverb', source: 'closed_class', confidence: 0.9 };
  return null;
}

function poolCategory(wordKey: string): CategoryResolution | null {
  if (!wordKey) return null;
  for (const pool of POOL_SETS) {
    if (pool.words.has(wordKey)) return { category: pool.category, source: 'word_pool', confidence: 0.82 };
  }
  return null;
}

function suffixCategory(wordKey: string): CategoryResolution | null {
  if (!wordKey || wordKey.length < 4) return null;
  if (/(ing|ed|en|ize|ise|fy)$/.test(wordKey)) return { category: 'verb', source: 'suffix', confidence: 0.55 };
  if (/(ly)$/.test(wordKey)) return { category: 'adverb', source: 'suffix', confidence: 0.55 };
  if (/(ous|ful|less|able|ible|al|ive|ic|ish)$/.test(wordKey)) return { category: 'adjective', source: 'suffix', confidence: 0.52 };
  if (/(tion|ment|ness|ity|ship|er|or|ist|ism)$/.test(wordKey)) return { category: 'noun', source: 'suffix', confidence: 0.52 };
  return null;
}

function rawTextCategory(raw?: string | null): WordCategory | null {
  const text = (raw ?? '').toLowerCase();
  if (!text) return null;
  if (/phrasal|фразов|фразові/.test(text)) return 'phrasal_particle';
  if (/existential|there\s+is|there\s+are|\bhay\b|\bthere\s+is\/there\s+are\b/.test(text)) return 'existential';
  if (/to\s*be|am\/is\/are|\bser\b|\bestar\b|заперечення\s+to\s+be|отрицание\s+to\s+be|дієслово\s+to\s+be|глагол\s+to\s+be/.test(text)) return 'to-be';
  if (/modal|модаль/.test(text)) return 'modal';
  if (/modifier|too\s*\/?\s*enough|too\s+enough|too\s*\+\s*adjective|adjective\s*\+\s*enough|enough\s*\+\s*noun|too\s+much|too\s+many|not\s+enough|too\s+\.\.\.\s+to|very\s*\/?\s*really\s*\/?\s*quite|very\s+really\s+quite|very\s*\+\s*adjective|really\s*\+\s*adjective|quite\s*\+\s*adjective|intensifier|degree/.test(text)) return 'modifier';
  if (/determiner|quantifier|demonstrative|\bthis\b|\bthat\b|\bthese\b|\bthose\b|\bsome\b|\bany\b|\bno\s*\+\s*noun\b/.test(text)) return 'determiner';
  if (/article|art[ií]culo|артикл|артиклі/.test(text)) return 'article';
  if (/syntax|word\s+order|object\s+order|double\s+object|indirect\s+object|give\s+me\s+it|send\s+her\s+it|show\s+me\s+it/.test(text)) return 'syntax';
  if (/preposition|preposici[oó]n|предлог|предлоги|прийменник|прийменники/.test(text)) return 'preposition';
  if (/pronoun|pronombre|местоим|займенник|займенники/.test(text)) return 'pronoun';
  if (/conjunction|conjunci[oó]n|союз|союзы|сполучник|сполучники/.test(text)) return 'conjunction';
  if (/adjective|adjetivo|прилагательн|прикметник|comparative|superlative|сравнен|порівнян|степен|ступен/.test(text)) return 'adjective';
  if (/adverb|adverbio|нареч|прислівник|прислівники/.test(text)) return 'adverb';
  if (/noun|sustantivo|существительн|іменник|іменники/.test(text)) return 'noun';
  if (/present|past|future|continuous|perfect|gerund|imperative|passive|used\s+to|complex\s+object|verb|verbo|глагол|дієслово|герунд|повелитель|наказов|умовн/.test(text)) return 'verb';
  return null;
}

export function normalizeWordCategory(rawCategory?: string | null, word?: string | null): CategoryResolution {
  const wordKey = normalizeTokenKey(word);
  const rawKey = normalizeRawCategory(rawCategory);
  const rawTextMatch = rawTextCategory(rawCategory);
  const rawMatch = RAW_CATEGORY_ALIASES[rawKey];
  const closed = closedClassCategory(wordKey);
  if (rawMatch && rawMatch !== 'other') {
    if (rawMatch === 'verb' && (closed?.category === 'modal' || closed?.category === 'to-be')) {
      return closed;
    }
    return { category: rawMatch, source: 'raw_category', confidence: 0.94 };
  }
  if (rawTextMatch) {
    if (rawTextMatch === 'verb' && (closed?.category === 'modal' || closed?.category === 'to-be')) {
      return closed;
    }
    return { category: rawTextMatch, source: 'raw_category', confidence: 0.9 };
  }
  if (rawMatch === 'other') return { category: 'other', source: 'raw_category', confidence: 1 };

  if (closed) return closed;

  const pool = poolCategory(wordKey);
  if (pool) return pool;

  if (COMMON_VERBS.has(wordKey)) return { category: 'verb', source: 'word_pool', confidence: 0.75 };
  if (COMMON_NOUNS.has(wordKey)) return { category: 'noun', source: 'word_pool', confidence: 0.75 };
  if (COMMON_ADJECTIVES.has(wordKey)) return { category: 'adjective', source: 'word_pool', confidence: 0.75 };
  if (COMMON_ADVERBS.has(wordKey)) return { category: 'adverb', source: 'word_pool', confidence: 0.75 };
  if (wordKey.length > 3 && /s$/.test(wordKey)) return { category: 'noun', source: 'suffix', confidence: 0.5 };

  const suffix = suffixCategory(wordKey);
  if (suffix) return suffix;

  const rawFallback = RAW_CATEGORY_FALLBACKS[rawKey];
  if (rawFallback) return { category: rawFallback, source: 'raw_category', confidence: 0.45 };

  return { category: 'other', source: 'unknown', confidence: 0 };
}

export function isUserFacingCategory(category: WordCategory): boolean {
  return category !== 'other';
}

export function isCategory(value: unknown): value is WordCategory {
  return typeof value === 'string' && (
    value === 'verb' ||
    value === 'noun' ||
    value === 'pronoun' ||
    value === 'adjective' ||
    value === 'adverb' ||
    value === 'modifier' ||
    value === 'preposition' ||
    value === 'syntax' ||
    value === 'determiner' ||
    value === 'existential' ||
    value === 'article' ||
    value === 'to-be' ||
    value === 'conjunction' ||
    value === 'modal' ||
    value === 'phrasal_particle' ||
    value === 'other'
  );
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
