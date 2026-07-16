export type CandidatePartOfSpeech = 'word' | 'irregular_verb' | 'phrasal_verb' | 'preposition';

export interface LessonPhraseEvidence {
  readonly id: string;
  readonly targetText: string;
}

export interface LessonCandidate {
  readonly lemma: string;
  readonly surface: string;
  readonly partOfSpeech: CandidatePartOfSpeech;
  readonly sourcePhraseIds: readonly string[];
}

export interface LessonExtractionReceipt {
  readonly state: 'ready' | 'review_required';
  readonly reason?: 'lemmatizer_unsupported';
  readonly studyTarget: string;
  readonly vocabulary: readonly LessonCandidate[];
  readonly irregularVerbs: readonly LessonCandidate[];
  readonly prepositions: readonly LessonCandidate[];
}

const IRREGULAR: Readonly<Record<string, string>> = Object.freeze({
  was: 'be', were: 'be', been: 'be', went: 'go', gone: 'go', took: 'take', taken: 'take', came: 'come', come: 'come',
  saw: 'see', seen: 'see', did: 'do', done: 'do', had: 'have', made: 'make', said: 'say', got: 'get', gotten: 'get',
  gave: 'give', given: 'give', knew: 'know', known: 'know', thought: 'think', bought: 'buy', brought: 'bring', found: 'find',
});
const PHRASAL = ['look after', 'come back', 'go out', 'take off', 'get up', 'find out', 'give up', 'turn on', 'turn off'] as const;
const PREPOSITIONS = ['in front of', 'because of', 'next to', 'out of', 'according to', 'at', 'in', 'on', 'to', 'from', 'with', 'for', 'of', 'by'] as const;
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'she', 'he', 'it', 'they', 'we', 'i', 'you', 'please', 'because', 'was', 'were', 'is', 'are']);

function words(value: string): string[] {
  return value.normalize('NFKC').toLocaleLowerCase('en').match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
}

function add(map: Map<string, { lemma: string; surface: string; partOfSpeech: CandidatePartOfSpeech; ids: Set<string> }>, candidate: Omit<LessonCandidate, 'sourcePhraseIds'>, phraseId: string): void {
  const key = `${candidate.partOfSpeech}\u0000${candidate.lemma}`;
  const current = map.get(key) ?? { ...candidate, ids: new Set<string>() };
  current.ids.add(phraseId);
  map.set(key, current);
}

function finish(map: Map<string, { lemma: string; surface: string; partOfSpeech: CandidatePartOfSpeech; ids: Set<string> }>): readonly LessonCandidate[] {
  return Object.freeze([...map.values()].map((item) => Object.freeze({ lemma: item.lemma, surface: item.surface, partOfSpeech: item.partOfSpeech, sourcePhraseIds: Object.freeze([...item.ids].sort()) })).sort((a, b) => a.lemma.localeCompare(b.lemma)));
}

export function extractLessonCandidates(input: { readonly studyTarget: string; readonly phrases: readonly LessonPhraseEvidence[] }): LessonExtractionReceipt {
  if (input.studyTarget !== 'en') return Object.freeze({ state: 'review_required', reason: 'lemmatizer_unsupported', studyTarget: input.studyTarget, vocabulary: Object.freeze([]), irregularVerbs: Object.freeze([]), prepositions: Object.freeze([]) });
  const vocabulary = new Map<string, { lemma: string; surface: string; partOfSpeech: CandidatePartOfSpeech; ids: Set<string> }>();
  const irregular = new Map<string, { lemma: string; surface: string; partOfSpeech: CandidatePartOfSpeech; ids: Set<string> }>();
  const prepositions = new Map<string, { lemma: string; surface: string; partOfSpeech: CandidatePartOfSpeech; ids: Set<string> }>();
  for (const phrase of input.phrases) {
    const tokens = words(phrase.targetText);
    const joined = tokens.join(' ');
    for (const [surface, lemma] of Object.entries(IRREGULAR)) if (tokens.includes(surface)) add(irregular, { lemma, surface, partOfSpeech: 'irregular_verb' }, phrase.id);
    for (const lemma of PHRASAL) if (` ${joined} `.includes(` ${lemma} `) || (lemma === 'go out' && /\bwent out\b/.test(joined)) || (lemma === 'come back' && /\bcame back\b/.test(joined))) add(vocabulary, { lemma, surface: lemma, partOfSpeech: 'phrasal_verb' }, phrase.id);
    for (const lemma of PREPOSITIONS) if (` ${joined} `.includes(` ${lemma} `)) add(prepositions, { lemma, surface: lemma, partOfSpeech: 'preposition' }, phrase.id);
    for (const token of tokens) if (token.length > 2 && !STOP.has(token) && !IRREGULAR[token]) add(vocabulary, { lemma: token, surface: token, partOfSpeech: 'word' }, phrase.id);
  }
  return Object.freeze({ state: 'ready', studyTarget: input.studyTarget, vocabulary: finish(vocabulary), irregularVerbs: finish(irregular), prepositions: finish(prepositions) });
}
