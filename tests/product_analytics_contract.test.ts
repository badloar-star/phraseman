import {
  PRODUCT_ANALYTICS_SCHEMA_VERSION,
  buildProductRuntimeEvent,
} from '../app/product_analytics_contract';

describe('product analytics contract', () => {
  it('builds a strict allowlisted event envelope', () => {
    const event = buildProductRuntimeEvent({
      eventId: 'event-1',
      eventName: 'product_screen_view',
      sessionId: 'session-1',
      screenId: 'home',
      platform: 'ios',
      appVersion: '2.0.0',
      buildNumber: '200',
      studyTarget: 'en',
      occurredAtMs: 1234,
      rawPathname: '/friends/private-user-id',
      email: 'private@example.com',
    } as any);

    expect(event.schemaVersion).toBe(PRODUCT_ANALYTICS_SCHEMA_VERSION);
    expect(Object.keys(event).sort()).toEqual([
      'appVersion',
      'buildNumber',
      'eventId',
      'eventName',
      'occurredAtMs',
      'platform',
      'schemaVersion',
      'screenId',
      'sessionId',
      'studyTarget',
    ]);
    expect(JSON.stringify(event)).not.toContain('private-user-id');
    expect(JSON.stringify(event)).not.toContain('private@example.com');
  });

  it('accepts only bounded duration and a known leave reason', () => {
    const event = buildProductRuntimeEvent({
      eventId: 'event-2',
      eventName: 'product_screen_leave',
      sessionId: 'session-1',
      screenId: 'lesson',
      platform: 'android',
      appVersion: '2.0.0',
      buildNumber: '200',
      studyTarget: 'fr',
      occurredAtMs: 1234,
      durationMs: Number.MAX_SAFE_INTEGER,
      leaveReason: 'route_change',
    });

    expect(event.durationMs).toBe(24 * 60 * 60 * 1000);
    expect(event.leaveReason).toBe('route_change');
  });
});
