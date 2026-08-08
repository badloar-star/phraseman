import {
  SOFT_UPSELL_CONTEXTS,
  SOFT_UPSELL_CONTEXT_COOLDOWN_MS,
  SOFT_UPSELL_GLOBAL_COOLDOWN_MS,
  SOFT_UPSELL_TRIGGERS,
  decideSoftUpsell,
  type SoftUpsellCandidate,
  type SoftUpsellInput,
  type SoftUpsellTrigger,
} from '../app/soft_upsell_core';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW_MS = 30 * DAY_MS;

const candidate = (
  trigger: SoftUpsellTrigger,
  value: number,
  studyTarget: 'en' | 'fr' = 'en',
): SoftUpsellCandidate => ({ trigger, value, studyTarget });

const input = (overrides: Partial<SoftUpsellInput> = {}): SoftUpsellInput => ({
  candidates: [candidate('first_lesson', 1)],
  hasPremiumAccess: false,
  enabled: { first_lesson: true },
  overlayOccupied: false,
  sessionClaimed: false,
  nowMs: NOW_MS,
  lastGlobalImpressionMs: null,
  contextDismissedAtMs: {},
  consumedMilestones: [],
  ...overrides,
});

describe('soft upsell policy', () => {
  test('exports the complete finite trigger and context catalogs', () => {
    expect(SOFT_UPSELL_TRIGGERS).toEqual([
      'first_lesson',
      'free_lessons_complete',
      'weekly_review',
      'second_ai_dialogue',
      'streak_milestone',
      'repeated_training',
    ]);
    expect(SOFT_UPSELL_CONTEXTS).toEqual([
      'first_lesson_success',
      'free_lessons_complete',
      'weekly_review',
      'dialog_repeat_success',
      'streak_milestone',
      'trainer_repeat_success',
    ]);
    expect(SOFT_UPSELL_GLOBAL_COOLDOWN_MS).toBe(7 * DAY_MS);
    expect(SOFT_UPSELL_CONTEXT_COOLDOWN_MS).toBe(7 * DAY_MS);
  });

  test.each([
    ['first_lesson', 1, 'first_lesson_success', 'personal_plan'],
    ['free_lessons_complete', 3, 'free_lessons_complete', 'paywall'],
    ['weekly_review', 1, 'weekly_review', 'paywall'],
    ['second_ai_dialogue', 2, 'dialog_repeat_success', 'paywall'],
    ['streak_milestone', 7, 'streak_milestone', 'paywall'],
    ['streak_milestone', 14, 'streak_milestone', 'paywall'],
    ['streak_milestone', 30, 'streak_milestone', 'paywall'],
    ['repeated_training', 1, 'trainer_repeat_success', 'paywall'],
  ] as const)('maps %s value %i to its opportunity', (trigger, value, context, destination) => {
    expect(decideSoftUpsell(input({
      candidates: [candidate(trigger, value, 'fr')],
      enabled: { [trigger]: true },
    }))).toEqual({
      status: 'eligible',
      opportunity: {
        trigger,
        value,
        studyTarget: 'fr',
        context,
        destination,
        milestoneId: `${trigger}:${value}:fr`,
      },
    });
  });

  test('selects candidates in deterministic priority order including descending streak values', () => {
    const candidates = [
      candidate('repeated_training', 1),
      candidate('first_lesson', 1),
      candidate('streak_milestone', 7),
      candidate('streak_milestone', 30),
      candidate('streak_milestone', 14),
      candidate('weekly_review', 1),
      candidate('second_ai_dialogue', 2),
      candidate('free_lessons_complete', 3),
    ];
    const enabled = Object.fromEntries(SOFT_UPSELL_TRIGGERS.map(trigger => [trigger, true]));
    expect(decideSoftUpsell(input({ candidates, enabled }))).toMatchObject({
      status: 'eligible',
      opportunity: { trigger: 'free_lessons_complete' },
    });
  });

  test.each([
    ['free_lessons_complete', 3, 'second_ai_dialogue', 2],
    ['second_ai_dialogue', 2, 'weekly_review', 1],
    ['weekly_review', 1, 'streak_milestone', 30],
    ['streak_milestone', 7, 'first_lesson', 1],
    ['first_lesson', 1, 'repeated_training', 1],
  ] as const)(
    'prioritizes %s (%i) over adjacent lower-priority %s (%i)',
    (higherTrigger, higherValue, lowerTrigger, lowerValue) => {
      expect(decideSoftUpsell(input({
        candidates: [candidate(lowerTrigger, lowerValue), candidate(higherTrigger, higherValue)],
        enabled: { [higherTrigger]: true, [lowerTrigger]: true },
      }))).toMatchObject({
        status: 'eligible',
        opportunity: { trigger: higherTrigger, value: higherValue },
      });
    },
  );

  test.each([
    [30, 14],
    [14, 7],
  ] as const)('prioritizes isolated streak %i over streak %i', (higherValue, lowerValue) => {
    expect(decideSoftUpsell(input({
      candidates: [
        candidate('streak_milestone', lowerValue),
        candidate('streak_milestone', higherValue),
      ],
      enabled: { streak_milestone: true },
    }))).toMatchObject({
      status: 'eligible',
      opportunity: { trigger: 'streak_milestone', value: higherValue },
    });
  });

  test.each([
    ['first_lesson', 0], ['first_lesson', 2],
    ['free_lessons_complete', 0], ['free_lessons_complete', 33],
    ['second_ai_dialogue', 1], ['second_ai_dialogue', 3],
    ['weekly_review', 2], ['repeated_training', 2],
    ['streak_milestone', 6], ['streak_milestone', 8], ['streak_milestone', 31],
  ] as const)('rejects invalid %s value %i', (trigger, value) => {
    expect(decideSoftUpsell(input({
      candidates: [candidate(trigger, value)],
      enabled: { [trigger]: true },
    }))).toEqual({ status: 'suppressed', reason: 'invalid_trigger_value' });
  });

  test('uses the selected candidate before suppression checks', () => {
    expect(decideSoftUpsell(input({
      candidates: [candidate('first_lesson', 99), candidate('repeated_training', 1)],
      enabled: { first_lesson: true, repeated_training: true },
    }))).toEqual({ status: 'suppressed', reason: 'invalid_trigger_value' });
  });

  test.each([
    ['no_candidate', { candidates: [] }],
    ['premium', { hasPremiumAccess: true }],
    ['disabled', { enabled: {} }],
    ['overlay_occupied', { overlayOccupied: true }],
    ['session_cap', { sessionClaimed: true }],
    ['global_cooldown', { lastGlobalImpressionMs: NOW_MS - DAY_MS }],
    ['context_cooldown', { contextDismissedAtMs: { first_lesson_success: NOW_MS - DAY_MS } }],
    ['milestone_consumed', { consumedMilestones: ['first_lesson:1:en'] }],
  ] as const)('returns suppression reason %s', (reason, overrides) => {
    expect(decideSoftUpsell(input(overrides))).toEqual({ status: 'suppressed', reason });
  });

  test.each([
    ['no_candidate', { candidates: [], hasPremiumAccess: true }],
    ['premium', { candidates: [candidate('first_lesson', 99)], hasPremiumAccess: true }],
    ['invalid_trigger_value', { candidates: [candidate('first_lesson', 99)], enabled: {} }],
    ['disabled', { enabled: {}, overlayOccupied: true }],
    ['overlay_occupied', { overlayOccupied: true, sessionClaimed: true }],
    ['session_cap', { sessionClaimed: true, lastGlobalImpressionMs: NOW_MS }],
    ['global_cooldown', {
      lastGlobalImpressionMs: NOW_MS,
      contextDismissedAtMs: { first_lesson_success: NOW_MS },
    }],
    ['context_cooldown', {
      contextDismissedAtMs: { first_lesson_success: NOW_MS },
      consumedMilestones: ['first_lesson:1:en'],
    }],
  ] as const)(
    'applies adjacent suppression precedence and returns %s',
    (reason, competingConditions) => {
      expect(decideSoftUpsell(input(competingConditions))).toEqual({ status: 'suppressed', reason });
    },
  );

  test.each([
    ['global', { lastGlobalImpressionMs: NOW_MS - 7 * DAY_MS + 1 }, 'global_cooldown'],
    ['global boundary', { lastGlobalImpressionMs: NOW_MS - 7 * DAY_MS }, null],
    ['global future', { lastGlobalImpressionMs: NOW_MS + DAY_MS }, 'global_cooldown'],
    ['global negative timestamp', { lastGlobalImpressionMs: -1 }, 'global_cooldown'],
    ['context', { contextDismissedAtMs: { first_lesson_success: NOW_MS - 7 * DAY_MS + 1 } }, 'context_cooldown'],
    ['context boundary', { contextDismissedAtMs: { first_lesson_success: NOW_MS - 7 * DAY_MS } }, null],
    ['context future', { contextDismissedAtMs: { first_lesson_success: NOW_MS + DAY_MS } }, 'context_cooldown'],
    ['context negative timestamp', { contextDismissedAtMs: { first_lesson_success: -1 } }, 'context_cooldown'],
  ] as const)('handles %s cooldown safely', (_label, overrides, reason) => {
    const decision = decideSoftUpsell(input(overrides));
    if (reason) expect(decision).toEqual({ status: 'suppressed', reason });
    else expect(decision.status).toBe('eligible');
  });
});
