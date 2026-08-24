import { createHash } from 'node:crypto';
import {
  TOURNAMENT_REVIEW_CONTRACT_VERSION,
  validateTournamentSemanticCandidate,
  type TournamentSemanticCandidate,
} from './tournament_semantic_contract';

export type SemanticReviewPass = 'primary' | 'adversarial';
export type SemanticDecision = 'PASS' | 'REJECT';

const PRIMARY_PROMPT = Object.freeze({
  version: 'tournament-semantic-primary-v3',
  system: 'Проверьте каждый subject независимо от self-declared metadata кандидата. Для каждого верните собственные partOfSpeech, grammaticality, minimalTwin и violationType. guess/fill: ровно один valid и три invalid same-POS minimal twins; oddity: safe valid, odd invalid; build: один same-POS decoy; speed: шесть точных пар. PASS допустим только при полном точном evidence matrix и русских объяснениях.',
});
const ADVERSARIAL_PROMPT = Object.freeze({
  version: 'tournament-semantic-adversarial-v3',
  system: 'Не доверяйте self-declared metadata кандидата: заново установите для каждого subject partOfSpeech, grammaticality, minimalTwin и violationType. Ищите второй допустимый ответ, mixed POS, не-minimal twin, ложную ошибку, неточный decoy или неверную speed-пару. PASS только если полный mode-specific evidence matrix выдерживает контрпример.',
});
export const TOURNAMENT_SEMANTIC_PROMPT_SET_SHA256 = createHash('sha256')
  .update(JSON.stringify({
    contractVersion: TOURNAMENT_REVIEW_CONTRACT_VERSION,
    primary: PRIMARY_PROMPT,
    adversarial: ADVERSARIAL_PROMPT,
  }), 'utf8')
  .digest('hex');

export const TOURNAMENT_SEMANTIC_PROMPTS = Object.freeze({
  contractVersion: TOURNAMENT_REVIEW_CONTRACT_VERSION,
  promptSetSha256: TOURNAMENT_SEMANTIC_PROMPT_SET_SHA256,
  primary: PRIMARY_PROMPT,
  adversarial: ADVERSARIAL_PROMPT,
});

export type SemanticFinding = Readonly<{
  code: string;
  subjectId: string;
  message: string;
}>;

export type SemanticSubjectVerdict = Readonly<{
  subjectId: string;
  verdict: SemanticDecision;
  findingCode: string | null;
  explanation: string;
  partOfSpeech: string | null;
  grammaticality: 'valid' | 'invalid' | 'not_applicable';
  minimalTwin: boolean | null;
  violationType: string | null;
}>;

export type SemanticVerdict = Readonly<{
  contentSha256: string;
  reviewContractVersion: string;
  promptVersion: string;
  promptSetSha256: string;
  pass: SemanticReviewPass;
  model: string;
  verdict: SemanticDecision;
  acceptableAnswerCount: number;
  errorOptionCount: number;
  subjects: readonly SemanticSubjectVerdict[];
  blockingFindings: readonly SemanticFinding[];
}>;

export type SemanticProviderRequest = Readonly<{
  candidate: TournamentSemanticCandidate;
  pass: SemanticReviewPass;
  model: string;
  promptVersion: string;
  promptSetSha256: string;
  reviewContractVersion: string;
}>;

export type SemanticProviderResponse = Readonly<{
  raw: unknown;
  inputTokens: number;
  outputTokens: number;
}>;

export interface TournamentSemanticReviewProvider {
  review(request: SemanticProviderRequest): Promise<SemanticProviderResponse>;
}

export type SemanticReviewConfig = Readonly<{
  primaryModel: string;
  adversarialModel: string;
}>;

export type TwoPassReviewResult =
  | Readonly<{
    decision: 'PASS';
    primaryVerdict: SemanticVerdict;
    adversarialVerdict: SemanticVerdict;
    requestAccounting: Readonly<{ attempts: 2; inputTokens: number; outputTokens: number }>;
  }>
  | Readonly<{
    decision: 'REJECT';
    primaryVerdict: SemanticVerdict;
    adversarialVerdict?: SemanticVerdict;
    blockingFindings: readonly SemanticFinding[];
    requestAccounting: Readonly<{ attempts: 1 | 2; inputTokens: number; outputTokens: number }>;
  }>
  | Readonly<{
    decision: 'ERROR';
    failureCode: 'candidate_invalid' | 'reviewer_identity_invalid' | 'provider_error' | 'provider_response_invalid';
    completedPasses: readonly SemanticReviewPass[];
    requestAccounting: Readonly<{ attempts: number; inputTokens: number; outputTokens: number }>;
  }>;

const VERDICT_KEYS = Object.freeze([
  'contentSha256', 'reviewContractVersion', 'promptVersion', 'promptSetSha256', 'pass', 'model', 'verdict',
  'acceptableAnswerCount', 'errorOptionCount', 'subjects', 'blockingFindings',
]);
const SUBJECT_KEYS = Object.freeze([
  'subjectId', 'verdict', 'findingCode', 'explanation',
  'partOfSpeech', 'grammaticality', 'minimalTwin', 'violationType',
]);
const FINDING_KEYS = Object.freeze(['code', 'subjectId', 'message']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function requiredCounts(candidate: TournamentSemanticCandidate): Readonly<{
  acceptableAnswerCount: number;
  errorOptionCount: number;
}> {
  if (candidate.mode === 'speed_match') return { acceptableAnswerCount: 6, errorOptionCount: 0 };
  if (candidate.mode === 'find_oddity' || candidate.mode === 'translate_build') {
    return { acceptableAnswerCount: 1, errorOptionCount: 1 };
  }
  return { acceptableAnswerCount: 1, errorOptionCount: 3 };
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value === value.trim() && value.length > 0;
}

function parseSubject(value: unknown): SemanticSubjectVerdict {
  if (!isRecord(value) || !exactKeys(value, SUBJECT_KEYS)
    || !nonEmpty(value.subjectId)
    || (value.verdict !== 'PASS' && value.verdict !== 'REJECT')
    || !(value.findingCode === null || nonEmpty(value.findingCode))
    || !nonEmpty(value.explanation)
    || !(value.partOfSpeech === null || nonEmpty(value.partOfSpeech))
    || !['valid', 'invalid', 'not_applicable'].includes(String(value.grammaticality))
    || !(value.minimalTwin === null || typeof value.minimalTwin === 'boolean')
    || !(value.violationType === null || nonEmpty(value.violationType))) {
    throw new Error('semantic_subject_invalid');
  }
  return Object.freeze({
    subjectId: value.subjectId,
    verdict: value.verdict,
    findingCode: value.findingCode,
    explanation: value.explanation,
    partOfSpeech: value.partOfSpeech,
    grammaticality: value.grammaticality as SemanticSubjectVerdict['grammaticality'],
    minimalTwin: value.minimalTwin,
    violationType: value.violationType,
  });
}

function validateEvidenceMatrix(
  candidate: TournamentSemanticCandidate,
  subjects: readonly SemanticSubjectVerdict[],
): void {
  const evidence = new Map(subjects.map((subject) => [subject.subjectId, subject] as const));
  const rows = candidate.reviewSubjects.map((subject) => ({ declared: subject, judged: evidence.get(subject.subjectId)! }));
  if (rows.some(({ judged }) => !judged || judged.partOfSpeech === null)) {
    throw new Error('semantic_evidence_matrix_invalid');
  }
  if (candidate.mode === 'guess_phrase' || candidate.mode === 'fill_gap' || candidate.mode === 'find_oddity') {
    const parts = new Set(rows.map(({ judged }) => judged.partOfSpeech));
    if (parts.size !== 1 || rows.some(({ declared, judged }) => {
      const shouldBeValid = declared.declaredRole === 'correct' || declared.declaredRole === 'safe';
      return judged.minimalTwin !== true
        || judged.grammaticality !== (shouldBeValid ? 'valid' : 'invalid')
        || (shouldBeValid ? judged.violationType !== null : !nonEmpty(judged.violationType));
    })) throw new Error('semantic_evidence_matrix_invalid');
    return;
  }
  if (candidate.mode === 'translate_build') {
    const requiredParts = new Set(rows
      .filter(({ declared }) => declared.declaredRole === 'required')
      .map(({ judged }) => judged.partOfSpeech));
    if (rows.some(({ declared, judged }) => judged.grammaticality !== 'not_applicable'
      || judged.minimalTwin !== null
      || (declared.declaredRole === 'decoy'
        ? judged.violationType !== 'build_decoy' || !requiredParts.has(judged.partOfSpeech)
        : judged.violationType !== null))) throw new Error('semantic_evidence_matrix_invalid');
    return;
  }
  if (rows.some(({ judged }) => judged.grammaticality !== 'not_applicable'
    || judged.minimalTwin !== null || judged.violationType !== null)) {
    throw new Error('semantic_evidence_matrix_invalid');
  }
}

function parseFinding(value: unknown): SemanticFinding {
  if (!isRecord(value) || !exactKeys(value, FINDING_KEYS)
    || !nonEmpty(value.code) || !nonEmpty(value.subjectId) || !nonEmpty(value.message)) {
    throw new Error('semantic_finding_invalid');
  }
  return Object.freeze({ code: value.code, subjectId: value.subjectId, message: value.message });
}

export function parseSemanticVerdict(raw: unknown, expected: SemanticProviderRequest): SemanticVerdict {
  let value = raw;
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw); } catch { throw new Error('semantic_json_invalid'); }
  }
  if (!isRecord(value) || !exactKeys(value, VERDICT_KEYS)) throw new Error('semantic_schema_invalid');
  if (value.contentSha256 !== expected.candidate.contentSha256) throw new Error('semantic_hash_mismatch');
  if (value.reviewContractVersion !== expected.reviewContractVersion
    || value.promptVersion !== expected.promptVersion
    || value.promptSetSha256 !== expected.promptSetSha256
    || value.pass !== expected.pass
    || value.model !== expected.model) throw new Error('semantic_echo_mismatch');
  if (value.verdict !== 'PASS' && value.verdict !== 'REJECT') throw new Error('semantic_verdict_invalid');
  const counts = requiredCounts(expected.candidate);
  if (value.acceptableAnswerCount !== counts.acceptableAnswerCount
    || value.errorOptionCount !== counts.errorOptionCount) throw new Error('semantic_count_mismatch');
  if (!Array.isArray(value.subjects) || !Array.isArray(value.blockingFindings)) {
    throw new Error('semantic_schema_invalid');
  }
  const subjects = value.subjects.map(parseSubject);
  const expectedIds = expected.candidate.reviewSubjects.map((subject) => subject.subjectId).sort();
  const actualIds = subjects.map((subject) => subject.subjectId).sort();
  if (expectedIds.length !== actualIds.length
    || expectedIds.some((id, index) => id !== actualIds[index])) {
    throw new Error('semantic_subject_set_mismatch');
  }
  validateEvidenceMatrix(expected.candidate, subjects);
  const findings = value.blockingFindings.map(parseFinding);
  const expectedIdSet = new Set(expectedIds);
  if (findings.some((finding) => !expectedIdSet.has(finding.subjectId))) {
    throw new Error('semantic_finding_subject_mismatch');
  }
  if (value.verdict === 'PASS') {
    if (findings.length !== 0
      || subjects.some((subject) => subject.verdict !== 'PASS' || subject.findingCode !== null)) {
      throw new Error('semantic_pass_inconsistent');
    }
  } else if (findings.length === 0 || subjects.every((subject) => subject.verdict === 'PASS')) {
    throw new Error('semantic_reject_inconsistent');
  }
  return Object.freeze({
    contentSha256: value.contentSha256 as string,
    reviewContractVersion: value.reviewContractVersion as string,
    promptVersion: value.promptVersion as string,
    promptSetSha256: value.promptSetSha256 as string,
    pass: value.pass as SemanticReviewPass,
    model: value.model as string,
    verdict: value.verdict,
    acceptableAnswerCount: value.acceptableAnswerCount as number,
    errorOptionCount: value.errorOptionCount as number,
    subjects: Object.freeze(subjects),
    blockingFindings: Object.freeze(findings),
  });
}

function validUsage(response: SemanticProviderResponse): boolean {
  return Number.isSafeInteger(response.inputTokens) && response.inputTokens >= 0
    && Number.isSafeInteger(response.outputTokens) && response.outputTokens >= 0;
}

export async function reviewTournamentCandidate(
  candidate: TournamentSemanticCandidate,
  config: SemanticReviewConfig,
  provider: TournamentSemanticReviewProvider,
): Promise<TwoPassReviewResult> {
  if (!validateTournamentSemanticCandidate(candidate).ok) {
    return { decision: 'ERROR', failureCode: 'candidate_invalid', completedPasses: [], requestAccounting: { attempts: 0, inputTokens: 0, outputTokens: 0 } };
  }
  if (!config.primaryModel.trim() || !config.adversarialModel.trim()
    || config.primaryModel.trim() === config.adversarialModel.trim()) {
    return { decision: 'ERROR', failureCode: 'reviewer_identity_invalid', completedPasses: [], requestAccounting: { attempts: 0, inputTokens: 0, outputTokens: 0 } };
  }
  let attempts = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  const run = async (pass: SemanticReviewPass, model: string): Promise<SemanticVerdict> => {
    const prompt = TOURNAMENT_SEMANTIC_PROMPTS[pass];
    const request: SemanticProviderRequest = Object.freeze({
      candidate,
      pass,
      model,
      promptVersion: prompt.version,
      promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
      reviewContractVersion: TOURNAMENT_SEMANTIC_PROMPTS.contractVersion,
    });
    attempts += 1;
    const response = await provider.review(request);
    if (!response || !validUsage(response)) throw new Error('provider_response_invalid');
    inputTokens += response.inputTokens;
    outputTokens += response.outputTokens;
    return parseSemanticVerdict(response.raw, request);
  };
  let primary: SemanticVerdict;
  try {
    primary = await run('primary', config.primaryModel);
  } catch (error) {
    return Object.freeze({
      decision: 'ERROR',
      failureCode: error instanceof Error && error.message.startsWith('semantic_')
        ? 'provider_response_invalid' : 'provider_error',
      completedPasses: Object.freeze([]),
      requestAccounting: Object.freeze({ attempts, inputTokens, outputTokens }),
    });
  }
  if (primary.verdict === 'REJECT') return Object.freeze({
    decision: 'REJECT',
    primaryVerdict: primary,
    blockingFindings: primary.blockingFindings,
    requestAccounting: Object.freeze({ attempts: 1 as const, inputTokens, outputTokens }),
  });
  let adversarial: SemanticVerdict;
  try {
    adversarial = await run('adversarial', config.adversarialModel);
  } catch (error) {
    return Object.freeze({
      decision: 'ERROR',
      failureCode: error instanceof Error && error.message.startsWith('semantic_')
        ? 'provider_response_invalid' : 'provider_error',
      completedPasses: Object.freeze(['primary'] as const),
      requestAccounting: Object.freeze({ attempts, inputTokens, outputTokens }),
    });
  }
  if (adversarial.verdict === 'REJECT') return Object.freeze({
    decision: 'REJECT', primaryVerdict: primary, adversarialVerdict: adversarial,
    blockingFindings: adversarial.blockingFindings,
    requestAccounting: Object.freeze({ attempts: 2 as const, inputTokens, outputTokens }),
  });
  return Object.freeze({
    decision: 'PASS', primaryVerdict: primary, adversarialVerdict: adversarial,
    requestAccounting: Object.freeze({ attempts: 2 as const, inputTokens, outputTokens }),
  });
}
