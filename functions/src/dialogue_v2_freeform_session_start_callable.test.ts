import { readFileSync } from 'node:fs';
import path from 'node:path';
import { HttpsError } from 'firebase-functions/v2/https';

import * as adapterModuleExports from './dialogue_v2_freeform_production_adapter';
import {
  DIALOGUE_V2_FREEFORM_SESSION_START_OPTIONS,
  createDialogueV2FreeformAtomicSessionStarter,
  createDialogueV2FreeformSessionStartHandler,
} from './dialogue_v2_freeform_session_start_callable';

function dependencies() {
  return {
    startAuthorizedSession: jest.fn(async () => ({
      sessionId: `d2fs_${'S'.repeat(32)}`,
      expiresAtMs: Date.UTC(2026, 8, 29, 12, 0, 0),
    })),
  };
}

describe('Dialogue V2 Plus freeform session start callable', () => {
  beforeEach(() => jest.clearAllMocks());

  test('does not trust a transaction runner injected into adapter CommonJS exports after load', async () => {
    const adapterExports = adapterModuleExports as unknown as Record<string, unknown>;
    const exportName = 'runDialogueV2FreeformProductionAuthorizationTransaction';
    const original = adapterExports[exportName];
    const injectedRunner = jest.fn(async () => ({
      sessionId: `d2fs_${'F'.repeat(32)}`,
      expiresAtMs: 2_000_086_400_000,
    }));
    adapterExports[exportName] = injectedRunner;
    const runTransaction = jest.fn(async () => {
      throw new Error('real_runner_called');
    });
    const start = createDialogueV2FreeformAtomicSessionStarter({
      db: { runTransaction } as never,
      nowMs: () => 2_000_000_000_000,
      generateSessionId: () => `d2fs_${'S'.repeat(32)}`,
      generateClaimToken: () => `d2fc_${'C'.repeat(32)}`,
      bindOwner: () => 'a'.repeat(64),
      digestTurnRequest: () => 'b'.repeat(64),
      timestampFromMillis: (millis) => ({ toMillis: () => millis }),
    });

    try {
      await expect(start('auth-user', { studyTarget: 'en' }))
        .rejects.toThrow('real_runner_called');
      expect(runTransaction).toHaveBeenCalledTimes(1);
      expect(injectedRunner).not.toHaveBeenCalled();
    } finally {
      adapterExports[exportName] = original;
    }
  });

  test('rejects unauthenticated, malformed, extra and Proxy input before authorities', async () => {
    const deps = dependencies();
    const handler = createDialogueV2FreeformSessionStartHandler(deps);

    await expect(handler({ data: { studyTarget: 'en' } }))
      .rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });

    for (const data of [
      null,
      {},
      { studyTarget: 'it' },
      { studyTarget: 'en', sessionId: `d2fs_${'A'.repeat(32)}` },
      { studyTarget: 'en', rank: 99 },
      { studyTarget: 'en', isPremium: true },
      { studyTarget: 'en', owner: 'stable-user' },
      { studyTarget: 'en', history: [] },
      { studyTarget: 'en', persona: 'assistant' },
      { studyTarget: 'en', path: 'users/victim' },
      { studyTarget: 'en', audioUri: 'file:///private/audio.m4a' },
      new Proxy({ studyTarget: 'en' }, {}),
    ]) {
      await expect(handler({ auth: { uid: 'auth-user' }, data }))
        .rejects.toMatchObject({
          code: 'invalid-argument',
          message: 'dialogue_v2_freeform_session_start_request_invalid',
        });
    }

    expect(deps.startAuthorizedSession).not.toHaveBeenCalled();
  });

  test.each([
    ['no Plus', new HttpsError('permission-denied', 'dialogue_v2_freeform_plus_required')],
    ['deleted account', new HttpsError('failed-precondition', 'dialogue_v2_freeform_account_unavailable')],
    ['identity failure', new HttpsError('failed-precondition', 'dialogue_v2_freeform_identity_unavailable')],
    ['entitlement failure', new HttpsError('failed-precondition', 'dialogue_v2_freeform_entitlement_unavailable')],
  ])('fails closed for %s without resolving an actor or creating a session', async (_label, failure) => {
    const deps = dependencies();
    deps.startAuthorizedSession.mockRejectedValueOnce(failure);
    const handler = createDialogueV2FreeformSessionStartHandler(deps);

    await expect(handler({ auth: { uid: 'auth-user' }, data: { studyTarget: 'fr' } }))
      .rejects.toMatchObject({ code: failure.code, message: failure.message });

    expect(deps.startAuthorizedSession).toHaveBeenCalledTimes(1);
  });

  test('creates one separately bound session only after atomic Plus authorization', async () => {
    const deps = dependencies();
    const handler = createDialogueV2FreeformSessionStartHandler(deps);

    const result = await handler({
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'de' },
    });

    expect(result).toEqual({
      ok: true,
      sessionId: `d2fs_${'S'.repeat(32)}`,
      expiresAtMs: Date.UTC(2026, 8, 29, 12, 0, 0),
    });
    expect(Object.keys(result)).toEqual(['ok', 'sessionId', 'expiresAtMs']);
    expect(deps.startAuthorizedSession).toHaveBeenCalledWith(
      'auth-user',
      { studyTarget: 'de' },
    );
  });

  test('maps unknown authorization, identity and repository details to fixed safe errors', async () => {
    const authorization = dependencies();
    authorization.startAuthorizedSession.mockRejectedValueOnce(new Error('private auth detail'));
    await expect(createDialogueV2FreeformSessionStartHandler(authorization)({
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'es' },
    })).rejects.toMatchObject({
      code: 'unavailable',
      message: 'dialogue_v2_freeform_session_start_unavailable',
    });

    const repository = dependencies();
    repository.startAuthorizedSession.mockRejectedValueOnce(new Error('private firestore path'));
    await expect(createDialogueV2FreeformSessionStartHandler(repository)({
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'es' },
    })).rejects.toMatchObject({
      code: 'unavailable',
      message: 'dialogue_v2_freeform_session_start_unavailable',
    });

    const spoofedSafeMessage = dependencies();
    spoofedSafeMessage.startAuthorizedSession.mockRejectedValueOnce(
      new HttpsError('internal', 'dialogue_v2_freeform_plus_required', {
        privatePath: 'users/victim',
      }),
    );
    await expect(createDialogueV2FreeformSessionStartHandler(spoofedSafeMessage)({
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'es' },
    })).rejects.toMatchObject({
      code: 'unavailable',
      message: 'dialogue_v2_freeform_session_start_unavailable',
    });

    const safeWithPrivateDetails = dependencies();
    safeWithPrivateDetails.startAuthorizedSession.mockRejectedValueOnce(
      new HttpsError('permission-denied', 'dialogue_v2_freeform_plus_required', {
        privatePath: 'users/victim',
      }),
    );
    try {
      await createDialogueV2FreeformSessionStartHandler(safeWithPrivateDetails)({
        auth: { uid: 'auth-user' },
        data: { studyTarget: 'es' },
      });
      throw new Error('expected_error');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'permission-denied',
        message: 'dialogue_v2_freeform_plus_required',
      });
      expect((error as HttpsError).details).toBeUndefined();
    }
  });

  test('rejects malformed dependency results instead of exposing or accepting them', async () => {
    const invalidSession = dependencies();
    invalidSession.startAuthorizedSession.mockResolvedValueOnce({
      sessionId: 'client-chosen',
      expiresAtMs: -1,
    });
    await expect(createDialogueV2FreeformSessionStartHandler(invalidSession)({
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'en' },
    })).rejects.toMatchObject({ code: 'unavailable' });
  });

  test('publishes a bounded App-Check callable composed only from reviewed server authorities', () => {
    expect(DIALOGUE_V2_FREEFORM_SESSION_START_OPTIONS).toMatchObject({
      region: 'us-central1',
      enforceAppCheck: false,
      timeoutSeconds: 20,
      memory: '256MiB',
      minInstances: 0,
      maxInstances: 20,
      cpu: 1,
    });

    const source = readFileSync(
      path.join(__dirname, 'dialogue_v2_freeform_session_start_callable.ts'),
      'utf8',
    );
    expect(source).toContain('runDialogueV2FreeformProductionAuthorizationTransaction');
    expect(source).toContain('createStartRepository');
    expect(source).toContain('createDialogueV2FreeformSessionLedger');
    expect(source).not.toContain('createDialogueV2FreeformAuthorizedStartRepository');
    expect(source).not.toContain('createDialogueV2FreeformSessionFirestoreRepository');
    expect(source).not.toContain('createDialogueV2FreeformProductionAuthorizationHandler');
    expect(source).not.toContain('resolveStableUidForAuth(');
    expect(source).not.toMatch(/OPENAI_API_KEY|fetch\s*\(|scenarioId|rank|persona|history|audioUri/i);

    const adapterSource = readFileSync(
      path.join(__dirname, 'dialogue_v2_freeform_production_adapter.ts'),
      'utf8',
    );
    expect(adapterSource).toContain('createDialogueV2FreeformAuthorizedStartRepository');
    expect(adapterSource).toContain('createStartRepository');

    const indexSource = readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(indexSource).toContain(
      'const { dialogueV2FreeformSessionStart } = require("./dialogue_v2_freeform_session_start_callable")',
    );
    expect(indexSource).toContain(
      'exports.dialogueV2FreeformSessionStart = dialogueV2FreeformSessionStart;',
    );
    expect(indexSource).not.toContain('createDialogueV2FreeformAuthorizedStartRepository');
    expect(indexSource).not.toContain('DialogueV2FreeformAuthorizedTransactionContext');
  });
});
