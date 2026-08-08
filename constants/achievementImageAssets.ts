import type { ImageSourcePropType } from 'react-native';
import { getAchievementImageUrl } from './achievementImageUrlMap.generated';
import { isCoreAchievementArt } from './achievementCoreArt';

/**
 * Арт достижений. Раньше здесь бандлились все ~223 webp (6.63 МБ — треть веса
 * всех ассетов). Теперь в бандле остаётся только «ядро» — достижения первых
 * дней (см. constants/achievementCoreArt.ts), а остальные стримятся из Firebase
 * Storage и кэшируются на диск.
 *
 * зачем именно так: пользователь не должен НИКОГДА увидеть пустое место вместо
 * иконки. Гарантия трёхслойная:
 *   1) арт первых достижений лежит в бандле — мгновенно и офлайн;
 *   2) остальной арт прогревается в фоне при старте (app/achievement_art_prefetch.ts),
 *      то есть задолго до того, как пользователь его заслужит;
 *   3) если сети всё же не было — рисуется щит-заглушка в цвете категории
 *      с векторной иконкой (AchievementArt), а не пустота.
 *
 * Каждый require остаётся статическим, чтобы Metro смог его забандлить.
 */
export const ACHIEVEMENT_IMAGE: Readonly<Record<string, ImageSourcePropType>> = {
  streak_3:                         require('../assets/images/achievements/streak_3.webp'),
  streak_7:                         require('../assets/images/achievements/streak_7.webp'),
  perfect_week:                     require('../assets/images/achievements/perfect_week.webp'),
  lesson_1:                         require('../assets/images/achievements/lesson_1.webp'),
  lesson_3:                         require('../assets/images/achievements/lesson_3.webp'),
  lesson_5:                         require('../assets/images/achievements/lesson_5.webp'),
  lesson_perfect:                   require('../assets/images/achievements/lesson_perfect.webp'),
  xp_100:                           require('../assets/images/achievements/xp_100.webp'),
  xp_250:                           require('../assets/images/achievements/xp_250.webp'),
  xp_500:                           require('../assets/images/achievements/xp_500.webp'),
  combo_3:                          require('../assets/images/achievements/combo_3.webp'),
  combo_10:                         require('../assets/images/achievements/combo_10.webp'),
  daily_task_first:                 require('../assets/images/achievements/daily_task_first.webp'),
  all_daily:                        require('../assets/images/achievements/all_daily.webp'),
  daily_phrase_first:               require('../assets/images/achievements/daily_phrase_first.webp'),
  login_7:                          require('../assets/images/achievements/login_7.webp'),
  comeback:                         require('../assets/images/achievements/comeback.webp'),
  diagnosis:                        require('../assets/images/achievements/diagnosis.webp'),
  exam_first:                       require('../assets/images/achievements/exam_first.webp'),
  flashcards_session:               require('../assets/images/achievements/flashcards_session.webp'),
  recall_first:                     require('../assets/images/achievements/recall_first.webp'),
  shards_100:                       require('../assets/images/achievements/shards_100.webp'),
  energy_refill_first:              require('../assets/images/achievements/energy_refill_first.webp'),
  league_result_first:              require('../assets/images/achievements/league_result_first.webp'),
};

/**
 * Источник арта для достижения: бандл (мгновенно) → удалённый URL (стрим +
 * дисковый кэш) → undefined, если арта нет вовсе (тогда рисуется заглушка).
 */
export function achievementImageSource(id: string): ImageSourcePropType | undefined {
  if (isCoreAchievementArt(id)) return ACHIEVEMENT_IMAGE[id];
  const url = getAchievementImageUrl(id);
  return url ? { uri: url } : ACHIEVEMENT_IMAGE[id];
}
