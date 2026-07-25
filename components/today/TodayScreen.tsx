import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTabNav } from '../../app/TabContext';
import type { Lang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { TODAY_FALLBACK_RECOMMENDATION } from '../../lib/today/fallback';
import { selectTodayMetricsFromActivity, type TodayMetrics } from '../../lib/today/today_metrics';
import type { TodayDestinationId } from '../../lib/today/types';
import { useLang } from '../LangContext';
import { useStudyTarget } from '../StudyTargetContext';
import { useTheme } from '../ThemeContext';
import TodayAmbientCompass from './TodayAmbientCompass';

type TaskKind = 'lesson_dive' | 'mistake_repair' | 'flashcards_review' | 'pronunciation' | 'plan_continue';
type TodayTask = { kind: TaskKind; focus?: string; minutes: number };
type TodayRoute = { pathname: string; params?: Record<string, string> };
type TodayModel = {
  primary: TodayTask;
  primaryTitle: string;
  primaryMeta: string;
  progressPct: number | null;
  metrics: TodayMetrics;
  recommendationLabel: string;
  primaryRoute: TodayRoute;
  recommendationRoute: TodayRoute;
};

type TodayCopy = {
  today: string;
  direction: string;
  continuePlan: string;
  continueLesson: string;
  startPractice: string;
  nextLesson: string;
  lesson: string;
  plan: string;
  remaining: string;
  recommendationDetail: string;
  minutes: string;
  lessons: string;
};

const COPY: Record<Lang, TodayCopy> = {
  ru: { today: 'Сегодня', direction: 'Ваше направление', continuePlan: 'Продолжить личный план', continueLesson: 'Продолжить урок', startPractice: 'Начать практику', nextLesson: 'Ваш следующий урок', lesson: 'Урок', plan: 'Личный план', remaining: 'Осталось около', recommendationDetail: 'Компас советует сделать это сегодня', minutes: 'минут', lessons: 'урок' },
  uk: { today: 'Сьогодні', direction: 'Ваш напрямок', continuePlan: 'Продовжити особистий план', continueLesson: 'Продовжити урок', startPractice: 'Почати практику', nextLesson: 'Ваш наступний урок', lesson: 'Урок', plan: 'Особистий план', remaining: 'Залишилося близько', recommendationDetail: 'Компас радить зробити це сьогодні', minutes: 'хвилин', lessons: 'урок' },
  es: { today: 'Hoy', direction: 'Tu dirección', continuePlan: 'Continuar mi plan', continueLesson: 'Continuar la lección', startPractice: 'Empezar práctica', nextLesson: 'Tu próxima lección', lesson: 'Lección', plan: 'Plan personal', remaining: 'Quedan unos', recommendationDetail: 'La brújula recomienda hacerlo hoy', minutes: 'minutos', lessons: 'lección' },
  'pt-BR': { today: 'Hoje', direction: 'Sua direção', continuePlan: 'Continuar meu plano', continueLesson: 'Continuar a lição', startPractice: 'Começar prática', nextLesson: 'Sua próxima lição', lesson: 'Lição', plan: 'Plano pessoal', remaining: 'Restam cerca de', recommendationDetail: 'A bússola recomenda fazer isso hoje', minutes: 'minutos', lessons: 'lição' },
  vi: { today: 'Hôm nay', direction: 'Hướng đi của bạn', continuePlan: 'Tiếp tục kế hoạch', continueLesson: 'Tiếp tục bài học', startPractice: 'Bắt đầu luyện tập', nextLesson: 'Bài học tiếp theo', lesson: 'Bài', plan: 'Kế hoạch cá nhân', remaining: 'Còn khoảng', recommendationDetail: 'La bàn khuyên bạn làm điều này hôm nay', minutes: 'phút', lessons: 'bài' },
  id: { today: 'Hari ini', direction: 'Arahmu', continuePlan: 'Lanjutkan rencana', continueLesson: 'Lanjutkan pelajaran', startPractice: 'Mulai latihan', nextLesson: 'Pelajaran berikutnya', lesson: 'Pelajaran', plan: 'Rencana pribadi', remaining: 'Sekitar', recommendationDetail: 'Kompas menyarankan ini untuk hari ini', minutes: 'menit tersisa', lessons: 'pelajaran' },
  tr: { today: 'Bugün', direction: 'Yönün', continuePlan: 'Planıma devam et', continueLesson: 'Derse devam et', startPractice: 'Pratiğe başla', nextLesson: 'Sıradaki dersin', lesson: 'Ders', plan: 'Kişisel plan', remaining: 'Yaklaşık', recommendationDetail: 'Pusula bunu bugün yapmanı öneriyor', minutes: 'dakika kaldı', lessons: 'ders' },
  pl: { today: 'Dzisiaj', direction: 'Twój kierunek', continuePlan: 'Kontynuuj mój plan', continueLesson: 'Kontynuuj lekcję', startPractice: 'Zacznij praktykę', nextLesson: 'Twoja następna lekcja', lesson: 'Lekcja', plan: 'Plan osobisty', remaining: 'Zostało około', recommendationDetail: 'Kompas poleca zrobić to dzisiaj', minutes: 'minut', lessons: 'lekcja' },
};

const DATE_LOCALE: Record<Lang, string> = {
  ru: 'ru-RU', uk: 'uk-UA', es: 'es-ES', 'pt-BR': 'pt-BR', vi: 'vi-VN', id: 'id-ID', tr: 'tr-TR', pl: 'pl-PL',
};

const FALLBACK_TASK: TodayTask = { kind: 'lesson_dive', minutes: 5 };
const FALLBACK_RECOMMENDATION: TodayTask = { kind: 'flashcards_review', minutes: 2 };

function routeFor(task: TodayTask): TodayRoute {
  if (task.kind === 'lesson_dive') return task.focus ? { pathname: '/lesson_menu', params: { id: task.focus } } : { pathname: '/lesson_menu' };
  if (task.kind === 'mistake_repair') return { pathname: '/trainer' };
  if (task.kind === 'flashcards_review') return { pathname: '/flashcards_swipe' };
  return { pathname: '/personal_plan' };
}

function destinationForTask(task: TodayTask): TodayDestinationId {
  if (task.kind === 'lesson_dive') return 'lessons';
  if (task.kind === 'mistake_repair') return 'practice';
  if (task.kind === 'flashcards_review') return 'flashcards';
  return 'plan';
}

function routeForDestination(destinationId: TodayDestinationId): TodayRoute {
  switch (destinationId) {
    case 'plan': return { pathname: '/personal_plan' };
    case 'practice': return { pathname: '/trainer' };
    case 'flashcards': return { pathname: '/flashcards_swipe' };
    case 'daily_tasks': return { pathname: '/daily_tasks_screen' };
    default: return { pathname: '/lesson_menu' };
  }
}

function taskLabel(task: TodayTask, copy: TodayCopy): string {
  if (task.kind === 'plan_continue') return copy.continuePlan;
  if (task.kind === 'lesson_dive') return copy.continueLesson;
  return copy.startPractice;
}

function formatTodayDate(lang: Lang): string {
  const value = new Intl.DateTimeFormat(DATE_LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date())
    .replace(/,\s*/, ' · ');
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function TodayScreen() {
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { runtimeOwnerId, todaySessionEpoch } = useTabNav();
  const active = useRuntimeActive(runtimeOwnerId === 'today');
  const bottomPad = useTabContentBottomPad();
  const router = useRouter();
  const copy = COPY[lang];
  const todayDate = useMemo(() => formatTodayDate(lang), [lang]);
  const fallback = useMemo<TodayModel>(() => ({
    primary: FALLBACK_TASK,
    primaryTitle: copy.nextLesson,
    primaryMeta: copy.lesson,
    progressPct: null,
    metrics: { minutes: 0, xp: 0, lessons: 0 },
    recommendationLabel: TODAY_FALLBACK_RECOMMENDATION.variants[0].copy[lang],
    primaryRoute: routeFor(FALLBACK_TASK),
    recommendationRoute: routeFor(FALLBACK_RECOMMENDATION),
  }), [copy, lang]);
  const [model, setModel] = useState<TodayModel>(fallback);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let endRecommendationSession: (() => void) | null = null;
    void (async () => {
      const [
        { collectCompassSnapshot },
        { buildCompassDay },
        { selectTodayRecommendation },
        historyStore,
        recommendationSession,
        accountGeneration,
        scopeModule,
        asyncStorageModule,
        targetStorage,
        { loadActivity365Analytics },
      ] = await Promise.all([
        import('../../app/compass/signal_bus'),
        import('../../app/compass/compass_brain'),
        import('../../lib/today/recommendation_selector'),
        import('../../lib/today/recommendation_history_store'),
        import('../../lib/today/recommendation_session'),
        import('../../app/account_generation'),
        import('../../lib/today/scope'),
        import('@react-native-async-storage/async-storage'),
        import('../../app/target_storage_keys'),
        import('../../app/activity_365_analytics'),
      ]);
      const token = accountGeneration.captureAccountGeneration();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const requestedScope = scopeModule.createTodayScope({ account: token, studyTargetId: studyTarget, uiLocale: lang, now: new Date(), timeZone });
      const scopeKey = requestedScope?.scopeKey ?? ['pending', studyTarget, lang, timeZone].map(encodeURIComponent).join('|');
      if (requestedScope && accountGeneration.isCurrentAccountGeneration(token)) await historyStore.hydrateTodayRecommendationHistory(token);
      const [snapshot, lastOpenedLessonRaw, activity] = await Promise.all([
        collectCompassSnapshot(studyTarget, Date.now()),
        asyncStorageModule.default.getItem(targetStorage.lastOpenedLessonKey(studyTarget)).catch(() => null),
        loadActivity365Analytics(studyTarget),
      ]);
      if (!snapshot || cancelled) return;
      if (token.phase === 'active' && !accountGeneration.isCurrentAccountGeneration(token)) return;
      if (requestedScope && !scopeModule.rebuildCurrentTodayScope(requestedScope, accountGeneration.captureAccountGeneration(), studyTarget, lang, new Date(), timeZone)) return;
      const day = buildCompassDay(snapshot, Date.now());
      const lastOpenedLessonId = Number(lastOpenedLessonRaw);
      const primary = (
        snapshot.planDay && !snapshot.planDay.todayDone
          ? { kind: 'plan_continue', minutes: Math.max(1, snapshot.planDay.minutesPerDay) }
          : Number.isInteger(lastOpenedLessonId) && lastOpenedLessonId > 0
            ? { kind: 'lesson_dive', focus: String(lastOpenedLessonId), minutes: 5 }
            : day.tasks[0] ?? FALLBACK_TASK
      ) as TodayTask;
      const now = new Date();
      const hour = now.getHours();
      const planDay = snapshot.planDay;
      const todayMetrics = selectTodayMetricsFromActivity(activity.days, now.getTime());
      const progressPct = planDay && primary.kind === 'plan_continue' ? Math.max(0, Math.min(100, Math.round(planDay.dayProgressPct))) : null;
      const recommendation = selectTodayRecommendation({
        facts: {
          timeBucket: hour < 6 ? 'night' : hour < 11 ? 'morning' : hour < 17 ? 'midday' : 'evening',
          isWeekend: now.getDay() === 0 || now.getDay() === 6,
          todayStudyMinutes: todayMetrics.minutes,
          todayLessons: todayMetrics.lessons,
          todayXp: todayMetrics.xp,
          resumeKind: primary.kind === 'plan_continue' ? 'plan' : 'lesson',
          streak: 0,
          daysSinceLearning: null,
          nextLessonId: day.lessonInviteId ?? null,
          courseComplete: false,
          plan: planDay ? {
            active: !planDay.todayDone,
            isCarryover: planDay.isCarryover,
            remainingTasks: Math.max(0, planDay.requiredTodayCount - planDay.completedTodayCount),
            remainingMinutes: Math.max(0, Math.round(planDay.minutesPerDay * (100 - planDay.dayProgressPct) / 100)),
            progressPct: planDay.dayProgressPct,
          } : null,
          practiceDue: snapshot.trainer?.totalDue ?? 0,
          flashcardCount: 0,
          dailyTasksRemaining: 0,
          dailyTasksTotal: 0,
          availableDestinations: new Set<TodayDestinationId>(['lessons', 'plan', 'practice', 'flashcards', 'daily_tasks']),
        },
        locale: lang,
        nowMs: now.getTime(),
        primaryDestinationId: destinationForTask(primary),
        history: historyStore.getTodayRecommendationHistory(scopeKey),
      });
      if (!cancelled) {
        const lessonNumber = Number(primary.focus);
        setModel({
          primary,
          primaryTitle: primary.kind === 'plan_continue' && planDay ? planDay.todayTitle : copy.nextLesson,
          primaryMeta: primary.kind === 'plan_continue'
            ? `${copy.plan}${progressPct === null ? '' : ` · ${progressPct}%`}`
            : Number.isInteger(lessonNumber) ? `${copy.lesson} ${lessonNumber}` : copy.lesson,
          progressPct,
          metrics: todayMetrics,
          recommendationLabel: recommendation.label,
          primaryRoute: routeFor(primary),
          recommendationRoute: routeForDestination(recommendation.destinationId),
        });
        recommendationSession.beginTodayRecommendationSession({ scope: { scopeKey }, epoch: todaySessionEpoch, warmSnapshotRecommendation: recommendation });
        endRecommendationSession = () => recommendationSession.endTodayRecommendationSession({ scopeKey }, todaySessionEpoch);
        if (requestedScope && accountGeneration.isCurrentAccountGeneration(token)) {
          void historyStore.recordTodayRecommendationShown({ scopeKey, recommendation, locale: lang, nowMs: now.getTime(), token });
        }
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
      endRecommendationSession?.();
    };
  }, [active, copy, lang, studyTarget, todaySessionEpoch]);

  const open = useCallback((route: TodayRoute) => {
    hapticTap();
    router.push(route as never);
  }, [router]);

  const progressText = model.progressPct === null ? '—' : `${model.progressPct}%`;
  const metricValue = (value: number) => String(value);

  return (
    <ScrollView
      testID="today-screen"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
    >
      <View style={styles.topline}>
        <Text testID="today-date" style={[styles.date, { color: t.textMuted }]}>{todayDate.toUpperCase()}</Text>
        <Text testID="today-heading" style={[styles.heading, { color: t.textPrimary }]}>{copy.today}</Text>
      </View>

      <View style={styles.orbit}>
        <TodayAmbientCompass
          ownerVisible={runtimeOwnerId === 'today'}
          entryEpoch={todaySessionEpoch}
          accent={t.accent}
          muted={t.textMuted}
        />
      </View>

      <View style={styles.directionCopy}>
        <Text testID="today-direction" style={[styles.direction, { color: t.textMuted }]}>{copy.direction.toUpperCase()}</Text>
        <Text testID="today-resume-title" style={[styles.resumeTitle, { color: t.textPrimary }]}>{model.primaryTitle}</Text>
        <Text testID="today-resume-meta" style={[styles.resumeMeta, { color: t.textMuted }]}>{model.primaryMeta}</Text>
      </View>

      <Pressable
        testID="today-primary-cta"
        accessibilityRole="button"
        accessibilityLabel={taskLabel(model.primary, copy)}
        onPress={() => open(model.primaryRoute)}
        style={({ pressed }) => [styles.cta, { backgroundColor: t.accent, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.988 : 1 }] }]}
      >
        <Text style={[styles.ctaTitle, { color: t.correctText }]}>{taskLabel(model.primary, copy)}</Text>
      </Pressable>

      <View testID="today-progress-summary" style={styles.progressSummary}>
        <Text style={[styles.progressText, { color: t.textMuted }]}>{copy.remaining} {model.primary.minutes} {copy.minutes}</Text>
        <Text style={[styles.progressValue, { color: t.textMuted }]}>{progressText}</Text>
      </View>

      <View testID="today-metrics" style={[styles.metrics, { borderColor: `${t.textMuted}22` }]}>
        <View style={styles.metricCell}>
          <Text style={[styles.metricValue, { color: t.textPrimary }]}>{metricValue(model.metrics.minutes)}</Text>
          <Text style={[styles.metricLabel, { color: t.textMuted }]}>{copy.minutes}</Text>
        </View>
        <View style={[styles.metricCell, styles.metricDivider, { borderColor: `${t.textMuted}22` }]}>
          <Text style={[styles.metricValue, { color: t.textPrimary }]}>{metricValue(model.metrics.xp)}</Text>
          <Text style={[styles.metricLabel, { color: t.textMuted }]}>XP</Text>
        </View>
        <View style={[styles.metricCell, styles.metricDivider, { borderColor: `${t.textMuted}22` }]}>
          <Text style={[styles.metricValue, { color: t.textPrimary }]}>{metricValue(model.metrics.lessons)}</Text>
          <Text style={[styles.metricLabel, { color: t.textMuted }]}>{copy.lessons}</Text>
        </View>
      </View>

      <Pressable
        testID="today-recommendation"
        accessibilityRole="button"
        accessibilityLabel={model.recommendationLabel}
        onPress={() => open(model.recommendationRoute)}
        style={({ pressed }) => [styles.recommendation, { opacity: pressed ? 0.72 : 1 }]}
      >
        <View style={[styles.recommendationIcon, { backgroundColor: `${t.accent}18` }]}>
          <Ionicons name="sparkles-outline" size={18} color={t.accent} />
        </View>
        <View style={styles.recommendationCopy}>
          <Text style={[styles.recommendationTitle, { color: t.textPrimary }]}>{model.recommendationLabel}</Text>
          <Text style={[styles.recommendationDetail, { color: t.textMuted }]}>{copy.recommendationDetail}</Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={t.textMuted} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 16 },
  topline: { marginBottom: 2 },
  date: { fontSize: 11, lineHeight: 15, fontWeight: '800', letterSpacing: 1.25 },
  heading: { marginTop: 2, fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.45 },
  orbit: { height: 228, alignItems: 'center', justifyContent: 'center', marginTop: 1, marginBottom: 4 },
  directionCopy: { alignItems: 'center', marginTop: -6, marginBottom: 17 },
  direction: { fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 1.3 },
  resumeTitle: { marginTop: 5, fontSize: 24, lineHeight: 28, fontWeight: '800', letterSpacing: -0.65, textAlign: 'center' },
  resumeMeta: { marginTop: 4, fontSize: 11, lineHeight: 15, fontWeight: '500' },
  cta: { minHeight: 56, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 14, shadowColor: '#7FAF2C', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 4 },
  ctaTitle: { fontSize: 16, lineHeight: 20, fontWeight: '900', letterSpacing: -0.2, textAlign: 'center' },
  progressSummary: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, paddingTop: 8 },
  progressText: { fontSize: 11, lineHeight: 15, fontWeight: '500' },
  progressValue: { fontSize: 11, lineHeight: 15, fontWeight: '700' },
  metrics: { height: 60, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, marginTop: 7 },
  metricCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metricDivider: { borderLeftWidth: StyleSheet.hairlineWidth },
  metricValue: { fontSize: 18, lineHeight: 21, fontWeight: '800', letterSpacing: -0.3 },
  metricLabel: { marginTop: 1, fontSize: 10, lineHeight: 13, fontWeight: '500' },
  recommendation: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 1, paddingVertical: 10, marginTop: 3 },
  recommendationIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  recommendationCopy: { flex: 1, paddingRight: 8 },
  recommendationTitle: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  recommendationDetail: { marginTop: 2, fontSize: 10, lineHeight: 14, fontWeight: '500' },
});
