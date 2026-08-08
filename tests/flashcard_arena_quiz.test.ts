import {
  buildArenaQuestions,
  summarizeArena,
  makeRng,
  shuffle,
  ARENA_OPTION_COUNT,
} from '../app/flashcards/arenaQuiz';
import type { CardItem } from '../app/flashcards/types';

/**
 * Контракт режима «Арена». Механика отвечает за честность теста: если сюда
 * просочится дубль варианта или верный ответ пропадёт из списка, юзер получит
 * вопрос без правильного ответа — молча, без падения. Поэтому под тестом.
 */

const card = (id: string, en: string, ru: string): CardItem =>
  ({ id, en, ru, uk: ru, categoryId: 'custom', isSystem: false }) as CardItem;

const answerFor = (c: CardItem) => c.en;
const promptFor = (c: CardItem) => c.ru;

const deck = [
  card('1', 'layover', 'пересадка'),
  card('2', 'gate', 'выход на посадку'),
  card('3', 'customs', 'таможня'),
  card('4', 'carry-on', 'ручная кладь'),
  card('5', 'boarding pass', 'посадочный талон'),
  card('6', 'aisle seat', 'место у прохода'),
];

describe('makeRng / shuffle', () => {
  it('одинаковый seed даёт одинаковый результат', () => {
    expect(shuffle(deck, makeRng(42)).map((c) => c.id)).toEqual(shuffle(deck, makeRng(42)).map((c) => c.id));
  });

  it('shuffle не мутирует исходный массив', () => {
    const before = deck.map((c) => c.id);
    shuffle(deck, makeRng(7));
    expect(deck.map((c) => c.id)).toEqual(before);
  });
});

describe('buildArenaQuestions', () => {
  it('каждый вопрос содержит верный ответ по указанному индексу', () => {
    const qs = buildArenaQuestions(deck, answerFor, promptFor, 1);
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      const correctText = deck.find((c) => c.id === q.cardId)!.en;
      expect(q.options[q.correctIndex]).toBe(correctText);
    }
  });

  it('варианты не повторяются — иначе тест нечестный', () => {
    for (const q of buildArenaQuestions(deck, answerFor, promptFor, 3)) {
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });

  it('ровно 4 варианта на вопрос', () => {
    for (const q of buildArenaQuestions(deck, answerFor, promptFor, 5)) {
      expect(q.options).toHaveLength(ARENA_OPTION_COUNT);
    }
  });

  it('колода меньше 4 уникальных ответов — вопросов нет, а не кривой тест', () => {
    const tiny = [card('1', 'a', 'а'), card('2', 'b', 'б'), card('3', 'c', 'ц')];
    expect(buildArenaQuestions(tiny, answerFor, promptFor, 1)).toEqual([]);
  });

  it('карточки без ответа или вопроса отбрасываются', () => {
    const dirty = [...deck, card('7', '   ', 'пусто'), card('8', 'ok', '  ')];
    const qs = buildArenaQuestions(dirty, answerFor, promptFor, 2, 99);
    expect(qs.find((q) => q.cardId === '7')).toBeUndefined();
    expect(qs.find((q) => q.cardId === '8')).toBeUndefined();
  });

  it('лимит вопросов соблюдается', () => {
    expect(buildArenaQuestions(deck, answerFor, promptFor, 9, 3)).toHaveLength(3);
  });

  it('один seed — один и тот же набор вопросов', () => {
    const a = buildArenaQuestions(deck, answerFor, promptFor, 123);
    const b = buildArenaQuestions(deck, answerFor, promptFor, 123);
    expect(a).toEqual(b);
  });
});

describe('summarizeArena', () => {
  it('считает верные, лучшую серию и слабые карточки', () => {
    const s = summarizeArena([
      { cardId: '1', correct: true },
      { cardId: '2', correct: true },
      { cardId: '3', correct: false },
      { cardId: '4', correct: true },
      { cardId: '5', correct: true },
      { cardId: '6', correct: true },
    ]);
    expect(s.correct).toBe(5);
    expect(s.total).toBe(6);
    expect(s.bestStreak).toBe(3);
    expect(s.weakCardIds).toEqual(['3']);
  });

  it('пустой забег не падает', () => {
    expect(summarizeArena([])).toEqual({ correct: 0, total: 0, bestStreak: 0, weakCardIds: [] });
  });

  it('одна и та же карточка не дублируется в слабых', () => {
    const s = summarizeArena([
      { cardId: '1', correct: false },
      { cardId: '1', correct: false },
    ]);
    expect(s.weakCardIds).toEqual(['1']);
  });
});
