import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from '../components/SafeLinearGradient';
import { Stack, useGlobalSearchParams, usePathname, useRouter, router as globalRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as SplashScreen from 'expo-splash-screen';
import { UI_SFX_AUDIO_MODE } from './audio_playback_mode';
import { setManagedAudioMode } from './audio_session_coordinator';
import { soundDirector } from '../modules/audio/sound_director';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { redirectSystemPath } from './+native-intent';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, Easing, InteractionManager, LogBox, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { Image } from 'expo-image';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AchievementProvider, useAchievement } from '../components/AchievementContext';
import AchievementToast from '../components/AchievementToast';
import { EnergyProvider } from '../components/EnergyContext';
import { LangProvider, useLang } from '../components/LangContext';
import IntroFullAccessModal from '../components/IntroFullAccessModal';
import { StudyTargetProvider, useStudyTarget } from '../components/StudyTargetContext';
import LevelGiftDualModal from '../components/LevelGiftDualModal';
import LevelGiftModal from '../components/LevelGiftModal';
import LevelUpThresholdModal from '../components/LevelUpThresholdModal';
import {
  loadUnclaimedDualGifts,
  loadUnclaimedGifts,
  saveUnclaimedDualGift,
  saveUnclaimedGift,
  type PremPair,
} from './level_gift_inventory';
import {
  acknowledgePendingLevelUpShown,
  repairPendingLevelUpRewards,
  retryPendingLevelUpRewards,
} from './level_up_reward_reconciler';
import {
  acknowledgePendingLevelSpinLevelUp,
  loadPendingLevelSpinLevelUps,
} from './level_spin_level_up_queue';
import {
  drainPendingLevelUpBonusIntents,
  persistLevelUpBonusIntent,
} from './level_up_bonus_outbox';
import {
  captureAccountGeneration,
  subscribeAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import {
  canAcknowledgeLevelUpForAccount,
  isLevelUpAccountTokenCurrent,
} from './level_up_account_guard';
import { isCurrentAccountGeneration } from './account_generation';
import { getStableId } from './stable_id';
import { acquireLevelGiftDisplay, reserveLevelGiftForDisplay, type GiftDef } from './level_gift_system';
import Onboarding from '../components/onboarding';
import { paywallScreenStackOptions } from '../components/paywall/paywallShared';
import { PremiumProvider, usePremium } from '../components/PremiumContext';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import UpdateModal from '../components/UpdateModal';
import ReleaseNotesModal from '../components/ReleaseNotesModal';
import GlobalBroadcastModal from '../components/GlobalBroadcastModal';
import PersonalAdminMessageModal from '../components/PersonalAdminMessageModal';
import MaintenanceGate from '../components/MaintenanceGate';
import ForceUpdateGate from '../components/ForceUpdateGate';
import OfflineBanner from '../components/OfflineBanner';
import PromoBanner from '../components/PromoBanner';
import LeagueBonusAvailableModal from '../components/LeagueBonusAvailableModal';
import NotificationPermissionModal from '../components/NotificationPermissionModal';
import RegistrationPromptModal from '../components/RegistrationPromptModal';
import { getLevelFromXP, getMaxEnergyForLevel } from '../constants/theme';
import { triLang, type Lang } from '../constants/i18n';
import { getTitleColor, getTitleForLevel } from '../constants/titles';
import { getInstalledAppVersion } from './app_version';
import { ENABLE_ARENA, ENABLE_DEV_TOOLS, ENABLE_TOURNAMENTS, IS_EXPO_GO, ENABLE_SCREEN_TRANSITIONS, SCREEN_FADE_TRANSITIONS } from './config';
import { SECTION_SHEET_STACK_OPTIONS } from './section_sheet_navigation';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { subscribeNetStatus } from './net_status';
import { resumePendingOnboardingFunnel } from './onboarding_funnel';
import { resumePendingAgeConsent } from './age_consent_cloud';
import { checkAchievements, getPendingNotifications } from './achievements';
import {
  ensureAnonUser,
  ensureStableAuthLink,
  restoreFromCloudDetailed,
  restoreFromCloudWithRecoveryDetails,
  syncToCloud,
  type CloudRestoreFailureReason,
} from './cloud_sync';
import { processPendingAuthLink } from './pending_auth_link';
import { runAuthRecoveryBootGate } from './auth_recovery_boot_gate';
import { isExamBestPctColdRestoreTabSafe } from './exam_best_pct_overlay';
import { repairLessonUnlocksAfterRestore } from './lesson_lock_system';
import { registerInLeagueGroupSilently } from './firestore_leagues';
import { PlayInstallReferrer } from 'react-native-play-install-referrer';
import { migrateWeekPointsIfNeeded, updateStreakOnActivity } from './hall_of_fame_utils';
import { preloadDeferredNonPrimaryImages, preloadPrimaryTabImages } from './image_preload';
import {
  checkLeagueOvertakeNotification, getNotifSettingsSnapshot, getNotifPrefsSnapshot, hydrateNotifSettingsFromStorage, hydrateNotifPrefsFromStorage, isNotificationPermissionGranted, requestNotificationPermissionWithFallback, saveNotifPrefs, scheduleDailyReminder, scheduleMonthlyRecapNotification, scheduleNotifications, schedulePhraseOfDayNotification, scheduleStreakWarningIfNeeded, scheduleWeeklyRecapNotification, setupNotificationTapHandler, syncFriendsPushPrefIfChanged,
} from './notifications';
import { initRevenueCat } from './revenuecat_init';
import { hydrateAnalyticsConsentFromStorage } from './analytics_consent';
import { hydrateAiExplainConsentFromStorage } from './ai_explain_consent';
import { hydrateAiDialogConsentFromStorage } from './ai_dialog_consent';
import { hydrateAgeGateFromStorage } from './age_gate';
import { prefetchMarketplacePacks } from './flashcards/marketplace';
import { syncPublicProfileSnapshot } from './public_profile_snapshot';
import { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus, getVerifiedVipStatus } from './premium_guard';
import { isTournamentInterruptionProtectedPath } from './tournament_interruption_guard';
import { tryGrantPremiumMonthlyWagerFromLevelUp } from './streak_wager';
import { incrementSessionCount } from './review_utils';
import { checkForUpdate, UpdateInfo } from './update_check';
import { registerXP, migrateXPFormulaV2 } from './xp_manager';
import { flushPendingProgressEvents } from './progress_events_client';
import { createDisposableAdoption } from './disposable_adoption';
import { getShardAchievementEligibleBalance, getShardsBalance, loadShardsFromCloud } from './shards_system';
import ActionToast from '../components/ActionToast';
import GlobalShardsEarnedHost from '../components/GlobalShardsEarnedHost';
import EntitlementExpiredHost from '../components/EntitlementExpiredHost';
import GlobalFriendGiftHost from '../components/GlobalFriendGiftHost';
import ReferralWelcomeHost from '../components/ReferralWelcomeHost';
import OnboardingWelcomeHost from '../components/OnboardingWelcomeHost';
import MysteryMondayHost from '../components/MysteryMondayHost';
import ComebackBoonHost from '../components/ComebackBoonHost';
import PerfectWeekHost from '../components/PerfectWeekHost';
import BoonActivatedHost from '../components/BoonActivatedHost';
import StreakRiskToastHost from '../components/StreakRiskToastHost';
import BillingIssueToastHost from '../components/BillingIssueToastHost';
import ThemedBlockingAlertHost from '../components/ThemedBlockingAlertHost';
import { enqueueThemedBlockingInfoAlert } from './themed_blocking_alert_queue';
import {
  consumeRemoteAccountDeletionNotice,
  handleAccountDeletedOnAnotherDevice,
  isLocalAccountDeletionInProgress,
  peekLinkedAuthFromCurrentUser,
  resumePendingAccountDeleteLocalExit,
} from './auth_provider';
import { startRemoteAccountDeletionMonitor } from './remote_account_deletion_monitor';
import { getCanonicalUserId } from './user_id_policy';
import { dismissReleaseNotesModalPermanently, shouldOfferReleaseNotesModal } from './release_notes_modal';
import { prefetchEasUpdateAfterStartup } from './eas_update_prefetch';
import { prefetchAchievementArtInBackground } from './achievement_art_prefetch';
import { fetchPendingGlobalBroadcastModal, GlobalBroadcastModalPayload } from './global_broadcast_modal';
import { emitAppEvent, onAppEvent } from './events';
import { hydratePlatformUiPreviewFromStorage } from './platform_ui_preview';
import { setDeferEnergyOnboardingForPostOnboardingFirstLesson } from './energyOnboardingGate';
import { useGlobalBottomOverlayOffset } from '../hooks/use-global-bottom-overlay-offset';
import { loadFlashcards } from '../hooks/use-flashcards';
import { primeAllLessonsFromStorageOnAppLaunch } from './lesson_screen_bootstrap';
import { hydrateUserSettingsFromStorage } from './user_settings_store';

import { hydrateHapticsTapFromStorage } from './haptics_tap_preload';
import { installForegroundUsageMsTracker } from './foreground_usage_ms';
import { startFriendsTabSwrPrime } from './friends_tab_swr_warm';
import { applyContentDeliveryMigration } from './content_delivery_migration';
import { primeAppSnapshotFromStorage } from './app_snapshot_bootstrap';
import { primeSurveyOfferCacheFromStorage } from './survey_offer_cache';
import { primeScreenSnapshotsFromStorage } from './screen_snapshot_store';
import { hydrateYoutubeChannelPreference } from './youtube_channel_preference';
import { hydrateStatsCacheFromStorage } from './statsCache';
import { primeTrainerPracticeSnapshotFromStorage } from './trainer_practice_persist';
import { primeRemoteConfigCacheFromStorage } from './remote_config_client';
import { createBootCloudRestoreCoordinator, type BootCloudRestoreOutcome } from './cloud_restore_coordinator';
import { hasMeaningfulLocalAccountData } from './local_account_data';
import { decideStartupCloudRecoveryPresentation } from './startup_cloud_recovery_presentation';
import { OverlayArbiterProvider, useOverlayVisible } from '../components/OverlayArbiter';
import ErrorBoundary from '../components/ErrorBoundary';
import { trackActivity } from './app_activity';
import { ProductAnalyticsRuntimeObserver } from './product_analytics_runtime_observer';
import {
  markNextNavigationAsReplace,
  navigationFallbackForPath,
  rememberNavigationPath,
  safeRouterBack,
  shouldHandleGlobalHardwareBack,
} from './navigation_back';
import {
  cancelScheduledAnimatedStateUpdates,
  scheduleTrackedAnimatedStateUpdate,
  type ScheduledAnimatedStateUpdate,
} from '../components/animationScheduling';
import {
  checkLeagueBonusAvailability,
  buildLeagueBonusSeenKey,
  reserveLeagueBonusNotice,
  type LeagueBonusAvailability,
} from './services/league_chest_rewards';
import { lastOpenedLessonKey, type RuntimeStudyTarget } from './target_storage_keys';
import { syncWidgetData } from './widget_bridge';
import { scheduleCoalescedForegroundTask } from './app_resume_policy';
import { DEV_UTILITY_ROUTE_NAMES, DEV_UTILITY_ROUTE_PATHS } from '../constants/devRoutes';
import { APP_FONT_FAMILY } from './typography';
import { getLocalDayKey, isSameLocalOrUtcDay, isYesterdayFlexible } from './local_date';
import { installInterFontPatch } from './font_family_patch';
import {
  acknowledgePersonalAdminMessageModal,
  pickNextLoginPersonalMessage,
  refreshAppMessagesSnapshotOnce,
  type AppMessageWithState,
} from './app_messages';
import {
  getIntroFullAccessState,
  markIntroFullAccessEndedSeen,
  markIntroFullAccessWelcomeSeen,
  shouldShowIntroFullAccessWelcome,
  startIntroFullAccessAfterOnboarding,
} from './intro_full_access';
import { resumePendingGeneratedNickname } from './nickname_guard';
import { stableInitialWindowMetrics, useStableSafeAreaInsets } from './stable_safe_area_metrics';

// AUTH_RECOVERY_BOOT_RETRY_POLICY_START
export const AUTH_RECOVERY_BOOT_RETRY_DELAYS_MS = [1_500, 5_000, 15_000, 30_000] as const;

type AuthRecoveryBootRetrySchedulerOptions = Readonly<{
  isInFlight: () => boolean;
  run: () => void;
  setTimer: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimer: (timer: ReturnType<typeof setTimeout>) => void;
}>;

export function createAuthRecoveryBootRetryScheduler(
  options: AuthRecoveryBootRetrySchedulerOptions,
) {
  let nextAttempt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const arm = (delayMs: number): void => {
    timer = options.setTimer(() => {
      timer = null;
      if (disposed) return;
      if (options.isInFlight()) {
        // Preserve this already-budgeted retry while the previous call unwinds.
        arm(250);
        return;
      }
      options.run();
    }, delayMs);
  };

  return {
    schedule(): boolean {
      if (disposed) return false;
      if (timer) return true;
      const delayMs = AUTH_RECOVERY_BOOT_RETRY_DELAYS_MS[nextAttempt];
      if (delayMs === undefined) return false;
      nextAttempt += 1;
      arm(delayMs);
      return true;
    },
    triggerActive(): void {
      if (disposed || options.isInFlight()) return;
      if (timer) {
        options.clearTimer(timer);
        timer = null;
      }
      options.run();
    },
    cancel(): void {
      disposed = true;
      if (timer) options.clearTimer(timer);
      timer = null;
    },
  };
}
// AUTH_RECOVERY_BOOT_RETRY_POLICY_END

// Глобальный фикс: маппинг fontWeight -> начертание Inter (иначе на Android жирный текст не работает).
// Вызывается на этапе вычисления модуля — до первого рендера любого <Text>.
installInterFontPatch();

LogBox.ignoreLogs([
  '[expo-notifications] Error reading persisted server registration info',
  '[Reanimated] Reduced motion setting is enabled on this device.',
  'This method is deprecated (as well as all React Native Firebase namespaced API)',
]);

const DEV_RUNTIME_LOG_DROP_PATTERNS = [
  'This method is deprecated (as well as all React Native Firebase namespaced API)',
  '[expo-image]: Prop "resizeMode" is deprecated',
] as const;

function shouldDropDevRuntimeLog(args: unknown[]): boolean {
  const message = args.map((arg) => {
    if (typeof arg === 'string') return arg;
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }).join(' ');
  return DEV_RUNTIME_LOG_DROP_PATTERNS.some((pattern) => message.includes(pattern));
}

function installDevRuntimePerformanceGuards(): void {
  if (!__DEV__) return;

  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    if (shouldDropDevRuntimeLog(args)) return;
    originalWarn(...args);
  };
}

installDevRuntimePerformanceGuards();

// Global unhandled-promise-rejection handler (CLIENT-001).
// Hermes surfaces these as uncaught promise rejections; without this they are
// silently swallowed in release builds, making async bugs invisible.
if (typeof globalThis !== 'undefined') {
  const g = globalThis as Record<string, unknown>;
  const prevHandler = g.onunhandledrejection as ((e: PromiseRejectionEvent) => void) | undefined;
  g.onunhandledrejection = (event: PromiseRejectionEvent) => {
    prevHandler?.(event);
    if (__DEV__) {
      console.warn('[unhandledRejection]', event?.reason);
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const health = require('./app_health');
        health?.logAppWarning?.('promise:unhandled_rejection', event?.reason, { feature: 'async' });
      } catch { /* best-effort */ }
    }
  };
}

/** Список друзей с диска в память до открытия вкладки — чтобы первый кадр вкладки мог сразу показать строки. */
// Нативный сплэш из app.json — скрываем только когда AppContent сообщает ready (см. hideAsync в useEffect).
void SplashScreen.preventAutoHideAsync().catch(() => {});

const DefaultText = Text as typeof Text & { defaultProps?: Record<string, unknown> };
DefaultText.defaultProps = {
  ...DefaultText.defaultProps,
  android_hyphenationFrequency: 'none',
  textBreakStrategy: 'simple',
  style: [{ fontFamily: APP_FONT_FAMILY }, DefaultText.defaultProps?.style],
};

const STARTUP_SPLASH_BG = '#101214';
/** Потолок ожидания рантайм-шрифтов: сломанный ассет не должен держать сплэш вечно. */
const APP_FONT_WAIT_MAX_MS = 2500;
const LEAGUE_BONUS_AVAILABLE_SEEN_PREFIX = 'league_bonus_available_seen_';
const LEAGUE_BONUS_AVAILABLE_SEEN_MAX_KEYS = 32;
const LEAGUE_BONUS_AVAILABLE_SESSION_MAX_KEYS = 64;
const leagueBonusAvailableReservedThisSession = new Set<string>();
const ENABLE_ROOT_LEAGUE_BONUS_WATCH = true;
const LEAGUE_BONUS_CHECK_MIN_MS = 60_000;
// зачем: аудит нагрева 2026-07-25 — flushQueue/intro/winback дёргались на КАЖДЫЙ
// разворот приложения без троттла (AsyncStorage + premium-проверки). Событийные и
// стартовые пути остаются мгновенными, троттлится ТОЛЬКО foreground-страховка.
const FOREGROUND_FLUSH_MIN_MS = 15_000;
const FOREGROUND_MODAL_CHECK_MIN_MS = 60_000;
const ENABLE_STARTUP_CONTENT_PREWARM = false;
const FIRST_CONTENT_READY_FALLBACK_MS = 900;
const POST_ONBOARDING_GOLD_BRIDGE_MS = 3000;
const POST_ONBOARDING_GOLD_BRIDGE_SCREEN = ['rgba(255,224,144,0.34)', 'rgba(163,104,24,0.16)', 'rgba(18,14,6,0.08)'] as const;

function reserveLeagueBonusNoticeThisSession(key: string): boolean {
  if (!reserveLeagueBonusNotice(leagueBonusAvailableReservedThisSession, key)) return false;
  while (leagueBonusAvailableReservedThisSession.size > LEAGUE_BONUS_AVAILABLE_SESSION_MAX_KEYS) {
    const oldest = leagueBonusAvailableReservedThisSession.values().next().value;
    if (!oldest) break;
    leagueBonusAvailableReservedThisSession.delete(oldest);
  }
  return true;
}
const POST_ONBOARDING_GOLD_BRIDGE_PANEL = ['rgba(122,75,12,0.44)', 'rgba(54,34,8,0.30)', 'rgba(11,9,5,0.12)'] as const;
const POST_ONBOARDING_GOLD_BRIDGE_CTA = ['#FFF0B5', '#E2A923'] as const;
const POST_ONBOARDING_GOLD_BRIDGE_TEXT = '#3F2C08';
const DAILY_LOGIN_BONUS_XP_BY_DAY = [
  20, 25, 30, 40, 50, 75, 120,
  130, 140, 150, 160, 170, 180, 220,
  230, 240, 250, 260, 270, 280, 350,
  360, 370, 380, 390, 400, 450, 500,
  600, 750,
] as const;

async function pruneLeagueBonusSeenMarkers(currentKey: string): Promise<void> {
  const keys = await AsyncStorage.getAllKeys().catch(() => []);
  const seenKeys = keys
    .filter((key) => key.startsWith(LEAGUE_BONUS_AVAILABLE_SEEN_PREFIX))
    .sort((a, b) => b.localeCompare(a));
  if (seenKeys.length <= LEAGUE_BONUS_AVAILABLE_SEEN_MAX_KEYS) return;
  const keep = new Set(seenKeys.slice(0, LEAGUE_BONUS_AVAILABLE_SEEN_MAX_KEYS));
  keep.add(currentKey);
  const remove = seenKeys.filter((key) => !keep.has(key));
  if (remove.length > 0) await AsyncStorage.multiRemove(remove).catch(() => {});
}

const safeProgressEventPart = (value: unknown, max = 60): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';

function normalizeWarmDeepLink(url: string): string | null {
  const normalized = redirectSystemPath({ path: url, initial: false });
  return normalized && normalized !== '/' ? normalized : null;
}

function isDevUtilityRoutePath(path: string | null | undefined): boolean {
  if (!ENABLE_DEV_TOOLS || !path) return false;
  return DEV_UTILITY_ROUTE_PATHS.some((prefix) => path.startsWith(prefix));
}

function isTabsGroupRoutePath(path: string): boolean {
  const cleanPath = path.split(/[?#]/)[0]?.replace(/\/$/, '') || '';
  return cleanPath === '/(tabs)' || cleanPath.startsWith('/(tabs)/');
}

function buildNavigationPathSignature(
  pathname: string | null | undefined,
  params: Record<string, unknown>,
): string | null {
  const path = pathname && pathname.length > 0 ? pathname : null;
  if (!path) {
    return null;
  }

  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      const normalizedValue = Array.isArray(value)
        ? value.map((item) => String(item)).join(',')
        : String(value);
      return `${encodeURIComponent(key)}=${encodeURIComponent(normalizedValue)}`;
    })
    .sort()
    .join('&');

  return query ? `${path}?${query}` : path;
}

const SPLASH_GLYPH_SIZE = 176;
const SPLASH_WORDMARK_WIDTH = 232;
const SPLASH_WORDMARK_RATIO = 68 / 553; // из assets/images/splash-wordmark.webp («Phraseman»)
const SPLASH_WORDMARK_HEIGHT = Math.round(SPLASH_WORDMARK_WIDTH * SPLASH_WORDMARK_RATIO);
const SPLASH_SHINE_WIDTH = Math.round(SPLASH_WORDMARK_WIDTH * 0.45);

/**
 * Анимированный стартовый сплэш поверх нативного: глиф мягко «дышит» (пульс),
 * ворд-марк «Phraseman» проявляется и по нему один раз проезжает блик,
 * подзаголовок «by Professor Lingman» проявляется последним.
 * Всё на нативном драйвере (UI-поток), pointerEvents=none — фон остаётся «замороженным».
 * Loop останавливается в cleanup, чтобы не крутиться после скрытия сплэша.
 */
function StartupSplashHold({ visible, canHideNativeSplash = true }: { visible: boolean; canHideNativeSplash?: boolean }) {
  // Хуки должны вызываться безусловно — ранний return только после их объявления.
  const glyphIn = useRef(new Animated.Value(0)).current;   // вход глифа: 0→1
  const pulse = useRef(new Animated.Value(0)).current;     // бесконечный пульс: 0↔1
  const wordIn = useRef(new Animated.Value(0)).current;    // проявление ворд-марка
  const subIn = useRef(new Animated.Value(0)).current;     // проявление подзаголовка
  const shine = useRef(new Animated.Value(0)).current;     // проезд блика: 0→1

  // Как только анимированный оверлей смонтирован и отрисован — прячем нативный сплэш,
  // чтобы застывшая нативная картинка сразу уступила место анимации (фон тот же #101214,
  // мигания нет). Иначе нативный слой перекрывает анимацию до самого content-ready.
  // Пока рантайм-шрифты не встали, нативная картинка остаётся сверху: иначе первым
  // кадром JS покажет текст системным начертанием и потом подменит его на Inter.
  useEffect(() => {
    if (!visible || !canHideNativeSplash) return;
    const id = requestAnimationFrame(() => { void SplashScreen.hideAsync().catch(() => {}); });
    return () => cancelAnimationFrame(id);
  }, [visible, canHideNativeSplash]);

  useEffect(() => {
    if (!visible) return;
    glyphIn.setValue(0); pulse.setValue(0); wordIn.setValue(0); subIn.setValue(0); shine.setValue(0);

    const enter = Animated.timing(glyphIn, {
      toValue: 1, duration: 520, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true,
    });
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const word = Animated.timing(wordIn, {
      toValue: 1, duration: 460, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    const shineRun = Animated.timing(shine, {
      toValue: 1, duration: 900, delay: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
    });
    const sub = Animated.timing(subIn, {
      toValue: 1, duration: 420, delay: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });

    enter.start();
    pulseLoop.start();
    word.start();
    shineRun.start();
    sub.start();
    return () => {
      pulseLoop.stop();
      enter.stop(); word.stop(); shineRun.stop(); sub.stop();
    };
  }, [visible, glyphIn, pulse, wordIn, subIn, shine]);

  if (!visible) return null;

  const glyphScale = Animated.add(
    glyphIn.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
    pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.055] }),
  );
  const wordTranslateY = wordIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const subTranslateY = subIn.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });
  const shineX = shine.interpolate({
    inputRange: [0, 1],
    outputRange: [-SPLASH_SHINE_WIDTH, SPLASH_WORDMARK_WIDTH + SPLASH_SHINE_WIDTH],
  });

  return (
    <View pointerEvents="none" style={styles.startupSplashAnimatedRoot}>
      <Animated.View style={{ opacity: glyphIn, transform: [{ scale: glyphScale }] }}>
        <Image
          source={require('../assets/images/splash-glyph.webp')}
          contentFit="contain"
          style={{ width: SPLASH_GLYPH_SIZE, height: SPLASH_GLYPH_SIZE }}
        />
      </Animated.View>

      <Animated.View
        style={{
          marginTop: 22,
          width: SPLASH_WORDMARK_WIDTH,
          height: SPLASH_WORDMARK_HEIGHT,
          opacity: wordIn,
          transform: [{ translateY: wordTranslateY }],
        }}
      >
        <Image
          source={require('../assets/images/splash-wordmark.webp')}
          contentFit="contain"
          style={{ width: '100%', height: '100%' }}
        />
        {/* Блик: светлый диагональный градиент, ограниченный формой ворд-марка через маску. */}
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <Image
              source={require('../assets/images/splash-wordmark.webp')}
              contentFit="contain"
              style={{ width: '100%', height: '100%' }}
            />
          }
        >
          <Animated.View style={{ flex: 1, transform: [{ translateX: shineX }] }}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.85)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: SPLASH_SHINE_WIDTH, height: '100%' }}
            />
          </Animated.View>
        </MaskedView>
      </Animated.View>

      <Animated.Text
        style={[
          styles.startupSplashSubtitle,
          { opacity: subIn, transform: [{ translateY: subTranslateY }] },
        ]}
      >
        by Professor Lingman
      </Animated.Text>
    </View>
  );
}

const LEVELUP_CONGRATS_RU = [
  'Поздравляем! Твой прогресс впечатляет!',
  'Ты неудержим! Продолжай в том же духе!',
  'Новый уровень — новые горизонты! 🚀',
  'Вот это прогресс! Гордись собой!',
  'Ты растёшь с каждым днём! 🌟',
  'Невероятно! Твой English становится мощнее!',
  'Уровень получен заслуженно — ты работал!',
  'Прогресс виден невооружённым глазом! 💪',
];
const LEVELUP_CONGRATS_UK = [
  'Вітаємо! Твій прогрес вражає!',
  'Ти невтримний! Продовжуй у тому ж дусі!',
  'Новий рівень — нові горизонти! 🚀',
  'Ось це прогрес! Пишайся собою!',
  'Ти зростаєш з кожним днем! 🌟',
  'Неймовірно! Твоя англійська стає потужнішою!',
  'Рівень отримано заслужено — ти працював!',
  'Прогрес видно неозброєним оком! 💪',
];
const LEVELUP_CONGRATS_ES = [
  '¡Enhorabuena! ¡Tu progreso impresiona!',
  '¡No paras! Sigue así.',
  '¡Nuevo nivel, nuevas metas! 🚀',
  '¡Vaya avance! Sigue así.',
  '¡Creces cada día! 🌟',
  '¡Increíble! Tu inglés se fortalece.',
  'Te lo has ganado con la práctica.',
  '¡El progreso se nota a simple vista! 💪',
];

function levelSpinCreditId(level: number): string {
  return `level_spin_v1_${String(level).padStart(3, '0')}`;
}

async function preloadVectorIconFonts() {
  await Promise.all([
    Ionicons.loadFont(),
    MaterialIcons.loadFont(),
  ]);
}

// RevenueCat API keys must be set via environment variables.
// See revenuecat_init.ts for singleton initialization pattern.

// ── Daily Login Bonus + Comeback Bonus — запускается при каждом старте ────────
const runSessionChecks = async (studyTarget?: RuntimeStudyTarget) => {
  try {
    // Локальная дата устройства (см. app/local_date.ts) — иначе вечером в UTC+N
    // или утром в UTC-N дневной бонус за вход/comeback-бонус несправедливо
    // сбрасывается, хотя пользователь заходит каждый календарный день.
    const today = getLocalDayKey();

    // ── 1. Daily Login Bonus ────────────────────────────────────────────────
    // Храним consecutive login days отдельно от lesson-цепочки (дней подряд)
    const loginRaw = await AsyncStorage.getItem('login_bonus_v1');
    let login = { lastDate: null as string | null, consecutiveDays: 0 };
    try {
      if (loginRaw) {
        const parsed = JSON.parse(loginRaw);
        login = {
          lastDate: typeof parsed.lastDate === 'string' ? parsed.lastDate : null,
          consecutiveDays: typeof parsed.consecutiveDays === 'number' ? parsed.consecutiveDays : 0,
        };
      }
    } catch (e) {
      if (__DEV__) console.warn('[_layout]', e);
    }

    if (!isSameLocalOrUtcDay(login.lastDate)) {
      const consecutive = isYesterdayFlexible(login.lastDate)
        ? login.consecutiveDays + 1
        : 1;

      // 30-day login ladder. If the streak breaks, consecutive resets to 1 above.
      const bonusDay = Math.min(Math.max(1, consecutive), DAILY_LOGIN_BONUS_XP_BY_DAY.length);
      const bonusXP = DAILY_LOGIN_BONUS_XP_BY_DAY[bonusDay - 1] ?? DAILY_LOGIN_BONUS_XP_BY_DAY[0];

      const name = await AsyncStorage.getItem('user_name');
      const loginBonusResult = await registerXP(bonusXP, 'daily_login_bonus', name ?? '', 'ru', undefined, {
        eventId: [
          'login',
          safeProgressEventPart(today, 20),
          String(bonusDay),
          'bonus',
        ].join(':'),
        payload: {
          dayKey: today,
          bonusDay,
          consecutiveDays: consecutive,
        },
      });
      if (Math.max(0, Math.round(loginBonusResult.finalDelta || 0)) > 0) {
        // Сохранить бонус для отображения на Home
        await AsyncStorage.setItem('login_bonus_pending', JSON.stringify({ xp: bonusXP, cycle: consecutive }));
        await AsyncStorage.setItem('login_bonus_v1', JSON.stringify({ lastDate: today, consecutiveDays: consecutive }));

        // Ачивки за логин
        checkAchievements({ type: 'login', consecutiveDays: consecutive }).catch(() => {});
      }
    }

    // ── 2. Comeback Bonus ───────────────────────────────────────────────────
    // Вернулся после 7+ дней — 2× XP на весь сегодняшний день
    const lastActive = await AsyncStorage.getItem('last_active_date');
    const notifEnabledRaw = await AsyncStorage.getItem('notifications_enabled');
    if (lastActive) {
      const todayDate = new Date(today + 'T00:00:00');
      const lastActiveDate = new Date(lastActive + 'T00:00:00');
      const diffDays = Math.max(0, Math.floor((todayDate.getTime() - lastActiveDate.getTime()) / 86400000));
      const missedDays = Math.max(0, diffDays - 1);
      // Гард первого опыта: не дёргаем NotificationPermissionModal, пока установка
      // моложе 3 дней. Юзер должен сначала спокойно поиграть, увидеть ценность
      // приложения, и только потом мы предлагаем включить пуши. Иначе на 2-й день
      // (после первого пропуска) сразу выпрыгивает модалка про напоминания —
      // это ощущается как агрессивный onboarding.
      const installRaw = await AsyncStorage.getItem('install_date');
      const installAt = parseInt(installRaw || '0', 10) || 0;
      const installAgeMs = installAt > 0 ? Date.now() - installAt : 0;
      const MIN_INSTALL_AGE_FOR_NUDGE_MS = 3 * 24 * 60 * 60 * 1000;
      if (
        missedDays > 0 &&
        notifEnabledRaw !== 'true' &&
        installAgeMs >= MIN_INSTALL_AGE_FOR_NUDGE_MS
      ) {
        emitAppEvent('notif_permission_nudge', { missedDays });
      }
    }
    if (lastActive) {
      const daysBefore7 = new Date(); daysBefore7.setDate(daysBefore7.getDate() - 7);
      const threshold = daysBefore7.toISOString().split('T')[0];
      if (lastActive <= threshold) {
        await AsyncStorage.setItem('comeback_active', today);
        await AsyncStorage.setItem('comeback_pending', 'true');
        checkAchievements({ type: 'comeback' }).catch(() => {});
      }
    }

    const langRaw = await AsyncStorage.getItem('app_lang');
    const lang: Lang = langRaw === 'uk' ? 'uk' : langRaw === 'es' ? 'es' : 'ru';

    // ── 3. Восстановление напоминаний: daily ИЛИ per-day (расписание), не оба
    const notifEnabled = notifEnabledRaw;
    if (notifEnabled === 'true') {
      const notifSnap = getNotifSettingsSnapshot();
      const hasPerDay = Object.values(notifSnap.schedule).some(d => d.enabled);
      if (hasPerDay) {
        scheduleNotifications(notifSnap, lang, 0, { requestPermission: false, studyTarget }).catch(() => {});
      } else {
        const hour = parseInt((await AsyncStorage.getItem('notification_hour')) || '19');
        const minute = parseInt((await AsyncStorage.getItem('notification_minute')) || '0');
        scheduleDailyReminder(hour, minute, lang, { requestPermission: false, studyTarget }).catch(() => {});
      }
    }

    if (notifEnabled === 'true') {
      scheduleStreakWarningIfNeeded(lang, { requestPermission: false }).catch(() => {});
      schedulePhraseOfDayNotification(lang, { requestPermission: false, studyTarget }).catch(() => {});

      scheduleWeeklyRecapNotification(lang, { requestPermission: false }).catch(() => {});
      scheduleMonthlyRecapNotification(lang, { requestPermission: false, studyTarget }).catch(() => {});

      // Серверные пуши: регистрируем Expo push token в облаке, чтобы cron мог
      // достучаться до пропавшего юзера (стрик под угрозой / давно не заходил),
      // даже когда приложение закрыто. Best-effort, в фоне.
      void import('./push_token_registration')
        .then(({ registerPushTokenForServerPush }) => registerPushTokenForServerPush(lang))
        .catch(() => {});
      // «Вместе»: раз в запуск синхронизируем в облако тумблер «Друзья» + смещение часового
      // пояса (friends_push_v1) — сервер по ним решает, слать ли пуш «зовёт» и когда тихие часы.
      // зачем: без tz сервер считает тихие часы по UTC+3, а не по времени получателя.
      syncFriendsPushPrefIfChanged().catch(() => {});
    }

    // ── 6. League Overtake Notification ─────────────────────────────────────
    // Проверяем: опустились ли в рейтинге лиги с прошлого запуска
    try {
      const [lbCacheRaw, myNameRaw] = await Promise.all([
        AsyncStorage.getItem('global_lb_cache'),
        AsyncStorage.getItem('user_name'),
      ]);
      if (lbCacheRaw && myNameRaw) {
        const board: { name: string; points: number }[] = JSON.parse(lbCacheRaw);
        const myNameNorm = myNameRaw.trim().toLowerCase();
        const myIdx = board.findIndex(e => e.name.trim().toLowerCase() === myNameNorm);
        if (myIdx > 0) {
          const leaderAbove = board[myIdx - 1];
          checkLeagueOvertakeNotification(myIdx + 1, leaderAbove.name, lang, { requestPermission: false }).catch(() => {});
        }
      }
    } catch (e) {
      if (__DEV__) console.warn('[_layout]', e);
    }
  } catch (e) {
    if (__DEV__) console.warn('[_layout]', e);
  }
};

// ── Глобальная очередь повышений уровня — показывает модалки независимо от экрана ──
function GlobalLevelUpHandler() {
  const { isDark, themeMode } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { hasPremiumAccess } = usePremium();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const wasLevelSpinRouteRef = useRef(pathname === '/level_reward_spin');
  const tournamentInterruptionProtected = isTournamentInterruptionProtectedPath(pathname);

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  /**
   * Удержание слота арбитра в окне перехода level-up → подарок. Между setShowLevelUp(false)
   * и setShowGiftModal(true) остается только безопасная native-пауза 180-260мс; серверные
   * начисления уходят фоном. Без этого флага арбитр отдал бы слот любому ждущему тосту.
   */
  const [levelUpTransitioning, setLevelUpTransitioning] = useState(false);
  /** Премиум: два сундука (F2P + premium) вместо одного */
  const [levelGiftDualMode, setLevelGiftDualMode] = useState(false);
  const [currentIsSpin, setCurrentIsSpin] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [currentAccountLevel, setCurrentAccountLevel] = useState(0);
  const [userName, setUserName] = useState('');
  // Reconciler сохраняет подарок до постановки уровня в очередь. Здесь держим
  // точный single/dual entitlement, чтобы модал не выполнял повторный розыгрыш.
  const [giftPreRolled, setGiftPreRolled] = useState<GiftDef | undefined>(undefined);
  const [giftPreRolledPair, setGiftPreRolledPair] = useState<PremPair | undefined>(undefined);

  const queueRef    = useRef<number[]>([]);
  const singleGiftsRef = useRef<Record<number, GiftDef>>({});
  const dualGiftsRef = useRef<Record<number, PremPair>>({});
  const spinLevelsRef = useRef<Set<number>>(new Set());
  const isShowingRef = useRef(false);
  const dismissingLevelUpRef = useRef(false);
  const giftOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const giftOpenInteractionRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);
  // Страховка слота: если переход level-up → подарок «завис» (подарок не открылся/не
  // закрылся штатно — напр. Android-back в обход onGiftClose или сбой в цепочке выше),
  // levelUpTransitioning остался бы true НАВСЕГДА → слот арбитра занят, и всё ниже по
  // приоритету (праздники, leagueResult, ВСЕ тосты) заморожено до перезапуска (levelUp
  // не force-evictable, сторож его не выселяет). Этот таймер принудительно завершает
  // зависший переход. Окно = заведомо больше штатного перехода (await-ы + 180-260мс).
  const levelUpTransitionGuardRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduledStateUpdatesRef = useRef<ScheduledAnimatedStateUpdate[]>([]);
  /** Сериализация flush: двойной await getItem до removeItem давал дубликаты уровня в queueRef. */
  const flushQueueBusyRef = useRef(false);
  const flushQueueRetryRef = useRef(false);
  const queuedAccountTokenRef = useRef<AccountGenerationToken | null>(null);
  const modalAccountTokenRef = useRef<AccountGenerationToken | null>(null);
  const modalLevelRef = useRef(0);

  const resetLevelUpChainForAccountChange = useCallback(() => {
    if (giftOpenTimerRef.current) {
      clearTimeout(giftOpenTimerRef.current);
      giftOpenTimerRef.current = null;
    }
    giftOpenInteractionRef.current?.cancel();
    giftOpenInteractionRef.current = null;
    if (levelUpTransitionGuardRef.current) {
      clearTimeout(levelUpTransitionGuardRef.current);
      levelUpTransitionGuardRef.current = null;
    }
    cancelScheduledAnimatedStateUpdates(scheduledStateUpdatesRef);
    queueRef.current = [];
    singleGiftsRef.current = {};
    dualGiftsRef.current = {};
    spinLevelsRef.current = new Set();
    queuedAccountTokenRef.current = null;
    modalAccountTokenRef.current = null;
    modalLevelRef.current = 0;
    isShowingRef.current = false;
    dismissingLevelUpRef.current = false;
    setShowLevelUp(false);
    setShowGiftModal(false);
    setLevelUpTransitioning(false);
    setLevelGiftDualMode(false);
    setCurrentIsSpin(false);
    setGiftPreRolled(undefined);
    setGiftPreRolledPair(undefined);
    setCurrentLevel(0);
    setCurrentAccountLevel(0);
    setUserName('');
  }, []);

  const showNext = useCallback(async () => {
    const accountToken = queuedAccountTokenRef.current;
    if (!isLevelUpAccountTokenCurrent(accountToken)) {
      resetLevelUpChainForAccountChange();
      return;
    }
    if (queueRef.current.length === 0) { isShowingRef.current = false; return; }
    if (pathnameRef.current === '/level_reward_spin') { isShowingRef.current = false; return; }
    dismissingLevelUpRef.current = false;
    setLevelUpTransitioning(false);
    const lvl = queueRef.current[0];
    if (spinLevelsRef.current.has(lvl)) {
      setGiftPreRolledPair(undefined);
      setGiftPreRolled(undefined);
      setLevelGiftDualMode(false);
      setCurrentIsSpin(true);
      modalAccountTokenRef.current = accountToken;
      modalLevelRef.current = lvl;
      setCurrentLevel(lvl);
      setShowLevelUp(true);
      return;
    }
    setCurrentIsSpin(false);
    let savedPair = dualGiftsRef.current[lvl];
    let savedGift = singleGiftsRef.current[lvl];
    // Refresh every receipt before display. Besides reconnecting offline rolls, this
    // lets the server migrate stale/retired rewards to the canonical safe gift.
    if (savedPair) {
      try {
        savedPair = {
          f2p: await reserveLevelGiftForDisplay(lvl, 'f2p', { premiumSafe: true, studyTarget }),
          prem: await reserveLevelGiftForDisplay(lvl, 'premium', { studyTarget }),
        };
        if (!isLevelUpAccountTokenCurrent(accountToken)) {
          resetLevelUpChainForAccountChange();
          return;
        }
        await saveUnclaimedDualGift(lvl, savedPair, accountToken);
        const persistedPair = (await loadUnclaimedDualGifts())[lvl];
        if (persistedPair?.f2p.id !== savedPair.f2p.id
          || persistedPair?.prem.id !== savedPair.prem.id
          || persistedPair?.f2p.levelGiftReservation?.reservationId !== savedPair.f2p.levelGiftReservation?.reservationId
          || persistedPair?.prem.levelGiftReservation?.reservationId !== savedPair.prem.levelGiftReservation?.reservationId) {
          isShowingRef.current = false;
          return;
        }
        dualGiftsRef.current[lvl] = savedPair;
      } catch {
        isShowingRef.current = false;
        return;
      }
    } else if (savedGift) {
      try {
        savedGift = await reserveLevelGiftForDisplay(lvl, 'f2p', { studyTarget });
        if (!isLevelUpAccountTokenCurrent(accountToken)) {
          resetLevelUpChainForAccountChange();
          return;
        }
        await saveUnclaimedGift(lvl, savedGift, accountToken);
        const persistedGift = (await loadUnclaimedGifts())[lvl];
        if (persistedGift?.id !== savedGift.id
          || persistedGift?.levelGiftReservation?.reservationId !== savedGift.levelGiftReservation?.reservationId) {
          isShowingRef.current = false;
          return;
        }
        singleGiftsRef.current[lvl] = savedGift;
      } catch {
        isShowingRef.current = false;
        return;
      }
    }
    const displayGift = savedPair?.f2p ?? savedGift;
    if (!displayGift) { isShowingRef.current = false; return; }
    const displayStatus = await acquireLevelGiftDisplay(lvl, displayGift, studyTarget);
    if (!isLevelUpAccountTokenCurrent(accountToken)) {
      resetLevelUpChainForAccountChange();
      return;
    }
    if (displayStatus === 'unavailable') {
      // Offline/server failure: retain the durable queue and inventory for a truthful retry.
      isShowingRef.current = false;
      return;
    }
    if (displayStatus === 'already_displayed') {
      queueRef.current.shift();
      await acknowledgePendingLevelUpShown(lvl);
      isShowingRef.current = false;
      if (queueRef.current.length > 0) queueMicrotask(() => { void showNext(); });
      return;
    }
    setGiftPreRolledPair(savedPair ?? undefined);
    setGiftPreRolled(savedPair ? undefined : savedGift ?? undefined);
    setLevelGiftDualMode(!!savedPair);
    modalAccountTokenRef.current = accountToken;
    modalLevelRef.current = lvl;
    setCurrentLevel(lvl);
    setShowLevelUp(true);
  }, [resetLevelUpChainForAccountChange, studyTarget]);

  const drainLevelUpBonusOutbox = useCallback(async () => {
    try {
      await drainPendingLevelUpBonusIntents(async (intent, accountToken) => {
        const name = (await AsyncStorage.getItem('user_name')) || userName;
        if (!isCurrentAccountGeneration(accountToken, intent.ownerStableId)) {
          throw new Error('level_up_bonus_account_changed');
        }
        await registerXP(100, 'level_up_bonus', name, intent.lang, undefined, {
          eventId: intent.eventId,
          payload: { level: intent.level },
          accountToken,
        });
        if (!isCurrentAccountGeneration(accountToken, intent.ownerStableId)) {
          throw new Error('level_up_bonus_account_changed');
        }
        await withAccountTransitionLock(async () => {
          if (!isCurrentAccountGeneration(accountToken, intent.ownerStableId)) {
            throw new Error('level_up_bonus_account_changed');
          }
          await tryGrantPremiumMonthlyWagerFromLevelUp();
        });
      });
    } catch (error) {
      // The intent stays durable and is retried at the next boot/foreground.
      if (__DEV__) console.warn('[_layout] level-up bonus retry pending', error);
    }
  }, [userName]);

  const flushQueue = useCallback(async () => {
    if (flushQueueBusyRef.current) {
      flushQueueRetryRef.current = true;
      return;
    }
    flushQueueBusyRef.current = true;
    const flushToken = captureAccountGeneration();
    try {
      await withAccountTransitionLock(async () => {
        if (!isLevelUpAccountTokenCurrent(flushToken)) return;
        await retryPendingLevelUpRewards({ premium: !!hasPremiumAccess, studyTarget });
        if (!isLevelUpAccountTokenCurrent(flushToken)) return;
        await repairPendingLevelUpRewards({ premium: !!hasPremiumAccess, studyTarget });
        if (!isLevelUpAccountTokenCurrent(flushToken)) return;
        const raw = await AsyncStorage.getItem('pending_level_up_queue');
        if (!isLevelUpAccountTokenCurrent(flushToken)) return;
        let arr: number[] = [];
        try { arr = raw ? JSON.parse(raw) : []; } catch (e) { if (__DEV__) console.warn('[_layout]', e); }
        if (!Array.isArray(arr)) arr = [];
        const [spinLevels, singleMap, dualMap, [[, name], [, xpRaw]]] = await Promise.all([
          loadPendingLevelSpinLevelUps(),
          loadUnclaimedGifts(),
          loadUnclaimedDualGifts(),
          AsyncStorage.multiGet(['user_name', 'user_total_xp']),
        ]);
        if (!isLevelUpAccountTokenCurrent(flushToken)) return;

        const durableLegacyLevels = [...new Set(arr)]
          .filter((level) => Number.isInteger(level) && level > 0)
          .filter((lvl) => {
            const savedPair = dualMap[lvl];
            const savedGift = singleMap[lvl];
            return (!!savedPair || !!savedGift) && !(savedPair && savedGift);
          });
        // PENDING_LEVEL_SPIN_LEVEL_UP_QUEUE_KEY is loaded through the account-scoped queue module.
        spinLevelsRef.current = new Set(spinLevels);
        const durableLevels = [...new Set([...durableLegacyLevels, ...spinLevels])].sort((a, b) => a - b);
        const activeLevel = isShowingRef.current ? queueRef.current[0] : undefined;
        queueRef.current = activeLevel
          ? [activeLevel, ...durableLevels.filter((level) => level !== activeLevel)]
          : durableLevels;
        queuedAccountTokenRef.current = flushToken;
        singleGiftsRef.current = singleMap;
        dualGiftsRef.current = dualMap;
        if (name) setUserName(name);
        setCurrentAccountLevel(getLevelFromXP(parseInt(xpRaw || '0', 10) || 0));

        if (!isShowingRef.current && queueRef.current.length > 0) {
          isShowingRef.current = true;
          queueMicrotask(showNext);
        }
      });
    } catch (e) {
      if (__DEV__) console.warn('[_layout]', e);
    } finally {
      flushQueueBusyRef.current = false;
      if (flushQueueRetryRef.current) {
        flushQueueRetryRef.current = false;
        queueMicrotask(() => { void flushQueue(); });
      }
    }
  }, [hasPremiumAccess, showNext, studyTarget]);

  useEffect(() => {
    const sub = subscribeAccountGeneration((token) => {
      resetLevelUpChainForAccountChange();
      if (token.phase === 'active') queueMicrotask(() => {
        void drainLevelUpBonusOutbox();
        void flushQueue();
      });
    });
    return () => sub.remove();
  }, [drainLevelUpBonusOutbox, flushQueue, resetLevelUpChainForAccountChange]);

  useEffect(() => {
    // Проверяем очередь при старте (с задержкой, чтобы onboarding не перекрывал)
    const t = setTimeout(() => {
      void drainLevelUpBonusOutbox();
      void flushQueue();
    }, 500);
    const sub = onAppEvent('level_up_pending', flushQueue);
    return () => {
      clearTimeout(t);
      sub.remove();
      if (giftOpenTimerRef.current) clearTimeout(giftOpenTimerRef.current);
      giftOpenInteractionRef.current?.cancel();
    };
  }, [drainLevelUpBonusOutbox, flushQueue]);

  useEffect(() => {
    const wasLevelSpinRoute = wasLevelSpinRouteRef.current;
    wasLevelSpinRouteRef.current = pathname === '/level_reward_spin';
    if (wasLevelSpinRoute && pathname !== '/level_reward_spin') {
      queueMicrotask(() => { void flushQueue(); });
    }
  }, [flushQueue, pathname]);

  const lastForegroundFlushAtRef = useRef(0);
  useEffect(() => {
    let scheduledFlush: { cancel: () => void } | null = null;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      // зачем: foreground-путь — лишь страховка на пропущенное level_up_pending;
      // событие само зовёт flushQueue мгновенно. Троттл гасит частые сворачивания.
      const now = Date.now();
      if (now - lastForegroundFlushAtRef.current < FOREGROUND_FLUSH_MIN_MS) return;
      lastForegroundFlushAtRef.current = now;
      scheduledFlush?.cancel();
      scheduledFlush = scheduleCoalescedForegroundTask('root_level_up_queue_flush', async () => {
        await drainLevelUpBonusOutbox();
        await flushQueue();
      });
    });
    return () => {
      sub.remove();
      scheduledFlush?.cancel();
    };
  }, [drainLevelUpBonusOutbox, flushQueue]);

  useEffect(() => () => {
    cancelScheduledAnimatedStateUpdates(scheduledStateUpdatesRef);
  }, []);

  // Refresh the home/lock-screen "phrase of the day" widget on app start and
  // whenever the theme, interface language, or study target changes — so the
  // widget stays fresh and on-theme even if the user never opens the home tab.
  // Best-effort; a native no-op off-device.
  useEffect(() => {
    void syncWidgetData({ studyTarget, lang, themeMode });
  }, [studyTarget, lang, themeMode]);

  // Re-publish the widget snapshot every time the app comes to the foreground.
  // The effect above only fires when theme/lang/target change, so without this a
  // day rollover while the app was backgrounded would leave the widget on
  // yesterday's phrase (native re-reads the SAME stored snapshot at midnight; it
  // needs the app to write the new day). Foregrounding is the natural moment to
  // guarantee the widget shows today's phrase — the exact one the app shows.
  useEffect(() => {
    let scheduledWidgetRefresh: { cancel: () => void } | null = null;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        scheduledWidgetRefresh?.cancel();
        scheduledWidgetRefresh = scheduleCoalescedForegroundTask('root_widget_snapshot_refresh', async () => {
          await syncWidgetData({ studyTarget, lang, themeMode });
        });
      }
    });
    return () => {
      sub.remove();
      scheduledWidgetRefresh?.cancel();
    };
  }, [studyTarget, lang, themeMode]);

  // зачем: владелец: «открываю раздел — он чуть подпрыгивает, будто ассеты грузятся».
  // Иконки разделов и плитки хаба карточек не входили в image_preload, поэтому
  // декодировались уже во время показа экрана. Греем их для АКТИВНОЙ темы строго после
  // первого кадра (главная уже видна), и повторно при смене темы — к моменту тапа по
  // разделу картинки лежат в кэше и первый кадр раздела сразу финальный.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void import('./section_asset_preload')
        .then((m) => m.preloadSectionAssets(themeMode))
        .catch(() => {});
    });
    return () => task.cancel();
  }, [themeMode]);

  const finalizeSpinLevelUp = () => {
    const accountToken = modalAccountTokenRef.current;
    const level = modalLevelRef.current;
    if (!currentIsSpin || !accountToken || !canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) return;
    if (!Number.isInteger(level) || level <= 0 || dismissingLevelUpRef.current) return;
    dismissingLevelUpRef.current = true;
    setLevelUpTransitioning(true);
    // зачем: гибрид (LevelUpThresholdModalHybrid) ведёт свой собственный выход
    // (reanimated), Animated.Value-гейт больше не нужен — но порядок операций
    // (тот же 220мс зазор перед записью прогресса/наград) сохраняем таймером,
    // чтобы колбэки прогресса не сдвинулись и не начали гонку с закрытием Modal.
    const exitTimer = setTimeout(() => {
      if (!canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) {
        dismissingLevelUpRef.current = false;
        setLevelUpTransitioning(false);
        return;
      }
      scheduleTrackedAnimatedStateUpdate(scheduledStateUpdatesRef, () => {
        void (async () => {
          const l: Lang = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
          try {
            const persisted = await persistLevelUpBonusIntent(level, l);
            if (!persisted) throw new Error('level_up_bonus_intent_not_persisted');
            if (!canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) return;
            await acknowledgePendingLevelSpinLevelUp(level);
          } catch {
            if (!canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) return;
            dismissingLevelUpRef.current = false;
            setLevelUpTransitioning(false);
            setShowLevelUp(true);
            return;
          }
          if (!canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) return;
          spinLevelsRef.current.delete(level);
          queueRef.current = queueRef.current.filter((queuedLevel) => queuedLevel !== level);
          modalAccountTokenRef.current = null;
          modalLevelRef.current = 0;
          dismissingLevelUpRef.current = false;
          setCurrentIsSpin(false);
          void drainLevelUpBonusOutbox();
          setShowLevelUp(false);
          setLevelUpTransitioning(false);
          if (queueRef.current.length > 0) {
            queueMicrotask(() => { void showNext(); });
          } else {
            isShowingRef.current = false;
          }
        })();
      });
    }, 220);
    scheduledStateUpdatesRef.current.push({ cancel: () => clearTimeout(exitTimer) });
  };

  const dismissLevelUp = () => {
    const accountToken = modalAccountTokenRef.current;
    if (!accountToken || !canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) return;
    if (dismissingLevelUpRef.current) return;
    dismissingLevelUpRef.current = true;
    // Держим слот арбитра на весь переход level-up → подарок (см. levelUpTransitioning).
    setLevelUpTransitioning(true);
    // зачем: гибрид (LevelUpThresholdModalHybrid) ведёт свой собственный выход
    // (reanimated), Animated.Value-гейт больше не нужен — но порядок операций
    // (тот же 300мс зазор перед начислением XP и открытием подарка) сохраняем
    // таймером, чтобы колбэки прогресса не сдвинулись и не начали гонку с
    // закрытием Modal.
    const exitTimer = setTimeout(() => {
      if (!canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) return;
      scheduleTrackedAnimatedStateUpdate(scheduledStateUpdatesRef, () => {
        setShowLevelUp(false);
        giftOpenInteractionRef.current = InteractionManager.runAfterInteractions(() => {
          giftOpenInteractionRef.current = null;
          if (!canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) return;
          // Android can keep the closing Modal's native window alive for a beat.
          // Opening the gift Modal immediately after level-up caused stuck touches/ANR.
          giftOpenTimerRef.current = setTimeout(() => {
            giftOpenTimerRef.current = null;
            if (!canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) return;
            setShowGiftModal(true);
          }, Platform.OS === 'android' ? 260 : 180);
        });
        void (async () => {
          if (!canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) return;
          try {
            const name = (await AsyncStorage.getItem('user_name')) || userName;
            if (!canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) return;
            const l: Lang = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
            await registerXP(100, 'level_up_bonus', name, l, undefined, {
              eventId: [
                'level_up',
                safeProgressEventPart(currentLevel),
                'bonus',
              ].join(':'),
              payload: {
                level: currentLevel,
              },
              accountToken,
            });
            if (!canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) return;
            await withAccountTransitionLock(async () => {
              if (!canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) return;
              await tryGrantPremiumMonthlyWagerFromLevelUp();
            });
          } catch {
            /* background level-up extras must never delay the gift */
          }
        });
      });
    }, 300);
    scheduledStateUpdatesRef.current.push({ cancel: () => clearTimeout(exitTimer) });
  };

  const onGiftClose = (_claimed: boolean) => {
    const accountToken = modalAccountTokenRef.current;
    if (!canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) return;
    setShowGiftModal(false);
    dismissingLevelUpRef.current = false;
    // Переход завершён — отпускаем слот арбитра.
    setLevelUpTransitioning(false);
    queueRef.current = queueRef.current.slice(1);
    modalAccountTokenRef.current = null;
    modalLevelRef.current = 0;
    if (queueRef.current.length > 0) {
      queueMicrotask(showNext);
    } else {
      isShowingRef.current = false;
      // План #3: after-win апсейл после ПОЛНОГО завершения празднования level-up.
      // Гард не даёт спамить (кулдаун + не дублировать сегодняшний пейвол).
      void withAccountTransitionLock(async () => {
        if (!isLevelUpAccountTokenCurrent(accountToken)) return;
        try {
          // This standard level-up paywall is a one-time free-user moment:
          // exactly after reaching level 5, never before or after.
          if (currentLevel !== 5 || hasPremiumAccess) return;
          const prem = await getVerifiedPremiumStatus().catch(() => false);
          if (!isLevelUpAccountTokenCurrent(accountToken)) return;
          // Не показываем поверх модалки конца интро — она важнее (главный момент конверсии).
          const introState = await getIntroFullAccessState().catch(() => null);
          if (!isLevelUpAccountTokenCurrent(accountToken)) return;
          if (introState?.expiredUnseen === true) return;
          const [{ canShowAfterWinUpsell, markAfterWinUpsellShown }, { trackEvent }] = await Promise.all([
            import('./after_win_upsell_gate'),
            import('./analytics'),
          ]);
          if (!(await canShowAfterWinUpsell({ isPremium: prem, nowMs: Date.now() }))) return;
          if (!isLevelUpAccountTokenCurrent(accountToken)) return;
          if (isTournamentInterruptionProtectedPath(pathnameRef.current)) return;
          // Сначала навигация: если push упадёт — гейт не «сгорит» впустую.
          globalRouter.push({ pathname: '/premium_modal', params: { context: 'level_up', source: 'afterwin_levelup' } } as any);
          await markAfterWinUpsellShown(Date.now());
          await trackEvent('afterwin_upsell_shown', { source: 'level_up' });
          void import('./firebase').then(({ logAfterWinUpsellShown }) => logAfterWinUpsellShown('level_up')).catch(() => {});
        } catch { /* no-op */ }
      });
    }
  };

  const newTitleDef = getTitleForLevel(currentLevel);
  const isNewTitle  = newTitleDef.minLevel === currentLevel;
  const titleColor  = getTitleColor(currentLevel, isDark);
  const levelUpOverlayVisible = useOverlayVisible(
    'levelUp',
    !tournamentInterruptionProtected && (showLevelUp || showGiftModal || levelUpTransitioning),
  );
  const isCatchUpLevelReward = currentAccountLevel > currentLevel;
  const levelUpKickerText = isCatchUpLevelReward
    ? (lang === 'uk' ? 'Нагорода за рівень' : lang === 'es' ? 'Recompensa de nivel' : 'Награда за уровень')
    : (lang === 'uk' ? 'Новий рівень' : lang === 'es' ? 'Nuevo nivel' : 'Новый уровень');
  const levelUpMessageText = currentIsSpin
    ? ''
    : isCatchUpLevelReward
    ? (lang === 'uk'
      ? `Це твоя нагорода за рівень ${currentLevel}. Забирай подарунок.`
      : lang === 'es'
        ? `Esta es tu recompensa del nivel ${currentLevel}. Recoge tu regalo.`
        : `Это твоя награда за уровень ${currentLevel}. Забирай подарок.`)
    : (() => {
      const pool = lang === 'uk' ? LEVELUP_CONGRATS_UK : lang === 'es' ? LEVELUP_CONGRATS_ES : LEVELUP_CONGRATS_RU;
      return pool[currentLevel % pool.length];
    })();

  const acknowledgeNativeLevelUpShown = useCallback(() => {
    const accountToken = modalAccountTokenRef.current;
    const shownLevel = modalLevelRef.current;
    void withAccountTransitionLock(async () => {
      if (!canAcknowledgeLevelUpForAccount(accountToken, queuedAccountTokenRef.current)) return;
      if (!Number.isInteger(shownLevel) || shownLevel <= 0) return;
      await acknowledgePendingLevelUpShown(shownLevel);
    });
  }, []);

  // СТОРОЖ перехода level-up → подарок (анти-залипание слота арбитра).
  // Опасное состояние: levelUpTransitioning=true, но НИ одна модалка не видна
  // (showLevelUp=false И showGiftModal=false). В норме это длится доли секунды
  // (await registerXP/премиум + таймер 180-260мс). Если же подарок не открылся/не
  // закрылся штатно (Android-back в обход onGiftClose, сбой в цепочке) — флаг застрял
  // бы навсегда, слот не освобождается, и всё ниже по приоритету заморожено до
  // перезапуска. По истечении заведомо большого окна принудительно завершаем переход.
  useEffect(() => {
    const stuckBetween = levelUpTransitioning && !showLevelUp && !showGiftModal;
    if (!stuckBetween) {
      if (levelUpTransitionGuardRef.current) {
        clearTimeout(levelUpTransitionGuardRef.current);
        levelUpTransitionGuardRef.current = null;
      }
      return;
    }
    if (levelUpTransitionGuardRef.current) return; // уже взведён
    levelUpTransitionGuardRef.current = setTimeout(() => {
      levelUpTransitionGuardRef.current = null;
      // Если подарок к этому моменту так и не показался — считаем переход сорванным,
      // отпускаем слот. Если показался (showGiftModal стал true) — stuckBetween уже
      // false и таймер был снят выше, сюда не попадём.
      dismissingLevelUpRef.current = false;
      setLevelUpTransitioning(false);
    }, 4000);
    return () => {
      if (levelUpTransitionGuardRef.current) {
        clearTimeout(levelUpTransitionGuardRef.current);
        levelUpTransitionGuardRef.current = null;
      }
    };
  }, [levelUpTransitioning, showLevelUp, showGiftModal]);

  return (
    <>
      {/* Variant B — Threshold. Reward state and queue lifecycle stay owned by GlobalLevelUpHandler. */}
      <LevelUpThresholdModal
        variant={currentLevel % 5 === 0 ? 'milestone' : 'standard'}
        visible={levelUpOverlayVisible && showLevelUp}
        level={currentLevel}
        themeMode={themeMode}
        kicker={levelUpKickerText}
        headline={triLang(lang, {
          ru: 'УРОВЕНЬ ' + currentLevel,
          uk: 'РІВЕНЬ ' + currentLevel,
          es: 'NIVEL ' + currentLevel,
          'pt-BR': 'NÍVEL ' + currentLevel,
          vi: 'CẤP ' + currentLevel,
          id: 'LEVEL ' + currentLevel,
          tr: 'SEVİYE ' + currentLevel,
          pl: 'POZIOM ' + currentLevel,
        })}
        message={levelUpMessageText}
        xpLabel={triLang(lang, {
          ru: 'Бонус уровня',
          uk: 'Бонус рівня',
          es: 'Bono de nivel',
          'pt-BR': 'Bônus de nível',
          vi: 'Thưởng cấp độ',
          id: 'Bonus level',
          tr: 'Seviye bonusu',
          pl: 'Bonus poziomu',
        })}
        xpValue={'+100 XP'}
        titleLabel={triLang(lang, {
          ru: 'Новый титул',
          uk: 'Новий титул',
          es: 'Nuevo título',
          'pt-BR': 'Novo título',
          vi: 'Danh hiệu mới',
          id: 'Gelar baru',
          tr: 'Yeni unvan',
          pl: 'Nowy tytuł',
        })}
        titleReward={isNewTitle ? newTitleDef.titleEN : undefined}
        titleColor={titleColor}
        energyLabel={triLang(lang, {
          ru: 'Энергия',
          uk: 'Енергія',
          es: 'Energía',
          'pt-BR': 'Energia',
          vi: 'Năng lượng',
          id: 'Energi',
          tr: 'Enerji',
          pl: 'Energia',
        })}
        energyReward={currentLevel === 50 ? getMaxEnergyForLevel(currentLevel) : undefined}
        energyValue={(amount) => triLang(lang, {
          ru: 'Теперь ' + amount + ' энергии в день',
          uk: 'Тепер ' + amount + ' енергії на день',
          es: 'Ahora tienes ' + amount + ' de energía diaria',
          'pt-BR': 'Agora você tem ' + amount + ' de energia por dia',
          vi: 'Giờ bạn có ' + amount + ' năng lượng mỗi ngày',
          id: 'Sekarang ' + amount + ' energi per hari',
          tr: 'Artık günde ' + amount + ' enerji',
          pl: 'Teraz masz ' + amount + ' energii dziennie',
        })}
        spinReward={currentIsSpin}
        spinReceiptId={currentIsSpin ? levelSpinCreditId(currentLevel) : ''}
        continueLabel={triLang(lang, {
          ru: 'Готово',
          uk: 'Готово',
          es: 'Listo',
          'pt-BR': 'Pronto',
          vi: 'Xong',
          id: 'Selesai',
          tr: 'Tamam',
          pl: 'Gotowe',
        })}
        onShow={() => {
          if (!currentIsSpin) acknowledgeNativeLevelUpShown();
          soundDirector.request('pm.reward.level_up', {
            scope: 'level-up-modal',
            dedupeKey: String(currentLevel),
          });
        }}
        onContinue={currentIsSpin ? finalizeSpinLevelUp : dismissLevelUp}
      />
      {levelGiftDualMode ? (
        <LevelGiftDualModal
          visible={levelUpOverlayVisible && showGiftModal}
          level={currentLevel}
          userName={userName}
          lang={lang}
          onClose={onGiftClose}
          deliveryMode="inventory"
          preRolledPair={giftPreRolledPair}
          studyTarget={studyTarget}
        />
      ) : (
        <LevelGiftModal
          visible={levelUpOverlayVisible && showGiftModal}
          level={currentLevel}
          userName={userName}
          lang={lang}
          onClose={onGiftClose}
          deliveryMode="inventory"
          preRolledGift={giftPreRolled}
          studyTarget={studyTarget}
        />
      )}
    </>
  );
}

const BAN_CACHE_KEY = 'ban_status_cached_v1';
const BAN_CACHE_AT_KEY = 'ban_status_cached_at_v1';
const BAN_CACHE_TTL_MS = 30 * 60 * 1000;

// Вынесено в дочерний компонент чтобы иметь доступ к LangContext + AchievementContext
function AppContent({ fontsReady = true }: { fontsReady?: boolean }) {
  const [ready, setReady]           = useState(false);
  const [rootNavigationReady, setRootNavigationReady] = useState(false);
  const [isBanned, setIsBanned]     = useState(false);
  const [showOnboarding, setShow]   = useState(false);
  // Онбординг переоткрывается на шаге «Имя» после пейвола (continue-free / покупка):
  // монтируем сразу на 'name' без блокирующего async-резолва A/B (иначе пустой
  // «resolving»-экран + ожидание Keychain getStableId = «думает» после кнопки).
  const [onboardingStartAtName, setOnboardingStartAtName] = useState(false);
  // true, пока активен онбординг-пейвол (роут paywall_a/b/c, source=onboarding_plan).
  // Управляет presentation статических <Stack.Screen> ниже: онбординг открывает пейвол
  // как ОБЫЧНЫЙ экран (card, без выезда снизу), все прочие источники — modal slide_from_bottom.
  // Per-instance <Stack.Screen options> внутри пейвола НЕ перебивает mount-presentation —
  // нативный стек читает presentation при push, до тела экрана, поэтому флаг тут, в навигаторе.
  const [onboardingPaywallActive, setOnboardingPaywallActive] = useState(false);
  const [firstContentReady, setFirstContentReady] = useState(false);
  const [introFullAccessModal, setIntroFullAccessModal] = useState<'welcome' | 'ended' | null>(null);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [pendingWarmDeepLink, setPendingWarmDeepLink] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  /** Скрываем RN Modal до ухода в стор — на Android иначе зависания System UI при возврате. */
  const [updateModalHiddenForStore, setUpdateModalHiddenForStore] = useState(false);
  const awaitingStoreReturnRef = useRef(false);
  useEffect(() => {
    // Load the completion transport only after the root has committed. This
    // installs its lifecycle/connectivity scheduler on every app launch without
    // adding the heavy sync module to the synchronous first-frame bundle.
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      void import('./learning_v2_completion_background_scheduler').then((scheduler) => {
        if (!cancelled) scheduler.ensureLearningV2CompletionBackgroundSchedulerInstalled();
      }).catch(() => {});
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, []);
  /** Гард от повторного вызова handleOnboardingDone (двойной тап «Позже» в auth-шаге онбординга
   *  раньше планировал два setTimeout → модалка «Начнём первый урок?» открывалась повторно после «Поехали»). */
  const onboardingDoneHandledRef = useRef(false);
  /** Первый запуск с онбордингом: не грузим 32 урока с диска до первого кадра — иначе подвисают тапы. */
  const onboardingPathRef = useRef(false);
  const deferLessonPrimeRef = useRef(false);
  const firstContentReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runHeavyInitRef = useRef<(() => void) | null>(null);
  const heavyInitStartedRef = useRef(false);
  const postOnboardingGoldBridgeAnim = useRef(new Animated.Value(0)).current;
  const [postOnboardingGoldBridgeVisible, setPostOnboardingGoldBridgeVisible] = useState(false);
  const [postOnboardingGoldBridgeArmed, setPostOnboardingGoldBridgeArmed] = useState(false);

  const armPostOnboardingGoldBridge = useCallback(() => {
    postOnboardingGoldBridgeAnim.stopAnimation();
    postOnboardingGoldBridgeAnim.setValue(1);
    setPostOnboardingGoldBridgeVisible(true);
    setPostOnboardingGoldBridgeArmed(true);
  }, [postOnboardingGoldBridgeAnim]);

  const beginPostOnboardingGoldBridgeFade = useCallback(() => {
    postOnboardingGoldBridgeAnim.stopAnimation();
    Animated.timing(postOnboardingGoldBridgeAnim, {
      toValue: 0,
      duration: POST_ONBOARDING_GOLD_BRIDGE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setPostOnboardingGoldBridgeVisible(false);
    });
  }, [postOnboardingGoldBridgeAnim]);

  useEffect(() => () => {
    postOnboardingGoldBridgeAnim.stopAnimation();
  }, [postOnboardingGoldBridgeAnim]);

  useEffect(() => {
    if (!updateInfo) {
      setUpdateModalHiddenForStore(false);
      awaitingStoreReturnRef.current = false;
    }
  }, [updateInfo]);

  const [releaseNotesOffer, setReleaseNotesOffer] = useState(false);
  const [globalBroadcastModal, setGlobalBroadcastModal] = useState<GlobalBroadcastModalPayload | null>(null);
  const [personalAdminMessage, setPersonalAdminMessage] = useState<AppMessageWithState | null>(null);
  const [accountGeneration, setAccountGeneration] = useState(() => captureAccountGeneration());
  const [, setCosmeticCatalogRevision] = useState(0);
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === 'active');
  const [leagueBonusAvailable, setLeagueBonusAvailable] = useState<LeagueBonusAvailability | null>(null);
  const [notifNudgeVisible, setNotifNudgeVisible] = useState(false);
  const [startupAuthRecoveryVisible, setStartupAuthRecoveryVisible] = useState(false);
  const startupAuthRecoveryOfferedRef = useRef(false);
  const [notifNudgeMissedDays, setNotifNudgeMissedDays] = useState(0);
  const { setLang, lang } = useLang();
  const remoteDeletionNoticeShownRef = useRef(false);
  const { studyTarget } = useStudyTarget();
  const { isPremium, isVip } = usePremium();
  const { showAchievement } = useAchievement();
  const { theme: tTheme, themeMode } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const tournamentInterruptionProtected = isTournamentInterruptionProtectedPath(pathname);
  const coldExamBestPctRestoreOptions = useMemo(() => ({
    canPublishExamBestPctOverlay: () => {
      const currentPath = pathnameRef.current;
      const safeHomePath = currentPath === '/' || currentPath === '/home' || currentPath === '/(tabs)/home';
      return AppState.currentState === 'active'
        && safeHomePath
        && isExamBestPctColdRestoreTabSafe();
    },
  }), []);
  const globalSearchParams = useGlobalSearchParams();

  const showRemoteAccountDeletionNotice = useCallback(async () => {
    const pending = await consumeRemoteAccountDeletionNotice();
    if (!pending || remoteDeletionNoticeShownRef.current) return;
    remoteDeletionNoticeShownRef.current = true;
    await enqueueThemedBlockingInfoAlert(
      triLang(lang, {
        ru: 'Аккаунт удалён',
        uk: 'Акаунт видалено',
        es: 'Cuenta eliminada',
        'pt-BR': 'Conta excluída',
        vi: 'Tài khoản đã bị xóa',
        id: 'Akun telah dihapus',
        tr: 'Hesap silindi',
        pl: 'Konto usunięte',
      }),
      triLang(lang, {
        ru: 'Этот аккаунт был удалён на другом устройстве. Локальные данные на этом телефоне очищены, вход завершён.',
        uk: 'Цей акаунт було видалено на іншому пристрої. Локальні дані на цьому телефоні очищено, сеанс завершено.',
        es: 'Esta cuenta se eliminó en otro dispositivo. Se borraron los datos locales de este teléfono y se cerró la sesión.',
        'pt-BR': 'Esta conta foi excluída em outro dispositivo. Os dados locais deste telefone foram apagados e a sessão foi encerrada.',
        vi: 'Tài khoản này đã bị xóa trên một thiết bị khác. Dữ liệu cục bộ trên điện thoại này đã được xóa và phiên đăng nhập đã kết thúc.',
        id: 'Akun ini dihapus di perangkat lain. Data lokal di ponsel ini telah dibersihkan dan sesi telah diakhiri.',
        tr: 'Bu hesap başka bir cihazda silindi. Bu telefondaki yerel veriler temizlendi ve oturum kapatıldı.',
        pl: 'To konto usunięto na innym urządzeniu. Dane lokalne na tym telefonie zostały wyczyszczone, a sesja zakończona.',
      }),
      'OK',
    );
  }, [lang]);

  useEffect(() => {
    void showRemoteAccountDeletionNotice();
  }, [showRemoteAccountDeletionNotice]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    return startRemoteAccountDeletionMonitor(async () => {
      if (isLocalAccountDeletionInProgress()) return false;
      const result = await handleAccountDeletedOnAnotherDevice();
      if (!result.ok) return false;
      emitAppEvent('account_deleted');
      await showRemoteAccountDeletionNotice();
      return true;
    });
  }, [showRemoteAccountDeletionNotice]);
  const navigationPathSignature = buildNavigationPathSignature(pathname, globalSearchParams);
  const currentDevUtilityRoute = isDevUtilityRoutePath(pathname);
  const effectiveShowOnboarding = showOnboarding && !currentDevUtilityRoute;
  const isRootIndexRoute = !pathname || pathname === '/';
  const insets = useStableSafeAreaInsets();
  const globalBottomOverlay = useGlobalBottomOverlayOffset();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    setRootNavigationReady(true);
  }, []);

  useEffect(() => {
    const subscription = onAppEvent('cosmetic_asset_catalog_changed', () => {
      // Availability lives in a tiny module registry; one root render refreshes
      // every mounted profile/catalog without per-avatar subscriptions.
      setCosmeticCatalogRevision((current) => current + 1);
    });
    void import('./cosmetic_asset_archive')
      .then(({ hydrateCosmeticAssetCatalog }) => hydrateCosmeticAssetCatalog())
      .catch(() => {});
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = subscribeAccountGeneration((token) => {
      setAccountGeneration(token);
      setPersonalAdminMessage(null);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => setAppIsActive(nextState === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!ready || !firstContentReady || !appIsActive || effectiveShowOnboarding || isBanned) return;
    if (accountGeneration.phase !== 'active' || !accountGeneration.stableId) return;
    const token = accountGeneration;
    let cancelled = false;
    void refreshAppMessagesSnapshotOnce({ force: true, minIntervalMs: 0 })
      .then((snapshot) => {
        if (cancelled || !isCurrentAccountGeneration(token, token.stableId)) return;
        setPersonalAdminMessage(pickNextLoginPersonalMessage(snapshot));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [accountGeneration, appIsActive, effectiveShowOnboarding, firstContentReady, isBanned, ready]);

  useEffect(() => {
    if (!ready || !firstContentReady || !appIsActive || effectiveShowOnboarding || isBanned) return;
    if (accountGeneration.phase !== 'active' || !accountGeneration.stableId) return;
    const token = accountGeneration;
    const flush = () => {
      if (!isCurrentAccountGeneration(token, token.stableId)) return;
      void import('./friend_gift_outbox')
        .then(({ resumePendingFriendGiftSends }) => resumePendingFriendGiftSends({ accountToken: token }))
        .catch(() => { /* exact request remains durable until the next online pass */ });
    };
    flush();
    return subscribeNetStatus((online) => {
      if (online) flush();
    });
  }, [accountGeneration, appIsActive, effectiveShowOnboarding, firstContentReady, isBanned, ready]);

  useEffect(() => {
    if (!ready || !firstContentReady || !appIsActive || effectiveShowOnboarding || isBanned) return;
    if (accountGeneration.phase !== 'active' || !accountGeneration.stableId) return;
    const token = accountGeneration;
    void import('./coin_exchange_wallet_outbox')
      .then(({ resumePendingCoinExchangeWalletRewards }) =>
        resumePendingCoinExchangeWalletRewards({ accountToken: token }))
      .catch(() => { /* durable outbox remains pending for the next active pass */ });
  }, [accountGeneration, appIsActive, effectiveShowOnboarding, firstContentReady, isBanned, ready]);

  const closePersonalAdminMessage = useCallback(async (messageId: string) => {
    const ownerUid = accountGeneration.stableId;
    setPersonalAdminMessage((current) => current?.id === messageId ? null : current);
    if (!ownerUid || !isCurrentAccountGeneration(accountGeneration, ownerUid)) return;
    await acknowledgePersonalAdminMessageModal(messageId, ownerUid).catch(() => {});
  }, [accountGeneration]);

  // Глобальная аудио-сессия на старте: озвучка должна играть ДАЖЕ при включённом
  // беззвучном режиме (mute-switch) на iPhone и независимо от того, какой путь
  // (OpenAI-клип или системный TTS) зазвучит первым. Раньше playsInSilentMode
  // выставлялся лениво и только в клип-пути, а expo-speech на iOS работает в
  // отдельной сессии — поэтому при беззвучном режиме звука не было совсем.
  useEffect(() => {
    void setManagedAudioMode(UI_SFX_AUDIO_MODE)
      .catch(() => { /* не критично: воспроизведение возможно и с дефолтным режимом */ });
  }, []);

  useEffect(() => {
    rememberNavigationPath(navigationPathSignature);
  }, [navigationPathSignature]);

  // Android hardware Back must obey the same section boundary as every visible
  // back button. Screens with a richer local contract (confirm forfeit, close an
  // inner sheet, persist a lesson) are excluded by shouldHandleGlobalHardwareBack.
  useEffect(() => {
    if (
      Platform.OS !== 'android'
      || !ready
      || effectiveShowOnboarding
      || isBanned
      || currentDevUtilityRoute
      || !shouldHandleGlobalHardwareBack(navigationPathSignature ?? pathname)
    ) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const currentPath = navigationPathSignature ?? pathname;
      safeRouterBack(router, navigationFallbackForPath(currentPath));
      return true;
    });
    return () => subscription.remove();
  }, [
    currentDevUtilityRoute,
    effectiveShowOnboarding,
    isBanned,
    navigationPathSignature,
    pathname,
    ready,
    router,
  ]);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const target = normalizeWarmDeepLink(url);
      if (!target) return;
      setPendingWarmDeepLink(target);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const targetIsDevUtilityRoute = isDevUtilityRoutePath(pendingWarmDeepLink);
    if (!pendingWarmDeepLink || !ready || !rootNavigationReady || isBanned || (showOnboarding && !targetIsDevUtilityRoute)) return;
    const target = pendingWarmDeepLink;
    setPendingWarmDeepLink(null);

    if (isDevUtilityRoutePath(target)) {
      if (!ENABLE_DEV_TOOLS) {
        router.replace('/(tabs)/home' as any);
        return;
      }
      router.replace(target as any);
      const retry = setTimeout(() => router.replace(target as any), 250);
      return () => clearTimeout(retry);
    }

    if (isTabsGroupRoutePath(target)) {
      router.replace(target as any);
      return;
    }

    router.push(target as any);
  }, [isBanned, pendingWarmDeepLink, ready, rootNavigationReady, router, showOnboarding]);

  useEffect(() => {
    if (!ready || !rootNavigationReady || effectiveShowOnboarding || isBanned || !isRootIndexRoute) return;
    router.replace('/(tabs)/home' as any);
    const retry = setTimeout(() => router.replace('/(tabs)/home' as any), 120);
    return () => clearTimeout(retry);
  }, [effectiveShowOnboarding, isBanned, isRootIndexRoute, ready, rootNavigationReady, router]);

  useEffect(() => {
    if (!ready || !pathname || lastPathRef.current === pathname) return;
    const previous = lastPathRef.current;
    lastPathRef.current = pathname;
    void trackActivity('navigation:screen_view', {
      feature: 'navigation',
      screen: pathname,
      result: 'success',
      tags: { previous },
    });
  }, [pathname, ready]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const sub = AppState.addEventListener('change', state => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        timeoutId = null;
        void trackActivity('app:state_change', {
          feature: 'app_lifecycle',
          result: 'info',
          tags: { state },
        });
      }, state === 'active' ? 1200 : 250);
    });
    return () => {
      sub.remove();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const nativeSplashCanHide = fontsReady && ready
    && (effectiveShowOnboarding || isBanned || firstContentReady);
  useEffect(() => {
    if (!nativeSplashCanHide) return;
    void SplashScreen.hideAsync();
  }, [nativeSplashCanHide]);

  useEffect(() => {
    const sub = onAppEvent('app_first_content_ready', () => {
      if (firstContentReadyTimerRef.current) return;
      firstContentReadyTimerRef.current = setTimeout(() => {
        firstContentReadyTimerRef.current = null;
        setFirstContentReady(true);
      }, 32);
    });
    return () => {
      sub.remove();
      if (firstContentReadyTimerRef.current) {
        clearTimeout(firstContentReadyTimerRef.current);
        firstContentReadyTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!ready || effectiveShowOnboarding || isBanned || firstContentReady) return;
    const timer = setTimeout(() => setFirstContentReady(true), FIRST_CONTENT_READY_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [effectiveShowOnboarding, firstContentReady, isBanned, ready]);

  useEffect(() => {
    if (!ready || effectiveShowOnboarding || isBanned || !firstContentReady || heavyInitStartedRef.current) return;
    heavyInitStartedRef.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => runHeavyInitRef.current?.(), 250);
    });
    return () => {
      if (timer) clearTimeout(timer);
      task.cancel?.();
    };
  }, [effectiveShowOnboarding, firstContentReady, isBanned, ready]);

  useEffect(() => {
    void hydratePlatformUiPreviewFromStorage();
  }, []);

  const checkBanStatus = useCallback(async (force = false) => {
    if (IS_EXPO_GO) return;
    try {
      if (!force) {
        const [[, raw], [, atRaw]] = await AsyncStorage.multiGet([BAN_CACHE_KEY, BAN_CACHE_AT_KEY]);
        const at = parseInt(atRaw || '0', 10) || 0;
        if (raw === '1' || raw === '0') {
          if (Date.now() - at < BAN_CACHE_TTL_MS) {
            setIsBanned(raw === '1');
            return;
          }
        }
      }
      const firestoreModule = await import('@react-native-firebase/firestore');
      const db = firestoreModule.default();
      const uid = await getCanonicalUserId();
      if (!uid) return;
      const [banDoc, userDoc] = await Promise.all([
        db.collection('banned_users').doc(uid).get(),
        db.collection('users').doc(uid).get(),
      ]);
      const bannedByList = !!banDoc?.exists;
      const bannedByFlag = !!userDoc?.data?.()?.banned;
      const banned = bannedByList || bannedByFlag;
      setIsBanned(banned);
      await AsyncStorage.multiSet([
        [BAN_CACHE_KEY, banned ? '1' : '0'],
        [BAN_CACHE_AT_KEY, String(Date.now())],
      ]).catch(() => {});
    } catch {
      // fail-soft: if check fails, do not block app
    }
  }, []);

  const globalBroadcastCheckInFlightRef = useRef(false);
  const checkGlobalBroadcastFn = useCallback(async () => {
    if (IS_EXPO_GO) return;
    if (globalBroadcastCheckInFlightRef.current) return;
    if (globalBroadcastModal) return;
    globalBroadcastCheckInFlightRef.current = true;
    try {
      const payload = await fetchPendingGlobalBroadcastModal(studyTarget);
      if (payload) setGlobalBroadcastModal(payload);
    } finally {
      globalBroadcastCheckInFlightRef.current = false;
    }
  }, [globalBroadcastModal, studyTarget]);

  useEffect(() => {
    const t = setTimeout(() => { void checkGlobalBroadcastFn(); }, 1400);
    return () => clearTimeout(t);
  }, [checkGlobalBroadcastFn]);

  const showLeagueBonusAvailableOnce = useCallback(async (availability: LeagueBonusAvailability, source: 'startup' | 'foreground' | 'route') => {
    const seenKey = `${LEAGUE_BONUS_AVAILABLE_SEEN_PREFIX}${buildLeagueBonusSeenKey(availability.userUid, availability.weekId)}`;
    if (!reserveLeagueBonusNoticeThisSession(seenKey)) return;
    const seen = await AsyncStorage.getItem(seenKey).catch(() => null);
    if (seen === '1') return;
    await AsyncStorage.setItem(seenKey, '1').catch(() => {});
    void pruneLeagueBonusSeenMarkers(seenKey).catch(() => {});
    emitAppEvent('action_toast', {
      type: 'success',
      messageRu: availability.isCrownWinner
        ? 'Цель лиги выполнена. Ты лидер, корона готова к выдаче.'
        : 'Цель лиги выполнена. Бонус лиги готов к получению.',
      messageUk: availability.isCrownWinner
        ? 'Ціль ліги виконано. Ти лідер, корона готова до видачі.'
        : 'Ціль ліги виконано. Бонус ліги готовий до отримання.',
      messageEs: availability.isCrownWinner
        ? 'Meta de liga completada. Lideras y la corona está lista.'
        : 'Meta de liga completada. El bono de liga está listo.',
    });
    if (source === 'startup' || pathname !== '/club_screen') {
      setLeagueBonusAvailable(availability);
    }
  }, [pathname]);

  // Колбэк держим в ref, чтобы подписка/таймер НЕ пересоздавались на каждой навигации
  // (showLeagueBonusAvailableOnce зависит от pathname). Иначе каждый переход экрана
  // открывал бы заново 3 Firestore onSnapshot — утечка realtime-слушателей.
  const showLeagueBonusAvailableOnceRef = useRef(showLeagueBonusAvailableOnce);
  useEffect(() => {
    showLeagueBonusAvailableOnceRef.current = showLeagueBonusAvailableOnce;
  }, [showLeagueBonusAvailableOnce]);
  const leagueBonusCheckInFlightRef = useRef(false);
  const lastLeagueBonusCheckAtRef = useRef(0);
  const runLeagueBonusAvailabilityCheck = useCallback((source: 'startup' | 'foreground' | 'route') => {
    if (leagueBonusCheckInFlightRef.current) return;
    const now = Date.now();
    if (source !== 'startup' && now - lastLeagueBonusCheckAtRef.current < LEAGUE_BONUS_CHECK_MIN_MS) return;
    leagueBonusCheckInFlightRef.current = true;
    lastLeagueBonusCheckAtRef.current = now;
    void checkLeagueBonusAvailability()
      .then((availability) => {
        if (availability) void showLeagueBonusAvailableOnceRef.current(availability, source);
      })
      .catch(() => {})
      .finally(() => {
        leagueBonusCheckInFlightRef.current = false;
      });
  }, []);

  useEffect(() => {
    if (!ENABLE_ROOT_LEAGUE_BONUS_WATCH) return;
    if (!ready || showOnboarding || isBanned) return;
    const timer = setTimeout(() => {
      runLeagueBonusAvailabilityCheck('startup');
    }, 1800);
    return () => clearTimeout(timer);
  }, [isBanned, ready, runLeagueBonusAvailabilityCheck, showOnboarding]);

  useEffect(() => {
    if (!ENABLE_ROOT_LEAGUE_BONUS_WATCH) return;
    if (!ready || showOnboarding || isBanned) return;
    let scheduledLeagueBonusCheck: { cancel: () => void } | null = null;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        scheduledLeagueBonusCheck?.cancel();
        scheduledLeagueBonusCheck = scheduleCoalescedForegroundTask('root_league_bonus_availability', () => {
          runLeagueBonusAvailabilityCheck('foreground');
        });
      }
    });
    return () => {
      sub.remove();
      scheduledLeagueBonusCheck?.cancel();
    };
  }, [isBanned, ready, runLeagueBonusAvailabilityCheck, showOnboarding]);

  useEffect(() => {
    if (!ENABLE_ROOT_LEAGUE_BONUS_WATCH) return;
    if (!ready || showOnboarding || isBanned) return;
    if (pathname === '/club_screen' || pathname === '/league_screen') {
      runLeagueBonusAvailabilityCheck('route');
    }
  }, [isBanned, pathname, ready, runLeagueBonusAvailabilityCheck, showOnboarding]);

  useEffect(() => installForegroundUsageMsTracker(), []);

  useEffect(() => {
    if (!ready || showOnboarding) {
      setReleaseNotesOffer(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const offer = await shouldOfferReleaseNotesModal();
          if (!cancelled && offer) setReleaseNotesOffer(true);
        } catch (e) {
          if (__DEV__) console.warn('[_layout]', e);
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, showOnboarding]);

  const closeReleaseNotesModal = useCallback(async () => {
    await dismissReleaseNotesModalPermanently();
    setReleaseNotesOffer(false);
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !awaitingStoreReturnRef.current) return;
      awaitingStoreReturnRef.current = false;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        timeoutId = null;
        InteractionManager.runAfterInteractions(() => {
          setUpdateModalHiddenForStore(false);
        });
      }, 450);
    });
    return () => {
      sub.remove();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    checkBanStatus();
  }, [checkBanStatus]);

  // Фоновый flush синка: перед уходом приложения в background/inactive.
  useEffect(() => {
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let lastBackgroundSyncAt = 0;
    const sub = AppState.addEventListener('change', (state) => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      if (state === 'background' || state === 'inactive') {
        flushTimer = setTimeout(() => {
          flushTimer = null;
          const now = Date.now();
          if (now - lastBackgroundSyncAt < 60_000) return;
          if (AppState.currentState === 'background' || AppState.currentState === 'inactive') {
            lastBackgroundSyncAt = now;
            syncToCloud().catch(() => {});
          }
        }, 1_800);
      }
    });
    return () => {
      sub.remove();
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, []);

  // Лёгкий ранний прогрев состояния таба «Уроки» (один AsyncStorage.multiGet):
  // без него первый тап на «Уроки» показывал нули прогресса, а через долю секунды —
  // реальные значения («прыжок»). Отдельно от тяжёлого ENABLE_STARTUP_CONTENT_PREWARM
  // (тот выключен) — здесь только дешёвое чтение, критичное для первого кадра таба.
  useEffect(() => {
    let cancelled = false;
    let primeTimer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      primeTimer = setTimeout(() => {
        if (cancelled || AppState.currentState !== 'active') return;
        void (async () => {
          try {
            const tab = await import('./lessons_tab_state');
            await tab.loadLessonsTabStateFromStorage(studyTarget);
          } catch (e) {
            if (__DEV__) console.warn('[_layout] lessons prime', e);
          }
        })();
      }, 600);
    });
    return () => {
      cancelled = true;
      task.cancel?.();
      if (primeTimer) clearTimeout(primeTimer);
    };
  }, [studyTarget]);

  useEffect(() => {
    if (!ENABLE_STARTUP_CONTENT_PREWARM) return;
    let cancelled = false;
    let prewarmTimer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      prewarmTimer = setTimeout(() => {
        if (cancelled || AppState.currentState !== 'active') return;
        void loadFlashcards(studyTarget);
        void (async () => {
          try {
            const last = await AsyncStorage.getItem(lastOpenedLessonKey(studyTarget));
            const id = parseInt(last || '1', 10) || 1;
            if (id >= 1) {
              const m = await import('./lesson_menu');
              await m.prefetchLessonMenuCache(id, studyTarget);
            }
            const wordsCache = await import('./lesson_words');
            await wordsCache.primeAllLessonWordsFromStorageOnAppLaunch(studyTarget);
            const tab = await import('./lessons_tab_state');
            await tab.loadLessonsTabStateFromStorage(studyTarget);
          } catch (e) {
            if (__DEV__) console.warn('[_layout]', e);
          }
        })();
      }, 8000);
    });
    return () => {
      cancelled = true;
      task.cancel?.();
      if (prewarmTimer) clearTimeout(prewarmTimer);
    };
  }, [studyTarget]);

  useEffect(() => {
    const unsub = setupNotificationTapHandler(router);
    return unsub;
  }, [router]);

  // Ref всегда указывает на актуальный showAchievement — не зависит от closure в useEffect([], []).
  const showAchievementRef = useRef(showAchievement);
  useEffect(() => { showAchievementRef.current = showAchievement; }, [showAchievement]);
  const achievementFlushRunningRef = useRef(false);
  const achievementFlushQueuedRef = useRef(false);

  // Проверяем pending-ачивки и показываем тосты.
  // Вызывается сразу при старте и по событию 'achievement_unlocked' (DeviceEventEmitter).
  // Polling убран — он блокировал JS-поток каждые 4с во время навигационных переходов.
  const flushPending = useCallback(async () => {
    if (achievementFlushRunningRef.current) {
      achievementFlushQueuedRef.current = true;
      return;
    }
    achievementFlushRunningRef.current = true;
    try {
      do {
        achievementFlushQueuedRef.current = false;
        const pending = await getPendingNotifications();
        if (pending && pending.length > 0) {
          pending.forEach(a => showAchievementRef.current(a));
        }
      } while (achievementFlushQueuedRef.current);
    } finally {
      achievementFlushRunningRef.current = false;
    }
  }, []); // deps пусты — читаем showAchievement через ref, не через closure

  useEffect(() => {
    const lifetime = createDisposableAdoption();
    void import('./referral_bootstrap')
      .then((m) => {
        if (lifetime.isDisposed()) return;
        void Linking.getInitialURL().then((u) => {
          if (!lifetime.isDisposed()) return m.captureReferralFromUrl(u);
          return undefined;
        }).catch((e) => { if (__DEV__) console.warn('[_layout]', e); });
        const subscription = m.subscribeReferralUrl((u) => {
          if (lifetime.isDisposed()) return;
          void m.captureReferralFromUrl(u);
        });
        lifetime.adopt(() => subscription.remove());
      })
      .catch(() => {});
    return () => { lifetime.dispose(); };
  }, []);

  useEffect(() => {
    // The normal reveal timer is armed only after crash-recovery proves that no
    // deleted account identity/data can reappear beneath the startup shell.
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    let accountDeleteRecoveryRetryTimer: ReturnType<typeof setTimeout> | null = null;
    let accountDeleteRecoveryRetryAttempt = 0;
    let authRecoveryBootAppStateSub: { remove: () => void } | null = null;
    let authRecoveryBootAbort: AbortController | null = null;
    let authRecoveryBootstrapInFlight = false;
    let recoveryBootAllowsCloud = false;
    let heavyInitRequestedWhileBlocked = false;

    // Remote Config: ссылку на отписку держим в scope эффекта.
    // effectDisposed нужен, т.к. import() резолвится асинхронно — к этому моменту
    // эффект мог уже размонтироваться, тогда подписку сразу закрываем.
    let effectDisposed = false;
    let remoteConfigUnsub: (() => void) | null = null;

    // Гидратация облака запускается рано (в bootstrap) и используется здесь,
    // чтобы остальной runHeavyInit ждал её завершения, а не дублировал.
    let cloudHydratePromise: Promise<BootCloudRestoreOutcome> | null = null;
    let bootRestoreFailureReason: CloudRestoreFailureReason | null = null;
    let contentDeliveryMigrationPromise: Promise<void> | null = null;
    const restoreCloudForBoot = async () => {
      await ensureAnonUser();
      void resumePendingOnboardingFunnel().catch(() => {});
      void resumePendingAgeConsent().catch(() => {});
      const result = await restoreFromCloudWithRecoveryDetails(coldExamBestPctRestoreOptions);
      bootRestoreFailureReason = result.failureReason;
      // Тихий deferred link: дожимаем отложенную привязку в фоне. Успех →
      // журнал снят и тут же молча подтягиваем облако в этой же сессии.
      // Никакого UI: юзер не должен знать, что что-то догонялось.
      void processPendingAuthLink()
        .then((pendingResult) => (
          pendingResult === 'completed' ? restoreFromCloudDetailed().catch(() => 'failed' as const) : undefined
        ))
        .catch(() => {});
      return result.status;
    };
    const runContentDeliveryMigration = (after?: Promise<unknown> | null): Promise<void> => {
      if (!contentDeliveryMigrationPromise) {
        contentDeliveryMigrationPromise = (async () => {
          if (after) await after.catch(() => {});
          await applyContentDeliveryMigration().catch(() => {});
        })();
      }
      return contentDeliveryMigrationPromise;
    };

    // зачем: внутри тела появились `await` (AsyncStorage.multiSet и Promise.race
    // гидратации), но функция оставалась синхронной — Metro падал на
    // «Unexpected reserved word 'await'», и приложение не собиралось вообще.
    // Все три вызова — fire-and-forget (результат никто не ждёт), поэтому
    // возврат промиса безопасен; на местах вызова он явно гасится через void.
    const runHeavyInit = async () => {
      // Remote Config: apply cached flags ASAP, then keep them fresh with the
      // foreground-only bounded polling contract selected by the owner.
      void import('./remote_config_client')
        .then((m) => {
          void m.loadRemoteConfig().catch(() => {});
          // Сохраняем handle polling-координатора, чтобы его таймер и AppState-
          // подписка закрылись вместе с root effect.
          const sub = m.subscribeRemoteConfig();
          if (effectDisposed) {
            // эффект уже размонтирован к моменту резолва импорта — сразу закрываем
            try { sub.remove(); } catch {}
          } else {
            remoteConfigUnsub = sub.remove;
          }
        })
        .catch(() => {});
      // Идентификация PostHog для воронки (no-op без ключа/пакета, безопасна при любой сборке).
      void (async () => {
        try {
          const uid = await getCanonicalUserId().catch(() => null);
          if (uid) {
            const { identifyPostHog } = await import('./posthog_client');
            identifyPostHog(uid);
          }
        } catch { /* аналитика не должна ломать запуск */ }
      })();
      void startFriendsTabSwrPrime().catch(() => {});
      const startShopWarm = async () => {
        await initFirebaseAppCheckIfAvailable().catch(() => {});
        if (!IS_EXPO_GO) void initRevenueCat();
        void prefetchMarketplacePacks().catch(() => {});
      };
      if (onboardingPathRef.current) {
        InteractionManager.runAfterInteractions(() => {
          setTimeout(startShopWarm, 400);
        });
      } else {
        startShopWarm();
      }
      if (deferLessonPrimeRef.current) {
        deferLessonPrimeRef.current = false;
        InteractionManager.runAfterInteractions(() => {
          void runContentDeliveryMigration(cloudHydratePromise)
            .then(() => primeAllLessonsFromStorageOnAppLaunch(studyTarget))
            .catch(() => {});
        });
      }

      if (!IS_EXPO_GO) {
        import('@react-native-firebase/crashlytics')
          .then(m => m.default().setCrashlyticsCollectionEnabled(true))
          .catch(() => {});
        void initFirebaseAppCheckIfAvailable().catch(() => {});
      }

      await AsyncStorage.multiSet([
        ['device_platform', Platform.OS],
        ['app_version', getInstalledAppVersion(Constants)],
      ]).catch(() => {});

      // Дожидаемся (или дублируем при отсутствии) гидратации из облака,
      // и ТОЛЬКО потом запускаем sync/leaderboard/etc. Иначе syncToCloud мог бы
      // пушить пустые локальные данные раньше чем restoreFromCloud успеет ответить.
      //
      // Хвост C: раньше ошибка restoreFromCloud глоталась в catch, а boot-syncToCloud
      // ниже выполнялся БЕЗУСЛОВНО — на переустановке (Keychain вернул stable_id,
      // AsyncStorage пуст) при упавшем restore пустой локальный прогресс затирал облако.
      // Отслеживаем успех restore; boot-sync пускаем только если restore удался ЛИБО
      // локально реально есть прогресс (как в login-ветках auth_provider).
      const bootCoordinator = createBootCloudRestoreCoordinator({
        restore: restoreCloudForBoot,
        hasLocalAccountData: () => hasMeaningfulLocalAccountData(),
        onHydrated: () => emitAppEvent('cloud_profile_hydrated'),
      });
      const hydrate = cloudHydratePromise ?? bootCoordinator.run();

      void hydrate.then(async (bootRestoreOutcome) => {
        // XP restore is intentionally sequenced after cloud hydration. Running it
        // in an independent mount effect can reinterpret pre-restore local XP.
        await migrateXPFormulaV2();
        await runContentDeliveryMigration().catch(() => {});
        const onboardingDoneAfterHydrate = await AsyncStorage.getItem('onboarding_done').catch(() => null);
        if (onboardingDoneAfterHydrate === '1') {
          void resumePendingGeneratedNickname();
        }
        // Одноразовая починка после релиза, в котором (tabs)/index.tsx
        // перестал уважать persistedUnlocked: подтягиваем lesson{N-1}_best_score
        // до 2.5 для уроков, которые в облаке уже значатся как открытые.
        // См. repairLessonUnlocksAfterRestore() и lesson_unlock_repair_v1 флаг.
        repairLessonUnlocksAfterRestore().catch(() => {});
        await loadShardsFromCloud().catch(() => {});
        // Дотягиваем pending shard-grants после оплаты: вебхук RC мог задержаться
        // дольше окна waitForServerShardGrant в магазине. См. shards_pending_grants.ts.
        void (async () => {
          const {
            resumePendingShardGrants,
            resumePendingShardRecoveryNeeded,
            retryPendingShardGrantDeleteCleanup,
          } = await import('./shards_pending_grants');
          const resumeAccount = captureAccountGeneration();
          await retryPendingShardGrantDeleteCleanup(resumeAccount).catch(() => {});
          await resumePendingShardRecoveryNeeded(resumeAccount).catch(() => {});
          await resumePendingShardGrants(resumeAccount).catch(() => {});
        })();
        // .catch: единственный незащищённый await в цепочке — его сбой молча
        // обрывал весь остаток пост-загрузки (стрик, pending-события, syncToCloud).
        const freshShards = await AsyncStorage.getItem('shards_balance').catch(() => null);
        const parsedShards = Number(freshShards);
        if (Number.isFinite(parsedShards) && parsedShards >= 0) {
          const balance = Math.floor(parsedShards);
          emitAppEvent('shards_balance_updated', {
            balance,
            eligibleAchievementBalance: await getShardAchievementEligibleBalance(balance),
          });
        }
        await migrateWeekPointsIfNeeded().catch(() => {});
        await updateStreakOnActivity().catch(() => {});
        await runSessionChecks(studyTarget).catch(() => {});
        await flushPendingProgressEvents().catch(() => {});
        // Хвост C: не пушим в облако, если restore НЕ удался И локально нет осмысленного
        // прогресса — иначе пустые дефолты затрут реальный облачный аккаунт (переустановка).
        if (bootRestoreOutcome.shouldSync) {
          await syncToCloud().catch(() => {});
        } else if (bootRestoreOutcome.status === 'failed') {
          if (__DEV__) {
            console.warn('[_layout] boot syncToCloud skipped — restore failed and no local progress (protect cloud from blank overwrite)');
          }
          // Переустановка + упавший restore: юзер видит нулевой прогресс без
          // единого объяснения («всё пропало!»). Ошибку безопасной идентификации
          // не называем отсутствием интернета; локальные данные не трогаем.
          const recoveryPresentation = decideStartupCloudRecoveryPresentation({
            failureReason: bootRestoreFailureReason,
            hasLinkedProvider: peekLinkedAuthFromCurrentUser() !== null,
            hasLocalAccountData: bootRestoreOutcome.hasLocalAccountData,
          });
          if (recoveryPresentation === 'provider_reauth_modal') {
            if (!startupAuthRecoveryOfferedRef.current) {
              startupAuthRecoveryOfferedRef.current = true;
              setStartupAuthRecoveryVisible(true);
            }
          } else if (recoveryPresentation === 'cloud_unavailable_toast') {
            emitAppEvent('action_toast', {
              type: 'info',
              messageRu: 'Облако сейчас недоступно. Откройте приложение позже, чтобы повторить восстановление.',
              messageUk: 'Хмара зараз недоступна. Відкрийте застосунок пізніше, щоб повторити відновлення.',
              messageEs: 'La nube no está disponible ahora. Abre la aplicación más tarde para volver a intentar la restauración.',
              messagePtBr: 'A nuvem está indisponível no momento. Abra o aplicativo mais tarde para tentar restaurar novamente.',
              messageVi: 'Đám mây hiện không khả dụng. Hãy mở lại ứng dụng sau để thử khôi phục lần nữa.',
              messageId: 'Cloud sedang tidak tersedia. Buka aplikasi lagi nanti untuk mencoba pemulihan kembali.',
              messageTr: 'Bulut şu anda kullanılamıyor. Geri yüklemeyi yeniden denemek için uygulamayı daha sonra açın.',
              messagePl: 'Chmura jest teraz niedostępna. Otwórz aplikację później, aby ponowić przywracanie.',
            });
          }
        }
        await ensureStableAuthLink().catch(() => false);
        registerInLeagueGroupSilently().catch(() => {});
        Promise.all([
          getVerifiedRealPremiumStatus().catch(() => false),
          getVerifiedVipStatus().catch(() => false),
        ]).then(([isPrem, isVip]) => {
          emitAppEvent(isPrem ? 'premium_activated' : 'premium_deactivated');
          emitAppEvent(isVip ? 'vip_activated' : 'vip_deactivated');
          emitAppEvent('premium_access_changed', {
            active: isPrem || isVip,
            source: isPrem ? 'premium' : isVip ? 'vip' : 'none',
          });
          syncPublicProfileSnapshot({
            reason: 'entitlement_change',
            isPremium: isPrem,
            isVip,
          }).catch(() => {});
        }).catch(() => {});
        void import('./community_packs/communityModerationAlerts')
          .then((m) => m.flushCommunityModerationAlertsFromInbox())
          .catch(() => {});
        void import('./idea_decision_modals')
          .then((m) => m.flushIdeaDecisionModals())
          .catch(() => {});
        // iOS: инвайт-страница кладёт ссылку в буфер при переходе в App Store —
        // читаем ОДИН раз (бережём системный промпт вставки), потом применяем pending-код.
        // ВАЖНО: до 2026-07-04 checkClipboardForReferralOnce нигде не вызывался — весь
        // iOS-путь атрибуции рефералов был мёртвым кодом.
        void import('./referral_clipboard')
          .then((m) => m.checkClipboardForReferralOnce())
          .catch(() => {})
          .then(() => import('./referral_bootstrap'))
          .then((m) => m.tryApplyPendingReferral())
          .catch(() => {});
      }).catch(() => {});

      AsyncStorage.getItem('install_date').then(val => {
        if (!val) AsyncStorage.setItem('install_date', String(Date.now())).catch(() => {});
      }).catch(() => {});

      incrementSessionCount().catch(() => {});
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          preloadDeferredNonPrimaryImages().catch(() => {});
        }, 2500);
      });
      // зачем: арт достижений живёт в Storage (−5.5 МБ из бандла) — прогреваем
      // дисковый кэш заранее, чтобы к моменту награды картинка уже была на
      // устройстве и пользователь никогда не увидел заглушку. Один раз на
      // устройство, малыми пачками, строго после первого кадра.
      InteractionManager.runAfterInteractions(() => {
        prefetchAchievementArtInBackground();
      });
      InteractionManager.runAfterInteractions(() => {
        void import('./flashcards_swipe').catch(() => {});
        import('./flashcards/useCollectionData')
          .then((m) => m.primeFlashcardsCollectionCache())
          .catch(() => {});
      });
      checkForUpdate().then(u => { if (u) setUpdateInfo(u); }).catch(() => {});
      prefetchEasUpdateAfterStartup().catch(() => {});
    };

    const requestHeavyInit = () => {
      if (!recoveryBootAllowsCloud) {
        heavyInitRequestedWhileBlocked = true;
        return;
      }
      void runHeavyInit();
    };

    const bootstrap = async () => {
      if (authRecoveryBootstrapInFlight) return;
      authRecoveryBootstrapInFlight = true;
      try {
      const pendingDeleteRecovered = await resumePendingAccountDeleteLocalExit();
      if (effectDisposed) return;
      if (!pendingDeleteRecovered) {
        // зачем: владелец — «ни один юзер никогда не должен увидеть такого».
        // Раньше здесь поднимался экран «Нужна безопасная проверка» и держал
        // приложение закрытым. Но дочистка проваливается и по совершенно
        // будничным причинам — нет сети (метро, самолёт), Firebase не поднялся
        // за 2.5 с, enqueue не достучался до сервера. Держать человека снаружи
        // из-за отсутствия сети недопустимо: локальные данные удалённого
        // аккаунта уже стёрты, показывать нечего.
        //
        // Поэтому вход НЕ блокируется никогда. Замок остаётся в хранилище и
        // продолжает делать свою настоящую работу — не пускает старый
        // провайдер обратно в удалённый аккаунт (signInWithProvider →
        // handleAccountDeletePendingAuth). Дочистку повторяем в фоне.
        const retryDelayMs = AUTH_RECOVERY_BOOT_RETRY_DELAYS_MS[accountDeleteRecoveryRetryAttempt];
        if (retryDelayMs !== undefined && accountDeleteRecoveryRetryTimer === null) {
          accountDeleteRecoveryRetryAttempt += 1;
          accountDeleteRecoveryRetryTimer = setTimeout(() => {
            accountDeleteRecoveryRetryTimer = null;
            void bootstrap();
          }, retryDelayMs);
        }
        // Падаем дальше в обычный старт — без return и без экрана-стены.
      } else {
        accountDeleteRecoveryRetryAttempt = 0;
      }
      authRecoveryBootAbort = new AbortController();
      const recoveryAbort = authRecoveryBootAbort;
      const recoveryGate = await runAuthRecoveryBootGate({
        signal: authRecoveryBootAbort.signal,
      });
      if (authRecoveryBootAbort === recoveryAbort) authRecoveryBootAbort = null;
      if (effectDisposed) return;
      if (recoveryGate.result !== 'proceed') {
        setReady(true);
        if (
          recoveryGate.result === 'blocked_transient'
          && scheduleAuthRecoveryBootRetry()
        ) return;
        clearAuthRecoveryBootRetry();
        if (!startupAuthRecoveryOfferedRef.current) {
          startupAuthRecoveryOfferedRef.current = true;
          setStartupAuthRecoveryVisible(true);
        }
        return;
      }
      clearAuthRecoveryBootRetry();
      recoveryBootAllowsCloud = true;
      safetyTimer = setTimeout(() => setReady(true), 1200);
      onboardingPathRef.current = false;
      deferLessonPrimeRef.current = false;
      const forceOnboardingForQA =
        typeof __DEV__ !== 'undefined' &&
        __DEV__ &&
        process.env.EXPO_PUBLIC_FORCE_ONBOARDING_QA === '1';

      // Start cloud hydration early, but do not hold the first app frame on network/app-check.
      if (!IS_EXPO_GO && !forceOnboardingForQA) {
        const appCheckWarmup = Promise.race([
          initFirebaseAppCheckIfAvailable(),
          new Promise<void>((resolve) => setTimeout(resolve, 1200)),
        ]).catch(() => {});
        const bootCoordinator = createBootCloudRestoreCoordinator({
          restore: async () => {
            await appCheckWarmup;
            return restoreCloudForBoot();
          },
          hasLocalAccountData: () => hasMeaningfulLocalAccountData(),
          onHydrated: () => emitAppEvent('cloud_profile_hydrated'),
        });
        cloudHydratePromise = bootCoordinator.run();
        void runContentDeliveryMigration(cloudHydratePromise);
      }
      if (heavyInitRequestedWhileBlocked) {
        heavyInitRequestedWhileBlocked = false;
        void runHeavyInit();
      }

      // Tiny local hydration budget: keep first paint fast even if storage is slow.
      const startupLocalHydration = Promise.all([
        primeAppSnapshotFromStorage(studyTarget).catch(() => {}),
        primeSurveyOfferCacheFromStorage().catch(() => {}),
        // зачем: та же беда была у «Моей практики» — её кэш жил в памяти всего 2 минуты,
        // поэтому раздел открывался с нулями и после холодного старта, и просто через
        // 3 минуты. Поднимаем дисковый снапшот здесь, до входа в раздел.
        primeTrainerPracticeSnapshotFromStorage().catch(() => {}),
        // зачем: общий снапшот остальных экранов (стрик, рефералы, топ помощников,
        // аналитика, план, разбор, подписка, видео, сезон). Владелец потребовал, чтобы
        // НИ ОДИН экран не показывал скелетон. Это ОДНО чтение диска на все экраны
        // сразу — в той же параллельной пачке, поэтому запуск не удлиняется.
        primeScreenSnapshotsFromStorage().catch(() => {}),
        hydrateYoutubeChannelPreference().catch(() => {}),
        // зачем: кэш статистики УЖЕ лежал на диске, но поднимался только внутри
        // streak_stats.loadAll() — то есть после первого кадра, поэтому экран стрика
        // успевал показать скелетон на весь экран. Поднимаем здесь: к моменту тапа
        // данные в памяти, statsReady=true с первого кадра. Лишних чтений нет —
        // экран всё равно звал эту же функцию, просто позже.
        hydrateStatsCacheFromStorage().catch(() => {}),
        primeRemoteConfigCacheFromStorage().catch(() => {}),
        hydrateUserSettingsFromStorage().catch(() => {}),
        hydrateHapticsTapFromStorage().catch(() => {}),
        hydrateNotifSettingsFromStorage().catch(() => {}),
        // зачем: раздел «Уведомления» — гейты категорий (isNotifCategoryEnabled)
        // сами лениво гидрируют при первом вызове, но их вызывают ~10 разных
        // schedule*-функций россыпью. Греем один раз здесь вместе с остальным
        // bootstrap-бюджетом — экономит N параллельных AsyncStorage.getItem
        // на первом запуске приложения (тот же паттерн, что у notifSettings строкой выше).
        hydrateNotifPrefsFromStorage().catch(() => {}),
        // Согласие на аналитику — гидрируем ДО первого события, чтобы гейт
        // (firebase.ts logEvent / posthog capture) работал с первого кадра.
        hydrateAnalyticsConsentFromStorage().catch(() => {}),
        // Согласие на AI-разбор ошибок — гидрируем ДО первого урока, чтобы
        // use_mistake_explain.ts не мигал с idle → gate на первом кадре.
        hydrateAiExplainConsentFromStorage().catch(() => {}),
        // Согласие на AI-диалоги — гидрируем ДО первого входа в диалог.
        hydrateAiDialogConsentFromStorage().catch(() => {}),
        // Возрастная группа — для безопасного режима (фичи-гейты) с первого кадра.
        hydrateAgeGateFromStorage().catch(() => {}),
      ]);
      await Promise.race([
        startupLocalHydration,
        new Promise<void>((resolve) => setTimeout(resolve, 350)),
      ]).catch(() => {});
      void startupLocalHydration.catch(() => {});
      // Сразу читаем осколки в фоне — к моменту «Главной» peekLastKnownShardsBalance уже с кэшем.
      void getStableId()
        .then(() => getShardsBalance())
        .then(balance => getShardAchievementEligibleBalance(balance))
        .then(balance => checkAchievements({ type: 'shards', balance }).catch(() => {}))
        .catch(() => {});

      let shouldPrimeLessonsAfterReveal = false;
      try {
        const startupIdentityKeys = forceOnboardingForQA
          ? ['user_prev_xp', 'user_total_xp']
          : ['user_prev_xp', 'user_total_xp', 'onboarding_done'];
        const startupIdentityPairs = await AsyncStorage.multiGet(startupIdentityKeys);
        const startupIdentity = new Map(startupIdentityPairs);
        const prevXPRaw = startupIdentity.get('user_prev_xp') ?? null;
        if (!prevXPRaw) {
          const totalXPRaw = startupIdentity.get('user_total_xp') ?? null;
          if (totalXPRaw) {
            await AsyncStorage.setItem('user_prev_xp', totalXPRaw);
          }
        }

        const val = forceOnboardingForQA ? null : (startupIdentity.get('onboarding_done') ?? null);

        let handledByReferrer = false;
        if (!val && Platform.OS === 'android' && !IS_EXPO_GO) {
          handledByReferrer = await new Promise<boolean>((resolve) => {
            const t = setTimeout(() => resolve(false), 2000);
            try {
              PlayInstallReferrer.getInstallReferrerInfo((details: any, error: any) => {
                clearTimeout(t);
                if (!error && details?.installReferrer) {
                  const ir = String(details.installReferrer);
                  const refM = ir.match(/(?:^|[&])ref=([A-Z0-9]{4,12})/i);
                  if (refM?.[1]) {
                    void import('./referral_bootstrap')
                      .then((m) => m.captureReferralCodeIfNew(refM[1].trim().toUpperCase(), 'play_install'))
                      .catch(() => {});
                  }
                }
                resolve(false);
              });
            } catch {
              clearTimeout(t);
              resolve(false);
            }
          });
        }

        const willShowOnboarding = forceOnboardingForQA || (!handledByReferrer && !val);
        onboardingPathRef.current = willShowOnboarding;
	        if (willShowOnboarding) {
	          deferLessonPrimeRef.current = true;
	        } else {
            shouldPrimeLessonsAfterReveal = true;
	        }

        if (!handledByReferrer) {
          setShow(willShowOnboarding);
        }
      } catch (e) {
        if (__DEV__) console.warn('[_layout]', e);
      }

      const iconFontsReady = preloadVectorIconFonts();
      void iconFontsReady.catch(() => {});
      void preloadPrimaryTabImages().catch(() => {});

      if (safetyTimer) clearTimeout(safetyTimer);
      setReady(true);
      setTimeout(flushPending, 280);
      if (shouldPrimeLessonsAfterReveal) {
        InteractionManager.runAfterInteractions(() => {
          void runContentDeliveryMigration(cloudHydratePromise)
            .then(() => primeAllLessonsFromStorageOnAppLaunch(studyTarget))
            .catch(() => {});
        });
      }
      } finally {
        authRecoveryBootstrapInFlight = false;
      }
    };

    const authRecoveryBootRetryScheduler = createAuthRecoveryBootRetryScheduler({
      isInFlight: () => authRecoveryBootstrapInFlight,
      run: () => { void bootstrap(); },
      setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
      clearTimer: timer => clearTimeout(timer),
    });

    const clearAuthRecoveryBootRetry = () => {
      authRecoveryBootRetryScheduler.cancel();
      authRecoveryBootAppStateSub?.remove();
      authRecoveryBootAppStateSub = null;
    };

    const scheduleAuthRecoveryBootRetry = (): boolean => {
      if (!authRecoveryBootRetryScheduler.schedule()) return false;
      if (!authRecoveryBootAppStateSub) {
        authRecoveryBootAppStateSub = AppState.addEventListener('change', (state) => {
          if (state === 'active') authRecoveryBootRetryScheduler.triggerActive();
        });
      }
      return true;
    };

    runHeavyInitRef.current = requestHeavyInit;
    bootstrap();

    // Event-driven flush: слушаем событие от achievements.ts вместо polling каждые 4с.
    // Это убирает блокировку JS-потока во время навигационных переходов на слабых устройствах.
    const sub = onAppEvent('achievement_unlocked', () => {
      setTimeout(flushPending, 200);
    });
    const subShards = onAppEvent('shards_balance_updated', (payload) => {
      const balance = typeof payload?.balance === 'number' ? payload.balance : null;
      if (balance !== null) {
        const eligible = typeof payload?.eligibleAchievementBalance === 'number'
          ? payload.eligibleAchievementBalance
          : null;
        const run = eligible === null ? getShardAchievementEligibleBalance(balance) : Promise.resolve(eligible);
        run.then((achievementBalance) => checkAchievements({ type: 'shards', balance: achievementBalance })).catch(() => {});
      }
    });
    const subDelete = onAppEvent('account_deleted', () => {
      // После первого онбординга refs = true; без сброса повторное завершение
      // (Apple/Google/«Позже» на шаге auth) вызывает handleOnboardingDone → ранний return → экран не уходит.
      onboardingDoneHandledRef.current = false;
      // Удаление аккаунта = ЧИСТЫЙ старт: AsyncStorage.clear() снёс onboarding_step/done/nickname,
      // значит и React-флаги онбординга надо вернуть к исходному. Иначе залипший
      // onboardingStartAtName=true (от прошлого пейвол-события nickname_ready) монтирует
      // новый онбординг сразу на шаге «имя» — минуя план/пейвол/порядок шагов.
      setOnboardingStartAtName(false);
      setOnboardingPaywallActive(false);
      setShow(true);
    });
    return () => {
      effectDisposed = true;
      authRecoveryBootAbort?.abort();
      authRecoveryBootAbort = null;
      clearAuthRecoveryBootRetry();
      if (safetyTimer) clearTimeout(safetyTimer);
      if (accountDeleteRecoveryRetryTimer) clearTimeout(accountDeleteRecoveryRetryTimer);
      runHeavyInitRef.current = null;
      sub.remove();
      subShards.remove();
      subDelete.remove();
      remoteConfigUnsub?.();
    };
  }, [coldExamBestPctRestoreOptions, flushPending]);

  useEffect(() => {
    const sub = onAppEvent('notif_permission_nudge', async ({ missedDays }) => {
      if (missedDays <= 0) return;
      const [status, enabled, lastShownRaw] = await Promise.all([
        isNotificationPermissionGranted(),
        AsyncStorage.getItem('notifications_enabled'),
        AsyncStorage.getItem('notif_permission_nudge_last_day'),
      ]);
      if (status || enabled === 'true') return;
      const todayKey = new Date().toISOString().split('T')[0];
      if (lastShownRaw === todayKey) return;
      setNotifNudgeMissedDays(missedDays);
      setNotifNudgeVisible(true);
      await AsyncStorage.setItem('notif_permission_nudge_last_day', todayKey).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  // Вызывается из онбординга при выборе языка — синхронизирует контекст
  const handleLangSelect = useCallback(async (lng: Lang) => {
    await setLang(lng);
  }, [setLang]);

  const hasVerifiedRealPremiumOrVip = useCallback(async () => {
    if (isPremium || isVip) return true;
    const [realPremium, vip] = await Promise.all([
      getVerifiedRealPremiumStatus().catch(() => false),
      getVerifiedVipStatus().catch(() => false),
    ]);
    return realPremium || vip;
  }, [isPremium, isVip]);

  const closeIntroFullAccessModal = useCallback(async (action: 'primary' | 'secondary') => {
    const variant = introFullAccessModal;
    if (!variant) return;
    if (variant === 'welcome') {
      await markIntroFullAccessWelcomeSeen().catch(() => {});
      setIntroFullAccessModal(null);
      return;
    }

    await markIntroFullAccessEndedSeen().catch(() => {});
    setIntroFullAccessModal(null);
    if (action === 'primary') {
      // Воронка: пользователь решил продолжить в полном доступе — ведём на пейвол.
      void import('./analytics').then(({ trackEvent }) => trackEvent('intro_ended_cta', {})).catch(() => {});
      void import('./firebase').then(({ logIntroEndedCta }) => logIntroEndedCta()).catch(() => {});
      // Прокидываем личные данные, чтобы пейвол показал персональную строку
      // («уже твоё: серия N · …»). Без них пейвол даёт корректный gain-фоллбэк.
      const streakCount = parseInt((await AsyncStorage.getItem('streak_count').catch(() => null)) || '0', 10) || 0;
      // replace на пейвол = всегда mark, иначе источник остаётся в стеке «назад» → петля.
      markNextNavigationAsReplace();
      router.replace({
        pathname: '/premium_modal',
        params: { context: 'intro_ended', streak: String(streakCount) },
      } as any);
    } else {
      // Воронка: закрыл модалку конца интро без перехода на пейвол.
      void import('./analytics').then(({ trackEvent }) => trackEvent('intro_ended_dismiss', {})).catch(() => {});
      void import('./firebase').then(({ logIntroEndedDismiss }) => logIntroEndedDismiss()).catch(() => {});
    }
  }, [introFullAccessModal, router]);

  const checkIntroFullAccessEndedModal = useCallback(async () => {
    if (!ready || effectiveShowOnboarding || isBanned || !firstContentReady) return;
    if (isTournamentInterruptionProtectedPath(pathnameRef.current)) return;
    const state = await getIntroFullAccessState().catch(() => null);
    if (!state?.expiredUnseen) return;
    if (await hasVerifiedRealPremiumOrVip()) {
      await markIntroFullAccessEndedSeen().catch(() => {});
      return;
    }
    if (state?.expiredUnseen) {
      if (isTournamentInterruptionProtectedPath(pathnameRef.current)) return;
      setIntroFullAccessModal('ended');
      // Воронка: показана модалка «72 часа закончились» — главный момент конверсии.
      void import('./analytics').then(({ trackEvent }) => trackEvent('intro_ended_shown', {})).catch(() => {});
      void import('./firebase').then(({ logIntroEndedShown }) => logIntroEndedShown()).catch(() => {});
    }
  }, [effectiveShowOnboarding, firstContentReady, hasVerifiedRealPremiumOrVip, isBanned, ready]);

  const lastForegroundIntroCheckAtRef = useRef(0);
  useEffect(() => {
    void checkIntroFullAccessEndedModal();
    const introSub = onAppEvent('intro_full_access_changed', () => {
      void checkIntroFullAccessEndedModal();
    });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const now = Date.now();
      if (now - lastForegroundIntroCheckAtRef.current < FOREGROUND_MODAL_CHECK_MIN_MS) return;
      lastForegroundIntroCheckAtRef.current = now;
      void checkIntroFullAccessEndedModal();
    });
    return () => {
      introSub.remove();
      appSub.remove();
    };
  }, [checkIntroFullAccessEndedModal]);

  // План #7: winback-оффер вернувшимся после 7+ дней неактивности.
  // ВАЖНО: сначала ОЦЕНИВАЕМ по сохранённой активности, ПОТОМ записываем свежую —
  // иначе разрыв всегда ~0. Не показываем одновременно с intro_ended (не два пейвола разом).
  const checkWinbackOffer = useCallback(async () => {
    if (!ready || effectiveShowOnboarding || isBanned || !firstContentReady) return;
    if (isTournamentInterruptionProtectedPath(pathnameRef.current)) return;
    try {
      const { shouldShowWinback, markWinbackShown, recordLastActive } = await import('./winback_offer');
      const isPremium = await hasVerifiedRealPremiumOrVip();
      const nowMs = Date.now();
      // intro ещё не закрыт → его модалка важнее, winback пропускаем (активность всё равно фиксируем)
      const introState = await getIntroFullAccessState().catch(() => null);
      const introPending = introState?.expiredUnseen === true;

      const show = !introPending && (await shouldShowWinback({ isPremium, nowMs }));
      if (show) {
        if (isTournamentInterruptionProtectedPath(pathnameRef.current)) return;
        // Сначала навигация, потом отметка — если push упадёт, не «сжигаем» окно winback.
        globalRouter.push({ pathname: '/premium_modal', params: { context: 'streak', source: 'winback' } } as any);
        await markWinbackShown(nowMs);
        await import('./analytics').then(({ trackEvent }) => trackEvent('winback_shown', {})).catch(() => {});
        void import('./firebase').then(({ logWinbackShown }) => logWinbackShown()).catch(() => {});
      }
      // фиксируем активность ПОСЛЕ оценки
      await recordLastActive(nowMs);
    } catch { /* no-op */ }
  }, [effectiveShowOnboarding, firstContentReady, hasVerifiedRealPremiumOrVip, isBanned, ready]);

  const lastForegroundWinbackCheckAtRef = useRef(0);
  useEffect(() => {
    void checkWinbackOffer();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const now = Date.now();
      if (now - lastForegroundWinbackCheckAtRef.current < FOREGROUND_MODAL_CHECK_MIN_MS) return;
      lastForegroundWinbackCheckAtRef.current = now;
      void checkWinbackOffer();
    });
    return () => { appSub.remove(); };
  }, [checkWinbackOffer]);

  const handleOnboardingDone = useCallback(async () => {
    // Гард от повторного вызова: handleFinishOnboarding в Onboarding async, и при двойном тапе
    // «Позже»/«Войти» onDone() мог вызваться дважды → два setTimeout → модалка повторно открывалась.
    if (onboardingDoneHandledRef.current) return;
    onboardingDoneHandledRef.current = true;
    // Онбординг завершён — сбрасываем разовый флаг «стартовать с имени», чтобы
    // следующий (QA-reset / новый пользователь) показ шёл штатным резолвом A/B.
    setOnboardingStartAtName(false);
    const hasPaidOrVipAfterOnboarding = await hasVerifiedRealPremiumOrVip();
    if (!hasPaidOrVipAfterOnboarding) {
      await startIntroFullAccessAfterOnboarding(Date.now(), lang);
      emitAppEvent('intro_full_access_changed');
    }
    await AsyncStorage.setItem('xp_migration_v2', '1');
    armPostOnboardingGoldBridge();
    if (firstContentReadyTimerRef.current) {
      clearTimeout(firstContentReadyTimerRef.current);
      firstContentReadyTimerRef.current = null;
    }
    setFirstContentReady(true);
    router.replace('/(tabs)/home' as any);
    setTimeout(() => router.replace('/(tabs)/home' as any), 120);
    // зачем: тёплое приветствие строго один раз за жизнь аккаунта — не
    // используем отдельный гард, чтобы приветствие не повторялось в той же установке.
    void (async () => {
      const alreadyWelcomed = await AsyncStorage.getItem('pm_app_welcome_played_v1').catch(() => null);
      if (alreadyWelcomed === '1') return;
      await AsyncStorage.setItem('pm_app_welcome_played_v1', '1').catch(() => {});
      soundDirector.request('pm.app.welcome', { scope: 'onboarding-welcome' });
    })();
    // Снимаем оверлей онбординга ПОСЛЕ того, как replace на /home закоммитится. Иначе,
    // если под оверлеем активен маршрут пейвола, при мгновенном setShow(false) он мелькает один
    // кадр до перехода на главную. Небольшая отсрочка убирает мелькание (оверлей держит экран,
    // пока навигация не встала на /home).
    setTimeout(() => {
      setShow(false);
      // Home уже смонтирован под полноэкранным онбордингом, но до этого события
      // намеренно не запускает тяжёлые storage/Firestore-загрузки и анимации.
      // CleanOnboarding дождался записи onboarding_done до onDone; будим Home
      // только после снятия корневого оверлея, когда экран действительно видим.
      emitAppEvent('onboarding_completed');
    }, 60);
    // Не показываем тутор энергии на «Главной» одновременно с этим листом (ждём «Позже» или возврат с урока)
    setDeferEnergyOnboardingForPostOnboardingFirstLesson(true);
    // UX-003: Запрашиваем пуш-разрешение в конце онбординга (не раньше — иначе система не даст
    // повторного шанса). Делаем до paywall/welcome, но с небольшой задержкой, чтобы анимация
    // закрытия онбординга завершилась до появления системного диалога.
    void (async () => {
      const already = await isNotificationPermissionGranted().catch(() => false);
      if (!already) {
        await new Promise<void>((r) => setTimeout(r, 600));
        await requestNotificationPermissionWithFallback().catch(() => {});
      }
    })();
    const showIntroGift = !hasPaidOrVipAfterOnboarding && await shouldShowIntroFullAccessWelcome().catch(() => false);
    if (showIntroGift) {
      // зачем: было 320ms — pm.app.welcome (2.3s, играет выше) не успевал
      // отзвучать до открытия модалки, получалось два «приветствия» подряд.
      setTimeout(() => setIntroFullAccessModal('welcome'), 1800);
    }
  }, [armPostOnboardingGoldBridge, hasVerifiedRealPremiumOrVip, router]);

  const handleOnboardingIntroFullAccessStart = useCallback(async () => {
    await startIntroFullAccessAfterOnboarding(Date.now(), lang);
    emitAppEvent('intro_full_access_changed');
    return true;
  }, [lang]);

  // DEV-центр: «Пройти онбординг» — боевой оверлей с первого экрана. Ключи
  // прохождения сброшены в DevHubSheet до эмита; профиль и прогресс не трогаются.
  // зачем: снимаем гард onboardingDoneHandledRef, иначе повторный запуск в той
  // же сессии не вызовет handleOnboardingDone и оверлей не закроется по «Готово».
  useEffect(() => {
    const sub = onAppEvent('dev_onboarding_restart', () => {
      onboardingDoneHandledRef.current = false;
      setOnboardingPaywallActive(false);
      setOnboardingStartAtName(false);
      setShow(true);
    });
    return () => sub.remove();
  }, []);

  // После закрытия онбординга и монтирования Stack — переходим на нужный экран
  useEffect(() => {
    const sub = onAppEvent('onboarding_paywall_completed', () => {
      onboardingDoneHandledRef.current = false;
      // Онбординг-пейвол отыграл (continue-free / покупка) → возвращаемся в оверлей
      // онбординга на шаг «Имя». Снимаем флаг, чтобы будущие открытия пейвола
      // (winback и т.п.) снова были модалкой с выездом снизу.
      setOnboardingPaywallActive(false);
      setDeferEnergyOnboardingForPostOnboardingFirstLesson(false);
      // СИНХРОННО поднимаем непрозрачный оверлей в ближайшем кадре — пейвол под
      // ним мгновенно перекрыт, кадра с «Главной» (мелькание) нет. Раньше тут шли
      // три await AsyncStorage ДО setShow(true): окно, в которое был виден
      // нижележащий маршрут. Ключи онбординга уже выставлены в paywall_purchase
      // перед эмитом события, так что эти записи — лишь страховка fire-and-forget.
      // startAtName=true → онбординг монтируется прямо на 'name' без async-гейта
      // (без пустого «resolving»-экрана и без ожидания Keychain в getStableId).
      setOnboardingStartAtName(true);
      setShow(true);
      void (async () => {
        try {
          await AsyncStorage.setItem('onboarding_step', 'name');
          await AsyncStorage.removeItem('onboarding_done');
        } catch { /* best-effort: paywall_purchase уже записал эти ключи */ }
      })();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (ready && rootNavigationReady && !isBanned && !showOnboarding && pendingRoute) {
      const t = setTimeout(() => {
        router.replace(pendingRoute as any);
        setPendingRoute(null);
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isBanned, pendingRoute, ready, rootNavigationReady, router, showOnboarding]);

  useEffect(() => {
    if (!postOnboardingGoldBridgeArmed || !ready || effectiveShowOnboarding || isBanned || !firstContentReady) return;
    setPostOnboardingGoldBridgeArmed(false);
    beginPostOnboardingGoldBridgeFade();
  }, [
    beginPostOnboardingGoldBridgeFade,
    effectiveShowOnboarding,
    firstContentReady,
    isBanned,
    postOnboardingGoldBridgeArmed,
    ready,
  ]);


  // ── Очередь модалок: ровно одна показывается за раз ─────────────────────
  // Приоритет: update > authRecovery > releaseNotes > broadcast > notifNudge > introFullAccess > levelUp.
  // ВАЖНО: эти хуки должны вызываться до любых условных return ниже.
  // introFullAccess — нативный <Modal statusBarTranslucent>: его обязательно
  // гейтить через арбитр, иначе на холодном старте он может наложиться на другую такую же
  // модалку (update/broadcast/levelUp) → мерцание/зависание System UI (ANR) на Android.
  const updateModalVisible = useOverlayVisible('update', !!updateInfo && !updateModalHiddenForStore);
  const releaseNotesModalVisible = useOverlayVisible('releaseNotes', releaseNotesOffer);
  const broadcastModalVisible = useOverlayVisible('broadcast', !!globalBroadcastModal);
  const personalAdminMessageVisible = useOverlayVisible('personalAdminMessage', !!personalAdminMessage);
  const leagueBonusAvailableModalVisible = useOverlayVisible('leagueBonusAvailable', !!leagueBonusAvailable);
  const notifNudgeModalVisible = useOverlayVisible('notifNudge', notifNudgeVisible);
  const startupAuthRecoveryModalVisible = useOverlayVisible('authRecovery', startupAuthRecoveryVisible);
  // A queued offer may have won the overlay slot immediately before the user
  // entered a tournament. Active tournament screens are an uninterrupted flow:
  // do not let that stale request cover the lobby or a live question.
  const introFullAccessModalVisible = useOverlayVisible(
    'introFullAccess',
    !tournamentInterruptionProtected && introFullAccessModal !== null,
  );
  const postOnboardingScreenTintOpacity = postOnboardingGoldBridgeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const postOnboardingPanelTintOpacity = postOnboardingGoldBridgeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const postOnboardingCtaTintOpacity = postOnboardingGoldBridgeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Expo Router requires the root layout to mount a navigator on the first
  // render. Startup, onboarding, and blocked-account states cover it as overlays.
  const appOverlaysEnabled = ready && !effectiveShowOnboarding && !isBanned
    && !tournamentInterruptionProtected;
  const startupSplashVisible = !fontsReady || !ready
    || (!effectiveShowOnboarding && !isBanned && !firstContentReady);
  // «Чёрный кадр» между экранами: при 'none' native-stack мгновенно меняет контейнер до того,
  // как JS дорендерил новый экран, и в зазоре виден голый contentStyle (bgPrimary, почти
  // чёрный) — на тёмных экранах это читается как вспышка темноты.
  //
  // зачем: владелец жаловался, что при входе в урок «мелькает пустой/тёмный экран». На
  // Android fade был выключен гейтом Platform.OS === 'ios' из-за истории крашей Fabric,
  // но краши были на CARD-PUSH slide (ENABLE_SCREEN_TRANSITIONS), а не на любых анимациях:
  // slide_from_bottom годами едет на ОБЕИХ платформах у пейволов
  // (components/paywall/paywallShared.tsx) и шторок разделов (app/section_sheet_navigation.ts).
  // fade — самый безобидный класс (кроссфейд, без пересчёта геометрии), поэтому включаем
  // его и на Android: зазор маскируется, «мелькание» уходит.
  // Kill-switch прежний: EXPO_PUBLIC_SCREEN_FADE=0.
  const screenFadeEnabled = SCREEN_FADE_TRANSITIONS && !ENABLE_SCREEN_TRANSITIONS;
  const defaultScreenAnimationOptions = ENABLE_SCREEN_TRANSITIONS
    ? ({ animation: 'slide_from_right', animationDuration: 220 } as const)
    : screenFadeEnabled
      ? ({ animation: 'fade', animationDuration: 140 } as const)
      : ({ animation: 'none', animationDuration: 0 } as const);
  const pushScreenAnimationOptions = defaultScreenAnimationOptions;
  const bottomModalAnimationOptions = ENABLE_SCREEN_TRANSITIONS
    ? ({ animation: 'slide_from_bottom' } as const)
    : screenFadeEnabled
      ? ({ animation: 'fade', animationDuration: 140 } as const)
      : ({ animation: 'none', animationDuration: 0 } as const);

  // Перф: дерево из ~80 <Stack.Screen> зависит ТОЛЬКО от темы + onboardingPaywallActive,
  // а НЕ от pathname/params. Без useMemo каждая смена вкладки (usePathname меняется)
  // пересоздавала все 80 JSX-элементов экранов → тяжёлый ре-рендер корня → фриз тапа 3-10с.
  // Мемоизация разрывает эту связь: смена вкладки больше не трогает дерево стека.
  const stackTree = useMemo(() => (
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,
        // Фон стека — ВСЕГДА фон темы (константа), НЕ производная от appShellReady:
        // гонка 4 асинхронных флагов перекрашивала весь стек в почти-чёрный сплэш-цвет
        // = «чёрный кадр» между переходами. Стартовый сплэш закрывает экран отдельным
        // полноэкранным оверлеем (StartupSplashHold), фону стека он не нужен.
        contentStyle: { backgroundColor: tTheme.bgPrimary },
        // Без native-stack slide-transitions: Android/Fabric падал на открытии вложенных
        // экранов и Back. ENABLE_SCREEN_TRANSITIONS включает slide только осознанно;
        // iOS дополнительно получает короткий fade (маскирует зазор рендера) — см. config.ts.
        ...defaultScreenAnimationOptions,
        // Заморозка ушедших экранов (react-freeze): фоновые экраны стека перестают
        // рендериться → не копят работу и не греют телефон. Realtime-исключения
        // (арена live, экзамен) размораживаются точечно через freezeOnBlur:false ниже.
        // Guardrail: tests/owner_direction_runtime_contract.test.ts (allowlist исключений).
        freezeOnBlur: true,
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
        headerBackButtonMenuEnabled: false,
      }}
    >
      {/* Корневые экраны не «выезжают» даже при включённых переходах — иначе
          возврат на табы/сплеш выглядит как съезжающий слой. Всегда мгновенно. */}
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      <Stack.Screen name="lesson1" />
      {/* зачем: список всех уроков — push-экран вместо убранного таба «Уроки» (2026-08-02). */}
      <Stack.Screen name="lessons_list" />
      <Stack.Screen name="lesson_menu" />
      <Stack.Screen name="lesson_words" />
      <Stack.Screen name="lesson_irregular_verbs" />
      <Stack.Screen name="lesson_complete" />


      <Stack.Screen name="hint" />
      <Stack.Screen name="lesson_help" />
      <Stack.Screen name="lesson_theory_v2" options={{ presentation: 'card', headerShown: false, ...pushScreenAnimationOptions }} />
      <Stack.Screen name="preposition_drill" />
      {/* «Шторки разделов» (стандарт владельца, ориентир — Bevel): разделы
          настроек/инфо-экраны выезжают снизу как модальная страница и так же
          закрываются. Опции — app/section_sheet_navigation.ts (под флагом
          SECTION_SHEET_TRANSITIONS из config.ts), шапка внутри экранов —
          components/SectionSheetHeader.tsx. */}
      <Stack.Screen name="settings_edu" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="settings_notifications" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="settings_themes" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="settings_language" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="privacy_settings" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="ideas_submit" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="language_welcome" />
      <Stack.Screen name="league_screen" />
      <Stack.Screen name="club_screen" />
      <Stack.Screen name="top_helpers" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Protected guard={ENABLE_TOURNAMENTS}>
        <Stack.Screen name="tournament_lobby" />
        <Stack.Screen name="tournament_round" />
        <Stack.Screen name="tournament_table" />
        <Stack.Screen name="tournament_results" />
        <Stack.Screen name="tournament_review" />
        <Stack.Screen name="tournament_season" />
        <Stack.Screen name="tournament_tickets" options={SECTION_SHEET_STACK_OPTIONS} />
      </Stack.Protected>
      <Stack.Protected guard={ENABLE_ARENA}>
        <Stack.Screen name="arena" />
        <Stack.Screen name="arena_matchmaking" />
        {/* Live server deadlines must continue while the native route is
            covered; the screen itself stops listeners/timers on background. */}
        <Stack.Screen name="arena_match" options={{ freezeOnBlur: false, gestureEnabled: false }} />
        <Stack.Screen name="arena_results" />
        <Stack.Screen name="arena_friend_duel" />
        <Stack.Screen name="arena_invite" />
        <Stack.Screen name="arena_ranks" />
        <Stack.Screen name="arena_season_pass" />
        {/* Expansion details stay callable-driven and do not add collection
            listeners to the Hub. Today owns a server deadline, so native blur
            must not freeze its reconciliation lifecycle. */}
        <Stack.Screen name="arena_today" options={{ freezeOnBlur: false, gestureEnabled: false }} />
        <Stack.Screen name="arena_match_lab" />
        <Stack.Screen name="arena_ghost_duel" />
        <Stack.Screen name="arena_rivalries" />
        <Stack.Screen name="arena_mastery_map" />
        <Stack.Screen name="arena_partner" />
        <Stack.Screen name="arena_star_wallet" />
      </Stack.Protected>
      <Stack.Screen name="streak_stats" />
      <Stack.Screen name="diagnostic_test" />
      <Stack.Screen name="exam" options={{ freezeOnBlur: false }} />
      <Stack.Screen name="survey_screen" />
      {/* Диспетчер после готовности root-навигации делает replace на нужный пейвол.
          Сам он без анимации и с paywall-подложкой, чтобы native-stack не показывал чёрный кадр. */}
      <Stack.Screen name="premium_modal" options={SECTION_SHEET_STACK_OPTIONS} />
      {/* Эксперимент пейволов: варианты A/B/C + D/E/F/G (диспетчер — premium_modal). По умолчанию
          выезжают снизу как модал. НА ОНБОРДИНГЕ (onboardingPaywallActive) — открываются как
          обычный экран онбординга (card, без анимации/выезда снизу); presentation задаётся
          на статическом <Stack.Screen>, т.к. mount-presentation нативный стек читает при push. */}
      <Stack.Screen name="paywall_a" options={paywallScreenStackOptions(onboardingPaywallActive)} />
      <Stack.Screen name="paywall_b" options={paywallScreenStackOptions(onboardingPaywallActive)} />
      <Stack.Screen name="paywall_c" options={paywallScreenStackOptions(onboardingPaywallActive)} />
      <Stack.Screen name="paywall_d" options={paywallScreenStackOptions(onboardingPaywallActive)} />
      <Stack.Screen name="paywall_e" options={paywallScreenStackOptions(onboardingPaywallActive)} />
      <Stack.Screen name="paywall_f" options={paywallScreenStackOptions(onboardingPaywallActive)} />
      <Stack.Screen name="paywall_g" options={paywallScreenStackOptions(onboardingPaywallActive)} />
      <Stack.Screen name="manage_subscription" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="account_details" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="referrals" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="promo_code_entry" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="avatar_select" />
      <Stack.Screen name="flashcards" />
      {/* Cards 2.1 §5.3: каталог наборов сообщества — правая позиция таббара раздела */}
      <Stack.Screen name="flashcards_packs" />
      {/* Cards 2.1 §5.3: «Мои наборы» — второй раздел всплывашки «Наборы» */}
      <Stack.Screen name="flashcards_my_packs" />
      <Stack.Screen name="flashcards_audio" />
      <Stack.Screen name="flashcards_collection" />
      <Stack.Screen name="flashcards_swipe" />
      <Stack.Screen name="flashcards_card_editor" />
      <Stack.Screen name="community_pack_create" />
      {/* зачем: bottomModalAnimationOptions осталась мёртвой после удаления
          personal_plan_task_done (0b3c60c67) — контракт навигации требует, чтобы
          опции нижних модалок реально применялись, а не хардкодились по экранам.
          Спред восстановлен здесь; собственное намерение экрана сохранено явной
          перебивкой ПОСЛЕ спреда: открытие пака держит свою анимацию внутри
          экрана, поэтому вход остаётся мгновенным. */}
      <Stack.Screen name="pack_opening" options={{ presentation: 'modal', ...bottomModalAnimationOptions, animation: 'none', animationDuration: 0 }} />
      <Stack.Screen name="shards_shop" />
      <Stack.Screen name="coin_exchange" />
      <Stack.Screen name="level_gifts_inventory" />
      <Stack.Screen name="level_reward_spin" />
      <Stack.Screen name="achievements_screen" />
      <Stack.Screen name="collectibles_screen" />
      <Stack.Screen name="level_exam" />
      <Stack.Screen name="review" />
      {ENABLE_DEV_TOOLS && DEV_UTILITY_ROUTE_NAMES.map((name) => (
          <Stack.Screen key={name} name={name} />
        ))}
      <Stack.Screen name="privacy_screen" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="terms_screen" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="lingman_videos" />
      <Stack.Screen name="lingman_playlist" />
      <Stack.Screen name="trainer" />
      <Stack.Screen name="trainer_words_session" />
      <Stack.Screen name="flashcards_listening_session" />
      <Stack.Screen name="flashcards_speaking_session" />
      <Stack.Screen name="flashcards_blitz_session" />
      <Stack.Screen name="flashcards_voice_picker" />
      <Stack.Screen name="trainer_phrases_session" />
      <Stack.Screen name="phrase_analytics_screen" />
      <Stack.Screen name="problem_coach" />
    </Stack>
  ), [
    tTheme.bgPrimary,
    onboardingPaywallActive,
    defaultScreenAnimationOptions,
    pushScreenAnimationOptions,
    bottomModalAnimationOptions,
  ]);

  return (
    // Фон корня — константа темы: сплэш закрывает старт отдельным оверлеем,
    // а перекраска фона по асинхронным флагам давала «чёрный кадр».
    <View style={{ flex: 1, backgroundColor: tTheme.bgPrimary }}>
    <ProductAnalyticsRuntimeObserver studyTarget={studyTarget} />
    <MaintenanceGate />
    <PromoBanner />

    {stackTree}

    {postOnboardingGoldBridgeVisible && (
      <Animated.View
        pointerEvents="none"
        style={[styles.postOnboardingGoldBridge, { opacity: postOnboardingScreenTintOpacity }]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={POST_ONBOARDING_GOLD_BRIDGE_SCREEN}
          locations={[0, 0.55, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    )}

    <RegistrationPromptModal
      visible={appOverlaysEnabled && startupAuthRecoveryModalVisible}
      context="startup_recovery"
      onClose={() => setStartupAuthRecoveryVisible(false)}
      onSignedIn={() => setStartupAuthRecoveryVisible(false)}
    />

    <NotificationPermissionModal
      visible={appOverlaysEnabled && notifNudgeModalVisible}
      lang={lang}
      title={
        lang === 'es'
          ? `Llevas ${notifNudgeMissedDays} ${notifNudgeMissedDays === 1 ? 'día' : 'días'} sin practicar`
          : lang === 'uk'
          ? `Ти пропустив ${notifNudgeMissedDays} ${notifNudgeMissedDays === 1 ? 'день' : 'днів'}`
          : `Ты пропустил ${notifNudgeMissedDays} ${notifNudgeMissedDays === 1 ? 'день' : notifNudgeMissedDays < 5 ? 'дня' : 'дней'}`
      }
      body={
        lang === 'es'
          ? 'Para no perder la racha, activa los recordatorios. Te avisaremos a tiempo, sin molestar.'
          : lang === 'uk'
          ? 'Щоб не зривати серію, увімкни нагадування. Ми нагадаємо вчасно і без спаму.'
          : 'Чтобы не срывать серию, включи напоминания. Мы напомним вовремя и без спама.'
      }
      points={
        lang === 'es'
          ? ['Recordatorios en el momento adecuado', 'Te ayudan a mantener la racha y el progreso', 'Puedes desactivarlos en cualquier momento']
          : lang === 'uk'
          ? ['Нагадування в потрібний час', 'Підтримка стріку та прогресу', 'Вимикається в будь-який момент']
          : ['Напоминания в нужное время', 'Поддержка цепочки и прогресса', 'Отключается в любой момент']
      }
      confirmLabel={lang === 'es' ? 'Activar recordatorios' : lang === 'uk' ? 'Увімкнути нагадування' : 'Включить напоминания'}
      cancelLabel={lang === 'es' ? 'Más tarde' : lang === 'uk' ? 'Пізніше' : 'Позже'}
      onCancel={() => setNotifNudgeVisible(false)}
      onConfirm={async () => {
        const perm = await requestNotificationPermissionWithFallback({ openSettingsIfBlocked: true });
        const ok = perm.granted;
        setNotifNudgeVisible(false);
        if (!ok) return;
        // зачем: юзер мог заранее выключить общий мастер в разделе «Уведомления».
        // Без этой синхронизации scheduleNotifications ниже тихо блокируется гейтом
        // isNotifMasterEnabled(), а юзер видит «разрешение дал» и думает, что включил.
        // Этот модал — явное намерение «включить напоминания», поэтому чиним обе стороны.
        const prefsSnap = getNotifPrefsSnapshot();
        if (!prefsSnap.master) {
          await saveNotifPrefs({ ...prefsSnap, master: true });
        }
        const snap = getNotifSettingsSnapshot();
        const hasPerDay = Object.values(snap.schedule).some(d => d.enabled);
        if (hasPerDay) {
          await scheduleNotifications(snap, lang, 0, { studyTarget });
          return;
        }
        const hour = parseInt((await AsyncStorage.getItem('notification_hour')) || '19', 10);
        const minute = parseInt((await AsyncStorage.getItem('notification_minute')) || '0', 10);
        await scheduleDailyReminder(hour, minute, lang, { studyTarget });
      }}
    />

    {/* Модальник обновления — поверх всего приложения */}
    {appOverlaysEnabled && updateInfo && (
      <UpdateModal
        visible={updateModalVisible}
        storeUrl={updateInfo.storeUrl}
        message={updateInfo.message}
        onClose={() => setUpdateInfo(null)}
        onWillOpenExternalUrl={() => {
          awaitingStoreReturnRef.current = true;
          setUpdateModalHiddenForStore(true);
        }}
        onExternalOpenFailed={() => {
          awaitingStoreReturnRef.current = false;
          setUpdateModalHiddenForStore(false);
        }}
      />
    )}

    <ReleaseNotesModal
      visible={appOverlaysEnabled && releaseNotesModalVisible}
      onClose={() => { void closeReleaseNotesModal(); }}
    />

    <GlobalBroadcastModal
      visible={appOverlaysEnabled && broadcastModalVisible}
      payload={globalBroadcastModal}
      onClose={() => setGlobalBroadcastModal(null)}
    />

    <PersonalAdminMessageModal
      visible={appOverlaysEnabled && personalAdminMessageVisible}
      message={personalAdminMessage}
      onAcknowledge={closePersonalAdminMessage}
    />

    <LeagueBonusAvailableModal
      visible={appOverlaysEnabled && leagueBonusAvailableModalVisible}
      availability={leagueBonusAvailable}
      onClose={() => setLeagueBonusAvailable(null)}
      onOpenLeague={() => {
        setLeagueBonusAvailable(null);
        router.push('/club_screen' as any);
      }}
    />

    {/* Bottomsheet первого урока после онбординга */}
    <IntroFullAccessModal
      visible={appOverlaysEnabled && !tournamentInterruptionProtected && introFullAccessModalVisible}
      variant={introFullAccessModal ?? 'welcome'}
      onPrimaryPress={() => {
        void closeIntroFullAccessModal('primary');
      }}
      onSecondaryPress={() => {
        void closeIntroFullAccessModal('secondary');
      }}
    />

    {ready && effectiveShowOnboarding && (
      <View style={styles.appFullScreenOverlay}>
        <Onboarding
          startAtNameStep={onboardingStartAtName}
          initialLang={lang}
          onDone={handleOnboardingDone}
          onLangSelect={handleLangSelect}
          onIntroFullAccessStart={handleOnboardingIntroFullAccessStart}
        />
      </View>
    )}

    {ready && isBanned && (
      <View style={[styles.appFullScreenOverlay, { backgroundColor: '#06141B', justifyContent: 'center', padding: 24 }]}>
        <View style={{ backgroundColor: '#121826', borderRadius: 18, borderWidth: 0, borderColor: '#7f1d1d', padding: 20 }}>
          <Text style={{ color: '#f87171', fontSize: 28, textAlign: 'center', marginBottom: 10 }}>🚫</Text>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
            {triLang(lang, { ru: 'Аккаунт заблокирован', uk: 'Обліковий запис заблоковано', es: 'Cuenta bloqueada', 'pt-BR': 'Conta bloqueada', vi: 'Tài khoản đã bị khóa', id: 'Akun diblokir', tr: 'Hesap engellendi', pl: 'Konto zablokowane' })}
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
            {triLang(lang, { ru: 'Доступ к приложению ограничен. Если считаете блокировку ошибочной — напишите в поддержку.', uk: 'Доступ до застосунку обмежено. Якщо вважаєте блокування помилковим — напишіть у підтримку.', es: 'El acceso a la aplicación está restringido. Si crees que el bloqueo es un error, contacta con soporte.', 'pt-BR': 'O acesso ao aplicativo está restrito. Se achar que o bloqueio foi um erro, entre em contato com o suporte.', vi: 'Quyền truy cập ứng dụng bị hạn chế. Nếu bạn cho rằng tài khoản bị khóa nhầm, hãy liên hệ hỗ trợ.', id: 'Akses ke aplikasi dibatasi. Jika menurutmu pemblokiran ini keliru, hubungi dukungan.', tr: 'Uygulamaya erişim kısıtlandı. Engellemenin hatalı olduğunu düşünüyorsanız destek ekibiyle iletişime geçin.', pl: 'Dostęp do aplikacji jest ograniczony. Jeśli uważasz, że blokada jest błędna, skontaktuj się z pomocą techniczną.' })}
          </Text>
          <TouchableOpacity
            onPress={() => checkBanStatus(true)}
            style={{ backgroundColor: '#1f2937', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>{triLang(lang, { ru: 'Проверить снова', uk: 'Перевірити ще раз', es: 'Comprobar de nuevo', 'pt-BR': 'Verificar novamente', vi: 'Kiểm tra lại', id: 'Periksa lagi', tr: 'Tekrar kontrol et', pl: 'Sprawdź ponownie' })}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}

    {/* Глобальный баннер офлайна: единственное место, где приложение говорит
        «нет сети» — экраны сами это не различают (NetInfo в проекте нет). */}
    {ready && <OfflineBanner lang={lang} />}

    <StartupSplashHold visible={startupSplashVisible} canHideNativeSplash={fontsReady} />

    {/* Force-update — поверх обслуживания: если версия устарела, ничего не доступно. */}
    <ForceUpdateGate />

    </View>
  );
}

const styles = StyleSheet.create({
  startupSplashAnimatedRoot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: STARTUP_SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startupSplashSubtitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: 'rgb(174,170,161)',
    fontFamily: APP_FONT_FAMILY,
  },
  appFullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50,
    backgroundColor: STARTUP_SPLASH_BG,
  },
  postOnboardingGoldBridge: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
    elevation: 8,
  },
});

export default function RootLayout() {
  // Fonts are embedded through the expo-font config plugin in native builds.
  // Expo Go still needs runtime assets. Literal __DEV__ lets production Metro
  // remove typography_dev_fonts and avoids embedding the same TTF files twice.
  const devFontAssets = typeof __DEV__ !== 'undefined' && __DEV__
    ? (require('./typography_dev_fonts') as typeof import('./typography_dev_fonts')).DEV_FONT_ASSETS
    : {};
  const [fontAssetsLoaded, fontAssetsError] = useFonts(devFontAssets);
  // зачем: пока Inter регистрируется асинхронно, RN рисует текст СИСТЕМНЫМ шрифтом —
  // владелец видел на iPhone «тонкую пиксельную» кириллицу первые пару секунд и
  // рассинхрон с латиницей. Экран при этом НЕ блокируем (контракт app typography):
  // просто держим стартовый сплэш, пока начертания не встали. Ветка живёт только в
  // дев-сборках — в проде карта ассетов пуста и ожидания нет вовсе.
  const runtimeFontsExpected = Object.keys(devFontAssets).length > 0;
  const [fontWaitElapsed, setFontWaitElapsed] = useState(false);
  useEffect(() => {
    if (!runtimeFontsExpected || fontAssetsLoaded || fontAssetsError) return;
    const timer = setTimeout(() => setFontWaitElapsed(true), APP_FONT_WAIT_MAX_MS);
    return () => clearTimeout(timer);
  }, [runtimeFontsExpected, fontAssetsLoaded, fontAssetsError]);
  const fontsReady = !runtimeFontsExpected
    || fontAssetsLoaded
    || !!fontAssetsError
    || fontWaitElapsed;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: STARTUP_SPLASH_BG }}>
    <ErrorBoundary>
      <SafeAreaProvider initialMetrics={stableInitialWindowMetrics}>
      <ThemeProvider>
        <LangProvider>
          <StudyTargetProvider>
          <PremiumProvider>
            <EnergyProvider>
              <AchievementProvider>
                <OverlayArbiterProvider>
                    <AppContent fontsReady={fontsReady} />
                    {/* зачем: приветствие после онбординга — над ГЛАВНОЙ, а не
                        поверх последнего экрана анкеты (владелец, 2026-07-27).
                        Ключ onboardingWelcome стоит первым в приоритете арбитра,
                        поэтому новичок видит его раньше наград и обновлений. */}
                    <OnboardingWelcomeHost />
                    <AchievementToast />
                    <ActionToast />
                    <GlobalLevelUpHandler />
                    <GlobalShardsEarnedHost />
                    <EntitlementExpiredHost />
                    <ReferralWelcomeHost />
                    <MysteryMondayHost />
                    <ComebackBoonHost />
                    <PerfectWeekHost />
                    <BoonActivatedHost />
                    <GlobalFriendGiftHost />
                    <StreakRiskToastHost />
                    <BillingIssueToastHost />
                    <ThemedBlockingAlertHost />
                </OverlayArbiterProvider>
              </AchievementProvider>
            </EnergyProvider>
          </PremiumProvider>
          </StudyTargetProvider>
        </LangProvider>
      </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
