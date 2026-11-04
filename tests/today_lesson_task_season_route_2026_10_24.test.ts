// зачем (владелец 04.11, заморозка V2, уточнение): «Пройти урок» на «Сегодня» и любые входы из «Сегодня» ВСЕГДА ведут в обычный курс текущего языка
// изучения — у всех, в том числе у тех, у кого есть прогресс V2. Прежнее правило 24.10 (хаб Сезона при включённом Сезоне) отменено.
import { TODAY_LESSON_ROUTE, TODAY_TASK_ROUTES } from '../modules/today-tasks/today_tasks_view';

describe('задача дня «Пройти урок»: куда ведёт', () => {
  it('всегда обычный список уроков, не вкладка Сезона и не V2', () => {
    expect(TODAY_LESSON_ROUTE).toBe('/lessons_list');
    expect(TODAY_TASK_ROUTES.lesson).toBe(TODAY_LESSON_ROUTE);
    for (const route of Object.values(TODAY_TASK_ROUTES)) {
      expect(route).not.toMatch(/learning[-_]v2/);
    }
  });
});
