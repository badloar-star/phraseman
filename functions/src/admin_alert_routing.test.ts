import { ADMIN_ALERT_IDS } from './admin_alert_catalog';
import {
  ADMIN_ALERT_STALE_MS,
  INSTANT_ADMIN_ALERT_TYPES,
  criticalErrorGroupKey,
  isLegacyAppVersion,
  routeAdminAlert,
} from './admin_alert_routing';

const NOW = Date.parse('2026-10-21T12:00:00Z');

describe('admin alert routing (владелец 21.10, №48)', () => {
  test('instant only for the owner-approved list; everything else goes to the weekly digest', () => {
    expect([...INSTANT_ADMIN_ALERT_TYPES].sort()).toEqual([
      'authFailureSpike', 'contentReport', 'criticalError', 'explanationReport', 'ideaOrCommunityReport',
      'ownerDailyDigest', 'paymentWebhookFailure', 'premiumPurchase', 'refund', 'safetyFlag', 'supportEmail',
      'trialStart', 'userReport', 'websiteInbox',
    ]);
    for (const eventType of ADMIN_ALERT_IDS) {
      const route = routeAdminAlert({ eventType, occurredAtMs: NOW - 1_000, payload: { environment: 'PRODUCTION' } }, NOW);
      expect(route.kind).toBe(INSTANT_ADMIN_ALERT_TYPES.has(eventType) ? 'instant' : 'weekly');
    }
  });

  test('renewals, ordinary errors and new ideas are weekly, not instant', () => {
    for (const eventType of ['renewal', 'appErrorDigest', 'newIdea', 'newUser', 'cancellation'] as const) {
      expect(routeAdminAlert({ eventType, occurredAtMs: NOW, payload: {} }, NOW)).toEqual({ kind: 'weekly', reason: 'not_urgent' });
    }
  });

  test('test purchases are never sent', () => {
    for (const environment of ['SANDBOX', 'sandbox', 'TEST']) {
      expect(routeAdminAlert({ eventType: 'premiumPurchase', occurredAtMs: NOW, payload: { environment } }, NOW))
        .toEqual({ kind: 'drop', reason: 'test_purchase' });
    }
  });

  test('test accounts by nickname are never sent, case-insensitive', () => {
    expect(routeAdminAlert({ eventType: 'premiumPurchase', occurredAtMs: NOW, payload: { nickname: 'Owner Test' } }, NOW, { testNicknames: ['owner test'] }))
      .toEqual({ kind: 'drop', reason: 'test_account' });
    expect(routeAdminAlert({ eventType: 'premiumPurchase', occurredAtMs: NOW, payload: { nickname: 'Vertex56818' } }, NOW, { testNicknames: ['owner test'] }))
      .toEqual({ kind: 'instant' });
  });

  test('1.x versions and events older than an hour go only to the digest', () => {
    expect(routeAdminAlert({ eventType: 'criticalError', occurredAtMs: NOW, payload: { appVersion: '1.6.19' } }, NOW))
      .toEqual({ kind: 'weekly', reason: 'legacy_1x' });
    expect(routeAdminAlert({ eventType: 'criticalError', occurredAtMs: NOW - ADMIN_ALERT_STALE_MS - 1, payload: { appVersion: '2.0.0' } }, NOW))
      .toEqual({ kind: 'weekly', reason: 'stale' });
    expect(routeAdminAlert({ eventType: 'criticalError', occurredAtMs: NOW - ADMIN_ALERT_STALE_MS + 1, payload: { appVersion: '2.0.0' } }, NOW))
      .toEqual({ kind: 'instant' });
  });

  test('the weekly digest itself is always delivered', () => {
    expect(routeAdminAlert({ eventType: 'ownerDailyDigest', occurredAtMs: NOW - 7 * 86_400_000, payload: {} }, NOW)).toEqual({ kind: 'instant' });
  });

  test('legacy version detection does not treat 2.x, 10.x or empty as legacy', () => {
    expect(isLegacyAppVersion('1.6.24')).toBe(true);
    expect(isLegacyAppVersion('2.0.0')).toBe(false);
    expect(isLegacyAppVersion('10.1')).toBe(false);
    expect(isLegacyAppVersion('')).toBe(false);
    expect(isLegacyAppVersion(undefined)).toBe(false);
  });

  test('error group is by KIND within the hour, not by user', () => {
    const payload = { category: 'learning_v2', details: [{ label: 'Контекст', value: 'finish' }, { label: 'Ошибка', value: 'EpisodeFinishFailed' }] };
    const a = criticalErrorGroupKey({ payload: { ...payload, nickname: 'A' }, occurredAtMs: NOW });
    const b = criticalErrorGroupKey({ payload: { ...payload, nickname: 'B' }, occurredAtMs: NOW + 59_000 });
    expect(a).toBe(b);
    expect(a).toContain('learning_v2.finish.episodefinishfailed');
    expect(criticalErrorGroupKey({ payload, occurredAtMs: NOW + 3_600_000 })).not.toBe(a);
    expect(criticalErrorGroupKey({ payload: { ...payload, category: 'spire' }, occurredAtMs: NOW })).not.toBe(a);
  });
});
