/**
 * Компас — маршрутизация задач брифинга. Волна 2.3 (доводка).
 *
 * Раньше задачи в модале брифинга были некликабельны, а кнопка «Начать день»
 * жёстко вела в /personal_plan. Этот модуль превращает тип задачи (CompassTaskKind)
 * в реальный экран приложения, чтобы каждая задача из брифинга открывала своё дело.
 *
 * Все маршруты — РЕАЛЬНО существующие роуты expo-router, подтверждённые живыми
 * вызовами router.push в приложении (см. комментарии у каждого case). Чистая
 * функция без побочных эффектов: на вход — задача и день, на выход — описание
 * перехода. Навигацию выполняет вызывающий слой (host), чтобы модуль оставался
 * тестируемым и не тянул expo-router.
 *
 * ИЗОЛЯЦИЯ: модуль не читает сигналы и не зависит от состояния — только маппинг.
 */
import type { CompassDay, CompassTask } from './compass_brain';
import type { DayClosingRitual } from './day_closing_ritual';

export interface CompassRoute {
  pathname: string;
  params?: Record<string, string>;
}

/**
 * Куда ведёт «Фокус на завтра» из вечернего ритуала. Раньше строка была
 * ненажимаемой — обещание «первый шаг уже выбран» без ручки. Теперь тап
 * открывает экран, где этот шаг реально делается (маршруты те же, что у задач):
 *  - слабая фраза / слабое место → /trainer («Моя практика», разбор);
 *  - очередь повторений / точечное повторение → /flashcards_swipe;
 *  - продолжение плана → /personal_plan;
 *  - сложный раунд → /(tabs)/quizzes (реальный таб квизов);
 *  - остальное (свежие фразы, карточки, одна фраза) → /flashcards_swipe | /personal_plan.
 */
export function dayClosingFocusRoute(ritual: Pick<DayClosingRitual, 'focus' | 'repeatKind'>): CompassRoute {
  const kind = ritual.focus.kind;
  switch (kind) {
    case 'weak_phrase':
    case 'weak_area':
      return { pathname: '/trainer' };
    case 'due':
    case 'targeted_review':
    case 'fresh_phrases':
    case 'cards':
      return { pathname: '/flashcards_swipe' };
    case 'plan':
      return { pathname: '/personal_plan' };
    case 'round':
      return { pathname: '/(tabs)/quizzes' };
    case 'one_phrase':
    default:
      return { pathname: '/personal_plan' };
  }
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
        ? { pathname: '/lesson_menu', params: { id: task.focus } }
        : { pathname: '/lessons_list' };
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
