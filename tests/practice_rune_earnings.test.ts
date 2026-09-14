/**
 * Сторож правил владельца по рунам за учёбу (2026-08-27). Здесь проверяются
 * именно те условия, которые он проговорил словами — чтобы будущая правка не
 * увела механику незаметно.
 */
import {
  awardPracticeRune,
  createPracticeRuneEarnings,
  isPracticeRuneItemCredited,
  parsePracticeRuneAccumulator,
  parsePracticeRuneEarnings,
  practiceRuneEarningsStorageKey,
  practiceRuneSettlementOperationId,
  settlePracticeRuneEarnings,
  serializePracticeRuneAccumulator,
  PRACTICE_RUNE_FULL_AWARD,
  PRACTICE_RUNE_REPEAT_AWARD,
} from '../app/practice_rune_earnings';

const base = () => createPracticeRuneEarnings({
  activity: 'vocabulary',
  sessionKey: 'lesson-1',
  firstCompletion: true,
});

describe('practice rune earnings', () => {
  test('правильный ответ даёт 3 руны на первом прохождении', () => {
    const result = awardPracticeRune(base(), 'word:apple');
    expect(result.awarded).toBe(PRACTICE_RUNE_FULL_AWARD);
    expect(result.earnings.pendingRunes).toBe(3);
  });

  test('повторное прохождение платит по 1 руне вместо 3', () => {
    const repeat = createPracticeRuneEarnings({
      activity: 'vocabulary',
      sessionKey: 'lesson-1',
      firstCompletion: false,
    });
    const result = awardPracticeRune(repeat, 'word:apple');
    expect(result.awarded).toBe(PRACTICE_RUNE_REPEAT_AWARD);
    expect(result.earnings.pendingRunes).toBe(1);
  });

  test('один элемент приносит руны ровно один раз за сессию', () => {
    const first = awardPracticeRune(base(), 'word:apple');
    const second = awardPracticeRune(first.earnings, 'word:apple');
    expect(second.awarded).toBe(0);
    expect(second.earnings.pendingRunes).toBe(3);
    expect(isPracticeRuneItemCredited(second.earnings, 'word:apple')).toBe(true);
  });

  test('разные элементы копятся', () => {
    const a = awardPracticeRune(base(), 'word:apple');
    const b = awardPracticeRune(a.earnings, 'word:table');
    expect(b.earnings.pendingRunes).toBe(6);
  });

  test('урок повышает награду на каждом десятом уровне непрерывной серии без потолка', () => {
    type AwardWithStreak = (
      earnings: ReturnType<typeof base>,
      itemId: string,
      correctStreak?: number,
    ) => ReturnType<typeof awardPracticeRune>;
    const awardWithStreak = awardPracticeRune as AwardWithStreak;
    let earnings = createPracticeRuneEarnings({
      activity: 'lesson', sessionKey: 'lesson-streak', firstCompletion: true,
    });
    const awards: number[] = [];

    for (let streak = 1; streak <= 100; streak += 1) {
      const result = awardWithStreak(earnings, `cell-${streak}`, streak);
      earnings = result.earnings;
      awards.push(result.awarded);
    }

    expect(awards[8]).toBe(3);
    expect(awards[9]).toBe(4);
    expect(awards[18]).toBe(4);
    expect(awards[19]).toBe(5);
    expect(awards[99]).toBe(13);
  });

  test('бонус серии урока складывается с anti-farm ценой повтора и не действует в других активностях', () => {
    type AwardWithStreak = typeof awardPracticeRune extends (...args: infer _Args) => infer Result
      ? (earnings: PracticeRuneEarningsForTest, itemId: string, correctStreak?: number) => Result
      : never;
    type PracticeRuneEarningsForTest = ReturnType<typeof createPracticeRuneEarnings>;
    const awardWithStreak = awardPracticeRune as AwardWithStreak;
    const repeatLesson = createPracticeRuneEarnings({
      activity: 'lesson', sessionKey: 'lesson-repeat-streak', firstCompletion: false,
    });
    let repeatProgress = repeatLesson;
    for (let streak = 1; streak < 10; streak += 1) {
      repeatProgress = awardWithStreak(repeatProgress, `cell-${streak}`, streak).earnings;
    }

    expect(awardWithStreak(repeatProgress, 'cell-10', 10).awarded).toBe(2);
    expect(awardWithStreak(base(), 'word:apple', 100).awarded).toBe(3);
  });

  test('копилка неизменяема — исходный объект не мутируется', () => {
    const start = base();
    awardPracticeRune(start, 'word:apple');
    expect(start.pendingRunes).toBe(0);
    expect(start.creditedItemIds).toHaveLength(0);
  });

  test('зачёт обнуляет копилку, но помнит оплаченные элементы', () => {
    const earned = awardPracticeRune(base(), 'word:apple').earnings;
    const settled = settlePracticeRuneEarnings(earned);
    expect(settled.pendingRunes).toBe(0);
    // Иначе повторный проход без выхода начислил бы за то же слово второй раз.
    expect(isPracticeRuneItemCredited(settled, 'word:apple')).toBe(true);
    expect(awardPracticeRune(settled, 'word:apple').awarded).toBe(0);
  });
});

describe('practice rune earnings persistence', () => {
  test('v2 accumulator durably binds pending earnings to one completion ordinal', () => {
    const earned = awardPracticeRune(base(), 'word:apple').earnings;
    const raw = serializePracticeRuneAccumulator(earned, 2);

    expect(parsePracticeRuneAccumulator(raw, {
      activity: 'vocabulary', sessionKey: 'lesson-1',
    })).toEqual({
      schemaVersion: 'practice-rune-accumulator.v2',
      earnings: earned,
      completionOrdinal: 2,
    });
  });

  test('legacy raw earnings migrate without inventing an ordinal', () => {
    const earned = awardPracticeRune(base(), 'word:apple').earnings;

    expect(parsePracticeRuneAccumulator(JSON.stringify(earned), {
      activity: 'vocabulary', sessionKey: 'lesson-1',
    })).toEqual({
      schemaVersion: 'practice-rune-accumulator.v2',
      earnings: earned,
      completionOrdinal: null,
    });
  });

  test('сохранённая копилка восстанавливается целиком', () => {
    const earned = awardPracticeRune(base(), 'word:apple').earnings;
    const restored = parsePracticeRuneEarnings(JSON.stringify(earned), {
      activity: 'vocabulary',
      sessionKey: 'lesson-1',
    });
    expect(restored).toEqual(earned);
  });

  test('копилка чужой сессии или активности не принимается', () => {
    const earned = awardPracticeRune(base(), 'word:apple').earnings;
    expect(parsePracticeRuneEarnings(JSON.stringify(earned), {
      activity: 'vocabulary', sessionKey: 'lesson-2',
    })).toBeNull();
    expect(parsePracticeRuneEarnings(JSON.stringify(earned), {
      activity: 'flashcards_blitz', sessionKey: 'lesson-1',
    })).toBeNull();
  });

  test('копилка с завышенным счётом отбрасывается', () => {
    // Подменённый файл обещает 300 рун за один элемент — это не прогресс.
    const forged = JSON.stringify({
      schemaVersion: 'practice-rune-earnings.v1',
      activity: 'vocabulary',
      sessionKey: 'lesson-1',
      awardPerItem: 3,
      creditedItemIds: ['word:apple'],
      pendingRunes: 300,
    });
    expect(parsePracticeRuneEarnings(forged, {
      activity: 'vocabulary', sessionKey: 'lesson-1',
    })).toBeNull();
  });

  test('парсер принимает только достижимую верхнюю границу бонуса серии урока', () => {
    const creditedItemIds = Array.from({ length: 20 }, (_, index) => `cell-${index + 1}`);
    const lesson = (pendingRunes: number) => JSON.stringify({
      schemaVersion: 'practice-rune-earnings.v1',
      activity: 'lesson',
      sessionKey: 'lesson-streak-parser',
      awardPerItem: 3,
      creditedItemIds,
      pendingRunes,
    });

    // 20 × 3 base + (1 × 10 answers at 10–19) + (2 × answer 20) = 72.
    expect(parsePracticeRuneEarnings(lesson(72), {
      activity: 'lesson', sessionKey: 'lesson-streak-parser',
    })?.pendingRunes).toBe(72);
    expect(parsePracticeRuneEarnings(lesson(73), {
      activity: 'lesson', sessionKey: 'lesson-streak-parser',
    })).toBeNull();

    const forgedOtherActivity = JSON.stringify({
      schemaVersion: 'practice-rune-earnings.v1',
      activity: 'vocabulary',
      sessionKey: 'lesson-1',
      awardPerItem: 3,
      creditedItemIds: ['word:apple'],
      pendingRunes: 4,
    });
    expect(parsePracticeRuneEarnings(forgedOtherActivity, {
      activity: 'vocabulary', sessionKey: 'lesson-1',
    })).toBeNull();
  });

  test('мусор и битый JSON не роняют разбор', () => {
    for (const raw of ['', '{', 'null', '[]', '{"a":1}']) {
      expect(parsePracticeRuneEarnings(raw, {
        activity: 'vocabulary', sessionKey: 'lesson-1',
      })).toBeNull();
    }
  });

  test('ключ хранения разделяет аккаунты, активности и сессии', () => {
    const key = (ownerStableId: string, sessionKey: string) =>
      practiceRuneEarningsStorageKey({ ownerStableId, activity: 'vocabulary', sessionKey });
    expect(key('user-a', 'lesson-1')).not.toBe(key('user-b', 'lesson-1'));
    expect(key('user-a', 'lesson-1')).not.toBe(key('user-a', 'lesson-2'));
  });
});

describe('practice rune settlement receipt', () => {
  test('одна сессия — одна расписка, повторный проход даёт новую', () => {
    const first = practiceRuneSettlementOperationId({
      activity: 'vocabulary', sessionKey: 'lesson-1', completionOrdinal: 1,
    });
    const again = practiceRuneSettlementOperationId({
      activity: 'vocabulary', sessionKey: 'lesson-1', completionOrdinal: 1,
    });
    const second = practiceRuneSettlementOperationId({
      activity: 'vocabulary', sessionKey: 'lesson-1', completionOrdinal: 2,
    });
    expect(first).toBe(again);
    expect(first).not.toBe(second);
  });

  test('идентификатор безопасен для ключей — только допустимые символы', () => {
    const id = practiceRuneSettlementOperationId({
      activity: 'vocabulary', sessionKey: 'урок/1 набор', completionOrdinal: 1,
    });
    // зачем (аудит 2026-08-27): журнал рун принимает РОВНО ОДНО двоеточие
    // (OP_ID_RE в stars_ledger.ts) — прежний формат с тремя двоеточиями
    // отвергался бы сервером на каждом вызове.
    expect(id).toMatch(/^practice_rune:[a-z_]+_[A-Za-z0-9_-]+_\d+$/);
    expect(id.split(':')).toHaveLength(2);
  });

  test('четырёхзначный ordinal остаётся в 96-символьном хвосте журнала', () => {
    const sessionKey = 's'.repeat(72);
    const historical = practiceRuneSettlementOperationId({
      activity: 'flashcards_training', sessionKey, completionOrdinal: 999,
    });
    const overflow = practiceRuneSettlementOperationId({
      activity: 'flashcards_training', sessionKey, completionOrdinal: 1000,
    });

    expect(historical).toBe(`practice_rune:flashcards_training_${sessionKey}_999`);
    expect(overflow).toMatch(/^practice_rune:[A-Za-z0-9_.-]{1,96}$/);
    expect(overflow.split(':')[1]).toHaveLength(96);
  });
});
