import { HttpsError } from 'firebase-functions/v2/https';
import {
  canonicalReportLane,
  isAllowedReportTransition,
  matchesReportFilters,
  parseReportListRequest,
  parseReportExportRequest,
  parseReportStatusUpdateRequest,
  projectReportRow,
  serializeReportDocument,
  isReportUnresolved,
  reportExportInstructions,
  parseUnresolvedExportRequest,
  requireReportPermission,
} from './admin_reports_center';

describe('admin reports center contracts', () => {
  test('fails closed when the admin role claim is missing or invalid', () => {
    expect(() => requireReportPermission({ auth: { uid: 'admin-1', token: { admin: true } } }, 'reports.read')).toThrow(HttpsError);
    expect(() => requireReportPermission({ auth: { uid: 'admin-1', token: { admin: true, adminRole: 'unknown' } } }, 'reports.read')).toThrow(HttpsError);
    expect(() => requireReportPermission({ auth: { uid: 'admin-1', token: { admin: true, adminRole: 'support' } } }, 'reports.read')).not.toThrow();
  });

  test('accepts only closed report sources and bounded list inputs', () => {
    expect(parseReportListRequest({ source: 'error_reports', limit: 999, sinceDays: 30 })).toMatchObject({
      source: 'error_reports', limit: 100, sinceDays: 30,
    });
    expect(parseReportListRequest({ source: 'all' })).toMatchObject({ source: 'all', limit: 50, sinceDays: 7 });
    expect(() => parseReportListRequest({ source: 'arbitrary_collection' })).toThrow(HttpsError);
    expect(() => parseReportListRequest({ source: 'all', cursor: 'opaque' })).toThrow(HttpsError);
    expect(() => parseReportListRequest({ source: 'error_reports', cursor: 'b3BhcXVl', uid: 'user-1' })).toThrow(HttpsError);
    expect(() => parseReportListRequest({ source: 'error_reports', uid: '../escape' })).toThrow(HttpsError);
  });

  test('applies source-specific filters after selecting the recent bounded window', () => {
    const input = parseReportListRequest({ source: 'user_reports', uid: 'reporter-1', lane: 'open', category: 'spam' });
    expect(matchesReportFilters('user_reports', { reporterUid: 'reporter-1', status: 'new', category: 'spam' }, input)).toBe(true);
    expect(matchesReportFilters('user_reports', { reportedUid: 'reporter-1', status: 'reviewed' }, input)).toBe(false);
    expect(matchesReportFilters('user_reports', { reporterUid: 'other', status: 'new' }, input)).toBe(false);
    expect(matchesReportFilters('user_reports', { reporterUid: 'reporter-1', status: 'new', category: 'copyright' }, input)).toBe(false);
  });

  test('preserves raw status while mapping source-specific canonical lanes', () => {
    expect(canonicalReportLane('error_reports', 'new')).toBe('open');
    expect(canonicalReportLane('error_reports', 'answered')).toBe('answered');
    expect(canonicalReportLane('user_reports', 'banned')).toBe('escalated');
    expect(canonicalReportLane('app_errors', 'known')).toBe('known');
    for (const source of ['error_reports', 'user_reports', 'community_pack_reports', 'explain_report_entries'] as const) {
      expect(canonicalReportLane(source, 'answered')).toBe('answered');
    }
  });

  test('projects only bounded allowlisted report fields and both user links', () => {
    const row = projectReportRow('user_reports', 'r1', {
      status: 'new', reason: 'offensive nickname', reporterUid: 'u-reporter', reportedUid: 'u-target',
      reporterName: 'Alice', reportedName: 'Bob', createdAtMs: 100, secret: 'drop', nested: { token: 'drop' },
    });
    expect(row).toMatchObject({
      id: 'r1', source: 'user_reports', rawStatus: 'new', lane: 'open', summary: 'offensive nickname',
      users: { reporterUid: 'u-reporter', reportedUid: 'u-target' },
    });
    expect(JSON.stringify(row)).not.toContain('secret');
    expect(JSON.stringify(row)).not.toContain('token');
  });

  test('projects device and route context needed for a horizontal report card', () => {
    expect(projectReportRow('error_reports', 'r-device', {
      status: 'new', comment: 'broken button', uid: 'u1', screen: '/lesson/1',
      os: 'android', appVersion: '1.5.53', deviceModel: 'Pixel 8', context: 'after submit',
    })).toMatchObject({
      context: {
        screen: '/lesson/1',
        os: 'android',
        appVersion: '1.5.53',
        deviceModel: 'Pixel 8',
        details: 'after submit',
      },
    });
  });

  test('defines unresolved as every report not answered or archived', () => {
    expect(isReportUnresolved('new')).toBe(true);
    expect(isReportUnresolved('fixed')).toBe(true);
    expect(isReportUnresolved('answered')).toBe(false);
    expect(isReportUnresolved('archived')).toBe(false);
  });

  test('exports the legacy workflow guidance with the one-coin rule', () => {
    const instructions = reportExportInstructions();
    expect(instructions).toContain('каждый reportId');
    expect(instructions).toContain('не выполнять массовую живую отправку');
    expect(instructions).toContain('не более одной монеты');
    expect(instructions).not.toMatch(/осколк|shard/i);
  });

  test('parses bounded server-side pages for all unresolved reports', () => {
    expect(parseUnresolvedExportRequest({})).toEqual({ cursor: '', limit: 100 });
    expect(parseUnresolvedExportRequest({ limit: 999, cursor: 'opaque_1' })).toEqual({ cursor: 'opaque_1', limit: 100 });
    expect(() => parseUnresolvedExportRequest({ cursor: '../escape' })).toThrow(HttpsError);
  });

  test('projects reply archive metadata without exposing unrelated fields', () => {
    expect(projectReportRow('error_reports', 'archived-1', {
      status: 'archived', replyTitle: 'Спасибо', replyBody: 'Исправили', replyCoins: 1,
      repliedAtMs: 1234, repliedBy: 'admin@example.com', resolution: 'confirmed_fixed', secret: 'drop',
    })).toMatchObject({ archive: {
      title: 'Спасибо', body: 'Исправили', coins: 1, repliedAtMs: 1234,
      repliedBy: 'admin@example.com', resolution: 'confirmed_fixed',
    } });
  });

  test('accepts only an ordered bounded list of export references', () => {
    expect(parseReportExportRequest({ reports: [
      { source: 'error_reports', id: 'error-2' },
      { source: 'user_reports', id: 'user-1' },
    ] })).toEqual({ reports: [
      { source: 'error_reports', id: 'error-2' },
      { source: 'user_reports', id: 'user-1' },
    ] });
    expect(() => parseReportExportRequest({ reports: [] })).toThrow(HttpsError);
    expect(() => parseReportExportRequest({ reports: [{ source: 'unknown', id: 'report-1' }] })).toThrow(HttpsError);
    expect(() => parseReportExportRequest({ reports: [{ source: 'error_reports', id: '../escape' }] })).toThrow(HttpsError);
    expect(() => parseReportExportRequest({ reports: Array.from({ length: 101 }, (_, index) => ({ source: 'error_reports', id: `r-${index}` })) })).toThrow(HttpsError);
  });

  test('serializes the complete report document without truncating user text', () => {
    const longComment = 'длинный комментарий '.repeat(800);
    const serialized = serializeReportDocument({
      copyText: 'полный текст для разбора',
      comment: longComment,
      userLanguage: 'ru',
      nested: { userAnswer: 'answer', values: [1, true, null] },
    });
    expect(serialized).toEqual({
      copyText: 'полный текст для разбора',
      comment: longComment,
      userLanguage: 'ru',
      nested: { userAnswer: 'answer', values: [1, true, null] },
    });
  });

  test('preserves the community pack author link used by current report documents', () => {
    const row = projectReportRow('community_pack_reports', 'pack-report-1', {
      status: 'new', reason: 'copyright', reporterUid: 'reporter-1', authorStableId: 'author-1', packId: 'pack-1',
    });
    expect(row).toMatchObject({ users: { reporterUid: 'reporter-1', authorUid: 'author-1' }, context: { packId: 'pack-1' } });
  });

  test('allows only explicit non-destructive status transitions', () => {
    expect(isAllowedReportTransition('error_reports', 'new', 'fixed')).toBe(true);
    expect(isAllowedReportTransition('error_reports', 'new', 'answered')).toBe(false);
    expect(isAllowedReportTransition('user_reports', 'new', 'banned')).toBe(false);
    expect(isAllowedReportTransition('community_pack_reports', 'new', 'reviewed')).toBe(true);
    expect(isAllowedReportTransition('app_errors', 'known', 'fixed')).toBe(true);
  });

  test('requires optimistic concurrency, reason and idempotency for status writes', () => {
    expect(parseReportStatusUpdateRequest({
      source: 'error_reports', reportId: 'r1', expectedStatus: 'new', nextStatus: 'fixed',
      reason: 'Verified in release 2.4', idempotencyKey: 'report-op-1', requestId: 'request-1',
    })).toMatchObject({ source: 'error_reports', reportId: 'r1', expectedStatus: 'new', nextStatus: 'fixed' });
    expect(() => parseReportStatusUpdateRequest({
      source: 'error_reports', reportId: 'r1', expectedStatus: 'new', nextStatus: 'answered',
      reason: 'no', idempotencyKey: 'op', requestId: 'req',
    })).toThrow(HttpsError);
  });
});
