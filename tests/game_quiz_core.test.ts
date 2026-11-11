/** Игры «Память», «Точное слово», «Три формы»: примеры из макета годны, ответ считается один раз. */
import {
  INITIAL_QUIZ_STATE, QUIZ_SEED_DECKS, answerQuiz, isQuizKind, isValidQuizRound, nextQuizRound, shuffledQuizRound,
} from '../modules/games/quiz_core';
import { quizDeckFor } from '../modules/games/task_source';

describe('shuffledQuizRound — верный вариант нельзя угадать по месту', () => {
  const round = QUIZ_SEED_DECKS.listen.rounds[0];

  it('после перемешивания верный вариант — тот же текст, раунд остаётся корректным', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      let s = seed + 1;
      const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      const out = shuffledQuizRound(round, rng);
      expect(out.options[out.correctIndex]).toBe(round.options[round.correctIndex]);
      expect([...out.options].sort()).toEqual([...round.options].sort());
      expect(isValidQuizRound(out)).toBe(true);
    }
  });

  it('исходный раунд не меняется', () => {
    const before = JSON.stringify(round);
    shuffledQuizRound(round, () => 0.9);
    expect(JSON.stringify(round)).toBe(before);
  });

  it('странный генератор (NaN, 1, отрицательное) не ломает раунд', () => {
    for (const bad of [Number.NaN, 1, -5, Number.POSITIVE_INFINITY]) {
      const out = shuffledQuizRound(round, () => bad);
      expect(out.options[out.correctIndex]).toBe(round.options[round.correctIndex]);
      expect(isValidQuizRound(out)).toBe(true);
    }
  });

  it('нажатия «сверху вниз по кругу» больше не дают все верные ответы в немецком «На слух»', () => {
    const rounds = quizDeckFor('listen', 'de', 1)?.rounds ?? [];
    expect(rounds.length).toBeGreaterThan(2);
    let s = 7;
    const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const shuffled = rounds.map((r) => shuffledQuizRound(r, rng));
    const cyclicHits = shuffled.filter((r, i) => r.correctIndex === i % r.options.length).length;
    expect(cyclicHits).toBeLessThan(shuffled.length);
  });
});
import { SKILL_POINT_RULES } from '../modules/skills/skill_points_table';

it('все примеры из макета годны и ссылаются на строки таблицы навыков', () => {
  for (const deck of Object.values(QUIZ_SEED_DECKS)) {
    expect(deck.rounds.length).toBeGreaterThan(0);
    expect(deck.rounds.every(isValidQuizRound)).toBe(true);
    expect(SKILL_POINT_RULES[deck.skillAction]).toBeDefined();
  }
  expect(SKILL_POINT_RULES[QUIZ_SEED_DECKS.forms.skillAction].skill).toBe('grammar');
  expect(SKILL_POINT_RULES[QUIZ_SEED_DECKS.memory.skillAction].skill).toBe('vocab');
  expect(SKILL_POINT_RULES[QUIZ_SEED_DECKS.listen.skillAction].skill).toBe('listening');
});

it('негодный раунд отсекается', () => {
  const round = QUIZ_SEED_DECKS.exact.rounds[0];
  expect(isValidQuizRound({ ...round, correctIndex: 5 })).toBe(false);
  expect(isValidQuizRound({ ...round, options: ['listen', 'Listen'] })).toBe(false);
});

it('«На слух»: верный вариант обязан дословно совпадать с тем, что произносится', () => {
  const round = QUIZ_SEED_DECKS.listen.rounds[2];
  expect(isValidQuizRound(round)).toBe(true);
  expect(isValidQuizRound({ ...round, correctIndex: 0 })).toBe(false);
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
  expect(isQuizKind('listen')).toBe(true);
  expect(isQuizKind('nope')).toBe(false);
});
