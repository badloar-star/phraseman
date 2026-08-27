/**
 * Сторож правил владельца по рунам за учёбу (2026-08-27). Здесь проверяются
 * именно те условия, которые он проговорил словами — чтобы будущая правка не
 * увела механику незаметно.
 */
import {
  awardPracticeRune,
  createPracticeRuneEarnings,
  isPracticeRuneItemCredited,
  parsePracticeRuneEarnings,
  practiceRuneEarningsStorageKey,
  practiceRuneSettlementOperationId,
  settlePracticeRuneEarnings,
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
    expect(id).toMatch(/^practice_rune:[a-z_]+:[A-Za-z0-9_-]+:\d+$/);
  });
});
