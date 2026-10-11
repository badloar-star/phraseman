// зачем (Карточки 2.0, герой новичка «Начни здесь · Hello · Первые 50 слов»): встроенный набор целый — 50 карточек,
// у каждой перевод на всех 8 языках интерфейса, без повторов; только английский (D160); тренировка берёт его колодой.
import { loadDeckCards } from '../app/flashcards/deck_sources';
import {
  STARTER_FIRST_50_DECK_ID,
  STARTER_FIRST_50_PACK_ID,
  STARTER_FIRST_50_TITLE,
  starterFirst50CardItems,
  starterPackAvailable,
} from '../app/flashcards/starter_pack_first_50';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('стартовый набор «Первые 50 слов»', () => {
  const cards = starterFirst50CardItems();

  test('ровно 50 карточек, первая — Hello, id и английский без повторов', () => {
    expect(cards).toHaveLength(50);
    expect(cards[0].en).toBe('Hello');
    expect(new Set(cards.map((c) => c.id)).size).toBe(50);
    expect(new Set(cards.map((c) => c.en.toLowerCase())).size).toBe(50);
  });

  test('у каждой карточки перевод на всех языках интерфейса', () => {
    for (const card of cards) {
      for (const text of [card.ru, card.uk, card.es]) expect(String(text ?? '').trim()).not.toBe('');
      for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
        expect(String(card.sourceLocales?.[locale] ?? '').trim()).not.toBe('');
      }
    }
    for (const title of Object.values(STARTER_FIRST_50_TITLE)) expect(title.length).toBeGreaterThan(0);
  });

  test('только английский как язык изучения (D160)', () => {
    expect(starterPackAvailable('en')).toBe(true);
    expect(starterPackAvailable('es')).toBe(false);
    expect(starterPackAvailable('de')).toBe(false);
  });

  test('тренировка берёт набор колодой без сети; для чужого языка — пусто', async () => {
    expect(STARTER_FIRST_50_DECK_ID).toBe(`pack:${STARTER_FIRST_50_PACK_ID}`);
    const deck = await loadDeckCards({ kind: 'pack', packId: STARTER_FIRST_50_PACK_ID }, 'ru', 'en');
    expect(deck).toHaveLength(50);
    expect(deck[0]).toMatchObject({ en: 'Hello', translation: 'Привет' });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await loadDeckCards({ kind: 'pack', packId: STARTER_FIRST_50_PACK_ID }, 'ru', 'es')).toEqual([]);
    warn.mockRestore();
  });
});
