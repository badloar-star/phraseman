import {
  ACCOUNT_DELETE_GRACE_MS,
} from './account_delete_grace';
import {
  accountDeleteIdentityClosureHash,
  accountDeleteProfileHasLinkedSignIn,
  enqueueAccountDeletionJob,
  processAccountDeletionJob,
} from './account_delete_job';
import { accountDeleteGuestIdentityScan, decideAccountDeleteGuestImmediate } from './account_delete';

// зачем (D189, владелец 14.10 «ДА, СРАЗУ»; координатор: строго, сомнение = «не гость»): гостя удаляем с сервера сразу,
// всё остальное — обычные 14 дней. Ошибка в сторону «привязанный стёрт сразу» = потеря данных настоящего человека.

type StoredDoc = Record<string, unknown>;

function makeDbStub(initial: Record<string, StoredDoc> = {}) {
  const docs = new Map<string, StoredDoc>(Object.entries(initial).map(([k, v]) => [k, { ...v }]));
  const applySet = (key: string, value: StoredDoc, options?: { merge?: boolean }) => {
    const next = options?.merge ? { ...(docs.get(key) ?? {}) } : {};
    Object.entries(value).forEach(([field, entry]) => {
      if ((entry as { constructor?: { name?: string } } | null)?.constructor?.name === 'DeleteTransform') delete next[field];
      else next[field] = entry;
    });
    docs.set(key, next);
  };
  const ref = (collection: string, id: string) => ({ key: `${collection}/${id}` });
  const db = {
    collection: (name: string) => ({ doc: (id: string) => ref(name, id) }),
    batch: () => {
      const writes: Array<() => void> = [];
      return {
        set: (r: { key: string }, value: StoredDoc, options?: { merge?: boolean }) => writes.push(() => applySet(r.key, value, options)),
        commit: async () => { writes.forEach((w) => w()); },
      };
    },
    runTransaction: async <T>(fn: (tx: any) => Promise<T>) => {
      const writes: Array<() => void> = [];
      const result = await fn({
        get: async (r: { key: string }) => ({ exists: docs.has(r.key), data: () => docs.get(r.key) }),
        create: (r: { key: string }, value: StoredDoc) => writes.push(() => {
          if (docs.has(r.key)) throw new Error('already-exists');
          docs.set(r.key, { ...value });
        }),
        set: (r: { key: string }, value: StoredDoc, options?: { merge?: boolean }) => writes.push(() => applySet(r.key, value, options)),
        update: (r: { key: string }, value: StoredDoc) => writes.push(() => applySet(r.key, value, { merge: true })),
      });
      writes.forEach((w) => w());
      return result;
    },
  };
  const find = (prefix: string) => Array.from(docs.entries()).find(([k]) => k.startsWith(`${prefix}/`))?.[1];
  return { db: db as unknown as FirebaseFirestore.Firestore, find, get: (key: string) => docs.get(key) };
}

const anonToken = { signInProvider: 'anonymous', identities: {} };
const authOk = async (uids: readonly string[]) => uids.filter((u) => u.startsWith('auth')).map((uid) => ({ uid, providerCount: 0 }));
const clean = async () => 'clean' as const;
const cleanScan = async () => ({ profilesLinked: false, missingProfiles: [] as string[], linkedAuthLinks: [] as string[] });
const decide = (over: Partial<Parameters<typeof decideAccountDeleteGuestImmediate>[0]> = {}) => decideAccountDeleteGuestImmediate({
  db: {} as FirebaseFirestore.Firestore,
  authUid: 'auth-1',
  identityClosure: ['auth-1', 'stable-1'],
  token: anonToken,
  lookupAuthUsers: authOk,
  stableUid: 'stable-1',
  scanIdentity: cleanScan,
  ...over,
});

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('D189: строгий признак гостя', () => {
  it('анонимный вход без единой привязки → удалить сразу', async () => {
    await expect(decide()).resolves.toEqual({ immediate: true, reason: 'anonymous_no_links' });
  });

  it('анонимный токен, но Google уже привязан (providerData) → 14 дней', async () => {
    const linked = await decide({ lookupAuthUsers: async () => [{ uid: 'auth-1', providerCount: 1 }] });
    expect(linked).toEqual({ immediate: false, reason: 'auth_provider_linked' });
  });

  it('анонимный токен с google.com в identities → 14 дней', async () => {
    await expect(decide({ token: { signInProvider: 'anonymous', identities: { 'google.com': ['123'] } } }))
      .resolves.toMatchObject({ immediate: false, reason: 'token_identities_linked' });
  });

  it('вход через Google / Apple / неизвестный провайдер / без токена → 14 дней', async () => {
    for (const provider of ['google.com', 'apple.com', 'password', 'custom', undefined]) {
      const decision = await decide({ token: { signInProvider: provider, identities: {} } });
      expect(decision.immediate).toBe(false);
    }
    await expect(decide({ token: undefined })).resolves.toEqual({ immediate: false, reason: 'no_token' });
  });

  it('identities не объект / нет → 14 дней', async () => {
    await expect(decide({ token: { signInProvider: 'anonymous', identities: undefined } })).resolves.toMatchObject({ immediate: false });
    await expect(decide({ token: { signInProvider: 'anonymous', identities: ['x'] } })).resolves.toMatchObject({ immediate: false });
  });

  it('другой Auth-пользователь в closure с провайдером → 14 дней', async () => {
    const lookup = async () => [{ uid: 'auth-1', providerCount: 0 }, { uid: 'auth-2', providerCount: 2 }];
    await expect(decide({ identityClosure: ['auth-1', 'auth-2', 'stable-1'], lookupAuthUsers: lookup }))
      .resolves.toEqual({ immediate: false, reason: 'auth_provider_linked' });
  });

  it('ошибки чтения и неполные данные → 14 дней', async () => {
    await expect(decide({ lookupAuthUsers: async () => { throw new Error('auth down'); } })).resolves.toEqual({ immediate: false, reason: 'auth_lookup_failed' });
    await expect(decide({ lookupAuthUsers: async () => [] })).resolves.toEqual({ immediate: false, reason: 'auth_user_missing' });
    await expect(decide({ scanIdentity: async () => { throw new Error('firestore down'); } })).resolves.toEqual({ immediate: false, reason: 'profile_read_failed' });
    await expect(decide({ scanIdentity: async () => ({ ...(await cleanScan()), profilesLinked: true }) })).resolves.toEqual({ immediate: false, reason: 'profile_linked' });
  });

  // ── Разбор Авторизации (координатор 14.10): три правки ──
  it('а) связь есть, а профиля стабильного аккаунта нет → profile_missing, 14 дней', async () => {
    const scan = async () => ({ profilesLinked: false, missingProfiles: ['stable-1'], linkedAuthLinks: [] as string[] });
    await expect(decide({ scanIdentity: scan })).resolves.toEqual({ immediate: false, reason: 'profile_missing' });
  });

  it('а) stableUid = authUid, анонимный без провайдеров и профиля нет — чистый гость, сразу', async () => {
    const scan = async () => ({ profilesLinked: false, missingProfiles: ['auth-1'], linkedAuthLinks: [] as string[] });
    await expect(decide({ identityClosure: ['auth-1'], stableUid: 'auth-1', scanIdentity: scan }))
      .resolves.toEqual({ immediate: true, reason: 'anonymous_no_links' });
  });

  it('б) ошибки чтения пишут код и текст в лог решения [D189-GUEST]', async () => {
    const log = jest.spyOn(console, 'log');
    const err = Object.assign(new Error('deadline exceeded'), { code: 'deadline-exceeded' });
    await decide({ lookupAuthUsers: async () => { throw err; } });
    await decide({ scanIdentity: async () => { throw err; } });
    const lines = log.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('[D189-GUEST]'));
    expect(lines.filter((l) => l.includes('"code":"deadline-exceeded"') && l.includes('deadline exceeded'))).toHaveLength(2);
    expect(lines.join('\n')).toMatch(/auth_lookup_failed[\s\S]*profile_read_failed/);
  });

  it('в) связка входа с Google осталась после удаления Auth-пользователя → auth_link_linked, 14 дней', async () => {
    const scan = async () => ({ profilesLinked: false, missingProfiles: [] as string[], linkedAuthLinks: ['auth-old'] });
    await expect(decide({ scanIdentity: scan })).resolves.toEqual({ immediate: false, reason: 'auth_link_linked' });
  });

  it('скан: профили и связки одним getAll; anonymous / без provider связкой не считаются', async () => {
    const docs: Record<string, StoredDoc | undefined> = {
      'users/auth-1': { name: 'Гость' },
      'auth_links/auth-1': { stable_id: 'stable-1', provider: 'anonymous' },
      'auth_links/stable-1': { stable_id: 'stable-1' },
      'auth_links/auth-old': { stable_id: 'stable-1', provider: 'google' },
    };
    let calls = 0;
    const db = {
      collection: (name: string) => ({ doc: (id: string) => ({ key: `${name}/${id}` }) }),
      getAll: async (...refs: Array<{ key: string }>) => { calls += 1; return refs.map((r) => ({ exists: docs[r.key] !== undefined, data: () => docs[r.key] })); },
    } as unknown as FirebaseFirestore.Firestore;
    const scan = await accountDeleteGuestIdentityScan(db, ['auth-1', 'stable-1', 'auth-old']);
    expect(calls).toBe(1);
    expect(scan).toEqual({ profilesLinked: false, missingProfiles: ['stable-1', 'auth-old'], linkedAuthLinks: ['auth-old'] });
  });

  it('привязка в профиле: linkedAuth Google/Apple или почта — да; анонимная запись без почты — нет', () => {
    expect(accountDeleteProfileHasLinkedSignIn({ linkedAuth: { provider: 'google', email: 'a@b.c' } })).toBe(true);
    expect(accountDeleteProfileHasLinkedSignIn({ linkedAuth: { provider: 'apple' } })).toBe(true);
    expect(accountDeleteProfileHasLinkedSignIn({ linkedAuth: { providerUid: 'x' } })).toBe(true);
    expect(accountDeleteProfileHasLinkedSignIn({ email: 'a@b.c' })).toBe(true);
    expect(accountDeleteProfileHasLinkedSignIn({ linkedAuth: { provider: 'anonymous' } })).toBe(false);
    expect(accountDeleteProfileHasLinkedSignIn({ linkedAuth: {} })).toBe(false);
    expect(accountDeleteProfileHasLinkedSignIn({ name: 'Гость' })).toBe(false);
  });
});

describe('D189: постановка задачи', () => {
  it('гость → задача к исполнению сейчас, grace 0, метка с дедлайном «сейчас»', async () => {
    const { db, find } = makeDbStub();
    await enqueueAccountDeletionJob(db, 'auth-1', 'stable-1', 5_000, undefined, ['auth-1', 'stable-1'], { immediate: true, reason: 'anonymous_no_links' });
    expect(find('account_deletion_jobs')).toMatchObject({ status: 'queued', nextAttemptAtMs: 5_000, graceDeadlineMs: 5_000, graceMs: 0, guestImmediate: true, guestDecisionReason: 'anonymous_no_links' });
    expect(find('account_deletion_tombstones')).toMatchObject({ graceDeadlineMs: 5_000 });
  });

  it('не гость → прежние 14 дней', async () => {
    const { db, find } = makeDbStub();
    await enqueueAccountDeletionJob(db, 'auth-1', 'stable-1', 5_000, undefined, ['auth-1', 'stable-1'], { immediate: false, reason: 'auth_provider_linked' });
    expect(find('account_deletion_jobs')).toMatchObject({ nextAttemptAtMs: 5_000 + ACCOUNT_DELETE_GRACE_MS, graceMs: ACCOUNT_DELETE_GRACE_MS, guestImmediate: false });
    expect(find('account_deletion_tombstones')).toMatchObject({ graceDeadlineMs: 5_000 + ACCOUNT_DELETE_GRACE_MS });
  });

  it('без решения (старые вызовы) → прежние 14 дней, без полей гостя', async () => {
    const { db, find } = makeDbStub();
    await enqueueAccountDeletionJob(db, 'auth-1', 'stable-1', 5_000, undefined, ['auth-1', 'stable-1']);
    expect(find('account_deletion_jobs')).toMatchObject({ nextAttemptAtMs: 5_000 + ACCOUNT_DELETE_GRACE_MS });
    expect(find('account_deletion_jobs')).not.toHaveProperty('guestImmediate');
  });
});

describe('D189: перепроверка при обработке задачи', () => {
  const job = (guestImmediate: boolean): Record<string, StoredDoc> => ({
    'account_deletion_jobs/job-1': {
      jobId: 'job-1', authUid: 'auth-1', stableUid: 'stable-1', authUidHash: 'h1', stableUidHash: 'h2',
      status: 'queued', attempts: 0, createdAtMs: 1_000, updatedAtMs: 1_000, nextAttemptAtMs: 1_000, guestImmediate,
      identityClosure: ['auth-1', 'stable-1'], identityClosureVersion: 1,
      identityClosureHash: accountDeleteIdentityClosureHash(['auth-1', 'stable-1']), closureCutoffMs: 1_000,
    },
  });
  const stats = async () => ({ docsDeleted: 1, docsUpdated: 0, queriesRun: 1, authDeleted: true });

  it('профили чистые → удаление идёт', async () => {
    const { db, get } = makeDbStub(job(true));
    const execute = jest.fn(stats);
    await processAccountDeletionJob(db, 'job-1', execute, 2_000, { profilesLinked: clean });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(get('account_deletion_jobs/job-1')).toMatchObject({ status: 'completed' });
  });

  it('нашлась привязка → назад в 14 дней от создания, удаление НЕ идёт', async () => {
    const { db, get } = makeDbStub(job(true));
    const execute = jest.fn(stats);
    await processAccountDeletionJob(db, 'job-1', execute, 2_000, { profilesLinked: async () => 'linked' as const });
    expect(execute).not.toHaveBeenCalled();
    expect(get('account_deletion_jobs/job-1')).toMatchObject({
      status: 'queued', guestImmediate: false, guestDecisionReason: 'recheck_linked',
      nextAttemptAtMs: 1_000 + ACCOUNT_DELETE_GRACE_MS, graceMs: ACCOUNT_DELETE_GRACE_MS,
    });
    expect(get('account_deletion_tombstones/stable-1')).toMatchObject({ status: 'pending', graceDeadlineMs: 1_000 + ACCOUNT_DELETE_GRACE_MS });
  });

  it('ошибка чтения при перепроверке → назад в 14 дней, удаление НЕ идёт', async () => {
    const { db, get } = makeDbStub(job(true));
    const execute = jest.fn(stats);
    await processAccountDeletionJob(db, 'job-1', execute, 2_000, { profilesLinked: async () => { throw new Error('down'); } });
    expect(execute).not.toHaveBeenCalled();
    expect(get('account_deletion_jobs/job-1')).toMatchObject({ status: 'queued', guestDecisionReason: 'recheck_read_failed' });
  });

  it('обычная задача (не гость) перепроверку не делает', async () => {
    const { db } = makeDbStub(job(false));
    const profilesLinked = jest.fn(clean);
    const execute = jest.fn(stats);
    await processAccountDeletionJob(db, 'job-1', execute, 2_000, { profilesLinked });
    expect(profilesLinked).not.toHaveBeenCalled();
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
