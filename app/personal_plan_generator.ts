import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMistakeCountByLesson,
  getTopMistakePhraseDetails,
  type PhraseMistakeCategoryStat,
} from './mistake_log';
import {
  getTrainerDashboard,
  type TrainerDashboard,
  type TrainerQueue,
} from './trainer_store';
import type { WordCategory } from './pos_taxonomy';
import {
  flashcardsSavedKey,
  lessonBestScoreKey,
  lessonPassCountKey,
  lessonProgressKey,
  quizLifetimeCounterKey,
  resolvedPersonalTrainingsKey,
  statsDailyBreakdownKey,
  storageSourceLocale,
  storageStudyTarget,
  type RuntimeSourceLocale,
  type RuntimeStudyTarget,
} from './target_storage_keys';

export type PlanGeneratorLessonInput = {
  lessonId: number;
  bestScore: number;
  passCount: number;
  phraseProgressCount: number;
};

export type PlanGeneratorQuizInput = {
  easy: number;
  medium: number;
  hard: number;
};

export type PlanGeneratorMistakeInput = {
  totalRecent: number;
  byLesson: Record<number, number>;
  topPhrases: PhraseMistakeCategoryStat[];
};

export type PlanGeneratorCardsInput = {
  saved: number;
};

export type PlanGeneratorPracticeInput = {
  resolvedTrainingCount: number;
  dueTrainingCount: number;
};

export type PlanGeneratorTrainerInput = {
  totalDue: number;
  hardestQueue: TrainerQueue | null;
  hardestCategory: WordCategory | null;
  hardestMistakes: number;
};

export type PlanGeneratorActivityInput = {
  activeDays: number;
  streakDays: number;
};

export type PlanGeneratorInput = {
  studyTarget: 'en' | 'fr';
  lessons: PlanGeneratorLessonInput[];
  quizzes: PlanGeneratorQuizInput;
  mistakes: PlanGeneratorMistakeInput;
  cards: PlanGeneratorCardsInput;
  practice: PlanGeneratorPracticeInput;
  trainer: PlanGeneratorTrainerInput;
  activity: PlanGeneratorActivityInput;
};

export type PlanWeakSpot = {
  source: 'mistakes' | 'trainer' | 'lesson';
  tag: string;
  weight: number;
};

export type PlanPersonalizationResult = {
  weakSpots: PlanWeakSpot[];
  shouldAddCardReview: boolean;
  shouldAddTrainerTask: boolean;
  shouldAddMistakeReview: boolean;
  lessonReadiness: {
    completedLessonIds: number[];
    repeatedLessonIds: number[];
  };
  loadHint: 'light' | 'steady' | 'push';
};

const LESSON_SCAN_COUNT = 32;

function numeric(value: string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function countStoredList(raw: string | null | undefined): number {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && typeof parsed === 'object') return Object.keys(parsed).length;
  } catch {
    return 0;
  }
  return 0;
}

function countLessonProgress(raw: string | null | undefined): number {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && typeof parsed === 'object') {
      const row = parsed as Record<string, unknown>;
      if (Array.isArray(row.done)) return row.done.length;
      if (Array.isArray(row.completed)) return row.completed.length;
      return Object.values(row).filter(Boolean).length;
    }
  } catch {
    return 0;
  }
  return 0;
}

function pushWeakSpot(target: PlanWeakSpot[], spot: PlanWeakSpot): void {
  if (!spot.tag || spot.weight <= 0) return;
  const existing = target.find((item) => item.source === spot.source && item.tag === spot.tag);
  if (existing) {
    existing.weight = Math.max(existing.weight, spot.weight);
    return;
  }
  target.push(spot);
}

export function derivePlanPersonalization(input: PlanGeneratorInput): PlanPersonalizationResult {
  const weakSpots: PlanWeakSpot[] = [];

  for (const phrase of input.mistakes.topPhrases) {
    const tag = phrase.topCategory || `lesson:${phrase.lessonId}`;
    pushWeakSpot(weakSpots, {
      source: 'mistakes',
      tag,
      weight: Math.max(1, phrase.count * 3 + (phrase.topCategoryCount || 0)),
    });
  }

  if (input.trainer.totalDue > 0) {
    pushWeakSpot(weakSpots, {
      source: 'trainer',
      tag: input.trainer.hardestQueue || input.trainer.hardestCategory || 'due',
      weight: input.trainer.totalDue * 2 + input.trainer.hardestMistakes,
    });
  }

  for (const [lessonId, count] of Object.entries(input.mistakes.byLesson)) {
    pushWeakSpot(weakSpots, {
      source: 'lesson',
      tag: `lesson:${lessonId}`,
      weight: Number(count) * 2,
    });
  }

  const completedLessonIds = input.lessons
    .filter((lesson) => lesson.passCount > 0 || lesson.bestScore >= 4 || lesson.phraseProgressCount > 0)
    .map((lesson) => lesson.lessonId);
  const repeatedLessonIds = input.lessons
    .filter((lesson) => lesson.passCount > 1)
    .map((lesson) => lesson.lessonId);
  const totalQuizAttempts = input.quizzes.easy + input.quizzes.medium + input.quizzes.hard;
  const totalWorkSignals =
    completedLessonIds.length +
    repeatedLessonIds.length +
    totalQuizAttempts +
    input.cards.saved +
    input.practice.resolvedTrainingCount +
    input.activity.activeDays;

  return {
    weakSpots: weakSpots.sort((a, b) => b.weight - a.weight || a.tag.localeCompare(b.tag)).slice(0, 8),
    shouldAddCardReview: input.cards.saved >= 5,
    shouldAddTrainerTask: input.trainer.totalDue > 0 || input.practice.dueTrainingCount > 0,
    shouldAddMistakeReview: input.mistakes.topPhrases.some((phrase) => phrase.count >= 2),
    lessonReadiness: {
      completedLessonIds,
      repeatedLessonIds,
    },
    loadHint: totalWorkSignals >= 24 ? 'push' : totalWorkSignals >= 6 ? 'steady' : 'light',
  };
}

export async function buildPlanGeneratorInput(input?: {
  studyTarget?: RuntimeStudyTarget;
  sourceLocale?: RuntimeSourceLocale;
}): Promise<PlanGeneratorInput> {
  const studyTarget = storageStudyTarget(input?.studyTarget);
  const sourceLocale = storageSourceLocale(input?.sourceLocale);
  const lessonIds = Array.from({ length: LESSON_SCAN_COUNT }, (_, index) => index + 1);
  const lessonKeys = lessonIds.flatMap((lessonId) => [
    lessonBestScoreKey(lessonId, studyTarget),
    lessonPassCountKey(lessonId, studyTarget),
    lessonProgressKey(lessonId, studyTarget),
  ]);
  const [
    lessonPairs,
    quizEasy,
    quizMedium,
    quizHard,
    cardsRaw,
    resolvedTrainingsRaw,
    statsRaw,
    topPhrases,
    byLesson,
    trainerDashboard,
  ] = await Promise.all([
    AsyncStorage.multiGet(lessonKeys),
    AsyncStorage.getItem(quizLifetimeCounterKey('lifetime_quiz_easy_v1', studyTarget)),
    AsyncStorage.getItem(quizLifetimeCounterKey('lifetime_quiz_medium_v1', studyTarget)),
    AsyncStorage.getItem(quizLifetimeCounterKey('lifetime_quiz_hard_v1', studyTarget)),
    AsyncStorage.getItem(flashcardsSavedKey(studyTarget)),
    AsyncStorage.getItem(resolvedPersonalTrainingsKey(studyTarget, sourceLocale)),
    AsyncStorage.getItem(statsDailyBreakdownKey(studyTarget)),
    getTopMistakePhraseDetails(8, 1, studyTarget),
    getMistakeCountByLesson(studyTarget),
    getTrainerDashboard(studyTarget, sourceLocale).catch(() => null as TrainerDashboard | null),
  ]);

  const lessonValue = new Map(lessonPairs);
  const lessons = lessonIds.map((lessonId) => ({
    lessonId,
    bestScore: numeric(lessonValue.get(lessonBestScoreKey(lessonId, studyTarget))),
    passCount: numeric(lessonValue.get(lessonPassCountKey(lessonId, studyTarget))),
    phraseProgressCount: countLessonProgress(lessonValue.get(lessonProgressKey(lessonId, studyTarget))),
  }));
  const activeDays = countStoredList(statsRaw);
  const dueTrainingCount = trainerDashboard?.totalDue ?? 0;

  return {
    studyTarget,
    lessons,
    quizzes: {
      easy: numeric(quizEasy),
      medium: numeric(quizMedium),
      hard: numeric(quizHard),
    },
    mistakes: {
      totalRecent: Object.values(byLesson).reduce((sum, count) => sum + count, 0),
      byLesson,
      topPhrases,
    },
    cards: {
      saved: countStoredList(cardsRaw),
    },
    practice: {
      resolvedTrainingCount: countStoredList(resolvedTrainingsRaw),
      dueTrainingCount,
    },
    trainer: {
      totalDue: trainerDashboard?.totalDue ?? 0,
      hardestQueue: trainerDashboard?.hardestQueue ?? null,
      hardestCategory: trainerDashboard?.hardestCategory ?? null,
      hardestMistakes: trainerDashboard?.hardestMistakes ?? 0,
    },
    activity: {
      activeDays,
      streakDays: 0,
    },
  };
}

export default function __RouteShim() { return null; }
