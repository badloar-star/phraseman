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
// зачем (координатор 11.10): чистые кадры сверки — LogBox выключается ТОЛЬКО в dev при EXPO_PUBLIC_SNAPSHOT_CLEAN=1; в релизном бандле ветка вырезается (__DEV__ = false).
if (typeof __DEV__ !== 'undefined' && __DEV__) require('./dev_snapshot_clean');
// зачем (координатор 05.10, пакет 01:26, «сперва логи»): таймеры ворот сплеша опаздывали на 1,5–2 с (FALLBACK 400 мс
// сработал через ~2 с). Сторож простоя JS-потока: тик 100 мс, печатает каждый разрыв > 250 мс с временем от
// старта — видно, КОГДА и НА СКОЛЬКО поток стоял. Только dev, сам снимается через 60 с от старта (12.10: был
// «через 3 с после сплеша» — не доживал до зависания dev-ссылки).
const JS_STALL_TICK_MS = 100;
const JS_STALL_REPORT_MS = 250;
const JS_HEARTBEAT_MS = 5_000;
if (BOOT_TRACE_ENABLED) {
  let lastTickAt = Date.now();
  let lastHeartbeatAt = Date.now();
  const stopAt = BOOT_T0 + 60_000;
  // зачем (координатор 15.10, прогон №7): «JS-STALL 11 с при входе» оказался окном выбора аккаунта Google — приложение в фоне, Android
  // приостанавливает JS, а сторож считал паузу простоем. Время в фоне (AppState ≠ active) копим отдельно и вычитаем из разрыва;
  // простой — только то, что осталось. Только dev, как и весь сторож.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const stallAppState = (require('react-native') as typeof import('react-native')).AppState;
  let backgroundSinceAt: number | null = stallAppState.currentState === 'active' ? null : Date.now();
  let backgroundMsSinceTick = 0;
  stallAppState.addEventListener('change', (next) => {
    const at = Date.now();
    if (next !== 'active') { if (backgroundSinceAt === null) backgroundSinceAt = at; return; }
    if (backgroundSinceAt !== null) { backgroundMsSinceTick += at - backgroundSinceAt; backgroundSinceAt = null; }
  });
  const watchdog = setInterval(() => {
    const now = Date.now();
    const rawGapMs = now - lastTickAt;
    lastTickAt = now;
    if (backgroundSinceAt !== null) return; // в фоне не меряем: тик в фоне — не простой интерфейса
    let gapMs = rawGapMs;
    if (backgroundMsSinceTick > 0) {
      gapMs = Math.max(0, rawGapMs - backgroundMsSinceTick);
      console.warn(`[JS-STALL] skipped_background ms=${backgroundMsSinceTick} gap=${rawGapMs}ms counted=${gapMs}ms at=+${now - BOOT_T0}ms`); // guard-ok: только dev
      backgroundMsSinceTick = 0;
    }
    if (gapMs > JS_STALL_REPORT_MS) {
      console.warn(`[JS-STALL] +${now - BOOT_T0}ms поток стоял ${gapMs}ms (с +${now - gapMs - BOOT_T0}ms)`); // guard-ok: только dev
    }
    const splashHiddenAt = (globalThis as { __phrasemanNativeSplashHiddenAt?: number }).__phrasemanNativeSplashHiddenAt;
    // зачем (координатор 12.10, холодный старт dev-ссылки 35 с, белый экран): сторож снимался через 3 с после сплеша и не
    // доживал до зависания. Теперь живёт до 60 с от старта и раз в 5 с пишет пульс: пульс идёт — поток жив и чего-то ждёт;
    // пульса нет, а потом большой разрыв — поток стоял. Временная трассировка, убрать после диагноза.
    if (now - lastHeartbeatAt >= JS_HEARTBEAT_MS) {
      lastHeartbeatAt = now;
      console.warn(`[JS-STALL] heartbeat +${now - BOOT_T0}ms splash=${typeof splashHiddenAt === 'number' ? `hidden@+${splashHiddenAt - BOOT_T0}ms` : 'shown'}`); // guard-ok: только dev
    }
    if (now >= stopAt) {
      console.warn(`[JS-STALL] watchdog stop +${now - BOOT_T0}ms`); // guard-ok: только dev
      clearInterval(watchdog);
    }
  }, JS_STALL_TICK_MS);
}
// зачем (12.10, [COLD-START-HOLD]): сколько раз монтировался AppContent за жизнь процесса.
let appContentMountCount = 0;
// зачем (Сверка 12.10, cards-v2-033: в 14:59:40 разом размонтировались корень и хост тостов, после чего — ни одного таймера,
// процесс жив, экран белый 2,5 мин, dev-ссылка не дошла): так выглядит перезагрузка JS, а не зависание. Подозрение —
// Fast Refresh делает полную перезагрузку, когда параллельная сессия правит модуль, который нельзя подменить на лету
// (корень, контексты), а новый бандл не доезжает. Печатаем причину ДО перезагрузки. Перезагрузки по команде сборщика
// (нативные) сюда не попадают — их видно по отсутствию этой строки перед тишиной. Только dev.
if (BOOT_TRACE_ENABLED) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const devSettings = require('react-native').DevSettings as { reload?: (reason?: string) => void } | undefined; // guard-ok: только dev, react-native уже загружен
    const originalReload = devSettings?.reload?.bind(devSettings);
    if (devSettings && originalReload) {
      devSettings.reload = (reason?: string) => {
        console.warn(`[COLD-START-HOLD] dev_reload reason=${reason ?? 'none'} boot=+${Date.now() - BOOT_T0}ms`); // guard-ok: только dev
        originalReload(reason);
      };
    } else {
      console.warn('[COLD-START-HOLD] dev_reload hook: DevSettings.reload недоступен — причину перезагрузки не увидим'); // guard-ok: ранний выход логируется
    }
  } catch (error) {
    console.warn('[COLD-START-HOLD] dev_reload hook failed', String(error)); // guard-ok: catch логируется
  }
}
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
import { Stack, useGlobalSearchParams, useNavigationContainerRef, usePathname, useRouter, useSegments, router as globalRouter, type Href } from 'expo-router';
import { isTabsShellMounted, rootNavigateFallbackAction } from './tabs_shell_state';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as SplashScreen from 'expo-splash-screen';
import { UI_SFX_AUDIO_MODE } from './audio_playback_mode';
import { setManagedAudioMode } from './audio_session_coordinator';
import { releaseStaleAudioActivity } from '../modules/audio/audio_activity';
import { stopAllAudioOwnersOnResume } from '../modules/audio/audio_runtime_arbiter';
import { soundDirector } from '../modules/audio/sound_director';
import { isSessionEntryPath, lessonEndPrewarmPlan } from '../modules/audio/lesson_end_prewarm';
import { scheduleStartupSfxPrewarm } from '../modules/audio/startup_sfx_prewarm';

/**
 * Вторая волна прогрева — звуки конца урока. Раньше их не было вовсе, хотя они звучат в конце КАЖДОГО урока и по коду
 * встречаются чаще прочих (pm.reward.chest_open — самое частое событие в приложении). Когда греть — lesson_end_prewarm.ts.
 */
function prewarmLessonEndSfx(reason: string): void {
  console.log(`[SFX-PREWARM] lesson_end reason=${reason}`);
  soundDirector.prewarm([
    'pm.complete.micro',
    'pm.reward.chest_open',
    'pm.reward.small',
    'pm.streak.saved',
  ]);
}
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { redirectSystemPath } from './+native-intent';
import React, { Profiler, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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
import { getDeviceBootstrapLocale, triLang, type Lang } from '../constants/i18n';
import { peekResolvedUiLang } from './ui_lang_resolved';
import { resolvePushUiLang } from './push_ui_lang';
import { installNotificationLangResync, noteNotificationsScheduledLang } from './notification_lang_resync';
import { getInstalledAppVersion } from './app_version';
import { ENABLE_DEV_TOOLS, ENABLE_TOURNAMENTS, IS_EXPO_GO, ENABLE_SCREEN_TRANSITIONS, SCREEN_FADE_TRANSITIONS } from './config';
import { PAYWALL_SHEET_STACK_OPTIONS, SECTION_SHEET_STACK_OPTIONS } from './section_sheet_navigation';
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
// зачем (10.10): статический импорт './notifications' тянул весь каталог расписаний в первый кадр старта
// (сторож startup_notifications_lazy). Обе функции запроса разрешения нужны только в конце онбординга —
// берём их через loadNotificationsModule() там же, где вызываем.
import { initRevenueCat } from './revenuecat_init';
import { hydrateAnalyticsConsentFromStorage } from './analytics_consent';
import { hydrateAiExplainConsentFromStorage } from './ai_explain_consent';
import { hydrateAiDialogConsentFromStorage } from './ai_dialog_consent';
import { notifNudgeCopy } from './notif_nudge_copy';
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
import {
  consumeRemoteAccountDeletionNotice,
  handleAccountDeletedOnAnotherDevice,
  isLocalAccountDeletionInProgress,
  peekLinkedAuthFromCurrentUser,
  ensureFreshPostDeletionIdentity,
  subscribeFirebaseAuthUid,
} from './auth_provider';
import { startRemoteAccountDeletionMonitor } from './remote_account_deletion_monitor';
import { waitForRestoreUserDocBanned } from './boot_user_doc_ban_peek';
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
import { getOverlayActiveMirror, waitForOverlaySlotFree } from '../components/overlay_active_mirror'; // зачем: [PAYWALL-AUTO] — апселл ждёт свободный слот окон
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
import { FIRESTORE_CACHE_CLEAR_MARKER_KEY, runFirestoreCacheClearFromStartupRead } from './firestore_cache_clear';
import { registerRootNavProbe } from './nav_freeze_probe'; // зачем: [PAYWALL-CLOSE-FREEZE] — снимок стека после закрытия пейвола
import { hydrateDailyPhrasePeekFromStorage } from './daily_phrase_system';
import { primeSurveyOfferCacheFromStorage } from './survey_offer_cache';
import { primeScreenSnapshotsFromStorage } from './screen_snapshot_store';
import { hydrateYoutubeChannelPreference } from './youtube_channel_preference';
import { hydrateStatsCacheFromStorage } from './statsCache';
import { primeRemoteConfigCacheFromStorage, readRemoteConfigCacheRaw } from './remote_config_client';
import { isMutationTrackingActive } from './storage_mutation_bus';
import { isDeferredBootRestoreActive, requestDeferredBootRestoreStart } from './boot_restore_dirty_keys';
import { ACCOUNT_DELETE_PENDING_AUTH_KEY, inspectAccountDeletePendingAuth, readAccountDeletePendingAuthRaw } from './account_delete_quarantine';
import {
  BOOT_RESTORE_OWNER_KEY,
  bootRestoreDeferFlagFromCacheRaw,
  bootRestoreIdentityClean,
  type BootRestoreDeleteLockState,
  decideBootRestoreDefer,
  startDeferredBootRestore,
  writeBootRestoreOwnerMark,
} from './boot_restore_defer';
import { ensurePhoneStateSyncLifecycleInstalled } from './phone_state_sync_lifecycle';
import { bootstrapPhoneState } from './phone_state_bootstrap';
import { installPhoneStateProductionRuntime } from './phone_state_runtime';
import { schedulePhoneStateDeferredIntegrityCheck } from './phone_state_runtime'; // зачем: §84 — фоновая проверка целостности
import { coldStartMark, coldStartStep } from './cold_start_trace';
import { msSinceJsEntry, takeModuleEvalReport } from './cold_start_entry_mark';
import { whenHomePainted } from './home_paint_marker'; // зачем: §80 — [COLD-START] от старта процесса
import { setOnboardingDeferActive } from './onboarding_defer_gate';
import { markNativeSplashHidden, runAfterHomeFirstFrame } from './first_frame_deferred_warmups'; // зачем: PM-211 — необязательное после первого кадра Главной
import { installColdStartIoTrace } from './cold_start_io_trace'; // зачем: §89 — [COLD-START-IO]
import { createBootCloudRestoreCoordinator, type BootCloudRestoreOutcome } from './cloud_restore_coordinator';
import { hasMeaningfulLocalAccountData } from './local_account_data';
import { decideStartupCloudRecoveryPresentation } from './startup_cloud_recovery_presentation';
import { OverlayArbiterProvider, useOverlayActiveKey, useOverlayVisible } from '../components/OverlayArbiter';
import { getDevOverlaysSnapshot, isDevOverlaysOff, subscribeDevOverlays } from './dev_overlays_off';
import ErrorBoundary from '../components/ErrorBoundary';
import { trackActivity } from './app_activity';
import { ProductAnalyticsRuntimeObserver } from './product_analytics_runtime_observer';
import {
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
  claimAppMessagesLoginForce,
  // зачем (Авторизация 12.10, system-012): демо-сообщение окна объявления (dev appmessage)
  DEV_SETTINGS_CAMPAIGN_PREFIX,
  devAnnouncementModalMessage,
  listPendingAppMessageModals,
  pickNextLoginPersonalMessage,
  refreshAppMessagesSnapshotOnce,
  type AppMessageWithState,
} from './app_messages';
import { getDevAppMessage, subscribeDevAppMessage } from './dev_social_state';
import { readFreshInstallVerdict, skipAnnouncementsForFreshInstall } from './fresh_install_gate';
import {
  getIntroFullAccessState,
  startIntroFullAccessAfterOnboarding,
} from './intro_full_access';
import { resumePendingGeneratedNickname } from './nickname_guard';
import { stableInitialWindowMetrics, useStableSafeAreaInsets } from './stable_safe_area_metrics';

import { DebugLogger } from './debug-logger';
import { traceLessonExit } from './lesson_exit_trace';
import { consumeInitialDeepLinkTarget } from './initial_deep_link_store';
import { rememberOnboardingDonePeek } from './onboarding_done_peek';
import { armMemTick, setMemTickRoute } from './mem_tick';
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
// зачем (координатор 05.10, пакет 08:26: кадр Главной +13369, сплеш снят +15590 — ~2,2 с между setFirstContentReady и
// коммитом корня, JS-поток занят): сплеш снимаем прямо в колбэке первого кадра Главной. JS-заставку гасим прозрачностью
// на нативном драйвере — без React-рендера корня; размонтируется она позже обычным путём. Один раз за процесс.
const startupHoldEarlyDismissOpacity = new Animated.Value(1);
let splashEarlyHideDone = false;
// зачем (пакет 11:54, прогон 1: гейт снял сплеш +6863, ранний путь снял ещё раз +6936): прежний гейт тоже отмечает,
// что уже снял сплеш, — ранний путь тогда не зовёт hideAsync повторно.
let splashGateHideDone = false;
/**
 * Пауза посева озвучки Learning V2 после кадра Главной: позже премаунта вкладок (+0,5…≈5 с) и прогрева звуков
 * (+4,5 с, 7 шагов по 300 мс) — см. зачем у вызова seedLearningV2BootstrapAudioCacheV1.
 */
const V2_AUDIO_SEED_AFTER_PAINT_DELAY_MS = 8_000;

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
    // зачем ((б)): кто потребовал самые дорогие модули корня (lessons/journal/home) — цепочки require.
    coldStartMark('layout.module_eval:chains', '_layout', { chains: moduleReport.chains });
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
// (до 240 документов). Принудительно — только при входе в аккаунт (метка на диске, claimAppMessagesLoginForce), дальше
// кэш и сеть не чаще раза в 6 часов.
const APP_MESSAGES_FOREGROUND_MIN_INTERVAL_MS = 6 * 60 * 60_000;
/** зачем (владелец, 2026-09-21: «вход ДО 1 СЕКУНДЫ»): 900 мс этого потолка
 * съедали почти весь бюджет входа в одиночку, а следом ещё ждал homeScreenReady.
 * Событие от Главной приходит раньше на здоровом старте — fallback нужен только
 * когда экран промолчал, и ждать его почти секунду больше нельзя. */
const FIRST_CONTENT_READY_FALLBACK_MS = 400;
/** Столько ждём чанк Главной, прежде чем перестать держать им сплеш.
 * зачем (владелец, 2026-09-21): см. развёрнутый комментарий у самого fallback
 * ниже — это был единственный флаг гейта вообще без потолка. */
const HOME_SCREEN_READY_FALLBACK_MS = 550;
// Пауза после кадра Главной и снятия сплеша перед установкой планировщика отправки завершений Learning V2
// (его первый проход берёт замок аккаунта; пакет 00:30 — 3,4 с на старте).
const LV2_COMPLETION_SCHEDULER_INSTALL_DELAY_MS = 6_000;
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
// зачем (координатор 11.10): фоновый сэмплер памяти/таймеров/чтений Firestore — только dev; как можно раньше, чтобы
// в счёт попали чтения старта. В стор-сборке armMemTick сразу выходит.
armMemTick();
const WARM_DEEP_LINK_SELF_OPEN_WAIT_MS = 400;
// зачем (координатор 11.10, «сперва логи»): phraseman://settings дважды вешал приложение (красный экран addViewAt
// «already has a parent», белый экран 4+ мин). Каждая развилка обработки ссылки пишет одну строку: что пришло, готов ли
// навигатор, где мы сейчас, какой переход сделан. Значения параметров маскируются (maskDeepLinkForLog).
function deeplinkSettingsTrace(step: string, data: Record<string, unknown>): void {
  console.log('[DEEPLINK-SETTINGS]', step, JSON.stringify(data));
}

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
    // зачем: ранний показ Главной гасит заставку прозрачностью; при следующем показе заставка снова видна.
    if (!visible) {
      startupHoldEarlyDismissOpacity.setValue(1);
      return;
    }
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
    <Animated.View pointerEvents="none" style={[styles.startupSplashAnimatedRoot, { opacity: startupHoldEarlyDismissOpacity }]}>
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
    </Animated.View>
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
let lastSessionStudyTarget: RuntimeStudyTarget | undefined;

/**
 * Локальные напоминания (daily ИЛИ per-day), предупреждение серии, фраза дня, итоги недели/месяца и язык push-токена
 * на языке `lang`. Зовут старт (runSessionChecks) и смена языка интерфейса (app/notification_lang_resync.ts).
 * Запись языка токена в облако — только если язык/токен/пояс изменились (кэш в registerPushTokenForServerPush).
 */
async function scheduleRemindersForLang(lang: Lang, studyTarget?: RuntimeStudyTarget): Promise<void> {
  const notifications = await loadNotificationsModule();
  const notifSnap = notifications.getNotifSettingsSnapshot();
  const hasPerDay = Object.values(notifSnap.schedule).some(d => d.enabled);
  if (hasPerDay) {
    notifications.scheduleNotifications(notifSnap, lang, 0, { requestPermission: false, studyTarget }).catch(noteSwallowedHandler('_layout:runSessionChecks.scheduleNotifications'));
  } else {
    // зачем (умное напоминание): на запуске НЕ включаем напоминание сами — его включает только согласие человека (окно, онбординг,
    // Настройки). Раньше здесь звалась отключённая scheduleDailyReminder — она ничего не делала.
    console.log('[SMART-REMINDER] startup:skip reason=daily_reminder_off (расписание по дням выключено)'); // guard-ok: ранний выход пишет причину, раз на запуск
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
}

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
    // зачем (координатор 12.10, «ДА» на правку): этот lang уходит на сервер как pushTokenLang (по нему решаются пуши
    // Шпиля и язык всех серверных пушей) и в локальные напоминания. Раньше — сырое app_lang (uk/es, иначе ru): uk без
    // ручного выбора и pt-BR/vi/id/tr/pl получали русский. Теперь — язык, которым реально нарисован интерфейс.
    const uiLang = peekResolvedUiLang();
    const { lang, source: langSource } = resolvePushUiLang({ resolvedUiLang: uiLang, storedAppLang: langRaw, deviceLang: getDeviceBootstrapLocale() });
    console.log('[PUSH-LANG]', JSON.stringify({ step: 'boot_lang', storedAppLang: langRaw, uiLang, chosen: lang, source: langSource, notifEnabled: notifEnabledRaw === 'true' }));

    // ── 3. Восстановление напоминаний: daily ИЛИ per-day (расписание), не оба
    const notifEnabled = notifEnabledRaw;
    if (notifEnabled === 'true') {
      void scheduleRemindersForLang(lang, studyTarget)
        .then(() => {
          // «Вместе»: раз в запуск синхронизируем в облако тумблер «Друзья» + часовой пояс.
          void loadNotificationsModule()
            .then((notifications) => notifications.syncFriendsPushPrefIfChanged())
            .catch(noteSwallowedHandler('_layout:runSessionChecks.syncFriendsPushPrefIfChanged'));
        })
        .catch(noteSwallowedHandler('_layout:runSessionChecks.scheduleRemindersForLang'));
    }
    // зачем (§AUTH-0110 п.1): старт запоминает язык уведомлений, смена языка в настройках переставляет их без перезапуска.
    noteNotificationsScheduledLang(lang);
    lastSessionStudyTarget = studyTarget;
    installNotificationLangResync({
      resolveLang: async (uiLangNow) => resolvePushUiLang({
        resolvedUiLang: uiLangNow as Lang,
        storedAppLang: await AsyncStorage.getItem('app_lang'),
        deviceLang: getDeviceBootstrapLocale(),
      }).lang,
      isEnabled: async () => (await AsyncStorage.getItem('notifications_enabled')) === 'true',
      // resolveLang выше отдаёт результат resolvePushUiLang — это Lang; модуль пересинхронизации работает со строкой.
      reschedule: (nextLang) => scheduleRemindersForLang(nextLang as Lang, lastSessionStudyTarget),
    });

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
          // зачем (координатор 14.10, [PAYWALL-AUTO]): апселл не въезжает поверх окна очереди (итог недели, «С возвращением»):
          // ждём освобождения слота вне замка смены аккаунта, показываем один раз; не дождались за 10 мин — сдаёмся с причиной.
          const holderNow = getOverlayActiveMirror();
          if (holderNow !== null) console.log(`[PAYWALL-AUTO] level_up upsell deferred holder=${holderNow}`); // guard-ok: решение логируется
          waitForOverlaySlotFree(10 * 60_000, (freed, waitedMs) => {
            if (!freed) { console.log(`[PAYWALL-AUTO] level_up upsell dropped reason=overlay_busy_timeout waitedMs=${waitedMs}`); return; } // guard-ok: ранний выход
            if (!isLevelUpAccountTokenCurrent(accountToken)) { console.log('[PAYWALL-AUTO] level_up upsell dropped reason=account_changed'); return; } // guard-ok: ранний выход
            console.log(`[PAYWALL-AUTO] level_up upsell shown waitedMs=${waitedMs}`); // guard-ok: решение логируется
            // Navigation first: a failed push must not consume the cooldown.
            globalRouter.push({ pathname: '/premium_modal', params: { context: 'level_up', source: 'afterwin_levelup' } } as Href);
            void markAfterWinUpsellShown(Date.now()).catch(noteSwallowedHandler('_layout:levelUpUpsell.markShown'));
            void trackEvent('afterwin_upsell_shown', { source: 'level_up' }).catch(noteSwallowedHandler('_layout:levelUpUpsell.track'));
            void import('./firebase').then(({ logAfterWinUpsellShown }) => logAfterWinUpsellShown('level_up')).catch(noteSwallowedHandler('_layout:useEffect.call'));
          });
        } catch (e) {
          // guard-ok: молчаливый отказ апселла = потерянная выручка без следа.
          DebugLogger.error('_layout:levelUpUpsell', e instanceof Error ? e : new Error(String(e)), 'warning');
        }
      });
    });
    return () => sub.remove();
  }, [hasPremiumAccess]);

  // зачем (координатор 15.10): прогрев иконок меню 1.0 снят — плитки Главной берут арт 2.0 через реестр, а прогреваемые
  // картинки нигде не рисовались; лишнее декодирование на каждом старте и смене темы убрано.

  return null;
}

const BAN_CACHE_KEY = 'ban_status_cached_v1';
const BAN_CACHE_AT_KEY = 'ban_status_cached_at_v1';
const BAN_CACHE_TTL_MS = 30 * 60 * 1000;
/** Сколько проверка бана ждёт документ восстановления, прежде чем прочитать users/{uid} сама (п.70 №2). */
const BAN_RESTORE_DOC_WAIT_MS = 8_000;

// Вынесено в дочерний компонент чтобы иметь доступ к LangContext + AchievementContext
// зачем (координатор 05.10, пакет 07:26: setFirstContentReady(true) +8224 → «splash gate» canHide +10207 — фиксация
// корня заняла ~2 с): какие коммиты дерева AppContent дорогие на старте. Только коммиты ≥ 80 мс и только до скрытия
// сплеша + 3 с; в release Profiler не вызывает onRender — нулевая цена.
const BOOT_COMMIT_LOG_MIN_MS = 80;
let bootCommitWindowEndsAt: number | null = null;
function bootCommitProfilerOnRender(id: string, phase: string, actualDuration: number, baseDuration: number): void {
  if (bootCommitWindowEndsAt !== null && Date.now() > bootCommitWindowEndsAt) return;
  if (actualDuration < BOOT_COMMIT_LOG_MIN_MS) return;
  console.warn('[BOOT-COMMIT]', JSON.stringify({ id, phase, actualMs: Math.round(actualDuration), baseMs: Math.round(baseDuration), atEpochMs: Date.now() })); // guard-ok: временная трассировка старта
}

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
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [pendingWarmDeepLink, setPendingWarmDeepLink] = useState<string | null>(null);
  // undefined — ссылку холодного старта ещё не забирали; null — забрали, её нет (app/initial_deep_link_store.ts).
  const initialDeepLinkRef = useRef<string | null | undefined>(undefined);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  /** Скрываем RN Modal до ухода в стор — на Android иначе зависания System UI при возврате. */
  const [updateModalHiddenForStore, setUpdateModalHiddenForStore] = useState(false);
  const awaitingStoreReturnRef = useRef(false);
  // зачем (координатор 12.10, холодный старт dev-ссылки 35 с, сперва логи): отмена отложенной задачи с пустыми зависимостями
  // (lv2_completion_scheduler_install) бывает ТОЛЬКО при размонтировании корня. Печатаем номер монтирования и время жизни —
  // видно, пересоздавался ли AppContent на старте и сколько раз.
  useEffect(() => {
    appContentMountCount += 1;
    const mountNo = appContentMountCount;
    const mountedAt = Date.now();
    console.warn(`[COLD-START-HOLD] app_content:mount n=${mountNo} boot=+${mountedAt - BOOT_T0}ms`); // guard-ok: трассировка старта
    return () => {
      console.warn(`[COLD-START-HOLD] app_content:unmount n=${mountNo} lifeMs=${Date.now() - mountedAt} boot=+${Date.now() - BOOT_T0}ms`); // guard-ok: трассировка старта
    };
  }, []);
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
    // зачем (координатор 05.10, пакет 00:30): первый проход планировщика сразу брал замок аккаунта под курсор
    // повтора (persist держал его 3,4 с), и за ним стояли кошелёк и курс — как раз на старте. Отправка завершённых
    // занятий фоновая и офлайн-устойчивая: ставим планировщик после кадра Главной и снятия сплеша, плюс пауза.
    // Если человек раньше откроет занятие, экран сессии поставит планировщик сам (enterInteractiveSurface).
    let cancelled = false;
    const cancelDeferred = runAfterHomeFirstFrame('lv2_completion_scheduler_install', () => new Promise<void>((resolve) => {
      setTimeout(resolve, LV2_COMPLETION_SCHEDULER_INSTALL_DELAY_MS);
    }).then(() => (cancelled ? undefined : import('./learning_v2_completion_background_scheduler')))
      .then((scheduler) => {
        if (cancelled || !scheduler) {
          console.log('[FIRST-FRAME] lv2_completion_scheduler_install: skip — эффект снят до установки');
          return;
        }
        scheduler.ensureLearningV2CompletionBackgroundSchedulerInstalled();
      })
      .catch(noteSwallowedHandler('_layout:useEffect.call_3')), { holdDuringOnboarding: true });
    return () => {
      cancelled = true;
      cancelDeferred();
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
  // зачем (пакет 07:26): когда вызван setFirstContentReady(true) — строка «splash gate» печатает, сколько прошло до фиксации.
  const firstContentReadySetAtRef = useRef<number | null>(null);
  const runHeavyInitRef = useRef<(() => void) | null>(null);
  const heavyInitStartedRef = useRef(false);
  // зачем (12.10, [COLD-START-HOLD]): отличить «инициализация прошла» от «отменена до запуска и потеряна».
  const heavyInitRanRef = useRef(false);
  const heavyInitCancelledBeforeRunRef = useRef(false);
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
  const { studyTarget } = useStudyTarget();
  // зачем (аудит 2026-08-28, тот же класс бага что в flashcards_collection.tsx):
  // hasPremiumAccess — полный законный доступ (покупка ИЛИ VIP ИЛИ intro ИЛИ
  // admin-override), isPremium/isVip — только узкие подтверждённые статусы.
  // hasVerifiedRealPremiumOrVip() ниже раньше проверял isPremium||isVip и
  // мог вытолкнуть winback/intro-ended пейволл человеку с admin-override
  // доступом (как у Виталия: premium_plan='annual', admin_premium_override=true,
  // но не realPremium/vip флаг).
  const { hasPremiumAccess, isPremium: premiumForAudience, isVip: vipForAudience, accessResolved } = usePremium();
  // зачем (п.70 №2): аудитории рассылки («только free / только premium») — доступ из PremiumContext, а не повторное
  // чтение users/{uid}; та же трактовка, что isPremiumAccessProgressActive (покупка ИЛИ VIP). Пока доступ не
  // разрешён — null, и рассылка читает документ сама. Ref — чтобы смена доступа не перезапускала проверку рассылки.
  const broadcastAudienceAccessRef = useRef<boolean | null>(null);
  broadcastAudienceAccessRef.current = accessResolved ? (premiumForAudience || vipForAudience) : null;
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

  // зачем (правило владельца 22.09 «уведомлений об удалении не показывать никогда», координатор 12.10):
  // окно «Аккаунт удалён на другом устройстве» убрано. Выход и очистка при удалении остались как были
  // (handleAccountDeletedOnAnotherDevice); здесь только снимаем флаг показа и пишем в лог, почему окна нет.
  const showRemoteAccountDeletionNotice = useCallback(async () => {
    const pending = await consumeRemoteAccountDeletionNotice();
    if (!pending) return;
    console.log('[ACC-DELETED-REMOTE] notice_suppressed', JSON.stringify({ reason: 'owner_rule_no_deletion_notices', flagConsumed: true }));
  }, []);

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
  // зачем (R1, двойной монтаж Главной): стоим ли мы уже внутри группы (tabs) — от этого зависит, можно ли уйти с `/` на Главную без пересоздания каркаса (см. эффект root_replace ниже).
  // useSegments типизирован union'ом всех маршрутов (TS2590 в массивах зависимостей) — сужаем до readonly string[] и держим в ref.
  const rootSegments: readonly string[] = useSegments();
  const rootSegmentsRef = useRef(rootSegments);
  rootSegmentsRef.current = rootSegments;
  // зачем (R1): живое состояние навигации для проверки после navigate с корня (getCurrentRoute обновляется синхронно, в отличие от pathname из рендера)
  const rootNavigationContainerRef = useNavigationContainerRef() as unknown as { getCurrentRoute?: () => { name?: string; params?: unknown } | undefined };
  // зачем (координатор 14.10, [PAYWALL-CLOSE-FREEZE]): снимок корневого стека для журнала после закрытия пейвола (только dev, только чтение).
  if (__DEV__) registerRootNavProbe(rootNavigationContainerRef);
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
      // зачем (координатор 11.10, ANR при 1,87 ГБ pss): размер JS-кучи на готовой Главной и через минуту.
      void import('./mem_probe').then((m) => m.armMemoryProbeAfterHomePaint())
        .catch((error: unknown) => console.warn('[MEM] probe import failed', error instanceof Error ? error.message : String(error)));
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
    // зачем (координатор 11.10, пункт B): открытие базы телефона на свежем онбординге шло 22 с и стопорило поток на
    // 7,7 с (cipher) — тапы онбординга ждали. Онбордингу база не нужна (его записи идут в хранилище и импортируются
    // позже), поэтому ждём его конца: эффект перезапустится, когда effectiveShowOnboarding станет false.
    if (effectiveShowOnboarding) {
      console.log('[ONB-DEFER] hold label=phone_state_bootstrap reason=onboarding_active');
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
            // зачем: стартовый проход делит один промис с одновременным чтением монет экранами (замер №9).
            recoverAndHydrateLevelSpinStarGrants(token, { shareInFlight: true })
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
  }, [accountGeneration, effectiveShowOnboarding, firstContentReady, homePaintedForPhoneState, ready]);

  useEffect(() => {
    if (!ready || !firstContentReady || !appIsActive || effectiveShowOnboarding || isBanned) return;
    if (accountGeneration.phase !== 'active' || !accountGeneration.stableId) return;
    const token = accountGeneration;
    let cancelled = false;
    const forcedKey = token.stableId ?? '';
    // зачем (п.70 №1): метка «уже форсили» — на диске по stableId; раньше в памяти, и каждый холодный старт тянул
    // входящие принудительно (до 240 чтений). force — только при настоящем входе в аккаунт, иначе срок жизни 6 ч.
    void claimAppMessagesLoginForce(forcedKey)
      .then((decision) => {
        const isLoginRefresh = decision.force;
        console.log('[APP-MESSAGES-REFRESH]', JSON.stringify({ // guard-ok: одна строка на возврат в приложение — решение «сеть или кэш»
          mode: isLoginRefresh ? 'login_force' : 'foreground_interval',
          markSource: decision.source,
          minIntervalMs: isLoginRefresh ? 0 : APP_MESSAGES_FOREGROUND_MIN_INTERVAL_MS,
        }));
        return refreshAppMessagesSnapshotOnce(isLoginRefresh
          ? { force: true }
          : { minIntervalMs: APP_MESSAGES_FOREGROUND_MIN_INTERVAL_MS });
      })
      .then(async (snapshot) => {
        if (cancelled || !isCurrentAccountGeneration(token, token.stableId)) return;
        setPersonalAdminMessage(pickNextLoginPersonalMessage(snapshot));
        // зачем (координатор 12.10): новичку — после онбординга < суток — объявления «что нового» не показываем (app/fresh_install_gate.ts).
        const queue = listPendingAppMessageModals(snapshot, hasPremiumAccess);
        const verdict = queue.length > 0 ? await readFreshInstallVerdict() : null;
        if (cancelled || !isCurrentAccountGeneration(token, token.stableId)) return;
        // зачем (Авторизация 12.10, system-012): пока стоит dev `appmessage`, сетевое обновление не затирает демо-сообщение в окне (в сторе геттер = null)
        if (getDevAppMessage()) {
          console.log(`[DEV-STATE] окно объявления: сетевая очередь (${queue.length}) не применена — показано демо-сообщение`); // guard-ok: dev-ветка
          return;
        }
        setAppMessageModalQueue(verdict ? skipAnnouncementsForFreshInstall(queue, verdict) : queue);
      })
      .catch(noteSwallowedHandler('_layout:useEffect.refreshAppMessagesSnapshotOnce'));
    return () => { cancelled = true; };
  }, [accountGeneration, appIsActive, effectiveShowOnboarding, firstContentReady, hasPremiumAccess, isBanned, ready]);

  useEffect(() => {
    // зачем: D70 + D84 (владелец 2026-09-30) — остаток жемчуга обнуляется только на
    // устройстве, одной операцией в локальном журнале. Не на первом кадре: модуль
    // грузится лениво через ~20 с и работает, только если баланс > 0.
    // зачем: владелец 15.10 (D195) — бонусы конвертируются в монеты, жемчуг не сжигать. Остаток лежит нетронутым до серверной
    // конвертации (снимок users.shards); сжигание D70/D84 выключено целиком, модуль не грузится.
    if (PEARL_RETIRE_DISABLED_D195) return;
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
    // зачем (Авторизация 12.10, system-012): демо-сообщение dev `appmessage` живёт только в памяти — подтверждение не отправляем
    if (messageId.startsWith(DEV_SETTINGS_CAMPAIGN_PREFIX)) {
      console.log(`[DEV-STATE] окно объявления: демо-сообщение ${messageId} закрыто — подтверждение не отправляется`); // guard-ok: dev-ветка
      return;
    }
    if (!ownerUid || !isCurrentAccountGeneration(accountGeneration, ownerUid)) return;
    await acknowledgeAppMessageModal(messageId, ownerUid).catch(noteSwallowedHandler('_layout:useCallback.acknowledgeAppMessageModal'));
  }, [accountGeneration]);

  // зачем (Авторизация 12.10, system-012): dev `appmessage=announcement` кладёт демо-сообщение в очередь окна из памяти — без сети и без
  // отсечки «новичок < суток»; в стор-сборке подписка — заглушка (store_release_stubs/dev_state/dev_social_state_stub.ts)
  useEffect(() => subscribeDevAppMessage((kind) => {
    if (!kind) return;
    console.log(`[DEV-STATE] окно объявления: демо-сообщение ${kind} в очередь`); // guard-ok: dev-ветка
    setAppMessageModalQueue([devAnnouncementModalMessage(Date.now())]);
  }), []);

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
    // зачем (координатор 13.10, вариант «б», замер Сверки 57ecd26e6): прежний таймер 1,2 с от монтирования ставил первый —
    // единственный дорогой (подъём нативного аудио, до 1,5 с) — плеер в окно премаунта вкладок. Теперь обе волны идут после
    // кадра Главной + паузы под премаунт (modules/audio/startup_sfx_prewarm.ts), одной очередью: нажатия, затем конец урока.
    // Ранний тап до прогрева звучит с задержкой — play() создаёт плеер сам.
    const cancelStartupPrewarm = scheduleStartupSfxPrewarm({
      whenHomePainted,
      runAfterInteractions: (task) => InteractionManager.runAfterInteractions(task),
      setTimer: (task, ms) => setTimeout(task, ms),
      clearTimer: (timer) => clearTimeout(timer),
      now: () => Date.now(),
      prewarm: (reason) => {
        soundDirector.prewarm([
          'pm.ui.tap_soft',
          'pm.ui.tap_primary',
          'pm.ui.tap_blocked',
        ]);
        // Вторая волна — звуки конца урока; при DEFER_LESSON_END_SFX_PREWARM_TO_SESSION уходит на вход в занятие (эффект ниже).
        const lessonEndPlan = lessonEndPrewarmPlan();
        if (lessonEndPlan === 'startup_timer') prewarmLessonEndSfx(reason);
        else console.log(`[SFX-PREWARM] lesson_end plan=${lessonEndPlan} — на старте не греем`);
      },
    });
    return cancelStartupPrewarm;
  }, []);

  useEffect(() => {
    if (lessonEndPrewarmPlan() !== 'on_session_entry' || !isSessionEntryPath(pathname)) return;
    prewarmLessonEndSfx(`session_entry:${pathname}`);
  }, [pathname]);

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
      deeplinkSettingsTrace('url_event', {
        url: maskDeepLinkForLog(url),
        target: target ? maskDeepLinkForLog(target) : null,
        currentPath: pathnameRef.current ?? null,
      });
      if (!target) return;
      setPendingWarmDeepLink(target);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const targetIsDevUtilityRoute = isDevUtilityRoutePath(pendingWarmDeepLink);
    if (!pendingWarmDeepLink || !ready || !rootNavigationReady || isBanned || (showOnboarding && !targetIsDevUtilityRoute)) {
      if (pendingWarmDeepLink) {
        deeplinkSettingsTrace('open:wait', {
          target: maskDeepLinkForLog(pendingWarmDeepLink), ready, rootNavigationReady, isBanned, showOnboarding,
          currentPath: pathnameRef.current ?? null,
        });
      }
      return;
    }
    const target = pendingWarmDeepLink;
    setPendingWarmDeepLink(null);
    deeplinkSettingsTrace('open:start', {
      target: maskDeepLinkForLog(target),
      currentPath: pathnameRef.current ?? null,
      devUtility: isDevUtilityRoutePath(target),
      tabsGroup: isTabsGroupRoutePath(target),
    });

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

    // зачем (Сверка 11.10, падение Fabric «addViewAt: The specified child already has a parent» на тёплой
    // phraseman://settings): роутер САМ открывал вкладку по redirectSystemPath, а эта ветка сразу делала ещё
    // router.replace на ту же вкладку. replace из стекового экрана пересоздавал вкладки: замороженная 270 с вкладка
    // настроек монтировалась, через 924 мс снималась повторно — и падение. Теперь вкладка идёт общим путём ниже:
    // ждём, открыл ли роутер сам; если нет — navigate (переключает вкладку, НЕ пересоздаёт; повтор безопасен).
    const targetIsTab = isTabsGroupRoutePath(target);
    if (targetIsTab) {
      traceLessonExit('layout:deeplink_tabs_deferred', { target: maskDeepLinkForLog(target) });
      deeplinkSettingsTrace('open:tabs_deferred', { target: maskDeepLinkForLog(target), currentPath: pathnameRef.current ?? null });
    }

    // зачем (эмулятор 30.09): expo-router САМ открывает тёплую ссылку через
    // redirectSystemPath, а этот слушатель открывал её второй раз — в стеке
    // лежали две копии экрана. Первое «назад» снимало копию и выглядело
    // мёртвым, а у неизвестной ссылки нижняя заглушка +not-found оставалась
    // пустым экраном навсегда. Путь в этот момент ещё старый (замер: push шёл
    // при currentPath=/home), поэтому ждём и открываем сами, только если
    // навигация ссылку не открыла (онбординг, неготовый корень).
    // Путь роутера — без групп: /(tabs)/settings у него /settings.
    const targetPath = (target.split(/[?#]/)[0] ?? '').replace(/\/\([^/)]+\)(?=\/|$)/g, '').replace(/\/$/, '');
    // Таймер в ref, а не в cleanup эффекта: setPendingWarmDeepLink(null) выше
    // сразу перезапускает эффект, и cleanup снял бы ожидание до срабатывания.
    if (warmDeepLinkTimerRef.current) clearTimeout(warmDeepLinkTimerRef.current);
    warmDeepLinkTimerRef.current = setTimeout(() => {
      warmDeepLinkTimerRef.current = null;
      const currentPath = pathnameRef.current?.replace(/\/$/, '') || '';
      deeplinkSettingsTrace('open:self_open_check', { targetPath, currentPath, willPush: !(targetPath && targetPath === currentPath) });
      if (targetPath && targetPath === currentPath) {
        if (__DEV__) {
          console.log("[V2-PAGE] deeplink:skip_already_open", JSON.stringify({ target: maskDeepLinkForLog(target), currentPath }));
        }
        return;
      }
      if (__DEV__) {
        console.log("[V2-PAGE] deeplink:push", JSON.stringify({ target: maskDeepLinkForLog(target), currentPath }));
      }
      if (targetIsTab) {
        deeplinkSettingsTrace('open:tabs_navigate', { target: maskDeepLinkForLog(target), currentPath });
        router.navigate(target as Href);
        return;
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
    // зачем (Сверка 10.10 21:55, холодный `phraseman://video` уходил на Главную): распознанная при холодном старте
    // ссылка на вкладку открывается вместо Главной — иначе этот переход её съедал.
    // Забранная ссылка держится в ref: перезапуск эффекта до смены маршрута не должен вернуть Главную.
    if (initialDeepLinkRef.current === undefined) initialDeepLinkRef.current = consumeInitialDeepLinkTarget();
    const rootTarget = initialDeepLinkRef.current ?? '/(tabs)/home';
    deeplinkSettingsTrace('root_replace', {
      pathname: pathname ?? null,
      initialLink: initialDeepLinkRef.current ? maskDeepLinkForLog(initialDeepLinkRef.current) : null,
      target: maskDeepLinkForLog(rootTarget),
    });
    traceLessonExit('layout:rootIndex_replace_home', {
      pathname: pathname === undefined ? 'undefined' : JSON.stringify(pathname),
      ready,
      rootNavigationReady,
      effectiveShowOnboarding,
      isBanned,
      target: rootTarget.split('?')[0],
      // зачем (СПЕРВА ЛОГИ, просьба Сверки 12.10): значения, которые решают ветку navigate/replace — раньше их в строке не было, и ложное условие по сегментам осталось незамеченным
      segments: JSON.stringify(rootSegmentsRef.current),
      tabsShellMounted: isTabsShellMounted(),
    });
    // зачем (R1, двойной монтаж Главной; журнал [PERF-R1-NAV] Сверки 12.10: REPLACE name="(tabs)" через ≈1,5 с после первого кадра, затем весь каркас монтируется заново): холодный старт стоит на `/` ВНУТРИ группы
    // (tabs) — каркас табов уже показывает Главную. router.replace пересоздаёт маршрут (tabs) с новым ключом и перемонтирует весь каркас (≈1,8–2,1 с работы выбрасывается, устойчивый первый кадр откладывается).
    // navigate на ту же вкладку маршрут не пересоздаёт — так же переключаются табы. Подстраховка: если за 600 мс путь так и остался корневым — прежний replace (с ценой перемонтажа, но экран не залипнет на `/`).
    // Условие — «каркас табов уже смонтирован» (app/tabs_shell_state.ts), а НЕ сегменты: на холодном старте фокус стоит на корневом `index` (сегменты пусты), каркас (tabs) живёт под ним;
    // navigate к уже существующему маршруту (tabs) возвращает к нему и снимает `index`, не создавая новый.
    if (rootTarget === '/(tabs)/home' && isTabsShellMounted()) {
      traceLessonExit('layout:rootIndex_navigate_home', { segments: JSON.stringify(rootSegmentsRef.current), target: rootTarget });
      router.navigate(rootTarget as Href);
      const navigateFallback = setTimeout(() => {
        // зачем (журнал Сверки with_navigate_fix2): pathname из рендера (pathnameRef) отставал при занятом JS-потоке, и запасной replace пересоздавал каркас ПОСЛЕ успешного navigate.
        // Решаем по живому состоянию навигации: сфокусирован `(tabs)` — navigate сработал, оставляем; иначе — прежний replace.
        const current = rootNavigationContainerRef.getCurrentRoute?.();
        const action = rootNavigateFallbackAction(current?.name);
        traceLessonExit('layout:rootIndex_navigate_home_check', {
          currentRoute: current?.name ?? null,
          params: JSON.stringify(current?.params ?? null).slice(0, 120),
          pathnameFromRender: JSON.stringify(pathnameRef.current ?? null),
          action,
        });
        if (action === 'replace') router.replace(rootTarget as Href);
      }, 600);
      return () => clearTimeout(navigateFallback);
    }
    router.replace(rootTarget as Href);
    const retry = setTimeout(() => {
      traceLessonExit('layout:rootIndex_replace_home_retry', { pathname: pathname === undefined ? 'undefined' : JSON.stringify(pathname), target: rootTarget.split('?')[0] });
      router.replace(rootTarget as Href);
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
    setMemTickRoute(pathname);
    if (/settings/i.test(pathname) || /settings/i.test(previous ?? '')) {
      deeplinkSettingsTrace('path_change', { previous: previous ?? null, next: pathname });
    }
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
      // зачем (пакет 07:26): сколько прошло от setFirstContentReady(true) до этой фиксации гейта.
      sinceFirstContentSetMs: firstContentReady && firstContentReadySetAtRef.current !== null
        ? Date.now() - firstContentReadySetAtRef.current : null,
    });
  }, [fontsReady, ready, firstContentReady, homeScreenReady, effectiveShowOnboarding, isBanned, liquidGlassChoiceReady, nativeSplashCanHide]);
  useEffect(() => {
    const sub = onAppEvent('app_home_screen_ready', () => setHomeScreenReady(true));
    return () => sub.remove();
  }, []);
  // зачем (координатор 05.10, одобрено «после цифр»): снять сплеш в колбэке кадра Главной, не дожидаясь коммита корня.
  // Флаги — значения последнего коммита. Онбординг/бан/не готово → не прятать и печатать, какой флаг держит;
  // тогда сплеш снимет прежний гейт nativeSplashCanHide.
  const splashGateRef = useRef({ fontsReady, ready, liquidGlassChoiceReady, effectiveShowOnboarding, isBanned });
  splashGateRef.current = { fontsReady, ready, liquidGlassChoiceReady, effectiveShowOnboarding, isBanned };
  useEffect(() => {
    let cancelled = false;
    void whenHomePainted(120_000).then((outcome) => {
      if (cancelled) { bootMark('HOME-PAINT early hide: skip', { reason: 'unmounted' }); return; }
      if (splashEarlyHideDone) { bootMark('HOME-PAINT early hide: skip', { reason: 'already_done' }); return; }
      if (splashGateHideDone) { bootMark('HOME-PAINT early hide: skip', { reason: 'gate_already_hid' }); return; }
      if (outcome !== 'painted') { bootMark('HOME-PAINT early hide: skip', { reason: outcome }); return; }
      const gate = splashGateRef.current;
      const holding = [
        gate.fontsReady ? null : 'fontsReady',
        gate.ready ? null : 'ready',
        gate.liquidGlassChoiceReady ? null : 'liquidGlassChoiceReady',
        gate.effectiveShowOnboarding ? 'effectiveShowOnboarding' : null,
        gate.isBanned ? 'isBanned' : null,
      ].filter((flag): flag is string => flag !== null);
      if (holding.length > 0) { bootMark('HOME-PAINT early hide: held', { holding, ...gate }); return; }
      splashEarlyHideDone = true;
      bootMark('HOME-PAINT early hide — сплеш скрыт по кадру Главной', gate);
      void SplashScreen.hideAsync().catch(noteSwallowedHandler('_layout:homePaintEarlyHide.hideAsync'));
      Animated.timing(startupHoldEarlyDismissOpacity, {
        toValue: 0, duration: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }).start();
      resolveNativeSplashHidden();
      markNativeSplashHidden();
    });
    return () => { cancelled = true; };
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
    bootCommitWindowEndsAt = Date.now() + 3000;
    // зачем (пакет 09:26: после early hide +9016 был ещё hideAsync +13112): сплеш уже снят по кадру Главной —
    // повторный нативный вызов не нужен и может дать необработанный отказ.
    if (splashEarlyHideDone) {
      bootMark('SplashScreen.hideAsync() пропущен — сплеш уже снят по кадру Главной');
    } else {
      splashGateHideDone = true;
      bootMark('SplashScreen.hideAsync() — сплеш скрыт');
      void SplashScreen.hideAsync().catch(noteSwallowedHandler('_layout:nativeSplashCanHide.hideAsync'));
    }
    resolveNativeSplashHidden();
    markNativeSplashHidden();
  }, [nativeSplashCanHide]);

  useEffect(() => {
    const sub = onAppEvent('app_first_content_ready', () => {
      // зачем (пакет 01:26): событие пришло на +6236, а ворота до +8214 видели false. Печатаем, взведён ли уже
      // таймер (повтор игнорируется) и на сколько он реально опоздал — так видно, стоит ли JS-поток.
      const pending = firstContentReadyTimerRef.current !== null;
      bootMark('app_first_content_ready event received', { timerAlreadyPending: pending });
      if (firstContentReadyTimerRef.current) return;
      const armedAt = Date.now();
      firstContentReadyTimerRef.current = setTimeout(() => {
        firstContentReadyTimerRef.current = null;
        bootMark('firstContentReady timer fired -> setFirstContentReady(true)', { plannedMs: 32, lateMs: Date.now() - armedAt - 32 });
        if (firstContentReadySetAtRef.current === null) firstContentReadySetAtRef.current = Date.now();
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
    const fallbackArmedAt = Date.now();
    const timer = setTimeout(() => {
      bootMark('firstContentReady FALLBACK fired (экран не прислал событие)', {
        plannedMs: FIRST_CONTENT_READY_FALLBACK_MS,
        lateMs: Date.now() - fallbackArmedAt - FIRST_CONTENT_READY_FALLBACK_MS,
      });
      if (firstContentReadySetAtRef.current === null) firstContentReadySetAtRef.current = Date.now();
      setFirstContentReady(true);
    }, FIRST_CONTENT_READY_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [effectiveShowOnboarding, firstContentReady, isBanned, ready]);

  // зачем (координатор 11.10, пункт B): тяжёлые задачи после первого кадра (holdDuringOnboarding) ждут конца онбординга.
  // До ready состояние онбординга неизвестно — задачи идут по-старому; после — ворота знают, идёт ли он.
  useEffect(() => {
    if (!ready) return;
    setOnboardingDeferActive(effectiveShowOnboarding, '_layout');
  }, [effectiveShowOnboarding, ready]);

  useEffect(() => {
    // зачем (координатор 12.10, сперва логи): у Сверки 8 раз `deferred:cancel label=heavy_init`. Флаг «начата» ставится до
    // запуска, а отмена его не снимает — перезапуск эффекта тогда выходит здесь, и инициализация не идёт больше никогда.
    // Печатаем значения, решившие ветку, и отдельно LOST, если прошлую отложенную инициализацию сняли до запуска.
    const gate = { ready, effectiveShowOnboarding, isBanned, firstContentReady, started: heavyInitStartedRef.current, ran: heavyInitRanRef.current };
    if (!ready || effectiveShowOnboarding || isBanned || !firstContentReady || heavyInitStartedRef.current) {
      if (heavyInitStartedRef.current && !heavyInitRanRef.current && heavyInitCancelledBeforeRunRef.current) {
        console.warn('[COLD-START-HOLD] heavy_init:LOST — прошлую отложенную инициализацию отменили до запуска, повтора не будет', JSON.stringify(gate)); // guard-ok: ранний выход логируется
      } else {
        console.log('[COLD-START-HOLD] heavy_init:skip', JSON.stringify(gate)); // guard-ok: ранний выход логируется
      }
      return;
    }
    heavyInitStartedRef.current = true;
    console.warn('[COLD-START-HOLD] heavy_init:schedule', JSON.stringify({ ...gate, boot: `+${Date.now() - BOOT_T0}ms` })); // guard-ok: трассировка старта
    let timer: ReturnType<typeof setTimeout> | null = null;
    // зачем: PM-211 — firstContentReady может прийти запасным таймером (400 мс) раньше,
    // чем доедет чанк Главной; тогда прогрев друзей/магазина/аналитики делил поток с её
    // первым кадром. Теперь ждём кадр Главной (или потолок 2,5 с), затем взаимодействия.
    const cancelDeferred = runAfterHomeFirstFrame('heavy_init', () => {
      timer = setTimeout(() => {
        timer = null;
        heavyInitRanRef.current = true;
        console.warn('[COLD-START-HOLD] heavy_init:run', JSON.stringify({ hasRunner: runHeavyInitRef.current !== null, boot: `+${Date.now() - BOOT_T0}ms` })); // guard-ok: трассировка старта
        runHeavyInitRef.current?.();
      }, 250);
    });
    return () => {
      if (timer) clearTimeout(timer);
      if (!heavyInitRanRef.current) heavyInitCancelledBeforeRunRef.current = true;
      console.warn('[COLD-START-HOLD] heavy_init:effect_cleanup', JSON.stringify({ ran: heavyInitRanRef.current, timerPending: timer !== null, boot: `+${Date.now() - BOOT_T0}ms` })); // guard-ok: трассировка старта
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
            console.log(`[BAN-CHECK] кэш ageMs=${Date.now() - at} banned=${String(raw === '1')} — сеть не нужна`); // guard-ok: ранний выход называет причину
            setIsBanned(raw === '1');
            return;
          }
        }
      }
      const firestoreModule = await import('@react-native-firebase/firestore');
      const db = firestoreModule.default();
      const uid = await getCanonicalUserId();
      if (!uid) {
        console.log('[BAN-CHECK] пропуск: нет uid'); // guard-ok: ранний выход называет причину
        return;
      }
      // зачем (п.70 №2): поле `banned` берём из документа users/{uid}, который восстановление уже прочитало (ждём его
      // не дольше BAN_RESTORE_DOC_WAIT_MS); список banned_users читается всегда, TTL кэша бана прежний — 30 мин.
      const [banDoc, restorePeek] = await Promise.all([
        db.collection('banned_users').doc(uid).get(), // guard-ok: один документ по id
        force ? Promise.resolve(null) : waitForRestoreUserDocBanned(uid, BAN_RESTORE_DOC_WAIT_MS),
      ]);
      let bannedByFlag: boolean;
      if (restorePeek?.source === 'restore_doc') {
        bannedByFlag = restorePeek.banned;
        console.log(`[BAN-CHECK] users/{uid} из восстановления ageMs=${restorePeek.ageMs} banned=${String(bannedByFlag)} (второе чтение не нужно)`); // guard-ok: источник значения
      } else {
        const userDoc = await db.collection('users').doc(uid).get(); // guard-ok: один документ по id
        bannedByFlag = !!userDoc?.data?.()?.banned;
        console.log(`[BAN-CHECK] users/{uid} из сети reason=${force ? 'force' : restorePeek?.reason ?? 'none'} banned=${String(bannedByFlag)} fromCache=${String(userDoc?.metadata?.fromCache ?? false)}`); // guard-ok: источник значения
      }
      const bannedByList = !!banDoc?.exists;
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
  // зачем (координатор 12.10, cards-009/010): dev_state?overlays=off гасит окна корня, а запрос повторной сверки (после onboarding=done) перезапускает проверку рассылки по воротам свежей установки. В стор-сборке снимок всегда '0:0'.
  const devOverlaysSnapshot = useSyncExternalStore(subscribeDevOverlays, getDevOverlaysSnapshot, getDevOverlaysSnapshot);
  const devOverlaysOff = devOverlaysSnapshot.startsWith('1');
  const checkGlobalBroadcastFn = useCallback(async () => {
    if (IS_EXPO_GO) return;
    if (isDevOverlaysOff()) {
      console.log('[OVERLAY-QUEUE] broadcast: чтение пропущено — dev overlays=off'); // guard-ok: ранний выход называет причину
      return;
    }
    if (globalBroadcastCheckInFlightRef.current) return;
    if (globalBroadcastModal) return;
    globalBroadcastCheckInFlightRef.current = true;
    try {
      // зачем (координатор 12.10, «сперва логи» и защита новичка): окно-рассылка («Замочки ушли в отпуск!») всплывало поверх Главной сразу после онбординга. Новичку (свежая установка, <24 ч — app/fresh_install_gate.ts)
      // рассылку не читаем вовсе: меньше чтений и нет окна поверх первого впечатления; со следующего захода после суток — как раньше.
      const verdict = await readFreshInstallVerdict();
      if (verdict.fresh) {
        console.log(`[OVERLAY-QUEUE] broadcast: чтение пропущено — свежая установка reason=${verdict.reason} ageMs=${String(verdict.ageMs)}`); // guard-ok: ранний выход называет причину
        return;
      }
      const payload = await fetchPendingGlobalBroadcastModal(studyTarget, { premiumAudienceAccess: broadcastAudienceAccessRef.current });
      console.log(`[OVERLAY-QUEUE] broadcast: запрошено id=${payload?.id ?? 'нет'} kind=${payload?.kind ?? '-'} награда=${payload ? `${payload.rewardType}:${payload.rewardAmount}` : '-'}`); // guard-ok: результат запроса
      if (payload) setGlobalBroadcastModal(payload);
    } finally {
      globalBroadcastCheckInFlightRef.current = false;
    }
  }, [globalBroadcastModal, studyTarget]);

  useEffect(() => {
    const t = setTimeout(() => { void checkGlobalBroadcastFn(); }, 1400);
    return () => clearTimeout(t);
  }, [checkGlobalBroadcastFn]);

  // зачем (координатор 12.10, «сперва логи» и защита новичка): рассылка могла быть считана ДО конца онбординга (проверка идёт на старте), а видимой становится сразу после него — это и есть окно поверх Главной у новичка.
  // После онбординга сверяем с воротами свежей установки: новичку считанную рассылку снимаем (на сервере она остаётся непрочитанной и придёт после суток).
  useEffect(() => {
    if (!globalBroadcastModal || effectiveShowOnboarding || !ready) return undefined;
    let cancelled = false;
    void readFreshInstallVerdict().then((verdict) => {
      if (cancelled) return;
      if (verdict.fresh) {
        console.log(`[OVERLAY-QUEUE] broadcast: id=${globalBroadcastModal.id} снята после онбординга — свежая установка ageMs=${String(verdict.ageMs)}, придёт после суток`); // guard-ok: ветвление называет причину
        setGlobalBroadcastModal(null);
        return;
      }
      console.log(`[OVERLAY-QUEUE] broadcast: id=${globalBroadcastModal.id} остаётся в очереди окон (не новичок: reason=${verdict.reason})`); // guard-ok: ветвление называет причину
    });
    return () => { cancelled = true; };
  }, [devOverlaysSnapshot, effectiveShowOnboarding, globalBroadcastModal, ready]);

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
    // зачем (координатор 12.10, R1 «Уроки 3,6 с»): [LESSONS-BOOT] — успевает ли прогрев до монтажа вкладки
    // (вкладка монтируется заранее, сразу после первого кадра Главной); пропуск прогрева тоже пишет причину.
    const primeScheduledAtMs = Date.now();
    if (__DEV__) console.log(`[LESSONS-BOOT] layout_prime:scheduled ${JSON.stringify({ studyTarget, atEpochMs: primeScheduledAtMs })}`);
    const task = InteractionManager.runAfterInteractions(() => {
      const interactionsDoneAtMs = Date.now();
      primeTimer = setTimeout(() => {
        if (cancelled || AppState.currentState !== 'active') {
          if (__DEV__) console.log(`[LESSONS-BOOT] layout_prime:skip ${JSON.stringify({ studyTarget, reason: cancelled ? 'cancelled' : `app_state_${AppState.currentState}` })}`);
          return;
        }
        if (__DEV__) {
          console.log(`[LESSONS-BOOT] layout_prime:fire ${JSON.stringify({ studyTarget, waitInteractionsMs: interactionsDoneAtMs - primeScheduledAtMs, sinceScheduledMs: Date.now() - primeScheduledAtMs })}`);
        }
        void (async () => {
          try {
            const tab = await import('./lessons_tab_state');
            await tab.loadLessonsTabStateFromStorage(studyTarget, 'layout_prime');
          } catch (e) {
            console.warn('[LESSONS-BOOT] layout_prime:failed', e instanceof Error ? e.message : String(e));
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
      // зачем (координатор 11.10, «сперва логи»): content_migration.wait_cloud ждал облако 67 с, а шагов восстановления
      // в журнале не было вовсе. Делим время: анонимный вход отдельно, восстановление отдельно, плюс итог и причина.
      const bootRestoreStartedAt = Date.now();
      // зачем (пункт (а)): метка владельца пишется только для того же поколения аккаунта, что начало восстановление.
      const ownerMarkToken = captureAccountGeneration();
      await ensureAnonUser();
      const anonMs = Date.now() - bootRestoreStartedAt;
      void resumePendingOnboardingFunnel().catch(noteSwallowedHandler('_layout:restoreCloudForBoot.resumePendingOnboardingFunnel'));
      void resumePendingAgeConsent().catch(noteSwallowedHandler('_layout:restoreCloudForBoot.resumePendingAgeConsent'));
      const restoreStartedAt = Date.now();
      const result = await restoreFromCloudWithRecoveryDetails(coldExamBestPctRestoreOptions);
      console.log('[BOOT-RESTORE]', JSON.stringify({
        anonMs,
        restoreMs: Date.now() - restoreStartedAt,
        totalMs: Date.now() - bootRestoreStartedAt,
        status: result.status,
        failureReason: result.failureReason ?? null,
      }));
      bootRestoreFailureReason = result.failureReason;
      // зачем (пункт (а)): успешное восстановление (или облака нет) — этот телефон сведён с облаком этого аккаунта;
      // следующий холодный старт может отложить восстановление. Провал — метку не трогаем.
      if (result.status !== 'failed' && ownerMarkToken.stableId) {
        void writeBootRestoreOwnerMark(ownerMarkToken.stableId, () => isCurrentAccountGeneration(ownerMarkToken, ownerMarkToken.stableId));
      }
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
              messageRu: 'Облако сейчас недоступно. Открой приложение позже, чтобы повторить восстановление.',
              messageUk: 'Хмара зараз недоступна. Відкрий застосунок пізніше, щоб повторити відновлення.',
              // зачем (владелец 12.10, реестр п.76: английский интерфейс в R1): у тоста не было английского текста.
              messageEn: 'The cloud is unavailable right now. Open the app later to try restoring again.',
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
      // зачем (координатор 12.10): метка очистки кэша Firestore после удаления аккаунта читается этим же чтением — ни одного
      // отдельного нативного вызова на старте (было ~20 мс SecureStore у каждого).
      // + зеркало замка удаления: процесс могли убить между стиранием и записью метки (координатор 12.10) — тем же чтением.
      const startupIdentityKeys = forceOnboardingForQA ? [] : ['onboarding_done', BOOT_RESTORE_OWNER_KEY, FIRESTORE_CACHE_CLEAR_MARKER_KEY, ACCOUNT_DELETE_PENDING_AUTH_KEY];
      const startupIdentityPairsPromise: Promise<readonly [string, string | null][]> =
        AsyncStorage.multiGet(startupIdentityKeys).catch(noteSwallowedAs('_layout:bootstrap.multiGet', []));
      // Обработчик метки вешается РАНЬШЕ всех остальных потребителей этого чтения (восстановление из облака ниже) — clearPersistence
      // уходит до обращений бутстрапа к Firestore. Без метки — только проверка значения в памяти.
      if (!forceOnboardingForQA) {
        void startupIdentityPairsPromise.then((pairs) => {
          const startupValues = new Map(pairs);
          return runFirestoreCacheClearFromStartupRead(
            startupValues.get(FIRESTORE_CACHE_CLEAR_MARKER_KEY) ?? null,
            startupValues.get(ACCOUNT_DELETE_PENDING_AUTH_KEY) ?? null,
          );
        });
      }

      // Start cloud hydration early, but do not hold the first app frame on network.
      // зачем: прежде восстановление из облака ждало прогрев App Check до 1,2 с;
      // App Check снят навсегда (пломба владельца 2026-08-17, аудит E24).
      if (!IS_EXPO_GO && !forceOnboardingForQA) {
        const bootCoordinator = createBootCloudRestoreCoordinator({
          restore: () => restoreCloudForBoot(),
          hasLocalAccountData: () => hasMeaningfulLocalAccountData(),
          onHydrated: () => emitAppEvent('cloud_profile_hydrated'),
        });
        // зачем (пункт (а), координатор 11.10): вернувшемуся на этом телефоне человеку облако приходит после кадра
        // Главной и простоя (не позже 8 с) — восстановление больше не делит поток с первым кадром. Промис назначается
        // СРАЗУ: второе место запуска (runHeavyInit) берёт его же и не стартует своё восстановление.
        // зачем (Сверка 12.10, 🔴): «личность готова» решается в async-блоке ниже по статусу И замку удаления —
        // 'pending_auth/prepared' отдаётся и обычному пользователю без замка (см. bootRestoreIdentityClean).
        const freshStatus = freshIdentity.status;
        const freshPhase = 'phase' in freshIdentity ? String(freshIdentity.phase ?? '') : '';
        const recoveryProceed = recoveryGate.result === 'proceed';
        const deferToken = captureAccountGeneration();
        // зачем (ревью Opus): повторный вход в bootstrap (повтор после дочистки удаления) не запускает второе
        // восстановление, пока отложенное ещё живо, — переиспользуем его промис и просто запускаем сейчас.
        const liveDeferred = cloudHydratePromise !== null && isDeferredBootRestoreActive() ? cloudHydratePromise : null;
        if (liveDeferred) {
          console.log('[BOOT-RESTORE-DEFER]', JSON.stringify({ event: 'bootstrap_reentry', action: 'reuse_and_start' }));
          requestDeferredBootRestoreStart('bootstrap_reentry');
        }
        cloudHydratePromise = liveDeferred ?? (async () => {
          const [identityPairs, cacheRaw, deleteLock] = await Promise.all([
            startupIdentityPairsPromise,
            readRemoteConfigCacheRaw().catch((error: unknown) => {
              console.warn('[BOOT-RESTORE-DEFER] кэш рубильника не прочитан — по умолчанию включено', String(error));
              return null;
            }),
            readAccountDeletePendingAuthRaw()
              .then((raw): BootRestoreDeleteLockState => inspectAccountDeletePendingAuth(raw).status)
              .catch((error: unknown): BootRestoreDeleteLockState => {
                console.warn('[BOOT-RESTORE-DEFER] замок удаления не прочитан — личность не считается чистой', String(error));
                return 'read_failed';
              }),
          ]);
          const identityReady = bootRestoreIdentityClean({ freshStatus, deleteLock });
          console.log('[BOOT-RESTORE-DEFER]', JSON.stringify({ event: 'identity', freshStatus, freshPhase, deleteLock, identityReady }));
          const identity = new Map(identityPairs);
          const decision = decideBootRestoreDefer({
            flagEnabled: bootRestoreDeferFlagFromCacheRaw(cacheRaw),
            onboardingDone: identity.get('onboarding_done') ?? null,
            identityReady,
            recoveryProceed,
            ownerMark: identity.get(BOOT_RESTORE_OWNER_KEY) ?? null,
            stableId: startupStableId,
            mutationTracking: isMutationTrackingActive(),
          });
          console.log('[BOOT-RESTORE-DEFER]', JSON.stringify({ event: 'decision', defer: decision.defer, reason: decision.reason }));
          if (!decision.defer) return bootCoordinator.run();
          return startDeferredBootRestore({
            run: () => bootCoordinator.run(),
            isAccountCurrent: () => isCurrentAccountGeneration(deferToken, startupStableId),
            whenHomePainted,
            runAfterInteractions: (cb) => { InteractionManager.runAfterInteractions(cb); },
            subscribeBackground: (cb) => {
              // зачем (ревью Opus): только настоящий уход в фон — 'inactive' на iOS бывает от системных запросов на старте.
              const sub = AppState.addEventListener('change', (state) => { if (state === 'background') cb(); });
              return () => sub.remove();
            },
          });
        })();
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
      // зачем (замер №7): сверка достижений по монетам вместе с чтением баланса держала очередь хранилища и замок
      // аккаунта ~9 с сразу после сплеша (стыковалась с загрузкой состояния телефона и стартом Блица). Сверка
      // не срочна — через 15 с после снятия сплеша.
      runAfterHomeFirstFrame('achievements_coins_boot_check', () => new Promise<void>((resolve) => { setTimeout(resolve, 15_000); }).then(() => getStableId())
        .then(() => getRunesBalanceRead())
        .then((read) => checkAchievements({ type: 'shards', balance: read.wallet.balance }))
        .catch((error: unknown) => console.warn('[ACHIEVEMENTS] coins_boot_check_failed', String(error))), { holdDuringOnboarding: true });
      // зачем (§142, правило владельца «каждый раздел открывается мгновенно»): окно Plus открывается
      // сразу (02a922192), но цены читались с диска уже после показа. Кэш цен читаем в память фоном
      // после первого кадра — только диск, без сети; модуль подгружаем динамически, не в старт.
      // зачем (координатор 12.10, «сначала логи»): taskMs=21661 на холодном dev-старте — делим время на загрузку модуля
      // (в dev Metro отдаёт его отдельным куском после перезапуска) и чтение кэша с диска.
      runAfterHomeFirstFrame('paywall_price_cache_warmup', () => { const warmStartedAt = Date.now(); let importMs = -1; return import('./paywall_price_cache')
        .then(({ hydratePaywallPriceCache }) => { importMs = Date.now() - warmStartedAt; return hydratePaywallPriceCache(); })
        .then((cache) => {
          const plans = cache ? [cache.yearly, cache.monthly].filter(Boolean).length : 0;
          const timing = `importMs=${importMs} hydrateMs=${Date.now() - warmStartedAt - importMs}`;
          console.warn(cache ? `[PAYWALL] цены прогреты: из кэша ${plans} ${timing}` : `[PAYWALL] цены прогреты: нет кэша ${timing}`); // guard-ok: одна строка на запуск, цепочка [PAYWALL]
        })
        .catch((error: unknown) => console.warn('[PAYWALL] цены: прогрев не удался', String(error))); }); // guard-ok: одна строка на запуск
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
        .catch((error: unknown) => console.warn('[PACK-CARD-REMOVE] flush на входе не удался', String(error))), { holdDuringOnboarding: true }); // guard-ok: одна строка на запуск

      let shouldPrimeLessonsAfterReveal = false;
      try {
        const startupIdentityPairs = await startupIdentityPairsPromise;
        const startupIdentity = new Map(startupIdentityPairs);
        const val = forceOnboardingForQA ? null : (startupIdentity.get('onboarding_done') ?? null);
        // зачем (HOME-COLD_cold1: Главная ждала свой multiGet ~6 с): тот же флаг Главной — из памяти, сразу.
        rememberOnboardingDonePeek(val === '1');

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
      // зачем (координатор 14.10, п.2): звуки V2 — после первого кадра Главной; флаг выключен → ни файла, ни импорта движка (modules/sound_v2/sound_v2_boot.ts)
      runAfterHomeFirstFrame('sound_v2_boot', () => import('../modules/sound_v2/sound_v2_boot').then(({ bootSoundV2 }) => bootSoundV2()));
      runAfterHomeFirstFrame('v2_audio_seed', () => Promise.all([
        whenHomePainted(15_000),
        whenNativeSplashHidden(15_000),
      ]).then(([paintWait, splashWait]) => new Promise<readonly [typeof paintWait, typeof splashWait]>((resolve) => {
        // зачем (координатор 13.10; профили Сверки sfx1–3, scripts/cpu_stacks.py): посев при КАЖДОМ запуске заново считает
        // sha256 тел в JS и сверяет кэш — ≈1,0–1,2 с работы потока (resolvePrepared… 550–640 мс, …RemoteAudioFilesForContentHashes
        // 390–490 мс с ленивой загрузкой модуля) ровно в окне премаунта вкладок и прогрева звуков (+5…+12 с). Занятию посев
        // заранее не нужен (готовит озвучку само), поэтому ещё пауза после кадра Главной и конец взаимодействий.
        const delayStartedAt = Date.now();
        setTimeout(() => {
          InteractionManager.runAfterInteractions(() => {
            console.log(`[V2-AUDIO-SEED] start paint=${paintWait} splash=${splashWait} delayedMs=${Date.now() - delayStartedAt}`);
            resolve([paintWait, splashWait] as const);
          });
        }, V2_AUDIO_SEED_AFTER_PAINT_DELAY_MS);
      })).then(([paintWait, splashWait]) => {
        const endAudioSeedStep = coldStartStep(`after_home.v2_audio_seed[${paintWait},${splashWait}]`, '_layout');
        const seedStartedAt = Date.now();
        return seedLearningV2BootstrapAudioCacheV1().catch((error) => {
          if (__DEV__) {
            console.log('[V2-AUDIO-SEED] failed', JSON.stringify({ reason: String(error) }));
          }
          DebugLogger.warn('[V2-AUDIO-SEED]', `bootstrap seed failed: ${String(error)}`);
          return 'failed' as const;
        }).then((outcome) => {
          console.log(`[V2-AUDIO-SEED] end outcome=${outcome === 'failed' ? 'failed' : 'ok'} ms=${Date.now() - seedStartedAt}`);
          endAudioSeedStep(outcome === 'failed' ? 'failed' : 'ok');
        });
      }), { holdDuringOnboarding: true });

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
      // зачем (ревью Opus): эффект снят — ожидающее восстановление запускаем сейчас, чтобы его промис разрешился, а
      // таймер потолка и подписка на фон снялись (start их снимает).
      requestDeferredBootRestoreStart('effect_disposed');
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

  // зачем (D186 этап 2, координатор 15.10): окно «72 часа» не рисуется с 4f6334b20 — его проверка «закончилось», открытие «welcome»
  // и запрос слота очереди окон удалены целиком: при возврате флага без окна слот занял бы невидимый держатель и заблокировал остальные окна.

  // План #7: winback-оффер вернувшимся после 7+ дней неактивности.
  // ВАЖНО: сначала ОЦЕНИВАЕМ по сохранённой активности, ПОТОМ записываем свежую —
  // иначе разрыв всегда ~0. Не показываем одновременно с intro_ended (не два пейвола разом).
  const checkWinbackOffer = useCallback(async () => {
    if (!ready || effectiveShowOnboarding || isBanned || !firstContentReady) {
      if (__DEV__) console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} check skip ready=${ready} onboarding=${effectiveShowOnboarding} banned=${isBanned} firstContent=${firstContentReady}`); // guard-ok: ранний выход называет причину
      return;
    }
    try {
      const { shouldShowWinback, markWinbackShown, recordLastActive } = await import('./winback_offer');
      const isPremium = await hasVerifiedRealPremiumOrVip();
      const nowMs = Date.now();
      // intro ещё не закрыт → его модалка важнее, winback пропускаем (активность всё равно фиксируем)
      const introState = await getIntroFullAccessState().catch(noteSwallowedAs('_layout:useCallback.getIntroFullAccessState_2', null));
      const introPending = introState?.expiredUnseen === true;

      const show = !introPending && (await shouldShowWinback({ isPremium, nowMs }));
      if (__DEV__) console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} check decision show=${show} isPremium=${isPremium} introPending=${introPending} path=${pathnameRef.current}`); // guard-ok: решение показа
      if (show) {
        // зачем (D193, владелец 14.10: «ВМЕСТО ПРЕДЛОЖЕНИЯ КУПИТЬ — ВОТ ЭТОТ БУДЕТ ЛУЧШЕ»): по возвращении пейвол Plus больше не
        // открываем — его место займёт окно «С возвращением» (шаг 2). Отметку ставим, как раньше: одно решение на возвращение.
        console.log(`[WINBACK] show=skipped reason=paywall_retired_D193 path=${pathnameRef.current}`); // guard-ok: решение логируется
        await markWinbackShown(nowMs);
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
      const notifications = await loadNotificationsModule().catch(noteSwallowedAs('_layout:useCallback.loadNotificationsModule', null));
      if (!notifications) {
        console.warn('[NOTIF-PROMPT] onboarding_end skip reason=notifications_module_unavailable');
        return;
      }
      const already = await notifications.isNotificationPermissionGranted().catch(noteSwallowedAs('_layout:useCallback.isNotificationPermissionGranted', false));
      if (!already && shouldPromptForOnboardingNotifications(notificationChoice)) {
        await new Promise<void>((r) => setTimeout(r, 600));
        await notifications.requestNotificationPermissionWithFallback().catch(noteSwallowedHandler('_layout:useCallback.requestNotificationPermissionWithFallback'));
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

  // зачем (EN_EXTRA2 13.10, en-home-001/paywalls-023): dev_state `onboarding=done` закрывает оверлей, открытый предыдущей ссылкой
  // (onbstep → dev_onboarding_restart). Без этого «Your data stays yours» оставался поверх next= до холодного старта. Только dev_state.
  useEffect(() => {
    const sub = onAppEvent('dev_onboarding_done', () => {
      setShow((prev) => {
        console.log(`[DEV-STATE] onboarding overlay closed by onboarding=done wasVisible=${prev ? 'yes' : 'no'}`); // guard-ok: dev-ветка, одно событие на ссылку
        return false;
      });
      setOnboardingPaywallActive(false);
      setOnboardingStartAtName(false);
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
  // Нативные <Modal statusBarTranslucent> обязательно гейтить через арбитр, иначе на холодном старте одна может наложиться
  // на другую (update/broadcast/levelUp) → мерцание/зависание System UI (ANR) на Android.
  const updateModalVisible = useOverlayVisible('update', !!updateInfo && !updateModalHiddenForStore);
  const releaseNotesModalVisible = useOverlayVisible('releaseNotes', releaseNotesVariant !== null);
  const broadcastModalVisible = useOverlayVisible('broadcast', !!globalBroadcastModal);
  const appMessageModalVisible = useOverlayVisible('appMessageModal', appMessageModalQueue.length > 0);
  const personalAdminMessageVisible = useOverlayVisible('personalAdminMessage', !!personalAdminMessage);
  const notifNudgeModalVisible = useOverlayVisible('notifNudge', notifNudgeVisible);
  const startupAuthRecoveryModalVisible = useOverlayVisible('authRecovery', startupAuthRecoveryVisible);
  // зачем (координатор 12.10, «сперва логи» и защита новичка): кто просит окно, в каком порядке очередь и кто сейчас держит слот арбитра — [OVERLAY-QUEUE] (dev). Порядок приоритета: update > authRecovery > releaseNotes > broadcast > appMessageModal > personalAdminMessage > notifNudge.
  const overlayHolder = useOverlayActiveKey();
  useEffect(() => {
    if (!__DEV__) return;
    const wants: Record<string, string | boolean | null> = {
      update: !!updateInfo && !updateModalHiddenForStore,
      authRecovery: startupAuthRecoveryVisible,
      releaseNotes: releaseNotesVariant,
      broadcast: globalBroadcastModal?.id ?? null,
      appMessageModal: appMessageModalQueue.length > 0 ? appMessageModalQueue.map((m) => m.id).join(',') : null,
      personalAdminMessage: personalAdminMessage?.id ?? null,
      notifNudge: notifNudgeVisible,
    };
    const asking = Object.keys(wants).filter((key) => wants[key] !== null && wants[key] !== false);
    console.log('[OVERLAY-QUEUE]', JSON.stringify({ holder: overlayHolder ?? 'никто', asking, waiting: asking.filter((key) => key !== overlayHolder), wants, onboarding: effectiveShowOnboarding })); // guard-ok: срез очереди окон
  }, [
    appMessageModalQueue, effectiveShowOnboarding, globalBroadcastModal, notifNudgeVisible, overlayHolder,
    personalAdminMessage, releaseNotesVariant, startupAuthRecoveryVisible, updateInfo, updateModalHiddenForStore,
  ]);
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
  const appOverlaysEnabled = ready && !effectiveShowOnboarding && !isBanned && !devOverlaysOff;
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
      <Stack.Screen name="year_activity" />{/* зачем (владелец 13.10, results-009): экран «Активность за год» */}
      <Stack.Screen name="diagnostic_test" />
      <Stack.Screen name="exam" options={{ freezeOnBlur: false }} />
      <Stack.Screen name="survey_screen" />
      {/* зачем: без Fragment — expo-router разворачивает только ПРЯМЫХ детей
          <Stack.Screen>, а <>…</> считает посторонним ребёнком и печатает
          «Layout children must be of type Screen» на каждый старт (дважды за
          загрузку). Два отдельных условия дают тот же результат без обёртки. */}
      {/* Диспетчер проверяет доступ и рисует единственный пейвол Plus (manage=1 → replace
          на управление подпиской). Без анимации, с подложкой темы — без чёрного кадра. */}
      <Stack.Screen name="premium_modal" options={PAYWALL_SHEET_STACK_OPTIONS} />
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
      {/* Каталог рангов монет (журнал 35): вход ссылкой «Все ранги» с экрана «Повысить ранг». */}
      <Stack.Screen name="coin_rank_catalog" />
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
      <Stack.Screen name="lingman_video_watch" />
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
      // зачем (координатор 12.10): тексты окна — на 9 языков из app/notif_nudge_copy.ts (раньше es/uk/ru цепочкой, остальные видели русский)
      title={notifNudgeCopy(lang, notifNudgeMissedDays).title}
      body={notifNudgeCopy(lang, notifNudgeMissedDays).body}
      points={notifNudgeCopy(lang, notifNudgeMissedDays).points}
      confirmLabel={notifNudgeCopy(lang, notifNudgeMissedDays).confirmLabel}
      cancelLabel={notifNudgeCopy(lang, notifNudgeMissedDays).cancelLabel}
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
        if (!ok) {
          console.warn(`[SMART-REMINDER] notifNudge:confirm permission=denied missedDays=${notifNudgeMissedDays} → ничего не планируем`); // guard-ok: одно нажатие, warn нужен в релизе (log вырезается)
          return;
        }
        // зачем: юзер мог заранее выключить общий мастер в разделе «Уведомления».
        // Без этой синхронизации scheduleNotifications ниже тихо блокируется гейтом
        // isNotifMasterEnabled(), а юзер видит «разрешение дал» и думает, что включил.
        // Этот модал — явное намерение «включить напоминания», поэтому чиним обе стороны.
        const prefsSnap = notifications.getNotifPrefsSnapshot();
        if (!prefsSnap.master) {
          // зачем (дыра №1): saveNotifPrefs теперь бросает при сбое диска — напоминания всё равно планируем, причина в журнале
          await notifications.saveNotifPrefs({ ...prefsSnap, master: true }).catch((error: unknown) => {
            console.warn(`[SMART-REMINDER] notifNudge:master_save_failed reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: одно нажатие
          });
        }
        const snap = notifications.getNotifSettingsSnapshot();
        const hasPerDay = Object.values(snap.schedule).some(d => d.enabled);
        // зачем (SMART_REMINDER, «сперва логи»): какая ветка выбрана нажатием «включить напоминания» и почему.
        console.warn(`[SMART-REMINDER] notifNudge:confirm permission=granted masterWas=${String(prefsSnap.master)} perDayEnabled=${Object.values(snap.schedule).filter(d => d.enabled).length}/7 → ${hasPerDay ? 'scheduleNotifications (расписание по дням)' : 'enableSmartDailyReminder (7 дней, авто)'}`); // guard-ok: одно нажатие, warn нужен в релизе
        if (hasPerDay) {
          await notifications.scheduleNotifications(snap, lang, 0, { studyTarget });
          return;
        }
        // зачем (владелец 13.10, вариант (а)): раньше здесь звалась отключённая scheduleDailyReminder и ничего не планировалось.
        // Теперь «включить напоминания» = расписание на все 7 дней с умным временем (пока мало данных — 20:00).
        await notifications.enableSmartDailyReminder(lang, { studyTarget, caller: 'notif_nudge' });
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

    {/* зачем (D186, владелец 14.10: «ТАКОГО НЕ ДОЛЖНО БЫТЬ ВООБЩЕ»): окно «Бонус на старт» / «Три дня завершились» не монтируется.
        Состояние бонуса и так всегда «неактивно» (INTRO_FULL_ACCESS_REMOVED); физическое удаление — этап 2 (PM-298). */}

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
            {triLang(lang, { ru: 'Доступ к приложению ограничен. Если считаешь блокировку ошибочной — напиши в поддержку.', uk: 'Доступ до застосунку обмежено. Якщо вважаєш блокування помилковим — напиши в підтримку.', en: "Access to the app is restricted. If you think this block is a mistake, contact support.", es: 'El acceso a la aplicación está restringido. Si crees que el bloqueo es un error, contacta con soporte.', 'pt-BR': 'O acesso ao aplicativo está restrito. Se achar que o bloqueio foi um erro, entre em contato com o suporte.', vi: 'Quyền truy cập ứng dụng bị hạn chế. Nếu bạn cho rằng tài khoản bị khóa nhầm, hãy liên hệ hỗ trợ.', id: 'Akses ke aplikasi dibatasi. Jika menurutmu pemblokiran ini keliru, hubungi dukungan.', tr: 'Uygulamaya erişim kısıtlandı. Engellemenin hatalı olduğunu düşünüyorsanız destek ekibiyle iletişime geçin.', pl: 'Dostęp do aplikacji jest ograniczony. Jeśli uważasz, że blokada jest błędna, skontaktuj się z pomocą techniczną.' })}
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

/** D195 (владелец 15.10): старые бонусы → монеты; сжигание жемчуга D70/D84 выключено. Вернуть — только решением владельца. */
const PEARL_RETIRE_DISABLED_D195 = true;

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
                    <Profiler id="app_content" onRender={bootCommitProfilerOnRender}>
                      <AppContent fontsReady={fontsReady} />
                    </Profiler>
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
