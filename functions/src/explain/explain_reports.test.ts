export {};

/**
 * Тесты бэкстоп-модерации submitExplainReport.
 *
 * In-memory firestore fake — по образцу client_reports.test.ts (поддерживает tx.get/set/create
 * и collection().where().limit().get()), РАСШИРЕН оптимистической блокировкой по версии документа:
 * runTransaction повторяет колбэк, если прочитанный документ изменился между read и commit —
 * как настоящий Firestore. Это делает тест «параллельные репорты не проскакивают порог»
 * реальным (один из двух конкурентов перечитает и не двойного-инкрементит), а не декорацией.
 */

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
// Версия каждого документа — растёт при любой записи. Транзакция фиксирует версии прочитанных
// документов и откатывается + повторяется, если на момент коммита версия изменилась.
const versions = new Map<string, number>();
let autoId = 0;

function bump(path: string): void {
  versions.set(path, (versions.get(path) ?? 0) + 1);
}

function writeDoc(path: string, data: DocData, merge?: boolean): void {
  docs.set(path, merge ? { ...(docs.get(path) ?? {}), ...data } : { ...data });
  bump(path);
}

function refFor(path: string): FakeRef {
  const id = path.split('/').pop() || path;
  return {
    id,
    path,
    get: async () => snapFor(path),
    set: async (data: DocData, opts?: { merge?: boolean }) => writeDoc(path, data, opts?.merge),
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

function collectionDocs(name: string): Array<{ id: string; path: string; data: DocData }> {
  const prefix = `${name}/`;
  return Array.from(docs.entries())
    .filter(([docPath]) => docPath.startsWith(prefix) && !docPath.slice(prefix.length).includes('/'))
    .map(([docPath, data]) => ({ id: docPath.slice(prefix.length), path: docPath, data }));
}

// Глобальный «commit lock»: настоящий Firestore даёт serializable-изоляцию транзакций.
// Моделируем это очередью — каждая попытка транзакции (read+check+commit) выполняется,
// не перемежаясь с другой. Версионный retry остаётся вторичной защитой.
let txChain: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = txChain.then(task, task);
  // Звено цепочки не должно «застревать» на ошибке — гасим, реальную ошибку вернёт next.
  txChain = next.then(() => undefined, () => undefined);
  return next;
}

function fakeDb() {
  return {
    collection: (name: string) => ({
      doc: (id?: string) => refFor(`${name}/${id || `auto-${++autoId}`}`),
      where: (field: string, op: string, value: unknown) => {
        if (op !== '==') throw new Error(`unsupported op ${op}`);
        return {
          limit: (count: number) => ({
            get: async () => {
              const matches = collectionDocs(name)
                .filter((doc) => doc.data[field] === value)
                .slice(0, count)
                .map((doc) => ({ id: doc.id, exists: true, data: () => doc.data }));
              return { empty: matches.length === 0, docs: matches };
            },
          }),
        };
      },
    }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<FakeSnap>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
      create: (ref: FakeRef, data: DocData) => void;
    }) => Promise<T>): Promise<T> => {
      for (let attempt = 0; attempt < 16; attempt += 1) {
        // Каждую попытку выполняем под глобальным lock'ом → две транзакции не перемежаются
        // (serializable). read+conflict-check+commit — один непрерывный критический участок.
        const outcome = await serialize(async (): Promise<
          { committed: true; value: T } | { committed: false }
        > => {
          const readVersions = new Map<string, number>();
          const writes: Array<() => void> = [];
          const run = await fn({
            get: async (ref: FakeRef) => {
              readVersions.set(ref.path, versions.get(ref.path) ?? 0);
              return ref.get();
            },
            set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
              writes.push(() => writeDoc(ref.path, data, opts?.merge));
            },
            create: (ref: FakeRef, data: DocData) => {
              writes.push(() => {
                if (docs.has(ref.path)) throw new Error('already exists');
                writeDoc(ref.path, data);
              });
            },
          });

          // Конфликт-чек: если версия любого прочитанного документа изменилась — повтор.
          for (const [path, ver] of readVersions) {
            if ((versions.get(path) ?? 0) !== ver) return { committed: false };
          }
          writes.forEach((write) => write());
          return { committed: true, value: run };
        });

        if (outcome.committed) return outcome.value;
      }
      throw new Error('transaction_retries_exhausted');
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

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));

jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => fakeDb());
  (firestore as unknown as { FieldValue: Record<string, unknown> }).FieldValue = {
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
  };
  return { firestore };
});

// Хэш считаем тем же каноническим способом, что и CF — чтобы проверять doc id'ы кэша/счётчика.
const { phraseHashFor } = require('./explain_cache');
const {
  submitExplainReport,
  REPORT_REJECT_THRESHOLD,
  REPORT_RATE_MAX,
  REPORTS_COLLECTION,
} = require('./explain_reports');
const EXPLAIN_COLLECTION = 'phrase_explanations';

const PHRASE = 'Break a leg';
const HASH = phraseHashFor(PHRASE, 'ru');

async function callReport(data: DocData, authUid = 'auth-reporter') {
  return submitExplainReport({ auth: { uid: authUid }, data });
}

function counterDoc(): DocData | undefined {
  return docs.get(`${REPORTS_COLLECTION}/${HASH}`);
}

function cacheDoc(): DocData | undefined {
  return docs.get(`${EXPLAIN_COLLECTION}/${HASH}`);
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-09T12:00:00.000Z'));
  docs.clear();
  versions.clear();
  autoId = 0;
  // resolveStableUidForAuth: users/{authUid} существует → возвращает authUid сразу,
  // без .where()/linkStableAuthUid (изолируем тест от identity-логики).
  docs.set('users/auth-reporter', { firebaseAuthUid: 'auth-reporter' });
  for (let i = 0; i < 8; i += 1) docs.set(`users/auth-r${i}`, { firebaseAuthUid: `auth-r${i}` });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('submitExplainReport — auth & validation', () => {
  test('rejects unauthenticated callers', async () => {
    await expect(submitExplainReport({ data: { phraseEn: PHRASE } })).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  test('rejects empty phrase', async () => {
    await expect(callReport({ phraseEn: '   ' })).rejects.toMatchObject({
      code: 'invalid-argument',
      message: 'phrase_required',
    });
  });
});

describe('submitExplainReport — per-user rate limit (copied scaffold)', () => {
  test('allows REPORT_RATE_MAX reports then throws resource-exhausted', async () => {
    // Каждый репорт от ОДНОГО юзера на РАЗНЫЕ фразы (чтобы порог авто-reject не мешал).
    for (let i = 0; i < REPORT_RATE_MAX; i += 1) {
      await callReport({ phraseEn: `phrase number ${i}` });
    }
    await expect(callReport({ phraseEn: 'one more phrase' })).rejects.toMatchObject({
      code: 'resource-exhausted',
      message: 'rate_limited',
    });
  });
});

describe('submitExplainReport — per-(phrase,lang) counter', () => {
  test('репорт с lang=es бьёт в ДРУГОЙ счётчик, чем ru (кэш per-(phrase,lang))', async () => {
    await callReport({ phraseEn: PHRASE, lang: 'es' }, 'auth-r0');
    const esHash = phraseHashFor(PHRASE, 'es');
    expect(esHash).not.toBe(HASH); // ru-хэш
    expect(docs.get(`${REPORTS_COLLECTION}/${esHash}`)).toMatchObject({ reportCount: 1 });
    expect(counterDoc()).toBeUndefined(); // ru-счётчик не тронут
  });

  test('репорт БЕЗ lang падает в ru (тот же резолвер, что генерация)', async () => {
    await callReport({ phraseEn: PHRASE }, 'auth-r0');
    expect(counterDoc()).toMatchObject({ phraseHash: HASH, reportCount: 1 });
  });
});

describe('submitExplainReport — per-hash counter', () => {
  test('increments the per-hash report counter across distinct users', async () => {
    await callReport({ phraseEn: PHRASE }, 'auth-r0');
    expect(counterDoc()).toMatchObject({ phraseHash: HASH, reportCount: 1 });

    await callReport({ phraseEn: PHRASE }, 'auth-r1');
    expect(counterDoc()).toMatchObject({ reportCount: 2 });

    await callReport({ phraseEn: PHRASE }, 'auth-r2');
    expect(counterDoc()).toMatchObject({ reportCount: 3 });
  });

  test('counts case/punctuation-variant phrases under one hash (server normalization)', async () => {
    await callReport({ phraseEn: 'Break a leg' }, 'auth-r0');
    await callReport({ phraseEn: '  break a LEG!! ' }, 'auth-r1');
    // Обе формы → один phraseHash → один счётчик.
    expect(counterDoc()).toMatchObject({ reportCount: 2 });
  });
});

describe('submitExplainReport — threshold auto-reject (NET-NEW logic)', () => {
  test('flips cache status to rejected exactly on the Nth report, in the same tx', async () => {
    // Сидируем готовый кэш, чтобы было что отклонять.
    docs.set(`${EXPLAIN_COLLECTION}/${HASH}`, {
      status: 'ready',
      schemaVersion: 2,
      text: 'a fine explanation',
    });

    for (let i = 0; i < REPORT_REJECT_THRESHOLD - 1; i += 1) {
      const res = await callReport({ phraseEn: PHRASE }, `auth-r${i}`);
      expect(res).toMatchObject({ flipped: false, rejected: false });
      expect(cacheDoc()).toMatchObject({ status: 'ready' }); // ещё не отклонено
    }

    // N-й (=REPORT_REJECT_THRESHOLD) репорт переключает статус В ТОЙ ЖЕ tx, что инкремент.
    const final = await callReport({ phraseEn: PHRASE }, `auth-r${REPORT_REJECT_THRESHOLD - 1}`);
    expect(final).toMatchObject({ reportCount: REPORT_REJECT_THRESHOLD, flipped: true, rejected: true });
    expect(cacheDoc()).toMatchObject({ status: 'rejected', reason: 'report_threshold' });
  });

  test('does NOT regenerate — rejected entry stays rejected on further reports', async () => {
    for (let i = 0; i < REPORT_REJECT_THRESHOLD; i += 1) {
      await callReport({ phraseEn: PHRASE }, `auth-r${i}`);
    }
    expect(cacheDoc()).toMatchObject({ status: 'rejected' });

    // Ещё один репорт: счётчик растёт, статус остаётся rejected (никакого сброса в pending),
    // повторного флипа НЕТ (flipped=false).
    const extra = await callReport({ phraseEn: PHRASE }, `auth-r${REPORT_REJECT_THRESHOLD}`);
    expect(extra).toMatchObject({ reportCount: REPORT_REJECT_THRESHOLD + 1, flipped: false, rejected: true });
    expect(cacheDoc()).toMatchObject({ status: 'rejected' });
  });
});

describe('submitExplainReport — concurrency does not race past threshold', () => {
  test('two concurrent reports crossing the threshold → exactly one flip, no lost update', async () => {
    docs.set(`${EXPLAIN_COLLECTION}/${HASH}`, { status: 'ready', schemaVersion: 2, text: 'ok' });

    // Доводим счётчик ровно до THRESHOLD-1: следующий репорт — порог.
    for (let i = 0; i < REPORT_REJECT_THRESHOLD - 1; i += 1) {
      await callReport({ phraseEn: PHRASE }, `auth-r${i}`);
    }
    expect(counterDoc()).toMatchObject({ reportCount: REPORT_REJECT_THRESHOLD - 1 });
    expect(cacheDoc()).toMatchObject({ status: 'ready' });

    // Два КОНКУРЕНТНЫХ репорта от разных юзеров. Без атомарности они могли бы оба прочитать
    // count=THRESHOLD-1, оба записать THRESHOLD (lost update) и оба отклонить кэш (double-flip).
    // С атомарной tx (read-before-write + version-retry) ровно одна транзакция пересекает порог.
    const results = await Promise.all([
      callReport({ phraseEn: PHRASE }, 'auth-r6'),
      callReport({ phraseEn: PHRASE }, 'auth-r7'),
    ]);

    // НЕТ lost update: каждый из двух репортов учтён → счётчик = THRESHOLD+1, а не «застрял» на THRESHOLD.
    expect(counterDoc()).toMatchObject({ reportCount: REPORT_REJECT_THRESHOLD + 1 });
    // Два репорта вернули РАЗНЫЕ последовательные значения счётчика (никто не затёр чужой инкремент).
    const reportCounts = results.map((r) => r.reportCount).sort((a, b) => a - b);
    expect(reportCounts).toEqual([REPORT_REJECT_THRESHOLD, REPORT_REJECT_THRESHOLD + 1]);
    // Порог пересечён РОВНО один раз → ровно одна транзакция выполнила флип (flipped=true).
    const flips = results.filter((r) => r.flipped === true).length;
    expect(flips).toBe(1);
    // Кэш отклонён (и остаётся rejected, без двойного перезаписывания reason).
    expect(cacheDoc()).toMatchObject({ status: 'rejected', reason: 'report_threshold' });
  });
});

describe('submitExplainReport — server derives hash, ignores client-supplied hash', () => {
  test('a spoofed `hash` field in the payload is ignored; doc id comes from phraseEn', async () => {
    await callReport({ phraseEn: PHRASE, hash: 'totally-bogus-client-hash', phraseHash: 'also-bogus' }, 'auth-r0');
    // Счётчик лежит под СЕРВЕРНЫМ хэшем фразы, не под подсунутым клиентом.
    expect(docs.get(`${REPORTS_COLLECTION}/${HASH}`)).toMatchObject({ reportCount: 1 });
    expect(docs.get(`${REPORTS_COLLECTION}/totally-bogus-client-hash`)).toBeUndefined();
    expect(docs.get(`${REPORTS_COLLECTION}/also-bogus`)).toBeUndefined();
  });
});
