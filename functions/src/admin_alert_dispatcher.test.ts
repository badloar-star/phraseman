import {
  canClaimAdminAlertEvent,
  classifyTelegramResponse,
  dispatchAdminAlertEvent,
  nextRetryAtMs,
  shouldDeliverAdminAlert,
  type AdminAlertDeliveryStore,
  type AdminAlertOutboxEvent,
  FirestoreAdminAlertDeliveryStore,
} from './admin_alert_dispatcher';
import { renderAdminAlertMessages } from './admin_alert_privacy';

const NOW_MS = 1_725_000_000_000;

function event(overrides: Partial<AdminAlertOutboxEvent> = {}): AdminAlertOutboxEvent {
  return {
    // зачем (владелец 21.10, №48): «новый пользователь» теперь уходит в недельную сводку, поэтому базовое событие —
    // покупка Plus, которая по-прежнему идёт в Telegram сразу.
    eventId: 'revenuecat.receipt:r-123',
    eventType: 'premiumPurchase',
    occurredAtMs: NOW_MS - 1_000,
    payload: { provider: 'PLAY_STORE', product: 'plus_yearly', environment: 'PRODUCTION', uidLast4: '0123' },
    attempts: 1,
    ...overrides,
  };
}

function fakeStore(input: {
  claimed?: AdminAlertOutboxEvent | null;
  enabled?: boolean;
  types?: Record<string, boolean>;
}) {
  const transitions: Array<{ state: string; detail?: unknown }> = [];
  const store: AdminAlertDeliveryStore = {
    async claim() { return input.claimed === undefined ? event() : input.claimed; },
    async loadConfig() {
      return { enabled: input.enabled ?? true, chatId: '123456', types: input.types ?? {} };
    },
    async markSent(_eventId, detail) { transitions.push({ state: 'sent', detail }); },
    async markRetry(_eventId, detail) { transitions.push({ state: 'retrying', detail }); },
    async markDeadLetter(_eventId, detail) { transitions.push({ state: 'dead-letter', detail }); },
    async markSuppressed(_eventId, detail) { transitions.push({ state: 'suppressed', detail }); },
  };
  return { store, transitions };
}

describe('admin Telegram alert dispatcher', () => {
  test('classifies Telegram success, rate limit, server error and permanent client error', () => {
    expect(classifyTelegramResponse(200, { ok: true, result: { message_id: 77 } })).toEqual({
      kind: 'sent',
      messageId: 77,
    });
    expect(classifyTelegramResponse(429, { ok: false, parameters: { retry_after: 7 } })).toEqual({
      kind: 'retry',
      reason: 'telegram_rate_limited',
      retryAfterMs: 7_000,
    });
    expect(classifyTelegramResponse(503, { ok: false })).toEqual({ kind: 'retry', reason: 'telegram_5xx' });
    expect(classifyTelegramResponse(400, { ok: false })).toEqual({ kind: 'dead-letter', reason: 'telegram_4xx_400' });
    expect(classifyTelegramResponse(401, { ok: false })).toMatchObject({ kind: 'retry' });
    expect(classifyTelegramResponse(403, { ok: false })).toMatchObject({ kind: 'retry' });
    expect(classifyTelegramResponse(400, { ok: false, parameters: { migrate_to_chat_id: -100123456789 } })).toMatchObject({ kind: 'retry' });
  });

  test('uses bounded exponential retry unless Telegram supplies a longer delay', () => {
    expect(nextRetryAtMs(NOW_MS, 1)).toBe(NOW_MS + 5_000);
    expect(nextRetryAtMs(NOW_MS, 4)).toBe(NOW_MS + 40_000);
    expect(nextRetryAtMs(NOW_MS, 20)).toBe(NOW_MS + 3_600_000);
    expect(nextRetryAtMs(NOW_MS, 1, 70_000)).toBe(NOW_MS + 70_000);
  });

  test('honors the master switch and optional type switches but keeps new users required', () => {
    expect(shouldDeliverAdminAlert({ enabled: false, chatId: '1', types: {} }, 'newUser')).toBe(false);
    expect(shouldDeliverAdminAlert({ enabled: true, chatId: '1', types: { lessonRating: false } }, 'lessonRating')).toBe(false);
    expect(shouldDeliverAdminAlert({ enabled: true, chatId: '1', types: { newUser: false } }, 'newUser')).toBe(true);
    expect(shouldDeliverAdminAlert({ enabled: true, chatId: '', types: {} }, 'newUser')).toBe(false);
  });

  test('reclaims only due events and expired delivery leases', () => {
    expect(canClaimAdminAlertEvent({ status: 'pending' }, NOW_MS)).toBe(true);
    expect(canClaimAdminAlertEvent({ status: 'retrying', nextAttemptAtMs: NOW_MS + 1 }, NOW_MS)).toBe(false);
    expect(canClaimAdminAlertEvent({ status: 'retrying', nextAttemptAtMs: NOW_MS }, NOW_MS)).toBe(true);
    expect(canClaimAdminAlertEvent({ status: 'delivering', leaseUntilMs: NOW_MS + 1 }, NOW_MS)).toBe(false);
    expect(canClaimAdminAlertEvent({ status: 'delivering', leaseUntilMs: NOW_MS - 1 }, NOW_MS)).toBe(true);
    expect(canClaimAdminAlertEvent({ status: 'sent' }, NOW_MS)).toBe(false);
  });

  test('records a successful Telegram delivery', async () => {
    const { store, transitions } = fakeStore({});
    const result = await dispatchAdminAlertEvent({
      eventId: event().eventId,
      botToken: 'secret-token',
      nowMs: NOW_MS,
      store,
      transport: async () => ({ status: 200, body: { ok: true, result: { message_id: 91 } } }),
    });

    expect(result).toEqual({ status: 'sent', messageId: 91 });
    expect(transitions).toEqual([{ state: 'sent', detail: { sentAtMs: NOW_MS, telegramMessageId: 91 } }]);
  });

  test('suppresses disabled optional events without calling Telegram', async () => {
    const { store, transitions } = fakeStore({
      claimed: event({ eventId: 'rating:1', eventType: 'lessonRating' }),
      types: { lessonRating: false },
    });
    let called = false;
    const result = await dispatchAdminAlertEvent({
      eventId: 'rating:1', botToken: 'secret-token', nowMs: NOW_MS, store,
      transport: async () => { called = true; return { status: 200, body: { ok: true } }; },
    });

    expect(result).toEqual({ status: 'suppressed', reason: 'event_type_disabled' });
    expect(called).toBe(false);
    expect(transitions).toEqual([{ state: 'suppressed', detail: { suppressedAtMs: NOW_MS, reason: 'event_type_disabled' } }]);
  });

  test('retries network, 429 and 5xx failures and dead-letters permanent 4xx', async () => {
    for (const scenario of [
      { response: new Error('network down'), state: 'retrying', reason: 'telegram_network_error' },
      { response: { status: 429, body: { parameters: { retry_after: 7 } } }, state: 'retrying', reason: 'telegram_rate_limited' },
      { response: { status: 503, body: {} }, state: 'retrying', reason: 'telegram_5xx' },
      { response: { status: 403, body: {} }, state: 'retrying', reason: 'telegram_configuration_403' },
      { response: { status: 400, body: {} }, state: 'dead-letter', reason: 'telegram_4xx_400' },
    ] as const) {
      const { store, transitions } = fakeStore({});
      const result = await dispatchAdminAlertEvent({
        eventId: event().eventId,
        botToken: 'secret-token',
        nowMs: NOW_MS,
        store,
        transport: async () => {
          if (scenario.response instanceof Error) throw scenario.response;
          return scenario.response;
        },
      });
      expect(result.status).toBe(scenario.state);
      expect(transitions[0]).toMatchObject({ state: scenario.state, detail: { reason: scenario.reason } });
    }
  });

  test('delivers full multipart reports and resumes after the last acknowledged part', async () => {
    // Версия 2.x: жалобы с 1.x теперь уходят только в сводку (владелец 21.10, №48).
    const claimed = event({ eventType: 'contentReport', occurredAtMs: Date.now() - 1_000, payload: { nickname: 'Анна 8', appVersion: '2.0.0', details: [{ label: 'Текст репорта', value: 'Ошибка <&> 😀'.repeat(900) }] } });
    const { store } = fakeStore({ claimed });
    const sent: string[] = [];
    let nextPart = 0;
    const multipartStore = Object.assign(store, {
      async prepareMessages() { return { messages: renderAdminAlertMessages(claimed), nextPartIndex: nextPart }; },
      async markPartSent(_id: string, detail: { nextPartIndex: number }) { nextPart = detail.nextPartIndex; },
    });
    let fail = true;
    const transport = async ({ text }: { text: string }) => {
      if (sent.length === 1 && fail) return { status: 429, body: { parameters: { retry_after: 1 } } };
      sent.push(text);
      return { status: 200, body: { ok: true, result: { message_id: sent.length } } };
    };
    expect((await dispatchAdminAlertEvent({ eventId: claimed.eventId, botToken: 'test', store: multipartStore, transport })).status).toBe('retrying');
    expect(nextPart).toBe(1);
    fail = false;
    expect((await dispatchAdminAlertEvent({ eventId: claimed.eventId, botToken: 'test', store: multipartStore, transport })).status).toBe('sent');
    expect(sent).toEqual(renderAdminAlertMessages(claimed));
    expect(new Set(sent).size).toBe(sent.length);
  });
});

test('Firestore delivery reads the actual source and freezes text across retries', async () => {
  const documents = new Map<string, Record<string, unknown>>([
    ['admin_alert_events/legacy.content_report:r1', { eventType: 'contentReport', source: 'legacy.content_report', sourceId: 'r1', occurredAtMs: NOW_MS, payload: {}, status: 'pending', attempts: 0 }],
    ['error_reports/r1', { uid: 'u1', appVersion: '1.6.15', comment: 'Сломалась кнопка' }],
    ['users/u1', { progress: { user_name: 'Анна 8' } }],
  ]);
  const doc = (path: string) => ({ path,
    async get() { return { exists: documents.has(path), data: () => documents.get(path) }; },
    async set(value: Record<string, unknown>) { documents.set(path, { ...documents.get(path), ...value }); },
  });
  const db = {
    doc, collection: (name: string) => ({ doc: (id: string) => doc(`${name}/${id}`) }),
    async runTransaction(fn: (tx: unknown) => Promise<unknown>) { return fn({ get: (ref: ReturnType<typeof doc>) => ref.get(), set: (ref: ReturnType<typeof doc>, value: Record<string, unknown>) => ref.set(value) }); },
  };
  const store = new FirestoreAdminAlertDeliveryStore(db as never);
  const claimed = await store.claim('legacy.content_report:r1', NOW_MS);
  expect(claimed?.source).toBe('legacy.content_report');
  const batch = await store.prepareMessages(claimed!);
  expect(batch.messages.join('')).toContain('Анна 8');
  expect(batch.messages.join('')).toContain('Сломалась кнопка');
  documents.set('users/u1', { progress: { user_name: 'Другое имя 9' } });
  documents.set('error_reports/r1', { comment: 'Изменено позже' });
  expect(await store.prepareMessages(claimed!)).toMatchObject({ messages: batch.messages });
  const eventPath = 'admin_alert_events/legacy.content_report:r1';
  documents.set(eventPath, { ...documents.get(eventPath), leaseUntilMs: NOW_MS - 1 });
  const newerStore = new FirestoreAdminAlertDeliveryStore(db as never);
  const newerClaim = await newerStore.claim('legacy.content_report:r1', NOW_MS + 100);
  expect(newerClaim?.attempts).toBe(2);
  expect(await store.renewLease('legacy.content_report:r1', claimed!.attempts, NOW_MS + 200)).toBe(false);
  await store.markSent('legacy.content_report:r1', { sentAtMs: NOW_MS + 200, telegramMessageId: 1 });
  expect(documents.get(eventPath)?.status).toBe('delivering');
  expect(documents.get(eventPath)?.telegramMessages).toEqual(batch.messages);
  await newerStore.markSent('legacy.content_report:r1', { sentAtMs: NOW_MS + 300, telegramMessageId: 2 });
  expect(documents.get(eventPath)?.status).toBe('sent');
  expect(documents.get(eventPath)?.telegramMessages).toBeNull();
});

test('re-renders a legacy snapshot before its first Telegram part is sent', async () => {
  const eventPath = 'admin_alert_events/legacy.content_report:legacy-format';
  const documents = new Map<string, Record<string, unknown>>([
    [eventPath, {
      eventType: 'contentReport', source: 'legacy.content_report', sourceId: 'legacy-format',
      occurredAtMs: NOW_MS, payload: {}, status: 'pending', attempts: 0,
      telegramMessages: ['старый формат'], telegramNextPart: 0, deliveryFormatVersion: 1,
    }],
    ['error_reports/legacy-format', { uid: 'u1', appVersion: '1.6.17', comment: 'Нужен новый формат' }],
    ['users/u1', { progress: { user_name: 'Tanya' } }],
  ]);
  const doc = (path: string) => ({ path,
    async get() { return { exists: documents.has(path), data: () => documents.get(path) }; },
    async set(value: Record<string, unknown>) { documents.set(path, { ...documents.get(path), ...value }); },
  });
  const db = {
    doc, collection: (name: string) => ({ doc: (id: string) => doc(`${name}/${id}`) }),
    async runTransaction(fn: (tx: unknown) => Promise<unknown>) {
      return fn({ get: (ref: ReturnType<typeof doc>) => ref.get(), set: (ref: ReturnType<typeof doc>, value: Record<string, unknown>) => ref.set(value) });
    },
  };
  const store = new FirestoreAdminAlertDeliveryStore(db as never);
  const claimed = await store.claim('legacy.content_report:legacy-format', NOW_MS);
  const batch = await store.prepareMessages(claimed!);
  // Короткий формат v5 (владелец 21.10): цитата в «ёлочках», одно сообщение.
  expect(batch.messages.join('')).toContain('«Нужен новый формат»');
  expect(batch.messages).toHaveLength(1);
  expect(batch.messages).not.toEqual(['старый формат']);
  // v5 (владелец 21.10, №48): короткое сообщение в 2–3 строки.
  expect(documents.get(eventPath)?.deliveryFormatVersion).toBe(5);
});

test('does not send a content-free alert when source lookup fails temporarily', async () => {
  const { store, transitions } = fakeStore({});
  store.prepareMessages = async () => { throw new Error('source read unavailable'); };
  let called = false;
  const result = await dispatchAdminAlertEvent({ eventId: event().eventId, botToken: 'test', nowMs: NOW_MS, store,
    transport: async () => { called = true; throw new Error('unexpected'); } });
  expect(result.status).toBe('retrying');
  expect(called).toBe(false);
  expect(transitions[0]).toMatchObject({ state: 'retrying', detail: { reason: 'alert_context_unavailable' } });
});

test('daily digest intent does not send empty counters when database aggregation is unavailable', async () => {
  const end = Date.parse('2026-09-14T07:00:00Z'); // недельное окно (владелец 21.10, №48)
  const documents = new Map<string, Record<string, unknown>>([
    ['admin_alert_events/digest.daily_ireland:2026-09-12:ownerDailyDigest', {
      eventType: 'ownerDailyDigest', source: 'digest.daily_ireland', sourceId: '2026-09-12:ownerDailyDigest',
      occurredAtMs: end - 1, payload: { windowStartMs: end - 7 * 86400000, windowEndMs: end, metrics: [], count: 0 }, status: 'pending', attempts: 0,
    }],
    ['admin_config/alerts', { enabled: true, chatId: '123456' }],
  ]);
  const doc = (path: string) => ({ path,
    async get() { return { exists: documents.has(path), data: () => documents.get(path) }; },
    async set(value: Record<string, unknown>) { documents.set(path, { ...documents.get(path), ...value }); },
  });
  const unavailableQuery = () => { throw new Error('database_offline'); };
  const db = { doc, collectionGroup: unavailableQuery,
    collection: (name: string) => ({ doc: (id: string) => doc(`${name}/${id}`), where: unavailableQuery }),
    async runTransaction(fn: (tx: unknown) => Promise<unknown>) { return fn({ get: (ref: ReturnType<typeof doc>) => ref.get(), set: (ref: ReturnType<typeof doc>, value: Record<string, unknown>) => ref.set(value) }); },
  };
  const store = new FirestoreAdminAlertDeliveryStore(db as never);
  const transport = jest.fn(async () => ({ status: 200, body: { ok: true, result: { message_id: 12 } } }));
  const result = await dispatchAdminAlertEvent({eventId: 'digest.daily_ireland:2026-09-12:ownerDailyDigest', botToken: 'test', store, transport});
  expect(result.status).toBe('retrying');
  expect(transport).not.toHaveBeenCalled();
  expect(documents.get('admin_alert_events/digest.daily_ireland:2026-09-12:ownerDailyDigest')?.status).toBe('retrying');
});

// ── Маршрут и склейка повторов (владелец 21.10, №48) ─────────────────────────
describe('owner routing: instant / weekly digest / drop', () => {
  const okTransport = jest.fn(async () => ({ status: 200, body: { ok: true, result: { message_id: 7 } } }));
  beforeEach(() => okTransport.mockClear());

  test('a non-urgent event is only marked for the weekly digest, Telegram is not called', async () => {
    const { store, transitions } = fakeStore({ claimed: event({ eventId: 'user.created:u1', eventType: 'newUser' }) });
    const result = await dispatchAdminAlertEvent({ eventId: 'user.created:u1', botToken: 'test', nowMs: NOW_MS, store, transport: okTransport });
    expect(result).toEqual({ status: 'suppressed', reason: 'weekly:not_urgent' });
    expect(okTransport).not.toHaveBeenCalled();
    expect(transitions).toEqual([{ state: 'suppressed', detail: { suppressedAtMs: NOW_MS, reason: 'weekly:not_urgent' } }]);
  });

  test('a sandbox purchase is never sent', async () => {
    const { store } = fakeStore({ claimed: event({ payload: { provider: 'APP_STORE', environment: 'SANDBOX' } }) });
    expect(await dispatchAdminAlertEvent({ eventId: 'x', botToken: 'test', nowMs: NOW_MS, store, transport: okTransport }))
      .toEqual({ status: 'suppressed', reason: 'drop:test_purchase' });
    expect(okTransport).not.toHaveBeenCalled();
  });

  test('a test account (by server nickname) is never sent', async () => {
    const { store } = fakeStore({});
    const testerStore = Object.assign(store, {
      async loadConfig() { return { enabled: true, chatId: '123456', types: {}, testNicknames: ['QA Tester'] }; },
      async prepareMessages() { return { messages: ['x'], nextPartIndex: 0, payload: { nickname: 'qa tester', environment: 'PRODUCTION' } }; },
    });
    expect(await dispatchAdminAlertEvent({ eventId: 'x', botToken: 'test', nowMs: NOW_MS, store: testerStore, transport: okTransport }))
      .toEqual({ status: 'suppressed', reason: 'drop:test_account' });
    expect(okTransport).not.toHaveBeenCalled();
  });

  test('critical error: the leader is sent once and then edited to «×N за час»; members never send a new message', async () => {
    const claimed = event({ eventId: 'crash:1', eventType: 'criticalError', payload: { category: 'learning_v2', appVersion: '2.0.0' } });
    const payload = { category: 'learning_v2', appVersion: '2.0.0', details: [{ label: 'Ошибка', value: 'Эпизод не завершился' }] };
    const edits: Array<{ messageId: number; text: string }> = [];
    const editTransport = async (input: { messageId: number; text: string }) => { edits.push(input); return { status: 200, body: { ok: true } }; };

    const leader = fakeStore({ claimed });
    const leaderStore = Object.assign(leader.store, {
      async prepareMessages() { return { messages: ['first'], nextPartIndex: 0, payload }; },
      async joinAlertGroup() { return { role: 'leader' } as const; },
      async completeAlertGroup() { return 3; },
    });
    expect(await dispatchAdminAlertEvent({ eventId: 'crash:1', botToken: 'test', nowMs: NOW_MS, store: leaderStore, transport: okTransport, editTransport }))
      .toEqual({ status: 'sent', messageId: 7 });
    expect(okTransport).toHaveBeenCalledTimes(1);
    expect(edits).toHaveLength(1);
    expect(edits[0]).toMatchObject({ messageId: 7 });
    expect(edits[0].text).toContain('×3 за час');

    const member = fakeStore({ claimed: { ...claimed, eventId: 'crash:2' } });
    const memberStore = Object.assign(member.store, {
      async prepareMessages() { return { messages: ['second'], nextPartIndex: 0, payload }; },
      async joinAlertGroup() { return { role: 'member', count: 4, leaderMessageId: 7 } as const; },
      async completeAlertGroup() { return 4; },
    });
    expect(await dispatchAdminAlertEvent({ eventId: 'crash:2', botToken: 'test', nowMs: NOW_MS, store: memberStore, transport: okTransport, editTransport }))
      .toEqual({ status: 'suppressed', reason: 'grouped:4' });
    expect(okTransport).toHaveBeenCalledTimes(1);
    expect(edits[1].text).toContain('×4 за час');
  });
});
