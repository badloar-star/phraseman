import { LessonPrepositionPack, PrepositionKind, LessonPhrase, LessonWord } from './lesson_data_types';
import { getLessonData } from './lesson_data_all';
import { explainPrepositionChoice } from './preposition_explanations';

type PrepCandidate = {
  answer: string;
  kind: PrepositionKind;
  phrase: LessonPhrase;
  occurrenceIndex: number;
  source: 'tagged' | 'auto';
};

type LessonPreposition = {
  text: string;
  kind: PrepositionKind;
};

const directionSet = new Set(['to', 'into', 'onto', 'from', 'toward', 'towards', 'through', 'across', 'along', 'up', 'down', 'out', 'off']);
const placeSet = new Set(['in', 'on', 'at', 'under', 'over', 'above', 'below', 'between', 'among', 'inside', 'outside', 'near', 'behind', 'opposite', 'beside', 'around', 'next to', 'in front of']);
const timeSet = new Set(['during', 'before', 'after', 'since', 'until', 'for', 'by', 'on', 'in', 'at']);

const TRUE_PREPOSITIONS = new Set([
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around',
  'at', 'before', 'behind', 'below', 'beside', 'between', 'by', 'during',
  'for', 'from', 'in', 'inside', 'into', 'near', 'of', 'off', 'on', 'onto',
  'opposite', 'out', 'outside', 'over', 'through', 'to', 'toward', 'towards',
  'under', 'until', 'up', 'with', 'within', 'without',
]);

const COMPOUND_PREPOSITIONS = ['in front of', 'next to', 'because of', 'instead of'];
const PARTICLE_WORDS = new Set(['away', 'back', 'off', 'out', 'up', 'down']);
const PRONOUNS = new Set(['it', 'me', 'you', 'him', 'her', 'us', 'them']);

const COMMON_BASE_VERBS = new Set([
  'answer', 'ask', 'be', 'bring', 'buy', 'call', 'change', 'check', 'choose',
  'clean', 'come', 'cook', 'do', 'drink', 'drive', 'eat', 'feel', 'find',
  'finish', 'fix', 'forget', 'get', 'give', 'go', 'have', 'hear', 'help',
  'keep', 'know', 'learn', 'leave', 'listen', 'look', 'make', 'meet', 'need',
  'open', 'order', 'pay', 'put', 'read', 'remember', 'repair', 'rest', 'save',
  'say', 'see', 'sell', 'send', 'show', 'sleep', 'speak', 'start', 'stay',
  'take', 'talk', 'tell', 'try', 'understand', 'use', 'wait', 'wake', 'want',
  'wear', 'work', 'write',
]);

const INFINITIVE_TO_PREV = new Set([
  'able', 'afford', 'agree', 'ask', 'decide', 'expect', 'forget', 'going',
  'have', 'has', 'had', 'help', 'hope', 'learn', 'like', 'likes', 'liked',
  'need', 'needs', 'needed', 'plan', 'plans', 'planned', 'remember', 'try',
  'tries', 'tried', 'trying', 'use', 'used', 'want', 'wants', 'wanted', 'would',
]);

const MOVEMENT_OR_TRANSFER_PREV = new Set([
  'bring', 'brings', 'brought', 'come', 'comes', 'came', 'deliver', 'delivers',
  'delivered', 'drive', 'drives', 'drove', 'driven', 'get', 'gets', 'got',
  'give', 'gives', 'gave', 'go', 'goes', 'went', 'gone', 'move', 'moves',
  'moved', 'pass', 'passes', 'passed', 'return', 'returns', 'returned', 'send',
  'sends', 'sent', 'show', 'shows', 'showed', 'take', 'takes', 'took', 'taken',
  'travel', 'travels', 'traveled', 'travelled', 'walk', 'walks', 'walked',
]);

const DESTINATION_NOUNS = new Set([
  'airport', 'bank', 'bed', 'class', 'doctor', 'home', 'hospital', 'meeting',
  'office', 'park', 'school', 'shop', 'station', 'store', 'university', 'work',
]);

const TIME_FOLLOWERS = new Set([
  'today', 'tomorrow', 'yesterday', 'morning', 'afternoon', 'evening', 'night',
  'noon', 'midnight', 'hour', 'hours', 'minute', 'minutes', 'week', 'month',
  'year', 'this', 'last', 'next', 'two', 'three', 'four', 'five', 'six', 'seven',
  'eight', 'nine', 'ten',
]);

function classifyPreposition(text: string): PrepositionKind {
  const t = normalizeWord(text);
  if (directionSet.has(t)) return 'direction';
  if (timeSet.has(t)) return 'time';
  if (placeSet.has(t)) return 'place';
  return 'other';
}

function prepositionKey(preposition: LessonPreposition): string {
  return `${preposition.text}|${preposition.kind}`;
}

function normalizeWord(text: string): string {
  return String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeText(text: string): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u201b]/g, "'")
    .replace(/\bwi[\s-]?fi\b/g, 'wifi')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCategory(text: string | undefined): string {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokensFromEnglish(english: string): string[] {
  return normalizeText(english).match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? [];
}

function isPrepositionSlot(word: LessonWord): boolean {
  const category = normalizeCategory(word.category);
  return category === 'preposition'
    || category === 'prepositions'
    || category === 'preposicion'
    || category === 'preposiciones';
}

function enSlotsForPrepositionDrill(phrase: LessonPhrase): LessonWord[] {
  const en = phrase.wordsEn;
  if (en && en.length > 0) return en;
  return phrase.words ?? [];
}

function isInfinitiveTo(tokens: string[], index: number): boolean {
  const prev = tokens[index - 1] ?? '';
  const next = tokens[index + 1] ?? '';
  if (!next) return false;
  if (MOVEMENT_OR_TRANSFER_PREV.has(prev)) return false;
  if (prev === 'used' && next.endsWith('ing')) return false;
  if (INFINITIVE_TO_PREV.has(prev)) return true;
  if (DESTINATION_NOUNS.has(next)) return false;
  return COMMON_BASE_VERBS.has(next) && prev !== 'listen' && prev !== 'go';
}

function isDrillPrepositionOccurrence(tokens: string[], index: number): boolean {
  const token = tokens[index];
  const next = tokens[index + 1] ?? '';
  const prev = tokens[index - 1] ?? '';

  if (!TRUE_PREPOSITIONS.has(token)) return false;
  if (token === 'to' && isInfinitiveTo(tokens, index)) return false;
  if ((token === 'inside' || token === 'outside' || token === 'near') && (!next || TIME_FOLLOWERS.has(next))) return false;
  if (token === 'in' && ['come', 'comes', 'came'].includes(prev)) return false;
  if (token === 'on' && ['put', 'puts', 'putting', 'turn', 'turns', 'turned', 'turning'].includes(prev)) return false;
  if (token === 'off' && ['take', 'takes', 'took', 'taking', 'turn', 'turns', 'turned', 'turning'].includes(prev)) return false;
  if (token === 'out' && ['find', 'finds', 'found', 'finding'].includes(prev)) return false;
  if (token === 'up' && ['clean', 'cleans', 'cleaned', 'cleaning', 'get', 'gets', 'got', 'getting', 'wake', 'wakes', 'woke', 'waking'].includes(prev)) return false;
  if (token === 'back' && ['bring', 'brings', 'brought', 'give', 'gives', 'gave', 'go', 'goes', 'went'].includes(prev)) return false;
  if (token === 'of' && ['out', 'kind', 'sort', 'lot', 'lots'].includes(prev)) return false;

  if (PARTICLE_WORDS.has(token)) {
    if (!next || PRONOUNS.has(next)) return false;
    if (['get', 'gets', 'got', 'put', 'puts', 'take', 'takes', 'give', 'gives', 'find', 'go', 'goes', 'wake', 'wakes'].includes(prev)) return false;
  }

  return true;
}

function taggedPrepositionAnswers(phrase: LessonPhrase): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const word of enSlotsForPrepositionDrill(phrase)) {
    if (!isPrepositionSlot(word)) continue;
    const value = normalizeWord(word.correct || word.text);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function taggedAnswerCoversToken(token: string, phraseText: string, taggedAnswers: string[]): boolean {
  const paddedPhrase = ` ${normalizeText(phraseText)} `;
  for (const answer of taggedAnswers) {
    if (answer === token) return true;
    const parts = answer.split(/\s+/).filter(Boolean);
    if (parts.includes(token) && paddedPhrase.includes(` ${answer} `)) return true;
  }
  return false;
}

function compoundAt(tokens: string[], index: number): string | null {
  for (const compound of COMPOUND_PREPOSITIONS) {
    const parts = compound.split(' ');
    let matches = true;
    for (let i = 0; i < parts.length; i++) {
      if (tokens[index + i] !== parts[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return compound;
  }
  return null;
}

function occurrenceIndexForToken(tokens: string[], index: number, answer: string): number {
  let count = 0;
  for (let i = 0; i < index; i++) {
    if (tokens[i] === answer) count++;
  }
  return count;
}

function occurrenceIndexForCompound(tokens: string[], index: number, answer: string): number {
  const parts = answer.split(' ');
  let count = 0;
  for (let i = 0; i < index; i++) {
    let matches = true;
    for (let p = 0; p < parts.length; p++) {
      if (tokens[i + p] !== parts[p]) {
        matches = false;
        break;
      }
    }
    if (matches) count++;
  }
  return count;
}

function tokenStartForAnswer(tokens: string[], answer: string, occurrenceIndex: number): number {
  const parts = normalizeWord(answer).split(/\s+/).filter(Boolean);
  let seen = 0;
  for (let i = 0; i < tokens.length; i++) {
    let matches = true;
    for (let p = 0; p < parts.length; p++) {
      if (tokens[i + p] !== parts[p]) {
        matches = false;
        break;
      }
    }
    if (!matches) continue;
    if (seen === occurrenceIndex) return i;
    seen += 1;
  }
  return -1;
}

function classifyPrepositionInPhrase(answer: string, phrase: LessonPhrase, occurrenceIndex: number): PrepositionKind {
  const textKind = classifyPreposition(answer);
  const normalized = normalizeWord(answer);
  const tokens = tokensFromEnglish(phrase.english);
  const index = tokenStartForAnswer(tokens, normalized, occurrenceIndex);
  const prev = index >= 0 ? (tokens[index - 1] ?? '') : '';
  const next = index >= 0 ? (tokens[index + normalized.split(/\s+/).length] ?? '') : '';
  const next2 = index >= 0 ? (tokens[index + normalized.split(/\s+/).length + 1] ?? '') : '';

  if (['from', 'into', 'onto', 'through', 'across', 'toward', 'towards', 'along'].includes(normalized)) {
    return 'direction';
  }

  if (normalized === 'to') {
    if (MOVEMENT_OR_TRANSFER_PREV.has(prev) || DESTINATION_NOUNS.has(next)) return 'direction';
    return 'other';
  }

  if (['at', 'on', 'in'].includes(normalized)) {
    if (AT_WORDS.has(next) || ON_WORDS.has(next) || IN_WORDS.has(next) || (next === 'the' && IN_WORDS.has(next2))) {
      return 'time';
    }
    return 'place';
  }

  if (['before', 'after', 'during', 'since', 'until'].includes(normalized)) return 'time';

  if (normalized === 'for') {
    if (TIME_FOLLOWERS.has(next) || /^\d+$/.test(next)) return 'time';
    return 'other';
  }

  if (normalized === 'by') {
    if (TIME_FOLLOWERS.has(next) || AT_WORDS.has(next) || /^\d+$/.test(next)) return 'time';
    return 'other';
  }

  if (placeSet.has(normalized)) return 'place';

  return textKind;
}

function prepositionCandidatesForPhrase(phrase: LessonPhrase): PrepCandidate[] {
  const result: PrepCandidate[] = [];
  const seen = new Set<string>();
  const taggedAnswers = taggedPrepositionAnswers(phrase);

  for (const answer of taggedAnswers) {
    const key = `tagged:${answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      answer,
      kind: classifyPrepositionInPhrase(answer, phrase, 0),
      phrase,
      occurrenceIndex: 0,
      source: 'tagged',
    });
  }

  const tokens = tokensFromEnglish(phrase.english);
  const compoundCovered = new Set<number>();

  for (let index = 0; index < tokens.length; index++) {
    const compound = compoundAt(tokens, index);
    if (!compound || taggedAnswerCoversToken(compound.split(' ')[0], phrase.english, taggedAnswers)) continue;

    const parts = compound.split(' ');
    const coveredByTagged = parts.some((part) => taggedAnswerCoversToken(part, phrase.english, taggedAnswers));
    if (coveredByTagged) continue;

    const key = `auto:${index}:${compound}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({
        answer: compound,
        kind: classifyPrepositionInPhrase(compound, phrase, occurrenceIndexForCompound(tokens, index, compound)),
        phrase,
        occurrenceIndex: occurrenceIndexForCompound(tokens, index, compound),
        source: 'auto',
      });
      for (let i = 0; i < parts.length; i++) compoundCovered.add(index + i);
    }
  }

  tokens.forEach((token, index) => {
    if (compoundCovered.has(index)) return;
    if (!isDrillPrepositionOccurrence(tokens, index)) return;
    if (taggedAnswerCoversToken(token, phrase.english, taggedAnswers)) return;

    const key = `auto:${index}:${token}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push({
      answer: token,
      kind: classifyPrepositionInPhrase(token, phrase, occurrenceIndexForToken(tokens, index, token)),
      phrase,
      occurrenceIndex: occurrenceIndexForToken(tokens, index, token),
      source: 'auto',
    });
  });

  return result;
}

function buildRawLessonPrepositions(lessonId: number): LessonPreposition[] {
  const seenCurrent = new Set<string>();
  const result: LessonPreposition[] = [];
  for (const phrase of getLessonData(lessonId)) {
    for (const candidate of prepositionCandidatesForPhrase(phrase)) {
      const text = normalizeWord(candidate.answer);
      const key = prepositionKey({ text, kind: candidate.kind });
      if (!text || seenCurrent.has(key)) continue;
      seenCurrent.add(key);
      result.push({ text, kind: candidate.kind });
    }
  }
  return result;
}

function buildLessonPrepositions(lessonId: number): LessonPreposition[] {
  const priorSet = getPrepositionsBeforeLesson(lessonId);
  return buildRawLessonPrepositions(lessonId).filter(p => !priorSet.has(prepositionKey(p)));
}

const priorPrepositionsCache = new Map<number, Set<string>>();
function getPrepositionsBeforeLesson(lessonId: number): Set<string> {
  const cached = priorPrepositionsCache.get(lessonId);
  if (cached) return cached;
  const set = new Set<string>();
  for (let i = 1; i < lessonId; i++) {
    for (const p of buildLessonPrepositions(i)) set.add(prepositionKey(p));
  }
  priorPrepositionsCache.set(lessonId, set);
  return set;
}

const ITEM_CAP = 12;

function deterministicShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  const rand = () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const AT_WORDS = new Set([
  'eight', 'nine', 'ten', 'eleven', 'twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
  'noon', 'midnight', 'night', 'dawn', 'dusk', 'lunchtime', 'dinnertime',
]);

const ON_WORDS = new Set([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'mondays', 'tuesdays', 'wednesdays', 'thursdays', 'fridays', 'saturdays', 'sundays',
  'weekends', 'weekend', 'weekday', 'weekdays',
]);

const IN_WORDS = new Set([
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  'winter', 'spring', 'summer', 'autumn', 'fall',
  'morning', 'afternoon', 'evening',
]);

function uniqueOptions(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values.map(normalizeWord).filter(Boolean)) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function pickFalsePrepDistractors(correct: string, seed: string, sentence: string): string[] {
  const c = normalizeWord(correct);
  const words = tokensFromEnglish(sentence);
  const prepIdx = words.indexOf(c);
  const wordAfter = prepIdx >= 0 ? (words[prepIdx + 1] ?? '') : '';
  const wordAfter2 = prepIdx >= 0 ? (words[prepIdx + 2] ?? '') : '';

  let slotType: 'at' | 'on' | 'in' | 'unknown' = 'unknown';
  if (AT_WORDS.has(wordAfter)) slotType = 'at';
  else if (ON_WORDS.has(wordAfter)) slotType = 'on';
  else if (IN_WORDS.has(wordAfter)) slotType = 'in';
  else if (wordAfter === 'the' && IN_WORDS.has(wordAfter2)) slotType = 'in';

  const timeCore = ['at', 'on', 'in'];
  if (slotType !== 'unknown' && timeCore.includes(c)) {
    const thirdDistractor = c !== 'by' ? 'by' : 'per';
    return deterministicShuffle(uniqueOptions([...timeCore.filter(p => p !== c), thirdDistractor]), `${seed}|ctx`).slice(0, 3);
  }

  const pools: Record<PrepositionKind, string[]> = {
    time: ['at', 'on', 'in', 'before', 'after', 'during', 'by', 'until', 'for'],
    place: ['in', 'on', 'at', 'under', 'near', 'behind', 'inside', 'outside', 'next to', 'between'],
    direction: ['to', 'from', 'into', 'onto', 'through', 'across', 'along', 'toward'],
    other: ['for', 'of', 'with', 'by', 'about', 'without', 'from', 'to'],
  };
  const pool = pools[classifyPreposition(c)] ?? pools.other;
  return deterministicShuffle(uniqueOptions(pool.filter(p => p !== c)), `${seed}|fallback`).slice(0, 3);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function answerPattern(answer: string): RegExp {
  const parts = normalizeWord(answer).split(/\s+/).filter(Boolean).map(escapeRegExp);
  return new RegExp(`\\b${parts.join('\\s+')}\\b`, 'gi');
}

function templateForCandidate(candidate: PrepCandidate): string {
  let seen = 0;
  return candidate.phrase.english.replace(answerPattern(candidate.answer), (match) => {
    if (seen === candidate.occurrenceIndex) {
      seen += 1;
      return '__';
    }
    seen += 1;
    return match;
  });
}

function buildItemsForLesson(lessonId: number, lessonPrepositions: Set<string>) {
  const all: LessonPrepositionPack['items'] = [];
  const seenItems = new Set<string>();
  let idx = 1;

  for (const phrase of getLessonData(lessonId)) {
    for (const candidate of prepositionCandidatesForPhrase(phrase)) {
      const answer = normalizeWord(candidate.answer);
      if (!lessonPrepositions.has(prepositionKey({ text: answer, kind: candidate.kind }))) continue;

      const template = templateForCandidate(candidate);
      const itemKey = `${phrase.id}|${template}|${answer}`;
      if (!template.includes('__') || seenItems.has(itemKey)) continue;

      const itemId = `l${lessonId}-p${idx}`;
      const falsePreps = pickFalsePrepDistractors(answer, `${itemId}|${template}`, phrase.english);
      const rawOptions = uniqueOptions([answer, ...falsePreps]);
      if (rawOptions.length < 2) continue;

      idx += 1;
      seenItems.add(itemKey);
      const options = deterministicShuffle(rawOptions, `${itemId}|${template}|${answer}`);
      const explanation = explainPrepositionChoice(answer, phrase.english);
      all.push({
        id: itemId,
        sentenceTemplate: template,
        correct: answer,
        options,
        explainRU: explanation.ru,
        explainUK: explanation.uk,
        explainES: explanation.es,
      });
    }
  }

  return all.slice(0, ITEM_CAP);
}

export function getLessonPrepositionPack(lessonId: number): LessonPrepositionPack | null {
  const lessonPrepositions = buildLessonPrepositions(lessonId);
  if (!lessonPrepositions.length) return null;

  const lessonSet = new Set(lessonPrepositions.map(prepositionKey));
  const items = buildItemsForLesson(lessonId, lessonSet);
  if (!items.length) return null;

  const priorSet = getPrepositionsBeforeLesson(lessonId);
  const itemPrepositions = new Set(items.map(item => item.correct));
  const visiblePrepositions = lessonPrepositions.filter(p => itemPrepositions.has(p.text));
  const ordered = [
    ...visiblePrepositions.filter(p => !priorSet.has(prepositionKey(p))),
    ...visiblePrepositions.filter(p => priorSet.has(prepositionKey(p))),
  ];

  return {
    lessonId,
    newPrepositions: ordered,
    items,
  };
}

export function hasLessonPrepositionDrill(lessonId: number): boolean {
  return getLessonPrepositionPack(lessonId) !== null;
}

export function getLessonPrepositionTexts(lessonId: number): string[] {
  return buildLessonPrepositions(lessonId).map(p => `${p.text} (${p.kind})`);
}

export default function __RouteShim() { return null; }
