import { statusFromMemoryRow, FLASHCARD_STATUS_COLOR } from '../app/flashcards/cardStatus';

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
