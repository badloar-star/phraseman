import { IS_EXPO_GO } from './config';

// Firebase недоступен в Expo Go — только в production билде
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getAnalytics = () => IS_EXPO_GO ? null : require('@react-native-firebase/analytics').default();
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getCrashlytics = () => IS_EXPO_GO ? null : require('@react-native-firebase/crashlytics').default();

// ── Core helpers ─────────────────────────────────────────────────────────────

export function logEvent(name: string, params?: Record<string, string | number>) {
  getAnalytics()?.logEvent(name, params).catch(() => {});
}

export function setUserId(userId: string) {
  getAnalytics()?.setUserId(userId).catch(() => {});
  getCrashlytics()?.setUserId(userId).catch(() => {});
}

export function recordError(error: Error, context?: string) {
  const c = getCrashlytics();
  if (!c) return;
  if (context) c.setAttribute('context', context).catch(() => {});
  c.recordError(error);
}

// ── Lesson events ─────────────────────────────────────────────────────────────

export function logLessonComplete(lessonId: number) {
  logEvent('lesson_complete', { lesson_id: lessonId });
}

export function logLessonStart(lessonId: number) {
  logEvent('lesson_start', { lesson_id: lessonId });
}

// ── Quiz events ───────────────────────────────────────────────────────────────

export function logQuizComplete(level: string, score: number) {
  logEvent('quiz_complete', { level, score });
}

// ── Streak events ─────────────────────────────────────────────────────────────

export function logStreakExtended(streakDays: number) {
  logEvent('streak_extended', { days: streakDays });
}

export function logStreakLost(streakDays: number) {
  logEvent('streak_lost', { days: streakDays });
}

// ── Hall of fame / League ─────────────────────────────────────────────────────

export function logHallOfFameViewed() {
  logEvent('hall_of_fame_viewed');
}

export function logLeaguePromoted(leagueName: string) {
  logEvent('league_promoted', { league: leagueName });
}

// ── Premium events ────────────────────────────────────────────────────────────

export function logPremiumModalOpened(context: string) {
  logEvent('premium_modal_opened', { context });
}

export function logPremiumPurchased(productId: string) {
  logEvent('premium_purchased', { product_id: productId });
}

// ── Flashcard events ──────────────────────────────────────────────────────────

export function logFlashcardAdded() {
  logEvent('flashcard_added');
}
