import {
  clearProductAnalyticsSessionId,
  getProductAnalyticsSessionId,
  setProductAnalyticsSessionId,
} from '../app/product_analytics_session_context';

describe('product analytics session context', () => {
  afterEach(clearProductAnalyticsSessionId);

  it('stores only the current in-memory analytics session id', () => {
    expect(getProductAnalyticsSessionId()).toBeNull();
    setProductAnalyticsSessionId('session-1');
    expect(getProductAnalyticsSessionId()).toBe('session-1');
    clearProductAnalyticsSessionId();
    expect(getProductAnalyticsSessionId()).toBeNull();
  });

  it('rejects empty or oversized values', () => {
    setProductAnalyticsSessionId('');
    expect(getProductAnalyticsSessionId()).toBeNull();
    setProductAnalyticsSessionId('x'.repeat(81));
    expect(getProductAnalyticsSessionId()).toBeNull();
  });
});
