import { HttpsError } from 'firebase-functions/v2/https';
import {
  assertReportOperationReplay,
  assertReportStatusCas,
  buildAppErrorStatusConfirmation,
  buildReportStatusAuditRecord,
  buildReportStatusOperationRecord,
  buildReportStatusRequestFingerprint,
  buildReportStatusWritePatch,
  canonicalReportLane,
  isAllowedReportTransition,
  matchesReportFilters,
  parseReportListRequest,
  parseReportStatusUpdateRequest,
  projectReportRow,
} from './admin_reports_center';

describe('admin reports center contracts', () => {
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
    expect(() => parseReportStatusUpdateRequest({
      source: 'user_reports', reportId: 'r1', expectedStatus: 'new', nextStatus: 'reviewed',
      reason: 'Handled', idempotencyKey: 'op-user-report', requestId: 'req-user-report',
    })).toThrow('safety_moderation_required');
  });

  test('requires exact deterministic confirmation for app_errors without changing other sources', () => {
    const confirmation = buildAppErrorStatusConfirmation('app-error-1', 'new', 'fixed');
    expect(confirmation).toBe('CONFIRM app_errors/app-error-1 new->fixed');
    expect(parseReportStatusUpdateRequest({
      source: 'app_errors', reportId: 'app-error-1', expectedStatus: 'new', nextStatus: 'fixed',
      reason: 'Verified in Android 2.4.0', idempotencyKey: 'app-error-op-1', requestId: 'request-app-error-1', confirmation,
    })).toMatchObject({ source: 'app_errors', confirmation });
    for (const invalidConfirmation of ['', `${confirmation} `, 'CONFIRM app_errors/app-error-1 new->known']) {
      expect(() => parseReportStatusUpdateRequest({
        source: 'app_errors', reportId: 'app-error-1', expectedStatus: 'new', nextStatus: 'fixed',
        reason: 'Verified in Android 2.4.0', idempotencyKey: 'app-error-op-1', requestId: 'request-app-error-1', confirmation: invalidConfirmation,
      })).toThrow(HttpsError);
    }
    expect(() => parseReportStatusUpdateRequest({
      source: 'error_reports', reportId: 'r1', expectedStatus: 'fixed', nextStatus: 'open', reason: 'Reopened after regression',
      idempotencyKey: 'report-op-reopen', requestId: 'request-reopen',
    })).not.toThrow();
  });

  test('preserves fixed-to-open app error reopening with CAS-relevant confirmation', () => {
    const confirmation = buildAppErrorStatusConfirmation('app-error-2', 'fixed', 'open');
    expect(isAllowedReportTransition('app_errors', 'fixed', 'open')).toBe(true);
    expect(parseReportStatusUpdateRequest({
      source: 'app_errors', reportId: 'app-error-2', expectedStatus: 'fixed', nextStatus: 'open',
      reason: 'Regression reproduced', idempotencyKey: 'app-error-reopen-1', requestId: 'request-app-error-reopen-1', confirmation,
    })).toMatchObject({ expectedStatus: 'fixed', nextStatus: 'open', confirmation });
    expect(assertReportStatusCas('app_errors', 'fixed', 'fixed', 'open')).toBe('fixed');
    expect(() => assertReportStatusCas('app_errors', 'known', 'fixed', 'open')).toThrow(HttpsError);
    try { assertReportStatusCas('app_errors', 'known', 'fixed', 'open'); } catch (error) {
      expect((error as HttpsError).code).toBe('failed-precondition');
    }
  });

  test('fingerprints every meaningful command field so changed idempotent payloads conflict', () => {
    const base = parseReportStatusUpdateRequest({
      source: 'app_errors', reportId: 'app-error-3', expectedStatus: 'new', nextStatus: 'known',
      reason: 'Known upstream outage', idempotencyKey: 'app-error-known-1', requestId: 'request-known-1',
      confirmation: buildAppErrorStatusConfirmation('app-error-3', 'new', 'known'),
    });
    const fingerprint = buildReportStatusRequestFingerprint(base);
    expect(buildReportStatusRequestFingerprint({ ...base })).toBe(fingerprint);
    expect(buildReportStatusRequestFingerprint({ ...base, reason: 'Different reason' })).not.toBe(fingerprint);
    expect(buildReportStatusRequestFingerprint({ ...base, requestId: 'request-known-2' })).not.toBe(fingerprint);
    expect(buildReportStatusRequestFingerprint({ ...base, confirmation: 'different' })).not.toBe(fingerprint);
    expect(() => assertReportOperationReplay({ actorUid: 'admin-1', requestFingerprint: fingerprint }, 'admin-1', buildReportStatusRequestFingerprint({ ...base, reason: 'Different reason' }))).toThrow('idempotency_conflict');
  });

  test('constructs modern and legacy status metadata plus structured operation and audit records', () => {
    const input = parseReportStatusUpdateRequest({
      source: 'app_errors', reportId: 'app-error-4', expectedStatus: 'reviewed', nextStatus: 'fixed',
      reason: 'Fixed by release 2.4.1', idempotencyKey: 'app-error-fixed-1', requestId: 'request-fixed-1',
      confirmation: buildAppErrorStatusConfirmation('app-error-4', 'reviewed', 'fixed'),
    });
    const fingerprint = buildReportStatusRequestFingerprint(input);
    expect(buildReportStatusWritePatch(input, 'admin-1', 1_000)).toEqual({
      status: 'fixed', adminStatusUpdatedAtMs: 1_000, adminStatusUpdatedAt: new Date(1_000).toISOString(),
      adminStatusUpdatedBy: 'admin-1', adminStatusReason: 'Fixed by release 2.4.1', adminStatusRequestId: 'request-fixed-1',
      reviewedAt: new Date(1_000).toISOString(), reviewedBy: 'admin-1',
    });
    expect(buildReportStatusOperationRecord(input, 'admin-1', 'audit-1', fingerprint, 1_000)).toMatchObject({
      operationId: 'app-error-fixed-1', actorUid: 'admin-1', requestFingerprint: fingerprint,
      source: 'app_errors', reportId: 'app-error-4', expectedStatus: 'reviewed', nextStatus: 'fixed',
      reason: 'Fixed by release 2.4.1', requestId: 'request-fixed-1', auditId: 'audit-1', createdAtMs: 1_000,
    });
    expect(buildReportStatusAuditRecord(input, 'admin-1', 'developer', 1_000)).toMatchObject({
      action: 'report.status.update', actorUid: 'admin-1', role: 'developer',
      entity: { collection: 'app_errors', id: 'app-error-4' }, before: { status: 'reviewed' }, after: { status: 'fixed' },
      reason: 'Fixed by release 2.4.1', requestId: 'request-fixed-1', idempotencyKey: 'app-error-fixed-1',
    });
  });

  test('binds report status idempotency to the actor as well as the request fingerprint', () => {
    expect(() => assertReportOperationReplay({ actorUid: 'a1', requestFingerprint: 'f1' }, 'a1', 'f1')).not.toThrow();
    expect(() => assertReportOperationReplay({ actorUid: 'a1', requestFingerprint: 'f1' }, 'a2', 'f1')).toThrow('idempotency_conflict');
  });
});
