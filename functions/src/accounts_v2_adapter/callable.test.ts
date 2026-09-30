import type { Firestore } from 'firebase-admin/firestore';
import { AccountsV2ApplyError, docIdFor, opDocIdFor, planBatchReads, validateClientBatch } from '../accounts_v2_apply_core';
import { accountsV2EntityPath, accountsV2OpPath } from './firestore_port';

/*
 * Account V2, Пакет 3A-srv — callable применения пакета синхронизации.
 *
 * зачем: обработчик — тонкая граница «auth → проверка → одна транзакция». Тесты
 * доказывают на фейковом Firestore (без эмулятора): без auth и с чужим uid в
 * пакете Firestore не трогается вовсе; ответ несёт serverNowMs; ошибки уходят
 * кодами без данных.
 * Ремонт №1 (TG-A09A44FE758E): лимит частоты ограничивает СТОИМОСТЬ — счётчик
 * читается первым отдельным tx.get, отказ стоит одно чтение, повторный отказ на
 * том же инстансе — ноль, «ядовитый» пакет тратит лимит; суточный предел;
 * коды ошибок делятся на окончательные и повторяемые.
 */

class FakeHttpsError extends Error {
  constructor(readonly code: string, message: string, readonly details?: unknown) {
    super(message);
  }
}

const registered: { options: Record<string, unknown>; handler: unknown }[] = [];

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (options: Record<string, unknown>, handler: unknown) => {
    registered.push({ options, handler });
    return handler;
  },
}));

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => {
    throw new Error('admin_firestore_must_not_be_used_in_tests');
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const callable = require('./callable') as typeof import('./callable');
const {
  ACCOUNTS_V2_BLOCK_CACHE_MAX, ACCOUNTS_V2_CLIENT_ERROR_CONTRACT, ACCOUNTS_V2_FAILURE_LIMIT, ACCOUNTS_V2_RATE_LIMIT,
  accountsV2ClientAction, accountsV2RatePath, handleAccountsV2Sync,
} = callable;

const UID = 'user-A';
const NOW = 1_790_000_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;

type Data = Record<string, unknown>;
type Ref = Readonly<{ path: string; id: string }>;

function createFakeFirestore() {
  const committed = new Map<string, Data>();
  const getAllCalls: string[][] = [];
  const getCalls: string[] = [];
  let attempts = 0;
  let commits = 0;
  let aborts = 0;
  let touched = 0;
  let reads = 0;
  let writes = 0;
  const snap = (item: Ref) => {
    const data = committed.get(item.path);
    return { ref: item, exists: data !== undefined, data: () => (data === undefined ? undefined : { ...data }) };
  };
  const db = {
    doc: (path: string): Ref => {
      touched += 1;
      return { path, id: path.split('/').pop() ?? '' };
    },
    async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      touched += 1;
      for (let round = 0; round < 5; round += 1) {
        attempts += 1;
        const staged = new Map<string, Data>();
        const tx = {
          async get(item: Ref) {
            getCalls.push(item.path);
            reads += 1;
            return snap(item);
          },
          async getAll(...refs: Ref[]) {
            getAllCalls.push(refs.map((item) => item.path));
            reads += refs.length;
            return refs.map(snap);
          },
          set(item: Ref, data: Data) {
            staged.set(item.path, { ...data });
            return tx;
          },
        };
        const result = await fn(tx);
        if (aborts > 0) {
          aborts -= 1;
          continue;
        }
        for (const [path, data] of staged) committed.set(path, data);
        writes += staged.size;
        commits += 1;
        return result;
      }
      throw new Error('fake_too_much_contention');
    },
  };
  return {
    db: db as unknown as Firestore,
    committed,
    getAllCalls,
    getCalls,
    attempts: () => attempts,
    commits: () => commits,
    touched: () => touched,
    reads: () => reads,
    writes: () => writes,
    abortNext: (count: number) => {
      aborts = count;
    },
  };
}

/** Firestore, у которого транзакция падает заданной ошибкой (сбой сети/сервера). */
function failingFirestore(error: unknown): Firestore {
  return {
    doc: (path: string): Ref => ({ path, id: path.split('/').pop() ?? '' }),
    runTransaction: async () => {
      throw error;
    },
  } as unknown as Firestore;
}

function lesson(operationId: string, entityId = 'l01', ownerUid = UID): Record<string, unknown> {
  return {
    ownerUid,
    operation: {
      schemaVersion: 1, operationId, entityType: 'lesson_progress', entityId,
      clientSequence: 1, baseRevision: null, payload: { passed: true, score: 80 },
    },
    // TG-DFA918464DFA: пакет клиента несёт оценку времени постановки.
    enqueuedAtServerMs: NOW,
  };
}

const batch = (...operations: Record<string, unknown>[]) => ({ batchId: 'batch-1', operations });

type Caught = Readonly<{ code: string; message: string; details?: unknown }>;

async function codeOf(promise: Promise<unknown>): Promise<Caught> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof FakeHttpsError) {
      return error.details === undefined
        ? { code: error.code, message: error.message }
        : { code: error.code, message: error.message, details: error.details };
    }
    throw error;
  }
  throw new Error('expected HttpsError');
}

let clock = NOW;
let blockCache = new Map<string, number>();
let rate: import('./callable').AccountsV2RateLimit = ACCOUNTS_V2_RATE_LIMIT;
let failureCache: Map<string, import('./callable').AccountsV2FailureRecord> = new Map();
let cacheMax = ACCOUNTS_V2_BLOCK_CACHE_MAX;
const deps = () => ({
  nowMs: () => clock, rate, blockCache, failure: ACCOUNTS_V2_FAILURE_LIMIT, failureCache, cacheMax,
});

let infoSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

beforeEach(() => {
  clock = NOW;
  blockCache = new Map<string, number>();
  rate = ACCOUNTS_V2_RATE_LIMIT;
  failureCache = new Map();
  cacheMax = ACCOUNTS_V2_BLOCK_CACHE_MAX;
  infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

function allLogs(): string {
  return [infoSpy, warnSpy, errorSpy].flatMap((spy) => spy.mock.calls.map((call) => call.join(' '))).join('\n');
}

const call = (db: Firestore, data: unknown, uid = UID) => handleAccountsV2Sync(db, { auth: { uid }, data }, deps());

async function fillWindow(fake: ReturnType<typeof createFakeFirestore>, count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) await call(fake.db, batch(lesson(`op-${index}`)));
}

describe('accounts_v2_callable: регистрация', () => {
  it('экспортируется одна callable с опциями проекта и без App Check', () => {
    expect(registered).toHaveLength(1);
    expect(registered[0].options.enforceAppCheck).toBe(false);
    expect(typeof callable.accountsV2SyncApply).toBe('function');
  });
});

describe('accounts_v2_callable: личность', () => {
  it('без auth — unauthenticated, Firestore не трогается', async () => {
    const fake = createFakeFirestore();
    const result = await codeOf(handleAccountsV2Sync(fake.db, { auth: undefined, data: batch(lesson('op-1')) }, deps()));
    expect(result).toEqual({ code: 'unauthenticated', message: 'auth_required', details: { final: false } });
    expect(fake.touched()).toBe(0);
    expect(allLogs()).toContain('[ACCOUNTS-V2]');
  });

  it('чужой ownerUid в пакете — permission-denied, Firestore не трогается', async () => {
    const fake = createFakeFirestore();
    const result = await codeOf(call(fake.db, batch(lesson('op-1'), lesson('op-2', 'l02', 'user-B'))));
    expect(result).toEqual({ code: 'permission-denied', message: 'uid_mismatch', details: { final: true, code: 'uid_mismatch' } });
    expect(fake.touched()).toBe(0);
    expect(fake.committed.size).toBe(0);
  });

  it('кривой пакет — invalid-argument с кодом проверки, без пути и данных', async () => {
    const fake = createFakeFirestore();
    const result = await codeOf(call(fake.db, { batchId: 'b', operations: [] }));
    expect(result).toEqual({ code: 'invalid-argument', message: 'batch_empty', details: { final: true, code: 'batch_empty' } });
    expect(fake.touched()).toBe(0);
  });

  // зачем (TG-DFA918464DFA): callable принимает только форму клиента — с оценкой
  // времени постановки; без неё пакет отклоняется целиком, до Firestore.
  it('операция без enqueuedAtServerMs — invalid-argument missing_field, Firestore не трогается', async () => {
    const fake = createFakeFirestore();
    const { enqueuedAtServerMs: _dropped, ...bare } = lesson('op-1');
    const result = await codeOf(call(fake.db, batch(bare)));
    expect(result).toEqual({ code: 'invalid-argument', message: 'missing_field', details: { final: true, code: 'missing_field' } });
    expect(fake.touched()).toBe(0);
  });

  it('старая операция — rejected operation_expired в ответе, квитанция не пишется', async () => {
    const fake = createFakeFirestore();
    const old = { ...lesson('op-old'), enqueuedAtServerMs: NOW - 171 * 24 * 60 * 60 * 1000 };
    const response = await call(fake.db, batch(old, lesson('op-1', 'l02')));
    expect(response).toEqual({
      receipts: [
        { operationId: 'op-old', outcome: 'rejected', code: 'operation_expired', serverRevision: 0 },
        { operationId: 'op-1', outcome: 'applied', serverRevision: 1 },
      ],
      serverNowMs: NOW,
    });
    expect(fake.committed.has(accountsV2OpPath(UID, opDocIdFor('op-old')))).toBe(false);
  });

  it('uid из custom token, непригодный для пути — failed-precondition до лимита и Firestore', async () => {
    const fake = createFakeFirestore();
    for (const uid of ['a/b', '..', '__x__']) {
      const result = await codeOf(call(fake.db, batch(lesson('op-1', 'l01', uid)), uid));
      expect(result).toEqual({
        code: 'failed-precondition', message: 'uid_not_path_safe', details: { final: true, code: 'uid_not_path_safe' },
      });
    }
    expect(fake.touched()).toBe(0);
    expect(allLogs()).not.toContain('__x__');
  });
});

describe('accounts_v2_callable: применение', () => {
  it('ответ — квитанции и serverNowMs (тот же nowMs, что ушёл в ядро)', async () => {
    const fake = createFakeFirestore();
    const response = await call(fake.db, batch(lesson('op-1')));
    expect(response).toEqual({
      receipts: [{ operationId: 'op-1', outcome: 'applied', serverRevision: 1 }],
      serverNowMs: NOW,
    });
    const entity = fake.committed.get(accountsV2EntityPath(UID, docIdFor('lesson_progress', 'l01')));
    expect(entity?.updatedAtMs).toBe(NOW);
  });

  it('счётчик читается ПЕРВЫМ отдельным tx.get, getAll — ровно план; чтений 1 + план, записей план + 1', async () => {
    const fake = createFakeFirestore();
    const data = batch(lesson('op-1'), lesson('op-2', 'l02'));
    await call(fake.db, data);
    const validated = validateClientBatch(data);
    if (!validated.ok) throw new Error('fixture');
    const plan = planBatchReads(validated.batch);
    const expected = [
      ...plan.operations.map(({ opDocId }) => accountsV2OpPath(UID, opDocId)),
      ...plan.entities.map(({ docId }) => accountsV2EntityPath(UID, docId)),
    ].sort();
    expect(fake.getCalls).toEqual([accountsV2RatePath(UID)]);
    expect(fake.getAllCalls).toHaveLength(1);
    expect([...fake.getAllCalls[0]].sort()).toEqual(expected);
    expect(fake.reads()).toBe(1 + expected.length);
    expect(fake.writes()).toBe(4 + 1);
    expect(accountsV2RatePath(UID)).toBe(`accounts_v2/${UID}/accounts_v2_meta/rate`);
  });

  it('«ядовитый» пакет (порча хранилища) — окончательный failed-precondition, коммитится ТОЛЬКО счётчик', async () => {
    const fake = createFakeFirestore();
    const entityPath = accountsV2EntityPath(UID, docIdFor('lesson_progress', 'l01'));
    const broken = {
      entityType: 'lesson_progress', entityIdJson: '"l01"', revision: 1, updatedAtMs: NOW,
      lastOperationIdJson: '"op-0"', stateJson: '{broken',
    };
    fake.committed.set(entityPath, broken);
    const result = await codeOf(call(fake.db, batch(lesson('op-1'))));
    expect(result).toEqual({
      code: 'failed-precondition', message: 'stored_state_corrupt', details: { final: true, code: 'stored_state_corrupt' },
    });
    expect(fake.commits()).toBe(1);
    expect(fake.writes()).toBe(1);
    expect(fake.committed.get(accountsV2RatePath(UID))).toMatchObject({ count: 1, dayCount: 1 });
    expect(fake.committed.get(entityPath)).toEqual(broken);
    expect(fake.committed.get(accountsV2OpPath(UID, opDocIdFor('op-1')))).toBeUndefined();
    expect(allLogs()).toContain('stored_state_corrupt');
  });

  it('«ядовитый» пакет по кругу упирается в лимит и дальше стоит одно чтение', async () => {
    const fake = createFakeFirestore();
    fake.committed.set(accountsV2EntityPath(UID, docIdFor('lesson_progress', 'l01')), {
      entityType: 'lesson_progress', entityIdJson: '"l01"', revision: 1, updatedAtMs: NOW,
      lastOperationIdJson: '"op-0"', stateJson: '{broken',
    });
    for (let index = 0; index < ACCOUNTS_V2_RATE_LIMIT.maxCalls; index += 1) {
      expect((await codeOf(call(fake.db, batch(lesson('op-1'))))).code).toBe('failed-precondition');
    }
    const readsBefore = fake.reads();
    const blocked = await codeOf(call(fake.db, batch(lesson('op-1'))));
    expect(blocked.code).toBe('resource-exhausted');
    expect(fake.reads() - readsBefore).toBe(1);
  });

  it('повтор транзакции Firestore — тот же ответ, счётчик +1 один раз', async () => {
    const once = createFakeFirestore();
    const retried = createFakeFirestore();
    const data = batch(lesson('op-1'), lesson('op-2', 'l02'));
    const expected = await call(once.db, data);
    retried.abortNext(1);
    const actual = await call(retried.db, data);
    expect(retried.attempts()).toBe(2);
    expect(actual).toEqual(expected);
    expect(retried.committed.get(accountsV2RatePath(UID))?.count).toBe(1);
    expect(retried.committed.get(accountsV2OpPath(UID, opDocIdFor('op-2')))).toBeDefined();
  });

  it('логи: префикс, число операций, uid только хэшем', async () => {
    const fake = createFakeFirestore();
    const uid = 'very-secret-uid-1234567890';
    await call(fake.db, batch(lesson('op-1', 'l01', uid)), uid);
    const logs = allLogs();
    expect(logs).toContain('[ACCOUNTS-V2]');
    expect(logs).toContain('ops=1');
    expect(logs).not.toContain(uid);
    expect(logs).not.toContain('l01');
  });
});

describe('accounts_v2_callable: лимит частоты ограничивает стоимость', () => {
  it('первый отказ: одно чтение, план не читается, пишется только блок; retryAfterMs в details', async () => {
    const fake = createFakeFirestore();
    const { maxCalls, windowMs } = ACCOUNTS_V2_RATE_LIMIT;
    await fillWindow(fake, maxCalls);
    const before = { reads: fake.reads(), writes: fake.writes(), getAll: fake.getAllCalls.length };
    const blocked = await codeOf(call(fake.db, batch(lesson('op-over', 'l77'))));
    expect(blocked).toEqual({ code: 'resource-exhausted', message: 'rate_limited', details: { final: false, retryAfterMs: windowMs } });
    expect(fake.reads() - before.reads).toBe(1);
    expect(fake.getAllCalls.length).toBe(before.getAll);
    expect(fake.writes() - before.writes).toBe(1);
    expect(fake.committed.get(accountsV2RatePath(UID))).toMatchObject({ count: maxCalls, blockedUntilMs: NOW + windowMs });
    expect(fake.committed.get(accountsV2OpPath(UID, opDocIdFor('op-over')))).toBeUndefined();
  });

  it('повторный отказ на том же инстансе — ноль обращений к Firestore', async () => {
    const fake = createFakeFirestore();
    await fillWindow(fake, ACCOUNTS_V2_RATE_LIMIT.maxCalls);
    await codeOf(call(fake.db, batch(lesson('op-over', 'l77'))));
    const touched = fake.touched();
    clock = NOW + 1000;
    const again = await codeOf(call(fake.db, batch(lesson('op-over', 'l77'))));
    expect(again).toEqual({
      code: 'resource-exhausted', message: 'rate_limited', details: { final: false, retryAfterMs: ACCOUNTS_V2_RATE_LIMIT.windowMs - 1000 },
    });
    expect(fake.touched()).toBe(touched);
  });

  it('отказ на другом инстансе (пустой кэш) — одно чтение, ноль записей: блок уже записан', async () => {
    const fake = createFakeFirestore();
    await fillWindow(fake, ACCOUNTS_V2_RATE_LIMIT.maxCalls);
    await codeOf(call(fake.db, batch(lesson('op-over', 'l77'))));
    blockCache = new Map<string, number>();
    const before = { reads: fake.reads(), writes: fake.writes() };
    expect((await codeOf(call(fake.db, batch(lesson('op-over', 'l77'))))).code).toBe('resource-exhausted');
    expect(fake.reads() - before.reads).toBe(1);
    expect(fake.writes() - before.writes).toBe(0);
  });

  it('новое окно снова пускает (кэш блока истёк)', async () => {
    const fake = createFakeFirestore();
    await fillWindow(fake, ACCOUNTS_V2_RATE_LIMIT.maxCalls);
    await codeOf(call(fake.db, batch(lesson('op-over', 'l77'))));
    clock = NOW + ACCOUNTS_V2_RATE_LIMIT.windowMs;
    const response = await call(fake.db, batch(lesson('op-over', 'l77')));
    expect(response.receipts[0].outcome).toBe('applied');
    expect(fake.committed.get(accountsV2RatePath(UID))).toMatchObject({
      windowStartMs: clock, count: 1, dayStartMs: NOW, dayCount: ACCOUNTS_V2_RATE_LIMIT.maxCalls + 1,
    });
  });

  it('суточный предел: при свободном минутном окне отказ до конца суток', async () => {
    rate = { windowMs: 60_000, maxCalls: 20, dayMs: DAY_MS, maxCallsPerDay: 3 };
    const fake = createFakeFirestore();
    for (let index = 0; index < 3; index += 1) {
      clock = NOW + index * 60_000;
      await call(fake.db, batch(lesson(`op-${index}`)));
    }
    clock = NOW + 10 * 60_000;
    const blocked = await codeOf(call(fake.db, batch(lesson('op-day', 'l09'))));
    expect(blocked).toEqual({
      code: 'resource-exhausted', message: 'rate_limited', details: { final: false, retryAfterMs: DAY_MS - 10 * 60_000 },
    });
    clock = NOW + DAY_MS;
    expect((await call(fake.db, batch(lesson('op-day', 'l09')))).receipts[0].outcome).toBe('applied');
  });

  it('суточный предел по умолчанию задан и больше минутного', () => {
    expect(ACCOUNTS_V2_RATE_LIMIT.dayMs).toBe(DAY_MS);
    expect(ACCOUNTS_V2_RATE_LIMIT.maxCallsPerDay).toBeGreaterThan(ACCOUNTS_V2_RATE_LIMIT.maxCalls);
    expect(ACCOUNTS_V2_RATE_LIMIT.maxCallsPerDay).toBeLessThan(
      ACCOUNTS_V2_RATE_LIMIT.maxCalls * (DAY_MS / ACCOUNTS_V2_RATE_LIMIT.windowMs),
    );
  });

  it('часы инстанса «назад» (age < 0) — то же окно, счётчик не обнуляется', async () => {
    const fake = createFakeFirestore();
    const { maxCalls, windowMs } = ACCOUNTS_V2_RATE_LIMIT;
    fake.committed.set(accountsV2RatePath(UID), {
      windowStartMs: NOW + 2000, count: maxCalls, dayStartMs: NOW + 2000, dayCount: maxCalls, blockedUntilMs: 0,
    });
    const blocked = await codeOf(call(fake.db, batch(lesson('op-1'))));
    expect(blocked).toEqual({ code: 'resource-exhausted', message: 'rate_limited', details: { final: false, retryAfterMs: windowMs + 2000 } });
  });

  it('окно «из далёкого будущего» (больше длины окна) — испорчено: новое окно', async () => {
    const fake = createFakeFirestore();
    const { maxCalls, windowMs } = ACCOUNTS_V2_RATE_LIMIT;
    fake.committed.set(accountsV2RatePath(UID), {
      windowStartMs: NOW + 2 * windowMs, count: maxCalls, dayStartMs: NOW, dayCount: 5, blockedUntilMs: 0,
    });
    const response = await call(fake.db, batch(lesson('op-1')));
    expect(response.receipts[0].outcome).toBe('applied');
    expect(fake.committed.get(accountsV2RatePath(UID))).toMatchObject({ windowStartMs: NOW, count: 1, dayCount: 6 });
    expect(allLogs()).toContain('rate_window_future');
  });

  it('лимит у каждого uid свой', async () => {
    const fake = createFakeFirestore();
    await fillWindow(fake, ACCOUNTS_V2_RATE_LIMIT.maxCalls);
    const other = await call(fake.db, batch(lesson('op-b', 'l01', 'user-B')), 'user-B');
    expect(other.receipts[0].outcome).toBe('applied');
  });

  it('испорченный счётчик не запирает пользователя: новое окно', async () => {
    const fake = createFakeFirestore();
    fake.committed.set(accountsV2RatePath(UID), { windowStartMs: 'x', count: -5 });
    const response = await call(fake.db, batch(lesson('op-1')));
    expect(response.receipts[0].outcome).toBe('applied');
    expect(fake.committed.get(accountsV2RatePath(UID))).toMatchObject({ windowStartMs: NOW, count: 1, dayCount: 1 });
    expect(allLogs()).toContain('rate_doc_invalid');
  });
});

describe('accounts_v2_callable: классификация ошибок (TEMP-контракт клиента, решение по details.final)', () => {
  const grpc = (code: number | string) => Object.assign(new Error('x /secret/path'), { code });
  const RETRYABLE = { code: 'unavailable', message: 'retryable', details: { final: false } };
  const retryableCases: readonly (readonly [string, unknown])[] = [
    ['gRPC INTERNAL(13)', grpc(13)],
    ['gRPC UNKNOWN(2)', grpc(2)],
    ['gRPC CANCELLED(1)', grpc(1)],
    ['gRPC ABORTED(10)', grpc(10)],
    ['gRPC UNAVAILABLE(14)', grpc(14)],
    ['gRPC DEADLINE_EXCEEDED(4)', grpc(4)],
    ['gRPC FAILED_PRECONDITION(9)', grpc(9)],
    ['строковый INTERNAL', grpc('INTERNAL')],
    ['неизвестный числовой код 99', grpc(99)],
    ['ошибка без кода', new Error('boom /secret/path')],
    ['не Error (строка)', 'boom /secret/path'],
    ['undefined', undefined],
    // Ремонт №3: временный вариант INVALID_ARGUMENT(3) — истёкшая транзакция.
    ['gRPC 3 «transaction has expired»', Object.assign(
      new Error('3 INVALID_ARGUMENT: The referenced Transaction has expired or is no longer valid. /secret/path'), { code: 3 })],
    ['строковый INVALID_ARGUMENT «transaction has expired»', Object.assign(
      new Error('Transaction has expired /secret/path'), { code: 'INVALID_ARGUMENT' })],
    // Ремонт №3: несовпадение размера getAll — аномалия SDK, не функция пакета.
    ['accounts_v2_getall_mismatch (аномалия SDK)', new Error('accounts_v2_getall_mismatch')],
  ];

  it.each(retryableCases)('%s → повторяемый unavailable, final:false', async (_name, error) => {
    const result = await codeOf(call(failingFirestore(error), batch(lesson('op-1'))));
    expect(result).toEqual(RETRYABLE);
    expect(allLogs()).not.toContain('/secret/path');
    expect(allLogs()).toContain('class=retryable');
  });

  it('текст сообщения истёкшей транзакции в лог не попадает (только класс)', async () => {
    const expired = Object.assign(new Error('The referenced transaction has expired SECRET-TX-ID'), { code: 3 });
    await codeOf(call(failingFirestore(expired), batch(lesson('op-1'))));
    const logs = allLogs();
    expect(logs).not.toMatch(/has expired/i);
    expect(logs).not.toContain('SECRET-TX-ID');
    expect(logs).toContain('grpc=invalid-argument');
  });

  const finalCases: readonly (readonly [string, unknown, string, string])[] = [
    ['gRPC INVALID_ARGUMENT(3)', grpc(3), 'failed-precondition', 'firestore_rejected'],
    ['строковый INVALID_ARGUMENT', grpc('INVALID_ARGUMENT'), 'failed-precondition', 'firestore_rejected'],
    ['gRPC 3 с посторонним «expired» (не транзакция)', Object.assign(new Error('field value expired'), { code: 3 }),
      'failed-precondition', 'firestore_rejected'],
    ['accounts_v2_port_key_outside_plan', new Error('accounts_v2_port_key_outside_plan'), 'failed-precondition', 'port_key_outside_plan'],
    ['ядро invalid_batch', new AccountsV2ApplyError('invalid_batch'), 'failed-precondition', 'invalid_batch'],
    ['ядро invalid_now', new AccountsV2ApplyError('invalid_now'), 'failed-precondition', 'invalid_now'],
    ['ядро stored_state_corrupt', new AccountsV2ApplyError('stored_state_corrupt'), 'failed-precondition', 'stored_state_corrupt'],
    ['ядро uid_mismatch', new AccountsV2ApplyError('uid_mismatch'), 'permission-denied', 'uid_mismatch'],
  ];

  it.each(finalCases)('%s → окончательный, final:true + машинный код', async (_name, error, code, message) => {
    const result = await codeOf(call(failingFirestore(error), batch(lesson('op-1'))));
    expect(result).toEqual({ code, message, details: { final: true, code: message } });
  });

  it('ядро unauthenticated → перелогин, final:false', async () => {
    const result = await codeOf(call(failingFirestore(new AccountsV2ApplyError('unauthenticated')), batch(lesson('op-1'))));
    expect(result).toEqual({ code: 'unauthenticated', message: 'auth_required', details: { final: false } });
  });

  it('gRPC RESOURCE_EXHAUSTED(8) — повторяемый resource-exhausted с retryAfterMs, final:false', async () => {
    const result = await codeOf(call(failingFirestore(grpc(8)), batch(lesson('op-1'))));
    expect(result).toEqual({
      code: 'resource-exhausted', message: 'firestore_quota',
      details: { final: false, retryAfterMs: ACCOUNTS_V2_RATE_LIMIT.windowMs },
    });
  });

  it('сервер сам НЕ отдаёт internal: ни один сбой не уходит голым internal', async () => {
    for (const [, error] of retryableCases) {
      expect((await codeOf(call(failingFirestore(error), batch(lesson('op-1'))))).code).not.toBe('internal');
      blockCache = new Map<string, number>();
      failureCache = new Map();
    }
  });

  it('контракт: группы не пересекаются, решение по details.final, потолок 5', () => {
    const { final, retryable, reauth, decideBy, maxAttempts } = ACCOUNTS_V2_CLIENT_ERROR_CONTRACT;
    const all = [...final, ...retryable, ...reauth];
    expect(new Set(all).size).toBe(all.length);
    expect([...final].sort()).toEqual(['failed-precondition', 'invalid-argument', 'permission-denied']);
    expect([...retryable].sort()).toEqual(['internal', 'resource-exhausted', 'unavailable']);
    expect([...reauth]).toEqual(['unauthenticated']);
    expect(decideBy).toBe('details.final');
    expect(maxAttempts).toBe(5);
    for (const [, , code] of finalCases) expect(final).toContain(code);
  });

  it('эталон клиента: final:true → карантин сразу; нет final / false / голый internal → повтор до потолка', () => {
    // зачем (TG-7CD73967EF61): потолок = И ≥5 неудач, И ≥24 ч с первой неудачи.
    const DAY = ACCOUNTS_V2_CLIENT_ERROR_CONTRACT.minFailureSpanMs;
    expect(accountsV2ClientAction({ code: 'failed-precondition', details: { final: true, code: 'x' } }, 1, 0)).toBe('quarantine');
    expect(accountsV2ClientAction({ code: 'invalid-argument', details: { final: true } }, 1, 0)).toBe('quarantine');
    // Голый HTTP 500 (таймаут/OOM функции) — internal без details: повторяемый.
    expect(accountsV2ClientAction({ code: 'internal' }, 1, DAY)).toBe('retry');
    expect(accountsV2ClientAction({ code: 'internal', details: null }, 4, DAY)).toBe('retry');
    expect(accountsV2ClientAction({ code: 'internal' }, 5, DAY)).toBe('quarantine');
    expect(accountsV2ClientAction({ code: 'unavailable', details: { final: false } }, 4, DAY)).toBe('retry');
    expect(accountsV2ClientAction({ code: 'unavailable', details: { final: false } }, 5, DAY)).toBe('quarantine');
    // Короткий офлайн: 5 быстрых неудач меньше суток — НЕ карантин.
    expect(accountsV2ClientAction({ code: 'unavailable', details: { final: false } }, 5, 15_000)).toBe('retry');
    expect(accountsV2ClientAction({ code: 'unavailable', details: { final: false } }, 50, DAY - 1)).toBe('retry');
    // Код «окончательной» группы без метки — всё равно повтор: решает только метка.
    expect(accountsV2ClientAction({ code: 'failed-precondition' }, 1, DAY)).toBe('retry');
    expect(accountsV2ClientAction({ code: 'failed-precondition', details: { final: 'true' } }, 1, DAY)).toBe('retry');
    expect(accountsV2ClientAction({ code: 'unauthenticated', details: { final: false } }, 9, DAY)).toBe('reauth');
  });

  it('эталон клиента: resource-exhausted с retryAfterMs — ожидание, а не неудача: потолок попыток не расходует', () => {
    const DAY = ACCOUNTS_V2_CLIENT_ERROR_CONTRACT.minFailureSpanMs;
    const wait = { code: 'resource-exhausted', details: { final: false, retryAfterMs: 30_000 } };
    expect((ACCOUNTS_V2_CLIENT_ERROR_CONTRACT as unknown as Record<string, unknown>).retryAfterConsumesAttempt).toBe(false);
    expect(accountsV2ClientAction(wait, 1, DAY)).toBe('retry');
    expect(accountsV2ClientAction(wait, ACCOUNTS_V2_CLIENT_ERROR_CONTRACT.maxAttempts, DAY)).toBe('retry');
    expect(accountsV2ClientAction(wait, 50, DAY)).toBe('retry');
    // Без валидного retryAfterMs — обычная повторяемая неудача, потолок действует.
    expect(accountsV2ClientAction({ code: 'resource-exhausted', details: { final: false } }, 5, DAY)).toBe('quarantine');
    expect(accountsV2ClientAction({ code: 'resource-exhausted', details: { final: false, retryAfterMs: 0 } }, 5, DAY)).toBe('quarantine');
    expect(accountsV2ClientAction({ code: 'resource-exhausted', details: { final: false, retryAfterMs: '30' } }, 5, DAY)).toBe('quarantine');
    // retryAfterMs у другого кода — не ожидание.
    expect(accountsV2ClientAction({ code: 'unavailable', details: { final: false, retryAfterMs: 1000 } }, 5, DAY)).toBe('quarantine');
  });

  it('контракт клиента: сутки до карантина по потолку, карантин по потолку возвратный', () => {
    expect(ACCOUNTS_V2_CLIENT_ERROR_CONTRACT.minFailureSpanMs).toBe(24 * 60 * 60 * 1000);
    expect(ACCOUNTS_V2_CLIENT_ERROR_CONTRACT.attemptsExhaustedRequeue).toBe(true);
  });
});

describe('accounts_v2_callable: учёт повторяемых неудач в памяти инстанса (P3)', () => {
  const internal13 = () => failingFirestore(Object.assign(new Error('x'), { code: 13 }));

  it('K подряд повторяемых сбоев одного uid — короткий блок, дальше ноль обращений к Firestore', async () => {
    const { maxConsecutive, blockMs } = ACCOUNTS_V2_FAILURE_LIMIT;
    for (let index = 1; index < maxConsecutive; index += 1) {
      expect((await codeOf(call(internal13(), batch(lesson('op-1'))))).code).toBe('unavailable');
    }
    const blocked = await codeOf(call(internal13(), batch(lesson('op-1'))));
    expect(blocked).toEqual({
      code: 'resource-exhausted', message: 'failure_backoff', details: { final: false, retryAfterMs: blockMs },
    });
    expect(allLogs()).toContain('failure_backoff');
    const fake = createFakeFirestore();
    clock = NOW + 1000;
    const again = await codeOf(call(fake.db, batch(lesson('op-1'))));
    expect(again).toEqual({ code: 'resource-exhausted', message: 'rate_limited', details: { final: false, retryAfterMs: blockMs - 1000 } });
    expect(fake.touched()).toBe(0);
    clock = NOW + blockMs;
    expect((await call(fake.db, batch(lesson('op-1')))).receipts[0].outcome).toBe('applied');
  });

  it('успех обнуляет серию; другой uid не страдает; окно истекло — серия заново', async () => {
    const { maxConsecutive, windowMs } = ACCOUNTS_V2_FAILURE_LIMIT;
    for (let index = 1; index < maxConsecutive; index += 1) await codeOf(call(internal13(), batch(lesson('op-1'))));
    await call(createFakeFirestore().db, batch(lesson('op-1')));
    for (let index = 1; index < maxConsecutive; index += 1) {
      expect((await codeOf(call(internal13(), batch(lesson('op-1'))))).code).toBe('unavailable');
    }
    const other = await codeOf(call(internal13(), batch(lesson('op-b', 'l01', 'user-B')), 'user-B'));
    expect(other.code).toBe('unavailable');
    clock = NOW + windowMs;
    expect((await codeOf(call(internal13(), batch(lesson('op-1'))))).code).toBe('unavailable');
  });

  it('окончательные отказы, откатившие счётчик, КОПЯТ серию: клиент, игнорирующий final, не крутится бесплатно', async () => {
    // Ремонт №3: gRPC 3 откатывает транзакцию вместе со счётчиком частоты.
    const { maxConsecutive, blockMs } = ACCOUNTS_V2_FAILURE_LIMIT;
    const rejected = () => failingFirestore(Object.assign(new Error('x'), { code: 3 }));
    for (let index = 1; index <= maxConsecutive; index += 1) {
      const result = await codeOf(call(rejected(), batch(lesson('op-1'))));
      // Ответ остаётся окончательным: честный клиент кладёт пакет в карантин с первого раза.
      expect(result).toEqual({
        code: 'failed-precondition', message: 'firestore_rejected', details: { final: true, code: 'firestore_rejected' },
      });
    }
    expect(allLogs()).toContain('failure_backoff');
    const fake = createFakeFirestore();
    clock = NOW + 1000;
    const again = await codeOf(call(fake.db, batch(lesson('op-1'))));
    expect(again).toEqual({ code: 'resource-exhausted', message: 'rate_limited', details: { final: false, retryAfterMs: blockMs - 1000 } });
    expect(fake.touched()).toBe(0);
  });

  it('окончательные и повторяемые неудачи копят ОДНУ серию', async () => {
    const { maxConsecutive } = ACCOUNTS_V2_FAILURE_LIMIT;
    for (let index = 1; index < maxConsecutive; index += 1) {
      await codeOf(call(failingFirestore(Object.assign(new Error('x'), { code: index % 2 === 0 ? 3 : 13 })), batch(lesson('op-1'))));
    }
    expect(failureCache.get(UID)).toEqual({ count: maxConsecutive - 1, firstMs: NOW });
    const last = await codeOf(call(internal13(), batch(lesson('op-1'))));
    expect(last.message).toBe('failure_backoff');
  });

  it('ошибки ядра, оплаченные записью счётчика, серию не копят', async () => {
    for (let index = 0; index < ACCOUNTS_V2_FAILURE_LIMIT.maxConsecutive + 2; index += 1) {
      const result = await codeOf(call(failingFirestore(new AccountsV2ApplyError('stored_state_corrupt')), batch(lesson('op-1'))));
      expect(result.code).toBe('failed-precondition');
    }
    expect(failureCache.size).toBe(0);
    expect(blockCache.size).toBe(0);
  });

  it('часы инстанса «назад» (nowMs < firstMs) — серия начинается заново, блока нет', async () => {
    const { maxConsecutive } = ACCOUNTS_V2_FAILURE_LIMIT;
    for (let index = 1; index < maxConsecutive; index += 1) await codeOf(call(internal13(), batch(lesson('op-1'))));
    expect(failureCache.get(UID)).toEqual({ count: maxConsecutive - 1, firstMs: NOW });
    clock = NOW - 1000;
    const result = await codeOf(call(internal13(), batch(lesson('op-1'))));
    expect(result.code).toBe('unavailable');
    expect(failureCache.get(UID)).toEqual({ count: 1, firstMs: NOW - 1000 });
    expect(blockCache.size).toBe(0);
  });

  it('параметры: K > 1, блок короче окна лимита частоты', () => {
    expect(ACCOUNTS_V2_FAILURE_LIMIT.maxConsecutive).toBeGreaterThan(1);
    expect(ACCOUNTS_V2_FAILURE_LIMIT.blockMs).toBeLessThanOrEqual(ACCOUNTS_V2_RATE_LIMIT.windowMs);
  });
});

describe('accounts_v2_callable: вытеснение кэшей инстанса', () => {
  it('кэш блоков полон живыми блоками — вытесняется самый старый, warn с размером', async () => {
    cacheMax = 2;
    const fake = createFakeFirestore();
    const { maxCalls } = ACCOUNTS_V2_RATE_LIMIT;
    for (const uid of ['u1', 'u2', 'u3']) {
      fake.committed.set(accountsV2RatePath(uid), {
        windowStartMs: NOW, count: maxCalls, dayStartMs: NOW, dayCount: maxCalls, blockedUntilMs: 0,
      });
      expect((await codeOf(call(fake.db, batch(lesson('op-1', 'l01', uid)), uid))).code).toBe('resource-exhausted');
      expect(blockCache.size).toBeLessThanOrEqual(2);
    }
    expect([...blockCache.keys()]).toEqual(['u2', 'u3']);
    expect(allLogs()).toMatch(/cache_evict kind=block size=2 max=2/);
  });

  it('истёкшие блоки чистятся раньше вытеснения живых (без warn)', async () => {
    cacheMax = 2;
    blockCache.set('old-1', NOW - 1);
    blockCache.set('old-2', NOW - 1);
    const fake = createFakeFirestore();
    const { maxCalls } = ACCOUNTS_V2_RATE_LIMIT;
    fake.committed.set(accountsV2RatePath(UID), {
      windowStartMs: NOW, count: maxCalls, dayStartMs: NOW, dayCount: maxCalls, blockedUntilMs: 0,
    });
    await codeOf(call(fake.db, batch(lesson('op-1'))));
    expect([...blockCache.keys()]).toEqual([UID]);
    expect(allLogs()).not.toContain('cache_evict');
  });

  it('кэш серий неудач тоже ограничен: вытеснение с warn', async () => {
    cacheMax = 2;
    const failing = failingFirestore(Object.assign(new Error('x'), { code: 14 }));
    for (const uid of ['f1', 'f2', 'f3']) {
      await codeOf(call(failing, batch(lesson('op-1', 'l01', uid)), uid));
      expect(failureCache.size).toBeLessThanOrEqual(2);
    }
    expect([...failureCache.keys()]).toEqual(['f2', 'f3']);
    expect(allLogs()).toMatch(/cache_evict kind=failure size=2 max=2/);
  });

  it('потолок по умолчанию задан', () => {
    expect(ACCOUNTS_V2_BLOCK_CACHE_MAX).toBe(10_000);
  });
});

describe('accounts_v2_callable: серверный флаг (Пакет 6A)', () => {
  const flagsOf = (value: { ok: boolean; syncEnabled: boolean }) => ({
    read: jest.fn(async () => ({ ok: value.ok, flags: { syncEnabled: value.syncEnabled, deletionPurgeEnabled: false, everEnabled: value.syncEnabled } })),
  });

  it('флаг выключен — окончательный accounts_v2_disabled, Firestore данных не трогается', async () => {
    const fake = createFakeFirestore();
    const flags = flagsOf({ ok: true, syncEnabled: false });
    const result = await codeOf(callable.handleAccountsV2SyncGated(fake.db, { auth: { uid: UID }, data: batch(lesson('op-1')) }, flags, deps()));
    expect(result).toEqual({
      code: 'failed-precondition',
      message: 'accounts_v2_disabled',
      details: { final: true, code: 'accounts_v2_disabled' },
    });
    expect(fake.touched()).toBe(0);
    expect(flags.read).toHaveBeenCalledTimes(1);
    expect(allLogs()).toContain('reason=accounts_v2_disabled');
  });

  it('флаг выключен — отказ раньше auth (даже без входа ноль чтений данных)', async () => {
    const fake = createFakeFirestore();
    const result = await codeOf(callable.handleAccountsV2SyncGated(
      fake.db, { auth: undefined, data: null }, flagsOf({ ok: true, syncEnabled: false }), deps(),
    ));
    expect(result.message).toBe('accounts_v2_disabled');
    expect(fake.touched()).toBe(0);
  });

  it('флаг не прочитан — повторяемая ошибка, ноль чтений данных', async () => {
    const fake = createFakeFirestore();
    const result = await codeOf(callable.handleAccountsV2SyncGated(
      fake.db, { auth: { uid: UID }, data: batch(lesson('op-1')) }, flagsOf({ ok: false, syncEnabled: true }), deps(),
    ));
    expect(result).toEqual({ code: 'unavailable', message: 'retryable', details: { final: false } });
    expect(fake.touched()).toBe(0);
  });

  it('флаг включён — обычное применение', async () => {
    const fake = createFakeFirestore();
    const response = await callable.handleAccountsV2SyncGated(
      fake.db, { auth: { uid: UID }, data: batch(lesson('op-1')) }, flagsOf({ ok: true, syncEnabled: true }), deps(),
    );
    expect(response.serverNowMs).toBe(NOW);
    expect(response.receipts).toHaveLength(1);
    expect(fake.touched()).toBeGreaterThan(0);
  });
});
