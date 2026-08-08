// weekly_review_briefing.ts — bounded local aggregates for the Plus AI review.
// Raw logs never leave this layer; the callable receives only this V2 briefing.

import { lessonNamesForLang } from '../constants/lessons';
import { triLang, type Lang } from '../constants/i18n';
import { loadActivity365Analytics, summarizeActivityWindow, type Activity365Analytics } from './activity_365_analytics';
import { loadResolvedPersonalTrainings } from './diagnosis_training_progress';
import { getDiagnosisTrainingForTarget } from './diagnosis_trainings';
import { loadMistakeLog, type MistakeEntry } from './mistake_log';
import { chooseAvailableDiagnosisForCategory } from './personal_practice_lesson_router';
import {
  computePhraseAnalytics,
  summarizePhraseMistakeWindows,
  type LessonMistakeStat,
  type PhraseAnalyticsResult,
  type WordCategoryStat,
} from './phrase_analytics';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { getTrainerDashboard, type TrainerDashboard } from './trainer_store';
import { CATEGORY_LABEL_COPY } from './weekly_review_category_labels';
import { buildWeeklyReviewSnapshot } from './weekly_review_snapshot';
import {
  WEEKLY_REVIEW_SCHEMA_VERSION,
  type SourceCoverage,
  type WeeklyReviewBriefingV2,
  type WeeklyReviewRecommendation,
  type WeeklyReviewSnapshot,
  type WeeklyReviewWeakCategory,
} from './weekly_review_types';

export type {
  WeeklyReviewBriefingV2 as WeeklyReviewBriefing,
  WeeklyReviewRecommendation,
  WeeklyReviewWeakCategory,
} from './weekly_review_types';

type ResolvedTrainings = Awaited<ReturnType<typeof loadResolvedPersonalTrainings>>;

export interface BuildBriefingDependencies {
  nowMs: () => number;
  loadMistakeEntries: (studyTarget?: RuntimeStudyTarget) => Promise<MistakeEntry[]>;
  computeAnalytics: () => Promise<PhraseAnalyticsResult>;
  loadActivity: () => Promise<Activity365Analytics>;
  loadTrainer: (studyTarget?: RuntimeStudyTarget) => Promise<TrainerDashboard>;
  loadResolvedTrainings: (studyTarget?: RuntimeStudyTarget) => Promise<ResolvedTrainings>;
}

const DEFAULT_DEPS: BuildBriefingDependencies = {
  nowMs: Date.now,
  loadMistakeEntries: loadMistakeLog,
  computeAnalytics: computePhraseAnalytics,
  loadActivity: loadActivity365Analytics,
  loadTrainer: (studyTarget) => getTrainerDashboard(studyTarget),
  loadResolvedTrainings: (studyTarget) => loadResolvedPersonalTrainings({ studyTarget }),
};

export interface BuildBriefingOptions {
  lang: Lang;
  studyTarget?: RuntimeStudyTarget;
  /** Compatibility input only. Tier must never change aggregate content. */
  isPremium: boolean;
  /** Older callers already collect these values; V2 prefers Activity365 data. */
  effort?: {
    currentStreak: number;
    longestStreak: number;
    weekXp: number;
    weekMinutes: number;
  };
  maxWeakCategories?: number;
  deps?: BuildBriefingDependencies;
}

export type WeeklyReviewBriefingBuildResult =
  | { status: 'ready'; briefing: WeeklyReviewBriefingV2; snapshot: WeeklyReviewSnapshot; coverage: SourceCoverage }
  | { status: 'insufficient'; snapshot: WeeklyReviewSnapshot; coverage: SourceCoverage }
  | { status: 'error'; snapshot: WeeklyReviewSnapshot; coverage: SourceCoverage; errorCode: string };

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeWeeklyReviewLearningText(value: unknown, maxLength: number): string {
  return String(value ?? '')
    .replace(CONTROL_CHARACTERS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, Math.max(0, maxLength));
}

function labelForCategory(category: string, lang: Lang): string {
  return sanitizeWeeklyReviewLearningText(triLang(lang, CATEGORY_LABEL_COPY[category] ?? CATEGORY_LABEL_COPY.other), 80);
}

function isWeakCategory(stat: WordCategoryStat): boolean {
  const priority = stat.priorityScore ?? stat.weaknessScore;
  return priority >= 55 || (stat.pct >= 15 && (stat.recoveryScore ?? 0) < 25);
}

function lessonTitle(lessonId: number, lang: Lang): string {
  return sanitizeWeeklyReviewLearningText(lessonNamesForLang(lang)[lessonId - 1] ?? `Lesson ${lessonId}`, 120);
}

function coverageFor(statuses: Record<'mistakes' | 'activity' | 'trainer', boolean>): SourceCoverage {
  const readySources = (Object.keys(statuses) as Array<keyof typeof statuses>).filter((key) => statuses[key]);
  const failedSources = (Object.keys(statuses) as Array<keyof typeof statuses>).filter((key) => !statuses[key]);
  return {
    ready: readySources.length,
    failed: failedSources.length,
    total: 3,
    readySources,
    failedSources,
  };
}

function recommendationFor(
  stat: WordCategoryStat,
  resolved: ResolvedTrainings,
  studyTarget: RuntimeStudyTarget | undefined,
  lang: Lang,
): WeeklyReviewRecommendation | null {
  const id = chooseAvailableDiagnosisForCategory(
    { category: stat.category, topWords: stat.topWords },
    resolved,
    studyTarget,
  );
  if (!id) return null;
  const training = getDiagnosisTrainingForTarget(id, studyTarget);
  if (!training) return null;
  return {
    recommendationId: `diagnosis:${id}`,
    actionKind: 'open_personal_training',
    label: sanitizeWeeklyReviewLearningText(triLang(lang, training.title) ?? training.title.ru, 120),
    routePayload: { microDiagnosisId: id },
  };
}

function buildRecommendations(
  weakStats: WordCategoryStat[],
  weakLessons: LessonMistakeStat[],
  trainer: TrainerDashboard,
  resolved: ResolvedTrainings,
  studyTarget: RuntimeStudyTarget | undefined,
  lang: Lang,
): WeeklyReviewRecommendation[] {
  const recommendations: WeeklyReviewRecommendation[] = [];
  const seen = new Set<string>();
  const push = (item: WeeklyReviewRecommendation | null) => {
    if (!item || seen.has(item.recommendationId)) return;
    seen.add(item.recommendationId);
    recommendations.push(item);
  };
  for (const stat of weakStats) push(recommendationFor(stat, resolved, studyTarget, lang));
  if (trainer.due.words > 0) push({
    recommendationId: 'due:words',
    actionKind: 'repeat_due_words',
    label: lang === 'uk' ? 'Повторити слова' : 'Повторить слова',
    routePayload: { queue: 'words' },
  });
  if (trainer.due.phrases > 0) push({
    recommendationId: 'due:phrases',
    actionKind: 'repeat_due_phrases',
    label: lang === 'uk' ? 'Повторити фрази' : 'Повторить фразы',
    routePayload: { queue: 'phrases' },
  });
  const lesson = weakLessons.find((item) => item.lessonId > 0);
  if (lesson) push({
    recommendationId: `lesson:${lesson.lessonId}`,
    actionKind: 'continue_lesson',
    label: lessonTitle(lesson.lessonId, lang),
    routePayload: { lessonId: lesson.lessonId },
  });
  return recommendations.slice(0, 8);
}

function phraseRows(entries: readonly MistakeEntry[], nowMs: number) {
  const dayMs = 24 * 60 * 60 * 1000;
  const current = new Map<string, number>();
  const previous = new Map<string, number>();
  const all = new Map<string, { phrase: string; count: number }>();
  for (const entry of entries.filter((item) => item.ts >= nowMs - 30 * dayMs && item.ts <= nowMs)) {
    const phrase = sanitizeWeeklyReviewLearningText(entry.phrase, 160);
    const key = phrase.toLocaleLowerCase();
    if (!key) continue;
    const row = all.get(key) ?? { phrase, count: 0 };
    row.count += 1;
    all.set(key, row);
    if (entry.ts >= nowMs - 7 * dayMs) current.set(key, (current.get(key) ?? 0) + 1);
    else if (entry.ts >= nowMs - 14 * dayMs) previous.set(key, (previous.get(key) ?? 0) + 1);
  }
  return Array.from(all.entries())
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([key, row]) => {
      const currentCount = current.get(key) ?? 0;
      const previousCount = previous.get(key) ?? 0;
      return {
        phrase: row.phrase,
        count: row.count,
        trend: (currentCount > previousCount ? 'up' : currentCount < previousCount ? 'down' : 'flat') as 'up' | 'flat' | 'down',
      };
    });
}

function nonEmptyEvidence(entries: Array<[string, number | string | string[]]>): Record<string, number | string | string[]> {
  return Object.fromEntries(entries.filter(([, value]) => (
    Array.isArray(value) ? value.length > 0 : typeof value === 'number' ? Number.isFinite(value) : value.length > 0
  )));
}

export async function buildWeeklyReviewBriefing(
  options: BuildBriefingOptions,
): Promise<WeeklyReviewBriefingBuildResult> {
  const deps = options.deps ?? DEFAULT_DEPS;
  const nowMs = deps.nowMs();
  const target = storageStudyTarget(options.studyTarget);
  const [mistakesSettled, analyticsSettled, activitySettled, trainerSettled, resolvedSettled] = await Promise.allSettled([
    deps.loadMistakeEntries(options.studyTarget),
    deps.computeAnalytics(),
    deps.loadActivity(),
    deps.loadTrainer(options.studyTarget),
    deps.loadResolvedTrainings(options.studyTarget),
  ]);

  const entries = mistakesSettled.status === 'fulfilled' ? mistakesSettled.value : [];
  const windows = summarizePhraseMistakeWindows(entries, nowMs);
  const activity = activitySettled.status === 'fulfilled' ? activitySettled.value : null;
  const trainer = trainerSettled.status === 'fulfilled' ? trainerSettled.value : null;
  const activity7 = activity ? summarizeActivityWindow(activity.days, 7, nowMs) : null;
  const activity30 = activity ? summarizeActivityWindow(activity.days, 30, nowMs) : null;
  const coverage = coverageFor({
    mistakes: mistakesSettled.status === 'fulfilled' && analyticsSettled.status === 'fulfilled',
    activity: activitySettled.status === 'fulfilled',
    trainer: trainerSettled.status === 'fulfilled',
  });
  const snapshot = buildWeeklyReviewSnapshot({
    mistakes: mistakesSettled.status === 'fulfilled'
      ? { status: 'ready', total7d: windows.last7.mistakes, total30d: windows.last30.mistakes, uniquePhrases: windows.last30.uniquePhrases }
      : { status: 'error', errorCode: 'mistake_log_unavailable' },
    activity: activity7 && activity30 && activity
      ? {
        status: 'ready', activeDays7d: activity7.activeDays, activeDays30d: activity30.activeDays,
        currentStreak: activity.currentStreak, longestStreak: activity.longestStreak,
        weekXp: activity7.xp, weekMinutes: activity7.minutes, lessons7d: activity7.lessons,
        quizzes7d: 0, reviews7d: activity7.reviews, arena7d: 0,
      }
      : { status: 'error', errorCode: 'activity_unavailable' },
    trainer: trainer
      ? { status: 'ready', dueWords: trainer.due.words, duePhrases: trainer.due.phrases, overdue: trainer.overdue, totalTracked: trainer.totalTracked }
      : { status: 'error', errorCode: 'trainer_store_unavailable' },
  });

  if (coverage.failed > 0 || analyticsSettled.status !== 'fulfilled' || resolvedSettled.status !== 'fulfilled' || !activity || !trainer) {
    return { status: 'error', snapshot, coverage, errorCode: 'weekly_review_source_failed' };
  }
  if (snapshot.status === 'insufficient') return { status: 'insufficient', snapshot, coverage };

  const analytics = analyticsSettled.value;
  const maxWeak = options.maxWeakCategories ?? 5;
  const weakStats = analytics.categoryStats.filter(isWeakCategory).slice(0, maxWeak);
  const weakKeys = new Set(weakStats.map((item) => item.category));
  const weakCategories: WeeklyReviewWeakCategory[] = weakStats.map((stat) => ({
    category: stat.category,
    label: labelForCategory(stat.category, options.lang),
    pct: stat.pct,
    priorityScore: stat.priorityScore ?? stat.weaknessScore,
    topWords: stat.topWords.slice(0, 3).map((word) => sanitizeWeeklyReviewLearningText(word, 60)),
  }));
  const strongCategories = analytics.categoryStats
    .filter((stat) => !weakKeys.has(stat.category) && stat.recoveryScore >= 40)
    .slice(0, 3)
    .map((stat) => ({ category: stat.category, label: labelForCategory(stat.category, options.lang), recoveryScore: Math.round(stat.recoveryScore) }));
  const recoveredCategories = analytics.categoryStats
    .filter((stat) => stat.recoveryScore >= 50 && stat.practiceCorrect > 0)
    .slice(0, 3)
    .map((stat) => ({ category: stat.category, label: labelForCategory(stat.category, options.lang), recoveryScore: Math.round(stat.recoveryScore) }));
  const weakLessons = analytics.lessonStats.slice(0, 5).map((stat) => ({
    lessonId: stat.lessonId,
    title: lessonTitle(stat.lessonId, options.lang),
    pct: stat.pct,
    mistakeCount: stat.mistakeCount,
  }));
  const recommendations = buildRecommendations(weakStats, analytics.lessonStats, trainer, resolvedSettled.value, options.studyTarget, options.lang);
  const activityWeek = activity7!;
  const activityMonth = activity30!;
  const topMistakePhrases = phraseRows(entries, nowMs);
  const evidenceRegistry = nonEmptyEvidence([
    ['mistakes.last7.mistakes', windows.last7.mistakes],
    ['mistakes.last30.mistakes', windows.last30.mistakes],
    ['mistakes.last30.uniquePhrases', windows.last30.uniquePhrases],
    ['mistakes.last30.repeatedMistakes', windows.last30.repeatedMistakes],
    ['mistakes.last30.recoveredPhrases', windows.last30.recoveredPhrases],
    ['mistakes.weakCategories', weakCategories.map((item) => item.category)],
    ['mistakes.weakLessons', weakLessons.map((item) => String(item.lessonId))],
    ['practice.dueWords', trainer.due.words],
    ['practice.duePhrases', trainer.due.phrases],
    ['practice.overdue', trainer.overdue],
    ['effort.activeDays7d', activityWeek.activeDays],
    ['effort.activeDays30d', activityMonth.activeDays],
    ['effort.currentStreak', activity.currentStreak],
    ['effort.weekXp', activityWeek.xp],
    ['effort.weekMinutes', activityWeek.minutes],
  ]);

  const briefing: WeeklyReviewBriefingV2 = {
    schemaVersion: WEEKLY_REVIEW_SCHEMA_VERSION,
    lang: options.lang,
    studyTarget: target,
    mistakes: {
      last7: windows.last7,
      last30: windows.last30,
      delta: windows.delta,
      weakCategories,
      strongCategories,
      recoveredCategories,
      weakLessons,
      topMistakePhrases,
    },
    practice: {
      dueWords: trainer.due.words,
      duePhrases: trainer.due.phrases,
      overdue: trainer.overdue,
      totalTracked: trainer.totalTracked,
      completed7d: activityWeek.reviews,
      accuracy7d: null,
      accuracyDelta: null,
    },
    effort: {
      activeDays7d: activityWeek.activeDays,
      activeDays30d: activityMonth.activeDays,
      currentStreak: activity.currentStreak,
      longestStreak: activity.longestStreak,
      weekXp: activityWeek.xp,
      weekMinutes: activityWeek.minutes,
      lessons7d: activityWeek.lessons,
      quizzes7d: 0,
      reviews7d: activityWeek.reviews,
      arena7d: 0,
    },
    recommendations,
    evidenceRegistry,
    coverage,
  };
  return { status: 'ready', briefing, snapshot, coverage };
}
