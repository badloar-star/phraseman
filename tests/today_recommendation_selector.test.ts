import { selectTodayRecommendation, type RecommendationFacts } from '../lib/today/recommendation_selector';
import type { TodayRecommendationRule } from '../lib/today/recommendation_catalog';

const facts: RecommendationFacts = {
  timeBucket: 'morning', isWeekend: false, todayStudyMinutes: null, todayLessons: null, todayXp: null,
  resumeKind: 'lesson', streak: 0, daysSinceLearning: null, nextLessonId: 2, courseComplete: false,
  plan: null, practiceDue: 0, flashcardCount: 0, dailyTasksRemaining: 0,
  dailyTasksTotal: 0, availableDestinations: new Set(['lessons', 'practice', 'flashcards']),
};

const rule = (ruleId: string, priority: number, destinationId: 'lessons' | 'practice'): TodayRecommendationRule => ({
  ruleId, priority, destinationId, cooldownMs: 1000, eligible: () => true,
  variants: [
    { variantId: `${ruleId}.a`, copy: { ru: 'A', uk: 'A', es: 'A', 'pt-BR': 'A', vi: 'A', id: 'A', tr: 'A', pl: 'A' } },
    { variantId: `${ruleId}.b`, copy: { ru: 'B', uk: 'B', es: 'B', 'pt-BR': 'B', vi: 'B', id: 'B', tr: 'B', pl: 'B' } },
  ],
});

describe('Today recommendation selector', () => {
  test('chooses highest priority and does not duplicate the primary CTA', () => {
    const result = selectTodayRecommendation({ facts, locale: 'ru', nowMs: 5000, primaryDestinationId: 'lessons', rules: [rule('lessons', 100, 'lessons'), rule('practice', 90, 'practice')], history: {} });
    expect(result.ruleId).toBe('practice');
  });

  test('respects cooldown and chooses the oldest localized variant', () => {
    const candidate = rule('practice', 90, 'practice');
    const cooling = selectTodayRecommendation({ facts, locale: 'ru', nowMs: 5000, primaryDestinationId: null, rules: [candidate], history: { practice: { lastShownAt: 4500, variants: {} } } });
    expect(cooling.ruleId).toBe('today.lessons.explore');
    const selected = selectTodayRecommendation({ facts, locale: 'ru', nowMs: 7000, primaryDestinationId: null, rules: [candidate], history: { practice: { lastShownAt: 1000, variants: { 'practice.a': { ru: 6000 }, 'practice.b': { ru: 2000 } } } } });
    expect(selected.variantId).toBe('practice.b');
  });

  test('does not treat unknown daily metrics as zero', () => {
    const zeroOnly = rule('zero', 100, 'practice');
    zeroOnly.eligible = (value) => value.todayStudyMinutes === 0;
    expect(selectTodayRecommendation({ facts, locale: 'ru', nowMs: 5000, primaryDestinationId: null, rules: [zeroOnly], history: {} }).ruleId).toBe('today.lessons.explore');
  });
});
