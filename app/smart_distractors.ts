export type SmartDistractorSource = 'manual' | 'lesson' | 'crossLesson' | 'category' | 'reserve' | 'nextWord';

export interface SmartDistractorCandidate {
  value: string;
  pos?: string;
  category?: string;
  source?: SmartDistractorSource;
}

export interface SmartDistractorRankContext {
  pos?: string;
  category?: string;
  mode?: 'vocabulary' | 'phrase';
}

export interface SmartDistractorBuildOptions extends SmartDistractorRankContext {
  optionCount?: number;
  protectedValues?: string[];
  allowMultiWord?: boolean;
}

export interface RankedSmartDistractor extends SmartDistractorCandidate {
  score: number;
  reasons: string[];
}

const CLOSED_GROUPS: Record<string, string[]> = {
  toBe: ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being'],
  articles: ['a', 'an', 'the'],
  possessives: ['my', 'your', 'his', 'her', 'its', 'our', 'their'],
  pronouns: ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'this', 'that', 'these', 'those'],
  modals: ['can', 'could', 'will', 'would', 'should', 'must', 'may', 'might', 'shall'],
  negation: ['not', 'no', 'never', "don't", "doesn't", "didn't", "can't", "won't", "isn't", "aren't", "wasn't", "weren't"],
  prepositions: ['in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'about', 'after', 'before', 'during', 'until', 'since', 'between', 'behind', 'under', 'over', 'near', 'opposite', 'through', 'into', 'onto', 'inside', 'outside'],
};

const GENERIC_VERBS = new Set([
  'be', 'been', 'being', 'do', 'does', 'did', 'done', 'have', 'has', 'had',
  'get', 'gets', 'got', 'make', 'makes', 'made', 'take', 'takes', 'took',
  'put', 'use', 'uses', 'used', 'go', 'goes', 'went', 'come', 'comes', 'came',
]);

const SMART_NEIGHBORS: Record<string, string[]> = {
  remember: ['forget', 'know', 'learn', 'understand', 'notice', 'recognize', 'recall', 'think'],
  forget: ['remember', 'know', 'miss', 'lose', 'learn', 'notice'],
  understand: ['know', 'learn', 'remember', 'notice', 'realize', 'think', 'believe'],
  know: ['understand', 'remember', 'learn', 'believe', 'think', 'notice'],
  learn: ['study', 'know', 'understand', 'remember', 'practice', 'teach'],
  teach: ['explain', 'show', 'help', 'train', 'instruct', 'learn'],
  order: ['buy', 'ask', 'request', 'pay', 'choose', 'book'],
  happen: ['occur', 'start', 'finish', 'change', 'appear', 'begin'],
  say: ['tell', 'speak', 'ask', 'answer', 'explain', 'reply'],
  tell: ['say', 'ask', 'answer', 'explain', 'report', 'reply'],
  speak: ['talk', 'say', 'tell', 'explain', 'answer'],
  ask: ['answer', 'tell', 'say', 'request', 'explain'],
  answer: ['ask', 'reply', 'say', 'tell', 'explain'],
  buy: ['order', 'pay', 'sell', 'choose', 'take'],
  pay: ['buy', 'order', 'cost', 'spend', 'earn'],
};

const SEMANTIC_GROUPS: Record<string, string[]> = {
  cognition_memory: [
    'remember', 'remembers', 'remembered', 'remembering', 'forget', 'forgets', 'forgot',
    'forgotten', 'know', 'knows', 'knew', 'known', 'understand', 'understands',
    'understood', 'learn', 'learns', 'learned', 'learnt', 'notice', 'noticed',
    'recognize', 'recognise', 'think', 'thought', 'believe', 'realize', 'realise',
  ],
  communication: [
    'say', 'says', 'said', 'tell', 'tells', 'told', 'speak', 'speaks', 'spoke',
    'talk', 'ask', 'asked', 'answer', 'answered', 'reply', 'replied', 'explain',
    'explains', 'explained', 'discuss', 'report', 'write', 'wrote', 'read',
    'teach', 'teaches', 'taught', 'show', 'present', 'suggest',
  ],
  learning_teaching: [
    'learn', 'learns', 'learned', 'learnt', 'study', 'studies', 'studied',
    'teach', 'teaches', 'taught', 'practice', 'practise', 'train', 'explain',
    'understand', 'know', 'remember',
  ],
  commerce_request: [
    'order', 'ordered', 'buy', 'bought', 'pay', 'paid', 'sell', 'sold', 'cost',
    'book', 'reserve', 'choose', 'chose', 'request', 'ask', 'offer',
  ],
  movement: [
    'go', 'goes', 'went', 'come', 'came', 'leave', 'left', 'arrive', 'arrived',
    'enter', 'entered', 'travel', 'walk', 'run', 'drive', 'bring', 'brought',
    'move', 'moved', 'return', 'reach',
  ],
  event_change: [
    'happen', 'happens', 'happened', 'occur', 'start', 'started', 'begin',
    'began', 'finish', 'finished', 'stop', 'stopped', 'change', 'changed',
    'appear', 'appeared', 'seem', 'become',
  ],
  work_process: [
    'work', 'works', 'worked', 'manage', 'managed', 'plan', 'planned', 'prepare',
    'prepared', 'develop', 'developed', 'improve', 'improved', 'solve', 'solved',
    'support', 'provide', 'complete', 'review', 'join', 'lead',
  ],
  emotion_preference: [
    'like', 'love', 'enjoy', 'want', 'need', 'prefer', 'hope', 'wish', 'miss',
    'feel', 'felt', 'hate',
  ],
  people_jobs: [
    'teacher', 'doctor', 'manager', 'driver', 'engineer', 'programmer', 'lawyer',
    'student', 'colleague', 'friend', 'partner', 'client', 'customer', 'person',
    'specialist', 'analyst', 'assistant',
  ],
  places: [
    'office', 'school', 'hospital', 'hotel', 'restaurant', 'bank', 'shop', 'market',
    'station', 'airport', 'city', 'country', 'home', 'house', 'room', 'park',
  ],
  documents_messages: [
    'book', 'article', 'email', 'message', 'letter', 'document', 'report',
    'passport', 'ticket', 'card', 'note', 'list', 'text',
  ],
  devices_objects: [
    'phone', 'computer', 'laptop', 'tablet', 'key', 'wallet', 'bag', 'table',
    'chair', 'door', 'window', 'lamp', 'book', 'pen',
  ],
  time_calendar: [
    'day', 'week', 'month', 'year', 'morning', 'evening', 'night', 'today',
    'tomorrow', 'yesterday', 'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday',
  ],
  quality_difficulty: [
    'easy', 'hard', 'difficult', 'simple', 'complex', 'clear', 'obvious',
    'useful', 'important', 'necessary', 'right', 'wrong',
  ],
  state_feeling: [
    'tired', 'busy', 'ready', 'happy', 'sad', 'angry', 'worried', 'free',
    'comfortable', 'safe', 'sick', 'healthy',
  ],
  size_degree: [
    'big', 'small', 'large', 'huge', 'short', 'long', 'high', 'low', 'wide',
    'narrow', 'thick', 'thin', 'very', 'quite', 'really', 'so',
  ],
  frequency_time: [
    'always', 'usually', 'often', 'sometimes', 'rarely', 'never', 'already',
    'yet', 'still', 'soon', 'now', 'recently', 'weekly', 'daily',
  ],
};

function norm(value: string): string {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  const stripped = raw.replace(/^[.,!?;:]+|[.,!?;:]+$/g, '').trim();
  return stripped || raw;
}

// зачем (владелец 11.11, микрофризы при сборке фразы): подбор плиток идёт прямо в тапе по слову и оценивает ~600 слов из пулов.
// Раньше для КАЖДОГО слова на КАЖДЫЙ тап заново гонялись регулярки и перебор всех групп. Слова в пулах одни и те же от тапа к тапу,
// поэтому разбор слова (ключ, лемма, группа, смысловые метки) считаем один раз и помним. Результат ранжирования не меняется.
const MEMO_LIMIT = 6000;
function memoizeByWord<T>(compute: (value: string) => T): (value: string) => T {
  const cache = new Map<string, T>();
  return (value: string): T => {
    const hit = cache.get(value);
    if (hit !== undefined) return hit;
    const result = compute(value);
    // Словарь курса конечен; предел — страховка от роста памяти на пользовательском вводе.
    if (cache.size >= MEMO_LIMIT) cache.clear();
    cache.set(value, result);
    return result;
  };
}

const optionKey = memoizeByWord((value: string): string => norm(value).replace(/[’`]/g, "'"));

function isSingleOrthographicWord(value: string): boolean {
  return !/\s/.test(String(value ?? '').trim());
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// On-screen layout shuffle for option tiles. Uses fresh randomness (Fisher-Yates) so the
// SAME phrase does NOT always place the correct word in the SAME tile across replays.
// Rationale: a deterministic layout (stableOptionShuffle) lets students memorise the
// position ("They is always top-left") instead of the language. Distractor SELECTION stays
// deterministic via ranking — only the final placement is randomised here.
// NOTE: callers that need a reproducible layout must use a seeded shuffle, not this builder.
function layoutOptionShuffle(values: string[], random: () => number = Math.random): string[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const roll = random();
    const safeRoll = Number.isFinite(roll) ? Math.max(0, Math.min(0.999999999999, roll)) : 0;
    const j = Math.floor(safeRoll * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const simpleLemma = memoizeByWord((value: string): string => simpleLemmaUncached(value));

function simpleLemmaUncached(value: string): string {
  const key = optionKey(value);
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

// Слово → первая по порядку закрытая группа (her есть и в possessives, и в pronouns — побеждает первая, как и при переборе).
const CLOSED_GROUP_BY_WORD: ReadonlyMap<string, string> = (() => {
  const index = new Map<string, string>();
  for (const [group, words] of Object.entries(CLOSED_GROUPS)) {
    for (const word of words) if (!index.has(word)) index.set(word, group);
  }
  return index;
})();

function closedGroupFor(value: string): string | null {
  return CLOSED_GROUP_BY_WORD.get(optionKey(value)) ?? null;
}

function normalizePos(value?: string): string | null {
  const x = String(value ?? '').toLowerCase();
  if (!x) return null;
  if (x.includes('puntuacion') || x.includes('punct')) return 'punctuation';
  if (x.includes('article') || x.includes('articulo') || x.includes('determin')) return 'articles';
  if (x.includes('pronoun') || x.includes('pronombre')) return 'pronouns';
  if (x.includes('prepos')) return 'prepositions';
  if (x.includes('conjunction') || x.includes('conjunc')) return 'conjunctions';
  if (x.includes('modal')) return 'modals';
  if (x.includes('neg')) return 'negation';
  if (x.includes('adverb')) return 'adverbs';
  if (x.includes('adjective') || x === 'adj' || x.includes('adjetivo')) return 'adjectives';
  if (x.includes('noun') || x.includes('sustantivo')) return 'nouns';
  if (x.includes('verb') || x.includes('verbo') || x === 'to-be' || x === 'tobe') return 'verbs';
  return x;
}

const inferPos = memoizeByWord((value: string): string | null => inferPosUncached(value));

function inferPosUncached(value: string): string | null {
  const closed = closedGroupFor(value);
  if (closed === 'toBe') return 'verbs';
  if (closed === 'articles') return 'articles';
  if (closed === 'possessives' || closed === 'pronouns') return 'pronouns';
  if (closed === 'modals') return 'modals';
  if (closed === 'negation') return 'negation';
  if (closed === 'prepositions') return 'prepositions';

  const tags = semanticTags(value);
  if (
    tags.has('cognition_memory') ||
    tags.has('communication') ||
    tags.has('learning_teaching') ||
    tags.has('commerce_request') ||
    tags.has('movement') ||
    tags.has('event_change') ||
    tags.has('work_process') ||
    tags.has('emotion_preference')
  ) {
    return 'verbs';
  }
  if (tags.has('people_jobs') || tags.has('places') || tags.has('documents_messages') || tags.has('devices_objects') || tags.has('time_calendar')) {
    return 'nouns';
  }
  if (tags.has('quality_difficulty') || tags.has('state_feeling') || tags.has('size_degree')) return 'adjectives';
  if (tags.has('frequency_time')) return 'adverbs';
  return null;
}

function candidatePos(candidate: SmartDistractorCandidate): string | null {
  return normalizePos(candidate.pos) ?? normalizePos(candidate.category) ?? inferPos(candidate.value);
}

// Слово → все смысловые группы, где оно есть (book — и commerce_request, и documents_messages, и devices_objects).
const SEMANTIC_TAGS_BY_WORD: ReadonlyMap<string, readonly string[]> = (() => {
  const index = new Map<string, string[]>();
  for (const [tag, words] of Object.entries(SEMANTIC_GROUPS)) {
    for (const word of words) {
      const tags = index.get(word);
      if (!tags) index.set(word, [tag]);
      else if (!tags.includes(tag)) tags.push(tag);
    }
  }
  return index;
})();

// Набор общий для всех вызовов (из памяти) — только читать, не менять.
const semanticTags = memoizeByWord((value: string): ReadonlySet<string> => {
  const key = optionKey(value);
  const lemma = simpleLemma(key);
  const tags = new Set<string>();
  for (const tag of SEMANTIC_TAGS_BY_WORD.get(key) ?? []) tags.add(tag);
  for (const tag of SEMANTIC_TAGS_BY_WORD.get(lemma) ?? []) tags.add(tag);
  return tags;
});

function isInflectionalNeighbor(a: string, b: string): boolean {
  const ak = optionKey(a);
  const bk = optionKey(b);
  if (!ak || !bk || ak === bk) return false;
  if (simpleLemma(ak) === simpleLemma(bk)) return true;
  return bk === `${ak}s` || bk === `${ak}es` || bk === `${ak}ed` || bk === `${ak}ing`
    || ak === `${bk}s` || ak === `${bk}es` || ak === `${bk}ed` || ak === `${bk}ing`;
}

function sharedCount(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  let count = 0;
  for (const tag of a) if (b.has(tag)) count += 1;
  return count;
}

function sourceScore(source?: SmartDistractorSource): number {
  if (source === 'manual') return 10;
  if (source === 'lesson') return 8;
  if (source === 'category') return 6;
  if (source === 'nextWord') return 4;
  if (source === 'crossLesson') return 2;
  return 0;
}

function lexicalSimilarityScore(a: string, b: string): number {
  const ak = optionKey(a);
  const bk = optionKey(b);
  if (!ak || !bk) return 0;
  let prefix = 0;
  const maxPrefix = Math.min(ak.length, bk.length, 4);
  while (prefix < maxPrefix && ak[prefix] === bk[prefix]) prefix += 1;
  const lengthDelta = Math.abs(ak.length - bk.length);
  return Math.max(0, prefix * 3 - lengthDelta);
}

// Всё, что зависит только от ПРАВИЛЬНОГО слова, — считаем один раз на подбор, а не на каждого из ~600 кандидатов.
interface CorrectWordProfile {
  value: string;
  key: string;
  mode: 'vocabulary' | 'phrase';
  pos: string | null;
  closed: string | null;
  neighbors: readonly string[];
  tags: ReadonlySet<string>;
  isGenericVerb: boolean;
}

function buildCorrectWordProfile(correct: SmartDistractorCandidate, context: SmartDistractorRankContext): CorrectWordProfile {
  const key = optionKey(correct.value);
  return {
    value: correct.value,
    key,
    mode: context.mode ?? 'phrase',
    pos: normalizePos(context.pos) ?? normalizePos(context.category) ?? candidatePos(correct),
    closed: closedGroupFor(correct.value),
    neighbors: SMART_NEIGHBORS[key] ?? SMART_NEIGHBORS[simpleLemma(key)] ?? [],
    tags: semanticTags(correct.value),
    isGenericVerb: GENERIC_VERBS.has(key),
  };
}

function scoreCandidate(
  profile: CorrectWordProfile,
  candidate: SmartDistractorCandidate,
): RankedSmartDistractor | null {
  const correctValue = profile.value;
  const candidateValue = candidate.value;
  const correctKey = profile.key;
  const candidateKey = optionKey(candidateValue);
  if (!correctKey || !candidateKey || correctKey === candidateKey) return null;

  const mode = profile.mode;
  const correctPos = profile.pos;
  const candPos = candidatePos(candidate);
  const correctClosed = profile.closed;
  const candClosed = closedGroupFor(candidateValue);
  const reasons: string[] = [];
  let score = sourceScore(candidate.source);

  if (correctClosed) {
    if (candClosed === correctClosed) {
      score += 130;
      reasons.push(`closed:${correctClosed}`);
    } else if (correctPos && candPos === correctPos) {
      score += 25;
      reasons.push('same-pos-closed-reserve');
    } else {
      score -= 120;
      reasons.push('wrong-closed-class');
    }
  } else if (correctPos && candPos) {
    if (correctPos === candPos || (correctPos === 'verbs' && candPos === 'modals')) {
      score += 55;
      reasons.push(`pos:${correctPos}`);
    } else {
      score -= 95;
      reasons.push(`wrong-pos:${candPos}`);
    }
  }

  if (mode === 'vocabulary' && isInflectionalNeighbor(correctValue, candidateValue)) {
    return null;
  }
  if (mode === 'phrase' && isInflectionalNeighbor(correctValue, candidateValue)) {
    score += 34;
    reasons.push('inflection-trap');
  }

  const neighborList = profile.neighbors;
  if (neighborList.includes(candidateKey) || neighborList.includes(simpleLemma(candidateKey))) {
    score += 120;
    reasons.push('curated-neighbor');
  }

  const correctTags = profile.tags;
  const candTags = semanticTags(candidateValue);
  const overlaps = sharedCount(correctTags, candTags);
  if (overlaps > 0) {
    score += Math.min(95, overlaps * 55);
    reasons.push(`semantic:${overlaps}`);
  } else if (!correctClosed && correctPos && candPos === correctPos) {
    score -= 30;
    reasons.push('same-pos-no-semantic');
  }

  if (correctPos === 'verbs' && GENERIC_VERBS.has(candidateKey) && !profile.isGenericVerb) {
    score -= 50;
    reasons.push('generic-verb');
  }

  score += Math.min(12, lexicalSimilarityScore(correctValue, candidateValue));

  if (score < -50) return null;
  return { ...candidate, score, reasons };
}

function uniqueCandidates(candidates: SmartDistractorCandidate[], allowMultiWord: boolean): SmartDistractorCandidate[] {
  const seen = new Set<string>();
  const result: SmartDistractorCandidate[] = [];
  for (const candidate of candidates) {
    const value = String(candidate.value ?? '').trim();
    const key = optionKey(value);
    if (!key || seen.has(key)) continue;
    if (!allowMultiWord && !isSingleOrthographicWord(value)) continue;
    seen.add(key);
    result.push({ ...candidate, value });
  }
  return result;
}

export function rankSmartDistractors(
  correct: string | SmartDistractorCandidate,
  candidates: SmartDistractorCandidate[],
  context: SmartDistractorRankContext = {},
): RankedSmartDistractor[] {
  const correctCandidate = typeof correct === 'string' ? { value: correct } : correct;
  const profile = buildCorrectWordProfile(correctCandidate, context);
  // Хэш для развязки равных очков считаем один раз на кандидата: в сравнении сортировки он раньше пересчитывался на каждую пару.
  const scored: { ranked: RankedSmartDistractor; tieBreak: number }[] = [];
  for (const candidate of uniqueCandidates(candidates, true)) {
    const ranked = scoreCandidate(profile, candidate);
    if (ranked !== null) scored.push({ ranked, tieBreak: stableHash(`${correctCandidate.value}:${ranked.value}`) });
  }
  scored.sort((a, b) => {
    if (b.ranked.score !== a.ranked.score) return b.ranked.score - a.ranked.score;
    return a.tieBreak - b.tieBreak;
  });
  return scored.map((entry) => entry.ranked);
}

function buildSmartOptions(
  correct: SmartDistractorCandidate,
  candidates: SmartDistractorCandidate[],
  options: SmartDistractorBuildOptions,
): string[] {
  const optionCount = options.optionCount ?? 6;
  const allowMultiWord = options.allowMultiWord ?? false;
  const correctValue = String(correct.value ?? '').trim();
  const seen = new Set<string>([optionKey(correctValue)]);
  const result: string[] = [correctValue];

  for (const value of options.protectedValues ?? []) {
    const key = optionKey(value);
    if (!key || seen.has(key)) continue;
    if (!allowMultiWord && !isSingleOrthographicWord(value)) continue;
    seen.add(key);
    result.push(String(value).trim());
    if (result.length >= optionCount) break;
  }

  const ranked = rankSmartDistractors(correct, uniqueCandidates(candidates, allowMultiWord), options);
  for (const candidate of ranked) {
    if (result.length >= optionCount) break;
    const key = optionKey(candidate.value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate.value);
  }

  if (result.length < optionCount) {
    for (const candidate of uniqueCandidates(candidates, allowMultiWord)) {
      if (result.length >= optionCount) break;
      const key = optionKey(candidate.value);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(candidate.value);
    }
  }

  return layoutOptionShuffle(result.slice(0, optionCount));
}

export function buildSmartVocabularyOptions(
  correct: SmartDistractorCandidate,
  candidates: SmartDistractorCandidate[],
  options: Omit<SmartDistractorBuildOptions, 'mode'> = {},
): string[] {
  return buildSmartOptions(correct, candidates, { ...options, mode: 'vocabulary' });
}

export function buildSmartPhraseOptions(
  correct: string,
  candidates: string[] | SmartDistractorCandidate[],
  options: Omit<SmartDistractorBuildOptions, 'mode'> = {},
): string[] {
  const normalizedCandidates = candidates.map((candidate) =>
    typeof candidate === 'string'
      ? { value: candidate, source: 'manual' as const }
      : candidate,
  );
  return buildSmartOptions({ value: correct, category: options.category, pos: options.pos }, normalizedCandidates, {
    ...options,
    mode: 'phrase',
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
