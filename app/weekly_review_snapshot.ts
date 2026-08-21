import {
  WEEKLY_REVIEW_MIN_MISTAKES,
  type SourceCoverage,
  type WeeklyReviewSnapshot,
  type WeeklyReviewSnapshotSource,
} from './weekly_review_types';

type SourceError = { status: 'error'; errorCode: string };

export type WeeklyReviewMistakeSnapshotSource = SourceError | {
  status: 'ready';
  total7d: number;
  total30d: number;
  uniquePhrases: number;
};

export type WeeklyReviewActivitySnapshotSource = SourceError | {
  status: 'ready';
  activeDays7d: number;
  activeDays30d: number;
  currentStreak: number;
  longestStreak: number;
  weekXp: number;
  weekMinutes: number;
  lessons7d: number;
  reviews7d: number;
};

export type WeeklyReviewPracticeSnapshotSource = SourceError | {
  status: 'ready';
  dueWords: number;
  duePhrases: number;
  overdue: number;
  totalTracked: number;
};

export interface WeeklyReviewSnapshotSources {
  mistakes: WeeklyReviewMistakeSnapshotSource;
  activity: WeeklyReviewActivitySnapshotSource;
  practice: WeeklyReviewPracticeSnapshotSource;
}

function count(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function buildCoverage(sources: WeeklyReviewSnapshotSources): SourceCoverage {
  const entries = Object.entries(sources) as Array<[
    WeeklyReviewSnapshotSource,
    WeeklyReviewSnapshotSources[keyof WeeklyReviewSnapshotSources],
  ]>;
  const readySources = entries.filter(([, source]) => source.status === 'ready').map(([key]) => key);
  const failedSources = entries.filter(([, source]) => source.status === 'error').map(([key]) => key);
  return {
    ready: readySources.length,
    failed: failedSources.length,
    total: entries.length,
    readySources,
    failedSources,
  };
}

export function buildWeeklyReviewSnapshot(
  sources: WeeklyReviewSnapshotSources,
): WeeklyReviewSnapshot {
  const coverage = buildCoverage(sources);
  const mistakes = sources.mistakes.status === 'ready' ? sources.mistakes : null;
  const activity = sources.activity.status === 'ready' ? sources.activity : null;
  const practice = sources.practice.status === 'ready' ? sources.practice : null;
  const mistakeCount30d = count(mistakes?.total30d);
  const dueWords = count(practice?.dueWords);
  const duePhrases = count(practice?.duePhrases);
  const status: WeeklyReviewSnapshot['status'] = !mistakes
    ? 'error'
    : coverage.failed > 0
      ? 'partial'
      : mistakeCount30d < WEEKLY_REVIEW_MIN_MISTAKES
        ? 'insufficient'
        : 'ready';

  const signalValues = [
    mistakeCount30d,
    count(mistakes?.uniquePhrases),
    count(activity?.activeDays30d),
    count(activity?.weekXp),
    dueWords + duePhrases,
    count(practice?.totalTracked),
  ];

  return {
    status,
    signalCount: signalValues.filter((value) => value > 0).length,
    progressCurrent: Math.min(WEEKLY_REVIEW_MIN_MISTAKES, mistakeCount30d),
    progressRequired: WEEKLY_REVIEW_MIN_MISTAKES,
    mistakeCount7d: count(mistakes?.total7d),
    mistakeCount30d,
    uniqueMistakePhrases: count(mistakes?.uniquePhrases),
    activeDays7d: count(activity?.activeDays7d),
    activeDays30d: count(activity?.activeDays30d),
    currentStreak: count(activity?.currentStreak),
    longestStreak: count(activity?.longestStreak),
    weekXp: count(activity?.weekXp),
    weekMinutes: count(activity?.weekMinutes),
    lessons7d: count(activity?.lessons7d),
    reviews7d: count(activity?.reviews7d),
    dueWords,
    duePhrases,
    overdue: count(practice?.overdue),
    totalDue: dueWords + duePhrases,
    totalTracked: count(practice?.totalTracked),
    sourceCoverage: coverage,
  };
}
