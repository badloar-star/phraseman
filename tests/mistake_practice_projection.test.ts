import type { MistakeEvent } from '../modules/mistake-practice/contracts';
import { projectMistakes } from '../modules/mistake-practice/projection';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 7, 20, 10);

function event(
  type: MistakeEvent['type'],
  occurredAtMs: number,
  payload: Record<string, unknown> = {},
  overrides: Partial<MistakeEvent> = {},
): MistakeEvent {
  return {
    eventId: `${type}:${occurredAtMs}:${String(payload.mode ?? '')}:${String(payload.localDay ?? '')}`,
    mistakeId: 'mistake:v1:one',
    cycleId: 'cycle-1',
    type,
    occurredAtMs,
    studyTarget: 'en',
    payload,
    ...overrides,
  };
}

const captured = event('captured', T0, {
  lessonId: 'lesson-1',
  facet: 'word_order',
  canonicalTarget: 'I am ready.',
});

describe('mistake projection', () => {
  test('first objective capture becomes active and due immediately', () => {
    const projection = projectMistakes([captured]);
    const item = projection.items.get(captured.mistakeId);

    expect(item).toMatchObject({
      status: 'active',
      dueAtMs: T0,
      captureCount: 1,
      hintCount: 0,
      cycleId: 'cycle-1',
    });
  });

  test('hint alone does not create a mistake but remains a weak signal for an active one', () => {
    const orphanHint = event('hint_used', T0 - 1, { kind: 'fifty_fifty' });
    expect(projectMistakes([orphanHint]).items.size).toBe(0);

    const projection = projectMistakes([
      captured,
      event('hint_used', T0 + 1, { kind: 'fifty_fifty' }),
    ]);
    expect(projection.items.get(captured.mistakeId)?.hintCount).toBe(1);
  });

  test('counts at most one qualifying correct per local day', () => {
    const projection = projectMistakes([
      captured,
      event('practice_answered', T0 + 1, {
        correct: true,
        independent: true,
        localDay: '2026-08-20',
        mode: 'lesson_typing',
        support: 'production',
      }),
      event('practice_answered', T0 + 2, {
        correct: true,
        independent: true,
        localDay: '2026-08-20',
        mode: 'lesson_listening',
        support: 'production',
      }),
    ]);

    const item = projection.items.get(captured.mistakeId);
    expect(item?.qualifyingDays).toEqual(['2026-08-20']);
    expect(item?.qualifyingModes).toEqual(['lesson_typing']);
    expect(item?.status).toBe('active');
  });

  test('corrects after three independent days, two modes and a production answer', () => {
    const projection = projectMistakes([
      captured,
      event('practice_answered', T0 + 1, {
        correct: true,
        independent: true,
        localDay: '2026-08-20',
        mode: 'lesson_scripted_speech',
        support: 'production',
      }),
      event('practice_answered', T0 + DAY, {
        correct: true,
        independent: true,
        localDay: '2026-08-21',
        mode: 'lesson_typing',
        support: 'production',
      }),
      event('practice_answered', T0 + DAY * 2, {
        correct: true,
        independent: true,
        localDay: '2026-08-22',
        mode: 'lesson_scripted_speech',
        support: 'production',
      }),
    ]);

    expect(projection.items.get(captured.mistakeId)).toMatchObject({
      status: 'corrected',
      correctedAtMs: T0 + DAY * 2,
      qualifyingDays: ['2026-08-20', '2026-08-21', '2026-08-22'],
      qualifyingModes: [
        'lesson_scripted_speech',
        'lesson_typing',
        'lesson_scripted_speech',
      ],
      hasIndependentProduction: true,
    });
  });

  test('recognition-only history cannot mark an item corrected', () => {
    const answers = [0, 1, 2].map((day) =>
      event('practice_answered', T0 + DAY * day, {
        correct: true,
        independent: true,
        localDay: `2026-08-${20 + day}`,
        mode: day % 2 === 0 ? 'lesson_choice' : 'arena_speed_match',
        support: 'recognition',
      }),
    );
    const item = projectMistakes([captured, ...answers]).items.get(
      captured.mistakeId,
    );

    expect(item?.qualifyingDays).toHaveLength(0);
    expect(item?.hasIndependentProduction).toBe(false);
    expect(item?.status).toBe('active');
  });

  test('an independent production miss resets the series and is due immediately', () => {
    const missAt = T0 + DAY + 100;
    const item = projectMistakes([
      captured,
      event('practice_answered', T0 + 1, {
        correct: true,
        independent: true,
        localDay: '2026-08-20',
        mode: 'lesson_typing',
        support: 'production',
      }),
      event('practice_answered', missAt, {
        correct: false,
        independent: true,
        localDay: '2026-08-21',
        mode: 'lesson_typing',
        support: 'production',
      }),
    ]).items.get(captured.mistakeId);

    expect(item?.qualifyingDays).toEqual([]);
    expect(item?.status).toBe('active');
    expect(item?.dueAtMs).toBe(missAt);
  });

  test('recognition verdicts never masquerade as independent evidence or erase it', () => {
    const recognitionAt = T0 + DAY + 100;
    const item = projectMistakes([
      captured,
      event('practice_answered', T0 + 1, {
        correct: true,
        independent: true,
        localDay: '2026-08-20',
        mode: 'lesson_typing',
        support: 'production',
      }),
      event('practice_answered', recognitionAt, {
        correct: false,
        independent: true,
        localDay: '2026-08-21',
        mode: 'lesson_choice',
        support: 'production',
      }),
    ]).items.get(captured.mistakeId);

    expect(item?.qualifyingDays).toEqual(['2026-08-20']);
    expect(item?.dueAtMs).toBe(recognitionAt);
  });

  test('grows the independent-success interval adaptively', () => {
    const firstAt = T0 + 1;
    const secondAt = T0 + DAY + 1;
    const first = projectMistakes([
      captured,
      event('practice_answered', firstAt, {
        correct: true, localDay: '2026-08-20', mode: 'lesson_typing', support: 'recognition',
      }),
    ]).items.get(captured.mistakeId);
    const second = projectMistakes([
      captured,
      event('practice_answered', firstAt, {
        correct: true, localDay: '2026-08-20', mode: 'lesson_typing', support: 'recognition',
      }),
      event('practice_answered', secondAt, {
        correct: true, localDay: '2026-08-21', mode: 'lesson_scripted_speech', support: 'recognition',
      }),
    ]).items.get(captured.mistakeId);
    expect(first?.dueAtMs).toBe(firstAt + DAY);
    expect(second?.dueAtMs).toBe(secondAt + DAY * 2);
  });

  test('hide, undo and a new correction cycle are event driven', () => {
    const hidden = event('hidden', T0 + 1);
    const restored = event('restored', T0 + 2);
    expect(projectMistakes([captured, hidden]).items.get(captured.mistakeId)?.status).toBe('hidden');
    expect(projectMistakes([captured, hidden, restored]).items.get(captured.mistakeId)?.status).toBe('active');

    const nextCapture = event(
      'captured',
      T0 + DAY,
      captured.payload as Record<string, unknown>,
      { cycleId: 'cycle-2', eventId: 'capture:cycle-2' },
    );
    const revived = projectMistakes([captured, hidden, nextCapture]).items.get(
      captured.mistakeId,
    );
    expect(revived).toMatchObject({
      status: 'active',
      cycleId: 'cycle-2',
      qualifyingDays: [],
      captureCount: 1,
    });
  });

  test('keeps unavailable source content out of practice until it is restored', () => {
    const unavailable = event('content_unavailable', T0 + 1);
    expect(projectMistakes([captured, unavailable]).items.get(captured.mistakeId)?.status).toBe('unavailable');
    expect(projectMistakes([captured, unavailable, event('restored', T0 + 2)]).items.get(captured.mistakeId)?.status).toBe('active');
  });

  test('deduplicates event ids and is deterministic for reordered input', () => {
    const hint = event('hint_used', T0 + 1, {}, { eventId: 'hint:stable' });
    const forward = projectMistakes([captured, hint, hint]);
    const reverse = projectMistakes([hint, captured, hint]);

    expect([...forward.items.entries()]).toEqual([...reverse.items.entries()]);
    expect(forward.duplicateEventCount).toBe(1);
    expect(reverse.duplicateEventCount).toBe(1);
  });
});
