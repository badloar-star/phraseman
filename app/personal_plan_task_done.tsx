import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from '../components/SafeLinearGradient';
import BounceView from '../components/BounceView';
import { useTheme } from '../components/ThemeContext';
import { hapticSuccess } from '../hooks/use-haptics';
import { loadPlanDayComparison, planDayComparisonLine, type PlanDayComparison } from './personal_plan_day_comparison';
import { hasBundledCompatibilityPlanContentDay } from './plan_content_readiness';
import ReportErrorButton from '../components/ReportErrorButton';
import { monoIcon } from '../constants/monoIcon';

function firstParam(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? '' : v ?? '';
}

const CELEBRATION_LINES = [
  'Отличная работа! Фразы оседают в памяти.',
  'Ещё один день — ещё один шаг вперёд.',
  'Последовательность важнее интенсивности.',
  'Мозг теперь обрабатывает это в фоне.',
  'Дисциплина сегодня — беглость завтра.',
];

export default function PersonalPlanTaskDoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme: t, themeMode } = useTheme();
  const insets = useStableSafeAreaInsets();

  const taskTitle = firstParam(params.taskTitle);
  const dayProgress = Number(firstParam(params.dayProgress) || '0');
  const allDone = firstParam(params.allDone) === '1';
  const planId = firstParam(params.planId);
  const dayIndex = Number(firstParam(params.dayIndex) || '1');

  const celebLine = CELEBRATION_LINES[dayIndex % CELEBRATION_LINES.length];
  const [comparison, setComparison] = useState<PlanDayComparison | null>(null);

  // After finishing the whole day, compare with other learners (reuses the deployed
  // leaderboard percentile pipeline — plan XP already feeds daily7xp).
  useEffect(() => {
    if (!allDone) return;
    let alive = true;
    void loadPlanDayComparison().then((c) => { if (alive) setComparison(c); });
    return () => { alive = false; };
  }, [allDone]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    hapticSuccess();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1, tension: 80, friction: 8, delay: 150, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, delay: 100, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim, checkScale, slideAnim]);

  const isGold = themeMode === 'gold';
  const bg = isGold ? '#090704' : t.bgPrimary;
  const accent = t.accent;

  const goBack = () => {
    router.replace('/personal_plan' as any);
  };

  return (
    <View style={[styles.safe, { backgroundColor: bg, paddingTop: insets.top }]}>
      <LinearGradient colors={t.bgGradient} style={styles.fill}>
        <BounceView style={styles.fill}>
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.72}
            onPress={goBack}
            style={[styles.closeBtn, { backgroundColor: t.bgCard }]}
          >
            <Ionicons name="close" size={22} color={t.textMuted} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {hasBundledCompatibilityPlanContentDay(planId, dayIndex) ? (
            <ReportErrorButton
              variant="icon-flag"
              screen="personal_plan_task_done"
              dataId={`${planId}_day_${dayIndex}_done`}
              dataText={`День ${dayIndex} закрыт${taskTitle ? ` · ${taskTitle}` : ''}`}
              style={[styles.closeBtn, { backgroundColor: t.bgCard }]}
            />
          ) : null}
        </View>

        <Animated.View
          style={[
            styles.body,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.checkCircle,
              {
                backgroundColor: accent + '20',
                borderColor: accent,
                transform: [{ scale: checkScale }],
              },
            ]}
          >
            <Ionicons
              name={allDone ? 'trophy-outline' : 'checkmark-circle-outline'}
              size={64}
              color={allDone ? accent : '#4ECDC4'}
            />
          </Animated.View>

          <View style={[styles.labelPill, { backgroundColor: accent + '1F' }]}>
            <Text style={[styles.labelText, { color: accent }]}>
              {allDone ? 'День завершён!' : 'Задание выполнено!'}
            </Text>
          </View>

          <Text style={[styles.title, { color: t.textPrimary }]}>
            {allDone ? `День ${dayIndex} закрыт` : taskTitle || 'Задание выполнено'}
          </Text>

          <Text style={[styles.subtitle, { color: t.textMuted }]}>
            {allDone ? celebLine : 'Так держать! Продолжай план.'}
          </Text>

          {allDone && comparison ? (
            <View style={[styles.compareCard, { backgroundColor: accent + '1F' }]}>
              <Ionicons name="people-outline" size={20} color={accent} />
              <View style={styles.compareCopy}>
                <Text style={[styles.compareTitle, { color: t.textPrimary }]}>{planDayComparisonLine(comparison)}</Text>
                {comparison.totalUsers > 0 ? (
                  <Text style={[styles.compareSub, { color: t.textMuted }]}>
                    Среди {comparison.totalUsers.toLocaleString('ru-RU')} учеников
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {dayProgress > 0 ? (
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: t.bgCard }]}>
                <Text style={[styles.statValue, { color: accent }]}>{dayProgress}%</Text>
                <Text style={[styles.statLabel, { color: t.textMuted }]}>день</Text>
              </View>
              {allDone ? (
                <View style={[styles.statBox, { backgroundColor: t.bgCard }]}>
                  <Text style={[styles.statValue, { color: monoIcon(themeMode, '#4ECDC4') }]}>✓</Text>
                  <Text style={[styles.statLabel, { color: t.textMuted }]}>все задачи</Text>
                </View>
              ) : null}
              <View style={[styles.statBox, { backgroundColor: t.bgCard }]}>
                <Text style={[styles.statValue, { color: t.textPrimary }]}>{dayIndex}</Text>
                <Text style={[styles.statLabel, { color: t.textMuted }]}>номер дня</Text>
              </View>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={goBack}
            style={styles.primaryWrap}
          >
            <LinearGradient
              colors={[accent + 'CC', accent]}
              style={styles.primaryButton}
            >
              <Text style={[styles.primaryText, { color: t.correctText }]}>
                {allDone ? 'Отлично, завтра продолжим' : 'К плану дня'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={t.correctText} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
        </BounceView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 22,
  },
  checkCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  labelPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  compareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  compareCopy: { flex: 1, minWidth: 0 },
  compareTitle: { fontSize: 16, lineHeight: 21, fontWeight: '900' },
  compareSub: { fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    height: 80,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  primaryWrap: { borderRadius: 14 },
  primaryButton: {
    height: 68,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryText: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
});
