// PM-231 (A3): usage админских ИИ-вызовов «по operation».
const addMock = jest.fn();
jest.mock('firebase-admin', () => ({
  firestore: () => ({ collection: (name: string) => ({ add: (row: unknown) => addMock(name, row) }) }),
}));
jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error {},
  onCall: (_options: unknown, handler: unknown) => handler,
}));
jest.mock('./callable_options', () => ({ ENFORCE_APP_CHECK: false }));

import {
  AI_OPERATION_BILLING_COLLECTION,
  aiOperationUsageSink,
  buildAiOperationBillingRow,
  recordAiOperationUsage,
} from './ai_operation_billing';
import { usageFromDoc } from './openai_budget_dashboard';

describe('ai_operation_billing', () => {
  beforeEach(() => addMock.mockReset());

  it('строка ограничена по размеру и несёт TTL 90 дней', () => {
    const row = buildAiOperationBillingRow('x'.repeat(500), { model: 'm'.repeat(500), promptTokens: 10.9, completionTokens: -5 }, 1_000);
    expect(String(row.operation)).toHaveLength(64);
    expect(String(row.model)).toHaveLength(80);
    expect(row).toMatchObject({ promptTokens: 10, completionTokens: 0, totalTokens: 10, createdAtMs: 1_000 });
    expect((row.expireAt as { toMillis(): number }).toMillis()).toBe(1_000 + 90 * 24 * 60 * 60 * 1000);
  });

  it('пишет одну строку в общую коллекцию', async () => {
    addMock.mockResolvedValue(undefined);
    await expect(recordAiOperationUsage('admin_translate', { model: 'gpt-4o-mini', promptTokens: 100, completionTokens: 50 }, 'admin-1', 5)).resolves.toBe(true);
    expect(addMock).toHaveBeenCalledTimes(1);
    expect(addMock.mock.calls[0]![0]).toBe(AI_OPERATION_BILLING_COLLECTION);
    expect(addMock.mock.calls[0]![1]).toMatchObject({ operation: 'admin_translate', totalTokens: 150, uid: 'admin-1' });
  });

  it('сбой записи не бросает и пишет причину в лог', async () => {
    addMock.mockRejectedValue(new Error('firestore down'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(recordAiOperationUsage('admin_translate', { promptTokens: 1 })).resolves.toBe(false);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[PM-231-BILLING]'), expect.objectContaining({ operation: 'admin_translate' }));
    spy.mockRestore();
  });

  it('sink — fire-and-forget и передаёт модель с токенами', async () => {
    addMock.mockResolvedValue(undefined);
    aiOperationUsageSink('feedback_summary', 'gpt-4o-mini')({ promptTokens: 7, completionTokens: 3 });
    await new Promise((resolve) => setImmediate(resolve));
    expect(addMock.mock.calls[0]![1]).toMatchObject({ operation: 'feedback_summary', model: 'gpt-4o-mini', totalTokens: 10 });
  });

  it('дашборд показывает operation в подписи фичи и считает стоимость', () => {
    const row = usageFromDoc('ai_operation_billing', 'Админ: ИИ-операции', {
      id: 'r1',
      data: () => ({ operation: 'admin_translate', model: 'gpt-4o-mini', promptTokens: 1_000_000, completionTokens: 1_000_000, createdAtMs: 9, uid: 'a' }),
    } as unknown as FirebaseFirestore.QueryDocumentSnapshot);
    expect(row.feature).toBe('Админ: admin_translate');
    expect(row.costUsd).toBeCloseTo(0.15 + 0.6, 6);
    expect(row.totalTokens).toBe(2_000_000);
  });

  // PM-231-A3 (§80): TTS платится по символам — поле только у озвучки, чат-строки прежней формы.
  it('TTS-строка несёт inputChars, чат-строка — без него', () => {
    const tts = buildAiOperationBillingRow('admin_director_digest_tts', { model: 'gpt-4o-mini-tts', inputChars: 1234 }, 1_000);
    expect(tts).toMatchObject({ inputChars: 1234, totalTokens: 0 });
    const chat = buildAiOperationBillingRow('admin_translate', { promptTokens: 5 }, 1_000);
    expect(chat).not.toHaveProperty('inputChars');
  });
});
