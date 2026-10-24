// зачем (Сверка 24.10, координатор): «Пройти урок» на «Сегодня» и в панели Главной ведёт в хаб Сезона (вкладка «Уроки»), пока Сезон
// включён и курс V2 не скрыт; иначе — прежний классический список.
import { TODAY_LESSON_ROUTE, TODAY_TASK_ROUTES } from '../modules/today-tasks/today_tasks_view';
import { SEASON_SCENE_V2_ENABLED } from '../components/learning-v2/season/season_flags';
import { LEARNING_V2_HIDDEN } from '../app/learning_v2_visibility_switch';

describe('задача дня «Пройти урок»: куда ведёт', () => {
  it('Сезон включён и V2 не скрыт — вкладка «Уроки» (хаб Сезона); иначе старый список', () => {
    expect(TODAY_LESSON_ROUTE).toBe(SEASON_SCENE_V2_ENABLED && !LEARNING_V2_HIDDEN ? '/(tabs)/lessons' : '/lessons_list');
    expect(TODAY_TASK_ROUTES.lesson).toBe(TODAY_LESSON_ROUTE);
  });
});
