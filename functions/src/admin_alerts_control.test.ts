import { applyAlertsPatch, maskAlertsChatId, normalizeAlertsConfig, parseAlertsPatch, projectAlertsHistory, protectedAlertsChanges } from './admin_alerts_control';

describe('admin alerts control', () => {
  test('normalizes legacy config and preserves operational fields outside the editable projection', () => {
    const config = normalizeAlertsConfig({ enabled: true, chatId: 123, types: { criticalError: false }, spikePerHour: 7, configRevision: 2, pendingContentReports: 9 });
    expect(config).toMatchObject({ configRevision: 2, editable: { enabled: true, chatId: '123', spikePerHour: 7 } });
    expect(config.editable.types).toMatchObject({ criticalError: false, safetyFlag: true });
    expect(config.operational).toMatchObject({ pendingContentReports: 9 });
  });

  test('rejects unknown keys and invalid thresholds', () => {
    expect(() => parseAlertsPatch({ enabled: true, token: 'secret' })).toThrow('unknown_alerts_patch_key');
    expect(() => parseAlertsPatch({ spikePerHour: 0 })).toThrow('invalid_spike_per_hour');
  });

  test('applies only editable fields and identifies high-risk changes', () => {
    const current = { enabled: true, chatId: '100', types: { criticalError: true, safetyFlag: true }, spikePerHour: 5, pendingContentReports: 4 };
    const patch = parseAlertsPatch({ enabled: false, chatId: '200', types: { criticalError: false } });
    const next = applyAlertsPatch(current, patch);
    expect(next).toMatchObject({ enabled: false, chatId: '200', pendingContentReports: 4 });
    expect(protectedAlertsChanges(normalizeAlertsConfig(current).editable, normalizeAlertsConfig(next).editable)).toEqual(expect.arrayContaining(['master_disabled', 'destination_changed', 'critical_errors_disabled']));
  });

  test('masks Telegram destinations in projections', () => {
    expect(maskAlertsChatId('-1001234567890')).toBe('-10…890');
    expect(maskAlertsChatId('123')).toBe('1…3');
    expect(maskAlertsChatId('')).toBe('');
    expect(projectAlertsHistory({ before: { chatId: '-1001234567890' }, after: { chatId: '123456789' } })).toMatchObject({
      before: { chatId: '-10…890' }, after: { chatId: '123…789' },
    });
  });
});
