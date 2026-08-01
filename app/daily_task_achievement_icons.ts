import type { ImageSourcePropType } from 'react-native';

/**
 * Current rotation plus reroll-only variants from the active Daily Quest contract.
 * Each slot is static so Metro bundles exactly one generated icon per visible task.
 */
export const ACTIVE_DAILY_TASK_ID_ACHIEVEMENT_ICONS = {
  da1: require('../assets/images/daily_task_icons/by_id/da1.webp'),
  tw1: require('../assets/images/daily_task_icons/by_id/tw1.webp'),
  tw2: require('../assets/images/daily_task_icons/by_id/tw2.webp'),
  tp1: require('../assets/images/daily_task_icons/by_id/tp1.webp'),
  tp2: require('../assets/images/daily_task_icons/by_id/tp2.webp'),
  wl1: require('../assets/images/daily_task_icons/by_id/wl1.webp'),
  ra1: require('../assets/images/daily_task_icons/by_id/ra1.webp'),
  ra2: require('../assets/images/daily_task_icons/by_id/ra2.webp'),
  vl1: require('../assets/images/daily_task_icons/by_id/vl1.webp'),
} as const satisfies Record<string, ImageSourcePropType>;

type ActiveDailyTaskIconId = keyof typeof ACTIVE_DAILY_TASK_ID_ACHIEVEMENT_ICONS;

export const getDailyTaskAchievementIcon = (
  id?: string,
): ImageSourcePropType | undefined => {
  return id
    ? ACTIVE_DAILY_TASK_ID_ACHIEVEMENT_ICONS[id as ActiveDailyTaskIconId]
    : undefined;
};
