import { createHash } from 'node:crypto';
import {
  createTournamentSemanticCandidate,
  validateTournamentSemanticCandidate,
  type ReviewSubject,
  type TournamentModeKind,
  type TournamentSemanticCandidate,
} from './tournament_semantic_contract';
import { buildFillGapCandidates } from './tournament_pool_v11_fill_gap';
import { parseDisplayGloss } from './tournament_pool_v11_gloss';
import {
  buildStrictGrammarTwinSets,
  type V11SourcePhrase,
  type V11SourceWord,
} from './tournament_pool_v11_grammar_twins';
import { buildGuessPhraseCandidates } from './tournament_pool_v11_guess_phrase';
import {
  buildOddityCandidates,
  type V11OdditySourceDay,
} from './tournament_pool_v11_oddity';

export const ALL_V11_MODES = Object.freeze([
  'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
] as const satisfies readonly TournamentModeKind[]);

const MAX_TRANSLATE_CANDIDATES_PER_PHRASE = 6;

export type V11VocabularyItem = Readonly<{
  word: string;
  partOfSpeech: string;
  translation: Readonly<{ ru: string }>;
}>;

export type V11CandidateSourceDay = V11OdditySourceDay & Readonly<{
  vocabulary?: readonly V11VocabularyItem[];
}>;

export type V11CandidateRejectionReason =
  | 'source_invalid'
  | 'candidate_invalid'
  | 'duplicate_candidate_id'
  | 'duplicate_semantic_signature'
  | 'historical_signature';

export type TournamentV11CandidateBuild = Readonly<{
  candidates: readonly TournamentSemanticCandidate[];
  rejections: Readonly<{
    total: number;
    byReason: Readonly<Partial<Record<V11CandidateRejectionReason, number>>>;
  }>;
}>;

const TOKEN = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu;
const SINGLE_TOKEN = /^[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*$/u;

function normalized(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('en');
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function difficultyFor(level: string | undefined): 1 | 2 | 3 {
  const value = normalized(level ?? '');
  if (value === 'a1') return 1;
  if (value === 'b1' || value === 'b2' || value === 'c1' || value === 'c2') return 3;
  return 2;
}

function tokens(value: string): readonly string[] {
  return Object.freeze([...value.matchAll(TOKEN)].map((match) => match[0]));
}

function provenanceKey(day: V11CandidateSourceDay, suffix: string): string {
  return `${day.planId}:${day.dayIndex}:${suffix}`;
}

function validSourceDay(value: unknown): value is V11CandidateSourceDay {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const day = value as Partial<V11CandidateSourceDay>;
  return typeof day.planId === 'string' && day.planId.trim().length > 0
    && Number.isInteger(day.dayIndex) && Number(day.dayIndex) >= 0
    && Array.isArray(day.phrases);
}

function buildDecoyCandidate(
  day: V11CandidateSourceDay,
  phrase: V11SourcePhrase,
  decoy: string,
  sourceWord: string,
  partOfSpeech: string,
  reason: string,
  relationship: string,
): TournamentSemanticCandidate | null {
  const requiredSequence = tokens(phrase.english);
  if (requiredSequence.length < 2 || requiredSequence.length > 15
    || !SINGLE_TOKEN.test(decoy) || !SINGLE_TOKEN.test(sourceWord)) return null;
  const requiredNormalized = new Set(requiredSequence.map(normalized));
  if (requiredNormalized.has(normalized(decoy))) return null;
  const subjects: ReviewSubject[] = requiredSequence.map((token, index) => Object.freeze({
    subjectId: `required_${index + 1}`,
    kind: 'build_token' as const,
    declaredRole: 'required' as const,
    text: token,
    metadata: Object.freeze({
      sequenceIndex: String(index),
      partOfSpeech: normalized(token) === normalized(sourceWord) ? partOfSpeech : 'sequence_token',
    }),
  }));
  subjects.push(Object.freeze({
    subjectId: 'decoy',
    kind: 'build_token',
    declaredRole: 'decoy',
    text: decoy,
    trapType: 'build_decoy',
    reason,
    metadata: Object.freeze({
      partOfSpeech,
      sourceWord,
      relationship,
    }),
  }));
  try {
    return createTournamentSemanticCandidate({
      candidateId: `v11_translate_build_${sha256([
        provenanceKey(day, phrase.id), sourceWord, decoy, relationship,
      ].join('\n')).slice(0, 32)}`,
      mode: 'translate_build',
      difficulty: difficultyFor(day.level),
      prompt: phrase.meaning.ru,
      context: Object.freeze({
        topic: day.topic?.ru ?? '',
        authoredSentence: phrase.english,
        authoredTokenText: requiredSequence.join(' '),
        requiredSequence,
        translation: phrase.meaning.ru,
        decoySourceWord: sourceWord,
        decoyPartOfSpeech: partOfSpeech,
        decoyRelationship: relationship,
      }),
      reviewSubjects: Object.freeze(subjects),
      provenanceKeys: [provenanceKey(day, phrase.id)],
    });
  } catch {
    return null;
  }
}

function buildTranslateCandidates(
  day: V11CandidateSourceDay,
  phrase: V11SourcePhrase,
): readonly TournamentSemanticCandidate[] {
  const result = new Map<string, TournamentSemanticCandidate>();
  for (const proof of buildStrictGrammarTwinSets(day, phrase)) {
    for (const distractor of proof.distractors) {
      const candidate = buildDecoyCandidate(
        day,
        phrase,
        distractor.value,
        proof.correctValue,
        proof.partOfSpeech,
        distractor.reason,
        `grammar:${proof.ruleId}`,
      );
      if (candidate) result.set(candidate.candidateId, candidate);
    }
  }
  for (const rawWord of phrase.words ?? []) {
    if (!rawWord || typeof rawWord !== 'object' || Array.isArray(rawWord)) continue;
    const word = rawWord as V11SourceWord;
    if (typeof word.text !== 'string' || !SINGLE_TOKEN.test(word.text)
      || typeof word.partOfSpeech !== 'string' || !word.partOfSpeech.trim()
      || !Array.isArray(word.distractors)) continue;
    for (const authoredDecoy of word.distractors) {
      if (typeof authoredDecoy !== 'string' || !SINGLE_TOKEN.test(authoredDecoy)) continue;
      const candidate = buildDecoyCandidate(
        day,
        phrase,
        authoredDecoy,
        word.text,
        word.partOfSpeech,
        `«${authoredDecoy}» — конкурирующая форма той же части речи, но она не восстанавливает точную авторскую фразу «${phrase.english}».`,
        'authored_same_pos',
      );
      if (candidate) result.set(candidate.candidateId, candidate);
    }
  }
  return Object.freeze([...result.values()].slice(0, MAX_TRANSLATE_CANDIDATES_PER_PHRASE));
}

function speedPair(
  day: V11CandidateSourceDay,
  item: unknown,
  index: number,
): Readonly<{
  subject: ReviewSubject;
  provenance: string;
  identity: string;
}> | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const vocabulary = item as Partial<V11VocabularyItem>;
  if (typeof vocabulary.word !== 'string' || typeof vocabulary.partOfSpeech !== 'string'
    || !vocabulary.translation || typeof vocabulary.translation.ru !== 'string') return null;
  const english = vocabulary.word.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  if (!english || english.split(/\s+/u).length > 3) return null;
  const parsed = parseDisplayGloss(vocabulary.translation.ru);
  if (!parsed.ok) return null;
  const provenance = provenanceKey(day, `vocab-${index + 1}`);
  return Object.freeze({
    subject: Object.freeze({
      subjectId: `pair_${index + 1}`,
      kind: 'speed_pair',
      declaredRole: 'pair',
      text: english,
      completedText: parsed.value.displayTranslation,
      metadata: Object.freeze({
        partOfSpeech: vocabulary.partOfSpeech.trim(),
        senseHint: parsed.value.senseHint || 'none',
        rawTranslation: vocabulary.translation.ru.trim(),
        provenanceKey: provenance,
      }),
    }),
    provenance,
    identity: `${english}\u0000${parsed.value.displayTranslation}\u0000${parsed.value.senseHint}`,
  });
}

function buildSpeedCandidate(day: V11CandidateSourceDay): TournamentSemanticCandidate | null {
  if (!Array.isArray(day.vocabulary)) return null;
  const pairs = day.vocabulary
    .map((item, index) => speedPair(day, item, index))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  if (pairs.length < 6) return null;
  const selected = pairs.slice(0, 6);
  const english = selected.map((item) => normalized(item.subject.text));
  const russian = selected.map((item) => normalized(item.subject.completedText ?? ''));
  if (new Set(english).size !== 6 || new Set(russian).size !== 6) return null;
  try {
    return createTournamentSemanticCandidate({
      candidateId: `v11_speed_match_${sha256([
        day.planId, String(day.dayIndex), ...selected.map((item) => item.identity),
      ].join('\n')).slice(0, 32)}`,
      mode: 'speed_match',
      difficulty: difficultyFor(day.level),
      prompt: 'Сопоставьте шесть английских слов с точными переводами.',
      context: Object.freeze({
        topic: day.topic?.ru ?? '',
        pairCount: 6,
        sourceKind: 'authored_vocabulary',
      }),
      reviewSubjects: Object.freeze(selected.map((item) => item.subject)),
      provenanceKeys: selected.map((item) => item.provenance),
    });
  } catch {
    return null;
  }
}

export function buildTournamentV11Candidates(input: Readonly<{
  sourceDays: readonly V11CandidateSourceDay[];
  historicalSemanticSignatures?: ReadonlySet<string>;
}>): TournamentV11CandidateBuild {
  const candidates: TournamentSemanticCandidate[] = [];
  const ids = new Set<string>();
  const signatures = new Set<string>();
  const byReason: Partial<Record<V11CandidateRejectionReason, number>> = {};
  const reject = (reason: V11CandidateRejectionReason): void => {
    byReason[reason] = (byReason[reason] ?? 0) + 1;
  };
  const add = (candidate: TournamentSemanticCandidate): void => {
    if (!validateTournamentSemanticCandidate(candidate).ok) {
      reject('candidate_invalid');
      return;
    }
    if (input.historicalSemanticSignatures?.has(candidate.semanticSignature)) {
      reject('historical_signature');
      return;
    }
    if (ids.has(candidate.candidateId)) {
      reject('duplicate_candidate_id');
      return;
    }
    if (signatures.has(candidate.semanticSignature)) {
      reject('duplicate_semantic_signature');
      return;
    }
    ids.add(candidate.candidateId);
    signatures.add(candidate.semanticSignature);
    candidates.push(candidate);
  };

  if (!input || !Array.isArray(input.sourceDays)) reject('source_invalid');
  else for (const rawDay of input.sourceDays) {
    if (!validSourceDay(rawDay)) {
      reject('source_invalid');
      continue;
    }
    const day = rawDay;
    for (const phrase of day.phrases) {
      for (const envelope of buildGuessPhraseCandidates(day, phrase)) add(envelope.semanticCandidate);
      for (const envelope of buildFillGapCandidates(day, phrase)) add(envelope.semanticCandidate);
      for (const candidate of buildTranslateCandidates(day, phrase)) add(candidate);
    }
    for (const envelope of buildOddityCandidates(day)) add(envelope.semanticCandidate);
    const speed = buildSpeedCandidate(day);
    if (speed) add(speed);
  }
  const total = Object.values(byReason).reduce((sum, count) => sum + (count ?? 0), 0);
  return Object.freeze({
    candidates: Object.freeze(candidates),
    rejections: Object.freeze({ total, byReason: Object.freeze({ ...byReason }) }),
  });
}
