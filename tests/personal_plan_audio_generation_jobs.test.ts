import type { PlanAudioRequirementManifest } from '../app/personal_plan_audio_requirement_manifest';
import {
  buildPlanAudioGenerationJobs,
} from '../app/personal_plan_audio_generation_jobs';

const manifest: PlanAudioRequirementManifest = {
  productionReady: false,
  items: [
    {
      blockId: 'gavan-week1-day2:listen-choose',
      exerciseType: 'plan_listen_choose',
      contentUnitIds: ['gavan-w1-d2-p1', 'gavan-w1-d2-p2'],
      targetText: 'Could you repeat that? / Could you say that again?',
      targetTextsByContentUnitId: {
        'gavan-w1-d2-p1': 'Could you repeat that?',
        'gavan-w1-d2-p2': 'Could you say that again?',
      },
      assetStatus: 'placeholder',
      validForAuthoring: true,
      productionReady: false,
      issueCodes: [],
    },
    {
      blockId: 'gavan-week1-day3:listen-build',
      exerciseType: 'plan_listen_build',
      contentUnitIds: ['gavan-w1-d3-p1'],
      targetText: "I don't understand.",
      assetStatus: 'missing',
      validForAuthoring: false,
      productionReady: false,
      issueCodes: ['missing_audio_asset'],
    },
    {
      blockId: 'gavan-week1-day7:listen-choose',
      exerciseType: 'plan_listen_choose',
      contentUnitIds: ['gavan-w1-d7-p1'],
      targetText: 'Let me check.',
      assetStatus: 'approved',
      validForAuthoring: true,
      productionReady: true,
      issueCodes: [],
      assetId: 'asset-ready',
      uri: 'https://cdn.example.test/ready.mp3',
    },
  ],
  summary: {
    totalListeningBlocks: 3,
    approved: 1,
    placeholder: 1,
    generated: 0,
    missing: 1,
    invalid: 1,
    productionReady: 1,
    productionBlocked: 2,
  },
};

describe('personal plan audio generation jobs', () => {
  it('creates deterministic jobs only for valid non-production audio requirements', () => {
    const result = buildPlanAudioGenerationJobs({
      manifest,
      planId: 'gavan',
      weekId: 'week1',
      provider: 'openai',
      voiceId: 'openai:alloy',
      outputRoot: 'assets/audio/personal-plans',
    });

    expect(result.jobs).toEqual([
      {
        id: 'audio-job:gavan:week1:gavan-week1-day2-listen-choose:gavan-w1-d2-p1',
        planId: 'gavan',
        weekId: 'week1',
        blockId: 'gavan-week1-day2:listen-choose',
        exerciseType: 'plan_listen_choose',
        contentUnitId: 'gavan-w1-d2-p1',
        contentUnitIds: ['gavan-w1-d2-p1'],
        targetText: 'Could you repeat that?',
        provider: 'openai',
        voiceId: 'openai:alloy',
        outputPath: 'assets/audio/personal-plans/gavan/week1/gavan-week1-day2-listen-choose/gavan-w1-d2-p1.mp3',
        expectedAssetId: 'audio:gavan:week1:gavan-week1-day2-listen-choose:gavan-w1-d2-p1',
        sourceBlockTargetText: 'Could you repeat that? / Could you say that again?',
        splitPolicy: 'per_content_unit',
        status: 'ready_to_generate',
      },
      {
        id: 'audio-job:gavan:week1:gavan-week1-day2-listen-choose:gavan-w1-d2-p2',
        planId: 'gavan',
        weekId: 'week1',
        blockId: 'gavan-week1-day2:listen-choose',
        exerciseType: 'plan_listen_choose',
        contentUnitId: 'gavan-w1-d2-p2',
        contentUnitIds: ['gavan-w1-d2-p2'],
        targetText: 'Could you say that again?',
        provider: 'openai',
        voiceId: 'openai:alloy',
        outputPath: 'assets/audio/personal-plans/gavan/week1/gavan-week1-day2-listen-choose/gavan-w1-d2-p2.mp3',
        expectedAssetId: 'audio:gavan:week1:gavan-week1-day2-listen-choose:gavan-w1-d2-p2',
        sourceBlockTargetText: 'Could you repeat that? / Could you say that again?',
        splitPolicy: 'per_content_unit',
        status: 'ready_to_generate',
      },
    ]);
    expect(result.blockers).toEqual([
      expect.objectContaining({
        blockId: 'gavan-week1-day3:listen-build',
        reason: 'requirement_not_valid_for_authoring',
        issueCodes: ['missing_audio_asset'],
      }),
    ]);
    expect(result.summary).toEqual({
      totalManifestItems: 3,
      jobs: 2,
      skippedProductionReady: 1,
      blockers: 1,
    });
  });

  it('blocks generation when provider voice or output root is missing', () => {
    const result = buildPlanAudioGenerationJobs({
      manifest,
      planId: 'gavan',
      weekId: 'week1',
      provider: 'openai',
      voiceId: '',
      outputRoot: '',
    });

    expect(result.jobs).toEqual([]);
    expect(result.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ reason: 'missing_voice_id' }),
      expect.objectContaining({ reason: 'missing_output_root' }),
    ]));
  });
});
