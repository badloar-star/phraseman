// зачем D129/D130 (владелец 2026-09-30): ежедневные задания включают только то, что
// можно сделать в видимых для языка разделах. Язык обучения без курса не должен
// получать «Пройти урок», итальянский — «Потренировать диалог».
import type { TodayTask, TodayTaskKind } from '../components/home/v2/home_v2_types';
import type { LearningLanguageTarget } from './learning_language_contour';
import type { LearningLanguageSurface } from './learning_language_surface_matrix';
import { isLearningSurfaceReady } from './learning_language_surface_readiness';

/**
 * Каждый тип задания читает клетку таблицы готовности — своих списков языков нет.
 * зачем D154: Шпиль — раздел таблицы (en/es/fr/de/it включены).
 * зачем D134: задание дня «Мои ошибки» — только для языков с курсом (раздел lessons);
 * плашка ошибок на Главной от этого не зависит и видна для любого языка.
 */
export const TODAY_TASK_KIND_SURFACE: Readonly<Record<TodayTaskKind, LearningLanguageSurface>> = Object.freeze({
  lesson: 'lessons',
  dialog: 'dialogues',
  cards: 'flashcards',
  video: 'videos',
  mistakes: 'lessons',
  spire_steps: 'spire',
});

export function isTodayTaskKindAvailableForTarget(kind: TodayTaskKind, target: LearningLanguageTarget): boolean {
  const surface = TODAY_TASK_KIND_SURFACE[kind];
  return surface ? isLearningSurfaceReady(target, surface) : false;
}

const loggedDrops = new Set<string>();

export function filterTodayTasksForTarget(tasks: readonly TodayTask[], target: LearningLanguageTarget): TodayTask[] {
  return tasks.filter((task) => {
    const available = isTodayTaskKindAvailableForTarget(task.kind, target);
    if (!available) {
      // Лог раз на пару «язык+тип»: функция зовётся в рендере Главной.
      const key = `${target}:${task.kind}`;
      if (!loggedDrops.has(key)) {
        loggedDrops.add(key);
        console.log('[LANG-SURFACE] today_tasks:drop', { target, kind: task.kind, id: task.id });
      }
    }
    return available;
  });
}

/* expo-router: не регистрировать файл как экран */
export default function __TodayTaskSurfaceFilterRouteShim() {
  return null;
}
