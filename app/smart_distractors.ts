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

function optionKey(value: string): string {
  return norm(value).replace(/[’`]/g, "'");
}

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

function stableOptionShuffle(values: string[], salt: string): string[] {
  return [...values].sort((a, b) => stableHash(`${salt}:${a}`) - stableHash(`${salt}:${b}`));
}

function simpleLemma(value: string): string {
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

function closedGroupFor(value: string): string | null {
  const key = optionKey(value);
  for (const [group, words] of Object.entries(CLOSED_GROUPS)) {
    if (words.includes(key)) return group;
  }
  return null;
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

function inferPos(value: string): string | null {
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

function semanticTags(value: string): Set<string> {
  const key = optionKey(value);
  const lemma = simpleLemma(key);
  const tags = new Set<string>();
  for (const [tag, words] of Object.entries(SEMANTIC_GROUPS)) {
    if (words.includes(key) || words.includes(lemma)) tags.add(tag);
  }
  return tags;
}

function isInflectionalNeighbor(a: string, b: string): boolean {
  const ak = optionKey(a);
  const bk = optionKey(b);
  if (!ak || !bk || ak === bk) return false;
  if (simpleLemma(ak) === simpleLemma(bk)) return true;
  return bk === `${ak}s` || bk === `${ak}es` || bk === `${ak}ed` || bk === `${ak}ing`
    || ak === `${bk}s` || ak === `${bk}es` || ak === `${bk}ed` || ak === `${bk}ing`;
}

function sharedCount(a: Set<string>, b: Set<string>): number {
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

function scoreCandidate(
  correct: SmartDistractorCandidate,
  candidate: SmartDistractorCandidate,
  context: SmartDistractorRankContext,
): RankedSmartDistractor | null {
  const correctValue = correct.value;
  const candidateValue = candidate.value;
  const correctKey = optionKey(correctValue);
  const candidateKey = optionKey(candidateValue);
  if (!correctKey || !candidateKey || correctKey === candidateKey) return null;

  const mode = context.mode ?? 'phrase';
  const correctPos = normalizePos(context.pos) ?? normalizePos(context.category) ?? candidatePos(correct);
  const candPos = candidatePos(candidate);
  const correctClosed = closedGroupFor(correctValue);
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

  const neighborList = SMART_NEIGHBORS[correctKey] ?? SMART_NEIGHBORS[simpleLemma(correctKey)] ?? [];
  if (neighborList.includes(candidateKey) || neighborList.includes(simpleLemma(candidateKey))) {
    score += 120;
    reasons.push('curated-neighbor');
  }

  const correctTags = semanticTags(correctValue);
  const candTags = semanticTags(candidateValue);
  const overlaps = sharedCount(correctTags, candTags);
  if (overlaps > 0) {
    score += Math.min(95, overlaps * 55);
    reasons.push(`semantic:${overlaps}`);
  } else if (!correctClosed && correctPos && candPos === correctPos) {
    score -= 30;
    reasons.push('same-pos-no-semantic');
  }

  if (correctPos === 'verbs' && GENERIC_VERBS.has(candidateKey) && !GENERIC_VERBS.has(correctKey)) {
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
  return uniqueCandidates(candidates, true)
    .map((candidate) => scoreCandidate(correctCandidate, candidate, context))
    .filter((candidate): candidate is RankedSmartDistractor => candidate !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return stableHash(`${correctCandidate.value}:${a.value}`) - stableHash(`${correctCandidate.value}:${b.value}`);
    });
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

  return stableOptionShuffle(result.slice(0, optionCount), correctValue);
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
