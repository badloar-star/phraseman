import {
  buildGavanWeek1AudioGenerationPlan,
  buildGavanWeek1CanonicalAudioGenerationPlan,
} from '../app/personal_plan_gavan_week1_audio_generation_plan';

describe('Gavan week 1 audio generation plan', () => {
  it('builds a dry-run generation queue from current week readiness without claiming production audio', () => {
    const plan = buildGavanWeek1AudioGenerationPlan({
      voiceId: 'openai:alloy',
      outputRoot: 'assets/audio/personal-plans',
    });

    expect(plan.planId).toBe('gavan');
    expect(plan.weekId).toBe('week1');
    expect(plan.readiness.valid).toBe(true);
    expect(plan.audioManifest.summary).toEqual(expect.objectContaining({
      totalListeningBlocks: 5,
      productionReady: 0,
      productionBlocked: 5,
    }));
    expect(plan.generation.summary).toEqual({
      totalManifestItems: 5,
      jobs: 10,
      skippedProductionReady: 0,
      blockers: 0,
    });
    expect(plan.generation.jobs[0]).toEqual(expect.objectContaining({
      planId: 'gavan',
      weekId: 'week1',
      provider: 'openai',
      voiceId: 'openai:alloy',
      status: 'ready_to_generate',
    }));
    expect(plan.generation.jobs.every((job) => job.outputPath.endsWith('.mp3'))).toBe(true);
    expect(plan.generation.jobs.every((job) => job.contentUnitIds.length === 1)).toBe(true);
    expect(new Set(plan.generation.jobs.map((job) => job.expectedAssetId)).size).toBe(10);
  });

  it('reports generation blockers when the voice policy is incomplete', () => {
    const plan = buildGavanWeek1AudioGenerationPlan({
      voiceId: '',
      outputRoot: 'assets/audio/personal-plans',
    });

    expect(plan.generation.jobs).toEqual([]);
    expect(plan.generation.blockers).toContainEqual(expect.objectContaining({
      reason: 'missing_voice_id',
    }));
  });

  it('builds canonical runtime listening jobs from Gavan media renderer blocks', () => {
    const plan = buildGavanWeek1CanonicalAudioGenerationPlan({
      voiceId: 'openai:alloy',
      outputRoot: 'assets/audio/personal-plans',
    });

    expect(plan.planId).toBe('gavan');
    expect(plan.weekId).toBe('week1');
    expect(plan.audioManifest.summary).toEqual(expect.objectContaining({
      totalListeningBlocks: 2,
      placeholder: 2,
      productionReady: 0,
      productionBlocked: 2,
    }));
    expect(plan.generation.summary).toEqual({
      totalManifestItems: 2,
      jobs: 8,
      skippedProductionReady: 0,
      blockers: 0,
    });
    expect(plan.generation.jobs[0]).toEqual(expect.objectContaining({
      blockId: 'gavan-week1-day2:block-2',
      contentUnitId: 'gavan-week1-day2:phrase-1',
      targetText: 'Could you say that again?',
      outputPath: 'assets/audio/personal-plans/gavan/week1/gavan-week1-day2-block-2/gavan-week1-day2-phrase-1.mp3',
      expectedAssetId: 'audio:gavan:week1:gavan-week1-day2-block-2:gavan-week1-day2-phrase-1',
      splitPolicy: 'per_content_unit',
      status: 'ready_to_generate',
    }));
    expect(plan.generation.jobs.every((job) => job.exerciseType === 'plan_listen_choose')).toBe(true);
    expect(plan.generation.jobs.every((job) => job.contentUnitIds.length === 1)).toBe(true);
    expect(new Set(plan.generation.jobs.map((job) => job.expectedAssetId)).size).toBe(8);
  });
});
