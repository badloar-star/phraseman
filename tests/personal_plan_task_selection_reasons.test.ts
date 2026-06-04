import {
  buildPlanTaskSelectionReasonReadiness,
  validatePlanTaskSelectionReasons,
  type PlanTaskSelectionReason,
} from '../app/personal_plan_task_selection_reasons';
import type { PlanExerciseBlock } from '../app/personal_plan_engine_contracts';
import type { PlanWeakSpotSummary } from '../app/personal_plan_weak_spot_summary';

const phraseBlock: PlanExerciseBlock = {
  id: 'day1:block-phrase',
  planId: 'gavan',
  dayIndex: 1,
  type: 'plan_phrase_build',
  title: 'Phrase block',
  contentUnitIds: ['p1', 'p2'],
  estimatedMinutes: 5,
  requiredFor: [5, 10, 15, 20],
  prerequisiteLessonIds: [1],
  progressPolicy: 'correct_only',
  recoveryPolicy: 'return_wrong_to_recall_and_trainer',
};

const recallBlock: PlanExerciseBlock = {
  ...phraseBlock,
  id: 'day1:block-recall',
  type: 'plan_phrase_recall',
  title: 'Recall block',
  contentUnitIds: ['p3'],
  requiredFor: [15, 20],
};

const quizBlock: PlanExerciseBlock = {
  ...phraseBlock,
  id: 'day1:block-quiz',
  type: 'plan_quiz',
  title: 'Quiz block',
  contentUnitIds: ['p1', 'p4'],
  estimatedMinutes: 4,
  requiredFor: [20],
};

const summary: PlanWeakSpotSummary = {
  scope: {
    planInstanceId: 'instance-1',
  },
  totals: {
    attempts: 2,
    correct: 0,
    wrong: 2,
    skipped: 0,
    completed: 0,
    recoveryCandidates: 4,
  },
  due: {
    recall: { due: true, count: 2 },
    trainer: { due: true, count: 1 },
    mistakeAnalytics: { due: true, count: 1 },
  },
  weakSpots: [
    {
      id: 'grammar:i-need',
      kind: 'grammar',
      tag: 'I need',
      wrongCount: 2,
      recallDueCount: 2,
      trainerDueCount: 1,
      mistakeAnalyticsDueCount: 1,
      planInstanceIds: ['instance-1'],
      blockIds: ['day0:block-old'],
      dayIndexes: [1],
      contentUnitIds: ['p1'],
      latestAttemptAt: '2026-06-01T10:00:00.000Z',
    },
  ],
};

describe('personal plan task selection reasons', () => {
  it('creates baseline reasons for every block and attaches weak-spot evidence by content unit', () => {
    const readiness = buildPlanTaskSelectionReasonReadiness({
      blocks: [phraseBlock, recallBlock, quizBlock],
      weakSpotSummary: summary,
    });

    expect(readiness.valid).toBe(true);
    expect(readiness.summary).toEqual({
      blocks: 3,
      reasons: 6,
      weakSpotReasons: 2,
      recallDueCount: 2,
      trainerDueCount: 1,
      mistakeAnalyticsDueCount: 1,
    });
    expect(readiness.reasonsByBlockId[phraseBlock.id]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'new_phrase_practice',
        source: 'plan_structure',
      }),
      expect.objectContaining({
        code: 'weak_spot_recovery',
        source: 'weak_spot_summary',
        evidence: expect.objectContaining({
          weakSpotIds: ['grammar:i-need'],
          contentUnitIds: ['p1'],
        }),
      }),
    ]));
    expect(readiness.reasonsByBlockId[recallBlock.id]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'recall_due',
        source: 'weak_spot_summary',
        evidence: expect.objectContaining({ recallDueCount: 2 }),
      }),
    ]));
    expect(readiness.reasonsByBlockId[quizBlock.id]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'quiz_check',
        source: 'plan_structure',
      }),
      expect.objectContaining({
        code: 'weak_spot_recovery',
        source: 'weak_spot_summary',
      }),
    ]));
  });

  it('does not create fake weak-spot reasons for unrelated blocks', () => {
    const readiness = buildPlanTaskSelectionReasonReadiness({
      blocks: [recallBlock],
      weakSpotSummary: summary,
    });

    expect(readiness.reasonsByBlockId[recallBlock.id].some((reason) =>
      reason.code === 'weak_spot_recovery',
    )).toBe(false);
  });

  it('fails readiness when a block has no selection reason', () => {
    const result = validatePlanTaskSelectionReasons({
      blocks: [phraseBlock],
      reasonsByBlockId: {},
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'missing_task_selection_reason',
      blockId: phraseBlock.id,
    }));
  });

  it('fails weak-spot recovery reasons without evidence', () => {
    const badReason: PlanTaskSelectionReason = {
      id: 'bad',
      blockId: phraseBlock.id,
      code: 'weak_spot_recovery',
      source: 'weak_spot_summary',
      priority: 80,
      tone: 'recovery',
      evidence: {},
    };

    const result = validatePlanTaskSelectionReasons({
      blocks: [phraseBlock],
      reasonsByBlockId: {
        [phraseBlock.id]: [badReason],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'weak_spot_reason_without_evidence',
      blockId: phraseBlock.id,
    }));
  });
});
