import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { hapticTap } from '../hooks/use-haptics';
import {
  allTasksForDay,
  getPlanById,
  nextTaskAfterVisibleSlice,
  tasksForMinutes,
  type PersonalPlanDefinition,
  type PlanDailyTask,
} from './personal_plan_catalog';
import { planTaskCompletionKey, readCompletedPlanTasks, type PersonalPlanCompletedTask } from './personal_plan_progress';
import {
  buildPersonalPlanSnapshot,
  buildTodayPlanRuntime,
  readPersonalPlanState,
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
};

const DAY_CARD_WIDTH = 106;
const DAY_CARD_GAP = 16;
const DAY_CARD_STRIDE = DAY_CARD_WIDTH + DAY_CARD_GAP;
const INSTANT_PLAN_DUE_COUNT = 999;

export default function PersonalPlanScreen() {
  const router = useRouter();
  const { theme: t, themeMode } = useTheme();
  const { studyTarget } = useStudyTarget();
  const [loaded, setLoaded] = useState<LoadedPlan | null>(null);
  const [extraVisibleTaskCount, setExtraVisibleTaskCount] = useState(0);
  const dayRailRef = useRef<ScrollView | null>(null);
  const isGold = themeMode === 'gold';
  const actionAccent = isGold ? '#FFE8A8' : t.accent;
  const cardBorder = isGold ? 'rgba(255,232,168,0.30)' : t.border;
  const screenBg = isGold ? '#090704' : t.bgPrimary;

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
    setLoaded({
      plan,
      state: advancedState,
      runtime: buildTodayPlanRuntime(input),
      snapshot: buildPersonalPlanSnapshot(input),
      completedTasks,
    });
  }, [router, studyTarget]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void load().then(() => {
        if (!alive) return;
      });
      return () => {
        alive = false;
      };
    }, [load]),
  );

  const totalMinutes = useMemo(() => {
    if (!loaded) return 0;
    const baseTasks = tasksForMinutes(loaded.runtime.visibleDay, loaded.state.minutesPerDay);
    const visibleTasks = allTasksForDay(loaded.runtime.visibleDay).slice(0, baseTasks.length + extraVisibleTaskCount);
    return visibleTasks.reduce((sum, task) => sum + task.minutes, 0);
  }, [extraVisibleTaskCount, loaded]);

  const dayRailItems = useMemo(() => {
    if (!loaded) return [];
    const currentDayIndex = loaded.runtime.visibleDay.dayIndex;
    const currentTasks = tasksForMinutes(loaded.runtime.visibleDay, loaded.state.minutesPerDay);
    const currentDone = currentTasks.filter((task) =>
      Boolean(loaded.completedTasks[planTaskCompletionKey(loaded.state.planInstanceId, task.id)])
    ).length;
    const currentProgressPct = currentTasks.length > 0 ? Math.round((currentDone / currentTasks.length) * 100) : 0;

    return loaded.plan.days.map((planDay) => {
      const tasks = tasksForMinutes(planDay, loaded.state.minutesPerDay);
      const completedCount = tasks.filter((task) =>
        Boolean(loaded.completedTasks[planTaskCompletionKey(loaded.state.planInstanceId, task.id)])
      ).length;
      const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
      const isCurrent = planDay.dayIndex === currentDayIndex;
      const isUnlocked = planDay.dayIndex <= currentDayIndex
        || (planDay.dayIndex === currentDayIndex + 1 && currentProgressPct >= 50);
      return {
        dayIndex: planDay.dayIndex,
        progressPct,
        isCurrent,
        isUnlocked,
        isCompleted: tasks.length > 0 && completedCount >= tasks.length,
      };
    });
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    setExtraVisibleTaskCount(0);
    const currentIndex = Math.max(0, loaded.runtime.visibleDay.dayIndex - 1);
    const viewportWidth = Dimensions.get('window').width;
    const centeredOffset = (currentIndex * DAY_CARD_STRIDE) - ((viewportWidth - DAY_CARD_WIDTH) / 2) + 16;
    const timer = setTimeout(() => {
      dayRailRef.current?.scrollTo({ x: Math.max(0, centeredOffset), animated: true });
    }, 60);
    return () => clearTimeout(timer);
  }, [loaded?.runtime.visibleDay.dayIndex]);

  const openTask = (task: PlanDailyTask) => {
    if (!loaded) return;
    hapticTap();
    openPersonalPlanTask(router, loaded.plan, loaded.runtime.visibleDay, task, loaded.state.planInstanceId);
  };

  if (!loaded) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: screenBg }]}>
        <LinearGradient colors={isGold ? ['#171008', '#090704'] : t.bgGradient} style={styles.fill} />
      </SafeAreaView>
    );
  }

  const { plan, runtime, snapshot, completedTasks } = loaded;
  const day = runtime.visibleDay;
  const baseVisibleTasks = tasksForMinutes(day, loaded.state.minutesPerDay);
  const visibleTasks = allTasksForDay(day).slice(0, baseVisibleTasks.length + extraVisibleTaskCount);
  const addMoreTask = nextTaskAfterVisibleSlice(day, loaded.state.minutesPerDay, extraVisibleTaskCount);
  const visibleTasksDone = visibleTasks.length > 0 && visibleTasks.every((task) =>
    Boolean(completedTasks[planTaskCompletionKey(loaded.state.planInstanceId, task.id)])
  );
  const canAddMoreTasks = Boolean(addMoreTask);
  const nextTask = visibleTasks.find((task) => !completedTasks[planTaskCompletionKey(loaded.state.planInstanceId, task.id)])
    ?? (visibleTasksDone && addMoreTask ? addMoreTask : visibleTasks[0])
    ?? null;
  const nextTaskVisual = nextTask ? getPersonalPlanTaskVisual(nextTask, plan.id) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: screenBg }]}>
      <LinearGradient colors={isGold ? ['#171008', '#090704'] : t.bgGradient} style={styles.fill}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={[styles.back, { backgroundColor: t.bgSurface2, borderColor: cardBorder }]}
          >
            <Ionicons name="chevron-back" size={23} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: t.textMuted }]}>{plan.name} · день {day.dayIndex}</Text>
            <Text style={[styles.h1, { color: t.textPrimary }]} numberOfLines={1}>{day.title}</Text>
          </View>
          <Text style={[styles.headerPct, { color: actionAccent }]}>{snapshot.dayProgressPct}%</Text>
        </View>

        <View style={styles.dayRailBlock}>
          <View style={styles.dayRailMeta}>
            <Text style={styles.dayRailLabel}>ОБЩИЙ ПРОГРЕСС</Text>
          </View>
          <ScrollView
            ref={dayRailRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayRailContent}
          >
            {dayRailItems.map((item) => (
              <TouchableOpacity
                key={`plan-day-${item.dayIndex}`}
                activeOpacity={item.isUnlocked ? 0.82 : 1}
                disabled={!item.isUnlocked}
                accessibilityRole="button"
                accessibilityState={{ disabled: !item.isUnlocked, selected: item.isCurrent }}
                accessibilityLabel={`День ${item.dayIndex}, выполнено ${item.progressPct}%`}
                style={[
                  styles.dayCard,
                  {
                    borderColor: item.isCurrent ? '#F2C48D' : 'rgba(255,255,255,0.055)',
                    backgroundColor: item.isCurrent ? 'rgba(83,70,58,0.62)' : 'rgba(48,48,51,0.74)',
                    opacity: item.isUnlocked ? 1 : 0.88,
                  },
                ]}
              >
                <Text style={[styles.dayCardNumber, { color: item.isCurrent ? '#F2C48D' : '#9B9790' }]}>
                  {item.dayIndex}
                </Text>
                <Text style={[styles.dayCardLabel, { color: item.isCurrent ? '#F2C48D' : '#8E8A84' }]}>ДЕНЬ</Text>
                <Text style={[styles.dayCardPct, { color: item.isCompleted ? '#F2C48D' : '#8E8A84' }]}>
                  {item.progressPct}%
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {runtime.todayDone ? (
            <View style={[styles.donePanel, { borderColor: actionAccent + '66', backgroundColor: actionAccent + '14' }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color={actionAccent} />
              <View style={styles.doneCopy}>
                <Text style={[styles.doneTitle, { color: t.textPrimary }]}>День закрыт</Text>
                <Text style={[styles.doneText, { color: t.textMuted }]}>
                  Завтра появится следующий шаг. Сегодня можно пройти что-то самостоятельно или спокойно остановиться.
                </Text>
              </View>
            </View>
          ) : null}

          <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Задания дня</Text>
          <View style={styles.tasks}>
            {visibleTasks.map((task) => {
              const completed = Boolean(completedTasks[planTaskCompletionKey(loaded.state.planInstanceId, task.id)]);
              const visual = getPersonalPlanTaskVisual(task, plan.id);
              return (
                <TouchableOpacity
                  key={task.id}
                  activeOpacity={0.82}
                  onPress={() => openTask(task)}
                  accessibilityRole="button"
                  accessibilityLabel={`${completed ? '\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c' : '\u041e\u0442\u043a\u0440\u044b\u0442\u044c'} \u0437\u0430\u0434\u0430\u043d\u0438\u0435 ${task.title}`}
                  style={styles.taskListRow}
                >
                  <View style={styles.taskWorkoutRow}>
                    <View
                      testID={`task-art-${visual.artStyle}`}
                      style={[
                        styles.taskIconRing,
                        {
                          borderColor: completed ? '#F8F7F3' : 'rgba(255,255,255,0.24)',
                          backgroundColor: completed ? '#F8F7F3' : 'rgba(255,255,255,0.08)',
                        },
                      ]}
                    >
                      {completed ? (
                        <Ionicons name="checkmark" size={27} color="#101014" />
                      ) : (
                        <>
                          <Image source={visual.asset} style={styles.taskSmallIconImage} contentFit="cover" transition={120} />
                          <View style={styles.taskIconScrim} />
                        </>
                      )}
                    </View>
                    <View style={styles.taskWorkoutCopy}>
                      <Text style={[styles.taskWorkoutTitle, { color: t.textPrimary }]}>
                        {task.title}
                      </Text>
                      <Text style={[styles.taskWorkoutSub, { color: t.textMuted }]}>
                        {completed ? '\u0413\u043e\u0442\u043e\u0432\u043e' : task.subtitle}
                      </Text>
                    </View>
                    <View style={styles.taskWorkoutActions}>
                      <Ionicons name="ellipsis-horizontal" size={24} color={t.textPrimary} />
                      <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.28)" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {canAddMoreTasks ? (
            <TouchableOpacity
              testID="personal-plan-add-more-task"
              activeOpacity={0.86}
              onPress={() => {
                hapticTap();
                setExtraVisibleTaskCount((count) => count + 1);
              }}
              accessibilityRole="button"
              accessibilityLabel="Добавить еще задание"
              style={[styles.addMoreButton, { borderColor: actionAccent + '77', backgroundColor: actionAccent + '16' }]}
            >
              <Ionicons name="add-circle-outline" size={22} color={actionAccent} />
              <Text style={[styles.addMoreText, { color: t.textPrimary }]}>Добавить еще задание</Text>
            </TouchableOpacity>
          ) : null}

          {__DEV__ ? (
            <TouchableOpacity
              hitSlop={8}
              activeOpacity={0.82}
              onPress={() => {
                hapticTap();
                router.push('/personal_plan_dev' as any);
              }}
              accessibilityRole="button"
              accessibilityLabel="Открыть все планы и дни"
              style={[styles.devLink, { borderColor: cardBorder, backgroundColor: t.bgSurface2 }]}
            >
              <Ionicons name="construct-outline" size={16} color={t.textSecond} />
              <Text style={[styles.devLinkText, { color: t.textSecond }]}>DEV · все планы и дни</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        {nextTask ? (
          <View style={styles.nextDockWrap} pointerEvents="box-none">
            <TouchableOpacity
              hitSlop={8}
              activeOpacity={0.86}
              onPress={() => openTask(nextTask)}
              accessibilityRole="button"
              accessibilityLabel={`Следующее задание: ${nextTask.title}`}
              style={[
                styles.nextDock,
                { borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(42,42,48,0.94)', shadowColor: '#000000' },
              ]}
            >
              <View style={styles.nextDockInfo}>
                <View style={[styles.nextDockIcon, { borderColor: 'rgba(255,255,255,0.20)' }]}>
                  {nextTaskVisual ? (
                    <Image source={nextTaskVisual.asset} style={styles.nextDockImage} contentFit="cover" transition={120} />
                  ) : null}
                  <View style={styles.taskIconScrim} />
                </View>
                <View style={styles.nextDockCopy}>
                  <Text style={[styles.nextDockTitle, { color: t.textPrimary }]} numberOfLines={1}>{nextTask.title}</Text>
                  <Text style={[styles.nextDockSub, { color: t.textMuted }]} numberOfLines={1}>Up next</Text>
                </View>
              </View>
              <View style={styles.nextDockButton}>
                <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
                <Text style={styles.nextDockButtonText}>Следующее</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    width: 50,
    height: 50,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  kicker: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  h1: {
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
  },
  headerPct: { fontSize: 21, lineHeight: 26, fontWeight: '900' },
  dayRailBlock: {
    paddingTop: 4,
    paddingBottom: 24,
  },
  dayRailMeta: {
    paddingHorizontal: 0,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayRailLabel: {
    color: '#C8C4BC',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  dayRailContent: {
    paddingHorizontal: 0,
    gap: DAY_CARD_GAP,
  },
  dayCard: {
    width: DAY_CARD_WIDTH,
    height: 150,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 18,
    paddingBottom: 20,
  },
  dayCardNumber: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '900',
  },
  dayCardLabel: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  dayCardPct: {
    marginTop: 17,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 112,
  },
  donePanel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    marginBottom: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  doneCopy: { flex: 1, minWidth: 0 },
  doneTitle: { fontSize: 16, lineHeight: 21, fontWeight: '900' },
  doneText: { marginTop: 2, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 21, lineHeight: 27, fontWeight: '900', marginBottom: 9 },
  tasks: { gap: 6 },
  taskListRow: {
    minHeight: 64,
    justifyContent: 'center',
  },
  taskWorkoutRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 5,
    gap: 8,
  },
  taskIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  taskSmallIconImage: { width: '100%', height: '100%' },
  taskIconScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  taskWorkoutCopy: { flex: 1, minWidth: 0, paddingRight: 6, paddingTop: 3 },
  taskWorkoutTitle: { fontSize: 17, lineHeight: 22, fontWeight: '900' },
  taskWorkoutSub: { marginTop: 1, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  taskWorkoutActions: {
    width: 76,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 13,
    paddingTop: 8,
    flexShrink: 0,
  },
  addMoreButton: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addMoreText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  nextDockWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
  },
  nextDock: {
    minHeight: 78,
    borderRadius: 25,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    elevation: 14,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
  },
  nextDockInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextDockIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
    flexShrink: 0,
  },
  nextDockImage: { width: '100%', height: '100%' },
  nextDockCopy: { flex: 1, minWidth: 0 },
  nextDockTitle: { fontSize: 18, lineHeight: 23, fontWeight: '900' },
  nextDockSub: { marginTop: 1, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  nextDockButton: {
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  nextDockButtonText: { color: '#FFFFFF', fontSize: 14, lineHeight: 18, fontWeight: '900' },
  devLink: {
    minHeight: 42,
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  devLinkText: { fontSize: 12, lineHeight: 16, fontWeight: '900' },
});
