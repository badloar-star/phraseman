import {
  createTournamentProvenanceKey,
  type FillGapTrapType,
  type TournamentProvenanceKey,
} from './tournament_semantic_contract';
import type { SourceDay, SourcePhrase, SourceWord } from './tournament_task_factory';

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

const TOKEN = /^[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*$/u;
const ARTICLES = new Set(['a', 'an', 'the']);
const TO_BE = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'being', 'been']);
const FALLBACKS: Readonly<Record<FillGapCategory, readonly string[]>> = {
  verb: ['walks', 'walked', 'runs'], noun: ['cat', 'dog', 'rat'], adjective: ['big', 'old', 'new'],
  adverb: ['slowly', 'softly', 'badly'], phrasal_particle: ['on', 'up', 'in'],
  preposition: ['in', 'on', 'at'], modal: ['can', 'may', 'must'], pronoun: ['he', 'she', 'we'],
  conjunction: ['and', 'but', 'or'], determiner: ['this', 'that', 'some'],
  existential: ['there', 'here', 'where'], article: ['a', 'an', 'the'], to_be: ['am', 'is', 'are'],
  number_time: ['1', '2', '3'], lexical_other: ['hello', 'sorry', 'thanks'],
};

function normalized(value: string): string { return value.trim().toLocaleLowerCase('en'); }

function categoryFor(word: SourceWord): FillGapCategory {
  const token = normalized(word.text);
  const pos = normalized(word.partOfSpeech).replace(/[ _-]+/g, ' ');
  if (pos.includes('phrasal') || pos.includes('particle')) return 'phrasal_particle';
  if (ARTICLES.has(token) || pos.includes('article')) return 'article';
  if (TO_BE.has(token) || pos.includes('to be') || pos === 'be') return 'to_be';
  if (token === 'there' && (pos.includes('exist') || pos === 'there')) return 'existential';
  if (/^\d+(?::\d+)?$/.test(token) || pos.includes('number') || pos.includes('time')) return 'number_time';
  if (pos.includes('preposition')) return 'preposition';
  if (pos.includes('modal')) return 'modal';
  if (pos.includes('pronoun')) return 'pronoun';
  if (pos.includes('conjunction')) return 'conjunction';
  if (pos.includes('determiner')) return 'determiner';
  if (pos.includes('adjective')) return 'adjective';
  if (pos.includes('adverb')) return 'adverb';
  if (pos.includes('noun')) return 'noun';
  if (pos.includes('verb')) return 'verb';
  return 'lexical_other';
}

function trapFor(category: FillGapCategory, correct: string, wrong: string): FillGapTrapType {
  if (category === 'preposition' || category === 'phrasal_particle') return 'government';
  if (category === 'pronoun') return 'reference';
  if (category === 'modal' || category === 'conjunction' || category === 'determiner'
    || category === 'existential' || category === 'article') return 'function_choice';
  if (category === 'to_be') return 'agreement';
  if (category === 'verb' && sameVerbStem(correct, wrong)) return 'morphology';
  if (category === 'verb') return 'lexical_meaning';
  if (category === 'noun' || category === 'adjective' || category === 'adverb') return 'lexical_meaning';
  return 'collocation';
}

function sameVerbStem(left: string, right: string): boolean {
  const stem = (value: string) => normalized(value).replace(/(ies|ing|ed|es|s)$/u, '');
  return stem(left).length >= 3 && stem(left) === stem(right);
}

function sentenceWith(tokens: readonly string[], index: number, value: string): string {
  return tokens.map((token, tokenIndex) => (tokenIndex === index ? value : token)).join(' ');
}

function lexicalToken(value: string): string {
  return value.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}'-]+$/gu, '');
}

function replacementFor(rawToken: string, value: string): string {
  const start = rawToken.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? '';
  const end = rawToken.match(/[^\p{L}\p{N}'-]*$/u)?.[0] ?? '';
  return `${start}${value}${end}`;
}

function isSafeOption(value: string, correct: string): boolean {
  if (value !== value.trim() || !TOKEN.test(value)) return false;
  if (normalized(value) === normalized(correct)) return false;
  // A large spelling-length gap is a visible test-taking hint, not a learner trap.
  return Math.abs([...value].length - [...correct].length) <= Math.max(3, Math.ceil([...correct].length / 2));
}

function reasonFor(value: string, trap: FillGapTrapType): string {
  const explanations: Record<FillGapTrapType, string> = {
    morphology: `“${value}” has the wrong inflection for this authored form.`,
    lexical_meaning: `“${value}” changes the authored meaning in the supplied context.`,
    collocation: `“${value}” does not make the authored word partnership in this sentence.`,
    government: `“${value}” uses a different required preposition or particle pattern.`,
    agreement: `“${value}” does not match the required subject, number, or be-form.`,
    reference: `“${value}” points to the wrong person, number, or referent here.`,
    function_choice: `“${value}” is the wrong function word for this authored sentence.`,
  };
  return explanations[trap];
}

/** Builds review-only candidates; semantic judges, not this function, decide uniqueness. */
export function buildFillGapCandidates(day: SourceDay, phrase: SourcePhrase): readonly FillGapCandidate[] {
  const authoredSentence = phrase.english.trim();
  const tokens = authoredSentence.split(/\s+/);
  const lexicalIndices = tokens.map((token, index) => (TOKEN.test(lexicalToken(token)) ? index : -1)).filter((index) => index >= 0);
  if (!authoredSentence || !phrase.meaning?.ru?.trim() || !phrase.words?.length) return [];

  const candidates: FillGapCandidate[] = [];
  for (const word of phrase.words) {
    const matching = lexicalIndices.filter((index) => normalized(lexicalToken(tokens[index])) === normalized(word.text));
    if (matching.length !== 1 || !TOKEN.test(word.text)) continue;
    const index = matching[0];
    const correct = lexicalToken(tokens[index]);
    if (!TOKEN.test(correct)) continue;
    // Authoring errors must not be silently repaired by generic fallbacks.
    if (word.distractors.some((raw) => !isSafeOption(String(raw).trim(), correct))) continue;
    if (new Set(word.distractors.map((raw) => normalized(String(raw)))).size !== word.distractors.length) continue;
    const category = categoryFor(word);
    const selected: FillGapDistractor[] = [];
    const seen = new Set([normalized(correct)]);
    for (const raw of [...word.distractors, ...FALLBACKS[category]]) {
      const value = String(raw).trim();
      if (!isSafeOption(value, correct) || seen.has(normalized(value))) continue;
      const trapType = trapFor(category, correct, value);
      const completedSentence = sentenceWith(tokens, index, replacementFor(tokens[index], value));
      if (completedSentence === authoredSentence) continue;
      const reason = reasonFor(value, trapType);
      if (!reason.includes(value) || !completedSentence.includes(value)) continue;
      seen.add(normalized(value));
      selected.push({ value, trapType, completedSentence, reason });
      if (selected.length === 3) break;
    }
    if (selected.length !== 3) continue;
    const position = index === lexicalIndices[0] ? 'first'
      : index === lexicalIndices[lexicalIndices.length - 1] ? 'last' : 'middle';
    const prompt = sentenceWith(tokens, index, replacementFor(tokens[index], '___'));
    if (prompt.replace('___', correct) !== authoredSentence) continue;
    candidates.push({
      correctToken: correct,
      category,
      position,
      prompt,
      translation: phrase.meaning.ru.trim(),
      authoredSentence,
      distractors: selected as [FillGapDistractor, FillGapDistractor, FillGapDistractor],
      provenanceKey: createTournamentProvenanceKey(`${day.planId}:${day.dayIndex}:${phrase.id}`),
      requiresSemanticReview: true,
    });
  }
  return candidates;
}
