import { createDialogueV2CompletionAssessmentGenerator } from './dialogue_v2_session_complete_callable';

const input = Object.freeze({
  systemPrompt: 'Immutable terminal assessment schema.',
  transcript: Object.freeze([
    Object.freeze({ messageId: 'd2t_abcdefghijklmnop', role: 'user' as const, content: 'Hello, I would like to join.' }),
    Object.freeze({ role: 'assistant' as const, content: 'Great, tell me more.' }),
  ]),
  expiresAtMs: 2_060_000,
});

describe('Dialogue V2 completion provider privacy boundary', () => {
  test('sends only system schema and authorized transcript messages', async () => {
    const fetchImpl = jest.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({
        overallAssessment: 'A detailed assessment grounded in the supplied dialogue messages.',
        nextStep: 'Add one more concrete detail.',
        languageNote: null,
      }) } }] }),
    }));
    const generate = createDialogueV2CompletionAssessmentGenerator({
      nowMs: () => 2_000_000,
      resolveApiKey: () => 'test-api-key',
      resolveModel: async () => 'gpt-4.1-mini',
      fetchImpl,
    });
    await generate(input);
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.messages).toEqual([
      { role: 'system', content: input.systemPrompt },
      { role: 'user', content: JSON.stringify({ messageId: 'd2t_abcdefghijklmnop', text: 'Hello, I would like to join.' }) },
      { role: 'assistant', content: 'Great, tell me more.' },
    ]);
    expect(JSON.stringify(body)).not.toMatch(/objective|persona|rank|memory|scenario/i);
  });

  test('revalidates expiry and the 8-exchange/12KiB window before fetch', async () => {
    const fetchImpl = jest.fn();
    const generate = createDialogueV2CompletionAssessmentGenerator({
      nowMs: () => 2_060_000,
      resolveApiKey: () => 'test-api-key',
      resolveModel: async () => 'gpt-4.1-mini',
      fetchImpl,
    });
    await expect(generate(input)).rejects.toThrow('dialogue_v2_completion_provider_failed');
    expect(fetchImpl).not.toHaveBeenCalled();

    const nine = { ...input, expiresAtMs: 2_120_000, transcript: Object.freeze(Array.from({ length: 9 }, (_, index) => (
      Object.freeze({ messageId: `d2t_abcdefghijklmn${String(index).padStart(2, '0')}`, role: 'user' as const, content: 'A valid learner message.' })
    ))) };
    const freshGenerate = createDialogueV2CompletionAssessmentGenerator({
      nowMs: () => 2_000_000,
      resolveApiKey: () => 'test-api-key',
      resolveModel: async () => 'gpt-4.1-mini',
      fetchImpl,
    });
    await expect(freshGenerate(nine)).rejects.toThrow('dialogue_v2_completion_provider_failed');
    expect(fetchImpl).not.toHaveBeenCalled();

    const crossingNow = jest.fn().mockReturnValueOnce(2_000_000).mockReturnValue(2_060_000);
    const crossingGenerate = createDialogueV2CompletionAssessmentGenerator({
      nowMs: crossingNow,
      resolveApiKey: () => 'test-api-key',
      resolveModel: async () => 'gpt-4.1-mini',
      fetchImpl,
    });
    await expect(crossingGenerate(input)).rejects.toThrow('dialogue_v2_completion_provider_failed');
    expect(crossingNow).toHaveBeenCalledTimes(2);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('rejects duplicate message ids and control characters before provider egress', async () => {
    const fetchImpl = jest.fn();
    const generate = createDialogueV2CompletionAssessmentGenerator({
      nowMs: () => 2_000_000,
      resolveApiKey: () => 'test-api-key',
      resolveModel: async () => 'gpt-4.1-mini',
      fetchImpl,
    });
    const duplicate = {
      ...input,
      transcript: Object.freeze([
        input.transcript[0],
        Object.freeze({ ...input.transcript[0], content: 'A second message with the same id.' }),
      ]),
    };
    await expect(generate(duplicate)).rejects.toThrow('dialogue_v2_completion_provider_failed');

    const controlCharacter = {
      ...input,
      transcript: Object.freeze([
        Object.freeze({ ...input.transcript[0], content: 'Hello\u0000world.' }),
      ]),
    };
    await expect(generate(controlCharacter)).rejects.toThrow('dialogue_v2_completion_provider_failed');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
