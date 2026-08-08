"use strict";
describe('Agent Manager support execution boundary', () => {
    const source = require('node:fs').readFileSync(__dirname + '/support_execution.ts', 'utf8');
    test('uses a durable server-only marker before generating a support draft', () => {
        expect(source).toContain("const OPERATIONS = 'agent_manager_support_draft_operations'");
        expect(source).toContain('reserveProviderAttempt');
        expect(source).toContain("state: 'reserved'");
        expect(source).toContain("state: 'stored'");
    });
    test('does not put correspondence or delivery actions into the execution adapter', () => {
        expect(source).not.toMatch(/dispatchSupportReply|sendMail|prepareSupportReplyOperation|confirmSupportReply|bodyText|fromEmail|draftReply/i);
        expect(source).toContain('execution_output:${outputHash}');
        expect(source).toContain("status: 'needs_review'");
    });
});
//# sourceMappingURL=support_execution_contract.test.js.map