// ═══════════════════════════════════════════════════════════════════════════
// home_scene_count.ts — одно правило числа «N из M» на «Сцене» Главной и в окне эпизода «Обучения».
//
// зачем (Сверка 24.10 через координатора: окно эпизода «0 заданий», а в сессии 19; на Главной «0 из 50» до входа в эпизод и «0 из 56»
// после): число показывается, только если оно известно из данных курса. Неизвестное — не рисуется, а не «0». Карточка урока V2 не
// берёт число старого курса (50 фраз) — пока прогресс урока V2 читается с диска, числа нет. Каждое решение пишет [SEASON-COUNT]
// с источником.
// ═══════════════════════════════════════════════════════════════════════════

export const SEASON_COUNT_LOG = '[SEASON-COUNT]';

/** Фраз в уроке старого курса — его прогресс считается в фразах. */
export const LEGACY_LESSON_PHRASES = 50;

export type HomeSceneCountSource = 'place' | 'v2_progress' | 'v2_pending' | 'legacy_lesson' | 'none';

export type HomeSceneCount = Readonly<{ done: number | null; total: number | null; source: HomeSceneCountSource }>;

export type HomeSceneCountInput = Readonly<{
  /** Место продолжения — диалог / набор карточек / «Начать урок 1»: у них числа нет. */
  onPlace: boolean;
  /** Карточка про занятие курса V2 (есть метка V2). */
  v2: boolean;
  /** Прогресс урока V2: пройдено / выпущено занятий урока (локальный прогресс курса); null — ещё читается или не прочитался. */
  v2Progress: Readonly<{ done: number; total: number }> | null;
  /** Прогресс урока старого курса (фразы 0…50); null — урока нет. */
  legacyProgress: number | null;
}>;

/** Число для подписи «N из M» на «Сцене» Главной. */
export function homeSceneLessonCount(i: HomeSceneCountInput): HomeSceneCount {
  if (i.onPlace) return { done: null, total: null, source: 'place' };
  if (i.v2) {
    if (!i.v2Progress) return { done: null, total: null, source: 'v2_pending' };
    const total = Math.max(1, i.v2Progress.total);
    return { done: Math.max(0, Math.min(total, i.v2Progress.done)), total, source: 'v2_progress' };
  }
  if (i.legacyProgress !== null) {
    return { done: Math.max(0, Math.min(LEGACY_LESSON_PHRASES, i.legacyProgress)), total: LEGACY_LESSON_PHRASES, source: 'legacy_lesson' };
  }
  return { done: null, total: null, source: 'none' };
}

/** Число заданий эпизода для окна эпизода: только известное из данных курса и больше нуля; иначе подписи нет. */
export function seasonEpisodeTasksShown(tasksCount: number | null): number | null {
  return typeof tasksCount === 'number' && Number.isFinite(tasksCount) && tasksCount > 0 ? Math.round(tasksCount) : null;
}

/** Подзаголовок окна эпизода: не повторяет крупную строку (у эпизода без фразы обе — название). */
export function seasonEpisodeSubtitle(title: string | null, phrase: string): string | null {
  if (!title) return null;
  return title.trim().toLocaleLowerCase() === phrase.trim().toLocaleLowerCase() ? null : title;
}
