/** Решение владельца 04.10: окно отзыва после опроса Plus снова показывается — один раз, не оценившему. */
import { claimVipSurveyReviewPrompt, VIP_SURVEY_REVIEW_PROMPT_KEY_PREFIX } from '../app/vip_survey_review_prompt';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../app/review_utils', () => ({ hasUserRated: jest.fn(async () => false) }));

function deps(overrides: Partial<Parameters<typeof claimVipSurveyReviewPrompt>[2]> = {}) {
  const store = new Map<string, string>();
  return {
    store,
    deps: {
      hasUserRated: async () => false,
      getItem: async (k: string) => store.get(k) ?? null,
      setItem: async (k: string, v: string) => { store.set(k, v); },
      nowMs: () => 123,
      ...overrides,
    },
  };
}

beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => undefined));
afterEach(() => jest.restoreAllMocks());

test('first time after the survey: show, and mark it so it never repeats for this survey', async () => {
  const { store, deps: d } = deps();
  expect(await claimVipSurveyReviewPrompt('vip_feedback_v2', 'after_celebration', d)).toEqual({ show: true });
  expect(store.get(`${VIP_SURVEY_REVIEW_PROMPT_KEY_PREFIX}vip_feedback_v2`)).toBe('123');
  expect(await claimVipSurveyReviewPrompt('vip_feedback_v2', 'already_granted', d)).toEqual({ show: false, reason: 'already_shown' });
  expect(console.log).toHaveBeenCalledWith('[VIP-REVIEW-PROMPT]', expect.stringContaining('"reason":"already_shown"'));
});

test('already rated: never show', async () => {
  const { deps: d } = deps({ hasUserRated: async () => true });
  expect(await claimVipSurveyReviewPrompt('vip_feedback_v2', 'after_celebration', d)).toEqual({ show: false, reason: 'already_rated' });
});

test('storage failure: do not show, reason logged', async () => {
  const { deps: d } = deps({ getItem: async () => { throw new Error('disk'); } });
  expect(await claimVipSurveyReviewPrompt('vip_feedback_v2', 'after_celebration', d)).toEqual({ show: false, reason: 'storage_failed' });
  expect(console.log).toHaveBeenCalledWith('[VIP-REVIEW-PROMPT]', expect.stringContaining('"error":"disk"'));
});
