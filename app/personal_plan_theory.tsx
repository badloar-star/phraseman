import React, { useMemo } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '../components/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { safeRouterBack } from './navigation_back';
import LessonIntroScreens from './lesson_intro_screens';
import { getAuthoredPlanContentDay } from './plan_content_registry';
import { contentDayToLessonIntroScreens } from './plan_content_runtime_adapter';
import ReportErrorButton from '../components/ReportErrorButton';

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

  const planId = firstParam(params.planId);
  const dayIndex = Number(firstParam(params.dayIndex) || '1');

  const introScreens = useMemo(() => {
    const day = getAuthoredPlanContentDay(planId, dayIndex);
    return day ? contentDayToLessonIntroScreens(day) : [];
  }, [planId, dayIndex]);

  const goBack = () => safeRouterBack(router, '/personal_plan');

  if (introScreens.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bgPrimary }]}>
        <View style={styles.center}>
          <Ionicons name="book-outline" size={40} color={t.textMuted} />
          <Text style={[styles.emptyText, { color: t.textMuted }]}>Теория для этого дня скоро появится</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safe}>
      <LessonIntroScreens
        introScreens={introScreens}
        lessonId={dayIndex}
        onComplete={goBack}
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
});
