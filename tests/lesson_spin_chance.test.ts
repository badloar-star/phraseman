// Сторож математики броска «спин за урок» (владелец, 2026-09-17):
// спин — привилегия, шанс 20%, страховка после 8 неудач подряд.

import {
  LESSON_SPIN_CHANCE,
  LESSON_SPIN_PITY_THRESHOLD,
  normalizeLessonSpinMisses,
  rollLessonSpin,
} from '../app/lesson_spin_chance';

describe('rollLessonSpin', () => {
  it('шанс равен 20% — не 100%, иначе спин снова гарантирован', () => {
    expect(LESSON_SPIN_CHANCE).toBe(0.2);
  });

  it('выдаёт спин, когда бросок попал в 20%', () => {
    const outcome = rollLessonSpin({ misses: 0, random: () => 0.19 });
    expect(outcome).toEqual({ granted: true, nextMisses: 0, pity: false });
  });

  it('не выдаёт спин на границе 0.2 — интервал полуоткрытый', () => {
    const outcome = rollLessonSpin({ misses: 0, random: () => 0.2 });
    expect(outcome.granted).toBe(false);
  });

  it('копит счётчик невезения при неудаче', () => {
    const outcome = rollLessonSpin({ misses: 3, random: () => 0.9 });
    expect(outcome).toEqual({ granted: false, nextMisses: 4, pity: false });
  });

  it('сбрасывает счётчик после удачи', () => {
    const outcome = rollLessonSpin({ misses: 5, random: () => 0.01 });
    expect(outcome.nextMisses).toBe(0);
  });

  it('страховка: после 8 неудач подряд спин выдаётся без броска', () => {
    const random = jest.fn(() => 0.99);
    const outcome = rollLessonSpin({ misses: LESSON_SPIN_PITY_THRESHOLD, random });
    expect(outcome).toEqual({ granted: true, nextMisses: 0, pity: true });
    expect(random).not.toHaveBeenCalled();
  });

  it('мусорный генератор трактуется как неудача, а не как тихая выдача', () => {
    expect(rollLessonSpin({ misses: 0, random: () => NaN }).granted).toBe(false);
  });

  it('за 8 уроков подряд без единой удачи девятый даёт спин', () => {
    let misses = 0;
    const results: boolean[] = [];
    for (let i = 0; i < LESSON_SPIN_PITY_THRESHOLD + 1; i++) {
      const outcome = rollLessonSpin({ misses, random: () => 0.99 });
      misses = outcome.nextMisses;
      results.push(outcome.granted);
    }
    expect(results.slice(0, LESSON_SPIN_PITY_THRESHOLD)).toEqual(
      Array(LESSON_SPIN_PITY_THRESHOLD).fill(false),
    );
    expect(results[LESSON_SPIN_PITY_THRESHOLD]).toBe(true);
  });

  it('на длинной дистанции доля выдач держится около 20%', () => {
    // Детерминированный генератор: без страховки доля обязана совпасть с шансом.
    let seed = 1;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    let granted = 0;
    for (let i = 0; i < 20000; i++) {
      // misses = 0 каждый раз — меряем чистый шанс, без вмешательства страховки.
      if (rollLessonSpin({ misses: 0, random }).granted) granted++;
    }
    const rate = granted / 20000;
    expect(rate).toBeGreaterThan(0.18);
    expect(rate).toBeLessThan(0.22);
  });
});

describe('normalizeLessonSpinMisses', () => {
  it('отсутствие поля и мусор читаются как 0 — старые состояния не ломаются', () => {
    expect(normalizeLessonSpinMisses(undefined)).toBe(0);
    expect(normalizeLessonSpinMisses(null)).toBe(0);
    expect(normalizeLessonSpinMisses('нет')).toBe(0);
    expect(normalizeLessonSpinMisses(-5)).toBe(0);
    expect(normalizeLessonSpinMisses(1.5)).toBe(0);
  });

  it('раздутое значение подрезается порогом, а не живёт в хранилище', () => {
    expect(normalizeLessonSpinMisses(9_000_000)).toBe(LESSON_SPIN_PITY_THRESHOLD);
  });

  it('обычное значение проходит как есть', () => {
    expect(normalizeLessonSpinMisses(3)).toBe(3);
  });
});
