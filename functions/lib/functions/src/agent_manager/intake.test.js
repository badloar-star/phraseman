"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const intake_1 = require("./intake");
describe('Agent Manager intake contract', () => {
    const key = 'k'.repeat(32);
    test('creates a stable opaque reference without preserving the raw source id', () => {
        const input = (0, intake_1.parseAgentManagerInboxRequest)({ sourceType: 'support', sourceId: 'legacy-message-id_123', reportSource: null });
        const ref = (0, intake_1.inboxSourceRef)(input, key);
        expect(ref).toMatch(/^support:sha256:[a-f0-9]{64}$/);
        expect(ref).not.toContain('legacy-message-id_123');
    });
    test('permits only known report sources and no client supplied task text', () => {
        expect((0, intake_1.parseAgentManagerInboxRequest)({ sourceType: 'report', sourceId: 'report_123', reportSource: 'app_errors' })).toMatchObject({ sourceType: 'report' });
        expect(() => (0, intake_1.parseAgentManagerInboxRequest)({ sourceType: 'report', sourceId: 'report_123', reportSource: 'unknown' })).toThrow(https_1.HttpsError);
        expect(() => (0, intake_1.parseAgentManagerInboxRequest)({ sourceType: 'support', sourceId: 'mail_123', reportSource: null, title: 'leak' })).toThrow(https_1.HttpsError);
    });
    test('requires a configured secret-sized HMAC key', () => {
        const input = (0, intake_1.parseAgentManagerInboxRequest)({ sourceType: 'support', sourceId: 'mail_123', reportSource: null });
        expect(() => (0, intake_1.inboxSourceRef)(input, 'short')).toThrow(https_1.HttpsError);
    });
});
//# sourceMappingURL=intake.test.js.map