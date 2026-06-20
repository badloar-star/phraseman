import { computeCompassDayWeight, shouldCreditTopic } from '../app/compass/compass_economy';
import type { CompassDay } from '../app/compass/compass_brain';

function day(partial: Partial<CompassDay>): CompassDay {
  return { type: 'easy', tasks: [], ...partial };
}

describe('compass_economy — справедливый вес дня', () => {
  it('насыщенный день (погружение) весит больше и достоин бонуса', () => {
    const w = computeCompassDayWeight(
      day({
        type: 'deep_dive',
        tasks: [
          { kind: 'lesson_dive', minutes: 5 },
          { kind: 'mistake_repair', minutes: 3 },
          { kind: 'pronunciation', minutes: 1 },
        ],
      }),
    );
    expect(w.baseXP).toBe(10 + 8 + 6);
    expect(w.shards).toBe(3);
    expect(w.eligibleForBonus).toBe(true);
  });

  it('лёгкий день из 2 задач — без бонуса, осколки как раньше (2)', () => {
    const w = computeCompassDayWeight(
      day({ tasks: [{ kind: 'plan_continue', minutes: 4 }, { kind: 'pronunciation', minutes: 1 }] }),
    );
    expect(w.baseXP).toBe(6 + 6);
    expect(w.shards).toBe(2);
    expect(w.eligibleForBonus).toBe(false);
  });

  it('день с погружением всегда достоин бонуса, даже если задач мало', () => {
    const w = computeCompassDayWeight(day({ tasks: [{ kind: 'lesson_dive', minutes: 5 }] }));
    expect(w.eligibleForBonus).toBe(true);
  });
});

describe('compass_economy — анти-фарм одного смысла', () => {
  it('новую тему засчитываем', () => {
    expect(shouldCreditTopic({ topic: 'article', alreadyCreditedTopicsToday: ['verb'] })).toBe(true);
  });

  it('уже засчитанную сегодня тему НЕ задваиваем (регистр/пробелы игнор)', () => {
    expect(shouldCreditTopic({ topic: ' Article ', alreadyCreditedTopicsToday: ['article'] })).toBe(false);
  });

  it('пустая тема не засчитывается', () => {
    expect(shouldCreditTopic({ topic: '  ', alreadyCreditedTopicsToday: [] })).toBe(false);
  });
});
