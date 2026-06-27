import { compassTaskRoute } from '../app/compass/compass_task_route';
import type { CompassDay, CompassTask } from '../app/compass/compass_brain';

const day: CompassDay = { type: 'easy', tasks: [] };

function task(partial: Partial<CompassTask> & Pick<CompassTask, 'kind'>): CompassTask {
  return { minutes: 2, ...partial };
}

describe('compassTaskRoute', () => {
  it('routes lesson_dive with focus to lesson_menu', () => {
    const r = compassTaskRoute(task({ kind: 'lesson_dive', focus: '5' }), day);
    expect(r.pathname).toBe('/lesson_menu');
    expect(r.params).toEqual({ id: '5' });
  });

  it('routes lesson_dive without focus to lessons tab', () => {
    const r = compassTaskRoute(task({ kind: 'lesson_dive' }), day);
    expect(r.pathname).toBe('/(tabs)/lessons');
    expect(r.params).toBeUndefined();
  });

  it('routes mistake_repair with microDiagnosisId to the live Problem Coach', () => {
    const r = compassTaskRoute(
      task({ kind: 'mistake_repair', weakTopic: 'article', microDiagnosisId: 'article_a_an' }),
      day,
    );
    expect(r.pathname).toBe('/problem_coach');
    expect(r.params).toEqual({ microDiagnosisId: 'article_a_an', category: 'article' });
  });

  it('routes mistake_repair without microDiagnosisId to My Practice instead of legacy smart trainer', () => {
    const r = compassTaskRoute(task({ kind: 'mistake_repair', weakTopic: 'verb' }), day);
    expect(r.pathname).toBe('/trainer');
    expect(r.params).toBeUndefined();
  });

  it('routes flashcards_review to flashcards_swipe', () => {
    expect(compassTaskRoute(task({ kind: 'flashcards_review' }), day).pathname).toBe('/flashcards_swipe');
  });

  it('routes plan_continue to personal_plan', () => {
    expect(compassTaskRoute(task({ kind: 'plan_continue' }), day).pathname).toBe('/personal_plan');
  });

  it('routes pronunciation to personal_plan fallback', () => {
    expect(compassTaskRoute(task({ kind: 'pronunciation' }), day).pathname).toBe('/personal_plan');
  });

  it('works with day=null', () => {
    expect(compassTaskRoute(task({ kind: 'flashcards_review' }), null).pathname).toBe('/flashcards_swipe');
  });
});
