import {
  attachGavanDay1ListeningAuthoringToDraft,
  buildGavanDay1ListeningAuthoringPlan,
  validateGavanDay1ListeningAuthoringPlan,
} from '../app/personal_plan_gavan_day1_listening_authoring';
import { validatePlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import { buildGavanDay1ContentCandidate } from '../app/personal_plan_gavan_day1_content_candidate';
import { buildGavanDay1PackageDraft } from '../app/personal_plan_gavan_day1_package_draft';
import {
  buildGavanDay1ReleaseEvidence,
  buildGavanDay1ReleaseFixture,
} from '../app/personal_plan_gavan_day1_release_fixture';

describe('Gavan day 1 listening authoring plan', () => {
  it('declares planned listening prompts without claiming final audio assets', () => {
    const plan = buildGavanDay1ListeningAuthoringPlan();
    const audioReadiness = validatePlanAudioAsset(plan.audioAsset);

    expect(plan.dayId).toBe('gavan-week1-day1');
    expect(plan.status).toBe('authoring_plan');
    expect(plan.finalAudioReady).toBe(false);
    expect(plan.prompts).toHaveLength(5);
    expect(plan.audioAsset.status).toBe('placeholder');
    expect(plan.audioAsset.finalAssetReady).toBe(false);
    expect(audioReadiness.validForAuthoring).toBe(true);
    expect(audioReadiness.productionReady).toBe(false);
    expect(validateGavanDay1ListeningAuthoringPlan(plan).valid).toBe(true);
  });

  it('grounds every planned prompt in the current candidate phrase id and target text', () => {
    const candidate = buildGavanDay1ContentCandidate();
    const phraseById = new Map(candidate.phrases.map((phrase) => [phrase.id, phrase]));
    const plan = buildGavanDay1ListeningAuthoringPlan(candidate);

    for (const prompt of plan.prompts) {
      const phrase = phraseById.get(prompt.phraseId);

      expect(phrase).toBeDefined();
      expect(prompt.contentUnitIds).toEqual([prompt.phraseId]);
      expect(prompt.targetText).toBe(phrase!.english);
      expect(plan.audioAsset.contentUnitIds).toContain(prompt.phraseId);
    }
  });

  it('blocks production release evidence when listening is required but audio is still a placeholder', () => {
    const contentCandidate = buildGavanDay1ContentCandidate();
    const authoringPlan = buildGavanDay1ListeningAuthoringPlan(contentCandidate);
    const draft = attachGavanDay1ListeningAuthoringToDraft(
      buildGavanDay1PackageDraft({ contentCandidate }),
      authoringPlan,
    );
    const evidence = buildGavanDay1ReleaseEvidence(
      buildGavanDay1ReleaseFixture({ contentCandidate, draft }),
    );

    expect(evidence.decision.label).toBe('hold');
    expect(evidence.decision.canRelease).toBe(false);
    expect(evidence.decision.blockedSections).toContain('audio');
    expect(evidence.sections).toEqual(expect.arrayContaining([
      expect.objectContaining({
        section: 'audio',
        status: 'blocked',
        required: true,
        issueCodes: expect.arrayContaining(['audio_not_production_ready']),
      }),
    ]));
  });

  it('keeps authoring copy free from fake generation or production-ready claims', () => {
    const plan = buildGavanDay1ListeningAuthoringPlan();
    const serialized = JSON.stringify(plan);

    expect(serialized).not.toMatch(/finalAssetReady":true|approved|generated/i);
    expect(serialized).not.toMatch(/production ready|final audio|asset is ready/i);
    expect(plan.prompts.map((prompt) => prompt.mode)).toEqual([
      'listen_choose',
      'listen_choose',
      'listen_choose',
      'listen_choose',
      'listen_choose',
    ]);
  });

  it('rejects generated or approved audio statuses inside authoring-only requirements', () => {
    const generatedPlan = buildGavanDay1ListeningAuthoringPlan();
    generatedPlan.audioAsset = {
      ...generatedPlan.audioAsset,
      status: 'generated',
    };

    expect(validateGavanDay1ListeningAuthoringPlan(generatedPlan).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'listening_audio_generated_claim',
        }),
      ]),
    );

    const approvedPlan = buildGavanDay1ListeningAuthoringPlan();
    approvedPlan.audioAsset = {
      ...approvedPlan.audioAsset,
      status: 'approved',
    };

    expect(validateGavanDay1ListeningAuthoringPlan(approvedPlan).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'listening_audio_generated_claim',
        }),
      ]),
    );
  });

  it('fails authoring validation when a prompt references content outside the candidate', () => {
    const plan = buildGavanDay1ListeningAuthoringPlan();
    plan.prompts[0] = {
      ...plan.prompts[0],
      phraseId: 'gavan-day1-unknown',
      contentUnitIds: ['gavan-day1-unknown'],
    };

    expect(validateGavanDay1ListeningAuthoringPlan(plan).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'listening_prompt_unknown_phrase',
          promptId: plan.prompts[0].id,
        }),
      ]),
    );
  });
});
