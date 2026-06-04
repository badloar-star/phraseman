import { readFileSync } from 'fs';
import path from 'path';
import {
  buildGavanDay1PackageDraft,
  validateGavanDay1PackageDraft,
  type GavanDay1PackageDraft,
} from '../app/personal_plan_gavan_day1_package_draft';
import { buildGavanDay1ContentCandidate } from '../app/personal_plan_gavan_day1_content_candidate';
import { buildGavanDay1ProductionBridge } from '../app/personal_plan_gavan_day1_production_bridge';
import { validateGavanWeek1DraftPackageReadiness } from '../app/personal_plan_harbor_week1_package_readiness';
import type { PlanWeakSpotSummaryInput } from '../app/personal_plan_weak_spot_summary';

function cloneDraft(): GavanDay1PackageDraft {
  return JSON.parse(JSON.stringify(buildGavanDay1PackageDraft())) as GavanDay1PackageDraft;
}

function weakSpotInput(): PlanWeakSpotSummaryInput {
  return {
    attempts: [
      {
        id: 'attempt:gavan:day1:p1',
        planInstanceId: 'instance_gavan_1',
        planId: 'gavan',
        dayIndex: 1,
        blockId: 'previous:block',
        exerciseType: 'plan_phrase_build',
        contentUnitId: 'gavan-w1-d1-p1',
        occurredAt: '2026-06-01T10:00:00.000Z',
        result: 'wrong',
        progressEligible: false,
        expectedAnswer: "I'm here.",
        selectedAnswer: 'I here.',
        selectedAnswerKnown: true,
        grammarTags: ["I'm"],
        vocabularyTags: ['here'],
        mistakeTags: ['missing-am'],
      },
    ],
    recoveryCandidates: [
      {
        id: 'recovery:gavan:day1:p1:recall',
        target: 'recall',
        planInstanceId: 'instance_gavan_1',
        planId: 'gavan',
        dayIndex: 1,
        blockId: 'previous:block',
        exerciseType: 'plan_phrase_build',
        contentUnitId: 'gavan-w1-d1-p1',
        expectedAnswer: "I'm here.",
        selectedAnswer: 'I here.',
        selectedAnswerKnown: true,
        grammarTags: ["I'm"],
        vocabularyTags: ['here'],
        mistakeTags: ['missing-am'],
        reason: 'wrong_attempt',
      },
      {
        id: 'recovery:gavan:day1:p1:trainer',
        target: 'trainer',
        planInstanceId: 'instance_gavan_1',
        planId: 'gavan',
        dayIndex: 1,
        blockId: 'previous:block',
        exerciseType: 'plan_phrase_build',
        contentUnitId: 'gavan-w1-d1-p1',
        expectedAnswer: "I'm here.",
        selectedAnswer: 'I here.',
        selectedAnswerKnown: true,
        grammarTags: ["I'm"],
        vocabularyTags: ['here'],
        mistakeTags: ['missing-am'],
        reason: 'wrong_attempt',
      },
    ],
  };
}

describe('Gavan day 1 non-production package draft', () => {
  it('builds a day 1 package that passes the package readiness gate', () => {
    const draft = buildGavanDay1PackageDraft();

    expect(draft.dayId).toBe('gavan-week1-day1');
    expect(draft.blocks.map((block) => block.id)).toEqual([
      'gavan-week1-day1:gavan-week1-day1:block-1',
      'gavan-week1-day1:gavan-week1-day1:block-2',
      'gavan-week1-day1:gavan-week1-day1:block-3',
      'gavan-week1-day1:gavan-week1-day1:block-4',
    ]);
    expect(validateGavanWeek1DraftPackageReadiness(draft.readinessInput).valid).toBe(true);
    expect(validateGavanDay1PackageDraft(draft).valid).toBe(true);
  });

  it('exposes the day 1 quiz draft summary as part of the package', () => {
    const draft = buildGavanDay1PackageDraft();

    expect(draft.quizDraft.id).toBe('gavan-week1-day1-quiz-draft');
    expect(draft.quizDraft.items).toHaveLength(10);
    expect(draft.summary.quizItems).toBe(10);
    expect(draft.summary.quizExplanationRequirements).toBe(30);
  });

  it('keeps the day 1 quiz requirement at exactly 10 draft questions', () => {
    const draft = buildGavanDay1PackageDraft();
    const quizBlock = draft.blocks.find((block) => block.type === 'plan_quiz');

    expect(draft.readinessInput.quizRequirementsByBlockId[quizBlock!.id]).toEqual({
      questionCount: 10,
      status: 'draft',
    });
    expect(draft.readinessInput.quizRequirementsByBlockId[quizBlock!.id]?.questionCount).toBe(
      draft.quizDraft.items.length,
    );
  });

  it('requires explanations for every day 1 new word and first-seen construction', () => {
    const draft = buildGavanDay1PackageDraft();

    expect(draft.explanationRequirements.map((requirement) => [
      requirement.phraseId,
      requirement.covers,
    ])).toEqual([
      ['gavan-w1-d1-p1', ['here']],
      ['gavan-w1-d1-p1', ["I'm"]],
      ['gavan-w1-d1-p2', ['need']],
      ['gavan-w1-d1-p2', ['minute']],
      ['gavan-w1-d1-p2', ['I need']],
    ]);
  });

  it('can be built from the approved day 1 content candidate without touching production registries', () => {
    const candidate = buildGavanDay1ContentCandidate();
    const draft = buildGavanDay1PackageDraft({ contentCandidate: candidate });

    expect(draft.content.source).toBe('candidate');
    expect(draft.content.phrases.map((phrase) => phrase.id)).toEqual(
      candidate.phrases.map((phrase) => phrase.id),
    );
    expect(draft.content.qualityValid).toBe(true);
    expect(draft.content.qualityIssueCodes).toEqual([]);
    expect(draft.summary.contentPhrases).toBe(candidate.summary.phrases);
    expect(validateGavanDay1PackageDraft(draft).valid).toBe(true);
  });

  it('matches candidate explanation requirements to every candidate word and construction', () => {
    const candidate = buildGavanDay1ContentCandidate();
    const draft = buildGavanDay1PackageDraft({ contentCandidate: candidate });
    const expectedRequirements = candidate.phrases.flatMap((phrase) => [
      ...(phrase.newWords ?? []).map((target) => [phrase.id, [target], 'word_note']),
      ...(phrase.firstSeenConstructions ?? []).map((target) => [phrase.id, [target], 'first_seen']),
    ]);

    expect(draft.explanationRequirements.map((requirement) => [
      requirement.phraseId,
      requirement.covers,
      requirement.trigger,
    ])).toEqual(expectedRequirements);
    expect(draft.summary.explanationRequirements).toBe(expectedRequirements.length);
  });

  it('keeps the quiz draft separate, draft-only, and candidate-aligned while content candidate is attached', () => {
    const candidate = buildGavanDay1ContentCandidate();
    const draft = buildGavanDay1PackageDraft({ contentCandidate: candidate });
    const quizBlock = draft.blocks.find((block) => block.type === 'plan_quiz');

    expect(draft.quizDraft.status).toBe('draft');
    expect(draft.quizDraft.items).toHaveLength(10);
    expect(draft.readinessInput.quizRequirementsByBlockId[quizBlock!.id]).toEqual({
      questionCount: 10,
      status: 'draft',
    });
    expect(new Set(draft.quizDraft.items.map((item) => item.sourcePhraseId))).toEqual(
      new Set(candidate.phrases.map((phrase) => phrase.id)),
    );
  });

  it('keeps the production bridge blocked until explicit content approval even with candidate content', () => {
    const draft = buildGavanDay1PackageDraft({
      contentCandidate: buildGavanDay1ContentCandidate(),
    });
    const bridge = buildGavanDay1ProductionBridge({ draft });

    expect(bridge.status).toBe('blocked');
    expect(bridge.issues).toContainEqual(expect.objectContaining({
      code: 'scaffold_content_not_approved',
      section: 'content',
    }));
    expect(bridge.package.status).toBe('ready');
  });

  it('does not import the live personal plan catalog or live quiz registry', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'app', 'personal_plan_gavan_day1_package_draft.ts'),
      'utf8',
    );

    expect(source).not.toContain("from './personal_plan_catalog'");
    expect(source).not.toContain("from './personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });

  it('fails when an explanation requirement is missing', () => {
    const draft = cloneDraft();
    draft.explanationRequirements = draft.explanationRequirements.filter((requirement) =>
      !requirement.covers.includes('minute'),
    );

    expect(validateGavanDay1PackageDraft(draft).issues).toContainEqual(
      expect.objectContaining({
        code: 'missing_explanation_requirement',
        phraseId: 'gavan-w1-d1-p2',
        target: 'minute',
      }),
    );
  });

  it('fails when the attached day 1 quiz draft is invalid', () => {
    const draft = cloneDraft();
    draft.quizDraft.items = draft.quizDraft.items.slice(0, 9);

    expect(validateGavanDay1PackageDraft(draft).issues).toContainEqual(
      expect.objectContaining({
        code: 'invalid_day1_quiz_draft',
        detail: expect.stringContaining('wrong_item_count'),
      }),
    );
  });

  it('fails fake final media or pronunciation claims', () => {
    const draft = cloneDraft();
    draft.mediaClaims.audioFinalReady = true;
    draft.mediaClaims.pronunciationFinalScoringReady = true;

    expect(validateGavanDay1PackageDraft(draft).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'fake_final_audio_claim' }),
      expect.objectContaining({ code: 'fake_final_pronunciation_claim' }),
    ]));
  });

  it('connects weak-spot summary to package readiness and task selection reasons', () => {
    const draft = buildGavanDay1PackageDraft({
      weakSpotSummaryInput: weakSpotInput(),
      planInstanceId: 'instance_gavan_1',
    });
    const firstBlockId = 'gavan-week1-day1:gavan-week1-day1:block-1';

    expect(draft.personalization.weakSpotSummary.totals.wrong).toBe(1);
    expect(draft.personalization.taskSelection.valid).toBe(true);
    expect(draft.personalization.taskSelection.reasonsByBlockId[firstBlockId]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'weak_spot_recovery',
        source: 'weak_spot_summary',
        evidence: expect.objectContaining({
          weakSpotIds: expect.arrayContaining(['grammar:i-m']),
          contentUnitIds: ['gavan-w1-d1-p1'],
        }),
      }),
    ]));
    expect(draft.summary.weakSpots).toBeGreaterThan(0);
    expect(draft.summary.taskSelectionReasons).toBeGreaterThan(draft.summary.blocks);
    expect(validateGavanDay1PackageDraft(draft).valid).toBe(true);
  });

  it('exposes safe task reason copy for future UI without developer terms', () => {
    const draft = buildGavanDay1PackageDraft({
      weakSpotSummaryInput: weakSpotInput(),
      planInstanceId: 'instance_gavan_1',
    });
    const firstBlockId = 'gavan-week1-day1:gavan-week1-day1:block-1';
    const copyText = Object.values(draft.personalization.taskReasonCopy.copiesByBlockId)
      .flat()
      .map((copy) => `${copy.label} ${copy.body}`)
      .join(' ');

    expect(draft.personalization.taskReasonCopy.valid).toBe(true);
    expect(draft.personalization.taskReasonCopy.copiesByBlockId[firstBlockId]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'new_phrase_practice',
      }),
      expect.objectContaining({
        code: 'weak_spot_recovery',
      }),
    ]));
    expect(copyText).not.toMatch(/block|contentUnit|weakSpot|renderer|active recall|актив реколл|сцена|маршрут|плановый/i);
    expect(draft.summary.taskReasonCopies).toBeGreaterThan(0);
  });
});
