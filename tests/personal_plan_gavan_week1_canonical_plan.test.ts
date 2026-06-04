import {
  buildGavanWeek1CanonicalPlan,
  buildGavanWeek1ImplementationQueue,
  validateGavanWeek1CanonicalPlan,
} from '../app/personal_plan_gavan_week1_canonical_plan';

const FORBIDDEN_COPY_RE =
  /\b(?:dev|debug|draft|placeholder|scene|scenario|apartment|viewing|landlord|rent|phone|email|passport number|doctor appointment|alex|beta)\b|@|\d{3,}/i;
const BAD_FEEDBACK_RE = /(?:вы выбрали|ты выбрал|selected|wrong option|этот вариант говорит|вариант которого нет)/i;
const MOJIBAKE_RE = /[\u00d0\u00d1\u00c2\u00e2]/;

describe('Gavan week 1 canonical plan after reset', () => {
  it('contains seven broad days with real exercise variety instead of narrow personal-data drills', () => {
    const plan = buildGavanWeek1CanonicalPlan();

    expect(plan.planId).toBe('gavan');
    expect(plan.weekIndex).toBe(1);
    expect(plan.status).toBe('canonical_ready_for_runtime_bridge');
    expect(plan.days).toHaveLength(7);
    expect(plan.days.map((day) => day.dayIndex)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(plan.days.map((day) => day.titleRu)).not.toContain('Кто я');

    const allExerciseTypes = new Set(
      plan.days.flatMap((day) => day.exerciseBlocks.map((block) => block.exerciseType)),
    );
    expect([...allExerciseTypes].sort()).toEqual([
      'lesson_bridge',
      'listening_choice',
      'micro_dialogue',
      'missing_word',
      'mistake_repair',
      'natural_choice',
      'phrase_build',
      'phrase_recall',
      'pronunciation_shadow',
      'quick_reply',
    ]);

    const allText = JSON.stringify(plan);
    expect(allText).not.toMatch(FORBIDDEN_COPY_RE);
    expect(allText).not.toMatch(MOJIBAKE_RE);
  });

  it('starts every day from lesson grounding and grows workload only through 5/10/15/20 minute choices', () => {
    const plan = buildGavanWeek1CanonicalPlan();

    for (const day of plan.days) {
      expect(day.exerciseBlocks[0].exerciseType).toBe('lesson_bridge');
      expect(day.exerciseBlocks[0].prerequisiteLessonIds.length).toBeGreaterThan(0);
      expect(Object.keys(day.loadByMinutes)).toEqual(['5', '10', '15', '20']);

      const load5 = day.loadByMinutes[5];
      const load10 = day.loadByMinutes[10];
      const load15 = day.loadByMinutes[15];
      const load20 = day.loadByMinutes[20];

      expect(load5.blockIds.length).toBeGreaterThanOrEqual(1);
      expect(load10.blockIds.length).toBeGreaterThan(load5.blockIds.length);
      expect(load15.blockIds.length).toBeGreaterThanOrEqual(load10.blockIds.length);
      expect(load20.blockIds.length).toBeGreaterThan(load15.blockIds.length);
      expect(load20.estimatedMinutes).toBeLessThanOrEqual(20);
    }
  });

  it('requires explanations for every new word and construction without inventing unseen wrong choices', () => {
    const plan = buildGavanWeek1CanonicalPlan();

    for (const day of plan.days) {
      for (const phrase of day.phrases) {
        expect(phrase.explanationCards.length).toBeGreaterThan(0);
        const covered = new Set(phrase.explanationCards.flatMap((card) => card.covers));
        for (const target of [...phrase.newWords, ...phrase.firstSeenConstructions]) {
          expect(covered.has(target)).toBe(true);
        }
        for (const card of phrase.explanationCards) {
          expect(card.correctRu.length).toBeGreaterThanOrEqual(40);
          expect(card.wrongRu.length).toBeGreaterThanOrEqual(40);
          expect(card.correctRu).not.toMatch(BAD_FEEDBACK_RE);
          expect(card.wrongRu).not.toMatch(BAD_FEEDBACK_RE);
        }
      }
    }
  });

  it('plans a 10-question daily quiz with sources from that day only', () => {
    const plan = buildGavanWeek1CanonicalPlan();

    for (const day of plan.days) {
      const dayPhraseIds = new Set(day.phrases.map((phrase) => phrase.id));
      expect(day.quiz.questionCount).toBe(10);
      expect(day.quiz.questions).toHaveLength(10);
      for (const question of day.quiz.questions) {
        expect(dayPhraseIds.has(question.sourcePhraseId)).toBe(true);
        expect(question.promptRu.length).toBeGreaterThan(15);
        expect(question.options).toHaveLength(4);
        expect(question.options.filter((option) => option.isCorrect)).toHaveLength(1);
      }
    }
  });

  it('passes the canonical quality gate and exposes a large implementation queue', () => {
    const plan = buildGavanWeek1CanonicalPlan();
    const validation = validateGavanWeek1CanonicalPlan(plan);
    const queue = buildGavanWeek1ImplementationQueue(plan);

    expect(validation).toEqual({ valid: true, issues: [] });
    expect(queue).toHaveLength(24);
    expect(queue[0]).toEqual(expect.objectContaining({
      id: 'gavan-week1-bridge-canonical-plan',
      priority: 'P0',
    }));
    expect(queue.some((item) => item.id === 'gavan-week1-final-audio-generation')).toBe(true);
    expect(queue.some((item) => item.id === 'gavan-week1-maestro-runtime-smoke')).toBe(true);
  });
});
