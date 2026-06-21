import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Reanimated from 'react-native-reanimated';
import { Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import TopFadeMask from '../components/TopFadeMask';
import TapScale from '../components/TapScale';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import type { ThemeMode } from '../constants/theme';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useFeatureAccess } from '../components/PremiumContext';
import { hapticTap } from '../hooks/use-haptics';
import { safeRouterBack } from './navigation_back';
import {
  getPlanById,
  nextTaskAfterVisibleSlice,
  visibleTasksForMinutes,
  type PersonalPlanDefinition,
  type PersonalPlanId,
  type PlanDailyTask,
} from './personal_plan_catalog';
import { planTaskCompletionKey, readCompletedPlanTasks, type PersonalPlanCompletedTask } from './personal_plan_progress';
import { activeDayKeys, trailingStreak } from './personal_plan_stats';
import {
  getPlanDayLessonRecommendation,
  type PlanDayLessonRecommendation,
} from './plan_day_lesson_recommendation';
import { authoredPlanIntroCount, hasAuthoredPlanContent } from './plan_content_registry';
import ReportErrorButton from '../components/ReportErrorButton';
import { awardPlanDayCompletionReward } from './personal_plan_day_reward';
import { loadPlanDayComparison, planDayComparisonLine, type PlanDayComparison } from './personal_plan_day_comparison';
import {
  buildPersonalPlanSnapshot,
  buildTodayPlanRuntime,
  isPersonalPlanFinished,
  readPersonalPlanState,
  getCachedPersonalPlanState,
  advancePersonalPlanStateForToday,
  savePersonalPlanState,
  type PersonalPlanHomeSnapshot,
  type PersonalPlanState,
  type PlanDayRuntime,
} from './personal_plan_state';
import { openPersonalPlanTask } from './personal_plan_navigation';
import { getPersonalPlanTaskVisual } from './personal_plan_task_visuals';
import { countDueItemsToday } from './active_recall';
import { getTrainerCounts } from './trainer_store';
import { resolvePersonalPlanTrainerWeakSpotDueCount } from './personal_plan_trainer_weak_spot_gate';
import { resolvePersonalPlanFlashcardsReviewCount } from './personal_plan_flashcards_review_gate';

type LoadedPlan = {
  plan: PersonalPlanDefinition;
  state: PersonalPlanState;
  runtime: PlanDayRuntime;
  snapshot: PersonalPlanHomeSnapshot;
  completedTasks: Record<string, PersonalPlanCompletedTask | unknown>;
  duePlanTrainerWeakSpotCount: number;
};

const INSTANT_PLAN_DUE_COUNT = 999;
const RING_SIZE = 90;
const RING_STROKE = 8;

// ─── PlanChrome ────────────────────────────────────────────────────────────
type PlanChrome = {
  bg: [string, string, string];
  card: [string, string];
  hero: [string, string];
  accent: string;
  accent2: string;
  accentSoft: string;
  border: string;
  text: string;
  muted: string;
  ghost: string;
  buttonText: string;
  taskSurface: string;
};

/** "7", "7 и 9", "7, 9 и 12" — short human list of lesson numbers. */
function formatLessonList(lessonIds: readonly number[]): string {
  if (lessonIds.length === 0) return '';
  if (lessonIds.length === 1) return String(lessonIds[0]);
  const head = lessonIds.slice(0, -1).join(', ');
  return `${head} и ${lessonIds[lessonIds.length - 1]}`;
}

function resolvePlanChrome(themeMode: ThemeMode, t: ReturnType<typeof useTheme>['theme']): PlanChrome {
  const base: PlanChrome = {
    bg: [t.bgGradient[0], t.bgGradient[1], t.bgPrimary],
    card: [t.bgCard, t.bgPrimary],
    hero: [t.bgSurface2, t.bgPrimary],
    accent: t.accent,
    accent2: t.textSecond,
    accentSoft: t.accentBg,
    border: t.border,
    text: t.textPrimary,
    muted: t.textMuted,
    ghost: t.textGhost,
    buttonText: t.correctText,
    taskSurface: 'rgba(255,255,255,0.055)',
  };

  if (false) return { ...base, bg: ['#343235', '#29292B', '#1E1E20'], card: ['#2D2D30', '#1F1F22'], hero: ['#313033', '#202023'], accent: '#F6C78E', accent2: '#FFE1B5', accentSoft: 'rgba(246,199,142,0.14)', border: 'rgba(246,199,142,0.22)', buttonText: '#21170C' };
  if (false) return { ...base, bg: ['#202020', '#101010', '#050505'], card: ['#232522', '#0B0C0A'], hero: ['#292B26', '#0C0D0A'], accent: '#C8FF00', accent2: '#A6FF5D', accentSoft: 'rgba(200,255,0,0.13)', border: 'rgba(200,255,0,0.24)', buttonText: '#182200' };
  if (themeMode === 'gold') return { ...base, bg: ['#171008', '#0B0804', '#030201'], card: ['#211A10', '#080604'], hero: ['#2B2110', '#080604'], accent: '#E8C46A', accent2: '#FFF0B8', accentSoft: 'rgba(232,196,106,0.15)', border: 'rgba(232,196,106,0.26)', muted: '#CBBE9A', buttonText: '#120B02', taskSurface: 'rgba(232,196,106,0.08)' };
  if (themeMode === 'coral') return { ...base, bg: ['#463036', '#251719', '#12090B'], card: ['#302126', '#10090B'], hero: ['#3A272C', '#12090B'], accent: '#FF7373', accent2: '#FFD060', accentSoft: 'rgba(255,115,115,0.14)', border: 'rgba(255,115,115,0.22)', buttonText: '#2A0709' };
  if (false) return { ...base, bg: ['#FFF8EA', '#F4E6CD', '#EBD8BC'], card: ['#FFFDF6', '#F2E1C8'], hero: ['#FFFFFF', '#F1DEC0'], accent: '#B7791F', accent2: '#166E65', accentSoft: 'rgba(183,121,31,0.13)', border: 'rgba(91,63,25,0.18)', text: '#201811', muted: '#6A5C4D', ghost: '#9A8975', buttonText: '#21170C', taskSurface: 'rgba(70,48,20,0.055)' };
  if (themeMode === 'minimalDark') return { ...base, bg: ['#22252A', '#15171A', '#08090A'], card: ['#25282D', '#0E1012'], hero: ['#2C3035', '#101214'], accent: '#D7DEE8', accent2: '#8EA7C6', accentSoft: 'rgba(215,222,232,0.12)', border: 'rgba(215,222,232,0.18)', buttonText: '#101214' };
  return base;
}

// ─── ProgressRing ──────────────────────────────────────────────────────────
function ProgressRing({ pct, chrome }: { pct: number; chrome: PlanChrome }) {
  const animPct = useRef(new Animated.Value(0)).current;
  const prevPct = useRef(0);

  useEffect(() => {
    Animated.timing(animPct, {
      toValue: pct,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    prevPct.current = pct;
  }, [pct, animPct]);

  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={[styles.progressRing, { backgroundColor: chrome.accentSoft, borderColor: chrome.border }]}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={chrome.accent2} stopOpacity="1" />
            <Stop offset="1" stopColor={chrome.accent} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={radius}
          stroke="rgba(255,255,255,0.08)" strokeWidth={RING_STROKE} fill="transparent"
        />
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={radius}
          stroke={chrome.accent} strokeWidth={RING_STROKE} strokeLinecap="round"
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(100, pct)) / 100)}
          rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <Text style={[styles.ringPct, { color: chrome.text }]}>{Math.round(pct)}%</Text>
      <Text style={[styles.ringLabel, { color: chrome.muted }]}>готово</Text>
    </View>
  );
}

// ─── StreakBadge ────────────────────────────────────────────────────────────
// `streakDays` is the REAL "days in a row" streak (same source the stats screen
// uses): derived from completed-task timestamps via trailingStreak(), not the
// plan day number. A 0-streak shows a neutral "День N" label without the flame
// so we never imply an active streak that doesn't exist.
function StreakBadge({ streakDays, dayIndex, chrome }: { streakDays: number; dayIndex: number; chrome: PlanChrome }) {
  if (streakDays <= 0) {
    return (
      <View style={[styles.streakBadge, { backgroundColor: chrome.accentSoft, borderColor: chrome.border }]}>
        <Text style={[styles.streakText, { color: chrome.accent }]}>День {dayIndex}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.streakBadge, { backgroundColor: chrome.accentSoft, borderColor: chrome.border }]}>
      <Ionicons name="flame" size={14} color={chrome.accent} />
      <Text style={[styles.streakText, { color: chrome.accent }]}>{streakDays} дн</Text>
    </View>
  );
}

// ─── TaskRow ────────────────────────────────────────────────────────────────
function TaskRow({
  task,
  planId,
  themeMode,
  completed,
  isNext,
  chrome,
  onPress,
}: {
  task: PlanDailyTask;
  planId: PersonalPlanId;
  themeMode: ThemeMode;
  completed: boolean;
  isNext: boolean;
  chrome: PlanChrome;
  onPress: () => void;
}) {
  const visual = getPersonalPlanTaskVisual(task, planId, themeMode);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${completed ? 'Повторить' : 'Открыть'} задание ${task.title}`}
        style={[
          styles.taskRow,
          {
            backgroundColor: isNext && !completed ? chrome.accentSoft : chrome.taskSurface,
            borderColor: isNext && !completed ? chrome.accent + '55' : completed ? chrome.border : chrome.border,
          },
        ]}
      >
        {/* Left icon.
            Выполненная задача — галочка в рамке (нужны border+фон).
            Активная задача — ассет уже ГОТОВАЯ иконка-плитка со своим скруглённым
            тёмным фоном; вторую рамку/фон/scrim вокруг неё не добавляем, иначе углы
            плитки торчат «рамкой в рамке». Только клипуем картинку по радиусу. */}
        {completed ? (
          <View
            style={[
              styles.taskIcon,
              { borderWidth: 1, borderColor: chrome.accent2 + '88', backgroundColor: chrome.accent2 + '18' },
            ]}
          >
            <Ionicons name="checkmark" size={22} color={chrome.accent2} />
          </View>
        ) : (
          <View style={[styles.taskIcon, styles.taskIconImageWrap]}>
            <Image source={visual.asset} style={styles.taskImage} contentFit="contain" transition={120} />
          </View>
        )}

        {/* Copy */}
        <View style={styles.taskCopy}>
          {/* numberOfLines обязателен: колонка стоит в строке рядом с иконкой и
              правым блоком; без клампа узкая колонка рвёт заголовок по буквам. */}
          <Text style={[styles.taskTitle, { color: chrome.text }]} numberOfLines={2}>
            {task.title}
          </Text>
          <Text style={[styles.taskSub, { color: completed ? chrome.accent2 : chrome.muted }]} numberOfLines={3}>
            {completed ? '✓ Выполнено' : task.subtitle}
          </Text>
        </View>

        {/* Right */}
        <View style={styles.taskRight}>
          {isNext && !completed ? (
            <View style={[styles.nextBadge, { backgroundColor: chrome.accent, borderRadius: 10 }]}>
              <Text style={[styles.nextBadgeText, { color: chrome.buttonText }]}>→</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.taskMinutes, { color: chrome.accent }]}>{task.minutes}мин</Text>
              <Ionicons name="chevron-forward" size={18} color={chrome.ghost} />
            </>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────
export default function PersonalPlanScreen() {
  const router = useRouter();
  // Входной премиум-замок «Личного плана». Перехватывает ВСЕ пути входа (карточка на
  // главной, snapshot-карточка, Compass «начать день», прямой диплинк): фри-юзер без
  // доступа улетает на пейвол, а не открывает уже созданный план. С учётом «Пульта»
  // (перевод фичи в «Фри» снимает замок живьём).
  const planAccess = useFeatureAccess('personal_plan');
  const insets = useSafeAreaInsets();
  const { theme: t, themeMode } = useTheme();
  const { studyTarget } = useStudyTarget();
  const [loaded, setLoaded] = useState<LoadedPlan | null>(() => {
    const cached = getCachedPersonalPlanState();
    if (!cached) return null;
    const plan = getPlanById(cached.planId);
    const completedTasks = {};
    const instantInput = {
      plan,
      state: cached,
      completedTasks,
      duePracticeCount: INSTANT_PLAN_DUE_COUNT,
      duePracticeWordCount: INSTANT_PLAN_DUE_COUNT,
      dueTrainerCount: INSTANT_PLAN_DUE_COUNT,
      duePlanTrainerWeakSpotCount: INSTANT_PLAN_DUE_COUNT,
      dueFlashcardsCount: INSTANT_PLAN_DUE_COUNT,
    };
    return {
      plan,
      state: cached,
      runtime: buildTodayPlanRuntime(instantInput),
      snapshot: buildPersonalPlanSnapshot(instantInput),
      completedTasks,
      duePlanTrainerWeakSpotCount: 0,
    };
  });
  const [extraVisibleTaskCount, setExtraVisibleTaskCount] = useState(0);
  // Задачи дня по умолчанию СВЁРНУТЫ — пользователь раскрывает их сам по тапу на заголовок.
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [lessonRecommendation, setLessonRecommendation] = useState<PlanDayLessonRecommendation | null>(null);
  const [dayComparison, setDayComparison] = useState<PlanDayComparison | null>(null);
  // Подтверждение смены плана (новый план начинается с дня 1 — прогресс сбрасывается).
  const [changePlanConfirmVisible, setChangePlanConfirmVisible] = useState(false);
  const isGold = themeMode === 'gold';
  const screenBg = isGold ? '#090704' : t.bgPrimary;
  const chrome = useMemo(() => resolvePlanChrome(themeMode, t), [themeMode, t]);

  // Премиум-замок: нет доступа → на пейвол (replace, чтобы «Назад» не возвращал в план).
  // Реагирует и на потерю доступа в открытом экране (снятие премиума/VIP).
  useEffect(() => {
    if (!planAccess) {
      router.replace({ pathname: '/premium_modal', params: { context: 'personal_plan' } } as any);
    }
  }, [planAccess, router]);

  // Entrance animation
  const entranceFade = useRef(new Animated.Value(0)).current;
  const entranceSlide = useRef(new Animated.Value(24)).current;
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  // Классический Animated.Value для TopFadeMask (он не умеет в Reanimated SharedValue,
  // что отдаёт useBouncy). Обновляем из onScroll вместе с bounce-обработчиком, чтобы
  // верхний фейд под статус-баром был такой же, как на главной/табах.
  const fadeScrollY = useRef(new Animated.Value(0)).current;
  const handlePlanScroll = useCallback((e: any) => {
    onBouncyScroll(e);
    const y = e?.nativeEvent?.contentOffset?.y ?? 0;
    fadeScrollY.setValue(y);
  }, [onBouncyScroll, fadeScrollY]);

  const load = useCallback(async () => {
    const state = await readPersonalPlanState();
    if (!state) {
      router.replace('/personal_plan_setup' as any);
      setLoaded(null);
      return;
    }
    const plan = getPlanById(state.planId);
    const completedTasks = await readCompletedPlanTasks();
    const instantInput = {
      plan,
      state,
      completedTasks,
      duePracticeCount: INSTANT_PLAN_DUE_COUNT,
      duePracticeWordCount: INSTANT_PLAN_DUE_COUNT,
      dueTrainerCount: INSTANT_PLAN_DUE_COUNT,
      duePlanTrainerWeakSpotCount: INSTANT_PLAN_DUE_COUNT,
      dueFlashcardsCount: INSTANT_PLAN_DUE_COUNT,
    };
    setLoaded({
      plan,
      state,
      runtime: buildTodayPlanRuntime(instantInput),
      snapshot: buildPersonalPlanSnapshot(instantInput),
      completedTasks,
      duePlanTrainerWeakSpotCount: 0,
    });

    const [duePracticeCount, trainerCounts, duePlanTrainerWeakSpotCount, dueFlashcardsCount] = await Promise.all([
      countDueItemsToday(studyTarget).catch(() => 0),
      getTrainerCounts(studyTarget).catch(() => ({ words: 0, phrases: 0, arena: 0 })),
      resolvePersonalPlanTrainerWeakSpotDueCount({
        planInstanceId: state.planInstanceId,
        mode: 'weak',
        studyTarget,
      }).catch(() => 0),
      resolvePersonalPlanFlashcardsReviewCount(studyTarget).catch(() => 0),
    ]);
    const dueTrainerCount = trainerCounts.words + trainerCounts.phrases + trainerCounts.arena;
    const advancedState = advancePersonalPlanStateForToday({
      plan,
      state,
      completedTasks,
      duePracticeCount,
      duePracticeWordCount: trainerCounts.words,
      dueTrainerCount,
      duePlanTrainerWeakSpotCount,
      dueFlashcardsCount,
    });
    if (advancedState.currentDayIndex !== state.currentDayIndex) {
      await savePersonalPlanState(advancedState);
    }
    const input = {
      plan,
      state: advancedState,
      completedTasks,
      duePracticeCount,
      duePracticeWordCount: trainerCounts.words,
      dueTrainerCount,
      duePlanTrainerWeakSpotCount,
      dueFlashcardsCount,
    };
    // Маршрут пройден до конца — вместо вечного показа последнего дня ведём на
    // финальный экран «маршрут пройден» (поздравление + следующий план).
    if (isPersonalPlanFinished(input)) {
      router.replace('/personal_plan_complete' as any);
      return;
    }
    setLoaded({
      plan,
      state: advancedState,
      runtime: buildTodayPlanRuntime(input),
      snapshot: buildPersonalPlanSnapshot(input),
      completedTasks,
      duePlanTrainerWeakSpotCount,
    });

    // Entrance animation after data loads
    Animated.parallel([
      Animated.timing(entranceFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(entranceSlide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [router, studyTarget, entranceFade, entranceSlide]);

  useFocusEffect(
    useCallback(() => {
      entranceFade.setValue(0);
      entranceSlide.setValue(24);
      let alive = true;
      void load().then(() => { if (!alive) return; });
      return () => { alive = false; };
    }, [load, entranceFade, entranceSlide]),
  );

  // Which app lessons to finish before this plan day (grammar prerequisites the
  // learner has not passed yet). Recomputed when the visible day changes.
  const visibleDayIndex = loaded?.runtime.visibleDay.dayIndex ?? null;
  useEffect(() => {
    if (!loaded) {
      setLessonRecommendation(null);
      return;
    }
    let alive = true;
    void getPlanDayLessonRecommendation(loaded.runtime.visibleDay, studyTarget)
      .then((rec) => { if (alive) setLessonRecommendation(rec); })
      .catch(() => { if (alive) setLessonRecommendation(null); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleDayIndex, studyTarget]);

  // Award the one-time shard bonus when the whole day is finished. Idempotent — safe
  // to call on every load; awardPlanDayCompletionReward dedups per (instance, day).
  const todayDone = loaded?.runtime.todayDone ?? false;
  useEffect(() => {
    if (!loaded || !todayDone) {
      setDayComparison(null);
      return;
    }
    void awardPlanDayCompletionReward(loaded.state.planInstanceId, loaded.runtime.visibleDay.dayIndex);
    let alive = true;
    void loadPlanDayComparison().then((c) => { if (alive) setDayComparison(c); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayDone, visibleDayIndex]);

  const totalMinutes = useMemo(() => {
    if (!loaded) return 0;
    const visibleTasks = visibleTasksForMinutes(
      loaded.runtime.visibleDay,
      loaded.state.minutesPerDay,
      extraVisibleTaskCount,
      { planTrainerWeakSpotAvailable: loaded.duePlanTrainerWeakSpotCount > 0 },
    );
    return visibleTasks.reduce((sum, task) => sum + task.minutes, 0);
  }, [extraVisibleTaskCount, loaded]);

  // Reset the "show more tasks" expansion whenever the visible day changes.
  useEffect(() => {
    if (!loaded) return;
    setExtraVisibleTaskCount(0);
  }, [loaded?.runtime.visibleDay.dayIndex]);

  const openTask = (task: PlanDailyTask) => {
    if (!loaded) return;
    hapticTap();
    openPersonalPlanTask(router, loaded.plan, loaded.runtime.visibleDay, task, loaded.state.planInstanceId);
  };

  // Тап по баннеру «Сначала пройди урок N» открывает рекомендованный урок
  // (раньше баннер был неинтерактивный — нажатие ничего не делало, юзер не мог
  // найти этот урок). Открываем меню первого незакрытого урока-предпосылки.
  const openRecommendedLesson = () => {
    const firstId = lessonRecommendation?.recommendedLessonIds?.[0];
    if (firstId == null) return;
    hapticTap();
    router.push({ pathname: '/lesson_menu', params: { id: String(firstId) } });
  };

  // Loading state
  if (!loaded) {
    return (
      <View style={[styles.safe, { backgroundColor: screenBg, paddingTop: insets.top }]}>
        <LinearGradient colors={chrome.bg} style={styles.fill}>
          <View style={styles.loadingCenter}>
            <View style={[styles.loadingRing, { borderColor: chrome.accent + '33' }]}>
              <Ionicons name="map-outline" size={32} color={chrome.accent} />
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const { plan, runtime, snapshot, completedTasks } = loaded;
  const day = runtime.visibleDay;
  const addMoreOptions = { planTrainerWeakSpotAvailable: loaded.duePlanTrainerWeakSpotCount > 0 };
  const visibleTasks = visibleTasksForMinutes(day, loaded.state.minutesPerDay, extraVisibleTaskCount, addMoreOptions);
  const addMoreTask = nextTaskAfterVisibleSlice(day, loaded.state.minutesPerDay, extraVisibleTaskCount, addMoreOptions);
  const visibleTasksDone = visibleTasks.length > 0 && visibleTasks.every((task) =>
    Boolean(completedTasks[planTaskCompletionKey(loaded.state.planInstanceId, task.id)])
  );
  const canAddMoreTasks = Boolean(addMoreTask);
  const nextTask = visibleTasks.find((task) => !completedTasks[planTaskCompletionKey(loaded.state.planInstanceId, task.id)])
    ?? (visibleTasksDone && addMoreTask ? addMoreTask : visibleTasks[0])
    ?? null;

  // Real "days in a row" streak — same source the stats screen uses
  // (completed-task timestamps), not the plan day number. UTC todayKey to match
  // completedAt (new Date().toISOString()).
  const realStreakDays = trailingStreak(
    activeDayKeys(completedTasks as Record<string, PersonalPlanCompletedTask | unknown>, loaded.state.planInstanceId),
    new Date().toISOString().slice(0, 10),
  );

  return (
    // paddingTop НЕ ставим на корень — контент скроллится ПОД статус-баром (как на
    // главной/табах), а верхний фейд-маск рисует затухание под чёлкой.
    <View style={[styles.safe, { backgroundColor: screenBg }]}>
      <LinearGradient colors={chrome.bg} style={styles.fill}>
        {/* Тот же верхний фейд под safe-area, что на главной/табах. */}
        <TopFadeMask scrollY={fadeScrollY} zIndex={2} />
        <Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>

        <BouncyWrap>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          bounces
          alwaysBounceVertical
          overScrollMode="always"
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 4 }]}
          style={{ opacity: entranceFade, transform: [{ translateY: entranceSlide }] }}
          scrollEventThrottle={16}
          onScroll={handlePlanScroll}
        >

        {/* ── Header (теперь внутри скролла — скроллится вся страница) ── */}
        <View style={styles.header}>
          <TapScale
            onPress={() => safeRouterBack(router, '/(tabs)/home' as any)}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={[styles.back, { backgroundColor: chrome.taskSurface, borderColor: chrome.border }]}
          >
            <Ionicons name="chevron-back" size={22} color={chrome.text} />
          </TapScale>
          {/* Тексты названия плана и заголовка дня убраны из шапки — рядом с 4-5
              кнопками они уродливо ужимались/обрезались («АТЛА…», «Аэр о…»).
              Оставляем только кнопки и «День N». Пустой flex-разделитель держит
              кнопку «назад» слева, а блок кнопок — справа. */}
          <View style={styles.headerCopy} />
          {hasAuthoredPlanContent(loaded.plan.id, day.dayIndex) ? (
            <ReportErrorButton
              variant="icon-flag"
              screen="personal_plan_day"
              dataId={`${loaded.plan.id}_day_${day.dayIndex}`}
              dataText={`${plan.name} · День ${day.dayIndex}: ${day.title}`}
              style={[styles.statsButton, { backgroundColor: chrome.taskSurface, borderColor: chrome.border, marginRight: 8 }]}
              textColor={chrome.accent}
            />
          ) : null}
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => { hapticTap(); setChangePlanConfirmVisible(true); }}
            accessibilityRole="button"
            accessibilityLabel="Сменить план"
            style={[styles.statsButton, { backgroundColor: chrome.taskSurface, borderColor: chrome.border, marginRight: 8 }]}
          >
            <Ionicons name="swap-horizontal" size={20} color={chrome.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => { hapticTap(); router.push('/personal_plan_stats_screen' as any); }}
            accessibilityRole="button"
            accessibilityLabel="Статистика плана"
            style={[styles.statsButton, { backgroundColor: chrome.taskSurface, borderColor: chrome.border }]}
          >
            <Ionicons name="stats-chart" size={20} color={chrome.accent} />
          </TouchableOpacity>
          <StreakBadge streakDays={realStreakDays} dayIndex={day.dayIndex} chrome={chrome} />
        </View>

          {/* ── Hero card ── */}
          <LinearGradient colors={chrome.hero} style={[styles.heroCard, { borderColor: chrome.border }]}>
            {/* Top row */}
            <View style={styles.heroRow}>
              <ProgressRing pct={snapshot.dayProgressPct} chrome={chrome} />
              <View style={styles.heroCopy}>
                <View style={[styles.timePill, { backgroundColor: chrome.accentSoft, borderColor: chrome.border }]}>
                  <Ionicons name="time-outline" size={14} color={chrome.accent} />
                  <Text style={[styles.timePillText, { color: chrome.accent }]}>{totalMinutes} мин сегодня</Text>
                </View>
                {/* numberOfLines обязателен: heroCopy стоит в строке рядом с кольцом
                    прогресса; без клампа узкая колонка рвёт заголовок по буквам. */}
                <Text style={[styles.heroTitle, { color: chrome.text }]} numberOfLines={4}>
                  {nextTask ? nextTask.title : day.title}
                </Text>
              </View>
            </View>

            {/* Day progress bar */}
            <View style={[styles.heroDivider, { backgroundColor: chrome.border }]} />
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: chrome.text }]}>
                  {visibleTasks.filter((task) => Boolean(completedTasks[planTaskCompletionKey(loaded.state.planInstanceId, task.id)])).length}
                  /{visibleTasks.length}
                </Text>
                <Text style={[styles.heroStatLabel, { color: chrome.muted }]}>задач</Text>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: chrome.border }]} />
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: chrome.text }]}>День {day.dayIndex}</Text>
                <Text style={[styles.heroStatLabel, { color: chrome.muted }]}>{plan.horizonWeeks * 7} дней</Text>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: chrome.border }]} />
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: chrome.text }]}>
                  {snapshot.dayProgressPct}%
                </Text>
                <Text style={[styles.heroStatLabel, { color: chrome.muted }]}>прогресс</Text>
              </View>
            </View>

            {/* CTA button — если день ещё не начат и есть теория, сначала теория */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => {
                if (!nextTask) return;
                const hasTheory = authoredPlanIntroCount(loaded.plan.id, day.dayIndex) > 0;
                const dayFresh = snapshot.dayProgressPct === 0;
                if (hasTheory && dayFresh) {
                  hapticTap();
                  router.push({
                    pathname: '/personal_plan_theory',
                    params: {
                      planId: loaded.plan.id,
                      dayIndex: String(day.dayIndex),
                      startTaskId: nextTask.id,
                      ...(loaded.state.planInstanceId ? { planInstanceId: loaded.state.planInstanceId } : {}),
                    },
                  } as any);
                } else {
                  openTask(nextTask);
                }
              }}
              accessibilityRole="button"
              style={styles.heroButtonWrap}
            >
              <LinearGradient colors={[chrome.accent2, chrome.accent]} style={styles.heroButton}>
                <Ionicons name={visibleTasksDone ? 'refresh-outline' : 'play'} size={22} color={chrome.buttonText} />
                <Text style={[styles.heroButtonText, { color: chrome.buttonText }]}>
                  {visibleTasksDone ? 'Продолжить' : nextTask ? 'Начать задание' : 'Начать'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>

          {/* ── Recommended lessons banner (tappable → opens the first lesson) ── */}
          {lessonRecommendation && lessonRecommendation.recommendedLessonIds.length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={openRecommendedLesson}
              accessibilityRole="button"
              accessibilityLabel={`Открыть урок ${lessonRecommendation.recommendedLessonIds[0]}`}
              style={[styles.recommendBanner, { borderColor: chrome.border, backgroundColor: chrome.accentSoft }]}
            >
              <View style={[styles.recommendIconWrap, { backgroundColor: chrome.accent + '18', borderColor: chrome.accent + '33' }]}>
                <Ionicons name="school-outline" size={22} color={chrome.accent} />
              </View>
              <View style={styles.recommendCopy}>
                <Text style={[styles.recommendTitle, { color: chrome.text }]}>
                  Рекомендуем {lessonRecommendation.recommendedLessonIds.length === 1 ? 'урок' : 'уроки'} {formatLessonList(lessonRecommendation.recommendedLessonIds)}
                </Text>
                <Text style={[styles.recommendText, { color: chrome.accent }]} numberOfLines={2}>
                  {lessonRecommendation.recommendedLessonIds.length === 1
                    ? 'Можно начать план сразу или сперва пройти урок →'
                    : 'Можно начать план сразу или сперва пройти уроки →'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={chrome.accent} style={{ alignSelf: 'center' }} />
            </TouchableOpacity>
          ) : null}

          {/* ── All done banner ── */}
          {runtime.todayDone ? (
            <View style={[styles.doneBanner, { borderColor: chrome.border, backgroundColor: chrome.accentSoft }]}>
              <View style={[styles.doneIconWrap, { backgroundColor: chrome.accent + '18', borderColor: chrome.accent + '33' }]}>
                <Ionicons name="checkmark-circle-outline" size={26} color={chrome.accent} />
              </View>
              <View style={styles.doneCopy}>
                <Text style={[styles.doneTitle, { color: chrome.text }]}>День закрыт</Text>
                <Text style={[styles.doneSub, { color: chrome.muted }]}>
                  {dayComparison
                    ? `${planDayComparisonLine(dayComparison)}. Завтра откроется следующий шаг.`
                    : 'Завтра откроется следующий шаг. Сегодня можно дополнительно потренироваться.'}
                </Text>
              </View>
            </View>
          ) : null}

          {/* ── Day tasks ── */}
          <LinearGradient colors={chrome.card} style={[styles.sectionCard, { borderColor: chrome.border }]}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => { hapticTap(); setTasksExpanded((v) => !v); }}
              accessibilityRole="button"
              accessibilityState={{ expanded: tasksExpanded }}
              style={styles.sectionHeader}
            >
              <View>
                <Text style={[styles.sectionKicker, { color: chrome.accent }]}>Задачи дня</Text>
                <Text style={[styles.sectionTitle, { color: chrome.text }]}>Сегодня</Text>
              </View>
              <View style={styles.sectionHeaderRight}>
                <View style={[styles.countBadge, { backgroundColor: chrome.accentSoft, borderColor: chrome.border }]}>
                  <Text style={[styles.countBadgeText, { color: chrome.accent }]}>{visibleTasks.length}</Text>
                </View>
                <Ionicons name={tasksExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={chrome.muted} />
              </View>
            </TouchableOpacity>

            {tasksExpanded ? (
              <View style={styles.taskList}>
                {visibleTasks.map((task, idx) => {
                  const completed = Boolean(completedTasks[planTaskCompletionKey(loaded.state.planInstanceId, task.id)]);
                  const isNext = task === nextTask;
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      planId={loaded.plan.id}
                      themeMode={themeMode}
                      completed={completed}
                      isNext={isNext}
                      chrome={chrome}
                      onPress={() => openTask(task)}
                    />
                  );
                })}
                {canAddMoreTasks ? (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => { hapticTap(); setExtraVisibleTaskCount((c) => c + 1); }}
                    style={[styles.addMoreRow, { borderColor: chrome.border }]}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={chrome.accent} />
                    <Text style={[styles.addMoreText, { color: chrome.accent }]}>Добавить ещё задание</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </LinearGradient>

          {/* ── DEV ── */}
          {__DEV__ ? (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => { hapticTap(); router.push('/personal_plan_dev' as any); }}
              style={[styles.devLink, { borderColor: chrome.border, backgroundColor: chrome.taskSurface }]}
            >
              <Ionicons name="construct-outline" size={15} color={chrome.accent} />
              <Text style={[styles.devLinkText, { color: chrome.accent }]}>DEV</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.ScrollView>
        </BouncyWrap>

        {/* Подтверждение смены плана: новый план стартует с дня 1, прогресс текущего сбрасывается. */}
        <Modal
          visible={changePlanConfirmVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setChangePlanConfirmVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setChangePlanConfirmVisible(false)}
            style={styles.changePlanBackdrop}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}}
              style={[styles.changePlanCard, { backgroundColor: chrome.card[0], borderColor: chrome.border }]}
            >
              <View style={[styles.changePlanIconWrap, { backgroundColor: chrome.accent + '18', borderColor: chrome.accent + '33' }]}>
                <Ionicons name="swap-horizontal" size={24} color={chrome.accent} />
              </View>
              <Text style={[styles.changePlanTitle, { color: chrome.text }]}>Сменить план?</Text>
              <Text style={[styles.changePlanBody, { color: chrome.muted }]}>
                Весь прогресс текущего плана будет потерян — новый план придётся начинать сначала, с первого дня.
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  hapticTap();
                  setChangePlanConfirmVisible(false);
                  // directToPlans=1 → сразу список планов, без повторного опроса.
                  router.push({ pathname: '/personal_plan_setup', params: { directToPlans: '1' } } as any);
                }}
                style={[styles.changePlanPrimary, { backgroundColor: chrome.accent }]}
              >
                <Text style={[styles.changePlanPrimaryText, { color: chrome.buttonText }]}>Выбрать другой план</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { hapticTap(); setChangePlanConfirmVisible(false); }}
                style={styles.changePlanSecondary}
              >
                <Text style={[styles.changePlanSecondaryText, { color: chrome.muted }]}>Отмена</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
        </Reanimated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  changePlanBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  changePlanCard: { width: '100%', maxWidth: 420, borderRadius: 22, borderWidth: 1, padding: 22, alignItems: 'center' },
  changePlanIconWrap: { width: 52, height: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  changePlanTitle: { fontSize: 19, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  changePlanBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  changePlanPrimary: { width: '100%', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  changePlanPrimaryText: { fontSize: 15, fontWeight: '800' },
  changePlanSecondary: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  changePlanSecondaryText: { fontSize: 14, fontWeight: '600' },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  header: {
    // Горизонтальный отступ даёт контейнер скролла (styles.scroll), здесь 0,
    // иначе двойной паддинг. Header теперь часть скролла.
    paddingHorizontal: 0,
    paddingTop: 2,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    width: 46, height: 46,
    borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  statsButton: {
    width: 44, height: 44,
    borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  headerKicker: {
    fontSize: 11, lineHeight: 14, fontWeight: '900',
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  headerTitle: { fontSize: 22, lineHeight: 27, fontWeight: '900', marginTop: 1 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 16, borderWidth: 1,
  },
  streakText: { fontSize: 12, lineHeight: 15, fontWeight: '900' },
  scroll: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 40, gap: 12 },

  // Hero
  heroCard: {
    borderRadius: 14, borderWidth: 1,
    padding: 18, gap: 0,
    elevation: 8, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 20,
  },
  heroRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  progressRing: {
    width: RING_SIZE, height: RING_SIZE,
    borderRadius: RING_SIZE / 2, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ringPct: { fontSize: 24, lineHeight: 28, fontWeight: '900' },
  ringLabel: { fontSize: 10, lineHeight: 13, fontWeight: '900', textTransform: 'uppercase', marginTop: 1 },
  heroCopy: { flex: 1, minWidth: 0, paddingTop: 2 },
  timePill: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1,
  },
  timePillText: { fontSize: 12, lineHeight: 15, fontWeight: '900' },
  heroFocus: { marginTop: 8, fontSize: 11, lineHeight: 14, fontWeight: '800', textTransform: 'uppercase' },
  heroTitle: { marginTop: 6, fontSize: 20, lineHeight: 25, fontWeight: '900' },
  heroDivider: { height: 1, marginVertical: 16 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStatItem: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatValue: { fontSize: 16, lineHeight: 20, fontWeight: '900' },
  heroStatLabel: { fontSize: 11, lineHeight: 14, fontWeight: '800' },
  heroStatDivider: { width: 1, height: 32 },
  heroButtonWrap: { marginTop: 16 },
  heroButton: {
    height: 62, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  heroButtonText: { fontSize: 18, lineHeight: 22, fontWeight: '900' },

  // Done banner
  doneBanner: {
    borderRadius: 14, borderWidth: 1,
    padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  doneIconWrap: {
    width: 46, height: 46, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  doneCopy: { flex: 1, minWidth: 0 },
  doneTitle: { fontSize: 15, lineHeight: 20, fontWeight: '900' },
  doneSub: { marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: '700' },

  recommendBanner: {
    borderRadius: 14, borderWidth: 1,
    padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    marginTop: 12,
  },
  recommendIconWrap: {
    width: 46, height: 46, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  recommendCopy: { flex: 1, minWidth: 0 },
  recommendTitle: { fontSize: 15, lineHeight: 20, fontWeight: '900' },
  recommendText: { marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: '700' },

  // Section cards
  sectionCard: { borderRadius: 14, borderWidth: 1, padding: 16, overflow: 'hidden' },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 12, marginBottom: 14,
  },
  sectionKicker: { fontSize: 11, lineHeight: 14, fontWeight: '900', textTransform: 'uppercase' },
  sectionTitle: { fontSize: 20, lineHeight: 25, fontWeight: '900', marginTop: 2 },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: {
    minWidth: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  countBadgeText: { fontSize: 15, lineHeight: 19, fontWeight: '900' },

  // Tasks
  taskList: { gap: 8 },
  taskRow: {
    minHeight: 70, borderRadius: 14, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, gap: 12,
  },
  taskIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  // Обёртка для готовой иконки-плитки: без рамки/фона, только клип по радиусу,
  // чтобы плитка садилась ровно, а не «рамкой в рамке».
  taskIconImageWrap: { overflow: 'hidden', backgroundColor: 'transparent' },
  taskImage: { width: 48, height: 48 },
  taskCopy: { flex: 1, minWidth: 0 },
  taskTitle: { fontSize: 16, lineHeight: 21, fontWeight: '900' },
  taskSub: { marginTop: 2, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  taskRight: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    flexShrink: 0, width: 52, justifyContent: 'flex-end',
  },
  taskMinutes: { fontSize: 12, lineHeight: 15, fontWeight: '900' },
  nextBadge: {
    width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
  },
  nextBadgeText: { fontSize: 16, fontWeight: '900' },
  addMoreRow: {
    height: 48, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 4,
  },
  addMoreText: { fontSize: 14, lineHeight: 18, fontWeight: '900' },

  // Day rail

  // Dev
  devLink: {
    height: 38, borderRadius: 12, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  devLinkText: { fontSize: 11, fontWeight: '900' },
});
