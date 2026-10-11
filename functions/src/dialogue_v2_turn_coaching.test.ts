/* eslint-disable import/first */
const mockAuthorizePacket = jest.fn();

jest.mock('./dialogue_v2_server_authorization', () => ({
  authorizeDialogueV2ServerPacket: (...args: unknown[]) => mockAuthorizePacket(...args),
}));

import {
  DialogueV2TextTurnError,
  executeDialogueV2TextTurn,
  parseDialogueV2TextTurnInput,
  type DialogueV2TextTurnDependencies,
} from './dialogue_v2_turn_callable';
import {
  DIALOGUE_V2_COACHING_MAX_OUTPUT_TOKENS,
  DIALOGUE_V2_EMPTY_COACHING,
  acceptDialogueEnded,
  parseDialogueV2TurnCoaching,
} from './dialogue_v2_turn_coaching';

// зачем (D112): расширенный ход V2 — перевод, «Почему так», «Лучше так», подсказка,
// настроение и «собеседник закрыл сцену» — включается ТОЛЬКО запросом с interfaceLang,
// а старый клиент получает прежний ответ байт в байт.

const RELEASE = Object.freeze({ marker: 'approved-release' });

function packet() {
  return Object.freeze({
    studyTarget: 'en',
    packVersion: 'dialogues_v2_2026_09_26',
    packSha256: 'a'.repeat(64),
    catalogueSha256: 'b'.repeat(64),
    reviewReceiptSha256: 'c'.repeat(64),
    scenario: Object.freeze({
      id: 'everyday_01',
      worldId: 'everyday',
      rankRequired: 1,
      cefr: 'A1',
      personas: Object.freeze([Object.freeze({
        id: 'mia',
        replyStyle: 'formal',
        voiceMode: 'text_only',
        displayName: 'Mia',
        styleNote: 'Warm barista.',
        mood: 'measured',
        correctionStyle: 'gentle',
      })]),
      objectives: Object.freeze(Array.from({ length: 6 }, (_, index) => Object.freeze({
        id: `goal_${index + 1}`,
        label: `Goal ${index + 1}`,
      }))),
      groupReplyPolicy: Object.freeze({ maxDirectReplies: 1, maxUsefulFollowUps: 1, silenceAllowed: true }),
    }),
    content: Object.freeze({
      title: 'Order a coffee',
      briefing: 'Order a cappuccino and ask the price.',
      completionTone: 'friendly',
    }),
    review: Object.freeze({}),
  });
}

const COACHED_REPLY = JSON.stringify({
  replies: [{ personaId: 'mia', text: 'What size would you like?' }],
  coaching: {
    replyTranslations: ['Какой размер вы хотите?'],
    replyExplanations: ['«Would you like» — вежливый вопрос о желании.'],
    betterPhrasing: "I'd like a cappuccino, please.",
    hint: 'Назови размер напитка.',
    mood: 'smile',
    activeObjectiveId: 'goal_2',
    dialogueEnded: false,
  },
});

function dependencies(overrides: Partial<DialogueV2TextTurnDependencies> = {}) {
  const defaults: DialogueV2TextTurnDependencies = {
    resolveRelease: jest.fn(async () => RELEASE),
    resolveStableAccountId: jest.fn(async () => 'stable-user'),
    resolvePremiumAccess: jest.fn(async () => false),
    resolveStructuredMemory: jest.fn(async () => Object.freeze({ sharedSummary: null, scenarioCheckpoint: null })),
    enforceRateLimit: jest.fn(async () => undefined),
    reserveMonthlyQuota: jest.fn(async () => Object.freeze({
      remainingQuota: 29,
      resetAtMs: Date.UTC(2026, 9, 1),
      quotaVersion: 7,
      consumed: true,
    })),
    releaseMonthlyQuota: jest.fn(async () => undefined),
    generateReply: jest.fn(async () => COACHED_REPLY),
    assertStudyLanguage: jest.fn(() => undefined),
  };
  return { ...defaults, ...overrides } satisfies DialogueV2TextTurnDependencies;
}

function data(extra: Record<string, unknown> = {}) {
  return {
    sessionId: `d2s_${'S'.repeat(32)}`,
    turnId: `d2t_${'T'.repeat(16)}`,
    studyTarget: 'en',
    scenarioId: 'everyday_01',
    userMessage: 'I want cappuccino.',
    ...extra,
  };
}

function request(payload: unknown) {
  return Object.freeze({ auth: Object.freeze({ uid: 'auth-user' }), data: payload });
}

describe('Dialogue V2 turn coaching (D112)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthorizePacket.mockReturnValue(packet());
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  it('accepts interfaceLang only from the supported interface set', () => {
    expect(parseDialogueV2TextTurnInput(data({ interfaceLang: 'ru' }))?.interfaceLang).toBe('ru');
    expect(parseDialogueV2TextTurnInput(data())?.interfaceLang).toBeUndefined();
    expect(parseDialogueV2TextTurnInput(data({ interfaceLang: 'xx' }))).toBeNull();
    expect(parseDialogueV2TextTurnInput(data({ interfaceLang: 1 }))).toBeNull();
  });

  it('keeps the legacy response and prompt unchanged without interfaceLang', async () => {
    const deps = dependencies({
      generateReply: jest.fn(async () => JSON.stringify({
        replies: [{ personaId: 'mia', text: 'What size would you like?' }],
      })),
    });
    await expect(executeDialogueV2TextTurn(request(data()), deps)).resolves.toEqual({
      ok: true,
      kind: 'reply',
      replies: [{ personaId: 'mia', text: 'What size would you like?' }],
      quota: { period: 'calendar_month', remaining: 29, resetAtMs: Date.UTC(2026, 9, 1) },
    });
    const providerRequest = (deps.generateReply as jest.Mock).mock.calls[0][0];
    expect(Object.keys(providerRequest).sort()).toEqual(['expectedPersonaIds', 'systemPrompt', 'userMessage']);
    expect(providerRequest.systemPrompt).not.toContain('coaching');
  });

  it('a legacy request never accepts a coaching block from the model', async () => {
    const deps = dependencies();
    await expect(executeDialogueV2TextTurn(request(data()), deps))
      .rejects.toEqual(new DialogueV2TextTurnError('provider_incompatible'));
    expect(deps.releaseMonthlyQuota).toHaveBeenCalledTimes(1);
  });

  it('returns validated coaching and quotaVersion for a 2.0 request', async () => {
    const deps = dependencies();
    const response = await executeDialogueV2TextTurn(request(data({ interfaceLang: 'ru' })), deps);
    expect(response).toEqual({
      ok: true,
      kind: 'reply',
      replies: [{ personaId: 'mia', text: 'What size would you like?' }],
      quota: { period: 'calendar_month', remaining: 29, resetAtMs: Date.UTC(2026, 9, 1), quotaVersion: 7 },
      coaching: {
        replyTranslations: ['Какой размер вы хотите?'],
        replyExplanations: ['«Would you like» — вежливый вопрос о желании.'],
        betterPhrasing: "I'd like a cappuccino, please.",
        hint: 'Назови размер напитка.',
        mood: 'smile',
        activeObjectiveId: 'goal_2',
        dialogueEnded: false,
      },
    });
    const providerRequest = (deps.generateReply as jest.Mock).mock.calls[0][0];
    expect(providerRequest.maxOutputTokens).toBe(DIALOGUE_V2_COACHING_MAX_OUTPUT_TOKENS);
    expect(providerRequest.systemPrompt).toContain('"coaching"');
    expect(providerRequest.systemPrompt).toContain('Russian');
  });

  it('a missing coaching block never breaks the reply', async () => {
    const deps = dependencies({
      generateReply: jest.fn(async () => JSON.stringify({
        replies: [{ personaId: 'mia', text: 'What size would you like?' }],
      })),
    });
    const response = await executeDialogueV2TextTurn(request(data({ interfaceLang: 'ru' })), deps);
    expect(response.kind).toBe('reply');
    expect(response.kind === 'reply' ? response.coaching : null).toEqual(DIALOGUE_V2_EMPTY_COACHING);
    expect(console.warn).toHaveBeenCalledWith(
      '[DIALOGUE-V2] turn:coaching → provider omitted coaching block',
      expect.objectContaining({ scenarioId: 'everyday_01' }),
    );
  });

  it('drops invalid coaching fields one by one and logs only field names', () => {
    const result = parseDialogueV2TurnCoaching({
      replyTranslations: ['one', 'two'],
      replyExplanations: ['ok'],
      betterPhrasing: 'I want cappuccino',
      hint: 'x'.repeat(301),
      mood: 'furious',
      activeObjectiveId: 'goal_99',
      dialogueEnded: 'yes',
    }, {
      replyCount: 1,
      userMessage: 'I want cappuccino.',
      studyTarget: 'en',
      objectiveIds: ['goal_1', 'goal_2'],
      assertStudyLanguage: () => undefined,
    });
    expect(result.coaching).toEqual({
      replyTranslations: null,
      replyExplanations: ['ok'],
      betterPhrasing: null,
      hint: null,
      mood: null,
      activeObjectiveId: null,
      dialogueEnded: false,
    });
    expect(result.droppedFields).toEqual([
      'replyTranslations', 'betterPhrasing', 'hint', 'mood', 'activeObjectiveId', 'dialogueEnded',
    ]);
  });

  it('rejects a better phrasing that is not in the study language', () => {
    const result = parseDialogueV2TurnCoaching({
      replyTranslations: ['a'],
      replyExplanations: ['b'],
      betterPhrasing: 'Хочу капучино',
      hint: null,
      mood: 'happy',
      activeObjectiveId: null,
      dialogueEnded: true,
    }, {
      replyCount: 1,
      userMessage: 'I want cappuccino.',
      studyTarget: 'en',
      objectiveIds: ['goal_1'],
      assertStudyLanguage: () => { throw new Error('wrong_language'); },
    });
    expect(result.coaching.betterPhrasing).toBeNull();
    expect(result.coaching.dialogueEnded).toBe(true);
    expect(result.coaching.mood).toBe('happy');
  });
});

// зачем (Сверка 11.10, dialogs-038): модель закрыла сцену после 2-й реплики при невыполненных целях — конец снимается.
describe('acceptDialogueEnded — преждевременный конец диалога', () => {
  const objectives = ['goal_1', 'goal_2', 'goal_3', 'goal_4', 'goal_5', 'goal_6'];
  it('модель не просит конец — нет конца', () => {
    expect(acceptDialogueEnded({ modelEnded: false, activeObjectiveId: 'goal_6', objectiveIds: objectives })).toEqual({ ended: false, reason: 'not_requested' });
  });
  it('конец на последней цели — принимается', () => {
    expect(acceptDialogueEnded({ modelEnded: true, activeObjectiveId: 'goal_6', objectiveIds: objectives }).ended).toBe(true);
  });
  it('конец на 2-й цели после 2 ходов — снимается (dialogs-038)', () => {
    expect(acceptDialogueEnded({ modelEnded: true, activeObjectiveId: 'goal_2', objectiveIds: objectives, sessionTurnCount: 2 }))
      .toEqual({ ended: false, reason: 'premature' });
  });
  it('длинный разговор — принимается и без последней цели (страховка от вечного диалога)', () => {
    expect(acceptDialogueEnded({ modelEnded: true, activeObjectiveId: 'goal_3', objectiveIds: objectives, sessionTurnCount: 12 }).reason).toBe('long_dialogue');
  });
  it('разбор хода снимает преждевременный конец и называет поле', () => {
    const result = parseDialogueV2TurnCoaching({
      replyTranslations: ['a'], replyExplanations: ['b'], betterPhrasing: null, hint: null, mood: 'happy',
      activeObjectiveId: 'goal_2', dialogueEnded: true,
    }, {
      replyCount: 1, userMessage: 'Hi', studyTarget: 'en', objectiveIds: objectives, sessionTurnCount: 2,
      assertStudyLanguage: () => undefined,
    });
    expect(result.coaching.dialogueEnded).toBe(false);
    expect(result.droppedFields).toContain('dialogueEnded_premature');
  });
});
