import {
  hasOpponentAnswered,
  isLastQuestionDrama,
  resolveMatchOutcome,
} from '../app/arena_match_drama';
import type { SessionPlayer } from '../app/types/arena';

function playerWithAnswers(count: number): Pick<SessionPlayer, 'answers'> {
  return {
    answers: Array.from({ length: count }, (_, i) => ({
      questionId: `q${i}`,
      answer: 'a',
      isCorrect: true,
      timeMs: 1000,
      points: 100,
    })),
  };
}

describe('hasOpponentAnswered', () => {
  it('false когда соперника нет', () => {
    expect(hasOpponentAnswered(null, 0)).toBe(false);
    expect(hasOpponentAnswered(undefined, 0)).toBe(false);
  });

  it('false пока соперник не сдал ответ на текущий вопрос', () => {
    // на 0-м вопросе, ответов ещё 0
    expect(hasOpponentAnswered(playerWithAnswers(0), 0)).toBe(false);
    // на 2-м вопросе соперник ответил только на 0 и 1 (length=2 → индекс 2 ещё нет)
    expect(hasOpponentAnswered(playerWithAnswers(2), 2)).toBe(false);
  });

  it('true когда длина answers покрывает текущий индекс', () => {
    expect(hasOpponentAnswered(playerWithAnswers(1), 0)).toBe(true);
    expect(hasOpponentAnswered(playerWithAnswers(3), 2)).toBe(true);
  });

  it('защищается от мусорного индекса', () => {
    expect(hasOpponentAnswered(playerWithAnswers(5), -1)).toBe(false);
    expect(hasOpponentAnswered(playerWithAnswers(5), NaN)).toBe(false);
  });
});

describe('isLastQuestionDrama', () => {
  const base = { totalQuestions: 10, myScore: 500, opponentScore: 500 };

  it('срабатывает на последнем вопросе при равном/близком счёте', () => {
    expect(isLastQuestionDrama({ ...base, currentQuestionIndex: 9 })).toBe(true);
    expect(
      isLastQuestionDrama({ ...base, currentQuestionIndex: 9, myScore: 500, opponentScore: 420 }),
    ).toBe(true);
  });

  it('НЕ срабатывает если вопрос не последний', () => {
    expect(isLastQuestionDrama({ ...base, currentQuestionIndex: 5 })).toBe(false);
  });

  it('НЕ срабатывает если счёт уже не близкий', () => {
    expect(
      isLastQuestionDrama({ ...base, currentQuestionIndex: 9, myScore: 800, opponentScore: 300 }),
    ).toBe(false);
  });

  it('кастомный порог близости', () => {
    expect(
      isLastQuestionDrama({
        ...base,
        currentQuestionIndex: 9,
        myScore: 800,
        opponentScore: 300,
        closeThreshold: 500,
      }),
    ).toBe(true);
  });

  it('защищается от мусорных входов', () => {
    expect(isLastQuestionDrama({ ...base, currentQuestionIndex: 9, totalQuestions: 0 })).toBe(false);
  });
});

describe('resolveMatchOutcome', () => {
  it('победа / поражение / ничья', () => {
    expect(resolveMatchOutcome(700, 400)).toBe('win');
    expect(resolveMatchOutcome(300, 900)).toBe('loss');
    expect(resolveMatchOutcome(500, 500)).toBe('draw');
  });

  it('нечисловые входы трактуются как 0', () => {
    expect(resolveMatchOutcome(NaN as unknown as number, 0)).toBe('draw');
    expect(resolveMatchOutcome(100, NaN as unknown as number)).toBe('win');
  });
});
