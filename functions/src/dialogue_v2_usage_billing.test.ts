/**
 * PM-231 (A3): Dialogue V2 (freeform / text / итог занятия) сообщает токены
 * оплаченного ответа; биллинг без текста; сбой биллинга не роняет ход.
 */
class FakeHttpsError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (_options: unknown, handler: unknown) => handler,
}));
jest.mock('firebase-functions/params', () => ({
  defineSecret: (name: string) => ({ value: () => `${name}-secret-value-long-enough-for-tests` }),
}));
jest.mock('firebase-admin', () => ({
  apps: [{}],
  initializeApp: jest.fn(),
  firestore: Object.assign(jest.fn(), {
    Timestamp: { fromMillis: jest.fn() },
    FieldValue: { serverTimestamp: () => 'server-time' },
  }),
}));
jest.mock('./callable_options', () => ({ ENFORCE_APP_CHECK_OPENAI: false }));
jest.mock('./dialogue_v2_session_production_runtime', () => ({
  DIALOGUE_V2_SESSION_HMAC_KEY: { value: () => 'session-owner-secret-with-at-least-32-bytes' },
}));

// eslint-disable-next-line import/first
import {
  extractOpenAiUsage,
  recordDialogueV2Billing,
  reportDialogueV2Usage,
  type DialogueV2ProviderUsage,
} from './dialogue_v2_usage_billing';
// eslint-disable-next-line import/first
import { createDialogueV2ProviderGenerator } from './dialogue_v2_turn_production_callable';
// eslint-disable-next-line import/first
import { createDialogueV2CompletionAssessmentGenerator } from './dialogue_v2_session_complete_callable';
// eslint-disable-next-line import/first
import { createDialogueV2FreeformOpenAiTransport } from './dialogue_v2_freeform_openai_transport';
// eslint-disable-next-line import/first
import { buildDialogueV2FreeformTextProducerRequest } from './dialogue_v2_freeform_text_provider';

const USAGE_PAYLOAD = { prompt_tokens: 210, completion_tokens: 45, total_tokens: 255 };

function fakeDb(fail = false) {
  const rows: Array<{ collection: string; data: Record<string, unknown> }> = [];
  const db = {
    collection: (collection: string) => ({
      doc: () => ({
        set: async (data: Record<string, unknown>) => {
          if (fail) throw new Error('firestore_down');
          rows.push({ collection, data });
        },
      }),
    }),
  } as unknown as FirebaseFirestore.Firestore;
  return { db, rows };
}

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('dialogue_v2_usage_billing helpers', () => {
  it('extracts bounded token counts and ignores junk', () => {
    expect(extractOpenAiUsage({ usage: USAGE_PAYLOAD }, 'gpt-4o-mini')).toEqual({
      model: 'gpt-4o-mini', promptTokens: 210, completionTokens: 45, totalTokens: 255,
    });
    expect(extractOpenAiUsage({ usage: { prompt_tokens: -3, completion_tokens: 'x' } }, 'm'))
      .toEqual({ model: 'm', promptTokens: 0, completionTokens: 0, totalTokens: 0 });
    expect(extractOpenAiUsage({ choices: [] }, 'm')).toBeNull();
    expect(extractOpenAiUsage(null, 'm')).toBeNull();
  });

  it('writes a billing row with mode, tokens, model and uid only', async () => {
    const { db, rows } = fakeDb();
    const usage: DialogueV2ProviderUsage = { model: 'gpt-4o-mini', promptTokens: 1, completionTokens: 2, totalTokens: 3 };
    await recordDialogueV2Billing({ mode: 'v2_text', usage, stableUid: 'stable-1' }, db);
    expect(rows).toEqual([{
      collection: 'premium_dialog_billing',
      data: expect.objectContaining({
        uid: 'stable-1', mode: 'v2_text', model: 'gpt-4o-mini', promptTokens: 1, completionTokens: 2, totalTokens: 3,
      }),
    }]);
    expect(Object.keys(rows[0].data).sort()).toEqual(
      ['completionTokens', 'createdAt', 'createdAtMs', 'mode', 'model', 'promptTokens', 'totalTokens', 'uid'],
    );
  });

  it('logs and swallows a failed billing write', async () => {
    const { db } = fakeDb(true);
    await expect(recordDialogueV2Billing({
      mode: 'v2_complete',
      usage: { model: 'm', promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      authUid: 'auth-1',
    }, db)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith('[AI-BILLING] dialogue_v2 billing write failed', expect.objectContaining({ mode: 'v2_complete' }));
  });

  it('a throwing reporter never escapes', async () => {
    await expect(reportDialogueV2Usage(async () => { throw new Error('boom'); }, { usage: USAGE_PAYLOAD }, 'm', 'v2_freeform'))
      .resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('Dialogue V2 providers report paid usage', () => {
  it('v2_text: generator reports usage and still returns the reply when the reporter fails', async () => {
    const onUsage = jest.fn(async () => { throw new Error('billing down'); });
    const generate = createDialogueV2ProviderGenerator({
      resolveApiKey: () => 'server-secret',
      resolveModel: async () => 'gpt-4o-mini',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"replies":[{"personaId":"host","text":"Ja, gern."}]}' } }],
          usage: USAGE_PAYLOAD,
        }),
      } as Response),
      onUsage,
    });
    await expect(generate(Object.freeze({
      systemPrompt: 'SERVER_AUTHORIZED_DIALOGUE_V2\nReturn JSON only.',
      userMessage: 'Können wir planen?',
      expectedPersonaIds: Object.freeze(['host']),
      serverConversationContextExpiresAtMs: Date.now() + 60 * 60 * 1_000,
    }) as unknown as Parameters<typeof generate>[0])).resolves.toContain('Ja, gern.');
    expect(onUsage).toHaveBeenCalledWith({ model: 'gpt-4o-mini', promptTokens: 210, completionTokens: 45, totalTokens: 255 });
  });

  it('v2_freeform: transport reports usage before returning content', async () => {
    const nowMs = Date.now();
    const onUsage = jest.fn(async () => undefined);
    const transport = createDialogueV2FreeformOpenAiTransport({
      enabled: true,
      resolveApiKey: () => 'k'.repeat(40),
      resolveModel: async () => 'gpt-4o-mini',
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: 'Bien dit.' } }], usage: USAGE_PAYLOAD }),
      }),
      onUsage,
    });
    const request = buildDialogueV2FreeformTextProducerRequest({
      sessionId: `d2fs_${'S'.repeat(32)}`,
      turnId: `d2ft_${'T'.repeat(16)}`,
      studyTarget: 'fr',
      userMessage: 'Bonjour',
      sessionExpiresAtMs: nowMs + 60_000,
      priorTurns: [],
      languageBranchMemory: null,
    } as unknown as Parameters<typeof buildDialogueV2FreeformTextProducerRequest>[0], nowMs);
    await expect(transport(request)).resolves.toBe('Bien dit.');
    expect(onUsage).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o-mini', totalTokens: 255 }));
  });

  it('v2_complete: assessment generator reports usage', async () => {
    const nowMs = Date.now();
    const onUsage = jest.fn(async () => undefined);
    const generate = createDialogueV2CompletionAssessmentGenerator({
      nowMs: () => nowMs,
      resolveApiKey: () => 'server-secret',
      resolveModel: async () => 'gpt-4o-mini',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"overallAssessment":"Good."}' } }], usage: USAGE_PAYLOAD }),
      }),
      onUsage,
    });
    await expect(generate({
      systemPrompt: 'Assess.',
      transcript: [{ messageId: `d2t_${'a'.repeat(16)}`, role: 'user', content: 'Hello' }],
      expiresAtMs: nowMs + 60_000,
    })).resolves.toContain('Good.');
    expect(onUsage).toHaveBeenCalledWith(expect.objectContaining({ totalTokens: 255 }));
  });
});
