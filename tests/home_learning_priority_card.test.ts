import { HOME_MISTAKES_READY_THRESHOLD, resolveHomeLearningPriority } from '../app/home_learning_priority_card';

// зачем (владелец 2026-09-14): вход в ошибки переехал на кнопку у «Сегодня»,
// плитка «Мои ошибки» больше не подменяет «Продолжить урок» ни при каком счётчике.
describe('Home learning priority card', () => {
  test('always keeps the last lesson, whatever the mistake counter says', () => {
    expect(HOME_MISTAKES_READY_THRESHOLD).toBe(10);
    expect(resolveHomeLearningPriority(0)).toBe('last_lesson');
    expect(resolveHomeLearningPriority(9)).toBe('last_lesson');
    expect(resolveHomeLearningPriority(10)).toBe('last_lesson');
    expect(resolveHomeLearningPriority(250)).toBe('last_lesson');
  });

  test('normalizes invalid counters without exposing the mistakes card', () => {
    expect(resolveHomeLearningPriority(-4)).toBe('last_lesson');
    expect(resolveHomeLearningPriority(Number.NaN)).toBe('last_lesson');
    expect(resolveHomeLearningPriority(Number.POSITIVE_INFINITY)).toBe('last_lesson');
  });
});
