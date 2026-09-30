import {
  createPaidAiAbortScope,
  isPaidAiFetchAbort,
  PAID_AI_FETCH_TIMEOUT_MS,
  paidAiFetchFailureReason,
} from './paid_ai_fetch_timeout';

describe('PM-231 paid AI fetch timeouts', () => {
  afterEach(() => jest.useRealTimers());

  it('keeps every user-facing timeout below its function timeoutSeconds budget', () => {
    expect(PAID_AI_FETCH_TIMEOUT_MS.dialogSend * 2).toBeLessThan(30_000);
    expect(PAID_AI_FETCH_TIMEOUT_MS.dialogTranslate).toBeLessThan(20_000);
    expect(PAID_AI_FETCH_TIMEOUT_MS.dialogStream).toBeLessThan(60_000);
    expect(PAID_AI_FETCH_TIMEOUT_MS.dialogReview).toBeLessThan(30_000);
    expect(PAID_AI_FETCH_TIMEOUT_MS.mistakeExplain * 3).toBeLessThan(120_000);
    expect(PAID_AI_FETCH_TIMEOUT_MS.mistakeHubAdvice).toBeLessThan(30_000);
  });

  it('aborts the stream scope on deadline with a TimeoutError reason', () => {
    jest.useFakeTimers();
    const scope = createPaidAiAbortScope(1_000);
    expect(scope.signal.aborted).toBe(false);
    jest.advanceTimersByTime(1_001);
    expect(scope.signal.aborted).toBe(true);
    expect(scope.abortReason()).toBe('timeout');
    expect(paidAiFetchFailureReason(scope.signal.reason)).toBe('timeout');
    expect(isPaidAiFetchAbort(scope.signal.reason)).toBe(true);
  });

  it('aborts on client close and keeps the first reason', () => {
    jest.useFakeTimers();
    const scope = createPaidAiAbortScope(1_000);
    scope.abortClientClosed();
    jest.advanceTimersByTime(2_000);
    expect(scope.abortReason()).toBe('client_closed');
    expect(paidAiFetchFailureReason(scope.signal.reason)).toBe('aborted');
  });

  it('dispose prevents a late timeout abort after a successful stream', () => {
    jest.useFakeTimers();
    const scope = createPaidAiAbortScope(1_000);
    scope.dispose();
    jest.advanceTimersByTime(5_000);
    expect(scope.signal.aborted).toBe(false);
    expect(scope.abortReason()).toBeNull();
  });

  it('classifies ordinary provider errors separately', () => {
    expect(paidAiFetchFailureReason(new Error('fetch failed'))).toBe('provider_exception');
    expect(isPaidAiFetchAbort(new Error('fetch failed'))).toBe(false);
  });
});
