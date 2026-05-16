import { IS_EXPO_GO } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getCanonicalUserId } from './user_id_policy';

// Firebase недоступен в Expo Go — только в production билде
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getAnalytics = () => IS_EXPO_GO ? null : require('@react-native-firebase/analytics').default();
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getCrashlytics = () => IS_EXPO_GO ? null : require('@react-native-firebase/crashlytics').default();
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getFirestore = () => IS_EXPO_GO ? null : require('@react-native-firebase/firestore').default();

// ── Core helpers ─────────────────────────────────────────────────────────────

export function logEvent(name: string, params?: Record<string, string | number>) {
  getAnalytics()?.logEvent(name, params).catch(() => {});
  void import('./app_activity')
    .then(({ trackActivity }) =>
      trackActivity(`analytics:${name}`, {
        feature: String(name).split('_')[0] || 'analytics',
        result: 'info',
        tags: params,
      }),
    )
    .catch(() => {});
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

// ── League ─────────────────────────────────────────────────────────────────────

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

export function logCoursePaywallAfterLesson3(lessonsDone: number) {
  logEvent('course_paywall_after_lesson3', { lessons_done: lessonsDone });
}

export function logExitTrialOfferShown(context: string, plan: string) {
  logEvent('exit_trial_offer_shown', { context, plan });
}

export function logExitTrialOfferAccepted(context: string, plan: string) {
  logEvent('exit_trial_offer_accepted', { context, plan });
}

export function logExitTrialOfferDeclined(context: string, plan: string) {
  logEvent('exit_trial_offer_declined', { context, plan });
}

export function logTrainerDirectGateBlocked(route: string) {
  logEvent('trainer_direct_gate_blocked', { route });
}

export function logArenaDirectGateBlocked(sessionId: string) {
  logEvent('arena_direct_gate_blocked', { session_id: sessionId.slice(0, 80) });
}

// ── Flashcard events ──────────────────────────────────────────────────────────

export function logFlashcardAdded() {
  logEvent('flashcard_added');
}

// ── Subscription cancel survey ────────────────────────────────────────────────

export function logCancelSurvey(reason: string, reasonText = '', context = 'manage') {
  logEvent('subscription_cancel_survey', { reason });
  void (async () => {
    const db = getFirestore();
    if (!db) return;
    const [uid, userName, lang, plan] = await Promise.all([
      getCanonicalUserId().catch(() => null),
      AsyncStorage.getItem('user_name').catch(() => null),
      AsyncStorage.getItem('app_lang').catch(() => null),
      AsyncStorage.getItem('premium_plan').catch(() => null),
    ]);
    await db.collection('subscription_cancel_surveys').add({
      reason: String(reason || 'unknown').slice(0, 80),
      reasonText: String(reasonText || '').trim().slice(0, 1000),
      context: String(context || 'manage').slice(0, 80),
      uid: uid || 'unknown',
      userName: userName || null,
      lang: lang || null,
      premiumPlan: plan || null,
      platform: Platform.OS,
      osVersion: String(Platform.Version),
      appVersion: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown',
      buildNumber: Constants.nativeBuildVersion ?? 'unknown',
      createdAt: new Date().toISOString(),
    }).catch(() => {});
  })();
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
