/**
 * «Ядро» арта достижений — иконки, которые ОСТАЮТСЯ в бандле приложения.
 *
 * зачем: остальные ~200 иконок переехали в Firebase Storage (−5.5 МБ из бандла),
 * но пользователь не должен НИКОГДА увидеть заглушку вместо арта. Эти достижения
 * новичок получает в первые дни — то есть ровно тогда, когда фоновый прогрев
 * кэша ещё мог не завершиться (первый запуск, слабая сеть, офлайн). Поэтому их
 * арт бандлится и доступен мгновенно и офлайн, с первого кадра.
 *
 * Правило отбора: первое достижение каждой ветки прогресса (уроки, стрик, XP,
 * комбо, ежедневные задания, вход, диагностика, экзамен, карточки, лига, осколки)
 * плюс ранние пороги, достижимые за первую неделю.
 *
 * Если добавляете сюда id — иконка автоматически перестаёт заливаться в Storage
 * (см. scripts/prepare_achievement_images_for_storage.mjs, он читает этот файл).
 */
export const CORE_ACHIEVEMENT_IDS = [
  'lesson_1',
  'lesson_3',
  'lesson_5',
  'lesson_perfect',
  'streak_3',
  'streak_7',
  'xp_100',
  'xp_250',
  'xp_500',
  'combo_3',
  'combo_10',
  'daily_task_first',
  'daily_phrase_first',
  'all_daily',
  'perfect_week',
  'login_7',
  'diagnosis',
  'exam_first',
  'flashcards_session',
  'recall_first',
  'comeback',
  'energy_refill_first',
  'league_result_first',
  'shards_100',
] as const;

export type CoreAchievementId = (typeof CORE_ACHIEVEMENT_IDS)[number];

const CORE_SET: ReadonlySet<string> = new Set(CORE_ACHIEVEMENT_IDS);

/** true — арт достижения лежит в бандле (мгновенно, офлайн). */
export function isCoreAchievementArt(id: string): boolean {
  return CORE_SET.has(id);
}
