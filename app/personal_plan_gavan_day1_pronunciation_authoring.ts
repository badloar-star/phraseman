import {
  buildBlockedPlanPronunciationScoringRequirement,
  validatePlanPronunciationScoringRequirement,
  type PlanPronunciationScoringRequirement,
} from './personal_plan_pronunciation_readiness';
import {
  buildGavanDay1ContentCandidate,
  type GavanDay1ContentCandidate,
} from './personal_plan_gavan_day1_content_candidate';
import type { GavanDay1PackageDraft } from './personal_plan_gavan_day1_package_draft';

export type GavanDay1PronunciationPracticeMode = 'repeat_after_sample';

export type GavanDay1PronunciationTarget = {
  id: string;
  phraseId: string;
  contentUnitIds: string[];
  targetText: string;
  mode: GavanDay1PronunciationPracticeMode;
  focus: 'clarity_and_rhythm';
  requiresScoring: true;
};

export type GavanDay1PronunciationAuthoringPlan = {
  dayId: 'gavan-week1-day1';
  status: 'authoring_plan';
  exerciseId: string;
  blockId: string;
  targets: GavanDay1PronunciationTarget[];
  scoringRequirement: PlanPronunciationScoringRequirement;
  finalScoringReady: false;
  summary: {
    targets: number;
    contentUnits: number;
    requiredScoringRequirements: number;
  };
};

export type GavanDay1PronunciationAuthoringIssueCode =
  | 'pronunciation_target_unknown_phrase'
  | 'pronunciation_target_text_mismatch'
  | 'pronunciation_target_missing_scoring_requirement'
  | 'pronunciation_scoring_invalid_for_authoring'
  | 'pronunciation_scoring_ready_claim'
  | 'pronunciation_fake_final_scoring_claim';

export type GavanDay1PronunciationAuthoringIssue = {
  code: GavanDay1PronunciationAuthoringIssueCode;
  targetId?: string;
  detail: string;
};

export type GavanDay1PronunciationAuthoringValidationResult = {
  valid: boolean;
  issues: GavanDay1PronunciationAuthoringIssue[];
};

const DAY_ID = 'gavan-week1-day1' as const;
const PRONUNCIATION_EXERCISE_ID = 'gavan-week1-day1:pronunciation-authoring';
const PRONUNCIATION_BLOCK_ID = 'gavan-week1-day1:pronunciation-authoring';

function issue(
  code: GavanDay1PronunciationAuthoringIssueCode,
  detail: string,
  targetId?: string,
): GavanDay1PronunciationAuthoringIssue {
  return { code, detail, targetId };
}

export function buildGavanDay1PronunciationAuthoringPlan(
  contentCandidate: GavanDay1ContentCandidate = buildGavanDay1ContentCandidate(),
): GavanDay1PronunciationAuthoringPlan {
  const targets = contentCandidate.phrases.map((phrase, index) => ({
    id: `gavan-day1-pronunciation-target-${index + 1}`,
    phraseId: phrase.id,
    contentUnitIds: [phrase.id],
    targetText: phrase.english,
    mode: 'repeat_after_sample' as const,
    focus: 'clarity_and_rhythm' as const,
    requiresScoring: true as const,
  }));
  const contentUnitIds = targets.map((target) => target.phraseId);
  const targetText = targets.map((target) => target.targetText).join(' / ');

  return {
    dayId: DAY_ID,
    status: 'authoring_plan',
    exerciseId: PRONUNCIATION_EXERCISE_ID,
    blockId: PRONUNCIATION_BLOCK_ID,
    targets,
    scoringRequirement: buildBlockedPlanPronunciationScoringRequirement({
      exerciseId: PRONUNCIATION_EXERCISE_ID,
      blockId: PRONUNCIATION_BLOCK_ID,
      contentUnitIds,
      targetText,
    }),
    finalScoringReady: false,
    summary: {
      targets: targets.length,
      contentUnits: contentUnitIds.length,
      requiredScoringRequirements: 1,
    },
  };
}

export function validateGavanDay1PronunciationAuthoringPlan(
  plan: GavanDay1PronunciationAuthoringPlan,
  contentCandidate: GavanDay1ContentCandidate = buildGavanDay1ContentCandidate(),
): GavanDay1PronunciationAuthoringValidationResult {
  const issues: GavanDay1PronunciationAuthoringIssue[] = [];
  const phraseById = new Map(contentCandidate.phrases.map((phrase) => [phrase.id, phrase]));

  plan.targets.forEach((target) => {
    const phrase = phraseById.get(target.phraseId);
    if (!phrase) {
      issues.push(issue(
        'pronunciation_target_unknown_phrase',
        'Pronunciation target must reference a phrase from the current day candidate.',
        target.id,
      ));
      return;
    }

    if (target.contentUnitIds.length !== 1 || target.contentUnitIds[0] !== target.phraseId) {
      issues.push(issue(
        'pronunciation_target_missing_scoring_requirement',
        'Pronunciation target must point to exactly one candidate phrase content unit.',
        target.id,
      ));
    }

    if (target.targetText !== phrase.english) {
      issues.push(issue(
        'pronunciation_target_text_mismatch',
        'Pronunciation target text must match the candidate phrase text.',
        target.id,
      ));
    }

    if (!plan.scoringRequirement.contentUnitIds.includes(target.phraseId)) {
      issues.push(issue(
        'pronunciation_target_missing_scoring_requirement',
        'Pronunciation target must be covered by the declared blocked scoring requirement.',
        target.id,
      ));
    }
  });

  const scoringReadiness =
    validatePlanPronunciationScoringRequirement(plan.scoringRequirement);

  if (!scoringReadiness.validForAuthoring) {
    issues.push(issue(
      'pronunciation_scoring_invalid_for_authoring',
      `Pronunciation authoring requirement is invalid: ${scoringReadiness.issues.map((item) => item.code).join(', ')}.`,
    ));
  }

  if (plan.scoringRequirement.status === 'ready') {
    issues.push(issue(
      'pronunciation_scoring_ready_claim',
      'Pronunciation authoring can require future scoring, but ready scoring belongs to the final scorer pipeline.',
    ));
  }

  if (
    plan.finalScoringReady ||
    plan.scoringRequirement.finalScoringReady ||
    scoringReadiness.issues.some((item) => item.code === 'fake_final_pronunciation_claim')
  ) {
    issues.push(issue(
      'pronunciation_fake_final_scoring_claim',
      'Pronunciation authoring cannot claim final scoring before a real scorer is implemented.',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function attachGavanDay1PronunciationAuthoringToDraft(
  draft: GavanDay1PackageDraft,
  authoringPlan: GavanDay1PronunciationAuthoringPlan =
    buildGavanDay1PronunciationAuthoringPlan(),
): GavanDay1PackageDraft {
  return {
    ...draft,
    readinessInput: {
      ...draft.readinessInput,
      pronunciationRequirementsByExerciseId: {
        ...draft.readinessInput.pronunciationRequirementsByExerciseId,
        [authoringPlan.exerciseId]: authoringPlan.scoringRequirement,
      },
    },
  };
}
