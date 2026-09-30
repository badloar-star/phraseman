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
const mockRelease = Object.freeze({ marker: 'approved-release' });
const mockManifest = Object.freeze({
  'de:social_01': Object.freeze({ scenarioId: 'social_01' }),
});
const mockPackets = Object.freeze([
  Object.freeze({ studyTarget: 'de', scenario: Object.freeze({ id: 'social_01' }) }),
]);
const mockLoadRelease = jest.fn<Promise<unknown>, [unknown]>(async () => mockRelease);
const mockAuthorizeCatalogue = jest.fn<unknown, [unknown, unknown]>(() => Object.freeze({
  manifest: mockManifest,
  packets: mockPackets,
  releaseId: 'must-not-cross-callable-boundary',
}));

let capturedCallableOptions: Record<string, unknown> | null = null;

jest.mock('firebase-admin', () => ({
  firestore: mockFirestore,
}));

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (options: Record<string, unknown>, handler: unknown) => {
    capturedCallableOptions = options;
    return handler;
  },
}));

jest.mock('./callable_options', () => ({ ENFORCE_APP_CHECK: false }));
jest.mock('./dialogue_v2_completion_release_source', () => ({
  loadDialogueV2CompletionReleaseCandidate: mockLoadRelease,
}));
jest.mock('./dialogue_v2_server_authorization', () => ({
  authorizeDialogueV2ServerCatalogue: mockAuthorizeCatalogue,
}));

import { dialogueV2Catalogue } from './dialogue_v2_catalogue_callable';

type Callable = (request: Readonly<{
  auth?: Readonly<{ uid?: string }>;
  data?: unknown;
}>) => Promise<unknown>;

const callable = dialogueV2Catalogue as unknown as Callable;

describe('Dialogue V2 released catalogue callable boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadRelease.mockResolvedValue(mockRelease);
    mockAuthorizeCatalogue.mockReturnValue(Object.freeze({
      manifest: mockManifest,
      packets: mockPackets,
      releaseId: 'must-not-cross-callable-boundary',
    }));
  });

  it('uses the owner-sealed App Check policy and bounded read options', () => {
    expect(capturedCallableOptions).toEqual({
      region: 'us-central1',
      enforceAppCheck: false,
      timeoutSeconds: 15,
      memory: '256MiB',
      maxInstances: 20,
    });
  });

  it('returns only the authorized learner packet list', async () => {
    await expect(callable({
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'de' },
    })).resolves.toEqual({
      ok: true,
      packets: mockPackets,
    });

    expect(mockFirestore).toHaveBeenCalledTimes(1);
    expect(mockLoadRelease).toHaveBeenCalledWith({
      readDocument: expect.any(Function),
      readCollection: expect.any(Function),
    });
    expect(mockAuthorizeCatalogue).toHaveBeenCalledWith('de', mockRelease);
  });

  it('rejects unauthenticated calls before reading the active release', async () => {
    await expect(callable({ data: { studyTarget: 'de' } })).rejects.toMatchObject({
      code: 'unauthenticated',
      message: 'auth_required',
    });

    expect(mockFirestore).not.toHaveBeenCalled();
    expect(mockLoadRelease).not.toHaveBeenCalled();
  });

  it('accepts exactly one allowlisted studyTarget data property', async () => {
    const accessor = jest.fn(() => 'de');
    const withAccessor = Object.defineProperty({}, 'studyTarget', {
      enumerable: true,
      get: accessor,
    });
    const proxy = new Proxy({ studyTarget: 'de' }, {});
    const invalidRequests = [
      null,
      {},
      { studyTarget: 'it' },
      { studyTarget: 'de', scenarioId: 'social_01' },
      withAccessor,
      proxy,
    ];

    for (const data of invalidRequests) {
      await expect(callable({ auth: { uid: 'auth-user' }, data })).rejects.toMatchObject({
        code: 'invalid-argument',
        message: 'dialogue_v2_catalogue_request_invalid',
      });
    }

    expect(accessor).not.toHaveBeenCalled();
    expect(mockFirestore).not.toHaveBeenCalled();
    expect(mockLoadRelease).not.toHaveBeenCalled();
  });

  it('fails closed when the active release is missing or authorization rejects it', async () => {
    mockLoadRelease.mockResolvedValueOnce(null);
    await expect(callable({
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'de' },
    })).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'dialogue_v2_catalogue_release_unavailable',
    });
    expect(mockAuthorizeCatalogue).not.toHaveBeenCalled();

    mockAuthorizeCatalogue.mockReturnValueOnce(null);
    await expect(callable({
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'de' },
    })).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'dialogue_v2_catalogue_release_unavailable',
    });
  });

  it('maps release repository failures to one fail-closed response', async () => {
    mockLoadRelease.mockRejectedValueOnce(new Error('firestore unavailable'));

    await expect(callable({
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'de' },
    })).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'dialogue_v2_catalogue_release_unavailable',
    });
    expect(mockAuthorizeCatalogue).not.toHaveBeenCalled();
  });

  it('is exported from the production Functions entrypoint', () => {
    const indexSource = readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

    expect(indexSource).toContain(
      'const { dialogueV2Catalogue } = require("./dialogue_v2_catalogue_callable");',
    );
    expect(indexSource).toContain(
      'exports.dialogueV2Catalogue = dialogueV2Catalogue;',
    );
  });
});
