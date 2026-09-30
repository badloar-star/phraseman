class FakeHttpsError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (_options: unknown, handler: unknown) => handler,
}));
jest.mock('firebase-functions/params', () => ({
  defineSecret: (name: string) => ({ value: () => `${name}-secret-value-long-enough-for-tests` }),
}));
jest.mock('firebase-admin', () => ({
  firestore: Object.assign(jest.fn(), { Timestamp: { fromMillis: jest.fn() } }),
}));
jest.mock('./callable_options', () => ({ ENFORCE_APP_CHECK_OPENAI: false }));
jest.mock('./dialogue_v2_session_production_runtime', () => ({
  DIALOGUE_V2_SESSION_HMAC_KEY: { value: () => 'session-owner-secret-with-at-least-32-bytes' },
}));

// eslint-disable-next-line import/first
import {
  createDialogueV2SessionCompleteHandler,
  resolveDialogueV2CompletionReleaseSnapshot,
} from './dialogue_v2_session_complete_callable';

const selection = Object.freeze({
  sessionId: 'd2s_abcdefghijklmnopqrstuvwxyz123456',
  studyTarget: 'en' as const,
  scenarioId: 'social_01',
  interfaceLang: 'en',
});
const completion = Object.freeze({ feedback: Object.freeze({}), context: Object.freeze({}) });
const session = Object.freeze({ sessionId: selection.sessionId });
const assessmentRaw = JSON.stringify({
  overallAssessment: 'Detailed assessment from the conversation.',
  nextStep: 'Add one detail.',
  languageNote: null,
});
const releaseSnapshot = Object.freeze({
  schemaVersion: 1 as const,
  studyTarget: 'en' as const,
  scenarioId: 'social_01',
  packVersion: 'dialogues_v2_2026_09_26',
  packSha256: 'a'.repeat(64),
  catalogueSha256: 'b'.repeat(64),
  reviewReceiptSha256: 'c'.repeat(64),
  objectives: Object.freeze(Array.from({ length: 6 }, (_, index) => Object.freeze({
    id: `objective_0${index + 1}`,
    label: `Step ${index + 1}`,
  }))),
  personas: Object.freeze([Object.freeze({
    id: 'mia', displayName: 'Mia', replyStyle: 'warm', voiceMode: 'text_only',
    styleNote: 'Warm and concise.', mood: 'open', correctionStyle: 'gentle',
  })]),
});

function dependencies(kind: 'new' | 'resume' | 'replay' = 'new') {
  const order: string[] = [];
  return {
    order,
    claimTerminal: jest.fn(async () => {
      order.push('claim');
      return kind === 'new'
        ? { kind, session }
        : {
          kind, session, assessmentRaw, releaseSnapshot,
          memoryReceipt: { sharedMemoryStored: true as const, scenarioCheckpointStored: false },
        };
    }),
    buildCompletion: jest.fn(async (_input: unknown) => {
      order.push('build');
      return { completion, assessmentRaw, releaseSnapshot };
    }),
    stageAssessment: jest.fn(async (_input: unknown) => { order.push('stage'); }),
    prepareMemory: jest.fn(async (_input: unknown) => {
      order.push('prepare-memory');
      return {
        prepared: Object.freeze({ command: 'prepared' }),
        memoryReceipt: { sharedMemoryStored: true as const, scenarioCheckpointStored: false },
      };
    }),
    publishCompletion: jest.fn(async (_input: unknown) => { order.push('publish'); }),
    releaseClaim: jest.fn(async (_input: unknown) => { order.push('release'); }),
  };
}

describe('dialogueV2SessionComplete callable boundary', () => {
  test('uses the terminal release snapshot verbatim when the current release is unavailable', async () => {
    const loadCurrentAuthorizedPacket = jest.fn(async () => { throw new Error('release_rotated_away'); });
    await expect(resolveDialogueV2CompletionReleaseSnapshot(
      releaseSnapshot,
      selection,
      loadCurrentAuthorizedPacket,
    )).resolves.toEqual(releaseSnapshot);
    expect(loadCurrentAuthorizedPacket).not.toHaveBeenCalled();
  });

  test('claims terminal state before provider work and returns only after memory and receipt commit', async () => {
    const deps = dependencies();
    const handler = createDialogueV2SessionCompleteHandler(deps);

    await expect(handler({ auth: { uid: 'auth-a' }, data: selection })).resolves.toEqual({
      ok: true,
      v2Completion: completion,
      v2Memory: { sharedMemoryStored: true, scenarioCheckpointStored: false },
      replayed: false,
    });
    expect(deps.order).toEqual(['claim', 'build', 'stage', 'prepare-memory', 'publish']);
    expect(deps.prepareMemory).toHaveBeenCalledWith({
      authUid: 'auth-a', studyTarget: 'en', scenarioId: 'social_01', completion, releaseSnapshot,
    });
  });

  test('replays the stored assessment without a second provider, memory write or terminal commit', async () => {
    const deps = dependencies('replay');
    const handler = createDialogueV2SessionCompleteHandler(deps);
    await expect(handler({ auth: { uid: 'auth-a' }, data: selection })).resolves.toMatchObject({
      ok: true, replayed: true,
      v2Memory: { sharedMemoryStored: true, scenarioCheckpointStored: false },
    });
    expect(deps.order).toEqual(['claim', 'build']);
    expect(deps.prepareMemory).not.toHaveBeenCalled();
    expect(deps.publishCompletion).not.toHaveBeenCalled();
    expect(deps.stageAssessment).not.toHaveBeenCalled();
    expect(deps.buildCompletion).toHaveBeenCalledWith(expect.objectContaining({ assessmentRaw }));
    expect(deps.buildCompletion).toHaveBeenCalledWith(expect.objectContaining({ releaseSnapshot }));
  });

  test('keeps a staged assessment for retry when memory preparation or atomic publish fails', async () => {
    const memoryDeps = dependencies();
    memoryDeps.prepareMemory.mockRejectedValueOnce(new FakeHttpsError('internal', 'memory_failed'));
    await expect(createDialogueV2SessionCompleteHandler(memoryDeps)({
      auth: { uid: 'auth-a' }, data: selection,
    })).rejects.toMatchObject({ code: 'internal', message: 'memory_failed' });
    expect(memoryDeps.order).toEqual(['claim', 'build', 'stage']);
    expect(memoryDeps.releaseClaim).not.toHaveBeenCalled();
    expect(memoryDeps.publishCompletion).not.toHaveBeenCalled();

    const terminalDeps = dependencies();
    terminalDeps.publishCompletion.mockRejectedValueOnce(new FakeHttpsError('unavailable', 'terminal_failed'));
    await expect(createDialogueV2SessionCompleteHandler(terminalDeps)({
      auth: { uid: 'auth-a' }, data: selection,
    })).rejects.toMatchObject({ code: 'unavailable', message: 'terminal_failed' });
    expect(terminalDeps.releaseClaim).not.toHaveBeenCalled();
  });

  test('releases a claim only when no validated assessment was produced', async () => {
    const deps = dependencies();
    deps.buildCompletion.mockRejectedValueOnce(new Error('provider_failed'));
    await expect(createDialogueV2SessionCompleteHandler(deps)({
      auth: { uid: 'auth-a' }, data: selection,
    })).rejects.toMatchObject({ code: 'unavailable' });
    expect(deps.order).toEqual(['claim', 'release']);
  });

  test('resumes a staged assessment without staging or regenerating it', async () => {
    const deps = dependencies('resume');
    await expect(createDialogueV2SessionCompleteHandler(deps)({
      auth: { uid: 'auth-a' }, data: selection,
    })).resolves.toMatchObject({ ok: true, replayed: false });
    expect(deps.buildCompletion).toHaveBeenCalledWith(expect.objectContaining({
      assessmentRaw, releaseSnapshot,
    }));
    expect(deps.stageAssessment).not.toHaveBeenCalled();
    expect(deps.order).toEqual(['claim', 'build', 'prepare-memory', 'publish']);
  });

  test('rejects client transcript, rank, persona and outcome fields before claiming terminal state', async () => {
    const deps = dependencies();
    const handler = createDialogueV2SessionCompleteHandler(deps);
    for (const [field, value] of [
      ['history', []], ['rank', 99], ['achievedRank', 99], ['rankRequired', 1],
      ['coinRank', 99], ['personaId', 'mia'], ['objectiveResults', []],
    ] as const) {
      await expect(handler({
        auth: { uid: 'auth-a' }, data: { ...selection, [field]: value },
      })).rejects.toMatchObject({ code: 'invalid-argument' });
    }
    expect(deps.claimTerminal).not.toHaveBeenCalled();
  });
});
