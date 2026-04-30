import 'react-native-gesture-handler';
import 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, InteractionManager, Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AchievementProvider, useAchievement } from '../components/AchievementContext';
import AchievementToast from '../components/AchievementToast';
import AnimatedFrame from '../components/AnimatedFrame';
import { EnergyProvider } from '../components/EnergyContext';
import { LangProvider, useLang } from '../components/LangContext';
import { StudyTargetProvider } from '../components/StudyTargetContext';
import LevelBadge from '../components/LevelBadge';
import LevelGiftDualModal from '../components/LevelGiftDualModal';
import LevelGiftModal from '../components/LevelGiftModal';
import Onboarding from '../components/onboarding';
import { PremiumProvider } from '../components/PremiumContext';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import UpdateModal from '../components/UpdateModal';
import GlobalBroadcastModal from '../components/GlobalBroadcastModal';
import NotificationPermissionModal from '../components/NotificationPermissionModal';
import { getAvatarImageByIndex, getBestAvatarForLevel } from '../constants/avatars';
import { getMaxEnergyForLevel } from '../constants/theme';
import type { Lang } from '../constants/i18n';
import { getTitleColor, getTitleForLevel } from '../constants/titles';
import { DEV_MODE, IS_EXPO_GO } from './config';
import { checkAchievements, getPendingNotifications, markAchievementsNotified } from './achievements';
import { ensureAnonUser, restoreFromCloud, syncToCloud } from './cloud_sync';
import { repairLessonUnlocksAfterRestore } from './lesson_lock_system';
import { registerInLeagueGroupSilently } from './firestore_leagues';
import { PlayInstallReferrer } from 'react-native-play-install-referrer';
import { migrateWeekPointsIfNeeded, updateStreakOnActivity } from './hall_of_fame_utils';
import { preloadImages } from './image_preload';
import { prefetchQuizPhrases } from './quiz_phrases_loader';
import {
  checkLeagueOvertakeNotification, getNextWeeklyRecapDateKey, getNotifSettingsSnapshot, hydrateNotifSettingsFromStorage, isNotificationPermissionGranted, requestNotificationPermissionWithFallback, scheduleDailyReminder, scheduleMonthlyRecapNotification, scheduleNotifications, schedulePhrasOfDayNotification, scheduleStreakWarningIfNeeded, scheduleWeeklyRecapNotification, setupNotificationTapHandler,
} from './notifications';
import { initRevenueCat } from './revenuecat_init';
import { prefetchMarketplacePacks } from './flashcards/marketplace';
import { prefetchArenaRatingCache } from './arena_rating_cache';
import { prefetchGlobalLeaderboard, updateMyPremiumInLeaderboard } from './firestore_leaderboard';
import { getVerifiedPremiumStatus } from './premium_guard';
import { tryGrantPremiumMonthlyWagerFromLevelUp } from './streak_wager';
import { incrementSessionCount } from './review_utils';
import { checkForUpdate, UpdateInfo } from './update_check';
import { registerXP, migrateXPFormulaV2 } from './xp_manager';
import { getShardsBalance, loadShardsFromCloud } from './shards_system';
import { MatchmakingProvider } from '../contexts/MatchmakingContext';
import MatchFoundToast from '../components/MatchFoundToast';
import ShardRewardModal, { ShardReward } from '../components/ShardRewardModal';
import ActionToast from '../components/ActionToast';
import GlobalShardsEarnedHost from '../components/GlobalShardsEarnedHost';
import ThemedBlockingAlertHost from '../components/ThemedBlockingAlertHost';
import { getCanonicalUserId } from './user_id_policy';
import { fetchPendingGlobalBroadcastModal, GlobalBroadcastModalPayload } from './global_broadcast_modal';
import { emitAppEvent, onAppEvent } from './events';
import { markWentToFirstLessonFromAfterOnboardingSheet, setDeferEnergyOnboardingForPostOnboardingFirstLesson } from './energyOnboardingGate';
import { useGlobalBottomOverlayOffset } from '../hooks/use-global-bottom-overlay-offset';
import { loadFlashcards } from '../hooks/use-flashcards';
import { primeAllLessonsFromStorageOnAppLaunch } from './lesson_screen_bootstrap';
import { hydrateUserSettingsFromStorage } from './user_settings_store';
import { hydrateHapticsTapFromStorage } from './haptics_tap_preload';
import { OverlayArbiterProvider, useOverlayVisible } from '../components/OverlayArbiter';
import ErrorBoundary from '../components/ErrorBoundary';

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

// RevenueCat API keys must be set via environment variables.
// See revenuecat_init.ts for singleton initialization pattern.

// ── Daily Login Bonus + Comeback Bonus — запускается при каждом старте ────────
const runSessionChecks = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // ── 1. Daily Login Bonus ────────────────────────────────────────────────
    // Храним consecutive login days отдельно от lesson-стрика
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

      // XP по циклу: дни 1-2 = 5, 3-4 = 10, 5-6 = 15, день 7 = 50, потом заново
      const cycle = ((consecutive - 1) % 7) + 1;
      const bonusXP = cycle === 7 ? 50 : cycle >= 5 ? 15 : cycle >= 3 ? 10 : 5;

      const name = await AsyncStorage.getItem('user_name');
      if (name) {
        await registerXP(bonusXP, 'daily_login_bonus', name);
      }

      // Сохранить бонус для отображения на Home
      await AsyncStorage.setItem('login_bonus_pending', JSON.stringify({ xp: bonusXP, cycle }));
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
    const now = new Date();

    // ── 3. Восстановление напоминаний: daily ИЛИ per-day (расписание), не оба
    const notifEnabled = notifEnabledRaw;
    if (notifEnabled === 'true') {
      const notifSnap = getNotifSettingsSnapshot();
      const hasPerDay = Object.values(notifSnap.schedule).some(d => d.enabled);
      if (hasPerDay) {
        scheduleNotifications(notifSnap, lang, 0, { requestPermission: false }).catch(() => {});
      } else {
        const hour = parseInt((await AsyncStorage.getItem('notification_hour')) || '19');
        const minute = parseInt((await AsyncStorage.getItem('notification_minute')) || '0');
        scheduleDailyReminder(hour, minute, lang, { requestPermission: false }).catch(() => {});
      }
    }

    if (notifEnabled === 'true') {
      scheduleStreakWarningIfNeeded(lang, { requestPermission: false }).catch(() => {});
      schedulePhrasOfDayNotification(lang, { requestPermission: false }).catch(() => {});

      const weeklyScheduled = await AsyncStorage.getItem('weekly_recap_scheduled');
      const nextSundayStr = getNextWeeklyRecapDateKey(now);
      if (weeklyScheduled !== nextSundayStr) {
        scheduleWeeklyRecapNotification(lang, { requestPermission: false }).catch(() => {});
      }

      const monthlyScheduled = await AsyncStorage.getItem('monthly_recap_scheduled');
      const firstNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const firstNextMonthStr = firstNextMonth.toISOString().split('T')[0];
      if (monthlyScheduled !== firstNextMonthStr) {
        scheduleMonthlyRecapNotification(lang, { requestPermission: false }).catch(() => {});
      }
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
  const { theme: t, isDark, f } = useTheme();
  const { lang } = useLang();

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  /** Премиум: два сундука (F2P + premium) вместо одного */
  const [levelGiftDualMode, setLevelGiftDualMode] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [userName, setUserName] = useState('');

  const levelUpOpacity    = useRef(new Animated.Value(0)).current;
  const levelUpTranslateY = useRef(new Animated.Value(40)).current;
  const queueRef    = useRef<number[]>([]);
  const isShowingRef = useRef(false);
  /** Сериализация flush: двойной await getItem до removeItem давал дубликаты уровня в queueRef. */
  const flushQueueBusyRef = useRef(false);
  const flushQueueRetryRef = useRef(false);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) { isShowingRef.current = false; return; }
    const lvl = queueRef.current[0];
    setCurrentLevel(lvl);
    setShowLevelUp(true);
    levelUpOpacity.setValue(0);
    levelUpTranslateY.setValue(40);
    Animated.parallel([
      Animated.spring(levelUpOpacity, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.spring(levelUpTranslateY, { toValue: 0, useNativeDriver: true, friction: 6 }),
    ]).start();
  }, [levelUpOpacity, levelUpTranslateY]);

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
    setTimeout(flushQueue, 500);
    const sub = onAppEvent('level_up_pending', flushQueue);
    return () => sub.remove();
  }, [flushQueue]);

  const dismissLevelUp = () => {
    Animated.timing(levelUpOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setShowLevelUp(false);
      void (async () => {
        const name = (await AsyncStorage.getItem('user_name')) || userName;
        const l: Lang = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
        await registerXP(100, 'level_up_bonus', name, l);
        await tryGrantPremiumMonthlyWagerFromLevelUp();
        const prem = await getVerifiedPremiumStatus();
        setLevelGiftDualMode(!!prem);
        setShowGiftModal(true);
      })();
    });
  };

  const onGiftClose = (_claimed: boolean) => {
    setShowGiftModal(false);
    queueRef.current = queueRef.current.slice(1);
    if (queueRef.current.length > 0) {
      queueMicrotask(showNext);
    } else {
      isShowingRef.current = false;
    }
  };

  const newAvatar  = getBestAvatarForLevel(currentLevel);
  const newTitleDef = getTitleForLevel(currentLevel);
  const isNewTitle  = newTitleDef.minLevel === currentLevel;
  const titleColor  = getTitleColor(currentLevel, isDark);
  return (
    <>
      {/* Level-up congratulation — wrapped in Modal so it renders above ALL screens */}
      <Modal
        transparent
        visible={showLevelUp}
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Animated.View style={{
            transform: [
              { translateY: levelUpTranslateY },
              { scale: levelUpOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
            ],
            opacity: levelUpOpacity,
            borderRadius: 28,
            width: '100%', maxWidth: 360,
            shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, elevation: 20,
            overflow: 'hidden',
          }}>
            <LinearGradient colors={t.cardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{
              borderRadius: 28, padding: 28,
              alignItems: 'center',
              borderWidth: 1, borderColor: t.textSecond + '44',
            }}>
              <LevelBadge level={currentLevel} size={100} />
              <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '900', textAlign: 'center', marginTop: 10 }}>
                {lang === 'uk' ? `РІВЕНЬ ${currentLevel}!` : lang === 'es' ? `¡NIVEL ${currentLevel}!` : `УРОВЕНЬ ${currentLevel}!`}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.bodyLg, fontWeight: '500', marginTop: 6, textAlign: 'center' }}>
                {(() => {
                  const pool = lang === 'uk' ? LEVELUP_CONGRATS_UK : lang === 'es' ? LEVELUP_CONGRATS_ES : LEVELUP_CONGRATS_RU;
                  return pool[currentLevel % pool.length];
                })()}
              </Text>

              <View style={{ marginTop: 16, alignItems: 'center', gap: 4 }}>
                <AnimatedFrame
                  image={/^\d+$/.test(newAvatar) ? getAvatarImageByIndex(parseInt(newAvatar)) : undefined}
                  emoji={newAvatar}
                  frameId="none"
                  size={60}
                />
              </View>


              {isNewTitle && (
                <View style={{ marginTop: 10, backgroundColor: t.bgSurface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', gap: 2, width: '100%', borderWidth: 1, borderColor: titleColor + '55' }}>
                  <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                    {lang === 'uk' ? '🎖️ Новий титул' : lang === 'es' ? '🎖️ Nuevo título' : '🎖️ Новый титул'}
                  </Text>
                  <Text style={{ color: titleColor, fontSize: f.bodyLg, fontWeight: '800', marginTop: 2 }}>
                    {newTitleDef.titleEN}
                  </Text>
                </View>
              )}

              <View style={{ backgroundColor: t.bgSurface, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, marginTop: 10 }}>
                <Text style={{ color: t.gold, fontWeight: '800', fontSize: f.caption }}>
                  {lang === 'uk'
                    ? `+100 XP — бонус за ${currentLevel} рівень`
                    : lang === 'es'
                      ? `+100 XP — bonificación por el nivel ${currentLevel}`
                      : `+100 XP — бонус за ${currentLevel} уровень`}
                </Text>
              </View>

              {[10, 20, 30, 40, 50].includes(currentLevel) && (
                <View style={{ backgroundColor: '#1A3A2A', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, marginTop: 10, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#34D399' }}>
                  <Text style={{ color: '#34D399', fontWeight: '800', fontSize: f.body }}>
                    {lang === 'uk'
                      ? `⚡ Тепер у тебе ${getMaxEnergyForLevel(currentLevel)} енергії на день!`
                      : lang === 'es'
                        ? `⚡ ¡Tu energía diaria máxima es ${getMaxEnergyForLevel(currentLevel)}!`
                        : `⚡ Теперь у тебя ${getMaxEnergyForLevel(currentLevel)} энергии в день!`}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={dismissLevelUp}
                style={{ marginTop: 20, backgroundColor: t.accent, borderRadius: 16, paddingHorizontal: 40, paddingVertical: 12 }}
              >
                <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.bodyLg }}>
                  {(() => {
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
          visible={showGiftModal}
          level={currentLevel}
          userName={userName}
          lang={lang}
          onClose={onGiftClose}
        />
      ) : (
        <LevelGiftModal
          visible={showGiftModal}
          level={currentLevel}
          userName={userName}
          lang={lang}
          onClose={onGiftClose}
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
  const [isBanned, setIsBanned]     = useState(false);
  const [showOnboarding, setShow]   = useState(false);
  const [showFirstLessonSheet, setShowFirstLessonSheet] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  /** Скрываем RN Modal до ухода в стор — на Android иначе зависания System UI при возврате. */
  const [updateModalHiddenForStore, setUpdateModalHiddenForStore] = useState(false);
  const awaitingStoreReturnRef = useRef(false);

  useEffect(() => {
    if (!updateInfo) {
      setUpdateModalHiddenForStore(false);
      awaitingStoreReturnRef.current = false;
    }
  }, [updateInfo]);
  const [shardRewards, setShardRewards] = useState<ShardReward[]>([]);
  const [globalBroadcastModal, setGlobalBroadcastModal] = useState<GlobalBroadcastModalPayload | null>(null);
  const [notifNudgeVisible, setNotifNudgeVisible] = useState(false);
  const [notifNudgeMissedDays, setNotifNudgeMissedDays] = useState(0);
  const { setLang, lang } = useLang();
  const { showAchievement } = useAchievement();
  const { theme: tTheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const globalBottomOverlay = useGlobalBottomOverlayOffset();

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

  // Непросмотренные награды осколков (багфикс / принятая идея) — старт и при возврате из фона
  const lastShardRewardPullRef = useRef(0);
  const shardRewardCheckInFlightRef = useRef(false);
  const checkShardRewardsFn = useCallback(async () => {
    if (IS_EXPO_GO) return;
    if (shardRewardCheckInFlightRef.current) return;
    const now = Date.now();
    if (lastShardRewardPullRef.current !== 0 && now - lastShardRewardPullRef.current < 45_000) return;
    lastShardRewardPullRef.current = now;
    shardRewardCheckInFlightRef.current = true;
    try {
      const firestoreModule = await import('@react-native-firebase/firestore');
      const db = firestoreModule.default();
      const uid = await getCanonicalUserId();
      if (!uid) return;
      const snap = await db
        .collection('users')
        .doc(uid)
        .collection('shard_rewards')
        .where('seen', '==', false)
        .get();
      if (snap.empty) return;
      const rewards: ShardReward[] = snap.docs.map((d: any) => {
        const data = d.data();
        const rawReason = data.reason;
        const reason: ShardReward['reason'] =
          rawReason === 'suggestion_accepted' ? 'suggestion_accepted'
          : rawReason === 'admin_grant' ? 'admin_grant'
          : 'bug_fixed';
        // adminGrantReward CF (functions/src/admin_grant.ts) пишет:
        //   amount   — реальные шарды (0 для xp_boost/chain_shield/arena_extra)
        //   rewardType — 'shards' | 'xp_boost_2x_24h' | 'chain_shield_1' | …
        //   label    — человекочитаемая подпись для модалки
        // Старые записи (markFixed / suggestion_accepted) шлют count, не amount.
        const count = Number(data.amount ?? data.count ?? 0);
        return {
          id: d.id,
          dataId: data.dataId ?? '',
          dataText: data.dataText ?? data.comment ?? '',
          count,
          reason,
          rewardType: typeof data.rewardType === 'string' ? data.rewardType : undefined,
          label: typeof data.label === 'string' ? data.label : undefined,
        };
      });
      await Promise.all(snap.docs.map((d: any) => d.ref.update({ seen: true })));
      // Админка уже начислила осколки: users.shards += count (markFixed / accept idea).
      // addShardsRaw здесь давал удвоение (30→60) и вторую модалку через shards_earned.
      await loadShardsFromCloud();
      setShardRewards(rewards);
    } catch { /* */ }
    finally {
      shardRewardCheckInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { void checkShardRewardsFn(); }, 800);
    return () => clearTimeout(t);
  }, [checkShardRewardsFn]);

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
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        syncToCloud({ forceNow: true }).catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  // Обработчик тапа по уведомлению — deep link в нужный экран
  useEffect(() => {
    migrateXPFormulaV2();
  }, []);

  useEffect(() => {
    void loadFlashcards();
    void (async () => {
      try {
        const last = await AsyncStorage.getItem('last_opened_lesson');
        const id = parseInt(last || '1', 10) || 1;
        if (id >= 1) {
          const m = await import('./lesson_menu');
          await m.prefetchLessonMenuCache(id);
        }
        const tab = await import('./lessons_tab_state');
        await tab.loadLessonsTabStateFromStorage();
      } catch { /* */ }
    })();
  }, []);

  useEffect(() => {
    const unsub = setupNotificationTapHandler(router);
    return unsub;
  }, [router]);

  // Ref всегда указывает на актуальный showAchievement — не зависит от closure в useEffect([], []).
  const showAchievementRef = useRef(showAchievement);
  useEffect(() => { showAchievementRef.current = showAchievement; }, [showAchievement]);

  // Проверяем pending-ачивки и показываем тосты.
  // Вызывается сразу при старте и по событию 'achievement_unlocked' (DeviceEventEmitter).
  // Polling убран — он блокировал JS-поток каждые 4с во время навигационных переходов.
  const flushPending = useCallback(async () => {
    const pending = await getPendingNotifications();
    if (pending && pending.length > 0) {
      // Пометить как notified ДО показа, чтобы повторный вызов не задублировал
      await markAchievementsNotified(pending.map(a => a.id));
      pending.forEach(a => showAchievementRef.current(a));
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
    // Страховка: UI не дольше 4s даже при сбое bootstrap (раньше 10s из-за await RC)
    const safetyTimer = setTimeout(() => setReady(true), 2800);

    // Гидратация облака запускается рано (в bootstrap) и используется здесь,
    // чтобы остальной runHeavyInit ждал её завершения, а не дублировал.
    let cloudHydratePromise: Promise<void> | null = null;

    const runHeavyInit = () => {
      if (!IS_EXPO_GO) {
        import('@react-native-firebase/crashlytics')
          .then(m => m.default().setCrashlyticsCollectionEnabled(true))
          .catch(() => {});
        void import('./app_check_init')
          .then((m) => m.initFirebaseAppCheckIfAvailable())
          .catch(() => {});
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
        try { emitAppEvent('cloud_profile_hydrated'); } catch {}
        // Одноразовая починка после релиза, в котором (tabs)/index.tsx
        // перестал уважать persistedUnlocked: подтягиваем lesson{N-1}_best_score
        // до 2.5 для уроков, которые в облаке уже значатся как открытые.
        // См. repairLessonUnlocksAfterRestore() и lesson_unlock_repair_v1 флаг.
        repairLessonUnlocksAfterRestore().catch(() => {});
        await loadShardsFromCloud().catch(() => {});
        prefetchGlobalLeaderboard();
        prefetchArenaRatingCache();
        const freshShards = await AsyncStorage.getItem('shards_balance');
        const parsedShards = Number(freshShards);
        if (Number.isFinite(parsedShards) && parsedShards >= 0) {
          emitAppEvent('shards_balance_updated', { balance: Math.floor(parsedShards) });
        }
        syncToCloud().catch(() => {});
        registerInLeagueGroupSilently().catch(() => {});
        getVerifiedPremiumStatus().then(isPrem => {
          emitAppEvent(isPrem ? 'premium_activated' : 'premium_deactivated');
          updateMyPremiumInLeaderboard(isPrem);
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

      migrateWeekPointsIfNeeded().catch(() => {});
      updateStreakOnActivity().catch(() => {});
      runSessionChecks();
      incrementSessionCount().catch(() => {});
      preloadImages().catch(() => {});
      InteractionManager.runAfterInteractions(() => {
        prefetchQuizPhrases();
        import('./flashcards_collection')
          .then((m) => m.primeFlashcardsCollectionCache())
          .catch(() => {});
      });
      checkForUpdate().then(u => { if (u) setUpdateInfo(u); }).catch(() => {});
    };

    const bootstrap = async () => {
      // RevenueCat + offerings магазина осколков — как можно раньше (раньше было только после setReady в runHeavyInit).
      if (!IS_EXPO_GO) void initRevenueCat();
      // Прогрев списка наборов магазина (Firestore card_packs) — к моменту открытия магазина/хаба
      // список уже в session memory, без сетевого ожидания и мигания.
      void prefetchMarketplacePacks().catch(() => {});

      // ВАЖНО: запускаем гидратацию из облака как можно раньше (параллельно
      // локальной подготовке), и потом подождём её ниже с таймаутом 2.5с
      // ДО чтения 'onboarding_done'. Иначе на холодном старте после очистки
      // AsyncStorage юзеру повторно показывается онбординг — а параллельно
      // авто-имя (Psi5552 и т.п.) затирает реальный ник в облаке.
      if (!IS_EXPO_GO) {
        cloudHydratePromise = (async () => {
          try {
            await ensureAnonUser();
            await restoreFromCloud();
          } catch {}
        })();
      }

      // Всё, что нужно для первого кадра /lesson1 без лоадера: shuffle + cell + progress (локальный кэш).
      await primeAllLessonsFromStorageOnAppLaunch().catch(() => {});
      // Синхронные снимки тумблеров (настройки обучения, тактильный отклик, расписание пушей) — до setReady
      await Promise.all([
        hydrateUserSettingsFromStorage().catch(() => {}),
        hydrateHapticsTapFromStorage().catch(() => {}),
        hydrateNotifSettingsFromStorage().catch(() => {}),
      ]);
      // Сразу читаем осколки в фоне — к моменту «Главной» peekLastKnownShardsBalance уже с кэшем.
      void getShardsBalance().catch(() => {});

      // Ждём облачную гидратацию, но не дольше 2.5с — чтобы не блокировать UI при плохой сети.
      // На быстром интернете restoreFromCloud отрабатывает <500мс и онбординг
      // больше не покажется, если в облаке onboarding_done='1'.
      if (cloudHydratePromise) {
        await Promise.race([
          cloudHydratePromise,
          new Promise<void>((resolve) => setTimeout(resolve, 2500)),
        ]);
      }

      try {
        const prevXPRaw = await AsyncStorage.getItem('user_prev_xp');
        if (!prevXPRaw) {
          const totalXPRaw = await AsyncStorage.getItem('user_total_xp');
          if (totalXPRaw) {
            await AsyncStorage.setItem('user_prev_xp', totalXPRaw);
          }
        }

        const val = await AsyncStorage.getItem('onboarding_done');

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

        if (!handledByReferrer) {
          setShow(!val);
        }
      } catch {}

      clearTimeout(safetyTimer);
      setReady(true);
      setTimeout(flushPending, 280);
      runHeavyInit();
    };

    bootstrap();

    // Event-driven flush: слушаем событие от achievements.ts вместо polling каждые 4с.
    // Это убирает блокировку JS-потока во время навигационных переходов на слабых устройствах.
    const sub = onAppEvent('achievement_unlocked', () => {
      setTimeout(flushPending, 200);
    });
    const subDelete = onAppEvent('account_deleted', () => {
      setShow(true);
    });
    return () => { sub.remove(); subDelete.remove(); };
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
    await AsyncStorage.setItem('xp_migration_v2', '1');
    setShow(false);
    // Не показываем тутор энергии на «Главной» одновременно с этим листом (ждём «Позже» или возврат с урока)
    setDeferEnergyOnboardingForPostOnboardingFirstLesson(true);
    // Небольшая задержка чтобы анимация закрытия онбординга успела завершиться
    setTimeout(() => setShowFirstLessonSheet(true), 400);
  }, []);

  // После закрытия онбординга и монтирования Stack — переходим на нужный экран
  useEffect(() => {
    if (!showOnboarding && pendingRoute) {
      const t = setTimeout(() => {
        router.replace(pendingRoute as any);
        setPendingRoute(null);
      }, 50);
      return () => clearTimeout(t);
    }
  }, [pendingRoute, router, showOnboarding]);


  // Обработка входящих deeplink-ов (аренаные приглашения)
  useEffect(() => {
    const handleUrl = (url: string) => {
      // https://badloar-star.github.io/phraseman/arena/ROOMID
      // или phraseman://arena/ROOMID
      if (/^phraseman:\/\/\/?$/i.test(url.trim())) {
        router.replace('/home' as any);
        return;
      }
      const match = url.match(/\/duel\/([A-Z0-9]+)/i);
      if (match) {
        const roomId = match[1];
        router.push({ pathname: '/arena_join' as any, params: { roomId } });
      }
    };
    Linking.getInitialURL().then(url => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [router]);

  // ── Очередь модалок: ровно одна показывается за раз ─────────────────────
  // Приоритет: update > broadcast > shardReward > notifNudge (бонус за волну релиза отключён).
  // ВАЖНО: эти хуки должны вызываться до любых условных return ниже.
  const updateModalVisible = useOverlayVisible('update', !!updateInfo && !updateModalHiddenForStore);
  const broadcastModalVisible = useOverlayVisible('broadcast', !!globalBroadcastModal);
  const shardRewardModalVisible = useOverlayVisible('shardReward', shardRewards.length > 0);
  const notifNudgeModalVisible = useOverlayVisible('notifNudge', notifNudgeVisible);

  if (!ready) return <View style={{ flex:1, backgroundColor:'#06141B' }} />;

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

  if (showOnboarding) {
    return <Onboarding onDone={handleOnboardingDone} onLangSelect={handleLangSelect} />;
  }

  return (
    <>
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tTheme.bgPrimary },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="lesson1" />
      <Stack.Screen name="lesson_menu" />
      <Stack.Screen name="lesson_words" />
      <Stack.Screen name="lesson_irregular_verbs" />
      <Stack.Screen name="lesson_complete" />


      <Stack.Screen name="help_faq" />
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
      {(__DEV__ || DEV_MODE) && <Stack.Screen name="audio_debug" />}
      <Stack.Screen name="exam" />
      <Stack.Screen name="dialogs" />
      <Stack.Screen name="dialog_vocab" />
      <Stack.Screen name="daily_tasks_screen" />
      <Stack.Screen name="premium_modal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="avatar_select" />
      <Stack.Screen name="flashcards" />
      <Stack.Screen name="flashcards_collection" />
      <Stack.Screen name="community_pack_create" />
      <Stack.Screen name="pack_opening" options={{ presentation: 'modal', animation: 'fade' }} />
      <Stack.Screen name="achievements_screen" />
      <Stack.Screen name="level_exam" />
      <Stack.Screen name="review" />
      {(__DEV__ || DEV_MODE) && <Stack.Screen name="admin_review_test" />}
      {(__DEV__ || DEV_MODE) && <Stack.Screen name="settings_testers" />}
      <Stack.Screen name="progress_map" />
      <Stack.Screen name="hall_of_fame_screen" />
      <Stack.Screen name="beta_testers" />
      <Stack.Screen name="privacy_screen" />
      <Stack.Screen name="terms_screen" />
      <Stack.Screen name="suggestion_screen" />
      <Stack.Screen name="arena_game" options={{ animation: 'none' }} />
      <Stack.Screen name="arena_lobby" options={{ animation: 'none' }} />
      <Stack.Screen name="arena_results" />
      <Stack.Screen name="arena_join" />
      <Stack.Screen name="arena_rating" />
      <Stack.Screen name="arena_leaderboard" />
      <Stack.Screen name="web_screen" />
      <Stack.Screen name="quizzes_screen" options={{ headerShown: false }} />
    </Stack>

    {/* Модалка награды осколком за исправленный баг */}
    <ShardRewardModal
      visible={shardRewardModalVisible}
      rewards={shardRewards}
      onClose={() => setShardRewards([])}
    />

    <NotificationPermissionModal
      visible={notifNudgeModalVisible}
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
          : ['Напоминания в нужное время', 'Поддержка стрика и прогресса', 'Отключается в любой момент']
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
          await scheduleNotifications(snap, lang, 0);
          return;
        }
        const hour = parseInt((await AsyncStorage.getItem('notification_hour')) || '19', 10);
        const minute = parseInt((await AsyncStorage.getItem('notification_minute')) || '0', 10);
        await scheduleDailyReminder(hour, minute, lang);
      }}
    />

    {/* Модальник обновления — поверх всего приложения */}
    {updateInfo && (
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

    <GlobalBroadcastModal
      visible={broadcastModalVisible}
      payload={globalBroadcastModal}
      onClose={() => setGlobalBroadcastModal(null)}
    />

    {/* Bottomsheet первого урока после онбординга */}
    {showFirstLessonSheet && (
      <Modal
        transparent
        visible={showFirstLessonSheet}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          setShowFirstLessonSheet(false);
          setDeferEnergyOnboardingForPostOnboardingFirstLesson(false);
          emitAppEvent('energy_onboarding_may_show');
        }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => {
              setShowFirstLessonSheet(false);
              setDeferEnergyOnboardingForPostOnboardingFirstLesson(false);
              emitAppEvent('energy_onboarding_may_show');
            }}
          />
          <View style={{
            backgroundColor: '#141414',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 28, paddingBottom: Math.max(insets.bottom + 16, 44),
            borderTopWidth: 1, borderColor: 'rgba(200,255,0,0.15)',
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🚀</Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
              {lang === 'es' ? '¿Empezamos la primera lección?' : lang === 'uk' ? 'Почнемо перший урок?' : 'Начнём первый урок?'}
            </Text>
            <Text style={{ color: '#A8A8A8', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
              {lang === 'es'
                ? 'La primera lección dura unos 10 minutos. Después ya sabrás 50 frases útiles.'
                : lang === 'uk'
                ? 'Перший урок займе ~10 хвилин. Вже після нього ти знатимеш 50 живих фраз.'
                : 'Первый урок займёт ~10 минут. Уже после него ты будешь знать 50 живых фраз.'}
            </Text>
            <TouchableOpacity
              style={{ width: '100%', backgroundColor: '#C8FF00', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 }}
              onPress={() => {
                setShowFirstLessonSheet(false);
                setDeferEnergyOnboardingForPostOnboardingFirstLesson(true);
                void markWentToFirstLessonFromAfterOnboardingSheet();
                router.replace({ pathname: '/lesson1', params: { id: 1 } } as any);
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#1A2400', fontSize: 18, fontWeight: '700' }}>
                {lang === 'es' ? '¡Vamos! 🔥' : lang === 'uk' ? 'Так, поїхали! 🔥' : 'Да, поехали! 🔥'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingVertical: 14, paddingHorizontal: 40, marginBottom: 8 }}
              onPress={() => {
                setShowFirstLessonSheet(false);
                setDeferEnergyOnboardingForPostOnboardingFirstLesson(false);
                emitAppEvent('energy_onboarding_may_show');
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#888', fontSize: 15, fontWeight: '500' }}>
                {lang === 'es' ? 'Más tarde' : lang === 'uk' ? 'Пізніше' : 'Позже'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    )}

    </>
  );
}

export default function RootLayout() {
  return (
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
                    <ActionToast />
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
  );
}
