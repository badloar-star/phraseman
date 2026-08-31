import {
  HOME_MISTAKES_READY_THRESHOLD,
  resolveHomeLearningPriority,
} from '../app/home_learning_priority_card';

describe('Home learning priority card', () => {
  test('keeps the last lesson below ten ready mistakes', () => {
    expect(HOME_MISTAKES_READY_THRESHOLD).toBe(10);
    expect(resolveHomeLearningPriority(0)).toBe('last_lesson');
    expect(resolveHomeLearningPriority(9)).toBe('last_lesson');
  });

  test('switches to My Mistakes starting at ten ready mistakes', () => {
    expect(resolveHomeLearningPriority(10)).toBe('mistakes');
    expect(resolveHomeLearningPriority(11)).toBe('mistakes');
  });

  test('normalizes invalid counters without exposing the mistakes card', () => {
    expect(resolveHomeLearningPriority(-4)).toBe('last_lesson');
    expect(resolveHomeLearningPriority(Number.NaN)).toBe('last_lesson');
    expect(resolveHomeLearningPriority(Number.POSITIVE_INFINITY)).toBe('last_lesson');
  });
});
