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

  // 2026-08-02: таб «Уроки» убран — общий выход без фокуса ведёт на push-список.
  it('routes lesson_dive without focus to the lessons list', () => {
    const r = compassTaskRoute(task({ kind: 'lesson_dive' }), day);
    expect(r.pathname).toBe('/lessons_list');
    expect(r.params).toBeUndefined();
  });

  it('routes mistake_repair to My Practice (/trainer) even WITH microDiagnosisId — not the old smart-queue', () => {
    // Раньше с microDiagnosisId вело прямо в /problem_coach (старая «умная очередь»)
    // мимо «Моей практики». Теперь разбор всегда открывает актуальный /trainer;
    // нужный микро-коуч тренажёр зовёт изнутри.
    const r = compassTaskRoute(
      task({ kind: 'mistake_repair', weakTopic: 'article', microDiagnosisId: 'article_a_an' }),
      day,
    );
    expect(r.pathname).toBe('/trainer');
    expect(r.params).toBeUndefined();
  });

  it('routes mistake_repair without microDiagnosisId to My Practice (/trainer)', () => {
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
