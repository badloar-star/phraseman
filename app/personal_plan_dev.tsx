import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TapScale from '../components/TapScale';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { safeRouterBack } from './navigation_back';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import {
  PERSONAL_PLAN_CATALOG,
  type PersonalPlanDefinition,
  type PlanDay,
  type PlanMinutesChoice,
  type PlanDailyTask,
  normalizePlanMinutes,
  tasksForMinutes,
} from './personal_plan_catalog';
import { planTaskCompletionKey, readCompletedPlanTasks } from './personal_plan_progress';
import {
  activatePersonalPlan,
  clearPersonalPlanState,
  readPersonalPlanState,
  type PersonalPlanState,
} from './personal_plan_state';
import { openPersonalPlanTask } from './personal_plan_navigation';
import { buildPersonalPlanDayPassport } from './personal_plan_quality';
import { getPersonalPlanTaskVisual } from './personal_plan_task_visuals';

import { noAndroidOutline } from '../constants/androidGlow';
const minuteChoices: PlanMinutesChoice[] = [5, 10, 15, 20];

export default function PersonalPlanDevScreen() {
  const router = useRouter();
  const { theme: t, themeMode } = useTheme();
  const [planId, setPlanId] = useState(PERSONAL_PLAN_CATALOG[2].id);
  const selectedPlan = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === planId) ?? PERSONAL_PLAN_CATALOG[2];
  const [minutes, setMinutes] = useState<PlanMinutesChoice>(selectedPlan.minutesDefault);
  const [dayIndex, setDayIndex] = useState(1);
  const [completedTasks, setCompletedTasks] = useState<Record<string, unknown>>({});
  const [activeState, setActiveState] = useState<PersonalPlanState | null>(null);
  const selectedDay = selectedPlan.days[Math.max(0, Math.min(selectedPlan.days.length - 1, dayIndex - 1))];
  const selectedTasks = useMemo(() => tasksForMinutes(selectedDay, minutes), [selectedDay, minutes]);
  const selectedDayPassport = useMemo(
    () => buildPersonalPlanDayPassport(selectedPlan, selectedDay),
    [selectedPlan, selectedDay],
  );
  const isGold = themeMode === 'gold';

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void Promise.all([readCompletedPlanTasks(), readPersonalPlanState()]).then(([items, state]) => {
        if (!alive) return;
        setCompletedTasks(items);
        setActiveState(state);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const pickPlan = (plan: PersonalPlanDefinition) => {
    hapticTap();
    setPlanId(plan.id);
    setMinutes(normalizePlanMinutes(plan.minutesDefault));
    setDayIndex(1);
  };

  const activateSelectedPlan = async () => {
    hapticTap();
    const state = await activatePersonalPlan({
      planId: selectedPlan.id,
      minutesPerDay: minutes,
      startDayIndex: selectedDay.dayIndex,
    });
    setActiveState(state);
  };

  const resetActivePlan = async () => {
    hapticTap();
    await clearPersonalPlanState();
    setActiveState(null);
  };

  const activePlanInstanceId = activeState?.planId === selectedPlan.id ? activeState.planInstanceId : undefined;

  const openDestination = (task: PlanDailyTask) => {
    hapticTap();
    openPersonalPlanTask(router, selectedPlan, selectedDay, task, activePlanInstanceId);
  };

  const cardBorder = isGold ? 'rgba(255,232,168,0.30)' : t.border;
  const screenBg = isGold ? '#090704' : t.bgPrimary;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: screenBg }]}>
      <LinearGradient colors={isGold ? ['#171008', '#090704'] : t.bgGradient} style={styles.fill}>
        <View style={styles.header}>
          <TapScale
            onPress={() => safeRouterBack(router, '/personal_plan')}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={[styles.back, { backgroundColor: t.bgSurface2, borderColor: cardBorder }]}
          >
            <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
          </TapScale>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: t.textMuted }]}>DEV · персональные планы</Text>
            <Text style={[styles.h1, { color: t.textPrimary }]} numberOfLines={1}>Календарь планов</Text>
          </View>
        </View>

        <ScrollView decelerationRate="normal" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.planTabs}>
            {PERSONAL_PLAN_CATALOG.map((plan) => {
              const active = plan.id === selectedPlan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  activeOpacity={0.82}
                  onPress={() => pickPlan(plan)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.planTab,
                    { borderColor: active ? plan.accent : cardBorder, backgroundColor: active ? plan.accent + '22' : t.bgSurface2 },
                  ]}
                >
                  <Text style={[styles.planName, { color: active ? plan.accent : t.textPrimary }]} numberOfLines={1}>{plan.name}</Text>
                  <Text style={[styles.planMeta, { color: t.textMuted }]} numberOfLines={1}>{plan.horizonWeeks} недель · {plan.days.length} дней</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.hero, { borderColor: selectedPlan.accent + '66', backgroundColor: t.bgCard }]}>
            <View style={styles.heroTop}>
              <View style={styles.heroTitle}>
                <View style={[styles.planMark, { backgroundColor: selectedPlan.accent + '22', borderColor: selectedPlan.accent + '66' }]}>
                  <Text style={[styles.planMarkText, { color: selectedPlan.accent }]}>{selectedPlan.name[0]}</Text>
                </View>
                <View style={styles.heroText}>
                  <Text style={[styles.heroName, { color: t.textPrimary }]} numberOfLines={1}>{selectedPlan.name}</Text>
                  <Text style={[styles.heroGoal, { color: t.textMuted }]} numberOfLines={2}>{selectedPlan.goal}</Text>
                </View>
              </View>
              <Text style={[styles.heroPct, { color: selectedPlan.accent }]}>0%</Text>
            </View>
            <View style={styles.scale}>
              {[0, 1, 2, 3, 4].map((idx) => (
                <View key={idx} style={[styles.scaleSeg, { backgroundColor: idx === 0 ? selectedPlan.accent : t.bgSurface2 }]} />
              ))}
            </View>
            <Text style={[styles.heroSub, { color: t.textMuted }]}>
              {selectedPlan.shortFocus}. Ориентир до заметного прогресса при выбранном темпе.
            </Text>
          </View>

          <View style={styles.minuteRow}>
            {minuteChoices.map((item) => {
              const active = item === minutes;
              return (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.82}
                  onPress={() => {
                    hapticTap();
                    setMinutes(item);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.minute, { borderColor: active ? selectedPlan.accent : cardBorder, backgroundColor: active ? selectedPlan.accent + '22' : t.bgSurface2 }]}
                >
                  <Text style={[styles.minuteText, { color: active ? selectedPlan.accent : t.textPrimary }]}>
                    {item} мин
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.activePlanPanel, { borderColor: cardBorder, backgroundColor: t.bgSurface2 }]}>
            <View style={styles.activePlanCopy}>
              <Text style={[styles.kicker, { color: t.textMuted }]}>DEV · активный план</Text>
              <Text style={[styles.activePlanText, { color: t.textPrimary }]} numberOfLines={2}>
                {activeState
                  ? `${PERSONAL_PLAN_CATALOG.find((plan) => plan.id === activeState.planId)?.name ?? activeState.planId} · день ${activeState.currentDayIndex} · ${activeState.minutesPerDay} минут`
                  : 'На главной пока показывается обычное продолжение урока'}
              </Text>
            </View>
            <View style={styles.activePlanActions}>
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={activateSelectedPlan}
                accessibilityRole="button"
                accessibilityLabel="Сделать выбранный план активным"
                style={[styles.devAction, { backgroundColor: selectedPlan.accent }]}
              >
                <Text style={styles.devActionText}>Включить</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={resetActivePlan}
                accessibilityRole="button"
                accessibilityLabel="Сбросить активный план"
                style={[styles.devActionGhost, { borderColor: cardBorder }]}
              >
                <Text style={[styles.devActionGhostText, { color: t.textPrimary }]}>Сбросить</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => {
                  hapticTap();
                  router.push('/personal_plan_runtime_dev' as any);
                }}
                accessibilityRole="button"
                accessibilityLabel="Открыть новый runtime заданий"
                style={[styles.devActionGhost, { borderColor: selectedPlan.accent + '88' }]}
              >
                <Text style={[styles.devActionGhostText, { color: selectedPlan.accent }]}>Runtime</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.dayHeader}>
            <View>
              <Text style={[styles.kicker, { color: t.textMuted }]}>День {selectedDay.dayIndex} · неделя {selectedDay.weekIndex}</Text>
              <Text style={[styles.dayTitle, { color: t.textPrimary }]}>{selectedDay.title}</Text>
              <View style={[styles.qualityBadge, { borderColor: selectedDayPassport.ready ? selectedPlan.accent + '66' : t.wrong + '66', backgroundColor: selectedDayPassport.ready ? selectedPlan.accent + '18' : t.wrongBg }]}>
                <Ionicons name={selectedDayPassport.ready ? 'checkmark-circle-outline' : 'warning-outline'} size={14} color={selectedDayPassport.ready ? selectedPlan.accent : t.wrong} />
                <Text style={[styles.qualityBadgeText, { color: selectedDayPassport.ready ? selectedPlan.accent : t.wrong }]}>
                  {selectedDayPassport.ready ? 'Паспорт готов' : `Проверить: ${selectedDayPassport.issueCount}`}
                </Text>
              </View>
            </View>
            <View style={[styles.dayCount, { backgroundColor: selectedPlan.accent + '22' }]}>
              <Text style={[styles.dayCountText, { color: selectedPlan.accent }]}>{selectedTasks.length}</Text>
            </View>
          </View>

          <Text style={[styles.bodyText, { color: t.textMuted }]}>{selectedDay.focus}</Text>
          <Text style={[styles.bodyText, { color: t.textMuted }]}>{selectedDay.phraseGoal}</Text>
          <Text style={[styles.theory, { color: t.textPrimary, borderColor: cardBorder, backgroundColor: t.bgSurface2 }]}>
            Теория: {selectedDay.theory}
          </Text>

          <View style={styles.tasks}>
            {selectedTasks.map((task, index) => {
              const completed = Boolean(completedTasks[planTaskCompletionKey(activePlanInstanceId, task.id)]);
              const visual = getPersonalPlanTaskVisual(task, selectedPlan.id, themeMode);
              const isLast = index === selectedTasks.length - 1;
              return (
                <View key={task.id} style={styles.taskTimelineRow}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineLine, { backgroundColor: index === 0 ? 'transparent' : selectedPlan.accent + '55' }]} />
                    <View style={[styles.timelineDot, { borderColor: selectedPlan.accent, backgroundColor: completed ? selectedPlan.accent : t.bgCard, shadowColor: selectedPlan.accent }]}>
                      <Text style={[styles.timelineDotText, { color: completed ? '#08110C' : selectedPlan.accent }]}>
                        {completed ? '✓' : index + 1}
                      </Text>
                    </View>
                    <View style={[styles.timelineLine, { backgroundColor: isLast ? 'transparent' : selectedPlan.accent + '55' }]} />
                  </View>

                  <View style={[styles.taskCard, { borderColor: completed ? selectedPlan.accent + 'AA' : selectedPlan.accent + '44', backgroundColor: t.bgCard, shadowColor: selectedPlan.accent }]}>
                    <LinearGradient
                      pointerEvents="none"
                      colors={[selectedPlan.accent + (completed ? '26' : '14'), 'rgba(0,0,0,0.00)']}
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
                    <View style={styles.taskTop}>
                      <View
                        testID={`dev-task-art-${visual.artStyle}`}
                        style={[styles.taskArtPanel, { borderColor: selectedPlan.accent + '88', backgroundColor: selectedPlan.accent + '10', shadowColor: selectedPlan.accent }]}
                      >
                        <Image source={visual.asset} style={styles.taskArtImage} contentFit="contain" transition={120} />
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
                        onPress={() => openDestination(task)}
                        accessibilityRole="button"
                        accessibilityLabel={`Открыть задание ${task.title}`}
                        style={[styles.openButton, { backgroundColor: selectedPlan.accent, shadowColor: selectedPlan.accent }]}
                      >
                        <LinearGradient
                          pointerEvents="none"
                          colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.07)', 'rgba(0,0,0,0.18)']}
                          locations={[0, 0.48, 1]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.buttonGlassSheen}
                        />
                        <Text style={styles.openText}>Открыть</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={[styles.listTitle, { color: t.textPrimary }]}>Все дни плана</Text>
          <View style={styles.dayGrid}>
            {selectedPlan.days.map((day: PlanDay) => {
              const active = day.dayIndex === selectedDay.dayIndex;
              const dayPassport = buildPersonalPlanDayPassport(selectedPlan, day);
              return (
                <TouchableOpacity
                  key={day.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    hapticTap();
                    setDayIndex(day.dayIndex);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.dayPill,
                    { borderColor: active ? selectedPlan.accent : dayPassport.ready ? cardBorder : t.wrong + '55', backgroundColor: active ? selectedPlan.accent + '22' : t.bgSurface2 },
                  ]}
                >
                  <Text style={[styles.dayPillNum, { color: active ? selectedPlan.accent : t.textPrimary }]}>Д{day.dayIndex}</Text>
                  <Text style={[styles.dayPillText, { color: t.textMuted }]} numberOfLines={1}>{day.title}</Text>
                  <Text style={[styles.dayPillQuality, { color: dayPassport.ready ? selectedPlan.accent : t.wrong }]}>
                    {dayPassport.ready ? 'OK' : dayPassport.issueCount}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
    width: 44,
    height: 44,
    borderRadius: 15,
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
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  planTabs: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 12,
  },
  planTab: {
    flex: 1,
    minHeight: 58,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  planName: { fontSize: 13, lineHeight: 17, fontWeight: '900' },
  planMeta: { marginTop: 2, fontSize: 10, lineHeight: 13, fontWeight: '700' },
  hero: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    marginBottom: 12,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroTitle: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  planMark: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planMarkText: { fontSize: 21, lineHeight: 25, fontWeight: '900' },
  heroText: { flex: 1, minWidth: 0 },
  heroName: { fontSize: 23, lineHeight: 28, fontWeight: '900' },
  heroGoal: { marginTop: 1, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  heroPct: { fontSize: 21, lineHeight: 26, fontWeight: '900' },
  scale: { flexDirection: 'row', gap: 7, marginTop: 14 },
  scaleSeg: { flex: 1, height: 9, borderRadius: 999 },
  heroSub: { marginTop: 11, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  minuteRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  minute: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minuteText: { fontSize: 13, lineHeight: 17, fontWeight: '900' },
  activePlanPanel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activePlanCopy: { flex: 1, minWidth: 0 },
  activePlanText: { marginTop: 2, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  activePlanActions: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 0 },
  devAction: {
    minHeight: 34,
    borderRadius: 12,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devActionText: { color: '#08110C', fontSize: 11, lineHeight: 15, fontWeight: '900' },
  devActionGhost: {
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devActionGhostText: { fontSize: 11, lineHeight: 15, fontWeight: '900' },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  dayTitle: { fontSize: 25, lineHeight: 31, fontWeight: '900' },
  qualityBadge: {
    alignSelf: 'flex-start',
    minHeight: 26,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  qualityBadgeText: { fontSize: 10, lineHeight: 13, fontWeight: '900' },
  dayCount: {
    minWidth: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  dayCountText: { fontSize: 18, lineHeight: 22, fontWeight: '900' },
  bodyText: { fontSize: 13, lineHeight: 19, fontWeight: '700', marginBottom: 6 },
  theory: {
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
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
    ...noAndroidOutline,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
  },
  timelineDotText: { fontSize: 12, lineHeight: 16, fontWeight: '900' },
  taskCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    marginBottom: 12,
    overflow: 'hidden',
    ...noAndroidOutline,
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
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
  },
  glassBottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
  },
  taskTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  taskNum: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskNumText: { fontSize: 16, lineHeight: 20, fontWeight: '900' },
  taskArtPanel: {
    width: 104,
    height: 104,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...noAndroidOutline,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 14,
  },
  taskArtImage: { width: 104, height: 104 },
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
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...noAndroidOutline,
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
  openText: { color: '#08110C', fontSize: 16, lineHeight: 21, fontWeight: '900' },
  listTitle: { marginTop: 18, marginBottom: 9, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  dayGrid: { gap: 8 },
  dayPill: {
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayPillNum: { width: 34, fontSize: 13, lineHeight: 17, fontWeight: '900' },
  dayPillText: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  dayPillQuality: { minWidth: 24, textAlign: 'right', fontSize: 11, lineHeight: 15, fontWeight: '900' },
});
