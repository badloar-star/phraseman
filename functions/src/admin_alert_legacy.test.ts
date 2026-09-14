import { legacyAdminAlertEvent } from './admin_alert_legacy';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('legacy admin alerts migrate to the safe owner outbox', () => {
  test('maps a user report without reporter identity or free text', () => {
    const event = legacyAdminAlertEvent({
      legacyType: 'userReport',
      sourceId: 'report-1',
      occurredAtMs: 1_725_000_000_000,
      data: {
        reportedUid: 'reported-user-A1B2',
        reporterUid: 'reporter-user-C3D4',
        category: 'harassment',
        reason: 'private free-form details',
      },
    });

    expect(event).toEqual({
      eventType: 'userReport',
      source: 'legacy.user_report',
      sourceId: 'report-1',
      occurredAtMs: 1_725_000_000_000,
      payload: { category: 'harassment', uidLast4: 'A1B2', route: '#user-reports' },
    });
    expect(JSON.stringify(event)).not.toContain('reporter-user-C3D4');
    expect(JSON.stringify(event)).not.toContain('private free-form details');
  });

  test('maps critical errors with public nickname and app version but without diagnostics', () => {
    const event = legacyAdminAlertEvent({
      legacyType: 'criticalError',
      sourceId: 'error-1',
      occurredAtMs: 1_725_000_000_000,
      data: {
        feature: 'auth',
        severity: 'critical',
        platform: 'ios',
        userName: 'Alex12300',
        appVersion: '1.6.15',
        message: 'email leak@example.com',
        context: 'uid-secret',
        stack: 'private stack',
      },
    });

    expect(event.payload).toEqual({
      category: 'auth', severity: 'critical', platform: 'ios',
      nickname: 'Alex12300', appVersion: '1.6.15', route: '#app-health',
    });
    expect(JSON.stringify(event)).not.toMatch(/leak@example.com|uid-secret|private stack/);
  });

  test('maps old grouped types to the selected owner toggle', () => {
    expect(legacyAdminAlertEvent({
      legacyType: 'contentReportDigest', sourceId: 'digest-hour-1', occurredAtMs: 1,
      data: { count: 8 },
    })).toMatchObject({ eventType: 'contentReport', payload: { count: 8, route: '#reports' } });
    expect(legacyAdminAlertEvent({
      legacyType: 'serialRefunder', sourceId: 'buyer-hash-1', occurredAtMs: 1,
      data: { count: 3 },
    })).toMatchObject({ eventType: 'refundSpike', payload: { count: 3, route: '#refunds' } });
    expect(legacyAdminAlertEvent({
      legacyType: 'explanationRetired', sourceId: 'phrase-1', occurredAtMs: 1,
      data: { category: 'retired' },
    })).toMatchObject({ eventType: 'explanationReport', payload: { category: 'retired', route: '#explain-reports' } });
  });

  test('rejects unknown legacy types', () => {
    expect(() => legacyAdminAlertEvent({
      legacyType: 'arbitraryDump', sourceId: '1', occurredAtMs: 1, data: {},
    })).toThrow('unknown_legacy_admin_alert_type');
  });

  test('keeps direct Telegram delivery only for the explicit admin test ping', () => {
    const source = readFileSync(join(__dirname, 'admin_alerts.ts'), 'utf8');
    const directSendOccurrences = source.match(/sendTelegramAlert\(/g) ?? [];
    expect(directSendOccurrences).toHaveLength(2);
    expect(source).toContain('enqueueAdminAlert(');
  });

  test('migrates idea and explanation alerts while retaining the content-free MAX exception', () => {
    const ideaSource = readFileSync(join(__dirname, 'user_idea_reports.ts'), 'utf8');
    const explanationSource = readFileSync(join(__dirname, 'explain', 'explain_reports.ts'), 'utf8');
    const safetySource = readFileSync(join(__dirname, 'ai_safety.ts'), 'utf8');

    expect(ideaSource).not.toContain('sendTelegramAlert(');
    expect(ideaSource).toContain('enqueueAdminAlert(');
    expect(explanationSource).not.toContain('sendTelegramAlert(');
    expect(explanationSource).toContain('enqueueAdminAlert(');
    expect(safetySource.match(/sendTelegramAlert\(/g) ?? []).toHaveLength(1);
    expect(safetySource).toContain('enqueueAdminAlert(');
  });
});
