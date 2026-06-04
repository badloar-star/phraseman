import type { PlanExerciseBlock } from './personal_plan_engine_contracts';
import type { PersonalPlanPhraseDraft } from './personal_plan_content_quality_contract';
import {
  buildGavanWeek1DraftExerciseBlocks,
  type GavanWeek1DraftExerciseBlockBuildResult,
} from './personal_plan_harbor_week1_draft_blocks';
import { GAVAN_WEEK1_BLUEPRINT_DRAFT } from './personal_plan_harbor_week1_blueprint_draft';
import {
  buildGavanDay1QuizDraft,
  validateGavanDay1QuizDraft,
  type GavanDay1QuizDraft,
} from './personal_plan_gavan_day1_quiz_draft';
import {
  validateGavanDay1ContentCandidate,
  type GavanDay1ContentCandidate,
} from './personal_plan_gavan_day1_content_candidate';
import {
  buildGavanWeek1DraftPackageReadinessInput,
  validateGavanWeek1DraftPackageReadiness,
  type GavanWeek1DraftPackageReadinessInput,
} from './personal_plan_harbor_week1_package_readiness';
import {
  buildPlanWeakSpotSummary,
  type PlanWeakSpotSummary,
  type PlanWeakSpotSummaryInput,
} from './personal_plan_weak_spot_summary';
import {
  buildPlanTaskSelectionReasonReadiness,
  type PlanTaskSelectionReasonReadiness,
} from './personal_plan_task_selection_reasons';
import {
  buildPlanTaskReasonCopyBundle,
  type PlanTaskReasonCopyBundle,
} from './personal_plan_task_reason_copy';

export type GavanDay1ExplanationRequirement = {
  id: string;
  phraseId: string;
  covers: string[];
  trigger: 'word_note' | 'first_seen';
  required: true;
};

export type GavanDay1PackageDraft = {
  planId: string;
  weekId: string;
  dayId: 'gavan-week1-day1';
  blocks: PlanExerciseBlock[];
  content: {
    source: 'blueprint_draft' | 'candidate';
    phrases: PersonalPlanPhraseDraft[];
    candidateStatus?: GavanDay1ContentCandidate['status'];
    qualityValid: boolean;
    qualityIssueCodes: string[];
  };
  readinessInput: GavanWeek1DraftPackageReadinessInput;
  quizDraft: GavanDay1QuizDraft;
  explanationRequirements: GavanDay1ExplanationRequirement[];
  personalization: {
    weakSpotSummary: PlanWeakSpotSummary;
    taskSelection: PlanTaskSelectionReasonReadiness;
    taskReasonCopy: PlanTaskReasonCopyBundle;
  };
  mediaClaims: {
    audioFinalReady: boolean;
    pronunciationFinalScoringReady: boolean;
  };
  summary: {
    blocks: number;
    contentPhrases: number;
    quizRequirements: number;
    quizItems: number;
    quizExplanationRequirements: number;
    explanationRequirements: number;
    readyBlocks: number;
    blockedBlocks: number;
    weakSpots: number;
    taskSelectionReasons: number;
    weakSpotTaskSelectionReasons: number;
    taskReasonCopies: number;
  };
};

export type GavanDay1PackageDraftOptions = {
  weakSpotSummaryInput?: PlanWeakSpotSummaryInput;
  planInstanceId?: string;
  contentCandidate?: GavanDay1ContentCandidate;
};

export type GavanDay1PackageDraftIssueCode =
  | 'wrong_day_id'
  | 'wrong_block_count'
  | 'package_readiness_failed'
  | 'task_selection_readiness_failed'
  | 'day1_quiz_must_have_10_questions'
  | 'invalid_day1_quiz_draft'
  | 'invalid_content_candidate'
  | 'missing_explanation_requirement'
  | 'fake_final_audio_claim'
  | 'fake_final_pronunciation_claim';

export type GavanDay1PackageDraftIssue = {
  code: GavanDay1PackageDraftIssueCode;
  phraseId?: string;
  target?: string;
  detail: string;
};

export type GavanDay1PackageDraftValidationResult = {
  valid: boolean;
  issues: GavanDay1PackageDraftIssue[];
};

const DAY_ID = 'gavan-week1-day1' as const;

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
}

function day1Blueprint() {
  const day = GAVAN_WEEK1_BLUEPRINT_DRAFT.days.find((candidate) =>
    candidate.dayId === DAY_ID,
  );
  if (!day) {
    throw new Error('Missing Gavan week 1 day 1 blueprint draft.');
  }
  return day;
}

function buildDay1DraftResult(
  weekDraft: GavanWeek1DraftExerciseBlockBuildResult,
): GavanWeek1DraftExerciseBlockBuildResult {
  const blocks = weekDraft.blocksByDayId[DAY_ID] ?? [];
  return {
    ...weekDraft,
    blocks,
    allBlocks: blocks,
    blocksByDayId: {
      [DAY_ID]: blocks,
    },
    excludedPlaceholders: [],
  };
}

function clonePhrase(phrase: PersonalPlanPhraseDraft): PersonalPlanPhraseDraft {
  return {
    ...phrase,
    visibleOptions: [...(phrase.visibleOptions ?? [])],
    explanations: (phrase.explanations ?? []).map((explanation) => ({
      ...explanation,
      covers: [...(explanation.covers ?? [])],
      mentionedOptions: explanation.mentionedOptions
        ? [...explanation.mentionedOptions]
        : undefined,
    })),
    newWords: [...(phrase.newWords ?? [])],
    firstSeenConstructions: [...(phrase.firstSeenConstructions ?? [])],
  };
}

function buildContent(
  candidate?: GavanDay1ContentCandidate,
): GavanDay1PackageDraft['content'] {
  if (!candidate) {
    return {
      source: 'blueprint_draft',
      phrases: day1Blueprint().phrases.map(clonePhrase),
      qualityValid: true,
      qualityIssueCodes: [],
    };
  }

  const validation = validateGavanDay1ContentCandidate(candidate);

  return {
    source: 'candidate',
    phrases: candidate.phrases.map(clonePhrase),
    candidateStatus: candidate.status,
    qualityValid: validation.valid,
    qualityIssueCodes: validation.issues.map((item) => item.code),
  };
}

function buildExplanationRequirements(
  phrases: PersonalPlanPhraseDraft[],
): GavanDay1ExplanationRequirement[] {
  return phrases.flatMap((phrase) => [
    ...(phrase.newWords ?? []).map((word) => ({
      id: `gavan-day1-explanation:${phrase.id}:${slug(word)}`,
      phraseId: phrase.id,
      covers: [word],
      trigger: 'word_note' as const,
      required: true as const,
    })),
    ...(phrase.firstSeenConstructions ?? []).map((construction) => ({
      id: `gavan-day1-explanation:${phrase.id}:${slug(construction)}`,
      phraseId: phrase.id,
      covers: [construction],
      trigger: 'first_seen' as const,
      required: true as const,
    })),
  ]);
}

function emptyWeakSpotInput(): PlanWeakSpotSummaryInput {
  return {
    attempts: [],
    recoveryCandidates: [],
  };
}

export function buildGavanDay1PackageDraft(
  options: GavanDay1PackageDraftOptions = {},
): GavanDay1PackageDraft {
  const weekDraft = buildGavanWeek1DraftExerciseBlocks();
  const dayDraft = buildDay1DraftResult(weekDraft);
  const content = buildContent(options.contentCandidate);
  const readinessInput = buildGavanWeek1DraftPackageReadinessInput(dayDraft);
  const quizDraft = buildGavanDay1QuizDraft({
    contentCandidate: options.contentCandidate,
  });
  const quizValidation = validateGavanDay1QuizDraft(quizDraft, {
    contentPhrases: content.phrases,
    candidateCopyGate: content.source === 'candidate',
  });
  const readinessItems = Object.values(readinessInput.rendererReadinessByBlockId);
  const explanationRequirements = buildExplanationRequirements(content.phrases);
  const weakSpotSummary = buildPlanWeakSpotSummary(
    options.weakSpotSummaryInput ?? emptyWeakSpotInput(),
    { planInstanceId: options.planInstanceId },
  );
  const taskSelection = buildPlanTaskSelectionReasonReadiness({
    blocks: dayDraft.blocks,
    weakSpotSummary,
  });
  const taskReasonCopy = buildPlanTaskReasonCopyBundle(taskSelection);

  return {
    planId: dayDraft.planId,
    weekId: dayDraft.weekId,
    dayId: DAY_ID,
    blocks: dayDraft.blocks,
    content,
    readinessInput,
    quizDraft,
    explanationRequirements,
    personalization: {
      weakSpotSummary,
      taskSelection,
      taskReasonCopy,
    },
    mediaClaims: {
      audioFinalReady: false,
      pronunciationFinalScoringReady: false,
    },
    summary: {
      blocks: dayDraft.blocks.length,
      contentPhrases: content.phrases.length,
      quizRequirements: Object.keys(readinessInput.quizRequirementsByBlockId).length,
      quizItems: quizValidation.summary.items,
      quizExplanationRequirements: quizValidation.summary.explanationRequirements,
      explanationRequirements: explanationRequirements.length,
      readyBlocks: readinessItems.filter((item) => item.status === 'ready').length,
      blockedBlocks: readinessItems.filter((item) => item.status === 'blocked').length,
      weakSpots: weakSpotSummary.weakSpots.length,
      taskSelectionReasons: taskSelection.summary.reasons,
      weakSpotTaskSelectionReasons: taskSelection.summary.weakSpotReasons,
      taskReasonCopies: taskReasonCopy.summary.copies,
    },
  };
}

function issue(
  code: GavanDay1PackageDraftIssueCode,
  detail: string,
  phraseId?: string,
  target?: string,
): GavanDay1PackageDraftIssue {
  return { code, detail, phraseId, target };
}

export function validateGavanDay1PackageDraft(
  draft: GavanDay1PackageDraft,
): GavanDay1PackageDraftValidationResult {
  const issues: GavanDay1PackageDraftIssue[] = [];

  if (draft.dayId !== DAY_ID) {
    issues.push(issue('wrong_day_id', 'Gavan day 1 package draft must describe day 1.'));
  }

  if (draft.blocks.length !== 4) {
    issues.push(issue('wrong_block_count', 'Gavan day 1 package draft must contain four authored blocks.'));
  }

  const readiness = validateGavanWeek1DraftPackageReadiness(draft.readinessInput);
  if (!readiness.valid) {
    issues.push(issue('package_readiness_failed', 'Day 1 package readiness gate must pass.'));
  }

  if (!draft.personalization.taskSelection.valid) {
    issues.push(issue(
      'task_selection_readiness_failed',
      `Day 1 task selection readiness must pass: ${draft.personalization.taskSelection.issues.map((selectionIssue) => selectionIssue.code).join(', ')}.`,
    ));
  }

  if (!draft.personalization.taskReasonCopy.valid) {
    issues.push(issue(
      'task_selection_readiness_failed',
      `Day 1 task reason copy must pass: ${draft.personalization.taskReasonCopy.issues.map((copyIssue) => copyIssue.code).join(', ')}.`,
    ));
  }

  if (!draft.content.qualityValid) {
    issues.push(issue(
      'invalid_content_candidate',
      `Day 1 content candidate failed its gate: ${draft.content.qualityIssueCodes.join(', ')}.`,
    ));
  }

  const quizBlock = draft.blocks.find((block) => block.type === 'plan_quiz');
  const quizValidation = validateGavanDay1QuizDraft(draft.quizDraft, {
    contentPhrases: draft.content.phrases,
    candidateCopyGate: draft.content.source === 'candidate',
  });
  if (
    !quizBlock ||
    draft.readinessInput.quizRequirementsByBlockId[quizBlock.id]?.questionCount !== 10 ||
    draft.readinessInput.quizRequirementsByBlockId[quizBlock.id]?.questionCount !== quizValidation.summary.items
  ) {
    issues.push(issue(
      'day1_quiz_must_have_10_questions',
      'Day 1 quiz block must have exactly 10 draft questions.',
    ));
  }

  if (!quizValidation.valid) {
    issues.push(issue(
      'invalid_day1_quiz_draft',
      `Day 1 quiz draft failed its gate: ${quizValidation.issues.map((quizIssue) => quizIssue.code).join(', ')}.`,
    ));
  }

  const coverageByPhrase = new Map<string, Set<string>>();
  draft.explanationRequirements.forEach((requirement) => {
    const covered = coverageByPhrase.get(requirement.phraseId) ?? new Set<string>();
    requirement.covers.forEach((target) => covered.add(target));
    coverageByPhrase.set(requirement.phraseId, covered);
  });

  draft.content.phrases.forEach((phrase) => {
    const requiredTargets = [
      ...(phrase.newWords ?? []),
      ...(phrase.firstSeenConstructions ?? []),
    ];
    const coveredTargets = coverageByPhrase.get(phrase.id) ?? new Set<string>();
    requiredTargets.forEach((target) => {
      if (!coveredTargets.has(target)) {
        issues.push(issue(
          'missing_explanation_requirement',
          'Every new word and first-seen construction needs an explanation requirement.',
          phrase.id,
          target,
        ));
      }
    });
  });

  if (draft.mediaClaims.audioFinalReady) {
    issues.push(issue(
      'fake_final_audio_claim',
      'Day 1 package draft cannot claim final generated audio yet.',
    ));
  }

  if (draft.mediaClaims.pronunciationFinalScoringReady) {
    issues.push(issue(
      'fake_final_pronunciation_claim',
      'Day 1 package draft cannot claim final pronunciation scoring yet.',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export const GAVAN_DAY1_PACKAGE_DRAFT = buildGavanDay1PackageDraft();
