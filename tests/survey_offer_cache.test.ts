import { beginSurveyOfferRequest, commitSurveyOfferRequest, peekSurveyOffer, resetSurveyOfferCacheForTests } from '../app/survey_offer_cache';

const scope = { stableId: 'a', dayKey: '2026-07-11', lang: 'ru' } as const;
const active = { surveyId: 's', title: 't', description: 'd', questionCount: 1, rewardShards: 2, phase: 'active', survey: { surveyId: 's' } as any } as const;
const completed = { ...active, phase: 'completed', survey: null } as const;

beforeEach(resetSurveyOfferCacheForTests);

it('offers synchronous peek and expires after the 26-hour warm-cache window', () => {
  const request = beginSurveyOfferRequest(scope, 1000);
  expect(commitSurveyOfferRequest(scope, request, active, 1000)).toBe(true);
  expect(peekSurveyOffer(scope, 93_600_999)).toEqual(active);
  expect(peekSurveyOffer(scope, 93_601_001)).toBeNull();
});

it('scopes entries by language, account, and captured day', () => {
  const request = beginSurveyOfferRequest(scope, 0);
  commitSurveyOfferRequest(scope, request, active, 0);
  expect(peekSurveyOffer({ ...scope, lang: 'uk' }, 1)).toBeNull();
  expect(peekSurveyOffer({ ...scope, stableId: 'b' }, 1)).toBeNull();
  expect(peekSurveyOffer({ ...scope, dayKey: '2026-07-12' }, 1)).toBeNull();
});

it('keeps at most four newest scopes', () => {
  for (let i = 0; i < 5; i += 1) {
    const s = { ...scope, dayKey: `day-${i}` };
    commitSurveyOfferRequest(s, beginSurveyOfferRequest(s, i), active, i);
  }
  expect(peekSurveyOffer({ ...scope, dayKey: 'day-0' }, 5)).toBeNull();
  expect(peekSurveyOffer({ ...scope, dayKey: 'day-4' }, 5)).toEqual(active);
});

it('rejects stale requests and completed-to-null regression', () => {
  const first = beginSurveyOfferRequest(scope, 0);
  const latest = beginSurveyOfferRequest(scope, 1);
  expect(commitSurveyOfferRequest(scope, first, active, 2)).toBe(false);
  expect(commitSurveyOfferRequest(scope, latest, completed, 2)).toBe(true);
  const next = beginSurveyOfferRequest(scope, 3);
  expect(commitSurveyOfferRequest(scope, next, null, 3)).toBe(false);
  expect(peekSurveyOffer(scope, 3)).toEqual(completed);
});

it('retains a warm snapshot during a pending or failed quiet revalidation', () => {
  commitSurveyOfferRequest(scope, beginSurveyOfferRequest(scope, 0), active, 0);
  beginSurveyOfferRequest(scope, 1);
  expect(peekSurveyOffer(scope, 59_999)).toEqual(active);
});
