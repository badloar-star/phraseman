/**
 * PM-231: Free-превью текстового разбора — суточный потолок ДО OpenAI,
 * Plus без потолка, тайм-аут fetch и возврат кредита при сбое провайдера.
 */

class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const mockBillingSet = jest.fn(async () => undefined);
const mockFirestore = jest.fn(() => ({
  collection: () => ({ doc: () => ({ set: mockBillingSet }) }),
}));
Object.assign(mockFirestore, { FieldValue: { serverTimestamp: () => 'server-time' } });
const mockEnforceFreeJobGenLimit = jest.fn();
const mockRefundFreeJobGenLimit = jest.fn(async () => undefined);
const mockResolvePremiumAccess = jest.fn();

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));
jest.mock('firebase-functions/params', () => ({ defineSecret: () => ({ value: () => 'sk-test-key' }) }));
jest.mock('firebase-admin', () => ({ apps: [], initializeApp: jest.fn(), firestore: mockFirestore }));
jest.mock('./callable_options', () => ({ ENFORCE_APP_CHECK_OPENAI: false }));
jest.mock('./auth_identity', () => ({ resolveStableUidForAuth: jest.fn(async () => 'stable-1') }));
jest.mock('./openai_dialog_model_config', () => ({
  resolveConfiguredDialogModel: jest.fn(async () => 'gpt-4.1-mini'),
  modelSupportsJsonObject: jest.fn(() => true),
}));
jest.mock('./premium_dialog', () => ({
  enforceRateLimit: jest.fn(async () => undefined),
  asInterfaceLang: (value: unknown) => (typeof value === 'string' ? value : 'ru'),
}));
jest.mock('./premium_status', () => ({ resolvePremiumAccess: mockResolvePremiumAccess }));
jest.mock('./remote_gates', () => ({ resolveRemoteBool: jest.fn(async () => true) }));
// зачем: шлюз согласия на ИИ (ai_dialog_consent_gate) проверяется своими тестами; здесь — только лимит бесплатных разборов
jest.mock('./ai_dialog_consent_gate', () => ({ checkAiDialogConsent: jest.fn(async () => undefined) }));
jest.mock('./explain/explain_budget', () => ({
  enforceFreeJobGenLimit: mockEnforceFreeJobGenLimit,
  refundFreeJobGenLimit: mockRefundFreeJobGenLimit,
}));

// eslint-disable-next-line import/first
import { premiumDialogReview, FREE_TEXT_REVIEW_DAILY_CAP } from './premium_dialog_review';
// eslint-disable-next-line import/first
import { PAID_AI_FETCH_TIMEOUT_MS } from './paid_ai_fetch_timeout';

const handler = premiumDialogReview as unknown as (request: unknown) => Promise<unknown>;
const RESERVATION = { job: 'dialog_text_review', authUid: 'auth-1', stableUid: 'stable-1', reservedDayKey: '2026-09-30', reservedResetAtMs: 1 };
const textRequest = {
  auth: { uid: 'auth-1' },
  data: { studyTarget: 'en', mode: 'text', history: [{ role: 'user', content: 'Hello there' }] },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('premiumDialogReview PM-231 Free text cap', () => {
  it('caps Free text reviews per day before the paid call and maps the refusal to dialog_free_limit', async () => {
    mockResolvePremiumAccess.mockResolvedValue(false);
    mockEnforceFreeJobGenLimit.mockRejectedValueOnce(new FakeHttpsError('resource-exhausted', 'explain_free_daily_limit'));
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(handler(textRequest)).rejects.toMatchObject({ code: 'resource-exhausted', message: 'dialog_free_limit' });
    expect(mockEnforceFreeJobGenLimit).toHaveBeenCalledWith('dialog_text_review', 'auth-1', 'stable-1', FREE_TEXT_REVIEW_DAILY_CAP, expect.any(Number));
    expect(FREE_TEXT_REVIEW_DAILY_CAP).toBe(3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('leaves Plus text reviews without the daily cap', async () => {
    mockResolvePremiumAccess.mockResolvedValue(true);
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 503, text: async () => 'down' });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(handler(textRequest)).rejects.toMatchObject({ code: 'unavailable' });
    expect(mockEnforceFreeJobGenLimit).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends a fetch timeout below the 30s function ceiling and refunds the Free credit on timeout', async () => {
    mockResolvePremiumAccess.mockResolvedValue(false);
    mockEnforceFreeJobGenLimit.mockResolvedValueOnce(RESERVATION);
    const fetchMock = jest.fn(async (_url: string, init: { signal?: AbortSignal }) => {
      expect(init.signal).toBeInstanceOf(AbortSignal);
      throw Object.assign(new Error('aborted due to timeout'), { name: 'TimeoutError' });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(handler(textRequest)).rejects.toMatchObject({ code: 'unavailable', message: 'dialog_provider_failed' });
    expect(mockRefundFreeJobGenLimit).toHaveBeenCalledWith(RESERVATION);
    expect(PAID_AI_FETCH_TIMEOUT_MS.dialogReview).toBeLessThan(30_000);
    expect(mockBillingSet).not.toHaveBeenCalled();
  });
});
