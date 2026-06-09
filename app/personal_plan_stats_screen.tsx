import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TapScale from '../components/TapScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { safeRouterBack } from './navigation_back';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import type { ThemeMode } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';
import { getPlanById } from './personal_plan_catalog';
import { readPersonalPlanState } from './personal_plan_state';
import { readCompletedPlanTasks } from './personal_plan_progress';
import { buildPersonalPlanStats, type PersonalPlanStatsSummary } from './personal_plan_stats';
import { readPlanWeakSpotView, type PlanWeakSpotView } from './personal_plan_weak_spot_reader';
import { readPlanXpLedger, type PlanXpLedgerEntry } from './personal_plan_xp_ledger';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';

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
  if (themeMode === 'neon') return { ...base, bg: ['#202020', '#101010', '#050505'], card: ['#232522', '#0B0C0A'], accent: '#C8FF00', accent2: '#A6FF5D', accentSoft: 'rgba(200,255,0,0.13)', border: 'rgba(200,255,0,0.24)' };
  if (themeMode === 'gold') return { ...base, bg: ['#171008', '#0B0804', '#030201'], card: ['#211A10', '#080604'], accent: '#E8C46A', accent2: '#FFF0B8', accentSoft: 'rgba(232,196,106,0.15)', border: 'rgba(232,196,106,0.26)', muted: '#CBBE9A', surface: 'rgba(232,196,106,0.08)' };
  if (themeMode === 'coral') return { ...base, bg: ['#463036', '#251719', '#12090B'], card: ['#302126', '#10090B'], accent: '#FF7373', accent2: '#FFD060', accentSoft: 'rgba(255,115,115,0.14)', border: 'rgba(255,115,115,0.22)' };
  if (themeMode === 'compass') return { ...base, bg: ['#343235', '#29292B', '#1E1E20'], card: ['#2D2D30', '#1F1F22'], accent: '#F6C78E', accent2: '#FFE1B5', accentSoft: 'rgba(246,199,142,0.14)', border: 'rgba(246,199,142,0.22)' };
  if (themeMode === 'minimalLight') return { ...base, bg: ['#FFF8EA', '#F4E6CD', '#EBD8BC'], card: ['#FFFDF6', '#F2E1C8'], accent: '#B7791F', accent2: '#166E65', accentSoft: 'rgba(183,121,31,0.13)', border: 'rgba(91,63,25,0.18)', text: '#201811', muted: '#6A5C4D', surface: 'rgba(70,48,20,0.055)' };
  if (themeMode === 'minimalDark') return { ...base, bg: ['#22252A', '#15171A', '#08090A'], card: ['#25282D', '#0E1012'], accent: '#D7DEE8', accent2: '#8EA7C6', accentSoft: 'rgba(215,222,232,0.12)', border: 'rgba(215,222,232,0.18)' };
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
        Н{week.weekIndex}
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

export default function PersonalPlanStatsScreen() {
  const router = useRouter();
  const { theme: t, themeMode } = useTheme();
  const [stats, setStats] = useState<PersonalPlanStatsSummary | null>(null);
  const [weakSpots, setWeakSpots] = useState<PlanWeakSpotView | null>(null);
  const [xpLedger, setXpLedger] = useState<PlanXpLedgerEntry | null>(null);
  const chrome = useMemo(() => resolveChrome(themeMode, t), [themeMode, t]);
  const isGold = themeMode === 'gold';
  const screenBg = isGold ? '#090704' : t.bgPrimary;

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);

  const load = useCallback(async () => {
    const state = await readPersonalPlanState();
    if (!state) {
      setStats(null);
      return;
    }
    const plan = getPlanById(state.planId);
    const completedTasks = await readCompletedPlanTasks();
    setStats(buildPersonalPlanStats({
      plan,
      planInstanceId: state.planInstanceId,
      currentDayIndex: state.currentDayIndex,
      minutesPerDay: state.minutesPerDay,
      completedTasks,
    }));
    setWeakSpots(await readPlanWeakSpotView(state.planInstanceId).catch(() => null));
    setXpLedger(await readPlanXpLedger(state.planInstanceId).catch(() => null));
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  useFocusEffect(useCallback(() => {
    fade.setValue(0);
    slide.setValue(20);
    void load();
  }, [load, fade, slide]));

  const maxWeekTasks = useMemo(
    () => (stats ? Math.max(1, ...stats.weeks.map((w) => w.totalTasks)) : 1),
    [stats],
  );

  if (!stats) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: screenBg }]}>
        <LinearGradient colors={chrome.bg} style={styles.fill}>
          <View style={styles.center}>
            <Ionicons name="stats-chart-outline" size={40} color={chrome.muted} />
            <Text style={[styles.emptyText, { color: chrome.muted }]}>Нет данных о плане</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: screenBg }]}>
      <LinearGradient colors={chrome.bg} style={styles.fill}>
        <View style={styles.header}>
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
            <Text style={[styles.title, { color: chrome.text }]} numberOfLines={1}>{stats.planName}</Text>
          </View>
        </View>

        <BouncyWrap style={bouncyStyle}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          contentContainerStyle={styles.scroll}
          style={{ opacity: fade, transform: [{ translateY: slide }] }}
          onScroll={(e: any) => { onBouncyScroll(e); }}
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
          <View style={styles.grid}>
            <StatCard icon="time-outline" value={`${stats.estimatedMinutesInvested}`} label="минут практики" chrome={chrome} />
            <StatCard icon="library-outline" value={`${stats.totalTasksTotal}`} label="всего задач" chrome={chrome} />
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
                  <Text style={[styles.weakLabel, { color: chrome.text }]} numberOfLines={1}>{row.label}</Text>
                  <Text style={[styles.weakCount, { color: chrome.muted }]}>{row.wrongCount} {row.wrongCount === 1 ? 'промах' : 'промаха'}</Text>
                </View>
              ))}
            </LinearGradient>
          ) : null}
        </Animated.ScrollView>
        </BouncyWrap>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '800' },
  header: {
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  back: {
    width: 46, height: 46, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  kicker: { fontSize: 11, lineHeight: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 },
  title: { fontSize: 24, lineHeight: 29, fontWeight: '900', marginTop: 1 },
  scroll: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 40, gap: 12 },

  heroCard: { borderRadius: 14, borderWidth: 1, padding: 20, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  heroPct: { fontSize: 48, lineHeight: 52, fontWeight: '900' },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 20, lineHeight: 25, fontWeight: '900' },
  heroSub: { marginTop: 3, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  heroBar: { height: 10, borderRadius: 5, overflow: 'hidden' },
  heroBarFill: { height: '100%', borderRadius: 5 },

  grid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, borderRadius: 14, borderWidth: 1, padding: 16, gap: 6,
  },
  statIconWrap: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  statValue: { fontSize: 28, lineHeight: 32, fontWeight: '900' },
  statLabel: { fontSize: 12, lineHeight: 16, fontWeight: '800' },

  sectionCard: { borderRadius: 14, borderWidth: 1, padding: 16, overflow: 'hidden' },
  sectionHeader: { marginBottom: 14 },
  sectionKicker: { fontSize: 11, lineHeight: 14, fontWeight: '900', textTransform: 'uppercase' },
  sectionTitle: { fontSize: 20, lineHeight: 25, fontWeight: '900', marginTop: 2 },
  weeks: { gap: 10 },
  weakRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  weakIcon: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  weakLabel: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '800', minWidth: 0 },
  weakCount: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weekLabel: { width: 34, fontSize: 13, lineHeight: 16, fontWeight: '900' },
  weekTrack: { flex: 1, height: 14, borderRadius: 7, overflow: 'hidden' },
  weekFill: { height: '100%', borderRadius: 7 },
  weekPct: { width: 42, textAlign: 'right', fontSize: 13, lineHeight: 16, fontWeight: '900' },
});
