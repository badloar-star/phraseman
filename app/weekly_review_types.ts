export const WEEKLY_REVIEW_SCHEMA_VERSION = 'weekly-review-v2' as const;
export const WEEKLY_REVIEW_MIN_MISTAKES = 5;

export type WeeklyReviewActionKind =
  | 'open_personal_training'
  | 'repeat_due_words'
  | 'repeat_due_phrases'
  | 'continue_lesson';

export interface WeeklyReviewV2 {
  schemaVersion: typeof WEEKLY_REVIEW_SCHEMA_VERSION;
  headline: string;
  summary: string;
  patterns: Array<{ title: string; explanation: string; evidenceRefs: string[] }>;
  improvements: Array<{ title: string; evidenceRefs: string[] }>;
  priorities: Array<{ title: string; reason: string; evidenceRefs: string[] }>;
  plan: Array<{
    order: number;
    actionKind: WeeklyReviewActionKind;
    recommendationId: string;
    evidenceRefs: string[];
    expectedOutcome: string;
  }>;
  confidence: 'low' | 'medium' | 'high';
  coverageNote: string;
}

export type WeeklyReviewSnapshotStatus = 'ready' | 'insufficient' | 'partial' | 'error';
export type WeeklyReviewSnapshotSource = 'mistakes' | 'activity' | 'trainer';

export interface SourceCoverage {
  ready: number;
  failed: number;
  total: number;
  readySources: WeeklyReviewSnapshotSource[];
  failedSources: WeeklyReviewSnapshotSource[];
}

export interface WeeklyReviewSnapshot {
  status: WeeklyReviewSnapshotStatus;
  signalCount: number;
  progressCurrent: number;
  progressRequired: number;
  mistakeCount7d: number;
  mistakeCount30d: number;
  uniqueMistakePhrases: number;
  activeDays7d: number;
  activeDays30d: number;
  currentStreak: number;
  longestStreak: number;
  weekXp: number;
  weekMinutes: number;
  lessons7d: number;
  quizzes7d: number;
  reviews7d: number;
  arena7d: number;
  dueWords: number;
  duePhrases: number;
  overdue: number;
  totalDue: number;
  totalTracked: number;
  sourceCoverage: SourceCoverage;
}
