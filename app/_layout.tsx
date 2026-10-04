import { isForcedOnboardingForQaRuntime } from './onboarding_runtime_gate';
import { noteSwallowedAs, noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

// зачем (владелец, 2026-09-14): трассировка холодного старта ОСТАЁТСЯ, но
// только в деве. Именно она дала диагноз дважды — 2026-08-31 («вход стал идти
// секунд 40») и 2026-09-14 (замер показал `Bundled 34052ms onboarding.tsx` и
// что сама цепочка укладывается в 2.1 с). Удалять её рано: старт ещё предмет
// расследований. В проде молчит полностью — ни строки в консоль.
// Читаем __DEV__ через globalThis: голая ссылка падает в тестах
// (см. память project_dev_guard_bare_dev_global_jest).
const BOOT_TRACE_ENABLED = !!(globalThis as { __DEV__?: boolean }).__DEV__;
if (BOOT_TRACE_ENABLED) console.warn('[BOOT] _layout module eval START'); // guard-ok: BOOT_TRACE_ENABLED и есть __DEV__
const BOOT_T0 = Date.now();
export function bootMark(step: string, extra?: unknown): void {
  if (!BOOT_TRACE_ENABLED) return;
  const ms = Date.now() - BOOT_T0;
  console.warn(`[BOOTSPLASH] +${ms}ms ${step}${extra === undefined ? '' : ' :: ' + JSON.stringify(extra)}`);
}
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { maskDeepLinkForLog } from './deep_link_log_mask';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTapLatencyCaptureHandler, createTapLatencyProfilerHandler, createTapLatencyTouchEndHandler } from './tap_latency_trace';
import { TapLatencyNavProbe } from '../components/TapLatencyNavProbe';
import { LinearGradient } from '../components/SafeLinearGradient';
import { Stack, useGlobalSearchParams, usePathname, useRouter, router as globalRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as SplashScreen from 'expo-splash-screen';
import { UI_SFX_AUDIO_MODE } from './audio_playback_mode';
import { setManagedAudioMode } from './audio_session_coordinator';
import { releaseStaleAudioActivity } from '../modules/audio/audio_activity';
import { stopAllAudioOwnersOnResume } from '../modules/audio/audio_runtime_arbiter';
import { soundDirector } from '../modules/audio/sound_director';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { redirectSystemPath } from './+native-intent';
import React, { Profiler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, Easing, InteractionManager, LogBox, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { Image } from 'expo-image';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EnergyProvider } from '../components/EnergyContext';
// зачем (владелец, 25.08: «на главной всегда нули при заходе»): статический
// импорт запускает прогрев рун при загрузке модуля (см. комментарий
// primeRunesPeekFromBoot в runes_system.ts) — раньше, чем первый кадр Главной
// прочитает peekRunes(). Тот же приём, что у EnergyProvider/energy_peek_cache
// чуть выше по файлу: чтение стартует до, а не только внутри bootstrap-гонки.
import { getRunesBalanceRead } from './runes_system';
// зачем (PM-052, D75, 02.10): очередь «сбора наград на Главной» удалена — монеты летят там,
// где заработаны (CoinRewardFlight); копилка «на потом» больше не нужна.
import { LangProvider, useLang } from '../components/LangContext';
import IntroFullAccessModal from '../components/IntroFullAccessModal';
import { StudyTargetProvider, useStudyTarget } from '../components/StudyTargetContext';
import {
  beginInitialAccountGeneration,
  captureAccountGeneration,
  subscribeAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { isLevelUpAccountTokenCurrent } from './level_up_account_guard';
import { isCurrentAccountGeneration } from './account_generation';
import { getStableId } from './stable_id';
import type { Props as OnboardingProps } from '../components/onboarding';
import { PremiumProvider, usePremium } from '../components/PremiumContext';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import UpdateModal from '../components/UpdateModal';
import AppMessageAnnouncementModal from '../components/AppMessageAnnouncementModal';
import ReleaseNotesModal from '../components/ReleaseNotesModal';
import ReleaseNotesV2Modal from '../components/ReleaseNotesV2Modal';
import GlobalBroadcastModal from '../components/GlobalBroadcastModal';
import PersonalAdminMessageModal from '../components/PersonalAdminMessageModal';
import MaintenanceGate from '../components/MaintenanceGate';
import ForceUpdateGate from '../components/ForceUpdateGate';
import OfflineBanner from '../components/OfflineBanner';
import PromoBanner from '../components/PromoBanner';
import NotificationPermissionModal from '../components/NotificationPermissionModal';
import RegistrationPromptModal from '../components/RegistrationPromptModal';
import { triLang, type Lang } from '../constants/i18n';
import { getInstalledAppVersion } from './app_version';
import { ENABLE_DEV_TOOLS, ENABLE_TOURNAMENTS, IS_EXPO_GO, ENABLE_SCREEN_TRANSITIONS, SCREEN_FADE_TRANSITIONS } from './config';
import { SECTION_SHEET_STACK_OPTIONS } from './section_sheet_navigation';
import { subscribeNetStatus } from './net_status';
import { resumePendingOnboardingFunnel } from './onboarding_funnel';
import { cleanupRetiredMistakePracticeStorage } from './mistake_practice_legacy_cleanup';
import { cleanupRetiredBlitzRecord } from './flashcards/blitz_record_cleanup';
import {
  readOnboardingNotificationChoice,
  shouldPromptForOnboardingNotifications,
} from './onboarding_notification_choice';
import { resumePendingAgeConsent } from './age_consent_cloud';
import { persistPortableProgressRegister } from './phone_state_progress_register_bridge';
import { checkAchievements, getPendingNotifications, markAchievementsNotified } from './achievements';
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
import { PlayInstallReferrer } from 'react-native-play-install-referrer';
import { touchStreakForToday } from './hall_of_fame_utils';
import { preloadDeferredNonPrimaryImages, preloadPrimaryTabImages } from './image_preload';
import { seedLearningV2BootstrapAudioCacheV1 } from './learning_v2_bootstrap_audio_seed_v1';
import { setupNotificationTapHandler } from './notification_tap_handler';
// зачем: разбиение общего импорта из './notifications' на точечные потеряло эти
// две функции — файл перестал собираться (TS2552/TS2304 на строках 2816/2819),
// а с ним не запускалось всё приложение. Возвращено ровно то, что было в HEAD.
import {
  isNotificationPermissionGranted,
  requestNotificationPermissionWithFallback,
} from './notifications';
import { initRevenueCat } from './revenuecat_init';
import { hydrateAnalyticsConsentFromStorage } from './analytics_consent';
import { hydrateAiExplainConsentFromStorage } from './ai_explain_consent';
import { hydrateAiDialogConsentFromStorage } from './ai_dialog_consent';
import { hydrateAgeGateFromStorage } from './age_gate';
import { prefetchMarketplacePacks } from './flashcards/marketplace';
import { syncPublicProfileSnapshot } from './public_profile_snapshot';
import { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus, getVerifiedVipStatus } from './premium_guard';
import { incrementSessionCount } from './review_utils';
import { checkForUpdate, UpdateInfo } from './update_check';
import { flushPendingProgressEvents } from './progress_events_client';
import { createDisposableAdoption } from './disposable_adoption';
import ActionToast from '../components/ActionToast';
import GlobalShardsEarnedHost from '../components/GlobalShardsEarnedHost';
import EntitlementExpiredHost from '../components/EntitlementExpiredHost';
import ReferralWelcomeHost from '../components/ReferralWelcomeHost';
import StreakRiskToastHost from '../components/StreakRiskToastHost';
import BillingIssueToastHost from '../components/BillingIssueToastHost';
import ThemedBlockingAlertHost from '../components/ThemedBlockingAlertHost';
import PhoneStateRecoveryScreen from '../components/PhoneStateRecoveryScreen';
import { enqueueThemedBlockingInfoAlert } from './themed_blocking_alert_queue';
import {
  consumeRemoteAccountDeletionNotice,
  handleAccountDeletedOnAnotherDevice,
  isLocalAccountDeletionInProgress,
  peekLinkedAuthFromCurrentUser,
  ensureFreshPostDeletionIdentity,
  subscribeFirebaseAuthUid,
} from './auth_provider';
import { startRemoteAccountDeletionMonitor } from './remote_account_deletion_monitor';
import { isAccountsV2ClientEnabled, syncAccountsV2ClientAuth } from './accounts_v2_client_flag';
import { getCanonicalUserId } from './user_id_policy';
import { dismissReleaseNotesModalPermanently, shouldOfferReleaseNotesModal } from './release_notes_modal';
import {
  dismissReleaseNotesV2ModalPermanently,
  isReleaseNotesV2ReleaseActive,
  shouldOfferReleaseNotesV2Modal,
} from './release_notes_v2_gate';
import { prefetchEasUpdateAfterStartup } from './eas_update_prefetch';
import { prefetchAchievementArtInBackground } from './achievement_art_prefetch';
import { fetchPendingGlobalBroadcastModal, GlobalBroadcastModalPayload } from './global_broadcast_modal';
import { emitAppEvent, onAppEvent } from './events';
import {
  finishAccountDeleteUiTrace,
  traceAccountDeleteUi,
} from './account_delete_ui_trace';
import { hydratePlatformUiPreviewFromStorage } from './platform_ui_preview';
import { setDeferEnergyOnboardingForPostOnboardingFirstLesson } from './energyOnboardingGate';
import { useGlobalBottomOverlayOffset } from '../hooks/use-global-bottom-overlay-offset';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { primeAllLessonsFromStorageOnAppLaunch } from './lesson_screen_bootstrap';
import { hydrateUserSettingsFromStorage } from './user_settings_store';
import { createSettingsBootReadScope } from '../lib/startup_settings_read_scope';

import { hydrateHapticsTapFromStorage } from './haptics_tap_preload';
import { installForegroundUsageMsTracker } from './foreground_usage_ms';
import { startFriendsTabSwrPrime } from './friends_tab_swr_warm';
import { applyContentDeliveryMigration } from './content_delivery_migration';
import { primeAppSnapshotFromStorage } from './app_snapshot_bootstrap';
import { hydrateDailyPhrasePeekFromStorage } from './daily_phrase_system';
import { primeSurveyOfferCacheFromStorage } from './survey_offer_cache';
import { primeScreenSnapshotsFromStorage } from './screen_snapshot_store';
import { hydrateYoutubeChannelPreference } from './youtube_channel_preference';
import { hydrateStatsCacheFromStorage } from './statsCache';
import { primeRemoteConfigCacheFromStorage } from './remote_config_client';
import { ensurePhoneStateSyncLifecycleInstalled } from './phone_state_sync_lifecycle';
import { bootstrapPhoneState } from './phone_state_bootstrap';
import { installPhoneStateProductionRuntime } from './phone_state_runtime';
import { schedulePhoneStateDeferredIntegrityCheck } from './phone_state_runtime'; // зачем: §84 — фоновая проверка целостности
import { coldStartMark, coldStartStep } from './cold_start_trace';
import { msSinceJsEntry, takeModuleEvalReport } from './cold_start_entry_mark';
import { whenHomePainted } from './home_paint_marker'; // зачем: §80 — [COLD-START] от старта процесса
import { markNativeSplashHidden, runAfterHomeFirstFrame } from './first_frame_deferred_warmups'; // зачем: PM-211 — необязательное после первого кадра Главной
import { installColdStartIoTrace } from './cold_start_io_trace'; // зачем: §89 — [COLD-START-IO]
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
import { type RuntimeStudyTarget } from './target_storage_keys';
import { DEV_UTILITY_ROUTE_NAMES, DEV_UTILITY_ROUTE_PATHS } from '../constants/devRoutes';
import { APP_FONT_FAMILY } from './typography';
import { getLocalDayKey } from './local_date';
import { installInterFontPatch } from './font_family_patch';
import { noteNavRoute } from './nav_paint_trace';
import { shouldRunFullAppBootstrap } from './native_runtime_capability';
import {
  acknowledgeAppMessageModal,
  acknowledgePersonalAdminMessageModal,
  listPendingAppMessageModals,
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

import { DebugLogger } from './debug-logger';
import { traceLessonExit } from './lesson_exit_trace';
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

// зачем (§89, Q119а): [COLD-START-IO] — кто забивает очередь AsyncStorage/SecureStore в первые 15 с
// (одна строка итога console.warn, живёт и в release). Временное — убрать после выноса тяжёлого.
installColdStartIoTrace();
installPhoneStateProductionRuntime();
// зачем (координатор 04.10, холодный старт п.1, «сперва логи»): статические import исполняются до этой
// строки — proc= здесь = цена всего графа импортов корня (включая модальные хосты), до первого рендера.
coldStartMark('layout.module_imports:done', '_layout', { entryToImportsMs: msSinceJsEntry() });
// зачем (координатор 04.10, замер №4): посев озвучки, отпущенный кадром Главной, занимал поток раньше, чем
// корень успевал снять сплеш — сплеш висел ещё ~3 с поверх нарисованной Главной. Тяжёлая фоновая работа
// ждёт и кадр Главной, и снятие сплеша.
let resolveNativeSplashHidden: () => void = () => {};
const nativeSplashHidden = new Promise<void>((resolve) => { resolveNativeSplashHidden = resolve; });
function whenNativeSplashHidden(ceilingMs: number): Promise<'hidden' | 'ceiling'> {
  return Promise.race([
    nativeSplashHidden.then(() => 'hidden' as const),
    new Promise<'ceiling'>((resolve) => setTimeout(() => resolve('ceiling'), ceilingMs)),
  ]);
}
// зачем (координатор 04.10, п.1): ~6 с импортов корня в деве — какие модули тяжёлые (только дев, один раз).
{
  const moduleReport = takeModuleEvalReport();
  if (moduleReport) {
    coldStartMark('layout.module_eval:self_top', '_layout', { modules: moduleReport.modules, selfSumMs: moduleReport.selfSumMs, top: moduleReport.self });
    coldStartMark('layout.module_eval:total_top', '_layout', { top: moduleReport.total });
  }
}

const INSTANT_STACK_ANIMATION = { animation: 'none', animationDuration: 0 } as const;
const screenFadeEnabled = SCREEN_FADE_TRANSITIONS && !ENABLE_SCREEN_TRANSITIONS;
const defaultScreenAnimationOptions = ENABLE_SCREEN_TRANSITIONS
  ? ({ animation: 'slide_from_right', animationDuration: 220 } as const)
  : screenFadeEnabled
    ? ({ animation: 'fade', animationDuration: 140 } as const)
    : INSTANT_STACK_ANIMATION;

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
      } catch (e) {
      // best-effort
      DebugLogger.error('_layout:health', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    }
  };
}

/** Список друзей с диска в память до открытия вкладки — чтобы первый кадр вкладки мог сразу показать строки. */
// Нативный сплэш из app.json — скрываем только когда AppContent сообщает ready (см. hideAsync в useEffect).
void SplashScreen.preventAutoHideAsync().catch(noteSwallowedHandler('_layout:module.preventAutoHideAsync'));

const DefaultText = Text as typeof Text & { defaultProps?: Record<string, unknown> };
DefaultText.defaultProps = {
  ...DefaultText.defaultProps,
  android_hyphenationFrequency: 'none',
  textBreakStrategy: 'simple',
  style: [{ fontFamily: APP_FONT_FAMILY }, DefaultText.defaultProps?.style],
};

const STARTUP_SPLASH_BG = '#101214';
/** Потолок ожидания рантайм-шрифтов: сломанный ассет не должен держать сплэш вечно.
 * зачем (владелец, 2026-08-25): срезано 2500→1000 — гейт живёт ТОЛЬКО в дев-сборках
 * (runtimeFontsExpected=false в проде, шрифты вшиты нативно), а при перегруженном
 * Metro (10+ параллельных сессий на ПК) дев-сплэш ждал шрифты до 2,5 с. Цена:
 * в деве первую секунду текст может мигнуть системным шрифтом — прод не затронут. */
const APP_FONT_WAIT_MAX_MS = 1000;
// зачем: аудит нагрева 2026-07-25 — flushQueue/intro/winback дёргались на КАЖДЫЙ
// разворот приложения без троттла (AsyncStorage + premium-проверки). Событийные и
// стартовые пути остаются мгновенными, троттлится ТОЛЬКО foreground-страховка.
const FOREGROUND_FLUSH_MIN_MS = 15_000;
const FOREGROUND_MODAL_CHECK_MIN_MS = 60_000;
// зачем (PM-252 п.3, координатор 04.10): сообщения приложения читались принудительно на КАЖДОМ возврате
// (до 240 документов). Принудительно — только при входе (первый раз за запуск для аккаунта), дальше кэш
// и сеть не чаще раза в 6 часов.
const APP_MESSAGES_FOREGROUND_MIN_INTERVAL_MS = 6 * 60 * 60_000;
const appMessagesForcedForStableIds = new Set<string>();
/** зачем (владелец, 2026-09-21: «вход ДО 1 СЕКУНДЫ»): 900 мс этого потолка
 * съедали почти весь бюджет входа в одиночку, а следом ещё ждал homeScreenReady.
 * Событие от Главной приходит раньше на здоровом старте — fallback нужен только
 * когда экран промолчал, и ждать его почти секунду больше нельзя. */
const FIRST_CONTENT_READY_FALLBACK_MS = 400;
/** Столько ждём чанк Главной, прежде чем перестать держать им сплеш.
 * зачем (владелец, 2026-09-21): см. развёрнутый комментарий у самого fallback
 * ниже — это был единственный флаг гейта вообще без потолка. */
const HOME_SCREEN_READY_FALLBACK_MS = 550;
/** Потолок ожидания кадра Главной перед bootstrap phone-state (см. homePaintedForPhoneState). */
const PHONE_STATE_BOOTSTRAP_FALLBACK_MS = 8_000;
/**
 * зачем (§84, Q118): фоновая проверка целостности базы не идёт во время урока/тренировки/экзамена —
 * она держит соединение базы ~1–2 с. Возвращает маршрут-причину занятости (для лога) или null.
 */
const PHONE_STATE_BUSY_ROUTE_RE = /(lesson|session|exam|diagnostic|swipe|blitz|recall|speaking|spire|dialogue|quiz|practice|train)/i;
function phoneStateBusyRoute(path: string | null | undefined): string | null {
  const value = String(path ?? '');
  return PHONE_STATE_BUSY_ROUTE_RE.test(value) ? value : null;
}
/** Жёсткий потолок: дольше этого стартовая цепочка не имеет права держать сплеш.
 * зачем (владелец, 2026-09-14): здоровый старт по замеру — ~2.1 с от загрузки
 * модуля до скрытия сплеша. Работа не отменяется — снимается только право
 * держать экран. Парный fallback для ветки онбординга ниже.
 *
 * зачем 6000 → 1000 (владелец, 2026-09-21: «вход ДО 1 СЕКУНДЫ, мгновенно на
 * 100%»): потолки гейта СКЛАДЫВАЮТСЯ, а не идут параллельно — сплеш ждёт ready,
 * и только потом firstContentReady и чанк Главной. При 6000 обещание секунды
 * было невыполнимо в принципе. Держать экран закрытым дольше секунды запрещено;
 * bootstrap при этом продолжает работу в фоне и досыпает состояние событиями —
 * ровно так, как было задумано с самого начала. */
const BOOTSTRAP_READY_DEADLINE_MS = 1_000;
/** Столько ждём модуль онбординга, прежде чем перестать держать им сплеш.
 * зачем: в dev по LAN замерено `Bundled 34052ms components\onboarding.tsx` —
 * ровно этот модуль и держал экран 34 секунды; в проде тот же риск даёт
 * провалившийся import (его catch раньше молчал). */
const ONBOARDING_MODULE_WAIT_MAX_MS = 4_000;
const POST_ONBOARDING_GOLD_BRIDGE_MS = 3000;
const POST_ONBOARDING_GOLD_BRIDGE_SCREEN = ['rgba(255,224,144,0.34)', 'rgba(163,104,24,0.16)', 'rgba(18,14,6,0.08)'] as const;

const POST_ONBOARDING_GOLD_BRIDGE_PANEL = ['rgba(122,75,12,0.44)', 'rgba(54,34,8,0.30)', 'rgba(11,9,5,0.12)'] as const;
const POST_ONBOARDING_GOLD_BRIDGE_CTA = ['#FFF0B5', '#E2A923'] as const;
const POST_ONBOARDING_GOLD_BRIDGE_TEXT = '#3F2C08';


/** Сколько ждём, пока expo-router сам откроет тёплую ссылку, прежде чем открыть её вручную. */
const WARM_DEEP_LINK_SELF_OPEN_WAIT_MS = 400;

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
    const id = requestAnimationFrame(() => { void SplashScreen.hideAsync().catch(noteSwallowedHandler('_layout:useEffect.hideAsync')); });
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

  // Keep these transforms on separate native nodes. Animated.add can retain a
  // reference to an already removed interpolation when the startup overlay is
  // hidden, which produces an Android New Architecture race on first launch.
  const glyphEnterScale = glyphIn.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const glyphPulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.055] });
  const wordTranslateY = wordIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const subTranslateY = subIn.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });
  const shineX = shine.interpolate({
    inputRange: [0, 1],
    outputRange: [-SPLASH_SHINE_WIDTH, SPLASH_WORDMARK_WIDTH + SPLASH_SHINE_WIDTH],
  });

  return (
    <View pointerEvents="none" style={styles.startupSplashAnimatedRoot}>
      <Animated.View style={{ opacity: glyphIn, transform: [{ scale: glyphEnterScale }] }}>
        <Animated.View style={[styles.startupSplashGlyphPulse, { transform: [{ scale: glyphPulseScale }] }]}>
          <Image
            source={require('../assets/images/splash-glyph.webp')}
            contentFit="contain"
            style={{ width: SPLASH_GLYPH_SIZE, height: SPLASH_GLYPH_SIZE }}
          />
        </Animated.View>
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

async function preloadVectorIconFonts() {
  await Promise.all([
    Ionicons.loadFont(),
    MaterialIcons.loadFont(),
  ]);
}

// RevenueCat API keys must be set via environment variables.
// See revenuecat_init.ts for singleton initialization pattern.

type NotificationsModule = typeof import('./notifications');
let notificationsModulePromise: Promise<NotificationsModule> | null = null;

function loadNotificationsModule(): Promise<NotificationsModule> {
  notificationsModulePromise ??= import('./notifications');
  return notificationsModulePromise;
}

// ── Проверки напоминаний при старте ──────────────────────────────────────────
const runSessionChecks = async (studyTarget?: RuntimeStudyTarget) => {
  try {
    const today = getLocalDayKey();
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
    const langRaw = await AsyncStorage.getItem('app_lang');
    const lang: Lang = langRaw === 'uk' ? 'uk' : langRaw === 'es' ? 'es' : 'ru';

    // ── 3. Восстановление напоминаний: daily ИЛИ per-day (расписание), не оба
    const notifEnabled = notifEnabledRaw;
    if (notifEnabled === 'true') {
      void loadNotificationsModule()
        .then(async (notifications) => {
          const notifSnap = notifications.getNotifSettingsSnapshot();
          const hasPerDay = Object.values(notifSnap.schedule).some(d => d.enabled);
          if (hasPerDay) {
            notifications.scheduleNotifications(notifSnap, lang, 0, { requestPermission: false, studyTarget }).catch(noteSwallowedHandler('_layout:runSessionChecks.scheduleNotifications'));
          } else {
            const hour = parseInt((await AsyncStorage.getItem('notification_hour')) || '19');
            const minute = parseInt((await AsyncStorage.getItem('notification_minute')) || '0');
            notifications.scheduleDailyReminder(hour, minute, lang, { requestPermission: false, studyTarget }).catch(noteSwallowedHandler('_layout:runSessionChecks.scheduleDailyReminder'));
          }
          notifications.scheduleStreakWarningIfNeeded(lang, { requestPermission: false }).catch(noteSwallowedHandler('_layout:runSessionChecks.scheduleStreakWarningIfNeeded'));
          notifications.schedulePhraseOfDayNotification(lang, { requestPermission: false, studyTarget }).catch(noteSwallowedHandler('_layout:runSessionChecks.schedulePhraseOfDayNotification'));
          notifications.scheduleWeeklyRecapNotification(lang, { requestPermission: false }).catch(noteSwallowedHandler('_layout:runSessionChecks.scheduleWeeklyRecapNotification'));
          notifications.scheduleMonthlyRecapNotification(lang, { requestPermission: false, studyTarget }).catch(noteSwallowedHandler('_layout:runSessionChecks.scheduleMonthlyRecapNotification'));

          // Серверные пуши: регистрируем Expo push token в облаке, чтобы cron мог
          // достучаться до пропавшего юзера. Best-effort, в фоне.
          void import('./push_token_registration')
            .then(({ registerPushTokenForServerPush }) => registerPushTokenForServerPush(lang))
            .catch(noteSwallowedHandler('_layout:runSessionChecks.call'));
          // «Вместе»: раз в запуск синхронизируем в облако тумблер «Друзья» + часовой пояс.
          notifications.syncFriendsPushPrefIfChanged().catch(noteSwallowedHandler('_layout:runSessionChecks.syncFriendsPushPrefIfChanged'));
        })
        .catch(noteSwallowedHandler('_layout:runSessionChecks.loadNotificationsModule'));
    }

  } catch (e) {
    if (__DEV__) console.warn('[_layout]', e);
  }
};

// ── Награды за повышение уровня — без модалок ──
/**
 * GlobalLevelUpRewards — доводит до конца выдачу наград за уровень.
 *
 * зачем (владелец, 2026-09-01): полноэкранная модалка поздравления УДАЛЕНА.
 * Она всплывала «когда попало» — на любом экране, по старту, по foreground,
 * по уходу со спина — и брала уровень из durable-очереди непоказанных
 * показов. Очередь чистилась ТОЛЬКО по кнопке «Готово», поэтому один
 * недожатый показ жил месяцами: человек на 40-м уровне видел
 * «Поздравляем, уровень 13».
 *
 * Показ повышения переехал на Главную (app/home_level_up_celebration_queue.ts
 * + components/home/use_home_level_up_celebration.ts): полоска доливается до
 * конца, аватарка подпрыгивает, цифра уровня меняется. Спин остаётся отдельно
 * — золотой плашкой «Спины: N» рядом.
 *
 * Здесь осталась ТОЛЬКО безопасность наград — то, что нельзя терять:
 *  • retry/repair недовыданных наград за уровень;
 *  • выплата durable-outbox бонусов (теперь это только ДОЛГ за старые
 *    непоказанные уровни; новые интенты больше не создаются);
 *  • разовая миграция закрытия долга и чистки очереди показов;
 *  • прогрев арта аур/достижений и виджет «фраза дня» (жили здесь же).
 *
 * Компонент ничего не рисует.
 */
function GlobalLevelUpRewards() {
  const { lang } = useLang();
  const { themeMode } = useTheme();
  const { studyTarget } = useStudyTarget();
  const { hasPremiumAccess } = usePremium();
  const [userName, setUserName] = useState('');
  // Путь нужен апселлу ниже: во время турнира перебивать экран нельзя.
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  /**
   * Разовый апселл премиума на 5-м уровне.
   *
   * зачем: механика монетизации, которая раньше висела на кнопке «Готово»
   * удалённой модалки поздравления. Модалки нет — но апселл терять нельзя,
   * поэтому он переехал на момент, когда человек ТОЧНО увидел новый уровень:
   * праздник на Главной уже проигран (полоска долилась, аватарка прыгнула,
   * цифра сменилась). Показывать раньше — значит перебивать саму анимацию.
   */
  useEffect(() => {
    const sub = onAppEvent('home_level_up_celebrated', ({ level }) => {
      if (level !== 5 || hasPremiumAccess) return;
      const accountToken = captureAccountGeneration();
      void withAccountTransitionLock(async () => {
        if (!isLevelUpAccountTokenCurrent(accountToken)) return;
        try {
          const prem = await getVerifiedPremiumStatus().catch(noteSwallowedAs('_layout:useEffect.getVerifiedPremiumStatus', false));
          if (!isLevelUpAccountTokenCurrent(accountToken)) return;
          const introState = await getIntroFullAccessState().catch(noteSwallowedAs('_layout:useEffect.getIntroFullAccessState', null));
          if (!isLevelUpAccountTokenCurrent(accountToken)) return;
          if (introState?.expiredUnseen === true) return;
          const [{ canShowAfterWinUpsell, markAfterWinUpsellShown }, { trackEvent }] = await Promise.all([
            import('./after_win_upsell_gate'),
            import('./analytics'),
          ]);
          if (!(await canShowAfterWinUpsell({ isPremium: prem, nowMs: Date.now() }))) return;
          if (!isLevelUpAccountTokenCurrent(accountToken)) return;
          // Navigation first: a failed push must not consume the cooldown.
          globalRouter.push({ pathname: '/premium_modal', params: { context: 'level_up', source: 'afterwin_levelup' } } as Href);
          await markAfterWinUpsellShown(Date.now());
          await trackEvent('afterwin_upsell_shown', { source: 'level_up' });
          void import('./firebase').then(({ logAfterWinUpsellShown }) => logAfterWinUpsellShown('level_up')).catch(noteSwallowedHandler('_layout:useEffect.call'));
        } catch (e) {
          // guard-ok: молчаливый отказ апселла = потерянная выручка без следа.
          DebugLogger.error('_layout:levelUpUpsell', e instanceof Error ? e : new Error(String(e)), 'warning');
        }
      });
    });
    return () => sub.remove();
  }, [hasPremiumAccess]);

  // зачем: владелец: «открываю раздел — он чуть подпрыгивает, будто ассеты грузятся».
  // Иконки разделов и плитки хаба карточек не входили в image_preload, поэтому
  // декодировались уже во время показа экрана. Греем их для АКТИВНОЙ темы строго после
  // первого кадра (главная уже видна), и повторно при смене темы — к моменту тапа по
  // разделу картинки лежат в кэше и первый кадр раздела сразу финальный.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void import('./section_asset_preload')
        .then((m) => m.preloadSectionAssets(themeMode))
        .catch(noteSwallowedHandler('_layout:useEffect.call_2'));
    });
    return () => task.cancel();
  }, [themeMode]);

  return null;
}

const BAN_CACHE_KEY = 'ban_status_cached_v1';
const BAN_CACHE_AT_KEY = 'ban_status_cached_at_v1';
const BAN_CACHE_TTL_MS = 30 * 60 * 1000;

// Вынесено в дочерний компонент чтобы иметь доступ к LangContext + AchievementContext
function AppContent({ fontsReady = true }: { fontsReady?: boolean }) {
  const [ready, setReady]           = useState(false);
  const reduceMotion = useReduceMotion();
  const [rootNavigationReady, setRootNavigationReady] = useState(false);
  const [isBanned, setIsBanned]     = useState(false);
  const [showOnboarding, setShow]   = useState(false);
  const [onboardingComponent, setOnboardingComponent] = useState<React.ComponentType<OnboardingProps> | null>(null);
  // зачем (владелец, 2026-09-14): ветка онбординга была ЕДИНСТВЕННОЙ в гейте
  // сплеша без потолка времени — у firstContentReady fallback есть (900 мс), у
  // неё не было. Замер в dev по LAN: модуль ехал 34 секунды, и всё это время
  // человек смотрел на заставку. Флаг снимает право держать экран; сам модуль
  // продолжает грузиться и подставится, как только доедет.
  const [onboardingWaitElapsed, setOnboardingWaitElapsed] = useState(false);
  // Account deletion must tear down the complete native presentation tree.
  // Merely hiding the React Native confirmation modal leaves iOS pageSheet
  // routes (Account/Privacy over Settings) alive above the onboarding overlay.
  const [accountDeletionNavigationEpoch, setAccountDeletionNavigationEpoch] = useState(0);
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
  const [homeScreenReady, setHomeScreenReady] = useState(false);
  // зачем (§80, трасса «Дизайна» 02.10): bootstrap phone-state (SQLCipher ~8 с на эмуляторе) стартовал
  // по firstContentReady, а тот срабатывает запасным таймером 400 мс — ДО того, как доедет и
  // вычислится чанк Главной. База и Главная делили JS-поток, и первый кадр Главной ждал конца
  // bootstrap (HOME-PAINT через 1,6 с ПОСЛЕ bootstrap:ok). Теперь база открывается после
  // НАСТОЯЩЕГО кадра Главной (событие, а не запасной таймер homeScreenReady 550 мс); если Главная
  // не появится (онбординг, другой экран) — свой потолок PHONE_STATE_BOOTSTRAP_FALLBACK_MS.
  const [homePaintedForPhoneState, setHomePaintedForPhoneState] = useState(false);
  const [introFullAccessModal, setIntroFullAccessModal] = useState<'welcome' | 'ended' | null>(null);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [pendingWarmDeepLink, setPendingWarmDeepLink] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  /** Скрываем RN Modal до ухода в стор — на Android иначе зависания System UI при возврате. */
  const [updateModalHiddenForStore, setUpdateModalHiddenForStore] = useState(false);
  const awaitingStoreReturnRef = useRef(false);
  useEffect(() => {
    void cleanupRetiredMistakePracticeStorage().catch(noteSwallowedHandler('_layout:useEffect.cleanupRetiredMistakePracticeStorage'));
    void cleanupRetiredBlitzRecord().catch(noteSwallowedHandler('_layout:useEffect.cleanupRetiredBlitzRecord'));
  }, []);
  // зачем (D47, владелец): прогрев озвучки V2 (координатор + фоновая задача
  // expo-background-task) удалён целиком — это и был источник «всё тормозит
  // с момента входа» (22.09: 8 сессий вперёд + массовая закачка всех уроков,
  // SHA-256 каждого файла в JS-потоке, плюс тот же прогрев каждые 15 минут в
  // фоне). Файлы (`learning_v2_audio_prefetch_coordinator_v1` и соседи) больше
  // не существуют — регистрировать/снимать нечего. Тем, у кого фоновая задача
  // осталась зарегистрированной прошлой версией, ОС забудет её сама при
  // следующем обновлении сборки (задача определяется только внутри удалённого
  // модуля, TaskManager.defineTask для неё больше не вызывается никогда).
  useEffect(() => {
    // Load the completion transport only after the root has committed. This
    // installs its lifecycle/connectivity scheduler on every app launch without
    // adding the heavy sync module to the synchronous first-frame bundle.
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      void import('./learning_v2_completion_background_scheduler').then((scheduler) => {
        if (!cancelled) scheduler.ensureLearningV2CompletionBackgroundSchedulerInstalled();
      }).catch(noteSwallowedHandler('_layout:useEffect.call_3'));
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, []);

  // зачем (владелец 2026-09-22, «немедленно удалить все замеры»): здесь на
  // КАЖДОЙ смене раздела стоял замер probeStorageGrowth, делавший полный скан
  // индекса AsyncStorage (getAllKeys). Скан дорожает с возрастом установки и
  // стоял ровно в том месте, где владелец чувствовал заминку — измеритель сам
  // стал частью болезни. Путь смены раздела обязан быть пустым.

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

  const [releaseNotesVariant, setReleaseNotesVariant] = useState<'legacy' | 'v2' | null>(null);
  const [globalBroadcastModal, setGlobalBroadcastModal] = useState<GlobalBroadcastModalPayload | null>(null);
  const [personalAdminMessage, setPersonalAdminMessage] = useState<AppMessageWithState | null>(null);
  const [appMessageModalQueue, setAppMessageModalQueue] = useState<AppMessageWithState[]>([]);
  const [accountGeneration, setAccountGeneration] = useState(() => captureAccountGeneration());
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === 'active');
  const [spireAuthenticatedUid, setSpireAuthenticatedUid] = useState<string | null>(null);
  // Account V2 (ревью 6B): значение клиентского флага; false до первого эффекта — ничего на первом кадре.
  const [accountsV2ClientFlag, setAccountsV2ClientFlag] = useState(false);
  const [notifNudgeVisible, setNotifNudgeVisible] = useState(false);
  const [startupAuthRecoveryVisible, setStartupAuthRecoveryVisible] = useState(false);
  const startupAuthRecoveryOfferedRef = useRef(false);
  const [notifNudgeMissedDays, setNotifNudgeMissedDays] = useState(0);
  const { setLang, lang } = useLang();
  const remoteDeletionNoticeShownRef = useRef(false);
  const { studyTarget } = useStudyTarget();
  // зачем (аудит 2026-08-28, тот же класс бага что в flashcards_collection.tsx):
  // hasPremiumAccess — полный законный доступ (покупка ИЛИ VIP ИЛИ intro ИЛИ
  // admin-override), isPremium/isVip — только узкие подтверждённые статусы.
  // hasVerifiedRealPremiumOrVip() ниже раньше проверял isPremium||isVip и
  // мог вытолкнуть winback/intro-ended пейволл человеку с admin-override
  // доступом (как у Виталия: premium_plan='annual', admin_premium_override=true,
  // но не realPremium/vip флаг).
  const { hasPremiumAccess } = usePremium();
  const { theme: tTheme, themeMode, statusBarLight, liquidGlassChoiceReady } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  // зачем (PM-220): release-метка [NAV-PAINT] на каждую смену маршрута — метод измерения навигации и тренировок.
  noteNavRoute(pathname);
  const warmDeepLinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        en: 'Account deleted',
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
        en: 'This account was deleted on another device. Local data on this phone has been cleared and the session ended.',
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
  // зачем (владелец 2026-09-22, «любая кнопка думает»): строка пересобиралась
  // на КАЖДОМ рендере корня — сортировка и кодирование всех параметров заново,
  // хотя меняется она только при смене маршрута. Мемоизация не трогает логику
  // трекера навигации (от неё зависит «назад» и разбор «Сессии недоступна»),
  // а лишь перестаёт считать одно и то же. Сам useGlobalSearchParams оставлен
  // намеренно: в корне только он видит параметры активного экрана.
  const navigationPathSignature = useMemo(
    () => buildNavigationPathSignature(pathname, globalSearchParams),
    [pathname, globalSearchParams],
  );
  const currentDevUtilityRoute = isDevUtilityRoutePath(pathname);
  const effectiveShowOnboarding = showOnboarding && !currentDevUtilityRoute;
  const isRootIndexRoute = !pathname || pathname === '/';
  const insets = useStableSafeAreaInsets();
  const globalBottomOverlay = useGlobalBottomOverlayOffset();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!effectiveShowOnboarding || onboardingComponent) return;
    let cancelled = false;
    // Потолок ожидания модуля: истёк — сплеш отпускаем, загрузку НЕ отменяем.
    const waitTimer = setTimeout(() => {
      if (cancelled) return;
      bootMark('onboarding module WAIT ELAPSED — сплеш отпущен, модуль ещё едет');
      setOnboardingWaitElapsed(true);
    }, ONBOARDING_MODULE_WAIT_MAX_MS);
    void import('../components/onboarding')
      .then(({ default: component }) => {
        if (cancelled) return;
        bootMark('onboarding module LOADED');
        setOnboardingComponent(() => component);
      })
      .catch((error) => {
        // The onboarding route remains recoverable on the next render/retry;
        // do not turn a deferred optional module into a boot crash.
        // зачем: запрет немого catch — провал этого импорта раньше не оставлял
        // НИ ОДНОГО следа, а держал сплеш вечно. Теперь причина видна всегда.
        if (cancelled) return;
        bootMark('onboarding module FAILED', String(error));
        DebugLogger.error(
          '_layout:onboarding_module',
          error instanceof Error ? error : new Error(String(error)),
          'warning',
        );
        setOnboardingWaitElapsed(true);
      });
    return () => {
      cancelled = true;
      clearTimeout(waitTimer);
    };
  }, [effectiveShowOnboarding, onboardingComponent]);

  useEffect(() => {
    setRootNavigationReady(true);
  }, []);

  // зачем: D108 — серверный каталог продажи косметики удалён вместе с косметикой:
  // старт больше не зовёт cosmeticAssetCatalogGet (минус вызов функции в сутки).

  useEffect(() => {
    const subscription = subscribeAccountGeneration((token) => {
      setAccountGeneration(token);
      setPersonalAdminMessage(null);
    });
    return () => subscription.remove();
  }, []);


  // зачем: D83 — клиентская Арена удалена целиком, прогрев её хаба при входе снят.


  useEffect(() => {
    if (accountGeneration.phase !== 'active' || !accountGeneration.stableId) return;
    const stableId = accountGeneration.stableId;
    void import('./feedback_outbox')
      .then(({ purgeExpiredFeedbackOutbox }) => purgeExpiredFeedbackOutbox(stableId))
      .catch(noteSwallowedHandler('_layout:useEffect.call_4'));
  }, [accountGeneration.phase, accountGeneration.stableId]);

  useEffect(() => {
    if (!appIsActive || accountGeneration.phase !== 'active' || !accountGeneration.stableId) return;
    const stableId = accountGeneration.stableId;
    void import('./support_report_outbox')
      .then(({ resumePendingSupportReports }) => resumePendingSupportReports(stableId))
      .catch(noteSwallowedHandler('_layout:useEffect.call_5'));
  }, [accountGeneration.phase, accountGeneration.stableId, appIsActive]);

  useEffect(() => {
    return subscribeFirebaseAuthUid(setSpireAuthenticatedUid);
  }, []);

  useEffect(() => {
    // зачем (Account V2, Пакет 6B, TG-F76EA3701B55): клиент V2 (outbox → сервер)
    // стартует только после входа (uid известен) и НЕ на первом кадре; при
    // выключенном флаге — ни require, ни чтений, ни сети. Смена uid (выход,
    // другой аккаунт) останавливает раннер и закрывает область старого uid.
    if (!ready || !firstContentReady) {
      if (__DEV__) console.log(`[ACCOUNT-V2] layout skip ready=${ready} firstContentReady=${firstContentReady}`);
      return;
    }
    syncAccountsV2ClientAuth(spireAuthenticatedUid);
    // зачем (ревью 6B, P3): флаг и возврат на передний план — в зависимостях:
    // поздний «Пульт» включает клиент, живое выключение его останавливает, а
    // возврат в приложение снимает залипшую паузу отправки (тот же uid → resume).
  }, [accountsV2ClientFlag, appIsActive, firstContentReady, ready, spireAuthenticatedUid]);

  useEffect(() => {
    // зачем (ревью 6B, P3): флаг читается из памяти ПОСЛЕ первого кадра и
    // перечитывается только по событию применения remote_config — без опроса.
    setAccountsV2ClientFlag(isAccountsV2ClientEnabled());
    const sub = onAppEvent('remote_config_changed', () => setAccountsV2ClientFlag(isAccountsV2ClientEnabled()));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const readiness = {
      authenticatedUid: spireAuthenticatedUid,
      appIsActive,
      stableUid: accountGeneration.stableId,
      accountPhase: accountGeneration.phase,
    };
    void import('../modules/spire/task_report_client')
      .then(({ canDrainSpireTaskReportOutbox, retryPendingSpireTaskReports }) => {
        if (!canDrainSpireTaskReportOutbox(readiness)) return undefined;
        return retryPendingSpireTaskReports(readiness.stableUid);
      })
      .catch(noteSwallowedHandler('_layout:useEffect.call_6'));
  }, [accountGeneration.phase, accountGeneration.stableId, appIsActive, spireAuthenticatedUid]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppIsActive(nextState === 'active');
      // зачем (баг серии 01.10): возврат из фона тоже отмечает день серии (раз в день).
      if (nextState === 'active') void touchStreakForToday('foreground');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (homePaintedForPhoneState) return;
    const sub = onAppEvent('app_home_screen_ready', () => {
      coldStartMark('phone_state.gate:home_painted', '_layout');
      setHomePaintedForPhoneState(true);
    });
    return () => sub.remove();
  }, [homePaintedForPhoneState]);

  useEffect(() => {
    if (homePaintedForPhoneState || !ready || !firstContentReady) return;
    const timer = setTimeout(() => {
      coldStartMark('phone_state.gate:fallback', '_layout', { afterMs: PHONE_STATE_BOOTSTRAP_FALLBACK_MS });
      setHomePaintedForPhoneState(true);
    }, PHONE_STATE_BOOTSTRAP_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [firstContentReady, homePaintedForPhoneState, ready]);

  useEffect(() => {
    // зачем: именно этот эффект поднимает мост phone-state, а без моста квота
    // карточек читается как 'unavailable' и кнопки тренировки молча мертвы.
    // Оба ранних выхода и падение bootstrap были НЕМЫМИ — причину не увидеть.
    if (!ready || !firstContentReady || !homePaintedForPhoneState) {
      console.log(`[FC-TRAIN-ENTRY] bootstrap:skip — ready=${ready}, firstContentReady=${firstContentReady}, homePainted=${homePaintedForPhoneState}`);
      return;
    }
    if (accountGeneration.phase !== 'active' || !accountGeneration.stableId) {
      console.log(`[FC-TRAIN-ENTRY] bootstrap:skip — phase="${accountGeneration.phase}", stableId=${accountGeneration.stableId ?? 'null'}`);
      return;
    }
    const token = accountGeneration;
    let cancelled = false;
    let uninstallSync: (() => void) | undefined;
    let cancelDeferredIntegrity: (() => void) | undefined;
    const bootstrapStartedAtMs = Date.now();
    console.log(`[FC-TRAIN-ENTRY] bootstrap:start stableId=${token.stableId} generation=${token.generation}`);
    coldStartMark('fc_train_entry.bootstrap:start', '_layout', { generation: token.generation });
    // Identity repair has already published this active generation. Bootstrap
    // resolves the provider anchor again inside its serialized boundary before
    // opening/importing; failures remain background-only and never block UI.
    void bootstrapPhoneState({ stableUid: token.stableId!, runtimeToken: token })
      .then((started) => {
        console.log(`[FC-TRAIN-ENTRY] bootstrap:ok started=${started} за ${Date.now() - bootstrapStartedAtMs}мс (started=false → lifecycle не сконфигурирован)`);
        coldStartMark('fc_train_entry.bootstrap:ok', '_layout', { started, totalMs: Date.now() - bootstrapStartedAtMs });
        return started;
      })
      .catch((error: unknown) => {
        console.warn(`[FC-TRAIN-ENTRY] bootstrap:FAILED за ${Date.now() - bootstrapStartedAtMs}мс —`,
          error instanceof Error ? `${error.name}: ${error.message}` : String(error));
        return false;
      })
      .then(async () => {
        if (cancelled || !isCurrentAccountGeneration(token, token.stableId)) return;
        await import('./level_spin_star_grants')
          .then(({ recoverAndHydrateLevelSpinStarGrants }) => (
            recoverAndHydrateLevelSpinStarGrants(token)
          ))
          .catch(noteSwallowedAs('_layout:useEffect.call_7', undefined));
        if (cancelled || !isCurrentAccountGeneration(token, token.stableId)) return;
        // The lifecycle additionally requires a matching hydrated runtime and
        // explicit rollout capability. Default remains off.
        uninstallSync = ensurePhoneStateSyncLifecycleInstalled({
          stableUid: token.stableId!,
        });
        cancelDeferredIntegrity = schedulePhoneStateDeferredIntegrityCheck(
          () => phoneStateBusyRoute(pathnameRef.current),
        );
      });
    return () => {
      cancelled = true;
      uninstallSync?.();
      cancelDeferredIntegrity?.();
    };
  }, [accountGeneration, firstContentReady, homePaintedForPhoneState, ready]);

  useEffect(() => {
    if (!ready || !firstContentReady || !appIsActive || effectiveShowOnboarding || isBanned) return;
    if (accountGeneration.phase !== 'active' || !accountGeneration.stableId) return;
    const token = accountGeneration;
    let cancelled = false;
    const forcedKey = token.stableId ?? '';
    const isLoginRefresh = !appMessagesForcedForStableIds.has(forcedKey);
    if (isLoginRefresh) appMessagesForcedForStableIds.add(forcedKey);
    console.log('[APP-MESSAGES-REFRESH]', JSON.stringify({
      mode: isLoginRefresh ? 'login_force' : 'foreground_interval',
      minIntervalMs: isLoginRefresh ? 0 : APP_MESSAGES_FOREGROUND_MIN_INTERVAL_MS,
    }));
    void refreshAppMessagesSnapshotOnce(isLoginRefresh
      ? { force: true }
      : { minIntervalMs: APP_MESSAGES_FOREGROUND_MIN_INTERVAL_MS })
      .then((snapshot) => {
        if (cancelled || !isCurrentAccountGeneration(token, token.stableId)) return;
        setPersonalAdminMessage(pickNextLoginPersonalMessage(snapshot));
        setAppMessageModalQueue(listPendingAppMessageModals(snapshot, hasPremiumAccess));
      })
      .catch(noteSwallowedHandler('_layout:useEffect.refreshAppMessagesSnapshotOnce'));
    return () => { cancelled = true; };
  }, [accountGeneration, appIsActive, effectiveShowOnboarding, firstContentReady, hasPremiumAccess, isBanned, ready]);

  useEffect(() => {
    // зачем: D70 + D84 (владелец 2026-09-30) — остаток жемчуга обнуляется только на
    // устройстве, одной операцией в локальном журнале. Не на первом кадре: модуль
    // грузится лениво через ~20 с и работает, только если баланс > 0.
    if (!ready || !firstContentReady || !appIsActive || effectiveShowOnboarding || isBanned) return;
    if (accountGeneration.phase !== 'active' || !accountGeneration.stableId) return;
    const token = accountGeneration;
    const timer = setTimeout(() => {
      void import('./pearl_retire_d70')
        .then(({ retireLocalPearlBalance }) => retireLocalPearlBalance(token))
        .catch((error: unknown) => {
          console.warn('[PEARL-RETIRE] catch step=lazy_import', error); // guard-ok: редкий отказ загрузки модуля
        });
    }, 20_000);
    return () => { clearTimeout(timer); };
  }, [accountGeneration, appIsActive, effectiveShowOnboarding, firstContentReady, isBanned, ready]);

  // зачем (D48, владелец): озвучку ТЕКУЩЕГО и СЛЕДУЮЩЕГО обычного урока (V1)
  // качаем тихо в фоне заранее, до входа в урок — чтобы к моменту открытия
  // диск уже был тёплым и первые фразы не звучали роботом expo-speech. НЕ на
  // первом кадре (D47/22.09 показал, чем это кончается для V2) — модуль
  // сам ждёт ~20 с внутри себя и качается ленивым import(), парсится только
  // когда таймер реально сработал, а не на этом рендере.
  useEffect(() => {
    if (!ready || !firstContentReady || !appIsActive || effectiveShowOnboarding || isBanned) return;
    void import('../hooks/phrase_audio_ahead_prefetch').then(
      ({ scheduleAheadPhraseAudioPrefetch }) => scheduleAheadPhraseAudioPrefetch(),
    ).catch((error: unknown) => {
      DebugLogger.error(
        'phrase_audio_ahead_prefetch:schedule',
        error instanceof Error ? error : new Error(String(error)),
        'warning',
      );
    });
  }, [appIsActive, effectiveShowOnboarding, isBanned, firstContentReady, ready]);

  const closePersonalAdminMessage = useCallback(async (messageId: string) => {
    const ownerUid = accountGeneration.stableId;
    setPersonalAdminMessage((current) => current?.id === messageId ? null : current);
    if (!ownerUid || !isCurrentAccountGeneration(accountGeneration, ownerUid)) return;
    await acknowledgePersonalAdminMessageModal(messageId, ownerUid).catch(noteSwallowedHandler('_layout:useCallback.acknowledgePersonalAdminMessageModal'));
  }, [accountGeneration]);

  const closeAppMessageModal = useCallback(async (messageId: string) => {
    const ownerUid = accountGeneration.stableId;
    setAppMessageModalQueue((current) => current.filter((message) => message.id !== messageId));
    if (!ownerUid || !isCurrentAccountGeneration(accountGeneration, ownerUid)) return;
    await acknowledgeAppMessageModal(messageId, ownerUid).catch(noteSwallowedHandler('_layout:useCallback.acknowledgeAppMessageModal'));
  }, [accountGeneration]);

  // Глобальная аудио-сессия на старте: озвучка должна играть ДАЖЕ при включённом
  // беззвучном режиме (mute-switch) на iPhone и независимо от того, какой путь
  // (OpenAI-клип или системный TTS) зазвучит первым. Раньше playsInSilentMode
  // выставлялся лениво и только в клип-пути, а expo-speech на iOS работает в
  // отдельной сессии — поэтому при беззвучном режиме звука не было совсем.
  // зачем (жалобы «пропадает озвучка», аудит 2026-09-15): аудиослой вообще не
  // реагировал на жизненный цикл приложения. Уход в фон (звонок, наушники,
  // переключение приложений) обрывает воспроизведение и запись, но счётчик
  // аренд аудиотракта оставался поднятым от прерванной попытки — и звук уже не
  // возвращался до перезапуска. При возврате на передний план приводим владение
  // в согласованное состояние: в здоровом случае (живых аренд нет) не делает
  // ничего и молчит.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      // Порядок важен: сперва штатно останавливаем владельцев (их stop() глушит
      // осиротевшее воспроизведение и снимает аренду через release), затем
      // подчищаем аренды, оставшиеся без владельца. Второй шаг в здоровом
      // состоянии не делает ничего и молчит.
      stopAllAudioOwnersOnResume();
      releaseStaleAudioActivity('app-foreground');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    void setManagedAudioMode(UI_SFX_AUDIO_MODE)
      .catch(noteSwallowedHandler('_layout:useEffect.setManagedAudioMode'));
    // зачем прогрев (аудит §R8, 2026-08-30): expo-audio не буферизует до
    // play(), и самый первый запуск каждого звука платил латентность создания
    // нативного плеера. Греем самые частые события сильно ПОСЛЕ старта
    // (3.5с — холодный старт и первый кадр уже позади), это ~5 лёгких
    // createAudioPlayer в фоне.
    //
    // зачем две волны (владелец 2026-09-03, «звуки играют с паузой»): прежде
    // ВСЁ грелось на 3.5с, а человек успевает нажать первую кнопку куда раньше
    // — и этот тап платил полную латентность создания плеера. Звуки нажатий
    // (самое частое, что слышно) греем на 1.2с: холодный старт и первый кадр
    // уже позади, а это всего три лёгких createAudioPlayer.
    const tapPrewarmTimer = setTimeout(() => {
      soundDirector.prewarm([
        'pm.ui.tap_soft',
        'pm.ui.tap_primary',
        'pm.ui.tap_blocked',
      ]);
    }, 1200);
    // Вторая волна — звуки урока и его завершения. Раньше здесь было 5 событий,
    // причём звуков награды и счётчика опыта среди них не было вовсе, хотя они
    // звучат в конце КАЖДОГО урока и по коду встречаются чаще прочих
    // (pm.reward.chest_open — самое частое событие в приложении).
    const prewarmTimer = setTimeout(() => {
      soundDirector.prewarm([
        'pm.complete.micro',
        'pm.reward.chest_open',
        'pm.reward.small',
        'pm.streak.saved',
      ]);
    }, 3500);
    return () => {
      clearTimeout(tapPrewarmTimer);
      clearTimeout(prewarmTimer);
    };
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
      // зачем (владелец 22.09, «урок открывается и сразу закрывается»): этот
      // слушатель зовёт router.push на нормализованный URL. Если он ложно
      // срабатывает на только что открытом маршруте сессии — это и есть
      // повторная навигация, которая рвёт одноразовый handoff моста
      // карта→сессия. Лог остаётся навсегда — печатаем исходный url ВСЕГДА,
      // не только когда target не пуст.
      if (__DEV__) {
        console.log(
          "[V2-PAGE] deeplink:url_event",
          // зачем (8H): значения параметров ссылки не печатаем (в них бывают пароли/токены).
          JSON.stringify({ url: maskDeepLinkForLog(url), target: maskDeepLinkForLog(target) }),
        );
      }
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
        traceLessonExit('layout:deeplink_dev_route_blocked_home', { target: maskDeepLinkForLog(target) });
        router.replace('/(tabs)/home');
        return;
      }
      router.replace(target as Href);
      const retry = setTimeout(() => router.replace(target as Href), 250);
      return () => clearTimeout(retry);
    }

    if (isTabsGroupRoutePath(target)) {
      traceLessonExit('layout:deeplink_tabs_replace', { target: maskDeepLinkForLog(target) });
      router.replace(target as Href);
      return;
    }

    // зачем (эмулятор 30.09): expo-router САМ открывает тёплую ссылку через
    // redirectSystemPath, а этот слушатель открывал её второй раз — в стеке
    // лежали две копии экрана. Первое «назад» снимало копию и выглядело
    // мёртвым, а у неизвестной ссылки нижняя заглушка +not-found оставалась
    // пустым экраном навсегда. Путь в этот момент ещё старый (замер: push шёл
    // при currentPath=/home), поэтому ждём и открываем сами, только если
    // навигация ссылку не открыла (онбординг, неготовый корень).
    const targetPath = target.split(/[?#]/)[0]?.replace(/\/$/, '') || '';
    // Таймер в ref, а не в cleanup эффекта: setPendingWarmDeepLink(null) выше
    // сразу перезапускает эффект, и cleanup снял бы ожидание до срабатывания.
    if (warmDeepLinkTimerRef.current) clearTimeout(warmDeepLinkTimerRef.current);
    warmDeepLinkTimerRef.current = setTimeout(() => {
      warmDeepLinkTimerRef.current = null;
      const currentPath = pathnameRef.current?.replace(/\/$/, '') || '';
      if (targetPath && targetPath === currentPath) {
        if (__DEV__) {
          console.log("[V2-PAGE] deeplink:skip_already_open", JSON.stringify({ target: maskDeepLinkForLog(target), currentPath }));
        }
        return;
      }
      if (__DEV__) {
        console.log("[V2-PAGE] deeplink:push", JSON.stringify({ target: maskDeepLinkForLog(target), currentPath }));
      }
      router.push(target as Href);
    }, WARM_DEEP_LINK_SELF_OPEN_WAIT_MS);
  }, [isBanned, pendingWarmDeepLink, ready, rootNavigationReady, router, showOnboarding]);

  useEffect(() => () => {
    if (warmDeepLinkTimerRef.current) clearTimeout(warmDeepLinkTimerRef.current);
  }, []);

  useEffect(() => {
    if (!ready || !rootNavigationReady || effectiveShowOnboarding || isBanned || !isRootIndexRoute) return;
    // зачем (§126, [LESSON-EXIT]): пользователя из урока выкидывало на главную без перезапуска процесса. isRootIndexRoute = !pathname ||
    // pathname === '/' — пустой pathname во время перехода тоже считается «корнем». Пишем значение, решившее ветку.
    traceLessonExit('layout:rootIndex_replace_home', {
      pathname: pathname === undefined ? 'undefined' : JSON.stringify(pathname),
      ready,
      rootNavigationReady,
      effectiveShowOnboarding,
      isBanned,
    });
    router.replace('/(tabs)/home');
    const retry = setTimeout(() => {
      traceLessonExit('layout:rootIndex_replace_home_retry', { pathname: pathname === undefined ? 'undefined' : JSON.stringify(pathname) });
      router.replace('/(tabs)/home');
    }, 120);
    return () => clearTimeout(retry);
  }, [effectiveShowOnboarding, isBanned, isRootIndexRoute, ready, rootNavigationReady, router]);

  // зачем (§126): момент, когда pathname становится пустым или '/', — прямая улика к выходу из урока (рядом пишется сам урок: unmount)
  useEffect(() => {
    if (pathname && pathname !== '/') return;
    traceLessonExit('layout:pathname_root_or_empty', {
      pathname: pathname === undefined ? 'undefined' : JSON.stringify(pathname),
      lastPath: lastPathRef.current ?? 'null',
      ready,
      rootNavigationReady,
    });
  }, [pathname]);

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

  // зачем (темы 2.0): сплеш уходит только когда прочитан выбор темы/оформления — иначе у
  // выбравших светлое первый кадр был бы тёмным. Чтение идёт параллельно, у флага потолок 400 мс.
  const nativeSplashCanHide = fontsReady && ready && liquidGlassChoiceReady
    && (effectiveShowOnboarding || isBanned || (firstContentReady && homeScreenReady));
  // зачем (трассировка 2026-08-31): печатаем, КАКОЙ из трёх флагов держит сплеш.
  // Без этого «висит 40 секунд» неотличимо от «ждём шрифты» / «ждём первый кадр».
  useEffect(() => {
    bootMark('splash gate', {
      fontsReady,
      ready,
      firstContentReady,
      homeScreenReady,
      effectiveShowOnboarding,
      isBanned,
      liquidGlassChoiceReady,
      canHide: nativeSplashCanHide,
    });
  }, [fontsReady, ready, firstContentReady, homeScreenReady, effectiveShowOnboarding, isBanned, liquidGlassChoiceReady, nativeSplashCanHide]);
  useEffect(() => {
    const sub = onAppEvent('app_home_screen_ready', () => setHomeScreenReady(true));
    return () => sub.remove();
  }, []);
  // зачем (владелец, 2026-09-21: «вход ДО 1 СЕКУНДЫ, мгновенно на 100%»):
  // homeScreenReady был ЕДИНСТВЕННЫМ флагом гейта без потолка времени. Все
  // соседи ограничены (ready — 6000, firstContentReady — 900, онбординг — 4000,
  // шрифты — 1000), а этот ждал события от Главной бесконечно. Событие шлёт
  // HomeScreenHost в (tabs)/_layout.tsx, и он монтируется только когда доедет
  // динамический чанк home.tsx — 5872 строки со 163 импортами. Пока чанк
  // грузится и вычисляется, сплеш держался, и остановить это было НЕЧЕМ.
  // Именно поэтому прошлые починки (потолки соседним флагам) не давали эффекта:
  // чинили не тот флаг.
  //
  // Потолок НЕ отменяет загрузку Главной — она продолжается, и экран дорисуется
  // сам. Снимается только право этой загрузки держать сплеш закрытым.
  useEffect(() => {
    if (homeScreenReady || effectiveShowOnboarding || isBanned) return;
    const timer = setTimeout(() => {
      bootMark('homeScreenReady FALLBACK fired (чанк Главной не доехал за потолок)');
      setHomeScreenReady(true);
    }, HOME_SCREEN_READY_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [homeScreenReady, effectiveShowOnboarding, isBanned]);
  useEffect(() => {
    if (!nativeSplashCanHide) return;
    bootMark('SplashScreen.hideAsync() — сплеш скрыт');
    void SplashScreen.hideAsync();
    resolveNativeSplashHidden();
    markNativeSplashHidden();
  }, [nativeSplashCanHide]);

  useEffect(() => {
    const sub = onAppEvent('app_first_content_ready', () => {
      bootMark('app_first_content_ready event received');
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
    const timer = setTimeout(() => {
      bootMark('firstContentReady FALLBACK fired (экран не прислал событие)');
      setFirstContentReady(true);
    }, FIRST_CONTENT_READY_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [effectiveShowOnboarding, firstContentReady, isBanned, ready]);

  useEffect(() => {
    if (!ready || effectiveShowOnboarding || isBanned || !firstContentReady || heavyInitStartedRef.current) return;
    heavyInitStartedRef.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // зачем: PM-211 — firstContentReady может прийти запасным таймером (400 мс) раньше,
    // чем доедет чанк Главной; тогда прогрев друзей/магазина/аналитики делил поток с её
    // первым кадром. Теперь ждём кадр Главной (или потолок 2,5 с), затем взаимодействия.
    const cancelDeferred = runAfterHomeFirstFrame('heavy_init', () => {
      timer = setTimeout(() => runHeavyInitRef.current?.(), 250);
    });
    return () => {
      if (timer) clearTimeout(timer);
      cancelDeferred();
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
      ]).catch(noteSwallowedHandler('_layout:useCallback.multiSet'));
    } catch (e) {
      // fail-soft: if check fails, do not block app
      DebugLogger.error('_layout:banned', e instanceof Error ? e : new Error(String(e)), 'warning');
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

  useEffect(() => installForegroundUsageMsTracker(), []);

  useEffect(() => {
    if (!ready || showOnboarding) {
      setReleaseNotesVariant(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          if (isReleaseNotesV2ReleaseActive()) {
            const offerV2 = await shouldOfferReleaseNotesV2Modal();
            if (!cancelled && offerV2) setReleaseNotesVariant('v2');
            return;
          }
          const offer = await shouldOfferReleaseNotesModal();
          if (!cancelled && offer) setReleaseNotesVariant('legacy');
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
    if (releaseNotesVariant === 'v2') {
      await dismissReleaseNotesV2ModalPermanently().catch(noteSwallowedHandler('_layout:useCallback.dismissReleaseNotesV2ModalPermanently'));
    } else {
      await dismissReleaseNotesModalPermanently();
    }
    setReleaseNotesVariant(null);
  }, [releaseNotesVariant]);

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
            syncToCloud().catch(noteSwallowedHandler('_layout:useEffect.syncToCloud'));
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
  // реальные значения («прыжок»). Отдельно от тяжёлого стартового прогрева контента (удалён, PM-210)
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

  // зачем: PM-210 — выключенный константой стартовый прогрев контента (карточки,
  // меню урока, слова за 8 с после старта) удалён целиком: мёртвая фоновая работа
  // с отложенным таймером. Лёгкий прогрев таба «Уроки» выше остаётся.
  useEffect(() => {
    const unsub = setupNotificationTapHandler(router);
    return unsub;
  }, [router]);

  const achievementFlushRunningRef = useRef(false);
  const achievementFlushQueuedRef = useRef(false);

  // PM-053: тост «Достижение разблокировано» удалён (владелец — «тосты тосты
  // тосты достижений»). Награда (legacy reward) начисляется в achievements.ts В МОМЕНТ
  // разблокировки, независимо от notified/показа — здесь только гасим
  // durable-долг «непоказанный тост», чтобы pending не копился вечно
  // (правило «празднование не ставится в durable-очередь»: показ можно не
  // делать, а не показанная запись не должна жить дальше первого прохода).
  // Вызывается сразу при старте и по событию 'achievement_unlocked' (DeviceEventEmitter).
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
          await markAchievementsNotified(pending.map(a => a.id)).catch(noteSwallowedHandler('_layout:useCallback.markAchievementsNotified'));
        }
      } while (achievementFlushQueuedRef.current);
    } finally {
      achievementFlushRunningRef.current = false;
    }
  }, []);

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
      .catch(noteSwallowedHandler('_layout:useEffect.call_8'));
    return () => { lifetime.dispose(); };
  }, []);

  useEffect(() => {
    const pathname =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.pathname
        : '';
    if (!shouldRunFullAppBootstrap(Platform.OS, __DEV__, pathname)) return;

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
    let closeStartupSettingsReadScope: (() => void) | null = null;

    // Remote Config: ссылку на отписку держим в scope эффекта.
    // effectDisposed нужен, т.к. import() резолвится асинхронно — к этому моменту
    // эффект мог уже размонтироваться, тогда подписку сразу закрываем.
    let effectDisposed = false;

    // Гидратация облака запускается рано (в bootstrap) и используется здесь,
    // чтобы остальной runHeavyInit ждал её завершения, а не дублировал.
    let cloudHydratePromise: Promise<BootCloudRestoreOutcome> | null = null;
    let bootRestoreFailureReason: CloudRestoreFailureReason | null = null;
    let contentDeliveryMigrationPromise: Promise<void> | null = null;
    const restoreCloudForBoot = async () => {
      await ensureAnonUser();
      void resumePendingOnboardingFunnel().catch(noteSwallowedHandler('_layout:restoreCloudForBoot.resumePendingOnboardingFunnel'));
      void resumePendingAgeConsent().catch(noteSwallowedHandler('_layout:restoreCloudForBoot.resumePendingAgeConsent'));
      const result = await restoreFromCloudWithRecoveryDetails(coldExamBestPctRestoreOptions);
      bootRestoreFailureReason = result.failureReason;
      // Тихий deferred link: дожимаем отложенную привязку в фоне. Успех →
      // журнал снят и тут же молча подтягиваем облако в этой же сессии.
      // Никакого UI: юзер не должен знать, что что-то догонялось.
      void processPendingAuthLink()
        .then((pendingResult) => (
          pendingResult === 'completed' ? restoreFromCloudDetailed().catch(noteSwallowedAs('_layout:restoreCloudForBoot.restoreFromCloudDetailed', 'failed')) : undefined
        ))
        .catch(noteSwallowedHandler('_layout:restoreCloudForBoot.processPendingAuthLink'));
      return result.status;
    };
    const runContentDeliveryMigration = (after?: Promise<unknown> | null): Promise<void> => {
      if (!contentDeliveryMigrationPromise) {
        contentDeliveryMigrationPromise = (async () => {
          // зачем (холодный старт п.2, «сперва логи»): видно, сколько миграция ждёт облако и сколько работает сама.
          const endWaitStep = coldStartStep('content_migration.wait_cloud', '_layout');
          if (after) await after.catch(noteSwallowedHandler('_layout:runContentDeliveryMigration.after'));
          endWaitStep(after ? 'ok' : 'no_wait');
          const endApplyStep = coldStartStep('content_migration.apply', '_layout');
          await applyContentDeliveryMigration().catch(noteSwallowedHandler('_layout:runContentDeliveryMigration.applyContentDeliveryMigration'));
          endApplyStep();
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
          // Remote Config: apply cached flags once at startup. Product decisions
          // must not keep a persistent server connection alive in the client.
      void import('./remote_config_client')
        .then((m) => {
          void m.loadRemoteConfig().catch(noteSwallowedHandler('_layout:runHeavyInit.loadRemoteConfig'));
        })
        .catch(noteSwallowedHandler('_layout:runHeavyInit.call'));
      // Идентификация PostHog для воронки (no-op без ключа/пакета, безопасна при любой сборке).
      void (async () => {
        try {
          const uid = await getCanonicalUserId().catch(noteSwallowedAs('_layout:runHeavyInit.getCanonicalUserId', null));
          if (uid) {
            const { identifyPostHog } = await import('./posthog_client');
            identifyPostHog(uid);
          }
        } catch (e) {
      // аналитика не должна ломать запуск
      DebugLogger.error('_layout:uid', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      })();
      void startFriendsTabSwrPrime().catch(noteSwallowedHandler('_layout:runHeavyInit.startFriendsTabSwrPrime'));
      const startShopWarm = async () => {
        if (!IS_EXPO_GO) void initRevenueCat();
        void prefetchMarketplacePacks().catch(noteSwallowedHandler('_layout:startShopWarm.prefetchMarketplacePacks'));
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
            .catch(noteSwallowedHandler('_layout:runHeavyInit.runContentDeliveryMigration'));
        });
      }

      if (!IS_EXPO_GO) {
        import('@react-native-firebase/crashlytics')
          .then(m => m.default().setCrashlyticsCollectionEnabled(
            // зачем (§126): dev-клиенты (горячая перезагрузка) не должны слать ошибки и падения в прод-проект Crashlytics
            !(typeof __DEV__ !== 'undefined' && __DEV__),
          ))
          .catch(noteSwallowedHandler('_layout:runHeavyInit.call_2'));
      }

      await AsyncStorage.multiSet([
        ['device_platform', Platform.OS],
        ['app_version', getInstalledAppVersion(Constants)],
      ]).catch(noteSwallowedHandler('_layout:runHeavyInit.multiSet'));

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
        // зачем (баг серии 01.10: на холодном старте updateStreak НЕ вызвался): временная
        // трассировка каждого шага пост-загрузки — какой шаг завис или упал до серии.
        const bootT0 = Date.now();
        const bootStep = (step: string) => console.log(`[STREAK] boot:step=${step} +${Date.now() - bootT0}ms`);
        bootStep('hydrate_done');
        // зачем (баг серии 01.10, §52 координатора): серия стартует СРАЗУ после гидрации и не
        // ждёт шагов старой экономики (осколки ждали 6+ с, их сбой/зависание отрезал серию).
        // Ждём её только перед отправкой в облако, чтобы туда ушло свежее значение.
        const streakBoot = (touchStreakForToday('cold_start') ?? Promise.resolve(-1))
          .then((streak) => bootStep(`after_updateStreak streak=${streak}`));
        await runContentDeliveryMigration().catch((error: unknown) => console.warn('[STREAK] boot:content_migration_failed', String(error)));
        bootStep('content_migration');
        const onboardingDoneAfterHydrate = await AsyncStorage.getItem('onboarding_done').catch(noteSwallowedAs('_layout:runHeavyInit.getItem', null));
        if (onboardingDoneAfterHydrate === '1') {
          void resumePendingGeneratedNickname();
        }
        // Одноразовая починка после релиза, в котором (tabs)/index.tsx
        // перестал уважать persistedUnlocked: подтягиваем lesson{N-1}_best_score
        // до 2.5 для уроков, которые в облаке уже значатся как открытые.
        // См. repairLessonUnlocksAfterRestore() и lesson_unlock_repair_v1 флаг.
        repairLessonUnlocksAfterRestore().catch(noteSwallowedHandler('_layout:runHeavyInit.repairLessonUnlocksAfterRestore'));
        // зачем (FINAL_PHASE п.4, §55 координатора): шаги жемчуга (осколков) убраны из
        // холодного старта — загрузка из облака (~6 с, чтения Firestore), дотягивание
        // оплаченных пакетов и событие баланса. Жемчуг удалён (D70/D84/D103: остаток и
        // купленное сгорают без компенсации). Монеты живут на счёте рун/звёзд и от этих
        // шагов не зависят; серверные события в этот журнал писали только турниры (сняты).
        bootStep('before_await_streak');
        // зачем: PM-210 — шаг миграции недельных очков лиги (пустая заглушка после
        // удаления лиг в 2.0) убран из пост-загрузочной цепочки: фоновой работы нет.
        await streakBoot.catch((error: unknown) => console.warn('[STREAK] boot:updateStreak_failed', String(error)));
        await runSessionChecks(studyTarget).catch(noteSwallowedHandler('_layout:runHeavyInit.runSessionChecks'));
        await flushPendingProgressEvents().catch(noteSwallowedHandler('_layout:runHeavyInit.flushPendingProgressEvents'));
        // Хвост C: не пушим в облако, если restore НЕ удался И локально нет осмысленного
        // прогресса — иначе пустые дефолты затрут реальный облачный аккаунт (переустановка).
        if (bootRestoreOutcome.shouldSync) {
          await syncToCloud().catch(noteSwallowedHandler('_layout:runHeavyInit.syncToCloud'));
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
          if (__DEV__) {
            console.warn('[STARTUP-RECOVERY] boot restore failed', {
              failureReason: bootRestoreFailureReason,
              presentation: recoveryPresentation,
              hasLocalAccountData: bootRestoreOutcome.hasLocalAccountData,
            });
          }
          if (recoveryPresentation === 'provider_reauth_modal') {
            if (!startupAuthRecoveryOfferedRef.current) {
              startupAuthRecoveryOfferedRef.current = true;
              setStartupAuthRecoveryVisible(true);
            }
          } else if (recoveryPresentation === 'cloud_unavailable_toast') {
            // зачем: эту ветку случайно снёс коммит e140ed18b (архив турниров,
            // 2026-08-23) — решение 'cloud_unavailable_toast' по-прежнему
            // вычислялось, но человек после переустановки видел пустой прогресс
            // без единого слова. Возвращаем исходный текст без обещания автоповтора.
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
        await ensureStableAuthLink().catch(noteSwallowedAs('_layout:runHeavyInit.ensureStableAuthLink', false));
        Promise.all([
          getVerifiedRealPremiumStatus().catch(noteSwallowedAs('_layout:runHeavyInit.getVerifiedRealPremiumStatus', false)),
          getVerifiedVipStatus().catch(noteSwallowedAs('_layout:runHeavyInit.getVerifiedVipStatus', false)),
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
          }).catch(noteSwallowedHandler('_layout:runHeavyInit.syncPublicProfileSnapshot'));
        }).catch(noteSwallowedHandler('_layout:runHeavyInit.all'));
        void import('./community_packs/communityModerationAlerts')
          .then((m) => m.flushCommunityModerationAlertsFromInbox())
          .catch(noteSwallowedHandler('_layout:runHeavyInit.call_3'));
        // зачем: PM-171 — раздел «Идеи» скрыт, runtime-прогрев уведомлений о решениях
        // по идеям (flushIdeaDecisionModals, Firestore-чтение idea_inbox на каждом
        // старте приложения) убран вместе с ним; app/idea_decision_modals.ts удалён.
        // iOS: инвайт-страница кладёт ссылку в буфер при переходе в App Store —
        // читаем ОДИН раз (бережём системный промпт вставки), потом применяем pending-код.
        // ВАЖНО: до 2026-07-04 checkClipboardForReferralOnce нигде не вызывался — весь
        // iOS-путь атрибуции рефералов был мёртвым кодом.
        void import('./referral_clipboard')
          .then((m) => m.checkClipboardForReferralOnce())
          .catch(noteSwallowedHandler('_layout:runHeavyInit.call_5'))
          .then(() => import('./referral_bootstrap'))
          .then((m) => m.tryApplyPendingReferral())
          .catch(noteSwallowedHandler('_layout:runHeavyInit.call_4'));
      }).catch(noteSwallowedHandler('_layout:runHeavyInit.hydrate'));

      AsyncStorage.getItem('install_date').then(val => {
        if (!val) {
          const installMs = Date.now();
          AsyncStorage.setItem('install_date', String(installMs)).catch(noteSwallowedHandler('_layout:runHeavyInit.setItem'));
        }
      }).catch(noteSwallowedHandler('_layout:runHeavyInit.getItem_2'));

      incrementSessionCount().catch(noteSwallowedHandler('_layout:runHeavyInit.incrementSessionCount'));
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          preloadDeferredNonPrimaryImages().catch(noteSwallowedHandler('_layout:runHeavyInit.preloadDeferredNonPrimaryImages'));
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
        void import('./flashcards_swipe').catch(noteSwallowedHandler('_layout:runHeavyInit.call_6'));
        import('./flashcards/useCollectionData')
          .then((m) => m.primeFlashcardsCollectionCache())
          .catch(noteSwallowedHandler('_layout:runHeavyInit.call_7'));
      });
      checkForUpdate().then(u => { if (u) setUpdateInfo(u); }).catch(noteSwallowedHandler('_layout:runHeavyInit.checkForUpdate'));
      prefetchEasUpdateAfterStartup().catch(noteSwallowedHandler('_layout:runHeavyInit.prefetchEasUpdateAfterStartup'));
    };

    const requestHeavyInit = () => {
      if (!recoveryBootAllowsCloud) {
        heavyInitRequestedWhileBlocked = true;
        return;
      }
      void runHeavyInit();
    };

    const bootstrap = async () => {
      if (authRecoveryBootstrapInFlight) {
        bootMark('bootstrap SKIPPED (already in flight)');
        return;
      }
      authRecoveryBootstrapInFlight = true;
      try {
      bootMark('bootstrap START -> ensureFreshPostDeletionIdentity');
      const freshIdentity = await ensureFreshPostDeletionIdentity('startup');
      bootMark('ensureFreshPostDeletionIdentity DONE', { status: freshIdentity.status, phase: 'phase' in freshIdentity ? String(freshIdentity.phase ?? '') : '' });
      const pendingDeleteRecovered = freshIdentity.status !== 'fatal_local_guard';
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
      bootMark('runAuthRecoveryBootGate START');
      const recoveryGate = await runAuthRecoveryBootGate({
        signal: authRecoveryBootAbort.signal,
      });
      bootMark('runAuthRecoveryBootGate DONE', recoveryGate);
      if (authRecoveryBootAbort === recoveryAbort) authRecoveryBootAbort = null;
      if (effectDisposed) return;
      if (recoveryGate.result !== 'proceed') {
        // зачем (владелец, 2026-09-22, «блокера не должно быть»): раньше этот
        // блок ОБРЫВАЛ старт (`return`) — приложение объявляло себя готовым, но
        // не доходило ни до getStableId, ни до гидратации, ни до облака.
        // Человек оставался с пустым каркасом и модалом поверх, а при
        // blocked_quarantined — навсегда, потому что повторная проверка давала
        // тот же вердикт. Это ровно тот же класс бага, что уже сняли выше для
        // замка удаления («Падаем дальше в обычный старт»).
        //
        // Теперь вердикт гейта НЕ приговор: он остаётся диагностикой, а старт
        // продолжается всегда. Изоляцию данных обеспечивает сам гейт
        // (invalidateAccountGeneration + beginPremiumAccountTransition), поэтому
        // при недоказанном владельце мы открываемся на чистой сессии, а не
        // отдаём чужой прогресс.
        console.warn(
          `[SWITCH-QUARANTINE] boot gate verdict=${recoveryGate.result} reason=${'reason' in recoveryGate ? String(recoveryGate.reason ?? 'null') : 'null'} -> вход продолжается, стены нет`,  // guard-ok: обязательная трассировка правила «сперва логи», нужна в проде
        );
        setReady(true);
        if (
          recoveryGate.result === 'blocked_transient'
          && scheduleAuthRecoveryBootRetry()
        ) return;
        clearAuthRecoveryBootRetry();
        // зачем: восстановление входа предлагаем, но НЕ как стену — это
        // закрываемое окно поверх работающего приложения. Человек может его
        // отклонить и пользоваться дальше.
        if (!startupAuthRecoveryOfferedRef.current) {
          startupAuthRecoveryOfferedRef.current = true;
          setStartupAuthRecoveryVisible(true);
        }
        // Падаем дальше в обычный старт — без return и без экрана-стены.
      } else {
        clearAuthRecoveryBootRetry();
      }
      let startupStableId: string;
      try {
        bootMark('getStableId START');
        startupStableId = await getStableId();
        bootMark('getStableId DONE');
      } catch (identityError) {
        bootMark('getStableId THREW -> setReady(true), early return', String(identityError));
        // зачем (аудит 2026-08-29, вечный сплеш): застрявший замок удаления
        // заставлял getStableId бросать account_delete_identity_quarantined,
        // бросок пролетал мимо внутреннего catch (он парен с try ниже), внешний
        // try закрыт только finally — setReady(true) не наступал НИКОГДА, и
        // человек висел на заставке вечно; переустановка не лечит (Keychain).
        // Теперь идём тем же graceful-путём, что recoveryGate!=proceed выше:
        // приложение открывается и предлагает восстановление входа.
        // зачем БЕЗ ШТОРКИ (владелец, 2026-08-31): вчерашний фикс вечного
        // сплеша поднимал здесь окно «Всё в безопасности», и на iOS оно
        // вылезало ПРИ КАЖДОМ запуске — гонка чтения Keychain повторяется на
        // каждом холодном старте. Человек ничего не удалял и не терял: замка
        // мы не видели, идентичность на месте. Приложение обязано просто
        // открыться молча; след остаётся в журнале, а не в лице пользователя.
        DebugLogger.error(
          '_layout:startup_stable_id',
          identityError instanceof Error ? identityError : new Error(String(identityError)),
          'warning',
        );
        setReady(true);
        return;
      }
      beginInitialAccountGeneration(startupStableId);
      recoveryBootAllowsCloud = true;
      // зачем 1200 → 600 (владелец, 2026-09-21, вход до 1 секунды): внешний
      // дедлайн теперь 1000 мс, поэтому страховка на 1200 не успевала сработать
      // НИКОГДА — она превратилась в мёртвый код. Оставляем её живой и полезной:
      // взводится после трёх await, поэтому 600 мс отпускают экран заметно
      // раньше общего потолка, когда затык случился именно здесь.
      safetyTimer = setTimeout(() => setReady(true), 600);
      onboardingPathRef.current = false;
      deferLessonPrimeRef.current = false;
      const forceOnboardingForQA = isForcedOnboardingForQaRuntime();

      // Чтение onboarding_done стартует параллельно с локальной гидрацией,
      // чтобы первый кадр не ждал дополнительный дисковый round-trip.
      const startupIdentityKeys = forceOnboardingForQA ? [] : ['onboarding_done'];
      const startupIdentityPairsPromise: Promise<readonly [string, string | null][]> =
        AsyncStorage.multiGet(startupIdentityKeys).catch(noteSwallowedAs('_layout:bootstrap.multiGet', []));

      // Start cloud hydration early, but do not hold the first app frame on network.
      // зачем: прежде восстановление из облака ждало прогрев App Check до 1,2 с;
      // App Check снят навсегда (пломба владельца 2026-08-17, аудит E24).
      if (!IS_EXPO_GO && !forceOnboardingForQA) {
        const bootCoordinator = createBootCloudRestoreCoordinator({
          restore: () => restoreCloudForBoot(),
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
      closeStartupSettingsReadScope?.();
      const startupSettingsGeneration = captureAccountGeneration();
      const startupSettingsReadScope = createSettingsBootReadScope(() =>
        !effectDisposed && !!startupSettingsGeneration.stableId
        && isCurrentAccountGeneration(startupSettingsGeneration));
      closeStartupSettingsReadScope = () => startupSettingsReadScope.close();
      const startupLocalHydration = Promise.all([
        primeAppSnapshotFromStorage(studyTarget, startupSettingsReadScope).catch(noteSwallowedHandler('_layout:bootstrap.primeAppSnapshotFromStorage')),
        primeSurveyOfferCacheFromStorage().catch(noteSwallowedHandler('_layout:bootstrap.primeSurveyOfferCacheFromStorage')),
        // зачем: общий снапшот остальных экранов (стрик, рефералы, топ помощников,
        // аналитика, план, разбор, подписка, видео, сезон). Владелец потребовал, чтобы
        // НИ ОДИН экран не показывал скелетон. Это ОДНО чтение диска на все экраны
        // сразу — в той же параллельной пачке, поэтому запуск не удлиняется.
        primeScreenSnapshotsFromStorage().catch(noteSwallowedHandler('_layout:bootstrap.primeScreenSnapshotsFromStorage')),
        // зачем (ускорение сплэша): сегодняшняя «фраза дня» из peek-кэша — чтобы
        // первый кадр Главной НЕ поднимал каталог идиом (610 КБ JS) синхронно.
        hydrateDailyPhrasePeekFromStorage().catch(noteSwallowedHandler('_layout:bootstrap.hydrateDailyPhrasePeekFromStorage')),
        hydrateYoutubeChannelPreference().catch(noteSwallowedHandler('_layout:bootstrap.hydrateYoutubeChannelPreference')),
        // зачем: кэш статистики УЖЕ лежал на диске, но поднимался только внутри
        // streak_stats.loadAll() — то есть после первого кадра, поэтому экран стрика
        // успевал показать скелетон на весь экран. Поднимаем здесь: к моменту тапа
        // данные в памяти, statsReady=true с первого кадра. Лишних чтений нет —
        // экран всё равно звал эту же функцию, просто позже.
        hydrateStatsCacheFromStorage().catch(noteSwallowedHandler('_layout:bootstrap.hydrateStatsCacheFromStorage')),
        primeRemoteConfigCacheFromStorage().catch(noteSwallowedHandler('_layout:bootstrap.primeRemoteConfigCacheFromStorage')),
        hydrateUserSettingsFromStorage(startupSettingsReadScope).catch(noteSwallowedHandler('_layout:bootstrap.hydrateUserSettingsFromStorage')),
        hydrateHapticsTapFromStorage().catch(noteSwallowedHandler('_layout:bootstrap.hydrateHapticsTapFromStorage')),
        // Уведомления гидрируются при входе в их раздел/пост-стартовой проверке.
        // Не поднимаем весь notifications.ts на splash: это не нужно для первого кадра.
        // Согласие на аналитику — гидрируем ДО первого события, чтобы гейт
        // (firebase.ts logEvent / posthog capture) работал с первого кадра.
        hydrateAnalyticsConsentFromStorage().catch(noteSwallowedHandler('_layout:bootstrap.hydrateAnalyticsConsentFromStorage')),
        // Согласие на AI-разбор ошибок — гидрируем ДО первого урока, чтобы
        // use_mistake_explain.ts не мигал с idle → gate на первом кадре.
        hydrateAiExplainConsentFromStorage().catch(noteSwallowedHandler('_layout:bootstrap.hydrateAiExplainConsentFromStorage')),
        // Согласие на AI-диалоги — гидрируем ДО первого входа в диалог.
        hydrateAiDialogConsentFromStorage().catch(noteSwallowedHandler('_layout:bootstrap.hydrateAiDialogConsentFromStorage')),
        // Возрастная группа — для безопасного режима (фичи-гейты) с первого кадра.
        hydrateAgeGateFromStorage().catch(noteSwallowedHandler('_layout:bootstrap.hydrateAgeGateFromStorage')),
      ]);
      // The 350ms race does not cancel hydration. Retain the scope until the
      // original work actually settles; never defer either settings reader.
      void startupLocalHydration.then(
        () => startupSettingsReadScope.close(),
        () => startupSettingsReadScope.close(),
      );
      bootMark('startupLocalHydration RACE START (budget 350ms)');
      await Promise.race([
        startupLocalHydration,
        new Promise<void>((resolve) => setTimeout(resolve, 350)),
      ]).catch(noteSwallowedHandler('_layout:bootstrap.race'));
      bootMark('startupLocalHydration RACE DONE');
      void startupLocalHydration.catch(noteSwallowedHandler('_layout:bootstrap.startupLocalHydration'));
      // зачем (Q106, координатор §62): достижения shards_100…10000 («Монетная заначка») по
      // названию про монеты, а считались по удалённому жемчугу. Теперь — баланс монет (руны,
      // локальная проекция, без Firestore). Номера достижений прежние.
      // зачем: PM-211 — проверка достижений не нужна первому кадру; раньше она стартовала
      // здесь, до setReady, и делила JS-поток и диск с ещё не нарисованной Главной.
      runAfterHomeFirstFrame('achievements_coins_boot_check', () => getStableId()
        .then(() => getRunesBalanceRead())
        .then((read) => checkAchievements({ type: 'shards', balance: read.wallet.balance }))
        .catch((error: unknown) => console.warn('[ACHIEVEMENTS] coins_boot_check_failed', String(error))));
      // зачем (§142, правило владельца «каждый раздел открывается мгновенно»): окно Plus открывается
      // сразу (02a922192), но цены читались с диска уже после показа. Кэш цен читаем в память фоном
      // после первого кадра — только диск, без сети; модуль подгружаем динамически, не в старт.
      runAfterHomeFirstFrame('paywall_price_cache_warmup', () => import('./paywall_price_cache')
        .then(({ hydratePaywallPriceCache }) => hydratePaywallPriceCache())
        .then((cache) => {
          const plans = cache ? [cache.yearly, cache.monthly].filter(Boolean).length : 0;
          console.warn(cache ? `[PAYWALL] цены прогреты: из кэша ${plans}` : '[PAYWALL] цены прогреты: нет кэша'); // guard-ok: одна строка на запуск, цепочка [PAYWALL]
        })
        .catch((error: unknown) => console.warn('[PAYWALL] цены: прогрев не удался', String(error)))); // guard-ok: одна строка на запуск
      // зачем (04.10, удаление карточки из опубликованного набора): запись, не отправленная до закрытия
      // приложения, уходит при следующем входе. Одно чтение диска после первого кадра; сеть — только если
      // очередь не пуста. Модуль грузится динамически, не в старт.
      // зачем (замер №5/№6): на старте отправка шла 2–5 с в общей очереди AsyncStorage и мешала Главной; записи
      // там бывают только если приложение закрыли посреди окна «Вернуть» — ей не нужно спешить. 20 с после
      // сплеша — одно чтение уже в спокойное время.
      runAfterHomeFirstFrame('published_pack_card_remove_flush', () => new Promise<void>((resolve) => {
        setTimeout(resolve, 20_000);
      }).then(() => import('./community_packs/publishedPackCardRemoval'))
        .then(({ flushPublishedPackCardRemovals }) => flushPublishedPackCardRemovals())
        .catch((error: unknown) => console.warn('[PACK-CARD-REMOVE] flush на входе не удался', String(error)))); // guard-ok: одна строка на запуск

      let shouldPrimeLessonsAfterReveal = false;
      try {
        const startupIdentityPairs = await startupIdentityPairsPromise;
        const startupIdentity = new Map(startupIdentityPairs);
        const val = forceOnboardingForQA ? null : (startupIdentity.get('onboarding_done') ?? null);

        // зачем (аудит скорости 2026-08-22): ожидание Play Install Referrer
        // (await с гонкой setTimeout 2000мс) стояло ДО setReady(true) и держало
        // сплэш до 2 секунд дольше на первом запуске Android. Колбэк при этом
        // ВСЕГДА резолвился false — управление потоком от него не зависело,
        // а код реферала и так уходит в фон через captureReferralCodeIfNew.
        // Оставляем захват кода фоновым, первый кадр больше не ждёт сеть Play.
        if (!val && Platform.OS === 'android' && !IS_EXPO_GO) {
          try {
            PlayInstallReferrer.getInstallReferrerInfo((details: any, error: any) => {
              if (!error && details?.installReferrer) {
                const ir = String(details.installReferrer);
                const refM = ir.match(/(?:^|[&])ref=([A-Z0-9]{4,12})/i);
                if (refM?.[1]) {
                  void import('./referral_bootstrap')
                    .then((m) => m.captureReferralCodeIfNew(refM[1].trim().toUpperCase(), 'play_install'))
                    .catch(noteSwallowedHandler('_layout:bootstrap.call'));
                }
              }
            });
          } catch (e) {
      // Модуль реферера недоступен (нестандартная сборка) — не критично.
      DebugLogger.error('_layout:refM', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        }

        const willShowOnboarding = forceOnboardingForQA || !val;
        onboardingPathRef.current = willShowOnboarding;
	        if (willShowOnboarding) {
	          deferLessonPrimeRef.current = true;
	        } else {
            shouldPrimeLessonsAfterReveal = true;
	        }

        setShow(willShowOnboarding);
      } catch (e) {
        if (__DEV__) console.warn('[_layout]', e);
      }

      const iconFontsReady = preloadVectorIconFonts();
      void iconFontsReady.catch(noteSwallowedHandler('_layout:bootstrap.iconFontsReady'));
      // зачем (холодный старт п.2, «сперва логи»): сколько фоновые работы до setReady делят JS-поток и диск
      // с первым кадром — по этим цифрам решаем, что переносить в runAfterHomeFirstFrame.
      const endPrimaryImagesStep = coldStartStep('pre_ready.primary_tab_images', '_layout');
      void preloadPrimaryTabImages()
        .then(() => endPrimaryImagesStep(), (error: unknown) => {
          endPrimaryImagesStep('failed');
          noteSwallowedHandler('_layout:bootstrap.preloadPrimaryTabImages')(error);
        });
      // Немой catch запрещён: если посев озвучки падает или висит, занятия
      // молча остаются без звука, и узнать об этом неоткуда (владелец 21.09 —
      // прогрев занятия 2 не давал ни готовности, ни ошибки).
      // зачем (координатор 04.10, холодный старт п.2; замер «до»): посев озвучки грузит все 27 ассетов и
      // готовит их байты в 4 потока — 8,1/12,6/8,1 с на JS-потоке ровно поверх первого кадра Главной (корень
      // молчал 4,3 с после setReady). Занятию посев заранее не нужен — оно готовит свою озвучку само по
      // запросу, — поэтому посев идёт после первого кадра Главной.
      // Замер «после» (04.10): событие оболочки вкладок отпускало посев на 1–5 с РАНЬШЕ настоящего кадра ленивой
      // Главной — ждём сам кадр (HOME-PAINT), потолок 15 с, чтобы посев не потерялся.
      runAfterHomeFirstFrame('v2_audio_seed', () => Promise.all([
        whenHomePainted(15_000),
        whenNativeSplashHidden(15_000),
      ]).then(([paintWait, splashWait]) => {
        const endAudioSeedStep = coldStartStep(`after_home.v2_audio_seed[${paintWait},${splashWait}]`, '_layout');
        return seedLearningV2BootstrapAudioCacheV1().catch((error) => {
          if (__DEV__) {
            console.log('[V2-AUDIO-SEED] failed', JSON.stringify({ reason: String(error) }));
          }
          DebugLogger.warn('[V2-AUDIO-SEED]', `bootstrap seed failed: ${String(error)}`);
          return 'failed' as const;
        }).then((outcome) => endAudioSeedStep(outcome === 'failed' ? 'failed' : 'ok'));
      }));

      if (safetyTimer) clearTimeout(safetyTimer);
      bootMark('setReady(true) — bootstrap COMPLETE');
      setReady(true);
      setTimeout(flushPending, 280);
      if (shouldPrimeLessonsAfterReveal) {
        InteractionManager.runAfterInteractions(() => {
          void runContentDeliveryMigration(cloudHydratePromise)
            .then(() => primeAllLessonsFromStorageOnAppLaunch(studyTarget))
            .catch(noteSwallowedHandler('_layout:bootstrap.runContentDeliveryMigration'));
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
          if (state === 'active') {
            void ensureFreshPostDeletionIdentity('foreground');
            authRecoveryBootRetryScheduler.triggerActive();
          }
        });
      }
      return true;
    };

    runHeavyInitRef.current = requestHeavyInit;
    // зачем (владелец, 2026-09-14: «вход зависает на сплеше иногда на минуту»):
    // ЖЁСТКИЙ потолок на право показать первый кадр. Внутренний safetyTimer
    // (1200 мс) взводится ПОСЛЕ трёх последовательных await — то есть уже после
    // того, как зависание случилось, и не защищает ни от чего. Замер 2026-09-14
    // подтвердил: здоровый старт укладывается в ~2.1 с, а патологический
    // складывает 20 с (waitForFirebaseAuthUid) + 23 с (поллинг удаления) +
    // неограниченный App Check внутри цикла фаз, и ретрай прогоняет всё заново.
    //
    // Дедлайн НЕ отменяет стартовую работу: bootstrap продолжает выполняться и
    // досыпает состояние через обычную гидрацию и события. Он снимает только
    // право этой работы держать экран закрытым. Промах дедлайна логируем —
    // это редкий и важный факт, молчать о нём нельзя.
    const bootstrapReadyDeadline = setTimeout(() => {
      bootMark('bootstrap DEADLINE — setReady(true) по потолку, работа идёт фоном');
      DebugLogger.error(
        '_layout:bootstrap_deadline',
        new Error(`bootstrap_exceeded_${BOOTSTRAP_READY_DEADLINE_MS}ms`),
        'warning',
      );
      setReady(true);
    }, BOOTSTRAP_READY_DEADLINE_MS);
    void bootstrap().finally(() => clearTimeout(bootstrapReadyDeadline));

    // Event-driven flush: слушаем событие от achievements.ts вместо polling каждые 4с.
    // Это убирает блокировку JS-потока во время навигационных переходов на слабых устройствах.
    const sub = onAppEvent('achievement_unlocked', () => {
      setTimeout(flushPending, 200);
    });
    // зачем (Q106): «Монетная заначка» следит за балансом монет, а не жемчуга.
    const subShards = onAppEvent('runes_balance_updated', ({ balance }) => {
      if (typeof balance !== 'number') return;
      checkAchievements({ type: 'shards', balance })
        .catch((error: unknown) => console.warn('[ACHIEVEMENTS] coins_check_failed', String(error)));
    });
    const subForeground = onAppEvent('foreground_usage_changed', ({ totalMs }) => {
      void checkAchievements({ type: 'foreground_usage', totalMs });
    });
    const subDelete = onAppEvent('account_deleted', () => {
      traceAccountDeleteUi('root_event_received');
      // После первого онбординга refs = true; без сброса повторное завершение
      // (Apple/Google/«Позже» на шаге auth) вызывает handleOnboardingDone → ранний return → экран не уходит.
      onboardingDoneHandledRef.current = false;
      // Удаление аккаунта = ЧИСТЫЙ старт: AsyncStorage.clear() снёс onboarding_step/done/nickname,
      // значит и React-флаги онбординга надо вернуть к исходному. Иначе залипший
      // onboardingStartAtName=true (от прошлого пейвол-события nickname_ready) монтирует
      // новый онбординг сразу на шаге «имя» — минуя план/пейвол/порядок шагов.
      setOnboardingStartAtName(false);
      setOnboardingPaywallActive(false);
      // Destroy all native modal/pageSheet presentations in one React commit.
      // This is the deterministic reset; router.replace also normalizes the URL
      // underneath the clean onboarding for when onboarding later completes.
      setAccountDeletionNavigationEpoch((value) => value + 1);
      traceAccountDeleteUi('native_stack_reset_requested');
      try {
        router.dismissAll();
        traceAccountDeleteUi('native_sheets_dismiss_requested');
      } catch {
        traceAccountDeleteUi('native_sheets_dismiss_failed');
      }
      try {
        router.replace('/(tabs)/home' as never);
        traceAccountDeleteUi('home_replace_requested');
      } catch {
        traceAccountDeleteUi('home_replace_failed');
      }
      setShow(true);
      traceAccountDeleteUi('onboarding_show_requested');
    });
    const subRetiredIdentity = onAppEvent('identity_retired', ({ subject }) => {
      void ensureFreshPostDeletionIdentity('identity_retired', { subject });
    });
    return () => {
      effectDisposed = true;
      closeStartupSettingsReadScope?.();
      authRecoveryBootAbort?.abort();
      authRecoveryBootAbort = null;
      clearAuthRecoveryBootRetry();
      if (safetyTimer) clearTimeout(safetyTimer);
      // зачем: дедлайн первого кадра обязан умереть вместе с эффектом — иначе
      // выстрелит setReady(true) в уже размонтированном дереве (утечка + warn).
      clearTimeout(bootstrapReadyDeadline);
      if (accountDeleteRecoveryRetryTimer) clearTimeout(accountDeleteRecoveryRetryTimer);
      runHeavyInitRef.current = null;
      sub.remove();
      subShards.remove();
      subForeground.remove();
      subDelete.remove();
      subRetiredIdentity.remove();
    };
  }, [coldExamBestPctRestoreOptions, flushPending]);

  useEffect(() => {
    if (!showOnboarding || accountDeletionNavigationEpoch < 1) return;
    traceAccountDeleteUi('onboarding_render_committed');
    finishAccountDeleteUiTrace('onboarding_visible');
  }, [accountDeletionNavigationEpoch, showOnboarding]);

  useEffect(() => {
    const sub = onAppEvent('notif_permission_nudge', async ({ missedDays }) => {
      if (missedDays <= 0) return;
      const [status, enabled, lastShownRaw] = await Promise.all([
        loadNotificationsModule()
          .then(({ isNotificationPermissionGranted }) => isNotificationPermissionGranted())
          .catch(noteSwallowedAs('_layout:useEffect.loadNotificationsModule', false)),
        AsyncStorage.getItem('notifications_enabled'),
        AsyncStorage.getItem('notif_permission_nudge_last_day'),
      ]);
      if (status || enabled === 'true') return;
      const todayKey = new Date().toISOString().split('T')[0];
      if (lastShownRaw === todayKey) return;
      setNotifNudgeMissedDays(missedDays);
      setNotifNudgeVisible(true);
      await AsyncStorage.setItem('notif_permission_nudge_last_day', todayKey).catch(noteSwallowedHandler('_layout:useEffect.setItem'));
    });
    return () => sub.remove();
  }, []);

  // Вызывается из онбординга при выборе языка — синхронизирует контекст
  const handleLangSelect = useCallback(async (lng: Lang) => {
    await setLang(lng);
  }, [setLang]);

  const hasVerifiedRealPremiumOrVip = useCallback(async () => {
    if (hasPremiumAccess) return true;
    const [realPremium, vip] = await Promise.all([
      getVerifiedRealPremiumStatus().catch(noteSwallowedAs('_layout:useCallback.getVerifiedRealPremiumStatus', false)),
      getVerifiedVipStatus().catch(noteSwallowedAs('_layout:useCallback.getVerifiedVipStatus', false)),
    ]);
    return realPremium || vip;
  }, [hasPremiumAccess]);

  const closeIntroFullAccessModal = useCallback(async (action: 'primary' | 'secondary') => {
    const variant = introFullAccessModal;
    if (!variant) return;
    if (variant === 'welcome') {
      await markIntroFullAccessWelcomeSeen().catch(noteSwallowedHandler('_layout:useCallback.markIntroFullAccessWelcomeSeen'));
      setIntroFullAccessModal(null);
      return;
    }

    await markIntroFullAccessEndedSeen().catch(noteSwallowedHandler('_layout:useCallback.markIntroFullAccessEndedSeen'));
    setIntroFullAccessModal(null);
    if (action === 'primary') {
      // Воронка: пользователь решил продолжить в полном доступе — ведём на пейвол.
      void import('./analytics').then(({ trackEvent }) => trackEvent('intro_ended_cta', {})).catch(noteSwallowedHandler('_layout:useCallback.call'));
      void import('./firebase').then(({ logIntroEndedCta }) => logIntroEndedCta()).catch(noteSwallowedHandler('_layout:useCallback.call_2'));
      // Прокидываем личные данные, чтобы пейвол показал персональную строку
      // («уже твоё: серия N · …»). Без них пейвол даёт корректный gain-фоллбэк.
      const streakCount = parseInt((await AsyncStorage.getItem('streak_count').catch(noteSwallowedAs('_layout:useCallback.getItem', null))) || '0', 10) || 0;
      // replace на пейвол = всегда mark, иначе источник остаётся в стеке «назад» → петля.
      markNextNavigationAsReplace();
      router.replace({
        pathname: '/premium_modal',
        params: { context: 'intro_ended', source: 'intro_ended', streak: String(streakCount) },
      } as any);
    } else {
      // Воронка: закрыл модалку конца интро без перехода на пейвол.
      void import('./analytics').then(({ trackEvent }) => trackEvent('intro_ended_dismiss', {})).catch(noteSwallowedHandler('_layout:useCallback.call_3'));
      void import('./firebase').then(({ logIntroEndedDismiss }) => logIntroEndedDismiss()).catch(noteSwallowedHandler('_layout:useCallback.call_4'));
    }
  }, [introFullAccessModal, router]);

  const checkIntroFullAccessEndedModal = useCallback(async () => {
    if (!ready || effectiveShowOnboarding || isBanned || !firstContentReady) return;
    const state = await getIntroFullAccessState().catch(noteSwallowedAs('_layout:useCallback.getIntroFullAccessState', null));
    if (!state?.expiredUnseen) return;
    if (await hasVerifiedRealPremiumOrVip()) {
      await markIntroFullAccessEndedSeen().catch(noteSwallowedHandler('_layout:useCallback.markIntroFullAccessEndedSeen_2'));
      return;
    }
    if (state?.expiredUnseen) {
      setIntroFullAccessModal('ended');
      // Воронка: показана модалка «72 часа закончились» — главный момент конверсии.
      void import('./analytics').then(({ trackEvent }) => trackEvent('intro_ended_shown', {})).catch(noteSwallowedHandler('_layout:useCallback.call_5'));
      void import('./firebase').then(({ logIntroEndedShown }) => logIntroEndedShown()).catch(noteSwallowedHandler('_layout:useCallback.call_6'));
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
    try {
      const { shouldShowWinback, markWinbackShown, recordLastActive } = await import('./winback_offer');
      const isPremium = await hasVerifiedRealPremiumOrVip();
      const nowMs = Date.now();
      // intro ещё не закрыт → его модалка важнее, winback пропускаем (активность всё равно фиксируем)
      const introState = await getIntroFullAccessState().catch(noteSwallowedAs('_layout:useCallback.getIntroFullAccessState_2', null));
      const introPending = introState?.expiredUnseen === true;

      const show = !introPending && (await shouldShowWinback({ isPremium, nowMs }));
      if (show) {
        // Сначала навигация, потом отметка — если push упадёт, не «сжигаем» окно winback.
        globalRouter.push({ pathname: '/premium_modal', params: { context: 'winback', source: 'winback' } } as Href);
        await markWinbackShown(nowMs);
        await import('./analytics').then(({ trackEvent }) => trackEvent('winback_shown', {})).catch(noteSwallowedHandler('_layout:useCallback.call_7'));
        void import('./firebase').then(({ logWinbackShown }) => logWinbackShown()).catch(noteSwallowedHandler('_layout:useCallback.call_8'));
      }
      // фиксируем активность ПОСЛЕ оценки
      await recordLastActive(nowMs);
    } catch (e) {
      // no-op
      DebugLogger.error('_layout:show', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
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
    // Всё, что освобождает интерфейс, выполняется до любых сетевых/entitlement
    // ожиданий. Даже если RevenueCat, VIP-проверка или intro grant зависнут,
    // сохранённый onboarding_done уже приводит пользователя на Home.
    try {
      armPostOnboardingGoldBridge();
      if (firstContentReadyTimerRef.current) {
        clearTimeout(firstContentReadyTimerRef.current);
        firstContentReadyTimerRef.current = null;
      }
      setFirstContentReady(true);
      traceLessonExit('layout:onboardingDone_replace_home', {});
      router.replace('/(tabs)/home');
      setTimeout(() => router.replace('/(tabs)/home'), 120);
    } finally {
      // Снимаем оверлей ПОСЛЕ commit навигации. finally гарантирует выход даже
      // при синхронной ошибке подготовки Home.
      setTimeout(() => {
        setShow(false);
        emitAppEvent('onboarding_completed');
      }, 60);
    }
    // зачем: тёплое приветствие строго один раз за жизнь аккаунта — не
    // используем отдельный гард, чтобы приветствие не повторялось в той же установке.
    void (async () => {
      const alreadyWelcomed = await AsyncStorage.getItem('pm_app_welcome_played_v1').catch(noteSwallowedAs('_layout:useCallback.getItem_2', null));
      if (alreadyWelcomed === '1') return;
      await AsyncStorage.setItem('pm_app_welcome_played_v1', '1').catch(noteSwallowedHandler('_layout:useCallback.setItem'));
      soundDirector.request('pm.app.welcome', { scope: 'onboarding-welcome' });
    })();
    // Не показываем тутор энергии на «Главной» одновременно с этим листом (ждём «Позже» или возврат с урока)
    setDeferEnergyOnboardingForPostOnboardingFirstLesson(true);
    // UX-003: Запрашиваем пуш-разрешение в конце онбординга (не раньше — иначе система не даст
    // повторного шанса). Делаем до paywall/welcome, но с небольшой задержкой, чтобы анимация
    // закрытия онбординга завершилась до появления системного диалога.
    void (async () => {
      const notificationChoice = await readOnboardingNotificationChoice();
      const already = await isNotificationPermissionGranted().catch(noteSwallowedAs('_layout:useCallback.isNotificationPermissionGranted', false));
      if (!already && shouldPromptForOnboardingNotifications(notificationChoice)) {
        await new Promise<void>((r) => setTimeout(r, 600));
        await requestNotificationPermissionWithFallback().catch(noteSwallowedHandler('_layout:useCallback.requestNotificationPermissionWithFallback'));
      }
    })();
    // Entitlement и подарок — полезная, но необязательная пост-обработка. Она не
    // имеет права держать корневой оверлей или навигацию.
    void (async () => {
      const hasPaidOrVipAfterOnboarding = await hasVerifiedRealPremiumOrVip().catch(noteSwallowedAs('_layout:useCallback.hasVerifiedRealPremiumOrVip', true));
      if (!hasPaidOrVipAfterOnboarding) {
        await startIntroFullAccessAfterOnboarding(Date.now(), lang).catch(noteSwallowedAs('_layout:useCallback.startIntroFullAccessAfterOnboarding', false));
        emitAppEvent('intro_full_access_changed');
      }
      const showIntroGift = !hasPaidOrVipAfterOnboarding
        && await shouldShowIntroFullAccessWelcome().catch(noteSwallowedAs('_layout:useCallback.shouldShowIntroFullAccessWelcome', false));
      if (showIntroGift) {
        // pm.app.welcome (2.3s) должен закончиться до открытия модалки.
        setTimeout(() => setIntroFullAccessModal('welcome'), 1800);
      }
    })();
  }, [armPostOnboardingGoldBridge, hasVerifiedRealPremiumOrVip, lang, router]);

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
          await persistPortableProgressRegister('onboarding_step', 'name');
          await persistPortableProgressRegister('onboarding_done', null);
        } catch (e) {
      // best-effort: paywall_purchase уже записал эти ключи
      DebugLogger.error('_layout:sub', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      })();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (ready && rootNavigationReady && !isBanned && !showOnboarding && pendingRoute) {
      const t = setTimeout(() => {
        traceLessonExit('layout:pendingRoute_replace', { pendingRoute: String(pendingRoute).slice(0, 80) });
        router.replace(pendingRoute as Href);
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
  // Приоритет: update > authRecovery > releaseNotes > broadcast > appMessageModal > personalAdminMessage > ...
  // ВАЖНО: эти хуки должны вызываться до любых условных return ниже.
  // introFullAccess — нативный <Modal statusBarTranslucent>: его обязательно
  // гейтить через арбитр, иначе на холодном старте он может наложиться на другую такую же
  // модалку (update/broadcast/levelUp) → мерцание/зависание System UI (ANR) на Android.
  const updateModalVisible = useOverlayVisible('update', !!updateInfo && !updateModalHiddenForStore);
  const releaseNotesModalVisible = useOverlayVisible('releaseNotes', releaseNotesVariant !== null);
  const broadcastModalVisible = useOverlayVisible('broadcast', !!globalBroadcastModal);
  const appMessageModalVisible = useOverlayVisible('appMessageModal', appMessageModalQueue.length > 0);
  const personalAdminMessageVisible = useOverlayVisible('personalAdminMessage', !!personalAdminMessage);
  const notifNudgeModalVisible = useOverlayVisible('notifNudge', notifNudgeVisible);
  const startupAuthRecoveryModalVisible = useOverlayVisible('authRecovery', startupAuthRecoveryVisible);
  // A queued offer may have won the overlay slot immediately before the user
  // entered a tournament. Active tournament screens are an uninterrupted flow:
  // do not let that stale request cover the lobby or a live question.
  const introFullAccessModalVisible = useOverlayVisible(
    'introFullAccess',
    introFullAccessModal !== null,
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
  const appOverlaysEnabled = ready && !effectiveShowOnboarding && !isBanned;
  const startupSplashVisible = !fontsReady || !ready || !liquidGlassChoiceReady
    || (!effectiveShowOnboarding && !isBanned && (!firstContentReady || !homeScreenReady))
    // зачем (владелец, 2026-09-14): раньше здесь стояло голое
    // `effectiveShowOnboarding && !onboardingComponent` — единственная ветка
    // гейта без потолка времени. Модуль онбординга в dev по LAN ехал 34 секунды
    // (замер `Bundled 34052ms components\onboarding.tsx`), и всё это время
    // сплеш держался. Теперь ожидание ограничено: истёк потолок или импорт
    // провалился — экран отпускаем. Загрузка при этом продолжается, и модуль
    // подставится сам, как только доедет.
    || (effectiveShowOnboarding && !onboardingComponent && !onboardingWaitElapsed);
  const OnboardingScreen = onboardingComponent;
  // OWNER 2026-08-25: route shell обязан сменяться без искусственной задержки.
  // Непрозрачный contentStyle ниже закрывает native-container на первом кадре;
  // slide/fade остаются только явным dev-preview и hard-off в store config.
  const cardsSiblingAnimationOptions = INSTANT_STACK_ANIMATION;
  const pushScreenAnimationOptions = defaultScreenAnimationOptions;
  const bottomModalAnimationOptions = INSTANT_STACK_ANIMATION;

  // Перф: дерево из ~80 <Stack.Screen> зависит ТОЛЬКО от темы + onboardingPaywallActive,
  // а НЕ от pathname/params. Без useMemo каждая смена вкладки (usePathname меняется)
  // пересоздавала все 80 JSX-элементов экранов → тяжёлый ре-рендер корня → фриз тапа 3-10с.
  // Мемоизация разрывает эту связь: смена вкладки больше не трогает дерево стека.
  const stackTree = useMemo(() => (
    <Stack
      key={`account-generation-${accountDeletionNavigationEpoch}`}
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
      {/* зачем (владелец 2026-09-17): выбор тем комбинированного урока — обычный
          push-экран, как меню темы. Без явного объявления expo-router отдавал
          его модалкой, и экран открывался «на пол-экрана» поверх списка уроков. */}
      <Stack.Screen name="combined_lesson_pick" />
      <Stack.Screen name="lesson_words" />
      <Stack.Screen name="lesson_irregular_verbs" />
      <Stack.Screen name="lesson_complete" />


      <Stack.Screen name="hint" />
      <Stack.Screen name="lesson_help" />
      <Stack.Screen name="lesson_theory_v2" options={{ presentation: 'card', headerShown: false, ...pushScreenAnimationOptions }} />
      <Stack.Screen name="preposition_drill" />
      {/* Разделы настроек/инфо сохраняют modal presentation и swipe-dismiss,
          но появляются без route-анимации. Опции — app/section_sheet_navigation.ts,
          шапка внутри экранов —
          components/SectionSheetHeader.tsx. */}
      <Stack.Screen name="settings_edu" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="settings_notifications" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="settings_themes" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="settings_language" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="privacy_settings" options={SECTION_SHEET_STACK_OPTIONS} />
      {/* зачем: PM-171 — раздел «Идеи» удалён (ideas_catalog/ideas_submit), маршруты сняты. */}
      <Stack.Screen name="support_report" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="language_welcome" />
      <Stack.Protected guard={ENABLE_TOURNAMENTS}>
        {/* зачем 2026-08-23 (владелец): турниры выключены фулл, экраны
            заархивированы в _archive/tournaments — Expo Router ищет экраны по
            файлам, поэтому регистрации без файлов сломали бы навигацию.
            Возврат = вернуть файлы из архива и эти строки. */}
      </Stack.Protected>
      {/* зачем: D83 — клиентская Арена удалена целиком, её маршруты сняты вместе с файлами. */}
      <Stack.Screen name="streak_stats" />
      <Stack.Screen name="diagnostic_test" />
      <Stack.Screen name="exam" options={{ freezeOnBlur: false }} />
      <Stack.Screen name="survey_screen" />
      {/* зачем: без Fragment — expo-router разворачивает только ПРЯМЫХ детей
          <Stack.Screen>, а <>…</> считает посторонним ребёнком и печатает
          «Layout children must be of type Screen» на каждый старт (дважды за
          загрузку). Два отдельных условия дают тот же результат без обёртки. */}
      {/* Диспетчер проверяет доступ и рисует единственный пейвол Plus (manage=1 → replace
          на управление подпиской). Без анимации, с подложкой темы — без чёрного кадра. */}
      <Stack.Screen name="premium_modal" options={SECTION_SHEET_STACK_OPTIONS} />
      {/* зачем (владелец 2026-09-30, D78): экраны пейволов A–G удалены — единственный
          пейвол Plus рисует сам диспетчер premium_modal. */}
      <Stack.Screen name="manage_subscription" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="account_details" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="referrals" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="promo_code_entry" options={SECTION_SHEET_STACK_OPTIONS} />
      {/* зачем: app/avatar_select.tsx и app/avatar_dna_studio.tsx удалены целиком
          по D57/PM-062/063 — старые "гексаэдрические" студии аватаров закрыты. */}
      <Stack.Screen name="flashcards" options={cardsSiblingAnimationOptions} />
      {/* Cards 2.1 §5.3: каталог наборов сообщества — правая позиция таббара раздела */}
      <Stack.Screen name="flashcards_packs" options={cardsSiblingAnimationOptions} />
      {/* Cards 2.1 §5.3: «Мои наборы» — второй раздел всплывашки «Наборы» */}
      <Stack.Screen name="flashcards_my_packs" options={cardsSiblingAnimationOptions} />
      {/* Наборы из роликов — соседний раздел библиотеки карточек, та же анимация. */}
      <Stack.Screen name="flashcards_video_packs" options={cardsSiblingAnimationOptions} />
      <Stack.Screen name="flashcards_audio" />
      <Stack.Screen name="flashcards_collection" />
      <Stack.Screen name="flashcards_swipe" />
      <Stack.Screen name="flashcards_truefalse_session" />
      <Stack.Screen name="flashcards_card_editor" />
      <Stack.Screen name="community_pack_create" />
      {/* Открытие пака держит свою анимацию внутри экрана, поэтому вход остаётся
          мгновенным после общих опций нижней модалки. */}
      <Stack.Screen name="pack_opening" options={{ presentation: 'modal', ...bottomModalAnimationOptions, animation: 'none', animationDuration: 0 }} />
      <Stack.Screen name="shards_shop" />
      {/* зачем: магазин пока БЕЗ входа из приложения — открывается только из
          DEV-центра. Маршрут зарегистрирован, чтобы router.push('/shop') работал;
          в табы и меню он намеренно не выведен. */}
      <Stack.Screen name="shop" />
      {/* зачем: раздел «Руны» — открывается тапом по счётчику рун (шапка главной и «Обучения») */}
      <Stack.Screen name="runes_wallet" />
      {/* Ранг игрока: вход с блока монет на Главной; повышение использует атомарную операцию PM-075. */}
      <Stack.Screen name="coin_rank" />
      <Stack.Screen name="achievements_screen" />
      {/* D140 (владелец 2026-10-01): экран коллекций удалён вместе с разделом. */}
      <Stack.Screen name="level_exam" />
      {ENABLE_DEV_TOOLS && DEV_UTILITY_ROUTE_NAMES.map((name) => (
          <Stack.Screen key={name} name={name} />
        ))}
      <Stack.Screen name="privacy_screen" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="terms_screen" options={SECTION_SHEET_STACK_OPTIONS} />
      <Stack.Screen name="lingman_videos" />
      <Stack.Screen name="lingman_playlist" />
      <Stack.Screen name="flashcards_training_setup" />
      <Stack.Screen name="flashcards_speaking_session" />
      <Stack.Screen name="flashcards_blitz_session" />
      <Stack.Screen name="flashcards_recall_session" />
      <Stack.Screen name="mistake_practice_session" />
      <Stack.Screen name="mistakes_hub" />
      <Stack.Screen name="mistakes_list" />
      <Stack.Screen name="mistake_detail" />
      <Stack.Screen name="flashcards_voice_picker" />
    </Stack>
  ), [
    tTheme.bgPrimary,
    onboardingPaywallActive,
    defaultScreenAnimationOptions,
    pushScreenAnimationOptions,
    bottomModalAnimationOptions,
    cardsSiblingAnimationOptions,
    accountDeletionNavigationEpoch,
  ]);

  return (
    // Фон корня — константа темы: сплэш закрывает старт отдельным оверлеем,
    // а перекраска фона по асинхронным флагам давала «чёрный кадр».
    <View style={{ flex: 1, backgroundColor: tTheme.bgPrimary }}>
    {/* Системные области прозрачны глобально: фон каждого экрана рисуется до краёв,
        а safe-area остаётся внутренним отступом контента на самих экранах. */}
    <StatusBar
      barStyle={statusBarLight ? 'light-content' : 'dark-content'}
      backgroundColor="transparent"
      translucent
    />
    <ProductAnalyticsRuntimeObserver studyTarget={studyTarget} />
    <MaintenanceGate />
    <PromoBanner />

    {tapLatencyProfilerOnRender
      ? <Profiler id="stack" onRender={tapLatencyProfilerOnRender}>{stackTree}</Profiler>
      : stackTree}

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
        const notifications = await loadNotificationsModule().catch(noteSwallowedAs('_layout:AppContent.loadNotificationsModule', null));
        if (!notifications) {
          setNotifNudgeVisible(false);
          return;
        }
        const perm = await notifications.requestNotificationPermissionWithFallback({ openSettingsIfBlocked: true });
        const ok = perm.granted;
        setNotifNudgeVisible(false);
        if (!ok) return;
        // зачем: юзер мог заранее выключить общий мастер в разделе «Уведомления».
        // Без этой синхронизации scheduleNotifications ниже тихо блокируется гейтом
        // isNotifMasterEnabled(), а юзер видит «разрешение дал» и думает, что включил.
        // Этот модал — явное намерение «включить напоминания», поэтому чиним обе стороны.
        const prefsSnap = notifications.getNotifPrefsSnapshot();
        if (!prefsSnap.master) {
          await notifications.saveNotifPrefs({ ...prefsSnap, master: true });
        }
        const snap = notifications.getNotifSettingsSnapshot();
        const hasPerDay = Object.values(snap.schedule).some(d => d.enabled);
        if (hasPerDay) {
          await notifications.scheduleNotifications(snap, lang, 0, { studyTarget });
          return;
        }
        const hour = parseInt((await AsyncStorage.getItem('notification_hour')) || '19', 10);
        const minute = parseInt((await AsyncStorage.getItem('notification_minute')) || '0', 10);
        await notifications.scheduleDailyReminder(hour, minute, lang, { studyTarget });
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
      visible={appOverlaysEnabled && releaseNotesModalVisible && releaseNotesVariant === 'legacy'}
      onClose={() => { void closeReleaseNotesModal(); }}
    />

    <ReleaseNotesV2Modal
      visible={appOverlaysEnabled && releaseNotesModalVisible && releaseNotesVariant === 'v2'}
      onClose={() => { void closeReleaseNotesModal(); }}
    />

    <GlobalBroadcastModal
      visible={appOverlaysEnabled && broadcastModalVisible}
      payload={globalBroadcastModal}
      onClose={() => setGlobalBroadcastModal(null)}
    />

    <AppMessageAnnouncementModal
      visible={appOverlaysEnabled && appMessageModalVisible}
      message={appMessageModalQueue[0] ?? null}
      onAcknowledge={closeAppMessageModal}
    />

    <PersonalAdminMessageModal
      visible={appOverlaysEnabled && personalAdminMessageVisible}
      message={personalAdminMessage}
      onAcknowledge={closePersonalAdminMessage}
    />

    {/* Bottomsheet первого урока после онбординга */}
    <IntroFullAccessModal
      visible={appOverlaysEnabled && introFullAccessModalVisible}
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
        {OnboardingScreen ? (
          <OnboardingScreen
            startAtNameStep={onboardingStartAtName}
            initialLang={lang}
            onDone={handleOnboardingDone}
            onLangSelect={handleLangSelect}
            onIntroFullAccessStart={handleOnboardingIntroFullAccessStart}
          />
        ) : (
          // зачем (владелец, 2026-09-14): потолок ожидания отпустил сплеш, а
          // модуль онбординга ещё едет. Показывать голый фон нельзя — человек
          // решит, что приложение сломалось. Держим ТОТ ЖЕ анимированный сплеш
          // (тот же фон, та же анимация): визуально ничего не дёргается, но
          // нативный слой уже снят и интерфейс жив. Полноэкранный спиннер тут
          // запрещён правилом владельца, а живая анимация — не спиннер.
          <StartupSplashHold visible canHideNativeSplash />
        )}
      </View>
    )}

    {ready && isBanned && (
      <View style={[styles.appFullScreenOverlay, { backgroundColor: '#06141B', justifyContent: 'center', padding: 24 }]}>
        <View style={{ backgroundColor: '#121826', borderRadius: 18, borderWidth: 0, borderColor: '#7f1d1d', padding: 20 }}>
          <Text style={{ color: '#f87171', fontSize: 28, textAlign: 'center', marginBottom: 10 }}>🚫</Text>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
            {triLang(lang, { ru: 'Аккаунт заблокирован', uk: 'Обліковий запис заблоковано', en: 'Account blocked', es: 'Cuenta bloqueada', 'pt-BR': 'Conta bloqueada', vi: 'Tài khoản đã bị khóa', id: 'Akun diblokir', tr: 'Hesap engellendi', pl: 'Konto zablokowane' })}
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 16 }}>
            {triLang(lang, { ru: 'Доступ к приложению ограничен. Если считаете блокировку ошибочной — напишите в поддержку.', uk: 'Доступ до застосунку обмежено. Якщо вважаєте блокування помилковим — напишіть у підтримку.', en: "Access to the app is restricted. If you think this block is a mistake, contact support.", es: 'El acceso a la aplicación está restringido. Si crees que el bloqueo es un error, contacta con soporte.', 'pt-BR': 'O acesso ao aplicativo está restrito. Se achar que o bloqueio foi um erro, entre em contato com o suporte.', vi: 'Quyền truy cập ứng dụng bị hạn chế. Nếu bạn cho rằng tài khoản bị khóa nhầm, hãy liên hệ hỗ trợ.', id: 'Akses ke aplikasi dibatasi. Jika menurutmu pemblokiran ini keliru, hubungi dukungan.', tr: 'Uygulamaya erişim kısıtlandı. Engellemenin hatalı olduğunu düşünüyorsanız destek ekibiyle iletişime geçin.', pl: 'Dostęp do aplikacji jest ograniczony. Jeśli uważasz, że blokada jest błędna, skontaktuj się z pomocą techniczną.' })}
          </Text>
          <TouchableOpacity
            onPress={() => checkBanStatus(true)}
            style={{ backgroundColor: '#1f2937', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>{triLang(lang, { ru: 'Проверить снова', uk: 'Перевірити ще раз', en: 'Check again', es: 'Comprobar de nuevo', 'pt-BR': 'Verificar novamente', vi: 'Kiểm tra lại', id: 'Periksa lagi', tr: 'Tekrar kontrol et', pl: 'Sprawdź ponownie' })}</Text>
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
  startupSplashGlyphPulse: {
    width: SPLASH_GLYPH_SIZE,
    height: SPLASH_GLYPH_SIZE,
  },
  startupSplashSubtitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
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

// зачем: трассировка [TAP-LAT] (аудит мгновенности 2026-09-02) метит КАЖДОЕ касание
// в capture-фазе корня, не захватывая responder. Когда трассировка выключена
// (release без EXPO_PUBLIC_TAP_LATENCY_TRACE=1) — это undefined, обработчика нет.
const tapLatencyCaptureHandler = createTapLatencyCaptureHandler();
// onTouchEnd корня всплывает от любой кнопки: отсюда берём момент отпускания пальца.
const tapLatencyTouchEndHandler = createTapLatencyTouchEndHandler();
// Profiler вокруг дерева стека: сколько раз и как долго React рендерил экраны от
// касания до кадра. Когда трассировка выключена — undefined, Profiler не оборачивается.
const tapLatencyProfilerOnRender = createTapLatencyProfilerHandler();

export default function RootLayout() {
  // зачем (владелец, 2026-09-14): печаталось БЕЗУСЛОВНО на каждый рендер корня —
  // в проде это чистый мусор и лишняя работа в самом горячем месте дерева.
  // Диагностическую ценность оставляем деву, где она и нужна.
  if (BOOT_TRACE_ENABLED) console.warn('[BOOT] RootLayout render'); // guard-ok: BOOT_TRACE_ENABLED и есть __DEV__
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
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: STARTUP_SPLASH_BG }}
      onStartShouldSetResponderCapture={tapLatencyCaptureHandler}
      onTouchEnd={tapLatencyTouchEndHandler}
    >
    <ErrorBoundary>
      <SafeAreaProvider initialMetrics={stableInitialWindowMetrics}>
      <PremiumProvider>
        <ThemeProvider>
          <LangProvider>
            <StudyTargetProvider>
            <EnergyProvider>
                <OverlayArbiterProvider>
                    <AppContent fontsReady={fontsReady} />
                    {/* зачем (D49, владелец 2026-10-01): хост «Дневного пути» удалён —
                        он открывал окно «бонус дня» на старте каждый новый день
                        (без флага). Замена — блок «Сегодня» на Главной, без окон. */}
                    {/* зачем (PM-049/050/051/052, D09/S51 владельца): бонус входа,
                        сундук недели, «день возвращения», «идеальная неделя» и
                        «бонус дня активирован» убраны — ничто декоративное не
                        преграждает вход. Хосты BoonActivatedHost/MysteryMondayHost/
                        ComebackBoonHost/PerfectWeekHost/OnboardingWelcomeHost
                        удалены целиком (components/*Host.tsx). Деньги welcome-
                        подарка начисляются молча ниже, без модалки. */}
                    <ActionToast />
                    <GlobalLevelUpRewards />
                    <GlobalShardsEarnedHost />
                    <EntitlementExpiredHost />
                    <ReferralWelcomeHost />
                    <StreakRiskToastHost />
                    <BillingIssueToastHost />
                    <ThemedBlockingAlertHost />
                    <PhoneStateRecoveryScreen />
                    <TapLatencyNavProbe />
                </OverlayArbiterProvider>
            </EnergyProvider>
            </StudyTargetProvider>
          </LangProvider>
        </ThemeProvider>
      </PremiumProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
