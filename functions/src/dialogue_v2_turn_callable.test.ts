/* eslint-disable import/first */
const mockAuthorizePacket = jest.fn();

jest.mock('./dialogue_v2_server_authorization', () => ({
  authorizeDialogueV2ServerPacket: (...args: unknown[]) => mockAuthorizePacket(...args),
}));

import {
  DialogueV2TextTurnError,
  executeDialogueV2TextTurn,
  type DialogueV2TextTurnDependencies,
} from './dialogue_v2_turn_callable';

const RELEASE = Object.freeze({ marker: 'approved-304-release' });

function packet(personas: readonly Readonly<Record<string, unknown>>[] = [
  {
    id: 'host',
    replyStyle: 'formal',
    voiceMode: 'text_only',
    displayName: 'Herr Weber',
    styleNote: 'Bleibt höflich und bittet um präzise Begründungen.',
    mood: 'measured',
    correctionStyle: 'gentle',
  },
]) {
  return Object.freeze({
    studyTarget: 'de',
    packVersion: 'dialogues_v2_2026_09_26',
    packSha256: 'a'.repeat(64),
    catalogueSha256: 'b'.repeat(64),
    reviewReceiptSha256: 'c'.repeat(64),
    scenario: Object.freeze({
      id: 'work_01',
      worldId: 'work',
      rankRequired: 1,
      cefr: 'A1',
      personas: Object.freeze(personas),
      objectives: Object.freeze(Array.from({ length: 6 }, (_, index) => Object.freeze({
        id: `goal_${index + 1}`,
        label: `Gesprächsziel ${index + 1} erfüllen.`,
      }))),
      groupReplyPolicy: Object.freeze({
        maxDirectReplies: 1,
        maxUsefulFollowUps: 1,
        silenceAllowed: true,
      }),
    }),
    content: Object.freeze({
      title: 'Im Team schreiben',
      briefing: 'Kläre eine Aufgabe freundlich und eindeutig im Teamchat.',
      completionTone: 'freundlich und sachlich',
    }),
    review: Object.freeze({}),
  });
}

function dependencies(overrides: Partial<DialogueV2TextTurnDependencies> = {}) {
  const defaults: DialogueV2TextTurnDependencies = {
    resolveRelease: jest.fn(async () => RELEASE),
    resolveStableAccountId: jest.fn(async () => 'stable-user'),
    resolvePremiumAccess: jest.fn(async () => false),
    resolveStructuredMemory: jest.fn(async () => Object.freeze({
      sharedSummary: null,
      scenarioCheckpoint: null,
    })),
    enforceRateLimit: jest.fn(async () => undefined),
    reserveMonthlyQuota: jest.fn(async () => Object.freeze({
      remainingQuota: 29,
      resetAtMs: Date.UTC(2026, 9, 1),
      quotaVersion: 1,
      consumed: true,
    })),
    releaseMonthlyQuota: jest.fn(async () => undefined),
    generateReply: jest.fn(async () => JSON.stringify({
      replies: [{ personaId: 'host', text: 'Guten Tag! Was möchten Sie im Team klären?' }],
    })),
    assertStudyLanguage: jest.fn(() => undefined),
  };
  return { ...defaults, ...overrides } satisfies DialogueV2TextTurnDependencies;
}

function request(data: unknown = {
  sessionId: `d2s_${'S'.repeat(32)}`,
  turnId: `d2t_${'T'.repeat(16)}`,
  studyTarget: 'de',
  scenarioId: 'work_01',
  userMessage: 'Guten Tag, können wir die Aufgabe planen?',
}) {
  return Object.freeze({ auth: Object.freeze({ uid: 'auth-user' }), data });
}

describe('Dialogue V2 server-owned text turn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthorizePacket.mockReturnValue(packet());
  });

  it('rejects unauthenticated or client-authored authority before release/provider work', async () => {
    const deps = dependencies();
    const forbiddenFields = [
      'role', 'setting', 'persona', 'objectives', 'rank', 'isPremium', 'price', 'history', 'memory',
      'groupState', 'lastSpeakerId', 'relevanceByPersonaId',
    ];

    await expect(executeDialogueV2TextTurn({ data: request().data }, deps))
      .rejects.toEqual(new DialogueV2TextTurnError('auth_required'));

    for (const field of forbiddenFields) {
      await expect(executeDialogueV2TextTurn(request({
        sessionId: `d2s_${'S'.repeat(32)}`,
        turnId: `d2t_${'T'.repeat(16)}`,
        studyTarget: 'de',
        scenarioId: 'work_01',
        userMessage: 'Hallo!',
        [field]: field === 'isPremium' ? true : 'attacker-controlled',
      }), deps)).rejects.toEqual(new DialogueV2TextTurnError('request_invalid'));
    }

    expect(deps.resolveRelease).not.toHaveBeenCalled();
    expect(deps.reserveMonthlyQuota).not.toHaveBeenCalled();
    expect(deps.generateReply).not.toHaveBeenCalled();
  });

  it('accepts only canonical bounded data values and rejects accessors and proxies', async () => {
    const deps = dependencies();
    const getter = jest.fn(() => 'de');
    const accessor = Object.defineProperty({
      scenarioId: 'work_01',
      userMessage: 'Hallo!',
    }, 'studyTarget', { enumerable: true, get: getter });
    const invalid = [
      null,
      {},
      { studyTarget: 'de', scenarioId: 'work_01', userMessage: 'Hallo' },
      { studyTarget: 'it', scenarioId: 'work_01', userMessage: 'Ciao' },
      request({
        sessionId: `d2s_${'S'.repeat(32)}`,
        turnId: `d2t_${'T'.repeat(16)}`,
        studyTarget: 'de', scenarioId: '../work_01', userMessage: 'Hallo',
      }).data,
      request({
        sessionId: `d2s_${'S'.repeat(32)}`,
        turnId: `d2t_${'T'.repeat(16)}`,
        studyTarget: 'de', scenarioId: 'work_01', userMessage: '',
      }).data,
      request({
        sessionId: `d2s_${'S'.repeat(32)}`,
        turnId: `d2t_${'T'.repeat(16)}`,
        studyTarget: 'de', scenarioId: 'work_01', userMessage: 'x'.repeat(2001),
      }).data,
      accessor,
      new Proxy({
        sessionId: `d2s_${'S'.repeat(32)}`,
        turnId: `d2t_${'T'.repeat(16)}`,
        studyTarget: 'de', scenarioId: 'work_01', userMessage: 'Hallo',
      }, {}),
    ];

    for (const data of invalid) {
      await expect(executeDialogueV2TextTurn(request(data), deps))
        .rejects.toEqual(new DialogueV2TextTurnError('request_invalid'));
    }

    expect(getter).not.toHaveBeenCalled();
    expect(deps.resolveRelease).not.toHaveBeenCalled();
  });

  it('rate-limits an authenticated valid request before loading the active release', async () => {
    const deps = dependencies({ resolveRelease: jest.fn(async () => null) });

    await expect(executeDialogueV2TextTurn(request(), deps))
      .rejects.toEqual(new DialogueV2TextTurnError('release_unavailable'));

    expect(mockAuthorizePacket).not.toHaveBeenCalled();
    expect(deps.resolveStableAccountId).toHaveBeenCalledWith('auth-user');
    expect(deps.enforceRateLimit).toHaveBeenCalledWith('auth-user', 'stable-user');
    expect(
      (deps.enforceRateLimit as jest.Mock).mock.invocationCallOrder[0],
    ).toBeLessThan(
      (deps.resolveRelease as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(deps.reserveMonthlyQuota).not.toHaveBeenCalled();
    expect(deps.generateReply).not.toHaveBeenCalled();

    mockAuthorizePacket.mockReturnValueOnce(null);
    const rejected = dependencies();
    await expect(executeDialogueV2TextTurn(request(), rejected))
      .rejects.toEqual(new DialogueV2TextTurnError('release_unavailable'));
    expect(mockAuthorizePacket).toHaveBeenCalledWith({ studyTarget: 'de', scenarioId: 'work_01' }, RELEASE);
    expect(rejected.enforceRateLimit).toHaveBeenCalledTimes(1);
  });

  it('builds the prompt only from the authorized packet and returns a bounded learner-safe reply', async () => {
    const deps = dependencies();

    await expect(executeDialogueV2TextTurn(request(), deps)).resolves.toEqual({
      ok: true,
      kind: 'reply',
      replies: [{ personaId: 'host', text: 'Guten Tag! Was möchten Sie im Team klären?' }],
      quota: {
        period: 'calendar_month',
        remaining: 29,
        resetAtMs: Date.UTC(2026, 9, 1),
      },
    });

    expect(deps.resolvePremiumAccess).toHaveBeenCalledWith('stable-user', 'auth-user');
    expect(deps.resolveStructuredMemory).toHaveBeenCalledWith(
      'stable-user', 'auth-user', 'de', 'work_01', false,
    );
    expect(deps.reserveMonthlyQuota).toHaveBeenCalledWith('auth-user', 'stable-user', false);
    expect(deps.generateReply).toHaveBeenCalledTimes(1);
    const providerRequest = (deps.generateReply as jest.Mock).mock.calls[0][0];
    expect(providerRequest.userMessage).toBe('Guten Tag, können wir die Aufgabe planen?');
    expect(providerRequest.expectedPersonaIds).toEqual(['host']);
    expect(providerRequest.systemPrompt).toContain('SERVER_AUTHORIZED_DIALOGUE_V2');
    expect(providerRequest.systemPrompt).toContain('Im Team schreiben');
    expect(providerRequest.systemPrompt).toContain('goal_1');
    expect(providerRequest.systemPrompt).not.toContain('stable-user');
    expect(providerRequest.systemPrompt).not.toContain('auth-user');
    expect(Object.keys(providerRequest).sort()).toEqual([
      'expectedPersonaIds', 'systemPrompt', 'userMessage',
    ]);
    expect(deps.assertStudyLanguage).toHaveBeenCalledWith(
      'Guten Tag! Was möchten Sie im Team klären?',
      'de',
    );
  });

  it('uses server-owned group planning for direct address and never asks for more than two replies', async () => {
    mockAuthorizePacket.mockReturnValue(packet([
      {
        id: 'anna', replyStyle: 'warm', voiceMode: 'text_only', displayName: 'Anna',
        styleNote: 'Antwortet warm und kurz.', mood: 'open', correctionStyle: 'playful_gentle',
      },
      {
        id: 'ben', replyStyle: 'direct', voiceMode: 'text_only', displayName: 'Ben',
        styleNote: 'Antwortet direkt und praktisch.', mood: 'focused', correctionStyle: 'gentle',
      },
      {
        id: 'cara', replyStyle: 'calm', voiceMode: 'text_only', displayName: 'Cara',
        styleNote: 'Antwortet ruhig und abgewogen.', mood: 'measured', correctionStyle: 'none',
      },
    ]));
    const deps = dependencies({
      generateReply: jest.fn(async ({ expectedPersonaIds }) => JSON.stringify({
        replies: expectedPersonaIds.map((personaId: string) => ({
          personaId,
          text: `${personaId}: Ja, das können wir gemeinsam planen.`,
        })),
      })),
    });

    const result = await executeDialogueV2TextTurn(request({
      sessionId: `d2s_${'S'.repeat(32)}`,
      turnId: `d2t_${'T'.repeat(16)}`,
      studyTarget: 'de',
      scenarioId: 'work_01',
      userMessage: 'Anna, können wir alle gemeinsam einen Plan machen?',
    }), deps);

    expect(result.kind).toBe('reply');
    if (result.kind !== 'reply') throw new Error('expected reply');
    expect(result.replies[0].personaId).toBe('anna');
    expect(result.replies).toHaveLength(2);
    expect(new Set(result.replies.map((reply) => reply.personaId)).size).toBe(2);
  });

  it('continues group scheduling from server session state and exposes only selected immutable personas', async () => {
    mockAuthorizePacket.mockReturnValue(packet([
      {
        id: 'anna', replyStyle: 'warm', voiceMode: 'text_only', displayName: 'Anna',
        styleNote: 'Antwortet warm und kurz.', mood: 'open', correctionStyle: 'playful_gentle',
      },
      {
        id: 'ben', replyStyle: 'direct', voiceMode: 'text_only', displayName: 'Ben',
        styleNote: 'Antwortet direkt und praktisch.', mood: 'focused', correctionStyle: 'gentle',
      },
      {
        id: 'cara', replyStyle: 'calm', voiceMode: 'text_only', displayName: 'Cara',
        styleNote: 'Antwortet ruhig und abgewogen.', mood: 'measured', correctionStyle: 'none',
      },
    ]));
    const deps = dependencies({
      sessionGroupState: Object.freeze({
        schemaVersion: 1,
        turnCount: 1,
        lastSpeakerId: 'anna',
        relevanceByPersonaId: Object.freeze({ anna: 3, ben: 5, cara: 1 }),
      }),
      generateReply: jest.fn(async ({ expectedPersonaIds }) => JSON.stringify({
        replies: expectedPersonaIds.map((personaId: string) => ({
          personaId,
          text: `${personaId}: Ich antworte passend.`,
        })),
      })),
    });

    await executeDialogueV2TextTurn(request({
      sessionId: `d2s_${'S'.repeat(32)}`,
      turnId: `d2t_${'U'.repeat(16)}`,
      studyTarget: 'de',
      scenarioId: 'work_01',
      userMessage: 'Wir sollten den nächsten Punkt besprechen.',
    }), deps);

    const providerRequest = (deps.generateReply as jest.Mock).mock.calls[0][0];
    expect(providerRequest.expectedPersonaIds).toEqual(['ben']);
    expect(providerRequest.systemPrompt).toContain('Antwortet direkt und praktisch.');
    expect(providerRequest.systemPrompt).not.toContain('Antwortet warm und kurz.');
    expect(providerRequest.systemPrompt).not.toContain('Antwortet ruhig und abgewogen.');
    expect(providerRequest).not.toHaveProperty('sessionGroupState');
    expect(providerRequest.systemPrompt).not.toContain('relevanceByPersonaId');
  });

  it('fails closed before quota/provider when server scheduling state references an unknown persona', async () => {
    mockAuthorizePacket.mockReturnValue(packet([
      {
        id: 'anna', replyStyle: 'warm', voiceMode: 'text_only', displayName: 'Anna',
        styleNote: 'Antwortet warm und kurz.', mood: 'open', correctionStyle: 'gentle',
      },
      {
        id: 'ben', replyStyle: 'direct', voiceMode: 'text_only', displayName: 'Ben',
        styleNote: 'Antwortet direkt und praktisch.', mood: 'focused', correctionStyle: 'gentle',
      },
    ]));
    const deps = dependencies({
      sessionGroupState: Object.freeze({
        schemaVersion: 1,
        turnCount: 2,
        lastSpeakerId: 'intruder',
        relevanceByPersonaId: Object.freeze({ intruder: 5 }),
      }),
    });

    await expect(executeDialogueV2TextTurn(request(), deps))
      .rejects.toEqual(new DialogueV2TextTurnError('access_unavailable'));
    expect(deps.reserveMonthlyQuota).not.toHaveBeenCalled();
    expect(deps.generateReply).not.toHaveBeenCalled();
  });

  it('rate-limits a low-value group acknowledgement while keeping monthly quota untouched', async () => {
    mockAuthorizePacket.mockReturnValue(packet([
      {
        id: 'anna', replyStyle: 'warm', voiceMode: 'text_only', displayName: 'Anna',
        styleNote: 'Antwortet warm und kurz.', mood: 'open', correctionStyle: 'gentle',
      },
      {
        id: 'ben', replyStyle: 'direct', voiceMode: 'text_only', displayName: 'Ben',
        styleNote: 'Antwortet direkt und praktisch.', mood: 'focused', correctionStyle: 'gentle',
      },
    ]));
    const deps = dependencies();

    await expect(executeDialogueV2TextTurn(request({
      sessionId: `d2s_${'S'.repeat(32)}`,
      turnId: `d2t_${'T'.repeat(16)}`,
      studyTarget: 'de', scenarioId: 'work_01', userMessage: 'Ok.',
    }), deps)).resolves.toEqual({ ok: true, kind: 'silence', replies: [] });

    expect(deps.resolveStableAccountId).toHaveBeenCalledWith('auth-user');
    expect(deps.enforceRateLimit).toHaveBeenCalledWith('auth-user', 'stable-user');
    expect(deps.reserveMonthlyQuota).not.toHaveBeenCalled();
    expect(deps.generateReply).not.toHaveBeenCalled();
  });

  it('resolves Plus only on the server and preserves unlimited quota behavior', async () => {
    const deps = dependencies({ resolvePremiumAccess: jest.fn(async () => true) });

    await executeDialogueV2TextTurn(request(), deps);

    expect(deps.reserveMonthlyQuota).toHaveBeenCalledWith('auth-user', 'stable-user', true);
  });

  it('injects only bounded server-read structured memory and keeps Plus checkpoint continuity', async () => {
    const deps = dependencies({
      resolvePremiumAccess: jest.fn(async () => true),
      resolveStructuredMemory: jest.fn(async () => Object.freeze({
        sharedSummary: Object.freeze({
          strengths: Object.freeze(['social_01_o1']),
          focusAreas: Object.freeze(['social_01_o2']),
          completedObjectives: 1,
        }),
        scenarioCheckpoint: Object.freeze({
          nextObjectiveIndex: 2,
          completedObjectiveIds: Object.freeze(['goal_1']),
          personaState: Object.freeze({ host: 'measured' }),
        }),
      })),
    });

    await executeDialogueV2TextTurn(request(), deps);

    const providerRequest = (deps.generateReply as jest.Mock).mock.calls[0][0];
    expect(providerRequest.systemPrompt).toContain('SERVER_AUTHORIZED_STRUCTURED_MEMORY=');
    expect(providerRequest.systemPrompt).toContain('social_01_o1');
    expect(providerRequest.systemPrompt).toContain('"nextObjectiveIndex":2');
    expect(providerRequest.systemPrompt).not.toMatch(/transcript|assessment|learnerText/i);
  });

  it('fails closed before quota/provider on memory faults or Free thread continuity', async () => {
    const storageFailure = dependencies({
      resolveStructuredMemory: jest.fn(async () => { throw new Error('storage_unavailable'); }),
    });
    await expect(executeDialogueV2TextTurn(request(), storageFailure))
      .rejects.toEqual(new DialogueV2TextTurnError('access_unavailable'));
    expect(storageFailure.reserveMonthlyQuota).not.toHaveBeenCalled();
    expect(storageFailure.generateReply).not.toHaveBeenCalled();

    const freeThread = dependencies({
      resolveStructuredMemory: jest.fn(async () => ({
        sharedSummary: null,
        scenarioCheckpoint: {
          nextObjectiveIndex: 1,
          completedObjectiveIds: ['goal_1'],
          personaState: { host: 'measured' },
        },
      })),
    });
    await expect(executeDialogueV2TextTurn(request(), freeThread))
      .rejects.toEqual(new DialogueV2TextTurnError('access_unavailable'));
    expect(freeThread.generateReply).not.toHaveBeenCalled();
  });

  it.each([
    ['malformed JSON', 'not json'],
    ['unapproved persona', JSON.stringify({ replies: [{ personaId: 'attacker', text: 'Hallo!' }] })],
    ['extra envelope authority', JSON.stringify({
      replies: [{ personaId: 'host', text: 'Hallo!' }],
      objectivesMet: ['goal_1'],
    })],
    ['empty text', JSON.stringify({ replies: [{ personaId: 'host', text: '' }] })],
  ])('fails closed and releases a consumed quota reservation for %s', async (_label, generated) => {
    const deps = dependencies({ generateReply: jest.fn(async () => generated) });

    await expect(executeDialogueV2TextTurn(request(), deps))
      .rejects.toEqual(new DialogueV2TextTurnError('provider_incompatible'));

    expect(deps.releaseMonthlyQuota).toHaveBeenCalledWith(
      'auth-user', 'stable-user', Date.UTC(2026, 9, 1),
    );
  });

  it('fails closed and releases quota when the language guard rejects provider text', async () => {
    const deps = dependencies({
      assertStudyLanguage: jest.fn(() => { throw new Error('wrong language'); }),
    });

    await expect(executeDialogueV2TextTurn(request(), deps))
      .rejects.toEqual(new DialogueV2TextTurnError('provider_incompatible'));
    expect(deps.releaseMonthlyQuota).toHaveBeenCalledTimes(1);
  });

  it('releases a consumed monthly reservation when the provider deadline rejects', async () => {
    const providerDeadline = new DOMException('deadline', 'AbortError');
    const deps = dependencies({
      generateReply: jest.fn(async () => { throw providerDeadline; }),
    });

    await expect(executeDialogueV2TextTurn(request(), deps))
      .rejects.toEqual(new DialogueV2TextTurnError('provider_failed'));
    expect(deps.releaseMonthlyQuota).toHaveBeenCalledWith(
      'auth-user', 'stable-user', Date.UTC(2026, 9, 1),
    );
  });

  it('never calls the provider when the authoritative monthly quota rejects the turn', async () => {
    const quotaError = new Error('dialog_free_limit');
    const deps = dependencies({
      reserveMonthlyQuota: jest.fn(async () => { throw quotaError; }),
    });

    await expect(executeDialogueV2TextTurn(request(), deps)).rejects.toBe(quotaError);
    expect(deps.generateReply).not.toHaveBeenCalled();
    expect(deps.releaseMonthlyQuota).not.toHaveBeenCalled();
  });
});
