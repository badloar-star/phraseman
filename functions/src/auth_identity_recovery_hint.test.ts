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

function makeRecoveryDb(
  initial: RecoveryStore = {},
  failPaths: readonly string[] = [],
): { reads: string[] } {
  const reads: string[] = [];
  currentDb = {
    collection: (collection: string) => ({
      doc: (id: string) => ({
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
}): Promise<unknown> {
  const handler = authRecoveryHint as unknown as (request: Record<string, unknown>) => Promise<unknown>;
  return handler({
    auth: input.authUid ? { uid: input.authUid, token: {} } : undefined,
    app: input.app === false ? undefined : { appId: 'app-test' },
    data: { stableId: input.stableId },
    rawRequest: { headers: {} },
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
  });

  it('registers with unconditional App Check enforcement', () => {
    expect(registeredCallableOptions.get(authRecoveryHint as unknown as object))
      .toMatchObject({ enforceAppCheck: false });
  });

  it('requires Firebase Auth and App Check before reading identity data', async () => {
    const { reads } = makeRecoveryDb();

    await expect(runRecoveryHint({ app: true, stableId: 'stable-a' }))
      .rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });
    await expect(runRecoveryHint({ authUid: 'auth-a', app: false, stableId: 'stable-a' }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'app_check_required' });
    expect(reads).toEqual([]);
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

    await expect(runRecoveryHint({ authUid: 'auth-a', stableId: 'stable-a' })).resolves.toEqual({
      found: true,
      linked: true,
      provider: 'google',
      maskedEmail: 'pri***@example.com',
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
