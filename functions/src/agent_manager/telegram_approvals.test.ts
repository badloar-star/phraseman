import { HttpsError } from 'firebase-functions/v2/https';
import { AgentManagerTelegramApprovalCore } from './telegram_approvals';
import { managerTelegramTokenHash } from './telegram_contracts';

const NOW_MS = 2_000_000_000_000;
const NONCE = 'M'.repeat(32);
const OWNER = { uid: 'owner-uid', token: { admin: true, adminRole: 'owner' as const } };

function verifiedUpdate(overrides: Record<string, unknown> = {}) {
  return {
    verification: 'verified', callbackNamespace: 'am1', updateId: '50000001', callbackQueryId: 'callback-query-12345678',
    chatId: '70000001', userId: '70000001', commandText: `/authorize ${NONCE}`, ...overrides,
  };
}

function token(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1, tokenIdHash: managerTelegramTokenHash(NONCE), status: 'active', ownerUid: 'owner-uid',
    telegramChatId: '70000001', telegramUserId: '70000001', taskId: 'task-001', expectedRevision: 2,
    permittedDecision: 'approve', projectionHash: 'a'.repeat(64), issuedAtMs: NOW_MS - 1_000,
    validUntilMs: NOW_MS + 1_000, consumedAtMs: null, consumedDecisionId: null, consumedUpdateIdHash: null,
    ...overrides,
  };
}

function state(tokenDocument = token()) {
  return {
    ownerAuth: OWNER, configuredOwnerUid: 'owner-uid', configuredTelegramChatId: '70000001',
    configuredTelegramUserId: '70000001', token: tokenDocument,
  };
}

describe('Agent Manager Telegram approval core', () => {
  test('accepts only the am1 namespace and forwards the exact bound decision to the ledger', async () => {
    const requireGlobalControlReady = jest.fn(async () => ({ ok: true as const, revision: 7 }));
    const decideTelegramTask = jest.fn(async () => ({ ok: true as const, idempotent: false as const, decision: 'approve' as const }));
    const core = new AgentManagerTelegramApprovalCore({ requireGlobalControlReady, decideTelegramTask } as never, () => NOW_MS);

    await expect(core.handle(verifiedUpdate(), state())).resolves.toMatchObject({ ok: true, decision: 'approve' });
    expect(requireGlobalControlReady).toHaveBeenCalledWith(OWNER);
    expect(requireGlobalControlReady.mock.invocationCallOrder[0]).toBeLessThan(decideTelegramTask.mock.invocationCallOrder[0]);
    expect(decideTelegramTask).toHaveBeenCalledWith(OWNER, expect.objectContaining({
      token: expect.objectContaining({ tokenIdHash: managerTelegramTokenHash(NONCE) }),
      decision: 'approve', updateIdHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
  });

  test('fails closed on unavailable global control before opening the decision transaction', async () => {
    const requireGlobalControlReady = jest.fn(async () => { throw new HttpsError('failed-precondition', 'manager control unavailable'); });
    const decideTelegramTask = jest.fn(async () => ({ ok: true as const, idempotent: false as const, decision: 'approve' as const }));
    const core = new AgentManagerTelegramApprovalCore({ requireGlobalControlReady, decideTelegramTask } as never, () => NOW_MS);

    await expect(core.handle(verifiedUpdate(), state())).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(requireGlobalControlReady).toHaveBeenCalledTimes(1);
    expect(decideTelegramTask).not.toHaveBeenCalled();
  });

  test.each([
    ['Agent Office namespace', { callbackNamespace: 'ao1' }, state()],
    ['different Telegram user', { userId: '70000002' }, state()],
    ['different Telegram chat', { chatId: '70000002' }, state()],
    ['different owner claim', {}, { ...state(), ownerAuth: { uid: 'other-owner', token: { admin: true, adminRole: 'owner' as const } } }],
  ])('fails closed for %s before the ledger', async (_name, updateOverrides, serverState) => {
    const decideTelegramTask = jest.fn(async () => { throw new HttpsError('internal', 'must not run'); });
    const core = new AgentManagerTelegramApprovalCore({ decideTelegramTask } as never, () => NOW_MS);

    await expect(core.handle(verifiedUpdate(updateOverrides), serverState)).rejects.toMatchObject({
      code: expect.stringMatching(/invalid-argument|permission-denied/),
    });
    expect(decideTelegramTask).not.toHaveBeenCalled();
  });
});
