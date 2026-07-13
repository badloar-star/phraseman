import { readFileSync } from 'fs';
import { join } from 'path';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  deriveDiagnosticsArchiveState,
  isDiagnosticsArchiveStatus,
  listDiagnosticsArchiveRows,
  mergeDiagnosticsArchiveRows,
  parseDiagnosticsArchiveDetailRequest,
  parseDiagnosticsArchiveListRequest,
  projectDiagnosticsArchiveDetail,
  projectDiagnosticsArchiveListRow,
} from './admin_diagnostics_archive';

type FakeArchiveRow = { id: string; createdAtMs?: number; createdAt?: string; status: string } & Record<string, unknown>;

function fakeArchiveDb(
  collectionRows: Record<string, FakeArchiveRow[]>,
  failReads: Partial<Record<string, number>> = {},
) {
  const normalizedRows = Object.fromEntries(Object.entries(collectionRows).map(([name, rows]) => [
    name,
    rows.map((row) => row.createdAt === undefined && row.createdAtMs !== undefined
      ? { ...row, createdAt: new Date(row.createdAtMs).toISOString() }
      : row),
  ]));
  const atMs = (row: Record<string, unknown>, field: string): number => {
    const value = row[field];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Date.parse(value) || 0;
    return 0;
  };
  const remainingFailures = { ...failReads };
  class Query {
    constructor(
      private readonly collectionName: string,
      private readonly orderField = 'createdAtMs',
      private readonly cursorAtMs: number | null = null,
      private readonly cursorId = '',
      private readonly limitCount = Number.POSITIVE_INFINITY,
    ) {}

    orderBy(field: string) { return new Query(this.collectionName, field, this.cursorAtMs, this.cursorId, this.limitCount); }

    startAfter(cursor: number | { id?: string; data?: () => Record<string, unknown> }, documentRef?: { id?: string }) {
      if (typeof cursor === 'object') {
        return new Query(this.collectionName, this.orderField, atMs(cursor.data?.() || {}, this.orderField), String(cursor.id || ''), this.limitCount);
      }
      return new Query(this.collectionName, this.orderField, cursor, String(documentRef?.id || ''), this.limitCount);
    }

    limit(count: number) { return new Query(this.collectionName, this.orderField, this.cursorAtMs, this.cursorId, count); }

    doc(id: string) {
      const row = (normalizedRows[this.collectionName] || []).find((item) => item.id === id);
      return { id, get: async () => ({ id, exists: Boolean(row), data: () => row }) };
    }

    async get() {
      if (Number(remainingFailures[this.collectionName] || 0) > 0) {
        remainingFailures[this.collectionName] = Number(remainingFailures[this.collectionName]) - 1;
        throw new Error(`${this.collectionName}_temporarily_unavailable`);
      }
      let rows = [...(normalizedRows[this.collectionName] || [])]
        .filter((row) => row[this.orderField] !== undefined)
        .sort((left, right) => atMs(right, this.orderField) - atMs(left, this.orderField) || right.id.localeCompare(left.id));
      if (this.cursorAtMs !== null) {
        rows = rows.filter((row) => atMs(row, this.orderField) < this.cursorAtMs!
          || (atMs(row, this.orderField) === this.cursorAtMs && Boolean(this.cursorId) && row.id < this.cursorId));
      }
      const limited = rows.slice(0, this.limitCount);
      return { size: limited.length, docs: limited.map((row) => ({ id: row.id, data: () => row })) };
    }
  }
  return { collection: (name: string) => new Query(name) } as never;
}

function archivePage(value: unknown): { items: Array<Record<string, unknown>>; nextCursor: string | null } {
  return value as { items: Array<Record<string, unknown>>; nextCursor: string | null };
}

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

  test('redacts a two-character identity from archive comment, learning and device fields', () => {
    const detail = projectDiagnosticsArchiveDetail('error', 'r-short', {
      status: 'fixed', uid: 'u-short', userName: 'Li', comment: 'Li reported this', dataText: 'Lesson for Li',
      userAnswer: 'Li', copyText: 'Li copy', deviceModel: 'Li phone', deviceOS: 'Li OS', appVersion: 'Li', createdAtMs: 100,
    }, false);
    expect(JSON.stringify(detail)).not.toContain('Li');
  });

  test('uses independent source positions so a recovered archive source cannot lose newer rows', async () => {
    const db = fakeArchiveDb({
      user_reports: [
        { id: 'u-300', createdAtMs: 300, status: 'archived' },
        { id: 'u-200', createdAtMs: 200, status: 'banned' },
      ],
      error_reports: [
        { id: 'e-500', createdAtMs: 500, status: 'fixed' },
        { id: 'e-400', createdAtMs: 400, status: 'archived' },
      ],
    }, { error_reports: 1 });
    const first = archivePage(await listDiagnosticsArchiveRows(db, parseDiagnosticsArchiveListRequest({ type: 'all', pageSize: 1 }), false));
    expect(first.items.map((row) => row.id)).toEqual(['u-300']);
    expect(first.nextCursor).toBeTruthy();

    const recovered = archivePage(await listDiagnosticsArchiveRows(db, parseDiagnosticsArchiveListRequest({ type: 'all', pageSize: 1, cursor: first.nextCursor }), false));
    expect(recovered.items.map((row) => row.id)).toEqual(['e-500']);
  });

  test('does not advance either archive source past matching rows excluded from the merged page', async () => {
    const db = fakeArchiveDb({
      user_reports: [
        { id: 'u-450', createdAtMs: 450, status: 'archived' },
        { id: 'u-350', createdAtMs: 350, status: 'banned' },
      ],
      error_reports: [
        { id: 'e-500', createdAtMs: 500, status: 'fixed' },
        { id: 'e-400', createdAtMs: 400, status: 'archived' },
      ],
    });
    const ids: unknown[] = [];
    let cursor = '';
    for (let pageIndex = 0; pageIndex < 4; pageIndex += 1) {
      const page = archivePage(await listDiagnosticsArchiveRows(db, parseDiagnosticsArchiveListRequest({ type: 'all', pageSize: 1, cursor }), false));
      ids.push(page.items[0]?.id);
      cursor = page.nextCursor || '';
    }
    expect(ids).toEqual(['e-500', 'u-450', 'e-400', 'u-350']);
  });

  test('paginates archive rows with equal createdAtMs without skipping document ids', async () => {
    const db = fakeArchiveDb({
      error_reports: ['e-3', 'e-2', 'e-1'].map((id) => ({ id, createdAtMs: 100, status: 'fixed' })),
    });
    const ids: unknown[] = [];
    let cursor = '';
    for (let pageIndex = 0; pageIndex < 3; pageIndex += 1) {
      const page = archivePage(await listDiagnosticsArchiveRows(db, parseDiagnosticsArchiveListRequest({ type: 'error', pageSize: 1, cursor }), false));
      ids.push(page.items[0]?.id);
      cursor = page.nextCursor || '';
    }
    expect(ids).toEqual(['e-3', 'e-2', 'e-1']);
  });

  test('lists legacy archived rows that only have the canonical ISO createdAt field', async () => {
    const createdAt = '2026-05-01T12:34:56.000Z';
    const result = await listDiagnosticsArchiveRows(fakeArchiveDb({
      user_reports: [{ id: 'legacy-user-report', createdAt, status: 'archived' }],
    }), parseDiagnosticsArchiveListRequest({ type: 'user', pageSize: 10 }), false) as Record<string, any>;

    expect(result.items).toEqual([expect.objectContaining({
      id: 'legacy-user-report',
      createdAt,
      createdAtMs: Date.parse(createdAt),
    })]);
    expect(result.sourceHealth).toEqual([expect.objectContaining({ source: 'user_reports', state: 'ready', count: 1 })]);
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

  test('declares two protected read-only callables and uses snapshot cursors with the implicit document-id tiebreak', () => {
    const source = readFileSync(join(__dirname, 'admin_diagnostics_archive.ts'), 'utf8');
    for (const callable of ['adminListDiagnosticsArchive', 'adminGetDiagnosticsArchiveDetail']) {
      expect(source).toMatch(new RegExp(`${callable}\\s*=\\s*onCall\\([\\s\\S]{0,500}?region:\\s*REGION[\\s\\S]{0,500}?enforceAppCheck:\\s*true`));
    }
    expect(source).toContain("'diagnostics.read'");
    expect(source).toContain("hasPermission(role, 'users.read')");
    expect(source).toMatch(/orderBy\('createdAt',\s*'desc'\)/);
    expect(source).toContain('query = query.startAfter(cursorDoc)');
    expect(source).not.toMatch(/\.where\s*\(/);
    expect(source).not.toMatch(/runTransaction|\b(?:tx|batch|documentRef|reportRef|ref)\.update\s*\(/);
  });
});
