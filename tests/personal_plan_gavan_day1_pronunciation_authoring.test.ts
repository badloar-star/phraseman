import { readFileSync } from 'fs';
import path from 'path';
import {
  attachGavanDay1PronunciationAuthoringToDraft,
  buildGavanDay1PronunciationAuthoringPlan,
  validateGavanDay1PronunciationAuthoringPlan,
} from '../app/personal_plan_gavan_day1_pronunciation_authoring';
import { validatePlanPronunciationScoringRequirement } from '../app/personal_plan_pronunciation_readiness';
import { buildGavanDay1ContentCandidate } from '../app/personal_plan_gavan_day1_content_candidate';
import { buildGavanDay1PackageDraft } from '../app/personal_plan_gavan_day1_package_draft';
import {
  buildGavanDay1ReleaseEvidence,
  buildGavanDay1ReleaseFixture,
} from '../app/personal_plan_gavan_day1_release_fixture';

describe('Gavan day 1 pronunciation authoring plan', () => {
  it('declares planned pronunciation targets without claiming final scoring', () => {
    const plan = buildGavanDay1PronunciationAuthoringPlan();
    const readiness = validatePlanPronunciationScoringRequirement(plan.scoringRequirement);

    expect(plan.dayId).toBe('gavan-week1-day1');
    expect(plan.status).toBe('authoring_plan');
    expect(plan.finalScoringReady).toBe(false);
    expect(plan.targets).toHaveLength(5);
    expect(plan.scoringRequirement.status).toBe('blocked_until_scoring');
    expect(plan.scoringRequirement.finalScoringReady).toBe(false);
    expect(readiness.validForAuthoring).toBe(true);
    expect(readiness.productionReady).toBe(false);
    expect(validateGavanDay1PronunciationAuthoringPlan(plan).valid).toBe(true);
  });

  it('grounds every planned target in the current candidate phrase id and exact target text', () => {
    const candidate = buildGavanDay1ContentCandidate();
    const phraseById = new Map(candidate.phrases.map((phrase) => [phrase.id, phrase]));
    const plan = buildGavanDay1PronunciationAuthoringPlan(candidate);

    for (const target of plan.targets) {
      const phrase = phraseById.get(target.phraseId);

      expect(phrase).toBeDefined();
      expect(target.contentUnitIds).toEqual([target.phraseId]);
      expect(target.targetText).toBe(phrase!.english);
      expect(plan.scoringRequirement.contentUnitIds).toContain(target.phraseId);
    }

    expect(plan.scoringRequirement.targetText).toBe(
      candidate.phrases.map((phrase) => phrase.english).join(' / '),
    );
  });

  it('blocks release evidence when pronunciation is required but scoring is not final', () => {
    const contentCandidate = buildGavanDay1ContentCandidate();
    const authoringPlan = buildGavanDay1PronunciationAuthoringPlan(contentCandidate);
    const draft = attachGavanDay1PronunciationAuthoringToDraft(
      buildGavanDay1PackageDraft({ contentCandidate }),
      authoringPlan,
    );
    const evidence = buildGavanDay1ReleaseEvidence(
      buildGavanDay1ReleaseFixture({ contentCandidate, draft }),
    );

    expect(evidence.decision.label).toBe('hold');
    expect(evidence.decision.canRelease).toBe(false);
    expect(evidence.decision.blockedSections).toContain('pronunciation');
    expect(evidence.sections).toEqual(expect.arrayContaining([
      expect.objectContaining({
        section: 'pronunciation',
        status: 'blocked',
        required: true,
        issueCodes: expect.arrayContaining(['pronunciation_scoring_not_ready']),
        counts: expect.objectContaining({
          requirements: 1,
          finalScoringClaims: 0,
        }),
      }),
    ]));
  });

  it('keeps authoring metadata free from fake scorer claims', () => {
    const plan = buildGavanDay1PronunciationAuthoringPlan();
    const serialized = JSON.stringify(plan);

    expect(serialized).not.toMatch(/finalScoringReady":true|scorerId|scoringVersion/i);
    expect(serialized).not.toMatch(/pronunciationScore|fluencyScore|intonationScore|score/i);
    expect(serialized).not.toMatch(/production ready|final scoring|scorer is ready/i);
  });

  it('rejects ready scoring statuses inside authoring-only requirements', () => {
    const readyPlan = buildGavanDay1PronunciationAuthoringPlan();
    readyPlan.scoringRequirement = {
      ...readyPlan.scoringRequirement,
      status: 'ready',
    };

    expect(validateGavanDay1PronunciationAuthoringPlan(readyPlan).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'pronunciation_scoring_ready_claim',
        }),
      ]),
    );

    const finalPlan = buildGavanDay1PronunciationAuthoringPlan();
    finalPlan.scoringRequirement = {
      ...finalPlan.scoringRequirement,
      finalScoringReady: true,
    };

    expect(validateGavanDay1PronunciationAuthoringPlan(finalPlan).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'pronunciation_fake_final_scoring_claim',
        }),
      ]),
    );
  });

  it('fails authoring validation when a target references content outside the candidate', () => {
    const plan = buildGavanDay1PronunciationAuthoringPlan();
    plan.targets[0] = {
      ...plan.targets[0],
      phraseId: 'gavan-day1-unknown',
      contentUnitIds: ['gavan-day1-unknown'],
    };

    expect(validateGavanDay1PronunciationAuthoringPlan(plan).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'pronunciation_target_unknown_phrase',
          targetId: plan.targets[0].id,
        }),
      ]),
    );
  });

  it('stays outside UI storage live catalog and live quiz registries', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'app', 'personal_plan_gavan_day1_pronunciation_authoring.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio/);
    expect(source).not.toContain("from './personal_plan_catalog'");
    expect(source).not.toContain("from './personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
