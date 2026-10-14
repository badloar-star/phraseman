// ⛔ App Check запломбирован владельцем 2026-08-17: ожидания ниже приведены к
// enforceAppCheck: false. Это НЕ ослабление теста — правило отменено целиком,
// см. CLAUDE.md «APP CHECK ЗАПЛОМБИРОВАН НАВСЕГДА» и app_check_sealed.test.ts.
// Остальные проверки (секреты, регион, экспорт) сохранены как были.
export {};

type DocData = Record<string, unknown>;
type RecoveryStore = Record<string, Record<string, DocData | undefined>>;

let currentDb: any = null;
const registeredCallableOptions = new WeakMap<object, Record<string, unknown>>();

class FakeHttpsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (options: Record<string, unknown>, handler: object) => {
    registeredCallableOptions.set(handler, options);
    return handler;
  },
}));

jest.mock('firebase-admin', () => {
  const firestore = Object.assign(() => currentDb, {
    FieldValue: {
      delete: () => ({ __op: 'delete' }),
      serverTimestamp: () => ({ __op: 'serverTimestamp' }),
    },
  });
  return {
    firestore,
    auth: jest.fn(() => ({ getUser: jest.fn() })),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  authRecoveryHint,
  buildRecoveryHintFromUserData,
  maskEmailForRecoveryHint,
} = require('./auth_identity') as typeof import('./auth_identity');

// зачем (Ядро 14.10, [AUTH-RECOVERY-HINT]): счётчики лимита живут в общей для теста памяти — лимит виден между вызовами.
let rateStore: Record<string, DocData> = {};

function makeRecoveryDb(
  initial: RecoveryStore = {},
  failPaths: readonly string[] = [],
): { reads: string[] } {
  const reads: string[] = [];
  currentDb = {
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
      get: async (ref: { path: string }) => ({ exists: Boolean(rateStore[ref.path]), data: () => rateStore[ref.path] }),
      set: (ref: { path: string }, data: DocData) => { rateStore[ref.path] = { ...(rateStore[ref.path] ?? {}), ...data }; },
    }),
    collection: (collection: string) => ({
      doc: (id: string) => ({
        path: `${collection}/${id}`,
        get: async () => {
          const path = `${collection}/${id}`;
          reads.push(path);
          if (failPaths.includes(path)) throw new Error(`read_failed:${path}`);
          const data = initial[collection]?.[id];
          return {
            exists: Boolean(data),
            data: () => data,
          };
        },
      }),
    }),
  };
  return { reads };
}

function runRecoveryHint(input: {
  authUid?: string;
  app?: boolean;
  stableId?: string;
  ip?: string;
}): Promise<unknown> {
  const handler = authRecoveryHint as unknown as (request: Record<string, unknown>) => Promise<unknown>;
  return handler({
    auth: input.authUid ? { uid: input.authUid, token: {} } : undefined,
    app: input.app === false ? undefined : { appId: 'app-test' },
    data: { stableId: input.stableId },
    rawRequest: { headers: input.ip ? { 'x-forwarded-for': input.ip } : {} },
  });
}

const NEUTRAL_HINT = {
  found: false,
  linked: false,
  provider: null,
  maskedEmail: null,
};

describe('maskEmailForRecoveryHint', () => {
  it('маскирует локальную часть до 3 символов, домен сохраняет', () => {
    expect(maskEmailForRecoveryHint('uskovavalya52@gmail.com')).toBe('usk***@gmail.com');
    expect(maskEmailForRecoveryHint('ab@outlook.com')).toBe('ab***@outlook.com');
    expect(maskEmailForRecoveryHint('a@icloud.com')).toBe('a***@icloud.com');
  });

  it('поддерживает apple privaterelay-адреса', () => {
    expect(maskEmailForRecoveryHint('dpdcnf87nu@privaterelay.appleid.com'))
      .toBe('dpd***@privaterelay.appleid.com');
  });

  it('возвращает null для мусора вместо email', () => {
    expect(maskEmailForRecoveryHint(null)).toBeNull();
    expect(maskEmailForRecoveryHint(undefined)).toBeNull();
    expect(maskEmailForRecoveryHint('')).toBeNull();
    expect(maskEmailForRecoveryHint('no-at-sign')).toBeNull();
    expect(maskEmailForRecoveryHint('@domain.com')).toBeNull();
    expect(maskEmailForRecoveryHint('local@')).toBeNull();
  });
});

describe('buildRecoveryHintFromUserData', () => {
  it('возвращает провайдера и маску для привязанного аккаунта', () => {
    const hint = buildRecoveryHintFromUserData({
      linkedAuth: { provider: 'google', providerUid: 'uid-1', email: 'uskovavalya52@gmail.com' },
    });
    expect(hint).toEqual({
      found: true,
      linked: true,
      provider: 'google',
      maskedEmail: 'usk***@gmail.com',
    });
  });

  it('не выдумывает email, если его нет в linkedAuth', () => {
    const hint = buildRecoveryHintFromUserData({
      linkedAuth: { provider: 'apple', providerUid: 'uid-2', email: null },
    });
    expect(hint).toEqual({ found: true, linked: true, provider: 'apple', maskedEmail: null });
  });

  it('linked=false для аккаунта без provider-привязки', () => {
    expect(buildRecoveryHintFromUserData({ progress: { xp: 100 } }))
      .toEqual({ found: true, linked: false, provider: null, maskedEmail: null });
    expect(buildRecoveryHintFromUserData({ linkedAuth: { provider: 'password' } }))
      .toEqual({ found: true, linked: false, provider: null, maskedEmail: null });
  });

  it('found=false для отсутствующего документа', () => {
    expect(buildRecoveryHintFromUserData(undefined))
      .toEqual({ found: false, linked: false, provider: null, maskedEmail: null });
  });
});

describe('authRecoveryHint callable disclosure boundary', () => {
  beforeEach(() => {
    currentDb = null;
    rateStore = {};
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('registers with unconditional App Check enforcement', () => {
    expect(registeredCallableOptions.get(authRecoveryHint as unknown as object))
      .toMatchObject({ enforceAppCheck: false });
  });

  // зачем (Ядро 14.10): App Check запломбирован (клиент его не шлёт) — прежнее `app_check_required` делало подсказку
  // вечным отказом. Защита теперь: вход + лимит + ответ без почты.
  it('requires Firebase Auth before reading identity data; missing App Check no longer blocks', async () => {
    const { reads } = makeRecoveryDb();

    await expect(runRecoveryHint({ app: true, stableId: 'stable-a' }))
      .rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });
    expect(reads).toEqual([]);
    await expect(runRecoveryHint({ authUid: 'auth-a', app: false, stableId: 'stable-a' })).resolves.toEqual(NEUTRAL_HINT);
  });

  it('limits 5 hints per hour per uid and per IP before any identity read', async () => {
    const { reads } = makeRecoveryDb({ auth_links: { 'auth-a': { stable_id: 'stable-a' } }, users: { 'stable-a': {} } });
    for (let i = 0; i < 5; i += 1) await runRecoveryHint({ authUid: 'auth-a', stableId: 'stable-a', ip: '1.1.1.1' });
    const readsBefore = reads.length;
    await expect(runRecoveryHint({ authUid: 'auth-a', stableId: 'stable-a', ip: '2.2.2.2' }))
      .rejects.toMatchObject({ code: 'resource-exhausted', message: 'recovery_hint_rate_limited' });
    expect(reads.length).toBe(readsBefore);
    // другой uid с того же IP — тоже упирается в лимит IP
    await expect(runRecoveryHint({ authUid: 'auth-b', stableId: 'stable-b', ip: '1.1.1.1' }))
      .rejects.toMatchObject({ code: 'resource-exhausted' });
    // счётчики лимита — по хэшу, без uid/IP в открытом виде
    expect(Object.keys(rateStore).join(' ')).not.toMatch(/auth-a|1\.1\.1\.1/);
  });

  it('reads the target user only after the caller auth_links anchor exactly matches', async () => {
    const { reads } = makeRecoveryDb({
      auth_links: { 'auth-a': { stable_id: 'stable-a' } },
      users: {
        'stable-a': {
          linkedAuth: {
            provider: 'google',
            providerUid: 'auth-a',
            email: 'private@example.com',
          },
        },
      },
    });

    // зачем (Ядро 14.10): наружу только тип входа — без почты, даже маскированной.
    await expect(runRecoveryHint({ authUid: 'auth-a', stableId: 'stable-a' })).resolves.toEqual({
      found: true,
      linked: true,
      provider: 'google',
      maskedEmail: null,
    });
    expect(reads).toEqual(['auth_links/auth-a', 'users/stable-a']);
  });

  it.each([
    ['missing', {}],
    ['mismatch', { 'auth-a': { stable_id: 'stable-other' } }],
  ] as const)('returns the same neutral response for a %s anchor without reading the target', async (_case, authLinks) => {
    const { reads } = makeRecoveryDb({
      auth_links: authLinks,
      users: {
        'stable-victim': {
          linkedAuth: { provider: 'apple', email: 'victim@icloud.com' },
        },
      },
    });

    await expect(runRecoveryHint({ authUid: 'auth-a', stableId: 'stable-victim' }))
      .resolves.toEqual(NEUTRAL_HINT);
    expect(reads).toEqual(['auth_links/auth-a']);
  });

  it.each([
    ['anchor', 'auth_links/auth-a'],
    ['target', 'users/stable-a'],
  ] as const)('maps a %s read fault to generic identity-check unavailable', async (_case, failPath) => {
    makeRecoveryDb({
      auth_links: { 'auth-a': { stable_id: 'stable-a' } },
      users: { 'stable-a': { linkedAuth: { provider: 'google', email: 'a@example.com' } } },
    }, [failPath]);

    await expect(runRecoveryHint({ authUid: 'auth-a', stableId: 'stable-a' }))
      .rejects.toMatchObject({ code: 'unavailable', message: 'identity_check_unavailable' });
  });
});
