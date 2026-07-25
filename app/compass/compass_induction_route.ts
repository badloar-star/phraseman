/**
 * Компас — маршрутизация индакшн-фич. Волна 6.1 (персональное приветствие).
 *
 * Превращает выбранную мозгом индакшн-фичу (CompassInductionFeature — «что
 * классного попробовать первым») в реальный экран приложения. Чистый маппинг,
 * без сайд-эффектов: навигацию выполняет вызывающий слой (host).
 *
 * Все маршруты — РЕАЛЬНО существующие роуты expo-router, подтверждённые живыми
 * router.push в приложении:
 *  - level_test  → /diagnostic_test     (lessons.tsx:1125, daily_tasks_screen.tsx:2098)
 *  - dialogs     → /ai_dialog_home      (_admin_settings_testers.tsx:3403)
 *  - flashcards  → /flashcards_swipe     (как в compass_task_route)
 *  - lessons     → /lesson_menu         (как в compass_task_route; таб уроков заменён Журналом)
 *  - daily_tasks → /daily_tasks_screen  (_admin_settings_testers.tsx:4778)
 *
 * ИЗОЛЯЦИЯ: модуль не читает сигналы и не зависит от состояния — только маппинг.
 */
import type { CompassInductionFeature } from './compass_brain';
import type { CompassRoute } from './compass_task_route';

/** Куда ведёт индакшн-подсказка «попробуй первым». */
export function compassInductionRoute(feature: CompassInductionFeature): CompassRoute {
  switch (feature) {
    case 'level_test':
      return { pathname: '/diagnostic_test' };
    case 'dialogs':
      return { pathname: '/ai_dialog_home' };
    case 'flashcards':
      return { pathname: '/flashcards_swipe' };
    case 'lessons':
      return { pathname: '/(tabs)/lessons' };
    case 'daily_tasks':
      return { pathname: '/daily_tasks_screen' };
    default:
      // Неизвестная фича (на будущее) — безопасный общий вход.
      return { pathname: '/(tabs)/lessons' };
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route. */
export default function __RouteShim() {
  return null;
}
