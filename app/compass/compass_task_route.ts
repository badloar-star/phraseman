/** Чистое сопоставление рекомендованной задачи Компаса с экраном приложения. */
import type { CompassDay, CompassTask } from './compass_brain';

export interface CompassRoute {
  pathname: string;
  params?: Record<string, string>;
}

/**
 * Куда ведёт конкретная задача дня.
 *
 * Соответствия (с доказательством, что роут+параметры реальны):
 *  - lesson_dive       → /lesson_menu?id=<focus>   (lessons.tsx:922)
 *  - mistake_repair    → /trainer («Моя практика», актуальный режим разбора).
 *      Раньше вело прямо в /problem_coach (микро-очередь по microDiagnosisId) мимо
 *      «Моей практики» — это старый режим. Теперь разбор всегда открывает /trainer;
 *      сам тренажёр уже зовёт нужный микро-коуч (problem_coach) изнутри.
 *  - flashcards_review → /flashcards_swipe          (flashcards.tsx:186)
 *  - plan_continue     → /personal_plan             (home.tsx:2384)
 *  - pronunciation     → /personal_plan (fallback). «Повтори вслух» есть в каждом
 *      дне плана (plan_pronunciation_repeat), но требует план-scoped параметров,
 *      которых нет в самой задаче Компаса. Прямой переход на задачу произношения
 *      текущего дня делает host через resolvePronunciationRoute() (async-чтение
 *      активного плана); сюда попадаем только когда плана нет → ведём в /personal_plan.
 */
export function compassTaskRoute(task: CompassTask, _day: CompassDay | null): CompassRoute {
  switch (task.kind) {
    case 'lesson_dive':
      // focus = id рекомендованного урока (строка). Без id — общий список уроков.
      return task.focus
        ? { pathname: '/(tabs)/lessons', params: { id: task.focus } }
        : { pathname: '/(tabs)/lessons' };
    case 'mistake_repair':
      // Разбор фраз ведёт в актуальную «Мою практику» (/trainer). Прямой заход в
      // /problem_coach (старая микро-очередь по microDiagnosisId) убран: тренажёр
      // сам открывает нужный микро-коуч изнутри, как и для остальных входов.
      return { pathname: '/trainer' };
    case 'flashcards_review':
      return { pathname: '/flashcards_swipe' };
    case 'plan_continue':
      return { pathname: '/personal_plan' };
    case 'pronunciation':
      // Нет отдельного прод-экрана произношения — честный fallback в личный план.
      return { pathname: '/personal_plan' };
    default:
      // Неизвестный тип (на будущее) — безопасный общий вход.
      return { pathname: '/personal_plan' };
  }
}
