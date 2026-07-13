import {
  __resetRemoteFlagsForTest,
  applyRemoteConfigSnapshot,
  getSoftUpsellEnabledByTrigger,
  getRemoteBool,
} from '../app/remote_flags';

const FLAGS = {
  first_lesson: 'soft_upsell_first_lesson_enabled',
  free_lessons_complete: 'soft_upsell_free_lessons_complete_enabled',
  weekly_review: 'soft_upsell_weekly_review_enabled',
  second_ai_dialogue: 'soft_upsell_second_ai_dialogue_enabled',
  streak_milestone: 'soft_upsell_streak_enabled',
  repeated_training: 'soft_upsell_repeated_training_enabled',
} as const;

afterEach(__resetRemoteFlagsForTest);

test('verified lesson switches default on while deferred integrations stay off', () => {
  expect(Object.values(FLAGS).map((key) => getRemoteBool(key))).toEqual([
    true, true, false, false, false, false,
  ]);
  expect(getSoftUpsellEnabledByTrigger()).toEqual({
    first_lesson: true,
    free_lessons_complete: true,
    weekly_review: false,
    second_ai_dialogue: false,
    streak_milestone: false,
    repeated_training: false,
  });
});

test('accepts booleans and rejects non-booleans without changing existing defaults', () => {
  applyRemoteConfigSnapshot({ bools: {
    soft_upsell_first_lesson_enabled: false,
    soft_upsell_weekly_review_enabled: 'true',
  } });
  expect(getRemoteBool('soft_upsell_first_lesson_enabled')).toBe(false);
  expect(getRemoteBool('soft_upsell_weekly_review_enabled')).toBe(false);
  expect(getRemoteBool('referral_enabled')).toBe(true);
  expect(getRemoteBool('ideas_enabled')).toBe(false);
});
