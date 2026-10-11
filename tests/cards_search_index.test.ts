// зачем (Карточки 2.0, макет hubSearch «lay»): сквозной поиск в памяти — три группы, нормализация, ранжирование
// «начало → начало слова → вхождение», без повторов; индекс собирается из локальных источников без сети.
import {
  buildCardsSearchIndex,
  normalizeSearchText,
  searchCardsIndex,
  type SearchPackInput,
} from '../app/flashcards/cards_search_index';

const pack = (id: string, title: string, extra: Partial<SearchPackInput> = {}): SearchPackInput => ({
  id, title, cardCount: 10, isVideo: false, ...extra,
});

describe('cards_search_index', () => {
  const index = buildCardsSearchIndex({
    cards: [
      { id: 's1', text: 'Layover', translation: 'пересадка', sourceKind: 'saved' },
      { id: 's2', text: 'Lay', translation: 'класть', sourceKind: 'saved' },
      { id: 'c1', text: 'Lay', translation: 'класть', sourceKind: 'custom' }, // дубль сохранённой — одна строка
      { id: 's3', text: 'Delay', translation: 'задержка', sourceKind: 'saved' },
      { id: 's4', text: 'Café', translation: 'кафе', sourceKind: 'saved' },
    ],
    packs: [
      pack('p1', 'Play & lay', { authorName: 'Олег', previewWords: ['Lay down', 'Play on', 'Lay off'] }),
      pack('p2', 'Работа', { previewWords: ['Follow up'] }),
      pack('v1', 'В аэропорту', { isVideo: true, videoId: 'abcdefghijk', previewWords: ['Layover'] }),
      pack('p1', 'Дубль id'),
    ],
  });

  test('макет: «lay» → 2 карточки сверху, набор и ролик', () => {
    const result = searchCardsIndex(index, 'lay');
    expect(result.cards.items.map((c) => c.text)).toEqual(['Lay', 'Layover', 'Delay']);
    expect(result.packs.items.map((p) => p.id)).toEqual(['p1']);
    expect(result.videos.items.map((p) => p.id)).toEqual(['v1']);
  });

  test('вхождение в середину слова — только с 3 букв', () => {
    expect(searchCardsIndex(index, 'la').cards.items.map((c) => c.text)).toEqual(['Lay', 'Layover']);
    expect(searchCardsIndex(index, 'ela').cards.items.map((c) => c.text)).toEqual(['Delay']);
  });

  test('поиск по переводу, без диакритики и регистра; пусто — пустые группы', () => {
    expect(searchCardsIndex(index, 'ЗАДЕРЖ').cards.items[0]?.text).toBe('Delay');
    expect(searchCardsIndex(index, 'cafe').cards.items[0]?.text).toBe('Café');
    expect(searchCardsIndex(index, 'олег').packs.items[0]?.id).toBe('p1');
    const empty = searchCardsIndex(index, '  ,. ');
    expect([empty.cards.total, empty.packs.total, empty.videos.total]).toEqual([0, 0, 0]);
  });

  test('нормализация', () => {
    expect(normalizeSearchText('  Play & Lay! ')).toBe('play lay');
    expect(normalizeSearchText('Façade')).toBe('facade');
    expect(normalizeSearchText(5)).toBe('');
  });

  test('лимит группы и честный total', () => {
    const many = buildCardsSearchIndex({
      cards: Array.from({ length: 50 }, (_, i) => ({ id: `x${i}`, text: `go ${i}`, translation: `t${i}`, sourceKind: 'saved' as const })),
      packs: [],
    });
    const result = searchCardsIndex(many, 'go', { cards: 5, packs: 5, videos: 5 });
    expect(result.cards.items).toHaveLength(5);
    expect(result.cards.total).toBe(50);
  });
});
