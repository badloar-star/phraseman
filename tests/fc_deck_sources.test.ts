/**
 * cards-2.0 (E8): источники карточек deck-сессий тренера (deck_sources).
 * Покрытие: парсинг ?deck=, билдеры карточек из сохранённых/кастомных
 * (uk-фолбэк на ru, отсев пустых), decoy из этой же колоды, загрузка
 * через моки хранилищ (flashcards_v1 / custom_flashcards_v2), маппинг
 * источника ошибок для active_recall ('custom' | 'pack').
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deckCardsFromCardItems,
  deckCardsFromSaved,
  loadDeckCards,
  loadDeckCardsMulti,
  mergeDeckCards,
  mistakeSourceForDeck,
  mistakeSourceForDecks,
  parseDeckParam,
  parseDeckParams,
  pickDeckDecoy,
  shuffleDeckCards,
  type DeckCard,
} from '../app/flashcards/deck_sources';
import { saveFlashcards, type Flashcard } from '../hooks/use-flashcards';
import { __resetCustomCardsStoreForTests, upsertCustomCard } from '../app/flashcards/custom_cards_store';
import type { CardItem } from '../app/flashcards/types';

jest.mock('../app/account_scope_key', () => ({
  accountScopeKey: () => 'test-user',
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ stableId: 'test-user', generation: 1 }),
  isCurrentAccountGeneration: () => true,
  isAccountOperationCurrent: () => true,
  withAccountTransitionLock: async (fn: () => unknown) => fn(),
  withRestoreApplicationLock: async (fn: () => unknown) => fn(),
  beginInitialAccountGeneration: () => {},
  invalidateAccountGeneration: () => {},
}));


const savedCard = (id: string, extra: Partial<Flashcard> = {}): Flashcard => ({
  id,
  en: `en ${id}`,
  ru: `ru ${id}`,
  uk: `uk ${id}`,
  source: 'lesson',
  addedAt: 1,
  ...extra,
});

const customCard = (id: string, extra: Partial<CardItem> = {}): CardItem => ({
  id,
  en: `en ${id}`,
  ru: `ru ${id}`,
  uk: `uk ${id}`,
  categoryId: 'custom',
  isSystem: false,
  ...extra,
});

beforeEach(async () => {
  await (AsyncStorage as unknown as { clear: () => Promise<void> }).clear();
  __resetCustomCardsStoreForTests();
  jest.clearAllMocks();
});

describe('parseDeckParam', () => {
  it('saved/custom/pack:<id> распознаются', () => {
    expect(parseDeckParam('saved')).toEqual({ kind: 'saved' });
    expect(parseDeckParam('custom')).toEqual({ kind: 'custom' });
    expect(parseDeckParam('pack:official_x')).toEqual({ kind: 'pack', packId: 'official_x' });
    expect(parseDeckParam(['custom'])).toEqual({ kind: 'custom' });
  });

  it("'weak' / пусто / мусор -> null (обычная due-очередь тренера)", () => {
    expect(parseDeckParam('weak')).toBeNull();
    expect(parseDeckParam(undefined)).toBeNull();
    expect(parseDeckParam(null)).toBeNull();
    expect(parseDeckParam('')).toBeNull();
    expect(parseDeckParam('pack:')).toBeNull();
    expect(parseDeckParam('evil')).toBeNull();
  });
});

describe('mistakeSourceForDeck: source для active_recall (§3.7)', () => {
  it("saved/custom -> 'custom'; pack -> 'pack'", () => {
    expect(mistakeSourceForDeck({ kind: 'saved' })).toBe('custom');
    expect(mistakeSourceForDeck({ kind: 'custom' })).toBe('custom');
    expect(mistakeSourceForDeck({ kind: 'pack', packId: 'p' })).toBe('pack');
  });
});

describe('билдеры карточек', () => {
  it('deckCardsFromSaved: перевод по локали, uk-фолбэк на ru', () => {
    const cards = [savedCard('a'), savedCard('b', { uk: '' })];
    const ru = deckCardsFromSaved(cards, 'ru');
    expect(ru.map((c) => c.translation)).toEqual(['ru a', 'ru b']);
    const uk = deckCardsFromSaved(cards, 'uk');
    expect(uk.map((c) => c.translation)).toEqual(['uk a', 'ru b']); // фолбэк
  });

  it('deckCardsFromSaved: пустой EN или отсутствие перевода отсеиваются', () => {
    const cards = [
      savedCard('ok'),
      savedCard('noEn', { en: '   ' }),
      savedCard('noTr', { ru: '', uk: '' }),
    ];
    expect(deckCardsFromSaved(cards, 'ru').map((c) => c.id)).toEqual(['ok']);
  });

  it('deckCardsFromCardItems: es-локаль с фолбэком на ru', () => {
    const cards = [customCard('a', { es: 'es a' }), customCard('b')];
    const es = deckCardsFromCardItems(cards, 'es');
    expect(es.map((c) => c.translation)).toEqual(['es a', 'ru b']);
  });
});

describe('pickDeckDecoy: ложный перевод из этой же колоды', () => {
  const deck: DeckCard[] = [
    { id: '1', en: 'one', translation: 'один', ru: 'один' },
    { id: '2', en: 'two', translation: 'два', ru: 'два' },
    { id: '3', en: 'three', translation: 'три', ru: 'три' },
  ];

  it('никогда не возвращает правильный перевод при наличии альтернатив', () => {
    for (let i = 0; i < 25; i++) {
      expect(pickDeckDecoy('один', deck)).not.toBe('один');
    }
  });

  it('колода из одной карточки -> возвращает правильный (edge case)', () => {
    expect(pickDeckDecoy('один', [deck[0]])).toBe('один');
  });

  it('детерминированный rnd выбирает из пула чужих переводов', () => {
    expect(pickDeckDecoy('один', deck, () => 0)).toBe('два');
    expect(pickDeckDecoy('один', deck, () => 0.99)).toBe('три');
  });
});

describe('loadDeckCards: моки хранилищ', () => {
  it("deck 'saved' читает flashcards_v1", async () => {
    await saveFlashcards([savedCard('s1'), savedCard('s2')]);
    const cards = await loadDeckCards({ kind: 'saved' }, 'uk');
    expect(cards.map((c) => c.id)).toEqual(['s1', 's2']);
    expect(cards[0].translation).toBe('uk s1');
    expect(cards[0].en).toBe('en s1');
  });

  it("deck 'custom' читает custom_flashcards_v2 через очередь custom_cards_store", async () => {
    await upsertCustomCard(customCard('c1'));
    await upsertCustomCard(customCard('c2', { en: '  ' })); // отсеется
    await upsertCustomCard(customCard('c3'));
    const cards = await loadDeckCards({ kind: 'custom' }, 'ru');
    expect(cards.map((c) => c.id)).toEqual(['c1', 'c3']);
    expect(cards[1].ru).toBe('ru c3');
  });

  it('неизвестный пак -> пустой массив (fail-soft)', async () => {
    const cards = await loadDeckCards({ kind: 'pack', packId: 'nope_missing' }, 'ru');
    expect(cards).toEqual([]);
  });
});

// ── cards-2.1 (§6 SPEC_2_1): несколько колод сразу ───────────────────────────

describe('parseDeckParams: список колод в ?deck=', () => {
  it('одиночное значение — список из одного (обратная совместимость)', () => {
    expect(parseDeckParams('saved')).toEqual([{ kind: 'saved' }]);
    expect(parseDeckParams('pack:abc')).toEqual([{ kind: 'pack', packId: 'abc' }]);
  });

  it('список через запятую разбирается по порядку', () => {
    expect(parseDeckParams('saved,custom,pack:abc')).toEqual([
      { kind: 'saved' },
      { kind: 'custom' },
      { kind: 'pack', packId: 'abc' },
    ]);
  });

  it("дубликаты, пробелы, 'weak' и мусор отбрасываются", () => {
    expect(parseDeckParams(' saved , saved ,weak, evil ,pack: ,custom')).toEqual([
      { kind: 'saved' },
      { kind: 'custom' },
    ]);
    expect(parseDeckParams('weak')).toEqual([]);
    expect(parseDeckParams(undefined)).toEqual([]);
  });

  it('parseDeckParam (старое API) отдаёт первую колоду списка', () => {
    expect(parseDeckParam('custom,saved')).toEqual({ kind: 'custom' });
    expect(parseDeckParam('weak,saved')).toEqual({ kind: 'saved' });
    expect(parseDeckParam('weak')).toBeNull();
  });
});

describe('mistakeSourceForDecks: источник ошибок для мультиколоды', () => {
  it("все паки -> 'pack'; смесь и пусто -> 'custom'", () => {
    expect(mistakeSourceForDecks([{ kind: 'pack', packId: 'a' }, { kind: 'pack', packId: 'b' }])).toBe('pack');
    expect(mistakeSourceForDecks([{ kind: 'pack', packId: 'a' }, { kind: 'saved' }])).toBe('custom');
    expect(mistakeSourceForDecks([])).toBe('custom');
  });
});

describe('mergeDeckCards / shuffleDeckCards', () => {
  const card = (id: string): DeckCard => ({ id, en: `en ${id}`, translation: `tr ${id}`, ru: `ru ${id}` });

  it('объединяет колоды по порядку и убирает дубли по стабильному id', () => {
    const merged = mergeDeckCards([[card('a'), card('b')], [card('b'), card('c')], []]);
    expect(merged.map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('карточки без id игнорируются (fail-soft)', () => {
    const merged = mergeDeckCards([[card('a'), { ...card('x'), id: '' }]]);
    expect(merged.map((c) => c.id)).toEqual(['a']);
  });

  it('shuffleDeckCards не теряет и не дублирует карточки', () => {
    const src = ['a', 'b', 'c', 'd', 'e'].map(card);
    const out = shuffleDeckCards(src, () => 0.5);
    expect(out).toHaveLength(src.length);
    expect([...out].map((c) => c.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(src.map((c) => c.id)).toEqual(['a', 'b', 'c', 'd', 'e']); // исходный не мутируется
  });

  it('детерминированный rnd меняет порядок', () => {
    const src = ['a', 'b', 'c'].map(card);
    expect(shuffleDeckCards(src, () => 0).map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('loadDeckCardsMulti: объединённая колода', () => {
  it('saved + custom объединяются, помечаются источником и перемешиваются', async () => {
    await saveFlashcards([savedCard('s1'), savedCard('s2')]);
    await upsertCustomCard(customCard('c1'));
    const cards = await loadDeckCardsMulti([{ kind: 'saved' }, { kind: 'custom' }], 'ru', {
      shuffle: false,
    });
    expect(cards.map((c) => c.id)).toEqual(['s1', 's2', 'c1']);
    expect(cards.every((c) => c.source === 'custom')).toBe(true);
  });

  it('одна и та же карточка в двух колодах считается один раз', async () => {
    await saveFlashcards([savedCard('dup'), savedCard('s2')]);
    await upsertCustomCard(customCard('dup'));
    const cards = await loadDeckCardsMulti([{ kind: 'saved' }, { kind: 'custom' }], 'ru', {
      shuffle: false,
    });
    expect(cards.map((c) => c.id)).toEqual(['dup', 's2']);
  });

  it('пустой список колод -> пусто; недоступный пак не роняет остальные', async () => {
    expect(await loadDeckCardsMulti([], 'ru')).toEqual([]);
    await saveFlashcards([savedCard('s1')]);
    const cards = await loadDeckCardsMulti([{ kind: 'pack', packId: 'nope_missing' }, { kind: 'saved' }], 'ru');
    expect(cards.map((c) => c.id)).toEqual(['s1']);
  });

  it('по умолчанию колода перемешивается (состав сохраняется)', async () => {
    await saveFlashcards(['a', 'b', 'c', 'd', 'e', 'f'].map((id) => savedCard(id)));
    const cards = await loadDeckCardsMulti([{ kind: 'saved' }], 'ru', { rnd: () => 0 });
    expect(cards.map((c) => c.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(cards.map((c) => c.id)).not.toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
});
