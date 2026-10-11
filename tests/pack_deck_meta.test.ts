// зачем (координатор 11.10, Карточки 2.0, колода «40 · A2» + три слова): уровень и первые слова доезжают от документа
// каталога до колоды без новых чтений, а уровень автора — от заявки до сервера (класс бага «поле не названо — потерялось»).
import { buildCommunityPackPayloadForCloud } from '../app/community_packs/schema';
import { mapCommunityPackDocToMarket } from '../app/community_packs/communityFirestore';
import { normalizePackLevel, packPreviewWords } from '../app/flashcards/pack_deck_meta';

jest.mock('../app/community_packs/functionsClient', () => ({
  callCommunityFetchPackCardsIfAccessible: jest.fn(),
  isCommunityPacksCloudEnabled: jest.fn(() => true),
}));

const cards = (texts: string[]) => texts.map((en, i) => ({ id: `c${i + 1}`, en, ru: `перевод ${i + 1}` }));

describe('pack_deck_meta', () => {
  test('уровень: только A1–C1, регистр и пробелы терпимы', () => {
    expect(normalizePackLevel(' a2 ')).toBe('A2');
    expect(normalizePackLevel('C1')).toBe('C1');
    expect(normalizePackLevel('C2')).toBeUndefined();
    expect(normalizePackLevel(3)).toBeUndefined();
    expect(normalizePackLevel(null)).toBeUndefined();
  });

  test('первые слова: по порядку, без пустых и повторов, не больше трёх, длинные обрезаются', () => {
    const long = 'a'.repeat(50);
    expect(packPreviewWords(cards(['Hello', '', 'hello', 'Thanks', long, 'Bye']), 'en'))
      .toEqual(['Hello', 'Thanks', `${'a'.repeat(31)}…`]);
    expect(packPreviewWords([{ id: 'x', targetText: 'Hola' }], 'es')).toEqual(['Hola']);
    expect(packPreviewWords(undefined)).toEqual([]);
    expect(packPreviewWords([null, 7, 'str'])).toEqual([]);
  });

  test('документ каталога → колода: уровень и три слова; без уровня поля нет', () => {
    const base = { listingStatus: 'published', titleRu: 'Набор', cardCount: 3, updatedAt: 1, packLanguage: 'en' };
    const withLevel = mapCommunityPackDocToMarket('p1', { ...base, level: 'b1', cards: cards(['One', 'Two', 'Three', 'Four']) });
    expect(withLevel?.level).toBe('B1');
    expect(withLevel?.previewWords).toEqual(['One', 'Two', 'Three']);
    const noLevel = mapCommunityPackDocToMarket('p2', { ...base, level: 'Z9', cards: cards(['One']) });
    expect(noLevel).not.toHaveProperty('level');
    expect(noLevel?.previewWords).toEqual(['One']);
  });

  test('заявка уносит уровень автора на сервер; без уровня — поля нет', () => {
    const payload = { title: 'T', description: 'D', cards: cards(Array.from({ length: 10 }, (_, i) => `w${i}`)) };
    expect(buildCommunityPackPayloadForCloud({ ...payload, level: 'A1' }).level).toBe('A1');
    expect(buildCommunityPackPayloadForCloud(payload)).not.toHaveProperty('level');
  });
});
