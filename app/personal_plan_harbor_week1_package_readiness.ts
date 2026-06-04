import type { PlanExerciseBlock } from './personal_plan_engine_contracts';
import {
  buildPlaceholderPlanAudioAsset,
  validatePlanAudioAsset,
  type PlanAudioAsset,
} from './personal_plan_audio_asset_readiness';
import {
  buildBlockedPlanPronunciationScoringRequirement,
  validatePlanPronunciationScoringRequirement,
  type PlanPronunciationScoringRequirement,
} from './personal_plan_pronunciation_readiness';
import { planExerciseRendererContractForType } from './personal_plan_exercise_renderer_contracts';
import { HARBOR_WEEK1_BLUEPRINT_DRAFT } from './personal_plan_harbor_week1_blueprint_draft';
import { buildPlanAudioRequirementManifest } from './personal_plan_audio_requirement_manifest';
import type {
  GavanWeek1DraftExerciseBlockBuildResult,
  GavanWeek1ExcludedPlaceholder,
} from './personal_plan_harbor_week1_draft_blocks';

export type GavanWeek1RendererReadiness = {
  status: 'ready' | 'blocked';
  reason?: string;
};

export type GavanWeek1QuizRequirement = {
  questionCount: number;
  status: 'draft' | 'ready';
};

export type GavanWeek1AudioRequirement = PlanAudioAsset;

export type GavanWeek1PronunciationRequirement = PlanPronunciationScoringRequirement;

export type GavanWeek1DraftPackageReadinessInput = {
  draft: GavanWeek1DraftExerciseBlockBuildResult;
  rendererReadinessByBlockId: Record<string, GavanWeek1RendererReadiness>;
  quizRequirementsByBlockId: Record<string, GavanWeek1QuizRequirement>;
  audioRequirementsByBlockId: Record<string, GavanWeek1AudioRequirement>;
  pronunciationRequirementsByExerciseId: Record<string, GavanWeek1PronunciationRequirement>;
};

export type GavanWeek1DraftPackageReadinessIssueCode =
  | 'draft_blocks_invalid'
  | 'empty_generated_day'
  | 'missing_renderer_readiness'
  | 'blocked_renderer_without_reason'
  | 'missing_quiz_requirement'
  | 'quiz_must_have_10_questions'
  | 'missing_audio_requirement'
  | 'invalid_audio_requirement'
  | 'fake_final_audio_claim'
  | 'missing_pronunciation_requirement'
  | 'invalid_pronunciation_requirement'
  | 'fake_final_pronunciation_claim';

export type GavanWeek1DraftPackageReadinessIssue = {
  code: GavanWeek1DraftPackageReadinessIssueCode;
  dayId?: string;
  blockId?: string;
  exerciseId?: string;
  detail: string;
};

export type GavanWeek1DraftPackageReadinessResult = {
  valid: boolean;
  issues: GavanWeek1DraftPackageReadinessIssue[];
  summary: {
    days: number;
    blocks: number;
    quizRequirements: number;
    audioRequirements: number;
    audioProductionReady: number;
    audioProductionBlocked: number;
    blockedPronunciationRequirements: number;
    rendererReadinessItems: number;
  };
};

function issue(
  code: GavanWeek1DraftPackageReadinessIssueCode,
  detail: string,
  block?: PlanExerciseBlock,
  placeholder?: GavanWeek1ExcludedPlaceholder,
): GavanWeek1DraftPackageReadinessIssue {
  return {
    code,
    detail,
    dayId: placeholder?.dayId,
    blockId: block?.id,
    exerciseId: placeholder?.exerciseId,
  };
}

function isListeningBlock(block: PlanExerciseBlock): boolean {
  return block.type === 'plan_listen_choose' || block.type === 'plan_listen_build';
}

function targetTextForBlock(block: PlanExerciseBlock): string {
  const phraseById = new Map(
    HARBOR_WEEK1_BLUEPRINT_DRAFT.days.flatMap((day) =>
      day.phrases.map((phrase) => [phrase.id, phrase.english] as const),
    ),
  );

  return block.contentUnitIds
    .map((contentUnitId) => phraseById.get(contentUnitId))
    .filter((text): text is string => Boolean(text))
    .join(' / ');
}

export function buildGavanWeek1DraftPackageReadinessInput(
  draft: GavanWeek1DraftExerciseBlockBuildResult,
): GavanWeek1DraftPackageReadinessInput {
  const rendererReadinessByBlockId: Record<string, GavanWeek1RendererReadiness> = {};
  const quizRequirementsByBlockId: Record<string, GavanWeek1QuizRequirement> = {};
  const audioRequirementsByBlockId: Record<string, GavanWeek1AudioRequirement> = {};
  const pronunciationRequirementsByExerciseId: Record<string, GavanWeek1PronunciationRequirement> = {};

  draft.blocks.forEach((block) => {
    const rendererContract = planExerciseRendererContractForType(block.type);
    rendererReadinessByBlockId[block.id] = rendererContract
      ? { status: 'ready' }
      : { status: 'blocked', reason: 'renderer_not_implemented_yet' };

    if (block.type === 'plan_quiz') {
      quizRequirementsByBlockId[block.id] = {
        questionCount: 10,
        status: 'draft',
      };
    }

    if (isListeningBlock(block)) {
      audioRequirementsByBlockId[block.id] = buildPlaceholderPlanAudioAsset({
        blockId: block.id,
        contentUnitIds: block.contentUnitIds,
        targetText: targetTextForBlock(block),
      });
    }
  });

  draft.excludedPlaceholders.forEach((placeholder) => {
    pronunciationRequirementsByExerciseId[placeholder.exerciseId] =
      buildBlockedPlanPronunciationScoringRequirement({
        exerciseId: placeholder.exerciseId,
        blockId: placeholder.exerciseId,
        contentUnitIds: [placeholder.exerciseId],
        targetText: placeholder.reason,
      });
  });

  return {
    draft,
    rendererReadinessByBlockId,
    quizRequirementsByBlockId,
    audioRequirementsByBlockId,
    pronunciationRequirementsByExerciseId,
  };
}

export function validateGavanWeek1DraftPackageReadiness(
  input: GavanWeek1DraftPackageReadinessInput,
): GavanWeek1DraftPackageReadinessResult {
  const issues: GavanWeek1DraftPackageReadinessIssue[] = [];

  input.draft.issues.forEach((draftIssue) => {
    issues.push({
      code: 'draft_blocks_invalid',
      dayId: draftIssue.dayId,
      exerciseId: draftIssue.exerciseId,
      detail: draftIssue.detail,
    });
  });

  Object.entries(input.draft.blocksByDayId).forEach(([dayId, blocks]) => {
    if (blocks.length === 0) {
      issues.push({
        code: 'empty_generated_day',
        dayId,
        detail: 'Every generated day must expose at least one draft block.',
      });
    }
  });

  input.draft.blocks.forEach((block) => {
    const rendererReadiness = input.rendererReadinessByBlockId[block.id];
    if (!rendererReadiness) {
      issues.push(issue(
        'missing_renderer_readiness',
        'Every draft block must declare renderer readiness before catalog integration.',
        block,
      ));
    } else if (rendererReadiness.status === 'blocked' && !rendererReadiness.reason?.trim()) {
      issues.push(issue(
        'blocked_renderer_without_reason',
        'Blocked renderer readiness must explain why the block is blocked.',
        block,
      ));
    }

    if (block.type === 'plan_quiz') {
      const quizRequirement = input.quizRequirementsByBlockId[block.id];
      if (!quizRequirement) {
        issues.push(issue(
          'missing_quiz_requirement',
          'Every plan quiz block must declare a draft quiz requirement.',
          block,
        ));
      } else if (quizRequirement.questionCount !== 10) {
        issues.push(issue(
          'quiz_must_have_10_questions',
          'Plan day quiz requirements must contain exactly 10 questions.',
          block,
        ));
      }
    }

    if (isListeningBlock(block)) {
      const audioRequirement = input.audioRequirementsByBlockId[block.id];
      if (!audioRequirement) {
        issues.push(issue(
          'missing_audio_requirement',
          'Every listening block must declare an audio asset requirement.',
          block,
        ));
      } else {
        const audioReadiness = validatePlanAudioAsset(audioRequirement);
        if (!audioReadiness.validForAuthoring) {
          issues.push(issue(
            'invalid_audio_requirement',
            `Listening block audio requirement is invalid: ${audioReadiness.issues.map((audioIssue) => audioIssue.code).join(', ')}.`,
            block,
          ));
        }

        if (audioReadiness.issues.some((audioIssue) => audioIssue.code === 'fake_final_audio_claim')) {
          issues.push(issue(
            'fake_final_audio_claim',
            'Week 1 draft may require placeholder audio, but cannot claim final audio on an unapproved asset.',
            block,
          ));
        }
      }
    }
  });

  input.draft.excludedPlaceholders.forEach((placeholder) => {
    const pronunciationRequirement =
      input.pronunciationRequirementsByExerciseId[placeholder.exerciseId];

    if (!pronunciationRequirement) {
      issues.push(issue(
        'missing_pronunciation_requirement',
        'Excluded pronunciation placeholders must remain visible as blocked future work.',
        undefined,
        placeholder,
      ));
    } else {
      const pronunciationReadiness =
        validatePlanPronunciationScoringRequirement(pronunciationRequirement);

      if (!pronunciationReadiness.validForAuthoring) {
        issues.push(issue(
          'invalid_pronunciation_requirement',
          `Pronunciation requirement is invalid: ${pronunciationReadiness.issues.map((pronunciationIssue) => pronunciationIssue.code).join(', ')}.`,
          undefined,
          placeholder,
        ));
      }

      if (
        pronunciationReadiness.issues.some((pronunciationIssue) =>
          pronunciationIssue.code === 'fake_final_pronunciation_claim',
        )
      ) {
        issues.push(issue(
          'fake_final_pronunciation_claim',
          'Pronunciation cannot claim final scoring on a blocked requirement.',
          undefined,
          placeholder,
        ));
      }
    }
  });

  const blockedPronunciationRequirements = Object.values(
    input.pronunciationRequirementsByExerciseId,
  ).filter((requirement) => requirement.status === 'blocked_until_scoring').length;
  const audioManifest = buildPlanAudioRequirementManifest({
    blocks: input.draft.blocks,
    audioRequirementsByBlockId: input.audioRequirementsByBlockId,
  });

  return {
    valid: issues.length === 0,
    issues,
    summary: {
      days: Object.keys(input.draft.blocksByDayId).length,
      blocks: input.draft.blocks.length,
      quizRequirements: Object.keys(input.quizRequirementsByBlockId).length,
      audioRequirements: Object.keys(input.audioRequirementsByBlockId).length,
      audioProductionReady: audioManifest.summary.productionReady,
      audioProductionBlocked: audioManifest.summary.productionBlocked,
      blockedPronunciationRequirements,
      rendererReadinessItems: Object.keys(input.rendererReadinessByBlockId).length,
    },
  };
}
