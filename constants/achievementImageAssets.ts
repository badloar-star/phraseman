import type { ImageSourcePropType } from 'react-native';
import { getAchievementImageUrl } from './achievement_image_urls';
import { isCoreAchievementArt } from './achievementCoreArt';

/**
 * Арт достижений. В бандле остаётся только «ядро» — первые награды, которые
 * новичок получает в первые дни (constants/achievementCoreArt.ts). Остальные
 * 64 статуэтки (3.84 МБ) лежат в Firebase Storage и стримятся с дисковым кэшем
 * (Фаза 4 «Бандл-диеты», решение владельца 2026-08-24).
 *
 * зачем именно так: пользователь не должен НИКОГДА увидеть пустое место вместо
 * иконки. Гарантия трёхслойная:
 *   1) ядро имеет локальный static require — мгновенно и офлайн;
 *   2) удалённый арт прогревается заранее и по событиям, а не по таймеру
 *      (app/achievement_art_prefetch.ts): вход на экран достижений и закрытие
 *      сессии урока, когда награда может открыться;
 *   3) если арт всё же недоступен — components/AchievementArt.tsx рисует щит в
 *      цвете категории той же геометрии, а не пустоту и не спиннер.
 *
 * Каждый require ядра остаётся статическим, чтобы бандлер смог его забандлить.
 */
export const ACHIEVEMENT_IMAGE: Readonly<Record<string, ImageSourcePropType>> = {
  streak_3:                         require('../assets/images/achievements/streak_3.webp'),
  streak_7:                         require('../assets/images/achievements/streak_7.webp'),
  xp_100:                           require('../assets/images/achievements/xp_100.webp'),
  xp_250:                           require('../assets/images/achievements/xp_250.webp'),
  xp_500:                           require('../assets/images/achievements/xp_500.webp'),
  comeback:                         require('../assets/images/legacy-achievements/comeback.webp'),
  shards_100:                       require('../assets/images/achievements/shards_100.webp'),
};

/**
 * Источник арта для достижения: бандл (мгновенно) → удалённый URL (стрим +
 * дисковый кэш) → undefined, если арта нет вовсе (тогда рисуется щит).
 */
export function achievementImageSource(id: string): ImageSourcePropType | undefined {
  if (isCoreAchievementArt(id)) return ACHIEVEMENT_IMAGE[id];
  const url = getAchievementImageUrl(id);
  return url ? { uri: url } : ACHIEVEMENT_IMAGE[id];
}
