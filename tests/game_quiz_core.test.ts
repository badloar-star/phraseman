/** Игры «Память», «Точное слово», «Три формы»: примеры из макета годны, ответ считается один раз. */
import {
  INITIAL_QUIZ_STATE, QUIZ_SEED_DECKS, answerQuiz, isQuizKind, isValidQuizRound, nextQuizRound,
} from '../modules/games/quiz_core';
import { SKILL_POINT_RULES } from '../modules/skills/skill_points_table';

it('все примеры из макета годны и ссылаются на строки таблицы навыков', () => {
  for (const deck of Object.values(QUIZ_SEED_DECKS)) {
    expect(deck.rounds.length).toBeGreaterThan(0);
    expect(deck.rounds.every(isValidQuizRound)).toBe(true);
    expect(SKILL_POINT_RULES[deck.skillAction]).toBeDefined();
  }
  expect(SKILL_POINT_RULES[QUIZ_SEED_DECKS.forms.skillAction].skill).toBe('grammar');
  expect(SKILL_POINT_RULES[QUIZ_SEED_DECKS.memory.skillAction].skill).toBe('vocab');
});

it('негодный раунд отсекается', () => {
  const round = QUIZ_SEED_DECKS.exact.rounds[0];
  expect(isValidQuizRound({ ...round, correctIndex: 5 })).toBe(false);
  expect(isValidQuizRound({ ...round, options: ['listen', 'Listen'] })).toBe(false);
});

it('ответ считается, раунд двигается отдельным шагом', () => {
  const round = QUIZ_SEED_DECKS.forms.rounds[0];
  const ok = answerQuiz(INITIAL_QUIZ_STATE, round, 1);
  expect(ok).toMatchObject({ correct: true, state: { index: 0, correct: 1, misses: 0 } });
  const miss = answerQuiz(nextQuizRound(ok.state), QUIZ_SEED_DECKS.forms.rounds[1], 2);
  expect(miss).toMatchObject({ correct: false, state: { index: 1, correct: 1, misses: 1 } });
});

it('узнаёт только известные виды игр', () => {
  expect(isQuizKind('memory')).toBe(true);
  expect(isQuizKind('listen')).toBe(false);
});
