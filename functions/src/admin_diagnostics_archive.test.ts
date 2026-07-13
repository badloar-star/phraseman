import { readFileSync } from 'fs';
import { join } from 'path';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  deriveDiagnosticsArchiveState,
  isDiagnosticsArchiveStatus,
  mergeDiagnosticsArchiveRows,
  parseDiagnosticsArchiveDetailRequest,
  parseDiagnosticsArchiveListRequest,
  projectDiagnosticsArchiveDetail,
  projectDiagnosticsArchiveListRow,
} from './admin_diagnostics_archive';

describe('native diagnostics archive contracts', () => {
  test('accepts only closed types, strict ids/cursors and bounded list inputs', () => {
    expect(parseDiagnosticsArchiveListRequest({ type: 'all', pageSize: 999 })).toMatchObject({ type: 'all', pageSize: 100, cursor: '' });
    expect(parseDiagnosticsArchiveListRequest({ type: 'user', pageSize: 1 })).toMatchObject({ type: 'user', pageSize: 1 });
    expect(() => parseDiagnosticsArchiveListRequest({ type: 'safety' })).toThrow(HttpsError);
    expect(() => parseDiagnosticsArchiveListRequest({ type: 'all', collection: 'users' })).toThrow(HttpsError);
    expect(() => parseDiagnosticsArchiveListRequest({ type: 'all', cursor: '../older' })).toThrow(HttpsError);
    expect(parseDiagnosticsArchiveDetailRequest({ type: 'error', id: 'report-1' })).toEqual({ type: 'error', id: 'report-1' });
    expect(() => parseDiagnosticsArchiveDetailRequest({ id: 'report-1' })).toThrow(HttpsError);
    expect(() => parseDiagnosticsArchiveDetailRequest({ type: 'all', id: 'report-1' })).toThrow(HttpsError);
    expect(() => parseDiagnosticsArchiveDetailRequest({ type: 'error', id: '../report' })).toThrow(HttpsError);
  });

  test('includes exactly the approved archived statuses for each source', () => {
    expect(isDiagnosticsArchiveStatus('user', 'archived')).toBe(true);
    expect(isDiagnosticsArchiveStatus('user', 'banned')).toBe(true);
    expect(isDiagnosticsArchiveStatus('user', 'reviewed')).toBe(false);
    expect(isDiagnosticsArchiveStatus('error', 'fixed')).toBe(true);
    expect(isDiagnosticsArchiveStatus('error', 'archived')).toBe(true);
    expect(isDiagnosticsArchiveStatus('error', 'answered')).toBe(false);
  });

  test('projects allowlisted list fields and gates full identity behind users.read', () => {
    const raw = {
      status: 'fixed', uid: 'private-uid', userName: 'Private Name', email: 'private@example.com',
      comment: 'A lesson card is wrong', category: 'translation', screen: 'lesson', createdAtMs: 300,
      appVersion: '2.4.0', platform: 'android', secret: 'drop', nested: { token: 'drop' },
    };
    const hidden = projectDiagnosticsArchiveListRow('error', 'r1', raw, false);
    expect(hidden).toMatchObject({ id: 'r1', type: 'error', status: 'fixed', comment: 'A lesson card is wrong', user: { maskedId: expect.any(String) } });
    const hiddenJson = JSON.stringify(hidden);
    for (const value of ['private-uid', 'Private Name', 'private@example.com', 'secret', 'token']) expect(hiddenJson).not.toContain(value);
    expect(projectDiagnosticsArchiveListRow('error', 'r1', raw, true)).toMatchObject({ user: { uid: 'private-uid', name: 'Private Name', email: 'private@example.com' } });
  });

  test('detail keeps meaningful learning/device/app fields but drops arbitrary nested data and clips text', () => {
    const detail = projectDiagnosticsArchiveDetail('error', 'r1', {
      status: 'archived', uid: 'u1', userName: 'Alice', comment: 'x'.repeat(5_000), category: 'lesson',
      screen: 'quiz', dataId: 'card-1', dataText: 'target phrase', userAnswer: 'answer', copyText: 'copy',
      userLevel: 12, userXP: 345, userStreak: 6, userPremium: true, userLanguage: 'en', userDaysInApp: 20,
      deviceModel: 'Pixel', deviceOS: 'Android', deviceOSVersion: '15', screenWidth: 1080, screenHeight: 2400, pixelRatio: 3,
      platform: 'android', appVersion: '2.4.0', buildNumber: '42', createdAtMs: 100, reviewedAt: '2026-01-01', reviewedBy: 'admin-1',
      serverSecret: 'drop', raw: { accessToken: 'drop' },
    }, true);
    expect(detail).toMatchObject({
      id: 'r1', type: 'error', status: 'archived', learning: { dataId: 'card-1', dataText: 'target phrase', userAnswer: 'answer', userLevel: 12, userXP: 345 },
      device: { model: 'Pixel', os: 'Android', osVersion: '15' }, app: { platform: 'android', version: '2.4.0', buildNumber: '42' },
      user: { uid: 'u1', name: 'Alice' },
    });
    expect(String(detail.comment).length).toBeLessThanOrEqual(2_000);
    expect(JSON.stringify(detail)).not.toContain('serverSecret');
    expect(JSON.stringify(detail)).not.toContain('accessToken');
  });

  test('merges sources in descending date order with truthful truncation and partial state', () => {
    const merged = mergeDiagnosticsArchiveRows([
      { source: 'user_reports', rows: [{ id: 'u1', createdAtMs: 200 }], scanned: 5, truncated: false, error: '' },
      { source: 'error_reports', rows: [{ id: 'e1', createdAtMs: 300 }, { id: 'e2', createdAtMs: 100 }], scanned: 7, truncated: true, error: '' },
    ], 2);
    expect(merged.items.map((row: { id?: unknown }) => row.id)).toEqual(['e1', 'u1']);
    expect(merged).toMatchObject({ truncated: true, state: 'truncated' });
    expect(merged.sourceHealth).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'user_reports', cap: 250, scanned: 5 }),
      expect.objectContaining({ source: 'error_reports', cap: 250, scanned: 7 }),
    ]));
    expect(deriveDiagnosticsArchiveState([
      { source: 'user_reports', state: 'ready', count: 1, scanned: 1, cap: 250, truncated: false, error: '' },
      { source: 'error_reports', state: 'error', count: 0, scanned: 0, cap: 250, truncated: false, error: 'unavailable' },
    ], 1, false)).toBe('partial');
    expect(deriveDiagnosticsArchiveState([{ source: 'error_reports', state: 'error', count: 0, scanned: 0, cap: 250, truncated: false, error: 'unavailable' }], 0, false)).toBe('error');
  });

  test('declares two protected read-only callables and uses one-field bounded source scans', () => {
    const source = readFileSync(join(__dirname, 'admin_diagnostics_archive.ts'), 'utf8');
    for (const callable of ['adminListDiagnosticsArchive', 'adminGetDiagnosticsArchiveDetail']) {
      expect(source).toMatch(new RegExp(`${callable}\\s*=\\s*onCall\\([\\s\\S]{0,500}?region:\\s*REGION[\\s\\S]{0,500}?enforceAppCheck:\\s*true`));
    }
    expect(source).toContain("'diagnostics.read'");
    expect(source).toContain("hasPermission(role, 'users.read')");
    expect(source).toMatch(/orderBy\('createdAtMs',\s*'desc'\)/);
    expect(source).not.toMatch(/\.where\s*\(/);
    expect(source).not.toMatch(/runTransaction|\b(?:tx|batch|documentRef|reportRef|ref)\.update\s*\(/);
  });
});
