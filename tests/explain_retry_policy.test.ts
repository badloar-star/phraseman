import {
  classifyExplainRetry,
  explainRetryDelayMs,
  isFreeExplainLimitError,
} from '../lib/explain_retry_policy';

describe('shared explanation retry policy', () => {
  it('treats only the intended Free allowance as terminal', () => {
    const error = new Error('explain_free_daily_limit');
    expect(isFreeExplainLimitError(error)).toBe(true);
    expect(classifyExplainRetry(error)).toBe('free_limit');
    expect(explainRetryDelayMs(error, 1)).toBe(0);
  });

  it('retries validator rejections quickly but with bounded exponential backoff', () => {
    expect(classifyExplainRetry(new Error('mistake_explain_wrong_language'))).toBe('validator');
    expect(explainRetryDelayMs(new Error('validator rejected'), 1)).toBeGreaterThanOrEqual(350);
    expect(explainRetryDelayMs(new Error('validator rejected'), 20)).toBeLessThanOrEqual(5_000);
  });

  it('backs off infrastructure pauses instead of creating a tight request loop', () => {
    const paused = new Error('mistake_explain_rate_limited');
    expect(classifyExplainRetry(paused)).toBe('paused');
    expect(explainRetryDelayMs(paused, 1)).toBeGreaterThanOrEqual(30_000);
    expect(explainRetryDelayMs(paused, 20)).toBeLessThanOrEqual(60_000);
  });

  it('keeps transient provider retries bounded per delay while allowing unlimited attempts', () => {
    const transient = new Error('network timeout');
    expect(classifyExplainRetry(transient)).toBe('transient');
    expect(explainRetryDelayMs(transient, 1)).toBeGreaterThanOrEqual(1_000);
    expect(explainRetryDelayMs(transient, 50)).toBeLessThanOrEqual(30_000);
  });
});
