import { HttpsError } from 'firebase-functions/v2/https';

const NONCE = 'A'.repeat(32);
const BOT_TOKEN = `123456789:${'B'.repeat(35)}`;

function webhookHeaderValue(): string {
  return `Webhook_${'S'.repeat(40)}`;
}

function rawUpdate(overrides: Record<string, unknown> = {}): Buffer {
  const update = {
    update_id: 50_000_001,
    callback_query: {
      id: 'callback-query-12345678',
      from: { id: 70_000_001, is_bot: false },
      message: { message_id: 10, chat: { id: 70_000_001, type: 'private' } },
      data: `ao1:a:${NONCE}`,
    },
    ...overrides,
  };
  return Buffer.from(JSON.stringify(update), 'utf8');
}

function runtimeConfig(overrides: Record<string, unknown> = {}) {
  return {
    webhookSecret: webhookHeaderValue(),
    ownerUid: 'owner-uid',
    ownerTelegramUserId: '70000001',
    ownerTelegramChatId: '70000001',
    ...overrides,
  };
}

class ResponseRecorder {
  statusCode = 0;
  body = '';

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  send(body: string): void {
    this.body = body;
  }
}

function request(rawBody = rawUpdate(), overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-telegram-bot-api-secret-token': webhookHeaderValue(),
    },
    rawBody,
    ...overrides,
  };
}

function tokenDocument() {
  return {
    schemaVersion: 1,
    tokenIdHash: '0'.repeat(64),
    status: 'active',
    ownerUid: 'owner-uid',
    telegramChatId: '70000001',
    telegramUserId: '70000001',
    permittedVerb: 'authorize',
    caseId: 'case-1',
    expectedCaseRevision: 3,
    recommendationId: 'rec-1',
    recommendationRevision: 2,
    recommendationContentHash: 'a'.repeat(64),
    controlRevision: 7,
    issuedAtMs: 2_000_000_000_000,
    validUntilMs: 2_000_000_010_000,
    consumedAtMs: null,
    consumedApprovalId: null,
    consumedUpdateIdHash: null,
  };
}

describe('Agent Office Telegram webhook transport', () => {
  test('is disabled by default without loading config, Firestore state or network transport', async () => {
    const { createAgentOfficeTelegramWebhookHandler } = await import('./telegram_transport');
    const calls = { config: 0, token: 0, approval: 0, network: 0 };
    const handler = createAgentOfficeTelegramWebhookHandler({
      isEnabled: () => false,
      loadConfig: () => { calls.config += 1; return runtimeConfig(); },
      loadTokenByHash: async () => { calls.token += 1; return tokenDocument(); },
      handleApproval: async () => { calls.approval += 1; throw new Error('must not run'); },
      answerCallbackQuery: async () => { calls.network += 1; },
    });
    const response = new ResponseRecorder();

    await handler(request(), response);

    expect(response).toMatchObject({ statusCode: 404, body: 'not_found' });
    expect(calls).toEqual({ config: 0, token: 0, approval: 0, network: 0 });
  });

  test('rejects an invalid webhook secret before parsing state, ledger or network', async () => {
    const { createAgentOfficeTelegramWebhookHandler } = await import('./telegram_transport');
    const calls = { token: 0, approval: 0, network: 0 };
    const handler = createAgentOfficeTelegramWebhookHandler({
      isEnabled: () => true,
      loadConfig: () => runtimeConfig(),
      loadTokenByHash: async () => { calls.token += 1; return tokenDocument(); },
      handleApproval: async () => { calls.approval += 1; throw new Error('must not run'); },
      answerCallbackQuery: async () => { calls.network += 1; },
    });
    const response = new ResponseRecorder();

    await handler(request(rawUpdate(), {
      headers: {
        'content-type': 'application/json',
        'x-telegram-bot-api-secret-token': 'wrong-secret-value',
      },
    }), response);

    expect(response.statusCode).toBe(401);
    expect(calls).toEqual({ token: 0, approval: 0, network: 0 });
  });

  test.each([
    ['oversized body', Buffer.alloc(16_385, 0x61), {}, 413],
    ['invalid JSON', Buffer.from('{nope', 'utf8'), {}, 400],
    ['wrong content type', rawUpdate(), { headers: { 'content-type': 'text/plain', 'x-telegram-bot-api-secret-token': webhookHeaderValue() } }, 415],
  ])('rejects %s before loading token state', async (_name, body, requestOverrides, expectedStatus) => {
    const { createAgentOfficeTelegramWebhookHandler } = await import('./telegram_transport');
    const calls = { token: 0, approval: 0, network: 0 };
    const handler = createAgentOfficeTelegramWebhookHandler({
      isEnabled: () => true,
      loadConfig: () => runtimeConfig(),
      loadTokenByHash: async () => { calls.token += 1; return tokenDocument(); },
      handleApproval: async () => { calls.approval += 1; throw new Error('must not run'); },
      answerCallbackQuery: async () => { calls.network += 1; },
    });
    const response = new ResponseRecorder();

    await handler(request(body, requestOverrides), response);

    expect(response.statusCode).toBe(expectedStatus);
    expect(calls).toEqual({ token: 0, approval: 0, network: 0 });
  });

  test('rejects a mismatched Telegram owner identity before Firestore token lookup', async () => {
    const { createAgentOfficeTelegramWebhookHandler } = await import('./telegram_transport');
    const calls = { token: 0, approval: 0, network: 0 };
    const handler = createAgentOfficeTelegramWebhookHandler({
      isEnabled: () => true,
      loadConfig: () => runtimeConfig(),
      loadTokenByHash: async () => { calls.token += 1; return tokenDocument(); },
      handleApproval: async () => { calls.approval += 1; throw new Error('must not run'); },
      answerCallbackQuery: async () => { calls.network += 1; },
    });
    const response = new ResponseRecorder();
    const body = rawUpdate({
      callback_query: {
        id: 'callback-query-12345678',
        from: { id: 70_000_002, is_bot: false },
        message: { message_id: 10, chat: { id: 70_000_001, type: 'private' } },
        data: `ao1:a:${NONCE}`,
      },
    });

    await handler(request(body), response);

    expect(response.statusCode).toBe(200);
    expect(calls).toEqual({ token: 0, approval: 0, network: 0 });
  });

  test('routes one verified owner callback to one ledger decision and sends only a fixed safe acknowledgement', async () => {
    const { createAgentOfficeTelegramWebhookHandler, telegramApprovalTokenHash } = await import('./telegram_transport');
    const calls = { tokenHashes: [] as string[], approval: 0, replies: [] as Array<{ id: string; text: string }> };
    const token = { ...tokenDocument(), tokenIdHash: telegramApprovalTokenHash(NONCE) };
    const handler = createAgentOfficeTelegramWebhookHandler({
      isEnabled: () => true,
      loadConfig: () => runtimeConfig(),
      loadTokenByHash: async (namespace, hash) => { expect(namespace).toBe('ao1'); calls.tokenHashes.push(hash); return token; },
      handleApproval: async (update, state) => {
        calls.approval += 1;
        expect(update).toMatchObject({ verification: 'verified', userId: '70000001', chatId: '70000001', commandText: `/authorize ${NONCE}` });
        expect(state).toMatchObject({ configuredOwnerUid: 'owner-uid', token });
        return { ok: true, idempotent: false, decision: 'approve' };
      },
      answerCallbackQuery: async (id, text) => { calls.replies.push({ id, text }); },
    });
    const response = new ResponseRecorder();

    await handler(request(), response);

    expect(response).toMatchObject({ statusCode: 200, body: 'ok' });
    expect(calls.approval).toBe(1);
    expect(calls.tokenHashes).toEqual([telegramApprovalTokenHash(NONCE)]);
    expect(calls.replies).toEqual([{ id: 'callback-query-12345678', text: 'Решение принято.' }]);
    expect(JSON.stringify(calls.replies)).not.toMatch(/owner-uid|70000001|case-1|rec-1|AAAA/);
  });

  test('routes an exact am1 callback to the manager token root and returns a fixed rejection acknowledgement', async () => {
    const { createAgentOfficeTelegramWebhookHandler, telegramApprovalTokenHash } = await import('./telegram_transport');
    const calls = { tokenArgs: [] as unknown[][], approvalNamespaces: [] as unknown[], replies: [] as Array<{ id: string; text: string }> };
    const managerToken = { schemaVersion: 1, tokenIdHash: telegramApprovalTokenHash(NONCE) };
    const handler = createAgentOfficeTelegramWebhookHandler({
      isEnabled: () => true,
      loadConfig: () => runtimeConfig(),
      loadTokenByHash: async (...args: unknown[]) => { calls.tokenArgs.push(args); return managerToken; },
      handleApproval: async (update) => {
        calls.approvalNamespaces.push((update as unknown as { callbackNamespace?: unknown }).callbackNamespace);
        return { ok: true, idempotent: false, decision: 'reject' as const };
      },
      answerCallbackQuery: async (id, text) => { calls.replies.push({ id, text }); },
    });
    const response = new ResponseRecorder();
    const body = rawUpdate({
      callback_query: {
        id: 'callback-query-12345678',
        from: { id: 70_000_001, is_bot: false },
        message: { message_id: 10, chat: { id: 70_000_001, type: 'private' } },
        data: `am1:r:${NONCE}`,
      },
    });

    await handler(request(body), response);

    expect(response).toMatchObject({ statusCode: 200, body: 'ok' });
    expect(calls.tokenArgs).toEqual([['am1', telegramApprovalTokenHash(NONCE)]]);
    expect(calls.approvalNamespaces).toEqual(['am1']);
    expect(calls.replies).toEqual([{ id: 'callback-query-12345678', text: 'Manager task rejected.' }]);
  });

  test('rejects an unknown callback namespace before token lookup', async () => {
    const { createAgentOfficeTelegramWebhookHandler } = await import('./telegram_transport');
    let tokenReads = 0;
    const handler = createAgentOfficeTelegramWebhookHandler({
      isEnabled: () => true,
      loadConfig: () => runtimeConfig(),
      loadTokenByHash: async () => { tokenReads += 1; return tokenDocument(); },
      handleApproval: async () => { throw new Error('must not run'); },
      answerCallbackQuery: async () => { throw new Error('must not run'); },
    });
    const response = new ResponseRecorder();
    const body = rawUpdate({
      callback_query: {
        id: 'callback-query-12345678',
        from: { id: 70_000_001, is_bot: false },
        message: { message_id: 10, chat: { id: 70_000_001, type: 'private' } },
        data: `ax1:a:${NONCE}`,
      },
    });

    await handler(request(body), response);

    expect(response).toMatchObject({ statusCode: 400, body: 'invalid_update' });
    expect(tokenReads).toBe(0);
  });

  test('does not call Telegram for denied approval state', async () => {
    const { createAgentOfficeTelegramWebhookHandler, telegramApprovalTokenHash } = await import('./telegram_transport');
    let networkCalls = 0;
    const handler = createAgentOfficeTelegramWebhookHandler({
      isEnabled: () => true,
      loadConfig: () => runtimeConfig(),
      loadTokenByHash: async () => ({ ...tokenDocument(), tokenIdHash: telegramApprovalTokenHash(NONCE) }),
      handleApproval: async () => { throw new HttpsError('failed-precondition', 'stale recommendation'); },
      answerCallbackQuery: async () => { networkCalls += 1; },
    });
    const response = new ResponseRecorder();

    await handler(request(), response);

    expect(response).toMatchObject({ statusCode: 200, body: 'ignored' });
    expect(networkCalls).toBe(0);
  });

  test('acknowledgement network failure does not retry or change the completed ledger result', async () => {
    const { createAgentOfficeTelegramWebhookHandler, telegramApprovalTokenHash } = await import('./telegram_transport');
    let approvalCalls = 0;
    let networkCalls = 0;
    const handler = createAgentOfficeTelegramWebhookHandler({
      isEnabled: () => true,
      loadConfig: () => runtimeConfig(),
      loadTokenByHash: async () => ({ ...tokenDocument(), tokenIdHash: telegramApprovalTokenHash(NONCE) }),
      handleApproval: async () => { approvalCalls += 1; return { ok: true, idempotent: false, decision: 'approve' }; },
      answerCallbackQuery: async () => { networkCalls += 1; throw new Error('network_down_with_sensitive_detail'); },
    });
    const response = new ResponseRecorder();

    await handler(request(), response);

    expect(response).toMatchObject({ statusCode: 200, body: 'ok' });
    expect(approvalCalls).toBe(1);
    expect(networkCalls).toBe(1);
  });
});

describe('Telegram transport primitives', () => {
  test('compares webhook secret tokens without length-dependent direct equality', async () => {
    const { constantTimeTelegramSecretEqual } = await import('./telegram_transport');
    expect(constantTimeTelegramSecretEqual(webhookHeaderValue(), webhookHeaderValue())).toBe(true);
    expect(constantTimeTelegramSecretEqual(webhookHeaderValue(), 'wrong')).toBe(false);
    expect(constantTimeTelegramSecretEqual('', '')).toBe(false);
  });

  test('Bot API adapter uses injected fetch and exposes no response body or bot token in failures', async () => {
    const { TelegramBotApiTransport } = await import('./telegram_transport');
    const fetchCalls: Array<{ url: string; init: RequestInit }> = [];
    const transport = new TelegramBotApiTransport(BOT_TOKEN, async (url, init) => {
      fetchCalls.push({ url: String(url), init: init ?? {} });
      return new Response('sensitive upstream detail', { status: 502 });
    });

    await expect(transport.answerCallbackQuery('callback-query-12345678', 'Решение принято.')).rejects.toThrow('telegram_api_failed');
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].init).toMatchObject({ method: 'POST' });
    try {
      await transport.answerCallbackQuery('callback-query-12345678', 'Решение принято.');
    } catch (error) {
      expect(String(error)).not.toContain(BOT_TOKEN);
      expect(String(error)).not.toContain('sensitive upstream detail');
    }
  });
});
