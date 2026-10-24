import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  DIALOGUE_V2_FREEFORM_PROVIDER_DEADLINE_MS,
  DIALOGUE_V2_FREEFORM_PROVIDER_MAX_ATTEMPTS,
  createDialogueV2FreeformOpenAiTransport,
} from './dialogue_v2_freeform_openai_transport';
import {
  buildDialogueV2FreeformTextProducerRequest,
} from './dialogue_v2_freeform_text_provider';
import * as modelConfigModule from './openai_dialog_model_config';

const NOW_MS = 2_000_000_000_000;
const SECRET = 'server-secret-that-must-not-enter-the-body';

type TestProviderResponse = Readonly<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

type TestProviderFetch = (
  input: string,
  init?: RequestInit,
) => Promise<TestProviderResponse>;

function mockFetch(
  implementation: TestProviderFetch,
): jest.MockedFunction<TestProviderFetch> {
  return jest.fn(implementation);
}

function producerRequest() {
  return buildDialogueV2FreeformTextProducerRequest({
    sessionId: `d2fs_${'S'.repeat(32)}`,
    turnId: `d2ft_${'T'.repeat(16)}`,
    studyTarget: 'fr',
    userMessage: 'Comment le dirait-on naturellement ?',
    sessionExpiresAtMs: NOW_MS + 60_000,
    priorTurns: Array.from({ length: 8 }, (_, index) => ({
      turnId: `d2ft_${String(index).repeat(16)}`,
      userMessage: `Question ${index}`,
      assistantMessage: `Réponse ${index}`,
    })),
    languageBranchMemory: {
      learnerProfile: {
        preferredRegister: 'casual',
        correctionStyle: 'gentle',
        interests: ['urban gardening'],
      },
      recurringPatterns: [{
        category: 'grammar',
        observation: 'Article choice needs practice',
        guidance: 'Contrast definite and indefinite reference',
      }],
      recentTopics: ['neighbourhood hobbies'],
    },
  }, NOW_MS);
}

function successfulResponse(content = 'On peut le dire plus naturellement comme ceci.') {
  return {
    ok: true,
    status: 200,
    json: jest.fn(async () => ({
      choices: [{ message: { content } }],
    })),
  };
}

describe('Dialogue V2 Plus freeform OpenAI server transport', () => {
  test('is disabled by default and does not resolve secrets, models or network', async () => {
    const resolveApiKey = jest.fn(() => SECRET);
    const resolveModel = jest.fn(async () => 'gpt-4o-mini');
    const fetchImpl = mockFetch(async () => successfulResponse());
    const transport = createDialogueV2FreeformOpenAiTransport({
      enabled: false,
      resolveApiKey,
      resolveModel,
      fetchImpl,
    });

    await expect(transport(producerRequest())).rejects.toThrow(
      'dialogue_v2_freeform_provider_transport_failed',
    );
    expect(resolveApiKey).not.toHaveBeenCalled();
    expect(resolveModel).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test.each([
    ['', 'gpt-4o-mini'],
    ['short', 'gpt-4o-mini'],
    [SECRET, 'client-selected-model'],
  ])('fails closed for absent or invalid server configuration', async (apiKey, model) => {
    const fetchImpl = mockFetch(async () => successfulResponse());
    const transport = createDialogueV2FreeformOpenAiTransport({
      enabled: true,
      resolveApiKey: () => apiKey,
      resolveModel: async () => model,
      fetchImpl,
    });

    await expect(transport(producerRequest())).rejects.toThrow(
      'dialogue_v2_freeform_provider_transport_failed',
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('captures the approved model allowlist against post-load export mutation', async () => {
    const exportedAllowlist = modelConfigModule.ALLOWED_DIALOG_MODELS as unknown as string[];
    const originalLength = exportedAllowlist.length;
    const fetchImpl = mockFetch(async () => successfulResponse());
    exportedAllowlist.push('attacker-selected-model');
    try {
      const transport = createDialogueV2FreeformOpenAiTransport({
        enabled: true,
        resolveApiKey: () => SECRET,
        resolveModel: async () => 'attacker-selected-model',
        fetchImpl,
      });
      await expect(transport(producerRequest())).rejects.toThrow(
        'dialogue_v2_freeform_provider_transport_failed',
      );
      expect(fetchImpl).not.toHaveBeenCalled();
    } finally {
      exportedAllowlist.splice(originalLength);
    }
  });

  test('maps the exact approved context and uses the key only in the server header', async () => {
    const fetchImpl = mockFetch(async () => successfulResponse());
    const transport = createDialogueV2FreeformOpenAiTransport({
      enabled: true,
      resolveApiKey: () => SECRET,
      resolveModel: async () => 'gpt-4o-mini',
      fetchImpl,
    });

    await expect(transport(producerRequest())).resolves.toBe(
      'On peut le dire plus naturellement comme ceci.',
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(init).toBeDefined();
    if (!init) throw new Error('missing_request_init');
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.method).toBe('POST');
    expect(init.redirect).toBe('error');
    expect(init.headers).toEqual({
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);

    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('gpt-4o-mini');
    expect(body).toMatchObject({ max_tokens: 500, temperature: 0.8 });
    // зачем (Ревизор 24.10): с a1b97ba76 (01.10, «первая реплика всегда уже на экране») сервер ставит открывающую фразу
    // собеседника первым ходом: 2 системных + приветствие + 8 прошлых ходов × 2 + новая реплика = 20.
    expect(body.messages).toHaveLength(20);
    expect(body.messages[2]).toEqual({ role: 'assistant', content: expect.stringContaining('Salut') });
    expect(body.messages[0]).toEqual({
      role: 'system',
      content: producerRequest().systemInstruction,
    });
    expect(body.messages[1]).toEqual({
      role: 'system',
      content: expect.stringContaining('"preferredRegister":"casual"'),
    });
    expect(body.messages.slice(2)).toEqual(producerRequest().conversation);
    expect(JSON.stringify(body)).not.toContain(SECRET);
    for (const forbiddenKey of [
      'sessionId', 'turnId', 'scenarioId', 'rank', 'persona', 'objectives',
    ]) {
      expect(body).not.toHaveProperty(forbiddenKey);
      for (const message of body.messages) expect(message).not.toHaveProperty(forbiddenKey);
    }
  });

  test('omits the memory system message when structured memory is absent', async () => {
    const request = {
      ...producerRequest(),
      languageBranchMemory: null,
    } as const;
    const fetchImpl = mockFetch(async () => successfulResponse('D’accord.'));
    const transport = createDialogueV2FreeformOpenAiTransport({
      enabled: true,
      resolveApiKey: () => SECRET,
      resolveModel: async () => 'gpt-4.1-mini',
      fetchImpl,
    });

    await expect(transport(request)).resolves.toBe('D’accord.');
    const init = fetchImpl.mock.calls[0][1];
    expect(init).toBeDefined();
    if (!init) throw new Error('missing_request_init');
    const body = JSON.parse(String(init.body));
    expect(body.messages).toEqual([
      { role: 'system', content: request.systemInstruction },
      ...request.conversation,
    ]);
  });

  test.each<readonly [string, TestProviderFetch]>([
    ['network rejection', () => Promise.reject(new Error('private provider detail'))],
    ['HTTP rejection', async () => ({ ok: false, status: 503, json: async () => ({}) })],
    ['invalid JSON shape', async () => ({ ok: true, status: 200, json: async () => ({}) })],
    ['non-string content', async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: { text: 'no' } } }] }),
    })],
  ])('normalizes %s and never retries an uncertain request', async (_label, result) => {
    const fetchImpl = mockFetch(result);
    const transport = createDialogueV2FreeformOpenAiTransport({
      enabled: true,
      resolveApiKey: () => SECRET,
      resolveModel: async () => 'gpt-4o-mini',
      fetchImpl,
    });

    await expect(transport(producerRequest())).rejects.toMatchObject({
      message: 'dialogue_v2_freeform_provider_transport_failed',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('aborts at the bounded deadline and does not retry the dispatched request', async () => {
    let signal: AbortSignal | undefined;
    const fetchImpl = mockFetch((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<TestProviderResponse>(() => {});
    });
    const transport = createDialogueV2FreeformOpenAiTransport({
      enabled: true,
      resolveApiKey: () => SECRET,
      resolveModel: async () => 'gpt-4o-mini',
      fetchImpl,
      timeoutMs: 10,
    });

    await expect(transport(producerRequest())).rejects.toThrow(
      'dialogue_v2_freeform_provider_transport_failed',
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(signal?.aborted).toBe(true);
    expect(DIALOGUE_V2_FREEFORM_PROVIDER_DEADLINE_MS).toBe(20_000);
    expect(DIALOGUE_V2_FREEFORM_PROVIDER_MAX_ATTEMPTS).toBe(1);
  });

  test('does not log transcript, provider body or server configuration', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const transport = createDialogueV2FreeformOpenAiTransport({
      enabled: true,
      resolveApiKey: () => SECRET,
      resolveModel: async () => 'gpt-4o-mini',
      fetchImpl: async () => {
        throw new Error('learner transcript and provider body');
      },
    });

    try {
      await expect(transport(producerRequest())).rejects.toThrow(
        'dialogue_v2_freeform_provider_transport_failed',
      );
      expect(log).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
      warn.mockRestore();
      error.mockRestore();
    }
  });

  test('production turn wiring uses the reviewed secret and existing model config', () => {
    const source = readFileSync(
      path.join(__dirname, 'dialogue_v2_freeform_session_turn_callable.ts'),
      'utf8',
    );
    expect(source).toContain('createDialogueV2FreeformOpenAiTransport');
    expect(source).toContain('DIALOGUE_V2_FREEFORM_OPENAI_API_KEY.value()');
    expect(source).toContain('resolveConfiguredDialogModel');
    expect(source).not.toMatch(/enabled:\s*false/);
    expect(source).not.toMatch(/transport:\s*null/);
  });
});
