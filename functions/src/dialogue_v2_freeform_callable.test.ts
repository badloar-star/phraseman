import { readFileSync } from 'node:fs';
import path from 'node:path';
import { HttpsError } from 'firebase-functions/v2/https';

import {
  createDialogueV2FreeformAuthorizationHandler,
  parseDialogueV2FreeformServerSelection,
  type DialogueV2FreeformLegacyAuthorizationDependencies,
} from './dialogue_v2_freeform_callable';

function dependencies(
  overrides: Partial<DialogueV2FreeformLegacyAuthorizationDependencies> = {},
): DialogueV2FreeformLegacyAuthorizationDependencies {
  return {
    resolveStableAccountId: jest.fn(async () => 'stable-user'),
    assertAccountActive: jest.fn(async () => undefined),
    resolvePremiumAccess: jest.fn(async () => true),
    ...overrides,
  };
}

async function captureError(work: () => Promise<unknown>): Promise<HttpsError> {
  try {
    await work();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpsError);
    return error as HttpsError;
  }
  throw new Error('expected_error');
}

describe('Dialogue V2 Plus freeform authorization boundary', () => {
  test('rejects a transparent Proxy at the server selection boundary', () => {
    expect(parseDialogueV2FreeformServerSelection(new Proxy(
      { studyTarget: 'en' },
      {},
    ))).toBeNull();
  });

  test.each(['en', 'es', 'fr', 'de'] as const)(
    'authorizes the exact %s selection using only server identity and Plus authority',
    async (studyTarget) => {
      const deps = dependencies();
      const handler = createDialogueV2FreeformAuthorizationHandler(deps);

      await expect(handler({
        auth: { uid: 'auth-user' },
        data: { studyTarget },
      })).resolves.toEqual({ ok: true, studyTarget });

      expect(deps.resolveStableAccountId).toHaveBeenCalledWith('auth-user');
      expect(deps.assertAccountActive).toHaveBeenCalledWith('auth-user', 'stable-user');
      expect(deps.resolvePremiumAccess).toHaveBeenCalledWith('stable-user', 'auth-user');
    },
  );

  test('rejects unauthenticated requests before every authority resolver', async () => {
    const deps = dependencies();
    const error = await captureError(() => (
      createDialogueV2FreeformAuthorizationHandler(deps)({ data: { studyTarget: 'en' } })
    ));

    expect(error).toMatchObject({ code: 'unauthenticated', message: 'auth_required' });
    expect(deps.resolveStableAccountId).not.toHaveBeenCalled();
    expect(deps.assertAccountActive).not.toHaveBeenCalled();
    expect(deps.resolvePremiumAccess).not.toHaveBeenCalled();
  });

  test.each([
    {},
    { studyTarget: 'it' },
    { studyTarget: 'en', scenarioId: 'social_01' },
    { studyTarget: 'en', rank: 19 },
    { studyTarget: 'en', persona: 'assistant' },
    { studyTarget: 'en', model: 'model' },
    { studyTarget: 'en', history: [] },
    { studyTarget: 'en', audioUri: 'file://private' },
    { studyTarget: 'en', path: 'users/victim' },
  ])('rejects non-exact public data before every authority resolver %#', async (data) => {
    const deps = dependencies();
    const error = await captureError(() => (
      createDialogueV2FreeformAuthorizationHandler(deps)({
        auth: { uid: 'auth-user' },
        data,
      })
    ));

    expect(error).toMatchObject({
      code: 'invalid-argument',
      message: 'dialogue_v2_freeform_request_invalid',
    });
    expect(deps.resolveStableAccountId).not.toHaveBeenCalled();
    expect(deps.assertAccountActive).not.toHaveBeenCalled();
    expect(deps.resolvePremiumAccess).not.toHaveBeenCalled();
  });

  test('rejects proxy data at the server boundary without invoking its get trap', async () => {
    const deps = dependencies();
    const get = jest.fn(() => 'en');
    const data = new Proxy({ studyTarget: 'en' }, { get });

    const error = await captureError(() => (
      createDialogueV2FreeformAuthorizationHandler(deps)({
        auth: { uid: 'auth-user' },
        data,
      })
    ));

    expect(error).toMatchObject({ code: 'invalid-argument' });
    expect(get).not.toHaveBeenCalled();
    expect(deps.resolveStableAccountId).not.toHaveBeenCalled();
  });

  test('fails closed when stable account identity is unavailable or unsafe', async () => {
    for (const resolveStableAccountId of [
      jest.fn(async () => { throw new Error('offline'); }),
      jest.fn(async () => 'users/victim'),
    ]) {
      const deps = dependencies({ resolveStableAccountId });
      const error = await captureError(() => (
        createDialogueV2FreeformAuthorizationHandler(deps)({
          auth: { uid: 'auth-user' }, data: { studyTarget: 'fr' },
        })
      ));

      expect(error).toMatchObject({
        code: 'failed-precondition',
        message: 'dialogue_v2_freeform_identity_unavailable',
      });
      expect(deps.assertAccountActive).not.toHaveBeenCalled();
      expect(deps.resolvePremiumAccess).not.toHaveBeenCalled();
    }
  });

  test('rejects a non-string stable identity without coercing it', async () => {
    const toString = jest.fn(() => 'stable-user');
    const deps = dependencies({
      resolveStableAccountId: jest.fn(async () => ({ toString }) as unknown as string),
    });

    const error = await captureError(() => (
      createDialogueV2FreeformAuthorizationHandler(deps)({
        auth: { uid: 'auth-user' }, data: { studyTarget: 'en' },
      })
    ));

    expect(error).toMatchObject({
      code: 'failed-precondition',
      message: 'dialogue_v2_freeform_identity_unavailable',
    });
    expect(toString).not.toHaveBeenCalled();
    expect(deps.assertAccountActive).not.toHaveBeenCalled();
  });

  test('fails closed on an inactive or unverifiable account before checking entitlement', async () => {
    const deps = dependencies({
      assertAccountActive: jest.fn(async () => { throw new Error('account_delete_pending'); }),
    });
    const error = await captureError(() => (
      createDialogueV2FreeformAuthorizationHandler(deps)({
        auth: { uid: 'auth-user' }, data: { studyTarget: 'de' },
      })
    ));

    expect(error).toMatchObject({
      code: 'failed-precondition',
      message: 'dialogue_v2_freeform_account_unavailable',
    });
    expect(deps.resolvePremiumAccess).not.toHaveBeenCalled();
  });

  test('rejects a non-Plus account and maps resolver failure closed', async () => {
    const nonPlus = dependencies({ resolvePremiumAccess: jest.fn(async () => false) });
    const denied = await captureError(() => (
      createDialogueV2FreeformAuthorizationHandler(nonPlus)({
        auth: { uid: 'auth-user' }, data: { studyTarget: 'es' },
      })
    ));
    expect(denied).toMatchObject({
      code: 'permission-denied',
      message: 'dialogue_v2_freeform_plus_required',
    });

    const unavailable = dependencies({
      resolvePremiumAccess: jest.fn(async () => { throw new Error('offline'); }),
    });
    const failed = await captureError(() => (
      createDialogueV2FreeformAuthorizationHandler(unavailable)({
        auth: { uid: 'auth-user' }, data: { studyTarget: 'es' },
      })
    ));
    expect(failed).toMatchObject({
      code: 'failed-precondition',
      message: 'dialogue_v2_freeform_entitlement_unavailable',
    });
  });

  test('remains an unexported authorization foundation with no provider or storage surface', () => {
    const source = readFileSync(path.join(__dirname, 'dialogue_v2_freeform_callable.ts'), 'utf8');
    const indexSource = readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

    expect(source).not.toMatch(/onCall\s*\(/);
    expect(source).not.toMatch(/OPENAI|provider|firestore|admin\.|defineSecret/i);
    expect(source).not.toMatch(/transcript|audioUri|history|scenarioId|rank|persona|model|path/i);
    expect(indexSource).not.toContain('require("./dialogue_v2_freeform_callable")');
    expect(indexSource).not.toContain('createDialogueV2FreeformAuthorizationHandler');
  });
});
