import {
  getPersonalPlanQuizCoverage,
  getPersonalPlanQuizPhrases,
  getPersonalPlanQuizTaskCopy,
} from '../app/personal_plan_quizzes';

const MOJIBAKE_RE = /[\u00d0\u00d1\u00c2\u00e2]/;
const QUIZ_ID = 'gavan_day1_short_replies_quiz';

function allVisibleText(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(allVisibleText);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(allVisibleText);
  }
  return [];
}

describe('personal plan quiz live route', () => {
  it('ships a clean day 1 quiz with exactly ten unambiguous questions', () => {
    const quiz = getPersonalPlanQuizPhrases(QUIZ_ID, 'Beta8958');

    expect(quiz).not.toBeNull();
    expect(quiz).toHaveLength(10);

    for (const item of quiz ?? []) {
      expect(item.questionId).toMatch(/^gavan_d1_q\d+$/);
      expect(item.quizItemType).toBe('personal_plan');
      expect(item.skillTag).toBe('personal_plan_day_quiz');
      expect(item.level).toBe('A1');
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices).size).toBe(4);
      const correct = Array.isArray(item.correct) ? item.correct[0] : item.correct;
      expect(correct).toBeGreaterThanOrEqual(0);
      expect(correct).toBeLessThan(item.choices.length);
      expect(item.answer).toBe(item.choices[correct]);
      expect(item.explanations).toHaveLength(item.choices.length);
      expect(item.explanationsUK).toHaveLength(item.choices.length);
      expect(item.explanationsES).toHaveLength(item.choices.length);
      expect(allVisibleText(item).join('\n')).not.toMatch(MOJIBAKE_RE);
      expect(allVisibleText(item).join('\n')).not.toContain('{{name}}');
    }
  });

  it('uses product-ready task copy for choice and typing modes', () => {
    const choiceCopy = getPersonalPlanQuizTaskCopy(QUIZ_ID, 'ru', 'choice');
    const typingCopy = getPersonalPlanQuizTaskCopy(QUIZ_ID, 'ru', 'typing');

    expect(choiceCopy).toEqual({
      title: 'Проверка дня',
      body: 'Выбери фразу, которая лучше всего передает смысл. Варианты похожи, но правильный только один.',
    });
    expect(typingCopy).toEqual({
      title: 'Собери ответ',
      body: 'Вспомни короткую фразу дня и введи ее без подсказок. Проверяем спокойный ответ, а не скорость ради скорости.',
    });
    expect(allVisibleText([choiceCopy, typingCopy]).join('\n')).not.toMatch(MOJIBAKE_RE);
  });

  it('covers every quiz question with approved day 1 plan phrases only', () => {
    const quiz = getPersonalPlanQuizPhrases(QUIZ_ID, 'Sam') ?? [];
    const coverage = getPersonalPlanQuizCoverage(QUIZ_ID);

    expect(coverage).not.toBeNull();
    expect(Object.keys(coverage ?? {})).toEqual(quiz.map((item) => item.questionId));

    for (const item of quiz) {
      const questionId = String(item.questionId ?? '');
      const sources = coverage?.[questionId] ?? [];
      expect(sources.length).toBeGreaterThan(0);
      for (const source of sources) {
        expect(source.type).toBe('plan_phrase');
        if (source.type === 'plan_phrase') {
          expect(source.lessonId).toBe('gavan_day1_short_replies');
          expect(source.phraseId).toMatch(/^gavan_d1_phrase_[1-5]$/);
        }
      }
    }
  });

  it('keeps old reset placeholders disabled', () => {
    expect(getPersonalPlanQuizPhrases('gavan_day1_identity', 'Alex')).toBeNull();
    expect(getPersonalPlanQuizPhrases('gavan_day2_address', 'Alex')).toBeNull();
    expect(getPersonalPlanQuizCoverage('gavan_day1_identity')).toBeNull();
    expect(getPersonalPlanQuizCoverage('gavan_day2_address')).toBeNull();
    expect(getPersonalPlanQuizTaskCopy('gavan_day1_identity', 'ru', 'choice')).toBeNull();
    expect(getPersonalPlanQuizTaskCopy('gavan_day2_address', 'ru', 'choice')).toBeNull();
  });
});
