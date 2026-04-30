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

export function logShardsPurchased(productId: string, shards: number) {
  logEvent('shards_purchased', { product_id: productId, shards });
}

export function logCardPackPurchasedShards(packId: string, priceShards: number) {
  logEvent('card_pack_purchased_shards', { pack_id: packId, price_shards: priceShards });
}

export function logPaywallView(context: string) {
  logEvent('paywall_view', { context });
}

export function logPaywallPlanSelect(context: string, plan: string) {
  logEvent('paywall_plan_select', { context, plan });
}

export function logPaywallCtaClick(context: string, plan: string) {
  logEvent('paywall_cta_click', { context, plan });
}

export function logPaywallContinueFree(context: string) {
  logEvent('paywall_continue_free', { context });
}

export function logPaywallClose(context: string) {
  logEvent('paywall_close', { context });
}

// ── Flashcard events ──────────────────────────────────────────────────────────

export function logFlashcardAdded() {
  logEvent('flashcard_added');
}

// ── Subscription cancel survey ────────────────────────────────────────────────

export function logCancelSurvey(reason: string) {
  logEvent('subscription_cancel_survey', { reason });
}

// ── Lesson drop-off ───────────────────────────────────────────────────────────

export function logLessonAbandoned(lessonId: number, phraseIndex: number, totalPhrases: number) {
  logEvent('lesson_abandoned', { lesson_id: lessonId, phrase_index: phraseIndex, total: totalPhrases });
}

// ── Answer accuracy ───────────────────────────────────────────────────────────

export function logLessonAnswer(lessonId: number, isCorrect: boolean) {
  logEvent('lesson_answer', { lesson_id: lessonId, correct: isCorrect ? 1 : 0 });
}

// ── Energy limit ──────────────────────────────────────────────────────────────

export function logEnergyLimitHit(screen: string) {
  logEvent('energy_limit_hit', { screen });
}

// ── Quiz level chosen ─────────────────────────────────────────────────────────

export function logQuizLevelSelected(level: string) {
  logEvent('quiz_level_selected', { level });
}

// ── Feature opened ────────────────────────────────────────────────────────────

export function logFeatureOpened(feature: string) {
  logEvent('feature_opened', { feature });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
