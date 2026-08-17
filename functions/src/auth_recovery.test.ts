// ⛔ App Check запломбирован владельцем 2026-08-17: ожидания ниже приведены к
// enforceAppCheck: false. Это НЕ ослабление теста — правило отменено целиком,
// см. CLAUDE.md «APP CHECK ЗАПЛОМБИРОВАН НАВСЕГДА» и app_check_sealed.test.ts.
// Остальные проверки (секреты, регион, экспорт) сохранены как были.
export {};

type DocData = Record<string, unknown>;

type FakeRef = {
  id: string;
  path: string;
  get: () => Promise<FakeSnap>;
  set: (data: DocData, opts?: { merge?: boolean }) => Promise<void>;
};

type FakeSnap = {
  id: string;
  exists: boolean;
  data: () => DocData | undefined;
};

const docs = new Map<string, DocData>();
const versions = new Map<string, number>();
const writeLog: Array<{ path: string; data: DocData; merge: boolean }> = [];
const FIELD_DELETE = { __op: 'delete' } as const;
let autoId = 0;
let transactionReadHook: ((path: string) => void | Promise<void>) | null = null;
let nextTransactionFailure: Error | null = null;
let transactionInvocation = 0;
let failTransactionAtInvocation: number | null = null;
const mockAdminGetUser = jest.fn(async (uid: string) => ({
  uid,
  disabled: false,
  emailVerified: true,
  providerData: [{ providerId: 'google.com' }],
}));
const mockCreateCustomToken = jest.fn(async (uid: string, claims: DocData) => (
  `custom-token-${uid}-${String(claims.phrasemanRecoveryEventId ?? '')}`
));
const mockAdminGetUserByEmail = jest.fn(async (_email: string) => ({
  uid: 'old-provider-uid',
  disabled: false,
  email: RECOVERY_EMAIL,
  emailVerified: true,
  providerData: [{ providerId: 'google.com', uid: 'old-provider-uid', email: RECOVERY_EMAIL }],
}));

function cloneDoc(data: DocData): DocData {
  return JSON.parse(JSON.stringify(data)) as DocData;
}

function writeDoc(path: string, data: DocData, merge: boolean): void {
  writeLog.push({ path, data: cloneDoc(data), merge });
  const next = merge ? deepMerge(docs.get(path) ?? {}, data) : cloneDoc(data);
  docs.set(path, next);
  versions.set(path, (versions.get(path) ?? 0) + 1);
}

function mutateExternally(path: string, data: DocData | undefined): void {
  if (data === undefined) docs.delete(path);
  else docs.set(path, cloneDoc(data));
  versions.set(path, (versions.get(path) ?? 0) + 1);
}

function deepMerge(target: DocData, source: DocData): DocData {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if ((value as { __op?: unknown })?.__op === FIELD_DELETE.__op) {
      delete result[key];
      continue;
    }
    const existing = target[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      result[key] = deepMerge(existing as DocData, value as DocData);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function refFor(path: string): FakeRef {
  const id = path.split('/').pop() || path;
  return {
    id,
    path,
    get: async () => snapFor(path),
    set: async (data: DocData, opts?: { merge?: boolean }) => {
      writeDoc(path, data, opts?.merge === true);
    },
  };
}

function snapFor(path: string): FakeSnap {
  const data = docs.get(path);
  const snapshotData = data === undefined ? undefined : cloneDoc(data);
  return {
    id: path.split('/').pop() || path,
    exists: snapshotData !== undefined,
    data: () => snapshotData,
  };
}

function collectionDocs(path: string): Array<{ id: string; path: string; data: DocData }> {
  const prefix = `${path}/`;
  return Array.from(docs.entries())
    .filter(([docPath]) => docPath.startsWith(prefix) && !docPath.slice(prefix.length).includes('/'))
    .map(([docPath, data]) => ({
      id: docPath.slice(prefix.length),
      path: docPath,
      data,
    }));
}

function storeSnapshot(): Array<[string, DocData]> {
  return Array.from(docs.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, data]) => [path, cloneDoc(data)]);
}

function identitySnapshot(): Array<[string, DocData]> {
  return storeSnapshot().filter(([path]) => (
    path.startsWith('users/')
    || path.startsWith('auth_links/')
    || path.startsWith('leaderboard/')
  ));
}

function expectExactKeys(data: DocData | undefined, keys: readonly string[]): void {
  expect(data).toBeDefined();
  expect(Object.keys(data ?? {}).sort()).toEqual([...keys].sort());
}

function expectNoSensitiveValues(value: unknown): void {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain(RECOVERY_EMAIL);
  expect(serialized).not.toContain(RECOVERY_DISPLAY_NAME);
  expect(serialized).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
}

function fakeDb() {
  return {
    collection: (name: string) => ({
      doc: (id?: string) => refFor(`${name}/${id || `auto-${++autoId}`}`),
    }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<FakeSnap>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
      create: (ref: FakeRef, data: DocData) => void;
      delete: (ref: FakeRef) => void;
    }) => Promise<T>): Promise<T> => {
      transactionInvocation += 1;
      if (failTransactionAtInvocation === transactionInvocation) {
        throw new Error('injected transaction phase failure');
      }
      if (nextTransactionFailure) {
        const failure = nextTransactionFailure;
        nextTransactionFailure = null;
        throw failure;
      }
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const reads = new Map<string, number>();
        const writes: Array<{
          mode: 'set' | 'create' | 'delete';
          ref: FakeRef;
          data: DocData;
          merge: boolean;
        }> = [];
        let result: T;
        try {
          result = await fn({
          get: async (ref: FakeRef) => {
            if (writes.length > 0) throw new Error('firestore reads must precede transaction writes');
            reads.set(ref.path, versions.get(ref.path) ?? 0);
            const snapshot = await ref.get();
            await transactionReadHook?.(ref.path);
            return snapshot;
          },
          set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
            writes.push({ mode: 'set', ref, data: cloneDoc(data), merge: opts?.merge === true });
          },
          create: (ref: FakeRef, data: DocData) => {
            writes.push({ mode: 'create', ref, data: cloneDoc(data), merge: false });
          },
          delete: (ref: FakeRef) => {
            writes.push({ mode: 'delete', ref, data: {}, merge: false });
          },
          });
        } catch (error) {
          const conflictedDuringFailure = Array.from(reads.entries())
            .some(([path, version]) => (versions.get(path) ?? 0) !== version);
          if (conflictedDuringFailure) continue;
          throw error;
        }

        const conflicted = Array.from(reads.entries())
          .some(([path, version]) => (versions.get(path) ?? 0) !== version);
        if (conflicted) continue;

        for (const write of writes) {
          if (write.mode === 'create' && docs.has(write.ref.path)) {
            throw new Error('already exists');
          }
        }
        for (const write of writes) {
          if (write.mode === 'delete') {
            writeLog.push({ path: write.ref.path, data: {}, merge: false });
            docs.delete(write.ref.path);
            versions.set(write.ref.path, (versions.get(write.ref.path) ?? 0) + 1);
          } else {
            writeDoc(write.ref.path, write.data, write.merge);
          }
        }
        return result;
      }
      throw new Error('transaction retry limit exceeded');
    },
  };
}

class FakeHttpsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

type CallableRegistration = {
  options: Record<string, unknown>;
  handler: (...args: any[]) => unknown;
};

const registeredCallables: CallableRegistration[] = [];
const registeredDocumentCreates: Array<{ options: Record<string, unknown>; handler: (...args: any[]) => unknown }> = [];

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) => {
    const options = typeof optsOrHandler === 'function'
      ? {}
      : (optsOrHandler ?? {}) as Record<string, unknown>;
    const handler = (typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler) as (...args: any[]) => unknown;
    registeredCallables.push({ options, handler });
    return handler;
  },
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: (name: string) => ({ name, value: () => `${name}-test-secret-material-at-least-32-bytes` }),
  defineString: (name: string, options?: { default?: string }) => ({
    name,
    value: () => options?.default ?? (name.includes('PREVIOUS') ? 'v0' : 'v1'),
  }),
}));

jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: (options: Record<string, unknown>, handler: (...args: any[]) => unknown) => {
    registeredDocumentCreates.push({ options, handler });
    return handler;
  },
}));

jest.mock('./callable_options', () => ({
  HOT_CALLABLE_OPTIONS: {
    region: 'us-central1',
    enforceAppCheck: false,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 80,
  },
}));

jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => fakeDb());
  (firestore as unknown as { FieldValue: Record<string, unknown> }).FieldValue = {
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
    delete: () => FIELD_DELETE,
  };
  return {
    firestore,
    auth: jest.fn(() => ({
      getUser: (uid: string) => mockAdminGetUser(uid),
      getUserByEmail: (email: string) => mockAdminGetUserByEmail(email),
      createCustomToken: (uid: string, claims: DocData) => mockCreateCustomToken(uid, claims),
    })),
  };
});

jest.mock('./admin_email', () => ({
  sendTransactionalEmail: jest.fn(async () => ({ ok: true, id: 'em_test' })),
}));

jest.mock('./admin_alerts', () => ({
  sendTelegramAlert: jest.fn(async () => true),
  ADMIN_ALERT_BOT_TOKEN: { value: () => 'test-bot-token' },
}));

const STABLE = 'stable-abc-123';
const NOW = new Date('2026-07-22T12:00:00.000Z').getTime();
const RECOVERY_EMAIL = 'recovery.owner@example.invalid';
const RECOVERY_DISPLAY_NAME = 'Recovery Fixture';
const ACTIVE_RECOVERY_CODE_KEYS = [
  'attempts',
  'codeHash',
  'createdAt',
  'expiresAt',
  'generation',
  'provider',
  'requestedByUid',
  'salt',
  'status',
] as const;
const CONSUMED_RECOVERY_CODE_KEYS = [
  ...ACTIVE_RECOVERY_CODE_KEYS,
  'consumedAt',
  'consumedByUid',
  'handoffEligibleUntil',
  'recoveryEventId',
  'updatedAt',
] as const;
const FAILED_RECOVERY_CODE_KEYS = [
  ...ACTIVE_RECOVERY_CODE_KEYS,
  'sendError',
  'updatedAt',
] as const;
const RECOVERY_RATE_LIMIT_KEYS = [
  'count',
  'stableId',
  'updatedAtMs',
  'windowStartMs',
] as const;
const RECOVERY_EVENT_KEYS = [
  'at',
  'handoffEligibleUntil',
  'newProviderUid',
  'previousProviderUids',
  'recoveryEventId',
  'requestedByUid',
  'rollbackUntil',
  'stableId',
  'status',
] as const;
const CLEAN_RECOVERY_CHALLENGE_REQUEST_KEYS = [
  'attempts',
  'createdAtMs',
  'emailHmac',
  'expiresAtMs',
  'generation',
  'keyVersion',
  'provider',
  'requesterUid',
  'status',
  'targetProviderUid',
  'targetStableId',
] as const;
const CLEAN_RECOVERY_INTENT_REQUEST_KEYS = [
  'challengeId',
  'createdAtMs',
  'emailHmac',
  'generation',
  'keyVersion',
  'provider',
  'requesterUid',
  'status',
  'targetProviderUid',
] as const;

function seedLinkedUser(provider: 'google' | 'apple' = 'google') {
  docs.set(`users/${STABLE}`, {
    firebaseAuthUid: 'old-provider-uid',
    linkedAuth: {
      provider,
      providerUid: 'old-provider-uid',
      email: RECOVERY_EMAIL,
      displayName: RECOVERY_DISPLAY_NAME,
      devicePlatform: 'ios',
      linkedAt: 111,
    },
  });
  docs.set('auth_links/old-provider-uid', {
    stable_id: STABLE,
    providerUid: 'old-provider-uid',
    provider,
    linkedAt: 111,
  });
}

type SessionOptions = {
  signInProvider?: unknown;
  emailVerified?: unknown;
  omitSignInProvider?: boolean;
  omitEmailVerified?: boolean;
};

const REJECTED_PROVIDER_SESSIONS: Array<[
  label: string,
  targetProvider: 'google' | 'apple',
  session: SessionOptions,
]> = [
  ['anonymous', 'google', { signInProvider: 'anonymous', emailVerified: true }],
  ['password', 'google', { signInProvider: 'password', emailVerified: true }],
  ['custom-token', 'google', { signInProvider: 'custom', emailVerified: true }],
  ['unverified Google', 'google', { signInProvider: 'google.com', emailVerified: false }],
  ['unverified Apple', 'apple', { signInProvider: 'apple.com', emailVerified: false }],
  ['missing email_verified', 'google', { signInProvider: 'google.com', omitEmailVerified: true }],
  ['missing sign_in_provider', 'google', { emailVerified: true, omitSignInProvider: true }],
  ['string email_verified true', 'google', { signInProvider: 'google.com', emailVerified: 'true' }],
  ['facebook', 'google', { signInProvider: 'facebook.com', emailVerified: true }],
];

const INVALID_TARGET_ANCHORS: Array<[
  label: string,
  mutate: () => void,
]> = [
  ['ownerless', () => docs.set('auth_links/old-provider-uid', {
    stable_id: STABLE,
    provider: 'google',
  })],
  ['conflicting', () => docs.set('auth_links/old-provider-uid', {
    stable_id: 'different-stable-id',
    providerUid: 'old-provider-uid',
    provider: 'google',
  })],
];

function validSessionFor(provider: 'google' | 'apple'): SessionOptions {
  return { signInProvider: `${provider}.com`, emailVerified: true };
}

function authRequest(authUid: string, data: DocData, session: SessionOptions = {}) {
  const token: Record<string, unknown> = {};
  if (!session.omitEmailVerified) token.email_verified = session.emailVerified ?? true;
  if (!session.omitSignInProvider) {
    token.firebase = { sign_in_provider: session.signInProvider ?? 'google.com' };
  }
  return {
    app: { appId: 'test-app-id' },
    auth: {
      uid: authUid,
      token,
    },
    data,
  };
}

async function callRequest(data: DocData, authUid = 'new-google-uid', session: SessionOptions = {}) {
  const { authRequestRecoveryCode } = require('./auth_recovery');
  return authRequestRecoveryCode(authRequest(authUid, data, session));
}

async function callConfirm(data: DocData, authUid: string, session: SessionOptions = {}) {
  const { authConfirmRecoveryCode } = require('./auth_recovery');
  return authConfirmRecoveryCode(authRequest(authUid, data, session));
}

async function callCleanRequest(data: DocData, authUid = 'new-google-uid', session: SessionOptions = {}) {
  const { authRequestCleanInstallRecoveryCode } = require('./auth_recovery');
  return authRequestCleanInstallRecoveryCode(authRequest(authUid, data, session));
}

async function callCleanConfirm(data: DocData, authUid = 'new-google-uid', session: SessionOptions = {}) {
  const { authConfirmCleanInstallRecoveryCode } = require('./auth_recovery');
  return authConfirmCleanInstallRecoveryCode(authRequest(authUid, data, session));
}

async function callCleanWorker(intentId: string) {
  const { authCleanInstallRecoveryDeliveryWorker } = require('./auth_recovery');
  const ref = refFor(`auth_recovery_delivery_intents/${intentId}`);
  return authCleanInstallRecoveryDeliveryWorker({
    params: { intentId },
    data: { id: intentId, ref, exists: true, data: () => cloneDoc(docs.get(ref.path) ?? {}) },
  });
}

async function callIssueHandoff(
  recoveryEventId: string,
  authUid = 'handoff-google-uid',
  requestId = 'request-1',
) {
  const { authIssueRecoveryHandoffToken } = require('./auth_recovery');
  return authIssueRecoveryHandoffToken(authRequest(authUid, { recoveryEventId, requestId }));
}

async function callCompleteHandoff(
  recoveryEventId: string,
  authUid = 'handoff-google-uid',
  claimOverrides: DocData = {},
) {
  const { authCompleteRecoveryHandoff } = require('./auth_recovery');
  const request = authRequest(authUid, { recoveryEventId }, {
    signInProvider: 'custom',
    emailVerified: true,
  });
  Object.assign(request.auth.token, {
    phrasemanRecovery: true,
    phrasemanRecoveryEventId: recoveryEventId,
    ...claimOverrides,
  });
  return authCompleteRecoveryHandoff(request);
}

function emailedCode(): string {
  const { sendTransactionalEmail } = require('./admin_email');
  const calls = sendTransactionalEmail.mock.calls;
  const text = String(calls[calls.length - 1]?.[0]?.text ?? '');
  const match = text.match(/\n(\d{6})\n/);
  if (!match) throw new Error('код не найден в тексте письма');
  return match[1];
}

function wrongCode(): string {
  return emailedCode() === '000000' ? '000001' : '000000';
}

async function seedRecoveryEventForHandoff(authUid = 'handoff-google-uid') {
  seedLinkedUser();
  await callRequest({ stableId: STABLE }, authUid);
  return callConfirm({ stableId: STABLE, code: emailedCode() }, authUid);
}

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers().setSystemTime(NOW);
  docs.clear();
  versions.clear();
  writeLog.length = 0;
  registeredCallables.length = 0;
  registeredDocumentCreates.length = 0;
  autoId = 0;
  transactionReadHook = null;
  nextTransactionFailure = null;
  transactionInvocation = 0;
  failTransactionAtInvocation = null;
  mockAdminGetUser.mockClear();
  mockAdminGetUserByEmail.mockClear();
  mockCreateCustomToken.mockClear();
  mockAdminGetUser.mockImplementation(async (uid: string) => ({
    uid,
    disabled: false,
    email: RECOVERY_EMAIL,
    emailVerified: true,
    providerData: [{ providerId: 'google.com', uid, email: RECOVERY_EMAIL }],
  }));
  mockCreateCustomToken.mockImplementation(async (uid: string, claims: DocData) => (
    `custom-token-${uid}-${String(claims.phrasemanRecoveryEventId ?? '')}`
  ));
  mockAdminGetUserByEmail.mockImplementation(async (_email: string) => ({
    uid: 'old-provider-uid',
    disabled: false,
    email: RECOVERY_EMAIL,
    emailVerified: true,
    providerData: [{ providerId: 'google.com', uid: 'old-provider-uid', email: RECOVERY_EMAIL }],
  }));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('hashRecoveryCode', () => {
  it('детерминированный sha256(salt + code), соль меняет хэш', () => {
    const { hashRecoveryCode } = require('./auth_recovery');
    expect(hashRecoveryCode('salt1', '123456')).toBe(hashRecoveryCode('salt1', '123456'));
    expect(hashRecoveryCode('salt1', '123456')).not.toBe(hashRecoveryCode('salt2', '123456'));
    expect(hashRecoveryCode('salt1', '123456')).not.toBe(hashRecoveryCode('salt1', '654321'));
    expect(hashRecoveryCode('salt1', '123456')).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('recovery callable security boundary', () => {
  it('enforces App Check and binds only the secrets each legacy callable reads', () => {
    const { authRequestRecoveryCode, authConfirmRecoveryCode } = require('./auth_recovery');
    const { ADMIN_ALERT_BOT_TOKEN } = require('./admin_alerts');
    const { RESEND_API_KEY } = require('./resend_secret');
    const baseOptions = {
      region: 'us-central1',
      timeoutSeconds: 15,
      memory: '256MiB',
      maxInstances: 80,
    };
    const requestRegistrations = registeredCallables.filter(({ handler }) => handler === authRequestRecoveryCode);
    const confirmRegistrations = registeredCallables.filter(({ handler }) => handler === authConfirmRecoveryCode);

    expect(requestRegistrations).toEqual([{
      options: { ...baseOptions, enforceAppCheck: false, secrets: [RESEND_API_KEY] },
      handler: authRequestRecoveryCode,
    }]);
    expect(confirmRegistrations).toEqual([{
      options: {
        ...baseOptions,
        enforceAppCheck: false,
        secrets: [ADMIN_ALERT_BOT_TOKEN],
      },
      handler: authConfirmRecoveryCode,
    }]);
  });

  it.each([
    ['authRequestRecoveryCode', { stableId: STABLE }],
    ['authConfirmRecoveryCode', { stableId: STABLE, code: '123456' }],
  ])('%s fails closed without direct request.app and performs no side effects', async (exportName, data) => {
    seedLinkedUser();
    const recovery = require('./auth_recovery');
    const before = storeSnapshot();
    const request = authRequest('verified-google-uid', data);
    delete (request as { app?: unknown }).app;

    await expect(recovery[exportName](request)).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'app_check_required',
    });
    const { sendTransactionalEmail } = require('./admin_email');
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
    expect(writeLog).toEqual([]);
    expect(storeSnapshot()).toEqual(before);
  });
});

describe('authRequestRecoveryCode', () => {
  it('требует auth', async () => {
    const { authRequestRecoveryCode } = require('./auth_recovery');
    await expect(authRequestRecoveryCode({ app: { appId: 'test-app-id' }, auth: null, data: { stableId: STABLE } }))
      .rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });
  });

  it.each(REJECTED_PROVIDER_SESSIONS)(
    'rejects a %s token-claim session before sending a recovery code',
    async (_label, targetProvider, session) => {
    seedLinkedUser(targetProvider);
    const before = storeSnapshot();

    await expect(callRequest({ stableId: STABLE, provider: targetProvider }, 'requesting-uid', session))
      .rejects.toMatchObject({ code: 'permission-denied' });
    const { sendTransactionalEmail } = require('./admin_email');
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
    expect(writeLog).toEqual([]);
    expect(storeSnapshot()).toEqual(before);
  });

  it.each(INVALID_TARGET_ANCHORS)(
    'rejects a %s target auth_links anchor without sending or writing',
    async (_label, mutateAnchor) => {
      seedLinkedUser();
      mutateAnchor();
      const before = storeSnapshot();

      await expect(callRequest({ stableId: STABLE }))
        .rejects.toMatchObject({ code: 'permission-denied' });
      const { sendTransactionalEmail } = require('./admin_email');
      expect(sendTransactionalEmail).not.toHaveBeenCalled();
      expect(writeLog).toEqual([]);
      expect(identitySnapshot()).toEqual(before.filter(([path]) => (
        path.startsWith('users/') || path.startsWith('auth_links/') || path.startsWith('leaderboard/')
      )));
      expect(storeSnapshot()).toEqual(before);
    },
  );

  it('allows code issuance when a legacy user-owned provider anchor was already purged', async () => {
    seedLinkedUser();
    docs.delete('auth_links/old-provider-uid');

    await expect(callRequest({ stableId: STABLE })).resolves.toMatchObject({
      ok: true,
      provider: 'google',
    });
    expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({ status: 'active' });
  });

  it('rejects a tombstoned recovery target without sending or writing', async () => {
    seedLinkedUser();
    docs.set(`account_deletion_tombstones/${STABLE}`, { deletedAt: NOW });
    const before = storeSnapshot();

    await expect(callRequest({ stableId: STABLE }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_delete_pending' });
    const { sendTransactionalEmail } = require('./admin_email');
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
    expect(writeLog).toEqual([]);
    expect(storeSnapshot()).toEqual(before);
  });

  it.each([
    ['old provider marker', 'account_deletion_auth_markers/old-provider-uid'],
    ['current provider marker', 'account_deletion_auth_markers/new-google-uid'],
    ['target tombstone', `account_deletion_tombstones/${STABLE}`],
  ])('rejects when a %s appears after preflight but before code creation', async (_label, path) => {
    seedLinkedUser();
    let injected = false;
    transactionReadHook = (readPath) => {
      if (!injected && readPath === `auth_recovery_rate_limits/${STABLE}`) {
        injected = true;
        mutateExternally(path, { status: 'pending', at: NOW });
      }
    };

    await expect(callRequest({ stableId: STABLE }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_delete_pending' });
    const { sendTransactionalEmail } = require('./admin_email');
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
    expect(docs.get(`auth_recovery_codes/${STABLE}`)).toBeUndefined();
    expect(docs.get(`auth_recovery_rate_limits/${STABLE}`)).toBeUndefined();
    expect(writeLog).toEqual([]);
  });

  it('шлёт код на email привязки, возвращает маску и не светит полный email', async () => {
    seedLinkedUser();
    const result = await callRequest({ stableId: STABLE });

    expect(result).toEqual({
      ok: true,
      maskedEmail: 'rec***@example.invalid',
      expiresInSec: 600,
      provider: 'google',
    });
    expect(JSON.stringify(result)).not.toContain('recovery.owner');

    const { sendTransactionalEmail } = require('./admin_email');
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);
    const sent = sendTransactionalEmail.mock.calls[0][0];
    expect(sent.to).toBe(RECOVERY_EMAIL);
    expect(sent.subject).toBe('Phraseman — код восстановления аккаунта');
    expect(sent.text).toContain('10 минут');
    expect(sent.text).toContain('проигнорируйте');
    expect(sent.text).toContain('safely ignore');

    const codeDoc = docs.get(`auth_recovery_codes/${STABLE}`);
    expectExactKeys(codeDoc, ACTIVE_RECOVERY_CODE_KEYS);
    expectNoSensitiveValues(codeDoc);
    expect(codeDoc).toMatchObject({
      status: 'active',
      attempts: 0,
      requestedByUid: 'new-google-uid',
      provider: 'google',
      createdAt: NOW,
      expiresAt: NOW + 10 * 60 * 1000,
    });
    // Сам код в Firestore не хранится — только sha256(salt + code).
    const { hashRecoveryCode } = require('./auth_recovery');
    expect(codeDoc?.code).toBeUndefined();
    expect(codeDoc?.codeHash).toBe(hashRecoveryCode(String(codeDoc?.salt), emailedCode()));

    const rateLimitDoc = docs.get(`auth_recovery_rate_limits/${STABLE}`);
    expectExactKeys(rateLimitDoc, RECOVERY_RATE_LIMIT_KEYS);
    expectNoSensitiveValues(rateLimitDoc);
    expect(rateLimitDoc).toMatchObject({
      windowStartMs: NOW,
      count: 1,
    });
  });

  it('uses verified Apple token claims for both handlers and ignores data.provider', async () => {
    seedLinkedUser('apple');
    const appleSession = validSessionFor('apple');

    const requestResult = await callRequest(
      { stableId: STABLE, provider: 'google' },
      'replacement-apple-uid',
      appleSession,
    );
    expect(requestResult).toMatchObject({ ok: true, provider: 'apple' });
    expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({ provider: 'apple' });

    const confirmResult = await callConfirm(
      { stableId: STABLE, code: emailedCode(), provider: 'google' },
      'replacement-apple-uid',
      appleSession,
    );
    expect(confirmResult).toMatchObject({ ok: true, stableId: STABLE });
    expect(docs.get('auth_links/replacement-apple-uid')).toMatchObject({
      stable_id: STABLE,
      providerUid: 'replacement-apple-uid',
      provider: 'apple',
    });
  });

  it('recovery_no_email: нет документа, нет linkedAuth или нет email', async () => {
    await expect(callRequest({ stableId: 'missing-stable' }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'recovery_no_email' });

    docs.set(`users/${STABLE}`, { firebaseAuthUid: 'anon-1' });
    await expect(callRequest({ stableId: STABLE }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'recovery_no_email' });

    docs.set(`users/${STABLE}`, {
      linkedAuth: { provider: 'google', providerUid: 'uid-1', email: null },
    });
    await expect(callRequest({ stableId: STABLE }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'recovery_no_email' });
  });

  it('rate-limit: не больше 3 отправок в час на stable_id', async () => {
    seedLinkedUser();
    await callRequest({ stableId: STABLE });
    await callRequest({ stableId: STABLE });
    await callRequest({ stableId: STABLE });
    await expect(callRequest({ stableId: STABLE }))
      .rejects.toMatchObject({ code: 'resource-exhausted', message: 'recovery_rate_limited' });
    expect(docs.get(`auth_recovery_rate_limits/${STABLE}`)).toMatchObject({ count: 3 });

    // Через час окно сбрасывается — отправка снова возможна.
    jest.setSystemTime(NOW + 61 * 60 * 1000);
    await callRequest({ stableId: STABLE });
    expect(docs.get(`auth_recovery_rate_limits/${STABLE}`)).toMatchObject({ count: 1 });
  });

  it('resend_key_missing / сбой отправки: код гасится, ошибка наружу', async () => {
    seedLinkedUser();
    const { sendTransactionalEmail } = require('./admin_email');
    sendTransactionalEmail.mockResolvedValueOnce({ ok: false, error: 'resend_key_missing' });
    await expect(callRequest({ stableId: STABLE }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'resend_key_missing' });
    const missingKeyCodeDoc = docs.get(`auth_recovery_codes/${STABLE}`);
    expectExactKeys(missingKeyCodeDoc, FAILED_RECOVERY_CODE_KEYS);
    expectNoSensitiveValues(missingKeyCodeDoc);
    expect(missingKeyCodeDoc).toMatchObject({ status: 'send_failed' });

    docs.delete(`auth_recovery_codes/${STABLE}`);
    docs.delete(`auth_recovery_rate_limits/${STABLE}`);
    sendTransactionalEmail.mockResolvedValueOnce({
      ok: false,
      error: `resend 500 for ${RECOVERY_EMAIL} ${RECOVERY_DISPLAY_NAME}`,
    });
    await expect(callRequest({ stableId: STABLE }))
      .rejects.toMatchObject({ code: 'internal', message: 'recovery_email_failed' });
    const failedCodeDoc = docs.get(`auth_recovery_codes/${STABLE}`);
    expectExactKeys(failedCodeDoc, FAILED_RECOVERY_CODE_KEYS);
    expectNoSensitiveValues(failedCodeDoc);
    expect(failedCodeDoc).toMatchObject({ status: 'send_failed' });
  });

  it('does not let request A late send failure poison the newer request B code', async () => {
    seedLinkedUser();
    const { sendTransactionalEmail } = require('./admin_email');
    let resolveFirstSend!: (result: { ok: false; error: string }) => void;
    let markFirstSendStarted!: () => void;
    const firstSendStarted = new Promise<void>((resolve) => {
      markFirstSendStarted = resolve;
    });
    sendTransactionalEmail
      .mockImplementationOnce(() => {
        markFirstSendStarted();
        return new Promise((resolve) => {
          resolveFirstSend = resolve;
        });
      })
      .mockResolvedValueOnce({ ok: true, id: 'em_newer' });

    const requestA = callRequest({ stableId: STABLE }, 'requester-a');
    await firstSendStarted;
    const generationA = docs.get(`auth_recovery_codes/${STABLE}`)?.generation;

    await expect(callRequest({ stableId: STABLE }, 'requester-b')).resolves.toMatchObject({ ok: true });
    const afterRequestB = cloneDoc(docs.get(`auth_recovery_codes/${STABLE}`) ?? {});
    expect(afterRequestB).toMatchObject({ status: 'active', requestedByUid: 'requester-b' });
    expect(afterRequestB.generation).not.toBe(generationA);

    resolveFirstSend({ ok: false, error: 'resend_transport_failed' });
    await expect(requestA).rejects.toMatchObject({
      code: 'internal',
      message: 'recovery_email_failed',
    });

    expect(docs.get(`auth_recovery_codes/${STABLE}`)).toEqual(afterRequestB);
    expect(docs.get(`auth_recovery_rate_limits/${STABLE}`)).toMatchObject({ count: 2 });
  });
});

describe('authConfirmRecoveryCode', () => {
  it('валидирует формат входных данных', async () => {
    seedLinkedUser();
    await expect(callConfirm({ stableId: '', code: '123456' }, 'new-uid'))
      .rejects.toMatchObject({ code: 'invalid-argument', message: 'stable_id_required' });
    await expect(callConfirm({ stableId: STABLE, code: '' }, 'new-uid'))
      .rejects.toMatchObject({ code: 'invalid-argument', message: 'code_required' });
    await expect(callConfirm({ stableId: STABLE, code: '12a456' }, 'new-uid'))
      .rejects.toMatchObject({ code: 'invalid-argument', message: 'code_format_invalid' });
    await expect(callConfirm({ stableId: STABLE, code: '123456' }, ''))
      .rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });
  });

  it.each(REJECTED_PROVIDER_SESSIONS)(
    'rejects a %s token-claim session before consuming a valid code',
    async (_label, targetProvider, session) => {
    seedLinkedUser(targetProvider);
    await callRequest(
      { stableId: STABLE },
      'replacement-uid',
      validSessionFor(targetProvider),
    );
    const code = emailedCode();
    const before = storeSnapshot();
    const beforeIdentity = identitySnapshot();
    writeLog.length = 0;
    const { sendTransactionalEmail } = require('./admin_email');
    sendTransactionalEmail.mockClear();

    await expect(callConfirm({ stableId: STABLE, code }, 'replacement-uid', session))
      .rejects.toMatchObject({ code: 'permission-denied' });
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
    expect(writeLog).toEqual([]);
    expect(identitySnapshot()).toEqual(beforeIdentity);
    expect(storeSnapshot()).toEqual(before);
  });

  it.each(INVALID_TARGET_ANCHORS)(
    'revalidates and rejects a %s target auth_links anchor before identity writes',
    async (_label, mutateAnchor) => {
      seedLinkedUser();
      await callRequest({ stableId: STABLE }, 'replacement-google-uid');
      const code = emailedCode();
      mutateAnchor();
      const before = storeSnapshot();
      const beforeIdentity = identitySnapshot();
      writeLog.length = 0;
      const { sendTransactionalEmail } = require('./admin_email');
      sendTransactionalEmail.mockClear();

      await expect(callConfirm({ stableId: STABLE, code }, 'replacement-google-uid'))
        .rejects.toMatchObject({ code: 'permission-denied' });
      expect(sendTransactionalEmail).not.toHaveBeenCalled();
      expect(writeLog).toEqual([]);
      expect(identitySnapshot()).toEqual(beforeIdentity);
      expect(storeSnapshot()).toEqual(before);
    },
  );

  it('repairs a legacy user-owned missing anchor without issuing a delete for it', async () => {
    seedLinkedUser();
    await callRequest({ stableId: STABLE }, 'replacement-google-uid');
    const code = emailedCode();
    docs.delete('auth_links/old-provider-uid');
    writeLog.length = 0;

    await expect(callConfirm({ stableId: STABLE, code }, 'replacement-google-uid'))
      .resolves.toMatchObject({ ok: true, stableId: STABLE });

    expect(docs.get('auth_links/old-provider-uid')).toBeUndefined();
    expect(writeLog.filter(({ path, data }) => (
      path === 'auth_links/old-provider-uid' && Object.keys(data).length === 0
    ))).toHaveLength(0);
    expect(collectionDocs('auth_recovery_events')).toHaveLength(1);
    expect(collectionDocs('auth_recovery_events')[0]?.data).toMatchObject({
      previousProviderUids: ['old-provider-uid'],
    });
  });

  it('rejects target user ownership drift after the recovery code is read', async () => {
    seedLinkedUser();
    await callRequest({ stableId: STABLE }, 'replacement-google-uid');
    const code = emailedCode();
    const codeBefore = cloneDoc(docs.get(`auth_recovery_codes/${STABLE}`) ?? {});
    writeLog.length = 0;
    let injected = false;
    transactionReadHook = (path) => {
      if (!injected && path === `auth_recovery_codes/${STABLE}`) {
        injected = true;
        mutateExternally(`users/${STABLE}`, {
          firebaseAuthUid: 'foreign-provider-uid',
          linkedAuth: {
            provider: 'google',
            providerUid: 'foreign-provider-uid',
            email: RECOVERY_EMAIL,
          },
        });
      }
    };

    await expect(callConfirm({ stableId: STABLE, code }, 'replacement-google-uid'))
      .rejects.toMatchObject({ code: 'permission-denied' });
    expect(docs.get(`auth_recovery_codes/${STABLE}`)).toEqual(codeBefore);
    expect(docs.get('auth_links/replacement-google-uid')).toBeUndefined();
    expect(collectionDocs('auth_recovery_events')).toHaveLength(0);
    expect(writeLog).toEqual([]);
  });

  it.each(['absent-to-provider-owned', 'anon-a-to-anon-b'])(
    'rejects incoming auth_links drift during confirm: %s',
    async (mode) => {
      seedLinkedUser();
      await callRequest({ stableId: STABLE }, 'replacement-google-uid');
      const code = emailedCode();
      if (mode === 'anon-a-to-anon-b') {
        docs.set('auth_links/replacement-google-uid', { stable_id: 'anon-a', linkedAt: 5 });
        docs.set('users/anon-a', { firebaseAuthUid: 'replacement-google-uid' });
      }
      writeLog.length = 0;
      let injected = false;
      transactionReadHook = (path) => {
        if (!injected && path === `auth_recovery_codes/${STABLE}`) {
          injected = true;
          const stableId = mode === 'absent-to-provider-owned' ? 'foreign-provider-stable' : 'anon-b';
          mutateExternally('auth_links/replacement-google-uid', { stable_id: stableId, linkedAt: 9 });
          mutateExternally(`users/${stableId}`, mode === 'absent-to-provider-owned'
            ? {
              firebaseAuthUid: 'replacement-google-uid',
              linkedAuth: { provider: 'google', providerUid: 'replacement-google-uid' },
            }
            : { firebaseAuthUid: 'replacement-google-uid' });
        }
      };

      await expect(callConfirm({ stableId: STABLE, code }, 'replacement-google-uid'))
        .rejects.toMatchObject({ code: 'permission-denied' });
      expect(docs.get('auth_links/replacement-google-uid')).toMatchObject({
        stable_id: mode === 'absent-to-provider-owned' ? 'foreign-provider-stable' : 'anon-b',
      });
      expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({ status: 'active' });
      expect(collectionDocs('auth_recovery_events')).toHaveLength(0);
      expect(writeLog).toEqual([]);
    },
  );

  it('rejects a tombstoned target before consuming the code or changing identity', async () => {
    seedLinkedUser();
    await callRequest({ stableId: STABLE }, 'replacement-google-uid');
    const code = emailedCode();
    docs.set(`account_deletion_tombstones/${STABLE}`, { deletedAt: NOW });
    const before = storeSnapshot();
    const beforeIdentity = identitySnapshot();
    writeLog.length = 0;

    await expect(callConfirm({ stableId: STABLE, code }, 'replacement-google-uid'))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_delete_pending' });
    expect(writeLog).toEqual([]);
    expect(identitySnapshot()).toEqual(beforeIdentity);
    expect(storeSnapshot()).toEqual(before);
  });

  it.each([
    ['old provider marker', 'account_deletion_auth_markers/old-provider-uid'],
    ['current provider marker', 'account_deletion_auth_markers/replacement-google-uid'],
    ['target tombstone', `account_deletion_tombstones/${STABLE}`],
  ])('rejects when a %s appears after code read and commits no recovery writes', async (_label, path) => {
    seedLinkedUser();
    await callRequest({ stableId: STABLE }, 'replacement-google-uid');
    const code = emailedCode();
    const codeBefore = cloneDoc(docs.get(`auth_recovery_codes/${STABLE}`) ?? {});
    writeLog.length = 0;
    let injected = false;
    transactionReadHook = (readPath) => {
      if (!injected && readPath === `auth_recovery_codes/${STABLE}`) {
        injected = true;
        mutateExternally(path, { status: 'pending', at: NOW });
      }
    };

    await expect(callConfirm({ stableId: STABLE, code }, 'replacement-google-uid'))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_delete_pending' });
    expect(docs.get(`auth_recovery_codes/${STABLE}`)).toEqual(codeBefore);
    expect(docs.get('auth_links/replacement-google-uid')).toBeUndefined();
    expect(collectionDocs('auth_recovery_events')).toHaveLength(0);
    expect(writeLog).toEqual([]);
  });

  it.each([
    ['Google session cannot replace an Apple identity', 'apple', 'apple.com', 'google.com'],
    ['Apple session cannot replace a Google identity', 'google', 'google.com', 'apple.com'],
  ])('%s', async (_label, targetProvider, requestProvider, confirmProvider) => {
    seedLinkedUser(targetProvider as 'google' | 'apple');
    await callRequest(
      { stableId: STABLE },
      'replacement-provider-uid',
      { signInProvider: requestProvider },
    );
    const code = emailedCode();
    const codeBeforeMismatch = cloneDoc(docs.get(`auth_recovery_codes/${STABLE}`) ?? {});
    const identityBeforeMismatch = identitySnapshot();
    writeLog.length = 0;

    await expect(callConfirm(
      { stableId: STABLE, code },
      'replacement-provider-uid',
      { signInProvider: confirmProvider },
    )).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'recovery_provider_mismatch',
    });
    expect(docs.get('auth_links/replacement-provider-uid')).toBeUndefined();
    expect(writeLog).toEqual([]);
    expect(identitySnapshot()).toEqual(identityBeforeMismatch);
    expect(docs.get(`auth_recovery_codes/${STABLE}`)).toEqual(codeBeforeMismatch);
  });

  it('успешная перепривязка: auth_links + users + событие + код consumed + алерт без PII', async () => {
    seedLinkedUser();
    await callRequest({ stableId: STABLE }, 'new-google-uid');
    const code = emailedCode();

    const result = await callConfirm({ stableId: STABLE, code }, 'new-google-uid');
    const expectedResult = {
      ok: true,
      stableId: STABLE,
      recoveryEventId: 'auto-1',
      handoffEligibleUntil: NOW + 10 * 60 * 1000,
    };
    expect(result).toEqual(expectedResult);

    // auth_links/{newUid} — форма ensureAuthLinkDoc.
    expect(docs.get('auth_links/new-google-uid')).toMatchObject({
      stable_id: STABLE,
      providerUid: 'new-google-uid',
      provider: 'google',
      email: RECOVERY_EMAIL,
      displayName: RECOVERY_DISPLAY_NAME,
      linkedAt: NOW,
      lastSignInAt: NOW,
      updatedAt: NOW,
    });
    expect(docs.get('auth_links/old-provider-uid')).toBeUndefined();

    // users/{stableId} — форма ensureProviderLinkedAuth (devicePlatform сохранён).
    const user = docs.get(`users/${STABLE}`);
    expect(user?.firebaseAuthUid).toBe('new-google-uid');
    expect(user?.linkedAuth).toMatchObject({
      provider: 'google',
      providerUid: 'new-google-uid',
      email: RECOVERY_EMAIL,
      displayName: RECOVERY_DISPLAY_NAME,
      linkedAt: NOW,
      lastSignInAt: NOW,
      devicePlatform: 'ios',
    });

    // Событие восстановления с previousProviderUids и окном отката 14 дней.
    const events = collectionDocs('auth_recovery_events');
    expect(events).toHaveLength(1);
    expectExactKeys(events[0].data, RECOVERY_EVENT_KEYS);
    expectNoSensitiveValues(events[0].data);
    expect(events[0].data).toMatchObject({
      stableId: STABLE,
      recoveryEventId: 'auto-1',
      newProviderUid: 'new-google-uid',
      previousProviderUids: ['old-provider-uid'],
      requestedByUid: 'new-google-uid',
      at: NOW,
      handoffEligibleUntil: NOW + 10 * 60 * 1000,
      rollbackUntil: NOW + 14 * 24 * 60 * 60 * 1000,
    });

    // Код consumed, не удалён.
    const consumedCodeDoc = docs.get(`auth_recovery_codes/${STABLE}`);
    expectExactKeys(consumedCodeDoc, CONSUMED_RECOVERY_CODE_KEYS);
    expectNoSensitiveValues(consumedCodeDoc);
    expect(consumedCodeDoc).toMatchObject({
      status: 'consumed',
      consumedByUid: 'new-google-uid',
      consumedAt: NOW,
      recoveryEventId: 'auto-1',
      handoffEligibleUntil: NOW + 10 * 60 * 1000,
    });

    // Telegram-алерт: есть маски, нет email.
    const { sendTelegramAlert } = require('./admin_alerts');
    expect(sendTelegramAlert).toHaveBeenCalledTimes(1);
    const alertText = String(sendTelegramAlert.mock.calls[0][1]);
    expect(alertText).toContain('🔐');
    expect(alertText).toContain('gle-uid'); // хвост нового provider uid
    expect(alertText).toContain('Предыдущие uid: 1');
    expectNoSensitiveValues(alertText);
    expect(alertText).not.toContain(STABLE);
    expect(alertText).not.toContain('new-google-uid');
    expect(alertText).not.toContain('old-provider-uid');
    const alertCodeValues = Array.from(alertText.matchAll(/<code>(.*?)<\/code>/g), (match) => match[1]);
    expect(alertCodeValues).toHaveLength(2);
    expect(alertCodeValues[0]).toMatch(/^stab.+-123$/);
    expect(alertCodeValues[1]).toMatch(/^.+gle-uid$/);

    // Повторное использование кода запрещено.
    writeLog.length = 0;
    await expect(callConfirm({ stableId: STABLE, code }, 'new-google-uid'))
      .resolves.toEqual(expectedResult);
    expect(writeLog).toEqual([]);
    expect(collectionDocs('auth_recovery_events')).toHaveLength(1);
    expect(sendTelegramAlert).toHaveBeenCalledTimes(1);

    await expect(callConfirm({ stableId: STABLE, code: wrongCode() }, 'new-google-uid'))
      .rejects.toMatchObject({ code: 'permission-denied', message: 'recovery_code_invalid' });
    await expect(callConfirm({ stableId: STABLE, code }, 'different-google-uid'))
      .rejects.toMatchObject({ code: 'permission-denied', message: 'recovery_requester_mismatch' });
    expect(writeLog).toEqual([]);
  });

  it('rejects a different requester before hash attempts and without writes', async () => {
    seedLinkedUser();
    await callRequest({ stableId: STABLE }, 'request-owner-uid');
    const codeBefore = cloneDoc(docs.get(`auth_recovery_codes/${STABLE}`) ?? {});
    writeLog.length = 0;

    await expect(callConfirm(
      { stableId: STABLE, code: wrongCode() },
      'different-requester-uid',
    )).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'recovery_requester_mismatch',
    });

    expect(writeLog).toEqual([]);
    expect(docs.get(`auth_recovery_codes/${STABLE}`)).toEqual(codeBefore);
  });

  it('same-target baseline succeeds without creating a second forward owner', async () => {
    seedLinkedUser();
    docs.delete('auth_links/old-provider-uid');
    docs.set(`users/${STABLE}`, {
      ...(docs.get(`users/${STABLE}`) ?? {}),
      firebaseAuthUid: 'same-google-uid',
      linkedAuth: {
        ...((docs.get(`users/${STABLE}`)?.linkedAuth as DocData) ?? {}),
        providerUid: 'same-google-uid',
      },
    });
    docs.set('auth_links/same-google-uid', {
      stable_id: STABLE,
      providerUid: 'same-google-uid',
      provider: 'google',
      linkedAt: 111,
    });
    await callRequest({ stableId: STABLE }, 'same-google-uid');

    const result = await callConfirm(
      { stableId: STABLE, code: emailedCode() },
      'same-google-uid',
    );

    expect(result).toEqual({
      ok: true,
      stableId: STABLE,
      recoveryEventId: 'auto-1',
      handoffEligibleUntil: NOW + 10 * 60 * 1000,
    });
    expect(collectionDocs('auth_links')).toEqual([expect.objectContaining({
      id: 'same-google-uid',
    })]);
  });

  it('logs only an allowlisted event when the post-recovery alert fails', async () => {
    seedLinkedUser();
    await callRequest({ stableId: STABLE });
    const { sendTelegramAlert } = require('./admin_alerts');
    sendTelegramAlert.mockRejectedValueOnce(new Error(
      `delivery failed for ${RECOVERY_EMAIL} ${RECOVERY_DISPLAY_NAME} ${STABLE}`,
    ));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(callConfirm(
      { stableId: STABLE, code: emailedCode() },
      'new-google-uid',
    )).resolves.toMatchObject({ ok: true, stableId: STABLE });

    expect(warn).toHaveBeenCalledTimes(1);
    const logPayload = JSON.parse(String(warn.mock.calls[0]?.[0] ?? '{}')) as DocData;
    expect(logPayload).toEqual({ event: 'auth_recovery_alert_failed' });
    expectNoSensitiveValues(logPayload);
    expect(JSON.stringify(logPayload)).not.toContain(STABLE);
    expect(JSON.stringify(logPayload)).not.toContain('new-google-uid');
    expect(JSON.stringify(logPayload)).not.toContain('old-provider-uid');
  });

  it('sanitizes unknown Firestore failures without logging or returning PII', async () => {
    seedLinkedUser();
    await callRequest({ stableId: STABLE });
    const code = emailedCode();
    nextTransactionFailure = new Error(
      `firestore failed for ${RECOVERY_EMAIL} ${RECOVERY_DISPLAY_NAME} ${STABLE}`,
    );
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(callConfirm({ stableId: STABLE, code }, 'new-google-uid'))
      .rejects.toMatchObject({ code: 'internal', message: 'recovery_unavailable' });
    expect(warn).toHaveBeenCalledTimes(1);
    const logPayload = JSON.parse(String(warn.mock.calls[0]?.[0] ?? '{}')) as DocData;
    expect(logPayload).toEqual({ event: 'auth_recovery_failed' });
    expectNoSensitiveValues(logPayload);
    expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({ status: 'active' });
    expect(docs.get('auth_links/new-google-uid')).toBeUndefined();
  });

  it('commits one event and one success after an internal transaction retry', async () => {
    seedLinkedUser();
    await callRequest({ stableId: STABLE }, 'retry-google-uid');
    const code = emailedCode();
    let injected = false;
    transactionReadHook = (path) => {
      if (!injected && path === `users/${STABLE}`) {
        injected = true;
        mutateExternally(`users/${STABLE}`, {
          ...(docs.get(`users/${STABLE}`) ?? {}),
          concurrentTouch: NOW + 1,
        });
      }
    };

    await expect(callConfirm({ stableId: STABLE, code }, 'retry-google-uid'))
      .resolves.toMatchObject({ ok: true, stableId: STABLE });
    expect(collectionDocs('auth_recovery_events')).toHaveLength(1);
    expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({
      status: 'consumed',
      consumedByUid: 'retry-google-uid',
    });
    const { sendTelegramAlert } = require('./admin_alerts');
    expect(sendTelegramAlert).toHaveBeenCalledTimes(1);
  });

  it('перепривязка вытесняет свежий анонимный stable_id нового uid (фиксируется в событии)', async () => {
    seedLinkedUser();
    docs.set('auth_links/new-google-uid', { stable_id: 'anon-stable-999', linkedAt: 5 });
    docs.set('users/anon-stable-999', {
      firebaseAuthUid: 'new-google-uid',
      totalXp: 777,
      streak: 12,
    });
    await callRequest({ stableId: STABLE }, 'new-google-uid');

    await callConfirm({ stableId: STABLE, code: emailedCode() }, 'new-google-uid');

    expect(docs.get('auth_links/new-google-uid')).toMatchObject({
      stable_id: STABLE,
      linkedAt: 5, // существующий linkedAt сохраняется (форма ensureAuthLinkDoc)
    });
    const events = collectionDocs('auth_recovery_events');
    expectExactKeys(events[0]?.data, [...RECOVERY_EVENT_KEYS, 'previousStableIdDisplacement']);
    expectNoSensitiveValues(events[0]?.data);
    expect(events[0].data.previousStableIdDisplacement).toBe('anon-stable-999');
    expect(docs.get('users/anon-stable-999')).toEqual({ totalXp: 777, streak: 12 });
    expect(collectionDocs('users').filter(({ data }) => (
      data.firebaseAuthUid === 'new-google-uid'
    ))).toHaveLength(1);
  });

  it('истёкший код → deadline-exceeded recovery_code_expired', async () => {
    seedLinkedUser();
    await callRequest({ stableId: STABLE });
    const code = emailedCode();
    jest.setSystemTime(NOW + 11 * 60 * 1000);
    const codeBefore = cloneDoc(docs.get(`auth_recovery_codes/${STABLE}`) ?? {});
    const identityBefore = identitySnapshot();
    writeLog.length = 0;
    await expect(callConfirm({ stableId: STABLE, code }, 'new-google-uid'))
      .rejects.toMatchObject({ code: 'deadline-exceeded', message: 'recovery_code_expired' });
    expect(writeLog).toEqual([]);
    expect(identitySnapshot()).toEqual(identityBefore);
    expect(docs.get(`auth_recovery_codes/${STABLE}`)).toEqual(codeBefore);
  });

  it('неверный код инкрементит attempts; после 5 — recovery_code_locked даже для верного', async () => {
    seedLinkedUser();
    await callRequest({ stableId: STABLE });
    const code = emailedCode();
    const bad = wrongCode();
    const identityBefore = identitySnapshot();
    writeLog.length = 0;

    for (let i = 1; i <= 5; i += 1) {
      await expect(callConfirm({ stableId: STABLE, code: bad }, 'new-google-uid'))
        .rejects.toMatchObject({ code: 'permission-denied', message: 'recovery_code_invalid' });
      expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({ attempts: i });
    }

    await expect(callConfirm({ stableId: STABLE, code }, 'new-google-uid'))
      .rejects.toMatchObject({ code: 'resource-exhausted', message: 'recovery_code_locked' });
    // Привязка НЕ произошла.
    expect(docs.get('auth_links/new-google-uid')).toBeUndefined();
    expect(collectionDocs('auth_recovery_events')).toHaveLength(0);
    expect(identitySnapshot()).toEqual(identityBefore);
    expect(new Set(writeLog.map(({ path }) => path))).toEqual(new Set([`auth_recovery_codes/${STABLE}`]));
  });

  // The fake transaction scheduler exercises retry logic only; it is not an
  // emulator or production-contention proof.
  it('[unit-only synthetic concurrency] caps 50 wrong codes at five attempts with zero identity writes', async () => {
    seedLinkedUser();
    await callRequest({ stableId: STABLE }, 'concurrent-google-uid');
    const correct = emailedCode();
    const bad = wrongCode();
    const identityBefore = identitySnapshot();
    writeLog.length = 0;

    const results = await Promise.allSettled(
      Array.from({ length: 50 }, () => callConfirm(
        { stableId: STABLE, code: bad },
        'concurrent-google-uid',
      )),
    );
    const messages = results.map((result) => (
      result.status === 'rejected' ? String(result.reason?.message ?? '') : 'fulfilled'
    ));

    expect(messages.filter((message) => message === 'recovery_code_invalid')).toHaveLength(5);
    expect(messages.filter((message) => message === 'recovery_code_locked')).toHaveLength(45);
    expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({
      status: 'active',
      attempts: 5,
    });
    expect(docs.get('auth_links/concurrent-google-uid')).toBeUndefined();
    expect(docs.get(`users/${STABLE}`)).toMatchObject({ firebaseAuthUid: 'old-provider-uid' });
    expect(collectionDocs('auth_recovery_events')).toHaveLength(0);
    expect(identitySnapshot()).toEqual(identityBefore);
    expect(new Set(writeLog.map(({ path }) => path))).toEqual(new Set([`auth_recovery_codes/${STABLE}`]));

    await expect(callConfirm(
      { stableId: STABLE, code: correct },
      'concurrent-google-uid',
    )).rejects.toMatchObject({
      code: 'resource-exhausted',
      message: 'recovery_code_locked',
    });
  });

  it('[unit-only synthetic concurrency] allows at most one success when a correct code is replayed', async () => {
    seedLinkedUser();
    await callRequest({ stableId: STABLE }, 'replay-google-uid');
    const code = emailedCode();

    const results = await Promise.allSettled(
      Array.from({ length: 50 }, () => callConfirm(
        { stableId: STABLE, code },
        'replay-google-uid',
      )),
    );
    const fulfilled = results.filter((result): result is PromiseFulfilledResult<unknown> => (
      result.status === 'fulfilled'
    ));

    expect(fulfilled).toHaveLength(50);
    expect(new Set(fulfilled.map(({ value }) => JSON.stringify(value)))).toEqual(new Set([
      JSON.stringify({
        ok: true,
        stableId: STABLE,
        recoveryEventId: 'auto-1',
        handoffEligibleUntil: NOW + 10 * 60 * 1000,
      }),
    ]));
    expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({
      status: 'consumed',
      consumedByUid: 'replay-google-uid',
    });
    expect(docs.get('auth_links/replay-google-uid')).toMatchObject({ stable_id: STABLE });
    const replayEvents = collectionDocs('auth_recovery_events');
    expect(replayEvents).toHaveLength(1);
    expectExactKeys(replayEvents[0]?.data, RECOVERY_EVENT_KEYS);
    expectNoSensitiveValues(replayEvents[0]?.data);
    const { sendTelegramAlert } = require('./admin_alerts');
    expect(sendTelegramAlert).toHaveBeenCalledTimes(1);
  });

  it('uid с незавершённым удалением аккаунта не перепривязывается', async () => {
    seedLinkedUser();
    await callRequest({ stableId: STABLE });
    docs.set('account_deletion_auth_markers/new-google-uid', { at: NOW });
    const codeBefore = cloneDoc(docs.get(`auth_recovery_codes/${STABLE}`) ?? {});
    const identityBefore = identitySnapshot();
    writeLog.length = 0;
    await expect(callConfirm({ stableId: STABLE, code: emailedCode() }, 'new-google-uid'))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_delete_pending' });
    expect(docs.get('auth_links/new-google-uid')).toBeUndefined();
    expect(writeLog).toEqual([]);
    expect(identitySnapshot()).toEqual(identityBefore);
    expect(docs.get(`auth_recovery_codes/${STABLE}`)).toEqual(codeBefore);
  });

  it('нет активного кода → recovery_code_missing', async () => {
    seedLinkedUser();
    const before = storeSnapshot();
    await expect(callConfirm({ stableId: STABLE, code: '123456' }, 'new-google-uid'))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'recovery_code_missing' });
    expect(writeLog).toEqual([]);
    expect(storeSnapshot()).toEqual(before);
  });
});

describe('recovery custom-token handoff', () => {
  it('registers issue and complete with App Check and no unrelated secrets', () => {
    const { authIssueRecoveryHandoffToken, authCompleteRecoveryHandoff } = require('./auth_recovery');
    const registrations = registeredCallables.filter(({ handler }) => (
      handler === authIssueRecoveryHandoffToken || handler === authCompleteRecoveryHandoff
    ));
    expect(registrations).toEqual([
      expect.objectContaining({
        handler: authIssueRecoveryHandoffToken,
        options: expect.objectContaining({ enforceAppCheck: false }),
      }),
      expect.objectContaining({
        handler: authCompleteRecoveryHandoff,
        options: expect.objectContaining({ enforceAppCheck: false }),
      }),
    ]);
    expect(registrations.every(({ options }) => !('secrets' in options))).toBe(true);
  });

  it('leases, mints exact claims, durably finalizes, and never persists the token', async () => {
    const recovery = await seedRecoveryEventForHandoff();
    const eventId = String(recovery.recoveryEventId);
    writeLog.length = 0;

    const result = await callIssueHandoff(eventId);

    expect(result).toEqual({
      ok: true,
      recoveryEventId: eventId,
      customToken: `custom-token-handoff-google-uid-${eventId}`,
      stableId: STABLE,
      handoffAcknowledgeUntil: NOW + 65 * 60 * 1000,
    });
    expect(mockAdminGetUser).toHaveBeenCalledWith('handoff-google-uid');
    expect(mockCreateCustomToken).toHaveBeenCalledTimes(1);
    expect(mockCreateCustomToken).toHaveBeenCalledWith('handoff-google-uid', {
      phrasemanRecovery: true,
      phrasemanRecoveryEventId: eventId,
    });
    const event = docs.get(`auth_recovery_events/${eventId}`);
    expect(event).toMatchObject({
      handoffStatus: 'issued',
      handoffMintAttempts: 1,
      handoffSuccessfulIssues: 1,
      handoffIssuedAt: NOW,
      handoffLastRequestIdHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(event?.handoffLastRequestIdHash).not.toContain('request-1');
    expect(JSON.stringify(storeSnapshot())).not.toContain('request-1');
    expect(event?.handoffLeaseId).toBeUndefined();
    expect(event?.handoffLeaseUntil).toBeUndefined();
    expect(event?.handoffLeaseRequestIdHash).toBeUndefined();
    expect(JSON.stringify(storeSnapshot())).not.toContain('custom-token-');
  });

  it.each([undefined, '', 'x'.repeat(161), 'bad/request'])(
    'rejects missing or malformed handoff requestId %p before token mint',
    async (requestId) => {
      const recovery = await seedRecoveryEventForHandoff();
      const { authIssueRecoveryHandoffToken } = require('./auth_recovery');
      await expect(authIssueRecoveryHandoffToken(authRequest('handoff-google-uid', {
        recoveryEventId: String(recovery.recoveryEventId),
        requestId,
      }))).rejects.toMatchObject({
        code: 'invalid-argument',
        message: 'recovery_handoff_request_id_required',
      });
      expect(mockCreateCustomToken).not.toHaveBeenCalled();
    },
  );

  it('allows a bounded same-request retry after response loss with the same identity metadata', async () => {
    const recovery = await seedRecoveryEventForHandoff();
    const eventId = String(recovery.recoveryEventId);
    const first = await callIssueHandoff(eventId, 'handoff-google-uid', 'request-replay');
    const retry = await callIssueHandoff(eventId, 'handoff-google-uid', 'request-replay');

    expect(retry).toMatchObject({
      ok: true,
      recoveryEventId: first.recoveryEventId,
      stableId: first.stableId,
      handoffAcknowledgeUntil: first.handoffAcknowledgeUntil,
    });
    expect(mockCreateCustomToken).toHaveBeenCalledTimes(2);
    expect(docs.get(`auth_recovery_events/${eventId}`)).toMatchObject({
      handoffMintAttempts: 2,
      handoffSuccessfulIssues: 2,
      handoffLastRequestIdHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(JSON.stringify(storeSnapshot())).not.toContain('request-replay');
  });

  it.each([
    ['wrong event owner', async (eventId: string) => callIssueHandoff(eventId, 'other-google-uid'), 'recovery_handoff_identity_mismatch'],
    ['deletion marker', async (eventId: string) => {
      docs.set('account_deletion_auth_markers/handoff-google-uid', { at: NOW });
      return callIssueHandoff(eventId);
    }, 'account_delete_pending'],
    ['disabled Admin Auth user', async (eventId: string) => {
      mockAdminGetUser.mockResolvedValueOnce({
        uid: 'handoff-google-uid', disabled: true, emailVerified: true,
        providerData: [{ providerId: 'google.com' }],
      });
      return callIssueHandoff(eventId);
    }, 'recovery_handoff_identity_mismatch'],
  ])('fails closed for %s before token mint', async (_label, invoke, message) => {
    const recovery = await seedRecoveryEventForHandoff();
    await expect(invoke(String(recovery.recoveryEventId))).rejects.toMatchObject({ message });
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  it('honors the 30-second lease and five-attempt/three-success caps', async () => {
    const recovery = await seedRecoveryEventForHandoff();
    const eventPath = `auth_recovery_events/${String(recovery.recoveryEventId)}`;
    const base = docs.get(eventPath) ?? {};
    docs.set(eventPath, { ...base, handoffLeaseId: 'busy', handoffLeaseUntil: NOW + 30_000 });
    await expect(callIssueHandoff(String(recovery.recoveryEventId))).rejects.toMatchObject({
      code: 'aborted', message: 'recovery_handoff_busy',
    });
    expect(mockCreateCustomToken).not.toHaveBeenCalled();

    docs.set(eventPath, {
      ...base,
      handoffMintAttempts: 5,
      handoffSuccessfulIssues: 2,
    });
    await expect(callIssueHandoff(String(recovery.recoveryEventId))).rejects.toMatchObject({
      code: 'resource-exhausted', message: 'recovery_handoff_limit',
    });
    docs.set(eventPath, {
      ...base,
      handoffMintAttempts: 3,
      handoffSuccessfulIssues: 3,
    });
    await expect(callIssueHandoff(String(recovery.recoveryEventId))).rejects.toMatchObject({
      code: 'resource-exhausted', message: 'recovery_handoff_limit',
    });
  });

  it('clears only its lease on mint failure while consuming one bounded attempt', async () => {
    const recovery = await seedRecoveryEventForHandoff();
    const eventPath = `auth_recovery_events/${String(recovery.recoveryEventId)}`;
    mockCreateCustomToken.mockRejectedValueOnce(new Error('mint failed with secret token material'));

    await expect(callIssueHandoff(String(recovery.recoveryEventId))).rejects.toMatchObject({
      code: 'internal', message: 'recovery_handoff_mint_failed',
    });

    expect(docs.get(eventPath)).toMatchObject({
      handoffStatus: 'eligible',
      handoffMintAttempts: 1,
    });
    expect(docs.get(eventPath)?.handoffLeaseId).toBeUndefined();
    expect(docs.get(eventPath)?.handoffLeaseUntil).toBeUndefined();
  });

  it.each(['mint', 'finalize'] as const)(
    'preserves a prior issued token after a second %s failure so it can still ack',
    async phase => {
      const recovery = await seedRecoveryEventForHandoff();
      const eventId = String(recovery.recoveryEventId);
      const eventPath = `auth_recovery_events/${eventId}`;
      await callIssueHandoff(eventId);
      if (phase === 'mint') {
        mockCreateCustomToken.mockRejectedValueOnce(new Error('second mint failed'));
        await expect(callIssueHandoff(eventId, 'handoff-google-uid', 'request-2')).rejects.toMatchObject({
          message: 'recovery_handoff_mint_failed',
        });
      } else {
        failTransactionAtInvocation = transactionInvocation + 2;
        await expect(callIssueHandoff(eventId, 'handoff-google-uid', 'request-2')).rejects.toMatchObject({
          message: 'recovery_handoff_unavailable',
        });
      }

      expect(docs.get(eventPath)).toMatchObject({
        handoffStatus: 'issued',
        handoffSuccessfulIssues: 1,
      });
      await expect(callCompleteHandoff(eventId)).resolves.toMatchObject({
        ok: true, completed: true,
      });
    },
  );

  it('never returns or persists a minted token when durable finalize fails', async () => {
    const recovery = await seedRecoveryEventForHandoff();
    const eventId = String(recovery.recoveryEventId);
    const eventPath = `auth_recovery_events/${eventId}`;
    failTransactionAtInvocation = transactionInvocation + 2;

    await expect(callIssueHandoff(eventId)).rejects.toMatchObject({
      code: 'internal', message: 'recovery_handoff_unavailable',
    });

    expect(mockCreateCustomToken).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(storeSnapshot())).not.toContain('custom-token-');
    expect(docs.get(eventPath)?.handoffLeaseId).toBeUndefined();
  });

  it('does not finalize or return a token after the 30-second lease expires during mint', async () => {
    const recovery = await seedRecoveryEventForHandoff();
    const eventId = String(recovery.recoveryEventId);
    const eventPath = `auth_recovery_events/${eventId}`;
    mockCreateCustomToken.mockImplementationOnce(async () => {
      jest.setSystemTime(NOW + 31_000);
      return `custom-token-handoff-google-uid-${eventId}`;
    });

    await expect(callIssueHandoff(eventId)).rejects.toMatchObject({
      code: 'internal', message: 'recovery_handoff_unavailable',
    });

    expect(docs.get(eventPath)?.handoffLeaseId).toBeUndefined();
    expect(JSON.stringify(storeSnapshot())).not.toContain('custom-token-');
  });

  it('allows only one concurrent mint lease', async () => {
    const recovery = await seedRecoveryEventForHandoff();
    const eventId = String(recovery.recoveryEventId);
    let releaseMint!: () => void;
    mockCreateCustomToken.mockImplementationOnce(() => new Promise<string>((resolve) => {
      releaseMint = () => resolve(`custom-token-handoff-google-uid-${eventId}`);
    }));

    const first = callIssueHandoff(eventId);
    await Promise.resolve();
    const second = callIssueHandoff(eventId);
    await expect(second).rejects.toMatchObject({ code: 'aborted', message: 'recovery_handoff_busy' });
    releaseMint();
    await expect(first).resolves.toMatchObject({ ok: true, recoveryEventId: eventId });
    expect(mockCreateCustomToken).toHaveBeenCalledTimes(1);
  });

  it('acks only an exact custom-claim session, is idempotent, and blocks later issue', async () => {
    const recovery = await seedRecoveryEventForHandoff();
    const eventId = String(recovery.recoveryEventId);
    await callIssueHandoff(eventId);

    await expect(callCompleteHandoff(eventId)).resolves.toEqual({
      ok: true, recoveryEventId: eventId, completed: true,
    });
    await expect(callCompleteHandoff(eventId)).resolves.toEqual({
      ok: true, recoveryEventId: eventId, completed: true,
    });
    expect(docs.get(`auth_recovery_events/${eventId}`)).toMatchObject({
      handoffStatus: 'completed',
      handoffCompletedAt: NOW,
      handoffCompletedByUid: 'handoff-google-uid',
    });
    await expect(callIssueHandoff(eventId)).rejects.toMatchObject({
      code: 'failed-precondition', message: 'recovery_handoff_completed',
    });
  });

  it('uses a separate 65-minute ack deadline beyond the 10-minute issue eligibility', async () => {
    const recovery = await seedRecoveryEventForHandoff();
    const eventId = String(recovery.recoveryEventId);
    await callIssueHandoff(eventId);
    expect(docs.get(`auth_recovery_events/${eventId}`)).toMatchObject({
      handoffAcknowledgeUntil: NOW + 65 * 60 * 1000,
    });

    jest.setSystemTime(NOW + 11 * 60 * 1000);
    await expect(callCompleteHandoff(eventId)).resolves.toMatchObject({
      ok: true, completed: true,
    });
  });

  it('rejects ack after its separate 65-minute deadline', async () => {
    const recovery = await seedRecoveryEventForHandoff();
    const eventId = String(recovery.recoveryEventId);
    await callIssueHandoff(eventId);
    jest.setSystemTime(NOW + 65 * 60 * 1000 + 1);

    await expect(callCompleteHandoff(eventId)).rejects.toMatchObject({
      code: 'deadline-exceeded', message: 'recovery_handoff_ack_expired',
    });
  });

  it.each([
    ['wrong boolean claim', { phrasemanRecovery: false }],
    ['wrong event claim', { phrasemanRecoveryEventId: 'different-event' }],
  ])('rejects ack with %s and performs no writes', async (_label, claims) => {
    const recovery = await seedRecoveryEventForHandoff();
    const eventId = String(recovery.recoveryEventId);
    await callIssueHandoff(eventId);
    writeLog.length = 0;

    await expect(callCompleteHandoff(eventId, 'handoff-google-uid', claims)).rejects.toMatchObject({
      code: 'permission-denied', message: 'recovery_handoff_claims_required',
    });
    expect(writeLog).toEqual([]);
  });

  it('revalidates live identity and deletion state on ack', async () => {
    const recovery = await seedRecoveryEventForHandoff();
    const eventId = String(recovery.recoveryEventId);
    await callIssueHandoff(eventId);
    docs.set('account_deletion_auth_markers/handoff-google-uid', { at: NOW });

    await expect(callCompleteHandoff(eventId)).rejects.toMatchObject({
      code: 'failed-precondition', message: 'account_delete_pending',
    });
  });
});

async function settleCleanInstall<T>(promise: Promise<T>): Promise<T> {
  void promise.catch(() => undefined);
  for (let index = 0; index < 20; index += 1) {
    await Promise.resolve();
    if (jest.getTimerCount() > 0) await jest.runOnlyPendingTimersAsync();
  }
  return promise;
}

function cleanRecoveryStoreSnapshot(): Array<[string, DocData]> {
  return storeSnapshot().filter(([path]) => path.startsWith('auth_recovery_'));
}

function cleanRequest(clientRequestId = 'clean-request-1', email = RECOVERY_EMAIL) {
  return settleCleanInstall(callCleanRequest({ email, clientRequestId }));
}

async function deliverCleanChallenge(response: unknown): Promise<void> {
  await callCleanWorker(String((response as DocData).challengeId));
}

function cleanPublicShape(value: unknown): DocData {
  const data = value as DocData;
  return {
    ok: data.ok,
    expiresInSec: data.expiresInSec,
    retryAfterSec: data.retryAfterSec,
    challengeOpaque: typeof data.challengeId === 'string'
      && /^[A-Za-z0-9_-]{24,}$/.test(String(data.challengeId)),
    keys: Object.keys(data).sort(),
  };
}

describe('clean-install recovery', () => {
  it('registers both AppCheck callables and the delivery worker with versioned HMAC secrets', () => {
    const recovery = require('./auth_recovery');
    const { RESEND_API_KEY } = require('./resend_secret');
    expect(recovery.authRequestCleanInstallRecoveryCode).toEqual(expect.any(Function));
    expect(recovery.authConfirmCleanInstallRecoveryCode).toEqual(expect.any(Function));
    expect(recovery.AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT).toMatchObject({ name: 'AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT' });
    expect(recovery.AUTH_RECOVERY_CHALLENGE_HMAC_KEY_PREVIOUS).toMatchObject({ name: 'AUTH_RECOVERY_CHALLENGE_HMAC_KEY_PREVIOUS' });
    expect(recovery.CLEAN_RECOVERY_COLLECTIONS).toEqual({
      challenges: 'auth_recovery_challenges',
      deliveryIntents: 'auth_recovery_delivery_intents',
      idempotency: 'auth_recovery_idempotency',
      rateLimits: 'auth_recovery_clean_rate_limits',
    });
    for (const handler of [recovery.authRequestCleanInstallRecoveryCode, recovery.authConfirmCleanInstallRecoveryCode]) {
      expect(registeredCallables.filter((item) => item.handler === handler)).toEqual([
        expect.objectContaining({
          options: expect.objectContaining({
            enforceAppCheck: false,
            secrets: expect.arrayContaining([
              recovery.AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT,
              recovery.AUTH_RECOVERY_CHALLENGE_HMAC_KEY_PREVIOUS,
            ]),
          }),
        }),
      ]);
    }
    expect(registeredDocumentCreates).toEqual([
      expect.objectContaining({
        options: expect.objectContaining({
          document: `${recovery.CLEAN_RECOVERY_COLLECTIONS.deliveryIntents}/{intentId}`,
          retry: true,
          secrets: expect.arrayContaining([
             recovery.AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT,
             recovery.AUTH_RECOVERY_CHALLENGE_HMAC_KEY_PREVIOUS,
             RESEND_API_KEY,
           ]),
        }),
        handler: recovery.authCleanInstallRecoveryDeliveryWorker,
      }),
    ]);
  });

  it('returns the same non-enumerating response shape for eligible, missing, mismatch, and deleted targets', async () => {
    const responses: unknown[] = [];
    const challengeSchemas: string[][] = [];
    const intentSchemas: string[][] = [];
    const captureSchemas = () => {
      const challenge = collectionDocs('auth_recovery_challenges')[0]?.data;
      const intent = collectionDocs('auth_recovery_delivery_intents')[0]?.data;
      expectExactKeys(challenge, CLEAN_RECOVERY_CHALLENGE_REQUEST_KEYS);
      expectExactKeys(intent, CLEAN_RECOVERY_INTENT_REQUEST_KEYS);
      challengeSchemas.push(Object.keys(challenge ?? {}).sort());
      intentSchemas.push(Object.keys(intent ?? {}).sort());
    };
    seedLinkedUser('google');
    responses.push(await cleanRequest('matrix-eligible'));
    captureSchemas();
    docs.clear();
    responses.push(await cleanRequest('matrix-missing', 'missing@example.invalid'));
    captureSchemas();
    docs.clear();
    seedLinkedUser('apple');
    responses.push(await cleanRequest('matrix-mismatch'));
    captureSchemas();
    docs.clear();
    seedLinkedUser('google');
    docs.set(`account_deletion_tombstones/${STABLE}`, { at: NOW });
    responses.push(await cleanRequest('matrix-deleted'));
    captureSchemas();
    docs.clear();
    seedLinkedUser('google');
    mockAdminGetUserByEmail.mockResolvedValueOnce({
      uid: 'old-provider-uid', disabled: true, email: RECOVERY_EMAIL, emailVerified: true,
      providerData: [{ providerId: 'google.com', uid: 'old-provider-uid', email: RECOVERY_EMAIL }],
    });
    responses.push(await cleanRequest('matrix-disabled'));
    captureSchemas();
    docs.clear();
    seedLinkedUser('google');
    docs.delete('auth_links/old-provider-uid');
    responses.push(await cleanRequest('matrix-missing-anchor'));
    captureSchemas();
    docs.clear();
    seedLinkedUser('google');
    docs.set('auth_links/old-provider-uid', { stable_id: 'conflict', providerUid: 'old-provider-uid', provider: 'google' });
    responses.push(await cleanRequest('matrix-conflict'));
    captureSchemas();
    docs.clear();
    seedLinkedUser('google');
    docs.set('account_deletion_auth_markers/old-provider-uid', { at: NOW });
    responses.push(await cleanRequest('matrix-old-marker'));
    captureSchemas();
    docs.clear();
    seedLinkedUser('google');
    docs.set('account_deletion_auth_markers/new-google-uid', { at: NOW });
    responses.push(await cleanRequest('matrix-requester-marker'));
    captureSchemas();

    expect(responses.map(cleanPublicShape)).toEqual(responses.map(() => cleanPublicShape(responses[0])));
    expect(new Set(responses.map((item) => String((item as DocData).challengeId))).size).toBe(responses.length);
    expect(challengeSchemas).toEqual(challengeSchemas.map(() => challengeSchemas[0]));
    expect(intentSchemas).toEqual(intentSchemas.map(() => intentSchemas[0]));
  });

  it('request creates an intent without sending; worker rechecks Admin Auth and sends only to authoritative email', async () => {
    seedLinkedUser('google');
    const response = await cleanRequest();
    const { sendTransactionalEmail } = require('./admin_email');
    expect(mockAdminGetUserByEmail).toHaveBeenCalledWith(RECOVERY_EMAIL);
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
    expect(collectionDocs('auth_recovery_delivery_intents')).toHaveLength(1);
    const challengeId = String((response as DocData).challengeId);
    expectExactKeys(docs.get(`auth_recovery_challenges/${challengeId}`), CLEAN_RECOVERY_CHALLENGE_REQUEST_KEYS);
    expectExactKeys(docs.get(`auth_recovery_delivery_intents/${challengeId}`), CLEAN_RECOVERY_INTENT_REQUEST_KEYS);
    expectNoSensitiveValues(cleanRecoveryStoreSnapshot());

    await deliverCleanChallenge(response);
    await deliverCleanChallenge(response);
    const code = emailedCode();
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);
    expect(sendTransactionalEmail.mock.calls[0][0].to).toBe(RECOVERY_EMAIL);
    const delivered = docs.get(`auth_recovery_challenges/${challengeId}`);
    const recovery = require('./auth_recovery');
    const currentSecret = 'AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT-test-secret-material-at-least-32-bytes';
    const expectedEmailHmac = recovery.hmacCleanRecoveryValue(
      currentSecret, 'v1', 'email', recovery.normalizeCleanRecoveryEmail(RECOVERY_EMAIL),
    );
    const expectedCodeHmac = recovery.hmacCleanRecoveryValue(
      currentSecret, 'v1', 'code', `${challengeId}|${String(delivered?.generation)}|${code}`,
    );
    expect(delivered).toMatchObject({
      keyVersion: 'v1',
      emailHmac: expectedEmailHmac,
      codeHmac: expectedCodeHmac,
      status: 'active',
    });
    expect(delivered).not.toHaveProperty('salt');
    expect(delivered).not.toHaveProperty('codeHash');
    expect(delivered?.codeHmac).not.toBe(recovery.hashRecoveryCode(String(delivered?.emailHmac), code));
    expectNoSensitiveValues(cleanRecoveryStoreSnapshot());
    expect(JSON.stringify(storeSnapshot())).not.toContain(code);
    expect(String((response as DocData).challengeId)).not.toContain('stable');
  });

  it('uses versioned domain-separated HMACs and keeps previous-key overlap', () => {
    const recovery = require('./auth_recovery');
    expect(recovery.hmacCleanRecoveryValue('clean-secret', 'v1', 'email', 'user@example.com'))
      .toBe('6bfc6efd97447b261da5ddd59f05a69c708bc9a85531d6fe21258fd66ece6cc9');
    expect(recovery.hmacCleanRecoveryValue('clean-secret', 'v1', 'code', 'challenge|generation|123456'))
      .toBe('b102b4fa3f0e965158f8abb5a2098546a7e02dbf17cf0ca46f3a9baa6bbef88b');
    expect(recovery.hmacCleanRecoveryValue('clean-secret', 'v1', 'email', 'user@example.com'))
      .not.toBe(recovery.hmacCleanRecoveryValue('clean-secret', 'v1', 'code', 'user@example.com'));
    expect(recovery.resolveCleanRecoveryKey('v0', {
      currentVersion: 'v1', currentSecret: 'current-secret', previousVersion: 'v0', previousSecret: 'previous-secret',
    })).toBe('previous-secret');
    expect(() => recovery.resolveCleanRecoveryKey('unknown', {
      currentVersion: 'v1', currentSecret: 'current-secret', previousVersion: 'v0', previousSecret: 'previous-secret',
    })).toThrow('clean_recovery_key_version_unavailable');
    const previousChallenge = {
      challengeId: 'challenge_previous_key_123456', generation: 'generation-1',
      keyVersion: 'v0', codeHmac: recovery.hmacCleanRecoveryValue(
        'previous-secret', 'v0', 'code', 'challenge_previous_key_123456|generation-1|123456',
      ),
    };
    expect(recovery.verifyCleanRecoveryCode(previousChallenge, '123456', {
      currentVersion: 'v1', currentSecret: 'current-secret', previousVersion: 'v0', previousSecret: 'previous-secret',
    })).toBe(true);
    expect(() => recovery.verifyCleanRecoveryCode({ ...previousChallenge, keyVersion: 'retired' }, '123456', {
      currentVersion: 'v1', currentSecret: 'current-secret', previousVersion: 'v0', previousSecret: 'previous-secret',
    })).toThrow('clean_recovery_key_version_unavailable');
  });

  it('confirms a delivered challenge during the previous-key overlap and rejects a retired version', async () => {
    seedLinkedUser('google');
    const recovery = require('./auth_recovery');
    const requested = await cleanRequest('previous-key-request');
    await deliverCleanChallenge(requested);
    const challengeId = String((requested as DocData).challengeId);
    const challengePath = `auth_recovery_challenges/${challengeId}`;
    const challenge = docs.get(challengePath) ?? {};
    const code = emailedCode();
    docs.set(challengePath, {
      ...challenge,
      keyVersion: 'v0',
      emailHmac: recovery.hmacCleanRecoveryValue(
        'AUTH_RECOVERY_CHALLENGE_HMAC_KEY_PREVIOUS-test-secret-material-at-least-32-bytes',
        'v0', 'email', recovery.normalizeCleanRecoveryEmail(RECOVERY_EMAIL),
      ),
      codeHmac: recovery.hmacCleanRecoveryValue(
        'AUTH_RECOVERY_CHALLENGE_HMAC_KEY_PREVIOUS-test-secret-material-at-least-32-bytes',
        'v0', 'code', `${challengeId}|${String(challenge.generation)}|${code}`,
      ),
    });
    await expect(settleCleanInstall(callCleanConfirm({
      challengeId, code, clientRequestId: 'previous-key-confirm',
    }))).resolves.toMatchObject({ ok: true, stableId: STABLE });

    docs.clear();
    seedLinkedUser('google');
    const retired = await cleanRequest('retired-key-request');
    await deliverCleanChallenge(retired);
    const retiredId = String((retired as DocData).challengeId);
    docs.set(`auth_recovery_challenges/${retiredId}`, {
      ...(docs.get(`auth_recovery_challenges/${retiredId}`) ?? {}),
      keyVersion: 'retired',
    });
    await expect(settleCleanInstall(callCleanConfirm({
      challengeId: retiredId, code: emailedCode(), clientRequestId: 'retired-key-confirm',
    }))).rejects.toMatchObject({ code: 'permission-denied', message: 'clean_recovery_code_invalid' });
  });

  it.each([
    ['disabled target', { disabled: true }],
    ['email drift', { email: 'drifted@example.invalid' }],
    ['provider drift', { providerData: [{ providerId: 'apple.com', uid: 'old-provider-uid', email: RECOVERY_EMAIL }] }],
    ['uid drift', { uid: 'different-provider-uid' }],
  ])('worker discards %s without sending and records only a terminal generic state', async (_label, override) => {
    seedLinkedUser('google');
    const response = await cleanRequest(`worker-drift-${_label}`);
    mockAdminGetUser.mockImplementation(async (uid: string) => Object.assign({
      uid, disabled: false, email: RECOVERY_EMAIL, emailVerified: true,
      providerData: [{ providerId: 'google.com', uid, email: RECOVERY_EMAIL }],
    }, override));
    await deliverCleanChallenge(response);
    const { sendTransactionalEmail } = require('./admin_email');
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
    expect(docs.get(`auth_recovery_challenges/${String((response as DocData).challengeId)}`))
      .toMatchObject({ status: 'discarded' });
    expectNoSensitiveValues(cleanRecoveryStoreSnapshot());
  });

  it.each([
    ['google', 'google.com'],
    ['apple', 'apple.com'],
  ])('accepts realistic %s provider subject IDs and omitted providerData email', async (provider, providerIdValue) => {
    seedLinkedUser(provider as 'google' | 'apple');
    mockAdminGetUser.mockImplementation(async (uid: string) => ({
      uid, disabled: false, email: RECOVERY_EMAIL, emailVerified: true,
      providerData: [{ providerId: providerIdValue, uid: `upstream-subject-for-${uid}` }],
    }));
    mockAdminGetUserByEmail.mockResolvedValue({
      uid: 'old-provider-uid', disabled: false, email: RECOVERY_EMAIL, emailVerified: true,
      providerData: [{
        providerId: providerIdValue,
        uid: 'upstream-old-subject',
        email: undefined as unknown as string,
      }],
    });
    const session = validSessionFor(provider as 'google' | 'apple');
    const requested = await settleCleanInstall(callCleanRequest(
      { email: RECOVERY_EMAIL, clientRequestId: `realistic-${provider}` },
      'new-google-uid',
      session,
    ));
    await deliverCleanChallenge(requested);
    await expect(settleCleanInstall(callCleanConfirm({
      challengeId: (requested as DocData).challengeId,
      code: emailedCode(),
      clientRequestId: `realistic-confirm-${provider}`,
    }, 'new-google-uid', session))).resolves.toMatchObject({ ok: true, stableId: STABLE });
  });

  it('rejects an explicit providerData email mismatch without sending', async () => {
    seedLinkedUser('google');
    const requested = await cleanRequest('provider-email-drift');
    mockAdminGetUser.mockImplementation(async () => ({
      uid: 'old-provider-uid', disabled: false, email: RECOVERY_EMAIL, emailVerified: true,
      providerData: [{ providerId: 'google.com', uid: 'upstream-subject', email: 'wrong@example.invalid' }],
    } as never));
    await deliverCleanChallenge(requested);
    const { sendTransactionalEmail } = require('./admin_email');
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it('reclaims an expired delivery lease and ignores the stale worker terminal result', async () => {
    seedLinkedUser('google');
    const requested = await cleanRequest('delivery-reclaim');
    const challengeId = String((requested as DocData).challengeId);
    const { sendTransactionalEmail } = require('./admin_email');
    let finishStale!: (value: { ok: false; error: string }) => void;
    const staleSend = new Promise<{ ok: false; error: string }>((resolve) => { finishStale = resolve; });
    sendTransactionalEmail
      .mockImplementationOnce(() => staleSend)
      .mockResolvedValueOnce({ ok: true, id: 'em_reclaimed' });
    const staleWorker = callCleanWorker(challengeId);
    for (let index = 0; index < 20 && sendTransactionalEmail.mock.calls.length < 1; index += 1) {
      await Promise.resolve();
    }
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);
    await expect(callCleanWorker(challengeId)).rejects.toThrow('clean_recovery_delivery_busy');
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);
    jest.setSystemTime(NOW + 3 * 60 * 1000);
    await callCleanWorker(challengeId);
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(2);
    expect(sendTransactionalEmail.mock.calls[0][0].idempotencyKey)
      .toBe(sendTransactionalEmail.mock.calls[1][0].idempotencyKey);
    expect(sendTransactionalEmail.mock.calls[0][0].idempotencyKey)
      .toBe(`recovery/${challengeId}/${String(docs.get(`auth_recovery_challenges/${challengeId}`)?.generation)}`);
    expect(docs.get(`auth_recovery_delivery_intents/${challengeId}`)).toMatchObject({ status: 'sent' });
    finishStale({ ok: false, error: 'resend_transport_failed' });
    await expect(staleWorker).rejects.toThrow('clean_recovery_delivery_retry');
    expect(docs.get(`auth_recovery_delivery_intents/${challengeId}`)).toMatchObject({ status: 'sent' });
    expect(docs.get(`auth_recovery_challenges/${challengeId}`)).toMatchObject({ status: 'active' });
  });

  it('discards an expired challenge in the worker without sending', async () => {
    seedLinkedUser('google');
    const requested = await cleanRequest('expired-before-worker');
    const challengeId = String((requested as DocData).challengeId);
    jest.setSystemTime(NOW + 11 * 60 * 1000);
    await callCleanWorker(challengeId);
    const { sendTransactionalEmail } = require('./admin_email');
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
    expect(docs.get(`auth_recovery_challenges/${challengeId}`)).toMatchObject({ status: 'discarded' });
  });

  it('does not let a stale trigger overwrite an expired challenge with an active foreign lease', async () => {
    seedLinkedUser('google');
    const requested = await cleanRequest('expired-active-lease');
    const challengeId = String((requested as DocData).challengeId);
    const intentPath = `auth_recovery_delivery_intents/${challengeId}`;
    const challengePath = `auth_recovery_challenges/${challengeId}`;
    docs.set(intentPath, {
      ...(docs.get(intentPath) ?? {}),
      status: 'processing',
      leaseId: 'foreign-lease',
      leaseUntilMs: NOW + 60_000,
    });
    docs.set(challengePath, { ...(docs.get(challengePath) ?? {}), expiresAtMs: NOW - 1 });
    const before = storeSnapshot();
    await expect(callCleanWorker(challengeId)).rejects.toThrow('clean_recovery_delivery_busy');
    expect(storeSnapshot()).toEqual(before);
    const { sendTransactionalEmail } = require('./admin_email');
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it('rechecks challenge expiry after validation and before arming or sending', async () => {
    seedLinkedUser('google');
    const requested = await cleanRequest('expires-during-validation');
    const challengeId = String((requested as DocData).challengeId);
    const challengePath = `auth_recovery_challenges/${challengeId}`;
    let challengeReads = 0;
    transactionReadHook = (path) => {
      if (path === challengePath) {
        challengeReads += 1;
        if (challengeReads === 2) jest.setSystemTime(NOW + 11 * 60 * 1000);
      }
    };
    await callCleanWorker(challengeId);
    const { sendTransactionalEmail } = require('./admin_email');
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
    expect(docs.get(challengePath)).toMatchObject({ status: 'discarded' });
  });

  it('claims one delivery intent under concurrent duplicate worker triggers', async () => {
    seedLinkedUser('google');
    const response = await cleanRequest('worker-concurrent');
    const challengeId = String((response as DocData).challengeId);
    let releaseFirst!: () => void;
    let markEntered!: () => void;
    const entered = new Promise<void>((resolve) => { markEntered = resolve; });
    const release = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let blocked = false;
    transactionReadHook = async (path) => {
      if (!blocked && path === `auth_recovery_delivery_intents/${challengeId}`) {
        blocked = true;
        markEntered();
        await release;
      }
    };
    const first = callCleanWorker(challengeId);
    await entered;
    const second = callCleanWorker(challengeId);
    await second;
    releaseFirst();
    await first;
    const { sendTransactionalEmail } = require('./admin_email');
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);
    expect(docs.get(`auth_recovery_delivery_intents/${challengeId}`))
      .toMatchObject({ status: 'sent' });
  });

  it('does not send decoy mail and keeps clientRequestId idempotent', async () => {
    mockAdminGetUserByEmail.mockRejectedValue(Object.assign(new Error('not found'), { code: 'auth/user-not-found' }));
    const first = await cleanRequest('same-request', 'nobody@example.invalid');
    const second = await cleanRequest('same-request', 'nobody@example.invalid');
    const { sendTransactionalEmail } = require('./admin_email');
    expect(second).toEqual(first);
    const challengeId = String((first as DocData).challengeId);
    expectExactKeys(docs.get(`auth_recovery_challenges/${challengeId}`), CLEAN_RECOVERY_CHALLENGE_REQUEST_KEYS);
    expectExactKeys(docs.get(`auth_recovery_delivery_intents/${challengeId}`), CLEAN_RECOVERY_INTENT_REQUEST_KEYS);
    await deliverCleanChallenge(first);
    await deliverCleanChallenge(first);
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
    expect(collectionDocs('auth_recovery_clean_rate_limits').map((item) => item.data.count)).toEqual([1, 1, 1]);
  });

  it('normalizes email consistently for fan-in/fan-out buckets and does not increment on replay', async () => {
    const recovery = require('./auth_recovery');
    const secret = 'AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT-test-secret-material-at-least-32-bytes';
    expect(recovery.normalizeCleanRecoveryEmail('  Recovery.Owner@Example.Invalid  ')).toBe(RECOVERY_EMAIL);
    expect(recovery.normalizeCleanRecoveryEmail('ＲＥＣＯＶＥＲＹ．ＯＷＮＥＲ＠ＥＸＡＭＰＬＥ．ＩＮＶＡＬＩＤ'))
      .toBe(RECOVERY_EMAIL);
    const canonical = recovery.cleanRecoveryRateDocIds('uid-a', RECOVERY_EMAIL, secret, 'v1');
    const caseVariant = recovery.cleanRecoveryRateDocIds('uid-a', 'RECOVERY.OWNER@EXAMPLE.INVALID', secret, 'v1');
    const unicodeVariant = recovery.cleanRecoveryRateDocIds(
      'uid-a', 'ＲＥＣＯＶＥＲＹ．ＯＷＮＥＲ＠ＥＸＡＭＰＬＥ．ＩＮＶＡＬＩＤ', secret, 'v1',
    );
    expect(caseVariant).toEqual(canonical);
    expect(unicodeVariant).toEqual(canonical);
    expect(recovery.cleanRecoveryRateDocIds('uid-b', RECOVERY_EMAIL, secret, 'v1').email).toBe(canonical.email);
    expect(recovery.cleanRecoveryRateDocIds('uid-b', RECOVERY_EMAIL, secret, 'v1').requester).not.toBe(canonical.requester);
    expect(recovery.cleanRecoveryRateDocIds('uid-a', 'other@example.invalid', secret, 'v1').requester)
      .toBe(canonical.requester);
    mockAdminGetUserByEmail.mockRejectedValue(Object.assign(new Error('not found'), { code: 'auth/user-not-found' }));
    await cleanRequest('normalized-replay', 'RECOVERY.OWNER@EXAMPLE.INVALID');
    const before = collectionDocs('auth_recovery_clean_rate_limits').map(({ id, data }) => [id, data.count]);
    await cleanRequest('normalized-replay', 'ＲＥＣＯＶＥＲＹ．ＯＷＮＥＲ＠ＥＸＡＭＰＬＥ．ＩＮＶＡＬＩＤ');
    expect(collectionDocs('auth_recovery_clean_rate_limits').map(({ id, data }) => [id, data.count])).toEqual(before);
  });

  it.each(['requester', 'email', 'pair'])('enforces the %s transactional rate bucket', async (bucket) => {
    seedLinkedUser('google');
    const recovery = require('./auth_recovery');
    const ids = recovery.cleanRecoveryRateDocIds(
      'new-google-uid', RECOVERY_EMAIL,
      'AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT-test-secret-material-at-least-32-bytes', 'v1',
    );
    docs.set(`auth_recovery_clean_rate_limits/${ids[bucket]}`, {
      count: 3, windowStartMs: NOW, updatedAtMs: NOW,
    });
    const beforeChallenges = collectionDocs('auth_recovery_challenges').length;
    await expect(cleanRequest(`rate-${bucket}`)).rejects.toMatchObject({
      code: 'resource-exhausted', message: 'clean_recovery_rate_limited',
    });
    expect(collectionDocs('auth_recovery_challenges')).toHaveLength(beforeChallenges);
  });

  it('rejects reusing one clientRequestId with a different requester/provider/email fingerprint', async () => {
    seedLinkedUser('google');
    await cleanRequest('bound-request');
    await expect(cleanRequest('bound-request', 'different@example.invalid')).rejects.toMatchObject({
      code: 'permission-denied', message: 'clean_recovery_request_conflict',
    });
  });

  it('isolates request idempotency by requester and renews an expired request', async () => {
    seedLinkedUser('google');
    const first = await cleanRequest('shared-request-id');
    const second = await settleCleanInstall(callCleanRequest(
      { email: RECOVERY_EMAIL, clientRequestId: 'shared-request-id' }, 'different-google-uid',
    ));
    expect((second as DocData).challengeId).not.toBe((first as DocData).challengeId);
    jest.setSystemTime(NOW + 11 * 60 * 1000);
    const renewed = await cleanRequest('shared-request-id');
    expect((renewed as DocData).challengeId).not.toBe((first as DocData).challengeId);
  });

  it('reports only the remaining TTL on a request-idempotency replay', async () => {
    seedLinkedUser('google');
    const first = await cleanRequest('remaining-ttl');
    jest.setSystemTime(NOW + 9 * 60 * 1000 + 50 * 1000);
    const replay = await cleanRequest('remaining-ttl');
    expect((replay as DocData).challengeId).toBe((first as DocData).challengeId);
    expect((replay as DocData).expiresInSec).toBe(10);
  });

  it('scopes confirm idempotency by challenge and binds the submitted proof', async () => {
    seedLinkedUser('google');
    const first = await cleanRequest('confirm-idem-request-1');
    await deliverCleanChallenge(first);
    const firstCode = emailedCode();
    const second = await cleanRequest('confirm-idem-request-2');
    await deliverCleanChallenge(second);
    const secondCode = emailedCode();
    await expect(settleCleanInstall(callCleanConfirm({
      challengeId: (first as DocData).challengeId, code: firstCode, clientRequestId: 'shared-confirm-id',
    }))).resolves.toMatchObject({ ok: true });
    const eventsBefore = collectionDocs('auth_recovery_events').length;
    await expect(settleCleanInstall(callCleanConfirm({
      challengeId: (second as DocData).challengeId, code: secondCode, clientRequestId: 'shared-confirm-id',
    }))).rejects.not.toMatchObject({ message: 'clean_recovery_request_conflict' });
    expect(collectionDocs('auth_recovery_events')).toHaveLength(eventsBefore);
    await expect(settleCleanInstall(callCleanConfirm({
      challengeId: (first as DocData).challengeId, code: wrongCode(), clientRequestId: 'shared-confirm-id',
    }))).rejects.toMatchObject({ code: 'permission-denied', message: 'clean_recovery_request_conflict' });
  });

  it('revalidates provider binding before returning a successful confirm replay', async () => {
    seedLinkedUser('google');
    const requested = await cleanRequest('provider-replay-request');
    await deliverCleanChallenge(requested);
    const data = {
      challengeId: (requested as DocData).challengeId,
      code: emailedCode(),
      clientRequestId: 'provider-replay-confirm',
    };
    await expect(settleCleanInstall(callCleanConfirm(data))).resolves.toMatchObject({ ok: true });
    mockAdminGetUser.mockImplementation(async (uid: string) => ({
      uid, disabled: false, email: RECOVERY_EMAIL, emailVerified: true,
      providerData: [{ providerId: 'apple.com', uid: 'apple-upstream-subject' }],
    }));
    await expect(settleCleanInstall(callCleanConfirm(
      data, 'new-google-uid', validSessionFor('apple'),
    ))).rejects.toMatchObject({ code: 'permission-denied', message: 'clean_recovery_unavailable' });
  });

  it('keeps transport failure outside the public response and retries with the same delivery key', async () => {
    seedLinkedUser('google');
    const response = await cleanRequest('send-failure');
    const { sendTransactionalEmail } = require('./admin_email');
    sendTransactionalEmail.mockResolvedValueOnce({ ok: false, error: 'resend_transport_failed' });
    await expect(deliverCleanChallenge(response)).rejects.toThrow('clean_recovery_delivery_retry');
    expect(response).toEqual(expect.objectContaining({ ok: true, challengeId: expect.any(String) }));
    const challengeId = String((response as DocData).challengeId);
    expect(docs.get(`auth_recovery_challenges/${challengeId}`)).toMatchObject({ status: 'active' });
    const firstKey = sendTransactionalEmail.mock.calls[0][0].idempotencyKey;
    jest.setSystemTime(Date.now() + 3 * 60 * 1000);
    await deliverCleanChallenge(response);
    expect(sendTransactionalEmail.mock.calls[1][0].idempotencyKey).toBe(firstKey);
    expect(docs.get(`auth_recovery_delivery_intents/${challengeId}`)).toMatchObject({ status: 'sent' });
  });

  it.each(['resend_transport_failed', 'resend_http_retryable'])(
    'retries %s after the lease with the identical provider idempotency key',
    async (error) => {
      seedLinkedUser('google');
      const response = await cleanRequest(`retryable-${error}`);
      const { sendTransactionalEmail } = require('./admin_email');
      sendTransactionalEmail.mockResolvedValueOnce({ ok: false, error });
      await expect(deliverCleanChallenge(response)).rejects.toThrow('clean_recovery_delivery_retry');
      const firstKey = sendTransactionalEmail.mock.calls[0][0].idempotencyKey;
      jest.setSystemTime(Date.now() + 3 * 60 * 1000);
      await deliverCleanChallenge(response);
      expect(sendTransactionalEmail.mock.calls[1][0].idempotencyKey).toBe(firstKey);
      expect(docs.get(`auth_recovery_delivery_intents/${String((response as DocData).challengeId)}`))
        .toMatchObject({ status: 'sent' });
    },
  );

  it('binds confirm to AppCheck, requester UID, and provider without target-specific errors', async () => {
    seedLinkedUser('google');
    const requested = await cleanRequest();
    await deliverCleanChallenge(requested);
    const data = { challengeId: (requested as DocData).challengeId, code: emailedCode(), clientRequestId: 'clean-confirm-1' };
    const request = authRequest('new-google-uid', data);
    delete (request as { app?: unknown }).app;
    const recovery = require('./auth_recovery');
    await expect(recovery.authConfirmCleanInstallRecoveryCode(request)).rejects.toMatchObject({
      code: 'failed-precondition', message: 'app_check_required',
    });
    await expect(settleCleanInstall(callCleanConfirm(data, 'different-google-uid'))).rejects.toMatchObject({
      code: 'permission-denied', message: 'clean_recovery_unavailable',
    });
    await expect(settleCleanInstall(callCleanConfirm(data, 'new-google-uid', validSessionFor('apple')))).rejects.toMatchObject({
      code: 'permission-denied', message: 'clean_recovery_unavailable',
    });
  });

  it.each([
    ['disabled', { disabled: true, emailVerified: true, providerData: [{ providerId: 'google.com' }] }],
    ['unverified', { disabled: false, emailVerified: false, providerData: [{ providerId: 'google.com' }] }],
    ['provider mismatch', { disabled: false, emailVerified: true, providerData: [{ providerId: 'apple.com' }] }],
    ['uid mismatch', { uid: 'other-uid', disabled: false, emailVerified: true, providerData: [{ providerId: 'google.com' }] }],
  ])('confirm fails closed when requester Admin Auth is %s', async (_label, override) => {
    seedLinkedUser('google');
    const requested = await cleanRequest(`admin-recheck-${_label}`);
    await deliverCleanChallenge(requested);
    const code = emailedCode();
    mockAdminGetUser.mockImplementationOnce(async (uid: string) => Object.assign({
      uid,
      email: RECOVERY_EMAIL,
      disabled: false,
      emailVerified: true,
      providerData: [{ providerId: 'google.com', uid, email: RECOVERY_EMAIL }],
    }, override));
    writeLog.length = 0;
    await expect(settleCleanInstall(callCleanConfirm({
      challengeId: (requested as DocData).challengeId,
      code,
      clientRequestId: `confirm-${_label}`,
    }))).rejects.toMatchObject({ code: 'permission-denied', message: 'clean_recovery_unavailable' });
    expect(writeLog.filter((write) => /^(users|auth_links|leaderboard|auth_recovery_events)\//.test(write.path))).toEqual([]);
  });

  it('collapses wrong, unknown, expired, and locked proofs to generic public classes', async () => {
    seedLinkedUser('google');
    const requested = await cleanRequest();
    await deliverCleanChallenge(requested);
    const challengeId = String((requested as DocData).challengeId);
    const base = { challengeId, clientRequestId: 'clean-confirm-wrong' };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(settleCleanInstall(callCleanConfirm({ ...base, code: wrongCode() }))).rejects.toMatchObject({
        code: 'permission-denied', message: 'clean_recovery_code_invalid',
      });
    }
    await expect(settleCleanInstall(callCleanConfirm({ ...base, code: emailedCode() }))).rejects.toMatchObject({
      code: 'resource-exhausted', message: 'clean_recovery_code_unavailable',
    });
    await expect(settleCleanInstall(callCleanConfirm({ ...base, challengeId: 'unknown_challenge_0123456789', code: '123456' })))
      .rejects.toMatchObject({ code: 'permission-denied', message: 'clean_recovery_code_invalid' });
    const second = await cleanRequest('clean-expired');
    await deliverCleanChallenge(second);
    jest.setSystemTime(NOW + 11 * 60 * 1000);
    await expect(settleCleanInstall(callCleanConfirm({
      challengeId: (second as DocData).challengeId, code: emailedCode(), clientRequestId: 'clean-confirm-expired',
    }))).rejects.toMatchObject({ code: 'permission-denied', message: 'clean_recovery_code_invalid' });
  });

  it('revalidates deletion fences before any relink mutation', async () => {
    seedLinkedUser('google');
    const requested = await cleanRequest();
    await deliverCleanChallenge(requested);
    const before = identitySnapshot();
    docs.set(`account_deletion_auth_markers/new-google-uid`, { at: NOW });
    await expect(settleCleanInstall(callCleanConfirm({
      challengeId: (requested as DocData).challengeId, code: emailedCode(), clientRequestId: 'clean-confirm-fenced',
    }))).rejects.toMatchObject({ code: 'permission-denied', message: 'clean_recovery_unavailable' });
    expect(identitySnapshot()).toEqual(before);
  });

  it('requires the original target anchor to remain exact at clean confirm time', async () => {
    seedLinkedUser('google');
    const requested = await cleanRequest('anchor-delete');
    await deliverCleanChallenge(requested);
    const before = identitySnapshot();
    docs.delete('auth_links/old-provider-uid');
    writeLog.length = 0;
    await expect(settleCleanInstall(callCleanConfirm({
      challengeId: (requested as DocData).challengeId,
      code: emailedCode(),
      clientRequestId: 'anchor-delete-confirm',
    }))).rejects.toMatchObject({ code: 'permission-denied', message: 'clean_recovery_unavailable' });
    expect(collectionDocs('auth_recovery_events')).toHaveLength(0);
    expect(writeLog.filter(({ path }) => /^(users|auth_links|leaderboard|auth_recovery_events)\//.test(path))).toEqual([]);
    expect(identitySnapshot()).toEqual(before.filter(([path]) => path !== 'auth_links/old-provider-uid'));
  });

  it('atomically relinks once and replays the same event for concurrent correct confirms', async () => {
    seedLinkedUser('google');
    docs.set(`leaderboard/${STABLE}`, { firebaseAuthUid: 'old-provider-uid', score: 99 });
    const requested = await cleanRequest();
    await deliverCleanChallenge(requested);
    const data = { challengeId: (requested as DocData).challengeId, code: emailedCode(), clientRequestId: 'clean-confirm-success' };
    const challengePath = `auth_recovery_challenges/${String((requested as DocData).challengeId)}`;
    let releaseFirst!: () => void;
    let markEntered!: () => void;
    const entered = new Promise<void>((resolve) => { markEntered = resolve; });
    const release = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let blocked = false;
    transactionReadHook = async (path) => {
      if (!blocked && path === challengePath) {
        blocked = true;
        markEntered();
        await release;
      }
    };
    const firstPromise = callCleanConfirm(data);
    await entered;
    const second = await settleCleanInstall(callCleanConfirm(data));
    releaseFirst();
    const first = await settleCleanInstall(firstPromise);
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      ok: true,
      recoveryEventId: expect.any(String),
      handoffEligibleUntil: expect.any(Number),
    });
    expect(Number((first as DocData).handoffEligibleUntil)).toBeGreaterThanOrEqual(NOW + 10 * 60 * 1000);
    expect(docs.get(`users/${STABLE}`)).toMatchObject({ firebaseAuthUid: 'new-google-uid' });
    expect(docs.get('auth_links/new-google-uid')).toMatchObject({ stable_id: STABLE });
    expect(docs.get('auth_links/old-provider-uid')).toBeUndefined();
    expect(docs.get(`leaderboard/${STABLE}`)).toMatchObject({ firebaseAuthUid: 'new-google-uid', score: 99 });
    expect(collectionDocs('auth_recovery_events')).toHaveLength(1);
    const consumeWrites = writeLog.filter(({ path, data: writeData }) => (
      path === challengePath && writeData.status === 'consumed'
    ));
    expect(consumeWrites).toHaveLength(1);
    expect(consumeWrites[0]?.data.recoveryEventId).toBe((first as DocData).recoveryEventId);
  });

  it('enforces a minimum equalized response envelope through injected clock and sleep', async () => {
    const recovery = require('./auth_recovery');
    let now = 1_000;
    const sleep = jest.fn(async (ms: number) => { now += ms; });
    await recovery.waitForCleanRecoveryEnvelope(1_000, {
      now: () => now, sleep, jitterMs: () => 37, minimumMs: 400,
    });
    expect(sleep).toHaveBeenCalledWith(437);
  });

  it('applies the response envelope in the actual callable finally path for eligible, decoy, auth, and db outcomes', async () => {
    const outcomes: Array<{ kind: string; elapsed: number }> = [];
    const observe = async (promise: Promise<unknown>) => {
      const started = Date.now();
      try {
        await settleCleanInstall(promise);
        outcomes.push({ kind: 'resolved', elapsed: Date.now() - started });
      } catch {
        outcomes.push({ kind: 'rejected', elapsed: Date.now() - started });
      }
    };

    seedLinkedUser('google');
    await observe(callCleanRequest({ email: RECOVERY_EMAIL, clientRequestId: 'timing-eligible' }));
    docs.clear();
    jest.setSystemTime(NOW);
    mockAdminGetUserByEmail.mockRejectedValueOnce(Object.assign(new Error('not found'), { code: 'auth/user-not-found' }));
    await observe(callCleanRequest({ email: 'missing@example.invalid', clientRequestId: 'timing-decoy' }));
    docs.clear();
    jest.setSystemTime(NOW);
    await observe(callCleanRequest(
      { email: RECOVERY_EMAIL, clientRequestId: 'timing-auth' },
      'new-google-uid',
      { signInProvider: 'google.com', emailVerified: false },
    ));
    docs.clear();
    jest.setSystemTime(NOW);
    seedLinkedUser('google');
    nextTransactionFailure = new Error('injected db failure');
    await observe(callCleanRequest({ email: RECOVERY_EMAIL, clientRequestId: 'timing-db' }));

    expect(outcomes.map(({ kind }) => kind)).toEqual(['resolved', 'resolved', 'rejected', 'rejected']);
    expect(outcomes.every(({ elapsed }) => elapsed >= 400)).toBe(true);
  });
});
