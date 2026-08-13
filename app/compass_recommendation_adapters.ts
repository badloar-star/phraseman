import type { HomeScreenHydration } from './home_screen_hydration';
import type { TrainerDashboard } from './trainer_store';
import type { WeeklyReviewBriefingV2, WeeklyReviewSnapshot } from './weekly_review_types';
import type {
  CompassLessonProgressSignals,
  CompassSource,
  CompassTrainerSignals,
  CompassWeeklyReviewSignals,
} from './compass_recommendation';

export function unavailableCompassSource<T>(
  status: 'loading' | 'unavailable' | 'error' = 'unavailable',
): CompassSource<T> {
  return { status };
}

export function trainerCompassSource(
  dashboard: Pick<TrainerDashboard, 'due'>,
): CompassSource<CompassTrainerSignals> {
  return {
    status: 'ready',
    value: {
      dueWords: dashboard.due.words,
      duePhrases: dashboard.due.phrases,
    },
  };
}

/** Safe aggregate fallback when Compass does not yet have a live TrainerDashboard. */
export function weeklySnapshotTrainerCompassSource(
  snapshot: WeeklyReviewSnapshot,
): CompassSource<CompassTrainerSignals> {
  if (!snapshot.sourceCoverage.readySources.includes('trainer')) return { status: 'unavailable' };
  return {
    status: 'ready',
    value: {
      dueWords: snapshot.dueWords,
      duePhrases: snapshot.duePhrases,
    },
  };
}

export function homeLessonCompassSource(
  hydration: Pick<HomeScreenHydration, 'lastLessonId' | 'lastLessonProgress'>,
): CompassSource<CompassLessonProgressSignals | null> {
  const lessonId = Number(hydration.lastLessonId);
  if (!Number.isFinite(lessonId) || lessonId < 1 || lessonId > 32) {
    return { status: 'ready', value: null };
  }
  return {
    status: 'ready',
    value: {
      lessonId: Math.floor(lessonId),
      correctCells: hydration.lastLessonProgress,
    },
  };
}

export function weeklyBriefingCompassSource(
  briefing: WeeklyReviewBriefingV2 | null,
): CompassSource<CompassWeeklyReviewSignals | null> {
  if (!briefing) return { status: 'ready', value: null };
  return {
    status: 'ready',
    value: {
      actions: briefing.recommendations.map((item) => ({
        recommendationId: item.recommendationId,
        actionKind: item.actionKind,
        evidenceRefs: evidenceRefsForWeeklyAction(item, briefing),
      })),
      evidenceRegistry: { ...briefing.evidenceRegistry },
    },
  };
}

export default function __RouteShim() { return null; }

function evidenceRefsForWeeklyAction(
  action: WeeklyReviewBriefingV2['recommendations'][number],
  briefing: WeeklyReviewBriefingV2,
): string[] {
  if (action.actionKind !== 'open_personal_training') return [];
  const diagnosisId = action.recommendationId.startsWith('diagnosis:')
    ? action.recommendationId.slice('diagnosis:'.length)
    : '';
  const category = briefing.mistakes.weakCategories.find((item) => (
    item.category === diagnosisId || diagnosisId.includes(item.category)
  ));
  const preferred = category
    ? ['mistakes.last30.mistakes', 'mistakes.last30.repeatedMistakes', 'mistakes.weakCategories']
    : ['mistakes.last30.mistakes', 'mistakes.weakCategories'];
  return preferred.filter((key) => briefing.evidenceRegistry[key] !== undefined);
}
