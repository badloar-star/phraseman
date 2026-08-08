import { handleApprovalCallback, parseOwnerConfig } from './approval_webhook_core';

const NOW = 1_800_000_000_000;
const OWNER_CONFIG = {
  webhookSecret: 'S'.repeat(32),
  ownerTelegramUserId: '374480287',
  ownerTelegramChatId: '374480287',
  // Выключена по умолчанию — как и в бою.
  selftestEnabled: false,
};

function update(over: Record<string, unknown> = {}) {
  return {
    callback_query: {
      id: 'cbq1',
      data: 'jv1:a:' + 'n'.repeat(32),
      from: { id: 374480287 },
      message: { chat: { id: 374480287 }, message_id: 55 },
      ...over,
    },
  };
}

describe('Jarvis approval webhook core — refuse anything that is not provably the owner', () => {
  test('rejects a request with the wrong webhook secret before reading anything', async () => {
    const consume = jest.fn();
    const result = await handleApprovalCallback({
      body: update(),
      providedSecret: 'wrong',
      config: OWNER_CONFIG,
      consume,
      nowMs: NOW,
    });
    expect(result.status).toBe(401);
    // Ни одного обращения к хранилищу — отказ до чтения.
    expect(consume).not.toHaveBeenCalled();
  });

  test('accepts a genuine owner press and reports the outcome', async () => {
    const consume = jest.fn(async () => ({
      ok: true as const,
      doc: { department: 'payments', action: 'approve' as const, decisionHash: 'abc' },
    }));
    const result = await handleApprovalCallback({
      body: update(),
      providedSecret: OWNER_CONFIG.webhookSecret,
      config: OWNER_CONFIG,
      consume,
      nowMs: NOW,
    });
    expect(result.status).toBe(200);
    expect(consume).toHaveBeenCalledTimes(1);
    expect(result.answerText).toMatch(/принято|подтвержд/i);
  });

  test('a successful approve carries messageEdit with department/action/outcome for the transport to render', async () => {
    const consume = jest.fn(async () => ({
      ok: true as const,
      doc: { department: 'payments', action: 'approve' as const, decisionHash: 'abc' },
    }));
    const result = await handleApprovalCallback({
      body: update(),
      providedSecret: OWNER_CONFIG.webhookSecret,
      config: OWNER_CONFIG,
      consume,
      nowMs: NOW,
    });
    expect(result.messageEdit).toEqual({
      chatId: '374480287',
      messageId: 55,
      action: 'approve',
    });
  });

  test('a successful reject also carries messageEdit', async () => {
    const consume = jest.fn(async () => ({
      ok: true as const,
      doc: { department: 'quality', action: 'reject' as const, decisionHash: 'xyz' },
    }));
    const result = await handleApprovalCallback({
      body: update({ data: 'jv1:r:' + 'n'.repeat(32) }),
      providedSecret: OWNER_CONFIG.webhookSecret,
      config: OWNER_CONFIG,
      consume,
      nowMs: NOW,
    });
    expect(result.messageEdit).toEqual({
      chatId: '374480287',
      messageId: 55,
      action: 'reject',
    });
  });

  test('a rejected outcome (expired/already used/stranger) carries NO messageEdit — nothing to render', async () => {
    const consume = jest.fn(async () => ({ ok: false as const, reason: 'expired' as const }));
    const result = await handleApprovalCallback({
      body: update(),
      providedSecret: OWNER_CONFIG.webhookSecret,
      config: OWNER_CONFIG,
      consume,
      nowMs: NOW,
    });
    expect(result.messageEdit).toBeUndefined();
  });

  test('a stranger press carries NO messageEdit', async () => {
    const consume = jest.fn();
    const result = await handleApprovalCallback({
      body: update({ from: { id: 999999 } }),
      providedSecret: OWNER_CONFIG.webhookSecret,
      config: OWNER_CONFIG,
      consume,
      nowMs: NOW,
    });
    expect(result.messageEdit).toBeUndefined();
  });

  test('rejects a press from a different Telegram user without touching storage', async () => {
    const consume = jest.fn();
    const result = await handleApprovalCallback({
      body: update({ from: { id: 999999 } }),
      providedSecret: OWNER_CONFIG.webhookSecret,
      config: OWNER_CONFIG,
      consume,
      nowMs: NOW,
    });
    expect(result.status).toBe(200);
    expect(consume).not.toHaveBeenCalled();
    expect(result.answerText).toMatch(/не для вас|отказ/i);
  });

  test('ignores updates that are not callback queries', async () => {
    const consume = jest.fn();
    const result = await handleApprovalCallback({
      body: { message: { text: 'привет', chat: { id: 374480287 } } },
      providedSecret: OWNER_CONFIG.webhookSecret,
      config: OWNER_CONFIG,
      consume,
      nowMs: NOW,
    });
    expect(result.status).toBe(200);
    expect(consume).not.toHaveBeenCalled();
  });

  test('ignores callback data of the old agent-office format', async () => {
    const consume = jest.fn();
    const result = await handleApprovalCallback({
      body: update({ data: 'ao1:a:legacy' }),
      providedSecret: OWNER_CONFIG.webhookSecret,
      config: OWNER_CONFIG,
      consume,
      nowMs: NOW,
    });
    expect(consume).not.toHaveBeenCalled();
    expect(result.status).toBe(200);
  });

  test('tells the owner plainly when the button has expired', async () => {
    const consume = jest.fn(async () => ({ ok: false as const, reason: 'expired' as const }));
    const result = await handleApprovalCallback({
      body: update(),
      providedSecret: OWNER_CONFIG.webhookSecret,
      config: OWNER_CONFIG,
      consume,
      nowMs: NOW,
    });
    expect(result.answerText).toMatch(/истек|устарел/i);
  });

  test('tells the owner plainly when the button was already used', async () => {
    const consume = jest.fn(async () => ({ ok: false as const, reason: 'already_used' as const }));
    const result = await handleApprovalCallback({
      body: update(),
      providedSecret: OWNER_CONFIG.webhookSecret,
      config: OWNER_CONFIG,
      consume,
      nowMs: NOW,
    });
    expect(result.answerText).toMatch(/уже/i);
  });

  test('never leaks the reason for a stranger — same answer regardless', async () => {
    const consume = jest.fn();
    const a = await handleApprovalCallback({
      body: update({ from: { id: 111 } }),
      providedSecret: OWNER_CONFIG.webhookSecret, config: OWNER_CONFIG, consume, nowMs: NOW,
    });
    const b = await handleApprovalCallback({
      body: update({ from: { id: 222 }, message: { chat: { id: -100 }, message_id: 1 } }),
      providedSecret: OWNER_CONFIG.webhookSecret, config: OWNER_CONFIG, consume, nowMs: NOW,
    });
    expect(a.answerText).toBe(b.answerText);
  });

  test('parses a valid owner config and refuses a broken one', () => {
    expect(parseOwnerConfig(JSON.stringify(OWNER_CONFIG))).toEqual(OWNER_CONFIG);
    expect(parseOwnerConfig('not json')).toBeNull();
    expect(parseOwnerConfig(JSON.stringify({ webhookSecret: 'short' }))).toBeNull();
    expect(parseOwnerConfig('')).toBeNull();
  });

  test('selftest is OFF unless the config says exactly true', () => {
    // зачем: проверочная ветка в боевой функции — это дверь. Строка "true",
    // единица и отсутствие поля обязаны читаться как «выключено».
    expect(parseOwnerConfig(JSON.stringify(OWNER_CONFIG))?.selftestEnabled).toBe(false);
    expect(parseOwnerConfig(JSON.stringify({ ...OWNER_CONFIG, selftestEnabled: 'true' }))?.selftestEnabled).toBe(false);
    expect(parseOwnerConfig(JSON.stringify({ ...OWNER_CONFIG, selftestEnabled: 1 }))?.selftestEnabled).toBe(false);
    expect(parseOwnerConfig(JSON.stringify({ ...OWNER_CONFIG, selftestEnabled: true }))?.selftestEnabled).toBe(true);
  });

  test('refuses a config whose secret is too short to be safe', () => {
    expect(parseOwnerConfig(JSON.stringify({ ...OWNER_CONFIG, webhookSecret: 'abc' }))).toBeNull();
  });
});
