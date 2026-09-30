import { createDialogueV2ProviderGenerator } from './dialogue_v2_turn_production_callable';
import { DIALOGUE_V2_COACHING_MAX_OUTPUT_TOKENS } from './dialogue_v2_turn_coaching';

// зачем (D112): расширенный ход длиннее — бюджет токенов и допустимая длина ответа
// растут только для запроса с разбором, обычный ход остаётся на прежних 500.

function fetchReturning(content: string) {
  return jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as Response));
}

const baseRequest = Object.freeze({
  systemPrompt: 'SERVER_AUTHORIZED_DIALOGUE_V2',
  userMessage: 'Hello',
  expectedPersonaIds: ['mia'],
  serverConversationContextExpiresAtMs: Date.now() + 60 * 60 * 1_000,
});

describe('Dialogue V2 provider budget for coaching', () => {
  it('keeps 500 tokens for a legacy turn', async () => {
    const fetchImpl = fetchReturning('{"replies":[]}');
    const generate = createDialogueV2ProviderGenerator({
      resolveApiKey: () => 'server-secret',
      resolveModel: async () => 'gpt-4o-mini',
      fetchImpl,
    });
    await generate(baseRequest);
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body)).max_tokens).toBe(500);
  });

  it('raises the budget and the accepted length for a coaching turn', async () => {
    const longContent = JSON.stringify({ replies: [], coaching: { hint: 'x'.repeat(4_000) } });
    const fetchImpl = fetchReturning(longContent);
    const generate = createDialogueV2ProviderGenerator({
      resolveApiKey: () => 'server-secret',
      resolveModel: async () => 'gpt-4o-mini',
      fetchImpl,
    });
    await expect(generate({ ...baseRequest, maxOutputTokens: DIALOGUE_V2_COACHING_MAX_OUTPUT_TOKENS }))
      .resolves.toBe(longContent);
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body)).max_tokens)
      .toBe(DIALOGUE_V2_COACHING_MAX_OUTPUT_TOKENS);
  });

  it('never lets a request exceed the server ceiling', async () => {
    const fetchImpl = fetchReturning('{"replies":[]}');
    const generate = createDialogueV2ProviderGenerator({
      resolveApiKey: () => 'server-secret',
      resolveModel: async () => 'gpt-4o-mini',
      fetchImpl,
    });
    await generate({ ...baseRequest, maxOutputTokens: 50_000 });
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body)).max_tokens).toBe(1_200);
  });
});
