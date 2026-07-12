import { reportRecipientCandidate } from './report_replies';

describe('report reply recipient identity', () => {
  test.each([
    ['error_reports', { uid: 'error-author', stableUid: 'preferred-stable' }, 'preferred-stable'],
    ['error_reports', { uid: 'error-author' }, 'error-author'],
    ['explain_report_entries', { uid: 'legacy-explain', stableUid: 'explain-author' }, 'explain-author'],
    ['user_reports', { reporterUid: 'reporter', reportedUid: 'reported-user' }, 'reporter'],
    ['community_pack_reports', { reporterUid: 'pack-reporter', authorStableId: 'pack-author' }, 'pack-reporter'],
  ])('%s addresses the report author', (collection, report, expected) => {
    expect(reportRecipientCandidate(collection, report)).toBe(expected);
  });

  test('does not accept unrelated or client-supplied identity fields', () => {
    expect(reportRecipientCandidate('user_reports', { uid: 'spoofed', reportedUid: 'victim' })).toBe('');
    expect(reportRecipientCandidate('community_pack_reports', { uid: 'spoofed', authorStableId: 'author' })).toBe('');
  });
});
