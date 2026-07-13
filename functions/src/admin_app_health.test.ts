import { readFileSync } from 'fs';
import { join } from 'path';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  APP_HEALTH_STATUS_TARGETS,
  buildAppHealthExport,
  buildAppDiagnosticsSourceHealth,
  decodeAppHealthCursor,
  encodeAppHealthCursor,
  groupAppHealthRows,
  parseAppActivityListRequest,
  parseAppHealthDetailRequest,
  parseAppHealthExportRequest,
  parseAppHealthListRequest,
  projectAppActivityRow,
  projectAppHealthRow,
  summarizeAppHealth,
} from './admin_app_health';

describe('native diagnostics app health contracts', () => {
  test('accepts only closed periods, severities, statuses, formats and bounded inputs', () => {
    expect(parseAppHealthListRequest({ periodHours: 6, severity: 'critical', status: 'known', feature: 'audio', pageSize: 999 }))
      .toMatchObject({ periodHours: 6, severity: 'critical', status: 'known', feature: 'audio', pageSize: 100 });
    for (const periodHours of [1, 6, 24, 168]) {
      expect(parseAppHealthListRequest({ periodHours }).periodHours).toBe(periodHours);
    }
    expect(() => parseAppHealthListRequest({ periodHours: 2 })).toThrow(HttpsError);
    expect(() => parseAppHealthListRequest({ severity: 'fatal' })).toThrow(HttpsError);
    expect(() => parseAppHealthListRequest({ status: 'deleted' })).toThrow(HttpsError);
    expect(() => parseAppHealthListRequest({ feature: '../secrets' })).toThrow(HttpsError);
    expect(() => parseAppHealthListRequest({ rawCollection: 'users' })).toThrow(HttpsError);
    expect(parseAppHealthDetailRequest({ id: 'error_123' })).toEqual({ id: 'error_123' });
    expect(() => parseAppHealthDetailRequest({ id: '../error' })).toThrow(HttpsError);
    expect(parseAppHealthExportRequest({ format: 'ai', periodHours: 168 })).toMatchObject({ format: 'ai', periodHours: 168 });
    expect(() => parseAppHealthExportRequest({ format: 'csv' })).toThrow(HttpsError);
    expect(APP_HEALTH_STATUS_TARGETS).toEqual(['reviewed', 'fixed', 'known']);
  });

  test('uses a filter-bound older-page cursor and rejects tampering or reuse with other filters', () => {
    const input = parseAppHealthListRequest({ periodHours: 24, severity: 'warning', feature: 'audio', query: 'timeout' });
    const cursor = encodeAppHealthCursor({ id: 'e2', createdAtMs: 200 }, input);
    expect(decodeAppHealthCursor(cursor, input)).toEqual({ id: 'e2', createdAtMs: 200 });
    expect(() => decodeAppHealthCursor(cursor, parseAppHealthListRequest({ periodHours: 6, severity: 'warning', feature: 'audio', query: 'timeout' }))).toThrow(HttpsError);
    expect(() => decodeAppHealthCursor(`${cursor}x`, input)).toThrow(HttpsError);
  });

  test('sanitizes list/detail identity without users.read and never exposes raw nested blobs or secrets', () => {
    const raw = {
      uid: 'stable-secret-uid', authUid: 'firebase-secret-uid', userName: 'Alice Secret', email: 'alice@example.com',
      severity: 'critical', status: 'new', feature: 'audio', context: 'playback', errorName: 'NetworkError',
      message: 'alice@example.com failed for stable-secret-uid token=top-secret',
      stack: 'Bearer sk-live-secret\n at player.ts:10', fingerprint: 'fp-audio', createdAtMs: 123,
      platform: 'android', appVersion: '2.4.0', buildNumber: '42', osVersion: '15', deviceName: 'Pixel',
      tags: { operation: 'load', accessToken: 'nested-secret', nested: { token: 'drop' } },
      secret: 'drop-me', arbitrary: { refreshToken: 'drop-me-too' },
    };
    const hidden = projectAppHealthRow('e1', raw, false, true);
    const hiddenJson = JSON.stringify(hidden);
    expect(hidden).toMatchObject({ id: 'e1', severity: 'critical', feature: 'audio', user: { maskedId: expect.stringMatching(/^user_[a-f0-9]{12}$/) } });
    for (const forbidden of ['stable-secret-uid', 'firebase-secret-uid', 'Alice Secret', 'alice@example.com', 'top-secret', 'sk-live-secret', 'nested-secret', 'refreshToken']) {
      expect(hiddenJson).not.toContain(forbidden);
    }
    expect(hiddenJson).not.toContain('arbitrary');

    const full = projectAppHealthRow('e1', raw, true, false);
    expect(full).toMatchObject({ user: { uid: 'stable-secret-uid', name: 'Alice Secret', email: 'alice@example.com' } });
    expect(JSON.stringify(full)).not.toContain('firebase-secret-uid');
  });

  test('groups by fingerprint with context fallback and computes the required health thresholds', () => {
    const rows = [
      { id: '1', severity: 'warning', fingerprint: 'fp-1', context: 'Audio load', userKey: 'u1' },
      { id: '2', severity: 'warning', fingerprint: 'fp-1', context: 'Audio load', userKey: 'u2' },
      { id: '3', severity: 'warning', fingerprint: '', context: 'Login retry', userKey: 'u3' },
      { id: '4', severity: 'warning', fingerprint: '', context: 'Login retry', userKey: 'u3' },
    ];
    expect(groupAppHealthRows(rows, 10)).toMatchObject([
      { key: 'fp-1', count: 2 },
      { key: 'context:login retry', count: 2 },
    ]);
    expect(summarizeAppHealth([{ severity: 'critical', fingerprint: 'c', context: '', userKey: 'u1' }], { truncated: false, partial: false }))
      .toMatchObject({ level: 'RED', conclusive: true, partial: false, kpis: { critical: 1, warnings: 0, affectedUsers: 1, topRepeat: 1 } });
    expect(summarizeAppHealth(Array.from({ length: 5 }, (_, index) => ({ severity: 'warning', fingerprint: `w${index}`, context: '', userKey: 'u1' })), { truncated: false, partial: false }).level).toBe('YELLOW');
    expect(summarizeAppHealth([
      { severity: 'warning', fingerprint: 'w', context: '', userKey: 'u1' },
      { severity: 'warning', fingerprint: 'w', context: '', userKey: 'u2' },
      { severity: 'warning', fingerprint: 'w', context: '', userKey: 'u3' },
    ], { truncated: false, partial: false }).level).toBe('YELLOW');
    expect(summarizeAppHealth(Array.from({ length: 10 }, (_, index) => ({ severity: 'warning', fingerprint: 'w', context: '', userKey: `u${index}` })), { truncated: false, partial: false }).level).toBe('RED');
    expect(summarizeAppHealth([{ severity: 'warning', fingerprint: 'w', context: '', userKey: 'u1' }], { truncated: true, partial: false }))
      .toMatchObject({ level: 'GREEN', conclusive: false, partial: true, reason: 'sample_incomplete' });
  });

  test('group summaries retain one safe representative for lazy detail and status actions', () => {
    expect(groupAppHealthRows([
      {
        id: 'e-latest', severity: 'warning', fingerprint: 'fp-audio', context: 'Audio load', userKey: 'u1',
        feature: 'audio', status: 'new', message: 'Latest sample', createdAtMs: 300,
      },
      {
        id: 'e-older', severity: 'critical', fingerprint: 'fp-audio', context: 'Audio load', userKey: 'u2',
        feature: 'audio', status: 'new', message: 'Older sample', createdAtMs: 200,
      },
    ], 10)[0]).toMatchObject({
      id: 'e-latest', reportId: 'e-latest', key: 'fp-audio', fingerprint: 'fp-audio', context: 'Audio load',
      feature: 'audio', status: 'new', severity: 'critical', message: 'Latest sample', count: 2, repeatCount: 2,
      affectedUsers: 2, lastSeenAtMs: 300,
    });
    expect(groupAppHealthRows(Array.from({ length: 60 }, (_, index) => ({
      id: `e-${index}`, severity: 'warning', fingerprint: `fp-${index}`, context: '', userKey: `u-${index}`,
    })), 100)).toHaveLength(60);
  });

  test('builds JSON and AI exports only from an explicit sanitized projection', () => {
    const safeItem = {
      ...projectAppHealthRow('e1', { uid: 'private-uid', userName: 'Private Name', severity: 'warning', message: 'safe message', fingerprint: 'fp', createdAtMs: 100 }, false, false),
      injectedSecret: 'must-not-export',
    };
    const meta = summarizeAppHealth([{ severity: 'warning', fingerprint: 'fp', context: '', userKey: 'private-uid' }], { truncated: false, partial: false });
    const jsonExport = buildAppHealthExport([safeItem], meta, 'json');
    expect(jsonExport).toMatchObject({ format: 'json', mimeType: 'application/json', truncated: false });
    expect(jsonExport.content).not.toContain('private-uid');
    expect(jsonExport.content).not.toContain('Private Name');
    expect(jsonExport.content).not.toContain('must-not-export');
    const aiExport = buildAppHealthExport([safeItem], meta, 'ai');
    expect(aiExport).toMatchObject({ format: 'ai', mimeType: 'text/plain' });
    expect(aiExport.content).toContain('APP HEALTH SAFE EXPORT');
    expect(aiExport.content.length).toBeLessThanOrEqual(100_000);
  });

  test('keeps activity lazy, bounded, allowlisted and identity-gated', () => {
    expect(parseAppActivityListRequest({ periodHours: 1, result: 'error', feature: 'lessons', pageSize: 500 }))
      .toMatchObject({ periodHours: 1, result: 'error', feature: 'lessons', pageSize: 100 });
    expect(() => parseAppActivityListRequest({ result: 'fatal' })).toThrow(HttpsError);
    const row = projectAppActivityRow('a1', {
      uid: 'activity-user', userName: 'Activity Name', action: 'lesson:start', feature: 'lessons', screen: 'lesson',
      result: 'start', createdAtMs: 200, tags: { operation: 'open', password: 'drop' }, rawPayload: { token: 'drop' },
    }, false);
    const serialized = JSON.stringify(row);
    expect(row).toMatchObject({ id: 'a1', action: 'lesson:start', result: 'start', user: { maskedId: expect.any(String) } });
    expect(serialized).not.toContain('activity-user');
    expect(serialized).not.toContain('Activity Name');
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('rawPayload');
  });

  test('reports the actual bounded scan cap instead of a global theoretical maximum', () => {
    expect(buildAppDiagnosticsSourceHealth('app_errors', {
      state: 'ready', count: 2, scanned: 3, cap: 51, truncated: false, partial: false, error: '',
    })).toEqual({ source: 'app_errors', state: 'ready', count: 2, scanned: 3, cap: 51, truncated: false, partial: false, error: '' });
  });

  test('declares four read-only protected callables with the required runtime policy', () => {
    const source = readFileSync(join(__dirname, 'admin_app_health.ts'), 'utf8');
    for (const callable of ['adminListAppHealth', 'adminListAppActivity', 'adminGetAppHealthDetail', 'adminExportAppHealth']) {
      expect(source).toMatch(new RegExp(`${callable}\\s*=\\s*onCall\\([\\s\\S]{0,500}?region:\\s*REGION[\\s\\S]{0,500}?enforceAppCheck:\\s*true`));
    }
    expect(source).toContain("'diagnostics.read'");
    expect(source).toContain("hasPermission(role, 'users.read')");
    expect(source).not.toMatch(/admin(?:Update|Set|Write)AppHealth\s*=\s*onCall/);
    expect(source).not.toMatch(/runTransaction|\b(?:tx|batch|documentRef|reportRef|ref)\.update\s*\(/);
  });
});
