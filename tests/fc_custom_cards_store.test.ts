/**
 * cards-2.0 (E7): очередь записи custom_flashcards_v2 (custom_cards_store).
 * Покрытие: upsert/delete/restore; undo восстанавливает карточку на прежнее место;
 * ПАРАЛЛЕЛЬНЫЕ upsert + delete через Promise.all не теряют данные (mutex-очередь,
 * functional-update без потерянных апдейтов); формат данных сохраняется 1:1
 * (незнакомые поля элементов не отбрасываются); битый JSON читается как [].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetCustomCardsStoreForTests,
  deleteCustomCard,
  listCustomCards,
  restoreCustomCard,
  updateCustomCards,
  upsertCustomCard,
} from '../app/flashcards/custom_cards_store';
import { customFlashcardsKey } from '../app/target_storage_keys';

const FLASHCARDS_CUSTOM_KEY = customFlashcardsKey();
import type { CardItem } from '../app/flashcards/types';

const card = (id: string, extra: Partial<CardItem> = {}): CardItem => ({
  id,
  en: `en_${id}`,
  ru: `ru_${id}`,
  uk: `uk_${id}`,
  categoryId: 'custom',
  isSystem: false,
  ...extra,
});

async function readDisk(): Promise<CardItem[]> {
  const raw = await AsyncStorage.getItem(FLASHCARDS_CUSTOM_KEY);
  return raw ? (JSON.parse(raw) as CardItem[]) : [];
}

beforeEach(async () => {
  await (AsyncStorage as unknown as { clear: () => Promise<void> }).clear();
  __resetCustomCardsStoreForTests();
  jest.clearAllMocks();
});

describe('custom_cards_store: базовые операции', () => {
  it('upsert создаёт карточку, повторный upsert по id обновляет без дубликата', async () => {
    await upsertCustomCard(card('a'));
    await upsertCustomCard(card('b'));
    await upsertCustomCard(card('a', { en: 'updated' }));
    const cards = await listCustomCards();
    expect(cards.map((c) => c.id)).toEqual(['a', 'b']);
    expect(cards[0].en).toBe('updated');
    // и на диске то же самое
    expect((await readDisk()).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('delete возвращает снапшот с индексом; отсутствующая карточка -> null', async () => {
    await upsertCustomCard(card('a'));
    await upsertCustomCard(card('b'));
    await upsertCustomCard(card('c'));
    const removed = await deleteCustomCard('b');
    expect(removed).not.toBeNull();
    expect(removed!.card.id).toBe('b');
    expect(removed!.index).toBe(1);
    expect((await listCustomCards()).map((c) => c.id)).toEqual(['a', 'c']);
    expect(await deleteCustomCard('b')).toBeNull();
  });

  it('формат 1:1 — незнакомые поля элементов переживают чужие операции', async () => {
    const legacy = { ...card('legacy'), someFutureField: { nested: true }, extra: 42 };
    await AsyncStorage.setItem(FLASHCARDS_CUSTOM_KEY, JSON.stringify([legacy]));
    await upsertCustomCard(card('new'));
    const disk = await readDisk();
    expect(disk[0]).toEqual(legacy);
    expect(disk.map((c) => c.id)).toEqual(['legacy', 'new']);
  });

  it('битый JSON в ключе читается как пустой список, запись чинит ключ', async () => {
    await AsyncStorage.setItem(FLASHCARDS_CUSTOM_KEY, '{oops');
    expect(await listCustomCards()).toEqual([]);
    await upsertCustomCard(card('a'));
    expect((await readDisk()).map((c) => c.id)).toEqual(['a']);
  });
});

describe('custom_cards_store: undo восстанавливает', () => {
  it('restore возвращает карточку на прежнее место (индекс из снапшота delete)', async () => {
    await upsertCustomCard(card('a'));
    await upsertCustomCard(card('b'));
    await upsertCustomCard(card('c'));
    const removed = await deleteCustomCard('b');
    await restoreCustomCard(removed!.card, removed!.index);
    expect((await listCustomCards()).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('restore идемпотентен — двойной тап «Вернуть» не создаёт дубликат', async () => {
    await upsertCustomCard(card('a'));
    const removed = await deleteCustomCard('a');
    await Promise.all([
      restoreCustomCard(removed!.card, removed!.index),
      restoreCustomCard(removed!.card, removed!.index),
    ]);
    expect((await listCustomCards()).map((c) => c.id)).toEqual(['a']);
  });

  it('restore с индексом за границами клампится, без индекса — в конец', async () => {
    await upsertCustomCard(card('a'));
    await restoreCustomCard(card('z'), 99);
    await restoreCustomCard(card('tail'));
    expect((await listCustomCards()).map((c) => c.id)).toEqual(['a', 'z', 'tail']);
  });
});

describe('custom_cards_store: конкурентные записи не теряют данные', () => {
  it('параллельные upsert + delete (Promise.all) — оба апдейта применены', async () => {
    await upsertCustomCard(card('keep'));
    await upsertCustomCard(card('doomed'));
    // Паттерн undo: восстановление удалённой + создание новой карточки одновременно
    const doomed = await deleteCustomCard('doomed');
    await Promise.all([
      restoreCustomCard(doomed!.card, doomed!.index),
      upsertCustomCard(card('created-during-undo')),
    ]);
    const ids = (await listCustomCards()).map((c) => c.id);
    expect(ids).toContain('keep');
    expect(ids).toContain('doomed');
    expect(ids).toContain('created-during-undo');
    expect(ids).toHaveLength(3);
  });

  it('20 параллельных upsert — ни один не потерян (functional-update)', async () => {
    const jobs = Array.from({ length: 20 }, (_, i) => upsertCustomCard(card(`c${i}`)));
    await Promise.all(jobs);
    const cards = await listCustomCards();
    expect(cards).toHaveLength(20);
    for (let i = 0; i < 20; i++) {
      expect(cards.some((c) => c.id === `c${i}`)).toBe(true);
    }
    expect(await readDisk()).toHaveLength(20);
  });

  it('микс параллельных операций: upsert/delete/restore — консистентный итог', async () => {
    for (let i = 0; i < 5; i++) await upsertCustomCard(card(`seed${i}`));
    await Promise.all([
      deleteCustomCard('seed1'),
      upsertCustomCard(card('new1')),
      deleteCustomCard('seed3'),
      upsertCustomCard(card('new2')),
      upsertCustomCard(card('seed0', { en: 'patched' })),
    ]);
    const cards = await listCustomCards();
    const ids = cards.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['seed0', 'seed2', 'seed4', 'new1', 'new2']));
    expect(ids).not.toContain('seed1');
    expect(ids).not.toContain('seed3');
    expect(ids).toHaveLength(5);
    expect(cards.find((c) => c.id === 'seed0')!.en).toBe('patched');
  });

  it('reject внутри очереди не рвёт последующие операции', async () => {
    await upsertCustomCard(card('a'));
    await expect(
      updateCustomCards(() => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await upsertCustomCard(card('b'));
    expect((await listCustomCards()).map((c) => c.id)).toEqual(['a', 'b']);
  });
});
