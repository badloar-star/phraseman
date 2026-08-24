import { createHash } from 'node:crypto';
import {
  createTournamentSemanticCandidate,
  validateTournamentSemanticCandidate,
  type FillGapTrapType,
  type ReviewSubject,
  type TournamentSemanticCandidate,
} from './tournament_semantic_contract';
import {
  buildStrictGrammarTwinSets,
  validateStrictGrammarTwinSet,
  type StrictGrammarTwinSet,
  type V11SourceDay,
  type V11SourcePhrase,
} from './tournament_pool_v11_grammar_twins';

export type FillGapCandidate = Readonly<{
  semanticCandidate: TournamentSemanticCandidate;
  grammarProof: StrictGrammarTwinSet;
}>;

export type FillGapCandidateValidation =
  | Readonly<{ ok: true }>
  | Readonly<{
    ok: false;
    reason: 'grammar_proof_invalid' | 'semantic_candidate_invalid' | 'projection_mismatch';
  }>;

const WORD_TOKEN = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu;

function normalized(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('en');
}

function difficultyFor(level: string | undefined): 1 | 2 | 3 {
  const normalizedLevel = normalized(level ?? '');
  if (normalizedLevel === 'a1') return 1;
  if (normalizedLevel === 'b1' || normalizedLevel === 'b2' || normalizedLevel === 'c1'
    || normalizedLevel === 'c2') return 3;
  return 2;
}

function promptFor(proof: StrictGrammarTwinSet): string | null {
  const tokens = [...proof.correctCompletedText.matchAll(WORD_TOKEN)];
  const token = tokens[proof.slotIndex];
  if (!token || normalized(token[0]) !== normalized(proof.correctValue) || token.index === undefined) {
    return null;
  }
  return `${proof.correctCompletedText.slice(0, token.index)}___${proof.correctCompletedText.slice(token.index + token[0].length)}`;
}

function candidateIdFor(proof: StrictGrammarTwinSet): string {
  const suffix = createHash('sha256')
    .update([
      proof.provenanceKey,
      proof.ruleId,
      String(proof.slotIndex),
      proof.correctValue,
      ...proof.distractors.map((item) => item.value),
      proof.ruleCatalogSha256,
    ].join('\n'), 'utf8')
    .digest('hex')
    .slice(0, 32);
  return `v11_fill_gap_${suffix}`;
}

function trapTypeFor(proof: StrictGrammarTwinSet): FillGapTrapType {
  if (proof.ruleId === 'subject_be_agreement'
    || proof.ruleId === 'question_subject_be_agreement'
    || proof.ruleId === 'irregular_subject_verb_agreement'
    || proof.ruleId === 'sentence_initial_subject_pronoun_case') return 'agreement';
  if (proof.ruleId === 'preposition_object_pronoun_case'
    || proof.ruleId === 'transitive_object_pronoun_case') return 'government';
  return 'morphology';
}

function metadataFor(
  proof: StrictGrammarTwinSet,
  grammaticality: 'valid' | 'invalid',
): Readonly<Record<string, string>> {
  return Object.freeze({
    partOfSpeech: proof.partOfSpeech,
    grammaticality,
    minimalTwin: 'true',
    grammarRuleId: proof.ruleId,
    ruleCatalogSha256: proof.ruleCatalogSha256,
  });
}

function projectFillGapCandidate(
  day: V11SourceDay,
  phrase: V11SourcePhrase,
  proof: StrictGrammarTwinSet,
): FillGapCandidate | null {
  const proofValidation = validateStrictGrammarTwinSet(day, phrase, proof);
  if (!proofValidation.ok) return null;
  const prompt = promptFor(proof);
  if (!prompt) return null;
  const reviewSubjects: readonly ReviewSubject[] = Object.freeze([
    Object.freeze({
      subjectId: 'correct',
      kind: 'choice_option' as const,
      declaredRole: 'correct' as const,
      text: proof.correctValue,
      completedText: proof.correctCompletedText,
      metadata: metadataFor(proof, 'valid'),
    }),
    ...proof.distractors.map((distractor, index): ReviewSubject => Object.freeze({
      subjectId: `distractor_${index + 1}`,
      kind: 'choice_option',
      declaredRole: 'distractor',
      text: distractor.value,
      completedText: distractor.completedText,
      trapType: trapTypeFor(proof),
      reason: distractor.reason,
      metadata: metadataFor(proof, 'invalid'),
    })),
  ]);
  try {
    const semanticCandidate = createTournamentSemanticCandidate({
      candidateId: candidateIdFor(proof),
      mode: 'fill_gap',
      difficulty: difficultyFor(day.level),
      prompt,
      context: Object.freeze({
        topic: day.topic?.ru ?? '',
        authoredSentence: phrase.english,
        translation: phrase.meaning.ru,
        correctValue: proof.correctValue,
        slotIndex: proof.slotIndex,
        grammarRuleId: proof.ruleId,
        ruleCatalogVersion: proof.ruleCatalogVersion,
        ruleCatalogSha256: proof.ruleCatalogSha256,
        deterministicGrammarEvidence: Object.freeze({
          sourceDay: Object.freeze({
            planId: day.planId,
            dayIndex: day.dayIndex,
            ...(day.level === undefined ? {} : { level: day.level }),
            ...(day.topic === undefined ? {} : { topic: day.topic }),
          }),
          sourcePhrase: phrase,
          proof,
        }),
      }),
      reviewSubjects,
      provenanceKeys: [proof.provenanceKey],
    });
    return Object.freeze({ semanticCandidate, grammarProof: proof });
  } catch {
    return null;
  }
}

export function validateEmbeddedFillGapCandidate(
  candidate: TournamentSemanticCandidate,
): FillGapCandidateValidation {
  const raw = candidate.context.deterministicGrammarEvidence;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'grammar_proof_invalid' };
  }
  const evidence = raw as Readonly<Record<string, unknown>>;
  return validateFillGapCandidate(
    evidence.sourceDay as V11SourceDay,
    evidence.sourcePhrase as V11SourcePhrase,
    { semanticCandidate: candidate, grammarProof: evidence.proof },
  );
}

export function buildFillGapCandidates(
  day: V11SourceDay,
  phrase: V11SourcePhrase,
): readonly FillGapCandidate[] {
  return Object.freeze(buildStrictGrammarTwinSets(day, phrase)
    .map((proof) => projectFillGapCandidate(day, phrase, proof))
    .filter((candidate): candidate is FillGapCandidate => candidate !== null));
}

export function validateFillGapCandidate(
  day: V11SourceDay,
  phrase: V11SourcePhrase,
  candidate: unknown,
): FillGapCandidateValidation {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { ok: false, reason: 'grammar_proof_invalid' };
  }
  const envelope = candidate as Partial<FillGapCandidate>;
  const grammarValidation = validateStrictGrammarTwinSet(day, phrase, envelope.grammarProof);
  if (!grammarValidation.ok) return { ok: false, reason: 'grammar_proof_invalid' };
  if (!envelope.semanticCandidate) return { ok: false, reason: 'semantic_candidate_invalid' };
  const semanticValidation = validateTournamentSemanticCandidate(envelope.semanticCandidate);
  if (!semanticValidation.ok) return { ok: false, reason: 'semantic_candidate_invalid' };
  const expected = projectFillGapCandidate(day, phrase, envelope.grammarProof as StrictGrammarTwinSet);
  if (!expected
    || expected.semanticCandidate.candidateId !== envelope.semanticCandidate.candidateId
    || expected.semanticCandidate.contentSha256 !== envelope.semanticCandidate.contentSha256
    || expected.semanticCandidate.semanticSignature !== envelope.semanticCandidate.semanticSignature) {
    return { ok: false, reason: 'projection_mismatch' };
  }
  return { ok: true };
}
