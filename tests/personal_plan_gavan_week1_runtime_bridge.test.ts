import {
  buildGavanWeek1CanonicalRuntimeBridge,
  buildGavanWeek1CanonicalRuntimeBundles,
  validateGavanWeek1CanonicalRuntimeBridge,
} from '../app/personal_plan_gavan_week1_runtime_bridge';
import { buildPlanDayOpenActions } from '../app/personal_plan_day_open_actions';

describe('Gavan week 1 canonical runtime bridge', () => {
  it('builds runtime-ready bundles for every canonical day without pretending all modes are implemented', () => {
    for (const dayIndex of [1, 2, 3, 4, 5, 6, 7] as const) {
      const bridge = buildGavanWeek1CanonicalRuntimeBridge({ dayIndex });

      expect(bridge.status).toBe('runtime_bridge_ready_partial');
      expect(bridge.dayIndex).toBe(dayIndex);
      expect(bridge.dayTitleEs).toBeTruthy();
      expect(bridge.bundles.length).toBeGreaterThan(0);
      expect(bridge.linkedLessonBlocks.length).toBeGreaterThan(0);
      expect(Array.isArray(bridge.mediaRendererBlocks)).toBe(true);
      expect(bridge.bundles.every((bundle) =>
        ['plan_choose_natural_phrase', 'plan_phrase_build', 'plan_missing_word', 'plan_phrase_recall'].includes(bundle.block.type),
      )).toBe(true);
      expect(bridge.deferredBlocks.map((block) => block.canonicalExerciseType)).not.toContain('phrase_build');
      expect(bridge.deferredBlocks.map((block) => block.canonicalExerciseType)).not.toContain('lesson_bridge');
      expect(bridge.deferredBlocks.map((block) => block.canonicalExerciseType)).not.toContain('quick_reply');
      expect(bridge.deferredBlocks.map((block) => block.canonicalExerciseType)).not.toContain('micro_dialogue');
      expect(bridge.deferredBlocks.map((block) => block.canonicalExerciseType)).not.toContain('listening_choice');
      expect(bridge.deferredBlocks.map((block) => block.canonicalExerciseType)).not.toContain('pronunciation_shadow');
      expect(bridge.linkedLessonBlocks.every((block) => block.type === 'linked_lesson_slice')).toBe(true);
      expect(validateGavanWeek1CanonicalRuntimeBridge(bridge)).toEqual({
        valid: true,
        issues: [],
      });
    }
  });

  it('keeps day 1 start grounded and day 2 selectable from the canonical plan', () => {
    const bridge1 = buildGavanWeek1CanonicalRuntimeBridge({ dayIndex: 1 });
    const day1 = buildGavanWeek1CanonicalRuntimeBundles({ dayIndex: 1 });
    const day2 = buildGavanWeek1CanonicalRuntimeBundles({ dayIndex: 2 });

    expect(day1.status).toBe('ready');
    expect(day2.status).toBe('ready');
    if (day1.status !== 'ready' || day2.status !== 'ready') {
      throw new Error('Expected day 1 and day 2 runtime bundles to be ready.');
    }

    expect(bridge1.linkedLessonBlocks[0]).toEqual(
      expect.objectContaining({
        id: 'gavan-week1-day1:block-1',
        type: 'linked_lesson_slice',
        progressPolicy: 'correct_only',
        destination: {
          type: 'lesson',
          lessonId: 1,
          requiredPhrases: 4,
          requiredPhraseIds: [
            'gavan-week1-day1:phrase-1',
            'gavan-week1-day1:phrase-2',
            'gavan-week1-day1:phrase-3',
            'gavan-week1-day1:phrase-4',
          ],
        },
      }),
    );

    expect(day1.bundles[0].block.id).toBe('gavan-week1-day1:canonical-bridge');
    expect(day1.bundles[0].block.title).toBe('База дня');
    expect(day1.bundles[0].block.titleEs).toBe('Base del día');
    expect(bridge1.dayTitleEs).toBe('Inicio sin bloqueo');
    expect(bridge1.linkedLessonBlocks[0].titleEs).toBe('Base antes de practicar');
    expect(day1.bundles.map((bundle) => bundle.block.type)).toEqual([
      'plan_choose_natural_phrase',
      'plan_phrase_build',
      'plan_choose_natural_phrase',
      'plan_phrase_recall',
    ]);
    expect(day2.bundles[0].block.id).toBe('gavan-week1-day2:canonical-bridge');
    expect(day2.bundles.map((bundle) => bundle.block.type)).toEqual([
      'plan_choose_natural_phrase',
      'plan_phrase_build',
      'plan_phrase_recall',
    ]);
  });

  it('turns quick replies and micro dialogues into live runtime practice instead of parked audit items', () => {
    const day4 = buildGavanWeek1CanonicalRuntimeBundles({ dayIndex: 4 });
    const day6 = buildGavanWeek1CanonicalRuntimeBundles({ dayIndex: 6 });
    const day7 = buildGavanWeek1CanonicalRuntimeBundles({ dayIndex: 7 });

    expect(day4.status).toBe('ready');
    expect(day6.status).toBe('ready');
    expect(day7.status).toBe('ready');
    if (day4.status !== 'ready' || day6.status !== 'ready' || day7.status !== 'ready') {
      throw new Error('Expected late-week runtime bundles to be ready.');
    }

    expect(day4.bundles.map((bundle) => bundle.block.type)).toEqual([
      'plan_choose_natural_phrase',
      'plan_choose_natural_phrase',
      'plan_choose_natural_phrase',
      'plan_phrase_recall',
    ]);
    expect(day6.bundles.map((bundle) => bundle.block.type)).toEqual([
      'plan_choose_natural_phrase',
      'plan_choose_natural_phrase',
      'plan_missing_word',
      'plan_phrase_recall',
    ]);
    expect(day7.bundles.map((bundle) => bundle.block.type)).toEqual([
      'plan_choose_natural_phrase',
      'plan_choose_natural_phrase',
      'plan_phrase_recall',
    ]);
  });

  it('keeps media exercises as explicit renderer blocks with route params instead of fake audio-ready bundles', () => {
    const day2 = buildGavanWeek1CanonicalRuntimeBridge({ dayIndex: 2 });
    const day6 = buildGavanWeek1CanonicalRuntimeBridge({ dayIndex: 6 });

    expect(day2.mediaRendererBlocks.map((block) => block.type)).toEqual(['plan_listen_choose']);
    expect(day6.mediaRendererBlocks.map((block) => block.type)).toEqual(['plan_pronunciation_repeat']);
    expect(day2.bundles.map((bundle) => bundle.block.type)).not.toContain('plan_listen_choose');
    expect(day6.bundles.map((bundle) => bundle.block.type)).not.toContain('plan_pronunciation_repeat');

    expect(day2.mediaRendererBlocks[0]).toEqual(
      expect.objectContaining({
        progressPolicy: 'correct_only',
        recoveryPolicy: 'return_wrong_to_recall_and_trainer',
        destination: expect.objectContaining({
          type: 'plan_exercise',
          exerciseType: 'plan_listen_choose',
          contentUnitIds: day2.mediaRendererBlocks[0].contentUnitIds,
        }),
      }),
    );
    expect(day6.mediaRendererBlocks[0]).toEqual(
      expect.objectContaining({
        progressPolicy: 'completion_only',
        recoveryPolicy: 'return_wrong_to_trainer',
        destination: expect.objectContaining({
          type: 'plan_exercise',
          exerciseType: 'plan_pronunciation_repeat',
          contentUnitIds: day6.mediaRendererBlocks[0].contentUnitIds,
        }),
      }),
    );

    const day2Actions = buildPlanDayOpenActions(day2.mediaRendererBlocks, 'gavan-instance-1');
    const day6Actions = buildPlanDayOpenActions(day6.mediaRendererBlocks, 'gavan-instance-1');

    expect(day2Actions).toEqual(expect.objectContaining({
      hasBlockedActions: false,
      counts: expect.objectContaining({ openPlanRenderer: 1, blocked: 0 }),
    }));
    expect(day6Actions).toEqual(expect.objectContaining({
      hasBlockedActions: false,
      counts: expect.objectContaining({ openPlanRenderer: 1, blocked: 0 }),
    }));
  });

  it('blocks invalid day indexes before UI receives an empty runtime', () => {
    const result = buildGavanWeek1CanonicalRuntimeBundles({ dayIndex: 8 as 1 });

    expect(result).toEqual({
      status: 'blocked',
      issues: ['missing_canonical_day:8'],
    });
  });
});
