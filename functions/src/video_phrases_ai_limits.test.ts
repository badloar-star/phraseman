/**
 * PM-231: админский разбор документа — потолок входа, max_tokens и тайм-аут fetch.
 */
class FakeHttpsError extends Error {
  constructor(readonly code: string, message: string, readonly details?: unknown) {
    super(message);
  }
}

const mockReserveBudget = jest.fn(async () => undefined);

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (_options: unknown, handler: unknown) => handler,
}));
jest.mock('firebase-functions/params', () => ({ defineSecret: () => ({ value: () => 'sk-test-key' }) }));
jest.mock('firebase-admin', () => ({ firestore: Object.assign(jest.fn(() => ({})), { FieldValue: {} }) }));
jest.mock('./callable_options', () => ({ ENFORCE_APP_CHECK: false }));
jest.mock('./openai_jobs_config', () => ({
  resolveJobConfig: jest.fn(async () => ({ enabled: true, model: 'gpt-4.1-mini', globalDailyCap: 10 })),
  assertJobEnabled: jest.fn(),
}));
jest.mock('./content_factory/content_factory_budget', () => ({ reserveContentFactoryBudget: mockReserveBudget }));

// eslint-disable-next-line import/first
import {
  adminParseVideoPhraseDocument,
  VIDEO_PHRASES_MAX_INPUT_CHARS,
  VIDEO_PHRASES_MAX_OUTPUT_TOKENS,
} from './video_phrases';
// eslint-disable-next-line import/first
import { PAID_AI_FETCH_TIMEOUT_MS } from './paid_ai_fetch_timeout';

const handler = adminParseVideoPhraseDocument as unknown as (request: unknown) => Promise<unknown>;
const adminRequest = (text: string) => ({
  auth: { uid: 'admin-1', token: { admin: true } },
  data: { videoId: 'abcdefghijk', text },
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('adminParseVideoPhraseDocument PM-231 limits', () => {
  it('rejects oversized documents before budget reservation or any paid call', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(handler(adminRequest('a'.repeat(VIDEO_PHRASES_MAX_INPUT_CHARS + 1))))
      .rejects.toMatchObject({ code: 'invalid-argument', message: 'document_text_too_long' });
    expect(VIDEO_PHRASES_MAX_INPUT_CHARS).toBe(60_000);
    expect(mockReserveBudget).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends max_tokens and a timeout signal', async () => {
    const fetchMock = jest.fn(async (_url: string, init: RequestInit) => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"phrases":[]}' } }] }),
      init,
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await handler(adminRequest('Break a leg — удачи.'));
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body)).max_tokens).toBe(VIDEO_PHRASES_MAX_OUTPUT_TOKENS);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(PAID_AI_FETCH_TIMEOUT_MS.adminVideoPhrases).toBeLessThan(120_000);
  });

  it('maps a fetch timeout to openai_request_failed with a logged reason', async () => {
    global.fetch = jest.fn(async () => {
      throw Object.assign(new Error('aborted due to timeout'), { name: 'TimeoutError' });
    }) as unknown as typeof fetch;
    await expect(handler(adminRequest('Break a leg — удачи.')))
      .rejects.toMatchObject({ code: 'unavailable', message: 'openai_request_failed' });
    expect(console.error).toHaveBeenCalledWith(
      '[AI-LIMIT] adminParseVideoPhraseDocument provider fetch failed',
      expect.objectContaining({ reason: 'timeout' }),
    );
  });
});
