/**
 * cards-2.1 (§6 SPEC_2_1): мультивыбор колод — чистые функции deck_selection.
 * Покрытие: разбор/сборка списка колод в параметре ?deck= (обратная совместимость
 * с одиночным значением), нормализация и исключительность 'weak', тоггл чекбокса,
 * счётчик «Выбрано N · M карточек» с дедупликацией по стабильному id, плюрализация.
 */
import {
  DECK_PARAM_SEPARATOR,
  cardsCountLabel,
  decksCountLabel,
  deckRouteParam,
  deckSelectionLabel,
  isValidDeckId,
  joinDeckIds,
  normalizeDeckIds,
  parseDeckIdList,
  splitDeckParam,
  summarizeDeckSelection,
  toggleDeckSelection,
  type DeckCountable,
  type FcDeckId,
} from '../app/flashcards/deck_selection';

describe('splitDeckParam / parseDeckIdList: формат параметра ?deck=', () => {
  it('одиночное значение работает как раньше', () => {
    expect(parseDeckIdList('saved')).toEqual(['saved']);
    expect(parseDeckIdList('custom')).toEqual(['custom']);
    expect(parseDeckIdList('pack:abc')).toEqual(['pack:abc']);
    expect(parseDeckIdList('weak')).toEqual(['weak']);
  });

  it('список через запятую разбирается по порядку', () => {
    expect(parseDeckIdList('saved,custom,pack:abc')).toEqual(['saved', 'custom', 'pack:abc']);
    expect(DECK_PARAM_SEPARATOR).toBe(',');
  });

  it('пробелы, пустые токены и дубликаты схлопываются', () => {
    expect(splitDeckParam(' saved , , custom ')).toEqual(['saved', 'custom']);
    expect(parseDeckIdList('saved, saved ,custom')).toEqual(['saved', 'custom']);
  });

  it('массив параметров (expo-router) склеивается', () => {
    expect(parseDeckIdList(['saved', 'custom,pack:x'])).toEqual(['saved', 'custom', 'pack:x']);
  });

  it('пусто / мусор → пустой список', () => {
    expect(parseDeckIdList(undefined)).toEqual([]);
    expect(parseDeckIdList(null)).toEqual([]);
    expect(parseDeckIdList('')).toEqual([]);
    expect(parseDeckIdList(',,,')).toEqual([]);
    expect(parseDeckIdList('evil,pack:')).toEqual([]);
  });

  it('joinDeckIds — обратная сборка параметра', () => {
    expect(joinDeckIds(['saved', 'custom'])).toBe('saved,custom');
    expect(joinDeckIds(['saved'])).toBe('saved');
    expect(joinDeckIds([])).toBe('');
    expect(parseDeckIdList(joinDeckIds(['pack:a', 'pack:b']))).toEqual(['pack:a', 'pack:b']);
  });

  it("deckRouteParam: 'weak' в роут не уходит (дефолтный режим сессии)", () => {
    expect(deckRouteParam(['saved', 'custom'])).toBe('saved,custom');
    expect(deckRouteParam(['weak'])).toBe('');
    expect(deckRouteParam([])).toBe('');
  });
});

describe('normalizeDeckIds: валидация, дедупликация, исключительность weak', () => {
  it('мусор отбрасывается, порядок первого вхождения сохраняется', () => {
    expect(normalizeDeckIds(['custom', 'evil', 'saved', 'custom', 42, null])).toEqual(['custom', 'saved']);
  });

  it("'weak' (due-очередь) вытесняет наборы — только в одиночку", () => {
    expect(normalizeDeckIds(['saved', 'weak', 'custom'])).toEqual(['weak']);
    expect(normalizeDeckIds(['weak'])).toEqual(['weak']);
  });

  it('не массив → пустой список', () => {
    expect(normalizeDeckIds(undefined)).toEqual([]);
    expect(normalizeDeckIds(null)).toEqual([]);
  });

  it('isValidDeckId', () => {
    expect(isValidDeckId('saved')).toBe(true);
    expect(isValidDeckId('pack:x')).toBe(true);
    expect(isValidDeckId('pack:')).toBe(false);
    expect(isValidDeckId('evil')).toBe(false);
    expect(isValidDeckId(7)).toBe(false);
  });
});

describe('toggleDeckSelection: чекбоксы', () => {
  it('добавляет и снимает набор', () => {
    expect(toggleDeckSelection([], 'saved')).toEqual(['saved']);
    expect(toggleDeckSelection(['saved'], 'custom')).toEqual(['saved', 'custom']);
    expect(toggleDeckSelection(['saved', 'custom'], 'saved')).toEqual(['custom']);
  });

  it('снятие последнего даёт пустой выбор (старт блокируется на UI)', () => {
    expect(toggleDeckSelection(['saved'], 'saved')).toEqual([]);
  });

  it("выбор 'weak' сбрасывает наборы, выбор набора сбрасывает 'weak'", () => {
    expect(toggleDeckSelection(['saved', 'custom'], 'weak')).toEqual(['weak']);
    expect(toggleDeckSelection(['weak'], 'custom')).toEqual(['custom']);
  });
});

describe('summarizeDeckSelection: «Выбрано N · M карточек»', () => {
  const decks: DeckCountable[] = [
    { deckId: 'saved', count: 40, cardIds: ['a', 'b', 'c'] },
    { deckId: 'custom', count: 2, cardIds: ['c', 'd'] },
    { deckId: 'pack:x', count: 30 },
  ];

  it('без выбора — нули', () => {
    expect(summarizeDeckSelection(decks, [])).toEqual({ deckCount: 0, cardCount: 0 });
  });

  it('карточки дедуплицируются по стабильному id', () => {
    // saved: a,b,c + custom: c,d → 4 уникальных (а не 5)
    expect(summarizeDeckSelection(decks, ['saved', 'custom'])).toEqual({ deckCount: 2, cardCount: 4 });
  });

  it('колоды без cardIds складываются по count', () => {
    expect(summarizeDeckSelection(decks, ['pack:x'])).toEqual({ deckCount: 1, cardCount: 30 });
    expect(summarizeDeckSelection(decks, ['custom', 'pack:x'])).toEqual({ deckCount: 2, cardCount: 32 });
  });

  it('несуществующие и повторяющиеся id в выборе игнорируются', () => {
    const sel = ['saved', 'saved', 'pack:ghost'] as FcDeckId[];
    expect(summarizeDeckSelection(decks, sel)).toEqual({ deckCount: 1, cardCount: 3 });
  });

  it('дубликаты колод в списке считаются один раз', () => {
    const dup: DeckCountable[] = [
      { deckId: 'pack:x', count: 30 },
      { deckId: 'pack:x', count: 30 },
    ];
    expect(summarizeDeckSelection(dup, ['pack:x'])).toEqual({ deckCount: 1, cardCount: 30 });
  });
});

describe('подписи счётчика', () => {
  /**
   * Владелец (2026-08-13) запретил слово «колода» в интерфейсе — везде «набор».
   * Тест не выключен, а переписан на новую копирайт-норму и заодно сторожит,
   * что старое слово не вернётся ни в одной форме.
   */
  it('decksCountLabel: форма слова «набор» по числу (заголовок мультивыбора)', () => {
    expect(decksCountLabel('ru', 1)).toBe('1 набор');
    expect(decksCountLabel('ru', 2)).toBe('2 набора');
    expect(decksCountLabel('ru', 5)).toBe('5 наборов');
    expect(decksCountLabel('ru', 11)).toBe('11 наборов');
    expect(decksCountLabel('uk', 1)).toBe('1 набір');
    expect(decksCountLabel('uk', 3)).toBe('3 набори');
    expect(decksCountLabel('uk', 5)).toBe('5 наборів');
    expect(decksCountLabel('es', 1)).toBe('1 pack');
    expect(decksCountLabel('es', 3)).toBe('3 packs');
  });

  it('decksCountLabel: слово «колода» и его кальки не возвращаются', () => {
    for (const lang of ['ru', 'uk', 'es'] as const) {
      for (const n of [0, 1, 2, 5, 11, 21, 100]) {
        expect(decksCountLabel(lang, n)).not.toMatch(/колод|мазо|mazo|baralho/i);
      }
    }
  });

  it('cardsCountLabel: русская плюрализация', () => {
    expect(cardsCountLabel('ru', 1)).toBe('1 карточка');
    expect(cardsCountLabel('ru', 3)).toBe('3 карточки');
    expect(cardsCountLabel('ru', 11)).toBe('11 карточек');
    expect(cardsCountLabel('ru', 84)).toBe('84 карточки');
    expect(cardsCountLabel('ru', 0)).toBe('0 карточек');
    expect(cardsCountLabel('ru', -5)).toBe('0 карточек');
  });

  it('cardsCountLabel: uk', () => {
    expect(cardsCountLabel('uk', 1)).toBe('1 картка');
    expect(cardsCountLabel('uk', 3)).toBe('3 картки');
    expect(cardsCountLabel('uk', 25)).toBe('25 карток');
  });

  it('deckSelectionLabel: «Выбрано 3 · 84 карточки»', () => {
    expect(deckSelectionLabel('ru', { deckCount: 3, cardCount: 84 })).toBe('Выбрано 3 · 84 карточки');
    expect(deckSelectionLabel('uk', { deckCount: 2, cardCount: 5 })).toBe('Обрано 2 · 5 карток');
  });

  it('пустой выбор — пустая подпись (UI показывает подсказку)', () => {
    expect(deckSelectionLabel('ru', { deckCount: 0, cardCount: 0 })).toBe('');
  });
});
