import {
  getVipSurveyOptionLabel,
  isVipSurveyComplete,
  normalizeVipSurveyAnswers,
  VIP_SURVEY_ID,
  VIP_SURVEY_QUESTIONS,
} from '../app/vip_survey_content';

describe('vip_survey_content', () => {
  it('requires one valid answer per question', () => {
    const answers = normalizeVipSurveyAnswers({
      most_useful: { optionId: 'lessons', comment: 'nice' },
      linger_screen: { optionId: 'mistake_practice' },
      less_interesting: { optionId: 'unclear_mistakes' },
      first_time_confusing: { optionId: 'what_next' },
      expected_missing: { optionId: 'learning_plan' },
      overloaded_screen: { optionId: 'none' },
      one_thing_week: { comment: 'Упростить главный экран' },
      feature_request: { comment: 'План обучения' },
      friend_recommendation: { comment: 'Помогает учить фразы каждый день' },
      unknown: { optionId: 'yes' },
    });

    expect(VIP_SURVEY_ID).toBe('vip_feedback_v2');
    expect(Object.keys(answers)).toEqual(VIP_SURVEY_QUESTIONS.map((question) => question.id));
    expect(isVipSurveyComplete(answers)).toBe(true);
    expect(getVipSurveyOptionLabel('expected_missing', 'learning_plan', 'ru')).toBe('План обучения');
    expect(answers.one_thing_week).toEqual({ optionId: 'comment', comment: 'Упростить главный экран' });
  });

  it('drops invalid options and incomplete surveys stay incomplete', () => {
    const answers = normalizeVipSurveyAnswers({
      most_useful: { optionId: 'invalid' },
      linger_screen: { optionId: 'lessons' },
      one_thing_week: { comment: '   ' },
    });

    expect(answers).toEqual({ linger_screen: { optionId: 'lessons' } });
    expect(isVipSurveyComplete(answers)).toBe(false);
  });

  it('keeps the weekly priority question in the survey', () => {
    const weeklyQuestion = VIP_SURVEY_QUESTIONS.find((question) => question.id === 'one_thing_week');

    expect(weeklyQuestion?.title.ru).toBe('Что бы вы улучшили прямо на этой неделе?');
    expect(weeklyQuestion?.textOnly).toBe(true);
    expect(weeklyQuestion?.options).toEqual([]);
  });
});
