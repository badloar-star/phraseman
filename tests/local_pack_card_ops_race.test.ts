// зачем (аудит Optimistic UI 15.10, решение координатора): две быстрые правки одного локального набора не затирают друг друга —
// чтение набора и запись идут под очередью по набору. Хранилище в тесте — в памяти, с задержкой чтения/записи, как у AsyncStorage.
type Card = { id: string; en: string; ru: string; uk: string };
type Pack = { id: string; title: string; description: string; cardThemeKey: string; cards: Card[]; packLanguage: string; priceRunes: number; studyTarget: string; cloudPackId?: string; authorStableId?: string };

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let store: Pack[] = [];

jest.mock('../app/community_packs/localAuthorPacks', () => ({
  loadLocalAuthorPacks: async () => { const snapshot = JSON.parse(JSON.stringify(store)) as Pack[]; await delay(5); return snapshot; },
  saveLocalAuthorPack: async (payload: { cards: Card[] }, opts: { packId: string }) => {
    await delay(5);
    store = store.map((pack) => (pack.id === opts.packId ? { ...pack, cards: payload.cards } : pack));
    return opts.packId;
  },
}));
jest.mock('../app/community_packs/communityFirestore', () => ({
  communityPackCardsToCardItems: (_packId: string, cards: Card[]) => cards.map((card) => ({ id: card.id })),
}));
jest.mock('../app/dev_cards_state', () => ({ isDevCardsFail: () => false }));

import { addCardToLocalPack } from '../app/community_packs/localPackCardAdd';
import { removeCardFromLocalPack, restoreCardToLocalPack } from '../app/community_packs/localPackCardOps';

const card = (id: string, en: string): Card => ({ id, en, ru: `${en}-ru`, uk: '' });
const seed = (cards: Card[]) => {
  store = [{ id: 'p1', title: 'T', description: '', cardThemeKey: '', cards, packLanguage: 'en', priceRunes: 0, studyTarget: 'en' }];
};

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => { jest.restoreAllMocks(); });

test('два удаления подряд из одного набора — убраны обе карточки', async () => {
  seed([card('c1', 'one'), card('c2', 'two'), card('c3', 'three')]);
  const [first, second] = await Promise.all([removeCardFromLocalPack('p1', 'c1'), removeCardFromLocalPack('p1', 'c2')]);
  expect(first?.card.id).toBe('c1');
  expect(second?.card.id).toBe('c2');
  expect(store[0]!.cards.map((c) => c.id)).toEqual(['c3']);
});

test('удаление и «Вернуть» подряд — карточка на месте, соседние правки не потеряны', async () => {
  seed([card('c1', 'one'), card('c2', 'two'), card('c3', 'three')]);
  const removed = await removeCardFromLocalPack('p1', 'c2');
  const [restored, removedOther] = await Promise.all([restoreCardToLocalPack(removed!), removeCardFromLocalPack('p1', 'c3')]);
  expect(restored).toBe(true);
  expect(removedOther?.card.id).toBe('c3');
  expect(store[0]!.cards.map((c) => c.id)).toEqual(['c1', 'c2']);
});

test('два добавления подряд в один набор — обе карточки сохранены с разными id', async () => {
  seed([card('c1', 'one')]);
  const item = (id: string, text: string) => ({ id, targetText: text, translationText: `${text}-ru`, packLanguage: 'en', source: 'lesson', sourceId: 's', sourceTitle: 't' }) as never;
  const [a, b] = await Promise.all([addCardToLocalPack('p1', item('x1', 'alpha')), addCardToLocalPack('p1', item('x2', 'beta'))]);
  expect([a, b]).toEqual(['added', 'added']);
  const ids = store[0]!.cards.map((c) => c.id);
  expect(ids).toHaveLength(3);
  expect(new Set(ids).size).toBe(3);
});

test('правки РАЗНЫХ наборов не ждут друг друга', async () => {
  store = [
    { id: 'p1', title: 'A', description: '', cardThemeKey: '', cards: [card('c1', 'one')], packLanguage: 'en', priceRunes: 0, studyTarget: 'en' },
    { id: 'p2', title: 'B', description: '', cardThemeKey: '', cards: [card('d1', 'uno')], packLanguage: 'en', priceRunes: 0, studyTarget: 'en' },
  ];
  const [a, b] = await Promise.all([removeCardFromLocalPack('p1', 'c1'), removeCardFromLocalPack('p2', 'd1')]);
  expect(a?.card.id).toBe('c1');
  expect(b?.card.id).toBe('d1');
  expect(store.map((p) => p.cards.length)).toEqual([0, 0]);
});
