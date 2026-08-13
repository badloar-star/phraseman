export const COMPASS_RECOMMENDATION_SCHEMA_VERSION = 'compass-recommendation.v1' as const;

export type CompassSourceName =
  | 'trainer'
  | 'lesson_progress'
  | 'weekly_review';

export type CompassSource<T> =
  | { status: 'ready'; value: T }
  | { status: 'loading' | 'unavailable' | 'error' };

export type CompassTrainerSignals = {
  dueWords: number;
  duePhrases: number;
};

export type CompassLessonProgressSignals = {
  lessonId: number;
  /** Legacy lesson progress is the number of correct cells, from 0 through 45. */
  correctCells: number;
};

export type CompassWeeklyActionSignals = {
  recommendationId: string;
  actionKind:
    | 'open_personal_training'
    | 'repeat_due_words'
    | 'repeat_due_phrases'
    | 'continue_lesson';
  evidenceRefs: string[];
};

export type CompassWeeklyReviewSignals = {
  actions: CompassWeeklyActionSignals[];
  evidenceRegistry: Record<string, number | string | string[]>;
};

export type CompassRecommendationInput = {
  trainer: CompassSource<CompassTrainerSignals>;
  lessonProgress: CompassSource<CompassLessonProgressSignals | null>;
  weeklyReview: CompassSource<CompassWeeklyReviewSignals | null>;
};

export type CompassEvidence = {
  source: CompassSourceName;
  key: string;
  value: number | string | boolean | string[];
};

export type CompassReasonCode =
  | 'trainer_due'
  | 'continue_started_lesson'
  | 'weekly_weak_area';

export type CompassRecommendationKind =
  | 'review_due_words'
  | 'review_due_phrases'
  | 'open_trainer'
  | 'continue_lesson'
  | 'repair_weak_area';

export type CompassVerifiedRoute =
  | { pathname: '/trainer' }
  | { pathname: '/trainer_words_session' }
  | { pathname: '/trainer_phrases_session' }
  | { pathname: '/lesson_menu'; params: { id: string } }
  | { pathname: '/problem_coach'; params: { microDiagnosisId: string } };

export type CompassVerifiedAction =
  | { kind: 'trainer'; route: Extract<CompassVerifiedRoute, { pathname: '/trainer' }> }
  | { kind: 'trainer_words'; route: Extract<CompassVerifiedRoute, { pathname: '/trainer_words_session' }> }
  | { kind: 'trainer_phrases'; route: Extract<CompassVerifiedRoute, { pathname: '/trainer_phrases_session' }> }
  | { kind: 'lesson'; route: Extract<CompassVerifiedRoute, { pathname: '/lesson_menu' }> }
  | { kind: 'problem_coach'; route: Extract<CompassVerifiedRoute, { pathname: '/problem_coach' }> };

export type CompassRecommendation = {
  schemaVersion: typeof COMPASS_RECOMMENDATION_SCHEMA_VERSION;
  recommendationId: string;
  kind: CompassRecommendationKind;
  reason: {
    code: CompassReasonCode;
    /** UI copy must be localized by the surface from this bounded parameter map. */
    params: Record<string, number | string | boolean>;
  };
  evidence: CompassEvidence[];
  expectedMinutes: number;
  action: CompassVerifiedAction;
  confidence: 'medium' | 'high';
};

export type CompassRecommendationResult =
  | {
    status: 'ready';
    recommendation: CompassRecommendation;
    evaluatedCandidates: number;
    missingSources: CompassSourceName[];
  }
  | {
    status: 'insufficient';
    reason: 'sources_not_ready' | 'no_actionable_signal';
    missingSources: CompassSourceName[];
  };

type RankedCandidate = CompassRecommendation & { score: number };

function count(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function expectedReviewMinutes(dueCount: number): number {
  return Math.max(3, Math.min(10, Math.ceil(count(dueCount) / 2)));
}

function expectedLessonMinutes(correctCells: number): number {
  const remainingCells = Math.max(1, 45 - Math.min(45, count(correctCells)));
  return Math.max(3, Math.min(10, Math.ceil(remainingCells / 5)));
}

function recommendation(
  input: Omit<CompassRecommendation, 'schemaVersion'>,
  score: number,
): RankedCandidate {
  return { ...input, schemaVersion: COMPASS_RECOMMENDATION_SCHEMA_VERSION, score };
}

function trainerCandidate(trainer: CompassTrainerSignals): RankedCandidate | null {
  const dueWords = count(trainer.dueWords);
  const duePhrases = count(trainer.duePhrases);
  const totalDue = dueWords + duePhrases;
  if (totalDue <= 0) return null;

  const queue = duePhrases >= dueWords ? 'phrases' : 'words';
  const selectedDue = queue === 'phrases' ? duePhrases : dueWords;
  const action: CompassVerifiedAction = queue === 'phrases'
    ? { kind: 'trainer_phrases', route: { pathname: '/trainer_phrases_session' } }
    : { kind: 'trainer_words', route: { pathname: '/trainer_words_session' } };
  return recommendation({
    recommendationId: `trainer:${queue}`,
    kind: queue === 'phrases' ? 'review_due_phrases' : 'review_due_words',
    reason: {
      code: 'trainer_due',
      params: { queue, selectedDue, totalDue },
    },
    evidence: [
      { source: 'trainer', key: 'dueWords', value: dueWords },
      { source: 'trainer', key: 'duePhrases', value: duePhrases },
    ],
    expectedMinutes: expectedReviewMinutes(selectedDue),
    action,
    confidence: 'high',
  }, 740 + Math.min(50, totalDue));
}

function lessonCandidate(progress: CompassLessonProgressSignals | null): RankedCandidate | null {
  if (!progress) return null;
  const lessonId = count(progress.lessonId);
  const correctCells = count(progress.correctCells);
  if (lessonId < 1 || lessonId > 32 || correctCells <= 0 || correctCells >= 45) return null;
  return recommendation({
    recommendationId: `lesson:${lessonId}`,
    kind: 'continue_lesson',
    reason: {
      code: 'continue_started_lesson',
      params: { lessonId, correctCells, totalCells: 45 },
    },
    evidence: [
      { source: 'lesson_progress', key: 'lessonId', value: lessonId },
      { source: 'lesson_progress', key: 'correctCells', value: correctCells },
    ],
    expectedMinutes: expectedLessonMinutes(correctCells),
    action: {
      kind: 'lesson',
      route: { pathname: '/lesson_menu', params: { id: String(lessonId) } },
    },
    confidence: 'high',
  }, correctCells >= 35 ? 880 : 760);
}

function boundedDiagnosisId(recommendationId: string): string | null {
  if (!recommendationId.startsWith('diagnosis:')) return null;
  const id = recommendationId.slice('diagnosis:'.length);
  return /^[a-z0-9_-]{1,80}$/.test(id) ? id : null;
}

function weeklyReviewCandidate(weekly: CompassWeeklyReviewSignals | null): RankedCandidate | null {
  if (!weekly) return null;
  for (const action of weekly.actions) {
    if (action.actionKind !== 'open_personal_training') continue;
    const microDiagnosisId = boundedDiagnosisId(action.recommendationId);
    if (!microDiagnosisId) continue;
    const evidence = action.evidenceRefs.flatMap((key): CompassEvidence[] => {
      const value = weekly.evidenceRegistry[key];
      return value === undefined ? [] : [{ source: 'weekly_review', key, value }];
    });
    if (evidence.length === 0) continue;
    return recommendation({
      recommendationId: action.recommendationId,
      kind: 'repair_weak_area',
      reason: {
        code: 'weekly_weak_area',
        params: { microDiagnosisId, evidenceCount: evidence.length },
      },
      evidence,
      expectedMinutes: 5,
      action: {
        kind: 'problem_coach',
        route: { pathname: '/problem_coach', params: { microDiagnosisId } },
      },
      confidence: evidence.length >= 2 ? 'high' : 'medium',
    }, 800 + Math.min(20, evidence.length));
  }
  return null;
}

function missingSources(input: CompassRecommendationInput): CompassSourceName[] {
  const sources: [CompassSourceName, CompassSource<unknown>][] = [
    ['trainer', input.trainer],
    ['lesson_progress', input.lessonProgress],
    ['weekly_review', input.weeklyReview],
  ];
  return sources.filter(([, source]) => source.status !== 'ready').map(([name]) => name);
}

/**
 * Pure, deterministic first-pass Compass ranker. It never invents a route,
 * calls a model, reads storage, or treats an unhydrated source as a real zero.
 */
export function selectCompassRecommendation(
  input: CompassRecommendationInput,
): CompassRecommendationResult {
  const candidates: RankedCandidate[] = [];
  if (input.trainer.status === 'ready') {
    const candidate = trainerCandidate(input.trainer.value);
    if (candidate) candidates.push(candidate);
  }
  if (input.lessonProgress.status === 'ready') {
    const candidate = lessonCandidate(input.lessonProgress.value);
    if (candidate) candidates.push(candidate);
  }
  if (input.weeklyReview.status === 'ready') {
    const candidate = weeklyReviewCandidate(input.weeklyReview.value);
    if (candidate) candidates.push(candidate);
  }

  const missing = missingSources(input);
  const chosen = [...candidates].sort((left, right) => (
    right.score - left.score || left.recommendationId.localeCompare(right.recommendationId)
  ))[0];
  if (!chosen) {
    return {
      status: 'insufficient',
      reason: missing.length === 3 ? 'sources_not_ready' : 'no_actionable_signal',
      missingSources: missing,
    };
  }
  const { score: _score, ...recommendationResult } = chosen;
  return {
    status: 'ready',
    recommendation: recommendationResult,
    evaluatedCandidates: candidates.length,
    missingSources: missing,
  };
}

/**
 * Runtime boundary for a recommendation restored from cache or received by a
 * surface. The route is re-derived from the allowlisted action kind, rather
 * than trusted because an object claims to be verified.
 */
export function resolveCompassAction(value: unknown): CompassVerifiedRoute | null {
  if (!value || typeof value !== 'object') return null;
  const action = value as { kind?: unknown; route?: { params?: Record<string, unknown> } };
  if (action.kind === 'trainer') return { pathname: '/trainer' };
  if (action.kind === 'trainer_words') return { pathname: '/trainer_words_session' };
  if (action.kind === 'trainer_phrases') return { pathname: '/trainer_phrases_session' };
  if (action.kind === 'lesson') {
    const id = String(action.route?.params?.id ?? '');
    return /^(?:[1-9]|[12]\d|3[0-2])$/.test(id)
      ? { pathname: '/lesson_menu', params: { id } }
      : null;
  }
  if (action.kind === 'problem_coach') {
    const microDiagnosisId = String(action.route?.params?.microDiagnosisId ?? '');
    return /^[a-z0-9_-]{1,80}$/.test(microDiagnosisId)
      ? { pathname: '/problem_coach', params: { microDiagnosisId } }
      : null;
  }
  return null;
}

export default function __RouteShim() { return null; }
