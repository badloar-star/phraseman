"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const report_replies_1 = require("./report_replies");
describe('report reply recipient identity', () => {
    test.each([
        ['error_reports', { uid: 'error-author', stableUid: 'preferred-stable' }, 'preferred-stable'],
        ['error_reports', { uid: 'error-author' }, 'error-author'],
        ['explain_report_entries', { uid: 'legacy-explain', stableUid: 'explain-author' }, 'explain-author'],
        ['user_reports', { reporterUid: 'reporter', reportedUid: 'reported-user' }, 'reporter'],
        ['community_pack_reports', { reporterUid: 'pack-reporter', authorStableId: 'pack-author' }, 'pack-reporter'],
    ])('%s addresses the report author', (collection, report, expected) => {
        expect((0, report_replies_1.reportRecipientCandidate)(collection, report)).toBe(expected);
    });
    test('does not accept unrelated or client-supplied identity fields', () => {
        expect((0, report_replies_1.reportRecipientCandidate)('user_reports', { uid: 'spoofed', reportedUid: 'victim' })).toBe('');
        expect((0, report_replies_1.reportRecipientCandidate)('community_pack_reports', { uid: 'spoofed', authorStableId: 'author' })).toBe('');
    });
});
//# sourceMappingURL=report_reply_recipient.test.js.map