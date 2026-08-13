export {};

/**
 * Интеграционный тест самого триггера supportInboxOnNewMail (не только его
 * чистых частей — decideSpamAction/buildSpamTriagePrompt уже покрыты в
 * jarvis/support_spam_triage.test.ts). Мокает Firestore/OpenAI/Telegram по
 * образцу auth_recovery.test.ts: onDocumentCreated ловится моком firestore
 * v2, хендлер вызывается напрямую с фиктивным событием.
 *
 * зачем этот тест нужен помимо чистых юнитов: только здесь проверяется, что
 * ветвление (архивировать / уведомить с черновиком / бюджет исчерпан / любая
 * ошибка) реально подключено правильными вызовами к правильным сторонним
 * системам — деньги (LLM budget) и решение об архивации чужой почты зависят
 * именно от этой склейки, а не только от чистой логики.
 */

type DocData = Record<string, unknown>;

const registeredDocumentCreates: Array<{ options: Record<string, unknown>; handler: (event: unknown) => Promise<void> }> = [];
const store = new Map<string, DocData>();
const secretValues = new Map<string, string>();

const mockOpenAiChat = jest.fn<Promise<{ text: string; promptTokens: number; completionTokens: number }>, unknown[]>();
const mockSendTelegramAlert = jest.fn<Promise<boolean>, unknown[]>(async () => true);
const mockSendJarvisDigest = jest.fn<Promise<boolean>, unknown[]>(async () => true);
const mockResolveJobConfig = jest.fn<Promise<{ model: string; enabled: boolean }>, unknown[]>(async () => ({ model: 'gpt-4.1-nano', enabled: true }));
const mockAssertJobEnabled = jest.fn<void, unknown[]>();
const mockSmtpVerify = jest.fn<Promise<unknown>, unknown[]>(async () => true);
const mockSmtpSendMail = jest.fn<Promise<{ messageId: string }>, unknown[]>(async () => ({ messageId: '<smtp-accepted@example.test>' }));
const mockSmtpClose = jest.fn();

jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: (options: Record<string, unknown>, handler: (event: unknown) => Promise<void>) => {
    registeredDocumentCreates.push({ options, handler });
    return handler;
  },
}));

jest.mock('firebase-functions/v2/https', () => ({
  onCall: (_options: unknown, handler: unknown) => handler,
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

jest.mock('firebase-functions', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: (name: string) => ({ name, value: () => secretValues.get(name) ?? '' }),
}));

jest.mock('./callable_options', () => ({
  ENFORCE_APP_CHECK: false,
  ADMIN_SENSITIVE_WRITE_OPTIONS: { region: 'us-central1', enforceAppCheck: false },
  requireAdminAppCheck: jest.fn(),
}));

jest.mock('./explain/explain_provider', () => ({
  openAiChat: (...args: unknown[]) => mockOpenAiChat(...args),
}));

jest.mock('./openai_jobs_config', () => ({
  resolveJobConfig: (...args: unknown[]) => mockResolveJobConfig(...args),
  assertJobEnabled: (...args: unknown[]) => mockAssertJobEnabled(...args),
}));

jest.mock('./admin/audit_contract', () => ({
  createAuditRecord: (input: Record<string, unknown>) => ({ ...input, id: 'audit-fake' }),
}));

jest.mock('./admin/permissions', () => ({
  hasPermission: () => true,
}));

jest.mock('./admin/roles', () => ({
  hasAdminRole: () => true,
}));

jest.mock('./admin_alerts', () => ({
  ADMIN_ALERT_BOT_TOKEN: { value: () => 'bot-token-test' },
  sendTelegramAlert: (...args: unknown[]) => mockSendTelegramAlert(...args),
}));

jest.mock('./jarvis/telegram_send', () => ({
  sendJarvisDigest: (...args: unknown[]) => mockSendJarvisDigest(...args),
}));

jest.mock('nodemailer', () => ({
  createTransport: () => ({ verify: mockSmtpVerify, sendMail: mockSmtpSendMail, close: mockSmtpClose }),
}));

function refFor(path: string) {
  return {
    id: path.split('/').pop() || path,
    path,
    get: async () => ({ exists: store.has(path), data: () => store.get(path) }),
    set: async (data: DocData, opts?: { merge?: boolean }) => {
      const prev = opts?.merge ? (store.get(path) ?? {}) : {};
      store.set(path, { ...prev, ...data });
    },
  };
}

function fakeDb() {
  const queryFor = (name: string, filters: Array<[string, unknown]> = [], max = Number.POSITIVE_INFINITY) => ({
    where: (field: string, op: string, value: unknown) => {
      if (op !== '==') throw new Error(`unsupported fake query operator: ${op}`);
      return queryFor(name, [...filters, [field, value]], max);
    },
    limit: (value: number) => queryFor(name, filters, value),
    get: async () => {
      const docs = [...store.entries()]
        .filter(([path]) => path.startsWith(`${name}/`) && !path.slice(name.length + 1).includes('/'))
        .filter(([, data]) => filters.every(([field, value]) => data[field] === value))
        .slice(0, max)
        .map(([path, data]) => ({
          id: path.split('/').pop() || path,
          ref: refFor(path),
          exists: true,
          data: () => data,
        }));
      return { docs, size: docs.length, empty: docs.length === 0 };
    },
  });
  return {
    collection: (name: string) => ({
      doc: (id?: string) => refFor(`${name}/${id ?? `auto_${Math.random()}`}`),
      ...queryFor(name),
    }),
    doc: (path: string) => refFor(path),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        get: async (ref: { path: string; id?: string }) => ({
          id: ref.id ?? ref.path.split('/').pop() ?? ref.path,
          ref,
          exists: store.has(ref.path),
          data: () => store.get(ref.path),
        }),
        set: (ref: { path: string }, data: DocData, opts?: { merge?: boolean }) => {
          const prev = opts?.merge ? (store.get(ref.path) ?? {}) : {};
          store.set(ref.path, { ...prev, ...data });
        },
        update: (ref: { path: string }, data: DocData) => {
          store.set(ref.path, { ...(store.get(ref.path) ?? {}), ...data });
        },
        create: (ref: { path: string }, data: DocData) => {
          store.set(ref.path, data);
        },
      };
      return fn(tx);
    },
  };
}

jest.mock('firebase-admin', () => {
  const firestore = Object.assign(jest.fn(() => fakeDb()), {
    FieldValue: {
      serverTimestamp: () => '__server_timestamp__',
      delete: () => '__delete_field__',
    },
  });
  return { firestore };
});

/**
 * зачем писать в store: onDocumentCreated получает событие ПОСЛЕ того, как
 * документ уже реально существует в Firestore (это же гарантия события
 * "created") — saveGeneratedSupportDraft/архивация читают его через
 * db.collection(...).doc(...).get() внутри своей транзакции, а не только
 * через event.data(). Без записи в store они бы всегда видели "not found".
 */
function makeEvent(id: string, data: DocData) {
  store.set(`support_inbox/${id}`, data);
  return { data: { id, data: () => data } };
}

describe('supportInboxOnNewMail — full trigger wiring, not just its pure parts', () => {
  let supportInboxOnNewMail: (event: unknown) => Promise<void>;
  let deliverSupportOwnerAlert: (input: {
    db: ReturnType<typeof fakeDb>; messageDocId: string; botToken: string; text: string; nowMs: number;
  }) => Promise<'delivered' | 'skipped'>;
  let handleSupportTelegramAction: (input: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  let supportTelegramReplyJobOnCreate: (event: unknown) => Promise<void>;
  let runSupportTelegramAutoSendDeadline: (nowMs?: number) => Promise<{ scanned: number; queued: number }>;
  let adminSupportSaveInstructions: (request: unknown) => Promise<Record<string, unknown>>;
  let adminSupportArchiveMessages: (request: unknown) => Promise<Record<string, unknown>>;
  let adminSupportSetStatus: (request: unknown) => Promise<Record<string, unknown>>;
  let adminSupportPrepareReplyBatch: (request: unknown) => Promise<Record<string, unknown>>;
  let claimSupportReplyDispatch: (db: ReturnType<typeof fakeDb>, input: Record<string, unknown>, actor: Record<string, unknown>) => Promise<Record<string, unknown>>;

  beforeAll(() => {
    // require, not import: modules must load AFTER jest.mock() calls above run.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./support_inbox');
    supportInboxOnNewMail = mod.supportInboxOnNewMail;
    deliverSupportOwnerAlert = mod.deliverSupportOwnerAlert;
    handleSupportTelegramAction = mod.handleSupportTelegramAction;
    supportTelegramReplyJobOnCreate = mod.supportTelegramReplyJobOnCreate;
    runSupportTelegramAutoSendDeadline = mod.runSupportTelegramAutoSendDeadline;
    adminSupportSaveInstructions = mod.adminSupportSaveInstructions;
    adminSupportArchiveMessages = mod.adminSupportArchiveMessages;
    adminSupportSetStatus = mod.adminSupportSetStatus;
    adminSupportPrepareReplyBatch = mod.adminSupportPrepareReplyBatch;
    claimSupportReplyDispatch = mod.claimSupportReplyDispatch;
  });

  beforeEach(() => {
    store.clear();
    // Trigger wiring tests run in shadow mode: council/draft behavior is real,
    // while SMTP dispatch is covered independently by the durable delivery tests.
    store.set('admin_config/support_inbox', { autoReplyMode: 'shadow', autoReplyRevision: 1 });
    secretValues.set('OPENAI_API_KEY', 'openai-test-secret');
    secretValues.set('GMAIL_SUPPORT_APP_PASSWORD', 'gmail-test-secret');
    secretValues.set('JARVIS_TELEGRAM_CONFIG', JSON.stringify({
      webhookSecret: 's'.repeat(32), ownerTelegramUserId: '1', ownerTelegramChatId: '1', selftestEnabled: false,
    }));
    mockOpenAiChat.mockReset();
    mockSendTelegramAlert.mockReset();
    mockSendTelegramAlert.mockResolvedValue(true);
    mockSendJarvisDigest.mockReset();
    mockSendJarvisDigest.mockResolvedValue(true);
    mockResolveJobConfig.mockClear();
    mockAssertJobEnabled.mockReset();
    mockSmtpVerify.mockClear();
    mockSmtpSendMail.mockClear();
    mockSmtpClose.mockClear();
  });

  async function preparePremiumReview(messageDocId: string): Promise<{ reviewId: string; operationId: string; approveNonce: string }> {
    store.set('admin_config/support_inbox', {
      autoReplyMode: 'live_guarded', autoReplyRevision: 2, autoReplyDailyCap: 20,
      autoReplyPerSenderDailyCap: 3, signature: 'Phraseman Support', signatureRevision: 1,
    });
    mockOpenAiChat.mockResolvedValueOnce({
      text: JSON.stringify({ isSpam: false, confidence: 0.99, reason: 'payment question' }),
      promptTokens: 30, completionTokens: 10,
    });
    await supportInboxOnNewMail(makeEvent(messageDocId, {
      messageId: `<${messageDocId}@example.test>`, fromEmail: 'owner-canary@example.com',
      subject: 'Не могу купить Premium в России', bodyText: 'Какие ещё есть способы оплаты?',
      receivedAtMs: Date.now(), status: 'new', mailCategory: 'human',
    }));
    const reviewEntry = [...store.entries()].find(([path]) => path.startsWith('support_telegram_reviews/'));
    const operationEntry = [...store.entries()].find(([path]) => path.startsWith('support_reply_operations/'));
    const telegram = mockSendJarvisDigest.mock.calls.at(-1)?.[0] as { keyboard?: { inline_keyboard?: Array<Array<{ callback_data?: string }>> } };
    const callback = String(telegram.keyboard?.inline_keyboard?.[0]?.[0]?.callback_data ?? '');
    return {
      reviewId: reviewEntry?.[0].split('/').pop() ?? '',
      operationId: operationEntry?.[0].split('/').pop() ?? '',
      approveNonce: callback.split(':')[2] ?? '',
    };
  }

  test('registers on support_inbox document creation', () => {
    const registration = registeredDocumentCreates.find((r) => r.handler === supportInboxOnNewMail);
    expect(registration).toBeDefined();
    expect(registration?.options.document).toBe('support_inbox/{messageDocId}');
  });

  // зачем: index.ts экспортирует supportInboxOnNewMail по имени — если
  // support_inbox.ts когда-нибудь переименует экспорт, index.ts продолжит
  // компилироваться (require в других местах не типизирован так же строго),
  // но реальный триггер тихо перестанет существовать. Явно проверяем именно
  // то имя, которое реэкспортирует index.ts.
  test('exports the exact function name index.ts re-exports', () => {
    expect(typeof supportInboxOnNewMail).toBe('function');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./support_inbox');
    expect(Object.prototype.hasOwnProperty.call(mod, 'supportInboxOnNewMail')).toBe(true);
  });

  test('skips technical spam already classified as automated — no LLM call at all', async () => {
    await supportInboxOnNewMail(makeEvent('m1', {
      fromEmail: 'newsletter@shop.example', subject: 'Sale', bodyText: 'Buy now', mailCategory: 'automated',
    }));
    expect(mockOpenAiChat).not.toHaveBeenCalled();
    expect(mockSendTelegramAlert).not.toHaveBeenCalled();
  });

  test('quarantines an obvious spam verdict but still alerts visibly against classifier injection', async () => {
    mockOpenAiChat.mockResolvedValueOnce({
      text: JSON.stringify({ isSpam: true, confidence: 0.99, reason: 'массовая реклама' }),
      promptTokens: 50, completionTokens: 20,
    });
    await supportInboxOnNewMail(makeEvent('m2', {
      fromEmail: 'seo@spam-shop.example', subject: 'Купите ссылки', bodyText: 'дёшево', status: 'new',
    }));
    expect(store.get('support_inbox/m2')?.status).toBe('archived');
    expect(store.get('support_inbox/m2')?.triageState).toBe('quarantined');
    expect(mockSendTelegramAlert).toHaveBeenCalledTimes(1);
  });

  test('a real question generates a guarded draft and notifies Telegram without leaking correspondence PII', async () => {
    mockOpenAiChat
      .mockResolvedValueOnce({
        text: JSON.stringify({ isSpam: false, confidence: 0.95, reason: 'вопрос по оплате' }),
        promptTokens: 50, completionTokens: 20,
      })
      .mockResolvedValueOnce({ text: 'Здравствуйте! Проверили — доступ уже открыт.', promptTokens: 100, completionTokens: 40 });

    await supportInboxOnNewMail(makeEvent('m3', {
      fromEmail: 'client@example.com', subject: 'Не работает подписка', bodyText: 'Оплатил Plus, доступа нет', status: 'new',
    }));

    expect(store.get('support_inbox/m3')?.status).not.toBe('archived');
    const storedDraft = String(store.get('support_inbox/m3')?.draftReply ?? '');
    expect(storedDraft).toContain('нужно проверить по конкретной покупке');
    expect(storedDraft).not.toContain('сним');
    expect(storedDraft).not.toContain('доступ уже открыт');
    expect(mockSendTelegramAlert).not.toHaveBeenCalled();
    expect(mockSendJarvisDigest).toHaveBeenCalledTimes(1);
    const text = String((mockSendJarvisDigest.mock.calls[0][0] as Record<string, unknown>).text || '');
    expect(text).toContain('Ответ Джарвиса готов');
    expect(text).toContain('не прошёл проверку фактов и человеческого качества');
    expect((mockSendJarvisDigest.mock.calls[0][0] as Record<string, unknown>).keyboard).toBeNull();
    expect(store.get('support_inbox/m3')?.autoReply).toMatchObject({ grounded: false, autoSendAtMs: null });
    expect(text).not.toContain('client@example.com');
    expect(text).not.toContain('Не работает подписка');
    expect(text).not.toContain('Оплатил Plus');
    expect(text).not.toContain('Здравствуйте! Проверили');
  });

  test('live guarded mode seals one council-reviewed reply and asks in Telegram before SMTP', async () => {
    store.set('admin_config/support_inbox', {
      autoReplyMode: 'live_guarded', autoReplyRevision: 2, autoReplyDailyCap: 20,
      autoReplyPerSenderDailyCap: 3, signature: 'Phraseman Support', signatureRevision: 1,
    });
    mockOpenAiChat
      .mockResolvedValueOnce({
        text: JSON.stringify({ isSpam: false, confidence: 0.99, reason: 'product question' }),
        promptTokens: 40, completionTokens: 10,
      })
      .mockImplementationOnce(async (request: unknown) => {
        const messages = (request as { messages?: Array<{ content?: string }> }).messages ?? [];
        const system = String(messages[0]?.content ?? '');
        const rawIds = system.match(/Allowed evidence IDs:\s*([^\n.]+)/)?.[1] ?? '';
        const evidenceId = rawIds.split(',').map((value) => value.trim()).find(Boolean) ?? '';
        return {
          text: JSON.stringify({
            reply: 'Hello! Open the practice section in Phraseman and choose a learning activity.',
            evidenceIds: evidenceId ? [evidenceId] : [], confidence: 0.94, needsHuman: false,
          }),
          promptTokens: 120, completionTokens: 35,
        };
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ approved: true, correctedReply: '', reasons: [] }),
        promptTokens: 80, completionTokens: 15,
      });

    await supportInboxOnNewMail(makeEvent('m-live', {
      messageId: '<incoming-live@example.test>', fromEmail: 'learner@example.com',
      subject: 'How can I practise?', bodyText: 'Which learning activities are available in the app?',
      receivedAtMs: Date.now(), status: 'new', mailCategory: 'human',
    }));

    expect(mockSmtpVerify).not.toHaveBeenCalled();
    expect(mockSmtpSendMail).not.toHaveBeenCalled();
    expect(mockSendJarvisDigest).toHaveBeenCalledTimes(1);
    const telegram = mockSendJarvisDigest.mock.calls[0][0] as Record<string, unknown>;
    expect(String(telegram.text)).toContain('Полный текст письма');
    expect(telegram.keyboard).toBeTruthy();
    expect(store.get('support_inbox/m-live')).toMatchObject({
      status: 'new',
      autoReply: { state: 'awaiting_approval', grounded: true, reason: 'grounded_and_reviewed' },
    });
    const operations = [...store.entries()].filter(([path]) => path.startsWith('support_reply_operations/'));
    expect(operations).toHaveLength(1);
    expect(operations[0][1]).toMatchObject({
      state: 'prepared', messageDocId: 'm-live', draftOrigin: 'jarvis',
      instructionsSchemaVersion: 1, instructionsPromptVersion: 1,
      instructionsRevision: 0,
    });
  });

  test('instruction save uses CAS: same expected revision can win only once', async () => {
    const request = (text: string) => ({
      auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } },
      data: { text, expectedRevision: 0, requestId: `instructions-${text}` },
    });
    await expect(adminSupportSaveInstructions(request('Пишем дружелюбно.'))).resolves.toMatchObject({
      ok: true, instructions: { revision: 1 },
    });
    await expect(adminSupportSaveInstructions(request('Пишем коротко.'))).rejects.toThrow('support_instructions_revision_conflict');
  });

  test('bulk archive terminalizes prepared mail, Telegram review, pending job and owner alert', async () => {
    const messageDocId = `m_${'9'.repeat(64)}`;
    const prepared = await preparePremiumReview(messageDocId);
    await handleSupportTelegramAction({
      db: fakeDb(), nonce: prepared.approveNonce, requestedAction: 'approve',
      fromTelegramUserId: '1', fromTelegramChatId: '1', nowMs: Date.now(),
    });
    const message = store.get(`support_inbox/${messageDocId}`)!;
    store.set(`support_inbox/${messageDocId}`, {
      ...message,
      ownerNotification: { state: 'pending', attempts: 1 },
    });
    const result = await adminSupportArchiveMessages({
      auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } },
      data: {
        items: [{
          messageDocId, expectedStatus: 'new',
          expectedDraftRevision: Number(message.draftRevision ?? 0),
        }],
        requestId: 'archive-terminal-test',
      },
    });
    expect(result).toMatchObject({ ok: true, requested: 1, archived: 1, failed: 0 });
    expect(store.get(`support_inbox/${messageDocId}`)).toMatchObject({
      status: 'archived',
      replyGate: { state: 'cancelled' },
      autoReply: { state: 'suppressed', autoSendAtMs: null, reason: 'message_archived' },
      ownerNotification: { state: 'suppressed', lastErrorCode: 'message_archived' },
    });
    expect(store.get(`support_reply_operations/${prepared.operationId}`)?.state).toBe('cancelled');
    expect(store.get(`support_telegram_reviews/${prepared.reviewId}`)).toMatchObject({
      state: 'stale', autoSendAtMs: null, lastErrorCode: 'message_archived',
    });
    const job = [...store.entries()].find(([path]) => path.startsWith('support_telegram_reply_jobs/'));
    expect(job?.[1]).toMatchObject({ state: 'failed', lastErrorCode: 'message_archived' });
    store.set('admin_config/support_inbox', {
      ...(store.get('admin_config/support_inbox') ?? {}), autoReplyMode: 'live_guarded',
    });
    await expect(runSupportTelegramAutoSendDeadline(Date.now() + 4 * 60 * 60 * 1000)).resolves.toMatchObject({ queued: 0 });
    await supportTelegramReplyJobOnCreate({ data: {}, params: { jobId: job?.[0].split('/').pop() } });
    expect(mockSmtpSendMail).not.toHaveBeenCalled();
  });

  test('archive callables require admin identity and cannot forge answered status', async () => {
    const messageDocId = `m_${'6'.repeat(64)}`;
    store.set(`support_inbox/${messageDocId}`, { status: 'new', draftRevision: 0 });
    await expect(adminSupportArchiveMessages({
      auth: null,
      data: { items: [{ messageDocId, expectedStatus: 'new', expectedDraftRevision: 0 }] },
    })).rejects.toThrow('Admin only');
    await expect(adminSupportSetStatus({
      auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } },
      data: { messageDocId, status: 'answered', requestId: 'forge-answered-test' },
    })).rejects.toThrow('bad_status');
    expect(store.get(`support_inbox/${messageDocId}`)?.status).toBe('new');
  });

  test('bulk archive is idempotent and refuses an already dispatching SMTP operation', async () => {
    const messageDocId = `m_${'8'.repeat(64)}`;
    const prepared = await preparePremiumReview(messageDocId);
    const messagePath = `support_inbox/${messageDocId}`;
    const operationPath = `support_reply_operations/${prepared.operationId}`;
    store.set(operationPath, { ...(store.get(operationPath) ?? {}), state: 'dispatching' });
    store.set(messagePath, {
      ...(store.get(messagePath) ?? {}),
      replyGate: { ...(store.get(messagePath)?.replyGate as Record<string, unknown>), state: 'dispatching' },
    });
    const request = {
      auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } },
      data: {
        items: [{ messageDocId, expectedStatus: 'new', expectedDraftRevision: Number(store.get(messagePath)?.draftRevision ?? 0) }],
        requestId: 'archive-dispatching-test',
      },
    };
    await expect(adminSupportArchiveMessages(request)).resolves.toMatchObject({ ok: false, archived: 0, failed: 1 });
    expect(store.get(messagePath)?.status).toBe('new');
    expect(store.get(operationPath)?.state).toBe('dispatching');
    expect(mockSmtpSendMail).not.toHaveBeenCalled();
  });

  test('bulk archive accepts a mixed batch with current and historical Gmail document ids', async () => {
    const currentId = `m_${'7'.repeat(64)}`;
    const legacyId = 'legacy-message-id_example.test';
    store.set(`support_inbox/${currentId}`, { status: 'new', draftRevision: 0 });
    store.set(`support_inbox/${legacyId}`, { status: 'new', draftRevision: 0, messageId: '<legacy-message-id@example.test>' });
    const result = await adminSupportArchiveMessages({
      auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } },
      data: {
        items: [currentId, legacyId].map((messageDocId) => ({
          messageDocId, expectedStatus: 'new', expectedDraftRevision: 0,
        })),
        requestId: 'archive-mixed-id-test',
      },
    });
    expect(result).toMatchObject({ ok: true, requested: 2, archived: 2, failed: 0 });
    expect(store.get(`support_inbox/${currentId}`)?.status).toBe('archived');
    expect(store.get(`support_inbox/${legacyId}`)?.status).toBe('archived');
  });

  test('changing instructions invalidates Telegram approval and creates no send job', async () => {
    const prepared = await preparePremiumReview(`m_${'a'.repeat(64)}`);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { makeSupportOwnerInstructionsSnapshot } = require('./support_owner_instructions');
    const changed = makeSupportOwnerInstructionsSnapshot('Пишем теперь короче.', 1);
    store.set('admin_config/support_inbox', {
      ...(store.get('admin_config/support_inbox') ?? {}), supportOwnerInstructions: changed,
    });
    await expect(handleSupportTelegramAction({
      db: fakeDb(), nonce: prepared.approveNonce, requestedAction: 'approve',
      fromTelegramUserId: '1', fromTelegramChatId: '1', nowMs: Date.now(),
    })).resolves.toMatchObject({ ok: false, reason: 'already_used' });
    expect([...store.keys()].filter((path) => path.startsWith('support_telegram_reply_jobs/'))).toHaveLength(0);
    expect(store.get(`support_reply_operations/${prepared.operationId}`)?.state).toBe('cancelled');
    expect(mockSmtpSendMail).not.toHaveBeenCalled();
  });

  test('job queued under current instructions cannot send after instructions change', async () => {
    const prepared = await preparePremiumReview(`m_${'b'.repeat(64)}`);
    await expect(handleSupportTelegramAction({
      db: fakeDb(), nonce: prepared.approveNonce, requestedAction: 'approve',
      fromTelegramUserId: '1', fromTelegramChatId: '1', nowMs: Date.now(),
    })).resolves.toMatchObject({ ok: true });
    const jobEntry = [...store.entries()].find(([path]) => path.startsWith('support_telegram_reply_jobs/'));
    expect(jobEntry).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { makeSupportOwnerInstructionsSnapshot } = require('./support_owner_instructions');
    store.set('admin_config/support_inbox', {
      ...(store.get('admin_config/support_inbox') ?? {}),
      supportOwnerInstructions: makeSupportOwnerInstructionsSnapshot('Новая политика.', 1),
    });
    await supportTelegramReplyJobOnCreate({ data: {}, params: { jobId: jobEntry![0].split('/').pop() } });
    expect(mockSmtpSendMail).not.toHaveBeenCalled();
    expect(store.get(`support_reply_operations/${prepared.operationId}`)?.state).toBe('cancelled');
    expect(store.get(jobEntry![0])?.state).toBe('failed');
  });

  test('unchanged current instructions allow exactly one queued canary send', async () => {
    const prepared = await preparePremiumReview(`m_${'c'.repeat(64)}`);
    await handleSupportTelegramAction({
      db: fakeDb(), nonce: prepared.approveNonce, requestedAction: 'approve',
      fromTelegramUserId: '1', fromTelegramChatId: '1', nowMs: Date.now(),
    });
    const jobEntry = [...store.entries()].find(([path]) => path.startsWith('support_telegram_reply_jobs/'))!;
    await supportTelegramReplyJobOnCreate({ data: {}, params: { jobId: jobEntry[0].split('/').pop() } });
    expect(mockSmtpSendMail).toHaveBeenCalledTimes(1);
    expect(store.get(`support_reply_operations/${prepared.operationId}`)?.state).toBe('accepted');
  });

  test('deadline invalidates stale review and never queues or sends it', async () => {
    const prepared = await preparePremiumReview(`m_${'d'.repeat(64)}`);
    const reviewPath = [...store.keys()].find((path) => path.startsWith('support_telegram_reviews/'))!;
    store.set(reviewPath, { ...(store.get(reviewPath) ?? {}), autoSendAtMs: 1, telegramPreviewSafe: true });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { makeSupportOwnerInstructionsSnapshot } = require('./support_owner_instructions');
    store.set('admin_config/support_inbox', {
      ...(store.get('admin_config/support_inbox') ?? {}), autoReplyMode: 'live_guarded',
      supportOwnerInstructions: makeSupportOwnerInstructionsSnapshot('Новая политика.', 1),
    });
    await expect(runSupportTelegramAutoSendDeadline(Date.now())).resolves.toMatchObject({ queued: 0 });
    expect(store.get(reviewPath)?.state).toBe('stale');
    expect(store.get(`support_reply_operations/${prepared.operationId}`)?.state).toBe('cancelled');
    expect(mockSmtpSendMail).not.toHaveBeenCalled();
  });

  test('stale Jarvis batch child reaches claim but SMTP delivery remains zero', async () => {
    const messageDocId = `m_${'e'.repeat(64)}`;
    const prepared = await preparePremiumReview(messageDocId);
    // Cancel Telegram review operation so the same draft is eligible for the explicit batch preparation.
    store.set(`support_reply_operations/${prepared.operationId}`, {
      ...(store.get(`support_reply_operations/${prepared.operationId}`) ?? {}), state: 'cancelled',
    });
    const messagePath = `support_inbox/${messageDocId}`;
    store.set(messagePath, { ...(store.get(messagePath) ?? {}), replyGate: { state: 'cancelled' } });
    const adminRequest = { auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } } };
    const batch = await adminSupportPrepareReplyBatch({
      ...adminRequest, data: { limit: 10, idempotencyKey: 'batch-stale-instructions', requestId: 'batch-stale-instructions' },
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { makeSupportOwnerInstructionsSnapshot } = require('./support_owner_instructions');
    store.set('admin_config/support_inbox', {
      ...(store.get('admin_config/support_inbox') ?? {}),
      supportOwnerInstructions: makeSupportOwnerInstructionsSnapshot('После batch правила изменились.', 1),
    });
    const child = [...store.entries()].find(([path, data]) => path.startsWith('support_reply_operations/') && data.batchId === batch.batchId)!;
    const claim = await claimSupportReplyDispatch(fakeDb(), {
      operationId: child[1].operationId,
      confirmationNonce: child[1].confirmationNonce,
      payloadHash: child[1].payloadHash,
      invocationId: 'batch-stale-claim',
    }, { actorUid: 'admin-1', role: 'admin' });
    expect(mockSmtpSendMail).not.toHaveBeenCalled();
    expect(claim).toMatchObject({ kind: 'replay', state: 'cancelled' });
    expect(store.get(child[0])?.state).toBe('cancelled');
  });

  test('Premium payment alternatives are deterministically routed to the owner-approved Telegram bot', async () => {
    store.set('admin_config/support_inbox', {
      autoReplyMode: 'live_guarded', autoReplyRevision: 3, autoReplyDailyCap: 20,
      autoReplyPerSenderDailyCap: 3, signature: 'Phraseman Support', signatureRevision: 1,
    });
    mockOpenAiChat.mockResolvedValueOnce({
      text: JSON.stringify({ isSpam: false, confidence: 0.99, reason: 'payment question' }),
      promptTokens: 30, completionTokens: 10,
    });

    await supportInboxOnNewMail(makeEvent('m-premium-russia', {
      messageId: '<premium-russia@example.test>', fromEmail: 'learner@example.com',
      subject: 'Не могу купить Premium в России', bodyText: 'Какие ещё есть способы оплаты?',
      receivedAtMs: Date.now(), status: 'new', mailCategory: 'human',
    }));

    expect(mockOpenAiChat).toHaveBeenCalledTimes(1); // deterministic route needs no writer/reviewer calls
    expect(mockSmtpSendMail).not.toHaveBeenCalled();
    expect(mockSendJarvisDigest).toHaveBeenCalledTimes(1);
    const telegram = mockSendJarvisDigest.mock.calls[0][0] as Record<string, unknown>;
    expect(String(telegram.text)).toContain('@PhrasemanPremiumBot');
    expect(String(telegram.text)).toContain('https://t.me/PhrasemanPremiumBot');
    expect(store.get('support_inbox/m-premium-russia')).toMatchObject({
      status: 'new',
      autoReply: { state: 'awaiting_approval', grounded: true, reason: 'authoritative_premium_payment_route' },
    });
  });

  test('exhausted monthly budget still notifies — real mail must not be lost — but skips the LLM entirely', async () => {
    store.set('jarvis_llm_budget/2026-08', { spentUsd: 999 });
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-08-15T12:00:00Z').getTime());

    await supportInboxOnNewMail(makeEvent('m4', {
      fromEmail: 'client@example.com', subject: 'Вопрос', bodyText: 'Текст вопроса', status: 'new',
    }));

    expect(mockOpenAiChat).not.toHaveBeenCalled();
    expect(mockSendTelegramAlert).not.toHaveBeenCalled();
    expect(mockSendJarvisDigest).toHaveBeenCalledTimes(1);
    jest.spyOn(Date, 'now').mockRestore();
  });

  test('an unexpected OpenAI failure still notifies plainly instead of silently dropping the mail', async () => {
    mockOpenAiChat.mockRejectedValueOnce(new Error('OpenAI down'));
    await supportInboxOnNewMail(makeEvent('m5', {
      fromEmail: 'client@example.com', subject: 'Помогите', bodyText: 'Не получается войти', status: 'new',
    }));
    expect(mockSendJarvisDigest).not.toHaveBeenCalled();
    expect(mockSendTelegramAlert).toHaveBeenCalledTimes(1);
    const [, text] = mockSendTelegramAlert.mock.calls[0];
    expect(text).toContain('Gmail Support Inbox');
    expect(text).not.toContain('Помогите');
  });

  test('a missing OpenAI key still sends a plain owner notification and records delivery', async () => {
    secretValues.set('OPENAI_API_KEY', '');
    await supportInboxOnNewMail(makeEvent('m-no-ai', {
      fromEmail: 'client@example.com', subject: 'Need help', bodyText: 'Cannot sign in', status: 'new',
    }));

    expect(mockOpenAiChat).not.toHaveBeenCalled();
    expect(mockSendTelegramAlert).not.toHaveBeenCalled();
    expect(mockSendJarvisDigest).toHaveBeenCalledTimes(1);
    expect(store.get('support_inbox/m-no-ai')?.ownerNotification).toMatchObject({
      state: 'delivered',
      attempts: 1,
    });
  });

  test('persists a failed Telegram attempt and rejects so delivery failure is never silent', async () => {
    secretValues.set('OPENAI_API_KEY', '');
    mockSendJarvisDigest.mockResolvedValueOnce(false);
    mockSendTelegramAlert.mockResolvedValueOnce(false);

    await expect(supportInboxOnNewMail(makeEvent('m-telegram-fail', {
      fromEmail: 'client@example.com', subject: 'Need help', bodyText: 'Cannot sign in', status: 'new',
    }))).rejects.toThrow('support_owner_notification_failed');

    expect(mockSendTelegramAlert).toHaveBeenCalledTimes(1);
    expect(mockSendJarvisDigest).toHaveBeenCalledTimes(1);
    expect(store.get('support_inbox/m-telegram-fail')?.ownerNotification).toMatchObject({
      state: 'failed',
      attempts: 1,
      lastErrorCode: 'telegram_delivery_failed',
    });
  });

  test('backs off a failed alert and retries only the owner notification, never customer email', async () => {
    const nowMs = 1_800_000_000_000;
    store.set('support_inbox/m-retry', {
      status: 'new', fromEmail: 'private@example.com', subject: 'Private', bodyText: 'Private body',
      ownerNotification: { state: 'pending', attempts: 0, updatedAt: new Date(nowMs).toISOString() },
    });
    mockSendTelegramAlert.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await expect(deliverSupportOwnerAlert({
      db: fakeDb(), messageDocId: 'm-retry', botToken: 'token', text: 'generic inbox notice', nowMs,
    })).rejects.toThrow('support_owner_notification_failed');
    await expect(deliverSupportOwnerAlert({
      db: fakeDb(), messageDocId: 'm-retry', botToken: 'token', text: 'generic inbox notice', nowMs: nowMs + 1,
    })).resolves.toBe('skipped');
    await expect(deliverSupportOwnerAlert({
      db: fakeDb(), messageDocId: 'm-retry', botToken: 'token', text: 'generic inbox notice', nowMs: nowMs + 5 * 60 * 1000,
    })).resolves.toBe('delivered');

    expect(mockSendTelegramAlert).toHaveBeenCalledTimes(2);
    expect(store.get('support_inbox/m-retry')?.ownerNotification).toMatchObject({ state: 'delivered', attempts: 2 });
  });

  test('stops automatic owner-alert retries after the bounded attempt cap', async () => {
    store.set('support_inbox/m-terminal', {
      status: 'new',
      ownerNotification: { state: 'failed', attempts: 7, updatedAt: new Date().toISOString(), nextAttemptAtMs: 0 },
    });
    mockSendTelegramAlert.mockResolvedValueOnce(false);
    await expect(deliverSupportOwnerAlert({
      db: fakeDb(), messageDocId: 'm-terminal', botToken: 'token', text: 'generic inbox notice', nowMs: Date.now(),
    })).rejects.toThrow('support_owner_notification_failed');
    expect(store.get('support_inbox/m-terminal')?.ownerNotification).toMatchObject({ state: 'exhausted', attempts: 8 });
    await expect(deliverSupportOwnerAlert({
      db: fakeDb(), messageDocId: 'm-terminal', botToken: 'token', text: 'generic inbox notice', nowMs: Date.now() + 24 * 60 * 60 * 1000,
    })).resolves.toBe('skipped');
    expect(mockSendJarvisDigest).not.toHaveBeenCalled();
    expect(mockSendTelegramAlert).toHaveBeenCalledTimes(1);
  });

  test('a borderline spam verdict (below the confidence threshold) is kept, not archived', async () => {
    mockOpenAiChat
      .mockResolvedValueOnce({
        text: JSON.stringify({ isSpam: true, confidence: 0.5, reason: 'похоже на спам, но не уверен' }),
        promptTokens: 50, completionTokens: 20,
      })
      .mockResolvedValueOnce({ text: 'черновик', promptTokens: 10, completionTokens: 10 });
    await supportInboxOnNewMail(makeEvent('m6', {
      fromEmail: 'maybe@example.com', subject: 'Странное письмо', bodyText: 'текст', status: 'new',
    }));
    expect(store.get('support_inbox/m6')?.status).not.toBe('archived');
    expect(mockSendJarvisDigest).toHaveBeenCalledTimes(1);
    expect(mockSendTelegramAlert).not.toHaveBeenCalled();
  });
});
