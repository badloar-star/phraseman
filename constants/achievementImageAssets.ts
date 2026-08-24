import type { ImageSourcePropType } from 'react-native';
import { getAchievementImageUrl } from './achievementImageUrlMap.generated';
import { isCoreAchievementArt } from './achievementCoreArt';

/**
 * Арт достижений. Foundation V2 держит в бандле ровно 70 активных статуэток,
 * чтобы музейная полка всегда имела локальный fallback. Для не-core наград
 * Firebase Storage по-прежнему может быть первым источником и прогреваться в
 * фоне; `comeback` остаётся отдельным legacy fallback вне каталога V2.
 *
 * зачем именно так: пользователь не должен НИКОГДА увидеть пустое место вместо
 * иконки. Гарантия трёхслойная:
 *   1) core и все 70 активных V2-статуэток имеют локальный static require;
 *   2) удалённый арт прогревается в фоне при старте (app/achievement_art_prefetch.ts);
 *   3) если источник всё же недоступен — рисуется щит-заглушка в цвете категории,
 *      а не пустота.
 *
 * Каждый require остаётся статическим, чтобы Metro смог его забандлить.
 */
export const ACHIEVEMENT_IMAGE: Readonly<Record<string, ImageSourcePropType>> = {
  streak_3:                         require('../assets/images/achievements/streak_3.webp'),
  streak_7:                         require('../assets/images/achievements/streak_7.webp'),
  streak_14:                        require('../assets/images/achievements/streak_14.webp'),
  streak_30:                        require('../assets/images/achievements/streak_30.webp'),
  streak_60:                        require('../assets/images/achievements/streak_60.webp'),
  streak_100:                       require('../assets/images/achievements/streak_100.webp'),
  streak_150:                       require('../assets/images/achievements/streak_150.webp'),
  streak_200:                       require('../assets/images/achievements/streak_200.webp'),
  streak_250:                       require('../assets/images/achievements/streak_250.webp'),
  streak_365:                       require('../assets/images/achievements/streak_365.webp'),
  streak_500:                       require('../assets/images/achievements/streak_500.webp'),
  streak_750:                       require('../assets/images/achievements/streak_750.webp'),
  streak_1000:                      require('../assets/images/achievements/streak_1000.webp'),
  streak_clean_365:                 require('../assets/images/achievements/streak_clean_365.webp'),
  xp_100:                           require('../assets/images/achievements/xp_100.webp'),
  xp_250:                           require('../assets/images/achievements/xp_250.webp'),
  xp_500:                           require('../assets/images/achievements/xp_500.webp'),
  xp_1000:                          require('../assets/images/achievements/xp_1000.webp'),
  xp_2500:                          require('../assets/images/achievements/xp_2500.webp'),
  xp_5000:                          require('../assets/images/achievements/xp_5000.webp'),
  xp_10000:                         require('../assets/images/achievements/xp_10000.webp'),
  xp_20000:                         require('../assets/images/achievements/xp_20000.webp'),
  xp_50000:                         require('../assets/images/achievements/xp_50000.webp'),
  xp_75000:                         require('../assets/images/achievements/xp_75000.webp'),
  xp_100000:                        require('../assets/images/achievements/xp_100000.webp'),
  xp_150000:                        require('../assets/images/achievements/xp_150000.webp'),
  xp_250000:                        require('../assets/images/achievements/xp_250000.webp'),
  xp_500000:                        require('../assets/images/achievements/xp_500000.webp'),
  xp_750000:                        require('../assets/images/achievements/xp_750000.webp'),
  xp_1000000:                       require('../assets/images/achievements/xp_1000000.webp'),
  xp_2000000:                       require('../assets/images/achievements/xp_2000000.webp'),
  league_champion:                  require('../assets/images/achievements/league_champion.webp'),
  comeback:                         require('../assets/images/legacy-achievements/comeback.webp'),
  shards_100:                       require('../assets/images/achievements/shards_100.webp'),
  shards_250:                       require('../assets/images/achievements/shards_250.webp'),
  shards_500:                       require('../assets/images/achievements/shards_500.webp'),
  shards_1000:                      require('../assets/images/achievements/shards_1000.webp'),
  shards_2500:                      require('../assets/images/achievements/shards_2500.webp'),
  shards_5000:                      require('../assets/images/achievements/shards_5000.webp'),
  shards_10000:                     require('../assets/images/achievements/shards_10000.webp'),
  league_reached_copper:            require('../assets/images/achievements/league_reached_copper.webp'),
  league_reached_bronze:            require('../assets/images/achievements/league_reached_bronze.webp'),
  league_reached_silver:            require('../assets/images/achievements/league_reached_silver.webp'),
  league_reached_gold:              require('../assets/images/achievements/league_reached_gold.webp'),
  league_reached_platinum:          require('../assets/images/achievements/league_reached_platinum.webp'),
  league_reached_emerald:           require('../assets/images/achievements/league_reached_emerald.webp'),
  league_reached_sapphire:          require('../assets/images/achievements/league_reached_sapphire.webp'),
  league_reached_ruby:              require('../assets/images/achievements/league_reached_ruby.webp'),
  league_reached_diamond:           require('../assets/images/achievements/league_reached_diamond.webp'),
  league_reached_black_diamond:     require('../assets/images/achievements/league_reached_black_diamond.webp'),
  league_reached_ether:             require('../assets/images/achievements/league_reached_ether.webp'),
  league_reached_supreme:           require('../assets/images/achievements/league_reached_supreme.webp'),
  league_champion_5:                require('../assets/images/achievements/league_champion_5.webp'),
  league_champion_10:               require('../assets/images/achievements/league_champion_10.webp'),
  league_diamond_4_weeks:           require('../assets/images/achievements/league_diamond_4_weeks.webp'),
  time_foreground_10h:              require('../assets/images/achievements/time_foreground_10h.webp'),
  time_foreground_50h:              require('../assets/images/achievements/time_foreground_50h.webp'),
  time_foreground_100h:             require('../assets/images/achievements/time_foreground_100h.webp'),
  time_foreground_250h:             require('../assets/images/achievements/time_foreground_250h.webp'),
  time_foreground_500h:             require('../assets/images/achievements/time_foreground_500h.webp'),
  time_foreground_1000h:            require('../assets/images/achievements/time_foreground_1000h.webp'),
  access_plus_paid:                 require('../assets/images/achievements/access_plus_paid.webp'),
  access_pro_paid:                  require('../assets/images/achievements/access_pro_paid.webp'),
  // Секретные легенды Foundation V2 в том же прозрачном 2.5D-пайплайне.
  legend_long_game:                 require('../assets/images/achievements/legend_long_game.webp'),
  legend_every_league:              require('../assets/images/achievements/legend_every_league.webp'),
  legend_supreme_champion:          require('../assets/images/achievements/legend_supreme_champion.webp'),
  legend_full_cabinet:              require('../assets/images/achievements/legend_full_cabinet.webp'),
  legend_one_more_zero:             require('../assets/images/achievements/legend_one_more_zero.webp'),
  legend_patient_capital:           require('../assets/images/achievements/legend_patient_capital.webp'),
  legend_founder_era:               require('../assets/images/achievements/legend_founder_era.webp'),
  legend_second_wind:               require('../assets/images/achievements/legend_second_wind.webp'),
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
