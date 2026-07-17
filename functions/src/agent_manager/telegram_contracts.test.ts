import { parseManagerTelegramToken } from './telegram_contracts';

function token(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1, tokenIdHash: 'a'.repeat(64), status: 'active', ownerUid: 'owner-uid',
    telegramChatId: '70000001', telegramUserId: '70000001', taskId: 'task-001',
    expectedRevision: 2, permittedDecision: 'approve', projectionHash: 'b'.repeat(64),
    issuedAtMs: 2_000_000_000_000, validUntilMs: 2_000_000_000_500,
    consumedAtMs: null, consumedDecisionId: null, consumedUpdateIdHash: null, ...overrides,
  };
}

describe('manager Telegram token contract', () => {
  test('rejects the non-existent task revision zero', () => {
    expect(() => parseManagerTelegramToken(token({ expectedRevision: 0 }))).toThrow('expectedRevision is invalid');
  });

  test('rejects a token whose validity exceeds the ten-minute cap', () => {
    expect(() => parseManagerTelegramToken(token({ validUntilMs: 2_000_000_600_001 }))).toThrow('manager Telegram token TTL is invalid');
  });
});
