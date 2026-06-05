import {
  buildBlockedPlanPronunciationScoringRequirement,
  validatePlanPronunciationScoringRequirement,
  type PlanPronunciationScoringRequirement,
  type PlanPronunciationScoringRequirementIssueCode,
  type PlanPronunciationScoringRequirementReadinessResult,
} from './personal_plan_pronunciation_readiness';
import {
  buildGavanWeek1CanonicalPlan,
  type GavanCanonicalDay,
  type GavanCanonicalExerciseBlock,
  type GavanCanonicalPhrase,
  type GavanWeek1CanonicalPlan,
} from './personal_plan_gavan_week1_canonical_plan';

export type GavanWeek1PronunciationReferenceAdapterStatus =
  | 'pronunciation_references_ready_scoring_blocked'
  | 'pronunciation_references_ready_scoring_available'
  | 'pronunciation_references_invalid';

export type GavanWeek1PronunciationReferenceIssueCode =
  | 'wrong_plan_or_week'
  | 'missing_pronunciation_shadow_block'
  | 'missing_reference_target'
  | 'missing_reference_requirement'
  | PlanPronunciationScoringRequirementIssueCode;

export type GavanWeek1PronunciationReferenceIssue = {
  code: GavanWeek1PronunciationReferenceIssueCode;
  referenceId?: string;
  detail: string;
};

export type GavanWeek1PronunciationReference = {
  id: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: string;
  dayIndex: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  blockId: string;
  exerciseId: string;
  contentUnitId: string;
  targetText: string;
  runtimeMode: 'plan_pronunciation_repeat';
  source: {
    type: 'canonical_pronunciation_shadow';
    phraseId: string;
    canonicalExerciseType: 'pronunciation_shadow';
  };
  scoringRequirement: PlanPronunciationScoringRequirement;
  readiness: PlanPronunciationScoringRequirementReadinessResult;
};

export type GavanWeek1PronunciationReferenceAdapterSummary = {
  pronunciationBlockCount: number;
  referenceCount: number;
  authoringReadyReferenceCount: number;
  productionReadyReferenceCount: number;
  blockedReferenceCount: number;
  fakeFinalClaimCount: number;
};

export type BuildGavanWeek1PronunciationReferenceAdapterInput = {
  plan?: GavanWeek1CanonicalPlan;
  scoringRequirementsByReferenceId?: Record<string, PlanPronunciationScoringRequirement | undefined>;
};

export type GavanWeek1PronunciationReferenceAdapterResult = {
  kind: 'gavan_week1_pronunciation_reference_adapter';
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1PronunciationReferenceAdapterStatus;
  valid: boolean;
  references: GavanWeek1PronunciationReference[];
  summary: GavanWeek1PronunciationReferenceAdapterSummary;
  issues: GavanWeek1PronunciationReferenceIssue[];
};

function issue(
  code: GavanWeek1PronunciationReferenceIssueCode,
  detail: string,
  referenceId?: string,
): GavanWeek1PronunciationReferenceIssue {
  return {
    code,
    detail,
    ...(referenceId ? { referenceId } : {}),
  };
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function referenceId(day: GavanCanonicalDay, block: GavanCanonicalExerciseBlock, phrase: GavanCanonicalPhrase): string {
  return `${day.dayId}:pronunciation-reference:${block.id}:${phrase.id}`;
}

function exerciseId(day: GavanCanonicalDay, block: GavanCanonicalExerciseBlock, phrase: GavanCanonicalPhrase): string {
  return `${day.dayId}:pronunciation-repeat:${block.id}:${phrase.id}`;
}

function phraseById(day: GavanCanonicalDay): Map<string, GavanCanonicalPhrase> {
  return new Map(day.phrases.map((phrase) => [phrase.id, phrase]));
}

function pronunciationBlocks(plan: GavanWeek1CanonicalPlan): Array<{
  day: GavanCanonicalDay;
  block: GavanCanonicalExerciseBlock;
}> {
  return plan.days.flatMap((day) =>
    day.exerciseBlocks
      .filter((block) => block.exerciseType === 'pronunciation_shadow')
      .map((block) => ({ day, block })),
  );
}

function buildReference(
  day: GavanCanonicalDay,
  block: GavanCanonicalExerciseBlock,
  phrase: GavanCanonicalPhrase,
  requirement: PlanPronunciationScoringRequirement | undefined,
): GavanWeek1PronunciationReference {
  const id = referenceId(day, block, phrase);
  const builtRequirement = requirement ?? buildBlockedPlanPronunciationScoringRequirement({
    exerciseId: exerciseId(day, block, phrase),
    blockId: block.id,
    contentUnitIds: [phrase.id],
    targetText: phrase.english,
  });
  const readiness = validatePlanPronunciationScoringRequirement(builtRequirement);

  return {
    id,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: day.dayId,
    dayIndex: day.dayIndex,
    blockId: block.id,
    exerciseId: builtRequirement.exerciseId,
    contentUnitId: phrase.id,
    targetText: phrase.english,
    runtimeMode: 'plan_pronunciation_repeat',
    source: {
      type: 'canonical_pronunciation_shadow',
      phraseId: phrase.id,
      canonicalExerciseType: 'pronunciation_shadow',
    },
    scoringRequirement: builtRequirement,
    readiness,
  };
}

function summarize(
  blockCount: number,
  references: GavanWeek1PronunciationReference[],
): GavanWeek1PronunciationReferenceAdapterSummary {
  return {
    pronunciationBlockCount: blockCount,
    referenceCount: references.length,
    authoringReadyReferenceCount: references.filter((item) => item.readiness.validForAuthoring).length,
    productionReadyReferenceCount: references.filter((item) => item.readiness.productionReady).length,
    blockedReferenceCount: references.filter((item) => !item.readiness.productionReady).length,
    fakeFinalClaimCount: references.filter((item) =>
      item.readiness.issues.some((entry) => entry.code === 'fake_final_pronunciation_claim'),
    ).length,
  };
}

function statusFor(
  valid: boolean,
  summary: GavanWeek1PronunciationReferenceAdapterSummary,
): GavanWeek1PronunciationReferenceAdapterStatus {
  if (!valid) return 'pronunciation_references_invalid';
  if (summary.referenceCount > 0 && summary.productionReadyReferenceCount === summary.referenceCount) {
    return 'pronunciation_references_ready_scoring_available';
  }
  return 'pronunciation_references_ready_scoring_blocked';
}

export function buildGavanWeek1PronunciationReferenceAdapter(
  input: BuildGavanWeek1PronunciationReferenceAdapterInput = {},
): GavanWeek1PronunciationReferenceAdapterResult {
  const plan = input.plan ?? buildGavanWeek1CanonicalPlan();
  const issues: GavanWeek1PronunciationReferenceIssue[] = [];

  if (plan.planId !== 'gavan' || plan.weekIndex !== 1) {
    issues.push(issue(
      'wrong_plan_or_week',
      'Pronunciation reference adapter can only target Gavan week 1.',
    ));
  }

  const blocks = pronunciationBlocks(plan);
  if (blocks.length === 0) {
    issues.push(issue(
      'missing_pronunciation_shadow_block',
      'Gavan week 1 needs at least one canonical pronunciation_shadow block before scoring readiness can be reviewed.',
    ));
  }

  const references: GavanWeek1PronunciationReference[] = [];

  for (const { day, block } of blocks) {
    const phrases = phraseById(day);
    for (const phraseId of block.phraseIds) {
      const phrase = phrases.get(phraseId);
      if (!phrase || !hasText(phrase.english)) {
        issues.push(issue(
          'missing_reference_target',
          'Pronunciation reference could not resolve an exact target phrase.',
          `${day.dayId}:pronunciation-reference:${block.id}:${phraseId}`,
        ));
        continue;
      }

      const id = referenceId(day, block, phrase);
      const reference = buildReference(
        day,
        block,
        phrase,
        input.scoringRequirementsByReferenceId?.[id],
      );
      references.push(reference);

      if (!reference.scoringRequirement) {
        issues.push(issue(
          'missing_reference_requirement',
          'Pronunciation reference needs a scoring requirement, even when scoring is blocked.',
          reference.id,
        ));
      }

      for (const readinessIssue of reference.readiness.issues) {
        issues.push(issue(readinessIssue.code, readinessIssue.detail, reference.id));
      }
    }
  }

  const summary = summarize(blocks.length, references);
  const valid = issues.length === 0 && references.length > 0;

  return {
    kind: 'gavan_week1_pronunciation_reference_adapter',
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: statusFor(valid, summary),
    valid,
    references,
    summary,
    issues,
  };
}
