import { resolveReportRecipient } from './report_replies';

describe('report reply recipient resolution', () => {
  test.each([
    ['error_reports', { uid: 'error-owner' }, 'error-owner'],
    ['explain_report_entries', { stableUid: 'stable-owner', uid: 'auth-owner' }, 'stable-owner'],
    ['explain_report_entries', { uid: 'auth-owner' }, 'auth-owner'],
    ['user_reports', { reporterUid: 'reporter', reportedUid: 'reported' }, 'reporter'],
    ['community_pack_reports', { reporterUid: 'pack-reporter', authorUid: 'author' }, 'pack-reporter'],
  ])('uses the authoritative reporter for %s', (source, report, expected) => {
    expect(resolveReportRecipient(source, report)).toBe(expected);
  });

  it('does not accept unrelated user fields as a reply recipient', () => {
    expect(() => resolveReportRecipient('user_reports', { reportedUid: 'target' })).toThrow('recipient');
    expect(() => resolveReportRecipient('community_pack_reports', { authorUid: 'author' })).toThrow('recipient');
  });

  it('rejects unsupported collections and malformed recipient ids', () => {
    expect(() => resolveReportRecipient('app_errors', { uid: 'victim' })).toThrow('collection');
    expect(() => resolveReportRecipient('error_reports', { uid: '../victim' })).toThrow('recipient');
    expect(() => resolveReportRecipient('error_reports', { uid: 'unknown' })).toThrow('recipient');
  });

  it('rejects a legacy client uid when it disagrees with the report owner', () => {
    expect(() => resolveReportRecipient('error_reports', { uid: 'actual' }, 'spoofed')).toThrow('does not match');
    expect(resolveReportRecipient('error_reports', { uid: 'actual' }, 'actual')).toBe('actual');
  });
});
