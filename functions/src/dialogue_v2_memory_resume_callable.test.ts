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
const mockMemoryRepository = Object.freeze({ marker: 'memory-repository' });
const mockMakeMemoryRepository = jest.fn(() => mockMemoryRepository);
const mockExecuteMemoryRead = jest.fn<Promise<Record<string, unknown>>, [unknown, any]>();

let capturedCallableOptions: Record<string, unknown> | null = null;

jest.mock('firebase-admin', () => ({
  firestore: mockFirestore,
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: mockDefineSecret,
}));

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (options: Record<string, unknown>, handler: unknown) => {
    capturedCallableOptions = options;
    return handler;
  },
}));

jest.mock('./callable_options', () => ({ ENFORCE_APP_CHECK_OPENAI: false }));
jest.mock('./auth_identity', () => ({
  resolveStableUidForAuth: mockResolveStableUidForAuth,
}));
jest.mock('./premium_status', () => ({
  resolvePremiumAccess: mockResolvePremiumAccess,
}));
jest.mock('./dialogue_v2_completion_release_source', () => ({
  loadDialogueV2CompletionReleaseCandidate: mockLoadRelease,
}));
jest.mock('./dialogue_v2_memory_writer', () => ({
  executeDialogueV2MemoryRead: mockExecuteMemoryRead,
  makeFirestoreDialogueV2MemoryRepository: mockMakeMemoryRepository,
}));

import { dialogueV2MemoryResume } from './dialogue_v2_memory_resume_callable';

type Callable = (request: Readonly<{
  auth?: Readonly<{ uid?: string }>;
  data?: unknown;
}>) => Promise<unknown>;

const callable = dialogueV2MemoryResume as unknown as Callable;

describe('Dialogue V2 memory resume callable boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecretValue.mockReturnValue('memory-secret-'.padEnd(32, 'x'));
    mockResolveStableUidForAuth.mockResolvedValue('stable-user');
    mockResolvePremiumAccess.mockResolvedValue(true);
    mockLoadRelease.mockResolvedValue(mockRelease);
    mockExecuteMemoryRead.mockImplementation(async (_request, dependencies) => {
      const stableAccountId = await dependencies.resolveStableAccountId('auth-user');
      await dependencies.resolvePremiumAccess(stableAccountId, 'auth-user');
      await dependencies.resolveRelease();
      return {
        ok: true,
        sharedSummary: {
          strengths: ['objective_1'],
          focusAreas: [],
          completedObjectives: 1,
        },
        scenarioCheckpoint: {
          nextObjectiveIndex: 1,
          completedObjectiveIds: ['objective_1'],
          personaState: { host: 'warm' },
        },
        privateStoragePath: 'must-not-cross-callable-boundary',
      };
    });
  });

  it('uses the dialog App Check policy and binds only the memory identity secret', () => {
    expect(capturedCallableOptions).toMatchObject({
      region: 'us-central1',
      enforceAppCheck: false,
      timeoutSeconds: 15,
      memory: '256MiB',
    });
    expect(capturedCallableOptions?.secrets).toEqual([mockSecret]);
  });

  it('wires fixed server identity, entitlement, active release, secret and Firestore adapters', async () => {
    const request = {
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'de', scenarioId: 'social_01' },
    } as const;

    await expect(callable(request)).resolves.toEqual({
      ok: true,
      sharedSummary: {
        strengths: ['objective_1'],
        focusAreas: [],
        completedObjectives: 1,
      },
      scenarioCheckpoint: {
        nextObjectiveIndex: 1,
        completedObjectiveIds: ['objective_1'],
        personaState: { host: 'warm' },
      },
    });

    expect(mockExecuteMemoryRead).toHaveBeenCalledWith(
      { auth: request.auth, data: request.data },
      expect.objectContaining({
        repository: mockMemoryRepository,
        identifierSecret: 'memory-secret-'.padEnd(32, 'x'),
      }),
    );
    expect(mockMakeMemoryRepository).toHaveBeenCalledWith(mockDb);
    expect(mockResolveStableUidForAuth).toHaveBeenCalledWith(mockDb, 'auth-user');
    expect(mockResolvePremiumAccess).toHaveBeenCalledWith(
      mockDb,
      'stable-user',
      expect.any(Number),
      'auth-user',
    );
    expect(mockLoadRelease).toHaveBeenCalledTimes(1);
    expect(mockLoadRelease.mock.calls[0][0]).toEqual({
      readDocument: expect.any(Function),
      readCollection: expect.any(Function),
    });
  });

  it('rejects unauthenticated and non-allowlisted request shapes before server adapters', async () => {
    const accessor = jest.fn(() => 'de');
    const withAccessor = Object.defineProperty({ scenarioId: 'social_01' }, 'studyTarget', {
      enumerable: true,
      get: accessor,
    });
    const proxyTraps = {
      getPrototypeOf: jest.fn(() => Object.prototype),
      ownKeys: jest.fn(() => ['studyTarget', 'scenarioId']),
      getOwnPropertyDescriptor: jest.fn((_target: object, property: string | symbol) => ({
        configurable: true,
        enumerable: true,
        writable: true,
        value: property === 'studyTarget' ? 'de' : 'social_01',
      })),
    };
    const withProxy = new Proxy({ studyTarget: 'de', scenarioId: 'social_01' }, proxyTraps);
    const invalidRequests = [
      { data: { studyTarget: 'de', scenarioId: 'social_01' } },
      { auth: { uid: 'auth-user' }, data: { studyTarget: 'de', scenarioId: 'social_01', isPremium: true } },
      { auth: { uid: 'auth-user' }, data: { studyTarget: 'de', scenarioId: 'social_01', stableId: 'victim' } },
      { auth: { uid: 'auth-user' }, data: { studyTarget: 'de', scenarioId: 'social_01', transcript: [] } },
      { auth: { uid: 'auth-user' }, data: withAccessor },
      { auth: { uid: 'auth-user' }, data: withProxy },
    ];

    for (const request of invalidRequests) {
      await expect(callable(request)).rejects.toBeInstanceOf(FakeHttpsError);
    }
    expect(accessor).not.toHaveBeenCalled();
    expect(proxyTraps.getPrototypeOf).not.toHaveBeenCalled();
    expect(proxyTraps.ownKeys).not.toHaveBeenCalled();
    expect(proxyTraps.getOwnPropertyDescriptor).not.toHaveBeenCalled();
    expect(mockExecuteMemoryRead).not.toHaveBeenCalled();
    expect(mockFirestore).not.toHaveBeenCalled();
    expect(mockSecretValue).not.toHaveBeenCalled();
  });

  it('keeps the callable exported from the production index without provider or transcript handling', () => {
    const callableSource = readFileSync(
      path.join(__dirname, 'dialogue_v2_memory_resume_callable.ts'),
      'utf8',
    );
    const indexSource = readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

    expect(callableSource).toContain('loadDialogueV2CompletionReleaseCandidate(');
    expect(callableSource).toContain('executeDialogueV2MemoryRead(');
    expect(callableSource).toContain("defineSecret('DIALOGUE_V2_MEMORY_ID_SECRET')");
    expect(callableSource).not.toMatch(
      /OPENAI_API_KEY|generateFeedback|request\.data\.transcript|request\.data\.history/,
    );
    expect(indexSource).toContain('const { dialogueV2MemoryResume } = require("./dialogue_v2_memory_resume_callable")');
    expect(indexSource).toContain('exports.dialogueV2MemoryResume = dialogueV2MemoryResume');
  });
});
