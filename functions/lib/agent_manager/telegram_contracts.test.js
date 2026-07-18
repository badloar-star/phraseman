"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegram_contracts_1 = require("./telegram_contracts");
function token(overrides = {}) {
    return {
        schemaVersion: 1, tokenIdHash: 'a'.repeat(64), status: 'active', ownerUid: 'owner-uid',
        telegramChatId: '70000001', telegramUserId: '70000001', taskId: 'task-001',
        expectedRevision: 2, permittedDecision: 'approve', projectionHash: 'b'.repeat(64),
        issuedAtMs: 2000000000000, validUntilMs: 2000000000500,
        consumedAtMs: null, consumedDecisionId: null, consumedUpdateIdHash: null, ...overrides,
    };
}
describe('manager Telegram token contract', () => {
    test('rejects the non-existent task revision zero', () => {
        expect(() => (0, telegram_contracts_1.parseManagerTelegramToken)(token({ expectedRevision: 0 }))).toThrow('expectedRevision is invalid');
    });
    test('rejects a token whose validity exceeds the ten-minute cap', () => {
        expect(() => (0, telegram_contracts_1.parseManagerTelegramToken)(token({ validUntilMs: 2000000600001 }))).toThrow('manager Telegram token TTL is invalid');
    });
});
//# sourceMappingURL=telegram_contracts.test.js.map