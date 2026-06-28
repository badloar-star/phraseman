import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from '../components/SafeLinearGradient';
import { Stack, useGlobalSearchParams, usePathname, useRouter, router as globalRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as SplashScreen from 'expo-splash-screen';
import { setAudioModeAsync } from 'expo-audio';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, InteractionManager, LogBox, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AchievementProvider, useAchievement } from '../components/AchievementContext';
import AchievementToast from '../components/AchievementToast';
import { EnergyProvider } from '../components/EnergyContext';
import { LangProvider, useLang } from '../components/LangContext';
import IntroFullAccessModal from '../components/IntroFullAccessModal';
import LoyaltyGiftModal from '../components/LoyaltyGiftModal';
import { StudyTargetProvider, useStudyTarget } from '../components/StudyTargetContext';
import LevelBadge from '../components/LevelBadge';
import LevelGiftDualModal from '../components/LevelGiftDualModal';
import LevelGiftModal from '../components/LevelGiftModal';
import Onboarding from '../components/onboarding';
import { paywallScreenStackOptions } from '../components/paywall/paywallShared';
import { PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY } from './personal_plan_activation';
import { PremiumProvider, usePremium } from '../components/PremiumContext';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import UpdateModal from '../components/UpdateModal';
import ReleaseNotesModal from '../components/ReleaseNotesModal';
import GlobalBroadcastModal from '../components/GlobalBroadcastModal';
import MaintenanceGate from '../components/MaintenanceGate';
import ForceUpdateGate from '../components/ForceUpdateGate';
import PromoBanner from '../components/PromoBanner';
import LeagueBonusAvailableModal from '../components/LeagueBonusAvailableModal';
import NotificationPermissionModal from '../components/NotificationPermissionModal';
import { getMaxEnergyForLevel, type ThemeMode } from '../constants/theme';
import type { Lang } from '../constants/i18n';
import { getTitleColor, getTitleForLevel } from '../constants/titles';
import { ENABLE_DEV_TOOLS, IS_EXPO_GO, ENABLE_SCREEN_TRANSITIONS } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { checkAchievements, getPendingNotifications } from './achievements';
import { ensureAnonUser, ensureStableAuthLink, restoreFromCloud, syncToCloud } from './cloud_sync';
import { repairLessonUnlocksAfterRestore } from './lesson_lock_system';
import { registerInLeagueGroupSilently } from './firestore_leagues';
import { PlayInstallReferrer } from 'react-native-play-install-referrer';
import { migrateWeekPointsIfNeeded, updateStreakOnActivity } from './hall_of_fame_utils';
import { preloadDeferredNonPrimaryImages, preloadPrimaryTabImages } from './image_preload';
import {
  checkLeagueOvertakeNotification, getNotifSettingsSnapshot, hydrateNotifSettingsFromStorage, isNotificationPermissionGranted, requestNotificationPermissionWithFallback, scheduleDailyReminder, scheduleMonthlyRecapNotification, scheduleNotifications, schedulePhraseOfDayNotification, scheduleStreakWarningIfNeeded, scheduleWeeklyRecapNotification, setupNotificationTapHandler,
} from './notifications';
import { initRevenueCat } from './revenuecat_init';
import { prefetchMarketplacePacks } from './flashcards/marketplace';
import { prefetchArenaRatingCache } from './arena_rating_cache';
import { syncPublicProfileSnapshot } from './public_profile_snapshot';
import { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus, getVerifiedVipStatus } from './premium_guard';
import { isFeatureFreeForEveryone } from './feature_gates';
import { tryGrantPremiumMonthlyWagerFromLevelUp } from './streak_wager';
import { incrementSessionCount } from './review_utils';
import { checkForUpdate, UpdateInfo } from './update_check';
import { registerXP, migrateXPFormulaV2 } from './xp_manager';
import { flushPendingProgressEvents } from './progress_events_client';
import { flushPendingBotArenaMatch } from './arena_bot_profile_write';
import { getShardAchievementEligibleBalance, getShardsBalance, loadShardsFromCloud } from './shards_system';
import { MatchmakingProvider } from '../contexts/MatchmakingContext';
import MatchFoundToast from '../components/MatchFoundToast';
import ActionToast from '../components/ActionToast';
import DailyTaskRewardToast from '../components/DailyTaskRewardToast';
import DailyTasksFirstVisitModal from '../components/DailyTasksFirstVisitModal';
import ArenaFriendInviteHost from '../components/ArenaFriendInviteHost';
import GlobalShardsEarnedHost from '../components/GlobalShardsEarnedHost';
import EntitlementExpiredHost from '../components/EntitlementExpiredHost';
import GlobalFriendGiftHost from '../components/GlobalFriendGiftHost';
import ReferralWelcomeHost from '../components/ReferralWelcomeHost';
import MysteryMondayHost from '../components/MysteryMondayHost';
import ComebackBoonHost from '../components/ComebackBoonHost';
import PerfectWeekHost from '../components/PerfectWeekHost';
import BoonActivatedHost from '../components/BoonActivatedHost';
import StreakRiskToastHost from '../components/StreakRiskToastHost';
import BillingIssueToastHost from '../components/BillingIssueToastHost';
import ThemedBlockingAlertHost from '../components/ThemedBlockingAlertHost';
import { getCanonicalUserId } from './user_id_policy';
import { dismissReleaseNotesModalPermanently, shouldOfferReleaseNotesModal } from './release_notes_modal';
import { prefetchEasUpdateAfterStartup } from './eas_update_prefetch';
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
import { OverlayArbiterProvider, useOverlayVisible } from '../components/OverlayArbiter';
import ErrorBoundary from '../components/ErrorBoundary';
import { trackActivity } from './app_activity';
import { rememberNavigationPath } from './navigation_back';
import {
  cancelScheduledAnimatedStateUpdates,
  scheduleTrackedAnimatedStateUpdate,
  type ScheduledAnimatedStateUpdate,
} from '../components/animationScheduling';
import { GOLD_GRADIENTS, GOLD_RICH, goldShadow } from '../constants/goldTheme';
import GoldBevel from '../components/GoldBevel';
import {
  RewardModalPanelBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalSoftSurface,
} from '../components/RewardModalBackdrop';
import {
  checkLeagueBonusAvailability,
  subscribeLeagueBonusAvailability,
  type LeagueBonusAvailability,
} from './services/league_chest_rewards';
import { lastOpenedLessonKey, type RuntimeStudyTarget } from './target_storage_keys';
import { syncWidgetData } from './widget_bridge';
import { DEV_UTILITY_ROUTE_NAMES, DEV_UTILITY_ROUTE_PATHS, PERSONAL_PLAN_RUNTIME_DEV_ROUTE } from '../constants/devRoutes';
import { APP_FONT_ASSETS, APP_FONT_FAMILY } from './typography';
import { getTodayKey } from './daily_tasks';
import { installInterFontPatch } from './font_family_patch';
import {
  getIntroFullAccessState,
  markIntroFullAccessEndedSeen,
  markIntroFullAccessWelcomeSeen,
  shouldShowIntroFullAccessWelcome,
  startIntroFullAccessAfterOnboarding,
} from './intro_full_access';
import {
  getLoyaltyGiftState,
  isLoyaltyGiftClaimed,
  isLoyaltyGiftOfferSeen,
  markLoyaltyGiftEndedSeen,
  markLoyaltyGiftOfferSeen,
  startLoyaltyGift,
} from './loyalty_gift';

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
const DAILY_TASKS_FIRST_VISIT_MODAL_SEEN_PREFIX = 'daily_tasks_first_visit_modal_seen_v1';
const LOYALTY_UPDATE_MODAL_ENABLED = false;
const ENABLE_ROOT_LEAGUE_BONUS_WATCH = true;
const ENABLE_STARTUP_CONTENT_PREWARM = false;
const FIRST_CONTENT_READY_FALLBACK_MS = 900;
const USE_ELITE_LEVEL_UP_MODAL = true;
const POST_ONBOARDING_GOLD_BRIDGE_MS = 3000;
const POST_ONBOARDING_GOLD_BRIDGE_SCREEN = ['rgba(255,224,144,0.34)', 'rgba(163,104,24,0.16)', 'rgba(18,14,6,0.08)'] as const;
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

const safeProgressEventPart = (value: unknown, max = 60): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';

function normalizeWarmDeepLink(url: string): string | null {
  const rawInput = String(url || '').trim();
  if (!rawInput) return null;

  try {
    const parsed = new URL(rawInput);
    const routePath = parsed.pathname && parsed.pathname !== '/'
      ? parsed.pathname
      : parsed.host
        ? `/${parsed.host}`
        : '';
    const normalized = `${routePath}${parsed.search || ''}${parsed.hash || ''}`.trim();
    return normalized && normalized !== '/' ? normalized : null;
  } catch {
    const stripped = rawInput.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').trim();
    if (!stripped || stripped === '/') return null;
    return stripped.startsWith('/') ? stripped : `/${stripped}`;
  }
}

function isDevUtilityRoutePath(path: string | null | undefined): boolean {
  if (!ENABLE_DEV_TOOLS || !path) return false;
  return DEV_UTILITY_ROUTE_PATHS.some((prefix) => path.startsWith(prefix));
}

function isDevOnlyRuntimeRoutePath(path: string | null | undefined): boolean {
  if (!__DEV__ || !path) return false;
  return path.startsWith(PERSONAL_PLAN_RUNTIME_DEV_ROUTE);
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

function StartupSplashHold({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View
      pointerEvents="none"
      style={{
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
      }}
    >
      <Image
        source={require('../assets/images/splash-icon.png')}
        contentFit="contain"
        style={{ width: 240, height: 240 }}
      />
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
const LEVELUP_BTN_RU = ['Отлично!', 'Вперёд!', 'Продолжаем!', 'Жму!', 'Понял, спасибо!', 'Ура! 🎉'];
const LEVELUP_BTN_UK = ['Чудово!', 'Вперед!', 'Продовжуємо!', 'Тисну!', 'Зрозумів, дякую!', 'Ура! 🎉'];
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
const LEVELUP_BTN_ES = ['¡Genial!', '¡Vamos!', '¡Continuamos!', '¡Listo!', '¡Entendido, gracias!', '¡Hurra! 🎉'];

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
    const today = new Date().toISOString().split('T')[0];

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

    if (login.lastDate !== today) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const consecutive = login.lastDate === yesterdayStr
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
  const { theme: t, isDark, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const globalParams = useGlobalSearchParams();
  const isGoldTheme = themeMode === 'gold';

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  /**
   * Удержание слота арбитра в окне перехода level-up → подарок. Между setShowLevelUp(false)
   * и setShowGiftModal(true) идут await-ы (registerXP / премиум-проверка) + таймер 180-260мс,
   * в это время обе модалки false. Без этого флага арбитр отдал бы слот любому ждущему тосту,
   * и сундук-награда мигал бы за чужой модалкой. Ставится в dismissLevelUp, снимается в onGiftClose.
   */
  const [levelUpTransitioning, setLevelUpTransitioning] = useState(false);
  /** Премиум: два сундука (F2P + premium) вместо одного */
  const [levelGiftDualMode, setLevelGiftDualMode] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [userName, setUserName] = useState('');

  const levelUpOpacity    = useRef(new Animated.Value(0)).current;
  const levelUpTranslateY = useRef(new Animated.Value(40)).current;
  const levelUpGlow       = useRef(new Animated.Value(0)).current;
  const queueRef    = useRef<number[]>([]);
  const isShowingRef = useRef(false);
  const dismissingLevelUpRef = useRef(false);
  const giftOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Страховка слота: если переход level-up → подарок «завис» (подарок не открылся/не
  // закрылся штатно — напр. Android-back в обход onGiftClose или сбой в цепочке выше),
  // levelUpTransitioning остался бы true НАВСЕГДА → слот арбитра занят, и всё ниже по
  // приоритету (праздники, leagueResult, ВСЕ тосты) заморожено до перезапуска (levelUp
  // не force-evictable, сторож его не выселяет). Этот таймер принудительно завершает
  // зависший переход. Окно = заведомо больше штатного перехода (await-ы + 180-260мс).
  const levelUpTransitionGuardRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewLevelUpParamRef = useRef<string | null>(null);
  const scheduledStateUpdatesRef = useRef<ScheduledAnimatedStateUpdate[]>([]);
  /** Сериализация flush: двойной await getItem до removeItem давал дубликаты уровня в queueRef. */
  const flushQueueBusyRef = useRef(false);
  const flushQueueRetryRef = useRef(false);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) { isShowingRef.current = false; return; }
    dismissingLevelUpRef.current = false;
    setLevelUpTransitioning(false);
    const lvl = queueRef.current[0];
    setCurrentLevel(lvl);
    setShowLevelUp(true);
    levelUpOpacity.setValue(0);
    levelUpTranslateY.setValue(40);
    levelUpGlow.setValue(0);
    Animated.parallel([
      Animated.spring(levelUpOpacity, { toValue: 1, useNativeDriver: true, friction: USE_ELITE_LEVEL_UP_MODAL ? 8 : 6 }),
      Animated.spring(levelUpTranslateY, { toValue: 0, useNativeDriver: true, friction: USE_ELITE_LEVEL_UP_MODAL ? 8 : 6 }),
      Animated.timing(levelUpGlow, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]).start();
  }, [levelUpGlow, levelUpOpacity, levelUpTranslateY]);

  const removeShownLevelFromPersistentQueue = useCallback((level: number) => {
    if (!Number.isFinite(level) || level <= 0) return;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem('pending_level_up_queue');
        if (!raw) return;
        let arr: number[] = [];
        try { arr = JSON.parse(raw); } catch { arr = []; }
        if (!Array.isArray(arr) || arr.length === 0) return;
        const next = arr.filter((item) => item !== level);
        if (next.length === arr.length) return;
        if (next.length === 0) await AsyncStorage.removeItem('pending_level_up_queue');
        else await AsyncStorage.setItem('pending_level_up_queue', JSON.stringify(next));
      } catch {
        /* keep the pending level; showing it twice is safer than losing it */
      }
    })();
  }, []);

  const flushQueue = useCallback(async () => {
    if (flushQueueBusyRef.current) {
      flushQueueRetryRef.current = true;
      return;
    }
    flushQueueBusyRef.current = true;
    try {
      const raw = await AsyncStorage.getItem('pending_level_up_queue');
      if (!raw) return;
      let arr: number[] = [];
      try { arr = JSON.parse(raw); } catch (e) { if (__DEV__) console.warn('[_layout]', e); }
      if (arr.length === 0) return;
      const name = await AsyncStorage.getItem('user_name');
      if (name) setUserName(name);
      const have = new Set(queueRef.current);
      for (const lvl of arr) {
        if (!have.has(lvl)) {
          have.add(lvl);
          queueRef.current.push(lvl);
        }
      }
      if (!isShowingRef.current) {
        isShowingRef.current = true;
        queueMicrotask(showNext);
      }
    } catch (e) {
      if (__DEV__) console.warn('[_layout]', e);
    } finally {
      flushQueueBusyRef.current = false;
      if (flushQueueRetryRef.current) {
        flushQueueRetryRef.current = false;
        queueMicrotask(() => { void flushQueue(); });
      }
    }
  }, [showNext]);

  useEffect(() => {
    // Проверяем очередь при старте (с задержкой, чтобы onboarding не перекрывал)
    const t = setTimeout(flushQueue, 500);
    const sub = onAppEvent('level_up_pending', flushQueue);
    return () => {
      clearTimeout(t);
      sub.remove();
      if (giftOpenTimerRef.current) clearTimeout(giftOpenTimerRef.current);
    };
  }, [flushQueue]);

  useEffect(() => {
    if (!__DEV__) return;
    const raw = globalParams.levelUpPreview;
    const rawValue = Array.isArray(raw) ? raw[0] : raw;
    if (!rawValue || previewLevelUpParamRef.current === rawValue) return;
    const level = Math.max(1, Math.min(60, Number.parseInt(rawValue, 10) || 5));
    previewLevelUpParamRef.current = rawValue;
    AsyncStorage.setItem('pending_level_up_queue', JSON.stringify([level]))
      .then(flushQueue)
      .catch(() => {});
  }, [flushQueue, globalParams.levelUpPreview]);

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
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncWidgetData({ studyTarget, lang, themeMode });
      }
    });
    return () => sub.remove();
  }, [studyTarget, lang, themeMode]);

  const dismissLevelUp = () => {
    if (dismissingLevelUpRef.current) return;
    dismissingLevelUpRef.current = true;
    // Держим слот арбитра на весь переход level-up → подарок (см. levelUpTransitioning).
    setLevelUpTransitioning(true);
    Animated.timing(levelUpOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      scheduleTrackedAnimatedStateUpdate(scheduledStateUpdatesRef, () => {
        setShowLevelUp(false);
        void (async () => {
          try {
            const name = (await AsyncStorage.getItem('user_name')) || userName;
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
            });
            await tryGrantPremiumMonthlyWagerFromLevelUp();
            const prem = await getVerifiedPremiumStatus().catch(() => false);
            setLevelGiftDualMode(!!prem);
          } finally {
            InteractionManager.runAfterInteractions(() => {
              // Android can keep the closing Modal's native window alive for a beat.
              // Opening the gift Modal immediately after level-up caused stuck touches/ANR.
              giftOpenTimerRef.current = setTimeout(() => {
                giftOpenTimerRef.current = null;
                setShowGiftModal(true);
              }, Platform.OS === 'android' ? 260 : 180);
            });
          }
        })();
      });
    });
  };

  const onGiftClose = (_claimed: boolean) => {
    setShowGiftModal(false);
    dismissingLevelUpRef.current = false;
    // Переход завершён — отпускаем слот арбитра.
    setLevelUpTransitioning(false);
    queueRef.current = queueRef.current.slice(1);
    if (queueRef.current.length > 0) {
      queueMicrotask(showNext);
    } else {
      isShowingRef.current = false;
      // План #3: after-win апсейл после ПОЛНОГО завершения празднования level-up.
      // Гард не даёт спамить (кулдаун + не дублировать сегодняшний пейвол).
      void (async () => {
        try {
          const prem = await getVerifiedPremiumStatus().catch(() => false);
          // Не показываем поверх модалки конца интро — она важнее (главный момент конверсии).
          const introState = await getIntroFullAccessState().catch(() => null);
          if (introState?.expiredUnseen === true) return;
          const [{ canShowAfterWinUpsell, markAfterWinUpsellShown }, { trackEvent }] = await Promise.all([
            import('./after_win_upsell_gate'),
            import('./analytics'),
          ]);
          if (!(await canShowAfterWinUpsell({ isPremium: prem, nowMs: Date.now() }))) return;
          // Сначала навигация: если push упадёт — гейт не «сгорит» впустую.
          globalRouter.push({ pathname: '/premium_modal', params: { context: 'level_up', source: 'afterwin_levelup' } } as any);
          await markAfterWinUpsellShown(Date.now());
          await trackEvent('afterwin_upsell_shown', { source: 'level_up' });
          void import('./firebase').then(({ logAfterWinUpsellShown }) => logAfterWinUpsellShown('level_up')).catch(() => {});
        } catch { /* no-op */ }
      })();
    }
  };

  const newTitleDef = getTitleForLevel(currentLevel);
  const isNewTitle  = newTitleDef.minLevel === currentLevel;
  const titleColor  = getTitleColor(currentLevel, isDark);
  const levelUpOverlayVisible = useOverlayVisible('levelUp', showLevelUp || showGiftModal || levelUpTransitioning);
  const levelUpGlowOpacity = levelUpGlow.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.44] });
  const levelUpModalScale = levelUpOpacity.interpolate({ inputRange: [0, 1], outputRange: USE_ELITE_LEVEL_UP_MODAL ? [0.9, 1] : [0.85, 1] });
  const levelUpAccent = rewardModalAccentColor(themeMode, t);
  const levelUpScreenDim = USE_ELITE_LEVEL_UP_MODAL
    ? (false ? 'rgba(24,18,10,0.32)' : 'rgba(0,0,0,0.46)')
    : 'rgba(0,0,0,0.6)';

  useEffect(() => {
    if (!showLevelUp || !levelUpOverlayVisible) return;
    removeShownLevelFromPersistentQueue(currentLevel);
  }, [currentLevel, levelUpOverlayVisible, removeShownLevelFromPersistentQueue, showLevelUp]);

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
      {/* Level-up congratulation - wrapped in Modal so it renders above ALL screens */}
      <Modal
        transparent
        visible={levelUpOverlayVisible && showLevelUp}
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={{ flex: 1, backgroundColor: levelUpScreenDim, justifyContent: 'center', alignItems: 'center', padding: 24, overflow: 'hidden' }}>
          <Animated.View testID="level-up-modal" style={{
            transform: [
              { translateY: levelUpTranslateY },
              { scale: levelUpModalScale },
            ],
            opacity: levelUpOpacity,
            borderRadius: USE_ELITE_LEVEL_UP_MODAL ? 32 : 28,
            width: '100%', maxWidth: USE_ELITE_LEVEL_UP_MODAL ? 368 : 360,
            shadowColor: USE_ELITE_LEVEL_UP_MODAL ? (isGoldTheme ? '#000000' : '#F6C85F') : '#000',
            shadowOpacity: USE_ELITE_LEVEL_UP_MODAL ? (isGoldTheme ? 0.78 : 0.28) : 0.4,
            shadowRadius: USE_ELITE_LEVEL_UP_MODAL ? (isGoldTheme ? 38 : 34) : 24,
            elevation: 20,
            overflow: 'hidden',
            ...(USE_ELITE_LEVEL_UP_MODAL && isGoldTheme ? goldShadow(3) : {}),
          }}>
            <LinearGradient
              colors={USE_ELITE_LEVEL_UP_MODAL ? rewardModalPanelColors(themeMode, t) : t.cardGradient}
              locations={undefined}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: USE_ELITE_LEVEL_UP_MODAL ? 32 : 28,
                padding: USE_ELITE_LEVEL_UP_MODAL ? 26 : 28,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: USE_ELITE_LEVEL_UP_MODAL ? rewardModalPanelBorder(themeMode, t) : t.textSecond + '44',
              }}>
              {USE_ELITE_LEVEL_UP_MODAL && <RewardModalPanelBackdrop themeMode={themeMode} intensity="strong" />}
              {USE_ELITE_LEVEL_UP_MODAL && isGoldTheme && <GoldBevel radius={32} intensity="strong" />}
              {/* Тёплое золотое свечение сверху панели — СТАТИЧНОЕ. Внутри глобального
                  Modal анимированные (Reanimated) лупы = риск freeze/краша на Android
                  (как и автоплей webp у LevelBadge), поэтому никакого движения тут. */}
              {USE_ELITE_LEVEL_UP_MODAL && (
                <LinearGradient
                  pointerEvents="none"
                  colors={[`${levelUpAccent}40`, `${levelUpAccent}12`, 'transparent']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200 }}
                />
              )}
              {USE_ELITE_LEVEL_UP_MODAL && (
                <>
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 34,
                      right: 34,
                      height: 1,
                      backgroundColor: levelUpAccent,
                      opacity: levelUpGlowOpacity,
                    }}
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 82,
                      backgroundColor: rewardModalSoftSurface(themeMode, t),
                    }}
                  />
                  <Text style={{ color: levelUpAccent, fontSize: f.label, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
                    {lang === 'uk' ? 'Новий рівень' : lang === 'es' ? 'Nuevo nivel' : 'Новый уровень'}
                  </Text>
                </>
              )}
              {/* Static first frame: animated webp inside a global Modal was a freeze risk on Android. */}
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                {USE_ELITE_LEVEL_UP_MODAL && (
                  <LinearGradient
                    pointerEvents="none"
                    colors={[`${levelUpAccent}33`, 'transparent']}
                    start={{ x: 0.5, y: 0.5 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, alignSelf: 'center' }}
                  />
                )}
                <LevelBadge level={currentLevel} size={USE_ELITE_LEVEL_UP_MODAL ? 108 : 100} autoplay={false} />
              </View>
              <Text style={{ color: t.textPrimary, fontSize: USE_ELITE_LEVEL_UP_MODAL ? f.numLg + 2 : f.numLg, fontWeight: '900', textAlign: 'center', marginTop: 10 }}>
                {lang === 'uk' ? `РІВЕНЬ ${currentLevel}!` : lang === 'es' ? `¡NIVEL ${currentLevel}!` : `УРОВЕНЬ ${currentLevel}!`}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: USE_ELITE_LEVEL_UP_MODAL ? f.body : f.bodyLg, fontWeight: USE_ELITE_LEVEL_UP_MODAL ? '600' : '500', marginTop: 6, textAlign: 'center', lineHeight: USE_ELITE_LEVEL_UP_MODAL ? f.body + 6 : undefined }}>
                {(() => {
                  const pool = lang === 'uk' ? LEVELUP_CONGRATS_UK : lang === 'es' ? LEVELUP_CONGRATS_ES : LEVELUP_CONGRATS_RU;
                  return pool[currentLevel % pool.length];
                })()}
              </Text>
              {isNewTitle && (
                <View style={{ marginTop: USE_ELITE_LEVEL_UP_MODAL ? 14 : 10, backgroundColor: USE_ELITE_LEVEL_UP_MODAL ? 'rgba(255,255,255,0.045)' : t.bgSurface, borderRadius: USE_ELITE_LEVEL_UP_MODAL ? 16 : 14, paddingHorizontal: 16, paddingVertical: USE_ELITE_LEVEL_UP_MODAL ? 12 : 10, alignItems: 'center', gap: 2, width: '100%', borderWidth: 1, borderColor: titleColor + (USE_ELITE_LEVEL_UP_MODAL ? '44' : '55') }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons name="ribbon" size={12} color={titleColor} />
                    <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: USE_ELITE_LEVEL_UP_MODAL ? '800' : '700', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                      {lang === 'uk' ? 'Новий титул' : lang === 'es' ? 'Nuevo título' : 'Новый титул'}
                    </Text>
                  </View>
                  <Text style={{ color: titleColor, fontSize: f.bodyLg, fontWeight: '800', marginTop: 2 }}>
                    {newTitleDef.titleEN}
                  </Text>
                </View>
              )}

              <View style={{ backgroundColor: USE_ELITE_LEVEL_UP_MODAL ? rewardModalSoftSurface(themeMode, t) : t.bgSurface, paddingHorizontal: USE_ELITE_LEVEL_UP_MODAL ? 18 : 16, paddingVertical: USE_ELITE_LEVEL_UP_MODAL ? 8 : 6, borderRadius: USE_ELITE_LEVEL_UP_MODAL ? 999 : 16, marginTop: USE_ELITE_LEVEL_UP_MODAL ? 14 : 10, borderWidth: USE_ELITE_LEVEL_UP_MODAL ? 1 : 0, borderColor: USE_ELITE_LEVEL_UP_MODAL ? rewardModalPanelBorder(themeMode, t) : 'transparent' }}>
                <Text style={{ color: levelUpAccent, fontWeight: '800', fontSize: f.caption }}>
                  {lang === 'uk'
                    ? `+100 XP — бонус за ${currentLevel} рівень`
                    : lang === 'es'
                      ? `+100 XP — bonificación por el nivel ${currentLevel}`
                      : `+100 XP — бонус за ${currentLevel} уровень`}
                </Text>
              </View>

              {[10, 20, 30, 40, 50].includes(currentLevel) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: USE_ELITE_LEVEL_UP_MODAL ? 'rgba(255,255,255,0.045)' : '#1A3A2A', borderRadius: USE_ELITE_LEVEL_UP_MODAL ? 16 : 14, paddingHorizontal: 16, paddingVertical: 10, marginTop: 10, width: '100%', borderWidth: 1, borderColor: USE_ELITE_LEVEL_UP_MODAL ? 'rgba(255,255,255,0.12)' : '#34D399' }}>
                  <Ionicons name="flash" size={15} color={USE_ELITE_LEVEL_UP_MODAL ? '#F6C85F' : '#34D399'} />
                  <Text style={{ color: USE_ELITE_LEVEL_UP_MODAL ? t.textSecond : '#34D399', fontWeight: '800', fontSize: f.body, textAlign: 'center', flexShrink: 1 }}>
                    {lang === 'uk'
                      ? `Тепер у тебе ${getMaxEnergyForLevel(currentLevel)} енергії на день!`
                      : lang === 'es'
                        ? `¡Tu energía diaria máxima es ${getMaxEnergyForLevel(currentLevel)}!`
                        : `Теперь у тебя ${getMaxEnergyForLevel(currentLevel)} энергии в день!`}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                testID="level-up-dismiss"
                accessibilityRole="button"
                accessibilityLabel={lang === 'uk' ? 'Продовжити' : lang === 'es' ? 'Continuar' : 'Продолжить'}
                onPress={dismissLevelUp}
                style={{ marginTop: USE_ELITE_LEVEL_UP_MODAL ? 22 : 20, backgroundColor: USE_ELITE_LEVEL_UP_MODAL ? (isGoldTheme ? 'transparent' : t.textPrimary) : t.accent, borderRadius: USE_ELITE_LEVEL_UP_MODAL ? 18 : 16, paddingHorizontal: USE_ELITE_LEVEL_UP_MODAL ? 46 : 40, paddingVertical: USE_ELITE_LEVEL_UP_MODAL ? 14 : 12, borderWidth: USE_ELITE_LEVEL_UP_MODAL ? 1 : 0, borderColor: USE_ELITE_LEVEL_UP_MODAL ? (isGoldTheme ? GOLD_RICH.hairlineStrong : 'rgba(255,255,255,0.18)') : 'transparent', overflow: 'hidden' }}
              >
                {USE_ELITE_LEVEL_UP_MODAL && isGoldTheme && (
                  <>
                    <LinearGradient
                      colors={GOLD_GRADIENTS.primaryButton}
                      locations={[0, 0.36, 1]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <GoldBevel radius={18} intensity="strong" />
                  </>
                )}
                <Text style={{ color: USE_ELITE_LEVEL_UP_MODAL ? (isGoldTheme ? t.textOnGold : t.bgPrimary) : t.correctText, fontWeight: '900', fontSize: f.bodyLg }}>
                  {USE_ELITE_LEVEL_UP_MODAL
                    ? (lang === 'uk' ? 'Продовжити' : lang === 'es' ? 'Continuar' : 'Продолжить')
                    : (() => {
                      const pool = lang === 'uk' ? LEVELUP_BTN_UK : lang === 'es' ? LEVELUP_BTN_ES : LEVELUP_BTN_RU;
                      return pool[currentLevel % pool.length];
                    })()}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {levelGiftDualMode ? (
        <LevelGiftDualModal
          visible={levelUpOverlayVisible && showGiftModal}
          level={currentLevel}
          userName={userName}
          lang={lang}
          onClose={onGiftClose}
          deliveryMode="inventory"
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
function AppContent() {
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
  // Подарок лояльности:
  //   'offer'    = free-юзер: текст обновления + блок подарка + кнопка «Получить 3 дня».
  //   'announce' = премиум/VIP: ТОЛЬКО текст обновления, без подарка и кнопки получения.
  //   'ended'-модал «3 дня позади» переиспользуется из intro (ведёт на пейвол).
  const [loyaltyGiftModal, setLoyaltyGiftModal] = useState<'offer' | 'announce' | null>(null);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [pendingWarmDeepLink, setPendingWarmDeepLink] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  /** Скрываем RN Modal до ухода в стор — на Android иначе зависания System UI при возврате. */
  const [updateModalHiddenForStore, setUpdateModalHiddenForStore] = useState(false);
  const awaitingStoreReturnRef = useRef(false);
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
  const [leagueBonusAvailable, setLeagueBonusAvailable] = useState<LeagueBonusAvailability | null>(null);
  const [notifNudgeVisible, setNotifNudgeVisible] = useState(false);
  const [notifNudgeMissedDays, setNotifNudgeMissedDays] = useState(0);
  const [dailyPlanModalDue, setDailyPlanModalDue] = useState(false);
  const { setLang, lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { isPremium, isVip } = usePremium();
  const { showAchievement } = useAchievement();
  const { theme: tTheme, themeMode } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const globalSearchParams = useGlobalSearchParams();
  const navigationPathSignature = buildNavigationPathSignature(pathname, globalSearchParams);
  const currentDevUtilityRoute = isDevUtilityRoutePath(pathname) || isDevOnlyRuntimeRoutePath(pathname);
  const effectiveShowOnboarding = showOnboarding && !currentDevUtilityRoute;
  const isRootIndexRoute = !pathname || pathname === '/';
  const insets = useSafeAreaInsets();
  const globalBottomOverlay = useGlobalBottomOverlayOffset();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    setRootNavigationReady(true);
  }, []);

  // Глобальная аудио-сессия на старте: озвучка должна играть ДАЖЕ при включённом
  // беззвучном режиме (mute-switch) на iPhone и независимо от того, какой путь
  // (OpenAI-клип или системный TTS) зазвучит первым. Раньше playsInSilentMode
  // выставлялся лениво и только в клип-пути, а expo-speech на iOS работает в
  // отдельной сессии — поэтому при беззвучном режиме звука не было совсем.
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false })
      .catch(() => { /* не критично: воспроизведение возможно и с дефолтным режимом */ });
  }, []);

  useEffect(() => {
    rememberNavigationPath(navigationPathSignature);
  }, [navigationPathSignature]);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const target = normalizeWarmDeepLink(url);
      if (!target) return;
      setPendingWarmDeepLink(target);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const targetIsDevUtilityRoute = isDevUtilityRoutePath(pendingWarmDeepLink) || isDevOnlyRuntimeRoutePath(pendingWarmDeepLink);
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

  const nativeSplashCanHide = ready && (effectiveShowOnboarding || isBanned || firstContentReady);
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
      const payload = await fetchPendingGlobalBroadcastModal();
      if (payload) setGlobalBroadcastModal(payload);
    } finally {
      globalBroadcastCheckInFlightRef.current = false;
    }
  }, [globalBroadcastModal]);

  useEffect(() => {
    const t = setTimeout(() => { void checkGlobalBroadcastFn(); }, 1400);
    return () => clearTimeout(t);
  }, [checkGlobalBroadcastFn]);

  const showLeagueBonusAvailableOnce = useCallback(async (availability: LeagueBonusAvailability, source: 'live' | 'startup') => {
    const seenKey = `league_bonus_available_seen_${availability.weekId}_${availability.groupId}`;
    const seen = await AsyncStorage.getItem(seenKey).catch(() => null);
    if (seen === '1') return;
    await AsyncStorage.setItem(seenKey, '1').catch(() => {});
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

  useEffect(() => {
    if (!ENABLE_ROOT_LEAGUE_BONUS_WATCH) return;
    if (!ready || showOnboarding || isBanned) return;
    const timer = setTimeout(() => {
      void checkLeagueBonusAvailability()
        .then((availability) => {
          if (availability) void showLeagueBonusAvailableOnce(availability, 'startup');
        })
        .catch(() => {});
    }, 1800);
    return () => clearTimeout(timer);
  }, [isBanned, ready, showLeagueBonusAvailableOnce, showOnboarding]);

  useEffect(() => {
    if (!ENABLE_ROOT_LEAGUE_BONUS_WATCH) return;
    if (!ready || showOnboarding || isBanned) return;
    const unsubscribe = subscribeLeagueBonusAvailability((availability) => {
      void showLeagueBonusAvailableOnce(availability, 'live');
    });
    return unsubscribe;
  }, [isBanned, ready, showLeagueBonusAvailableOnce, showOnboarding]);

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

  // Обработчик тапа по уведомлению — deep link в нужный экран
  useEffect(() => {
    migrateXPFormulaV2();
  }, []);

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
    let subRemove: (() => void) | undefined;
    void import('./referral_bootstrap')
      .then((m) => {
        void Linking.getInitialURL().then((u) => m.captureReferralFromUrl(u)).catch((e) => { if (__DEV__) console.warn('[_layout]', e); });
        subRemove = m.subscribeReferralUrl((u) => {
          void m.captureReferralFromUrl(u);
        }).remove;
      })
      .catch(() => {});
    return () => {
      subRemove?.();
    };
  }, []);

  useEffect(() => {
    // Startup must reveal the first screen quickly; optional warmups continue below.
    const safetyTimer = setTimeout(() => setReady(true), 1200);

    // Гидратация облака запускается рано (в bootstrap) и используется здесь,
    // чтобы остальной runHeavyInit ждал её завершения, а не дублировал.
    let cloudHydratePromise: Promise<void> | null = null;
    let contentDeliveryMigrationPromise: Promise<void> | null = null;
    const runContentDeliveryMigration = (after?: Promise<void> | null): Promise<void> => {
      if (!contentDeliveryMigrationPromise) {
        contentDeliveryMigrationPromise = (async () => {
          if (after) await after.catch(() => {});
          await applyContentDeliveryMigration().catch(() => {});
        })();
      }
      return contentDeliveryMigrationPromise;
    };

    const runHeavyInit = () => {
      // Remote Config: apply cached/live admin-tuned flags ASAP, then keep live.
      void import('./remote_config_client')
        .then((m) => {
          void m.loadRemoteConfig().catch(() => {});
          m.subscribeRemoteConfig();
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

      AsyncStorage.multiSet([
        ['device_platform', Platform.OS],
        ['app_version', Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown'],
      ]).catch(() => {});

      // Дожидаемся (или дублируем при отсутствии) гидратации из облака,
      // и ТОЛЬКО потом запускаем sync/leaderboard/etc. Иначе syncToCloud мог бы
      // пушить пустые локальные данные раньше чем restoreFromCloud успеет ответить.
      const hydrate = cloudHydratePromise ?? (async () => {
        try {
          await ensureAnonUser();
          await restoreFromCloud();
        } catch (e) {
          if (__DEV__) console.warn('[_layout]', e);
        }
      })();

      void hydrate.then(async () => {
        await runContentDeliveryMigration().catch(() => {});
        try { emitAppEvent('cloud_profile_hydrated'); } catch (e) { if (__DEV__) console.warn('[_layout]', e); }
        // Одноразовая починка после релиза, в котором (tabs)/index.tsx
        // перестал уважать persistedUnlocked: подтягиваем lesson{N-1}_best_score
        // до 2.5 для уроков, которые в облаке уже значатся как открытые.
        // См. repairLessonUnlocksAfterRestore() и lesson_unlock_repair_v1 флаг.
        repairLessonUnlocksAfterRestore().catch(() => {});
        await loadShardsFromCloud().catch(() => {});
        // Дотягиваем pending shard-grants после оплаты: вебхук RC мог задержаться
        // дольше окна waitForServerShardGrant в магазине. См. shards_pending_grants.ts.
        void (async () => {
          const { resumePendingShardGrants } = await import('./shards_pending_grants');
          await resumePendingShardGrants().catch(() => {});
        })();
        prefetchArenaRatingCache();
        const freshShards = await AsyncStorage.getItem('shards_balance');
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
        // ARENA-005: добиваем зависшую запись результата бот-матча даже если игрок больше не
        // открывал экран результатов арены — иначе показанные «+50 XP / повышение ранга» молча
        // теряются при провале фоновой записи.
        getCanonicalUserId()
          .then((uid) => flushPendingBotArenaMatch(uid))
          .catch(() => {});
        await syncToCloud().catch(() => {
          emitAppEvent('action_toast', {
            type: 'error',
            messageRu: 'Не удалось синхронизировать данные — проверь соединение',
            messageUk: "Не вдалося синхронізувати дані — перевір з'єднання",
            messageEs: 'Error al sincronizar — revisa tu conexión',
          });
        });
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
        void import('./referral_bootstrap')
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
      InteractionManager.runAfterInteractions(() => {
        void import('./flashcards_swipe').catch(() => {});
        import('./flashcards_collection')
          .then((m) => m.primeFlashcardsCollectionCache())
          .catch(() => {});
      });
      checkForUpdate().then(u => { if (u) setUpdateInfo(u); }).catch(() => {});
      prefetchEasUpdateAfterStartup().catch(() => {});
    };

    const bootstrap = async () => {
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
        cloudHydratePromise = (async () => {
          await appCheckWarmup;
          try {
            await ensureAnonUser();
            await restoreFromCloud();
          } catch (e) {
            if (__DEV__) console.warn('[_layout]', e);
          }
        })();
        void runContentDeliveryMigration(cloudHydratePromise);
      }

      // Tiny local hydration budget: keep first paint fast even if storage is slow.
      const startupLocalHydration = Promise.all([
        hydrateUserSettingsFromStorage().catch(() => {}),
        hydrateHapticsTapFromStorage().catch(() => {}),
        hydrateNotifSettingsFromStorage().catch(() => {}),
      ]);
      await Promise.race([
        startupLocalHydration,
        new Promise<void>((resolve) => setTimeout(resolve, 350)),
      ]).catch(() => {});
      void startupLocalHydration.catch(() => {});
      // Сразу читаем осколки в фоне — к моменту «Главной» peekLastKnownShardsBalance уже с кэшем.
      void getShardsBalance()
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
                  const duelMatch = ir.match(/^duel_([A-Za-z0-9]+)$/);
                  if (duelMatch) {
                    const roomId = duelMatch[1];
                    AsyncStorage.getItem('user_name')
                      .then((name) => {
                        if (name?.trim()) return AsyncStorage.setItem('onboarding_done', '1');
                        return undefined;
                      })
                      .then(() => {
                        setPendingRoute(`/arena_join?roomId=${roomId}`);
                      })
                      .finally(() => resolve(true));
                    return;
                  }
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

      clearTimeout(safetyTimer);
      setReady(true);
      setTimeout(flushPending, 280);
      if (shouldPrimeLessonsAfterReveal) {
        InteractionManager.runAfterInteractions(() => {
          void runContentDeliveryMigration(cloudHydratePromise)
            .then(() => primeAllLessonsFromStorageOnAppLaunch(studyTarget))
            .catch(() => {});
        });
      }
    };

    runHeavyInitRef.current = runHeavyInit;
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
      clearTimeout(safetyTimer);
      runHeavyInitRef.current = null;
      sub.remove();
      subShards.remove();
      subDelete.remove();
    };
  }, [flushPending]);

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
    const state = await getIntroFullAccessState().catch(() => null);
    if (!state?.expiredUnseen) return;
    if (await hasVerifiedRealPremiumOrVip()) {
      await markIntroFullAccessEndedSeen().catch(() => {});
      return;
    }
    if (state?.expiredUnseen) {
      setIntroFullAccessModal('ended');
      // Воронка: показана модалка «72 часа закончились» — главный момент конверсии.
      void import('./analytics').then(({ trackEvent }) => trackEvent('intro_ended_shown', {})).catch(() => {});
      void import('./firebase').then(({ logIntroEndedShown }) => logIntroEndedShown()).catch(() => {});
    }
  }, [effectiveShowOnboarding, firstContentReady, hasVerifiedRealPremiumOrVip, isBanned, ready]);

  useEffect(() => {
    void checkIntroFullAccessEndedModal();
    const introSub = onAppEvent('intro_full_access_changed', () => {
      void checkIntroFullAccessEndedModal();
    });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void checkIntroFullAccessEndedModal();
      }
    });
    return () => {
      introSub.remove();
      appSub.remove();
    };
  }, [checkIntroFullAccessEndedModal]);

  // ── Подарок лояльности (72ч полного доступа существующим free-юзерам) ──
  // Нажата «Получить 3 дня премиум»: стартуем подарок, эмитим событие пересчёта
  // доступа, ставим pending VIP-celebration (WOW-анимация проиграется на главной),
  // закрываем модал-предложение.
  const claimLoyaltyGift = useCallback(async () => {
    await markLoyaltyGiftOfferSeen().catch(() => {});
    const started = await startLoyaltyGift(Date.now(), lang).catch(() => false);
    setLoyaltyGiftModal(null);
    if (started) {
      emitAppEvent('loyalty_gift_changed');
      // WOW-анимация ВИП (aurora + benefit reel) на главной — пользователь увидит её сразу после получения.
      void import('./vip_celebration_state')
        .then(({ markVipCelebrationPending }) => markVipCelebrationPending(`loyalty_${Date.now()}`))
        .catch(() => {});
    }
  }, [lang]);

  // «Может позже»: помечаем предложение показанным (больше не покажем), доступ не выдаём.
  const dismissLoyaltyGiftOffer = useCallback(async () => {
    await markLoyaltyGiftOfferSeen().catch(() => {});
    setLoyaltyGiftModal(null);
  }, []);

  // Премиум/VIP закрыл анонс обновления (там нет подарка) — просто помечаем показанным.
  const closeLoyaltyAnnounce = useCallback(async () => {
    await markLoyaltyGiftOfferSeen().catch(() => {});
    setLoyaltyGiftModal(null);
  }, []);

  // Тап по блоку «год доступа за идею» — закрываем модал (как показанный) и ведём в Идеи.
  const openLoyaltyIdeas = useCallback(async () => {
    await markLoyaltyGiftOfferSeen().catch(() => {});
    setLoyaltyGiftModal(null);
    router.push('/ideas_submit' as any);
  }, [router]);

  // Финальный модал после истечения подарка лояльности — переиспользуем intro-модал
  // 'ended' (та же логика: ведёт на пейвол / «продолжить бесплатно»). Закрытие обрабатывает
  // closeLoyaltyEndedModal, который помечает loyalty_gift_ended_seen.
  const closeLoyaltyEndedModal = useCallback(async (action: 'primary' | 'secondary') => {
    await markLoyaltyGiftEndedSeen().catch(() => {});
    setIntroFullAccessModal(null);
    if (action === 'primary') {
      void import('./analytics').then(({ trackEvent }) => trackEvent('loyalty_gift_ended_cta', {})).catch(() => {});
      const streakCount = parseInt((await AsyncStorage.getItem('streak_count').catch(() => null)) || '0', 10) || 0;
      router.replace({
        pathname: '/premium_modal',
        params: { context: 'intro_ended', streak: String(streakCount) },
      } as any);
    } else {
      void import('./analytics').then(({ trackEvent }) => trackEvent('loyalty_gift_ended_dismiss', {})).catch(() => {});
    }
  }, [router]);

  // Маршрутизатор закрытия модала 'ended': источник определяет, чей это финал —
  // intro новичка или подарок лояльности (loyaltyEndedActiveRef).
  const loyaltyEndedActiveRef = useRef(false);

  const checkLoyaltyGiftFlow = useCallback(async () => {
    if (!ready || effectiveShowOnboarding || isBanned || !firstContentReady) return;
    // Премиум/VIP: подарок не выдаём, но текст обновления показываем — один раз,
    // без блока подарка и без кнопки получения (variant 'announce').
    if (await hasVerifiedRealPremiumOrVip()) {
      const st = await getLoyaltyGiftState().catch(() => null);
      if (st?.expiredUnseen) await markLoyaltyGiftEndedSeen().catch(() => {});
      const onboardingDone = (await AsyncStorage.getItem('onboarding_done').catch(() => null)) === '1';
      const announceSeen = await isLoyaltyGiftOfferSeen().catch(() => false);
      if (LOYALTY_UPDATE_MODAL_ENABLED && onboardingDone && !announceSeen && introFullAccessModal === null && loyaltyGiftModal === null) {
        setLoyaltyGiftModal('announce');
      }
      return;
    }

    // 1) Финал: подарок истёк, но финальный модал ещё не показан.
    const state = await getLoyaltyGiftState().catch(() => null);
    if (state?.expiredUnseen) {
      loyaltyEndedActiveRef.current = true;
      setIntroFullAccessModal('ended');
      void import('./analytics').then(({ trackEvent }) => trackEvent('loyalty_gift_ended_shown', {})).catch(() => {});
      return;
    }

    // 2) Предложение: только существующим (прошёл онбординг до обновления),
    //    кто ещё не получал подарок и кому предложение ещё не показывали.
    if (state?.active) return; // подарок уже идёт — предложение не нужно
    const onboardingDone = (await AsyncStorage.getItem('onboarding_done').catch(() => null)) === '1';
    if (!onboardingDone) return; // новый юзер — подарок не для него
    if (await isLoyaltyGiftClaimed().catch(() => false)) return; // уже получал
    if (await isLoyaltyGiftOfferSeen().catch(() => false)) return; // уже показывали
    // Не показываем поверх модала конца intro новичка.
    if (introFullAccessModal !== null) return;
    const introState = await getIntroFullAccessState().catch(() => null);
    if (introState?.active) return; // у новичка ещё идёт его подарок — не дублируем
    if (!LOYALTY_UPDATE_MODAL_ENABLED) return;
    setLoyaltyGiftModal('offer');
  }, [effectiveShowOnboarding, firstContentReady, hasVerifiedRealPremiumOrVip, introFullAccessModal, loyaltyGiftModal, isBanned, ready]);

  useEffect(() => {
    void checkLoyaltyGiftFlow();
    const loyaltySub = onAppEvent('loyalty_gift_changed', () => {
      void checkLoyaltyGiftFlow();
    });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkLoyaltyGiftFlow();
    });
    return () => {
      loyaltySub.remove();
      appSub.remove();
    };
  }, [checkLoyaltyGiftFlow]);

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
      const introState = await getIntroFullAccessState().catch(() => null);
      const introPending = introState?.expiredUnseen === true;

      const show = !introPending && (await shouldShowWinback({ isPremium, nowMs }));
      if (show) {
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

  useEffect(() => {
    void checkWinbackOffer();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkWinbackOffer();
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
    // Снимаем оверлей онбординга ПОСЛЕ того, как replace на /home закоммитится. Иначе,
    // если под оверлеем активен маршрут пейвола (план-ветка: handleOnboardingPersonalPlanPaywall
    // делает router.replace('/paywall_*')), при мгновенном setShow(false) пейвол мелькает один
    // кадр до перехода на главную. Небольшая отсрочка убирает мелькание (оверлей держит экран,
    // пока навигация не встала на /home).
    setTimeout(() => setShow(false), 60);
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
      setTimeout(() => setIntroFullAccessModal('welcome'), 320);
    }
  }, [armPostOnboardingGoldBridge, hasVerifiedRealPremiumOrVip, router]);

  const handleOnboardingPersonalPlanPaywall = useCallback(async () => {
    await AsyncStorage.setItem(PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1');
    await AsyncStorage.setItem('onboarding_step', 'name');
    await AsyncStorage.removeItem('onboarding_done');
    await AsyncStorage.setItem('xp_migration_v2', '1');
    if (firstContentReadyTimerRef.current) {
      clearTimeout(firstContentReadyTimerRef.current);
      firstContentReadyTimerRef.current = null;
    }
    setFirstContentReady(true);
    setDeferEnergyOnboardingForPostOnboardingFirstLesson(false);
    const planBilling = await AsyncStorage.getItem('onboarding_plan_billing').catch(() => null);
    // «Пульт»: если персональный план переведён в «Фри» — пейвол не показываем,
    // новичок сразу попадает домой (план активируется без оплаты).
    if (isFeatureFreeForEveryone('personal_plan')) {
      setShow(false);
      router.replace('/(tabs)/home' as any);
      return;
    }
    // ОНБОРДИНГ: идём ПРЯМО на нужный A/B/C-пейвол, минуя прозрачный диспетчер
    // premium_modal. Диспетчер — transparentModal: пока он на один кадр висит
    // прозрачным до своего replace, за ним видна «Главная» — отсюда «мелькание
    // home перед пейволом» (и риск Apple 5.6). Вариант резолвится синхронно из
    // кэша (как это делает сам диспетчер), а ветку «уже premium» онбординг
    // отсекает ВЫШЕ (openSelectedPlanAbPaywall проверяет hasPremiumAccess до
    // вызова этого хендлера), поэтому диспетчер тут не нужен.
    //
    // Пейвол с source=onboarding_plan открывается как обычный экран (card,
    // animation:'none' — см. paywallScreenStackOptions): непрозрачный онбординг-фон
    // мгновенно перекрывает «Главную». СНАЧАЛА навигация (пейвол монтируется под
    // оверлеем онбординга), ПОТОМ setShow(false) — оверлей снимается, а под
    // ним уже непрозрачный пейвол. Кадра с «Главной» нет.
    // Помечаем онбординг-пейвол активным ДО навигации — статические <Stack.Screen>
    // (paywall_a/b/c) переключаются на card/none, и пейвол монтируется как обычный
    // экран онбординга, без выезда снизу. Сбрасываем флаг при уходе с пейвола.
    setOnboardingPaywallActive(true);
    try {
      const { resolvePaywallAbVariantSync } = await import('./paywall_variant');
      const { variant } = resolvePaywallAbVariantSync();
      const route = variant === 'A' ? '/paywall_a' : variant === 'B' ? '/paywall_b' : '/paywall_c';
      router.replace({
        pathname: route,
        params: {
          context: 'personal_plan',
          source: 'onboarding_plan',
          ...(planBilling === 'monthly' || planBilling === 'yearly' ? { plan: planBilling } : {}),
        },
      } as any);
    } catch {
      // Если резолвер не загрузился — безопасный фолбэк через диспетчер.
      router.replace({
        pathname: '/premium_modal',
        params: {
          context: 'personal_plan',
          source: 'onboarding_plan',
          ...(planBilling === 'monthly' || planBilling === 'yearly' ? { plan: planBilling } : {}),
        },
      } as any);
    }
    setShow(false);
  }, [router]);

  const handleOnboardingIntroFullAccessStart = useCallback(async () => {
    await startIntroFullAccessAfterOnboarding(Date.now(), lang);
    emitAppEvent('intro_full_access_changed');
    return true;
  }, [lang]);

  // После закрытия онбординга и монтирования Stack — переходим на нужный экран
  useEffect(() => {
    const sub = onAppEvent('personal_plan_onboarding_nickname_ready', () => {
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
          await AsyncStorage.multiSet([
            [PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1'],
            ['onboarding_step', 'name'],
          ]);
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

  const dailyPlanModalSeenKey = `${DAILY_TASKS_FIRST_VISIT_MODAL_SEEN_PREFIX}:${studyTarget ?? 'default'}:${getTodayKey()}`;

  useEffect(() => {
    let cancelled = false;
    if (!ready || !rootNavigationReady || effectiveShowOnboarding || isBanned || !firstContentReady) {
      setDailyPlanModalDue(false);
      return () => {
        cancelled = true;
      };
    }
    AsyncStorage.getItem(dailyPlanModalSeenKey)
      .then((seen) => {
        if (!cancelled) setDailyPlanModalDue(seen !== '1');
      })
      .catch(() => {
        if (!cancelled) setDailyPlanModalDue(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dailyPlanModalSeenKey, effectiveShowOnboarding, firstContentReady, isBanned, ready, rootNavigationReady]);

  const closeDailyPlanModal = useCallback(() => {
    setDailyPlanModalDue(false);
    AsyncStorage.setItem(dailyPlanModalSeenKey, '1').catch(() => {});
  }, [dailyPlanModalSeenKey]);

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
  // Приоритет: update > releaseNotes > broadcast > notifNudge > introFullAccess >
  // loyaltyGift > dailyPlan > levelUp.
  // ВАЖНО: эти хуки должны вызываться до любых условных return ниже.
  // introFullAccess / loyaltyGift — нативные <Modal statusBarTranslucent>: их обязательно
  // гейтить через арбитр, иначе на холодном старте они могут наложиться на другую такую же
  // модалку (update/broadcast/levelUp/dailyPlan) → мерцание/зависание System UI (ANR) на Android.
  const updateModalVisible = useOverlayVisible('update', !!updateInfo && !updateModalHiddenForStore);
  const releaseNotesModalVisible = useOverlayVisible('releaseNotes', releaseNotesOffer);
  const broadcastModalVisible = useOverlayVisible('broadcast', !!globalBroadcastModal);
  const leagueBonusAvailableModalVisible = useOverlayVisible('leagueBonusAvailable', !!leagueBonusAvailable);
  const notifNudgeModalVisible = useOverlayVisible('notifNudge', notifNudgeVisible);
  const introFullAccessModalVisible = useOverlayVisible('introFullAccess', introFullAccessModal !== null);
  const loyaltyGiftModalVisible = useOverlayVisible('loyaltyGift', loyaltyGiftModal !== null);
  // ⚠️ Модалка «задания дня при первом входе» ОТКЛЮЧЕНА (DailyTasksFirstVisitModal в проде
  // всегда возвращает null — её заменил брифинг Компаса). Поэтому ключ 'dailyPlan' НЕ ДОЛЖЕН
  // просить единственный слот арбитра: dailyPlanModalDue становился true раз в сутки, арбитр
  // отдавал слот ключу 'dailyPlan', но модалка не рендерилась → её никто не закрывал →
  // closeDailyPlanModal() не вызывался → слот завис на весь день → ВСЕ тосты (они ниже по
  // приоритету) глобально переставали показываться. Передаём false, пока модалка отключена.
  // dailyPlanModalDue/closeDailyPlanModal оставлены для админ-превью и возможного возврата модалки.
  const dailyPlanModalVisible = useOverlayVisible('dailyPlan', false);
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


  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: STARTUP_SPLASH_BG }}>
        <StartupSplashHold visible={true} />
      </View>
    );
  }

  if (isBanned) {
    return (
      <View style={{ flex: 1, backgroundColor: '#06141B', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: '#121826', borderRadius: 18, borderWidth: 1, borderColor: '#7f1d1d', padding: 20 }}>
          <Text style={{ color: '#f87171', fontSize: 28, textAlign: 'center', marginBottom: 10 }}>🚫</Text>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
            Аккаунт заблокирован
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
            Доступ к приложению ограничен. Если считаете блокировку ошибочной — напишите в поддержку.
          </Text>
          <TouchableOpacity
            onPress={() => checkBanStatus(true)}
            style={{ backgroundColor: '#1f2937', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Проверить снова</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const appShellReady = ready && !effectiveShowOnboarding && !isBanned && firstContentReady;
  const appOverlaysEnabled = ready && !effectiveShowOnboarding && !isBanned;
  const startupSplashVisible = !ready || (!effectiveShowOnboarding && !isBanned && !firstContentReady);

  return (
    <View style={{ flex: 1, backgroundColor: appShellReady ? tTheme.bgPrimary : STARTUP_SPLASH_BG }}>
    <MaintenanceGate />
    <PromoBanner />

    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: appShellReady ? tTheme.bgPrimary : STARTUP_SPLASH_BG },
        // Без native-stack transitions: Android/Fabric падал на открытии вложенных экранов и Back.
        // ENABLE_SCREEN_TRANSITIONS (по умолчанию false) включает мягкое появление
        // ТОЛЬКО после проверки на Android — иначе поведение идентично прежнему (none).
        animation: ENABLE_SCREEN_TRANSITIONS ? 'slide_from_right' : 'none',
        animationDuration: ENABLE_SCREEN_TRANSITIONS ? 220 : 0,
        freezeOnBlur: false,
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
      <Stack.Screen name="lesson_menu" />
      <Stack.Screen name="lesson_words" />
      <Stack.Screen name="lesson_irregular_verbs" />
      <Stack.Screen name="lesson_complete" />


      <Stack.Screen name="hint" />
      <Stack.Screen name="lesson_help" />
      <Stack.Screen name="preposition_drill" />
      <Stack.Screen name="settings_edu" />
      <Stack.Screen name="settings_notifications" />
      <Stack.Screen name="settings_themes" />
      <Stack.Screen name="settings_language" />
      <Stack.Screen name="league_screen" />
      <Stack.Screen name="club_screen" />
      <Stack.Screen name="streak_stats" />
      <Stack.Screen name="diagnostic_test" />
      <Stack.Screen name="exam" />
      <Stack.Screen name="daily_tasks_screen" />
      <Stack.Screen name="personal_plan" options={{ headerShown: false }} />
      <Stack.Screen name="personal_plan_complete" options={{ headerShown: false }} />
      <Stack.Screen name="personal_plan_dev" options={{ headerShown: false }} />
      <Stack.Screen name="personal_plan_runtime_dev" options={{ headerShown: false }} />
      <Stack.Screen name="personal_plan_thank_you" options={{ headerShown: false }} />
      <Stack.Screen name="personal_plan_task_done" options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal', gestureEnabled: true }} />
      <Stack.Screen name="personal_plan_exercise_transition" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="personal_plan_stats_screen" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="personal_plan_theory" options={{ headerShown: false, animation: 'slide_from_right' }} />
      {/* Диспетчер прозрачный и мгновенно (useLayoutEffect) делает replace на нужный пейвол —
          поэтому сам он без анимации, а выезд снизу даёт целевой пейвол ниже. */}
      <Stack.Screen name="premium_modal" options={{ presentation: 'transparentModal', animation: 'none', animationDuration: 0 }} />
      {/* Эксперимент пейволов v3: варианты A/B/C (диспетчер — premium_modal). По умолчанию
          выезжают снизу как модал. НА ОНБОРДИНГЕ (onboardingPaywallActive) — открываются как
          обычный экран онбординга (card, без анимации/выезда снизу); presentation задаётся
          на статическом <Stack.Screen>, т.к. mount-presentation нативный стек читает при push. */}
      <Stack.Screen name="paywall_a" options={paywallScreenStackOptions(onboardingPaywallActive)} />
      <Stack.Screen name="paywall_b" options={paywallScreenStackOptions(onboardingPaywallActive)} />
      <Stack.Screen name="paywall_c" options={paywallScreenStackOptions(onboardingPaywallActive)} />
      <Stack.Screen name="manage_subscription" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }} />
      <Stack.Screen name="referral_code_entry" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="referrals" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="promo_code_entry" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="avatar_select" />
      <Stack.Screen name="flashcards" />
      <Stack.Screen name="flashcards_audio" />
      <Stack.Screen name="flashcards_collection" />
      <Stack.Screen name="flashcards_swipe" />
      <Stack.Screen name="community_pack_create" />
      <Stack.Screen name="pack_opening" options={{ presentation: 'modal', animation: 'none', animationDuration: 0 }} />
      <Stack.Screen name="shards_shop" />
      <Stack.Screen name="level_gifts_inventory" />
      <Stack.Screen name="achievements_screen" />
      <Stack.Screen name="collectibles_screen" />
      <Stack.Screen name="level_exam" />
      <Stack.Screen name="review" />
      {ENABLE_DEV_TOOLS && DEV_UTILITY_ROUTE_NAMES.map((name) => (
        <Stack.Screen key={name} name={name} />
      ))}
      <Stack.Screen name="beta_testers" />
      <Stack.Screen name="privacy_screen" />
      <Stack.Screen name="terms_screen" />
      <Stack.Screen name="lingman_videos" />
      <Stack.Screen name="lingman_video_player" />
      <Stack.Screen name="arena_game" options={{ animation: 'none' }} />
      <Stack.Screen name="arena_lobby" options={{ animation: 'none' }} />
      <Stack.Screen name="arena_results" />
      <Stack.Screen name="arena_join" />
      <Stack.Screen name="arena_room" />
      <Stack.Screen name="arena_rating" />
      <Stack.Screen name="arena_leaderboard" />
      <Stack.Screen name="web_screen" />
      <Stack.Screen name="quizzes_screen" options={{ headerShown: false }} />
      <Stack.Screen name="trainer" />
      <Stack.Screen name="trainer_plan_session" />
      <Stack.Screen name="trainer_words_session" />
      <Stack.Screen name="trainer_phrases_session" />
      <Stack.Screen name="trainer_arena_session" />
      <Stack.Screen name="phrase_analytics_screen" />
      <Stack.Screen name="problem_coach" />
    </Stack>

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
      visible={appOverlaysEnabled && introFullAccessModalVisible}
      variant={introFullAccessModal ?? 'welcome'}
      onPrimaryPress={() => {
        // Один и тот же модал 'ended' обслуживает и intro новичка, и подарок лояльности —
        // маршрутизируем по флагу, выставленному в checkLoyaltyGiftFlow.
        if (introFullAccessModal === 'ended' && loyaltyEndedActiveRef.current) {
          loyaltyEndedActiveRef.current = false;
          void closeLoyaltyEndedModal('primary');
        } else {
          void closeIntroFullAccessModal('primary');
        }
      }}
      onSecondaryPress={() => {
        if (introFullAccessModal === 'ended' && loyaltyEndedActiveRef.current) {
          loyaltyEndedActiveRef.current = false;
          void closeLoyaltyEndedModal('secondary');
        } else {
          void closeIntroFullAccessModal('secondary');
        }
      }}
    />

    <LoyaltyGiftModal
      visible={appOverlaysEnabled && loyaltyGiftModalVisible}
      variant={loyaltyGiftModal === 'announce' ? 'announce' : 'gift'}
      onPrimaryPress={() => {
        // free → выдаём подарок; премиум/VIP → просто закрываем анонс.
        if (loyaltyGiftModal === 'announce') { void closeLoyaltyAnnounce(); }
        else { void claimLoyaltyGift(); }
      }}
      onSecondaryPress={() => { void dismissLoyaltyGiftOffer(); }}
      onIdeasPress={() => { void openLoyaltyIdeas(); }}
    />

    <DailyTasksFirstVisitModal
      visible={appOverlaysEnabled && dailyPlanModalVisible}
      studyTarget={studyTarget}
      onClose={closeDailyPlanModal}
    />

    {ready && effectiveShowOnboarding && (
      <View style={styles.appFullScreenOverlay}>
        <Onboarding
          startAtNameStep={onboardingStartAtName}
          initialLang={lang}
          onDone={handleOnboardingDone}
          onLangSelect={handleLangSelect}
          onIntroFullAccessStart={handleOnboardingIntroFullAccessStart}
          onPersonalPlanPaywallStart={handleOnboardingPersonalPlanPaywall}
        />
      </View>
    )}

    {ready && isBanned && (
      <View style={[styles.appFullScreenOverlay, { backgroundColor: '#06141B', justifyContent: 'center', padding: 24 }]}>
        <View style={{ backgroundColor: '#121826', borderRadius: 18, borderWidth: 1, borderColor: '#7f1d1d', padding: 20 }}>
          <Text style={{ color: '#f87171', fontSize: 28, textAlign: 'center', marginBottom: 10 }}>🚫</Text>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
            Аккаунт заблокирован
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
            Доступ к приложению ограничен. Если считаете блокировку ошибочной — напишите в поддержку.
          </Text>
          <TouchableOpacity
            onPress={() => checkBanStatus(true)}
            style={{ backgroundColor: '#1f2937', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Проверить снова</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}

    <StartupSplashHold visible={startupSplashVisible} />

    {/* Force-update — поверх обслуживания: если версия устарела, ничего не доступно. */}
    <ForceUpdateGate />

    </View>
  );
}

const styles = StyleSheet.create({
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
  // Keep this as an Expo Go/dev fallback, but do not block the first app frame on it.
  useFonts(APP_FONT_ASSETS);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: STARTUP_SPLASH_BG }}>
    <ErrorBoundary>
      <SafeAreaProvider>
      <ThemeProvider>
        <LangProvider>
          <StudyTargetProvider>
          <PremiumProvider>
            <EnergyProvider>
              <AchievementProvider>
                <MatchmakingProvider>
                  <OverlayArbiterProvider>
                    <AppContent />
                    <AchievementToast />
                    <DailyTaskRewardToast />
                    <ActionToast />
                    <ArenaFriendInviteHost />
                    <MatchFoundToast />
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
                </MatchmakingProvider>
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
