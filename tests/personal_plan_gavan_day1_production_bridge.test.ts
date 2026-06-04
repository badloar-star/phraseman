import { readFileSync } from 'fs';
import path from 'path';
import {
  buildGavanDay1ProductionBridge,
  validateGavanDay1ProductionBridge,
} from '../app/personal_plan_gavan_day1_production_bridge';
import { buildGavanDay1PackageDraft } from '../app/personal_plan_gavan_day1_package_draft';
import { buildGavanDay1ContentCandidate } from '../app/personal_plan_gavan_day1_content_candidate';
import {
  buildPlaceholderPlanAudioAsset,
  type PlanAudioAsset,
} from '../app/personal_plan_audio_asset_readiness';
import {
  buildBlockedPlanPronunciationScoringRequirement,
  type PlanPronunciationScoringRequirement,
} from '../app/personal_plan_pronunciation_readiness';

function approvedAudioAsset(blockId: string, overrides: Partial<PlanAudioAsset> = {}): PlanAudioAsset {
  return {
    id: `audio:${blockId}:approved`,
    blockId,
    contentUnitIds: ['gavan-day1-final-p1'],
    targetText: 'Hi, I am here.',
    locale: 'en',
    status: 'approved',
    assetId: 'openai-audio-gavan-day1-001',
    uri: 'assets/audio/personal-plans/gavan/day1/hi-i-am-here.mp3',
    durationMs: 1420,
    voiceId: 'openai:alloy',
    provider: 'openai',
    finalAssetReady: true,
    ...overrides,
  };
}

function readyPronunciationRequirement(
  exerciseId: string,
  overrides: Partial<PlanPronunciationScoringRequirement> = {},
): PlanPronunciationScoringRequirement {
  return {
    id: `pronunciation:${exerciseId}:ready`,
    exerciseId,
    blockId: 'gavan-day1:block-pronunciation',
    contentUnitIds: ['gavan-day1-final-p1'],
    targetText: 'Hi, I am here.',
    status: 'ready',
    scorerId: 'pronunciation-scorer-openai-v1',
    scoringProvider: 'openai',
    scoringVersion: 'pronunciation-v1',
    resultFields: ['score', 'pronunciationScore', 'fluencyScore'],
    minimumConfidence: 0.75,
    finalScoringReady: true,
    ...overrides,
  };
}

describe('Gavan day 1 production bridge', () => {
  it('reports blocked while day 1 content is still draft/scaffold-only', () => {
    const bridge = buildGavanDay1ProductionBridge();

    expect(bridge.status).toBe('blocked');
    expect(bridge.content.status).toBe('blocked');
    expect(bridge.issues).toContainEqual(expect.objectContaining({
      code: 'scaffold_content_not_approved',
    }));
    expect(bridge.summary.headline).toBe('Gavan day 1 is not production-ready yet.');
  });

  it('includes copy gate status from task reason copy readiness', () => {
    const bridge = buildGavanDay1ProductionBridge();

    expect(bridge.copy).toEqual(expect.objectContaining({
      status: 'ready',
      blocks: expect.any(Number),
      copies: expect.any(Number),
      issues: [],
    }));
    expect(bridge.copy.copies).toBeGreaterThan(0);
  });

  it('includes quiz readiness as its own bridge section', () => {
    const bridge = buildGavanDay1ProductionBridge();

    expect(bridge.quiz).toEqual(expect.objectContaining({
      status: 'ready',
      items: 10,
      explanationRequirements: expect.any(Number),
      issues: [],
    }));
    expect(bridge.summary.ready).toContain('quiz');
  });

  it('keeps content approval separate while candidate quiz is ready', () => {
    const draft = buildGavanDay1PackageDraft({
      contentCandidate: buildGavanDay1ContentCandidate(),
    });
    const bridge = buildGavanDay1ProductionBridge({ draft });

    expect(bridge.content.status).toBe('blocked');
    expect(bridge.quiz.status).toBe('ready');
    expect(bridge.summary.blockers).toContain('content');
    expect(bridge.summary.ready).toContain('quiz');
  });

  it('reports production ready only with explicit approval and acceptable required sections', () => {
    const draft = buildGavanDay1PackageDraft({
      contentCandidate: buildGavanDay1ContentCandidate(),
    });

    const bridge = buildGavanDay1ProductionBridge({
      draft,
      contentApproval: 'approved',
    });

    expect(bridge.status).toBe('ready');
    expect(bridge.production).toEqual({
      status: 'ready',
      canRelease: true,
      requiredReadySections: ['content', 'package', 'quiz', 'copy'],
      acceptedNotRequiredSections: ['audio', 'pronunciation'],
      blockedSections: [],
      criteria: {
        contentApproved: true,
        packageReady: true,
        quizReady: true,
        copyReady: true,
        audioAcceptable: true,
        pronunciationAcceptable: true,
      },
    });
  });

  it('does not treat content approval alone as enough when quiz readiness fails', () => {
    const draft = buildGavanDay1PackageDraft({
      contentCandidate: buildGavanDay1ContentCandidate(),
    });
    draft.quizDraft.items[0].prompt = 'DEV placeholder';

    const bridge = buildGavanDay1ProductionBridge({
      draft,
      contentApproval: 'approved',
    });

    expect(bridge.content.status).toBe('ready');
    expect(bridge.quiz.status).toBe('blocked');
    expect(bridge.production.canRelease).toBe(false);
    expect(bridge.production.blockedSections).toEqual(expect.arrayContaining(['quiz']));
  });

  it('accepts audio and pronunciation as not required only without fake final claims', () => {
    const draft = buildGavanDay1PackageDraft({
      contentCandidate: buildGavanDay1ContentCandidate(),
    });
    const bridge = buildGavanDay1ProductionBridge({
      draft,
      contentApproval: 'approved',
    });

    expect(bridge.audio.status).toBe('not_required');
    expect(bridge.pronunciation.status).toBe('not_required');
    expect(bridge.production.criteria.audioAcceptable).toBe(true);
    expect(bridge.production.criteria.pronunciationAcceptable).toBe(true);

    draft.mediaClaims.audioFinalReady = true;
    draft.mediaClaims.pronunciationFinalScoringReady = true;
    const blocked = buildGavanDay1ProductionBridge({
      draft,
      contentApproval: 'approved',
    });

    expect(blocked.production.canRelease).toBe(false);
    expect(blocked.production.blockedSections).toEqual(expect.arrayContaining([
      'audio',
      'pronunciation',
    ]));
  });

  it('blocks the quiz section when candidate quiz validation fails', () => {
    const draft = buildGavanDay1PackageDraft({
      contentCandidate: buildGavanDay1ContentCandidate(),
    });
    draft.quizDraft.items[0].choices[0].explanationRequirement!.note =
      'DEV placeholder: Explain that sourcePhraseId is wrong.';

    const bridge = buildGavanDay1ProductionBridge({
      draft,
      contentApproval: 'approved',
    });

    expect(bridge.quiz.status).toBe('blocked');
    expect(bridge.quiz.issues).toEqual(expect.arrayContaining([
      'candidate_quiz_developer_copy',
      'candidate_quiz_authoring_instruction',
    ]));
    expect(bridge.summary.blockers).toEqual(expect.arrayContaining(['quiz']));
    expect(bridge.issues).toContainEqual(expect.objectContaining({
      code: 'quiz_gate_failed',
      section: 'quiz',
    }));
  });

  it('includes audio readiness without claiming fake final audio', () => {
    const bridge = buildGavanDay1ProductionBridge();

    expect(bridge.audio).toEqual(expect.objectContaining({
      status: 'not_required',
      requirements: 0,
      productionReady: true,
      finalReadyClaims: 0,
    }));
    expect(bridge.issues.map((issue) => issue.code)).not.toContain('fake_final_audio_claim');
  });

  it('blocks production when a listening requirement exists only as placeholder audio', () => {
    const draft = buildGavanDay1PackageDraft({
      contentCandidate: buildGavanDay1ContentCandidate(),
    });
    const blockId = draft.blocks[1].id;
    draft.readinessInput.audioRequirementsByBlockId[blockId] = buildPlaceholderPlanAudioAsset({
      blockId,
      contentUnitIds: ['gavan-day1-final-p1'],
      targetText: 'Hi, I am here.',
    });

    const bridge = buildGavanDay1ProductionBridge({
      draft,
      contentApproval: 'approved',
    });

    expect(bridge.audio).toEqual(expect.objectContaining({
      status: 'blocked',
      requirements: 1,
      productionReady: false,
      finalReadyClaims: 0,
      issues: ['audio_not_production_ready'],
    }));
    expect(bridge.production.canRelease).toBe(false);
    expect(bridge.production.blockedSections).toContain('audio');
    expect(bridge.issues).toContainEqual(expect.objectContaining({
      code: 'audio_not_production_ready',
      section: 'audio',
    }));
  });

  it('allows approved listening audio metadata without treating final readiness as a fake claim', () => {
    const draft = buildGavanDay1PackageDraft({
      contentCandidate: buildGavanDay1ContentCandidate(),
    });
    const blockId = draft.blocks[1].id;
    draft.readinessInput.audioRequirementsByBlockId[blockId] = approvedAudioAsset(blockId);

    const bridge = buildGavanDay1ProductionBridge({
      draft,
      contentApproval: 'approved',
    });

    expect(bridge.audio).toEqual(expect.objectContaining({
      status: 'ready',
      requirements: 1,
      productionReady: true,
      finalReadyClaims: 1,
      issues: [],
    }));
    expect(bridge.issues.map((item) => item.code)).not.toContain('fake_final_audio_claim');
    expect(bridge.production.blockedSections).not.toContain('audio');
  });

  it('blocks approved listening audio metadata when required final fields are missing', () => {
    const draft = buildGavanDay1PackageDraft({
      contentCandidate: buildGavanDay1ContentCandidate(),
    });
    const blockId = draft.blocks[1].id;
    draft.readinessInput.audioRequirementsByBlockId[blockId] = approvedAudioAsset(blockId, {
      assetId: '',
      uri: '',
      durationMs: 0,
      voiceId: '',
      provider: 'unknown',
      finalAssetReady: false,
    });

    const bridge = buildGavanDay1ProductionBridge({
      draft,
      contentApproval: 'approved',
    });

    expect(bridge.audio.status).toBe('blocked');
    expect(bridge.audio.issues).toEqual(expect.arrayContaining([
      'missing_audio_asset_id',
      'missing_audio_uri',
      'invalid_audio_duration',
      'missing_audio_voice',
      'missing_audio_provider',
      'approved_audio_not_marked_final',
      'audio_not_production_ready',
    ]));
    expect(bridge.production.canRelease).toBe(false);
    expect(bridge.production.blockedSections).toContain('audio');
  });

  it('includes pronunciation readiness without claiming fake scoring', () => {
    const bridge = buildGavanDay1ProductionBridge();

    expect(bridge.pronunciation).toEqual(expect.objectContaining({
      status: 'not_required',
      requirements: 0,
      scoringAvailable: false,
      finalScoringClaims: 0,
    }));
    expect(bridge.issues.map((issue) => issue.code)).not.toContain('fake_final_pronunciation_claim');
  });

  it('blocks production when pronunciation is required but scoring is not ready', () => {
    const draft = buildGavanDay1PackageDraft({
      contentCandidate: buildGavanDay1ContentCandidate(),
    });
    draft.readinessInput.pronunciationRequirementsByExerciseId['gavan-day1-pronunciation'] =
      buildBlockedPlanPronunciationScoringRequirement({
        exerciseId: 'gavan-day1-pronunciation',
        blockId: 'gavan-day1:block-pronunciation',
        contentUnitIds: ['gavan-day1-final-p1'],
        targetText: 'Hi, I am here.',
      });

    const bridge = buildGavanDay1ProductionBridge({
      draft,
      contentApproval: 'approved',
    });

    expect(bridge.pronunciation).toEqual(expect.objectContaining({
      status: 'blocked',
      requirements: 1,
      scoringAvailable: false,
      finalScoringClaims: 0,
      issues: ['pronunciation_scoring_not_ready'],
    }));
    expect(bridge.production.canRelease).toBe(false);
    expect(bridge.production.blockedSections).toContain('pronunciation');
  });

  it('allows ready pronunciation scoring metadata without treating final readiness as a fake claim', () => {
    const draft = buildGavanDay1PackageDraft({
      contentCandidate: buildGavanDay1ContentCandidate(),
    });
    draft.readinessInput.pronunciationRequirementsByExerciseId['gavan-day1-pronunciation'] =
      readyPronunciationRequirement('gavan-day1-pronunciation');

    const bridge = buildGavanDay1ProductionBridge({
      draft,
      contentApproval: 'approved',
    });

    expect(bridge.pronunciation).toEqual(expect.objectContaining({
      status: 'ready',
      requirements: 1,
      scoringAvailable: true,
      finalScoringClaims: 1,
      issues: [],
    }));
    expect(bridge.issues.map((item) => item.code)).not.toContain('fake_final_pronunciation_claim');
    expect(bridge.production.blockedSections).not.toContain('pronunciation');
  });

  it('blocks ready pronunciation scoring metadata when required final fields are missing', () => {
    const draft = buildGavanDay1PackageDraft({
      contentCandidate: buildGavanDay1ContentCandidate(),
    });
    draft.readinessInput.pronunciationRequirementsByExerciseId['gavan-day1-pronunciation'] =
      readyPronunciationRequirement('gavan-day1-pronunciation', {
        scorerId: '',
        scoringProvider: 'unknown',
        scoringVersion: '',
        resultFields: [],
        minimumConfidence: 1.4,
        finalScoringReady: false,
      });

    const bridge = buildGavanDay1ProductionBridge({
      draft,
      contentApproval: 'approved',
    });

    expect(bridge.pronunciation.status).toBe('blocked');
    expect(bridge.pronunciation.issues).toEqual(expect.arrayContaining([
      'missing_pronunciation_scorer_id',
      'missing_pronunciation_scoring_provider',
      'missing_pronunciation_scoring_version',
      'missing_pronunciation_result_fields',
      'invalid_pronunciation_minimum_confidence',
      'ready_pronunciation_not_marked_final',
      'pronunciation_scoring_not_ready',
    ]));
    expect(bridge.production.canRelease).toBe(false);
    expect(bridge.production.blockedSections).toContain('pronunciation');
  });

  it('gives one concise readiness summary for future UI or integration work', () => {
    const bridge = buildGavanDay1ProductionBridge();

    expect(bridge.summary).toEqual({
      status: 'blocked',
      headline: 'Gavan day 1 is not production-ready yet.',
      blockers: ['content'],
      ready: ['package', 'quiz', 'copy', 'audio', 'pronunciation'],
    });
  });

  it('fails the bridge if package copy audio or pronunciation gates are broken', () => {
    const draft = buildGavanDay1PackageDraft();
    draft.personalization.taskReasonCopy.valid = false;
    draft.personalization.taskReasonCopy.issues.push({
      code: 'developer_copy',
      reasonId: 'reason_bad',
      detail: 'Developer copy leaked.',
    });
    draft.mediaClaims.audioFinalReady = true;
    draft.mediaClaims.pronunciationFinalScoringReady = true;

    const bridge = buildGavanDay1ProductionBridge({
      draft,
      contentApproval: 'approved',
    });

    expect(validateGavanDay1ProductionBridge(bridge).valid).toBe(false);
    expect(bridge.summary.blockers).toEqual(expect.arrayContaining([
      'package',
      'copy',
      'audio',
      'pronunciation',
    ]));
    expect(bridge.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'copy_gate_failed' }),
      expect.objectContaining({ code: 'fake_final_audio_claim' }),
      expect.objectContaining({ code: 'fake_final_pronunciation_claim' }),
    ]));
  });

  it('does not depend on live catalog or live quiz registry mutation', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'app', 'personal_plan_gavan_day1_production_bridge.ts'),
      'utf8',
    );

    expect(source).not.toContain("from './personal_plan_catalog'");
    expect(source).not.toContain("from './personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
