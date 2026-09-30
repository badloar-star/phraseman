// зачем D129/D130 (владелец 2026-09-30): ежедневные задания включают только то, что
// можно сделать в видимых для языка разделах. Язык обучения без курса не должен
// получать «Пройти урок», итальянский — «Потренировать диалог».
import type { TodayTask, TodayTaskKind } from '../components/home/v2/home_v2_types';
import type { LearningLanguageTarget } from './learning_language_contour';
import type { LearningLanguageSurface } from './learning_language_surface_matrix';
import { isLearningSurfaceReady } from './learning_language_surface_readiness';

/**
 * Шпиль не входит в таблицу разделов: его пул заданий собран для en/es/fr/de
 * (functions/src/spire_multilingual_pool.ts), для it контента нет. Решение владельца
 * о Шпиле по языкам ещё не принято — это открытый вопрос (отчёт D129/D130).
 */
const SPIRE_TASK_TARGETS: readonly LearningLanguageTarget[] = Object.freeze(['en', 'es', 'fr', 'de']);

/** «Мои ошибки» копятся из курса — без курса разбирать нечего. */
export const TODAY_TASK_KIND_SURFACE: Readonly<Record<Exclude<TodayTaskKind, 'spire_steps'>, LearningLanguageSurface>> = Object.freeze({
  lesson: 'lessons',
  dialog: 'dialogues',
  cards: 'flashcards',
  video: 'videos',
  mistakes: 'lessons',
});

export function isTodayTaskKindAvailableForTarget(kind: TodayTaskKind, target: LearningLanguageTarget): boolean {
  if (kind === 'spire_steps') return SPIRE_TASK_TARGETS.includes(target);
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
