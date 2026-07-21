/**
 * Тематические акценты «Вызовов дня».
 *
 * Тип задания → слот активной темы (gold / accent / correct / textSecond),
 * никаких хардкодных hex: карточки и герой-кольцо перекрашиваются вместе с
 * темой (midnight/ember/aurora/volt/coral/…). Золотая тема по-прежнему
 * перекрывает акценты на экране через goldTaskAccent (см. daily_tasks_screen).
 */
import type { Theme } from '../../constants/theme';
import type { TaskType } from '../../app/daily_tasks';

/** Базовая дневная активность и завершение урока — «золотой» слот темы. */
const GOLD_SLOT_TYPES: ReadonlySet<TaskType> = new Set([
  'lesson_complete',
  'daily_active',
  'daily_phrase_read',
  'daily_phrase_save',
  // Временные окна и «экономика» дня — тоже золото.
  'early_all_done',
  'last_chance',
  'weekend_marathon',
  'streak_freeze_use',
  'comeback_lesson',
]);

/** Основной объём/прогресс — акцентный слот темы. */
const ACCENT_SLOT_TYPES: ReadonlySet<TaskType> = new Set([
  'total_answers',
  'different_lessons',
  'flashcard_view',
  'flashcard_save',
  'flashcard_flip',
  'words_learned',
  'verb_learned',
  'open_theory',
  'trainer_words',
  'trainer_phrases',
  // «Гринд»-челленджи второго поколения.
  'revision_lesson',
  'polyglot_day',
]);

/** Точность и идеальные серии — слот «правильно» темы. */
const CORRECT_SLOT_TYPES: ReadonlySet<TaskType> = new Set([
  'correct_streak',
  'lesson_no_mistakes',
  'recall_session',
  'recall_answers',
  'recall_perfect',
  'perfect_big_lesson',
  'blitz_speed',
]);

/**
 * Акцент задания из слотов активной темы.
 * Всё, что не в списках выше (утро/вечер, приглашение друга, диагностика,
 * энергия, streak-safety, а также устаревшие quiz/arena-типы, которые больше
 * не попадают в набор), — приглушённый слот textSecond.
 */
export function dailyTaskAccentHex(theme: Theme, taskType: TaskType): string {
  if (GOLD_SLOT_TYPES.has(taskType)) return theme.gold;
  if (ACCENT_SLOT_TYPES.has(taskType)) return theme.accent;
  if (CORRECT_SLOT_TYPES.has(taskType)) return theme.correct;
  return theme.textSecond;
}

/**
 * hex (#RRGGBB) → rgba(...) с заданной непрозрачностью. Тот же идиом, что
 * hexToRgba в AppMessagesInbox: деликатный «налёт» акцента поверх фона
 * (плашки, треки), а не яркая заливка.
 */
export function dailyTaskAccentAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}
