import { getPersonalPlanQuiz, validatePersonalPlanQuiz } from '../app/personal_plan_quizzes';
test('plan quiz loader provides ten valid authored and generated questions', () => { for (const id of ['gavan_day1_short_replies_quiz', 'mitap_day_20_quiz']) { const quiz = getPersonalPlanQuiz(id); expect(quiz?.questions).toHaveLength(10); expect(validatePersonalPlanQuiz(quiz!)).toEqual([]); } });
test('quiz answers use deterministic varied correct-choice positions', () => {
  const quiz = getPersonalPlanQuiz('gavan_day1_short_replies_quiz')!;
  const positions = quiz.questions.map((question) => question.choices.findIndex((choice) => choice.isCorrect));
  expect(new Set(positions).size).toBeGreaterThan(1);
  expect(positions).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 0, 1]);
});
