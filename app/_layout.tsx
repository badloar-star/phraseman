import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from '../components/SafeLinearGradient';
import { Stack, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Image, InteractionManager, LogBox, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AchievementProvider, useAchievement } from '../components/AchievementContext';
import AchievementToast from '../components/AchievementToast';
import { EnergyProvider } from '../components/EnergyContext';
import { LangProvider, useLang } from '../components/LangContext';
import { StudyTargetProvider, useStudyTarget } from '../components/StudyTargetContext';
import LevelBadge from '../components/LevelBadge';
import LevelGiftDualModal from '../components/LevelGiftDualModal';
import LevelGiftModal from '../components/LevelGiftModal';
import Onboarding from '../components/onboarding';
import { PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY } from './personal_plan_activation';
import { PremiumProvider } from '../components/PremiumContext';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import UpdateModal from '../components/UpdateModal';
import ReleaseNotesModal from '../components/ReleaseNotesModal';
import GlobalBroadcastModal from '../components/GlobalBroadcastModal';
import LeagueBonusAvailableModal from '../components/LeagueBonusAvailableModal';
import NotificationPermissionModal from '../components/NotificationPermissionModal';
import { getMaxEnergyForLevel, type ThemeMode } from '../constants/theme';
import type { Lang } from '../constants/i18n';
import { getTitleColor, getTitleForLevel } from '../constants/titles';
import { ENABLE_DEV_TOOLS, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { checkAchievements, getPendingNotifications, markAchievementsNotified } from './achievements';
import { ensureAnonUser, ensureStableAuthLink, restoreFromCloud, syncToCloud } from './cloud_sync';
import { repairLessonUnlocksAfterRestore } from './lesson_lock_system';
import { registerInLeagueGroupSilently } from './firestore_leagues';
import { PlayInstallReferrer } from 'react-native-play-install-referrer';
import { migrateWeekPointsIfNeeded, updateStreakOnActivity } from './hall_of_fame_utils';
import { preloadImages, preloadStartupImages } from './image_preload';
import {
  checkLeagueOvertakeNotification, getNotifSettingsSnapshot, hydrateNotifSettingsFromStorage, isNotificationPermissionGranted, requestNotificationPermissionWithFallback, scheduleDailyReminder, scheduleMonthlyRecapNotification, scheduleNotifications, schedulePhrasOfDayNotification, scheduleStreakWarningIfNeeded, scheduleWeeklyRecapNotification, setupNotificationTapHandler,
} from './notifications';
import { initRevenueCat } from './revenuecat_init';
import { prefetchMarketplacePacks } from './flashcards/marketplace';
import { prefetchArenaRatingCache } from './arena_rating_cache';
import { syncPublicProfileSnapshot } from './public_profile_snapshot';
import { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus, getVerifiedVipStatus } from './premium_guard';
import { tryGrantPremiumMonthlyWagerFromLevelUp } from './streak_wager';
import { incrementSessionCount } from './review_utils';
import { checkForUpdate, UpdateInfo } from './update_check';
import { registerXP, migrateXPFormulaV2 } from './xp_manager';
import { getShardAchievementEligibleBalance, getShardsBalance, loadShardsFromCloud } from './shards_system';
import { MatchmakingProvider } from '../contexts/MatchmakingContext';
import MatchFoundToast from '../components/MatchFoundToast';
import ActionToast from '../components/ActionToast';
import DailyTaskRewardToast from '../components/DailyTaskRewardToast';
import ArenaFriendInviteHost from '../components/ArenaFriendInviteHost';
import GlobalShardsEarnedHost from '../components/GlobalShardsEarnedHost';
import ThemedBlockingAlertHost from '../components/ThemedBlockingAlertHost';
import { getCanonicalUserId } from './user_id_policy';
import { dismissReleaseNotesModalPermanently, shouldOfferReleaseNotesModal } from './release_notes_modal';
import { fetchPendingGlobalBroadcastModal, GlobalBroadcastModalPayload } from './global_broadcast_modal';
import { emitAppEvent, onAppEvent } from './events';
import { hydratePlatformUiPreviewFromStorage } from './platform_ui_preview';
import { markWentToFirstLessonFromAfterOnboardingSheet, setDeferEnergyOnboardingForPostOnboardingFirstLesson } from './energyOnboardingGate';
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
import { useAdaptiveBackgroundSource } from '../components/adaptiveBackgroundAssets';
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
import { FIRST_LESSON_SHEET_BACKGROUNDS } from '../components/firstLessonSheetAssets';
import { lastOpenedLessonKey, type RuntimeStudyTarget } from './target_storage_keys';
import { DEV_UTILITY_ROUTE_NAMES, DEV_UTILITY_ROUTE_PATHS, PERSONAL_PLAN_RUNTIME_DEV_ROUTE } from '../constants/devRoutes';
import { APP_FONT_ASSETS, APP_FONT_FAMILY } from './typography';

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
const FIRST_CONTENT_READY_FALLBACK_MS = 900;
const USE_ELITE_LEVEL_UP_MODAL = true;
const POST_ONBOARDING_GOLD_BRIDGE_MS = 3000;
const POST_ONBOARDING_GOLD_BRIDGE_SCREEN = ['rgba(255,224,144,0.34)', 'rgba(163,104,24,0.16)', 'rgba(18,14,6,0.08)'] as const;
const POST_ONBOARDING_GOLD_BRIDGE_PANEL = ['rgba(122,75,12,0.44)', 'rgba(54,34,8,0.30)', 'rgba(11,9,5,0.12)'] as const;
const POST_ONBOARDING_GOLD_BRIDGE_CTA = ['#FFF0B5', '#E2A923'] as const;
const POST_ONBOARDING_GOLD_BRIDGE_TEXT = '#3F2C08';
const FIRST_LESSON_SHEET_ENTER_MS = 280;
const FIRST_LESSON_SHEET_START_OFFSET_Y = 520;
const FIRST_LESSON_SHEET_BACKDROP_OPACITY = 0.58;
const FIRST_LESSON_SHEET_PANEL_SCRIMS: Record<ThemeMode, string> = {
  dark: 'rgba(3,10,6,0.56)',
  neon: 'rgba(3,12,3,0.50)',
  gold: 'rgba(5,5,5,0.52)',
  coral: 'rgba(28,8,5,0.50)',
  minimalLight: 'rgba(255,250,237,0.86)',
  minimalDark: 'rgba(8,12,20,0.54)',
  compass: 'rgba(12,10,7,0.54)',
};
const FIRST_LESSON_SHEET_TITLE_COLORS: Record<ThemeMode, string> = {
  dark: '#F7FFF4',
  neon: '#F8FFF1',
  gold: '#FFF7DF',
  coral: '#FFF7F2',
  minimalLight: '#1B1712',
  minimalDark: '#F5F7FB',
  compass: '#FFF8E8',
};
const FIRST_LESSON_SHEET_SUBTITLE_COLORS: Record<ThemeMode, string> = {
  dark: '#CFE7CF',
  neon: '#DDF8C8',
  gold: '#EBD7A5',
  coral: '#FFD8CF',
  minimalLight: '#635845',
  minimalDark: '#A7ABB3',
  compass: '#D8D2C8',
};
const FIRST_LESSON_SHEET_LATER_COLORS: Record<ThemeMode, string> = {
  dark: '#A8BFA6',
  neon: '#BFDCA7',
  gold: '#BDAA7A',
  coral: '#D5A59B',
  minimalLight: '#766B58',
  minimalDark: '#8FA2C2',
  compass: '#F2C48D',
};
const FIRST_LESSON_SHEET_BORDER_COLORS: Record<ThemeMode, string> = {
  dark: 'rgba(189,255,143,0.26)',
  neon: 'rgba(210,255,0,0.34)',
  gold: 'rgba(255,210,99,0.34)',
  coral: 'rgba(255,133,112,0.34)',
  minimalLight: 'rgba(120,91,42,0.22)',
  minimalDark: 'rgba(110,168,255,0.28)',
  compass: 'rgba(242,196,141,0.28)',
};
const FIRST_LESSON_SHEET_CTA_TEXT_COLORS: Record<ThemeMode, string> = {
  dark: '#F6FFF2',
  neon: '#172300',
  gold: '#FFE9A8',
  coral: '#350D08',
  minimalLight: '#3F2C08',
  minimalDark: '#07101F',
  compass: '#151008',
};
const FIRST_LESSON_SHEET_CTA_GRADIENTS: Record<ThemeMode, readonly [string, string]> = {
  dark: ['#2F8A42', '#155A2B'],
  neon: ['#C8FF00', '#A7E600'],
  gold: ['#1D1910', '#4D3A16'],
  coral: ['#FF7A66', '#EF4F3D'],
  minimalLight: ['#FFF2BF', '#E7B84E'],
  minimalDark: ['#D7E7FF', '#6EA8FF'],
  compass: ['#FFD58A', '#E7B13F'],
};
const FIRST_LESSON_SHEET_CTA_SHADOW_COLORS: Record<ThemeMode, string> = {
  dark: '#7CF05C',
  neon: '#C8FF00',
  gold: '#D5A63D',
  coral: '#FF715F',
  minimalLight: '#B78328',
  minimalDark: '#6EA8FF',
  compass: '#F2C48D',
};
const DAILY_LOGIN_BONUS_XP_BY_DAY = [
  20, 25, 30, 40, 50, 75, 120,
  130, 140, 150, 160, 170, 180, 220,
  230, 240, 250, 260, 270, 280, 350,
  360, 370, 380, 390, 400, 450, 500,
  600, 750,
] as const;

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
        resizeMode="contain"
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
    } catch {}

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
      if (name) {
        await registerXP(bonusXP, 'daily_login_bonus', name);
      }

      // Сохранить бонус для отображения на Home
      await AsyncStorage.setItem('login_bonus_pending', JSON.stringify({ xp: bonusXP, cycle: consecutive }));
      await AsyncStorage.setItem('login_bonus_v1', JSON.stringify({ lastDate: today, consecutiveDays: consecutive }));

      // Ачивки за логин
      checkAchievements({ type: 'login', consecutiveDays: consecutive }).catch(() => {});
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
      schedulePhrasOfDayNotification(lang, { requestPermission: false, studyTarget }).catch(() => {});

      scheduleWeeklyRecapNotification(lang, { requestPermission: false }).catch(() => {});
      scheduleMonthlyRecapNotification(lang, { requestPermission: false, studyTarget }).catch(() => {});
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
    } catch {}
  } catch {}
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
  const previewLevelUpParamRef = useRef<string | null>(null);
  const scheduledStateUpdatesRef = useRef<ScheduledAnimatedStateUpdate[]>([]);
  /** Сериализация flush: двойной await getItem до removeItem давал дубликаты уровня в queueRef. */
  const flushQueueBusyRef = useRef(false);
  const flushQueueRetryRef = useRef(false);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) { isShowingRef.current = false; return; }
    dismissingLevelUpRef.current = false;
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
      try { arr = JSON.parse(raw); } catch {}
      if (arr.length === 0) return;
      await AsyncStorage.removeItem('pending_level_up_queue');
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
    } catch {} finally {
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

  const dismissLevelUp = () => {
    if (dismissingLevelUpRef.current) return;
    dismissingLevelUpRef.current = true;
    Animated.timing(levelUpOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      scheduleTrackedAnimatedStateUpdate(scheduledStateUpdatesRef, () => {
        setShowLevelUp(false);
        void (async () => {
          try {
            const name = (await AsyncStorage.getItem('user_name')) || userName;
            const l: Lang = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
            await registerXP(100, 'level_up_bonus', name, l);
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
    queueRef.current = queueRef.current.slice(1);
    if (queueRef.current.length > 0) {
      queueMicrotask(showNext);
    } else {
      isShowingRef.current = false;
    }
  };

  const newTitleDef = getTitleForLevel(currentLevel);
  const isNewTitle  = newTitleDef.minLevel === currentLevel;
  const titleColor  = getTitleColor(currentLevel, isDark);
  const levelUpOverlayVisible = useOverlayVisible('levelUp', showLevelUp || showGiftModal);
  const levelUpGlowOpacity = levelUpGlow.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.44] });
  const levelUpModalScale = levelUpOpacity.interpolate({ inputRange: [0, 1], outputRange: USE_ELITE_LEVEL_UP_MODAL ? [0.9, 1] : [0.85, 1] });
  const levelUpAccent = rewardModalAccentColor(themeMode, t);
  const levelUpScreenDim = USE_ELITE_LEVEL_UP_MODAL
    ? (themeMode === 'minimalLight' ? 'rgba(24,18,10,0.32)' : 'rgba(0,0,0,0.46)')
    : 'rgba(0,0,0,0.6)';

  useEffect(() => {
    if (!showLevelUp || !levelUpOverlayVisible) return;
  }, [levelUpOverlayVisible, showLevelUp]);

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
              <LevelBadge level={currentLevel} size={USE_ELITE_LEVEL_UP_MODAL ? 108 : 100} autoplay={false} />
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
                  <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: USE_ELITE_LEVEL_UP_MODAL ? '800' : '700', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                    {lang === 'uk' ? '🎖️ Новий титул' : lang === 'es' ? '🎖️ Nuevo título' : '🎖️ Новый титул'}
                  </Text>
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
                <View style={{ backgroundColor: USE_ELITE_LEVEL_UP_MODAL ? 'rgba(255,255,255,0.045)' : '#1A3A2A', borderRadius: USE_ELITE_LEVEL_UP_MODAL ? 16 : 14, paddingHorizontal: 16, paddingVertical: 10, marginTop: 10, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: USE_ELITE_LEVEL_UP_MODAL ? 'rgba(255,255,255,0.12)' : '#34D399' }}>
                  <Text style={{ color: USE_ELITE_LEVEL_UP_MODAL ? t.textSecond : '#34D399', fontWeight: '800', fontSize: f.body }}>
                    {lang === 'uk'
                      ? `⚡ Тепер у тебе ${getMaxEnergyForLevel(currentLevel)} енергії на день!`
                      : lang === 'es'
                        ? `⚡ ¡Tu energía diaria máxima es ${getMaxEnergyForLevel(currentLevel)}!`
                        : `⚡ Теперь у тебя ${getMaxEnergyForLevel(currentLevel)} энергии в день!`}
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
  const [firstContentReady, setFirstContentReady] = useState(false);
  const [showFirstLessonSheet, setShowFirstLessonSheet] = useState(false);
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
  /** Гард от повторного тапа «Поехали» в листе первого урока (router.replace + push не должны исполняться дважды). */
  const firstLessonStartHandledRef = useRef(false);
  const postOnboardingGoldBridgeAnim = useRef(new Animated.Value(0)).current;
  const firstLessonSheetAnim = useRef(new Animated.Value(0)).current;
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
  const { setLang, lang } = useLang();
  const { studyTarget } = useStudyTarget();
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
        ? 'Цель лиги выполнена. Ты лидер недели, корона готова к выдаче.'
        : 'Цель лиги выполнена. Бонус лиги готов к получению.',
      messageUk: availability.isCrownWinner
        ? 'Ціль ліги виконано. Ти лідер тижня, корона готова до видачі.'
        : 'Ціль ліги виконано. Бонус ліги готовий до отримання.',
      messageEs: availability.isCrownWinner
        ? 'Meta de liga completada. Lideras la semana y la corona está lista.'
        : 'Meta de liga completada. El bono de liga está listo.',
    });
    if (source === 'startup' || pathname !== '/club_screen') {
      setLeagueBonusAvailable(availability);
    }
  }, [pathname]);

  useEffect(() => {
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
        } catch { /* */ }
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
      } catch { /* */ }
    })();
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
          // Пометить как notified ДО показа, чтобы повторный вызов не задублировал.
          await markAchievementsNotified(pending.map(a => a.id));
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
        void Linking.getInitialURL().then((u) => m.captureReferralFromUrl(u));
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
      // PostHog identify (no-op unless EXPO_PUBLIC_POSTHOG_KEY is set).
      void (async () => {
        try {
          const [{ getCanonicalUserId }, analytics] = await Promise.all([
            import('./user_id_policy'),
            import('./analytics'),
          ]);
          const uid = await getCanonicalUserId().catch(() => '');
          if (uid) void analytics.identifyUser(uid).catch(() => {});
        } catch {
          // ignore
        }
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
        } catch {}
      })();

      void hydrate.then(async () => {
        await runContentDeliveryMigration().catch(() => {});
        try { emitAppEvent('cloud_profile_hydrated'); } catch {}
        // Одноразовая починка после релиза, в котором (tabs)/index.tsx
        // перестал уважать persistedUnlocked: подтягиваем lesson{N-1}_best_score
        // до 2.5 для уроков, которые в облаке уже значатся как открытые.
        // См. repairLessonUnlocksAfterRestore() и lesson_unlock_repair_v1 флаг.
        repairLessonUnlocksAfterRestore().catch(() => {});
        await loadShardsFromCloud().catch(() => {});
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
        await syncToCloud().catch(() => {});
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
        void import('./referral_bootstrap')
          .then((m) => m.tryApplyPendingReferral())
          .catch(() => {});
      }).catch(() => {});

      AsyncStorage.getItem('install_date').then(val => {
        if (!val) AsyncStorage.setItem('install_date', String(Date.now())).catch(() => {});
      }).catch(() => {});

      incrementSessionCount().catch(() => {});
      preloadImages().catch(() => {});
      InteractionManager.runAfterInteractions(() => {
        void import('./flashcards_swipe').catch(() => {});
        import('./flashcards_collection')
          .then((m) => m.primeFlashcardsCollectionCache())
          .catch(() => {});
      });
      checkForUpdate().then(u => { if (u) setUpdateInfo(u); }).catch(() => {});
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
          } catch {}
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
        const prevXPRaw = await AsyncStorage.getItem('user_prev_xp');
        if (!prevXPRaw) {
          const totalXPRaw = await AsyncStorage.getItem('user_total_xp');
          if (totalXPRaw) {
            await AsyncStorage.setItem('user_prev_xp', totalXPRaw);
          }
        }

        const val = forceOnboardingForQA ? null : await AsyncStorage.getItem('onboarding_done');

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
                    AsyncStorage.setItem('onboarding_done', '1').then(() => {
                      setPendingRoute(`/arena_join?roomId=${roomId}`);
                    }).finally(() => resolve(true));
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
      } catch {}

      const iconFontsReady = preloadVectorIconFonts();
      void iconFontsReady.catch(() => {});
      void preloadStartupImages().catch(() => {});

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
      firstLessonStartHandledRef.current = false;
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

  // Навигация после онбординга — показываем bottomsheet первого урока
  const handleOnboardingDone = useCallback(async () => {
    // Гард от повторного вызова: handleFinishOnboarding в Onboarding async, и при двойном тапе
    // «Позже»/«Войти» onDone() мог вызваться дважды → два setTimeout → модалка повторно открывалась.
    if (onboardingDoneHandledRef.current) return;
    onboardingDoneHandledRef.current = true;
    await AsyncStorage.setItem('xp_migration_v2', '1');
    armPostOnboardingGoldBridge();
    if (firstContentReadyTimerRef.current) {
      clearTimeout(firstContentReadyTimerRef.current);
      firstContentReadyTimerRef.current = null;
    }
    setFirstContentReady(true);
    router.replace('/(tabs)/home' as any);
    setTimeout(() => router.replace('/(tabs)/home' as any), 120);
    setShow(false);
    // Не показываем тутор энергии на «Главной» одновременно с этим листом (ждём «Позже» или возврат с урока)
    setDeferEnergyOnboardingForPostOnboardingFirstLesson(true);
    // Небольшая задержка чтобы анимация закрытия онбординга успела завершиться
    setTimeout(() => setShowFirstLessonSheet(true), 400);
  }, [armPostOnboardingGoldBridge, router]);

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
    setShowFirstLessonSheet(false);
    setDeferEnergyOnboardingForPostOnboardingFirstLesson(false);
    setShow(false);
    router.replace('/(tabs)/home' as any);
    setTimeout(() => {
      router.push({ pathname: '/premium_modal', params: { context: 'personal_plan', source: 'onboarding_plan' } } as any);
    }, 120);
  }, [router]);

  // После закрытия онбординга и монтирования Stack — переходим на нужный экран
  useEffect(() => {
    const sub = onAppEvent('personal_plan_onboarding_nickname_ready', async () => {
      onboardingDoneHandledRef.current = false;
      await AsyncStorage.setItem(PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1');
      await AsyncStorage.setItem('onboarding_step', 'name');
      await AsyncStorage.removeItem('onboarding_done');
      setShowFirstLessonSheet(false);
      setDeferEnergyOnboardingForPostOnboardingFirstLesson(false);
      setShow(true);
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
  // Приоритет: update > releaseNotes > broadcast > notifNudge (releaseWave не подключён).
  // ВАЖНО: эти хуки должны вызываться до любых условных return ниже.
  const updateModalVisible = useOverlayVisible('update', !!updateInfo && !updateModalHiddenForStore);
  const releaseNotesModalVisible = useOverlayVisible('releaseNotes', releaseNotesOffer);
  const broadcastModalVisible = useOverlayVisible('broadcast', !!globalBroadcastModal);
  const leagueBonusAvailableModalVisible = useOverlayVisible('leagueBonusAvailable', !!leagueBonusAvailable);
  const notifNudgeModalVisible = useOverlayVisible('notifNudge', notifNudgeVisible);
  const firstLessonSheetVisible = useOverlayVisible('firstLessonSheet', showFirstLessonSheet);
  useEffect(() => {
    if (!firstLessonSheetVisible) {
      firstLessonSheetAnim.stopAnimation();
      firstLessonSheetAnim.setValue(0);
      return;
    }

    firstLessonSheetAnim.stopAnimation();
    firstLessonSheetAnim.setValue(0);
    const frame = requestAnimationFrame(() => {
      Animated.timing(firstLessonSheetAnim, {
        toValue: 1,
        duration: FIRST_LESSON_SHEET_ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      cancelAnimationFrame(frame);
      firstLessonSheetAnim.stopAnimation();
    };
  }, [firstLessonSheetAnim, firstLessonSheetVisible]);
  const firstLessonSheetBackground = useAdaptiveBackgroundSource(FIRST_LESSON_SHEET_BACKGROUNDS[themeMode] ?? FIRST_LESSON_SHEET_BACKGROUNDS.minimalDark);
  const firstLessonSheetScrim = FIRST_LESSON_SHEET_PANEL_SCRIMS[themeMode] ?? FIRST_LESSON_SHEET_PANEL_SCRIMS.minimalDark;
  const firstLessonSheetTitleColor = FIRST_LESSON_SHEET_TITLE_COLORS[themeMode] ?? '#FFFFFF';
  const firstLessonSheetSubtitleColor = FIRST_LESSON_SHEET_SUBTITLE_COLORS[themeMode] ?? '#C5CAD0';
  const firstLessonSheetLaterColor = FIRST_LESSON_SHEET_LATER_COLORS[themeMode] ?? '#9298A1';
  const firstLessonSheetBorderColor = FIRST_LESSON_SHEET_BORDER_COLORS[themeMode] ?? 'rgba(255,255,255,0.16)';
  const firstLessonSheetCtaTextColor = FIRST_LESSON_SHEET_CTA_TEXT_COLORS[themeMode] ?? '#FFFFFF';
  const firstLessonSheetCtaGradient = FIRST_LESSON_SHEET_CTA_GRADIENTS[themeMode] ?? FIRST_LESSON_SHEET_CTA_GRADIENTS.neon;
  const firstLessonSheetCtaShadowColor = FIRST_LESSON_SHEET_CTA_SHADOW_COLORS[themeMode] ?? '#C8FF00';
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
  const firstLessonSheetCtaLabel = lang === 'es'
    ? '¡Vamos! 🔥'
    : lang === 'uk'
      ? 'Так, поїхали! 🔥'
      : 'Да, поехали! 🔥';

  const firstLessonSheetBackdropOpacity = firstLessonSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FIRST_LESSON_SHEET_BACKDROP_OPACITY],
  });
  const firstLessonSheetTranslateY = firstLessonSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [FIRST_LESSON_SHEET_START_OFFSET_Y, 0],
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
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: appShellReady ? tTheme.bgPrimary : STARTUP_SPLASH_BG },
        // Без native-stack transitions: Android/Fabric падал на открытии вложенных экранов и Back.
        animation: 'none',
        animationDuration: 0,
        freezeOnBlur: false,
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
        headerBackButtonMenuEnabled: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
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
      <Stack.Screen name="personal_plan_dev" options={{ headerShown: false }} />
      <Stack.Screen name="personal_plan_runtime_dev" options={{ headerShown: false }} />
      <Stack.Screen name="personal_plan_thank_you" options={{ headerShown: false }} />
      <Stack.Screen name="premium_modal" options={{ presentation: 'modal', animation: 'none', animationDuration: 0 }} />
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
      <Stack.Screen name="trainer_smart_session" />
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
    {appOverlaysEnabled && showFirstLessonSheet && (
      <Modal
        transparent
        visible={firstLessonSheetVisible}
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {
          setShowFirstLessonSheet(false);
          setDeferEnergyOnboardingForPostOnboardingFirstLesson(false);
          emitAppEvent('energy_onboarding_may_show');
        }}
      >
        <View style={styles.firstLessonSheetOverlay}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.firstLessonSheetBackdrop,
              { opacity: firstLessonSheetBackdropOpacity },
            ]}
          />
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => {
              setShowFirstLessonSheet(false);
              setDeferEnergyOnboardingForPostOnboardingFirstLesson(false);
              emitAppEvent('energy_onboarding_may_show');
            }}
          />
          <Animated.View
            style={[
              styles.firstLessonSheetPanel,
              {
                borderColor: firstLessonSheetBorderColor,
                shadowColor: firstLessonSheetCtaShadowColor,
                transform: [{ translateY: firstLessonSheetTranslateY }],
              },
            ]}
          >
            <Image
              source={firstLessonSheetBackground}
              resizeMode="cover"
              style={styles.firstLessonSheetBackgroundImage}
            />
            <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: firstLessonSheetScrim }]} />
            {postOnboardingGoldBridgeVisible && (
              <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFillObject, { opacity: postOnboardingPanelTintOpacity }]}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={POST_ONBOARDING_GOLD_BRIDGE_PANEL}
                  locations={[0, 0.62, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>
            )}
            <View
              style={[
                styles.firstLessonSheetContent,
                { paddingBottom: Math.max(insets.bottom + 18, 46) },
              ]}
            >
              <Text style={[styles.firstLessonSheetTitle, { color: firstLessonSheetTitleColor }]}>
                {lang === 'es' ? '¿Empezamos la primera lección?' : lang === 'uk' ? 'Почнемо перший урок?' : 'Начнём первый урок?'}
              </Text>
              <Text style={[styles.firstLessonSheetSubtitle, { color: firstLessonSheetSubtitleColor }]}>
                {lang === 'es'
                  ? 'La primera lección dura unos 10 minutos. Después ya sabrás 50 frases útiles.'
                  : lang === 'uk'
                  ? 'Перший урок займе ~10 хвилин. Вже після нього ти знатимеш 50 живих фраз.'
                  : 'Первый урок займёт ~10 минут. Уже после него ты будешь знать 50 живых фраз.'}
              </Text>
              <TouchableOpacity
                style={[styles.firstLessonSheetCtaTouchable, { shadowColor: firstLessonSheetCtaShadowColor }]}
                onPress={() => {
                  if (firstLessonStartHandledRef.current) return;
                  firstLessonStartHandledRef.current = true;
                  setShowFirstLessonSheet(false);
                  setDeferEnergyOnboardingForPostOnboardingFirstLesson(true);
                  void markWentToFirstLessonFromAfterOnboardingSheet();
                  // Сначала фиксируем (tabs)/home как корень стека, затем кладём поверх lesson_menu
                  // и lesson1 — чтобы из урока можно было вернуться в меню урока, а из меню — на главную.
                  // Раньше один router.replace('/lesson1') оставлял пустой стек: кнопка «назад» в lesson_menu
                  // не срабатывала, юзер застревал.
                  router.replace('/(tabs)/home' as any);
                  setTimeout(() => {
                    router.push({ pathname: '/lesson_menu', params: { id: 1 } } as any);
                    setTimeout(() => {
                      router.push({ pathname: '/lesson1', params: { id: 1, from: 'lesson_menu' } } as any);
                    }, 30);
                  }, 30);
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={firstLessonSheetCtaGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.firstLessonSheetCta,
                    {
                      borderColor: firstLessonSheetBorderColor,
                    },
                  ]}
                >
                  {postOnboardingGoldBridgeVisible && (
                    <Animated.View
                      pointerEvents="none"
                      style={[StyleSheet.absoluteFillObject, { opacity: postOnboardingCtaTintOpacity }]}
                    >
                      <LinearGradient
                        pointerEvents="none"
                        colors={POST_ONBOARDING_GOLD_BRIDGE_CTA}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                    </Animated.View>
                  )}
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    style={[styles.firstLessonSheetCtaText, { color: firstLessonSheetCtaTextColor }]}
                  >
                    {firstLessonSheetCtaLabel}
                  </Text>
                  {postOnboardingGoldBridgeVisible && (
                    <Animated.Text
                      pointerEvents="none"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.78}
                      style={[
                        styles.firstLessonSheetCtaText,
                        styles.firstLessonSheetCtaTextBridge,
                        {
                          color: POST_ONBOARDING_GOLD_BRIDGE_TEXT,
                          opacity: postOnboardingCtaTintOpacity,
                        },
                      ]}
                    >
                      {firstLessonSheetCtaLabel}
                    </Animated.Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                testID="first-lesson-later"
                style={styles.firstLessonSheetLaterButton}
                onPress={() => {
                  setShowFirstLessonSheet(false);
                  setDeferEnergyOnboardingForPostOnboardingFirstLesson(false);
                  emitAppEvent('energy_onboarding_may_show');
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.firstLessonSheetLaterText, { color: firstLessonSheetLaterColor }]}>
                  {lang === 'es' ? 'Más tarde' : lang === 'uk' ? 'Пізніше' : 'Позже'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    )}

    {ready && effectiveShowOnboarding && (
      <View style={styles.appFullScreenOverlay}>
        <Onboarding
          onDone={handleOnboardingDone}
          onLangSelect={handleLangSelect}
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
  firstLessonSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    backgroundColor: 'transparent',
  },
  firstLessonSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  firstLessonSheetPanel: {
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    backgroundColor: '#111315',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 18,
  },
  firstLessonSheetBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  firstLessonSheetContent: {
    width: '100%',
    paddingHorizontal: 28,
    paddingTop: 44,
    alignItems: 'center',
  },
  firstLessonSheetTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0,
    marginBottom: 12,
  },
  firstLessonSheetSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    letterSpacing: 0,
    marginBottom: 32,
    maxWidth: 360,
  },
  firstLessonSheetCtaTouchable: {
    width: '100%',
    minHeight: 64,
    borderRadius: 18,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  firstLessonSheetCta: {
    width: '100%',
    minHeight: 64,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  firstLessonSheetCtaText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0,
  },
  firstLessonSheetCtaTextBridge: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  firstLessonSheetLaterButton: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstLessonSheetLaterText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0,
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts(APP_FONT_ASSETS);

  if (!fontsLoaded && !fontsError) {
    return null;
  }

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
