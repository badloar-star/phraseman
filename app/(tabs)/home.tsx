import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabSwipeLock } from '../tabSwipeLock';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Dimensions, Modal, AppState, DeviceEventEmitter, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { useRouter } from 'expo-router';
import { usePremium } from '../../components/PremiumContext';
import { useTabNav } from '../TabContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import ScreenGradient from '../../components/ScreenGradient';
import { checkLeagueOnAppOpen, clearPendingResult, loadPendingResult, LEAGUES, LeagueResult } from '../league_engine';
import LeagueResultModal from '../LeagueResultModal';
import { DebugLogger } from '../debug-logger';
import { getMyWeekPoints, checkStreakLossPending, getWeekKey } from '../hall_of_fame_utils';
import { isRepairEligible, getRepairProgress } from '../streak_repair';
import { getReviveOffer, type StreakReviveOffer } from '../streak_revive';
import { enqueueThemedBlockingInfoAlert } from '../themed_blocking_alert_queue';
import StreakReviveModal from '../../components/StreakReviveModal';
import {
  consumeCelebration,
  isCelebrationPending,
} from '../premium_celebration_state';
import PremiumCelebrationModal from '../../components/PremiumCelebrationModal';
import { countClaimedForTaskList, getTodayTasksSafe, loadTodayProgress, TaskProgress } from '../daily_tasks';
import { getXPProgress, getLevelFromXP, getNextEnergyUnlockLevel } from '../../constants/theme';
import { getTitleString } from '../../constants/titles';
import { lessonNamesForLang } from '../../constants/lessons';
import { GREETINGS_ES } from '../../constants/greetings_es';
import { triLang, type Lang } from '../../constants/i18n';
import { BRAND_SHARDS_ES } from '../../constants/terms_es';
import PremiumCard from '../../components/PremiumCard';
import { hapticTap } from '../../hooks/use-haptics';
import CircularProgress from '../../components/CircularProgress';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../../constants/avatars';
import AvatarView from '../../components/AvatarView';
import { isCustomAvatarValue } from '../../constants/custom_avatars';
import EnergyIcon from '../../components/EnergyIcon';
import { loadAllMedals, countMedals } from '../medal_utils';
import { getTrainerTotalDue } from '../trainer_store';
import { getCurrentMultiplier } from '../xp_manager';
import DailyPhraseCard from '../../components/DailyPhraseCard';
import ReportErrorButton from '../../components/ReportErrorButton';
import SaveProgressBanner from '../../components/SaveProgressBanner';
import PremiumGoldUserName from '../../components/PremiumGoldUserName';
import { useEnergy } from '../../components/EnergyContext';
import { computeAllPercentiles } from '../leaderboard_stats';
import { getShardsBalance, peekLastKnownShardsBalance, spendShards, onStreakUpdated } from '../shards_system';
import { buildLastLessonFromHydration, peekHomeScreenHydration, rememberHomeScreenHydration } from '../home_screen_hydration';
import ShardsEarnedModal from '../../components/ShardsEarnedModal';
import { getForegroundUsageMs } from '../foreground_usage_ms';
import { logFeatureOpened } from '../firebase';
import { trackFeatureOpened } from '../user_stats';
import { perfMark, perfScreenMount, perfNavStart } from '../perf-monitor';
import {
  getDeferEnergyOnboardingForPostOnboardingFirstLesson,
  tryClearAfterOnboardingFirstLessonReturn,
} from '../energyOnboardingGate';
import { emitAppEvent, onAppEvent } from '../events';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
/** Ширина всплывающей подсказки энергии (clamp по экрану, стрелка привязана к иконкам). */
const ENERGY_TOOLTIP_W = 220;
const CONTENT_W = Math.min(SCREEN_W, 640);
const CARD_W = (CONTENT_W - 32 - 10) / 2;

/** Сесійний прапор: після першого успішного loadData дочірні mounts не показують «рівень 1» кадр. */
let homeStatsLoadedOnce = false;

const GREETINGS_RU = [
  'Твой лингвистический дзен','Время покорять вершины','Зарядись знаниями','Твой мозг скажет «спасибо»',
  'Готов к новым инсайтам?','Мир ждет твоего слова','На шаг ближе к цели','Твой интеллект в тонусе',
  'Вдохновение начинается здесь','Стань лучшей версией себя','Твой путь к мастерству','Время открывать горизонты',
  'Заставь мысли летать','Твой пропуск в мир','Прокачай свой потенциал','Сегодня — лучший день для старта',
  'Будь на волне прогресса','Энергия твоего разума','Сделай шаг к успеху','Твое будущее начинается сейчас',
  'Твой интеллектуальный апгрейд','Время расширять границы','Зарядись на успех','Твой мозг в отличной форме',
  'Готов к новым свершениям?','Мир заговорит с тобой','На шаг впереди всех','Твоя ежедневная порция знаний',
  'Вдохновение в каждом слове','Стань мастером своего дела','Твой персональный прорыв','Время блистать знаниями',
  'Заряди разум на максимум','Твой мозг жаждет открытий','Готов удивить весь мир?','Мир открыт для тебя',
  'На шаг ближе к мечте','Твой интеллект вне границ','Вдохновение в каждом шаге','Стань легендой сегодня',
  'Твой интеллектуальный драйв','Время менять реальность','Зарядись на победу','Твой мозг в центре событий',
  'Готов к новым высотам?','Мир понимает тебя','На шаг впереди вчерашнего','Твой безграничный потенциал',
  'Вдохновение внутри тебя','Стань лучшим в своем деле','Твой интеллектуальный триумф','Время ярких открытий',
  'Зарядись на результат','Твой разум — твоя сила','Готов к новому вызову?','Мир слышит тебя',
  'На шаг ближе к идеалу','Твой путь к совершенству','Вдохновение в деталях','Стань тем, кем мечтал',
  'Твой интеллектуальный кураж','Время мыслить шире','Зарядись на максимум','Твой разум — твой капитал',
  'Готов к новым интригам?','Мир заиграет красками','На шаг ближе к мечте','Твой путь к свободе',
  'Вдохновение в прогрессе','Стань душой компании',
];
const GREETINGS_UK = [
  'Твій лінгвістичний дзен','Час покорювати вершини','Зарядись знаннями','Твій мозок скаже «спасибі»',
  'Готовий до нових інсайтів?','Світ чекає твого слова','На крок ближче до цілі','Твій інтелект в тонусі',
  'Натхнення починається тут','Стань кращою версією себе','Твій шлях до майстерства','Час відкривати горизонти',
  'Змусь думки літати','Твій пропуск у світ','Прокачай свій потенціал','Сьогодні — найкращий день для старту',
  'Будь на хвилі прогресу','Енергія твого розуму','Зробити крок до успіху','Твоє майбутнє починається зараз',
  'Твій інтелектуальний апгрейд','Час розширювати границі','Зарядись на успіх','Твій мозок у відмінній формі',
  'Готовий до нових звершень?','Світ заговорить з тобою','На крок попереду всіх','Твоя щоденна порція знань',
  'Натхнення в кожному слові','Стань майстром своєї справи','Твій персональний прорив','Час блискучати знаннями',
  'Зарядь розум на максимум','Твій мозок жадає відкриттів','Готовий здивувати весь світ?','Світ відкритий для тебе',
  'На крок ближче до мрії','Твій інтелект без меж','Натхнення в кожному кроці','Стань легендою сьогодні',
  'Твій інтелектуальний драйв','Час змінювати реальність','Зарядись на перемогу','Твій мозок в центрі подій',
  'Готовий до нових висот?','Світ розуміє тебе','На крок попереду вчорашнього','Твій безмежний потенціал',
  'Натхнення всередині тебе','Стань кращим у своїй справі','Твій інтелектуальний триумф','Час яскравих відкриттів',
  'Зарядись на результат','Твій розум — твоя сила','Готовий до нового виклику?','Світ чує тебе',
  'На крок ближче до ідеалу','Твій шлях до досконалості','Натхнення в деталях','Стань тим, кім мріяв',
  'Твій інтелектуальний кураж','Час думати ширше','Зарядись на максимум','Твій розум — твій капітал',
  'Готовий до нових інтриг?','Світ заграє барвами','На крок ближче до мрії','Твій шлях до свободи',
  'Натхнення в прогресі','Стань душею компанії',
];

const HOME_DAILY_GREETING_KEY = 'home_daily_greeting_v1';
const STATS_PULSE_HINT_DONE_KEY = 'phraseman_home_stats_pulse_hint_done_v1';
const STATS_PULSE_MIN_USAGE_MS = 3 * 60 * 60 * 1000;

function localCalendarDay(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type DailyGreetingStored = { day: string; lang: Lang; idx: number };

type EnergyTooltipAnchor = { x: number; y: number; w: number; h: number };

/** Одна случайная фраза на календарный день для данного языка (без мигания при каждом loadData). */
async function resolveDailyGreeting(pool: readonly string[], lang: Lang): Promise<string> {
  if (pool.length === 0) return '';
  const today = localCalendarDay();
  try {
    const raw = await AsyncStorage.getItem(HOME_DAILY_GREETING_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DailyGreetingStored>;
      if (parsed.day === today && parsed.lang === lang && typeof parsed.idx === 'number') {
        return pool[parsed.idx % pool.length]!;
      }
    }
  } catch {}
  const idx = Math.floor(Math.random() * pool.length);
  try {
    await AsyncStorage.setItem(
      HOME_DAILY_GREETING_KEY,
      JSON.stringify({ day: today, lang, idx } satisfies DailyGreetingStored),
    );
  } catch {}
  return pool[idx]!;
}

/** Тема «Скетч» (minimalLight): лёгкое смягчение теней grafit без «заблокированного» вида (сильная альфа = плоский серый). */
const SKETCH_MENU_ICON_LIGHTEN_OVERLAY = 'rgba(255, 252, 247, 0.2)';

type LightSketchMenuImageProps = Omit<React.ComponentProps<typeof Image>, 'style'> & {
  width: number;
  height: number;
  lighten: boolean;
};

function LightSketchMenuImage({ width, height, lighten, ...props }: LightSketchMenuImageProps) {
  const style = { width, height };
  if (!lighten) {
    return <Image {...props} style={style} />;
  }
  return (
    <View style={style}>
      <Image {...props} style={style} />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: SKETCH_MENU_ICON_LIGHTEN_OVERLAY }]}
      />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { theme: t, isDark, f, themeMode } = useTheme();
  const { s, lang } = useLang();
  const insets = useSafeAreaInsets();
  const { goToTab, activeIdx, focusTick } = useTabNav();
  const hh = homeStatsLoadedOnce ? peekHomeScreenHydration() : null;

  const [userName, setUserName]     = useState(() => hh?.userName ?? '');
  const [streak, setStreak]         = useState(() => hh?.streak ?? 0);
  const [displayStreak, setDisplayStreak] = useState(() => hh?.displayStreak ?? hh?.streak ?? 0);
  const streakScaleAnim = useRef(new Animated.Value(1)).current;
  const [totalXP, setTotalXP]       = useState(() => hh?.totalXP ?? 0);
  const [homeStatsReady, setHomeStatsReady] = useState(() => !!(homeStatsLoadedOnce && hh));
  const level = getLevelFromXP(totalXP);
  const [weekDone, setWeekDone]     = useState<boolean[]>(() => {
    const w = hh?.weekDone;
    return w && w.length === 7 ? [...w] : new Array(7).fill(false);
  });
  const [weekPoints, setWeekPoints] = useState(() => hh?.weekPoints ?? 0);
  const [lastLesson, setLastLesson] = useState<{id:number;name:string;progress:number;score:string}|null>(() => buildLastLessonFromHydration(lang) ?? null);
  // Початкове значення підбираємо за поточною мовою інтерфейсу,
  // щоб юзер з UK не бачив миготливе російське «Привет,» до завантаження `loadData`.
  const [greeting, setGreeting]     = useState(() => triLang(lang, { ru: 'Привет,', uk: 'Привіт,', es: 'Hola,' }));
  const [taskProgress, setTaskProgress] = useState<TaskProgress[]>([]);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  /** Сколько сегментов на плитке «Задания» — как на экране заданий (тот же getTodayTasksSafe). */
  const [dailyTaskBarCount, setDailyTaskBarCount] = useState(3);
  const [engineLeague, setEngineLeague] = useState<typeof LEAGUES[0] | null>(null);
  const { isPremium } = usePremium();
  // [SRS] Количество фраз, готовых к повторению сегодня.
  // Временно: только __DEV__ (в стор-сборках карточка скрыта, запрос не делаем).
  // >0 = карточка над «Тест/Экзамен», ведёт на /trainer.
  const [dueCount, setDueCount] = useState(0);
  const [userAvatar, setUserAvatar] = useState(() => hh?.userAvatar ?? '🐣');
  const [userFrame, setUserFrame]   = useState(() => hh?.userFrame ?? 'plain');
  // Бонусные баннеры
  const [loginBonus, setLoginBonus]     = useState<{ xp: number; cycle: number } | null>(null);
  const [showComebackBanner, setComebackBanner] = useState(false);
  const [showRepairCard, setShowRepairCard] = useState(false);
  const [repairProgress, setRepairProgress] = useState(0);
  const [freezeActive, setFreezeActive] = useState(() => hh?.freezeActive ?? false);
  const [streakAtRisk, setStreakAtRisk] = useState(false);
  const [reviveOffer, setReviveOffer] = useState<StreakReviveOffer | null>(null);
  const [reviveModalVisible, setReviveModalVisible] = useState(false);
  // Premium celebration: после IAP-покупки или admin-grant с timestamp новее last seen.
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [premiumFreezeUsed, setPremiumFreezeUsed] = useState(() => hh?.premiumFreezeUsed ?? false);
  const [pageScrollEnabled, setPageScrollEnabled] = useState(true);
  const [medalCounts, setMedalCounts] = useState({ bronze: 0, silver: 0, gold: 0 });
  const [totalXPMulti, setTotalXPMulti] = useState(() => hh?.totalXPMulti ?? 1);
  const { energy: energyCount, bonusEnergy: energyBonus, maxEnergy: energyMax, formattedTime: timeUntilNextEnergy, isUnlimited: energyUnlimited } = useEnergy();
  const BONUS_ENERGY_COLOR = '#FFD700';
  const PREMIUM_BLUE = '#4FC3F7';
  const isLightTheme = themeMode === 'ocean' || themeMode === 'sakura';
  const premiumEnergyTint = energyUnlimited ? (isLightTheme ? '#004F8C' : PREMIUM_BLUE) : undefined;
  const energyFilledTint = premiumEnergyTint;
  const energyFilledColor = energyUnlimited ? (isLightTheme ? '#004F8C' : PREMIUM_BLUE) : t.gold;
  /** Последний валидный measureInWindow — если очередное измерение вернёт 0 (Android/Fabric). */
  const energyAnchorCacheRef = useRef<EnergyTooltipAnchor | null>(null);
  const [energyTooltip, setEnergyTooltip] = useState<{ visible: boolean; anchor: EnergyTooltipAnchor | null }>({
    visible: false,
    anchor: null,
  });
  const energyTooltipAnim = useRef(new Animated.Value(0)).current;
  const energyTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [energyOnboardingVisible, setEnergyOnboardingVisible] = useState(false);
  const energyOnboardingAnim = useRef(new Animated.Value(0)).current;
  const energyPulseAnim = useRef(new Animated.Value(1)).current;
  const energyPulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const energyIconRef = useRef<View>(null);
  const mountedRef = useRef(true);
  const [shardsBalance, setShardsBalance] = useState(() => peekLastKnownShardsBalance() ?? hh?.shardsBalance ?? 0);
  const [homeXpPercentile, setHomeXpPercentile] = useState<number | null>(null);
  const shardsAnim = useRef(new Animated.Value(1)).current;
  const shardsBonusAnim = useRef(new Animated.Value(0)).current;
  const [shardsBonusText, setShardsBonusText] = useState('');
  const [shardsEarnedModal, setShardsEarnedModal] = useState<{ amount: number; reason: string } | null>(null);
  const streakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingLeagueResult, setPendingLeagueResult] = useState<LeagueResult | null>(null);
  const dismissedLeagueResultRef = useRef<string | null>(null);
  // Доп. гард: если пользователь уже закрыл модалку результатов недели в этой
  // сессии — не показываем её снова, даже если подпись (totalInGroup/myRank)
  // поменялась после нового Firestore-фетча группы. Сбрасывается на cold-start.
  const dismissedLeagueResultThisSessionRef = useRef<boolean>(false);
  const statsHintPulseAnim = useRef(new Animated.Value(1)).current;
  const statsPulseSessionRef = useRef(false);
  const [showStatsPulseHint, setShowStatsPulseHint] = useState(false);

  const dismissEnergyOnboarding = () => {
    energyPulseLoop.current?.stop();
    Animated.timing(energyOnboardingAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setEnergyOnboardingVisible(false);
    });
    AsyncStorage.setItem('energy_onboarding_shown', '1').catch(() => {});
  };

  const showEnergyTooltip = () => {
    hapticTap();
    const scheduleHide = () => {
      energyTooltipAnim.setValue(0);
      Animated.spring(energyTooltipAnim, { toValue: 1, useNativeDriver: false, tension: 120, friction: 8 }).start();
      if (energyTooltipTimer.current) clearTimeout(energyTooltipTimer.current);
      energyTooltipTimer.current = setTimeout(() => {
        Animated.timing(energyTooltipAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start(() => {
          setEnergyTooltip((p) => ({ ...p, visible: false }));
        });
      }, 3000);
    };

    const openWithAnchor = (measured: EnergyTooltipAnchor | null) => {
      const fresh =
        measured && measured.w > 0 && measured.h >= 0
          ? measured
          : energyAnchorCacheRef.current;
      if (measured && measured.w > 0 && measured.h >= 0) {
        energyAnchorCacheRef.current = measured;
      }
      setEnergyTooltip({ visible: true, anchor: fresh });
      scheduleHide();
    };

    const node = energyIconRef.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((px, py, width, height) => {
        openWithAnchor(
          width > 0 && height > 0
            ? { x: px, y: py, w: width, h: Math.max(height, 24) }
            : null,
        );
      });
      return;
    }
    openWithAnchor(null);
  };

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const diagChecked = true;


  // Секции главной: без entrance-анимации при открытии таба / возврате в приложение (сразу видимы).
  const S_COUNT = 6;
  const sectionOpacity = useRef(Array.from({ length: S_COUNT }, () => new Animated.Value(1))).current;
  const sectionSlide   = useRef(Array.from({ length: S_COUNT }, () => new Animated.Value(0))).current;

  const sectionStyle = (i: number) => ({
    opacity: sectionOpacity[i],
    transform: [{ translateY: sectionSlide[i] }],
  });

  useEffect(() => {
    loadData();
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue:1, duration:380, useNativeDriver:true }).start();
  }, [lang]);

  // Миграция v2: пороги XP удвоены — умножаем сохранённый XP на 2 (один раз).
  // Новые пользователи помечаются как "мигрированные" в handleOnboardingDone (_layout.tsx),
  // поэтому сюда попадают только старые пользователи со старой формулой XP.
  useEffect(() => {
    (async () => {
      const migrated = await AsyncStorage.getItem('xp_migration_v2');
      if (migrated) return;
      const raw = await AsyncStorage.getItem('user_total_xp');
      const xp = parseInt(raw || '0') || 0;
      if (xp > 0) {
        await AsyncStorage.setItem('user_total_xp', String(xp * 2));
      }
      await AsyncStorage.setItem('xp_migration_v2', '1');
    })();
  }, []);

  const showEnergyOnboarding = useCallback(() => {
    setEnergyOnboardingVisible(true);
    energyOnboardingAnim.setValue(0);
    Animated.timing(energyOnboardingAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    energyPulseAnim.setValue(1);
    Animated.sequence([
      Animated.spring(energyPulseAnim, { toValue: 1.15, useNativeDriver: true, friction: 3, tension: 180 }),
      Animated.spring(energyPulseAnim, { toValue: 1.0,  useNativeDriver: true, friction: 5, tension: 160 }),
    ]).start();
  }, []);

  // Тутор энергии нельзя показывать одновременно с пост-онбординг листом «Первый урок».
  // Поэтому сначала пробуем показать с задержкой, но уважаем gate-флаг (см. energyOnboardingGate.ts):
  //  - если сейчас показывается лист «Первый урок» (deferred=true) — пропускаем;
  //  - повторно пробуем по событию energy_onboarding_may_show, которое летит из _layout.tsx,
  //    когда лист закрыт по «Позже» / тапу по фону / по возврату с первого урока.
  useEffect(() => {
    const tryShowEnergyOnboarding = async () => {
      try {
        const shown = await AsyncStorage.getItem('energy_onboarding_shown');
        if (shown) return;
        if (getDeferEnergyOnboardingForPostOnboardingFirstLesson()) return;
        showEnergyOnboarding();
      } catch {}
    };
    const t = setTimeout(() => { void tryShowEnergyOnboarding(); }, 1500);
    const sub = onAppEvent('energy_onboarding_may_show', () => { void tryShowEnergyOnboarding(); });
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, []);

  // Возврат на главную после первого урока (запущенного с пост-онбординг листа):
  // снимаем hold и (если энергия-онбординг ещё не показан) показываем его.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cleared = await tryClearAfterOnboardingFirstLessonReturn().catch(() => false);
      if (!cleared || cancelled) return;
      const shown = await AsyncStorage.getItem('energy_onboarding_shown').catch(() => '1');
      if (shown || cancelled) return;
      setTimeout(() => { if (!cancelled) showEnergyOnboarding(); }, 600);
    })();
    return () => { cancelled = true; };
  }, [focusTick]);

  useEffect(() => {
    mountedRef.current = true;
    perfScreenMount('home');
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadData();
      }
    });
    // Слушаем событие изменения XP (от тестеров и других экранов)
    const xpSub = DeviceEventEmitter.addListener('xp_changed', () => { loadData(); });
    const leagueStateSub = onAppEvent('league_local_state_updated', () => { loadData(); });
    // Слушаем событие начисления осколков
    const shardsSub = DeviceEventEmitter.addListener('shards_earned', (payload: { amount: number }) => {
      getShardsBalance().then(bal => {
        setShardsBalance(bal);
        setShardsBonusText(`+${payload.amount} 💎`);
        shardsBonusAnim.setValue(0);
        Animated.sequence([
          Animated.timing(shardsBonusAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(900),
          Animated.timing(shardsBonusAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
        Animated.sequence([
          Animated.spring(shardsAnim, { toValue: 1.35, useNativeDriver: true, friction: 3 }),
          Animated.spring(shardsAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
        ]).start();
      });
    });
    // Цепочка только что обнулена (или markStreakLost вызван из любого места) — подтянуть
    // оффер и поднять модалку, не дожидаясь следующего loadData.
    const reviveOfferSub = onAppEvent('streak_revive_offer', () => {
      void getReviveOffer().then((o) => {
        if (!mountedRef.current || !o) return;
        setReviveOffer(o);
        setReviveModalVisible(true);
      });
    });
    return () => {
      mountedRef.current = false;
      sub.remove();
      xpSub.remove();
      leagueStateSub.remove();
      shardsSub.remove();
      reviveOfferSub.remove();
      if (streakTimerRef.current) clearTimeout(streakTimerRef.current);
      if (energyTooltipTimer.current) clearTimeout(energyTooltipTimer.current);
    };
  }, []);

  // Debounce-флаг: если loadData уже выполняется — не запускаем повторно.
  // Устраняет 3 одновременных вызова (focusTick + activeIdx + AppState) при возврате на главную.
  // needsReloadRef: если вызов был пропущен во время загрузки — повторим после завершения.
  const loadingRef = useRef(false);
  const needsReloadRef = useRef(false);
  useEffect(() => { loadData(); }, [focusTick]);
  useEffect(() => { if (activeIdx === 0) loadData(); }, [activeIdx]);

  /** Подсказка по блоку статистики: один раз после 3 ч в приложении, пульс 10 с, затем скрыть навсегда. */
  useEffect(() => {
    if (!homeStatsReady || activeIdx !== 0) return;
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let pulseLoop: Animated.CompositeAnimation | null = null;

    const startPulse = () => {
      if (statsPulseSessionRef.current || cancelled) return;
      statsPulseSessionRef.current = true;
      setShowStatsPulseHint(true);
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(statsHintPulseAnim, { toValue: 1.07, duration: 650, useNativeDriver: true }),
          Animated.timing(statsHintPulseAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
        ]),
      );
      pulseLoop.start();
      hideTimer = setTimeout(() => {
        pulseLoop?.stop();
        statsHintPulseAnim.setValue(1);
        if (!cancelled) setShowStatsPulseHint(false);
        AsyncStorage.setItem(STATS_PULSE_HINT_DONE_KEY, '1').catch(() => {});
        statsPulseSessionRef.current = false;
        hideTimer = null;
      }, 10_000);
    };

    const check = async () => {
      try {
        const [total, done] = await Promise.all([
          getForegroundUsageMs(),
          AsyncStorage.getItem(STATS_PULSE_HINT_DONE_KEY),
        ]);
        if (cancelled || done === '1') return;
        if (total >= STATS_PULSE_MIN_USAGE_MS) {
          startPulse();
          if (pollId) {
            clearInterval(pollId);
            pollId = null;
          }
        }
      } catch { /* */ }
    };

    void check();
    pollId = setInterval(() => { void check(); }, 30_000);

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      if (hideTimer) clearTimeout(hideTimer);
      pulseLoop?.stop();
      statsHintPulseAnim.setValue(1);
      statsPulseSessionRef.current = false;
      setShowStatsPulseHint(false);
    };
  }, [homeStatsReady, activeIdx, focusTick, statsHintPulseAnim]);


  const loadData = async () => {
    if (loadingRef.current) { needsReloadRef.current = true; return; }
    loadingRef.current = true;
    needsReloadRef.current = false;
    if (streakTimerRef.current) {
      clearTimeout(streakTimerRef.current);
      streakTimerRef.current = null;
    }
    streakScaleAnim.stopAnimation();
    streakScaleAnim.setValue(1);
    const endPerf = perfMark('home:loadData');
    try {
      const [name, streakVal, weekData, weekPts, xpStored, shardsBal] = await Promise.all([
        AsyncStorage.getItem('user_name'),
        AsyncStorage.getItem('streak_count'),
        AsyncStorage.getItem('week_days_done'),
        getMyWeekPoints(),
        AsyncStorage.getItem('user_total_xp'),
        getShardsBalance(),
      ]);
      setShardsBalance(shardsBal);
      if (name) setUserName(name);
      const currentStreakNum = parseInt(streakVal || '0') || 0;
      if (streakVal) setStreak(currentStreakNum);
      const lastStreakShown = parseInt(await AsyncStorage.getItem('streak_last_shown') || '0') || 0;
      if (currentStreakNum > 0 && currentStreakNum !== lastStreakShown) {
        await AsyncStorage.setItem('streak_last_shown', String(currentStreakNum));
        if (lastStreakShown > 0 && currentStreakNum > lastStreakShown) {
          setDisplayStreak(lastStreakShown);
          streakTimerRef.current = setTimeout(() => {
            setDisplayStreak(currentStreakNum);
            Animated.sequence([
              Animated.spring(streakScaleAnim, { toValue: 1.6, useNativeDriver: true, friction: 3, tension: 200 }),
              Animated.spring(streakScaleAnim, { toValue: 1,   useNativeDriver: true, friction: 5, tension: 150 }),
            ]).start();
          }, 800);
          onStreakUpdated(currentStreakNum).then((earned) => {
            const earnedAmount = typeof earned === 'number' ? earned : (earned?.amount ?? 0);
            const rk = typeof earned === 'object' && earned && 'reasonKey' in earned ? earned.reasonKey : undefined;
            if (earnedAmount > 0) {
              emitAppEvent(
                'shards_earned',
                rk ? { amount: earnedAmount, reasonKey: rk } : { amount: earnedAmount },
              );
            }
          }).catch(() => {});
        } else {
          setDisplayStreak(currentStreakNum);
        }
      } else {
        setDisplayStreak(currentStreakNum);
      }
      if (xpStored) {
        const newXP  = parseInt(xpStored) || 0;
        setTotalXP(newXP);
        const curLvl = getLevelFromXP(newXP);
        // Обновляем UI аватара/рамки по текущему уровню
        // (запись в AsyncStorage и детект level-up делает xp_manager.ts)
        const [[, savedAv], [, savedFr]] = await AsyncStorage.multiGet(['user_avatar', 'user_frame']);
        setUserAvatar(isCustomAvatarValue(savedAv) ? savedAv! : getBestAvatarForLevel(curLvl));
        setUserFrame(savedFr  || getBestFrameForLevel(curLvl).id);

        // Мини-бейдж перцентиля — глобальные пороги из leaderboard_stats/global
        if (newXP > 0) {
          computeAllPercentiles({ myXp: newXP, myStreak: 0, myWeekXp: 0, myDaily7xp: 0, myDaily7timeMs: 0, myArenaXp: 0 }).then((p) => {
            if (mountedRef.current) setHomeXpPercentile(p.xp !== null && p.xp >= 10 ? p.xp : null);
          }).catch(() => {});
        }
      }
      const xpSnap = parseInt(xpStored || '0', 10) || 0;
      const curLvlSnap = getLevelFromXP(xpSnap);
      const [[, savedAvSnap], [, savedFrSnap]] = await AsyncStorage.multiGet(['user_avatar', 'user_frame']);
      const avatarSnap = isCustomAvatarValue(savedAvSnap) ? savedAvSnap! : getBestAvatarForLevel(curLvlSnap);
      const frameSnap = savedFrSnap || getBestFrameForLevel(curLvlSnap).id;

      let weekParsedForSnap: boolean[] = new Array(7).fill(false);
      if (weekData) {
        try {
          const arr = JSON.parse(weekData) as boolean[];
          if (Array.isArray(arr) && arr.length === 7) {
            weekParsedForSnap = arr;
            setWeekDone(arr);
          } else {
            setWeekDone(new Array(7).fill(false));
          }
        } catch {
          setWeekDone(new Array(7).fill(false));
        }
      }
      setWeekPoints(weekPts);

      const pool = lang === 'uk' ? GREETINGS_UK : lang === 'es' ? GREETINGS_ES : GREETINGS_RU;
      if (pool.length > 0) {
        const phrase = await resolveDailyGreeting(pool, lang);
        if (mountedRef.current) setGreeting(phrase);
      }

      let done = 0;
      const lessonKeys = Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_progress`);
      const lessonEntries = await AsyncStorage.multiGet(lessonKeys);
      for (const [, saved] of lessonEntries) {
        if (saved) {
          const p: string[] = JSON.parse(saved);
          const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          if (correct >= 45) done++;
        }
      }

      let snapLastLessonId: number | null = null;
      let snapLastLessonProgress = 0;
      let snapLastLessonScore = '0.0';
      const lastLessonIdKey = await AsyncStorage.getItem('last_opened_lesson');
      const lastId = lastLessonIdKey ? parseInt(lastLessonIdKey, 10) : null;
      if (lastId && lastId >= 1 && lastId <= 32) {
        const lessonNames = lessonNamesForLang(lang);
        const saved = await AsyncStorage.getItem(`lesson${lastId}_progress`);
        snapLastLessonId = lastId;
        if (saved) {
          const p: string[] = JSON.parse(saved);
          const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          const scoreStr = (correct / 50 * 5).toFixed(1);
          snapLastLessonProgress = correct;
          snapLastLessonScore = scoreStr;
          setLastLesson({ id: lastId, name: lessonNames[lastId - 1], progress: correct, score: scoreStr });
        } else {
          snapLastLessonProgress = 0;
          snapLastLessonScore = '0.0';
          setLastLesson({ id: lastId, name: lessonNames[lastId - 1], progress: 0, score: '0.0' });
        }
      } else if (mountedRef.current) {
        setLastLesson(null);
      }

      // Крупная карта «Рівень / Ланцюжок»: не ждём лігу, медалі, SRS — щоб не ловити вічний спінер.
      const [freezeRaw, freeFreezeRaw, baseMulti] = await Promise.all([
        AsyncStorage.getItem('streak_freeze'),
        AsyncStorage.getItem('premium_free_freeze_used'),
        getCurrentMultiplier(),
      ]);
      const parsedFreeze = freezeRaw ? JSON.parse(freezeRaw) : null;
      setFreezeActive(!!(parsedFreeze?.active));
      setPremiumFreezeUsed(freeFreezeRaw === 'true');
      setTotalXPMulti(baseMulti);
      rememberHomeScreenHydration({
        userName: name ?? '',
        totalXP: xpSnap,
        streak: currentStreakNum,
        displayStreak: currentStreakNum,
        weekDone: weekParsedForSnap,
        weekPoints: weekPts,
        shardsBalance: shardsBal,
        lessonsCompleted: done,
        freezeActive: !!(parsedFreeze?.active),
        premiumFreezeUsed: freeFreezeRaw === 'true',
        totalXPMulti: baseMulti,
        userAvatar: avatarSnap,
        userFrame: frameSnap,
        lastLessonId: snapLastLessonId,
        lastLessonProgress: snapLastLessonProgress,
        lastLessonScore: snapLastLessonScore,
      });
      if (mountedRef.current) setHomeStatsReady(true);

      const taskList = await getTodayTasksSafe();
      // Имя для лиги: либо настоящее, либо аноним-fallback на основе уровня (как в club_screen.tsx),
      // чтобы checkLeagueOnAppOpen не записал в Firestore "пустого" пользователя.
      const leagueName = (name && name.trim())
        || (() => {
          const xpNum = parseInt(xpStored || '0', 10) || 0;
          const lvl = getXPProgress(xpNum).level;
          return `${getTitleString(lvl, lang ?? 'ru')} #${Math.floor(1000 + Math.random() * 9000)}`;
        })();

      const [tp, leagueOpenResult, dueItems, allMedals, repairEligible, bonusRaw, comebackRaw, pbRaw] = await Promise.all([
        loadTodayProgress(taskList),
        // Полный расчёт: при смене ISO-недели создаст pending и сохранит state.
        // Если remote недоступен — функция сама фолбэкнется на локальный state.
        checkLeagueOnAppOpen(leagueName, weekPts).catch(() => null),
        __DEV__ ? getTrainerTotalDue().then(n => Array(n).fill(null)) : Promise.resolve([]),
        loadAllMedals(),
        isRepairEligible(),
        AsyncStorage.getItem('login_bonus_pending'),
        AsyncStorage.getItem('comeback_pending'),
        AsyncStorage.getItem('weekly_pb_v1'),
      ]);
      const leagueState = leagueOpenResult?.state ?? null;
      // Если checkLeagueOnAppOpen упал/таймаутнул — fallback на чтение pending напрямую,
      // чтобы при следующем открытии (когда state уже сохранён) модалка всё равно вылезла.
      const leaguePending: LeagueResult | null = leagueOpenResult?.needShowResult
        ? leagueOpenResult.result
        : await loadPendingResult().catch(() => null);
      setTaskProgress(tp);
      const nSlots = taskList.length > 0 ? taskList.length : 3;
      setDailyTaskBarCount(nSlots);
      setTasksCompleted(countClaimedForTaskList(taskList, tp));

      if (leagueState) setEngineLeague(LEAGUES.find(l => l.id === leagueState.leagueId) ?? null);

      if (leaguePending && mountedRef.current) {
        const pendingSig = JSON.stringify({
          prevLeagueId: leaguePending.prevLeagueId,
          newLeagueId: leaguePending.newLeagueId,
          myRank: leaguePending.myRank,
          totalInGroup: leaguePending.totalInGroup,
          promoted: leaguePending.promoted,
          demoted: leaguePending.demoted,
        });
        // Если пользователь уже закрыл модалку в этой сессии — больше не показываем,
        // даже если состав группы (totalInGroup/myRank) поменялся после refetch.
        if (dismissedLeagueResultThisSessionRef.current || dismissedLeagueResultRef.current === pendingSig) {
          await clearPendingResult();
        } else {
          setPendingLeagueResult(leaguePending);
        }
      }

      setDueCount(dueItems.length);
      setMedalCounts(countMedals(allMedals));

      // [BANNERS] Login bonus, comeback, personal best, streak repair
      if (bonusRaw) {
        setLoginBonus(JSON.parse(bonusRaw));
        await AsyncStorage.removeItem('login_bonus_pending');
      }
      if (comebackRaw) {
        setComebackBanner(true);
        await AsyncStorage.removeItem('comeback_pending');
      }
      // Personal best: обновляем рекорд без показа баннера (баннер убран — слишком часто срабатывал)
      const pb = pbRaw ? JSON.parse(pbRaw) : { bestXP: 0 };
      if (weekPts > pb.bestXP) {
        await AsyncStorage.setItem('weekly_pb_v1', JSON.stringify({ bestXP: weekPts }));
      }
      if (repairEligible) {
        setShowRepairCard(true);
        const progress = await getRepairProgress();
        setRepairProgress(progress.lessons);
      }

      // [STREAK PAYWALL / FREEZE] Проверяем угрозу цепочке для всех пользователей.
      // Для не-премиум — показываем paywall (один раз в день).
      // Для премиум — показываем кнопку заморозки.
      const { willLose, streakBefore } = await checkStreakLossPending();
      if (willLose) {
        const freezeRaw2 = await AsyncStorage.getItem('streak_freeze');
        const freeze2 = freezeRaw2 ? JSON.parse(freezeRaw2) : null;
        const alreadyFrozen = !!(freeze2?.active);
        if (!alreadyFrozen) {
          setStreakAtRisk(true);
        }
        if (!isPremium) {
          const today = new Date().toISOString().split('T')[0];
          const shownToday = await AsyncStorage.getItem('streak_paywall_shown');
          if (shownToday !== today) {
            await AsyncStorage.setItem('streak_paywall_shown', today);
            router.push({ pathname: '/premium_modal', params: { context: 'streak', streak: String(streakBefore) } } as any);
          }
        }
      }

      // Streak Revive: если цепочка уже обнулена в updateStreakOnActivity (≤24ч назад) —
      // оффер активен, показываем модалку. Не пересекается с willLose (там 1 пропущенный
      // день и freeze ещё может помочь).
      const offer = await getReviveOffer();
      if (offer && mountedRef.current) {
        setReviveOffer(offer);
        setReviveModalVisible(true);
      }

      // Premium celebration: pending выставлен в premium_modal (IAP) или cloud_sync (admin grant).
      const pending = await isCelebrationPending();
      if (pending && mountedRef.current) {
        // Не показываем одновременно с revive-модалкой — celebration важнее, revive отложится до закрытия.
        if (!offer) setCelebrationVisible(true);
        else {
          // Если есть и то и то — после закрытия revive подхватим celebration.
          setTimeout(() => setCelebrationVisible(true), 600);
        }
      }
    } catch (error) {
      DebugLogger.error('home.tsx:checkDailyReward', error, 'warning');
    } finally {
      endPerf();
      homeStatsLoadedOnce = true;
      if (mountedRef.current) setHomeStatsReady(true);
      loadingRef.current = false;
      // Если во время загрузки пришёл ещё один запрос — выполняем его сейчас
      if (needsReloadRef.current) {
        needsReloadRef.current = false;
        loadData();
      }
    }
  };

  const FREEZE_COST_SHARDS = 1;

  const handleFreezeStreak = async () => {
    hapticTap();
    const today = new Date().toISOString().split('T')[0];

    const freeAvailable = isPremium && !premiumFreezeUsed;

    if (!isPremium) {
      router.push({ pathname: '/premium_modal', params: { context: 'streak', streak: String(streak) } } as any);
      return;
    }

    if (freeAvailable) {
      await AsyncStorage.setItem('premium_free_freeze_used', 'true');
      setPremiumFreezeUsed(true);
    } else {
      const ok = await spendShards(FREEZE_COST_SHARDS);
      if (!ok) {
        await enqueueThemedBlockingInfoAlert(
          triLang(lang, {
            ru: 'Недостаточно осколков',
            uk: 'Недостатньо осколків',
            es: `No tienes suficientes ${BRAND_SHARDS_ES}`,
          }),
          triLang(lang, {
            ru: `Заморозка стоит ${FREEZE_COST_SHARDS} 💎. У тебя ${shardsBalance} 💎.`,
            uk: `Заморозка коштує ${FREEZE_COST_SHARDS} 💎. У тебе ${shardsBalance} 💎.`,
            es: `Congelar la racha cuesta ${FREEZE_COST_SHARDS} 💎 · Tienes ${shardsBalance} 💎`,
          }),
          'OK',
        );
        return;
      }
      setShardsBalance(prev => Math.max(0, prev - FREEZE_COST_SHARDS));
    }

    await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: today }));
    setFreezeActive(true);
    setStreakAtRisk(false);
  };

const weekDays =
    lang === 'uk'
      ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
      : lang === 'es'
        ? ['L', 'M', 'X', 'J', 'V', 'S', 'D']
        : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const todayIdx = (new Date().getDay() + 6) % 7;

  /** Индексы табов: 0 home, 1 lessons, 2 arena, 3 friends, 4 settings — см. app/(tabs)/_layout.tsx */
  const TAB_IDX: Record<string, number> = {
    '/(tabs)/lessons': 1,
    lessons: 1,
    '/(tabs)/arena': 2,
    arena: 2,
    '/(tabs)/friends': 3,
    friends: 3,
    '/(tabs)/settings': 4,
    settings: 4,
  };
  const go = (path: string) => {
    hapticTap();

    const tabIdx = TAB_IDX[path];
    if (tabIdx !== undefined) { goToTab(tabIdx); return; }
    const screenName = path.replace(/^\//, '').split('?')[0];
    logFeatureOpened(screenName);
    trackFeatureOpened(screenName).catch(() => {});
    perfNavStart(screenName);
    router.push(path as any);
  };

  const dotActive   = t.textSecond;
  const dotToday    = t.textPrimary;
  const dotEmpty    = t.bgSurface2;
  const dayLblColor = t.textMuted;

  if (!diagChecked) return <ScreenGradient><View /></ScreenGradient>;

  // ── Общие баннеры (используются в обоих стилях) ──────────────────────────
  const bannersJSX = (
    <>
      {loginBonus && (
        <View style={{ marginHorizontal:16, marginBottom:10, backgroundColor:t.bgCard, borderRadius:16, padding:14, flexDirection:'row', alignItems:'center', gap:10, borderWidth:1, borderColor:t.textSecond+'66' }}>
          <Text style={{ fontSize:28 }}>{loginBonus.cycle===7?'🎁':'🎉'}</Text>
          <View style={{ flex:1 }}>
            <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>{
              triLang(lang, {
                ru: 'Бонус за вход!',
                uk: 'Бонус за вхід!',
                es: '¡Bono por entrar!',
              })
            }{loginBonus.cycle === 7 ? triLang(lang, { ru:' День 7 🔥', uk:' День 7 🔥', es:' · Día 7 🔥' }) : ''}</Text>
            <Text style={{ color:t.textMuted, fontSize:f.sub, marginTop:2 }}>+{loginBonus.xp} XP · {
              triLang(lang, {
                ru: `день ${loginBonus.cycle}`,
                uk: `день ${loginBonus.cycle}`,
                es: `Día ${loginBonus.cycle}`,
              })
            }</Text>
          </View>
          <TouchableOpacity onPress={()=>setLoginBonus(null)} style={{padding:4}}><Ionicons name="close" size={18} color={t.textMuted}/></TouchableOpacity>
        </View>
      )}
      {showComebackBanner && (
        <View style={{ marginHorizontal:16, marginBottom:10, backgroundColor:t.bgCard, borderRadius:16, padding:14, flexDirection:'row', alignItems:'center', gap:10, borderWidth:1, borderColor:'#FF9500'+'88' }}>
          <Text style={{ fontSize:28 }}>🚀</Text>
          <View style={{ flex:1 }}>
            <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>{
              triLang(lang, {
                ru: 'С возвращением!',
                uk: 'З поверненням!',
                es: '¡Qué bien verte de nuevo!',
              })
            }</Text>
            <Text style={{ color:t.textMuted, fontSize:f.sub, marginTop:2 }}>{
              triLang(lang, {
                ru: 'Весь день — +100% XP за каждый правильный ответ',
                uk: 'Весь день — +100% XP за кожну правильну відповідь',
                es: 'Todo el día: +100 % de XP por cada acierto',
              })
            }</Text>
          </View>
          <TouchableOpacity onPress={()=>setComebackBanner(false)} style={{padding:4}}><Ionicons name="close" size={18} color={t.textMuted}/></TouchableOpacity>
        </View>
      )}
      {showRepairCard && (
        <View style={{ marginHorizontal:16, marginBottom:10, backgroundColor:t.bgCard, borderRadius:16, padding:14, borderWidth:1, borderColor:'#FF9500'+'99' }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:8 }}>
            <Text style={{ fontSize:26 }}>🛠️</Text>
            <View style={{ flex:1 }}>
              <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>{
                triLang(lang, {
                  ru: 'Почини цепочку!',
                  uk: 'Полагодь стрік!',
                  es: '¡Recupera tu racha!',
                })
              }</Text>
              <Text style={{ color:t.textMuted, fontSize:f.sub, marginTop:2 }}>{
                triLang(lang, {
                  ru: `Пройди 1 урок сегодня, чтобы сохранить цепочку · ${repairProgress}/1`,
                  uk: `Пройди 1 урок сьогодні, щоб зберегти стрік · ${repairProgress}/1`,
                  es: `Hoy completa 1 lección para no romper tu racha · ${repairProgress}/1`,
                })
              }</Text>
            </View>
            <TouchableOpacity onPress={()=>setShowRepairCard(false)} style={{padding:4}}><Ionicons name="close" size={18} color={t.textMuted}/></TouchableOpacity>
          </View>
          <View style={{ height:6, backgroundColor:t.bgSurface2, borderRadius:3 }}>
            <View style={{ height:6, width:`${repairProgress/2*100}%` as any, backgroundColor:'#FF9500', borderRadius:3 }} />
          </View>
        </View>
      )}
    </>
  );

  // ── Новый стиль главного экрана ──────────────────────────────────────────
  const renderNewHome = () => {
    const { level, xpInLevel, xpNeeded, progress } = getXPProgress(totalXP);
    const menuImages = {
      lesson:    themeMode === 'minimalLight' ? require('../../assets/images/levels/lesson grafit.webp')
               : themeMode === 'minimalDark' ? require('../../assets/images/levels/lesson fog.webp')
               : themeMode === 'ocean'  ? require('../../assets/images/levels/lesson ocean.webp')
               : themeMode === 'sakura' ? require('../../assets/images/levels/lesson sacura.webp')
               : themeMode === 'gold'   ? require('../../assets/images/levels/lesson coral.webp')
               : themeMode === 'neon'   ? require('../../assets/images/levels/lesson neon.webp')
               :                          require('../../assets/images/levels/lesson forest.webp'),
      quizes:    themeMode === 'minimalLight' ? require('../../assets/images/levels/quizes grafit.webp')
               : themeMode === 'minimalDark' ? require('../../assets/images/levels/quizes fog.webp')
               : themeMode === 'ocean'  ? require('../../assets/images/levels/quizes ocean.webp')
               : themeMode === 'sakura' ? require('../../assets/images/levels/quizes sacura.webp')
               : themeMode === 'gold'   ? require('../../assets/images/levels/quizes coral.webp')
               : themeMode === 'neon'   ? require('../../assets/images/levels/quizes neon.webp')
               :                          require('../../assets/images/levels/quizes forest.webp'),
      cards:     themeMode === 'minimalLight' ? require('../../assets/images/levels/cards grafit.webp')
               : themeMode === 'minimalDark' ? require('../../assets/images/levels/cards fog.webp')
               : themeMode === 'ocean'  ? require('../../assets/images/levels/cards ocean.webp')
               : themeMode === 'sakura' ? require('../../assets/images/levels/cards sacura.webp')
               : themeMode === 'gold'   ? require('../../assets/images/levels/cards coral.webp')
               : themeMode === 'neon'   ? require('../../assets/images/levels/cards neon.webp')
               :                          require('../../assets/images/levels/cards forest.webp'),
      dayTasks:  themeMode === 'minimalLight' ? require('../../assets/images/levels/dayli task grafit.webp')
               : themeMode === 'minimalDark' ? require('../../assets/images/levels/day tasks fog.webp')
               : themeMode === 'ocean'  ? require('../../assets/images/levels/day tasks ocean.webp')
               : themeMode === 'sakura' ? require('../../assets/images/levels/day tasks sacura.webp')
               : themeMode === 'gold'   ? require('../../assets/images/levels/day tasks coral.webp')
               : themeMode === 'neon'   ? require('../../assets/images/levels/day tasks neon.webp')
               :                          require('../../assets/images/levels/day tasks forest.webp'),
      test:      themeMode === 'minimalLight' ? require('../../assets/images/levels/test grafit.webp')
               : themeMode === 'minimalDark' ? require('../../assets/images/levels/test fog.webp')
               : themeMode === 'ocean'  ? require('../../assets/images/levels/test ocean.webp')
               : themeMode === 'sakura' ? require('../../assets/images/levels/test sacura.webp')
               : themeMode === 'gold'   ? require('../../assets/images/levels/test coral.webp')
               : themeMode === 'neon'   ? require('../../assets/images/levels/test neon.webp')
               :                          require('../../assets/images/levels/test forest.webp'),
    };
    const quickItems = [
      { img: menuImages.lesson,   label: s.tabs.lessons,    sub: triLang(lang, { ru: '32 урока', uk: '32 уроки', es: '32 lecciones' }), path: 'lessons' },
      { img: menuImages.quizes,   label: s.tabs.quizzes,    sub: triLang(lang, { ru: '3 уровня', uk: '3 рівні', es: '3 niveles de dificultad' }), path: '/quizzes_screen' },
      { img: menuImages.cards,    label: s.tabs.flashcards, sub: triLang(lang, { ru: 'Свои фразы', uk: 'Свої фрази', es: 'Tus tarjetas' }), path: '/flashcards' },
    ];
    const themedClubIcon =
      themeMode === 'minimalLight' ? require('../../assets/images/levels/club base grafit.webp') :
      themeMode === 'minimalDark' ? require('../../assets/images/levels/club base fog.webp') :
      themeMode === 'ocean'  ? require('../../assets/images/levels/club base ocean.webp') :
      themeMode === 'sakura' ? require('../../assets/images/levels/club base sacura.webp') :
      themeMode === 'gold'   ? require('../../assets/images/levels/club base corak.webp') :
      themeMode === 'neon'   ? require('../../assets/images/levels/club base neon.webp') :
                               require('../../assets/images/levels/club icon base forest.webp');

    /** Второй ряд быстрых плиток — тот же визуал, что «Уроки / Квизы / Карточки». */
    const activityQuickItems = [
      {
        key: 'daily',
        kind: 'tasks' as const,
        label: triLang(lang, { ru: 'Задания дня', uk: 'Завдання дня', es: 'Tareas del día' }),
        path: '/daily_tasks_screen' as const,
        img: menuImages.dayTasks,
      },
      {
        key: 'league',
        kind: 'league' as const,
        label: triLang(lang, { ru: 'Лига недели', uk: 'Ліга тижня', es: 'Liga de la semana' }),
        path: '/league_screen' as const,
      },
      {
        key: 'attest',
        kind: 'image' as const,
        label: s.home.attestTile,
        path: '/diagnostic_test' as const,
        img: menuImages.test,
      },
    ];

    return (
      <ScrollView scrollEnabled={pageScrollEnabled} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:32, paddingTop:6 }}>

          {/* ХЕДЕР */}
          <Animated.View style={sectionStyle(0)}>
          <View style={{ flexDirection:'row', alignItems:'flex-start', padding:20, paddingBottom:12, gap:8 }}>
            <View style={{ flex:1 }}>
              <Text style={{ color:t.heroTextMuted, fontSize:f.caption }}>{greeting}</Text>
              {isPremium ? (
                <PremiumGoldUserName text={userName || '...'} fontSize={f.h1} />
              ) : (
                <Text style={{ color:t.heroTextPrimary, fontSize:f.h1, fontWeight:'700', marginTop:2 }}>{userName||'...'}</Text>
              )}
              {/* Анимация начисления осколков */}
              <Animated.Text style={{
                position:'absolute', top:-18, right:0,
                color:'#A78BFA', fontSize:13, fontWeight:'700',
                opacity: shardsBonusAnim,
                transform:[{ translateY: shardsBonusAnim.interpolate({ inputRange:[0,1], outputRange:[0,-14] }) }],
              }}>{shardsBonusText}</Animated.Text>
              {/* Energy + shards — в одной строке */}
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:6, gap:8 }}>
                <View ref={energyIconRef} collapsable={false} style={{ flexDirection:'row', alignItems:'center', gap:4, flexShrink:1, alignSelf:'flex-start' }}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={showEnergyTooltip}
                  style={{ flexDirection:'row', alignItems:'center', gap:4, flexShrink: 1 }}
                >
                  <View style={{ flexDirection:'row', alignItems:'center' }}>
                    {Array.from({ length: energyMax }).map((_, i) => (
                      <View key={i} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                        <EnergyIcon
                          filled={i < energyCount}
                          themeColor={i < energyCount ? energyFilledColor : (isLightTheme ? (themeMode === 'ocean' ? 'rgba(234,246,255,0.40)' : 'rgba(255,245,252,0.38)') : t.textGhost)}
                          size={20}
                          animateChange={true}
                          shouldShake={false}
                          themeMode={themeMode}
                          tintColor={i < energyCount ? energyFilledTint : undefined}
                          isPremium={energyUnlimited}
                        />
                      </View>
                    ))}
                    {energyBonus > 0 && Array.from({ length: energyBonus }).map((_, i) => (
                      <View key={`bonus_${i}`} style={{ marginLeft: -8 }}>
                        <EnergyIcon
                          filled={true}
                          themeColor={BONUS_ENERGY_COLOR}
                          size={20}
                          animateChange={false}
                          shouldShake={false}
                          themeMode={themeMode}
                          tintColor={BONUS_ENERGY_COLOR}
                        />
                      </View>
                    ))}
                  </View>
                  {!energyUnlimited && energyCount < energyMax && timeUntilNextEnergy && (
                    <Text style={{ fontSize: f.label, color: t.heroTextMuted, fontWeight: '500', marginLeft: 6 }}>
                      {`+1 ${triLang(lang, { ru: 'через', uk: 'через', es: 'en' })} ${timeUntilNextEnergy}`}
                    </Text>
                  )}
                </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    hapticTap();
                    router.push('/shards_shop');
                  }}
                  style={{ flexDirection:'row', alignItems:'center', gap:4 }}
                >
                  <Animated.View style={{ transform:[{scale:shardsAnim}], flexDirection:'row', alignItems:'center', gap:3 }}>
                    <Image source={require('../../assets/images/levels/OSKOLOK.webp')} style={{ width:22, height:22 }} resizeMode="contain" />
                    <Text style={{ color:'#A78BFA', fontSize:12, fontWeight:'800' }}>{shardsBalance}</Text>
                  </Animated.View>
                </TouchableOpacity>
              </View>

            </View>
          </View>

          {bannersJSX}
          </Animated.View>

          {/* ── ГЕРОЙ: Уровень + Цепочка ── */}
          <Animated.View style={sectionStyle(1)}>
          <TouchableOpacity
            testID="home-stats-card"
            activeOpacity={0.88}
            onPress={()=>{ hapticTap(); router.push('/streak_stats'); }}
            style={{ marginHorizontal:16, marginBottom:12 }}
            accessibilityRole="button"
            accessibilityLabel={s.home.statsCardTitle}
            accessibilityHint={s.home.statsPulseHint}
          >
            <LinearGradient colors={t.cardGradient} start={{x:0, y:0}} end={{x:1, y:1}} style={{ borderRadius:24, borderWidth:0.5, borderColor:t.border, padding:20, minHeight: homeStatsReady ? undefined : 200 }}>
              {/* Декоративные круги — в отдельном контейнере чтобы не обрезать текст */}
              <View style={{ position:'absolute', top:0, left:0, right:0, bottom:0, borderRadius:24, overflow:'hidden' }} pointerEvents="none">
                <View style={{ position:'absolute', top:-30, right:-20, width:110, height:110, borderRadius:55, backgroundColor:t.textSecond+'12' }} />
                <View style={{ position:'absolute', bottom:-20, left:-10, width:70, height:70, borderRadius:35, backgroundColor:t.correct+'10' }} />
              </View>

              {!homeStatsReady ? (
                <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }} accessibilityState={{ busy: true }}>
                  <ActivityIndicator size="large" color={t.accent} />
                </View>
              ) : (
              <>
              {/* Верхняя строка: Уровень + Цепочка */}
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                <View style={{ flex:1 }}>
                  <Text style={{ color:t.textMuted, fontSize:10, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>{triLang(lang, { ru: 'Уровень', uk: 'Рівень', es: 'Nivel' })}</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                    <TouchableOpacity
                      activeOpacity={0.78}
                      onPress={(event) => {
                        event.stopPropagation?.();
                        hapticTap();
                        router.push('/avatar_select');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Avatar"
                    >
                      <AvatarView avatar={userAvatar} level={level} size={44} />
                    </TouchableOpacity>
                    <View style={{ flex:1 }}>
                      <Text style={{ color:t.textPrimary, fontSize:22, fontWeight:'800', lineHeight:26 }} numberOfLines={1}>{triLang(lang, { ru: 'Уровень', uk: 'Рівень', es: 'Nivel' })} {level}</Text>
                      <Text style={{ color: isLightTheme ? t.textSecond : t.gold, fontSize:13, fontWeight:'600', marginTop:2 }} numberOfLines={1}>{getTitleString(level, lang)}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems:'flex-end', marginLeft:12 }}>
                  <Text style={{ color:t.textMuted, fontSize:10, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>{s.home.streakLabel}</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                    <Animated.Text style={{ color:t.textPrimary, fontSize:34, fontWeight:'800', lineHeight:38, transform:[{scale:streakScaleAnim}] }}>{displayStreak}</Animated.Text>
                    <Ionicons name={freezeActive ? 'snow-outline' : 'flame'} size={30} color={freezeActive ? '#64B4FF' : (streak>0?'#FF6B35':t.textGhost)} />
                  </View>
                  <Text style={{ color:t.textSecond, fontSize:13 }} numberOfLines={1}>{s.home.streakDays}</Text>
                </View>
              </View>

              {/* Прогресс XP — толще */}
              <View style={{ marginBottom:14 }}>
                <View style={{ height:9, backgroundColor:t.bgSurface, borderRadius:5, overflow:'hidden' }}>
                  <View style={{ width:`${Math.min(100,Math.round(progress*100))}%` as any, height:'100%', borderRadius:5, backgroundColor:isLightTheme ? t.accent : t.gold }} />
                </View>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:5 }}>
                  <Text style={{ color:t.textMuted, fontSize:f.label }}>{xpInLevel} / {xpNeeded} XP</Text>
                  {totalXPMulti > 1.0 && (
                    <View style={{ backgroundColor:t.gold, borderRadius:8, paddingHorizontal:6, paddingVertical:2 }}>
                      <Text style={{ color:t.textOnGold, fontSize:11, fontWeight:'700' }}>+{Math.round((totalXPMulti-1)*100)}% XP</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* МИНИ-БЕЙДЖ XP-ПЕРЦЕНТИЛЯ */}
              {isPremium && homeXpPercentile !== null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <View style={{ backgroundColor: t.gold, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 12 }}>🏆</Text>
                    <Text style={{ color: t.textOnGold, fontSize: 11, fontWeight: '700' }}>
                      {triLang(lang, {
                        ru: `Топ ${100 - homeXpPercentile}% по опыту`,
                        uk: `Топ ${100 - homeXpPercentile}% за досвідом`,
                        es: `Top ${100 - homeXpPercentile}% en XP`,
                      })}
                    </Text>
                  </View>
                </View>
              )}

              {/* Точки недели — крупнее */}
              <View style={{ flexDirection:'row', justifyContent:'space-between', paddingHorizontal:4 }}>
                {weekDays.map((d,i)=>(
                  <View key={i} style={{ alignItems:'center', gap:6 }}>
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: weekDone[i] ? t.correct : (isLightTheme
                        ? (i === todayIdx ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.38)')
                        : (i===todayIdx ? t.textPrimary+'66' : t.bgSurface2)),
                      borderWidth: weekDone[i] ? 0 : (isLightTheme ? (i === todayIdx && !weekDone[i] ? 2 : 1) : (i===todayIdx && !weekDone[i] ? 2 : 0)),
                      borderColor: isLightTheme ? t.textMuted : t.textPrimary,
                    }} />
                    <Text style={{ color: weekDone[i] ? t.textPrimary : t.textMuted, fontSize:12, fontWeight:'600' }}>{d}</Text>
                  </View>
                ))}
              </View>
              {showStatsPulseHint && (
                <Animated.Text
                  accessibilityLiveRegion="polite"
                  style={{
                    color: t.accent,
                    fontSize: 13,
                    fontWeight: '700',
                    marginTop: 14,
                    textAlign: 'center',
                    lineHeight: 18,
                    transform: [{ scale: statsHintPulseAnim }],
                  }}
                >
                  {s.home.statsPulseHint}
                </Animated.Text>
              )}
              </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          </Animated.View>

          {/* ПРОДОЛЖИТЬ УРОК + ЗАМОРОЗКА (карточка урока — только после первого захода в любой урок / last_opened_lesson) */}
          {(streakAtRisk && !freezeActive || lastLesson != null) && (
          <Animated.View style={sectionStyle(2)}>
          {/* ЗАМОРОЗКА ЦЕПОЧКИ — для всех когда цепочка под угрозой */}
          {streakAtRisk && !freezeActive && (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleFreezeStreak}
              style={{ marginHorizontal:16, marginBottom:12, borderRadius:16, backgroundColor:'#1A3A5C', borderWidth:1, borderColor:'#4FC3F7', padding:16, flexDirection:'row', alignItems:'center', gap:12 }}
            >
              <Text style={{ fontSize:28 }}>🧊</Text>
              <View style={{ flex:1 }}>
                <Text style={{ color:'#4FC3F7', fontSize:13, fontWeight:'700' }}>
                  {triLang(lang, {
                    ru: `Цепочка ${streak} дней под угрозой`,
                    uk: `Ланцюжок ${streak} днів під загрозою`,
                    es: `Llevas ${streak} días de racha: no la pierdas hoy`,
                  })}
                </Text>
                <Text style={{ color:'#90CAF9', fontSize:12, marginTop:2 }}>
                  {!isPremium
                    ? triLang(lang, {
                        ru: 'Доступно только для Premium',
                        uk: 'Доступно лише для Premium',
                        es: 'Solo disponible con Premium',
                      })
                    : !premiumFreezeUsed
                      ? triLang(lang, {
                          ru: 'Заморозить бесплатно — бонус Premium',
                          uk: 'Заморозити безкоштовно — бонус Premium',
                          es: 'Primera congelación gratis con Premium',
                        })
                      : triLang(lang, {
                          ru: `Заморозить за ${FREEZE_COST_SHARDS} 💎`,
                          uk: `Заморозити за ${FREEZE_COST_SHARDS} 💎`,
                          es: `Congela tu racha por ${FREEZE_COST_SHARDS} 💎`,
                        })
                  }
                </Text>
              </View>
              <View style={{ alignItems:'flex-end', gap:2 }}>
                {!isPremium
                  ? <Text style={{ color:'#FFB74D', fontSize:11, fontWeight:'700' }}>Premium</Text>
                  : isPremium && !premiumFreezeUsed
                    ? <Text style={{ color:'#4FC3F7', fontSize:12, fontWeight:'700' }}>
                        {triLang(lang, { ru: 'Бесплатно', uk: 'Безкоштовно', es: 'Gratis' })}
                      </Text>
                    : <Text style={{ color: shardsBalance >= FREEZE_COST_SHARDS ? '#4FC3F7' : t.textGhost, fontSize:12, fontWeight:'700' }}>
                        {FREEZE_COST_SHARDS} 💎
                      </Text>
                }
                <Ionicons name="chevron-forward" size={16} color="#4FC3F7" />
              </View>
            </TouchableOpacity>
          )}

          {/* ПРОДОЛЖИТЬ УРОК */}
          {lastLesson != null && (
          <PremiumCard
            testID="home-continue-lesson"
            level={3}
            onPress={()=>router.push({ pathname:'/lesson_menu', params:{ id:lastLesson.id } })}
            style={{ marginHorizontal:16, marginBottom:12 }}
            innerStyle={{ padding:16, flexDirection:'row', alignItems:'center', gap:14 }}
          >
            <CircularProgress
              pct={Math.round(lastLesson.progress/50*100)}
              size={52} sw={5} color={t.accent} bg={t.bgSurface}
              textColor={t.textPrimary} fontSize={10}
            />
            <View style={{ flex:1 }}>
              <Text style={{ color:t.textMuted, fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.6 }}>
                {s.home.continueBtn}
              </Text>
              <Text style={{ color:t.textPrimary, fontSize:f.bodyLg, fontWeight:'700', marginTop:3 }}>
                {`${triLang(lang, { ru: 'Урок', uk: 'Урок', es: 'Lección' })} ${lastLesson.id} — ${lessonNamesForLang(lang)[lastLesson.id - 1] ?? lastLesson.name}`}
              </Text>
              <Text style={{ color:t.textMuted, fontSize:f.label, marginTop:2 }}>★ {lastLesson.score} · {lastLesson.progress}/50</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.textGhost} />
          </PremiumCard>
          )}
          </Animated.View>
          )}

          {/* Persistent баннер "Сохрани прогресс" — для незалогиненных юзеров с XP ≥ 1000.
              Сам решает показываться или нет (см. SaveProgressBanner.tsx). */}
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <SaveProgressBanner />
          </View>

          {/* БЫСТРЫЙ ДОСТУП: уроки + квизы + карточки */}
          <Animated.View style={sectionStyle(3)}>
          <View
            onTouchStart={() => { tabSwipeLock.blocked = true; }}
            onTouchEnd={() => { tabSwipeLock.blocked = false; }}
            onTouchCancel={() => { tabSwipeLock.blocked = false; }}
          >
          <View style={{ marginBottom:12, paddingHorizontal:16, gap:10, flexDirection:'row' }}>
              {quickItems.map(item=>(
                <TouchableOpacity
                  key={item.label}
                  activeOpacity={0.8}
                  onPress={() => {
                    go(item.path);
                  }}
                  style={{ flex:1, borderRadius:18, borderWidth:0.5, borderColor:t.border, overflow:'hidden' }}
                >
                  <LinearGradient colors={t.cardGradient} start={{x:0,y:0}} end={{x:1,y:1}} style={{ flex:1, borderRadius:18, paddingHorizontal:10, paddingVertical:14, alignItems:'center', gap:5 }}>
                  <View style={{ position: 'relative' }}>
                    {item.img
                      ? (
                        <LightSketchMenuImage
                          source={item.img}
                          width={62}
                          height={62}
                          lighten={themeMode === 'minimalLight'}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                      )
                      : <View style={{ width: 62, height: 62, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: f.numLg + 4 }}>🗺️</Text></View>
                    }
                  </View>
                  <Text style={{ color:t.textPrimary, fontSize:f.label, fontWeight:'700', textAlign:'center' }} numberOfLines={1}>{item.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
          </View>
          </View>
          </Animated.View>

          {/* SRS ПОВТОРЕНИЕ + ряд «Задания дня / Лига / Аттестация» */}
          <Animated.View style={sectionStyle(4)}>

          {/* ТРЕНЕР — стационарная кнопка, всегда видна */}
          <View style={{ paddingHorizontal:16, marginBottom:12 }}>
            <TouchableOpacity activeOpacity={0.85} onPress={()=>{ hapticTap(); router.push('/trainer'); }}
              style={{ borderRadius:16, borderWidth:0.5, borderColor:t.border, overflow:'hidden' }}
            >
              <LinearGradient colors={t.cardGradient} start={{x:0,y:0}} end={{x:1,y:1}} style={{ flexDirection:'row', alignItems:'center', gap:12, borderRadius:16, padding:14 }}>
              <View style={{ width:44, height:44, borderRadius:12, backgroundColor:'transparent', justifyContent:'center', alignItems:'center' }}>
                <LightSketchMenuImage
                  source={themeMode === 'minimalLight' ? require('../../assets/images/levels/active recall grafit.webp') : themeMode === 'minimalDark' ? require('../../assets/images/levels/active recall fog.webp') : themeMode === 'ocean' ? require('../../assets/images/levels/active recall ocean.webp') : themeMode === 'sakura' ? require('../../assets/images/levels/active recall sacura.webp') : themeMode === 'gold' ? require('../../assets/images/levels/active recall coral.webp') : themeMode === 'neon' ? require('../../assets/images/levels/active recall neon.webp') : require('../../assets/images/levels/active recall forest.webp')}
                  width={44}
                  height={44}
                  lighten={themeMode === 'minimalLight'}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>
                  {triLang(lang, { ru: '🧠 Тренер', uk: '🧠 Тренер', es: '🧠 Entrenador' })}
                </Text>
                <Text style={{ color:t.textSecond, fontSize:f.label, marginTop:1 }}>
                  {dueCount > 0
                    ? triLang(lang, { ru: `${dueCount} ждут сегодня`, uk: `${dueCount} чекають сьогодні`, es: `${dueCount} esperan hoy` })
                    : triLang(lang, { ru: 'Повторение ошибок', uk: 'Повторення помилок', es: 'Repaso de errores' })
                  }
                </Text>
              </View>
              {dueCount > 0 && (
                <View style={{ backgroundColor:'#E05050', borderRadius:14, minWidth:28, height:28, alignItems:'center', justifyContent:'center', paddingHorizontal:6 }}>
                  <Text style={{ color:'#fff', fontSize:f.label, fontWeight:'800' }}>{dueCount}</Text>
                </View>
              )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View
            onTouchStart={() => { tabSwipeLock.blocked = true; }}
            onTouchEnd={() => { tabSwipeLock.blocked = false; }}
            onTouchCancel={() => { tabSwipeLock.blocked = false; }}
          >
            <View style={{ marginBottom:12, paddingHorizontal:16, gap:10, flexDirection:'row' }}>
              {activityQuickItems.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.8}
                  onPress={() => { go(item.path); }}
                  style={{ flex:1, borderRadius:18, borderWidth:0.5, borderColor:t.border, overflow:'hidden' }}
                >
                  <LinearGradient
                    colors={t.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 14, alignItems: 'center', gap: 5 }}
                  >
                    <View style={{ position: 'relative', height: 62, justifyContent: 'center', alignItems: 'center' }}>
                      {item.kind === 'tasks' ? (
                        <LightSketchMenuImage
                          source={item.img}
                          width={62}
                          height={62}
                          lighten={themeMode === 'minimalLight'}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                      ) : item.kind === 'league' ? (
                        <LightSketchMenuImage
                          source={themedClubIcon}
                          width={62}
                          height={62}
                          lighten={themeMode === 'minimalLight'}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <LightSketchMenuImage
                          source={item.img}
                          width={62}
                          height={62}
                          lighten={themeMode === 'minimalLight'}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                      )}
                    </View>
                    <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '700', textAlign: 'center' }} numberOfLines={2}>
                      {item.label}
                    </Text>
                    {item.kind === 'tasks' ? (
                      <View style={{ width: '100%', marginTop: 2 }}>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          {Array.from({ length: dailyTaskBarCount }, (_, ti) => {
                            const done = ti < tasksCompleted;
                            return (
                              <View key={ti} style={{ flex: 1, height: 4, backgroundColor: t.bgSurface2, borderRadius: 2, overflow: 'hidden' }}>
                                {done ? <View style={{ width: '100%', height: '100%', backgroundColor: t.correct, borderRadius: 2 }} /> : null}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          </Animated.View>

          {/* ── ФРАЗА ДНЯ + ПОДВАЛ ── */}
          <Animated.View style={sectionStyle(5)}>
          <DailyPhraseCard />

          {/* Подвал */}
          <View style={{ alignItems:'center', paddingVertical:32, marginTop:20, borderTopWidth:0.5, borderTopColor:t.border }}>
            <Text style={{ color:t.textMuted, fontSize:f.caption, fontWeight:'600', letterSpacing:0.5 }}>
              PHRASEMAN
            </Text>
            <Text style={{ color:t.textMuted, fontSize:f.caption, marginTop:4 }}>
              by Professor Lingman
            </Text>
            <View style={{ marginTop: 16 }}>
              <ReportErrorButton
                screen="home"
                dataId="home_main"
                dataText={triLang(lang, {
                  ru: 'Главный экран',
                  uk: 'Головний екран',
                  es: 'Pantalla de inicio',
                })}
              />
            </View>
          </View>
          </Animated.View>

      </ScrollView>
    );
  };

  const energyTTAnchor = energyTooltip.anchor;
  const energyFallbackTop =
    insets.top +
    20 +
    Math.round(f.caption * 2.2) +
    f.h1 +
    6 +
    24 +
    12;
  const energyTooltipTop =
    energyTTAnchor && energyTTAnchor.w > 0
      ? energyTTAnchor.y + Math.max(energyTTAnchor.h, 24) + 8
      : energyFallbackTop;
  const energyTooltipLeftRaw = energyTTAnchor && energyTTAnchor.w > 0 ? energyTTAnchor.x : 16;
  const energyTooltipLeftClamped = Math.min(
    SCREEN_W - ENERGY_TOOLTIP_W - 8,
    Math.max(8, energyTooltipLeftRaw),
  );
  const energyIconCenterX =
    energyTTAnchor && energyTTAnchor.w > 0
      ? energyTTAnchor.x + energyTTAnchor.w / 2
      : energyTooltipLeftClamped + 28;
  const energyArrowLeft = Math.min(
    ENERGY_TOOLTIP_W - 26,
    Math.max(12, Math.round(energyIconCenterX - energyTooltipLeftClamped - 7)),
  );

  return (
    <View testID="screen-home" style={{ flex:1 }}>
      <ScreenGradient>
      <View style={{ flex:1 }}>
      {renderNewHome()}

      </View>

      {/* Energy Tooltip — Modal чтобы не обрезался */}
      <Modal
        visible={energyTooltip.visible}
        transparent
        animationType="none"
        onRequestClose={() => setEnergyTooltip((p) => ({ ...p, visible: false }))}>
        <TouchableOpacity
          style={{ flex:1 }}
          activeOpacity={1}
          onPress={() => setEnergyTooltip((p) => ({ ...p, visible: false }))}>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: energyTooltipTop,
              left: energyTooltipLeftClamped,
              opacity: energyTooltipAnim,
              transform: [
                { translateY: energyTooltipAnim.interpolate({ inputRange:[0,1], outputRange:[-8,0] }) },
                { scale: energyTooltipAnim.interpolate({ inputRange:[0,1], outputRange:[0.88,1] }) },
              ],
            }}>
            <View style={{
              backgroundColor: '#1C1C1E',
              borderRadius: 16,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: t.gold + '66',
              width: ENERGY_TOOLTIP_W,
              shadowColor: '#000',
              shadowOpacity: 0.6,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 20,
            }}>
              <View style={{ position:'absolute', top:-7, left: energyArrowLeft, width:0, height:0, borderLeftWidth:7, borderRightWidth:7, borderBottomWidth:7, borderLeftColor:'transparent', borderRightColor:'transparent', borderBottomColor: t.gold+'66' }} />
              <View style={{ position:'absolute', top:-5.5, left: energyArrowLeft + 1, width:0, height:0, borderLeftWidth:6, borderRightWidth:6, borderBottomWidth:6, borderLeftColor:'transparent', borderRightColor:'transparent', borderBottomColor:'#1C1C1E' }} />

              {/* Для премиум-пользователей показываем сообщение о безлимитной энергии */}
              {energyUnlimited ? (
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <Text style={{ fontSize:16 }}>♾️</Text>
                  <Text style={{ color:'#FFFFFF', fontSize:13, fontWeight:'600', flex:1 }}>
                    {triLang(lang, {
                      ru: 'Энергия безлимитная',
                      uk: 'Енергія безлімітна',
                      es: 'Energía ilimitada',
                    })}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom: energyCount < energyMax ? 10 : 0 }}>
                    <Text style={{ fontSize:16 }}>⚡</Text>
                    <Text style={{ color:'#FFFFFF', fontSize:13, fontWeight:'600', flex:1 }}>
                      {`${energyCount}/${energyMax} · `}{triLang(lang, {
                        ru: '1 энергия каждые 30 минут',
                        uk: '1 енергія кожні 30 хвилин',
                        es: '+1 punto de energía cada 30 min',
                      })}
                    </Text>
                  </View>
                  {energyCount < energyMax && timeUntilNextEnergy ? (
                    <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#2C2C2E', borderRadius:10, paddingVertical:8, paddingHorizontal:12, marginBottom: getNextEnergyUnlockLevel(level) !== null ? 8 : 0 }}>
                      <Text style={{ color:'#8E8E93', fontSize:12 }}>
                        {triLang(lang, { ru: 'Через', uk: 'Через', es: 'En' })}
                      </Text>
                      <Text style={{ color: t.gold, fontSize:16, fontWeight:'800' }}>
                        {timeUntilNextEnergy}
                      </Text>
                    </View>
                  ) : null}
                  {getNextEnergyUnlockLevel(level) !== null && (
                    <Text style={{ color:'#8E8E93', fontSize:11, textAlign:'center', marginTop: energyCount >= energyMax ? 4 : 0 }}>
                      {triLang(lang, {
                        ru: `Следующий слот энергии на уровне ${getNextEnergyUnlockLevel(level)}`,
                        uk: `Наступний слот енергії на рівні ${getNextEnergyUnlockLevel(level)}`,
                        es: `Al alcanzar el nivel ${getNextEnergyUnlockLevel(level)}, tu energía máxima subirá`,
                      })}
                    </Text>
                  )}
                </>
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>


      </ScreenGradient>

      {/* ── Онбординг: подсветка иконок энергии (первый запуск) ── */}
      <Modal visible={energyOnboardingVisible} transparent animationType="none" onRequestClose={dismissEnergyOnboarding}>
        <Animated.View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.82)', opacity: energyOnboardingAnim }}>
          <TouchableOpacity activeOpacity={1} onPress={dismissEnergyOnboarding} style={{ flex:1 }}>

            {/* Иконки энергии — рендерим сами в правильном месте поверх оверлея */}
            {/* Позиция = safeArea.top + padding(20) + greeting(~18) + username(~34) + marginTop(6) */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: insets.top + 78,
                left: 20,
                transform: [{ scale: energyPulseAnim }],
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(245,166,35,0.15)',
                borderRadius: 10,
                paddingHorizontal: 6,
                paddingVertical: 4,
                borderWidth: 1.5,
                borderColor: '#F5A623',
              }}
            >
              {Array.from({ length: energyMax }).map((_, i) => (
                <View key={i} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                  <EnergyIcon
                    filled={i < energyCount}
                    themeColor={i < energyCount ? energyFilledColor : '#555'}
                    size={22}
                    animateChange={false}
                    shouldShake={false}
                    themeMode={themeMode}
                    tintColor={i < energyCount ? energyFilledTint : undefined}
                    isPremium={energyUnlimited}
                  />
                </View>
              ))}
            </Animated.View>

            {/* Стрелка вниз от иконок к карточке */}
            <View pointerEvents="none" style={{
              position:'absolute',
              top: insets.top + 78 + 36,
              left: 34,
              width: 0, height: 0,
              borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 8,
              borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#F5A623',
            }} />

            {/* Карточка объяснения */}
            <View style={{
              position: 'absolute',
              top: insets.top + 78 + 50,
              left: 16, right: 16,
              backgroundColor: '#1C1C1E', borderRadius: 16,
              paddingVertical: 18, paddingHorizontal: 20,
              borderWidth: 1, borderColor: '#F5A623',
              shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width:0, height:4 },
              elevation: 20,
            }}>
              <Text style={{ color:'#F5A623', fontSize:16, fontWeight:'800', marginBottom:10 }}>
                {triLang(lang, { ru: '⚡ Энергия', uk: '⚡ Енергія', es: '⚡ Energía' })}
              </Text>
              <Text style={{ color:'#FFFFFF', fontSize:14, lineHeight:21, marginBottom:6 }}>
                {triLang(lang, {
                  ru: '• Тратится при ошибках в упражнениях',
                  uk: '• Витрачається при помилках у вправах',
                  es: '• Se gasta si fallas en un ejercicio',
                })}
              </Text>
              <Text style={{ color:'#FFFFFF', fontSize:14, lineHeight:21, marginBottom:6 }}>
                {triLang(lang, {
                  ru: '• Восстанавливается по 1 единице каждые 30 минут',
                  uk: '• Відновлюється по 1 одиниці кожні 30 хвилин',
                  es: '• Recuperas 1 punto cada 30 min',
                })}
              </Text>
              <Text style={{ color:'#4FC3F7', fontSize:14, lineHeight:21, marginBottom:16 }}>
                {triLang(lang, {
                  ru: '• С Премиум — энергия не тратится ♾️',
                  uk: '• З Преміум — енергія не витрачається ♾️',
                  es: '• Con Premium no gastas energía ♾️',
                })}
              </Text>
              <TouchableOpacity
                onPress={dismissEnergyOnboarding}
                style={{ backgroundColor:'#F5A623', borderRadius:12, paddingVertical:11, alignItems:'center' }}
              >
                <Text style={{ color:'#000', fontWeight:'800', fontSize:15 }}>
                  {triLang(lang, { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido' })}
                </Text>
              </TouchableOpacity>
            </View>

          </TouchableOpacity>
        </Animated.View>
      </Modal>

      {/* Shards Earned Modal */}
      <ShardsEarnedModal
        visible={!!shardsEarnedModal}
        amount={shardsEarnedModal?.amount ?? 0}
        reason={shardsEarnedModal?.reason ?? ''}
        onClose={() => setShardsEarnedModal(null)}
      />

      {/* Streak Revive — окно 24ч после потери цепочки */}
      <StreakReviveModal
        visible={reviveModalVisible}
        offer={reviveOffer}
        onClose={() => {
          setReviveModalVisible(false);
        }}
        onRevived={(restored) => {
          setStreak(restored);
          setDisplayStreak(restored);
          setReviveOffer(null);
          // shardsBalance обновится через 'shards_balance_updated' слушатель ниже / следующий loadData.
          getShardsBalance().then(setShardsBalance).catch(() => {});
        }}
      />

      {/* Premium celebration: запускается после IAP / admin-grant. Pending консумируется на close. */}
      <PremiumCelebrationModal
        visible={celebrationVisible}
        onClose={() => {
          setCelebrationVisible(false);
          // Маркер: timestamp текущего момента (не критично; ключ в том что seen != pending).
          void consumeCelebration(String(Date.now()));
        }}
      />
      {pendingLeagueResult && (
        <LeagueResultModal
          visible={true}
          result={pendingLeagueResult}
          onClose={() => {
            const sig = JSON.stringify({
              prevLeagueId: pendingLeagueResult.prevLeagueId,
              newLeagueId: pendingLeagueResult.newLeagueId,
              myRank: pendingLeagueResult.myRank,
              totalInGroup: pendingLeagueResult.totalInGroup,
              promoted: pendingLeagueResult.promoted,
              demoted: pendingLeagueResult.demoted,
            });
            // Сначала ставим оба гарда СИНХРОННО (до любого await), чтобы
            // параллельно стартующий loadData не успел показать модалку заново.
            dismissedLeagueResultRef.current = sig;
            dismissedLeagueResultThisSessionRef.current = true;
            setPendingLeagueResult(null);
            // Очистку AsyncStorage делаем фоном — её результат на UI не влияет.
            void clearPendingResult();
          }}
        />
      )}
    </View>
  );
}
