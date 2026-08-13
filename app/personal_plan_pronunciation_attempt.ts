import type { PersonalPlanId } from './personal_plan_catalog';
import { sanitizePlanAttemptPayload } from './personal_plan_engine_contracts';

export type PlanPronunciationMode = 'practice' | 'scored';

export type PlanPronunciationAttemptStatus =
  | 'recorded'
  | 'empty_recording'
  | 'transcribed'
  | 'scored'
  | 'failed';

export type PlanPronunciationRecognitionProvider =
  | 'openai'
  | 'system'
  | 'manual'
  | 'unknown';

export type PlanPronunciationScoringProvider =
  | 'openai'
  | 'manual'
  | 'none'
  | 'unknown';

export type PlanPronunciationAttempt = {
  id: string;
  planInstanceId: string;
  planId: PersonalPlanId;
  dayIndex: number;
  blockId: string;
  contentUnitId: string;
  targetText: string;
  mode: PlanPronunciationMode;
  status: PlanPronunciationAttemptStatus;
  recordingId?: string;
  recordingUri?: string;
  recordingDurationMs?: number;
  transcript?: string;
  recognitionProvider?: PlanPronunciationRecognitionProvider;
  recognitionConfidence?: number;
  scoringProvider?: PlanPronunciationScoringProvider;
  scoringVersion?: string;
  score?: number;
  pronunciationScore?: number;
  fluencyScore?: number;
  intonationScore?: number;
  progressEligible: boolean;
  progressPenaltyAllowed: boolean;
  occurredAt: string;
  failureReason?: string;
  sanitizedPayload?: Record<string, string | number | boolean | null>;
};

export type PlanPronunciationAttemptInput = {
  id?: string;
  planInstanceId: string;
  planId: PersonalPlanId;
  dayIndex: number;
  blockId: string;
  contentUnitId: string;
  targetText: string;
  recordingId?: string;
  recordingUri?: string;
  recordingDurationMs?: number;
  transcript?: string;
  recognitionProvider?: PlanPronunciationRecognitionProvider;
  recognitionConfidence?: number;
  scoringProvider?: PlanPronunciationScoringProvider;
  scoringVersion?: string;
  score?: number;
  pronunciationScore?: number;
  fluencyScore?: number;
  intonationScore?: number;
  progressPenaltyAllowed?: boolean;
  occurredAt?: string;
  failureReason?: string;
  payload?: Record<string, string | number | boolean | null | undefined>;
};

export type PlanPronunciationClaim = {
  id: string;
  text: string;
  requiresScoring: boolean;
};

export type PlanPronunciationAttemptIssueCode =
  | 'missing_plan_instance_id'
  | 'missing_block_id'
  | 'missing_content_unit_id'
  | 'missing_target_text'
  | 'missing_recording_id'
  | 'missing_recording_uri'
  | 'invalid_recording_duration'
  | 'empty_recording_without_reason'
  | 'failed_attempt_without_reason'
  | 'scored_mode_missing_engine'
  | 'scored_mode_missing_version'
  | 'scored_mode_missing_confidence'
  | 'scored_mode_missing_score'
  | 'invalid_recognition_confidence'
  | 'invalid_pronunciation_score'
  | 'low_confidence_progress_penalty'
  | 'sensitive_payload';

export type PlanPronunciationClaimIssueCode =
  | 'missing_claim_text'
  | 'fake_exact_scoring_claim';

export type PlanPronunciationAttemptIssue = {
  code: PlanPronunciationAttemptIssueCode;
  attemptId?: string;
  detail: string;
};

export type PlanPronunciationClaimIssue = {
  code: PlanPronunciationClaimIssueCode;
  claimId: string;
  detail: string;
};

export type PlanPronunciationAttemptValidationResult = {
  validForPractice: boolean;
  validForScoring: boolean;
  issues: PlanPronunciationAttemptIssue[];
};

export type PlanPronunciationClaimValidationResult = {
  valid: boolean;
  issues: PlanPronunciationClaimIssue[];
};

export const MIN_PRONUNCIATION_CONFIDENCE_FOR_PROGRESS = 0.75;

const EXACT_SCORING_CLAIM_PATTERN =
  /(?:точн(?:ая|ый|ое|ую)\s+оценк(?:а|у|и)|оценк(?:а|у|и)\s+(?:в\s+)?(?:процент(?:ах|ы|ов)?|балл(?:ах|ы|ов)?)|процент(?:ах|ы|ов)?|балл(?:ах|ы|ов)?|score|scoring|perfect|идеальн(?:ая|ую|ые|ый|ое)?\s+оценк(?:а|у|и))/i;

const EXACT_SCORING_CLAIM_PATTERN_RU =
  /(?:точн(?:ая|ый|ое|ую)\s+оценк(?:а|у|и)|оценк(?:а|у|и)\s+(?:в\s+)?(?:процент(?:ах|ы|ов)?|балл(?:ах|ы|ов)?)|процент(?:ах|ы|ов)?|балл(?:ах|ы|ов)?|идеальн(?:ая|ую|ые|ый|ое)?\s+оценк(?:а|у|и))/i;

const SENSITIVE_TEXT_PATTERN =
  /(?:\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|\b\d{3,}[-\s]?\d{2,}[-\s]?\d{2,}\b|\b(?:card number|bank|address|street|postcode|doctor|diagnosis)\b)/i;

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasPositiveDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isValidConfidence(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isValidScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function canUseConfidenceForProgress(confidence: number | undefined): boolean {
  return isValidConfidence(confidence) && confidence >= MIN_PRONUNCIATION_CONFIDENCE_FOR_PROGRESS;
}

function issue(
  code: PlanPronunciationAttemptIssueCode,
  detail: string,
  attempt?: PlanPronunciationAttempt,
): PlanPronunciationAttemptIssue {
  return {
    code,
    detail,
    attemptId: attempt?.id,
  };
}

function claimIssue(
  code: PlanPronunciationClaimIssueCode,
  detail: string,
  claim: PlanPronunciationClaim,
): PlanPronunciationClaimIssue {
  return {
    code,
    detail,
    claimId: claim.id,
  };
}

function payloadHasSensitiveText(payload: PlanPronunciationAttempt['sanitizedPayload']): boolean {
  if (!payload) return false;
  return Object.values(payload).some((value) => (
    typeof value === 'string' && SENSITIVE_TEXT_PATTERN.test(value)
  ));
}

function baseAttempt(input: PlanPronunciationAttemptInput): Omit<
  PlanPronunciationAttempt,
  'mode' | 'status' | 'progressEligible' | 'progressPenaltyAllowed'
> {
  return {
    id: input.id || `${input.blockId}:${input.contentUnitId}:${Date.now()}`,
    planInstanceId: input.planInstanceId.trim(),
    planId: input.planId,
    dayIndex: input.dayIndex,
    blockId: input.blockId.trim(),
    contentUnitId: input.contentUnitId.trim(),
    targetText: input.targetText.trim(),
    recordingId: input.recordingId?.trim() || undefined,
    recordingUri: input.recordingUri?.trim() || undefined,
    recordingDurationMs: input.recordingDurationMs,
    transcript: input.transcript?.trim() || undefined,
    recognitionProvider: input.recognitionProvider,
    recognitionConfidence: input.recognitionConfidence,
    scoringProvider: input.scoringProvider,
    scoringVersion: input.scoringVersion?.trim() || undefined,
    score: input.score,
    pronunciationScore: input.pronunciationScore,
    fluencyScore: input.fluencyScore,
    intonationScore: input.intonationScore,
    occurredAt: input.occurredAt || new Date().toISOString(),
    failureReason: input.failureReason?.trim() || undefined,
    sanitizedPayload: sanitizePlanAttemptPayload(input.payload),
  };
}

export function buildPracticePronunciationAttempt(
  input: PlanPronunciationAttemptInput,
): PlanPronunciationAttempt {
  const hasRecording = hasText(input.recordingId) &&
    hasText(input.recordingUri) &&
    hasPositiveDuration(input.recordingDurationMs);

  return {
    ...baseAttempt(input),
    mode: 'practice',
    status: hasRecording ? 'recorded' : 'empty_recording',
    progressEligible: hasRecording,
    progressPenaltyAllowed: false,
  };
}

export function buildScoredPronunciationAttempt(
  input: PlanPronunciationAttemptInput,
): PlanPronunciationAttempt {
  const highConfidence = canUseConfidenceForProgress(input.recognitionConfidence);
  const validScore = isValidScore(input.score);

  return {
    ...baseAttempt(input),
    mode: 'scored',
    status: validScore ? 'scored' : 'transcribed',
    progressEligible: highConfidence && validScore,
    progressPenaltyAllowed: Boolean(input.progressPenaltyAllowed ?? true) &&
      highConfidence &&
      validScore,
  };
}

export function validatePlanPronunciationAttempt(
  attempt: PlanPronunciationAttempt,
): PlanPronunciationAttemptValidationResult {
  const issues: PlanPronunciationAttemptIssue[] = [];

  if (!hasText(attempt.planInstanceId)) {
    issues.push(issue(
      'missing_plan_instance_id',
      'Pronunciation attempts must belong to a plan instance.',
      attempt,
    ));
  }

  if (!hasText(attempt.blockId)) {
    issues.push(issue(
      'missing_block_id',
      'Pronunciation attempts must point to the exercise block.',
      attempt,
    ));
  }

  if (!hasText(attempt.contentUnitId)) {
    issues.push(issue(
      'missing_content_unit_id',
      'Pronunciation attempts must point to the trained phrase.',
      attempt,
    ));
  }

  if (!hasText(attempt.targetText)) {
    issues.push(issue(
      'missing_target_text',
      'Pronunciation attempts must store the target phrase text.',
      attempt,
    ));
  }

  if (!hasText(attempt.recordingId) && attempt.status !== 'empty_recording') {
    issues.push(issue(
      'missing_recording_id',
      'Recorded pronunciation attempts need a stable recording id.',
      attempt,
    ));
  }

  if (!hasText(attempt.recordingUri) && attempt.status !== 'empty_recording') {
    issues.push(issue(
      'missing_recording_uri',
      'Recorded pronunciation attempts need a local or uploaded recording uri.',
      attempt,
    ));
  }

  if (!hasPositiveDuration(attempt.recordingDurationMs) && attempt.status !== 'empty_recording') {
    issues.push(issue(
      'invalid_recording_duration',
      'Recorded pronunciation attempts need a positive recording duration.',
      attempt,
    ));
  }

  if (attempt.status === 'empty_recording' && !hasText(attempt.failureReason)) {
    issues.push(issue(
      'empty_recording_without_reason',
      'Empty recordings must explain whether the user was silent, denied mic access, or recording failed.',
      attempt,
    ));
  }

  if (attempt.status === 'failed' && !hasText(attempt.failureReason)) {
    issues.push(issue(
      'failed_attempt_without_reason',
      'Failed pronunciation attempts must store an explicit failure reason.',
      attempt,
    ));
  }

  if (attempt.mode === 'scored') {
    if (!attempt.scoringProvider || attempt.scoringProvider === 'none' || attempt.scoringProvider === 'unknown') {
      issues.push(issue(
        'scored_mode_missing_engine',
        'Scored pronunciation attempts need a real scoring engine.',
        attempt,
      ));
    }

    if (!hasText(attempt.scoringVersion)) {
      issues.push(issue(
        'scored_mode_missing_version',
        'Scored pronunciation attempts need a scoring engine version.',
        attempt,
      ));
    }

    if (typeof attempt.recognitionConfidence !== 'number') {
      issues.push(issue(
        'scored_mode_missing_confidence',
        'Scored pronunciation attempts need recognition confidence.',
        attempt,
      ));
    } else if (!isValidConfidence(attempt.recognitionConfidence)) {
      issues.push(issue(
        'invalid_recognition_confidence',
        'Recognition confidence must be between 0 and 1.',
        attempt,
      ));
    }

    if (typeof attempt.score !== 'number') {
      issues.push(issue(
        'scored_mode_missing_score',
        'Scored pronunciation attempts need a score from the scoring engine.',
        attempt,
      ));
    } else if (!isValidScore(attempt.score)) {
      issues.push(issue(
        'invalid_pronunciation_score',
        'Pronunciation score must be between 0 and 100.',
        attempt,
      ));
    }
  }

  if (
    isValidConfidence(attempt.recognitionConfidence) &&
    attempt.recognitionConfidence < MIN_PRONUNCIATION_CONFIDENCE_FOR_PROGRESS &&
    attempt.progressPenaltyAllowed
  ) {
    issues.push(issue(
      'low_confidence_progress_penalty',
      'Low recognition confidence cannot penalize user progress.',
      attempt,
    ));
  }

  if (payloadHasSensitiveText(attempt.sanitizedPayload)) {
    issues.push(issue(
      'sensitive_payload',
      'Pronunciation attempt payload contains sensitive text.',
      attempt,
    ));
  }

  const practiceBlockingCodes: PlanPronunciationAttemptIssueCode[] = [
    'missing_plan_instance_id',
    'missing_block_id',
    'missing_content_unit_id',
    'missing_target_text',
    'missing_recording_id',
    'missing_recording_uri',
    'invalid_recording_duration',
    'empty_recording_without_reason',
    'failed_attempt_without_reason',
    'low_confidence_progress_penalty',
    'sensitive_payload',
  ];

  const validForPractice = issues.every((item) => !practiceBlockingCodes.includes(item.code));
  const validForScoring = attempt.mode === 'scored' &&
    validForPractice &&
    issues.length === 0 &&
    canUseConfidenceForProgress(attempt.recognitionConfidence) &&
    isValidScore(attempt.score);

  return {
    validForPractice,
    validForScoring,
    issues,
  };
}

export function validatePlanPronunciationClaim(
  claim: PlanPronunciationClaim,
  options: { scoringAvailable: boolean },
): PlanPronunciationClaimValidationResult {
  const issues: PlanPronunciationClaimIssue[] = [];

  if (!hasText(claim.text)) {
    issues.push(claimIssue(
      'missing_claim_text',
      'Pronunciation UI claim must contain visible copy.',
      claim,
    ));
  }

  if (
    !options.scoringAvailable &&
    (
      claim.requiresScoring ||
      EXACT_SCORING_CLAIM_PATTERN.test(claim.text) ||
      EXACT_SCORING_CLAIM_PATTERN_RU.test(claim.text)
    )
  ) {
    issues.push(claimIssue(
      'fake_exact_scoring_claim',
      'UI cannot promise exact pronunciation scoring before scoring is available.',
      claim,
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
