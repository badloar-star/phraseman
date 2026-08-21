import type { MistakeProjectionItem } from '../modules/mistake-practice/projection';
import {
  planFailureRequeue,
  selectMistakesForSession,
} from '../modules/mistake-practice/scheduler';

function item(
  mistakeId: string,
  dueAtMs: number,
  overrides: Partial<MistakeProjectionItem> = {},
): MistakeProjectionItem {
  return {
    mistakeId,
    cycleId: 'cycle-1',
    studyTarget: 'en',
    status: 'active',
    firstCapturedAtMs: dueAtMs - 100,
    lastEventAtMs: dueAtMs,
    dueAtMs,
    correctedAtMs: null,
    captureCount: 1,
    hintCount: 0,
    qualifyingDays: [],
    qualifyingModes: [],
    hasIndependentProduction: false,
    lessonId: null,
    facet: 'word_order',
    canonicalTarget: 'I am ready.',
    ...overrides,
  };
}

describe('mistake scheduler', () => {
  test('selects failed-in-session first, then overdue oldest, then other due items', () => {
    const selected = selectMistakesForSession(
      [
        item('newer', 900, { firstCapturedAtMs: 800 }),
        item('failed', 950, { firstCapturedAtMs: 900 }),
        item('oldest', 900, { firstCapturedAtMs: 100 }),
        item('future', 1_500),
      ],
      {
        nowMs: 1_000,
        limit: 5,
        failedMistakeIds: new Set(['failed']),
      },
    );

    expect(selected.map((entry) => entry.mistakeId)).toEqual([
      'failed',
      'oldest',
      'newer',
    ]);
  });

  test('first capture is selectable immediately and hidden/corrected items are excluded', () => {
    const selected = selectMistakesForSession(
      [
        item('immediate', 1_000),
        item('hidden', 0, { status: 'hidden' }),
        item('corrected', 0, { status: 'corrected' }),
      ],
      { nowMs: 1_000, limit: 5 },
    );
    expect(selected.map((entry) => entry.mistakeId)).toEqual(['immediate']);
  });

  test('never filters the mixed queue by input modality', () => {
    const selected = selectMistakesForSession(
      [
        item('form', 0, { facet: 'form' }),
        item('voice', 0, { facet: 'pronunciation' }),
      ],
      { nowMs: 1_000, limit: 5 },
    );
    expect(selected.map((entry) => entry.mistakeId)).toEqual(['form', 'voice']);
  });

  test('requeues the first two failures after two to four tasks', () => {
    expect(planFailureRequeue({ mistakeId: 'a', failureCount: 1 })).toMatchObject({
      kind: 'requeue',
    });
    expect(planFailureRequeue({ mistakeId: 'a', failureCount: 1 })).toEqual(
      planFailureRequeue({ mistakeId: 'a', failureCount: 1 }),
    );
    for (const failureCount of [1, 2]) {
      const result = planFailureRequeue({ mistakeId: 'stable', failureCount });
      expect(result.kind).toBe('requeue');
      if (result.kind === 'requeue') {
        expect(result.afterTaskCount).toBeGreaterThanOrEqual(2);
        expect(result.afterTaskCount).toBeLessThanOrEqual(4);
      }
    }
  });

  test('stops requeueing after the third failure and requests an explanation', () => {
    expect(planFailureRequeue({ mistakeId: 'a', failureCount: 3 })).toEqual({
      kind: 'stop_for_today',
      showExplanation: true,
    });
  });
});
