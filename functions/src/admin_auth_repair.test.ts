export {};

type DocData = Record<string, unknown>;

type FakeRef = {
  id: string;
  path: string;
  get: () => Promise<FakeSnap>;
  set: (data: DocData, opts?: { merge?: boolean }) => Promise<void>;
  delete: () => Promise<void>;
};

type FakeSnap = {
  id: string;
  exists: boolean;
  data: () => DocData | undefined;
};

const docs = new Map<string, DocData>();
let autoId = 0;

function deepMerge(target: DocData, source: DocData): DocData {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
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
      docs.set(path, opts?.merge ? deepMerge(docs.get(path) ?? {}, data) : { ...data });
    },
    delete: async () => {
      docs.delete(path);
    },
  };
}

function snapFor(path: string): FakeSnap {
  const data = docs.get(path);
  return {
    id: path.split('/').pop() || path,
    exists: data !== undefined,
    data: () => data,
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
    .map(([path, data]) => [path, JSON.parse(JSON.stringify(data)) as DocData]);
}

function fakeDb() {
  return {
    collection: (name: string) => ({
      doc: (id?: string) => refFor(`${name}/${id || `auto-${++autoId}`}`),
    }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<FakeSnap>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
      update: (ref: FakeRef, data: DocData) => void;
      create: (ref: FakeRef, data: DocData) => void;
      delete: (ref: FakeRef) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const result = await fn({
        get: (ref: FakeRef) => ref.get(),
        set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
          writes.push(() => {
            docs.set(ref.path, opts?.merge ? deepMerge(docs.get(ref.path) ?? {}, data) : { ...data });
          });
        },
        update: (ref: FakeRef, data: DocData) => {
          writes.push(() => {
            if (!docs.has(ref.path)) throw new Error('update on missing doc');
            docs.set(ref.path, { ...(docs.get(ref.path) ?? {}), ...data });
          });
        },
        create: (ref: FakeRef, data: DocData) => {
          writes.push(() => {
            if (docs.has(ref.path)) throw new Error('already exists');
            docs.set(ref.path, { ...data });
          });
        },
        delete: (ref: FakeRef) => {
          writes.push(() => {
            docs.delete(ref.path);
          });
        },
      });
      writes.forEach((write) => write());
      return result;
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

const mockGetUserByEmail = jest.fn(async (email: string) => ({
  uid: 'resolved-provider-uid',
  email,
  displayName: 'Resolved User',
  providerData: [{ providerId: 'google.com' }],
}));
const mockGetUser = jest.fn(async (uid: string) => ({
  uid,
  email: 'direct-provider@example.com',
  displayName: 'Direct Provider',
  providerData: [
    { providerId: 'password' },
    { providerId: 'google.com' },
  ],
}));

type CallableRegistration = {
  options: Record<string, unknown>;
  handler: (...args: any[]) => unknown;
};
const registeredCallables: CallableRegistration[] = [];

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

jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => fakeDb());
  (firestore as unknown as { FieldValue: Record<string, unknown> }).FieldValue = {
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
  };
  return { firestore, auth: () => ({ getUserByEmail: mockGetUserByEmail, getUser: mockGetUser }) };
});

const NOW = new Date('2026-07-22T12:00:00.000Z').getTime();
const STABLE = 'stable-user-1';
const baseInput = { uid: STABLE, reason: 'user lost access after reinstall', requestId: 'req-1', idempotencyKey: 'key-1' };

function adminRequest(data: DocData, role: string | null = 'owner') {
  return {
    app: { appId: 'test-app-id' },
    auth: role === null
      ? null
      : { uid: 'admin-uid-1', token: { admin: true, adminRole: role, email: 'owner@phraseman.app' } },
    data,
  };
}

async function callRepair(data: DocData, role: string | null = 'owner') {
  const { adminRepairAuthLink } = require('./admin_auth_repair');
  return adminRepairAuthLink(adminRequest(data, role));
}

async function callRelink(data: DocData, role: string | null = 'owner') {
  const { adminRelinkProvider } = require('./admin_auth_repair');
  return adminRelinkProvider(adminRequest(data, role));
}

function seedLinkedUser() {
  docs.set(`users/${STABLE}`, {
    firebaseAuthUid: 'provider-uid-1',
    linkedAuth: {
      provider: 'google',
      providerUid: 'provider-uid-1',
      email: 'user@gmail.com',
      displayName: 'User',
      devicePlatform: 'android',
      linkedAt: 111,
    },
  });
}

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers().setSystemTime(NOW);
  docs.clear();
  autoId = 0;
  mockGetUserByEmail.mockClear();
  mockGetUser.mockClear();
  registeredCallables.length = 0;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('adminRepairAuthLink — доступ', () => {
  it('enforces App Check in registration and at runtime for both mutating callables', async () => {
    const { adminRepairAuthLink, adminRelinkProvider } = require('./admin_auth_repair');
    const expectedOptions = { region: 'us-central1', enforceAppCheck: true };
    expect(registeredCallables.filter(({ handler }) => handler === adminRepairAuthLink))
      .toEqual([{ options: expectedOptions, handler: adminRepairAuthLink }]);
    expect(registeredCallables.filter(({ handler }) => handler === adminRelinkProvider))
      .toEqual([{ options: expectedOptions, handler: adminRelinkProvider }]);

    seedLinkedUser();
    const before = storeSnapshot();
    const repairRequest = adminRequest(baseInput);
    delete (repairRequest as { app?: unknown }).app;
    const relinkRequest = adminRequest({ ...baseInput, providerUid: 'manual-uid-9' });
    delete (relinkRequest as { app?: unknown }).app;
    await expect(adminRepairAuthLink(repairRequest))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'app_check_required' });
    await expect(adminRelinkProvider(relinkRequest))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'app_check_required' });
    expect(storeSnapshot()).toEqual(before);
  });

  it('permission-denied без claims, с support- и moderator-ролью', async () => {
    seedLinkedUser();
    await expect(callRepair(baseInput, null))
      .rejects.toMatchObject({ code: 'permission-denied', message: 'Admin permission required' });
    await expect(callRepair(baseInput, 'support'))
      .rejects.toMatchObject({ code: 'permission-denied', message: 'Admin permission required' });
    await expect(callRepair(baseInput, 'moderator'))
      .rejects.toMatchObject({ code: 'permission-denied', message: 'Admin permission required' });
    // Никаких записей без прав.
    expect(collectionDocs('admin_log')).toHaveLength(0);
    expect(collectionDocs('admin_command_operations')).toHaveLength(0);
  });

  it('owner и admin проходят (users.auth_repair есть только у них)', async () => {
    seedLinkedUser();
    const asAdmin = await callRepair({ ...baseInput, idempotencyKey: 'key-admin' }, 'admin');
    expect(asAdmin.ok).toBe(true);
    const asOwner = await callRepair({ ...baseInput, idempotencyKey: 'key-owner' }, 'owner');
    expect(asOwner.ok).toBe(true);
  });
});

describe('adminRepairAuthLink — починка дрифта', () => {
  it('создаёт отсутствующий auth_links док и пишет аудит before/after', async () => {
    seedLinkedUser();
    const result = await callRepair(baseInput);

    expect(result).toMatchObject({
      ok: true,
      uid: STABLE,
      repaired: true,
      driftReasons: ['auth_link_missing'],
    });
    expect(result.auditId).toBeTruthy();

    // Форма ensureAuthLinkDoc: stable_id + provider-поля, linkedAt проставлен.
    expect(docs.get('auth_links/provider-uid-1')).toMatchObject({
      stable_id: STABLE,
      providerUid: 'provider-uid-1',
      provider: 'google',
      linkedAt: NOW,
      lastSignInAt: NOW,
      updatedAt: NOW,
    });

    const audits = collectionDocs('admin_log');
    expect(audits).toHaveLength(1);
    expect(audits[0].data).toMatchObject({
      action: 'auth_link_repair',
      actorUid: 'admin-uid-1',
      role: 'owner',
      entity: { collection: 'users', id: STABLE },
      reason: baseInput.reason,
      requestId: baseInput.requestId,
      before: {
        users: { firebaseAuthUid: 'provider-uid-1', linkedAuthProviderUid: 'provider-uid-1', linkedAuthProvider: 'google' },
        authLink: null,
      },
      after: {
        authLink: { stable_id: STABLE, providerUid: 'provider-uid-1', provider: 'google', linkedAt: NOW },
        driftReasons: ['auth_link_missing'],
      },
    });

    const ops = collectionDocs('admin_command_operations');
    expect(ops).toHaveLength(1);
    expect(ops[0].id).toBe('auth_link_repair_key-1');
    expect(ops[0].data).toMatchObject({ action: 'auth_link_repair', actorUid: 'admin-uid-1' });
  });

  it('чинит auth_links, указывающий на чужой stable_id', async () => {
    seedLinkedUser();
    docs.set('auth_links/provider-uid-1', { stable_id: 'other-stable', providerUid: 'provider-uid-1', provider: 'google', linkedAt: 42 });
    const result = await callRepair(baseInput);

    expect(result).toMatchObject({ repaired: true, driftReasons: ['auth_link_stable_mismatch'] });
    expect(docs.get('auth_links/provider-uid-1')).toMatchObject({
      stable_id: STABLE,
      linkedAt: 42, // исходный linkedAt сохраняется
    });
  });

  it('rejects a live foreign auth_links anchor with zero writes', async () => {
    seedLinkedUser();
    docs.set('auth_links/provider-uid-1', {
      stable_id: 'stable-foreign',
      providerUid: 'provider-uid-1',
      provider: 'google',
      linkedAt: 42,
    });
    docs.set('users/stable-foreign', { firebaseAuthUid: 'provider-uid-1' });
    const before = storeSnapshot();

    await expect(callRepair(baseInput)).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'provider_link_conflict',
    });
    expect(storeSnapshot()).toEqual(before);
  });

  it.each([
    ['target tombstone', `account_deletion_tombstones/${STABLE}`],
    ['provider marker', 'account_deletion_auth_markers/provider-uid-1'],
  ])('fails closed on a %s during repair', async (_case, path) => {
    seedLinkedUser();
    docs.set(path, { status: 'pending' });
    const before = storeSnapshot();
    await expect(callRepair(baseInput)).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'account_delete_pending',
    });
    expect(storeSnapshot()).toEqual(before);
  });

  it('нет дрифта → repaired:false без аудита, но с op-записью', async () => {
    seedLinkedUser();
    docs.set('auth_links/provider-uid-1', {
      stable_id: STABLE,
      providerUid: 'provider-uid-1',
      provider: 'google',
      linkedAt: 42,
      lastSignInAt: 43,
    });
    const result = await callRepair(baseInput);

    expect(result).toMatchObject({ ok: true, repaired: false, driftReasons: [], auditId: null });
    expect(collectionDocs('admin_log')).toHaveLength(0);
    expect(collectionDocs('admin_command_operations')).toHaveLength(1);
  });

  it('аккаунт без provider-привязки → failed-precondition no_provider_link', async () => {
    docs.set(`users/${STABLE}`, { progress: { xp: 10 } });
    await expect(callRepair(baseInput))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'no_provider_link' });
  });

  it('идемпотентность: повтор с тем же idempotencyKey → replayed:true без нового аудита', async () => {
    seedLinkedUser();
    const first = await callRepair(baseInput);
    const second = await callRepair(baseInput);

    expect(second).toEqual({ ...first, replayed: true });
    expect(collectionDocs('admin_log')).toHaveLength(1);
    expect(collectionDocs('admin_command_operations')).toHaveLength(1);
  });

  it('тот же idempotencyKey с другим payload → already-exists', async () => {
    seedLinkedUser();
    await callRepair(baseInput);
    await expect(callRepair({ ...baseInput, reason: 'different reason' }))
      .rejects.toMatchObject({ code: 'already-exists', message: 'idempotency key replay mismatch' });
  });
});

describe('adminRelinkProvider', () => {
  it('требует ровно один идентификатор провайдера', async () => {
    await expect(callRelink({ ...baseInput }))
      .rejects.toMatchObject({ code: 'invalid-argument', message: 'exactly_one_provider_identifier_required' });
    await expect(callRelink({ ...baseInput, providerEmail: 'a@b.c', providerUid: 'uid-1' }))
      .rejects.toMatchObject({ code: 'invalid-argument', message: 'exactly_one_provider_identifier_required' });
    await expect(callRelink({ ...baseInput, providerEmail: 'not-an-email' }))
      .rejects.toMatchObject({ code: 'invalid-argument', message: 'provider_email_invalid' });
  });

  it('permission-denied для support-роли', async () => {
    seedLinkedUser();
    await expect(callRelink({ ...baseInput, providerUid: 'new-uid' }, 'support'))
      .rejects.toMatchObject({ code: 'permission-denied', message: 'Admin permission required' });
  });

  it('перепривязка по email: резолв через getUserByEmail, записи по форме, аудит с previousProviderUids', async () => {
    seedLinkedUser();
    const result = await callRelink({ ...baseInput, providerEmail: 'New@gmail.com' });

    expect(mockGetUserByEmail).toHaveBeenCalledWith('new@gmail.com'); // email нормализуется
    expect(result).toMatchObject({
      ok: true,
      uid: STABLE,
      providerUid: 'resolved-provider-uid',
      previousProviderUids: ['provider-uid-1'],
    });

    expect(docs.get('auth_links/resolved-provider-uid')).toMatchObject({
      stable_id: STABLE,
      providerUid: 'resolved-provider-uid',
      provider: 'google',
      email: 'new@gmail.com',
      displayName: 'Resolved User',
      linkedAt: NOW,
      updatedAt: NOW,
    });
    const user = docs.get(`users/${STABLE}`);
    expect(user?.firebaseAuthUid).toBe('resolved-provider-uid');
    expect(user?.linkedAuth).toMatchObject({
      provider: 'google',
      providerUid: 'resolved-provider-uid',
      email: 'new@gmail.com',
      displayName: 'Resolved User',
      devicePlatform: 'android', // сохранён из старого linkedAuth
    });

    const audits = collectionDocs('admin_log');
    expect(audits).toHaveLength(1);
    expect(audits[0].data).toMatchObject({
      action: 'auth_provider_relink',
      role: 'owner',
      before: {
        users: { firebaseAuthUid: 'provider-uid-1' },
        previousProviderUids: ['provider-uid-1'],
      },
      after: {
        users: { firebaseAuthUid: 'resolved-provider-uid', linkedAuthProviderUid: 'resolved-provider-uid' },
        previousProviderUids: ['provider-uid-1'],
      },
    });
  });

  it('resolves direct providerUid through Auth and scans all providerData entries', async () => {
    seedLinkedUser();
    const result = await callRelink({ ...baseInput, providerUid: 'manual-uid-9' });

    expect(mockGetUser).toHaveBeenCalledWith('manual-uid-9');
    expect(result).toMatchObject({ ok: true, providerUid: 'manual-uid-9' });
    expect(docs.get('auth_links/manual-uid-9')).toMatchObject({
      stable_id: STABLE,
      provider: 'google',
      providerUid: 'manual-uid-9',
      email: 'direct-provider@example.com',
    });
    expect(docs.get(`users/${STABLE}`)?.firebaseAuthUid).toBe('manual-uid-9');
  });

  it('rejects a direct Auth record without a supported Google/Apple provider', async () => {
    seedLinkedUser();
    mockGetUser.mockResolvedValueOnce({
      uid: 'manual-uid-9',
      email: 'password@example.com',
      displayName: 'Password User',
      providerData: [{ providerId: 'password' }],
    });
    const before = storeSnapshot();

    await expect(callRelink({ ...baseInput, providerUid: 'manual-uid-9' }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'provider_unsupported' });
    expect(storeSnapshot()).toEqual(before);
  });

  it('rejects a foreign incoming live anchor with provider_link_conflict and zero writes', async () => {
    seedLinkedUser();
    docs.set('auth_links/manual-uid-9', { stable_id: 'stable-victim', providerUid: 'manual-uid-9' });
    docs.set('users/stable-victim', { firebaseAuthUid: 'manual-uid-9' });
    const before = storeSnapshot();

    await expect(callRelink({ ...baseInput, providerUid: 'manual-uid-9' }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'provider_link_conflict' });
    expect(storeSnapshot()).toEqual(before);
  });

  it.each([
    ['target tombstone', `account_deletion_tombstones/${STABLE}`, false],
    ['new provider marker', 'account_deletion_auth_markers/manual-uid-9', false],
    ['old provider marker', 'account_deletion_auth_markers/provider-uid-1', false],
    ['displaced tombstone', 'account_deletion_tombstones/stable-displaced', true],
  ] as const)('fails closed on a %s with zero writes', async (_case, path, addDisplacedAnchor) => {
    seedLinkedUser();
    if (addDisplacedAnchor) {
      docs.set('auth_links/manual-uid-9', { stable_id: 'stable-displaced', providerUid: 'manual-uid-9' });
    }
    docs.set(path, { status: 'pending' });
    const before = storeSnapshot();

    await expect(callRelink({ ...baseInput, providerUid: 'manual-uid-9' }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_delete_pending' });
    expect(storeSnapshot()).toEqual(before);
  });

  it('atomically retires only proven old anchors that still point to the target', async () => {
    seedLinkedUser();
    docs.set(`users/${STABLE}`, {
      ...(docs.get(`users/${STABLE}`) ?? {}),
      firebaseAuthUid: 'old-auth-a',
      linkedAuth: {
        ...((docs.get(`users/${STABLE}`)?.linkedAuth as DocData) ?? {}),
        providerUid: 'old-auth-b',
      },
    });
    docs.set('auth_links/old-auth-a', { stable_id: STABLE, providerUid: 'old-auth-a' });
    docs.set('auth_links/old-auth-b', { stable_id: 'stable-foreign', providerUid: 'old-auth-b' });
    const foreignAnchor = { ...(docs.get('auth_links/old-auth-b') ?? {}) };

    await expect(callRelink({ ...baseInput, providerUid: 'manual-uid-9' }))
      .resolves.toMatchObject({ previousProviderUids: ['old-auth-a', 'old-auth-b'] });
    expect(docs.get('auth_links/old-auth-a')).toBeUndefined();
    expect(docs.get('auth_links/old-auth-b')).toEqual(foreignAnchor);
    expect(docs.get('auth_links/manual-uid-9')).toMatchObject({ stable_id: STABLE });
  });

  it('идемпотентность relink: повтор → replayed:true, аудит один', async () => {
    seedLinkedUser();
    const input = { ...baseInput, providerUid: 'manual-uid-9' };
    const first = await callRelink(input);
    const second = await callRelink(input);

    expect(second).toEqual({ ...first, replayed: true });
    expect(collectionDocs('admin_log')).toHaveLength(1);
  });

  it('неизвестный email → not-found provider_not_found', async () => {
    seedLinkedUser();
    mockGetUserByEmail.mockRejectedValueOnce(new Error('auth/user-not-found'));
    await expect(callRelink({ ...baseInput, providerEmail: 'ghost@gmail.com' }))
      .rejects.toMatchObject({ code: 'not-found', message: 'provider_not_found' });
  });

  it('uid с незавершённым удалением → failed-precondition account_delete_pending', async () => {
    seedLinkedUser();
    docs.set('account_deletion_auth_markers/manual-uid-9', { at: NOW });
    await expect(callRelink({ ...baseInput, providerUid: 'manual-uid-9' }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_delete_pending' });
    expect(docs.get('auth_links/manual-uid-9')).toBeUndefined();
  });
});
