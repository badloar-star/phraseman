/* eslint-disable import/first */
import { readFileSync } from 'node:fs';
import path from 'node:path';

class FakeHttpsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const mockDb = Object.freeze({ marker: 'firestore' });
const mockFirestore = jest.fn(() => mockDb);
const mockSecretValue = jest.fn(() => 'memory-secret-'.padEnd(32, 'x'));
const mockSecret = Object.freeze({ name: 'DIALOGUE_V2_MEMORY_ID_SECRET', value: mockSecretValue });
const mockDefineSecret = jest.fn(() => mockSecret);
const mockResolveStableUidForAuth = jest.fn(async () => 'stable-user');
const mockResolvePremiumAccess = jest.fn(async () => true);
const mockRelease = Object.freeze({ marker: 'approved-release' });
const mockLoadRelease = jest.fn<Promise<unknown>, [unknown]>(async () => mockRelease);
const mockPacks = Object.freeze([{ scenario: { id: 'social_01' } }]);
const mockAuthorizePacks = jest.fn(() => mockPacks);
const mockLanguageAuthorization = Object.freeze({ studyTarget: 'de', scenarios: [] });
const mockBuildLanguageAuthorization = jest.fn(() => mockLanguageAuthorization);
const mockRepository = Object.freeze({ marker: 'memory-management-repository' });
const mockMakeRepository = jest.fn(() => mockRepository);
const mockExecuteView = jest.fn<Promise<Record<string, unknown>>, [unknown, any]>();
const mockExecuteClear = jest.fn<Promise<Record<string, unknown>>, [unknown, any]>();

const capturedCallables: { options: Record<string, unknown>; handler: unknown }[] = [];

jest.mock('firebase-admin', () => ({ firestore: mockFirestore }));
jest.mock('firebase-functions/params', () => ({ defineSecret: mockDefineSecret }));
jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (options: Record<string, unknown>, handler: unknown) => {
    capturedCallables.push({ options, handler });
    return handler;
  },
}));
jest.mock('./callable_options', () => ({ ENFORCE_APP_CHECK_OPENAI: false }));
jest.mock('./auth_identity', () => ({ resolveStableUidForAuth: mockResolveStableUidForAuth }));
jest.mock('./premium_status', () => ({ resolvePremiumAccess: mockResolvePremiumAccess }));
jest.mock('./dialogue_v2_completion_release_source', () => ({
  loadDialogueV2CompletionReleaseCandidate: mockLoadRelease,
}));
jest.mock('./dialogue_v2_server_authorization', () => ({
  authorizeDialogueV2ServerLanguagePacks: mockAuthorizePacks,
}));
jest.mock('./dialogue_v2_memory_management', () => ({
  buildDialogueV2MemoryLanguageAuthorization: mockBuildLanguageAuthorization,
  executeDialogueV2MemoryView: mockExecuteView,
  executeDialogueV2MemoryClear: mockExecuteClear,
  makeFirestoreDialogueV2MemoryManagementRepository: mockMakeRepository,
}));

import {
  dialogueV2MemoryClear,
  dialogueV2MemoryView,
} from './dialogue_v2_memory_management_callable';

type Callable = (request: Readonly<{
  auth?: Readonly<{ uid?: string }>;
  data?: unknown;
}>) => Promise<unknown>;

const viewCallable = dialogueV2MemoryView as unknown as Callable;
const clearCallable = dialogueV2MemoryClear as unknown as Callable;

describe('Dialogue V2 memory management callable boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthorizePacks.mockReturnValue(mockPacks);
    mockBuildLanguageAuthorization.mockReturnValue(mockLanguageAuthorization);
    mockExecuteView.mockImplementation(async (_request, dependencies) => {
      const stableId = await dependencies.resolveStableAccountId('auth-user');
      await dependencies.resolvePremiumAccess(stableId, 'auth-user');
      await dependencies.resolveLanguageAuthorization('de', stableId, dependencies.identifierSecret);
      return {
        ok: true,
        studyTarget: 'de',
        sharedSummary: null,
        scenarioCheckpoints: [],
        privatePath: 'must-not-cross-boundary',
      };
    });
    mockExecuteClear.mockResolvedValue({
      ok: true,
      studyTarget: 'de',
      cleared: true,
      deletedDocuments: 3,
      privatePath: 'must-not-cross-boundary',
    });
  });

  test('uses the sensitive App Check policy and only the opaque-id secret for both callables', () => {
    expect(capturedCallables).toHaveLength(2);
    for (const callable of capturedCallables) {
      expect(callable.options).toMatchObject({
        region: 'us-central1',
        enforceAppCheck: false,
        timeoutSeconds: 20,
        memory: '256MiB',
      });
      expect(callable.options.secrets).toEqual([mockSecret]);
    }
  });

  test('wires owner, Plus, release and fixed repository authority into view', async () => {
    await expect(viewCallable({
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'de' },
    })).resolves.toEqual({
      ok: true,
      studyTarget: 'de',
      sharedSummary: null,
      scenarioCheckpoints: [],
    });

    expect(mockExecuteView).toHaveBeenCalledWith(
      { auth: { uid: 'auth-user' }, data: { studyTarget: 'de' } },
      expect.objectContaining({
        repository: mockRepository,
        identifierSecret: 'memory-secret-'.padEnd(32, 'x'),
      }),
    );
    expect(mockResolveStableUidForAuth).toHaveBeenCalledWith(mockDb, 'auth-user');
    expect(mockResolvePremiumAccess).toHaveBeenCalledWith(
      mockDb, 'stable-user', expect.any(Number), 'auth-user',
    );
    expect(mockLoadRelease).toHaveBeenCalledTimes(1);
    expect(mockAuthorizePacks).toHaveBeenCalledWith('de', mockRelease);
    expect(mockBuildLanguageAuthorization).toHaveBeenCalledWith({
      studyTarget: 'de',
      stableAccountId: 'stable-user',
      identifierSecret: 'memory-secret-'.padEnd(32, 'x'),
      approvedPacks: mockPacks,
    });
  });

  test('returns only the public clear receipt', async () => {
    await expect(clearCallable({
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'de' },
    })).resolves.toEqual({
      ok: true,
      studyTarget: 'de',
      cleared: true,
      deletedDocuments: 3,
    });
    expect(mockExecuteClear).toHaveBeenCalledTimes(1);
    expect(mockResolvePremiumAccess).not.toHaveBeenCalled();
    expect(mockLoadRelease).not.toHaveBeenCalled();
    expect(mockAuthorizePacks).not.toHaveBeenCalled();
    expect(mockBuildLanguageAuthorization).not.toHaveBeenCalled();
  });

  test('rejects unauthenticated and non-exact selections before any authority adapter', async () => {
    const accessor = jest.fn(() => 'de');
    const withAccessor = Object.defineProperty({}, 'studyTarget', {
      enumerable: true,
      get: accessor,
    });
    const requests = [
      { data: { studyTarget: 'de' } },
      { auth: { uid: 'auth-user' }, data: {} },
      { auth: { uid: 'auth-user' }, data: { studyTarget: 'it' } },
      { auth: { uid: 'auth-user' }, data: { studyTarget: 'de', stableId: 'victim' } },
      { auth: { uid: 'auth-user' }, data: { studyTarget: 'de', scenarioId: 'social_01' } },
      { auth: { uid: 'auth-user' }, data: withAccessor },
    ];
    for (const request of requests) {
      await expect(viewCallable(request)).rejects.toBeInstanceOf(FakeHttpsError);
      await expect(clearCallable(request)).rejects.toBeInstanceOf(FakeHttpsError);
    }
    expect(accessor).not.toHaveBeenCalled();
    expect(mockFirestore).not.toHaveBeenCalled();
    expect(mockExecuteView).not.toHaveBeenCalled();
    expect(mockExecuteClear).not.toHaveBeenCalled();
  });

  test('keeps both callables exported without provider, transcript or arbitrary path handling', () => {
    const source = readFileSync(
      path.join(__dirname, 'dialogue_v2_memory_management_callable.ts'),
      'utf8',
    );
    const indexSource = readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

    expect(source).toContain('loadDialogueV2CompletionReleaseCandidate(');
    expect(source).toContain('authorizeDialogueV2ServerLanguagePacks(');
    expect(source).toContain('executeDialogueV2MemoryView(');
    expect(source).toContain('executeDialogueV2MemoryClear(');
    expect(source).not.toMatch(/OPENAI_API_KEY|transcript|history|request\.data\.path/);
    expect(indexSource).toContain('dialogueV2MemoryView');
    expect(indexSource).toContain('dialogueV2MemoryClear');
  });
});
