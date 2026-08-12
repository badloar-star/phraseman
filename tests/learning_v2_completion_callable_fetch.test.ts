import { fetch as expoFetch } from 'expo/fetch';
import {
  beginAccountGeneration,
  type AccountGenerationToken,
} from '../app/account_generation';
import {
  withBackgroundNetworkLease,
  type BackgroundNetworkLease,
} from '../app/interactive_network_quiet';
import {
  attemptWarmLearningV2CompletionCredentialsCachePreferred,
  clearLearningV2CompletionCredentialCache,
  peekLearningV2CompletionCredentialHandle,
  type CompletionCredentialHandle,
} from '../app/learning_v2_completion_credential_cache';
import {
  callLearningV2CompletionFunctionViaFetch,
  CompletionCallableProtocolError,
  materializeLearningV2CompletionCallableBody,
  materializeLearningV2CompletionCallableRequest,
} from '../app/learning_v2_completion_callable_fetch';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));

const mockAuthState: { currentUser: { uid: string } | null } = { currentUser: null };
const mockGetIdTokenResult = jest.fn();
const mockGetAppCheckToken = jest.fn();
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => mockAuthState,
  getIdTokenResult: (...args: unknown[]) => mockGetIdTokenResult(...args),
}));
jest.mock('@react-native-firebase/app-check', () => ({
  __esModule: true,
  default: () => ({ getToken: (...args: unknown[]) => mockGetAppCheckToken(...args) }),
}));
jest.mock('@react-native-firebase/app', () => ({
  getApp: () => ({ options: { projectId: 'phraseman-ea0b3' } }),
}));
jest.mock('../app/app_check_init', () => ({ isFirebaseAppCheckReady: () => true }));

const NOW = 1_000_000;
const EXP_MS = NOW + 600_000;
const jwt = (payload: Record<string, unknown>) => [
  Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url'),
  Buffer.from(JSON.stringify(payload)).toString('base64url'),
  'signature',
].join('.');
let authToken = '';
let appCheckToken = '';
let credentialHandle: CompletionCredentialHandle;
let account: AccountGenerationToken;
const expoFetchMock = expoFetch as jest.MockedFunction<typeof expoFetch>;

const configureNativePair = (uid: string, suffix = '') => {
  authToken = jwt({
    aud: 'phraseman-ea0b3',
    iss: 'https://securetoken.google.com/phraseman-ea0b3',
    sub: uid,
    exp: EXP_MS / 1_000,
    suffix,
  });
  appCheckToken = jwt({ exp: EXP_MS / 1_000, suffix });
  mockAuthState.currentUser = { uid };
  mockGetIdTokenResult.mockResolvedValue({
    token: authToken,
    expirationTime: new Date(EXP_MS).toISOString(),
  });
  mockGetAppCheckToken.mockResolvedValue({ token: appCheckToken });
};

const warmCredentialPair = async () => {
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
  )).resolves.toBe('published');
  const handle = peekLearningV2CompletionCredentialHandle(account);
  if (!handle) throw new Error('test_credential_publish_failed');
  credentialHandle = handle;
};

const response = (raw: string, options: {
  ok?: boolean;
  length?: string | null;
  contentType?: string | null;
  stream?: boolean;
} = {}) => ({
  ok: options.ok ?? true,
  headers: { get: (name: string) => {
    if (name.toLowerCase() === 'content-length') {
      return options.length === undefined ? String(new TextEncoder().encode(raw).byteLength) : options.length;
    }
    if (name.toLowerCase() === 'content-type') {
      return options.contentType === undefined ? 'application/json; charset=utf-8' : options.contentType;
    }
    return null;
  } },
  body: options.stream === false ? undefined : { getReader: () => {
    let emitted = false;
    return {
      read: async () => {
        if (emitted) return { done: true, value: undefined };
        emitted = true;
        return { done: false, value: new TextEncoder().encode(raw) };
      },
      releaseLock: jest.fn(),
    };
  } },
  text: jest.fn(async () => raw),
}) as unknown as Response;

const requestFor = (
  lease: BackgroundNetworkLease,
  name: 'getLearningV2AccountBinding' | 'submitLearningV2RequiredSessionCompletion' =
  'getLearningV2AccountBinding',
  canonicalDataJson = '{}',
) => materializeLearningV2CompletionCallableRequest(
  name,
  credentialHandle,
  materializeLearningV2CompletionCallableBody(name, canonicalDataJson),
  lease,
);

const callBinding = () => withBackgroundNetworkLease(
  'completion.fetch_test',
  (lease) => callLearningV2CompletionFunctionViaFetch(requestFor(lease)),
);

beforeEach(async () => {
  expoFetchMock.mockReset();
  mockGetIdTokenResult.mockReset();
  mockGetAppCheckToken.mockReset();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  account = beginAccountGeneration('stable-user-1');
  configureNativePair('firebase-auth-1');
  await warmCredentialPair();
});

afterEach(() => jest.restoreAllMocks());

test('uses the exact allowlisted callable wire protocol and returns result', async () => {
  expoFetchMock.mockImplementation(async () =>
    response(JSON.stringify({ result: { ok: true } })) as never);
  await expect(callBinding()).resolves.toEqual({ ok: true });
  expect(expoFetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = expoFetchMock.mock.calls[0]!;
  expect(url).toBe('https://us-central1-phraseman-ea0b3.cloudfunctions.net/getLearningV2AccountBinding');
  expect(init).toMatchObject({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      'X-Firebase-AppCheck': appCheckToken,
    },
    body: '{"data":{}}',
    redirect: 'error',
    credentials: 'omit',
  });
});

test('expired or stale-account handle starts zero HTTP', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW + 500_001);
  await expect(callBinding()).rejects.toThrow('learning_v2_completion_callable_request_invalid');
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  await expect(withBackgroundNetworkLease('completion.fetch_test', async (lease) => {
    const request = requestFor(lease);
    beginAccountGeneration('stable-user-2');
    return callLearningV2CompletionFunctionViaFetch(request);
  })).rejects.toThrow('learning_v2_completion_callable_request_invalid');
  expect(expoFetchMock).not.toHaveBeenCalled();
});

test('same-account refresh or explicit clear invalidates an older request before HTTP', async () => {
  await expect(withBackgroundNetworkLease('completion.fetch_test', async (lease) => {
    const oldRequest = requestFor(lease);
    configureNativePair('firebase-auth-1', 'replacement');
    await warmCredentialPair();
    return callLearningV2CompletionFunctionViaFetch(oldRequest);
  })).rejects.toThrow('learning_v2_completion_callable_request_invalid');
  configureNativePair('firebase-auth-1', 'after-clear');
  await warmCredentialPair();
  await expect(withBackgroundNetworkLease('completion.fetch_test', async (lease) => {
    const request = requestFor(lease);
    clearLearningV2CompletionCredentialCache();
    return callLearningV2CompletionFunctionViaFetch(request);
  })).rejects.toThrow('learning_v2_completion_callable_request_invalid');
  expect(expoFetchMock).not.toHaveBeenCalled();
});

test('canonical JSON body is bounded and bound to its exact callable', async () => {
  expect(() => materializeLearningV2CompletionCallableBody(
    'getLearningV2AccountBinding', '{"unexpected":true}',
  )).toThrow('learning_v2_completion_callable_request_invalid');
  const submitBody = materializeLearningV2CompletionCallableBody(
    'submitLearningV2RequiredSessionCompletion', '{"mutationId":"m1"}',
  );
  await expect(withBackgroundNetworkLease('completion.fetch_test', async (lease) =>
    materializeLearningV2CompletionCallableRequest(
      'getLearningV2AccountBinding', credentialHandle, submitBody, lease,
    ))).rejects.toThrow('learning_v2_completion_callable_request_invalid');
  expect(expoFetchMock).not.toHaveBeenCalled();
});

test('preserves bounded callable error details for protocol rejection handling', async () => {
  const details = { reason: 'publication_mismatch' };
  expoFetchMock.mockImplementation(async () => response(JSON.stringify({
    error: { status: 'FAILED_PRECONDITION', message: 'rejected', details },
  }), { ok: false }) as never);
  await expect(callBinding()).rejects.toMatchObject({
    name: CompletionCallableProtocolError.name,
    status: 'FAILED_PRECONDITION',
    details,
  });
});

test('treats the protocol-defined HTTP 200 OK error envelope as failure', async () => {
  expoFetchMock.mockImplementation(async () => response(JSON.stringify({
    error: { status: 'OK', message: 'explicit callable error' },
  }), { ok: true }) as never);
  await expect(callBinding()).rejects.toMatchObject({
    name: CompletionCallableProtocolError.name,
    status: 'OK',
    message: 'explicit callable error',
  });
});

test('rejects an unknown callable error status as malformed protocol', async () => {
  expoFetchMock.mockImplementation(async () => response(JSON.stringify({
    error: { status: 'NOT_A_FIREBASE_STATUS', message: 'unknown' },
  }), { ok: false }) as never);
  await expect(callBinding()).rejects.toThrow(
    'learning_v2_completion_callable_response_invalid',
  );
});

test('does not settle while a response stream has not reached terminal state', async () => {
  let finish!: () => void;
  const terminal = new Promise<void>((resolve) => { finish = resolve; });
  const encoder = new TextEncoder();
  let first = true;
  const streamingResponse = {
    ok: true,
    headers: { get: (name: string) => name.toLowerCase() === 'content-type'
      ? 'application/json' : null },
    body: { getReader: () => ({
      read: async () => {
        if (first) { first = false; return { done: false, value: encoder.encode('{"result":1}') }; }
        await terminal;
        return { done: true, value: undefined };
      },
      releaseLock: jest.fn(),
    }) },
  } as unknown as Response;
  expoFetchMock.mockImplementation(async () => streamingResponse as never);
  const call = callBinding();
  let settled = false;
  void call.finally(() => { settled = true; });
  await Promise.resolve();
  await Promise.resolve();
  expect(settled).toBe(false);
  finish();
  await expect(call).resolves.toBe(1);
});

test('account switch during an in-flight request rejects the late result', async () => {
  let finish!: () => void;
  const transportGate = new Promise<void>((resolve) => { finish = resolve; });
  expoFetchMock.mockImplementation(async () => {
    await transportGate;
    return response('{"result":1}') as never;
  });
  const call = callBinding();
  beginAccountGeneration('stable-user-2');
  finish();
  await expect(call).rejects.toThrow('learning_v2_completion_callable_aborted');
});

test('stream overflow waits for real terminal drain before rejecting', async () => {
  let finish!: () => void;
  const terminal = new Promise<void>((resolve) => { finish = resolve; });
  let readIndex = 0;
  const streamingResponse = {
    ok: true,
    headers: { get: (name: string) => name.toLowerCase() === 'content-type'
      ? 'application/json' : null },
    body: { getReader: () => ({
      read: async () => {
        readIndex += 1;
        if (readIndex === 1) return { done: false, value: new Uint8Array(512 * 1024 + 1) };
        await terminal;
        return { done: true, value: undefined };
      },
      releaseLock: jest.fn(),
    }) },
  } as unknown as Response;
  expoFetchMock.mockImplementation(async () => streamingResponse as never);
  const call = callBinding();
  let settled = false;
  void call.finally(() => { settled = true; }).catch(() => {});
  await Promise.resolve();
  await Promise.resolve();
  expect(settled).toBe(false);
  finish();
  await expect(call).rejects.toThrow('learning_v2_completion_callable_response_overflow');
});

test('no-reader response fail-closes without text or false lease settlement', async () => {
  const unsupported = response('{}', { stream: false });
  expoFetchMock.mockImplementation(async () => unsupported as never);
  const call = callBinding();
  let settled = false;
  void call.finally(() => { settled = true; });
  await Promise.resolve();
  await Promise.resolve();
  expect(settled).toBe(false);
  expect(unsupported.text).not.toHaveBeenCalled();
});
