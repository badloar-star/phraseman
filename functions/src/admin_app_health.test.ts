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
  listAppActivityRows,
  listAppHealthRows,
  parseAppActivityListRequest,
  parseAppHealthDetailRequest,
  parseAppHealthExportRequest,
  parseAppHealthListRequest,
  projectAppActivityRow,
  projectAppHealthRow,
  summarizeAppHealth,
} from './admin_app_health';

type FakeDiagnosticsRow = { id: string; createdAtMs: number } & Record<string, unknown>;

function fakeDiagnosticsDb(collectionRows: Record<string, FakeDiagnosticsRow[]>) {
  class Query {
    constructor(
      private readonly collectionName: string,
      private readonly cursorAtMs: number | null = null,
      private readonly cursorId = '',
      private readonly limitCount = Number.POSITIVE_INFINITY,
    ) {}

    orderBy() { return new Query(this.collectionName, this.cursorAtMs, this.cursorId, this.limitCount); }

    startAfter(cursor: number | { id?: string; data?: () => Record<string, unknown> }, documentRef?: { id?: string }) {
      if (typeof cursor === 'object') {
        return new Query(this.collectionName, Number(cursor.data?.().createdAtMs || 0), String(cursor.id || ''), this.limitCount);
      }
      return new Query(this.collectionName, cursor, String(documentRef?.id || ''), this.limitCount);
    }

    limit(count: number) { return new Query(this.collectionName, this.cursorAtMs, this.cursorId, count); }

    doc(id: string) {
      const row = (collectionRows[this.collectionName] || []).find((item) => item.id === id);
      return { id, get: async () => ({ id, exists: Boolean(row), data: () => row }) };
    }

    async get() {
      let rows = [...(collectionRows[this.collectionName] || [])]
        .sort((left, right) => right.createdAtMs - left.createdAtMs || right.id.localeCompare(left.id));
      if (this.cursorAtMs !== null) {
        rows = rows.filter((row) => row.createdAtMs < this.cursorAtMs!
          || (row.createdAtMs === this.cursorAtMs && Boolean(this.cursorId) && row.id < this.cursorId));
      }
      const limited = rows.slice(0, this.limitCount);
      return { size: limited.length, docs: limited.map((row) => ({ id: row.id, data: () => row })) };
    }
  }
  return { collection: (name: string) => new Query(name) } as never;
}

function diagnosticsPage(value: unknown): { items: Array<Record<string, unknown>>; nextCursor: string | null } {
  return value as { items: Array<Record<string, unknown>>; nextCursor: string | null };
}

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

  test('accepts and projects the legacy info severity without coercing it to warning', () => {
    expect(parseAppHealthListRequest({ severity: 'info' }).severity).toBe('info');
    expect(parseAppHealthExportRequest({ severity: 'info' }).severity).toBe('info');
    expect(projectAppHealthRow('info-1', {
      severity: 'info', status: 'new', feature: 'app', createdAtMs: 100,
    }, false, false)).toMatchObject({ id: 'info-1', severity: 'info' });
  });

  test('filters and groups info events without raising warning count or health status', async () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      id: `info-${index}`,
      severity: 'info',
      fingerprint: 'info-fingerprint',
      context: 'Expected lifecycle event',
      userKey: 'same-user',
      createdAtMs: 2_000_000_000_000 - index,
    }));
    expect(groupAppHealthRows(rows, 10)[0]).toMatchObject({
      severity: 'info',
      critical: 0,
      warnings: 0,
    });
    expect(summarizeAppHealth(rows, { truncated: false, partial: false })).toMatchObject({
      level: 'GREEN',
      kpis: { critical: 0, warnings: 0, affectedUsers: 1, topRepeat: 5 },
    });

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(2_000_000_000_000);
    try {
      const result = await listAppHealthRows(fakeDiagnosticsDb({
        app_errors: [
          { id: 'info-row', createdAtMs: 2_000_000_000_000 - 1_000, severity: 'info', status: 'new', feature: 'app' },
          { id: 'warning-row', createdAtMs: 2_000_000_000_000 - 2_000, severity: 'warning', status: 'new', feature: 'app' },
        ],
      }), parseAppHealthListRequest({ periodHours: 1, severity: 'info' }), false) as Record<string, any>;
      expect(result.items).toEqual([expect.objectContaining({ id: 'info-row', severity: 'info' })]);
      expect(result.groups).toEqual([expect.objectContaining({ severity: 'info', warnings: 0 })]);
      expect(result.health).toMatchObject({ level: 'GREEN', kpis: { warnings: 0 } });
    } finally {
      nowSpy.mockRestore();
    }
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
    expect(hidden.userAggregationKey).toBeUndefined();
    expect(full.userAggregationKey).toMatch(/^[a-f0-9]{24}$/);
    expect(JSON.stringify(full)).not.toContain('firebase-secret-uid');
  });

  test('keeps the opaque user aggregation key role-invariant and out of safe exports', () => {
    const raw = { authUid: 'auth-only-secret', severity: 'warning', status: 'new', createdAtMs: 100 };
    const hidden = projectAppHealthRow('auth-only', raw, false, false);
    const full = projectAppHealthRow('auth-only', raw, true, false);

    expect(hidden.userAggregationKey).toMatch(/^[a-f0-9]{24}$/);
    expect(full.userAggregationKey).toBe(hidden.userAggregationKey);
    expect(JSON.stringify(hidden)).not.toContain('auth-only-secret');
    expect(JSON.stringify(full)).not.toContain('auth-only-secret');

    const summary = summarizeAppHealth([{ severity: 'warning', fingerprint: 'auth-only', context: '', userKey: String(hidden.userAggregationKey) }], { truncated: false, partial: false });
    const exported = buildAppHealthExport([hidden], summary, 'json');
    expect(exported.content).not.toContain(String(hidden.userAggregationKey));
  });

  test('keeps affected-user list KPIs identical with and without users.read', async () => {
    const nowMs = 2_000_000_000_000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(nowMs);
    try {
      const db = fakeDiagnosticsDb({
        app_errors: [{
          id: 'auth-only-event', authUid: 'auth-only-secret', createdAtMs: nowMs - 1_000,
          severity: 'warning', status: 'new', fingerprint: 'auth-only',
        }],
      });
      const input = parseAppHealthListRequest({ periodHours: 1 });
      const hidden = await listAppHealthRows(db, input, false) as Record<string, any>;
      const full = await listAppHealthRows(db, input, true) as Record<string, any>;

      expect(hidden.kpis).toMatchObject({ warnings: 1, affectedUsers: 1, topRepeat: 1 });
      expect(full.kpis).toEqual(hidden.kpis);
      expect(full.items[0].userAggregationKey).toBe(hidden.items[0].userAggregationKey);
      expect(JSON.stringify(full)).not.toContain('auth-only-secret');
    } finally {
      nowSpy.mockRestore();
    }
  });

  test('redacts two-character and safe standalone one-character identities from every projected text surface', () => {
    const health = projectAppHealthRow('e-short', {
      uid: 'u-short', userName: 'Li', severity: 'warning', message: 'Li failed', stack: 'Li at player.ts',
      context: 'Account Li', feature: 'app', deviceName: 'Li phone', tags: { operation: 'Li' }, createdAtMs: 100,
    }, false, true);
    const activity = projectAppActivityRow('a-short', {
      uid: 'u-short', userName: 'Li', action: 'Li opened app', feature: 'app', screen: 'Li', result: 'info',
      appState: 'Li', tags: { operation: 'Li' }, createdAtMs: 100,
    }, false);
    for (const projected of [health, activity]) expect(JSON.stringify(projected)).not.toContain('Li');

    const oneCharacter = projectAppHealthRow('e-one', {
      uid: 'u-one', userName: 'A', severity: 'warning', message: 'A fatal App error', createdAtMs: 100,
    }, false, false);
    expect(oneCharacter.message).toBe('[REDACTED_USER] fatal App error');
  });

  test('paginates app errors and activity deterministically across equal createdAtMs values', async () => {
    const nowMs = 2_000_000_000_000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(nowMs);
    try {
      const equalAtMs = nowMs - 1_000;
      const db = fakeDiagnosticsDb({
        app_errors: ['e-3', 'e-2', 'e-1'].map((id) => ({ id, createdAtMs: equalAtMs, severity: 'warning', status: 'new', feature: 'app' })),
        app_activity: ['a-3', 'a-2', 'a-1'].map((id) => ({ id, createdAtMs: equalAtMs, action: 'app:test', feature: 'app', result: 'info' })),
      });
      const healthIds: unknown[] = [];
      let healthCursor = '';
      for (let pageIndex = 0; pageIndex < 3; pageIndex += 1) {
        const page = diagnosticsPage(await listAppHealthRows(db, parseAppHealthListRequest({ periodHours: 1, pageSize: 1, cursor: healthCursor }), false));
        healthIds.push(page.items[0]?.id);
        healthCursor = page.nextCursor || '';
      }
      expect(healthIds).toEqual(['e-3', 'e-2', 'e-1']);

      const activityIds: unknown[] = [];
      let activityCursor = '';
      for (let pageIndex = 0; pageIndex < 3; pageIndex += 1) {
        const page = diagnosticsPage(await listAppActivityRows(db, parseAppActivityListRequest({ periodHours: 1, pageSize: 1, cursor: activityCursor }), false));
        activityIds.push(page.items[0]?.id);
        activityCursor = page.nextCursor || '';
      }
      expect(activityIds).toEqual(['a-3', 'a-2', 'a-1']);
    } finally {
      nowSpy.mockRestore();
    }
  });

  test('aggregates only the events returned by each cursor page', async () => {
    const nowMs = 2_000_000_000_000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(nowMs);
    try {
      const db = fakeDiagnosticsDb({
        app_errors: [
          { id: 'repeat-new', createdAtMs: nowMs - 1_000, severity: 'warning', status: 'new', feature: 'audio', fingerprint: 'same-repeat', uid: 'user-a' },
          { id: 'repeat-old', createdAtMs: nowMs - 2_000, severity: 'warning', status: 'new', feature: 'audio', fingerprint: 'same-repeat', uid: 'user-b' },
        ],
      });
      const first = await listAppHealthRows(db, parseAppHealthListRequest({ periodHours: 1, pageSize: 1 }), false) as Record<string, any>;
      expect(first).toMatchObject({
        items: [expect.objectContaining({ id: 'repeat-new' })],
        groups: [expect.objectContaining({ key: 'same-repeat', count: 1, affectedUsers: 1 })],
        kpis: { warnings: 1, affectedUsers: 1, topRepeat: 1 },
      });
      expect(first.nextCursor).toBeTruthy();

      const second = await listAppHealthRows(db, parseAppHealthListRequest({ periodHours: 1, pageSize: 1, cursor: first.nextCursor }), false) as Record<string, any>;
      expect(second).toMatchObject({
        items: [expect.objectContaining({ id: 'repeat-old' })],
        groups: [expect.objectContaining({ key: 'same-repeat', count: 1, affectedUsers: 1 })],
        kpis: { warnings: 1, affectedUsers: 1, topRepeat: 1 },
      });
    } finally {
      nowSpy.mockRestore();
    }
  });

  test('searches the allowlisted projection while keeping identity gated by users.read', async () => {
    const nowMs = 2_000_000_000_000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(nowMs);
    try {
      const db = fakeDiagnosticsDb({
        app_errors: [{
          id: 'search-health', createdAtMs: nowMs - 1_000, severity: 'warning', status: 'new', feature: 'audio',
          uid: 'search-user-uid', userName: 'Search Person', platform: 'android', appVersion: '9.8.7', message: 'playback failed',
        }],
        app_activity: [{
          id: 'search-activity', createdAtMs: nowMs - 1_000, action: 'lesson:complete', result: 'blocked', feature: 'lessons',
          uid: 'activity-private-uid', userName: 'Activity Person', platform: 'ios', appVersion: '7.6.5',
        }],
      });
      const healthIds = async (query: string, canReadUsers: boolean) => diagnosticsPage(await listAppHealthRows(
        db, parseAppHealthListRequest({ periodHours: 1, query }), canReadUsers,
      )).items.map((row) => row.id);
      const activityIds = async (query: string, canReadUsers: boolean) => diagnosticsPage(await listAppActivityRows(
        db, parseAppActivityListRequest({ periodHours: 1, query }), canReadUsers,
      )).items.map((row) => row.id);

      expect(await healthIds('search-user-uid', true)).toEqual(['search-health']);
      expect(await healthIds('search person', true)).toEqual(['search-health']);
      expect(await healthIds('search-user-uid', false)).toEqual([]);
      expect(await healthIds('search person', false)).toEqual([]);
      expect(await healthIds('android', false)).toEqual(['search-health']);
      expect(await healthIds('9.8.7', false)).toEqual(['search-health']);
      expect(await activityIds('lesson:complete', false)).toEqual(['search-activity']);
      expect(await activityIds('blocked', false)).toEqual(['search-activity']);
      expect(await activityIds('ios', false)).toEqual(['search-activity']);
      expect(await activityIds('activity-private-uid', false)).toEqual([]);
    } finally {
      nowSpy.mockRestore();
    }
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
    expect(source).toContain('query = query.startAfter(cursorDoc)');
    expect(source).not.toMatch(/admin(?:Update|Set|Write)AppHealth\s*=\s*onCall/);
    expect(source).not.toMatch(/runTransaction|\b(?:tx|batch|documentRef|reportRef|ref)\.update\s*\(/);
  });
});
