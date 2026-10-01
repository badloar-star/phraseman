import { DIALOGUE_V2_CATALOGUE_INDEX } from '../../shared/dialogue_v2_catalogue_index';
import { DIALOGUE_V2_STUDY_TARGETS } from '../../shared/dialogue_v2_language_pack_contract';
import { DIALOGUE_V2_FREEFORM_OPENINGS } from '../../shared/dialogue_v2_freeform_openings.generated';
import {
  loadEmbeddedDialogueV2ServerRelease,
  resetEmbeddedDialogueV2ServerReleaseForTests,
} from './dialogue_v2_embedded_release';
import {
  authorizeDialogueV2ServerCatalogue,
  authorizeDialogueV2ServerPacket,
} from './dialogue_v2_server_authorization';
import {
  executeDialogueV2TextTurn,
  type DialogueV2ProviderTurnRequest,
  type DialogueV2TextTurnDependencies,
} from './dialogue_v2_turn_callable';
import { createDialogueV2ProviderGenerator } from './dialogue_v2_turn_production_callable';
import { buildDialogueV2FreeformTextProducerRequest } from './dialogue_v2_freeform_text_provider';

/**
 * Владелец 01.10: «первая реплика всегда уже должна быть на экране». Реплика едет
 * в пакете (content.opening), телефон показывает её сразу, а сервер кладёт её первым
 * ходом собеседника в историю провайдера — ИИ первую реплику не генерирует.
 */
describe('Dialogue V2 opening line (server)', () => {
  beforeEach(() => resetEmbeddedDialogueV2ServerReleaseForTests());

  it('every authorized packet of the embedded release carries an opening from a scene participant', () => {
    const release = loadEmbeddedDialogueV2ServerRelease();
    expect(release).not.toBeNull();
    let count = 0;
    for (const studyTarget of DIALOGUE_V2_STUDY_TARGETS) {
      const catalogue = authorizeDialogueV2ServerCatalogue(studyTarget, release);
      expect(catalogue?.packets).toHaveLength(DIALOGUE_V2_CATALOGUE_INDEX.length);
      for (const packet of catalogue!.packets) {
        const opening = packet.content.opening;
        expect(opening).toBeDefined();
        expect(packet.scenario.personas.map((persona) => persona.id)).toContain(opening!.personaId);
        expect(opening!.text.length).toBeGreaterThan(0);
        expect(opening!.text.length).toBeLessThanOrEqual(600);
        count += 1;
      }
    }
    expect(count).toBe(304);
  });

  it('the turn core forwards the packet opening to the provider and names it in the system prompt', async () => {
    const release = loadEmbeddedDialogueV2ServerRelease();
    const packet = authorizeDialogueV2ServerPacket({ studyTarget: 'en', scenarioId: 'social_01' }, release)!;
    const opening = packet.content.opening!;
    const generateReply = jest.fn(async (_request: DialogueV2ProviderTurnRequest) => JSON.stringify({
      replies: [{ personaId: opening.personaId, text: 'Nice to meet you too!' }],
    }));
    const dependencies: DialogueV2TextTurnDependencies = {
      resolveRelease: async () => release,
      resolveStableAccountId: async () => 'stable-user',
      resolvePremiumAccess: async () => false,
      resolveStructuredMemory: async () => ({ sharedSummary: null, scenarioCheckpoint: null }),
      enforceRateLimit: async () => undefined,
      reserveMonthlyQuota: async () => ({ remainingQuota: 29, resetAtMs: Date.UTC(2026, 10, 1), quotaVersion: 1, consumed: true }),
      releaseMonthlyQuota: async () => undefined,
      generateReply,
      assertStudyLanguage: () => undefined,
    };
    await executeDialogueV2TextTurn({
      auth: { uid: 'auth-user' },
      data: {
        sessionId: `d2s_${'S'.repeat(32)}`,
        turnId: `d2t_${'T'.repeat(16)}`,
        studyTarget: 'en',
        scenarioId: 'social_01',
        userMessage: 'Hi Mila! I am fine, thanks.',
      },
    }, dependencies);
    expect(generateReply).toHaveBeenCalledTimes(1);
    const sent = generateReply.mock.calls[0][0];
    expect(sent.serverOpening).toEqual({ personaId: opening.personaId, text: opening.text });
    expect(sent.systemPrompt).toContain('SERVER_AUTHORIZED_OPENING=');
    expect(sent.systemPrompt).toContain('do not greet again');
  });

  it('the provider transport puts the opening as the first assistant turn, before any learner text', async () => {
    const fetchImpl = jest.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"replies":[{"personaId":"mila","text":"Great!"}]}' } }] }),
    } as Response));
    const generate = createDialogueV2ProviderGenerator({
      resolveApiKey: () => 'server-secret',
      resolveModel: async () => 'gpt-4o-mini',
      fetchImpl,
    });
    await generate({
      systemPrompt: 'SERVER_AUTHORIZED_DIALOGUE_V2',
      userMessage: 'Hi! I am fine.',
      expectedPersonaIds: ['mila'],
      serverConversationContextExpiresAtMs: Date.now() + 60_000,
      serverOpening: { personaId: 'mila', text: 'Hi! How are you today?' },
    });
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(body.messages).toEqual([
      { role: 'system', content: 'SERVER_AUTHORIZED_DIALOGUE_V2' },
      { role: 'assistant', content: JSON.stringify({ replies: [{ personaId: 'mila', text: 'Hi! How are you today?' }] }) },
      { role: 'user', content: 'Hi! I am fine.' },
    ]);
  });

  it('a malformed opening never reaches the provider', async () => {
    const fetchImpl = jest.fn();
    const generate = createDialogueV2ProviderGenerator({
      resolveApiKey: () => 'server-secret',
      resolveModel: async () => 'gpt-4o-mini',
      fetchImpl,
    });
    await expect(generate({
      systemPrompt: 'SERVER_AUTHORIZED_DIALOGUE_V2',
      userMessage: 'Hi!',
      expectedPersonaIds: ['mila'],
      serverConversationContextExpiresAtMs: Date.now() + 60_000,
      serverOpening: { personaId: 'Mila Admin', text: 'x' },
    })).rejects.toThrow('dialogue_v2_provider_failed');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each(DIALOGUE_V2_STUDY_TARGETS)('freeform %s conversation starts with the shared opening line', (studyTarget) => {
    const built = buildDialogueV2FreeformTextProducerRequest({
      sessionId: `d2fs_${'A'.repeat(32)}`,
      turnId: `d2ft_${'B'.repeat(16)}`,
      studyTarget,
      userMessage: 'Hello there',
      sessionExpiresAtMs: 2_000_000_000_000 + 60_000,
      priorTurns: [],
      languageBranchMemory: null,
    }, 2_000_000_000_000);
    expect(built.conversation[0]).toEqual({ role: 'assistant', content: DIALOGUE_V2_FREEFORM_OPENINGS[studyTarget] });
    expect(built.conversation[1]).toEqual({ role: 'user', content: 'Hello there' });
  });
});
