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
    // id обязателен: реальный DocumentSnapshot его имеет, и без него фейк
    // молча прятал бы ошибки в коде, который читает snapshot.id.
    get: async () => ({ id: path.split('/').pop() || path, exists: store.has(path), data: () => store.get(path) }),
    set: async (data: DocData, opts?: { merge?: boolean }) => {
      const prev = opts?.merge ? (store.get(path) ?? {}) : {};
      store.set(path, { ...prev, ...data });
    },
  };
}

function fakeDb() {
  const queryFor = (name: string, filters: Array<[string, unknown]> = [], max = Number.POSITIVE_INFINITY) => ({
    where: (field: string, op: string, value: unknown) => {
      if (!['==', 'in', '<=', '>'].includes(op)) throw new Error(`unsupported fake query operator: ${op}`);
      return queryFor(name, [...filters, [`${field}\u0000${op}`, value]], max);
    },
    limit: (value: number) => queryFor(name, filters, value),
    get: async () => {
      const docs = [...store.entries()]
        .filter(([path]) => path.startsWith(`${name}/`) && !path.slice(name.length + 1).includes('/'))
        .filter(([, data]) => filters.every(([encodedField, value]) => {
          const [field, op = '=='] = String(encodedField).split('\u0000');
          const actual = field.split('.').reduce<unknown>((cursor, key) => (
            cursor && typeof cursor === 'object' ? (cursor as Record<string, unknown>)[key] : undefined
          ), data);
          if (op === 'in') return Array.isArray(value) && value.includes(actual);
          if (op === '<=') return typeof actual === 'number' && actual <= Number(value);
          if (op === '>') return typeof actual === 'number' && actual > Number(value);
          return actual === value;
        }))
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
  let runSupportAutoReplyRetryCron: (nowMs?: number) => Promise<{ scanned: number; attempted: number }>;
  let adminSupportGenerateReply: (request: unknown) => Promise<Record<string, unknown>>;
  let adminSupportSaveDraft: (request: unknown) => Promise<Record<string, unknown>>;
  let adminSupportPrepareReply: (request: unknown) => Promise<Record<string, unknown>>;
  let adminSupportSaveInstructions: (request: unknown) => Promise<Record<string, unknown>>;
  let adminSupportArchiveMessages: (request: unknown) => Promise<Record<string, unknown>>;
  let adminSupportSetStatus: (request: unknown) => Promise<Record<string, unknown>>;
  let adminSupportPrepareReplyBatch: (request: unknown) => Promise<Record<string, unknown>>;
  let adminSupportDispatchReplyBatch: (request: unknown) => Promise<Record<string, unknown>>;
  let adminSupportCancelReply: (request: unknown) => Promise<Record<string, unknown>>;
  let adminSupportCancelReplyBatch: (request: unknown) => Promise<Record<string, unknown>>;
  let adminSupportResolveReplyDelivery: (request: unknown) => Promise<Record<string, unknown>>;
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
    runSupportAutoReplyRetryCron = mod.runSupportAutoReplyRetryCron;
    adminSupportGenerateReply = mod.adminSupportGenerateReply;
    adminSupportSaveDraft = mod.adminSupportSaveDraft;
    adminSupportPrepareReply = mod.adminSupportPrepareReply;
    adminSupportSaveInstructions = mod.adminSupportSaveInstructions;
    adminSupportArchiveMessages = mod.adminSupportArchiveMessages;
    adminSupportSetStatus = mod.adminSupportSetStatus;
    adminSupportPrepareReplyBatch = mod.adminSupportPrepareReplyBatch;
    adminSupportDispatchReplyBatch = mod.adminSupportDispatchReplyBatch;
    adminSupportCancelReply = mod.adminSupportCancelReply;
    adminSupportCancelReplyBatch = mod.adminSupportCancelReplyBatch;
    adminSupportResolveReplyDelivery = mod.adminSupportResolveReplyDelivery;
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

  test('a late spam verdict cannot undo an owner archive-and-restore action', async () => {
    let finishSpam!: (value: { text: string; promptTokens: number; completionTokens: number }) => void;
    mockOpenAiChat.mockImplementationOnce(() => new Promise((resolve) => { finishSpam = resolve; }));
    const trigger = supportInboxOnNewMail(makeEvent('m-owner-status-wins', {
      fromEmail: 'sender@example.com', subject: 'Maybe spam', bodyText: 'Owner is reviewing this.', status: 'new',
    }));
    while (mockOpenAiChat.mock.calls.length === 0) await Promise.resolve();
    const auth = { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } };
    await adminSupportSetStatus({
      auth, data: { messageDocId: 'm-owner-status-wins', status: 'archived', expectedStatus: 'new', requestId: 'owner-archive-before-triage' },
    });
    await adminSupportSetStatus({
      auth, data: { messageDocId: 'm-owner-status-wins', status: 'new', expectedStatus: 'archived', requestId: 'owner-restore-before-triage' },
    });
    finishSpam({
      text: JSON.stringify({ isSpam: true, confidence: 0.99, reason: 'late verdict' }),
      promptTokens: 50, completionTokens: 20,
    });
    await trigger;
    expect(store.get('support_inbox/m-owner-status-wins')).toMatchObject({ status: 'new', statusRevision: 2 });
    expect(store.get('support_inbox/m-owner-status-wins')?.triageState).toBeUndefined();
    expect(store.get('support_inbox/m-owner-status-wins')?.autoReply).toBeUndefined();
  });

  // зачем: раньше guarded-тема заканчивалась тишиной — клиент не получал
  // ничего, а письмо навсегда оседало в attention_required. Теперь Джарвис
  // по-прежнему не выдумывает факты, но обязательно отвечает промежуточным
  // ответом, который ничего не утверждает о продукте.
  test('a billing case answers with a holding reply instead of leaving the customer in silence', async () => {
    mockOpenAiChat.mockResolvedValueOnce({
      text: JSON.stringify({ isSpam: false, confidence: 0.95, reason: 'вопрос по оплате' }),
      promptTokens: 50, completionTokens: 20,
    });

    await supportInboxOnNewMail(makeEvent('m3', {
      fromEmail: 'client@example.com', subject: 'Не работает подписка', bodyText: 'Оплатил Plus, доступа нет', status: 'new',
    }));

    expect(store.get('support_inbox/m3')?.status).not.toBe('archived');
    // Guarded-тема не доходит до писателя: единственный вызов модели — антиспам.
    expect(mockOpenAiChat).toHaveBeenCalledTimes(1);
    expect(store.get('support_inbox/m3')?.autoReply).toMatchObject({
      state: 'awaiting_approval', grounded: false, holding: true, reason: 'guarded_billing',
    });
    const draft = String(store.get('support_inbox/m3')?.draftReply ?? '');
    expect(draft).toContain('вручную');
    // Промежуточный ответ ничего не утверждает о покупке.
    expect(draft).not.toMatch(/мы (?:проверили|вернули|исправили)/iu);
    expect([...store.keys()].some((path) => path.startsWith('support_telegram_reviews/'))).toBe(true);
    expect(mockSendJarvisDigest).toHaveBeenCalledTimes(1);
    const digest = mockSendJarvisDigest.mock.calls[0][0] as { text?: string; keyboard?: unknown };
    const text = String(digest.text ?? '');
    expect(text).toContain('Промежуточный ответ Джарвиса');
    expect(text).not.toContain('Готового ответа нет');
    expect(digest.keyboard).toBeTruthy();
    expect(mockSendTelegramAlert).not.toHaveBeenCalled();
  });

  test('manual admin generation also refuses to save a guarded holding reply as ready', async () => {
    store.set('support_inbox/m-admin-billing', {
      fromEmail: 'client@example.com', subject: 'Не работает подписка', bodyText: 'Оплатил Plus, доступа нет',
      status: 'new', draftRevision: 0,
    });

    await expect(adminSupportGenerateReply({
      auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } },
      data: { messageDocId: 'm-admin-billing', requestId: 'manual-guarded-generation' },
    })).resolves.toMatchObject({
      ok: true, generated: 0, remaining: 1, attentionRequired: true, reason: 'guarded_billing',
    });

    expect(mockOpenAiChat).not.toHaveBeenCalled();
    expect(store.get('support_inbox/m-admin-billing')?.draftReply).toBeUndefined();
    expect(store.get('support_inbox/m-admin-billing')?.draftRevision).toBe(0);
    expect([...store.keys()].some((path) => path.startsWith('support_reply_operations/'))).toBe(false);
  });

  test('inline admin edits must become a new owner-manual revision before prepare can seal them', async () => {
    const messageDocId = `m_${'f'.repeat(64)}`;
    store.set(`support_inbox/${messageDocId}`, {
      status: 'new', fromEmail: 'learner@example.com', messageId: '<inline-edit@example.test>',
      subject: 'Practice', bodyText: 'How do I practise?',
      draftReply: 'Stored reviewed answer.', draftRevision: 1,
      draftOrigin: 'jarvis', draftPolicyVersion: 6,
      autoReply: { state: 'awaiting_approval', grounded: true, reason: 'grounded_and_reviewed' },
    });
    const adminRequest = { auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } } };

    await expect(adminSupportPrepareReply({
      ...adminRequest,
      data: {
        messageDocId, replyText: 'Owner changed this inline.', expectedDraftRevision: 1,
        idempotencyKey: 'inline-edit-before-save', requestId: 'inline-edit-before-save',
      },
    })).rejects.toThrow('reply_text_changed_save_before_sending');

    await expect(adminSupportSaveDraft({
      ...adminRequest,
      data: {
        messageDocId, replyText: 'Owner changed this inline.', expectedDraftRevision: 1,
        requestId: 'inline-edit-save',
      },
    })).resolves.toMatchObject({ ok: true, draftRevision: 2, reviewState: 'awaiting_approval' });
    expect(store.get(`support_inbox/${messageDocId}`)).toMatchObject({
      draftReply: 'Owner changed this inline.', draftRevision: 2, draftOrigin: 'owner_manual',
    });
    const operation = [...store.values()].find((value) => value.messageDocId === messageDocId && value.payloadHash);
    expect(operation).toMatchObject({ state: 'prepared', draftRevision: 2, draftOrigin: 'owner_manual' });
  });

  test('single prepare rejects a legacy non-grounded Jarvis draft before creating an operation', async () => {
    const messageDocId = `m_${'7'.repeat(64)}`;
    store.set(`support_inbox/${messageDocId}`, {
      status: 'new', fromEmail: 'learner@example.com', messageId: '<single-attention@example.test>',
      subject: 'Billing issue', bodyText: 'My subscription is missing.',
      draftReply: 'Legacy holding text.', draftRevision: 1,
      draftOrigin: 'jarvis', draftPolicyVersion: 5,
      autoReply: { state: 'attention_required', grounded: false, reason: 'guarded_billing' },
    });
    await expect(adminSupportPrepareReply({
      auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } },
      data: {
        messageDocId, replyText: 'Legacy holding text.', expectedDraftRevision: 1,
        idempotencyKey: 'single-attention-reject', requestId: 'single-attention-reject',
      },
    })).rejects.toThrow('support_quality_not_customer_ready');
    expect([...store.keys()].some((path) => path.startsWith('support_reply_operations/'))).toBe(false);
    expect(store.get(`support_inbox/${messageDocId}`)?.replyGate).toBeUndefined();
  });

  test('single prepare rejects a conversation draft when its authoritative head is missing', async () => {
    const messageDocId = `m_${'8'.repeat(64)}`;
    store.set(`support_inbox/${messageDocId}`, {
      status: 'new', fromEmail: 'learner@example.com', messageId: '<missing-head@example.test>',
      subject: 'Practice', bodyText: 'How do I practise?',
      conversationId: 'missing-conversation-head', conversationRevision: 1,
      draftReply: 'Open Phraseman and choose a practice activity.', draftRevision: 1,
      draftOrigin: 'owner_manual',
    });
    await expect(adminSupportPrepareReply({
      auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } },
      data: {
        messageDocId, replyText: 'Open Phraseman and choose a practice activity.', expectedDraftRevision: 1,
        idempotencyKey: 'single-missing-head-reject', requestId: 'single-missing-head-reject',
      },
    })).rejects.toThrow('conversation_changed_reload_before_sending');
    expect([...store.keys()].some((path) => path.startsWith('support_reply_operations/'))).toBe(false);
  });

  test('owner edit cannot write a stale conversation turn when its authoritative head is missing', async () => {
    const messageDocId = `m_${'3'.repeat(64)}`;
    store.set(`support_inbox/${messageDocId}`, {
      status: 'new', fromEmail: 'learner@example.com', messageId: '<stale-edit@example.test>',
      subject: 'Practice', bodyText: 'How do I practise?',
      conversationId: 'missing-edit-head', conversationRevision: 1,
      draftReply: 'Old answer.', draftRevision: 1, draftOrigin: 'owner_manual',
    });
    await expect(adminSupportSaveDraft({
      auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } },
      data: {
        messageDocId, replyText: 'Owner edit on stale turn.', expectedDraftRevision: 1,
        requestId: 'stale-conversation-edit',
      },
    })).rejects.toThrow('conversation_changed_reload_before_editing');
    expect(store.get(`support_inbox/${messageDocId}`)).toMatchObject({
      draftReply: 'Old answer.', draftRevision: 1,
    });
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

  test('a stale Telegram finalizer cannot overwrite a newer owner revision or gate', async () => {
    store.set('admin_config/support_inbox', {
      autoReplyMode: 'live_guarded', autoReplyRevision: 2, signature: 'Phraseman Support', signatureRevision: 1,
    });
    mockOpenAiChat
      .mockResolvedValueOnce({
        text: JSON.stringify({ isSpam: false, confidence: 0.99, reason: 'product question' }),
        promptTokens: 40, completionTokens: 10,
      })
      .mockImplementationOnce(async (request: unknown) => {
        const messages = (request as { messages?: Array<{ content?: string }> }).messages ?? [];
        const rawIds = String(messages[0]?.content ?? '').match(/Allowed evidence IDs:\s*([^\n.]+)/)?.[1] ?? '';
        const evidenceId = rawIds.split(',').map((value) => value.trim()).find(Boolean) ?? '';
        return {
          text: JSON.stringify({
            reply: 'Hello! Open Phraseman and choose a practice activity.',
            evidenceIds: evidenceId ? [evidenceId] : [], confidence: 0.94, needsHuman: false,
          }),
          promptTokens: 120, completionTokens: 35,
        };
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ approved: true, correctedReply: '', reasons: [] }),
        promptTokens: 80, completionTokens: 15,
      });
    mockSendJarvisDigest.mockImplementationOnce(async () => {
      const current = store.get('support_inbox/m-finalize-race') ?? {};
      store.set('support_inbox/m-finalize-race', {
        ...current,
        draftReply: 'A newer owner-authored answer.', draftRevision: 2, draftOrigin: 'owner_manual',
        replyGate: { sequence: 2, operationId: 'new-owner-operation', state: 'prepared', payloadHash: 'new-owner-hash' },
        autoReply: { state: 'awaiting_approval', reviewId: 'new-owner-review', grounded: false, reason: 'owner_manual_edit' },
      });
      return true;
    });

    await supportInboxOnNewMail(makeEvent('m-finalize-race', {
      messageId: '<finalize-race@example.test>', fromEmail: 'learner@example.com',
      subject: 'How can I practise?', bodyText: 'Which learning activities are available in the app?',
      receivedAtMs: Date.now(), status: 'new', mailCategory: 'human',
    }));

    expect(store.get('support_inbox/m-finalize-race')).toMatchObject({
      draftReply: 'A newer owner-authored answer.', draftRevision: 2, draftOrigin: 'owner_manual',
      replyGate: { operationId: 'new-owner-operation', state: 'prepared', payloadHash: 'new-owner-hash' },
      autoReply: { state: 'awaiting_approval', reviewId: 'new-owner-review', reason: 'owner_manual_edit' },
    });
    const oldOperation = [...store.values()].find((value) => value.messageDocId === 'm-finalize-race' && value.operationId !== 'new-owner-operation');
    expect(oldOperation?.state).toBe('cancelled');
  });

  test('a repairable reviewer rejection is rewritten and independently reviewed before any draft is saved', async () => {
    let repairWriterPrompt = '';
    const writerResult = (request: unknown, reply: string) => {
      const messages = (request as { messages?: Array<{ content?: string }> }).messages ?? [];
      const system = String(messages[0]?.content ?? '');
      const rawIds = system.match(/Allowed evidence IDs:\s*([^\n.]+)/)?.[1] ?? '';
      const evidenceId = rawIds.split(',').map((value) => value.trim()).find(Boolean) ?? '';
      return {
        text: JSON.stringify({
          reply,
          evidenceIds: evidenceId ? [evidenceId] : [], confidence: 0.94, needsHuman: false,
        }),
        promptTokens: 120,
        completionTokens: 35,
      };
    };
    mockOpenAiChat
      .mockResolvedValueOnce({
        text: JSON.stringify({ isSpam: false, confidence: 0.99, reason: 'product question' }),
        promptTokens: 40, completionTokens: 10,
      })
      .mockImplementationOnce(async (request: unknown) => writerResult(
        request, 'Hello! Open the practice section in Phraseman and choose a learning activity.',
      ))
      .mockResolvedValueOnce({
        text: JSON.stringify({
          approved: false,
          correctedReply: 'Send the customer to an unsupported external website.',
          reasons: ['answer_needs_clearer_next_step'],
        }),
        promptTokens: 80, completionTokens: 15,
      })
      .mockImplementationOnce(async (request: unknown) => {
        const messages = (request as { messages?: Array<{ content?: string }> }).messages ?? [];
        repairWriterPrompt = String(messages[1]?.content ?? '');
        return writerResult(
          request, 'Hello! In Phraseman, open Lessons and choose one of the available practice activities.',
        );
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ approved: true, correctedReply: '', reasons: [] }),
        promptTokens: 80, completionTokens: 15,
      });

    await supportInboxOnNewMail(makeEvent('m-auto-repair', {
      messageId: '<incoming-repair@example.test>', fromEmail: 'learner@example.com',
      subject: 'How can I practise?', bodyText: 'Which learning activities are available in the app?',
      receivedAtMs: Date.now(), status: 'new', mailCategory: 'human',
    }));

    expect(mockOpenAiChat).toHaveBeenCalledTimes(5);
    expect(repairWriterPrompt).toContain('UNTRUSTED AUTOMATIC REPAIR FEEDBACK');
    expect(repairWriterPrompt).toContain('answer_needs_clearer_next_step');
    expect(store.get('support_inbox/m-auto-repair')).toMatchObject({
      draftReply: 'Hello! In Phraseman, open Lessons and choose one of the available practice activities.',
      draftRevision: 1,
      autoReply: { state: 'awaiting_approval', grounded: true, reason: 'grounded_and_reviewed' },
    });
    expect(String(store.get('support_inbox/m-auto-repair')?.draftReply)).not.toContain('unsupported external website');
    expect([...store.keys()].filter((path) => path.startsWith('support_reply_operations/'))).toHaveLength(1);
    expect([...store.keys()].filter((path) => path.startsWith('support_telegram_reviews/'))).toHaveLength(1);
    expect(mockSendJarvisDigest).toHaveBeenCalledTimes(1);
    expect((mockSendJarvisDigest.mock.calls[0][0] as Record<string, unknown>).keyboard).toBeTruthy();
  });

  test('two reviewer rejections require attention without saving or preparing either candidate', async () => {
    const writerResult = (request: unknown, reply: string) => {
      const messages = (request as { messages?: Array<{ content?: string }> }).messages ?? [];
      const system = String(messages[0]?.content ?? '');
      const rawIds = system.match(/Allowed evidence IDs:\s*([^\n.]+)/)?.[1] ?? '';
      const evidenceId = rawIds.split(',').map((value) => value.trim()).find(Boolean) ?? '';
      return {
        text: JSON.stringify({
          reply,
          evidenceIds: evidenceId ? [evidenceId] : [], confidence: 0.94, needsHuman: false,
        }),
        promptTokens: 120,
        completionTokens: 35,
      };
    };
    mockOpenAiChat
      .mockResolvedValueOnce({
        text: JSON.stringify({ isSpam: false, confidence: 0.99, reason: 'product question' }),
        promptTokens: 40, completionTokens: 10,
      })
      .mockImplementationOnce(async (request: unknown) => writerResult(
        request, 'Hello! Open the practice section in Phraseman.',
      ))
      .mockResolvedValueOnce({
        text: JSON.stringify({ approved: false, correctedReply: '', reasons: ['unsupported_navigation'] }),
        promptTokens: 80, completionTokens: 15,
      })
      .mockImplementationOnce(async (request: unknown) => writerResult(
        request, 'Hello! Open Lessons and choose a practice activity.',
      ))
      .mockResolvedValueOnce({
        text: JSON.stringify({ approved: false, correctedReply: '', reasons: ['still_not_grounded'] }),
        promptTokens: 80, completionTokens: 15,
      });

    await supportInboxOnNewMail(makeEvent('m-auto-repair-exhausted', {
      messageId: '<incoming-repair-exhausted@example.test>', fromEmail: 'learner@example.com',
      subject: 'How can I practise?', bodyText: 'Which learning activities are available in the app?',
      receivedAtMs: Date.now(), status: 'new', mailCategory: 'human',
    }));

    expect(mockOpenAiChat).toHaveBeenCalledTimes(5);
    // Исчерпанная авто-доработка больше не означает молчание: не подтверждённый
    // фактами текст выбрасывается, но клиент получает промежуточный ответ.
    expect(store.get('support_inbox/m-auto-repair-exhausted')).toMatchObject({
      autoReply: {
        state: 'awaiting_approval', grounded: false, holding: true,
        reason: 'auto_repair_exhausted_review_rejected',
      },
    });
    const exhaustedDraft = String(store.get('support_inbox/m-auto-repair-exhausted')?.draftReply ?? '');
    expect(exhaustedDraft).toContain('The team will review it');
    expect(exhaustedDraft).not.toContain('Open Lessons');
    expect([...store.keys()].some((path) => path.startsWith('support_telegram_reviews/'))).toBe(true);
    expect(mockSendJarvisDigest).toHaveBeenCalledTimes(1);
    const text = String((mockSendJarvisDigest.mock.calls[0][0] as { text?: string }).text ?? '');
    expect(text).toContain('Промежуточный ответ Джарвиса');
    expect(text).not.toContain('Готового ответа нет');
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
    const messageDocId = `m_${'c'.repeat(64)}`;
    const prepared = await preparePremiumReview(messageDocId);
    await handleSupportTelegramAction({
      db: fakeDb(), nonce: prepared.approveNonce, requestedAction: 'approve',
      fromTelegramUserId: '1', fromTelegramChatId: '1', nowMs: Date.now(),
    });
    const jobEntry = [...store.entries()].find(([path]) => path.startsWith('support_telegram_reply_jobs/'))!;
    await supportTelegramReplyJobOnCreate({ data: {}, params: { jobId: jobEntry[0].split('/').pop() } });
    expect(mockSmtpSendMail).toHaveBeenCalledTimes(1);
    expect(store.get(`support_reply_operations/${prepared.operationId}`)?.state).toBe('accepted');
    expect(store.get(`support_inbox/${messageDocId}`)?.autoReply).toMatchObject({
      state: 'accepted', operationId: prepared.operationId, autoSendAtMs: null,
    });
  });

  test('ambiguous SMTP delivery atomically blocks retries and marks the message for attention', async () => {
    const messageDocId = `m_${'f'.repeat(64)}`;
    const prepared = await preparePremiumReview(messageDocId);
    await handleSupportTelegramAction({
      db: fakeDb(), nonce: prepared.approveNonce, requestedAction: 'approve',
      fromTelegramUserId: '1', fromTelegramChatId: '1', nowMs: Date.now(),
    });
    const jobEntry = [...store.entries()].find(([path]) => path.startsWith('support_telegram_reply_jobs/'))!;
    mockSmtpSendMail.mockRejectedValueOnce(new Error('smtp_socket_reset_after_write'));
    await supportTelegramReplyJobOnCreate({ data: {}, params: { jobId: jobEntry[0].split('/').pop() } });
    expect(mockSmtpSendMail).toHaveBeenCalledTimes(1);
    expect(store.get(`support_reply_operations/${prepared.operationId}`)?.state).toBe('delivery_unknown');
    expect(store.get(`support_inbox/${messageDocId}`)?.autoReply).toMatchObject({
      state: 'attention_required', reason: 'delivery_unknown', autoSendAtMs: null,
    });
    expect((store.get(`support_inbox/${messageDocId}`)?.replyGate as Record<string, unknown>)?.state).toBe('delivery_unknown');
    await expect(adminSupportResolveReplyDelivery({
      auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } },
      data: {
        operationId: prepared.operationId,
        resolution: 'verified_not_sent',
        reason: 'Provider confirms that no message was accepted.',
        requestId: 'resolve-not-sent-test',
      },
    })).resolves.toMatchObject({ ok: true, state: 'verified_not_sent' });
    expect(store.get(`support_inbox/${messageDocId}`)?.autoReply).toMatchObject({
      state: 'awaiting_approval', reason: 'delivery_verified_not_sent', autoSendAtMs: null,
    });
    expect((store.get(`support_inbox/${messageDocId}`)?.replyGate as Record<string, unknown>)?.state).toBe('verified_not_sent');
  });

  test('switching automation off wins inside the auto-deadline SMTP claim', async () => {
    const messageDocId = `m_${'a'.repeat(64)}`;
    const prepared = await preparePremiumReview(messageDocId);
    const operation = store.get(`support_reply_operations/${prepared.operationId}`)!;
    store.set('admin_config/support_inbox', {
      ...(store.get('admin_config/support_inbox') ?? {}), autoReplyMode: 'off',
    });
    const claim = await claimSupportReplyDispatch(fakeDb(), {
      operationId: prepared.operationId,
      confirmationNonce: operation.confirmationNonce,
      payloadHash: operation.payloadHash,
      invocationId: 'auto-deadline-after-mode-off',
    }, { actorUid: 'system:jarvis-support-3h-deadline', role: 'admin' });
    expect(claim).toMatchObject({ kind: 'replay', state: 'cancelled' });
    expect(store.get(`support_reply_operations/${prepared.operationId}`)?.state).toBe('cancelled');
    expect(store.get(`support_inbox/${messageDocId}`)?.autoReply).toMatchObject({
      state: 'paused', autoSendAtMs: null, reason: 'automation_mode_changed',
    });
    expect(mockSmtpSendMail).not.toHaveBeenCalled();
  });

  test('signature change cancels a Jarvis operation into regeneration retry instead of terminal attention', async () => {
    const messageDocId = `m_${'4'.repeat(64)}`;
    const prepared = await preparePremiumReview(messageDocId);
    const operation = store.get(`support_reply_operations/${prepared.operationId}`)!;
    store.set('admin_config/support_inbox', {
      ...(store.get('admin_config/support_inbox') ?? {}), signatureRevision: 2,
    });
    const claim = await claimSupportReplyDispatch(fakeDb(), {
      operationId: prepared.operationId,
      confirmationNonce: operation.confirmationNonce,
      payloadHash: operation.payloadHash,
      invocationId: 'signature-changed-before-claim',
    }, { actorUid: 'admin-1', role: 'admin' });
    expect(claim).toMatchObject({ kind: 'replay', state: 'cancelled' });
    expect(store.get(`support_inbox/${messageDocId}`)?.autoReply).toMatchObject({
      state: 'retry', reason: 'draft_or_signature_changed', autoSendAtMs: null,
    });
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

  test('retry cron cancels a stale-policy prepared review and regenerates one current version', async () => {
    const messageDocId = `m_${'1'.repeat(64)}`;
    const prepared = await preparePremiumReview(messageDocId);
    const messagePath = `support_inbox/${messageDocId}`;
    store.set(messagePath, { ...(store.get(messagePath) ?? {}), draftPolicyVersion: 4 });

    await expect(runSupportAutoReplyRetryCron(Date.now())).resolves.toMatchObject({ attempted: 1 });

    expect(store.get(`support_reply_operations/${prepared.operationId}`)?.state).toBe('cancelled');
    const operations = [...store.entries()]
      .filter(([path]) => path.startsWith('support_reply_operations/'))
      .map(([, value]) => value);
    expect(operations.filter((operation) => operation.state === 'prepared')).toHaveLength(1);
    expect(store.get(messagePath)).toMatchObject({
      draftRevision: 2,
      draftPolicyVersion: 6,
      autoReply: { state: 'awaiting_approval', grounded: true },
    });
    expect(mockSendJarvisDigest).toHaveBeenCalledTimes(2);
  });

  test('retry cron never restarts an archived-and-reopened suppressed message', async () => {
    store.set('support_inbox/m-reopened-suppressed', {
      status: 'new', triageState: 'kept', mailCategory: 'human',
      fromEmail: 'learner@example.com', messageId: '<reopened-suppressed@example.test>',
      subject: 'Practice', bodyText: 'How do I practise?',
      autoReply: { state: 'suppressed', attempts: 0, reason: 'message_archived' },
    });
    await expect(runSupportAutoReplyRetryCron(Date.now())).resolves.toMatchObject({ attempted: 0 });
    expect(mockOpenAiChat).not.toHaveBeenCalled();
    expect([...store.keys()].some((path) => path.startsWith('support_reply_operations/'))).toBe(false);
  });

  // зачем: письмо, заблокированное старой политикой, оставалось в
  // attention_required навсегда — его никто не переоткрывал, и клиент не
  // получал ничего. Теперь ретрай-крон возвращает такой backlog в работу
  // сразу, в этом же прогоне.
  test('retry cron re-opens a message parked by an older policy and answers it in the same run', async () => {
    store.set('admin_config/support_inbox', {
      autoReplyMode: 'live_guarded', autoReplyRevision: 2, autoReplyDailyCap: 20,
      autoReplyPerSenderDailyCap: 3, signature: 'Phraseman Support', signatureRevision: 1,
    });
    store.set('support_inbox/m-stuck-old-policy', {
      status: 'new', triageState: 'kept', mailCategory: 'human',
      fromEmail: 'client@example.com', messageId: '<stuck-old-policy@example.test>',
      subject: 'Не работает подписка', bodyText: 'Оплатил Plus, доступа нет',
      autoReply: {
        state: 'attention_required', attempts: 3, grounded: false,
        reason: 'guarded_billing', policyVersion: 5, autoSendAtMs: null,
        updatedAt: new Date().toISOString(),
      },
    });

    await runSupportAutoReplyRetryCron(Date.now());

    expect(store.get('support_inbox/m-stuck-old-policy')?.autoReply).toMatchObject({
      state: 'awaiting_approval', holding: true, reason: 'guarded_billing',
    });
    expect(String(store.get('support_inbox/m-stuck-old-policy')?.draftReply ?? '')).toContain('вручную');
    expect(mockSendJarvisDigest).toHaveBeenCalledTimes(1);
  });

  // зачем: неразрешённая личность отправителя — единственный случай, где
  // молчание безопаснее ответа: промежуточный ответ ушёл бы не тому человеку.
  test('retry cron never re-opens a message blocked by an unresolved conversation identity', async () => {
    store.set('support_inbox/m-stuck-mismatch', {
      status: 'new', triageState: 'kept', mailCategory: 'human',
      fromEmail: 'client@example.com', messageId: '<stuck-mismatch@example.test>',
      subject: 'Practice', bodyText: 'How do I practise?',
      autoReply: {
        state: 'attention_required', attempts: 3, grounded: false,
        reason: 'conversation_sender_mismatch', policyVersion: 5, autoSendAtMs: null,
        updatedAt: new Date().toISOString(),
      },
    });

    await runSupportAutoReplyRetryCron(Date.now());

    expect(store.get('support_inbox/m-stuck-mismatch')?.autoReply).toMatchObject({
      state: 'attention_required', reason: 'conversation_sender_mismatch',
    });
    expect(store.get('support_inbox/m-stuck-mismatch')?.draftReply).toBeUndefined();
    expect(mockSendJarvisDigest).not.toHaveBeenCalled();
  });

  test('retry cron spends no council budget when a message has no authoritative conversation head', async () => {
    store.set('support_inbox/m-missing-auto-head', {
      status: 'new', triageState: 'kept', mailCategory: 'human',
      fromEmail: 'learner@example.com', messageId: '<missing-auto-head@example.test>',
      subject: 'Practice', bodyText: 'How do I practise?',
      conversationId: 'missing-auto-head', conversationRevision: 1,
      autoReply: { state: 'retry', attempts: 0, nextAttemptAtMs: 0 },
    });
    await expect(runSupportAutoReplyRetryCron(Date.now())).resolves.toMatchObject({ attempted: 1 });
    expect(mockOpenAiChat).not.toHaveBeenCalled();
    expect(store.get('support_inbox/m-missing-auto-head')?.draftReply).toBeUndefined();
  });

  test('batch preparation cannot replace a Telegram send that the owner already approved', async () => {
    const messageDocId = `m_${'2'.repeat(64)}`;
    const prepared = await preparePremiumReview(messageDocId);
    await handleSupportTelegramAction({
      db: fakeDb(), nonce: prepared.approveNonce, requestedAction: 'approve',
      fromTelegramUserId: '1', fromTelegramChatId: '1', nowMs: Date.now(),
    });
    const reviewPath = [...store.entries()].find(([path, value]) => (
      path.startsWith('support_telegram_reviews/') && value.operationId === prepared.operationId
    ))?.[0];
    expect(store.get(reviewPath ?? '')?.state).toBe('dispatching');

    await expect(adminSupportPrepareReplyBatch({
      auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } },
      data: { limit: 10, idempotencyKey: 'batch-after-owner-send', requestId: 'batch-after-owner-send' },
    })).rejects.toThrow('no_ready_support_drafts');
    expect(store.get(`support_reply_operations/${prepared.operationId}`)?.state).toBe('prepared');
    expect(store.get(reviewPath ?? '')?.state).toBe('dispatching');
    expect([...store.keys()].filter((path) => path.startsWith('support_telegram_reply_jobs/'))).toHaveLength(1);
  });

  test('cancelling a single preview also retires its Telegram timer and callback', async () => {
    const messageDocId = `m_${'4'.repeat(64)}`;
    const prepared = await preparePremiumReview(messageDocId);
    const operationPath = `support_reply_operations/${prepared.operationId}`;
    const adminRequest = { auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } } };

    await expect(adminSupportCancelReply({
      ...adminRequest,
      data: {
        operationId: prepared.operationId,
        confirmationNonce: String(store.get(operationPath)?.confirmationNonce ?? ''),
        requestId: 'cancel-single-review',
      },
    })).resolves.toMatchObject({ ok: true, state: 'cancelled', replayed: false });

    expect(store.get(operationPath)?.state).toBe('cancelled');
    expect(store.get(`support_telegram_reviews/${prepared.reviewId}`)).toMatchObject({
      state: 'stale', autoSendAtMs: null, lastErrorCode: 'cancelled_by_admin',
    });
    expect(store.get(`support_inbox/${messageDocId}`)).toMatchObject({
      replyGate: { operationId: prepared.operationId, state: 'cancelled' },
      autoReply: { state: 'attention_required', autoSendAtMs: null, reason: 'cancelled_by_admin' },
    });
    await expect(handleSupportTelegramAction({
      db: fakeDb(), nonce: prepared.approveNonce, requestedAction: 'approve',
      fromTelegramUserId: '1', fromTelegramChatId: '1', nowMs: Date.now(),
    })).resolves.toMatchObject({ ok: false, reason: 'already_used' });
    expect([...store.keys()].filter((path) => path.startsWith('support_telegram_reply_jobs/'))).toHaveLength(0);
  });

  test('batch preview reserves an existing Telegram-ready operation and cancel restores it without losing the owner buttons', async () => {
    const messageDocId = `m_${'3'.repeat(64)}`;
    const prepared = await preparePremiumReview(messageDocId);
    const adminRequest = { auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } } };
    const batch = await adminSupportPrepareReplyBatch({
      ...adminRequest,
      data: { limit: 10, idempotencyKey: 'batch-adopt-ready', requestId: 'batch-adopt-ready' },
    });

    expect(batch).toMatchObject({ count: 1, items: [{ operationId: prepared.operationId, messageDocId }] });
    expect(store.get(`support_reply_operations/${prepared.operationId}`)?.batchId).toBe(batch.batchId);
    expect(store.get(`support_telegram_reviews/${prepared.reviewId}`)).toMatchObject({
      state: 'awaiting_approval', autoSendAtMs: null,
    });
    await expect(adminSupportCancelReply({
      ...adminRequest,
      data: {
        operationId: prepared.operationId,
        confirmationNonce: String(store.get(`support_reply_operations/${prepared.operationId}`)?.confirmationNonce ?? ''),
        requestId: 'stale-single-modal-cancel',
      },
    })).rejects.toThrow('support_reply_reserved_by_batch');
    expect(store.get(`support_reply_operations/${prepared.operationId}`)).toMatchObject({
      state: 'prepared', batchId: batch.batchId,
    });
    await expect(handleSupportTelegramAction({
      db: fakeDb(), nonce: prepared.approveNonce, requestedAction: 'approve',
      fromTelegramUserId: '1', fromTelegramChatId: '1', nowMs: Date.now(),
    })).resolves.toMatchObject({ ok: false, reason: 'already_used' });
    expect([...store.keys()].filter((path) => path.startsWith('support_telegram_reply_jobs/'))).toHaveLength(0);

    await expect(adminSupportCancelReplyBatch({
      ...adminRequest,
      data: { batchId: batch.batchId, confirmationNonce: batch.confirmationNonce, requestId: 'batch-adopt-cancel' },
    })).resolves.toMatchObject({ ok: true, state: 'cancelled' });
    expect(store.get(`support_reply_operations/${prepared.operationId}`)).toMatchObject({ state: 'prepared' });
    expect(store.get(`support_reply_operations/${prepared.operationId}`)?.batchId).not.toBe(batch.batchId);
    expect(store.get(`support_telegram_reviews/${prepared.reviewId}`)?.state).toBe('awaiting_approval');
    expect(store.get(`support_inbox/${messageDocId}`)?.replyGate).toMatchObject({
      operationId: prepared.operationId, state: 'prepared',
    });
  });

  test('stale Jarvis batch child reaches claim but SMTP delivery remains zero', async () => {
    const messageDocId = `m_${'e'.repeat(64)}`;
    const prepared = await preparePremiumReview(messageDocId);
    // A previously cancelled single review no longer owns the draft, so the
    // same current draft may be explicitly sealed into a new batch.
    store.set(`support_reply_operations/${prepared.operationId}`, {
      ...(store.get(`support_reply_operations/${prepared.operationId}`) ?? {}), state: 'cancelled',
    });
    const messagePath = `support_inbox/${messageDocId}`;
    store.set(messagePath, {
      ...(store.get(messagePath) ?? {}),
      replyGate: { ...(store.get(messagePath)?.replyGate as Record<string, unknown>), state: 'cancelled' },
    });
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
    store.set(`support_reply_batches/${batch.batchId}`, {
      ...(store.get(`support_reply_batches/${batch.batchId}`) ?? {}), state: 'dispatching',
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

  test('batch preparation excludes a non-grounded Jarvis draft even when legacy text is still present', async () => {
    store.set('support_inbox/m-attention-batch', {
      status: 'new', fromEmail: 'client@example.com', messageId: '<attention-batch@example.test>',
      subject: 'Billing issue', bodyText: 'My subscription is missing.',
      draftReply: 'Legacy holding text that must never be prepared.', draftRevision: 1,
      draftOrigin: 'jarvis', draftPolicyVersion: 5,
      autoReply: { state: 'attention_required', grounded: false, reason: 'guarded_billing' },
    });
    await expect(adminSupportPrepareReplyBatch({
      auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } },
      data: { limit: 10, idempotencyKey: 'batch-attention-excluded', requestId: 'batch-attention-excluded' },
    })).rejects.toThrow('no_ready_support_drafts');
    expect([...store.keys()].some((path) => path.startsWith('support_reply_operations/'))).toBe(false);
  });

  test('an expired batch terminalizes every prepared child and releases its message gate', async () => {
    const messageDocId = `m_${'6'.repeat(64)}`;
    store.set(`support_inbox/${messageDocId}`, {
      status: 'new', fromEmail: 'learner@example.com', messageId: '<expired-batch@example.test>',
      subject: 'Practice', bodyText: 'How do I practise?',
      draftReply: 'Open Phraseman and choose a practice activity.', draftRevision: 1,
      draftOrigin: 'owner_manual',
    });
    const adminRequest = { auth: { uid: 'admin-1', token: { admin: true, adminRole: 'admin' } } };
    const prepared = await adminSupportPrepareReplyBatch({
      ...adminRequest,
      data: { limit: 10, idempotencyKey: 'expired-batch', requestId: 'expired-batch' },
    });
    const batchPath = `support_reply_batches/${prepared.batchId}`;
    store.set(batchPath, {
      ...(store.get(batchPath) ?? {}), confirmationExpiresAt: new Date(Date.now() - 1_000).toISOString(),
    });
    mockSmtpVerify.mockRejectedValueOnce(new Error('smtp must not run for an expired batch'));

    await expect(adminSupportDispatchReplyBatch({
      ...adminRequest,
      data: {
        batchId: prepared.batchId,
        confirmationNonce: prepared.confirmationNonce,
        manifestHash: prepared.manifestHash,
      },
    })).resolves.toMatchObject({ ok: true, state: 'cancelled', failed: 1 });
    const child = [...store.entries()].find(([path, value]) => path.startsWith('support_reply_operations/') && value.batchId === prepared.batchId)!;
    expect(child[1].state).toBe('expired');
    expect((store.get(`support_inbox/${messageDocId}`)?.replyGate as Record<string, unknown>)?.state).toBe('expired');
    expect(mockSmtpVerify).not.toHaveBeenCalled();
    expect(mockSmtpSendMail).not.toHaveBeenCalled();
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
    expect(mockSendTelegramAlert).toHaveBeenCalledTimes(1);
    expect(mockSendJarvisDigest).not.toHaveBeenCalled();
    expect(store.get('support_inbox/m4')?.draftReply).toBeUndefined();
    expect(store.get('support_inbox/m4')?.autoReply).toMatchObject({ state: 'retry', reason: 'model_unavailable' });
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
      fromEmail: 'client@example.com', subject: 'Learning question', bodyText: 'How do lessons work?', status: 'new',
    }));

    expect(mockOpenAiChat).not.toHaveBeenCalled();
    expect(mockSendTelegramAlert).toHaveBeenCalledTimes(1);
    expect(mockSendJarvisDigest).not.toHaveBeenCalled();
    expect(store.get('support_inbox/m-no-ai')?.draftReply).toBeUndefined();
    expect(store.get('support_inbox/m-no-ai')?.autoReply).toMatchObject({ state: 'retry', reason: 'model_unavailable' });
    expect(store.get('support_inbox/m-no-ai')?.ownerNotification).toMatchObject({
      state: 'delivered',
      attempts: 1,
    });
  });

  test('persists a failed Telegram attempt and rejects so delivery failure is never silent', async () => {
    secretValues.set('OPENAI_API_KEY', '');
    mockSendJarvisDigest.mockResolvedValueOnce(false);
    mockSendTelegramAlert.mockResolvedValueOnce(false);

    // Тема без guarded-риска: здесь проверяется именно доставка уведомления
    // владельцу, а не классификация обращения.
    await expect(supportInboxOnNewMail(makeEvent('m-telegram-fail', {
      fromEmail: 'client@example.com', subject: 'Need help', bodyText: 'The lessons list does not open', status: 'new',
    }))).rejects.toThrow('support_owner_notification_failed');

    expect(mockSendTelegramAlert).toHaveBeenCalledTimes(1);
    expect(mockSendJarvisDigest).not.toHaveBeenCalled();
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
    expect(mockSendJarvisDigest).not.toHaveBeenCalled();
    expect(mockSendTelegramAlert).toHaveBeenCalledTimes(1);
    expect(store.get('support_inbox/m6')?.draftReply).toBeUndefined();
    expect(store.get('support_inbox/m6')?.autoReply).toMatchObject({ state: 'retry', reason: 'council_unavailable' });
  });
});
