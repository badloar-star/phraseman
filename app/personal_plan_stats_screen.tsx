import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Reanimated, { runOnJS, useSharedValue } from 'react-native-reanimated';
import { Animated, Easing, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FlowText } from '../components/text-integrity/FlowText';
import TapScale from '../components/TapScale';
import SkeletonBlock from '../components/SkeletonShimmer';
import TopFadeMask from '../components/TopFadeMask';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { safeRouterBack } from './navigation_back';
import { captureAccountGeneration } from './account_generation';
import {
  peekScreenSnapshotForToken,
  rememberScreenSnapshot,
  screenSnapshotKey,
} from './screen_snapshot_store';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ReportErrorButton from '../components/ReportErrorButton';
import EnergyCostBadge from '../components/EnergyCostBadge';
import { triLang } from '../constants/i18n';
import type { ThemeMode } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import { getPlanById, type PersonalPlanDefinition, type PlanDay } from './personal_plan_catalog';
import { readPersonalPlanState } from './personal_plan_state';
import { phrasesForPlanDay, type PlanDayPhrase } from './personal_plan_day_phrases';
import { openPersonalPlanTask, personalPlanTaskStartsPaidExercise } from './personal_plan_navigation';
import { allTasksForDay } from './personal_plan_catalog';
import { readCompletedPlanTasks } from './personal_plan_progress';
import { buildPersonalPlanStats, type PersonalPlanStatsSummary } from './personal_plan_stats';
import { readPlanWeakSpotView, type PlanWeakSpotView } from './personal_plan_weak_spot_reader';
import { readPlanXpLedger, type PlanXpLedgerEntry } from './personal_plan_xp_ledger';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { OLIVE_RICH, OLIVE_GRADIENTS } from '../constants/oliveTheme';
import { withPersonalPlanSunsetGuard } from '../components/personal_plan_sunset_guard';

const DAY_CARD_WIDTH = 88;
const DAY_CARD_GAP = 10;
const DAY_CARD_STRIDE = DAY_CARD_WIDTH + DAY_CARD_GAP;

type StatsChrome = {
  bg: [string, string, string];
  card: [string, string];
  accent: string;
  accent2: string;
  accentSoft: string;
  border: string;
  text: string;
  muted: string;
  surface: string;
};

function resolveChrome(themeMode: ThemeMode, t: ReturnType<typeof useTheme>['theme']): StatsChrome {
  const base: StatsChrome = {
    bg: [t.bgGradient[0], t.bgGradient[1], t.bgPrimary],
    card: [t.bgCard, t.bgPrimary],
    accent: t.accent,
    accent2: t.textSecond,
    accentSoft: t.accentBg,
    border: t.border,
    text: t.textPrimary,
    muted: t.textMuted,
    surface: 'rgba(255,255,255,0.055)',
  };
  if (false) return { ...base, bg: ['#202020', '#101010', '#050505'], card: ['#232522', '#0B0C0A'], accent: '#C8FF00', accent2: '#A6FF5D', accentSoft: 'rgba(200,255,0,0.13)', border: 'rgba(200,255,0,0.24)' };
  if (themeMode === 'gold') return { ...base, bg: ['#171008', '#0B0804', '#030201'], card: ['#211A10', '#080604'], accent: '#E8C46A', accent2: '#FFF0B8', accentSoft: 'rgba(232,196,106,0.15)', border: 'rgba(232,196,106,0.26)', muted: '#CBBE9A', surface: 'rgba(232,196,106,0.08)' };
  if (themeMode === 'olive') return { ...base, bg: [...OLIVE_GRADIENTS.screen] as [string, string, string], card: [OLIVE_RICH.raised, OLIVE_RICH.panel], accent: OLIVE_RICH.champagne, accent2: OLIVE_RICH.champagneLight, accentSoft: '#2A2818', border: 'transparent', text: OLIVE_RICH.ivory, muted: OLIVE_RICH.champagneLight, surface: OLIVE_RICH.surface };
  if (themeMode === 'sagePorcelain') return { ...base, bg: ['#DCE1D8', '#CDD5C7', '#BFC8B8'], card: ['#FCFDF9', '#DCE1D8'], accent: '#315F50', accent2: '#52605A', accentSoft: '#D9E9E1', border: '#CFD6CE', text: '#17201D', muted: '#52605A', surface: '#E1E5DC' };
  if (false) return { ...base, bg: ['#343235', '#29292B', '#1E1E20'], card: ['#2D2D30', '#1F1F22'], accent: '#F6C78E', accent2: '#FFE1B5', accentSoft: 'rgba(246,199,142,0.14)', border: 'rgba(246,199,142,0.22)' };
  if (false) return { ...base, bg: ['#FFF8EA', '#F4E6CD', '#EBD8BC'], card: ['#FFFDF6', '#F2E1C8'], accent: '#B7791F', accent2: '#166E65', accentSoft: 'rgba(183,121,31,0.13)', border: 'rgba(91,63,25,0.18)', text: '#201811', muted: '#6A5C4D', surface: 'rgba(70,48,20,0.055)' };
  if (themeMode === 'indigo') return { ...base, bg: ['#22252A', '#15171A', '#08090A'], card: ['#25282D', '#0E1012'], accent: '#D7DEE8', accent2: '#8EA7C6', accentSoft: 'rgba(215,222,232,0.12)', border: 'rgba(215,222,232,0.18)' };
  return base;
}

function StatCard({
  icon, value, label, chrome,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  chrome: StatsChrome;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: chrome.surface, borderColor: chrome.border }]}>
      <View style={[styles.statIconWrap, { backgroundColor: chrome.accentSoft, borderColor: chrome.border }]}>
        <Ionicons name={icon} size={20} color={chrome.accent} />
      </View>
      <Text style={[styles.statValue, { color: chrome.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: chrome.muted }]}>{label}</Text>
    </View>
  );
}

function WeekBar({
  week, maxTasks, chrome,
}: {
  week: PersonalPlanStatsSummary['weeks'][number];
  maxTasks: number;
  chrome: StatsChrome;
}) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: week.progressPct / 100,
      duration: 700,
      delay: week.weekIndex * 40,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [fillAnim, week.progressPct, week.weekIndex]);

  return (
    <View style={styles.weekRow}>
      <Text style={[styles.weekLabel, { color: week.isCurrent ? chrome.accent : chrome.muted }]}>
        Нед. {week.weekIndex}
      </Text>
      <View style={[styles.weekTrack, { backgroundColor: chrome.surface }]}>
        <Animated.View
          style={[
            styles.weekFill,
            {
              backgroundColor: week.isCurrent ? chrome.accent : chrome.accent2,
              width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
      <Text style={[styles.weekPct, { color: week.isCurrent ? chrome.accent : chrome.muted }]}>
        {week.progressPct}%
      </Text>
    </View>
  );
}

/** B7: тёплая память статистики плана на процесс — повторные заходы рисуют контент
 * первым кадром; без неё каждый заход начинался с «Нет данных о плане». */
type PlanStatsWarm = {
  planInstanceId: string;
  plan: PersonalPlanDefinition;
  stats: PersonalPlanStatsSummary;
  weakSpots: PlanWeakSpotView | null;
  xpLedger: PlanXpLedgerEntry | null;
};

let planStatsWarm: PlanStatsWarm | null = null;

/** Идентификатор экрана в общем дисковом снапшоте (screen_snapshot_store). */
const PLAN_STATS_SCREEN_ID = 'personal-plan-stats';

/**
 * Тёплая память + дисковый снапшот прошлой сессии.
 *
 * зачем: planStatsWarm живёт только внутри процесса, поэтому ПЕРВЫЙ заход после
 * холодного старта рисовал скелетон на весь экран. Диск поднят бутстрапом одним
 * общим чтением, поэтому здесь это синхронное чтение из памяти — без нагрузки.
 */
function readPlanStatsWarm(): PlanStatsWarm | null {
  if (planStatsWarm) return planStatsWarm;
  return peekScreenSnapshotForToken<PlanStatsWarm>(
    PLAN_STATS_SCREEN_ID,
    captureAccountGeneration(),
  );
}

function PersonalPlanStatsScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { theme: t, themeMode } = useTheme();
  // зачем: один синхронный снимок на монтирование — и память процесса, и дисковый
  // снапшот прошлой сессии. Даёт настоящий контент первым кадром вместо скелетона.
  const warm = readPlanStatsWarm();
  const [stats, setStats] = useState<PersonalPlanStatsSummary | null>(() => warm?.stats ?? null);
  const [weakSpots, setWeakSpots] = useState<PlanWeakSpotView | null>(() => warm?.weakSpots ?? null);
  const [xpLedger, setXpLedger] = useState<PlanXpLedgerEntry | null>(() => warm?.xpLedger ?? null);
  const [plan, setPlan] = useState<PersonalPlanDefinition | null>(() => warm?.plan ?? null);
  const [planInstanceId, setPlanInstanceId] = useState<string | null>(() => warm?.planInstanceId ?? null);
  // Открытый на просмотр прошлый день (read-only): тема, фразы, задания + «пройти
  // заново». null = лист закрыт.
  const [reviewDay, setReviewDay] = useState<PlanDay | null>(null);
  const [loading, setLoading] = useState(() => warm == null);
  const chrome = useMemo(() => resolveChrome(themeMode, t), [themeMode, t]);
  const isGold = themeMode === 'gold';
  const screenBg = isGold ? '#090704' : t.bgPrimary;

  const fadeScrollY = useRef(new Animated.Value(0)).current;
  // Тёплый старт: контент уже виден первым кадром — входную анимацию не проигрываем заново.
  const fade = useRef(new Animated.Value(planStatsWarm ? 1 : 0)).current;
  const slide = useRef(new Animated.Value(planStatsWarm ? 0 : 20)).current;
  const dayRailRef = useRef<ScrollView | null>(null);
  // TopFadeMask слушает fadeScrollY порогом (showThreshold=6) — будим JS только на
  // пересечении порога, сам скролл обрабатывается UI-потоком (onAnimatedScroll).
  const topFadeShown = useSharedValue(false);
  const notifyTopFade = useCallback((y: number) => { fadeScrollY.setValue(y); }, [fadeScrollY]);
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onAnimatedScroll } = useBouncy({
    onScrollWorklet: (y: number) => {
      'worklet';
      const shown = y > 6;
      if (shown !== topFadeShown.value) {
        topFadeShown.value = shown;
        runOnJS(notifyTopFade)(y);
      }
    },
  });
  const bouncyStyle = useBouncyStyle(bouncyStretch);

  const load = useCallback(async () => {
    const state = await readPersonalPlanState();
    if (!state) {
      planStatsWarm = null;
      setStats(null);
      setLoading(false);
      return;
    }
    const plan = getPlanById(state.planId);
    const completedTasks = await readCompletedPlanTasks();
    const nextStats = buildPersonalPlanStats({
      plan,
      planInstanceId: state.planInstanceId,
      currentDayIndex: state.currentDayIndex,
      minutesPerDay: state.minutesPerDay,
      completedTasks,
      // UTC date, to match completedAt (new Date().toISOString()) used for active-day keys.
      todayKey: new Date().toISOString().slice(0, 10),
    });
    const nextWeakSpots = await readPlanWeakSpotView(state.planInstanceId).catch(() => null);
    const nextXpLedger = await readPlanXpLedger(state.planInstanceId).catch(() => null);
    planStatsWarm = {
      planInstanceId: state.planInstanceId,
      plan,
      stats: nextStats,
      weakSpots: nextWeakSpots,
      xpLedger: nextXpLedger,
    };
    // зачем: зеркалим на диск — следующий холодный старт откроет статистику плана
    // мгновенно, без скелетона. Запись фоновая и отложенная, UI её не ждёт.
    rememberScreenSnapshot(
      screenSnapshotKey(PLAN_STATS_SCREEN_ID, captureAccountGeneration()),
      planStatsWarm,
    );
    setStats(nextStats);
    setWeakSpots(nextWeakSpots);
    setXpLedger(nextXpLedger);
    setPlan(plan);
    setPlanInstanceId(state.planInstanceId);
    setLoading(false);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  useFocusEffect(useCallback(() => {
    // Входную анимацию перезапускаем только при холодном старте (нет тёплой памяти):
    // при тёплом контент виден первым кадром, сбрасывать его в невидимость нельзя.
    if (!planStatsWarm) {
      fade.setValue(0);
      slide.setValue(20);
    }
    void load();
  }, [load, fade, slide]));

  const maxWeekTasks = useMemo(
    () => (stats ? Math.max(1, ...stats.weeks.map((w) => w.totalTasks)) : 1),
    [stats],
  );

  // Auto-center the current day in the horizontal day rail when stats load.
  const currentDayIndex = stats?.currentDayIndex ?? 0;
  useEffect(() => {
    if (!stats || stats.days.length === 0) return;
    const idx = Math.max(0, currentDayIndex - 1);
    const offset = idx * DAY_CARD_STRIDE - 120;
    const timer = setTimeout(() => {
      dayRailRef.current?.scrollTo({ x: Math.max(0, offset), animated: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [stats, currentDayIndex]);

  // ——— Просмотр прошлого дня (read-only) + повтор ———
  const { speak, stop: stopAudio } = useAudio();
  // Тап по дню на шкале: открыть просмотр (только для разблокированных дней —
  // будущее не подглядываем). Фразы дня резолвим лениво при открытии.
  const openDayReview = useCallback((dayIndex: number) => {
    if (!plan) return;
    const day = plan.days.find((d) => d.dayIndex === dayIndex);
    if (!day) return;
    hapticTap();
    setReviewDay(day);
  }, [plan]);

  const closeDayReview = useCallback(() => {
    stopAudio();
    setReviewDay(null);
  }, [stopAudio]);

  const reviewPhrases = useMemo<PlanDayPhrase[]>(
    () => (reviewDay ? phrasesForPlanDay(reviewDay) : []),
    [reviewDay],
  );
  const reviewReplayStartsPaid = useMemo(() => {
    const firstTask = reviewDay ? allTasksForDay(reviewDay)[0] : undefined;
    return firstTask ? personalPlanTaskStartsPaidExercise(firstTask) : false;
  }, [reviewDay]);

  const playReviewPhrase = useCallback((en: string) => {
    if (!en) return;
    hapticTap();
    speak(en);
  }, [speak]);

  // «Пройти этот день заново»: безопасно — markPersonalPlanTaskCompleted
  // идемпотентен (уже пройденные задачи не переписываются, счётчик не задваивается),
  // а currentDayIndex двигается ТОЛЬКО вперёд, так что открыть прошлый день на
  // повтор не может откатить прогресс. Открываем первое реальное задание дня.
  const replayDay = useCallback(() => {
    if (!plan || !reviewDay) return;
    const tasks = allTasksForDay(reviewDay);
    const firstTask = tasks[0];
    if (!firstTask) return;
    hapticTap();
    stopAudio();
    const day = reviewDay;
    setReviewDay(null);
    openPersonalPlanTask(router, plan, day, firstTask, planInstanceId ?? undefined, 'push');
  }, [plan, reviewDay, planInstanceId, router, stopAudio]);

  if (!stats) {
    return (
      <View style={[styles.safe, { backgroundColor: screenBg }]}>
        <LinearGradient colors={chrome.bg} style={styles.fill}>
          <TopFadeMask zIndex={2} />
          {loading ? (
            /* B7: скелетон первой загрузки — раньше первый кадр рисовал ложное «Нет данных о плане» */
            <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <SkeletonBlock width={40} height={40} borderRadius={12} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonBlock width={90} height={12} />
                  <SkeletonBlock width="70%" height={18} />
                </View>
              </View>
              <SkeletonBlock width="100%" height={120} borderRadius={18} style={{ marginTop: 20 }} />
              <SkeletonBlock width="100%" height={96} borderRadius={18} style={{ marginTop: 12 }} />
              <SkeletonBlock width="100%" height={96} borderRadius={18} style={{ marginTop: 12 }} />
            </View>
          ) : (
            <View style={[styles.center, { paddingTop: insets.top }]}>
              <Ionicons name="stats-chart-outline" size={40} color={chrome.muted} />
              <Text style={[styles.emptyText, { color: chrome.muted }]}>Нет данных о плане</Text>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: screenBg }]}>
      <LinearGradient colors={chrome.bg} style={styles.fill}>
        {/* TopFadeMask — position:absolute от top:0 экрана (корень без paddingTop),
            поэтому фейд перекрывает safe-area плавно, как на главной. */}
        <TopFadeMask scrollY={fadeScrollY} zIndex={2} />
        <Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TapScale
            onPress={() => safeRouterBack(router, '/personal_plan')}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={[styles.back, { backgroundColor: chrome.surface, borderColor: chrome.border }]}
          >
            <Ionicons name="chevron-back" size={22} color={chrome.text} />
          </TapScale>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: chrome.accent }]}>Статистика</Text>
            <Text style={[styles.title, { color: chrome.text }]} numberOfLines={2}>{stats.planName}</Text>
          </View>
        </View>

        {/* зачем: BouncyWrap клонирует СВОЕГО ребёнка (overScrollMode) и вешает на него
            нативный жест скролла — прослойка между обёрткой и списком забирала жест
            себе, и на Android экран только тянулся резинкой, не скроллясь. Анимация
            появления уехала НАРУЖУ обёртки, список стал прямым ребёнком. */}
        <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: slide }] }}>
        <BouncyWrap>
        <Reanimated.ScrollView
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          bounces
          alwaysBounceVertical
          overScrollMode="always"
          contentContainerStyle={styles.scroll}
          onScroll={onAnimatedScroll}
          scrollEventThrottle={16}
        >
          {/* Overall progress hero */}
          <LinearGradient colors={chrome.card} style={[styles.heroCard, { borderColor: chrome.border }]}>
            <View style={styles.heroTop}>
              <Text style={[styles.heroPct, { color: chrome.accent }]}>{stats.overallProgressPct}%</Text>
              <View style={styles.heroCopy}>
                <Text style={[styles.heroTitle, { color: chrome.text }]}>Пройдено плана</Text>
                <Text style={[styles.heroSub, { color: chrome.muted }]}>
                  День {stats.currentDayIndex} из {stats.totalDays}
                </Text>
              </View>
            </View>
            <View style={[styles.heroBar, { backgroundColor: chrome.surface }]}>
              <View style={[styles.heroBarFill, { width: `${stats.overallProgressPct}%`, backgroundColor: chrome.accent }]} />
            </View>
          </LinearGradient>

          {/* Stat grid */}
          <View style={styles.grid}>
            <StatCard icon="flame-outline" value={`${stats.currentStreakDays}`} label="дней подряд" chrome={chrome} />
            <StatCard icon="trophy-outline" value={`${stats.longestStreakDays}`} label="лучшая серия" chrome={chrome} />
          </View>
          <View style={styles.grid}>
            <StatCard icon="checkmark-done-outline" value={`${stats.completedTasksTotal}`} label="задач выполнено" chrome={chrome} />
            <StatCard icon="calendar-outline" value={`${stats.activeDaysCount}`} label="активных дней" chrome={chrome} />
          </View>
          {xpLedger && (xpLedger.xp > 0 || xpLedger.phrases > 0) ? (
            <View style={styles.grid}>
              <StatCard icon="flash-outline" value={`${xpLedger.xp}`} label="XP за план" chrome={chrome} />
              <StatCard icon="chatbox-ellipses-outline" value={`${xpLedger.phrases}`} label="фраз отработано" chrome={chrome} />
            </View>
          ) : null}

          {/* Weekly breakdown */}
          <LinearGradient colors={chrome.card} style={[styles.sectionCard, { borderColor: chrome.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionKicker, { color: chrome.accent }]}>По неделям</Text>
              <Text style={[styles.sectionTitle, { color: chrome.text }]}>Прогресс маршрута</Text>
            </View>
            <View style={styles.weeks}>
              {stats.weeks.map((week) => (
                <WeekBar key={`week-${week.weekIndex}`} week={week} maxTasks={maxWeekTasks} chrome={chrome} />
              ))}
            </View>
          </LinearGradient>

          {/* Day-by-day route — moved here from the plan screen. Horizontal rail
              of day cards with a mini progress bar; the current day is auto-centered. */}
          {stats.days.length > 0 ? (
            <LinearGradient colors={chrome.card} style={[styles.sectionCard, { borderColor: chrome.border }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionKicker, { color: chrome.accent }]}>По дням</Text>
                <Text style={[styles.sectionTitle, { color: chrome.text }]}>Прогресс по дням</Text>
              </View>
              <ScrollView
                ref={dayRailRef}
                horizontal
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayRail}
              >
                {stats.days.map((item) => (
                  <TouchableOpacity
                    key={`day-${item.dayIndex}`}
                    activeOpacity={item.isUnlocked ? 0.7 : 1}
                    disabled={!item.isUnlocked}
                    onPress={() => openDayReview(item.dayIndex)}
                    accessibilityRole="button"
                    accessibilityLabel={`День ${item.dayIndex}${item.isCompleted ? ', пройден' : ''}${item.isUnlocked ? ', открыть просмотр' : ', закрыт'}`}
                    style={[
                      styles.dayCard,
                      {
                        borderColor: item.isCurrent ? chrome.accent : item.isCompleted ? chrome.accent2 + '55' : chrome.border,
                        backgroundColor: item.isCurrent ? chrome.accentSoft : 'transparent',
                        opacity: item.isUnlocked ? 1 : 0.38,
                      },
                    ]}
                  >
                    {item.isCompleted ? (
                      <Ionicons name="checkmark" size={20} color={chrome.accent2} />
                    ) : (
                      <Text style={[styles.dayCardNum, { color: item.isCurrent ? chrome.accent : chrome.text }]}>
                        {item.dayIndex}
                      </Text>
                    )}
                    <Text style={[styles.dayCardLabel, { color: item.isCurrent ? chrome.accent : chrome.muted }]}>день</Text>
                    <View style={[styles.dayMiniBar, { backgroundColor: chrome.surface }]}>
                      <View style={[styles.dayMiniProgress, { width: `${item.progressPct}%`, backgroundColor: item.isCompleted ? chrome.accent2 : chrome.accent }]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </LinearGradient>
          ) : null}

          {/* Weak spots — where the learner struggles, from plan attempt events */}
          {weakSpots && weakSpots.rows.length > 0 ? (
            <LinearGradient colors={chrome.card} style={[styles.sectionCard, { borderColor: chrome.border }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionKicker, { color: chrome.accent }]}>Слабые места</Text>
                <Text style={[styles.sectionTitle, { color: chrome.text }]}>Над чем поработать</Text>
              </View>
              {weakSpots.rows.map((row) => (
                <View key={row.id} style={styles.weakRow}>
                  <View style={[styles.weakIcon, { backgroundColor: chrome.accent + '18', borderColor: chrome.accent + '33' }]}>
                    <Ionicons
                      name={row.kind === 'grammar' ? 'construct-outline' : row.kind === 'vocabulary' ? 'book-outline' : 'alert-circle-outline'}
                      size={16}
                      color={chrome.accent}
                    />
                  </View>
                  {/* зачем: text-integrity — название слабого места переносится, ряд растёт. */}
                  <FlowText testID={`plan-weak-label-${row.id}`} provenance="authored" style={[styles.weakLabel, { color: chrome.text }]}>{row.label}</FlowText>
                  <Text style={[styles.weakCount, { color: chrome.muted }]}>{row.wrongCount} {row.wrongCount === 1 ? 'промах' : 'промаха'}</Text>
                </View>
              ))}
            </LinearGradient>
          ) : null}
        </Reanimated.ScrollView>
        </BouncyWrap>
        </Animated.View>
        </Reanimated.View>
      </LinearGradient>

      <DayReviewSheet
        day={reviewDay}
        phrases={reviewPhrases}
        chrome={chrome}
        canReplay={plan != null && reviewDay != null && allTasksForDay(reviewDay).length > 0}
        replayStartsPaid={reviewReplayStartsPaid}
        onPlayPhrase={playReviewPhrase}
        onReplayDay={replayDay}
        onClose={closeDayReview}
      />
    </View>
  );
}

export default withPersonalPlanSunsetGuard(PersonalPlanStatsScreen);

function DayReviewSheet({
  day, phrases, chrome, canReplay, replayStartsPaid, onPlayPhrase, onReplayDay, onClose,
}: {
  day: PlanDay | null;
  phrases: PlanDayPhrase[];
  chrome: StatsChrome;
  canReplay: boolean;
  replayStartsPaid: boolean;
  onPlayPhrase: (en: string) => void;
  onReplayDay: () => void;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const visible = day != null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <TouchableOpacity style={styles.sheetBackdropTap} activeOpacity={1} onPress={onClose} />
        <LinearGradient colors={chrome.card} style={[styles.sheet, { borderColor: chrome.border }]}>
          {day != null && (
            <>
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetKicker, { color: chrome.accent }]}>День {day.dayIndex}</Text>
                  <Text style={[styles.sheetTitle, { color: chrome.text }]} numberOfLines={2}>{day.title}</Text>
                  {!!day.focus && (
                    <Text style={[styles.sheetFocus, { color: chrome.muted }]} numberOfLines={2}>{day.focus}</Text>
                  )}
                </View>
                {/* зачем: сама статистика — цифры, жаловаться не на что, но эта
                    модалка показывает реальные фразы дня с переводом и
                    озвучкой — контент, в котором бывает ошибка. */}
                <ReportErrorButton
                  screen="personal_plan_day_review"
                  dataId={`plan_day_${day.dayIndex}`}
                  dataText={day.title}
                  variant="icon-flag"
                  accessibilityLabel={triLang(lang, { ru: 'Сообщить об ошибке во фразах дня', uk: 'Повідомити про помилку у фразах дня', es: 'Informar de un error en las frases del día', 'pt-BR': 'Relatar erro nas frases do dia', vi: 'Báo lỗi trong các câu của ngày', id: 'Laporkan kesalahan pada frasa hari ini', tr: 'Günün cümlelerindeki hatayı bildir', pl: 'Zgłoś błąd we frazach dnia' })}
                  testID="plan-day-review-report"
                />
                <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрыть" style={styles.sheetClose} activeOpacity={0.7}>
                  <Ionicons name="close" size={22} color={chrome.muted} />
                </TouchableOpacity>
              </View>

              <ScrollView decelerationRate="fast" style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollBody} showsVerticalScrollIndicator={false}>
                {!!day.phraseGoal && (
                  <Text style={[styles.sheetGoal, { color: chrome.text, borderColor: chrome.border, backgroundColor: chrome.surface }]}>
                    {day.phraseGoal}
                  </Text>
                )}

                <Text style={[styles.sheetSectionLabel, { color: chrome.accent }]}>
                  Фразы дня{phrases.length > 0 ? ` · ${phrases.length}` : ''}
                </Text>
                {phrases.length > 0 ? (
                  phrases.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => onPlayPhrase(p.english)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Произнести: ${p.english}`}
                      style={[styles.phraseRow, { borderColor: chrome.border }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.phraseEn, { color: chrome.text }]}>{p.english}</Text>
                        {(() => {
                          const translation = lang === 'es' ? (p.spanish || p.russian) : p.russian;
                          return !!translation && (
                            <Text style={[styles.phraseTranslation, { color: chrome.muted }]}>{translation}</Text>
                          );
                        })()}
                      </View>
                      <Ionicons name="volume-high" size={18} color={chrome.accent} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={[styles.sheetEmpty, { color: chrome.muted }]}>
                    В этот день не было новых фраз — тренировка/квиз.
                  </Text>
                )}
              </ScrollView>

              {canReplay && (
                /* зачем: знак «−1 ⚡» торчит над кнопкой, а сама кнопка клипует
                   содержимое (overflow:'hidden' в replayBtn держит градиент в
                   скруглении) — внутри неё молния обрезалась. Бейдж вынесен
                   соседом кнопки, в обёртку без клипа. */
                <View style={styles.replayWrap}>
                  <TouchableOpacity onPress={onReplayDay} activeOpacity={0.85} style={styles.replayBtn}>
                    <LinearGradient
                      colors={[chrome.accent, chrome.accent2]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.replayBtnInner}
                    >
                      <Ionicons name="refresh" size={18} color={chrome.bg[2]} />
                      <Text style={[styles.replayBtnText, { color: chrome.bg[2] }]}>Пройти этот день заново</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  {replayStartsPaid ? <EnergyCostBadge testID="personal-plan-stats-replay-energy-cost" /> : null}
                </View>
              )}
            </>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '800' },
  header: {
    paddingHorizontal: 12, paddingBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  back: {
    width: 46, height: 46, borderRadius: 14, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  kicker: { fontSize: 11, lineHeight: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 },
  title: { fontSize: 24, lineHeight: 29, fontWeight: '900', marginTop: 1 },
  scroll: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 40, gap: 12 },

  heroCard: { borderRadius: 14, borderWidth: 0, padding: 20, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  heroPct: { fontSize: 48, lineHeight: 52, fontWeight: '900' },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 20, lineHeight: 25, fontWeight: '900' },
  heroSub: { marginTop: 3, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  heroBar: { height: 10, borderRadius: 5, overflow: 'hidden' },
  heroBarFill: { height: '100%', borderRadius: 5 },

  grid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, borderRadius: 14, borderWidth: 0, padding: 16, gap: 6,
  },
  statIconWrap: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  statValue: { fontSize: 28, lineHeight: 32, fontWeight: '900' },
  statLabel: { fontSize: 12, lineHeight: 16, fontWeight: '800' },

  sectionCard: { borderRadius: 14, borderWidth: 0, padding: 16, overflow: 'hidden' },
  sectionHeader: { marginBottom: 14 },
  sectionKicker: { fontSize: 11, lineHeight: 14, fontWeight: '900', textTransform: 'uppercase' },
  sectionTitle: { fontSize: 20, lineHeight: 25, fontWeight: '900', marginTop: 2 },
  weeks: { gap: 10 },
  weakRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  weakIcon: { width: 34, height: 34, borderRadius: 11, borderWidth: 0, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  weakLabel: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '800', minWidth: 0 },
  weakCount: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weekLabel: { width: 58, fontSize: 13, lineHeight: 16, fontWeight: '900' },
  weekTrack: { flex: 1, height: 14, borderRadius: 7, overflow: 'hidden' },
  weekFill: { height: '100%', borderRadius: 7 },
  weekPct: { width: 42, textAlign: 'right', fontSize: 13, lineHeight: 16, fontWeight: '900' },

  dayRail: { paddingVertical: 4, gap: DAY_CARD_GAP },
  dayCard: {
    width: DAY_CARD_WIDTH, height: 96, borderRadius: 14, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 8,
  },
  dayCardNum: { fontSize: 24, lineHeight: 28, fontWeight: '900' },
  dayCardLabel: { fontSize: 10, lineHeight: 13, fontWeight: '900', textTransform: 'uppercase' },
  dayMiniBar: { width: '80%', height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  dayMiniProgress: { height: '100%', borderRadius: 2 },

  // ——— Лист просмотра прошлого дня ———
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetBackdropTap: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 0, borderBottomWidth: 0,
    paddingTop: 16, paddingHorizontal: 18, paddingBottom: 24, maxHeight: '82%',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  sheetKicker: { fontSize: 12, lineHeight: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  sheetTitle: { fontSize: 20, lineHeight: 25, fontWeight: '900', marginTop: 2 },
  sheetFocus: { fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 3 },
  sheetClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sheetScroll: { flexGrow: 0 },
  sheetScrollBody: { paddingBottom: 4, gap: 8 },
  sheetGoal: { fontSize: 14, lineHeight: 20, fontWeight: '700', borderWidth: 0, borderRadius: 12, padding: 12, marginBottom: 4 },
  sheetSectionLabel: { fontSize: 12, lineHeight: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6, marginBottom: 2 },
  phraseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 0, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13,
  },
  phraseEn: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  phraseTranslation: { fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 2 },
  sheetEmpty: { fontSize: 14, lineHeight: 20, fontWeight: '600', paddingVertical: 10 },
  // Отступ живёт на обёртке: бейдж цены привязан к ней, и кнопка обязана
  // совпадать с обёрткой по геометрии, иначе знак «−1 ⚡» уедет от угла.
  replayWrap: { marginTop: 14, position: 'relative' },
  replayBtn: { borderRadius: 14, overflow: 'hidden' },
  replayBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  replayBtnText: { fontSize: 16, lineHeight: 20, fontWeight: '900' },
});
