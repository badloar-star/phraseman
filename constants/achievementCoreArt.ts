/**
 * «Ядро» арта достижений — иконки, которые всегда выбираются из бандла первыми.
 *
 * зачем: все 70 активных V2 статуэток имеют bundled fallback, но non-core арт
 * может сначала загружаться из Firebase Storage. Для первых наград и legacy
 * comeback сеть никогда не участвует в выборе источника: они доступны с первого
 * кадра даже до фонового прогрева кэша.
 *
 * Правило отбора: первые награды актуальных веток — серия, XP, баланс жемчужин
 * и возвращение. Удалённые ветки Learning V1 здесь не бандлятся.
 *
 * Если добавляете сюда id — иконка автоматически перестаёт заливаться в Storage
 * (см. scripts/prepare_achievement_images_for_storage.mjs, он читает этот файл).
 */
export const CORE_ACHIEVEMENT_IDS = [
  'streak_3',
  'streak_7',
  'xp_100',
  'xp_250',
  'xp_500',
  'comeback',
  'shards_100',
] as const;

export type CoreAchievementId = (typeof CORE_ACHIEVEMENT_IDS)[number];

const CORE_SET: ReadonlySet<string> = new Set(CORE_ACHIEVEMENT_IDS);

/** true — арт достижения лежит в бандле (мгновенно, офлайн). */
export function isCoreAchievementArt(id: string): boolean {
  return CORE_SET.has(id);
}
