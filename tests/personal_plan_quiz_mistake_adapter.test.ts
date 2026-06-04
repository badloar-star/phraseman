import { buildPersonalPlanQuizMistakeMeta } from '../app/personal_plan_quiz_mistake_adapter';
import { getPersonalPlanQuizCoverage } from '../app/personal_plan_quizzes';

describe('personal plan quiz mistake adapter', () => {
  it('adds plan context and source phrase to quiz mistakes', () => {
    const meta = buildPersonalPlanQuizMistakeMeta(
      {
        expected: "I'm here.",
        picked: "It's here.",
        tokenText: "I'm here.",
      },
      {
        planQuizId: 'gavan_day1_short_replies_quiz',
        planId: 'gavan',
        planInstanceId: 'instance-1',
        planTaskId: 'gavan-d1-quiz',
        planDayIndex: 1,
        questionId: 'gavan_d1_q1',
        coverage: getPersonalPlanQuizCoverage('gavan_day1_short_replies_quiz'),
      },
    );

    expect(meta).toEqual({
      expected: "I'm here.",
      picked: "It's here.",
      tokenText: "I'm here.",
      phraseId: 'gavan_d1_phrase_1',
      grammarTag: 'personal_plan_quiz',
      planId: 'gavan',
      planInstanceId: 'instance-1',
      planTaskId: 'gavan-d1-quiz',
      planDayIndex: 1,
      planPhraseLessonId: 'gavan_day1_short_replies',
    });
  });

  it('does not add plan context to regular quizzes', () => {
    expect(
      buildPersonalPlanQuizMistakeMeta({ expected: 'go', picked: 'went' }, { questionId: 'q1' }),
    ).toEqual({ expected: 'go', picked: 'went' });
  });

  it('preserves resolver grammar tag when it exists', () => {
    const meta = buildPersonalPlanQuizMistakeMeta(
      { grammarTag: 'pronoun', phraseId: 'manual-id' },
      {
        planQuizId: 'gavan_day1_short_replies_quiz',
        planId: 'gavan',
        planInstanceId: 'instance-2',
        planTaskId: 'task-2',
        planDayIndex: 1,
        questionId: 'unknown-question',
        coverage: getPersonalPlanQuizCoverage('gavan_day1_short_replies_quiz'),
      },
    );

    expect(meta.grammarTag).toBe('pronoun');
    expect(meta.phraseId).toBe('manual-id');
    expect(meta.planPhraseLessonId).toBeUndefined();
  });
});
