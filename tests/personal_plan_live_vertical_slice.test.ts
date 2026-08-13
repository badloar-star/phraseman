import { PERSONAL_PLAN_CATALOG, tasksForMinutes } from '../app/personal_plan_catalog';
import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';
import { buildPersonalPlanDayPassport } from '../app/personal_plan_quality';

const FORBIDDEN_LIVE_PLAN_COPY = /alex|beta|phone|email|apartment|rent|landlord|viewing|087|@|scene|сцен/i;
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\ufffd]/;

describe('live Personal Plans vertical slice', () => {
  const gavan = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === 'gavan')!;
  const day1 = gavan.days[0];

  it('ships Gavan day 1 as authored runtime content, not scaffold cards', () => {
    expect(gavan.name).toBe('Запас');
    expect(day1.status).toBe('certified');
    expect(day1.title).toBe('Короткие ответы');
    expect(day1.tasks.map((task) => task.kind)).toEqual([
      'plan_phrase_lesson',
      'plan_missing_word',
      'plan_phrase_recall',
      'plan_pronunciation_repeat',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
    ]);
    expect(day1.tasks.some((task) => task.destination.type === 'lesson')).toBe(false);
    expect(day1.tasks.some((task) => task.kind === 'plan_quiz')).toBe(false);
    expect(day1.tasks.some((task) => task.destination.type === 'quiz')).toBe(false);
  });

  it('keeps the full plan task pool independent while selected daily time controls the initial visible slice', () => {
    const expectedKinds = [
      'plan_phrase_lesson',
      'plan_missing_word',
      'plan_phrase_recall',
      'plan_pronunciation_repeat',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
    ];

    expect(day1.tasks.map((task) => task.kind)).toEqual(expectedKinds);
    expect(tasksForMinutes(day1, 5).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 3));
    expect(tasksForMinutes(day1, 10).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 4));
    expect(tasksForMinutes(day1, 15).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 5));
    expect(tasksForMinutes(day1, 20).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 6));
  });

  it('exposes every Day 1 live exercise destination as a visible task, not hidden scaffolding', () => {
    const exerciseDestinations = day1.tasks
      .filter((task) => task.destination.type === 'plan_exercise')
      .map((task) => task.destination.type === 'plan_exercise' ? task.destination.exerciseType : null);

    expect(exerciseDestinations).toEqual([
      'plan_missing_word',
      'plan_pronunciation_repeat',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
    ]);
  });

  it('connects day 1 to real plan phrases with hand-written explanations', () => {
    const task = day1.tasks.find((item) => item.kind === 'plan_phrase_lesson')!;
    expect(task.destination.type).toBe('plan_phrase_lesson');
    if (task.destination.type !== 'plan_phrase_lesson') return;

    const lesson = getPersonalPlanPhraseLesson(task.destination.lessonId);
    expect(lesson).not.toBeNull();
    // Канон контента: 6 фраз/день (см. PlanContentDay контракт).
    expect(lesson?.phrases).toHaveLength(6);

    const copy = JSON.stringify(lesson);
    expect(copy).not.toMatch(FORBIDDEN_LIVE_PLAN_COPY);
    expect(copy).not.toMatch(BROKEN_ENCODING_RE);
    for (const phrase of lesson!.phrases) {
      expect(phrase.words.some((word) => word.teachingNote?.correctRu && word.teachingNote?.wrongRu)).toBe(true);
    }
  });

  it('does not include a plan quiz task in the live day', () => {
    expect(day1.tasks.some((task) => task.kind === 'plan_quiz')).toBe(false);
    expect(day1.tasks.some((task) => task.destination.type === 'quiz')).toBe(false);
  });

  it('passes the runtime day passport before being shown as ready content', () => {
    const passport = buildPersonalPlanDayPassport(gavan, day1);
    expect(passport.issues).toEqual([]);
    expect(passport.ready).toBe(true);
    expect(passport.coverage.quizIds).toEqual([]);
    expect(passport.coverage.quizQuestionSources).toEqual([]);
    expect(day1.tasks).toHaveLength(7);
    expect(passport.load.byMinutes[5].taskCount).toBe(3);
    expect(passport.load.byMinutes[15].taskCount).toBe(5);
    expect(passport.load.byMinutes[20].taskCount).toBe(6);
  });
});
