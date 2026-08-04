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

const mockOpenAiChat = jest.fn<Promise<{ text: string; promptTokens: number; completionTokens: number }>, unknown[]>();
const mockSendTelegramAlert = jest.fn<Promise<boolean>, unknown[]>(async () => true);
const mockResolveJobConfig = jest.fn<Promise<{ model: string; enabled: boolean }>, unknown[]>(async () => ({ model: 'gpt-4.1-nano', enabled: true }));
const mockAssertJobEnabled = jest.fn<void, unknown[]>();

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
  defineSecret: (name: string) => ({ name, value: () => `${name}-test-secret` }),
}));

jest.mock('./callable_options', () => ({ ENFORCE_APP_CHECK: false }));

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
  return {
    collection: (name: string) => ({
      doc: (id?: string) => refFor(`${name}/${id ?? `auto_${Math.random()}`}`),
    }),
    doc: (path: string) => refFor(path),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        get: async (ref: { path: string }) => ({ exists: store.has(ref.path), data: () => store.get(ref.path) }),
        set: (ref: { path: string }, data: DocData, opts?: { merge?: boolean }) => {
          const prev = opts?.merge ? (store.get(ref.path) ?? {}) : {};
          store.set(ref.path, { ...prev, ...data });
        },
        create: (ref: { path: string }, data: DocData) => {
          store.set(ref.path, data);
        },
      };
      return fn(tx);
    },
  };
}

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => fakeDb()),
}));

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

  beforeAll(() => {
    // require, not import: modules must load AFTER jest.mock() calls above run.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./support_inbox');
    supportInboxOnNewMail = mod.supportInboxOnNewMail;
  });

  beforeEach(() => {
    store.clear();
    mockOpenAiChat.mockReset();
    mockSendTelegramAlert.mockClear();
    mockResolveJobConfig.mockClear();
    mockAssertJobEnabled.mockReset();
  });

  test('registers on support_inbox document creation', () => {
    const registration = registeredDocumentCreates.find((r) => r.handler === supportInboxOnNewMail);
    expect(registration).toBeDefined();
    expect(registration?.options.document).toBe('support_inbox/{messageDocId}');
  });

  test('skips technical spam already classified as automated — no LLM call at all', async () => {
    await supportInboxOnNewMail(makeEvent('m1', {
      fromEmail: 'newsletter@shop.example', subject: 'Sale', bodyText: 'Buy now', mailCategory: 'automated',
    }));
    expect(mockOpenAiChat).not.toHaveBeenCalled();
    expect(mockSendTelegramAlert).not.toHaveBeenCalled();
  });

  test('archives an obvious spam verdict and never notifies Telegram', async () => {
    mockOpenAiChat.mockResolvedValueOnce({
      text: JSON.stringify({ isSpam: true, confidence: 0.99, reason: 'массовая реклама' }),
      promptTokens: 50, completionTokens: 20,
    });
    await supportInboxOnNewMail(makeEvent('m2', {
      fromEmail: 'seo@spam-shop.example', subject: 'Купите ссылки', bodyText: 'дёшево', status: 'new',
    }));
    expect(store.get('support_inbox/m2')?.status).toBe('archived');
    expect(mockSendTelegramAlert).not.toHaveBeenCalled();
  });

  test('a real question generates a draft and notifies Telegram with subject+body+draft', async () => {
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
    expect(store.get('support_inbox/m3')?.draftReply).toBe('Здравствуйте! Проверили — доступ уже открыт.');
    expect(mockSendTelegramAlert).toHaveBeenCalledTimes(1);
    const [, text] = mockSendTelegramAlert.mock.calls[0];
    expect(text).toContain('Не работает подписка');
    expect(text).toContain('Оплатил Plus');
    expect(text).toContain('Здравствуйте! Проверили');
  });

  test('exhausted monthly budget still notifies — real mail must not be lost — but skips the LLM entirely', async () => {
    store.set('jarvis_llm_budget/2026-08', { spentUsd: 999 });
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-08-15T12:00:00Z').getTime());

    await supportInboxOnNewMail(makeEvent('m4', {
      fromEmail: 'client@example.com', subject: 'Вопрос', bodyText: 'Текст вопроса', status: 'new',
    }));

    expect(mockOpenAiChat).not.toHaveBeenCalled();
    expect(mockSendTelegramAlert).toHaveBeenCalledTimes(1);
    const [, text] = mockSendTelegramAlert.mock.calls[0];
    expect(text).toMatch(/черновик не подготовлен/i);
    jest.spyOn(Date, 'now').mockRestore();
  });

  test('an unexpected OpenAI failure still notifies plainly instead of silently dropping the mail', async () => {
    mockOpenAiChat.mockRejectedValueOnce(new Error('OpenAI down'));
    await supportInboxOnNewMail(makeEvent('m5', {
      fromEmail: 'client@example.com', subject: 'Помогите', bodyText: 'Не получается войти', status: 'new',
    }));
    expect(mockSendTelegramAlert).toHaveBeenCalledTimes(1);
    const [, text] = mockSendTelegramAlert.mock.calls[0];
    expect(text).toContain('Помогите');
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
    expect(mockSendTelegramAlert).toHaveBeenCalledTimes(1);
  });
});
