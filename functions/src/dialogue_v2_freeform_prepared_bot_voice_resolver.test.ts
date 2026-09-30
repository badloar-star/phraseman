import { readFileSync } from 'node:fs';
import path from 'node:path';
import { HttpsError } from 'firebase-functions/v2/https';
import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';

import * as repositoryExports from './dialogue_v2_freeform_prepared_bot_voice_firestore_repository';
import {
  createDialogueV2FreeformPreparedBotVoiceInternalResolver,
  createDialogueV2FreeformPreparedBotVoiceResolverHandler,
} from './dialogue_v2_freeform_prepared_bot_voice_resolver';

const SESSION_ID = `d2fs_${'S'.repeat(32)}`;
const TURN_ID = `d2ft_${'T'.repeat(16)}`;
const requestData = Object.freeze({
  sessionId: SESSION_ID,
  turnId: TURN_ID,
  studyTarget: 'en',
});

function validReplacementCatalog() {
  const replyText = 'Reviewed future reply.';
  const replyTextSha256 = createHash('sha256').update(replyText, 'utf8').digest('hex');
  const entries = [{
    studyTarget: 'en',
    voiceStyleId: 'warm_tutor_en',
    preparedResponseId: 'milestone_en_01',
    responseKind: 'milestone',
    replyText,
    replyTextSha256,
    assetKey: 'freeform_milestone_en_01',
    assetSha256: 'a'.repeat(64),
    assetBytes: 4_096,
    durationMs: 1_250,
    mime: 'audio/mpeg',
  }];
  const releaseId = 'freeform_voice_2026_09_27_01';
  const releaseSha256 = createHash('sha256').update(JSON.stringify([
    'dialogue_v2_freeform_prepared_bot_voice_catalog.v1',
    releaseId,
    entries.map((entry) => [
      entry.studyTarget, entry.voiceStyleId, entry.preparedResponseId, entry.responseKind,
      entry.replyText, entry.replyTextSha256, entry.assetKey, entry.assetSha256,
      entry.assetBytes, entry.durationMs, entry.mime,
    ]),
  ]), 'utf8').digest('hex');
  return {
    schemaVersion: 'dialogue_v2_freeform_prepared_bot_voice_catalog.v1',
    releaseId,
    releaseSha256,
    entries,
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

describe('Dialogue V2 Freeform prepared bot voice internal resolver', () => {
  it('accepts only the exact request body and returns the deliberate text-only result', async () => {
    const resolveAuthorized = jest.fn(async () => null);
    const handler = createDialogueV2FreeformPreparedBotVoiceResolverHandler({
      requireAppCheck: false,
      resolveAuthorized,
    });

    await expect(handler({ auth: { uid: 'auth-user' }, data: requestData })).resolves.toEqual({
      ok: true,
      selection: null,
    });
    expect(resolveAuthorized).toHaveBeenCalledWith('auth-user', requestData);
  });

  it.each([
    { ...requestData, stableAccountId: 'victim' },
    { ...requestData, preparedResponseId: 'client-choice' },
    { ...requestData, assetKey: 'client-asset' },
    { ...requestData, replyTextSha256: 'a'.repeat(64) },
    { ...requestData, completedAtMs: 123 },
    { ...requestData, catalog: {} },
    { ...requestData, sessionId: `d2s_${'S'.repeat(32)}` },
    { ...requestData, turnId: `d2t_${'T'.repeat(16)}` },
    { ...requestData, studyTarget: 'it' },
  ])('rejects malformed or client-authority injection before repository work %#', async (data) => {
    const resolveAuthorized = jest.fn(async () => null);
    const handler = createDialogueV2FreeformPreparedBotVoiceResolverHandler({
      requireAppCheck: false,
      resolveAuthorized,
    });

    const error = await captureError(() => handler({ auth: { uid: 'auth-user' }, data }));

    expect(error).toMatchObject({
      code: 'invalid-argument',
      message: 'dialogue_v2_freeform_bot_voice_request_invalid',
    });
    expect(resolveAuthorized).not.toHaveBeenCalled();
  });

  it('rejects hostile accessors and proxies without evaluating request fields', async () => {
    const resolveAuthorized = jest.fn(async () => null);
    const handler = createDialogueV2FreeformPreparedBotVoiceResolverHandler({
      requireAppCheck: false,
      resolveAuthorized,
    });
    let getterCalls = 0;
    const accessor = { ...requestData } as Record<string, unknown>;
    Object.defineProperty(accessor, 'studyTarget', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'en';
      },
    });
    const hostile = new Proxy({ ...requestData }, {
      ownKeys() {
        throw new Error('must_not_escape');
      },
    });

    await expect(handler({ auth: { uid: 'auth-user' }, data: accessor }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(handler({ auth: { uid: 'auth-user' }, data: hostile }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    expect(getterCalls).toBe(0);
    expect(resolveAuthorized).not.toHaveBeenCalled();
  });

  it('requires auth and, when configured, the trusted callable App Check wrapper', async () => {
    const resolveAuthorized = jest.fn(async () => null);
    const handler = createDialogueV2FreeformPreparedBotVoiceResolverHandler({
      requireAppCheck: true,
      resolveAuthorized,
    });

    await expect(handler({ app: { appId: 'app' }, data: requestData }))
      .rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });
    await expect(handler({ auth: { uid: 'auth-user' }, data: requestData }))
      .rejects.toMatchObject({
        code: 'failed-precondition',
        message: 'dialogue_v2_freeform_bot_voice_app_check_required',
      });
    await expect(handler({
      auth: { uid: 'auth-user' },
      app: { appId: 'app' },
      data: requestData,
    })).resolves.toEqual({ ok: true, selection: null });
    expect(resolveAuthorized).toHaveBeenCalledTimes(1);
  });

  it.each([
    new Error('session_missing'),
    new Error('owner_mismatch'),
    new Error('plus_revoked'),
    new Error('account_deleted'),
    new Error('storage_corrupt'),
  ])('maps every post-boundary failure to one non-enumerating public error', async (failure) => {
    const handler = createDialogueV2FreeformPreparedBotVoiceResolverHandler({
      requireAppCheck: false,
      resolveAuthorized: async () => { throw failure; },
    });

    const error = await captureError(() => handler({
      auth: { uid: 'private-auth-id' },
      data: requestData,
    }));

    expect(error).toMatchObject({
      code: 'unavailable',
      message: 'dialogue_v2_freeform_bot_voice_unavailable',
    });
    expect(JSON.stringify(error)).not.toContain(failure.message);
    expect(JSON.stringify(error)).not.toContain('private-auth-id');
  });

  it('rejects a forged or mismatched repository result', async () => {
    const handler = createDialogueV2FreeformPreparedBotVoiceResolverHandler({
      requireAppCheck: false,
      resolveAuthorized: async () => ({
        contractVersion: 'dialogue_v2_freeform_prepared_bot_voice_selection.v1',
        sessionId: `d2fs_${'X'.repeat(32)}`,
        turnId: TURN_ID,
        studyTarget: 'en',
        voiceCatalogReleaseId: 'release_1',
        voiceCatalogReleaseSha256: 'a'.repeat(64),
        voiceStyleId: 'warm_tutor',
        preparedResponseId: 'reply_1',
        replyTextSha256: 'b'.repeat(64),
        responseKind: 'milestone',
        dayKey: '2026-09-27',
        operationFingerprint: 'c'.repeat(64),
      } as never),
    });

    await expect(handler({ auth: { uid: 'auth-user' }, data: requestData }))
      .rejects.toMatchObject({
        code: 'unavailable',
        message: 'dialogue_v2_freeform_bot_voice_unavailable',
      });
  });

  it('captures the critical repository factory lexically against post-load CJS mutation', async () => {
    const mutableExports = repositoryExports as unknown as Record<string, unknown>;
    const exportName = 'createDialogueV2FreeformPreparedBotVoiceFirestoreRepository';
    const original = mutableExports[exportName];
    const injectedFactory = jest.fn(() => ({
      resolveAfterCommittedTurn: async () => ({ forged: true }),
    }));
    mutableExports[exportName] = injectedFactory;
    const runtime = {
      db: {
        runTransaction: async () => { throw new Error('real_repository_called'); },
      },
      nowMs: () => 1,
      bindOwner: () => 'o'.repeat(64),
      computeEligibilityHmac: () => '0'.repeat(64),
      timestampFromMillis: () => ({ toMillis: () => 1 }),
    };

    try {
      const handler = createDialogueV2FreeformPreparedBotVoiceInternalResolver(
        runtime as never,
        false,
      );
      await expect(handler({ auth: { uid: 'auth-user' }, data: requestData }))
        .rejects.toMatchObject({ code: 'unavailable' });
      expect(injectedFactory).not.toHaveBeenCalled();
    } finally {
      mutableExports[exportName] = original;
    }
  });

  it('captures the null default catalog before hostile post-load replacement with a valid release', async () => {
    await jest.isolateModulesAsync(async () => {
      const isolatedRepository = await import(
        './dialogue_v2_freeform_prepared_bot_voice_firestore_repository'
      ) as unknown as Record<string, unknown>;
      const capturedCatalogs: unknown[] = [];
      isolatedRepository.createDialogueV2FreeformPreparedBotVoiceFirestoreRepository = jest.fn(
        (runtime: { serverCatalog: unknown }) => {
          capturedCatalogs.push(runtime.serverCatalog);
          return Object.freeze({ resolveAfterCommittedTurn: async () => null });
        },
      );
      const isolatedCatalog = await import(
        '../../shared/dialogue_v2_freeform_prepared_bot_voice_catalog'
      ) as unknown as Record<string, unknown>;
      const isolatedResolver = await import(
        './dialogue_v2_freeform_prepared_bot_voice_resolver'
      );
      isolatedCatalog.DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_DEFAULT_CATALOG =
        validReplacementCatalog();
      const runTransaction = jest.fn();
      const handler = isolatedResolver
        .createDialogueV2FreeformPreparedBotVoiceInternalResolver({
          db: { runTransaction } as never,
          nowMs: () => 1,
          bindOwner: () => 'o'.repeat(64),
          computeEligibilityHmac: () => '0'.repeat(64),
          timestampFromMillis: () => ({ toMillis: () => 1 }),
        }, false);

      await expect(handler({ auth: { uid: 'auth-user' }, data: requestData }))
        .resolves.toEqual({ ok: true, selection: null });
      expect(capturedCatalogs).toEqual([null]);
      expect(runTransaction).not.toHaveBeenCalled();
    });
  });

  it('uses the load-time proxy primitive after a hostile post-load CJS replacement', async () => {
    const mutableTypes = nodeTypes as unknown as Record<string, unknown>;
    const original = mutableTypes.isProxy;
    const injectedIsProxy = jest.fn(() => true);
    const resolveAuthorized = jest.fn(async () => null);
    const handler = createDialogueV2FreeformPreparedBotVoiceResolverHandler({
      requireAppCheck: false,
      resolveAuthorized,
    });
    mutableTypes.isProxy = injectedIsProxy;

    try {
      await expect(handler({ auth: { uid: 'auth-user' }, data: requestData }))
        .resolves.toEqual({ ok: true, selection: null });
      expect(resolveAuthorized).toHaveBeenCalledTimes(1);
      expect(injectedIsProxy).not.toHaveBeenCalled();
    } finally {
      mutableTypes.isProxy = original;
    }
  });

  it('stays internal with null catalog while index wires only the public wrapper', () => {
    const source = readFileSync(
      path.join(__dirname, 'dialogue_v2_freeform_prepared_bot_voice_resolver.ts'),
      'utf8',
    );
    const indexSource = readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

    expect(source).not.toMatch(/onCall\s*\(/);
    expect(source).not.toMatch(/OPENAI|fetch\s*\(|TTS|audio\/speech/i);
    expect(source).toContain('DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_DEFAULT_CATALOG');
    expect(indexSource).not.toContain('dialogue_v2_freeform_prepared_bot_voice_resolver');
    expect(indexSource).toContain('dialogue_v2_freeform_prepared_bot_voice_callable');
    expect(indexSource).toContain('dialogueV2FreeformPreparedBotVoiceResolve');
  });
});
