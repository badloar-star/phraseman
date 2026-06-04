import type {
  PersonalPlanDefinition,
  PersonalPlanId,
  PlanDailyTask,
  PlanDay,
  PlanMinutesChoice,
  PlanTaskDestination,
} from './personal_plan_catalog';
import type { PersonalPlanDayPassport } from './personal_plan_quality';

export type PlanContentUnitKind =
  | 'universal_phrase'
  | 'route_phrase'
  | 'vocabulary_note'
  | 'grammar_note'
  | 'audio_target'
  | 'pronunciation_target';

export type PlanExerciseType =
  | 'linked_lesson_slice'
  | 'plan_phrase_build'
  | 'plan_missing_word'
  | 'plan_choose_natural_phrase'
  | 'plan_listen_choose'
  | 'plan_listen_build'
  | 'plan_phrase_recall'
  | 'plan_pronunciation_repeat'
  | 'plan_quiz'
  | 'personal_practice_seeded'
  | 'trainer_weak_spot'
  | 'flashcards_plan_review';

export type PlanContentUnit = {
  id: string;
  planId: PersonalPlanId;
  kind: PlanContentUnitKind;
  title: string;
  english?: string;
  translation?: string;
  prerequisiteLessonIds: number[];
  grammarTags: string[];
  vocabularyTags: string[];
  explanationCardIds: string[];
  recoveryTags: string[];
  audioAssetIds?: string[];
  sensitive?: boolean;
};

export type PlanExerciseProgressPolicy =
  | 'correct_only'
  | 'completion_only'
  | 'diagnostic_only';

export type PlanExerciseRecoveryPolicy =
  | 'none'
  | 'return_wrong_to_recall'
  | 'return_wrong_to_trainer'
  | 'return_wrong_to_recall_and_trainer';

export type PlanExerciseBlock = {
  id: string;
  planId: PersonalPlanId;
  dayIndex: number;
  type: PlanExerciseType;
  title: string;
  contentUnitIds: string[];
  estimatedMinutes: number;
  requiredFor: PlanMinutesChoice[];
  prerequisiteLessonIds: number[];
  progressPolicy: PlanExerciseProgressPolicy;
  recoveryPolicy: PlanExerciseRecoveryPolicy;
  destination?: PlanTaskDestination;
};

export type PlanAttemptResult = 'correct' | 'wrong' | 'skipped' | 'completed';

export type PlanAttemptEvent = {
  id: string;
  planInstanceId: string;
  planId: PersonalPlanId;
  dayIndex: number;
  blockId: string;
  exerciseType: PlanExerciseType;
  contentUnitId?: string;
  occurredAt: string;
  result: PlanAttemptResult;
  progressEligible: boolean;
  expectedAnswer?: string;
  selectedAnswer?: string;
  selectedAnswerKnown: boolean;
  grammarTags: string[];
  vocabularyTags: string[];
  mistakeTags: string[];
  sanitizedPayload?: Record<string, string | number | boolean | null>;
};

export type PlanRecoveryCandidateTarget = 'recall' | 'trainer' | 'mistake_analytics';

export type PlanRecoveryCandidate = {
  id: string;
  target: PlanRecoveryCandidateTarget;
  planInstanceId: string;
  planId: PersonalPlanId;
  dayIndex: number;
  blockId: string;
  exerciseType: PlanExerciseType;
  contentUnitId?: string;
  expectedAnswer?: string;
  selectedAnswer?: string;
  selectedAnswerKnown: boolean;
  grammarTags: string[];
  vocabularyTags: string[];
  mistakeTags: string[];
  reason: 'wrong_attempt' | 'skipped_attempt';
};

export type PlanExplanationTrigger =
  | 'first_seen'
  | 'correct'
  | 'wrong'
  | 'word_note'
  | 'after_recall';

export type PlanExplanationTone = 'clear' | 'supportive' | 'correction';

export type PlanExplanationCard = {
  id: string;
  contentUnitId: string;
  trigger: PlanExplanationTrigger;
  tone: PlanExplanationTone;
  title: string;
  body: string;
  grammarTags: string[];
  vocabularyTags: string[];
  explainsSelectedAnswerOnlyWhenKnown: boolean;
};

export type { PersonalPlanDayPassport as PlanDayPassport };

export type PlanEngineQualityCode =
  | 'missing_content_units'
  | 'invalid_estimated_minutes'
  | 'recall_without_recovery_policy'
  | 'unknown_exercise_type'
  | 'missing_plan_instance_id'
  | 'wrong_attempt_marked_progress_eligible'
  | 'selected_answer_claim_without_value'
  | 'sensitive_payload'
  | 'attempt_block_missing'
  | 'attempt_block_type_mismatch'
  | 'attempt_content_unit_missing_from_block'
  | 'missing_explanation_copy'
  | 'wrong_explanation_can_hallucinate_selection'
  | 'technical_copy';

export type PlanEngineQualityIssue = {
  code: PlanEngineQualityCode;
  subject: 'block' | 'attempt' | 'explanation';
  id: string;
  detail: string;
};

export type PlanEngineQualityInput = {
  blocks?: PlanExerciseBlock[];
  attempts?: PlanAttemptEvent[];
  explanationCards?: PlanExplanationCard[];
};

export type PlanAttemptEventFactoryInput = {
  id?: string;
  planInstanceId: string;
  result: PlanAttemptResult;
  contentUnitId?: string;
  occurredAt?: string;
  expectedAnswer?: string;
  selectedAnswer?: string | null;
  grammarTags?: string[];
  vocabularyTags?: string[];
  mistakeTags?: string[];
  payload?: Record<string, string | number | boolean | null | undefined>;
};

export const PLAN_EXERCISE_TYPES: PlanExerciseType[] = [
  'linked_lesson_slice',
  'plan_phrase_build',
  'plan_missing_word',
  'plan_choose_natural_phrase',
  'plan_listen_choose',
  'plan_listen_build',
  'plan_phrase_recall',
  'plan_pronunciation_repeat',
  'plan_quiz',
  'personal_practice_seeded',
  'trainer_weak_spot',
  'flashcards_plan_review',
];

const SENSITIVE_TEXT_PATTERN = /(?:\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|\b\d{3,}[-\s]?\d{2,}[-\s]?\d{2,}\b|\b(?:street|address|postcode|apartment|flat|bank|card number|doctor|diagnosis)\b)/i;
const SENSITIVE_PAYLOAD_KEY_PATTERN = /(?:email|phone|address|postcode|street|apartment|flat|bank|card|medical|doctor|diagnosis)/i;

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function payloadHasSensitiveText(payload: PlanAttemptEvent['sanitizedPayload']): boolean {
  if (!payload) return false;
  return Object.values(payload).some((value) => (
    typeof value === 'string' && SENSITIVE_TEXT_PATTERN.test(value)
  ));
}

export function sanitizePlanAttemptPayload(
  payload: PlanAttemptEventFactoryInput['payload'],
): PlanAttemptEvent['sanitizedPayload'] {
  if (!payload) return undefined;

  const sanitized: NonNullable<PlanAttemptEvent['sanitizedPayload']> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    if (SENSITIVE_PAYLOAD_KEY_PATTERN.test(key)) continue;
    if (typeof value === 'string' && SENSITIVE_TEXT_PATTERN.test(value)) continue;
    sanitized[key] = value;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function progressEligibleForResult(
  policy: PlanExerciseProgressPolicy,
  result: PlanAttemptResult,
): boolean {
  if (policy === 'diagnostic_only') return false;
  if (policy === 'completion_only') return result === 'completed';
  return result === 'correct';
}

function compactTags(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

export function createPlanAttemptEvent(
  block: PlanExerciseBlock,
  input: PlanAttemptEventFactoryInput,
): PlanAttemptEvent {
  const selectedAnswer = input.selectedAnswer?.trim() || undefined;

  return {
    id: input.id || `${block.id}_${Date.now()}`,
    planInstanceId: input.planInstanceId.trim(),
    planId: block.planId,
    dayIndex: block.dayIndex,
    blockId: block.id,
    exerciseType: block.type,
    contentUnitId: input.contentUnitId,
    occurredAt: input.occurredAt || new Date().toISOString(),
    result: input.result,
    progressEligible: progressEligibleForResult(block.progressPolicy, input.result),
    expectedAnswer: input.expectedAnswer?.trim() || undefined,
    selectedAnswer,
    selectedAnswerKnown: Boolean(selectedAnswer),
    grammarTags: compactTags(input.grammarTags),
    vocabularyTags: compactTags(input.vocabularyTags),
    mistakeTags: compactTags(input.mistakeTags),
    sanitizedPayload: sanitizePlanAttemptPayload(input.payload),
  };
}

export function canPlanAttemptAffectProgress(event: PlanAttemptEvent): boolean {
  return event.progressEligible && (event.result === 'correct' || event.result === 'completed');
}

function recoveryTargetsForPolicy(policy: PlanExerciseRecoveryPolicy): PlanRecoveryCandidateTarget[] {
  if (policy === 'return_wrong_to_recall') return ['recall', 'mistake_analytics'];
  if (policy === 'return_wrong_to_trainer') return ['trainer', 'mistake_analytics'];
  if (policy === 'return_wrong_to_recall_and_trainer') return ['recall', 'trainer', 'mistake_analytics'];
  return [];
}

export function planRecoveryCandidatesForAttempt(
  block: PlanExerciseBlock,
  event: PlanAttemptEvent,
): PlanRecoveryCandidate[] {
  if (event.result !== 'wrong' && event.result !== 'skipped') return [];
  if (block.id !== event.blockId || block.planId !== event.planId || block.dayIndex !== event.dayIndex) return [];
  if (block.type !== event.exerciseType) return [];
  if (event.contentUnitId && block.contentUnitIds.length > 0 && !block.contentUnitIds.includes(event.contentUnitId)) return [];
  if (!hasText(event.planInstanceId)) return [];

  const targets = recoveryTargetsForPolicy(block.recoveryPolicy);
  if (targets.length === 0) return [];

  return targets.map((target) => ({
    id: `${event.id}:${target}`,
    target,
    planInstanceId: event.planInstanceId,
    planId: event.planId,
    dayIndex: event.dayIndex,
    blockId: event.blockId,
    exerciseType: event.exerciseType,
    contentUnitId: event.contentUnitId,
    expectedAnswer: event.expectedAnswer,
    selectedAnswer: event.selectedAnswerKnown ? event.selectedAnswer : undefined,
    selectedAnswerKnown: event.selectedAnswerKnown,
    grammarTags: compactTags(event.grammarTags),
    vocabularyTags: compactTags(event.vocabularyTags),
    mistakeTags: compactTags(event.mistakeTags),
    reason: event.result === 'skipped' ? 'skipped_attempt' : 'wrong_attempt',
  }));
}

export function validatePlanAttemptEventContract(event: PlanAttemptEvent): string[] {
  const issues: string[] = [];

  if (!hasText(event.planInstanceId)) {
    issues.push('missing_plan_instance_id');
  }
  if (!PLAN_EXERCISE_TYPES.includes(event.exerciseType)) {
    issues.push('unknown_exercise_type');
  }
  if ((event.result === 'wrong' || event.result === 'skipped') && event.progressEligible) {
    issues.push('wrong_attempt_marked_progress_eligible');
  }
  if (event.selectedAnswerKnown && !hasText(event.selectedAnswer)) {
    issues.push('selected_answer_claim_without_value');
  }
  if (payloadHasSensitiveText(event.sanitizedPayload)) {
    issues.push('sensitive_payload');
  }

  return issues;
}

export function validatePlanExerciseBlockContract(block: PlanExerciseBlock): string[] {
  const issues: string[] = [];

  if (!PLAN_EXERCISE_TYPES.includes(block.type)) {
    issues.push('unknown_exercise_type');
  }
  if (block.estimatedMinutes < 1) {
    issues.push('invalid_estimated_minutes');
  }
  if (block.contentUnitIds.length === 0 && block.type !== 'linked_lesson_slice') {
    issues.push('missing_content_units');
  }
  if (
    block.type === 'plan_phrase_recall' &&
    block.recoveryPolicy === 'none'
  ) {
    issues.push('recall_without_recovery_policy');
  }

  return issues;
}

export function validatePlanExplanationCardContract(card: PlanExplanationCard): string[] {
  const issues: string[] = [];

  if (!hasText(card.title) || !hasText(card.body)) {
    issues.push('missing_explanation_copy');
  }
  if (card.trigger === 'wrong' && !card.explainsSelectedAnswerOnlyWhenKnown) {
    issues.push('wrong_explanation_can_hallucinate_selection');
  }
  if (/route|source|destination|dev|active recall/i.test(`${card.title} ${card.body}`)) {
    issues.push('technical_copy');
  }

  return issues;
}

function qualityIssue(
  subject: PlanEngineQualityIssue['subject'],
  id: string,
  code: string,
  detail: string,
): PlanEngineQualityIssue {
  return {
    subject,
    id,
    code: code as PlanEngineQualityCode,
    detail,
  };
}

export function validatePlanEngineQuality(input: PlanEngineQualityInput): PlanEngineQualityIssue[] {
  const issues: PlanEngineQualityIssue[] = [];
  const blocks = input.blocks ?? [];
  const attempts = input.attempts ?? [];
  const explanationCards = input.explanationCards ?? [];
  const blocksById = new Map(blocks.map((block) => [block.id, block]));

  for (const block of blocks) {
    for (const code of validatePlanExerciseBlockContract(block)) {
      issues.push(qualityIssue('block', block.id, code, `Exercise block failed contract: ${code}`));
    }
  }

  for (const attempt of attempts) {
    for (const code of validatePlanAttemptEventContract(attempt)) {
      issues.push(qualityIssue('attempt', attempt.id, code, `Attempt event failed contract: ${code}`));
    }

    const block = blocksById.get(attempt.blockId);
    if (!block) {
      issues.push(qualityIssue('attempt', attempt.id, 'attempt_block_missing', `Attempt references missing block: ${attempt.blockId}`));
      continue;
    }

    if (block.type !== attempt.exerciseType) {
      issues.push(qualityIssue('attempt', attempt.id, 'attempt_block_type_mismatch', `Attempt type ${attempt.exerciseType} does not match block type ${block.type}`));
    }

    if (
      attempt.contentUnitId &&
      block.contentUnitIds.length > 0 &&
      !block.contentUnitIds.includes(attempt.contentUnitId)
    ) {
      issues.push(qualityIssue('attempt', attempt.id, 'attempt_content_unit_missing_from_block', `Attempt content unit is not part of block: ${attempt.contentUnitId}`));
    }
  }

  for (const card of explanationCards) {
    for (const code of validatePlanExplanationCardContract(card)) {
      issues.push(qualityIssue('explanation', card.id, code, `Explanation card failed contract: ${code}`));
    }
  }

  return issues;
}

function exerciseTypeForTask(task: PlanDailyTask): PlanExerciseType {
  if (task.kind === 'linked_lesson_slice') return 'linked_lesson_slice';
  if (task.kind === 'plan_phrase_lesson') return 'plan_phrase_build';
  if (task.kind === 'plan_phrase_recall' || task.kind === 'active_recall') return 'plan_phrase_recall';
  if (task.kind === 'plan_missing_word') return 'plan_missing_word';
  if (task.kind === 'plan_choose_natural_phrase') return 'plan_choose_natural_phrase';
  if (task.kind === 'plan_listen_choose') return 'plan_listen_choose';
  if (task.kind === 'plan_listen_build') return 'plan_listen_build';
  if (task.kind === 'plan_pronunciation_repeat') return 'plan_pronunciation_repeat';
  if (task.kind === 'plan_quiz') return 'plan_quiz';
  if (task.kind === 'personal_practice_seeded') return 'personal_practice_seeded';
  if (task.kind === 'trainer_weak_spot') return 'trainer_weak_spot';
  if (task.kind === 'flashcards_plan_review') return 'flashcards_plan_review';
  return 'plan_phrase_build';
}

function contentUnitIdsForDestination(destination: PlanTaskDestination): string[] {
  if (destination.type === 'lesson') {
    if (destination.requiredPhraseIds?.length) {
      return destination.requiredPhraseIds.map((id) => `lesson_phrase:${id}`);
    }
    if (typeof destination.lessonId === 'number') {
      return [`lesson:${destination.lessonId}:slice:${destination.requiredPhrases}`];
    }
    return [];
  }
  if (destination.type === 'plan_phrase_lesson' || destination.type === 'plan_phrase_recall') {
    return [`plan_phrase_lesson:${destination.lessonId}`];
  }
  if (destination.type === 'plan_exercise') {
    return destination.contentUnitIds;
  }
  if (destination.type === 'quiz') {
    return [`quiz:${destination.quizId}`];
  }
  if (destination.type === 'practice') {
    return [`practice:${destination.trainingId}`];
  }
  if (destination.type === 'trainer') {
    return [`trainer:${destination.mode}`];
  }
  if (destination.type === 'flashcards') {
    return [`flashcards:${destination.deckId}`];
  }
  if (destination.type === 'recall') {
    return destination.phraseIds.map((id) => `recall:${id}`);
  }
  return [];
}

function contentUnitIdsForTask(day: PlanDay, task: PlanDailyTask): string[] {
  const destination = task.destination;
  if (destination.type !== 'plan_phrase_recall') {
    return contentUnitIdsForDestination(destination);
  }

  const scheduledPhraseIds = day.recallSchedule
    ?.filter((item) => item.phraseLessonId === destination.lessonId)
    .flatMap((item) => item.phraseIds) ?? [];

  return scheduledPhraseIds.length > 0
    ? scheduledPhraseIds
    : contentUnitIdsForDestination(destination);
}

function prerequisiteLessonIdsForTask(day: PlanDay, task: PlanDailyTask): number[] {
  const ids = new Set<number>(day.curriculum?.lessonPrerequisites ?? []);
  const destination = task.destination;

  if (destination.type === 'lesson' && typeof destination.lessonId === 'number') {
    ids.add(destination.lessonId);
  }
  if (
    (destination.type === 'plan_phrase_lesson' || destination.type === 'plan_phrase_recall') &&
    typeof destination.afterLessonId === 'number'
  ) {
    ids.add(destination.afterLessonId);
  }
  if (destination.type === 'plan_exercise') {
    for (const lessonId of day.curriculum?.lessonPrerequisites ?? []) {
      ids.add(lessonId);
    }
  }

  return [...ids].sort((a, b) => a - b);
}

function progressPolicyForTask(task: PlanDailyTask): PlanExerciseProgressPolicy {
  if (
    task.kind === 'personal_practice_seeded' ||
    task.kind === 'trainer_weak_spot' ||
    task.kind === 'flashcards_plan_review' ||
    task.kind === 'plan_pronunciation_repeat'
  ) {
    return 'completion_only';
  }

  return 'correct_only';
}

function recoveryPolicyForTask(task: PlanDailyTask): PlanExerciseRecoveryPolicy {
  if (task.kind === 'trainer_weak_spot') return 'return_wrong_to_trainer';
  if (task.kind === 'plan_phrase_lesson') return 'return_wrong_to_recall_and_trainer';
  if (task.kind === 'plan_pronunciation_repeat') return 'none';
  if (
    task.kind === 'linked_lesson_slice' ||
    task.kind === 'active_recall' ||
    task.kind === 'plan_phrase_recall' ||
    task.kind === 'plan_missing_word' ||
    task.kind === 'plan_choose_natural_phrase' ||
    task.kind === 'plan_listen_choose' ||
    task.kind === 'plan_listen_build' ||
    task.kind === 'plan_quiz'
  ) {
    return 'return_wrong_to_recall';
  }
  return 'none';
}

export function planExerciseBlockForTask(
  plan: PersonalPlanDefinition,
  day: PlanDay,
  task: PlanDailyTask,
): PlanExerciseBlock {
  return {
    id: task.id,
    planId: plan.id,
    dayIndex: day.dayIndex,
    type: exerciseTypeForTask(task),
    title: task.title,
    contentUnitIds: contentUnitIdsForTask(day, task),
    estimatedMinutes: task.minutes,
    requiredFor: task.requiredFor,
    prerequisiteLessonIds: prerequisiteLessonIdsForTask(day, task),
    progressPolicy: progressPolicyForTask(task),
    recoveryPolicy: recoveryPolicyForTask(task),
    destination: task.destination,
  };
}

export function planExerciseBlocksForDay(
  plan: PersonalPlanDefinition,
  day: PlanDay,
): PlanExerciseBlock[] {
  return day.tasks.map((task) => planExerciseBlockForTask(plan, day, task));
}
