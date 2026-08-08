import { statusFromMemoryRow, FLASHCARD_STATUS_COLOR } from '../app/flashcards/cardStatus';
import { applyCardFilter } from '../app/flashcards/selectors';
import type { CardItem } from '../app/flashcards/types';

/**
 * Контракт статусов карточек в коллекции (макет B1 `.cdot`, палитра §4.3).
 * Статус — единственное, что отличает карточки в списке визуально, поэтому
 * пороги фиксируем тестом: сдвиг порога молча перекрасит весь список.
 */

const NOW = 1_700_000_000_000;
const row = (over: Partial<Parameters<typeof statusFromMemoryRow>[0]> = {}) => ({
  correct: 0,
  wrong: 0,
  seen: 0,
  mastered: 0,
  nextDueAt: 0,
  ...over,
});

describe('statusFromMemoryRow', () => {
  it('карточку не видели — new', () => {
    expect(statusFromMemoryRow(undefined, NOW)).toBe('new');
    expect(statusFromMemoryRow(row({ seen: 0 }), NOW)).toBe('new');
  });

  it('ошибок больше верных — weak, даже если что-то освоено', () => {
    expect(statusFromMemoryRow(row({ seen: 5, correct: 1, wrong: 4 }), NOW)).toBe('weak');
    // weak приоритетнее mastered: проблемную карточку нельзя прятать за «освоено»
    expect(statusFromMemoryRow(row({ seen: 9, correct: 3, wrong: 6, mastered: 5 }), NOW)).toBe('weak');
  });

  it('mastered >= 4 при неотрицательном балансе — mastered', () => {
    expect(statusFromMemoryRow(row({ seen: 8, correct: 8, mastered: 4 }), NOW)).toBe('mastered');
  });

  it('mastered = 3 ещё не освоено', () => {
    expect(statusFromMemoryRow(row({ seen: 6, correct: 6, mastered: 3 }), NOW)).toBe('learning');
  });

  it('срок повторения подошёл — review', () => {
    expect(statusFromMemoryRow(row({ seen: 4, correct: 4, mastered: 2, nextDueAt: NOW - 1 }), NOW)).toBe('review');
  });

  it('срок ещё не подошёл — learning', () => {
    expect(statusFromMemoryRow(row({ seen: 4, correct: 4, mastered: 2, nextDueAt: NOW + 60_000 }), NOW)).toBe('learning');
  });

  it('фильтр по статусу отбирает нужные карточки', () => {
    const card = (id: string) => ({ id, en: id, ru: id, uk: id, categoryId: 'custom', isSystem: false }) as CardItem;
    const cards = [card('a'), card('b'), card('c')];
    const statuses = { a: 'weak', b: 'mastered' };

    expect(applyCardFilter(cards, 'status:weak', statuses).map((c) => c.id)).toEqual(['a']);
    // Карточка без записи прогресса считается новой — как и точка в списке.
    expect(applyCardFilter(cards, 'status:new', statuses).map((c) => c.id)).toEqual(['c']);
    // 'all' не трогает список.
    expect(applyCardFilter(cards, 'all', statuses)).toHaveLength(3);
  });

  it('статусы ещё не загрузились — список не прячем', () => {
    const card = (id: string) => ({ id, en: id, ru: id, uk: id, categoryId: 'custom', isSystem: false }) as CardItem;
    const cards = [card('a'), card('b')];
    // Без карты статусов фильтр обязан вернуть всё, а не пустой экран.
    expect(applyCardFilter(cards, 'status:weak', undefined)).toHaveLength(2);
  });

  it('фильтр по источнику не сломан статусной веткой', () => {
    const lessonCard = { id: 'l1', en: 'x', ru: 'x', uk: 'x', categoryId: 'saved', isSystem: false, source: 'lesson', sourceId: '7' } as CardItem;
    const otherCard = { id: 'o1', en: 'y', ru: 'y', uk: 'y', categoryId: 'saved', isSystem: false, source: 'trainer' } as CardItem;
    const cards = [lessonCard, otherCard];
    expect(applyCardFilter(cards, 'lesson:7', {}).map((c) => c.id)).toEqual(['l1']);
    expect(applyCardFilter(cards, 'trainer', {}).map((c) => c.id)).toEqual(['o1']);
  });

  it('цвета статусов — дословно из §4.3 хендофа', () => {
    expect(FLASHCARD_STATUS_COLOR).toEqual({
      new: '#9FB4CC',
      learning: '#5AA6FF',
      review: '#F5C842',
      mastered: '#35D07F',
      weak: '#FF6B7E',
    });
  });
});
