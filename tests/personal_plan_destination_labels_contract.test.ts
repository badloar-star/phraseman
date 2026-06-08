import { planTaskDestinationLabel } from '../app/personal_plan_navigation';
import type { PlanTaskDestination } from '../app/personal_plan_catalog';

const MOJIBAKE_RE = /[\u00d0\u00d1\u00c2]/u;

function label(destination: PlanTaskDestination): string {
  const text = planTaskDestinationLabel(destination);
  expect(text).not.toMatch(MOJIBAKE_RE);
  return text;
}

describe('personal plan destination labels', () => {
  it('names every plan mode with clear user-facing Russian copy', () => {
    expect(label({ type: 'lesson', lessonId: 1, requiredPhrases: 6 })).toBe('Урок · 6 фраз');
    expect(label({ type: 'plan_phrase_lesson', lessonId: 'gavan_day1', requiredPhrases: 5, afterLessonId: 1 })).toBe('Фразы дня · 5');
    expect(label({ type: 'plan_phrase_recall', lessonId: 'gavan_day1', requiredPhrases: 4, afterLessonId: 1 })).toBe('Повтор · 4 фразы');
    expect(label({
      type: 'plan_exercise',
      exerciseType: 'plan_missing_word',
      lessonId: 'gavan_day1',
      contentUnitIds: ['p1'],
      requiredCorrect: 3,
    })).toBe('Слова в фразе · 3');
    expect(label({
      type: 'plan_exercise',
      exerciseType: 'plan_choose_natural_phrase',
      lessonId: 'gavan_day1',
      contentUnitIds: ['p1'],
      requiredCorrect: 3,
    })).toBe('Выбор фразы · 3');
    expect(label({
      type: 'plan_exercise',
      exerciseType: 'plan_listen_choose',
      lessonId: 'gavan_day1',
      contentUnitIds: ['p1'],
      requiredCorrect: 2,
    })).toBe('На слух · 2');
    expect(label({
      type: 'plan_exercise',
      exerciseType: 'plan_listen_build',
      lessonId: 'gavan_day1',
      contentUnitIds: ['p1'],
      requiredCorrect: 2,
    })).toBe('Собрать на слух · 2');
    expect(label({
      type: 'plan_exercise',
      exerciseType: 'plan_pronunciation_repeat',
      lessonId: 'gavan_day1',
      contentUnitIds: ['p1'],
      requiredCorrect: 2,
    })).toBe('Произношение · 2');
    expect(label({ type: 'quiz', quizId: 'quiz_1', questionCount: 10, level: 'easy' })).toBe('Вызов дня · 10 вопросов');
    expect(label({ type: 'practice', trainingId: 'practice_1', requiredPhrases: 3 })).toBe('Моя практика · 3 фразы');
    expect(label({ type: 'trainer', mode: 'weak', requiredItems: 2 })).toBe('Тренер · слабое место');
    expect(label({ type: 'trainer', mode: 'hard', requiredItems: 2 })).toBe('Тренер · сложные фразы');
    expect(label({ type: 'trainer', mode: 'smart_mix', requiredItems: 2 })).toBe('Тренер · точечная тренировка');
    expect(label({ type: 'flashcards', deckId: 'saved:all', requiredCards: 5 })).toBe('Карточки · 5');
    expect(label({ type: 'recall', phraseIds: ['p1', 'p2'] })).toBe('Повтор из памяти');
  });
});
