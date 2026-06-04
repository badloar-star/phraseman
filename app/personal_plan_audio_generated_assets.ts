import type { PlanAudioAsset } from './personal_plan_audio_asset_readiness';
import type { PlanAudioGenerationJob } from './personal_plan_audio_generation_jobs';

export type GeneratedPlanAudioFile = {
  uri: string;
  durationMs: number;
  bytes?: number;
};

export type GeneratedPlanAudioAssetBlockerReason =
  | 'missing_generated_file'
  | 'invalid_generated_file';

export type GeneratedPlanAudioAssetBlocker = {
  jobId: string;
  outputPath: string;
  reason: GeneratedPlanAudioAssetBlockerReason;
};

export type BuildGeneratedPlanAudioAssetsInput = {
  jobs: PlanAudioGenerationJob[];
  generatedFilesByOutputPath: Record<string, GeneratedPlanAudioFile | undefined>;
};

export type GeneratedPlanAudioAssetsResult = {
  assets: PlanAudioAsset[];
  blockers: GeneratedPlanAudioAssetBlocker[];
  summary: {
    jobs: number;
    assets: number;
    blockers: number;
  };
};

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validGeneratedFile(file: GeneratedPlanAudioFile | undefined): file is GeneratedPlanAudioFile {
  return Boolean(
    file
    && hasText(file.uri)
    && Number.isFinite(file.durationMs)
    && file.durationMs > 0
    && (file.bytes == null || file.bytes > 0),
  );
}

function blocker(
  job: PlanAudioGenerationJob,
  reason: GeneratedPlanAudioAssetBlockerReason,
): GeneratedPlanAudioAssetBlocker {
  return {
    jobId: job.id,
    outputPath: job.outputPath,
    reason,
  };
}

function assetForJob(job: PlanAudioGenerationJob, file: GeneratedPlanAudioFile): PlanAudioAsset {
  return {
    id: job.expectedAssetId,
    blockId: job.blockId,
    contentUnitIds: job.contentUnitIds,
    targetText: job.targetText,
    locale: 'en',
    status: 'generated',
    assetId: job.expectedAssetId,
    uri: file.uri.trim(),
    durationMs: file.durationMs,
    voiceId: job.voiceId,
    provider: job.provider,
    finalAssetReady: false,
  };
}

export function buildGeneratedPlanAudioAssets(
  input: BuildGeneratedPlanAudioAssetsInput,
): GeneratedPlanAudioAssetsResult {
  const assets: PlanAudioAsset[] = [];
  const blockers: GeneratedPlanAudioAssetBlocker[] = [];

  for (const job of input.jobs) {
    const file = input.generatedFilesByOutputPath[job.outputPath];
    if (!file) {
      blockers.push(blocker(job, 'missing_generated_file'));
      continue;
    }

    if (!validGeneratedFile(file)) {
      blockers.push(blocker(job, 'invalid_generated_file'));
      continue;
    }

    assets.push(assetForJob(job, file));
  }

  return {
    assets,
    blockers,
    summary: {
      jobs: input.jobs.length,
      assets: assets.length,
      blockers: blockers.length,
    },
  };
}
