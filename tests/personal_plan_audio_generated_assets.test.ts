import type { PlanAudioGenerationJob } from '../app/personal_plan_audio_generation_jobs';
import {
  buildGeneratedPlanAudioAssets,
} from '../app/personal_plan_audio_generated_assets';

const job: PlanAudioGenerationJob = {
  id: 'audio-job:gavan:week1:block-1:unit-1',
  planId: 'gavan',
  weekId: 'week1',
  blockId: 'gavan-week1-day2:block-2',
  exerciseType: 'plan_listen_choose',
  contentUnitId: 'gavan-w1-d2-p1',
  contentUnitIds: ['gavan-w1-d2-p1'],
  targetText: 'Could you repeat that?',
  sourceBlockTargetText: 'Could you repeat that? / Could you say that again?',
  provider: 'openai',
  voiceId: 'openai:alloy',
  outputPath: 'assets/audio/personal-plans/gavan/week1/block-1/unit-1.mp3',
  expectedAssetId: 'audio:gavan:week1:block-1:unit-1',
  splitPolicy: 'per_content_unit',
  status: 'ready_to_generate',
};

describe('personal plan generated audio assets', () => {
  it('converts completed generation jobs into generated non-final assets', () => {
    const result = buildGeneratedPlanAudioAssets({
      jobs: [job],
      generatedFilesByOutputPath: {
        [job.outputPath]: {
          uri: job.outputPath,
          durationMs: 1420,
          bytes: 22144,
        },
      },
    });

    expect(result.assets).toEqual([
      {
        id: job.expectedAssetId,
        blockId: job.blockId,
        contentUnitIds: ['gavan-w1-d2-p1'],
        targetText: 'Could you repeat that?',
        locale: 'en',
        status: 'generated',
        assetId: job.expectedAssetId,
        uri: job.outputPath,
        durationMs: 1420,
        voiceId: 'openai:alloy',
        provider: 'openai',
        finalAssetReady: false,
      },
    ]);
    expect(result.summary).toEqual({
      jobs: 1,
      assets: 1,
      blockers: 0,
    });
  });

  it('keeps missing or invalid generated files as blockers instead of fake assets', () => {
    const result = buildGeneratedPlanAudioAssets({
      jobs: [job, { ...job, id: 'audio-job:bad', outputPath: 'bad.mp3' }],
      generatedFilesByOutputPath: {
        [job.outputPath]: {
          uri: '',
          durationMs: 0,
          bytes: 0,
        },
      },
    });

    expect(result.assets).toEqual([]);
    expect(result.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        jobId: job.id,
        outputPath: job.outputPath,
        reason: 'invalid_generated_file',
      }),
      expect.objectContaining({
        jobId: 'audio-job:bad',
        outputPath: 'bad.mp3',
        reason: 'missing_generated_file',
      }),
    ]));
    expect(result.summary).toEqual({
      jobs: 2,
      assets: 0,
      blockers: 2,
    });
  });
});
