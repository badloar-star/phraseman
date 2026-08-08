import {
  createTournamentProvenanceKey,
  type FillGapTrapType,
  type TournamentProvenanceKey,
} from './tournament_semantic_contract';
import { phraseTokens, type SourceDay, type SourcePhrase, type SourceWord } from './tournament_task_factory';
import { TOURNAMENT_TASK_LIMITS } from './tournament_core';

export type FillGapCategory =
  | 'verb' | 'noun' | 'adjective' | 'adverb' | 'phrasal_particle' | 'preposition'
  | 'modal' | 'pronoun' | 'conjunction' | 'determiner' | 'existential' | 'article'
  | 'to_be' | 'number_time' | 'lexical_other';

export type FillGapDistractor = {
  readonly value: string;
  readonly trapType: FillGapTrapType;
  readonly completedSentence: string;
  readonly reason: string;
};

export type FillGapCandidate = {
  readonly correctToken: string;
  readonly category: FillGapCategory;
  readonly position: 'first' | 'middle' | 'last';
  readonly prompt: string;
  readonly translation: string;
  readonly authoredSentence: string;
  readonly distractors: readonly [FillGapDistractor, FillGapDistractor, FillGapDistractor];
  readonly provenanceKey: TournamentProvenanceKey;
  /** These deterministic candidates are never publication evidence. */
  readonly requiresSemanticReview: true;
};

const TOKEN = /^[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*$/u;
const FUNCTION_FALLBACKS: Readonly<Partial<Record<FillGapCategory, readonly string[]>>> = {
  article: ['a', 'an', 'the'],
  to_be: ['am', 'is', 'are', 'was', 'were', 'be', 'being', 'been'],
  modal: ['can', 'could', 'may', 'might', 'must', 'should', 'will', 'would'],
};
const CATEGORY_ALIASES: ReadonlyMap<string, FillGapCategory> = new Map(Object.entries({
  verb: 'verb', verbs: 'verb', noun: 'noun', nouns: 'noun', adjective: 'adjective', adjectives: 'adjective',
  adverb: 'adverb', adverbs: 'adverb', 'phrasal particle': 'phrasal_particle', particle: 'phrasal_particle',
  preposition: 'preposition', prepositions: 'preposition', modal: 'modal', modals: 'modal',
  pronoun: 'pronoun', pronouns: 'pronoun', conjunction: 'conjunction', conjunctions: 'conjunction',
  determiner: 'determiner', determiners: 'determiner', existential: 'existential', article: 'article', articles: 'article',
  'to be': 'to_be', be: 'to_be', number: 'number_time', time: 'number_time', 'number time': 'number_time',
  interjection: 'lexical_other', interjections: 'lexical_other', 'lexical other': 'lexical_other', other: 'lexical_other',
}) as [string, FillGapCategory][]);
type IrregularFamily = Readonly<{
  base: string;
  thirdPerson: string;
  past: string;
  participle: string;
  gerund: string;
}>;

// Exact learner-vocabulary paradigms. A registered form gets only its family identity;
// generic suffix stripping must never manufacture a neighbouring lemma such as does -> doe.
const IRREGULAR_FAMILIES: readonly IrregularFamily[] = [
  ['be', 'is', 'was', 'been', 'being'], ['do', 'does', 'did', 'done', 'doing'], ['go', 'goes', 'went', 'gone', 'going'],
  ['have', 'has', 'had', 'had', 'having'], ['say', 'says', 'said', 'said', 'saying'], ['make', 'makes', 'made', 'made', 'making'],
  ['take', 'takes', 'took', 'taken', 'taking'], ['come', 'comes', 'came', 'come', 'coming'], ['get', 'gets', 'got', 'gotten', 'getting'],
  ['see', 'sees', 'saw', 'seen', 'seeing'], ['eat', 'eats', 'ate', 'eaten', 'eating'], ['run', 'runs', 'ran', 'run', 'running'],
  ['bring', 'brings', 'brought', 'brought', 'bringing'], ['build', 'builds', 'built', 'built', 'building'], ['buy', 'buys', 'bought', 'bought', 'buying'],
  ['catch', 'catches', 'caught', 'caught', 'catching'], ['choose', 'chooses', 'chose', 'chosen', 'choosing'], ['cost', 'costs', 'cost', 'cost', 'costing'],
  ['cut', 'cuts', 'cut', 'cut', 'cutting'], ['deal', 'deals', 'dealt', 'dealt', 'dealing'], ['dig', 'digs', 'dug', 'dug', 'digging'],
  ['draw', 'draws', 'drew', 'drawn', 'drawing'], ['drink', 'drinks', 'drank', 'drunk', 'drinking'], ['drive', 'drives', 'drove', 'driven', 'driving'],
  ['fall', 'falls', 'fell', 'fallen', 'falling'], ['feed', 'feeds', 'fed', 'fed', 'feeding'], ['feel', 'feels', 'felt', 'felt', 'feeling'],
  ['fight', 'fights', 'fought', 'fought', 'fighting'], ['fly', 'flies', 'flew', 'flown', 'flying'], ['forget', 'forgets', 'forgot', 'forgotten', 'forgetting'],
  ['forgive', 'forgives', 'forgave', 'forgiven', 'forgiving'], ['freeze', 'freezes', 'froze', 'frozen', 'freezing'],
  ['give', 'gives', 'gave', 'given', 'giving'], ['grow', 'grows', 'grew', 'grown', 'growing'], ['hear', 'hears', 'heard', 'heard', 'hearing'],
  ['hold', 'holds', 'held', 'held', 'holding'], ['keep', 'keeps', 'kept', 'kept', 'keeping'], ['know', 'knows', 'knew', 'known', 'knowing'],
  ['lead', 'leads', 'led', 'led', 'leading'], ['leave', 'leaves', 'left', 'left', 'leaving'], ['lend', 'lends', 'lent', 'lent', 'lending'],
  ['lose', 'loses', 'lost', 'lost', 'losing'], ['mean', 'means', 'meant', 'meant', 'meaning'], ['meet', 'meets', 'met', 'met', 'meeting'],
  ['pay', 'pays', 'paid', 'paid', 'paying'], ['read', 'reads', 'read', 'read', 'reading'], ['ride', 'rides', 'rode', 'ridden', 'riding'],
  ['ring', 'rings', 'rang', 'rung', 'ringing'], ['rise', 'rises', 'rose', 'risen', 'rising'], ['find', 'finds', 'found', 'found', 'finding'],
  ['tell', 'tells', 'told', 'told', 'telling'], ['sell', 'sells', 'sold', 'sold', 'selling'], ['send', 'sends', 'sent', 'sent', 'sending'],
  ['set', 'sets', 'set', 'set', 'setting'], ['shake', 'shakes', 'shook', 'shaken', 'shaking'], ['shoot', 'shoots', 'shot', 'shot', 'shooting'],
  ['show', 'shows', 'showed', 'shown', 'showing'], ['sing', 'sings', 'sang', 'sung', 'singing'], ['sit', 'sits', 'sat', 'sat', 'sitting'],
  ['sleep', 'sleeps', 'slept', 'slept', 'sleeping'], ['speak', 'speaks', 'spoke', 'spoken', 'speaking'], ['spend', 'spends', 'spent', 'spent', 'spending'],
  ['stand', 'stands', 'stood', 'stood', 'standing'], ['steal', 'steals', 'stole', 'stolen', 'stealing'], ['swim', 'swims', 'swam', 'swum', 'swimming'],
  ['teach', 'teaches', 'taught', 'taught', 'teaching'], ['think', 'thinks', 'thought', 'thought', 'thinking'], ['throw', 'throws', 'threw', 'thrown', 'throwing'],
  ['understand', 'understands', 'understood', 'understood', 'understanding'], ['wake', 'wakes', 'woke', 'woken', 'waking'],
  ['wear', 'wears', 'wore', 'worn', 'wearing'], ['win', 'wins', 'won', 'won', 'winning'], ['write', 'writes', 'wrote', 'written', 'writing'],
  ['become', 'becomes', 'became', 'become', 'becoming'], ['begin', 'begins', 'began', 'begun', 'beginning'],
  ['break', 'breaks', 'broke', 'broken', 'breaking'], ['beat', 'beats', 'beat', 'beaten', 'beating'], ['bend', 'bends', 'bent', 'bent', 'bending'],
  ['bite', 'bites', 'bit', 'bitten', 'biting'], ['bleed', 'bleeds', 'bled', 'bled', 'bleeding'], ['blow', 'blows', 'blew', 'blown', 'blowing'],
  ['burn', 'burns', 'burned', 'burned', 'burning'], ['burst', 'bursts', 'burst', 'burst', 'bursting'], ['hide', 'hides', 'hid', 'hidden', 'hiding'],
  ['hit', 'hits', 'hit', 'hit', 'hitting'], ['hurt', 'hurts', 'hurt', 'hurt', 'hurting'], ['let', 'lets', 'let', 'let', 'letting'],
  ['put', 'puts', 'put', 'put', 'putting'], ['shut', 'shuts', 'shut', 'shut', 'shutting'], ['stick', 'sticks', 'stuck', 'stuck', 'sticking'],
  ['tear', 'tears', 'tore', 'torn', 'tearing'],
].map(([base, thirdPerson, past, participle, gerund]) => ({ base, thirdPerson, past, participle, gerund }));
export function buildIrregularLemmaFamilies(families: readonly IrregularFamily[]): ReadonlyMap<string, string> {
  const familyByForm = new Map<string, string>();
  for (const { base, thirdPerson, past, participle, gerund } of families) {
    const canonicalBase = normalized(base);
    for (const form of new Set([base, thirdPerson, past, participle, gerund].map(normalized))) {
      const existing = familyByForm.get(form);
      if (existing && existing !== canonicalBase) {
        throw new Error(`Irregular form "${form}" maps to both "${existing}" and "${canonicalBase}".`);
      }
      familyByForm.set(form, canonicalBase);
    }
  }
  return familyByForm;
}
const IRREGULAR_LEMMA_FAMILIES = buildIrregularLemmaFamilies(IRREGULAR_FAMILIES);
// These strings are common non-verb words as well as irregular surfaces. Without
// syntactic/semantic proof, neither a morphology nor a lexical-meaning claim is safe.
const AMBIGUOUS_INFLECTION_FAMILIES = [
  ['found'], ['saw'], ['left'], ['rose'], ['fell'], ['lay'], ['read'], ['lead'], ['bound'], ['wound'], ['bore'], ['rent'], ['ground'],
] as const;
const AMBIGUOUS_IRREGULAR_SURFACES = new Set(AMBIGUOUS_INFLECTION_FAMILIES.flatMap((family) => family.map(normalized)));
type GovernedCollocationRule = Readonly<{
  correctFamily: string;
  wrongFamily: string;
  complement: readonly string[];
}>;
const GOVERNED_COLLOCATION_RULES: readonly GovernedCollocationRule[] = [
  { correctFamily: 'make', wrongFamily: 'do', complement: ['a', 'decision'] },
];

function normalized(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLowerCase();
}

function categoryFor(word: SourceWord): FillGapCategory | null {
  const token = normalized(word.text);
  const pos = normalized(word.partOfSpeech).replace(/[_-]+/gu, ' ');
  const category = pos ? CATEGORY_ALIASES.get(pos) : undefined;
  if (!category) return null;
  if (category !== 'verb') return category;
  if (/^(isn't|isn’t|aren't|aren’t|wasn't|wasn’t|weren't|weren’t|ain't|ain’t)$/u.test(token)) return null;
  if (/^(am|is|are|was|were|be|being|been)$/u.test(token)) return 'to_be';
  return category;
}

function verbFamily(value: string): string {
  const token = normalized(value);
  return IRREGULAR_LEMMA_FAMILIES.get(token) ?? token;
}

function governedCollocationFor(correct: string, wrong: string, tokens: readonly string[], blankIndex: number): string | null {
  const correctFamily = verbFamily(correct);
  const wrongFamily = verbFamily(wrong);
  for (const rule of GOVERNED_COLLOCATION_RULES) {
    if (correctFamily !== rule.correctFamily || wrongFamily !== rule.wrongFamily) continue;
    const complement = tokens.slice(blankIndex + 1).map((token) => normalized(lexicalToken(token)));
    if (complement.length === rule.complement.length && rule.complement.every((token, index) => complement[index] === token)) {
      return [normalized(correct), ...rule.complement].join(' ');
    }
  }
  return null;
}

function trapFor(category: FillGapCategory, correct: string, wrong: string, tokens: readonly string[], blankIndex: number): FillGapTrapType | null {
  if (category === 'verb' && governedCollocationFor(correct, wrong, tokens, blankIndex)) return 'collocation';
  if (category === 'preposition' || category === 'phrasal_particle') return 'government';
  if (category === 'pronoun') return 'reference';
  if (category === 'modal' || category === 'conjunction' || category === 'determiner'
    || category === 'existential' || category === 'article') return 'function_choice';
  if (category === 'to_be') return toBeTrap(correct, wrong);
  if (category === 'lexical_other' || category === 'number_time') return 'lexical_meaning';
  if (category === 'verb' && (AMBIGUOUS_IRREGULAR_SURFACES.has(normalized(correct))
    || AMBIGUOUS_IRREGULAR_SURFACES.has(normalized(wrong)))) return null;
  if (category === 'verb' && sameVerbStem(correct, wrong, true)) return 'morphology';
  if (category === 'noun' && potentialNounInflection(correct, wrong)) return null;
  if (category === 'verb') return 'lexical_meaning';
  if (category === 'noun' || category === 'adjective' || category === 'adverb') return 'lexical_meaning';
  return 'collocation';
}

function potentialNounInflectionKeys(value: string): ReadonlySet<string> {
  const token = normalized(value);
  const keys = new Set([token]);
  const add = (candidate: string) => { if (candidate.length >= 2) keys.add(candidate); };
  if (token.endsWith('ies')) add(`${token.slice(0, -3)}y`);
  if (token.endsWith('ves')) {
    add(`${token.slice(0, -3)}f`);
    add(`${token.slice(0, -3)}fe`);
  }
  if (token.endsWith('es')) add(token.slice(0, -2));
  if (token.endsWith('s') && !token.endsWith('ss')) add(token.slice(0, -1));
  if (token.endsWith('f')) add(`${token.slice(0, -1)}ves`);
  if (token.endsWith('fe')) add(`${token.slice(0, -2)}ves`);
  if (token.endsWith('y')) add(`${token.slice(0, -1)}ies`);
  if (/(?:s|x|z|ch|sh|o)$/u.test(token)) add(`${token}es`);
  else add(`${token}s`);
  return keys;
}

function potentialNounInflection(left: string, right: string): boolean {
  const leftKeys = potentialNounInflectionKeys(left);
  return [...potentialNounInflectionKeys(right)].some((key) => leftKeys.has(key));
}

function toBeTrap(correct: string, wrong: string): FillGapTrapType | null {
  const present = new Set(['am', 'is', 'are']);
  const past = new Set(['was', 'were']);
  const correctKey = normalized(correct);
  const wrongKey = normalized(wrong);
  if (present.has(correctKey) && present.has(wrongKey)) return 'agreement';
  if (past.has(correctKey) && past.has(wrongKey)) return null;
  return 'morphology';
}

function sameVerbStem(left: string, right: string, includeIrregular: boolean): boolean {
  const authored = lemmaKeys(left, includeIrregular);
  return [...lemmaKeys(right, includeIrregular)].some((form) => authored.has(form));
}

function lemmaKeys(value: string, includeIrregular: boolean): ReadonlySet<string> {
  const token = normalized(value);
  const irregularFamily = includeIrregular ? IRREGULAR_LEMMA_FAMILIES.get(token) : undefined;
  if (irregularFamily) return new Set([irregularFamily]);
  const keys = new Set<string>(token.length >= 3 ? [token] : []);
  const add = (form: string) => { if (form.length >= 3) keys.add(form); };
  if (token.endsWith('ies')) add(`${token.slice(0, -3)}y`);
  if (token.endsWith('s') && !token.endsWith('ss')) add(token.slice(0, -1));
  if (token.endsWith('es')) {
    const root = token.slice(0, -2);
    if (root === 'do' || root === 'go') keys.add(root);
    else add(root);
  }
  if (token.endsWith('ing')) {
    const root = token.slice(0, -3);
    add(root);
    if (root.length >= 2 && root.at(-1) === root.at(-2)) add(root.slice(0, -1));
    if (root.endsWith('i')) add(`${root.slice(0, -1)}y`);
    add(`${root}e`);
  }
  if (token.endsWith('ed')) {
    const root = token.slice(0, -2);
    add(root);
    if (root.length >= 2 && root.at(-1) === root.at(-2)) add(root.slice(0, -1));
    if (root.endsWith('i')) add(`${root.slice(0, -1)}y`);
    add(`${root}e`);
  }
  return keys;
}

function derivedVerbForms(correct: string): readonly string[] {
  const base = normalized(correct);
  // Only derive the fully regular vowel+y family; irregular and ambiguous verbs fail closed.
  if (!/^[a-z]{3,}$/u.test(base) || !/[aeiou]y$/u.test(base)) return [];
  return [`${base}s`, `${base}ed`, `${base}ing`];
}

function sentenceWith(tokens: readonly string[], index: number, value: string): string {
  return tokens.map((token, tokenIndex) => (tokenIndex === index ? value : token)).join(' ');
}

function lexicalToken(value: string): string {
  return value.replace(/^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}'’-]+$/gu, '');
}

function replacementFor(rawToken: string, value: string): string {
  const start = rawToken.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? '';
  const end = rawToken.match(/[^\p{L}\p{M}\p{N}'’-]*$/u)?.[0] ?? '';
  return `${start}${value}${end}`;
}

function isSafeOption(value: string, correct: string): boolean {
  if (value !== value.trim() || !TOKEN.test(value)) return false;
  if (Buffer.byteLength(value, 'utf8') > TOURNAMENT_TASK_LIMITS.optionBytes) return false;
  if (normalized(value) === normalized(correct)) return false;
  // A large spelling-length gap is a visible test-taking hint, not a learner trap.
  return Math.abs([...value].length - [...correct].length) <= Math.max(3, Math.ceil([...correct].length / 2));
}

function reasonFor(value: string, correct: string, translation: string, trap: FillGapTrapType, category: FillGapCategory, authoredCollocation?: string): string {
  if (trap === 'lexical_meaning' && category === 'number_time') {
    return `“${value}” changes the authored number or time; use “${correct}” for “${translation}”.`;
  }
  if (trap === 'lexical_meaning' && category === 'lexical_other') {
    return `“${value}” changes the authored communicative meaning; use “${correct}” for “${translation}”.`;
  }
  if (trap === 'collocation' && authoredCollocation) {
    return `“${value}” cannot replace “${correct}” in the authored collocation “${authoredCollocation}”.`;
  }
  const explanations: Record<FillGapTrapType, string> = {
    morphology: `“${value}” has the wrong form; use “${correct}” for the required inflection.`,
    lexical_meaning: `“${value}” is not “${correct}”, the token required by “${translation}”.`,
    collocation: `“${value}” cannot replace the authored collocation token “${correct}”.`,
    government: `“${value}” uses a different required preposition or particle pattern.`,
    agreement: `“${value}” does not match the required subject, number, or be-form.`,
    reference: `“${value}” points to the wrong person, number, or referent here.`,
    function_choice: `“${value}” is the wrong function word for this authored sentence.`,
  };
  return explanations[trap];
}

function withinCandidateLimits(candidate: Pick<FillGapCandidate, 'prompt' | 'translation' | 'authoredSentence' | 'correctToken'>, distractors: readonly FillGapDistractor[]): boolean {
  return Buffer.byteLength(candidate.correctToken, 'utf8') <= TOURNAMENT_TASK_LIMITS.optionBytes
    && Buffer.byteLength(candidate.prompt, 'utf8') <= TOURNAMENT_TASK_LIMITS.promptBytes
    && Buffer.byteLength(candidate.translation, 'utf8') <= TOURNAMENT_TASK_LIMITS.referenceBytes
    && Buffer.byteLength(candidate.authoredSentence, 'utf8') <= TOURNAMENT_TASK_LIMITS.referenceBytes
    && distractors.every((item) => Buffer.byteLength(item.value, 'utf8') <= TOURNAMENT_TASK_LIMITS.optionBytes
      && Buffer.byteLength(item.completedSentence, 'utf8') <= TOURNAMENT_TASK_LIMITS.referenceBytes
      && Buffer.byteLength(item.reason, 'utf8') <= TOURNAMENT_TASK_LIMITS.explanationBytes);
}

/** Builds review-only candidates; semantic judges, not this function, decide uniqueness. */
export function buildFillGapCandidates(day: SourceDay, phrase: SourcePhrase): readonly FillGapCandidate[] {
  const authoredSentence = typeof phrase.english === 'string' ? phrase.english.trim() : '';
  const translation = typeof phrase.meaning?.ru === 'string' ? phrase.meaning.ru.trim() : '';
  const tokens = authoredSentence.split(/\s+/);
  const lexicalIndices = tokens.map((token, index) => (TOKEN.test(lexicalToken(token)) ? index : -1)).filter((index) => index >= 0);
  if (!authoredSentence || authoredSentence.includes('___') || !translation || !Array.isArray(phrase.words) || !phrase.words.length
    || lexicalIndices.length !== phraseTokens(authoredSentence).length) return [];

  const candidates: FillGapCandidate[] = [];
  const optionSets = new Set<string>();
  for (const word of phrase.words) {
    if (!word || typeof word.text !== 'string' || typeof word.partOfSpeech !== 'string'
      || !Array.isArray(word.distractors)) continue;
    const matching = lexicalIndices.filter((index) => normalized(lexicalToken(tokens[index])) === normalized(word.text));
    if (matching.length !== 1 || !TOKEN.test(word.text)) continue;
    const index = matching[0];
    const correct = lexicalToken(tokens[index]);
    if (!TOKEN.test(correct)) continue;
    // Authoring errors must not be silently repaired by generic fallbacks.
    if (word.distractors.some((raw: unknown) => typeof raw !== 'string' || raw !== raw.trim() || !isSafeOption(raw, correct))) continue;
    if (new Set(word.distractors.map(normalized)).size !== word.distractors.length) continue;
    const category = categoryFor(word);
    if (!category) continue;
    const selected: FillGapDistractor[] = [];
    const seen = new Set([normalized(correct)]);
    const deterministicFallbacks = category === 'verb'
      ? derivedVerbForms(correct)
      : (FUNCTION_FALLBACKS[category] ?? []);
    let hasUnprovableAuthoredDistractor = false;
    for (const { value, authored } of [
      ...word.distractors.map((value: unknown) => ({ value: value as string, authored: true })),
      ...deterministicFallbacks.map((value) => ({ value, authored: false })),
    ]) {
      if (!isSafeOption(value, correct) || seen.has(normalized(value))) continue;
      const authoredCollocation = category === 'verb' ? governedCollocationFor(correct, value, tokens, index) : null;
      const trapType = trapFor(category, correct, value, tokens, index);
      if (!trapType) {
        if (authored) hasUnprovableAuthoredDistractor = true;
        continue;
      }
      if (selected.length === 3) continue;
      const completedSentence = sentenceWith(tokens, index, replacementFor(tokens[index], value));
      if (completedSentence === authoredSentence) continue;
      const reason = reasonFor(value, correct, translation, trapType, category, authoredCollocation ?? undefined);
      if (!reason.includes(value) || !completedSentence.includes(value)
        || Buffer.byteLength(completedSentence, 'utf8') > TOURNAMENT_TASK_LIMITS.referenceBytes
        || Buffer.byteLength(reason, 'utf8') > TOURNAMENT_TASK_LIMITS.explanationBytes) continue;
      seen.add(normalized(value));
      selected.push({ value, trapType, completedSentence, reason });
    }
    if (hasUnprovableAuthoredDistractor || selected.length !== 3) continue;
    const position = index === lexicalIndices[0] ? 'first'
      : index === lexicalIndices[lexicalIndices.length - 1] ? 'last' : 'middle';
    const prompt = sentenceWith(tokens, index, replacementFor(tokens[index], '___'));
    if (prompt.split('___').length !== 2) continue;
    const [beforeBlank, afterBlank] = prompt.split('___');
    if (`${beforeBlank}${correct}${afterBlank}` !== authoredSentence) continue;
    const candidate: FillGapCandidate = {
      correctToken: correct,
      category,
      position,
      prompt,
      translation,
      authoredSentence,
      distractors: selected as [FillGapDistractor, FillGapDistractor, FillGapDistractor],
      provenanceKey: createTournamentProvenanceKey(`${day.planId}:${day.dayIndex}:${phrase.id}`),
      requiresSemanticReview: true,
    };
    const optionSet = [candidate.correctToken, ...candidate.distractors.map((item) => item.value)]
      .map(normalized).sort().join('\u0000');
    if (!withinCandidateLimits(candidate, candidate.distractors) || optionSets.has(optionSet)) continue;
    optionSets.add(optionSet);
    candidates.push(candidate);
  }
  return candidates;
}
