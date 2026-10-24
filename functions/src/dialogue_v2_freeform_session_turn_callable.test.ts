import { readFileSync } from 'node:fs';
import path from 'node:path';
import { HttpsError } from 'firebase-functions/v2/https';

import * as adapterModuleExports from './dialogue_v2_freeform_production_adapter';
import {
  DIALOGUE_V2_FREEFORM_SESSION_TURN_OPTIONS,
  createDialogueV2FreeformAtomicSessionTurner,
  createDialogueV2FreeformMemoryAwareTurnProducer,
  createDialogueV2FreeformSessionTurnHandler,
} from './dialogue_v2_freeform_session_turn_callable';

const SESSION_ID = `d2fs_${'S'.repeat(32)}`;
const TURN_ID = `d2ft_${'T'.repeat(16)}`;
const EXPIRES_AT_MS = 2_000_086_400_000;

function request(overrides: Record<string, unknown> = {}) {
  return {
    auth: { uid: 'auth-user' },
    data: {
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      studyTarget: 'en',
      userMessage: 'Can we practise a natural introduction?',
      ...overrides,
    },
  };
}

function dependencies() {
  return {
    runAuthorizedTurn: jest.fn(async () => ({
      ok: true as const,
      kind: 'new' as const,
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      assistantMessage: 'Of course — tell me where you are meeting this person.',
      expiresAtMs: EXPIRES_AT_MS,
    })),
  };
}

function storedMemory(
  studyTarget: 'en' | 'es' | 'fr' | 'de' = 'en',
  overrides: Record<string, unknown> = {},
) {
  return {
    schemaVersion: 1,
    kind: 'dialogue_v2_plus_freeform_memory',
    studyTarget,
    revision: 3,
    updatedAtMs: 2_000_000_000_000,
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
    ...overrides,
  };
}

function serverTurnInput(studyTarget: 'en' | 'es' | 'fr' | 'de' = 'en') {
  return {
    sessionId: SESSION_ID,
    turnId: TURN_ID,
    studyTarget,
    userMessage: 'Can we practise a natural introduction?',
    sessionExpiresAtMs: EXPIRES_AT_MS,
    priorTurns: [],
  };
}

function memoryEnvelope(stableAccountId: string, memory: unknown) {
  return {
    actor: { authUid: 'auth-user', stableAccountId },
    memory,
  };
}

describe('Dialogue V2 Plus freeform session turn callable', () => {
  beforeEach(() => jest.clearAllMocks());

  test('does not trust an authorization runner injected into CommonJS exports after load', async () => {
    const adapterExports = adapterModuleExports as unknown as Record<string, unknown>;
    const exportName = 'runDialogueV2FreeformProductionAuthorizationTransaction';
    const original = adapterExports[exportName];
    const injectedRunner = jest.fn(async () => ({
      authUid: 'forged-auth',
      stableAccountId: 'forged-stable',
    }));
    adapterExports[exportName] = injectedRunner;
    const runTransaction = jest.fn(async () => {
      throw new Error('real_runner_called');
    });
    const produceAssistant = jest.fn(async () => 'forged answer');
    const turn = createDialogueV2FreeformAtomicSessionTurner({
      db: { runTransaction } as never,
      nowMs: () => 2_000_000_000_000,
      generateClaimToken: () => `d2fc_${'C'.repeat(32)}`,
      bindOwner: () => 'a'.repeat(64),
      digestTurnRequest: () => 'b'.repeat(64),
      timestampFromMillis: (millis) => ({ toMillis: () => millis }),
      readLanguageBranchMemoryWithActor: jest.fn(async () => (
        memoryEnvelope('stable-a', null) as never
      )),
      produceAssistant,
    });

    try {
      await expect(turn('auth-user', request().data as never))
        .rejects.toThrow('real_runner_called');
      expect(runTransaction).toHaveBeenCalledTimes(1);
      expect(injectedRunner).not.toHaveBeenCalled();
      expect(produceAssistant).not.toHaveBeenCalled();
    } finally {
      adapterExports[exportName] = original;
    }
  });

  test('passes only the authoritative same-target memory draft to the assistant producer', async () => {
    const readLanguageBranchMemoryWithActor = jest.fn(async () => (
      memoryEnvelope('stable-a', storedMemory('es'))
    ));
    const produceAssistant = jest.fn(async (_input: unknown) => (
      'Claro — empecemos con una presentación.'
    ));
    const producer = createDialogueV2FreeformMemoryAwareTurnProducer({
      authUid: 'auth-user',
      expectedActor: { authUid: 'auth-user', stableAccountId: 'stable-a' },
      readLanguageBranchMemoryWithActor,
      revalidateCanonicalActor: jest.fn(async () => ({
        authUid: 'auth-user', stableAccountId: 'stable-a',
      })),
      produceAssistant,
    });

    await expect(producer(serverTurnInput('es')))
      .resolves.toBe('Claro — empecemos con una presentación.');
    expect(readLanguageBranchMemoryWithActor).toHaveBeenCalledWith('auth-user', 'es');
    expect(produceAssistant).toHaveBeenCalledWith({
      ...serverTurnInput('es'),
      languageBranchMemory: {
        learnerProfile: storedMemory('es').learnerProfile,
        recurringPatterns: storedMemory('es').recurringPatterns,
        recentTopics: storedMemory('es').recentTopics,
      },
    });
    const providerInput = produceAssistant.mock.calls[0]?.[0] as Readonly<{
      languageBranchMemory: unknown;
    }>;
    expect(JSON.stringify(providerInput.languageBranchMemory)).not.toMatch(
      /schemaVersion|kind|studyTarget|revision|updatedAtMs|raw|turnId|userMessage|assistantMessage/i,
    );
  });

  test('passes null when authoritative memory is absent', async () => {
    const produceAssistant = jest.fn(async (_input: unknown) => 'Let us begin.');
    const producer = createDialogueV2FreeformMemoryAwareTurnProducer({
      authUid: 'auth-user',
      expectedActor: { authUid: 'auth-user', stableAccountId: 'stable-a' },
      readLanguageBranchMemoryWithActor: jest.fn(async () => (
        memoryEnvelope('stable-a', null)
      )),
      revalidateCanonicalActor: jest.fn(async () => ({
        authUid: 'auth-user', stableAccountId: 'stable-a',
      })),
      produceAssistant,
    });

    await expect(producer(serverTurnInput())).resolves.toBe('Let us begin.');
    expect(produceAssistant).toHaveBeenCalledWith({
      ...serverTurnInput(),
      languageBranchMemory: null,
    });
  });

  test.each([
    ['owner mismatch', new Error('dialogue_v2_freeform_memory_access_denied')],
    ['deleted account', new Error('dialogue_v2_freeform_memory_access_denied')],
    ['Plus revocation', new Error('dialogue_v2_freeform_memory_plus_required')],
    ['authorization race', new Error('dialogue_v2_freeform_memory_authorization_unavailable')],
  ])('fails closed without a producer call on %s', async (_label, failure) => {
    const produceAssistant = jest.fn(async (_input: unknown) => 'must not run');
    const producer = createDialogueV2FreeformMemoryAwareTurnProducer({
      authUid: 'auth-user',
      expectedActor: { authUid: 'auth-user', stableAccountId: 'stable-a' },
      readLanguageBranchMemoryWithActor: jest.fn(async () => { throw failure; }),
      revalidateCanonicalActor: jest.fn(async () => ({
        authUid: 'auth-user', stableAccountId: 'stable-a',
      })),
      produceAssistant,
    });

    await expect(producer(serverTurnInput()))
      .rejects.toThrow('dialogue_v2_freeform_memory_unavailable');
    expect(produceAssistant).not.toHaveBeenCalled();
  });

  test.each([
    ['cross-target memory', storedMemory('fr')],
    ['raw transcript field', storedMemory('en', {
      rawTurns: ['I live at a private address'],
    })],
  ])('rejects forged %s before the producer boundary', async (_label, memory) => {
    const produceAssistant = jest.fn(async (_input: unknown) => 'must not run');
    const producer = createDialogueV2FreeformMemoryAwareTurnProducer({
      authUid: 'auth-user',
      expectedActor: { authUid: 'auth-user', stableAccountId: 'stable-a' },
      readLanguageBranchMemoryWithActor: jest.fn(async () => (
        memoryEnvelope('stable-a', memory) as never
      )),
      revalidateCanonicalActor: jest.fn(async () => ({
        authUid: 'auth-user', stableAccountId: 'stable-a',
      })),
      produceAssistant,
    });

    await expect(producer(serverTurnInput()))
      .rejects.toThrow('dialogue_v2_freeform_memory_unavailable');
    expect(produceAssistant).not.toHaveBeenCalled();
  });

  test('rejects memory read after an owner rebind before the read without calling producer', async () => {
    const produceAssistant = jest.fn(async (_input: unknown) => 'must not run');
    const readLanguageBranchMemoryWithActor = jest.fn(async () => (
      memoryEnvelope('stable-b', storedMemory('en'))
    ));
    const revalidateCanonicalActor = jest.fn(async () => ({
      authUid: 'auth-user',
      stableAccountId: 'stable-b',
    }));
    const producer = createDialogueV2FreeformMemoryAwareTurnProducer({
      authUid: 'auth-user',
      expectedActor: { authUid: 'auth-user', stableAccountId: 'stable-a' },
      readLanguageBranchMemoryWithActor,
      revalidateCanonicalActor,
      produceAssistant,
    });

    await expect(producer(serverTurnInput()))
      .rejects.toThrow('dialogue_v2_freeform_memory_unavailable');
    expect(readLanguageBranchMemoryWithActor).toHaveBeenCalledTimes(1);
    expect(revalidateCanonicalActor).not.toHaveBeenCalled();
    expect(produceAssistant).not.toHaveBeenCalled();
  });

  test('rejects an owner rebind occurring during memory read without exposing wrong memory', async () => {
    let canonicalStableAccountId = 'stable-a';
    const produceAssistant = jest.fn(async (_input: unknown) => 'must not run');
    const readLanguageBranchMemoryWithActor = jest.fn(async () => {
      canonicalStableAccountId = 'stable-b';
      return memoryEnvelope('stable-b', storedMemory('en'));
    });
    const revalidateCanonicalActor = jest.fn(async () => ({
      authUid: 'auth-user',
      stableAccountId: canonicalStableAccountId,
    }));
    const producer = createDialogueV2FreeformMemoryAwareTurnProducer({
      authUid: 'auth-user',
      expectedActor: { authUid: 'auth-user', stableAccountId: 'stable-a' },
      readLanguageBranchMemoryWithActor,
      revalidateCanonicalActor,
      produceAssistant,
    });

    await expect(producer(serverTurnInput()))
      .rejects.toThrow('dialogue_v2_freeform_memory_unavailable');
    expect(revalidateCanonicalActor).not.toHaveBeenCalled();
    expect(produceAssistant).not.toHaveBeenCalled();
    expect(JSON.stringify(produceAssistant.mock.calls)).not.toContain('urban gardening');
  });

  test('rejects ABA owner rebind during memory read even when actor is A again before revalidation', async () => {
    let canonicalStableAccountId = 'stable-a';
    const produceAssistant = jest.fn(async (_input: unknown) => 'must not run');
    const readLanguageBranchMemoryWithActor = jest.fn(async () => {
      canonicalStableAccountId = 'stable-b';
      const reboundMemory = storedMemory('en', {
        learnerProfile: {
          preferredRegister: 'formal',
          correctionStyle: 'direct',
          interests: ['private rebound interest'],
        },
      });
      canonicalStableAccountId = 'stable-a';
      return memoryEnvelope('stable-b', reboundMemory);
    });
    const revalidateCanonicalActor = jest.fn(async () => ({
      authUid: 'auth-user',
      stableAccountId: canonicalStableAccountId,
    }));
    const producer = createDialogueV2FreeformMemoryAwareTurnProducer({
      authUid: 'auth-user',
      expectedActor: { authUid: 'auth-user', stableAccountId: 'stable-a' },
      readLanguageBranchMemoryWithActor,
      revalidateCanonicalActor,
      produceAssistant,
    });

    await expect(producer(serverTurnInput()))
      .rejects.toThrow('dialogue_v2_freeform_memory_unavailable');
    expect(revalidateCanonicalActor).not.toHaveBeenCalled();
    expect(produceAssistant).not.toHaveBeenCalled();
    expect(JSON.stringify(produceAssistant.mock.calls)).not.toContain(
      'private rebound interest',
    );
  });

  test('rejects unauthenticated, malformed, extra and Proxy input before authorization', async () => {
    const deps = dependencies();
    const handler = createDialogueV2FreeformSessionTurnHandler(deps);

    await expect(handler({ data: request().data }))
      .rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });

    const invalid = [
      null,
      {},
      { ...request().data, studyTarget: 'it' },
      { ...request().data, rank: 1 },
      { ...request().data, scenarioId: 'scenario' },
      { ...request().data, history: [] },
      { ...request().data, isPremium: true },
      { ...request().data, path: 'users/victim' },
      { ...request().data, userMessage: ' padded ' },
      { ...request().data, userMessage: 'x'.repeat(2_049) },
      new Proxy(request().data, {}),
    ];
    for (const data of invalid) {
      await expect(handler({ auth: { uid: 'auth-user' }, data }))
        .rejects.toMatchObject({
          code: 'invalid-argument',
          message: 'dialogue_v2_freeform_session_turn_request_invalid',
        });
    }
    expect(deps.runAuthorizedTurn).not.toHaveBeenCalled();
  });

  test('returns only the exact public turn result and never internal replay metadata', async () => {
    const deps = dependencies();
    const handler = createDialogueV2FreeformSessionTurnHandler(deps);

    await expect(handler(request())).resolves.toEqual({
      ok: true,
      assistantMessage: 'Of course — tell me where you are meeting this person.',
      sessionId: SESSION_ID,
      expiresAtMs: EXPIRES_AT_MS,
    });
    expect(Object.keys(await handler(request()))).toEqual([
      'ok', 'assistantMessage', 'sessionId', 'expiresAtMs',
    ]);
    expect(deps.runAuthorizedTurn).toHaveBeenCalledWith(
      'auth-user',
      request().data,
    );
  });

  test.each([
    new HttpsError('permission-denied', 'dialogue_v2_freeform_plus_required'),
    new HttpsError('failed-precondition', 'dialogue_v2_freeform_identity_unavailable'),
    new HttpsError('failed-precondition', 'dialogue_v2_freeform_account_unavailable'),
    new HttpsError('failed-precondition', 'dialogue_v2_freeform_entitlement_unavailable'),
  ])('preserves only reviewed authorization failure %s', async (failure) => {
    const deps = dependencies();
    deps.runAuthorizedTurn.mockRejectedValueOnce(failure);

    await expect(createDialogueV2FreeformSessionTurnHandler(deps)(request()))
      .rejects.toMatchObject({ code: failure.code, message: failure.message });
  });

  test('maps ledger, producer and private storage failures to fixed errors without raw text', async () => {
    for (const failure of [
      new Error('private firestore path users/victim'),
      new Error('raw user message Can we practise a natural introduction?'),
      new HttpsError('internal', 'dialogue_v2_freeform_plus_required', {
        sessionId: SESSION_ID,
      }),
    ]) {
      const deps = dependencies();
      deps.runAuthorizedTurn.mockRejectedValueOnce(failure);
      try {
        await createDialogueV2FreeformSessionTurnHandler(deps)(request());
        throw new Error('expected_error');
      } catch (error) {
        expect(error).toMatchObject({
          code: 'unavailable',
          message: 'dialogue_v2_freeform_session_turn_unavailable',
        });
        expect(JSON.stringify(error)).not.toContain('users/victim');
        expect(JSON.stringify(error)).not.toContain('Can we practise');
        expect(JSON.stringify(error)).not.toContain(SESSION_ID);
      }
    }
  });

  test('publishes a bounded App-Check callable with server-only provider wiring', () => {
    expect(DIALOGUE_V2_FREEFORM_SESSION_TURN_OPTIONS).toMatchObject({
      region: 'us-central1',
      enforceAppCheck: false,
      timeoutSeconds: 30,
      memory: '256MiB',
      minInstances: 0,
      maxInstances: 20,
      cpu: 1,
    });

    const source = readFileSync(
      path.join(__dirname, 'dialogue_v2_freeform_session_turn_callable.ts'),
      'utf8',
    );
    expect(source).toContain('runDialogueV2FreeformProductionAuthorizationTransaction');
    expect(source).toContain('createTurnRepository');
    expect(source).toContain('createDialogueV2FreeformSessionLedger');
    expect(source).toContain('createDialogueV2FreeformServerTextProducer');
    expect(source).toContain('createDialogueV2FreeformOpenAiTransport');
    expect(source).toContain('resolveConfiguredDialogModel');
    expect(source).toContain('readDialogueV2FreeformMemoryWithActor;');
    expect(source).toContain('DIALOGUE_V2_FREEFORM_OPENAI_API_KEY');
    expect(source).not.toMatch(/enabled:\s*false/);
    expect(source).not.toMatch(/transport:\s*null/);
    expect(source).not.toMatch(/scenarioId|rank|persona|objectives|completion/i);

    const indexSource = readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(indexSource).toContain(
      'const { dialogueV2FreeformSessionTurn } = require("./dialogue_v2_freeform_session_turn_callable")',
    );
    expect(indexSource).toContain(
      'exports.dialogueV2FreeformSessionTurn = dialogueV2FreeformSessionTurn;',
    );

    const adapterExports = adapterModuleExports as unknown as Record<string, unknown>;
    expect(adapterExports).not.toHaveProperty('requireActiveDialogueV2FreeformAuthorization');
  });
});
