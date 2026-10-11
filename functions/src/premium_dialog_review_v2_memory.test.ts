class FakeHttpsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const mockFirestore = jest.fn(() => ({ doc: jest.fn(), collection: jest.fn() }));
const mockExecuteCompletion = jest.fn();
const mockLoadRelease = jest.fn();
const mockPersistCompletionMemory = jest.fn();

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (_options: unknown, handler: unknown) => handler,
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: (name: string) => ({
    value: () => name === 'DIALOGUE_V2_MEMORY_ID_SECRET'
      ? 'purpose-specific-memory-secret-with-32-bytes'
      : 'test-secret',
  }),
}));

jest.mock('firebase-admin', () => ({
  firestore: mockFirestore,
}));

jest.mock('./callable_options', () => ({ ENFORCE_APP_CHECK_OPENAI: false }));
jest.mock('./admin_alerts', () => ({ ADMIN_ALERT_BOT_TOKEN: { value: () => 'alert-secret' } }));
jest.mock('./dialogue_v2_completion_server', () => ({
  DialogueV2CompletionServerError: class DialogueV2CompletionServerError extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  },
  executeDialogueV2CompletionReview: mockExecuteCompletion,
}));
jest.mock('./dialogue_v2_completion_release_source', () => ({
  loadDialogueV2CompletionReleaseCandidate: mockLoadRelease,
}));
jest.mock('./dialogue_v2_memory_writer', () => ({
  makeFirestoreDialogueV2MemoryRepository: jest.fn(() => ({ runTransaction: jest.fn() })),
  persistDialogueV2CompletionMemory: mockPersistCompletionMemory,
}));
jest.mock('./auth_identity', () => ({ resolveStableUidForAuth: jest.fn() }));
jest.mock('./premium_status', () => ({ resolvePremiumAccess: jest.fn() }));
jest.mock('./openai_dialog_model_config', () => ({
  resolveConfiguredDialogModel: jest.fn(),
  modelSupportsJsonObject: jest.fn(),
}));
// 04.10: моки памяти и безопасности MAX убраны — модули удалены вместе с разделом, разбор их больше не импортирует.
jest.mock('./premium_dialog', () => ({ enforceRateLimit: jest.fn(), asInterfaceLang: jest.fn() }));
jest.mock('./dialogue_ai_language_contract', () => ({
  assertDialogueStudyLanguage: jest.fn(),
  dialogueStudyTargetName: jest.fn(),
  resolveDialogueTargetBeforeWarmup: jest.fn(),
}));
jest.mock('./remote_gates', () => ({ resolveRemoteBool: jest.fn() }));

// eslint-disable-next-line import/first
import { premiumDialogReview } from './premium_dialog_review';

const completion = Object.freeze({
  feedback: Object.freeze({ speakerPersonaId: 'concierge', objectiveResults: Object.freeze([]) }),
  context: Object.freeze({ objectiveIds: Object.freeze([]), personaIds: Object.freeze([]), userMessageIds: Object.freeze([]) }),
});

const validV2CompletionRequest = Object.freeze({
  dialogueVersion: 'v2' as const,
  studyTarget: 'es',
  scenarioId: 'travel_19',
  packVersion: 'dialogues_v2_2026_09_26',
  packSha256: 'a'.repeat(64),
  sharedManifestSha256: 'b'.repeat(64),
  interfaceLang: 'en',
  history: Object.freeze([{ role: 'user' as const, content: 'Necesito cambiar mi viaje.' }]),
});

describe('premiumDialogReview V2 completion memory boundary', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

  afterAll(() => {
    warn.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteCompletion.mockResolvedValue(completion);
    mockPersistCompletionMemory.mockResolvedValue({
      ok: true,
      sharedMemoryStored: true,
      scenarioCheckpointStored: false,
    });
  });

  test('returns success only after the validated completion memory is durably stored', async () => {
    const handler = premiumDialogReview as unknown as (request: unknown) => Promise<unknown>;

    await expect(handler({
      auth: { uid: 'auth-a' },
      data: validV2CompletionRequest,
    })).resolves.toEqual({
      ok: true,
      v2Completion: completion,
      v2Memory: {
        sharedMemoryStored: true,
        scenarioCheckpointStored: false,
      },
    });

    expect(mockPersistCompletionMemory).toHaveBeenCalledWith(expect.objectContaining({
      authUid: 'auth-a',
      studyTarget: 'es',
      scenarioId: 'travel_19',
      completion,
    }), expect.objectContaining({
      identifierSecret: 'purpose-specific-memory-secret-with-32-bytes',
    }));
    expect(mockExecuteCompletion.mock.invocationCallOrder[0]).toBeLessThan(
      mockPersistCompletionMemory.mock.invocationCallOrder[0],
    );
    expect(Object.keys(mockExecuteCompletion.mock.calls[0][1]).sort()).toEqual([
      'generateFeedback',
      'resolveRelease',
    ]);
  });

  test('does not return a successful completion when memory persistence fails', async () => {
    mockPersistCompletionMemory.mockRejectedValue(
      new FakeHttpsError('internal', 'dialogue_v2_memory_write_failed'),
    );
    const handler = premiumDialogReview as unknown as (request: unknown) => Promise<unknown>;

    await expect(handler({
      auth: { uid: 'auth-a' },
      data: validV2CompletionRequest,
    })).rejects.toMatchObject({
      code: 'internal',
      message: 'dialogue_v2_memory_write_failed',
    });
  });
});
