import {
  adminAuditAlertFromCreate,
  appMessageAlertFromWrite,
  complianceAlertFromWrite,
  jarvisAlertFromWrite,
  paymentWebhookAlertFromCreate,
  pushAlertFromWrite,
} from './admin_alert_sources_ops';

const NOW_MS = Date.UTC(2026, 8, 12, 23, 0);

describe('operational Telegram sources', () => {
  test('recognizes a redacted payment webhook failure', () => {
    expect(paymentWebhookAlertFromCreate('revenuecat_webhook_refund_1', {
      feature: 'payments', errorName: 'PaymentWebhookFailure', context: 'revenuecat_webhook_refund',
      severity: 'critical', message: 'private provider payload', createdAtMs: NOW_MS,
    }, NOW_MS)).toEqual({
      eventType: 'paymentWebhookFailure', source: 'payment.webhook_failure',
      sourceId: 'revenuecat_webhook_refund_1', occurredAtMs: NOW_MS,
      payload: { category: 'revenuecat webhook refund', severity: 'critical', environment: 'server', status: 'failed', route: '#app-health' },
    });
  });

  test('emits terminal push transition once', () => {
    expect(pushAlertFromWrite('job-1', { status: 'processing' }, { status: 'done', sentCount: 12, finishedAtMs: NOW_MS }, NOW_MS))
      .toMatchObject({ eventType: 'pushJob', payload: { status: 'done', count: 12 } });
    expect(pushAlertFromWrite('job-1', { status: 'done' }, { status: 'done' }, NOW_MS)).toBeNull();
  });

  test('emits publish, compliance and high-risk Jarvis transitions without narrative text', () => {
    expect(appMessageAlertFromWrite('message-1', { active: false }, { active: true, publishedAtMs: NOW_MS }, NOW_MS))
      .toMatchObject({ eventType: 'appMessagePublished', payload: { status: 'published' } });
    expect(complianceAlertFromWrite('backup-restore', { status: 'fresh' }, { status: 'blocked', updatedAt: new Date(NOW_MS).toISOString() }, NOW_MS))
      .toMatchObject({ eventType: 'complianceRisk', payload: { status: 'blocked' } });
    const jarvis = jarvisAlertFromWrite('plan-1', null, {
      status: 'open', department: 'payments', contentHash: 'new', options: [{ risk: 'high' }],
      finding: 'private long finding', updatedAtMs: NOW_MS,
    }, NOW_MS);
    expect(jarvis).toMatchObject({ eventType: 'jarvisCritical', payload: { category: 'payments', severity: 'critical' } });
    expect(JSON.stringify(jarvis)).not.toContain('private long finding');
  });

  test('maps admin audit by bounded action only', () => {
    const alert = adminAuditAlertFromCreate('audit-1', { action: 'app_message.create', details: { email: 'secret@example.com' }, timestamp: new Date(NOW_MS).toISOString() }, NOW_MS);
    expect(alert).toMatchObject({ eventType: 'adminAudit', payload: { category: 'app message.create' } });
    expect(JSON.stringify(alert)).not.toContain('secret@example.com');
  });
});
