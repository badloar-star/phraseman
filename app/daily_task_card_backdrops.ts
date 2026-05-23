import type { ImageSourcePropType } from 'react-native';

import type { TaskType } from './daily_tasks';

export type DailyTaskCardBackdropState = 'active' | 'completed' | 'claimed';

export type DailyTaskCardBackdropTheme =
  | 'accuracy'
  | 'arenaPvp'
  | 'arenaVictory'
  | 'energy'
  | 'flashcards'
  | 'lessonPhrase'
  | 'quiz'
  | 'rankPromoted'
  | 'recall'
  | 'social'
  | 'trainer';

type CardBackdropFiles = {
  active: string;
  completed: string;
};

export type DailyTaskCardBackdropAsset = {
  source: ImageSourcePropType;
  file: string;
  accent: string;
};

const CARD_DIR = 'assets/images/daily_task_card_backdrops/cards';

export const DAILY_TASK_BONUS_CARD_BACKDROP_FILES: CardBackdropFiles = {
  active: `${CARD_DIR}/daily-bonus-active.webp`,
  completed: `${CARD_DIR}/daily-bonus-completed.webp`,
};

export const DAILY_TASK_CARD_BACKDROP_FILES: Record<DailyTaskCardBackdropTheme, CardBackdropFiles> = {
  accuracy: {
    active: `${CARD_DIR}/accuracy-active.webp`,
    completed: `${CARD_DIR}/accuracy-completed.webp`,
  },
  arenaPvp: {
    active: `${CARD_DIR}/arena-pvp-active.webp`,
    completed: `${CARD_DIR}/arena-pvp-completed.webp`,
  },
  arenaVictory: {
    active: `${CARD_DIR}/arena-victory-active.webp`,
    completed: `${CARD_DIR}/arena-victory-completed.webp`,
  },
  energy: {
    active: `${CARD_DIR}/energy-active.webp`,
    completed: `${CARD_DIR}/energy-completed.webp`,
  },
  flashcards: {
    active: `${CARD_DIR}/flashcards-active.webp`,
    completed: `${CARD_DIR}/flashcards-completed.webp`,
  },
  lessonPhrase: {
    active: `${CARD_DIR}/lesson-phrase-active.webp`,
    completed: `${CARD_DIR}/lesson-phrase-completed.webp`,
  },
  quiz: {
    active: `${CARD_DIR}/quiz-active.webp`,
    completed: `${CARD_DIR}/quiz-completed.webp`,
  },
  rankPromoted: {
    active: `${CARD_DIR}/rank-promoted-active.webp`,
    completed: `${CARD_DIR}/rank-promoted-completed.webp`,
  },
  recall: {
    active: `${CARD_DIR}/recall-active.webp`,
    completed: `${CARD_DIR}/recall-completed.webp`,
  },
  social: {
    active: `${CARD_DIR}/social-active.webp`,
    completed: `${CARD_DIR}/social-completed.webp`,
  },
  trainer: {
    active: `${CARD_DIR}/trainer-active.webp`,
    completed: `${CARD_DIR}/trainer-completed.webp`,
  },
};

const DAILY_TASK_BONUS_CARD_BACKDROPS: Record<keyof CardBackdropFiles, DailyTaskCardBackdropAsset> = {
  active: {
    file: DAILY_TASK_BONUS_CARD_BACKDROP_FILES.active,
    source: require('../assets/images/daily_task_card_backdrops/cards/daily-bonus-active.webp'),
    accent: '#D9B55F',
  },
  completed: {
    file: DAILY_TASK_BONUS_CARD_BACKDROP_FILES.completed,
    source: require('../assets/images/daily_task_card_backdrops/cards/daily-bonus-completed.webp'),
    accent: '#C7F9E5',
  },
};

const DAILY_TASK_CARD_BACKDROPS: Record<
  DailyTaskCardBackdropTheme,
  Record<keyof CardBackdropFiles, DailyTaskCardBackdropAsset>
> = {
  accuracy: {
    active: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.accuracy.active,
      source: require('../assets/images/daily_task_card_backdrops/cards/accuracy-active.webp'),
      accent: '#22D3EE',
    },
    completed: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.accuracy.completed,
      source: require('../assets/images/daily_task_card_backdrops/cards/accuracy-completed.webp'),
      accent: '#BFF9EA',
    },
  },
  arenaPvp: {
    active: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.arenaPvp.active,
      source: require('../assets/images/daily_task_card_backdrops/cards/arena-pvp-active.webp'),
      accent: '#60A5FA',
    },
    completed: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.arenaPvp.completed,
      source: require('../assets/images/daily_task_card_backdrops/cards/arena-pvp-completed.webp'),
      accent: '#BDE8FF',
    },
  },
  arenaVictory: {
    active: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.arenaVictory.active,
      source: require('../assets/images/daily_task_card_backdrops/cards/arena-victory-active.webp'),
      accent: '#FF5C8A',
    },
    completed: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.arenaVictory.completed,
      source: require('../assets/images/daily_task_card_backdrops/cards/arena-victory-completed.webp'),
      accent: '#D9E6F2',
    },
  },
  energy: {
    active: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.energy.active,
      source: require('../assets/images/daily_task_card_backdrops/cards/energy-active.webp'),
      accent: '#F97316',
    },
    completed: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.energy.completed,
      source: require('../assets/images/daily_task_card_backdrops/cards/energy-completed.webp'),
      accent: '#C6F7F2',
    },
  },
  flashcards: {
    active: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.flashcards.active,
      source: require('../assets/images/daily_task_card_backdrops/cards/flashcards-active.webp'),
      accent: '#F472B6',
    },
    completed: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.flashcards.completed,
      source: require('../assets/images/daily_task_card_backdrops/cards/flashcards-completed.webp'),
      accent: '#BCEDE8',
    },
  },
  lessonPhrase: {
    active: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.lessonPhrase.active,
      source: require('../assets/images/daily_task_card_backdrops/cards/lesson-phrase-active.webp'),
      accent: '#F2B84B',
    },
    completed: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.lessonPhrase.completed,
      source: require('../assets/images/daily_task_card_backdrops/cards/lesson-phrase-completed.webp'),
      accent: '#D9FAD2',
    },
  },
  quiz: {
    active: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.quiz.active,
      source: require('../assets/images/daily_task_card_backdrops/cards/quiz-active.webp'),
      accent: '#8B5CF6',
    },
    completed: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.quiz.completed,
      source: require('../assets/images/daily_task_card_backdrops/cards/quiz-completed.webp'),
      accent: '#C4E7FF',
    },
  },
  rankPromoted: {
    active: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.rankPromoted.active,
      source: require('../assets/images/daily_task_card_backdrops/cards/rank-promoted-active.webp'),
      accent: '#D7B94F',
    },
    completed: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.rankPromoted.completed,
      source: require('../assets/images/daily_task_card_backdrops/cards/rank-promoted-completed.webp'),
      accent: '#E8FDD2',
    },
  },
  recall: {
    active: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.recall.active,
      source: require('../assets/images/daily_task_card_backdrops/cards/recall-active.webp'),
      accent: '#F97316',
    },
    completed: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.recall.completed,
      source: require('../assets/images/daily_task_card_backdrops/cards/recall-completed.webp'),
      accent: '#D8D4FF',
    },
  },
  social: {
    active: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.social.active,
      source: require('../assets/images/daily_task_card_backdrops/cards/social-active.webp'),
      accent: '#FF9F7A',
    },
    completed: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.social.completed,
      source: require('../assets/images/daily_task_card_backdrops/cards/social-completed.webp'),
      accent: '#CFFAEF',
    },
  },
  trainer: {
    active: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.trainer.active,
      source: require('../assets/images/daily_task_card_backdrops/cards/trainer-active.webp'),
      accent: '#B9F31D',
    },
    completed: {
      file: DAILY_TASK_CARD_BACKDROP_FILES.trainer.completed,
      source: require('../assets/images/daily_task_card_backdrops/cards/trainer-completed.webp'),
      accent: '#C7FDF2',
    },
  },
};

export const DAILY_TASK_TYPE_BACKDROP_THEME: Record<TaskType, DailyTaskCardBackdropTheme> = {
  arena_play: 'arenaPvp',
  arena_plays_wins_combo: 'arenaVictory',
  arena_rank_promoted: 'rankPromoted',
  arena_win: 'arenaVictory',
  correct_streak: 'accuracy',
  daily_active: 'lessonPhrase',
  daily_phrase_read: 'lessonPhrase',
  daily_phrase_save: 'lessonPhrase',
  diagnostic_complete: 'quiz',
  different_lessons: 'lessonPhrase',
  energy_spend: 'energy',
  evening_session: 'lessonPhrase',
  flashcard_flip: 'flashcards',
  flashcard_save: 'flashcards',
  flashcard_view: 'flashcards',
  invite_friend: 'social',
  lesson_complete: 'lessonPhrase',
  lesson_no_mistakes: 'accuracy',
  morning_session: 'lessonPhrase',
  open_theory: 'lessonPhrase',
  quiz_easy: 'quiz',
  quiz_hard: 'quiz',
  quiz_hard_perfect: 'quiz',
  quiz_medium: 'quiz',
  quiz_perfect: 'quiz',
  quiz_score: 'quiz',
  recall_answers: 'recall',
  recall_perfect: 'recall',
  recall_session: 'recall',
  total_answers: 'lessonPhrase',
  trainer_arena: 'trainer',
  trainer_phrases: 'trainer',
  trainer_words: 'trainer',
  verb_learned: 'lessonPhrase',
  words_learned: 'lessonPhrase',
};

export const getDailyTaskCardBackdrop = (
  taskType: TaskType,
  state: DailyTaskCardBackdropState,
): DailyTaskCardBackdropAsset => {
  const theme = DAILY_TASK_TYPE_BACKDROP_THEME[taskType];
  return DAILY_TASK_CARD_BACKDROPS[theme][state === 'active' ? 'active' : 'completed'];
};

export const getDailyTaskBonusCardBackdrop = (completedOrClaimed: boolean): DailyTaskCardBackdropAsset =>
  DAILY_TASK_BONUS_CARD_BACKDROPS[completedOrClaimed ? 'completed' : 'active'];
