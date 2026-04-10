import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';

// ── Core helpers ─────────────────────────────────────────────────────────────

export function logEvent(name: string, params?: Record<string, string | number>) {
  analytics().logEvent(name, params).catch(() => {});
}

export function setUserId(userId: string) {
  analytics().setUserId(userId).catch(() => {});
  crashlytics().setUserId(userId).catch(() => {});
}

export function recordError(error: Error, context?: string) {
  if (context) crashlytics().setAttribute('context', context).catch(() => {});
  crashlytics().recordError(error);
}

// ── Lesson events ─────────────────────────────────────────────────────────────

/** Вызывать когда урок завершён (lesson_complete.tsx) */
export function logLessonComplete(lessonId: number) {
  logEvent('lesson_complete', { lesson_id: lessonId });
}

/** Вызывать когда пользователь открывает меню урока */
export function logLessonStart(lessonId: number) {
  logEvent('lesson_start', { lesson_id: lessonId });
}

// ── Quiz events ───────────────────────────────────────────────────────────────

/** Вызывать когда квиз завершён */
export function logQuizComplete(level: string, score: number) {
  logEvent('quiz_complete', { level, score });
}

// ── Streak events ─────────────────────────────────────────────────────────────

/** Вызывать когда стрик продлён */
export function logStreakExtended(streakDays: number) {
  logEvent('streak_extended', { days: streakDays });
}

/** Вызывать когда стрик потерян */
export function logStreakLost(streakDays: number) {
  logEvent('streak_lost', { days: streakDays });
}

// ── Hall of fame / League ─────────────────────────────────────────────────────

/** Вызывать при открытии Зала Славы */
export function logHallOfFameViewed() {
  logEvent('hall_of_fame_viewed');
}

/** Вызывать при повышении в лиге */
export function logLeaguePromoted(leagueName: string) {
  logEvent('league_promoted', { league: leagueName });
}

// ── Premium events ────────────────────────────────────────────────────────────

/** Вызывать при открытии модалки премиума */
export function logPremiumModalOpened(context: string) {
  logEvent('premium_modal_opened', { context });
}

/** Вызывать при успешной покупке */
export function logPremiumPurchased(productId: string) {
  logEvent('premium_purchased', { product_id: productId });
}

// ── Flashcard events ──────────────────────────────────────────────────────────

/** Вызывать при добавлении карточки */
export function logFlashcardAdded() {
  logEvent('flashcard_added');
}
