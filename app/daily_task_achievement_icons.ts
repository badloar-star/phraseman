import type { ImageSourcePropType } from 'react-native';

import type { TaskType } from './daily_tasks';

/** Compact transparent icons used by the first-visit Daily Quest modal. */
export const DAILY_TASK_ACHIEVEMENT_ICONS: Partial<Record<TaskType, ImageSourcePropType>> = {
  total_answers: require('../assets/images/daily_task_icons/total_answers.webp'),
  correct_streak: require('../assets/images/daily_task_icons/correct_streak.webp'),
  lesson_no_mistakes: require('../assets/images/daily_task_icons/lesson_no_mistakes.webp'),
  quiz_hard: require('../assets/images/daily_task_icons/quiz_hard.webp'),
  quiz_score: require('../assets/images/daily_task_icons/quiz_score.webp'),
  words_learned: require('../assets/images/daily_task_icons/words_learned.webp'),
  verb_learned: require('../assets/images/daily_task_icons/verb_learned.webp'),
  open_theory: require('../assets/images/daily_task_icons/open_theory.webp'),
  flashcard_view: require('../assets/images/daily_task_icons/flashcard_view.webp'),
  flashcard_save: require('../assets/images/daily_task_icons/flashcard_save.webp'),
  flashcard_flip: require('../assets/images/daily_task_icons/flashcard_flip.webp'),
  recall_session: require('../assets/images/daily_task_icons/recall_session.webp'),
  recall_answers: require('../assets/images/daily_task_icons/recall_answers.webp'),
  recall_perfect: require('../assets/images/daily_task_icons/recall_perfect.webp'),
  trainer_words: require('../assets/images/daily_task_icons/trainer_words.webp'),
  trainer_phrases: require('../assets/images/daily_task_icons/trainer_phrases.webp'),
  trainer_arena: require('../assets/images/daily_task_icons/trainer_arena.webp'),
  daily_phrase_read: require('../assets/images/daily_task_icons/daily_phrase_read.webp'),
  daily_phrase_save: require('../assets/images/daily_task_icons/daily_phrase_save.webp'),
  diagnostic_complete: require('../assets/images/daily_task_icons/diagnostic_complete.webp'),
  quiz_easy: require('../assets/images/daily_task_icons/quiz_easy.webp'),
  quiz_medium: require('../assets/images/daily_task_icons/quiz_medium.webp'),
  quiz_perfect: require('../assets/images/daily_task_icons/quiz_perfect.webp'),
  quiz_hard_perfect: require('../assets/images/daily_task_icons/quiz_hard_perfect.webp'),
  different_lessons: require('../assets/images/daily_task_icons/different_lessons.webp'),
  lesson_complete: require('../assets/images/daily_task_icons/lesson_complete.webp'),
  morning_session: require('../assets/images/daily_task_icons/morning_session.webp'),
  evening_session: require('../assets/images/daily_task_icons/evening_session.webp'),
  energy_spend: require('../assets/images/daily_task_icons/energy_spend.webp'),
  arena_play: require('../assets/images/daily_task_icons/arena_play.webp'),
  arena_win: require('../assets/images/daily_task_icons/arena_win.webp'),
  arena_plays_wins_combo: require('../assets/images/daily_task_icons/arena_plays_wins_combo.webp'),
  arena_rank_promoted: require('../assets/images/daily_task_icons/arena_rank_promoted.webp'),
  invite_friend: require('../assets/images/daily_task_icons/invite_friend.webp'),
};

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
  type: TaskType,
  id?: string,
): ImageSourcePropType | undefined => {
  const idIcon = id
    ? ACTIVE_DAILY_TASK_ID_ACHIEVEMENT_ICONS[id as ActiveDailyTaskIconId]
    : undefined;
  if (idIcon) return idIcon;
  return DAILY_TASK_ACHIEVEMENT_ICONS[type];
};
