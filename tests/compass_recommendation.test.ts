import {
  resolveCompassAction,
  selectCompassRecommendation,
  type CompassRecommendationInput,
} from '../app/compass_recommendation';
import { homeLessonCompassSource, unavailableCompassSource } from '../app/compass_recommendation_adapters';

function emptyInput(): CompassRecommendationInput {
  return {
    trainer: { status: 'ready', value: { dueWords: 0, duePhrases: 0 } },
    lessonProgress: { status: 'ready', value: null },
    weeklyReview: { status: 'ready', value: null },
  };
}

describe('deterministic Compass recommendation', () => {
  it('selects the larger Trainer queue without overdue semantics', () => {
    const input = emptyInput();
    input.trainer = { status: 'ready', value: { dueWords: 3, duePhrases: 8 } };

    expect(selectCompassRecommendation(input)).toMatchObject({
      status: 'ready',
      recommendation: {
        recommendationId: 'trainer:phrases',
        kind: 'review_due_phrases',
        reason: { code: 'trainer_due', params: { selectedDue: 8, totalDue: 11 } },
        expectedMinutes: 4,
        action: { route: { pathname: '/trainer_phrases_session' } },
        evidence: expect.arrayContaining([{ source: 'trainer', key: 'duePhrases', value: 8 }]),
      },
    });
  });

  it('continues a nearly finished session ahead of a small Trainer queue', () => {
    const input = emptyInput();
    input.lessonProgress = homeLessonCompassSource({ lastLessonId: 7, lastLessonProgress: 39 });
    input.trainer = { status: 'ready', value: { dueWords: 2, duePhrases: 0 } };
    expect(selectCompassRecommendation(input)).toMatchObject({
      status: 'ready',
      recommendation: {
        recommendationId: 'lesson:7',
        reason: { code: 'continue_started_lesson' },
        action: { route: { pathname: '/lesson_menu', params: { id: '7' } } },
      },
      evaluatedCandidates: 2,
    });
  });

  it('uses a bounded Weekly Review diagnosis only with evidence', () => {
    const input = emptyInput();
    input.weeklyReview = { status: 'ready', value: {
      actions: [{ recommendationId: 'diagnosis:articles', actionKind: 'open_personal_training', evidenceRefs: ['mistakes.last30.mistakes'] }],
      evidenceRegistry: { 'mistakes.last30.mistakes': 12 },
    } };
    expect(selectCompassRecommendation(input)).toMatchObject({
      status: 'ready',
      recommendation: { kind: 'repair_weak_area', action: { route: { pathname: '/problem_coach', params: { microDiagnosisId: 'articles' } } } },
    });
    input.weeklyReview.value!.actions[0]!.recommendationId = 'diagnosis:../../settings';
    expect(selectCompassRecommendation(input)).toEqual({ status: 'insufficient', reason: 'no_actionable_signal', missingSources: [] });
  });

  it('keeps unknown sources internal and returns no visible action', () => {
    const source = unavailableCompassSource<never>('loading');
    expect(selectCompassRecommendation({ trainer: source, lessonProgress: source, weeklyReview: source })).toEqual({
      status: 'insufficient',
      reason: 'sources_not_ready',
      missingSources: ['trainer', 'lesson_progress', 'weekly_review'],
    });
  });

  it('is stable for identical evidence', () => {
    const input = emptyInput();
    input.trainer = { status: 'ready', value: { dueWords: 3, duePhrases: 3 } };
    expect(selectCompassRecommendation(input)).toEqual(selectCompassRecommendation(input));
  });

  it('re-derives only allowlisted routes at the UI boundary', () => {
    expect(resolveCompassAction({ kind: 'lesson', route: { pathname: '/settings', params: { id: '7' } } }))
      .toEqual({ pathname: '/lesson_menu', params: { id: '7' } });
    expect(resolveCompassAction({ kind: 'lesson', route: { params: { id: '99' } } })).toBeNull();
    expect(resolveCompassAction({ kind: 'personal_plan', route: { pathname: '/personal_plan' } })).toBeNull();
  });
});
