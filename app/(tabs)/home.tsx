import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabSwipeLock } from '../tabSwipeLock';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Dimensions, Alert, Modal, AppState, DeviceEventEmitter, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { useRouter } from 'expo-router';
import { usePremium } from '../../components/PremiumContext';
import { useTabNav } from '../TabContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLang, getLeague } from '../../components/LangContext';
import ScreenGradient from '../../components/ScreenGradient';
import { clearPendingResult, loadLeagueState, loadPendingResult, LEAGUES, LeagueResult, clubTierShortName } from '../league_engine';
import LeagueResultModal from '../LeagueResultModal';
import { DebugLogger } from '../debug-logger';
import { getMyWeekPoints, checkStreakLossPending, getWeekKey } from '../hall_of_fame_utils';
import { isRepairEligible, getRepairProgress } from '../streak_repair';
import { getTodayTasks, loadTodayProgress, TaskProgress } from '../daily_tasks';
import { getXPProgress, getLevelFromXP, getNextEnergyUnlockLevel } from '../../constants/theme';
import { getTitleString } from '../../constants/titles';
import { lessonNamesForLang } from '../../constants/lessons';
import { GREETINGS_ES } from '../../constants/greetings_es';
import { triLang } from '../../constants/i18n';
import { BRAND_SHARDS_ES } from '../../constants/terms_es';
import { DEV_MODE } from '../config';
import PremiumCard from '../../components/PremiumCard';
import { hapticTap } from '../../hooks/use-haptics';
import CircularProgress from '../../components/CircularProgress';
import AnimatedFrame from '../../components/AnimatedFrame';
import { getBestAvatarForLevel, getBestFrameForLevel, getAvatarImageByIndex } from '../../constants/avatars';
import LevelBadge from '../../components/LevelBadge';
import EnergyIcon from '../../components/EnergyIcon';
import { loadAllMedals, countMedals } from '../medal_utils';
// [SRS] getDueItems() возвращает фразы из active_recall_items,
// у которых nextDue <= конец сегодняшнего дня (по SM-2 алгоритму).
// Используется только для получения количества — сами карточки рендерит review.tsx.
import { getDueItems, SESSION_LIMIT } from '../active_recall';
import { getCurrentMultiplier } from '../xp_manager';
import DailyPhraseCard from '../../components/DailyPhraseCard';
import SaveProgressBanner from '../../components/SaveProgressBanner';
import PremiumGoldUserName from '../../components/PremiumGoldUserName';
import { useEnergy } from '../../components/EnergyContext';
import { getShardsBalance, spendShards, onStreakUpdated } from '../shards_system';
import ShardsEarnedModal from '../../components/ShardsEarnedModal';
import { logFeatureOpened } from '../firebase';
import { trackFeatureOpened } from '../user_stats';
import { useArenaRank } from '../../hooks/use-arena-rank';
import { perfMark, perfScreenMount, perfNavStart } from '../perf-monitor';
import {
  getDeferEnergyOnboardingForPostOnboardingFirstLesson,
  tryClearAfterOnboardingFirstLessonReturn,
} from '../energyOnboardingGate';
import { onAppEvent } from '../events';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
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

export default function HomeScreen() {
  const router = useRouter();
  const { theme: t, isDark, f, themeMode } = useTheme();
  const { s, lang } = useLang();
  const insets = useSafeAreaInsets();
  const { goToTab, activeIdx, focusTick } = useTabNav();
  const arenaRank = useArenaRank();

  const [userName, setUserName]     = useState('');
  const [streak, setStreak]         = useState(0);
  const [displayStreak, setDisplayStreak] = useState(0);
  const streakScaleAnim = useRef(new Animated.Value(1)).current;
  const [totalXP, setTotalXP]       = useState(0);
  const [homeStatsReady, setHomeStatsReady] = useState(homeStatsLoadedOnce);
  const level = getLevelFromXP(totalXP);
  const [weekDone, setWeekDone]     = useState<boolean[]>(new Array(7).fill(false));
  const [weekPoints, setWeekPoints] = useState(0);
  const [lessonsCompleted, setLessons] = useState(0);
  const [lastLesson, setLastLesson] = useState<{id:number;name:string;progress:number;score:string}|null>(null);
  // Початкове значення підбираємо за поточною мовою інтерфейсу,
  // щоб юзер з UK не бачив миготливе російське «Привет,» до завантаження `loadData`.
  const [greeting, setGreeting]     = useState(() => triLang(lang, { ru: 'Привет,', uk: 'Привіт,', es: 'Hola,' }));
  const [taskProgress, setTaskProgress] = useState<TaskProgress[]>([]);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [engineLeague, setEngineLeague] = useState<typeof LEAGUES[0] | null>(null);
  const { isPremium } = usePremium();
  // [SRS] Количество фраз, готовых к повторению сегодня.
  // 0 = карточка «Повторить сегодня» скрыта (не мешает новым пользователям).
  // >0 = карточка появляется над блоком «Тест/Экзамен» и ведёт на /review.
  const [dueCount, setDueCount] = useState(0);
  const [userAvatar, setUserAvatar] = useState('🐣');
  const [userFrame, setUserFrame]   = useState('plain');
  // Бонусные баннеры
  const [loginBonus, setLoginBonus]     = useState<{ xp: number; cycle: number } | null>(null);
  const [showComebackBanner, setComebackBanner] = useState(false);
  const [showRepairCard, setShowRepairCard] = useState(false);
  const [repairProgress, setRepairProgress] = useState(0);
  const [freezeActive, setFreezeActive] = useState(false);
  const [streakAtRisk, setStreakAtRisk] = useState(false);
  const [premiumFreezeUsed, setPremiumFreezeUsed] = useState(false);
  const [pageScrollEnabled, setPageScrollEnabled] = useState(true);
  const [medalCounts, setMedalCounts] = useState({ bronze: 0, silver: 0, gold: 0 });
  const [totalXPMulti, setTotalXPMulti] = useState(1);
  const { energy: energyCount, bonusEnergy: energyBonus, maxEnergy: energyMax, formattedTime: timeUntilNextEnergy, isUnlimited: energyUnlimited } = useEnergy();
  const BONUS_ENERGY_COLOR = '#FFD700';
  const PREMIUM_BLUE = '#4FC3F7';
  const isLightTheme = themeMode === 'ocean' || themeMode === 'sakura';
  const premiumEnergyTint = energyUnlimited ? (isLightTheme ? '#004F8C' : PREMIUM_BLUE) : undefined;
  const energyFilledTint = premiumEnergyTint;
  const energyFilledColor = energyUnlimited ? (isLightTheme ? '#004F8C' : PREMIUM_BLUE) : t.gold;
  const [energyTooltipVisible, setEnergyTooltipVisible] = useState(false);
  const energyTooltipAnim = useRef(new Animated.Value(0)).current;
  const energyTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [energyOnboardingVisible, setEnergyOnboardingVisible] = useState(false);
  const energyOnboardingAnim = useRef(new Animated.Value(0)).current;
  const energyPulseAnim = useRef(new Animated.Value(1)).current;
  const energyPulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const energyIconRef = useRef<View>(null);
  const [energySpotlight, setEnergySpotlight] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const mountedRef = useRef(true);
  const [shardsBalance, setShardsBalance] = useState(0);
  const shardsAnim = useRef(new Animated.Value(1)).current;
  const shardsBonusAnim = useRef(new Animated.Value(0)).current;
  const [shardsBonusText, setShardsBonusText] = useState('');
  const [shardsEarnedModal, setShardsEarnedModal] = useState<{ amount: number; reason: string } | null>(null);
  const streakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingLeagueResult, setPendingLeagueResult] = useState<LeagueResult | null>(null);
  const dismissedLeagueResultRef = useRef<string | null>(null);
  const [bugHuntVisible, setBugHuntVisible] = useState(false);
  const bugHuntAnim = useRef(new Animated.Value(0)).current;

  const dismissBugHunt = () => {
    Animated.timing(bugHuntAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setBugHuntVisible(false));
    AsyncStorage.setItem('bug_hunt_shown', '1').catch(() => {});
  };

  const dismissEnergyOnboarding = () => {
    energyPulseLoop.current?.stop();
    Animated.timing(energyOnboardingAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setEnergyOnboardingVisible(false);
    });
    AsyncStorage.setItem('energy_onboarding_shown', '1').catch(() => {});
  };

  const showEnergyTooltip = () => {
    hapticTap();
    const openTooltip = () => {
      if (energyTooltipTimer.current) clearTimeout(energyTooltipTimer.current);
      setEnergyTooltipVisible(true);
      energyTooltipAnim.setValue(0);
      Animated.spring(energyTooltipAnim, { toValue: 1, useNativeDriver: false, tension: 120, friction: 8 }).start();
      energyTooltipTimer.current = setTimeout(() => {
        Animated.timing(energyTooltipAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start(() => {
          setEnergyTooltipVisible(false);
        });
      }, 3000);
    };

    if (energyIconRef.current) {
      energyIconRef.current.measureInWindow((px, py, width, height) => {
        if (width > 0) {
          setEnergySpotlight({ x: px, y: py, w: width, h: Math.max(height, 24) });
        }
        openTooltip();
      });
      return;
    }
    openTooltip();
  };

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const diagChecked = true;

  // ── Анимация "карточки летят в раздел" ──────────────────────────────────────
  const cardsIconScaleAnim = useRef(new Animated.Value(1)).current;
  const cardsBadgeOpacity  = useRef(new Animated.Value(0)).current;
  const cardsBadgeScale    = useRef(new Animated.Value(0)).current;
  const [newCardsCount, setNewCardsCount]       = useState(0);
  const [displayCardsCount, setDisplayCardsCount] = useState(0);

  useEffect(() => {
    if (newCardsCount <= 0) return;
    setDisplayCardsCount(newCardsCount);
    cardsBadgeOpacity.setValue(1);
    cardsBadgeScale.setValue(0);
    Animated.spring(cardsBadgeScale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 200 }).start();
    let current = newCardsCount;
    const step = () => {
      if (!mountedRef.current) return;
      if (current <= 0) {
        Animated.timing(cardsBadgeOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setNewCardsCount(0));
        return;
      }
      current--;
      setDisplayCardsCount(current);
      Animated.sequence([
        Animated.spring(cardsIconScaleAnim, { toValue: 1.35, useNativeDriver: true, friction: 3, tension: 250 }),
        Animated.spring(cardsIconScaleAnim, { toValue: 1,    useNativeDriver: true, friction: 5, tension: 180 }),
      ]).start();
      setTimeout(step, 220);
    };
    setTimeout(step, 400);
  }, [newCardsCount]);

  // Пульсирующая анимация для карточки "Повторить сегодня"
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (dueCount > 0) {
      pulseAnim.setValue(1);
      Animated.sequence([
        Animated.spring(pulseAnim, { toValue: 1.04, useNativeDriver: true, friction: 4, tension: 200 }),
        Animated.spring(pulseAnim, { toValue: 1,    useNativeDriver: true, friction: 6, tension: 180 }),
      ]).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [dueCount]);

  // Staggered секции: 0=header, 1=hero, 2=lesson, 3=quick, 4=grid, 5=phrase
  const S_COUNT = 6;
  const sectionOpacity = useRef(Array.from({ length: S_COUNT }, () => new Animated.Value(0))).current;
  const sectionSlide   = useRef(Array.from({ length: S_COUNT }, () => new Animated.Value(18))).current;

  const runSessionEntrance = () => {
    sectionOpacity.forEach(v => v.setValue(0));
    sectionSlide.forEach(v => v.setValue(18));
    Animated.stagger(
      75,
      sectionOpacity.map((opac, i) =>
        Animated.parallel([
          Animated.timing(opac, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.spring(sectionSlide[i], { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
        ])
      )
    ).start();
  };

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
    const deadline = new Date('2026-05-21T23:59:59').getTime();
    if (Date.now() > deadline) return;
    const t = setTimeout(async () => {
      const [energyShown, bugHuntShown] = await Promise.all([
        AsyncStorage.getItem('energy_onboarding_shown'),
        AsyncStorage.getItem('bug_hunt_shown'),
      ]).catch(() => ['1', '1']);
      if (energyShown && !bugHuntShown) {
        setBugHuntVisible(true);
        Animated.timing(bugHuntAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    perfScreenMount('home');
    runSessionEntrance();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadData();
        runSessionEntrance();
      }
    });
    // Слушаем событие изменения XP (от тестеров и других экранов)
    const xpSub = DeviceEventEmitter.addListener('xp_changed', () => { loadData(); });
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
    return () => {
      mountedRef.current = false;
      sub.remove();
      xpSub.remove();
      shardsSub.remove();
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


  const loadData = async () => {
    if (loadingRef.current) { needsReloadRef.current = true; return; }
    loadingRef.current = true;
    needsReloadRef.current = false;
    const endPerf = perfMark('home:loadData');
    try {
      const [name, streakVal, weekData, weekPts, xpStored] = await Promise.all([
        AsyncStorage.getItem('user_name'),
        AsyncStorage.getItem('streak_count'),
        AsyncStorage.getItem('week_days_done'),
        getMyWeekPoints(),
        AsyncStorage.getItem('user_total_xp'),
      ]);
      getShardsBalance().then(setShardsBalance);
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
            if (earnedAmount > 0) DeviceEventEmitter.emit('shards_earned', { amount: earnedAmount });
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
        const savedFr = await AsyncStorage.getItem('user_frame');
        setUserAvatar(getBestAvatarForLevel(curLvl));
        setUserFrame(savedFr  || getBestFrameForLevel(curLvl).id);
      }
      if (weekData) setWeekDone(JSON.parse(weekData));
      setWeekPoints(weekPts);

      const pool = lang === 'uk' ? GREETINGS_UK : lang === 'es' ? GREETINGS_ES : GREETINGS_RU;
      if (pool.length > 0) {
        setGreeting(pool[Math.floor(Math.random() * pool.length)]);
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
      setLessons(done);

      const lastLessonId = await AsyncStorage.getItem('last_opened_lesson');
      const lastId = lastLessonId ? parseInt(lastLessonId) : null;
      if (lastId && lastId >= 1 && lastId <= 32) {
        const lessonNames = lessonNamesForLang(lang);
        const saved = await AsyncStorage.getItem(`lesson${lastId}_progress`);
        if (saved) {
          const p: string[] = JSON.parse(saved);
          const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          setLastLesson({ id: lastId, name: lessonNames[lastId - 1], progress: correct, score: (correct / 50 * 5).toFixed(1) });
        } else {
          setLastLesson({ id: lastId, name: lessonNames[lastId - 1], progress: 0, score: '0.0' });
        }
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
      if (mountedRef.current) setHomeStatsReady(true);

      const [tp, leagueState, leaguePending, dueItems, allMedals, repairEligible, bonusRaw, comebackRaw, pbRaw] = await Promise.all([
        loadTodayProgress(),
        loadLeagueState(),
        loadPendingResult(),
        getDueItems(SESSION_LIMIT),
        loadAllMedals(),
        isRepairEligible(),
        AsyncStorage.getItem('login_bonus_pending'),
        AsyncStorage.getItem('comeback_pending'),
        AsyncStorage.getItem('weekly_pb_v1'),
      ]);
      setTaskProgress(tp);
      setTasksCompleted(tp.filter(p => p.claimed).length);

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
        if (dismissedLeagueResultRef.current === pendingSig) {
          await clearPendingResult();
        } else {
          setPendingLeagueResult(leaguePending);
        }
      }

// [SRS] Ліміт SESSION_LIMIT — не перегружаємо користувача в бейджі на головній
      setDueCount(dueItems.length);
      setMedalCounts(countMedals(allMedals));

      if (activeIdx === 0) {
        const pendingCards = await AsyncStorage.getItem('flashcard_anim_pending');
        if (pendingCards && parseInt(pendingCards, 10) > 0) {
          await AsyncStorage.removeItem('flashcard_anim_pending');
          setNewCardsCount(parseInt(pendingCards, 10));
        }
      }

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

      // [STREAK PAYWALL / FREEZE] Проверяем угрозу стрику для всех пользователей.
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
        Alert.alert(
          triLang(lang, {
            ru: 'Недостаточно осколков',
            uk: 'Недостатньо осколків',
            es: `No tienes suficientes ${BRAND_SHARDS_ES}`,
          }),
          triLang(lang, {
            ru: `Заморозка стоит ${FREEZE_COST_SHARDS} 💎. У тебя ${shardsBalance} 💎.`,
            uk: `Заморозка коштує ${FREEZE_COST_SHARDS} 💎. У тебе ${shardsBalance} 💎.`,
            es: `Congelar la racha cuesta ${FREEZE_COST_SHARDS} 💎 · Tienes ${shardsBalance} 💎`,
          })
        );
        return;
      }
      setShardsBalance(prev => Math.max(0, prev - FREEZE_COST_SHARDS));
    }

    await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: today }));
    setFreezeActive(true);
    setStreakAtRisk(false);
  };

const league = getLeague(weekPoints, lang);
  const leagueFromEngine = LEAGUES.find(l =>
    l.nameRU === league.name || l.nameUK === league.name || l.nameES === league.name
  ) ?? LEAGUES[0];

  const weekDays =
    lang === 'uk'
      ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
      : lang === 'es'
        ? ['L', 'M', 'X', 'J', 'V', 'S', 'D']
        : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const todayIdx = (new Date().getDay() + 6) % 7;

  /** Индексы табов: 0 home, 1 lessons, 2 arena, 3 settings — см. app/(tabs)/_layout.tsx */
  const TAB_IDX: Record<string, number> = {
    '/(tabs)/index': 1,
    index: 1,
    '/(tabs)/arena': 2,
    arena: 2,
    '/(tabs)/settings': 3,
    settings: 3,
  };
  const go = (path: string) => {
    hapticTap();
    if (!DEV_MODE && !isPremium && path.includes('hall_of_fame')) {
      router.push({ pathname: '/premium_modal', params: { context: 'hall_of_fame' } } as any); return;
    }

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
                  ru: 'Почини стрик!',
                  uk: 'Полагодь стрік!',
                  es: '¡Recupera tu racha!',
                })
              }</Text>
              <Text style={{ color:t.textMuted, fontSize:f.sub, marginTop:2 }}>{
                triLang(lang, {
                  ru: `Пройди 1 урок сегодня, чтобы сохранить стрик · ${repairProgress}/1`,
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
      lesson:    themeMode === 'minimalLight' ? require('../../assets/images/levels/lesson grafit.png')
               : themeMode === 'minimalDark' ? require('../../assets/images/levels/lesson fog.png')
               : themeMode === 'ocean'  ? require('../../assets/images/levels/lesson ocean.png')
               : themeMode === 'sakura' ? require('../../assets/images/levels/lesson sacura.png')
               : themeMode === 'gold'   ? require('../../assets/images/levels/lesson coral.png')
               : themeMode === 'neon'   ? require('../../assets/images/levels/lesson neon.png')
               :                          require('../../assets/images/levels/lesson forest.png'),
      quizes:    themeMode === 'minimalLight' ? require('../../assets/images/levels/quizes grafit.png')
               : themeMode === 'minimalDark' ? require('../../assets/images/levels/quizes fog.png')
               : themeMode === 'ocean'  ? require('../../assets/images/levels/quizes ocean.png')
               : themeMode === 'sakura' ? require('../../assets/images/levels/quizes sacura.png')
               : themeMode === 'gold'   ? require('../../assets/images/levels/quizes coral.png')
               : themeMode === 'neon'   ? require('../../assets/images/levels/quizes neon.png')
               :                          require('../../assets/images/levels/quizes forest.png'),
      cards:     themeMode === 'minimalLight' ? require('../../assets/images/levels/cards grafit.png')
               : themeMode === 'minimalDark' ? require('../../assets/images/levels/cards fog.png')
               : themeMode === 'ocean'  ? require('../../assets/images/levels/cards ocean.png')
               : themeMode === 'sakura' ? require('../../assets/images/levels/cards sacura.png')
               : themeMode === 'gold'   ? require('../../assets/images/levels/cards coral.png')
               : themeMode === 'neon'   ? require('../../assets/images/levels/cards neon.png')
               :                          require('../../assets/images/levels/cards forest.png'),
      shop:      themeMode === 'minimalLight' ? require('../../assets/images/levels/shop grafit.png')
               : themeMode === 'minimalDark' ? require('../../assets/images/levels/shop fog.png')
               : themeMode === 'ocean'  ? require('../../assets/images/levels/SHOP OCEAN.png')
               : themeMode === 'sakura' ? require('../../assets/images/levels/SHOP SAKURA.png')
               : themeMode === 'gold'   ? require('../../assets/images/levels/SHOP CORAL.png')
               : themeMode === 'neon'   ? require('../../assets/images/levels/SHOP NEON.png')
               :                          require('../../assets/images/levels/SHOP FOREST.png'),
      dayTasks:  themeMode === 'minimalLight' ? require('../../assets/images/levels/dayli task grafit.png')
               : themeMode === 'minimalDark' ? require('../../assets/images/levels/day tasks fog.png')
               : themeMode === 'ocean'  ? require('../../assets/images/levels/day tasks ocean.png')
               : themeMode === 'sakura' ? require('../../assets/images/levels/day tasks sacura.png')
               : themeMode === 'gold'   ? require('../../assets/images/levels/day tasks coral.png')
               : themeMode === 'neon'   ? require('../../assets/images/levels/day tasks neon.png')
               :                          require('../../assets/images/levels/day tasks forest.png'),
      test:      themeMode === 'minimalLight' ? require('../../assets/images/levels/test grafit.png')
               : themeMode === 'minimalDark' ? require('../../assets/images/levels/test fog.png')
               : themeMode === 'ocean'  ? require('../../assets/images/levels/test ocean.png')
               : themeMode === 'sakura' ? require('../../assets/images/levels/test sacura.png')
               : themeMode === 'gold'   ? require('../../assets/images/levels/test coral.png')
               : themeMode === 'neon'   ? require('../../assets/images/levels/test neon.png')
               :                          require('../../assets/images/levels/test forest.png'),
      exam:      themeMode === 'minimalLight' ? require('../../assets/images/levels/exam grafit.png')
               : themeMode === 'minimalDark' ? require('../../assets/images/levels/exam fog.png')
               : themeMode === 'ocean'  ? require('../../assets/images/levels/exam ocean.png')
               : themeMode === 'sakura' ? require('../../assets/images/levels/exam sacura.png')
               : themeMode === 'gold'   ? require('../../assets/images/levels/exam coral.png')
               : themeMode === 'neon'   ? require('../../assets/images/levels/exam neon.png')
               :                          require('../../assets/images/levels/examen forest.png'),
      arena:     themeMode === 'minimalLight' ? require('../../assets/images/levels/arena grafit.png')
               : themeMode === 'minimalDark' ? require('../../assets/images/levels/arena fog.png')
               : themeMode === 'ocean'  ? require('../../assets/images/levels/ARENA OCEAN.png')
               : themeMode === 'sakura' ? require('../../assets/images/levels/ARENA SAKURA.png')
               : themeMode === 'gold'   ? require('../../assets/images/levels/ARENA CORAL.png')
               : themeMode === 'neon'   ? require('../../assets/images/levels/ARENA NEON.png')
               :                          require('../../assets/images/levels/ARENA FOREST.png'),
    };
    const quickItems = [
      { img: menuImages.lesson,   label: s.tabs.lessons,       sub: triLang(lang, { ru: '32 урока', uk: '32 уроки', es: '32 lecciones' }),           path:'index' },
      { img: menuImages.quizes,   label: s.tabs.quizzes,      sub: triLang(lang, { ru: '3 уровня', uk: '3 рівні', es: '3 niveles de dificultad' }),            path:'/quizzes_screen' },
      { img: menuImages.cards,    label: triLang(lang, { ru: 'Карточки', uk: 'Картки', es: 'Tarjetas' }),   sub: triLang(lang, { ru: 'Сохранённые', uk: 'Збережені', es: 'Guardadas' }), path:'/flashcards' },
    ];
    // Порядок: Задания | Клуб / Тест знаний | Экзамен
    const gridItems = [
      {
        img: menuImages.dayTasks, iconName:'flash' as const, iconColor:t.accent,
        label: triLang(lang, { ru: 'Задания', uk: 'Завдання', es: 'Tareas de hoy' }),
        path:'/daily_tasks_screen',
        isTasksBlock: true,
      },
      {
        iconName:(isPremium ? (engineLeague?.ionIcon ?? leagueFromEngine.ionIcon ?? 'trophy') : 'lock-closed') as any,
        iconColor: isPremium ? (engineLeague?.color ?? leagueFromEngine.color ?? '#FFD700') : t.textMuted,
        label: triLang(lang, { ru: 'Лига', uk: 'Ліга', es: 'Liga' }),
        sub: isPremium
          ? (engineLeague ? clubTierShortName(engineLeague, lang) : league.name)
          : triLang(lang, { ru: 'Премиум клубы', uk: 'Преміум клуби', es: 'Clubes Premium' }),
        path: '/league_screen',
        pct: null,
        isClub: true,
      },
      {
        img: menuImages.shop, iconName:'diamond' as const, iconColor:t.textSecond,
        label: triLang(lang, { ru: 'Магазин', uk: 'Магазин', es: 'Tienda' }),
        sub: triLang(lang, { ru: 'Осколки', uk: 'Осколки', es: BRAND_SHARDS_ES }),
        path:'/shards_shop',
        pct: null,
      },
      {
        img: themeMode === 'minimalLight' ? require('../../assets/images/levels/her man grafit.png') : themeMode === 'minimalDark' ? require('../../assets/images/levels/her man fog.png') : themeMode === 'ocean' ? require('../../assets/images/levels/hero map ocean.png') : themeMode === 'sakura' ? require('../../assets/images/levels/hero map sacura.png') : themeMode === 'gold' ? require('../../assets/images/levels/hero map coarl.png') : themeMode === 'neon' ? require('../../assets/images/levels/hero man neon.png') : require('../../assets/images/levels/her man foret.png'),
        iconName:'map' as const, iconColor:t.textSecond,
        label: triLang(lang, { ru: 'Карта уровней', uk: 'Карта рівнів', es: 'Mapa de niveles' }),
        sub: triLang(lang, { ru: 'Карта уровней', uk: 'Карта рівнів', es: 'Progreso y recompensas' }),
        path:'/progress_map',
        pct: null,
      },
      {
        img: menuImages.test, iconName:'analytics' as const, iconColor:t.textSecond,
        label: s.home.testBtn,
        sub: s.home.testSub,
        path:'/diagnostic_test',
        pct: null,
      },
      {
        img: menuImages.exam, iconName:'school' as const, iconColor:t.correct,
        label: s.home.examBtn,
        sub:`${lessonsCompleted}/32 ${triLang(lang, { ru: 'уроков', uk: 'уроків', es: 'lecciones' })}`,
        path:'/exam',
        pct: lessonsCompleted/32,
      },
    ];
    const themedClubIcon =
      themeMode === 'minimalLight' ? require('../../assets/images/levels/club base grafit.png') :
      themeMode === 'minimalDark' ? require('../../assets/images/levels/club base fog.png') :
      themeMode === 'ocean'  ? require('../../assets/images/levels/club base ocean.png') :
      themeMode === 'sakura' ? require('../../assets/images/levels/club base sacura.png') :
      themeMode === 'gold'   ? require('../../assets/images/levels/club base corak.png') :
      themeMode === 'neon'   ? require('../../assets/images/levels/club base neon.png') :
                               require('../../assets/images/levels/club icon base forest.png');

    return (
      <ScrollView scrollEnabled={pageScrollEnabled} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:32, paddingTop:6 }}>

          {/* ХЕДЕР */}
          <Animated.View style={sectionStyle(0)}>
          <View style={{ flexDirection:'row', alignItems:'flex-start', padding:20, paddingBottom:12, gap:8 }}>
            <View style={{ flex:1 }}>
              <Text style={{ color:t.textMuted, fontSize:f.caption }}>{greeting}</Text>
              {isPremium ? (
                <PremiumGoldUserName text={userName || '...'} fontSize={f.h1} />
              ) : (
                <Text style={{ color:t.textPrimary, fontSize:f.h1, fontWeight:'700', marginTop:2 }}>{userName||'...'}</Text>
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
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={showEnergyTooltip}
                  style={{ flexDirection:'row', alignItems:'center', gap:4, flexShrink: 1 }}
                >
                  <View ref={energyIconRef} collapsable={false} style={{ flexDirection:'row', alignItems:'center' }}>
                    {Array.from({ length: energyMax }).map((_, i) => (
                      <View key={i} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                        <EnergyIcon
                          filled={i < energyCount}
                          themeColor={i < energyCount ? energyFilledColor : t.textGhost}
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
                    <Text style={{ fontSize: f.label, color: t.textMuted, fontWeight: '500', marginLeft: 6 }}>
                      {`+1 ${triLang(lang, { ru: 'через', uk: 'через', es: 'en' })} ${timeUntilNextEnergy}`}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    hapticTap();
                    router.push('/shards_shop');
                  }}
                  style={{ flexDirection:'row', alignItems:'center', gap:4 }}
                >
                  <Animated.View style={{ transform:[{scale:shardsAnim}], flexDirection:'row', alignItems:'center', gap:3 }}>
                    <Image source={require('../../assets/images/levels/OSKOLOK.png')} style={{ width:22, height:22 }} resizeMode="contain" />
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
          <TouchableOpacity activeOpacity={0.88} onPress={()=>{ hapticTap(); router.push('/streak_stats'); }} style={{ marginHorizontal:16, marginBottom:12 }}>
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
                    <LevelBadge level={level} size={44} />
                    <View style={{ flex:1 }}>
                      <Text style={{ color:t.textPrimary, fontSize:22, fontWeight:'800', lineHeight:26 }} numberOfLines={1}>{triLang(lang, { ru: 'Уровень', uk: 'Рівень', es: 'Nivel' })} {level}</Text>
                      <Text style={{ color:t.gold, fontSize:13, fontWeight:'600', marginTop:2 }} numberOfLines={1}>{getTitleString(level, lang)}</Text>
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
                    <View style={{ backgroundColor:t.gold+'22', borderRadius:8, paddingHorizontal:6, paddingVertical:2, borderWidth:1, borderColor:t.gold+'55' }}>
                      <Text style={{ color:t.gold, fontSize:11, fontWeight:'700' }}>+{Math.round((totalXPMulti-1)*100)}% XP</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Точки недели — крупнее */}
              <View style={{ flexDirection:'row', justifyContent:'space-between', paddingHorizontal:4 }}>
                {weekDays.map((d,i)=>(
                  <View key={i} style={{ alignItems:'center', gap:6 }}>
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: weekDone[i] ? t.correct : (i===todayIdx ? t.textPrimary+'66' : t.bgSurface2),
                      borderWidth: i===todayIdx && !weekDone[i] ? 2 : 0,
                      borderColor: t.textPrimary,
                    }} />
                    <Text style={{ color: weekDone[i] ? t.textPrimary : t.textMuted, fontSize:12, fontWeight:'600' }}>{d}</Text>
                  </View>
                ))}
              </View>
              </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          </Animated.View>

          {/* ПРОДОЛЖИТЬ УРОК + ЗАМОРОЗКА */}
          <Animated.View style={sectionStyle(2)}>
          {/* ЗАМОРОЗКА СТРИКА — для всех когда стрик под угрозой */}
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
                    ru: `Стрик ${streak} дней под угрозой`,
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
          <PremiumCard
            level={3}
            onPress={()=>router.push({ pathname:'/lesson_menu', params:{ id:lastLesson?.id??1 } })}
            style={{ marginHorizontal:16, marginBottom:12 }}
            innerStyle={{ padding:16, flexDirection:'row', alignItems:'center', gap:14 }}
          >
            <CircularProgress
              pct={lastLesson?Math.round(lastLesson.progress/50*100):0}
              size={52} sw={5} color={t.accent} bg={t.bgSurface}
              textColor={t.textPrimary} fontSize={10}
            />
            <View style={{ flex:1 }}>
              <Text style={{ color:t.textMuted, fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.6 }}>
                {lastLesson ? s.home.continueBtn : s.home.startBtn}
              </Text>
              <Text style={{ color:t.textPrimary, fontSize:f.bodyLg, fontWeight:'700', marginTop:3 }}>
                {lastLesson
                  ? `${triLang(lang, { ru: 'Урок', uk: 'Урок', es: 'Lección' })} ${lastLesson.id} — ${lessonNamesForLang(lang)[lastLesson.id - 1] ?? lastLesson.name}`
                  : `${triLang(lang, { ru: 'Урок', uk: 'Урок', es: 'Lección' })} 1 — To Be`}
              </Text>
              {lastLesson && <Text style={{ color:t.textMuted, fontSize:f.label, marginTop:2 }}>★ {lastLesson.score} · {lastLesson.progress}/50</Text>}
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.textGhost} />
          </PremiumCard>
          </Animated.View>

          {/* Persistent баннер "Сохрани прогресс" — для незалогиненных юзеров с XP ≥ 1000.
              Сам решает показываться или нет (см. SaveProgressBanner.tsx). */}
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <SaveProgressBanner />
          </View>

          {/* БЫСТРЫЙ ДОСТУП: 3 равных слота без горизонтального скролла */}
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
                    <Animated.View style={item.path === '/flashcards' ? { transform:[{scale:cardsIconScaleAnim}] } : undefined}>
                      {item.img
                        ? <Image source={item.img} style={{ width: 62, height: 62 }} contentFit="contain" cachePolicy="memory-disk" />
                        : <View style={{ width: 62, height: 62, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: f.numLg + 4 }}>🗺️</Text></View>
                      }
                    </Animated.View>
                    {item.path === '/flashcards' && newCardsCount > 0 && (
                      <Animated.View style={{
                        position: 'absolute', top: -6, right: -8,
                        backgroundColor: t.accent, borderRadius: 12,
                        minWidth: 22, height: 22, paddingHorizontal: 5,
                        justifyContent: 'center', alignItems: 'center',
                        opacity: cardsBadgeOpacity,
                        transform: [{ scale: cardsBadgeScale }],
                      }}>
                        <Text style={{ color: t.bgPrimary, fontSize: f.label, fontWeight: '800' }}>
                          {displayCardsCount > 0 ? `+${displayCardsCount}` : '✓'}
                        </Text>
                      </Animated.View>
                    )}
                  </View>
                  <Text style={{ color:t.textPrimary, fontSize:f.label, fontWeight:'700', textAlign:'center' }} numberOfLines={1}>{item.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
          </View>
          </View>
          </Animated.View>

          {/* SRS ПОВТОРЕНИЕ + СЕТКА */}
          <Animated.View style={sectionStyle(4)}>

          {/* ДУЭЛЬ */}
          <View style={{ paddingHorizontal:16, marginBottom:12 }}>
            <TouchableOpacity activeOpacity={0.85} onPress={()=>{ hapticTap(); goToTab(2); }}
              style={{ borderRadius:16, borderWidth:0.5, borderColor:t.border, overflow:'hidden' }}
            >
              <LinearGradient colors={t.cardGradient} start={{x:0,y:0}} end={{x:1,y:1}}
                style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:12, borderRadius:16, padding:14 }}
              >
                <Image source={menuImages.arena} style={{ width:52, height:52 }} resizeMode="contain" />
                <Text style={{ color:t.textPrimary, fontSize:f.h2, fontWeight:'700' }}>
                  {triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena' })}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* SRS ПОВТОРЕНИЕ — только если есть карточки */}
          {dueCount > 0 && (
            <Animated.View style={{ paddingHorizontal:16, marginBottom:12, transform:[{scale:pulseAnim}] }}>
              <TouchableOpacity activeOpacity={0.85} onPress={()=>{ hapticTap(); router.push('/review'); }}
                style={{ borderRadius:16, borderWidth:0.5, borderColor:t.border, overflow:'hidden' }}
              >
                <LinearGradient colors={t.cardGradient} start={{x:0,y:0}} end={{x:1,y:1}} style={{ flexDirection:'row', alignItems:'center', gap:12, borderRadius:16, padding:14 }}>
                <View style={{ width:44, height:44, borderRadius:12, backgroundColor:'transparent', justifyContent:'center', alignItems:'center' }}>
                  <Image source={themeMode === 'minimalLight' ? require('../../assets/images/levels/active recall grafit.png') : themeMode === 'minimalDark' ? require('../../assets/images/levels/active recall fog.png') : themeMode === 'ocean' ? require('../../assets/images/levels/active recall ocean.png') : themeMode === 'sakura' ? require('../../assets/images/levels/active recall sacura.png') : themeMode === 'gold' ? require('../../assets/images/levels/active recall coral.png') : themeMode === 'neon' ? require('../../assets/images/levels/active recall neon.png') : require('../../assets/images/levels/active recall forest.png')} style={{ width:44, height:44 }} contentFit="contain" cachePolicy="memory-disk" />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'700' }}>{
                    triLang(lang, {
                      ru: 'Повторить сегодня',
                      uk: 'Повторити сьогодні',
                      es: 'Repasar hoy',
                    })
                  }</Text>
                  <Text style={{ color:t.textSecond, fontSize:f.label, marginTop:1 }}>
                    {dueCount}{' '}
                    {lang === 'es'
                      ? (dueCount === 1 ? 'frase' : 'frases')
                      : lang === 'uk'
                        ? (dueCount === 1 ? 'фраза' : dueCount < 5 ? 'фрази' : 'фраз')
                        : (dueCount === 1 ? 'фраза' : dueCount < 5 ? 'фразы' : 'фраз')}
                  </Text>
                </View>
                <View style={{ backgroundColor:t.accent, borderRadius:14, paddingHorizontal:10, paddingVertical:5 }}>
                  <Text style={{ color:t.bgPrimary, fontSize:f.label, fontWeight:'700' }}>{s.home.startBtn}</Text>
                </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* СЕТКА 2×3: Задания|Лига / Магазин|Карта / Тест|Экзамен */}
          <View style={{ paddingHorizontal:16, gap:10, marginBottom:10 }}>
            {[[gridItems[0], gridItems[1]], [gridItems[2], gridItems[3]], [gridItems[4], gridItems[5]]].map((row,ri)=>(
              <View key={ri} style={{ flexDirection:'row', gap:10 }}>
                {row.map(item=>(
                  <TouchableOpacity
                    key={item.label}
                    activeOpacity={0.85}
                    onPress={()=>go(item.path)}
                    style={{ flex:1, borderRadius:20, borderWidth:0.5, borderColor:t.border, overflow:'hidden' }}
                  >
                    <LinearGradient colors={t.cardGradient} start={{x:0,y:0}} end={{x:1,y:1}} style={{ flex:1, borderRadius:20, padding:18, alignItems:'center', justifyContent:'center', minHeight:120 }}>
                    <View style={{ width:64, height:64, borderRadius:(item as any).isClub ? 0 : 16, backgroundColor:(item as any).isClub ? 'transparent' : (item as any).img ? 'transparent' : (item.iconColor as string)+'22', justifyContent:'center', alignItems:'center', marginBottom:8 }}>
                      {(item as any).isClub ? (
                        <Image
                          source={themedClubIcon}
                          style={{ width:64, height:64 }}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                      ) : (item as any).img ? (
                        <Image source={(item as any).img} style={{ width:66, height:66 }} contentFit="contain" cachePolicy="memory-disk" />
                      ) : (
                        <Ionicons name={item.iconName} size={36} color={item.iconColor} />
                      )}
                    </View>
                    <Text style={{ color:t.textPrimary, fontSize:f.bodyLg, fontWeight:'700', textAlign:'center', marginBottom:4 }}>{item.label}</Text>
                    {item.isTasksBlock ? (
                      <View style={{ width:'100%', marginTop:8 }}>
                        <View style={{ flexDirection:'row', gap:6 }}>
                          {[0,1,2].map(ti => {
                            const done = ti < tasksCompleted;
                            return (
                              <View key={ti} style={{ flex:1, height:6, backgroundColor:t.bgSurface2, borderRadius:3, overflow:'hidden' }}>
                                {done && <View style={{ width:'100%', height:'100%', backgroundColor:t.correct, borderRadius:3 }} />}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ) : (
                      <>
                        {item.pct !== null && item.pct !== undefined && (
                          <View style={{ width:'100%', height:4, backgroundColor:t.bgSurface2, borderRadius:2, marginTop:8, overflow:'hidden' }}>
                            <View style={{ width:`${Math.round((item.pct as number)*100)}%` as any, height:'100%', backgroundColor:t.correct, borderRadius:2 }} />
                          </View>
                        )}
                      </>
                    )}
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
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
          </View>
          </Animated.View>

      </ScrollView>
    );
  };

  return (
    <View style={{ flex:1 }}>
      <ScreenGradient>
      <View style={{ flex:1 }}>
      {renderNewHome()}

      </View>

      {/* Energy Tooltip — Modal чтобы не обрезался */}
      <Modal visible={energyTooltipVisible} transparent animationType="none" onRequestClose={() => setEnergyTooltipVisible(false)}>
        <TouchableOpacity style={{ flex:1 }} activeOpacity={1} onPress={() => setEnergyTooltipVisible(false)}>
          <Animated.View pointerEvents="none" style={{
            position: 'absolute',
            top: energySpotlight ? energySpotlight.y + Math.max(energySpotlight.h, 24) + 10 : (insets.top + 110),
            left: energySpotlight ? Math.max(8, energySpotlight.x) : 16,
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
              width: 220,
              shadowColor: '#000',
              shadowOpacity: 0.6,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 20,
            }}>
              {/* Стрелка вверх — слева, над иконками */}
              <View style={{ position:'absolute', top:-7, left:20, width:0, height:0, borderLeftWidth:7, borderRightWidth:7, borderBottomWidth:7, borderLeftColor:'transparent', borderRightColor:'transparent', borderBottomColor: t.gold+'66' }} />
              <View style={{ position:'absolute', top:-5.5, left:21, width:0, height:0, borderLeftWidth:6, borderRightWidth:6, borderBottomWidth:6, borderLeftColor:'transparent', borderRightColor:'transparent', borderBottomColor:'#1C1C1E' }} />

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

      {/* Bug Hunt Announcement */}
      <Modal visible={bugHuntVisible} transparent animationType="none" onRequestClose={dismissBugHunt}>
        <Animated.View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.75)', opacity: bugHuntAnim, justifyContent:'center', alignItems:'center' }}>
          <TouchableOpacity activeOpacity={1} onPress={dismissBugHunt} style={{ position:'absolute', top:0, left:0, right:0, bottom:0 }} />
          <View style={{
            backgroundColor: '#13131c', borderRadius: 24,
            borderWidth: 1, borderColor: '#34d399',
            paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28,
            gap: 12, marginHorizontal: 24, width: '88%',
          }}>
            <Text style={{ fontSize: 28, textAlign: 'center' }}>🔍</Text>
            <Text style={{ color: '#34d399', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
              {triLang(lang, {
                ru: 'Охота на баги открыта!',
                uk: 'Полювання на баги відкрите!',
                es: '¡Promo: caza errores!',
              })}
            </Text>
            <Text style={{ color: '#e0e0e0', fontSize: 14, lineHeight: 22, textAlign: 'center' }}>
              {lang === 'es' ? (
                <>
                  ¿Ves una traducción extraña o una respuesta incorrecta?{'\n'}Toca <Text style={{ color:'#34d399', fontWeight:'700' }}>🚩</Text> en la pregunta: si es un error real, ganarás <Text style={{ color:'#34d399', fontWeight:'700' }}>💎 {BRAND_SHARDS_ES}</Text>.
                </>
              ) : lang === 'uk' ? (
                <>
                  Бачиш кривий переклад чи неправильну відповідь?{'\n'}Тисни <Text style={{ color:'#34d399', fontWeight:'700' }}>🚩</Text> на будь-якому питанні — за реальний баг отримаєш <Text style={{ color:'#34d399', fontWeight:'700' }}>💎 Осколок</Text>.
                </>
              ) : (
                <>
                  Видишь кривой перевод или неправильный ответ?{'\n'}Жми <Text style={{ color:'#34d399', fontWeight:'700' }}>🚩</Text> на любом вопросе — за реальный баг получишь <Text style={{ color:'#34d399', fontWeight:'700' }}>💎 Осколок</Text>.
                </>
              )}
            </Text>
            <Text style={{ color: '#888', fontSize: 12, textAlign: 'center' }}>
              {triLang(lang, {
                ru: 'Акция до 21 мая 2026 · Засчитываются только реальные ошибки',
                uk: 'Акція до 21 травня 2026 · Зараховуються лише реальні помилки',
                es: 'Hasta el 21 de mayo de 2026 · Solo errores reales',
              })}
            </Text>
            <TouchableOpacity
              onPress={dismissBugHunt}
              style={{ backgroundColor:'#34d399', borderRadius: 14, paddingVertical: 13, alignItems:'center', marginTop: 4 }}
            >
              <Text style={{ color:'#000', fontWeight:'800', fontSize: 15 }}>
                {triLang(lang, {
                  ru: 'Понятно, буду искать!',
                  uk: 'Зрозуміло, шукатиму!',
                  es: '¡Entendido, a cazar errores!',
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>

      {/* Shards Earned Modal */}
      <ShardsEarnedModal
        visible={!!shardsEarnedModal}
        amount={shardsEarnedModal?.amount ?? 0}
        reason={shardsEarnedModal?.reason ?? ''}
        onClose={() => setShardsEarnedModal(null)}
      />
      {pendingLeagueResult && (
        <LeagueResultModal
          visible={true}
          result={pendingLeagueResult}
          onClose={async () => {
            const sig = JSON.stringify({
              prevLeagueId: pendingLeagueResult.prevLeagueId,
              newLeagueId: pendingLeagueResult.newLeagueId,
              myRank: pendingLeagueResult.myRank,
              totalInGroup: pendingLeagueResult.totalInGroup,
              promoted: pendingLeagueResult.promoted,
              demoted: pendingLeagueResult.demoted,
            });
            dismissedLeagueResultRef.current = sig;
            await clearPendingResult();
            setPendingLeagueResult(null);
          }}
        />
      )}
    </View>
  );
}
