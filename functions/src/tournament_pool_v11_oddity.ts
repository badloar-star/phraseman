import { createHash } from 'node:crypto';
import {
  createTournamentSemanticCandidate,
  validateTournamentSemanticCandidate,
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

export const TOURNAMENT_ODDITY_SAFE_POLICY_VERSION = 'arena-oddity-minimal-twins-v2' as const;

export type V11OdditySourceDay = V11SourceDay & Readonly<{
  topic?: Readonly<{ ru?: string }>;
  phrases: readonly V11SourcePhrase[];
}>;

export type OddityCandidate = Readonly<{
  semanticCandidate: TournamentSemanticCandidate;
  grammarProof: StrictGrammarTwinSet;
  oddVariantIndex: 0 | 1 | 2;
  sourcePhraseId: string;
}>;

export type OddityCandidateValidation =
  | Readonly<{ ok: true }>
  | Readonly<{
    ok: false;
    reason: 'grammar_proof_invalid' | 'semantic_candidate_invalid' | 'projection_mismatch';
  }>;

type InverseMatrix = Readonly<{
  safe: readonly [string, string, string];
  odd: readonly [string, string, string];
}>;

type Token = Readonly<{ value: string; normalized: string; start: number; end: number }>;

const WORD_TOKEN = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu;
const FORBIDDEN_CONTROL = /[\p{Cc}\p{Cf}]/u;
const KNOWN_BAD_SAFE_SENTENCE = /^It is (?:moment|night) to sleep[.!?]?$/iu;
const REVIEWED_PLURAL_NOUNS = [
  'cameras', 'children', 'days', 'desks', 'emails', 'feet', 'figures', 'geese',
  'glasses', 'men', 'mice', 'minutes', 'numbers', 'people', 'plans', 'projects',
  'questions', 'reports', 'screens', 'shoes', 'tasks', 'teeth', 'trousers', 'women',
] as const;
const ARTICLE_PLURAL_MISMATCH = new RegExp(
  `\\b(?:a|an)\\s+(?:[\\p{L}\\p{M}-]+\\s+){0,2}(?:${REVIEWED_PLURAL_NOUNS.join('|')})\\b`,
  'iu',
);
const MAX_LENGTH_RATIO = 1.35;

function normalized(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('en');
}

function difficultyFor(level: string | undefined): 1 | 2 | 3 {
  const value = normalized(level ?? '');
  if (value === 'a1') return 1;
  if (value === 'b1' || value === 'b2' || value === 'c1' || value === 'c2') return 3;
  return 2;
}

function tokens(value: string): readonly Token[] {
  return [...value.matchAll(WORD_TOKEN)].map((match) => Object.freeze({
    value: match[0],
    normalized: normalized(match[0]),
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
}

function wordCount(value: string): number {
  return tokens(value).length;
}

export function isEligibleSafeSentence(value: unknown): value is string {
  if (typeof value !== 'string' || value !== value.trim() || value.length < 3
    || Buffer.byteLength(value, 'utf8') > 512 || FORBIDDEN_CONTROL.test(value)) return false;
  const count = wordCount(value);
  return count >= 2
    && count <= 20
    && /[.!?]$/u.test(value)
    && !KNOWN_BAD_SAFE_SENTENCE.test(value)
    && !ARTICLE_PLURAL_MISMATCH.test(value);
}

function replaceFirstTwo(source: string, first: string, second: string): string | null {
  const found = tokens(source);
  if (found.length < 2) return null;
  return `${source.slice(0, found[0].start)}${first}${source.slice(found[0].end, found[1].start)}`
    + `${second}${source.slice(found[1].end)}`;
}

function makeMatrix(
  source: string,
  safePairs: readonly (readonly [string, string])[],
  oddPairs: readonly (readonly [string, string])[],
): InverseMatrix | null {
  if (safePairs.length !== 3 || oddPairs.length !== 3) return null;
  const safe = safePairs.map(([first, second]) => replaceFirstTwo(source, first, second));
  const odd = oddPairs.map(([first, second]) => replaceFirstTwo(source, first, second));
  if (safe.some((value) => value === null) || odd.some((value) => value === null)) return null;
  const surfaces = [...safe, ...odd] as string[];
  const lengths = surfaces.map((value) => value.length);
  if (new Set(safe).size !== 3 || new Set(odd).size !== 3
    || Math.max(...lengths) / Math.max(1, Math.min(...lengths)) > MAX_LENGTH_RATIO) return null;
  return Object.freeze({
    safe: Object.freeze(safe) as readonly [string, string, string],
    odd: Object.freeze(odd) as readonly [string, string, string],
  });
}

function inverseMatrix(proof: StrictGrammarTwinSet): InverseMatrix | null {
  const value = normalized(proof.correctValue);
  if (proof.ruleId === 'subject_be_agreement' && proof.slotIndex === 1) {
    if (new Set(['am', 'is', 'are']).has(value)) return makeMatrix(
      proof.correctCompletedText,
      [['He', 'is'], ['She', 'is'], ['You', 'are']],
      [['He', 'are'], ['She', 'are'], ['You', 'is']],
    );
    if (new Set(['was', 'were']).has(value)) return makeMatrix(
      proof.correctCompletedText,
      [['He', 'was'], ['She', 'was'], ['You', 'were']],
      [['He', 'were'], ['She', 'were'], ['You', 'was']],
    );
  }
  if (proof.ruleId === 'question_subject_be_agreement' && proof.slotIndex === 0) {
    return makeMatrix(
      proof.correctCompletedText,
      [['Is', 'he'], ['Is', 'she'], ['Are', 'you']],
      [['Is', 'you'], ['Are', 'he'], ['Are', 'she']],
    );
  }
  if (proof.ruleId === 'irregular_subject_verb_agreement' && proof.slotIndex === 1) {
    const opposite = proof.distractors[0]?.value;
    if (!opposite) return null;
    const correctLooksThird = /(?:s|es)$/iu.test(proof.correctValue) && !/(?:ss)$/iu.test(proof.correctValue);
    const base = correctLooksThird ? opposite : proof.correctValue;
    const third = correctLooksThird ? proof.correctValue : opposite;
    return makeMatrix(
      proof.correctCompletedText,
      [['He', third], ['She', third], ['You', base]],
      [['He', base], ['She', base], ['You', third]],
    );
  }
  return null;
}

function candidateIdFor(
  proof: StrictGrammarTwinSet,
  matrix: InverseMatrix,
  oddVariantIndex: 0 | 1 | 2,
): string {
  const suffix = createHash('sha256')
    .update([
      proof.provenanceKey,
      proof.ruleId,
      String(proof.slotIndex),
      ...matrix.safe,
      matrix.odd[oddVariantIndex],
      proof.ruleCatalogSha256,
      TOURNAMENT_ODDITY_SAFE_POLICY_VERSION,
    ].join('\n'), 'utf8')
    .digest('hex')
    .slice(0, 32);
  return `v11_find_oddity_${suffix}`;
}

function metadata(
  proof: StrictGrammarTwinSet,
  grammaticality: 'valid' | 'invalid',
): Readonly<Record<string, string>> {
  return Object.freeze({
    partOfSpeech: proof.partOfSpeech,
    grammaticality,
    minimalTwin: 'true',
    grammarRuleId: proof.ruleId,
    ruleCatalogSha256: proof.ruleCatalogSha256,
    provenanceKey: proof.provenanceKey,
    safePolicyVersion: TOURNAMENT_ODDITY_SAFE_POLICY_VERSION,
  });
}

function evidenceDay(day: V11OdditySourceDay): V11SourceDay {
  return Object.freeze({
    planId: day.planId,
    dayIndex: day.dayIndex,
    ...(day.level === undefined ? {} : { level: day.level }),
    ...(day.topic === undefined ? {} : { topic: day.topic }),
  });
}

function projectOddityCandidate(
  day: V11OdditySourceDay,
  phrase: V11SourcePhrase,
  proof: StrictGrammarTwinSet,
  oddVariantIndex: 0 | 1 | 2,
): OddityCandidate | null {
  if (!isEligibleSafeSentence(phrase.english)
    || !validateStrictGrammarTwinSet(day, phrase, proof).ok) return null;
  const matrix = inverseMatrix(proof);
  if (!matrix) return null;
  const odd = matrix.odd[oddVariantIndex];
  const reviewSubjects: readonly ReviewSubject[] = Object.freeze([
    ...matrix.safe.map((text, index): ReviewSubject => Object.freeze({
      subjectId: `safe_${index + 1}`,
      kind: 'choice_option',
      declaredRole: 'safe',
      text,
      completedText: text,
      metadata: metadata(proof, 'valid'),
    })),
    Object.freeze({
      subjectId: 'odd',
      kind: 'choice_option',
      declaredRole: 'odd',
      text: odd,
      completedText: odd,
      trapType: 'single_oddity_error',
      reason: `В варианте «${odd}» форма сказуемого не согласуется с подлежащим.`,
      metadata: Object.freeze({
        ...metadata(proof, 'invalid'),
        correctedText: matrix.safe[oddVariantIndex],
        oddVariantIndex: String(oddVariantIndex),
      }),
    }),
  ]);
  try {
    const semanticCandidate = createTournamentSemanticCandidate({
      candidateId: candidateIdFor(proof, matrix, oddVariantIndex),
      mode: 'find_oddity',
      difficulty: difficultyFor(day.level),
      prompt: 'Найдите предложение с грамматической ошибкой.',
      context: Object.freeze({
        topic: day.topic?.ru ?? '',
        grammarRuleId: proof.ruleId,
        ruleCatalogVersion: proof.ruleCatalogVersion,
        ruleCatalogSha256: proof.ruleCatalogSha256,
        safePolicyVersion: TOURNAMENT_ODDITY_SAFE_POLICY_VERSION,
        sourcePhraseId: phrase.id,
        correctValue: proof.correctValue,
        oddVariantIndex,
        deterministicGrammarEvidence: Object.freeze({
          sourceDay: evidenceDay(day),
          sourcePhrase: phrase,
          proof,
          oddVariantIndex,
        }),
      }),
      reviewSubjects,
      provenanceKeys: [proof.provenanceKey],
    });
    return Object.freeze({ semanticCandidate, grammarProof: proof, oddVariantIndex, sourcePhraseId: phrase.id });
  } catch {
    return null;
  }
}

export function buildOddityCandidates(
  day: V11OdditySourceDay,
  seedPhraseId?: string,
): readonly OddityCandidate[] {
  if (!day || !Array.isArray(day.phrases)) return [];
  const result = new Map<string, OddityCandidate>();
  for (const phrase of day.phrases) {
    if (seedPhraseId !== undefined && phrase.id !== seedPhraseId) continue;
    const seenMatrices = new Set<string>();
    for (const proof of buildStrictGrammarTwinSets(day, phrase)) {
      const matrix = inverseMatrix(proof);
      if (!matrix) continue;
      const matrixKey = JSON.stringify([proof.ruleId, matrix.safe, matrix.odd]);
      if (seenMatrices.has(matrixKey)) continue;
      seenMatrices.add(matrixKey);
      for (const oddVariantIndex of [0, 1, 2] as const) {
        const candidate = projectOddityCandidate(day, phrase, proof, oddVariantIndex);
        if (candidate) result.set(candidate.semanticCandidate.candidateId, candidate);
      }
    }
  }
  return Object.freeze([...result.values()]);
}

export function validateOddityCandidate(
  day: V11OdditySourceDay,
  candidate: unknown,
): OddityCandidateValidation {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { ok: false, reason: 'grammar_proof_invalid' };
  }
  const envelope = candidate as Partial<OddityCandidate>;
  if (!Number.isInteger(envelope.oddVariantIndex)
    || Number(envelope.oddVariantIndex) < 0 || Number(envelope.oddVariantIndex) > 2
    || typeof envelope.sourcePhraseId !== 'string') {
    return { ok: false, reason: 'projection_mismatch' };
  }
  const phrase = day.phrases?.find((item) => item.id === envelope.sourcePhraseId);
  if (!phrase || !validateStrictGrammarTwinSet(day, phrase, envelope.grammarProof).ok) {
    return { ok: false, reason: 'grammar_proof_invalid' };
  }
  if (!envelope.semanticCandidate || !validateTournamentSemanticCandidate(envelope.semanticCandidate).ok) {
    return { ok: false, reason: 'semantic_candidate_invalid' };
  }
  const expected = projectOddityCandidate(
    day,
    phrase,
    envelope.grammarProof as StrictGrammarTwinSet,
    envelope.oddVariantIndex as 0 | 1 | 2,
  );
  if (!expected
    || expected.semanticCandidate.candidateId !== envelope.semanticCandidate.candidateId
    || expected.semanticCandidate.contentSha256 !== envelope.semanticCandidate.contentSha256
    || expected.semanticCandidate.semanticSignature !== envelope.semanticCandidate.semanticSignature) {
    return { ok: false, reason: 'projection_mismatch' };
  }
  return { ok: true };
}

export function validateEmbeddedOddityCandidate(
  candidate: TournamentSemanticCandidate,
): OddityCandidateValidation {
  const raw = candidate.context.deterministicGrammarEvidence;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'grammar_proof_invalid' };
  }
  const evidence = raw as Readonly<Record<string, unknown>>;
  const sourceDay = evidence.sourceDay as V11SourceDay;
  const sourcePhrase = evidence.sourcePhrase as V11SourcePhrase;
  const day = { ...sourceDay, phrases: [sourcePhrase] } as V11OdditySourceDay;
  return validateOddityCandidate(day, {
    semanticCandidate: candidate,
    grammarProof: evidence.proof,
    oddVariantIndex: evidence.oddVariantIndex,
    sourcePhraseId: sourcePhrase?.id,
  });
}
