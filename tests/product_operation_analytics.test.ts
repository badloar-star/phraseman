import { buildProductOperationFailurePayload } from '../app/product_operation_analytics';

describe('product operation failure analytics', () => {
  it('builds an allowlisted payload without raw error, message, stack or URL', () => {
    const payload = buildProductOperationFailurePayload({
      eventId: 'event-1',
      feature: 'paywall',
      operation: 'offerings_load',
      failureCode: 'store_unavailable',
      retryable: true,
      appVersion: '1.2.3',
      buildNumber: '44',
      occurredAtMs: 123,
    });
    expect(payload).toEqual({
      schema_version: 1,
      event_id: 'event-1',
      feature: 'paywall',
      operation: 'offerings_load',
      failure_code: 'store_unavailable',
      retryable: true,
      app_version: '1.2.3',
      build_number: '44',
      occurred_at_ms: 123,
    });
    expect(JSON.stringify(payload)).not.toMatch(/message|stack|https?:|error_text/i);
  });
});
