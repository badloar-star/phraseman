import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '../components/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { safeRouterBack } from './navigation_back';
import LessonIntroScreens from './lesson_intro_screens';
import { getBundledCompatibilityPlanContentTheoryDay } from './plan_content_readiness';
import { fetchPlanContentDayForScreenServerFirst } from './plan_content_remote_facade';
import type { PlanContentDay } from './plan_content_schema';
import { contentDayToLessonIntroScreens } from './plan_content_runtime_adapter';
import ReportErrorButton from '../components/ReportErrorButton';
import { getPlanById, type PersonalPlanId } from './personal_plan_catalog';
import { openPersonalPlanTask } from './personal_plan_navigation';

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : (value ?? '');
}

/**
 * Day-specific theory for a personal-plan day. Renders the same proven intro UI as
 * lessons, but with theory written by the content pipeline for THIS day (not borrowed
 * from a lesson). Opened from the plan day screen before starting the day's tasks.
 */
export default function PersonalPlanTheoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme: t } = useTheme();
  const insets = useStableSafeAreaInsets();

  const planId = firstParam(params.planId);
  const dayIndex = Number(firstParam(params.dayIndex) || '1');
  const startTaskId = firstParam(params.startTaskId);
  const planInstanceId = firstParam(params.planInstanceId);

  // Server-first with a 150ms deadline: if the verified server day comes back
  // in under 150ms (the typical disk-cache-hit path), we paint the server day
  // straight away — no bundled flash, no swap. If the deadline expires, we
  // paint the bundled (still the up-to-date corrected version) so the screen
  // never feels stuck, and atomically upgrade to the server day when it arrives.
  // The bundled gate still decides whether theory is renderable at all.
  const bundledGateDay = useMemo<PlanContentDay | null>(
    () => getBundledCompatibilityPlanContentTheoryDay(planId, dayIndex) ?? null,
    [planId, dayIndex],
  );
  const [day, setDay] = useState<PlanContentDay | null>(null);
  const [resolved, setResolved] = useState<boolean>(false);
  useEffect(() => {
    let cancelled = false;
    setDay(null);
    setResolved(false);
    if (!bundledGateDay) {
      // The bundled gate says theory isn't available for this day — preserve
      // the existing empty-state behavior and skip the server race entirely.
      setResolved(true);
      return;
    }
    fetchPlanContentDayForScreenServerFirst(planId, dayIndex, 'theory')
      .then((screenFetch) => {
        if (cancelled) return;
        // Initial paint: server if it won the race, otherwise bundled.
        setDay(screenFetch.initial ?? bundledGateDay);
        setResolved(true);
        // Background upgrade: bundled → server when the server lost the race
        // but eventually produced a verified copy.
        if (screenFetch.pendingUpgrade) {
          screenFetch.pendingUpgrade.then((later) => {
            if (cancelled) return;
            if (later) setDay(later);
          }).catch(() => { /* keep bundled */ });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setDay(bundledGateDay);
        setResolved(true);
      });
    return () => { cancelled = true; };
  }, [planId, dayIndex, bundledGateDay]);
  const introScreens = useMemo(
    () => (day ? contentDayToLessonIntroScreens(day) : []),
    [day],
  );

  const goBack = () => safeRouterBack(router, '/personal_plan');

  // Кнопка в конце теории запускает первое задание дня (startTaskId) С ПЕРВОГО
  // упражнения через replace (теория уходит из стека, «назад» ведёт в меню плана).
  // Если задания не передано/не найдено — старое поведение: возврат в меню.
  const onCompleteTheory = () => {
    if (!startTaskId) return goBack();
    try {
      const plan = getPlanById(planId as PersonalPlanId);
      const day = plan.days.find((d) => d.dayIndex === dayIndex);
      const task = day?.tasks.find((tk) => tk.id === startTaskId);
      // destination 'lesson' в openPersonalPlanTask — пустой return (никуда не ведёт),
      // поэтому такие задания не запускаем из теории, чтобы экран не завис → goBack.
      if (day && task && task.destination.type !== 'lesson') {
        openPersonalPlanTask(router, plan, day, task, planInstanceId || undefined, 'replace');
        return;
      }
    } catch {
      // нет такого плана/дня/задания — мягко возвращаемся в меню
    }
    goBack();
  };

  if (introScreens.length === 0) {
    // Empty-state only when the server-first race actually finished. While the
    // race is still running (resolved=false) we show a clean theme-colored
    // container so the user doesn't see "скоро появится" flash for ~150ms.
    return (
      <View style={[styles.safe, { backgroundColor: t.bgPrimary, paddingTop: insets.top }]}>
        {resolved ? (
          <View style={styles.center}>
            <Ionicons name="book-outline" size={40} color={t.textMuted} />
            <Text style={[styles.emptyText, { color: t.textMuted }]}>Теория для этого дня скоро появится</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <LessonIntroScreens
        introScreens={introScreens}
        lessonId={dayIndex}
        onComplete={onCompleteTheory}
        onBack={goBack}
      />
      <View style={styles.reportFloat} pointerEvents="box-none">
        <ReportErrorButton
          variant="icon-flag"
          screen="personal_plan_theory"
          dataId={`${planId}_day_${dayIndex}_theory`}
          dataText={`Теория дня ${dayIndex}`}
          style={[styles.reportFloatBtn, { backgroundColor: t.bgCard, borderColor: t.border }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  emptyText: { fontSize: 15, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  reportFloat: { position: 'absolute', left: 16, bottom: 28 },
  reportFloatBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
});
