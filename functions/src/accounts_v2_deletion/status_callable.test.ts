import type { Firestore } from 'firebase-admin/firestore';

/*
 * Account V2, Пакет 6A — callable статуса удаления по ключу.
 * зачем: флаг выключен → ноль обращений к данным; бюджет толчка — из таймаута;
 * ключ лимита промахов — хэш, без uid/адреса; App Check не включён (пломба).
 */

class FakeHttpsError extends Error {
  constructor(readonly code: string, message: string, readonly details?: unknown) {
    super(message);
  }
}

const registered: { options: Record<string, unknown> }[] = [];

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (options: Record<string, unknown>, handler: unknown) => {
    registered.push({ options });
    return handler;
  },
}));

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => {
    throw new Error('admin_firestore_must_not_be_used_in_tests');
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const module_ = require('./status_callable') as typeof import('./status_callable');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createDeletionProbeLimiter } = require('./deletion_flow') as typeof import('./deletion_flow');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ACCOUNT_DELETE_JOBS } = require('../account_delete_job') as typeof import('../account_delete_job');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ACCOUNTS_V2_DELETION_JOBS_COLLECTION } = require('./pipeline_firestore') as typeof import('./pipeline_firestore');

const UID = 'CallerUid1234567890abcdefgh';
const IP = '203.0.113.7';

function untouchableDb(): { db: Firestore; touched: () => number } {
  let touched = 0;
  const db = new Proxy({}, {
    get() {
      touched += 1;
      throw new Error('firestore_must_not_be_touched');
    },
  }) as unknown as Firestore;
  return { db, touched: () => touched };
}

const flagsOf = (ok: boolean, deletionPurgeEnabled: boolean) => ({
  read: jest.fn(async () => ({ ok, flags: { syncEnabled: false, deletionPurgeEnabled, everEnabled: deletionPurgeEnabled } })),
});

async function caught(promise: Promise<unknown>): Promise<{ code: string; message: string; details?: unknown }> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof FakeHttpsError) return { code: error.code, message: error.message, details: error.details };
    throw error;
  }
  throw new Error('expected_rejection');
}

beforeEach(() => {
  for (const level of ['log', 'info', 'warn', 'error'] as const) jest.spyOn(console, level).mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('accountsV2DeletionStatus: регистрация', () => {
  it('одна callable, без App Check, мало инстансов, таймаут 60 с', () => {
    expect(registered).toHaveLength(1);
    expect(registered[0].options).toMatchObject({ enforceAppCheck: false, maxInstances: 10, timeoutSeconds: 60 });
    expect(typeof module_.accountsV2DeletionStatus).toBe('function');
  });

  it('коллекция задач совпадает с конвейером удаления', () => {
    expect(ACCOUNTS_V2_DELETION_JOBS_COLLECTION).toBe(ACCOUNT_DELETE_JOBS);
  });
});

describe('accountsV2DeletionStatus: серверный флаг', () => {
  it('выключен — окончательный accounts_v2_disabled, Firestore не трогается', async () => {
    const { db, touched } = untouchableDb();
    const status = jest.fn();
    const result = await caught(module_.handleAccountsV2DeletionStatus(db, { auth: null, data: { nudge: true }, ip: IP }, {
      flags: flagsOf(true, false), limiter: createDeletionProbeLimiter(), status,
    }));
    expect(result).toEqual({ code: 'failed-precondition', message: 'accounts_v2_disabled', details: { final: true, code: 'accounts_v2_disabled' } });
    expect(status).not.toHaveBeenCalled();
    expect(touched()).toBe(0);
  });

  it('не прочитан — повторяемая ошибка, Firestore не трогается', async () => {
    const { db, touched } = untouchableDb();
    const status = jest.fn();
    const result = await caught(module_.handleAccountsV2DeletionStatus(db, { data: {} }, {
      flags: flagsOf(false, true), limiter: createDeletionProbeLimiter(), status,
    }));
    expect(result).toEqual({ code: 'unavailable', message: 'retryable', details: { final: false } });
    expect(status).not.toHaveBeenCalled();
    expect(touched()).toBe(0);
  });

  it('включён — тело статуса получает бюджет из таймаута и хэш-ключ лимита', async () => {
    const { db } = untouchableDb();
    const status = jest.fn(async () => ({ stage: 'purging' as const }));
    const limiter = createDeletionProbeLimiter();
    const result = await module_.handleAccountsV2DeletionStatus(db, { auth: { uid: UID }, data: { nudge: true, purpose: 'deletion_status' }, ip: IP }, {
      flags: flagsOf(true, true), limiter, status,
    });
    expect(result).toEqual({ stage: 'purging' });
    const [, data, options] = status.mock.calls[0] as unknown as [unknown, unknown, { nudge: boolean; maxCommits: number; probe: { keys: string[]; limiter: unknown } }];
    expect(data).toMatchObject({ purpose: 'deletion_status' });
    expect(options.nudge).toBe(true);
    expect(options.maxCommits).toBe(26);
    expect(options.probe.limiter).toBe(limiter);
    expect(options.probe.keys).toHaveLength(3);
    for (const probeKey of options.probe.keys) {
      expect(probeKey).toMatch(/^[0-9a-f]{24}$/);
      expect(probeKey).not.toContain(UID);
    }
  });

  it('без nudge:true — только статус; ключ лимита зависит от вызывающего', async () => {
    const { db } = untouchableDb();
    const status = jest.fn(async () => ({ stage: 'accepted' as const }));
    await module_.handleAccountsV2DeletionStatus(db, { data: { nudge: 'yes' }, ip: IP }, {
      flags: flagsOf(true, true), limiter: createDeletionProbeLimiter(), status,
    });
    const options = (status.mock.calls[0] as unknown as [unknown, unknown, { nudge: boolean }])[2];
    expect(options.nudge).toBe(false);
    const keysOf = module_.accountsV2DeletionProbeKeys;
    // Разные адреса одной /24 — разный ключ адреса, но ОБЩИЙ ключ сети.
    const a = keysOf({ data: {}, ip: '203.0.113.7' });
    const b = keysOf({ data: {}, ip: '203.0.113.99' });
    expect(a[0]).not.toBe(b[0]);
    expect(a[1]).toBe(b[1]);
    expect(keysOf({ data: {}, ip: '198.51.100.1' })[1]).not.toBe(a[1]);
    // Ремонт №2: первые записи X-Forwarded-For подделывает клиент — ключ берётся
    // из ПОСЛЕДНЕЙ (её ставит фронт Google); случайная подделка ключ не меняет.
    for (let index = 0; index < 20; index += 1) {
      const spoofed = `${index}.${index * 7 % 256}.${index * 13 % 256}.${index}`;
      expect(keysOf({ data: {}, ip: '10.0.0.1', forwardedFor: `${spoofed}, 203.0.113.7` })).toEqual(a);
    }
    expect(keysOf({ data: {}, ip: '203.0.113.7', forwardedFor: '' })).toEqual(a);
    // IPv6 — сеть /64.
    expect(keysOf({ data: {}, ip: '2001:db8:1:2::5' })[1]).toBe(keysOf({ data: {}, ip: '2001:db8:1:2:ffff::9' })[1]);
    expect(keysOf({ auth: { uid: UID }, data: {}, ip: IP })).toHaveLength(3);
    expect(keysOf({ data: {} })).toHaveLength(1);
  });
});
