import {
  buildGavanWeek1DraftExerciseBlocks,
} from './personal_plan_harbor_week1_draft_blocks';
import {
  buildGavanWeek1DraftPackageReadinessInput,
  validateGavanWeek1DraftPackageReadiness,
  type GavanWeek1DraftPackageReadinessResult,
} from './personal_plan_harbor_week1_package_readiness';
import {
  buildPlanAudioRequirementManifest,
  type PlanAudioRequirementManifest,
} from './personal_plan_audio_requirement_manifest';
import { HARBOR_WEEK1_BLUEPRINT_DRAFT } from './personal_plan_harbor_week1_blueprint_draft';
import {
  buildPlanAudioGenerationJobs,
  type PlanAudioGenerationJobsResult,
} from './personal_plan_audio_generation_jobs';
import {
  buildPlaceholderPlanAudioAsset,
  type PlanAudioAsset,
  type PlanAudioAssetProvider,
} from './personal_plan_audio_asset_readiness';
import {
  buildGavanWeek1CanonicalRuntimeBridge,
  type GavanWeek1RuntimeBridgeDayIndex,
} from './personal_plan_gavan_week1_runtime_bridge';
import {
  buildGavanWeek1CanonicalPlan,
} from './personal_plan_gavan_week1_canonical_plan';
import type { PlanExerciseBlock } from './personal_plan_engine_contracts';

export type BuildGavanWeek1AudioGenerationPlanInput = {
  provider?: PlanAudioAssetProvider;
  voiceId: string;
  outputRoot: string;
};

export type GavanWeek1AudioGenerationPlan = {
  planId: 'gavan';
  weekId: 'week1';
  readiness: GavanWeek1DraftPackageReadinessResult;
  audioManifest: PlanAudioRequirementManifest;
  generation: PlanAudioGenerationJobsResult;
};

export type GavanWeek1CanonicalAudioGenerationPlan = {
  planId: 'gavan';
  weekId: 'week1';
  mediaRendererBlocks: PlanExerciseBlock[];
  audioManifest: PlanAudioRequirementManifest;
  generation: PlanAudioGenerationJobsResult;
};

function buildTargetTextsByContentUnitId(): Record<string, string> {
  return Object.fromEntries(
    HARBOR_WEEK1_BLUEPRINT_DRAFT.days.flatMap((day) =>
      day.phrases.map((phrase) => [phrase.id, phrase.english] as const),
    ),
  );
}

function buildCanonicalTargetTextsByContentUnitId(): Record<string, string> {
  return Object.fromEntries(
    buildGavanWeek1CanonicalPlan().days.flatMap((day) =>
      day.phrases.map((phrase) => [phrase.id, phrase.english] as const),
    ),
  );
}

function canonicalMediaBlocks(): PlanExerciseBlock[] {
  return ([1, 2, 3, 4, 5, 6, 7] as GavanWeek1RuntimeBridgeDayIndex[])
    .flatMap((dayIndex) => buildGavanWeek1CanonicalRuntimeBridge({ dayIndex }).mediaRendererBlocks)
    .filter((block) => block.type === 'plan_listen_choose' || block.type === 'plan_listen_build');
}

function placeholderAudioRequirementsForBlocks(
  blocks: PlanExerciseBlock[],
  targetTextsByContentUnitId: Record<string, string>,
): Record<string, PlanAudioAsset | undefined> {
  return Object.fromEntries(
    blocks.map((block) => {
      const targetText = block.contentUnitIds
        .map((contentUnitId) => targetTextsByContentUnitId[contentUnitId])
        .filter((value): value is string => Boolean(value?.trim()))
        .join(' / ');

      return [
        block.id,
        buildPlaceholderPlanAudioAsset({
          blockId: block.id,
          contentUnitIds: block.contentUnitIds,
          targetText,
        }),
      ] as const;
    }),
  );
}

export function buildGavanWeek1AudioGenerationPlan(
  input: BuildGavanWeek1AudioGenerationPlanInput,
): GavanWeek1AudioGenerationPlan {
  const draft = buildGavanWeek1DraftExerciseBlocks();
  const readinessInput = buildGavanWeek1DraftPackageReadinessInput(draft);
  const readiness = validateGavanWeek1DraftPackageReadiness(readinessInput);
  const audioManifest = buildPlanAudioRequirementManifest({
    blocks: draft.blocks,
    audioRequirementsByBlockId: readinessInput.audioRequirementsByBlockId,
    targetTextsByContentUnitId: buildTargetTextsByContentUnitId(),
  });
  const generation = buildPlanAudioGenerationJobs({
    manifest: audioManifest,
    planId: 'gavan',
    weekId: 'week1',
    provider: input.provider ?? 'openai',
    voiceId: input.voiceId,
    outputRoot: input.outputRoot,
  });

  return {
    planId: 'gavan',
    weekId: 'week1',
    readiness,
    audioManifest,
    generation,
  };
}

export function buildGavanWeek1CanonicalAudioGenerationPlan(
  input: BuildGavanWeek1AudioGenerationPlanInput,
): GavanWeek1CanonicalAudioGenerationPlan {
  const mediaRendererBlocks = canonicalMediaBlocks();
  const targetTextsByContentUnitId = buildCanonicalTargetTextsByContentUnitId();
  const audioRequirementsByBlockId = placeholderAudioRequirementsForBlocks(
    mediaRendererBlocks,
    targetTextsByContentUnitId,
  );
  const audioManifest = buildPlanAudioRequirementManifest({
    blocks: mediaRendererBlocks,
    audioRequirementsByBlockId,
    targetTextsByContentUnitId,
  });
  const generation = buildPlanAudioGenerationJobs({
    manifest: audioManifest,
    planId: 'gavan',
    weekId: 'week1',
    provider: input.provider ?? 'openai',
    voiceId: input.voiceId,
    outputRoot: input.outputRoot,
  });

  return {
    planId: 'gavan',
    weekId: 'week1',
    mediaRendererBlocks,
    audioManifest,
    generation,
  };
}
