/**
 * cards-2.0 (E8): обратная совместимость active_recall_items (§3.7).
 * Старые записи БЕЗ поля source (и без новых полей вообще) читаются без миграции
 * и ведут себя как 'lesson'; новые источники 'custom'/'pack' пишутся recordMistake
 * и переживают перечитывание; фильтр arena-записей не задевает custom/pack.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  countDueItemsToday,
  getAllItems,
  getDueItems,
  markReviewed,
  recordMistake,
  type RecallItem,
} from '../app/active_recall';

const STORAGE_KEY = 'active_recall_items';
const DAY = 24 * 60 * 60 * 1000;

/** Запись формата ДО E8 — поля source нет вовсе (легаси-диск). */
function legacyItem(phrase: string, extra: Partial<RecallItem> = {}): Omit<RecallItem, 'source'> {
  const now = Date.now();
  return {
    phrase,
    correctAnswer: `ru ${phrase}`,
    correctAnswerUK: `uk ${phrase}`,
    lessonId: 3,
    errorCount: 2,
    repetitions: 1,
    interval: 1,
    easeFactor: 2.3,
    createdAt: now - DAY,
    lastReviewed: now - DAY,
    nextDue: now - 1000, // просрочено -> due сегодня
    ...extra,
  };
}

beforeEach(async () => {
  await (AsyncStorage as unknown as { clear: () => Promise<void> }).clear();
  jest.clearAllMocks();
});

describe('старые записи без поля source', () => {
  it('читаются без миграции: source остаётся undefined (поведение lesson)', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([legacyItem('He is in the kitchen'), legacyItem('She went to the store')]),
    );
    const items = await getAllItems();
    expect(items).toHaveLength(2);
    for (const it of items) {
      expect(it.source).toBeUndefined();
      expect(it.correctAnswer).toMatch(/^ru /);
    }
    expect(await countDueItemsToday()).toBe(2);
  });

  it('getDueItems возвращает старые записи и SM-2 (markReviewed) работает', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([legacyItem('Old phrase here')]));
    const due = await getDueItems(7);
    expect(due.map((i) => i.phrase)).toEqual(['Old phrase here']);

    await markReviewed('Old phrase here', true);
    const after = await getAllItems();
    expect(after[0].repetitions).toBe(2);
    expect(after[0].nextDue).toBeGreaterThan(Date.now());
    // поле source по-прежнему не появилось из ниоткуда
    expect(after[0].source).toBeUndefined();
  });
});

describe("новые источники 'custom' / 'pack' (E8)", () => {
  it('recordMistake пишет source и запись переживает перечитывание', async () => {
    await recordMistake('hit the road', 'отправиться в путь', 0, 'вирушити в дорогу', 'custom');
    await recordMistake('by order of the peaky blinders', 'по приказу', 0, undefined, 'pack');

    const items = await getAllItems();
    const custom = items.find((i) => i.phrase === 'hit the road');
    const pack = items.find((i) => i.phrase === 'by order of the peaky blinders');
    expect(custom?.source).toBe('custom');
    expect(custom?.correctAnswerUK).toBe('вирушити в дорогу');
    expect(custom?.lessonId).toBe(0);
    expect(pack?.source).toBe('pack');
    // nextDue = завтра — попадёт в очередь review следующего дня (§3.7)
    expect(custom!.nextDue).toBeGreaterThan(Date.now());
  });

  it('сосуществуют со старыми записями; arena-фильтр не задевает custom/pack', async () => {
    const arenaItem = { ...legacyItem('Arena leftover'), source: 'arena' as const };
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([legacyItem('Legacy phrase'), arenaItem]),
    );
    await recordMistake('my custom card', 'моя карточка', 0, undefined, 'custom');

    const items = await getAllItems();
    const phrases = items.map((i) => i.phrase).sort();
    // arena-записи вычищаются существующей коррекцией, legacy и custom живут
    expect(phrases).toEqual(['Legacy phrase', 'my custom card']);
    expect(items.find((i) => i.phrase === 'my custom card')?.source).toBe('custom');
    expect(items.find((i) => i.phrase === 'Legacy phrase')?.source).toBeUndefined();
  });

  it('повторная ошибка по той же кастомной карточке обновляет счётчик, не дублирует', async () => {
    await recordMistake('take it easy', 'не парься', 0, undefined, 'custom');
    await recordMistake('take it easy', 'не парься', 0, undefined, 'custom');
    const items = await getAllItems();
    expect(items).toHaveLength(1);
    expect(items[0].errorCount).toBe(2);
    expect(items[0].source).toBe('custom');
  });
});
