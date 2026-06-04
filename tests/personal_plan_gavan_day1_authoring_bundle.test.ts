import { readFileSync } from 'fs';
import path from 'path';
import {
  buildGavanDay1AuthoringBundle,
  validateGavanDay1AuthoringBundle,
} from '../app/personal_plan_gavan_day1_authoring_bundle';

describe('Gavan day 1 combined authoring bundle', () => {
  it('collects the clean day 1 reviewer evidence without live integration', () => {
    const bundle = buildGavanDay1AuthoringBundle();

    expect(bundle.kind).toBe('gavan_day1_authoring_readiness_bundle');
    expect(bundle.dayId).toBe('gavan-week1-day1');
    expect(bundle.liveIntegration).toBe(false);
    expect(bundle.content).toEqual(expect.objectContaining({
      source: 'candidate',
      candidateStatus: 'candidate',
      phraseCount: 5,
      qualityValid: true,
      qualityIssueCodes: [],
    }));
    expect(bundle.quiz).toEqual(expect.objectContaining({
      itemCount: 10,
      choiceCount: expect.any(Number),
      explanationRequirementCount: expect.any(Number),
      valid: true,
      issueCodes: [],
    }));
    expect(bundle.package).toEqual(expect.objectContaining({
      blockCount: 4,
      explanationRequirementCount: expect.any(Number),
      valid: true,
      issueCodes: [],
    }));
    expect(bundle.explanations.requiredCount).toBe(bundle.package.explanationRequirementCount);
    expect(bundle.releaseEvidence.decision).toEqual({
      label: 'go',
      canRelease: true,
      blockedSections: [],
      acceptedNotRequiredSections: ['audio', 'pronunciation'],
    });
    expect(validateGavanDay1AuthoringBundle(bundle).valid).toBe(true);
  });

  it('includes planned listening and pronunciation summaries without requiring media by default', () => {
    const bundle = buildGavanDay1AuthoringBundle();

    expect(bundle.listening).toEqual(expect.objectContaining({
      planned: true,
      attachedToRelease: false,
      promptCount: 5,
      requiredAudioAssets: 1,
      authoringValid: true,
      issueCodes: [],
      releaseSectionStatus: 'not_required',
      productionBlocked: false,
    }));
    expect(bundle.pronunciation).toEqual(expect.objectContaining({
      planned: true,
      attachedToRelease: false,
      targetCount: 5,
      requiredScoringRequirements: 1,
      authoringValid: true,
      issueCodes: [],
      releaseSectionStatus: 'not_required',
      productionBlocked: false,
    }));
  });

  it('shows audio and pronunciation blockers when media authoring is attached to release evidence', () => {
    const bundle = buildGavanDay1AuthoringBundle({
      attachListeningToRelease: true,
      attachPronunciationToRelease: true,
    });

    expect(bundle.releaseEvidence.decision.label).toBe('hold');
    expect(bundle.releaseEvidence.decision.canRelease).toBe(false);
    expect(bundle.releaseEvidence.decision.blockedSections).toEqual(expect.arrayContaining([
      'audio',
      'pronunciation',
    ]));
    expect(bundle.listening).toEqual(expect.objectContaining({
      attachedToRelease: true,
      releaseSectionStatus: 'blocked',
      productionBlocked: true,
      productionIssueCodes: expect.arrayContaining(['audio_not_production_ready']),
    }));
    expect(bundle.pronunciation).toEqual(expect.objectContaining({
      attachedToRelease: true,
      releaseSectionStatus: 'blocked',
      productionBlocked: true,
      productionIssueCodes: expect.arrayContaining(['pronunciation_scoring_not_ready']),
    }));
    expect(validateGavanDay1AuthoringBundle(bundle).valid).toBe(true);
  });

  it('exposes one compact reviewer checklist for the whole day', () => {
    const bundle = buildGavanDay1AuthoringBundle({
      attachListeningToRelease: true,
      attachPronunciationToRelease: true,
    });

    expect(bundle.reviewerChecklist).toEqual([
      expect.objectContaining({ id: 'content', status: 'ready' }),
      expect.objectContaining({ id: 'package', status: 'ready' }),
      expect.objectContaining({ id: 'quiz', status: 'ready' }),
      expect.objectContaining({ id: 'explanations', status: 'ready' }),
      expect.objectContaining({ id: 'listening', status: 'blocked' }),
      expect.objectContaining({ id: 'pronunciation', status: 'blocked' }),
      expect.objectContaining({ id: 'release', status: 'blocked' }),
    ]);
  });

  it('fails validation if the bundle pretends to be live integrated or production-releasable with attached blockers', () => {
    const bundle = buildGavanDay1AuthoringBundle({
      attachListeningToRelease: true,
      attachPronunciationToRelease: true,
    });

    expect(validateGavanDay1AuthoringBundle({
      ...bundle,
      liveIntegration: true as false,
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'live_integration_enabled' }),
    ]));

    expect(validateGavanDay1AuthoringBundle({
      ...bundle,
      releaseEvidence: {
        ...bundle.releaseEvidence,
        decision: {
          ...bundle.releaseEvidence.decision,
          label: 'go',
          canRelease: true,
          blockedSections: [],
        },
      },
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'release_decision_hides_blockers' }),
    ]));
  });

  it('stays outside UI storage live catalog and live quiz registries', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'app', 'personal_plan_gavan_day1_authoring_bundle.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio/);
    expect(source).not.toContain("from './personal_plan_catalog'");
    expect(source).not.toContain("from './personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
