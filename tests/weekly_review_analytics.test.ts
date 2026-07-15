const logEvent = jest.fn();

jest.mock('../app/firebase', () => ({
  logEvent: (...args: unknown[]) => logEvent(...args),
}));

import {
  signalBucket,
  latencyBucket,
  trackWeeklyReviewEvent,
} from '../app/weekly_review_analytics';

describe('weekly review analytics', () => {
  beforeEach(() => logEvent.mockClear());

  it('emits only allowlisted event names and normalized fields', () => {
    trackWeeklyReviewEvent('weekly_review_generate_succeeded', {
      tier: 'plus',
      study_target: 'en',
      signal_bucket: '4_7',
      result_source: 'provider',
      latency_bucket: '1_3s',
      schema_version: 'weekly-review-v2',
      uid: 'secret',
      email: 'learner@example.com',
      headline: 'private generated copy',
    } as never);

    expect(logEvent).toHaveBeenCalledWith('weekly_review_generate_succeeded', {
      tier: 'plus',
      study_target: 'en',
      signal_bucket: '4_7',
      result_source: 'provider',
      latency_bucket: '1_3s',
      schema_version: 'weekly_review_v2',
    });
  });

  it('drops learning text, explicit identifiers, and raw errors', () => {
    trackWeeklyReviewEvent('weekly_review_generate_failed', {
      error_code: 'network socket said learner phrase',
      phrase: 'private phrase',
      lesson_title: 'private lesson',
      summary: 'private summary',
      message: 'raw error message',
    } as never);

    expect(logEvent).toHaveBeenCalledWith('weekly_review_generate_failed', {
      error_code: 'unknown',
    });
    expect(JSON.stringify(logEvent.mock.calls)).not.toMatch(/private|socket|learner phrase|raw error/i);
  });

  it('does not accept the removed local fallback result source', () => {
    trackWeeklyReviewEvent('weekly_review_impression', {
      tier: 'plus',
      result_source: 'local_fallback',
    } as never);

    expect(logEvent).toHaveBeenCalledWith('weekly_review_impression', {
      tier: 'plus',
    });
  });

  it('ignores unknown events at runtime', () => {
    trackWeeklyReviewEvent('weekly_review_private_dump' as never, { tier: 'plus' });
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('uses bounded, non-identifying buckets', () => {
    expect([signalBucket(0), signalBucket(2), signalBucket(6), signalBucket(99)]).toEqual(['0', '1_3', '4_7', '8_plus']);
    expect([latencyBucket(500), latencyBucket(2_000), latencyBucket(7_000), latencyBucket(20_000)]).toEqual(['under_1s', '1_3s', '3_10s', '10s_plus']);
  });
});
