/**
 * Когда греть звуки конца урока (вторая волна прогрева в app/_layout.tsx).
 *
 * зачем (координатор 13.10, профиль Сверки ×3, 21d429827): createAudioPlayer — синхронный нативный конструктор, ≈0,5 с на плеер
 * в dev. Первый ход — прогрев по одному плееру за шаг (SoundDirector.prewarm). Второй ход подготовлен здесь и ВЫКЛЮЧЕН: если замер
 * покажет шаг ≥300 мс, звуки конца урока не греются на старте вовсе, а только при входе в занятие — там до первого результата
 * проходят минуты, а холодный старт освобождается целиком. Включает координатор по цифрам, одной константой.
 */

/** false — прежний путь: таймер 3,5 с после монтирования корня. true — прогрев при входе в занятие. */
export const DEFER_LESSON_END_SFX_PREWARM_TO_SESSION = false;

export const LESSON_END_SFX_STARTUP_DELAY_MS = 3_500;

export type LessonEndPrewarmPlan = 'startup_timer' | 'on_session_entry';

export function lessonEndPrewarmPlan(deferToSession: boolean = DEFER_LESSON_END_SFX_PREWARM_TO_SESSION): LessonEndPrewarmPlan {
  return deferToSession ? 'on_session_entry' : 'startup_timer';
}

/**
 * Экраны, после которых показывается итог с этими звуками (урок, экзамен, ошибки, карточки, диалоги).
 * lesson_complete нет намеренно: это уже сам итог, греть там поздно.
 */
const SESSION_ENTRY_ROUTES: readonly string[] = [
  'lesson1',
  'lesson_menu',
  'lesson_words',
  'lesson_verbs',
  'lesson_irregular_verbs',
  'preposition_drill',
  'learning_v2_session_intro',
  'learning_v2_direct_session_player_v1',
  'exam',
  'level_exam',
  'mistake_practice_session',
  'flashcards_blitz_session',
  'flashcards_recall_session',
  'flashcards_speaking_session',
  'flashcards_truefalse_session',
  'dialogue_v2_session',
  'ai_dialog_session',
  'ai_companion_session',
];

/** Путь expo-router (`/lesson1`, `/exam?level=A1`) — вход в занятие? Сравниваем первый сегмент целиком, не префикс. */
export function isSessionEntryPath(path: string | null | undefined): boolean {
  if (!path) return false;
  const first = path.replace(/^\/+/, '').split(/[/?#]/)[0];
  return SESSION_ENTRY_ROUTES.includes(first);
}
