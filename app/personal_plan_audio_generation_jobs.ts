import type {
  PlanAudioRequirementManifest,
  PlanAudioRequirementManifestItem,
  PlanListeningExerciseType,
} from './personal_plan_audio_requirement_manifest';
import type {
  PlanAudioAssetIssueCode,
  PlanAudioAssetProvider,
} from './personal_plan_audio_asset_readiness';

export type PlanAudioGenerationJobStatus = 'ready_to_generate';

export type PlanAudioGenerationJob = {
  id: string;
  planId: string;
  weekId: string;
  blockId: string;
  exerciseType: PlanListeningExerciseType;
  contentUnitId?: string;
  contentUnitIds: string[];
  targetText: string;
  sourceBlockTargetText: string;
  provider: PlanAudioAssetProvider;
  voiceId: string;
  outputPath: string;
  expectedAssetId: string;
  splitPolicy: 'per_content_unit' | 'whole_block';
  status: PlanAudioGenerationJobStatus;
};

export type PlanAudioGenerationBlockerReason =
  | 'requirement_not_valid_for_authoring'
  | 'missing_target_text'
  | 'missing_content_units'
  | 'missing_voice_id'
  | 'missing_output_root';

export type PlanAudioGenerationBlocker = {
  blockId?: string;
  reason: PlanAudioGenerationBlockerReason;
  issueCodes: PlanAudioAssetIssueCode[];
};

export type BuildPlanAudioGenerationJobsInput = {
  manifest: PlanAudioRequirementManifest;
  planId: string;
  weekId: string;
  provider: PlanAudioAssetProvider;
  voiceId: string;
  outputRoot: string;
};

export type PlanAudioGenerationJobsResult = {
  jobs: PlanAudioGenerationJob[];
  blockers: PlanAudioGenerationBlocker[];
  summary: {
    totalManifestItems: number;
    jobs: number;
    skippedProductionReady: number;
    blockers: number;
  };
};

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanPathPart(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/\/+$/g, '');
}

function shouldGenerate(item: PlanAudioRequirementManifestItem): boolean {
  return (
    !item.productionReady
    && item.validForAuthoring
    && item.assetStatus !== 'missing'
    && item.assetStatus !== 'failed'
  );
}

function blocker(
  reason: PlanAudioGenerationBlockerReason,
  item?: PlanAudioRequirementManifestItem,
): PlanAudioGenerationBlocker {
  return {
    blockId: item?.blockId,
    reason,
    issueCodes: item?.issueCodes ?? [],
  };
}

function blockersForInput(input: BuildPlanAudioGenerationJobsInput): PlanAudioGenerationBlocker[] {
  const blockers: PlanAudioGenerationBlocker[] = [];
  if (!hasText(input.voiceId)) blockers.push(blocker('missing_voice_id'));
  if (!hasText(input.outputRoot)) blockers.push(blocker('missing_output_root'));
  return blockers;
}

function blockersForItem(item: PlanAudioRequirementManifestItem): PlanAudioGenerationBlocker[] {
  const blockers: PlanAudioGenerationBlocker[] = [];
  if (!item.validForAuthoring) blockers.push(blocker('requirement_not_valid_for_authoring', item));
  if (!hasText(item.targetText)) blockers.push(blocker('missing_target_text', item));
  if (item.contentUnitIds.length === 0) blockers.push(blocker('missing_content_units', item));
  return blockers;
}

function buildJob(
  input: BuildPlanAudioGenerationJobsInput,
  item: PlanAudioRequirementManifestItem,
  contentUnitId: string | undefined,
  targetText: string,
): PlanAudioGenerationJob {
  const blockSlug = slug(item.blockId);
  const unitSlug = contentUnitId ? slug(contentUnitId) : '';
  const planId = input.planId.trim();
  const weekId = input.weekId.trim();
  const outputRoot = cleanPathPart(input.outputRoot);
  const jobKey = contentUnitId ? `${blockSlug}:${unitSlug}` : blockSlug;
  const outputPath = contentUnitId
    ? `${outputRoot}/${planId}/${weekId}/${blockSlug}/${unitSlug}.mp3`
    : `${outputRoot}/${planId}/${weekId}/${blockSlug}.mp3`;

  return {
    id: `audio-job:${planId}:${weekId}:${jobKey}`,
    planId,
    weekId,
    blockId: item.blockId,
    exerciseType: item.exerciseType,
    contentUnitId,
    contentUnitIds: contentUnitId ? [contentUnitId] : item.contentUnitIds,
    targetText,
    sourceBlockTargetText: item.targetText,
    provider: input.provider,
    voiceId: input.voiceId.trim(),
    outputPath,
    expectedAssetId: `audio:${planId}:${weekId}:${jobKey}`,
    splitPolicy: contentUnitId ? 'per_content_unit' : 'whole_block',
    status: 'ready_to_generate',
  };
}

function jobsForItem(
  input: BuildPlanAudioGenerationJobsInput,
  item: PlanAudioRequirementManifestItem,
): PlanAudioGenerationJob[] {
  const targetTextsByContentUnitId = item.targetTextsByContentUnitId ?? {};
  const perUnitJobs = item.contentUnitIds
    .map((contentUnitId) => {
      const targetText = targetTextsByContentUnitId[contentUnitId]?.trim();
      return targetText
        ? buildJob(input, item, contentUnitId, targetText)
        : null;
    })
    .filter((job): job is PlanAudioGenerationJob => Boolean(job));

  return perUnitJobs.length > 0
    ? perUnitJobs
    : [buildJob(input, item, undefined, item.targetText)];
}

export function buildPlanAudioGenerationJobs(
  input: BuildPlanAudioGenerationJobsInput,
): PlanAudioGenerationJobsResult {
  const globalBlockers = blockersForInput(input);
  const jobs: PlanAudioGenerationJob[] = [];
  const blockers: PlanAudioGenerationBlocker[] = [...globalBlockers];
  let skippedProductionReady = 0;

  for (const item of input.manifest.items) {
    if (item.productionReady) {
      skippedProductionReady += 1;
      continue;
    }

    const itemBlockers = blockersForItem(item);
    if (itemBlockers.length > 0) {
      blockers.push(...itemBlockers);
      continue;
    }

    if (globalBlockers.length > 0) continue;
    if (shouldGenerate(item)) {
      jobs.push(...jobsForItem(input, item));
    }
  }

  return {
    jobs,
    blockers,
    summary: {
      totalManifestItems: input.manifest.items.length,
      jobs: jobs.length,
      skippedProductionReady,
      blockers: blockers.length,
    },
  };
}
