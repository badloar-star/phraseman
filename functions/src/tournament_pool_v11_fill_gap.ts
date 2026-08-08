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
const CATEGORY_ALIASES: Readonly<Record<string, FillGapCategory>> = {
  verb: 'verb', verbs: 'verb', noun: 'noun', nouns: 'noun', adjective: 'adjective', adjectives: 'adjective',
  adverb: 'adverb', adverbs: 'adverb', 'phrasal particle': 'phrasal_particle', particle: 'phrasal_particle',
  preposition: 'preposition', prepositions: 'preposition', modal: 'modal', modals: 'modal',
  pronoun: 'pronoun', pronouns: 'pronoun', conjunction: 'conjunction', conjunctions: 'conjunction',
  determiner: 'determiner', determiners: 'determiner', existential: 'existential', article: 'article', articles: 'article',
  'to be': 'to_be', be: 'to_be', number: 'number_time', time: 'number_time', 'number time': 'number_time',
  interjection: 'lexical_other', interjections: 'lexical_other', 'lexical other': 'lexical_other', other: 'lexical_other',
};

function normalized(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLowerCase();
}

function categoryFor(word: SourceWord): FillGapCategory | null {
  const token = normalized(word.text);
  const pos = normalized(word.partOfSpeech).replace(/[_-]+/gu, ' ');
  if (!pos || !CATEGORY_ALIASES[pos]) return null;
  if (pos === 'verb' && /^(am|is|are|was|were|be|being|been)$/u.test(token)) return 'to_be';
  return CATEGORY_ALIASES[pos];
}

function trapFor(category: FillGapCategory, correct: string, wrong: string): FillGapTrapType {
  if (category === 'preposition' || category === 'phrasal_particle') return 'government';
  if (category === 'pronoun') return 'reference';
  if (category === 'modal' || category === 'conjunction' || category === 'determiner'
    || category === 'existential' || category === 'article') return 'function_choice';
  if (category === 'to_be') return 'agreement';
  if ((category === 'verb' || category === 'noun') && sameVerbStem(correct, wrong)) return 'morphology';
  if (category === 'verb') return 'lexical_meaning';
  if (category === 'noun' || category === 'adjective' || category === 'adverb') return 'lexical_meaning';
  return 'collocation';
}

function sameVerbStem(left: string, right: string): boolean {
  const authored = lemmaKeys(left);
  return [...lemmaKeys(right)].some((form) => authored.has(form));
}

function lemmaKeys(value: string): ReadonlySet<string> {
  const token = normalized(value);
  const keys = new Set<string>(token.length >= 3 ? [token] : []);
  const add = (form: string) => { if (form.length >= 3) keys.add(form); };
  if (token.endsWith('ies')) add(`${token.slice(0, -3)}y`);
  if (token.endsWith('s') && !token.endsWith('ss')) add(token.slice(0, -1));
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

function reasonFor(value: string, correct: string, translation: string, trap: FillGapTrapType): string {
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
  if (!authoredSentence || !translation || !Array.isArray(phrase.words) || !phrase.words.length
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
    for (const raw of [...word.distractors, ...deterministicFallbacks]) {
      const value = raw;
      if (!isSafeOption(value, correct) || seen.has(normalized(value))) continue;
      const trapType = trapFor(category, correct, value);
      const completedSentence = sentenceWith(tokens, index, replacementFor(tokens[index], value));
      if (completedSentence === authoredSentence) continue;
      const reason = reasonFor(value, correct, translation, trapType);
      if (!reason.includes(value) || !completedSentence.includes(value)
        || Buffer.byteLength(completedSentence, 'utf8') > TOURNAMENT_TASK_LIMITS.referenceBytes
        || Buffer.byteLength(reason, 'utf8') > TOURNAMENT_TASK_LIMITS.explanationBytes) continue;
      seen.add(normalized(value));
      selected.push({ value, trapType, completedSentence, reason });
      if (selected.length === 3) break;
    }
    if (selected.length !== 3) continue;
    const position = index === lexicalIndices[0] ? 'first'
      : index === lexicalIndices[lexicalIndices.length - 1] ? 'last' : 'middle';
    const prompt = sentenceWith(tokens, index, replacementFor(tokens[index], '___'));
    if (prompt.replace('___', correct) !== authoredSentence) continue;
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
