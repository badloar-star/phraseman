import {
  buildPersonalPlanRuntimeAudioGenerationPlan,
} from '../app/personal_plan_runtime_audio_generation_plan';

describe('personal plan runtime audio generation plan', () => {
  it('builds one OpenAI audio job per unique current listening phrase across all bound plans', () => {
    const plan = buildPersonalPlanRuntimeAudioGenerationPlan({
      voiceId: 'openai:alloy',
      outputRoot: 'assets/audio/personal-plans-runtime',
    });

    expect(plan.kind).toBe('personal_plan_runtime_audio_generation_plan');
    expect(plan.productionReady).toBe(false);
    expect(plan.readyForLive).toBe(false);
    expect(plan.audioApprovalReady).toBe(false);
    expect(plan.summary.plans).toBe(5);
    expect(plan.summary.listeningTaskReferences).toBe(5460);
    expect(plan.summary.uniqueAudioJobs).toBe(
      plan.planSummaries.reduce((sum, item) => sum + item.uniqueAudioJobs, 0),
    );
    expect(plan.summary.blockers).toBe(0);
    expect(plan.planSummaries.map((item) => item.planId)).toEqual([
      'voyazh',
      'mitap',
      'gavan',
      'impuls',
      'echo',
    ]);
    expect(plan.planSummaries.every((item) =>
      item.listeningTaskReferences > item.uniqueAudioJobs &&
      item.uniqueAudioJobs > 0
    )).toBe(true);
    expect(plan.jobs[0]).toEqual(expect.objectContaining({
      planId: 'voyazh',
      weekId: 'runtime',
      exerciseType: 'plan_listen_choose',
      contentUnitId: 'voyazh_d001_content_unit_phrase_1',
      contentUnitIds: expect.arrayContaining(['voyazh_d001_content_unit_phrase_1']),
      targetText: expect.any(String),
      provider: 'openai',
      voiceId: 'openai:alloy',
      outputPath: 'assets/audio/personal-plans-runtime/voyazh/runtime/voyazh-d001-listen-audio/voyazh-d001-content-unit-phrase-1.mp3',
      expectedAssetId: 'audio:voyazh:runtime:voyazh-d001-listen-audio:voyazh-d001-content-unit-phrase-1',
      splitPolicy: 'per_content_unit',
      status: 'ready_to_generate',
    }));
    expect(plan.jobs.every((job) => job.targetText.trim().length > 0)).toBe(true);
    expect(new Set(plan.jobs.map((job) => job.outputPath)).size).toBe(plan.jobs.length);
  });

  it('blocks missing voice or output root without fake readiness', () => {
    const plan = buildPersonalPlanRuntimeAudioGenerationPlan({
      voiceId: '',
      outputRoot: '',
    });

    expect(plan.summary.uniqueAudioJobs).toBe(0);
    expect(plan.summary.blockers).toBe(2);
    expect(plan.blockers.map((blocker) => blocker.reason)).toEqual([
      'missing_voice_id',
      'missing_output_root',
    ]);
    expect(plan.productionReady).toBe(false);
    expect(plan.readyForLive).toBe(false);
  });
});
