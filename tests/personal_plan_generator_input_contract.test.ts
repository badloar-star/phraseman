import { readFileSync } from 'fs';
import path from 'path';
import {
  derivePlanPersonalization,
  type PlanGeneratorInput,
} from '../app/personal_plan_generator';

describe('personal plan generator input contract', () => {
  it('derives plan personalization from mistakes, cards, trainer, quizzes and lessons', () => {
    const input: PlanGeneratorInput = {
      studyTarget: 'en',
      lessons: [
        { lessonId: 1, bestScore: 4.8, passCount: 2, phraseProgressCount: 12 },
        { lessonId: 2, bestScore: 0, passCount: 0, phraseProgressCount: 0 },
      ],
      quizzes: { easy: 4, medium: 1, hard: 0 },
      mistakes: {
        totalRecent: 5,
        byLesson: { 1: 4, 2: 1 },
        topPhrases: [
          { phrase: 'Hi, I am Alex.', lessonId: 1, count: 3, lastTs: 100, topCategory: 'pronoun', topCategoryCount: 2, categoryCounts: {}, exactCategoryCounts: {} },
        ],
      },
      cards: { saved: 7 },
      practice: { resolvedTrainingCount: 2, dueTrainingCount: 1 },
      trainer: {
        totalDue: 4,
        hardestQueue: 'phrases',
        hardestCategory: 'pronoun',
        hardestMistakes: 5,
      },
      activity: { activeDays: 3, streakDays: 2 },
    };

    const result = derivePlanPersonalization(input);

    expect(result.shouldAddCardReview).toBe(true);
    expect(result.shouldAddTrainerTask).toBe(true);
    expect(result.shouldAddMistakeReview).toBe(true);
    expect(result.weakSpots).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'mistakes', tag: 'pronoun', weight: expect.any(Number) }),
      expect.objectContaining({ source: 'trainer', tag: 'phrases', weight: expect.any(Number) }),
      expect.objectContaining({ source: 'lesson', tag: 'lesson:1', weight: expect.any(Number) }),
    ]));
    expect(result.lessonReadiness.completedLessonIds).toEqual([1]);
    expect(result.loadHint).toBe('steady');
  });

  it('keeps plan inputs wired to real app data sources instead of UI screens', () => {
    const source = readFileSync(path.join(process.cwd(), 'app', 'personal_plan_generator.ts'), 'utf8');

    expect(source).toContain("from './mistake_log'");
    expect(source).toContain("from './trainer_store'");
    expect(source).toContain('flashcardsSavedKey');
    expect(source).toContain('quizLifetimeCounterKey');
    expect(source).toContain('lessonBestScoreKey');
    expect(source).toContain('lessonPassCountKey');
    expect(source).toContain('resolvedPersonalTrainingsKey');
    expect(source).toContain('statsDailyBreakdownKey');
  });
});
