/**
 * Тесты маршрутизации задач брифинга «Компаса» (compass_task_route).
 * Чистая функция — проверяем маппинг типа задачи в реальный роут + параметры.
 */
import { compassTaskRoute } from '../app/compass/compass_task_route';
import type { CompassDay, CompassTask } from '../app/compass/compass_brain';

const day: CompassDay = { type: 'easy', tasks: [] };

function task(partial: Partial<CompassTask> & Pick<CompassTask, 'kind'>): CompassTask {
  return { minutes: 2, ...partial };
}

describe('compassTaskRoute', () => {
  it('lesson_dive с focus → /lesson_menu?id=focus', () => {
    const r = compassTaskRoute(task({ kind: 'lesson_dive', focus: '5' }), day);
    expect(r.pathname).toBe('/lesson_menu');
    expect(r.params).toEqual({ id: '5' });
  });

  it('lesson_dive без focus → общий список уроков', () => {
    const r = compassTaskRoute(task({ kind: 'lesson_dive' }), day);
    expect(r.pathname).toBe('/(tabs)/lessons');
    expect(r.params).toBeUndefined();
  });

  it('mistake_repair → тренажёр слабых мест (mode=weak)', () => {
    const r = compassTaskRoute(task({ kind: 'mistake_repair', weakTopic: 'verb' }), day);
    expect(r.pathname).toBe('/trainer_smart_session');
    expect(r.params).toEqual({ mode: 'weak' });
  });

  it('flashcards_review → /flashcards_swipe', () => {
    expect(compassTaskRoute(task({ kind: 'flashcards_review' }), day).pathname).toBe('/flashcards_swipe');
  });

  it('plan_continue → /personal_plan', () => {
    expect(compassTaskRoute(task({ kind: 'plan_continue' }), day).pathname).toBe('/personal_plan');
  });

  it('pronunciation → fallback /personal_plan (нет отдельного экрана)', () => {
    expect(compassTaskRoute(task({ kind: 'pronunciation' }), day).pathname).toBe('/personal_plan');
  });

  it('работает при day=null', () => {
    expect(compassTaskRoute(task({ kind: 'flashcards_review' }), null).pathname).toBe('/flashcards_swipe');
  });
});
