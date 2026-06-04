import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { hapticTap } from '../hooks/use-haptics';
import { getPlanById, type PersonalPlanDefinition, type PlanDailyTask } from './personal_plan_catalog';
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

export default function PersonalPlanScreen() {
  const router = useRouter();
  const { theme: t, themeMode } = useTheme();
  const { studyTarget } = useStudyTarget();
  const [loaded, setLoaded] = useState<LoadedPlan | null>(null);
  const isGold = themeMode === 'gold';
  const actionAccent = isGold ? '#FFE8A8' : t.accent;
  const actionText = isGold ? '#1B1205' : '#08110C';
  const cardBorder = isGold ? 'rgba(255,232,168,0.30)' : t.border;
  const screenBg = isGold ? '#090704' : t.bgPrimary;

  const load = useCallback(async () => {
    const state = await readPersonalPlanState();
    if (!state) {
      setLoaded(null);
      return;
    }
    const plan = getPlanById(state.planId);
    const [completedTasks, duePracticeCount, trainerCounts, duePlanTrainerWeakSpotCount, dueFlashcardsCount] = await Promise.all([
      readCompletedPlanTasks(),
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
  }, [studyTarget]);

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
    return loaded.runtime.tasks.reduce((sum, task) => sum + task.minutes, 0);
  }, [loaded]);

  const openTask = (task: PlanDailyTask) => {
    if (!loaded) return;
    hapticTap();
    openPersonalPlanTask(router, loaded.plan, loaded.runtime.visibleDay, task, loaded.state.planInstanceId);
  };

  if (!loaded) {
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
              <Text style={[styles.kicker, { color: t.textMuted }]}>Мой план</Text>
              <Text style={[styles.h1, { color: t.textPrimary }]}>План пока не выбран</Text>
            </View>
          </View>
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>Здесь появятся задания на день.</Text>
            <Text style={[styles.emptyText, { color: t.textMuted }]}>
              В DEV-календаре можно включить любой из пяти планов и проверить, как собирается день.
            </Text>
            {__DEV__ ? (
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => {
                  hapticTap();
                  router.push('/personal_plan_dev' as any);
                }}
                accessibilityRole="button"
                accessibilityLabel="Открыть DEV-календарь планов"
                style={[styles.primaryButton, { backgroundColor: actionAccent }]}
              >
                <Text style={[styles.primaryButtonText, { color: actionText }]}>Открыть DEV-календарь</Text>
                <Ionicons name="construct-outline" size={16} color={actionText} />
              </TouchableOpacity>
            ) : null}
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const { plan, runtime, snapshot, completedTasks } = loaded;
  const day = runtime.visibleDay;

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
            {runtime.tasks.map((task, index) => {
              const completed = Boolean(completedTasks[planTaskCompletionKey(loaded.state.planInstanceId, task.id)]);
              const visual = getPersonalPlanTaskVisual(task, plan.id);
              const isLast = index === runtime.tasks.length - 1;
              return (
                <View key={task.id} style={styles.taskTimelineRow}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineLine, { backgroundColor: index === 0 ? 'transparent' : actionAccent + '55' }]} />
                    <View style={[styles.timelineDot, { borderColor: actionAccent, backgroundColor: completed ? actionAccent : t.bgCard, shadowColor: actionAccent }]}>
                      <Text style={[styles.timelineDotText, { color: completed ? actionText : actionAccent }]}>
                        {completed ? '✓' : index + 1}
                      </Text>
                    </View>
                    <View style={[styles.timelineLine, { backgroundColor: isLast ? 'transparent' : actionAccent + '55' }]} />
                  </View>

                  <View
                    style={[
                      styles.taskCard,
                      { borderColor: completed ? actionAccent + 'AA' : actionAccent + '44', backgroundColor: t.bgCard, shadowColor: actionAccent },
                    ]}
                  >
                    <LinearGradient
                      pointerEvents="none"
                      colors={[actionAccent + (completed ? '26' : '16'), 'rgba(0,0,0,0.00)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <LinearGradient
                      pointerEvents="none"
                      colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.00)']}
                      locations={[0, 0.42, 1]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.glassTopSheen}
                    />
                    <LinearGradient
                      pointerEvents="none"
                      colors={['rgba(0,0,0,0.00)', 'rgba(0,0,0,0.34)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.glassBottomShade}
                    />
                    <View style={[styles.taskGlow, { backgroundColor: completed ? actionAccent : actionAccent + '66' }]} />
                    <View style={styles.taskTop}>
                      <View
                        testID={`task-art-${visual.artStyle}`}
                        style={[styles.taskArtPanel, { borderColor: actionAccent + '88', backgroundColor: actionAccent + '10', shadowColor: actionAccent }]}
                      >
                        <Image source={visual.asset} style={styles.taskArtImage} contentFit="cover" transition={120} />
                        <LinearGradient
                          pointerEvents="none"
                          colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.00)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.artGlassSheen}
                        />
                      </View>
                      <View style={styles.taskText}>
                        <Text style={[styles.taskTitle, { color: t.textPrimary }]}>{task.title}</Text>
                        <Text style={[styles.taskSub, { color: t.textMuted }]}>{task.subtitle}</Text>
                      </View>
                    </View>
                    <View style={styles.taskBottom}>
                      <Text style={[styles.dest, { color: t.textMuted }]}>
                        {task.minutes} мин
                      </Text>
                      <TouchableOpacity
                        hitSlop={8}
                        activeOpacity={0.82}
                        onPress={() => openTask(task)}
                        accessibilityRole="button"
                        accessibilityLabel={`${completed ? 'Повторить' : 'Открыть'} задание ${task.title}`}
                        style={[styles.openButton, { backgroundColor: completed ? t.bgSurface2 : actionAccent, borderColor: completed ? cardBorder : actionAccent, shadowColor: completed ? '#000000' : actionAccent }]}
                      >
                        <LinearGradient
                          pointerEvents="none"
                          colors={completed
                            ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.18)']
                            : ['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.07)', 'rgba(0,0,0,0.18)']}
                          locations={[0, 0.48, 1]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.buttonGlassSheen}
                        />
                        <Text style={[styles.openText, { color: completed ? t.textPrimary : actionText }]}>
                          {completed ? 'Повторить' : 'Открыть'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

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
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
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
  tasks: { gap: 0 },
  taskTimelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  timelineRail: {
    width: 34,
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 11,
    borderRadius: 999,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
  },
  timelineDotText: { fontSize: 12, lineHeight: 16, fontWeight: '900' },
  taskCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 13,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  glassTopSheen: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    height: '48%',
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
  },
  glassBottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
  },
  taskGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  taskTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  taskNum: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskNumText: { fontSize: 16, lineHeight: 20, fontWeight: '900' },
  taskIcon: {
    width: 34,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskArtPanel: {
    width: 104,
    height: 104,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    elevation: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 14,
  },
  taskArtImage: { width: '100%', height: '100%' },
  artGlassSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '55%',
  },
  taskText: { flex: 1, minWidth: 0, paddingTop: 1 },
  taskTitle: { fontSize: 16, lineHeight: 21, fontWeight: '900' },
  taskSub: { marginTop: 2, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  taskBottom: {
    marginTop: 14,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  dest: {
    alignSelf: 'flex-start',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
  },
  openButton: {
    alignSelf: 'stretch',
    minHeight: 62,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    overflow: 'hidden',
    elevation: 9,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.32,
    shadowRadius: 13,
  },
  buttonGlassSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 20,
  },
  openText: { fontSize: 16, lineHeight: 21, fontWeight: '900' },
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
  emptyWrap: { flex: 1, padding: 20, justifyContent: 'center' },
  emptyTitle: { fontSize: 24, lineHeight: 30, fontWeight: '900' },
  emptyText: { marginTop: 8, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  primaryButton: {
    alignSelf: 'flex-start',
    marginTop: 18,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: { fontSize: 13, lineHeight: 17, fontWeight: '900' },
});
