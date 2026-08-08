import { runBackfillStep } from './business_tier_backfill_runner';
import { BUSINESS_TIER_BACKFILL_STATE_DOC, BUSINESS_TIER_HISTORY_COLLECTION } from './business_tier_history_store';

interface FakeUser { id: string; created_at: number; }
interface FakeRevenueEvent {
  id: string;
  createdAtMs: number;
  eventType: string;
  periodType: string | null;
  grossUsdMicros?: number | null;
  estimatedProceedsUsdMicros?: number | null;
  financialCoverage?: 'complete' | 'partial' | 'unavailable' | null;
  billingCadence?: 'monthly' | 'yearly' | 'lifetime' | 'unknown' | null;
}

/**
 * Fake Firestore double wide enough for the backfill runner: users collection
 * with orderBy(__name__)/select/limit/startAfter, revenuecat_premium_events
 * with where(createdAt range)/select/limit, plus generic doc get/set for the
 * cursor singleton and history points.
 */
function makeFakeDb(users: FakeUser[], revenueEvents: FakeRevenueEvent[]) {
  const stored = new Map<string, Record<string, unknown>>();
  const sortedUsers = [...users].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  /** Поля, реально запрошенные в select() у revenuecat_premium_events. */
  const selectedRevenueFields: string[] = [];

  function usersQuery(startAfterId: string | null, limitN: number | null) {
    let list = sortedUsers;
    if (startAfterId) {
      const idx = list.findIndex((u) => u.id === startAfterId);
      list = idx >= 0 ? list.slice(idx + 1) : [];
    }
    if (limitN !== null) list = list.slice(0, limitN);
    return list;
  }

  function makeUsersQueryObj(startAfterId: string | null, limitN: number | null): any {
    return {
      orderBy: () => makeUsersQueryObj(startAfterId, limitN),
      select: () => makeUsersQueryObj(startAfterId, limitN),
      limit: (n: number) => makeUsersQueryObj(startAfterId, n),
      startAfter: (snap: { id: string }) => makeUsersQueryObj(snap.id, limitN),
      doc: (id: string) => ({
        id,
        get: async () => {
          const found = sortedUsers.find((u) => u.id === id);
          return { id, exists: !!found, data: () => (found ? { created_at: found.created_at } : undefined) };
        },
      }),
      get: async () => ({
        docs: usersQuery(startAfterId, limitN).map((u) => ({ id: u.id, data: () => ({ created_at: u.created_at }) })),
      }),
    };
  }

  function makeRevenueQueryObj(fromMs: number | null, toMsExclusive: number | null, limitN: number | null): any {
    return {
      where: (field: string, op: string, value: unknown) => {
        const ms = (value as { toMillis?: () => number }).toMillis ? (value as { toMillis: () => number }).toMillis() : (value as number);
        if (op === '>=') return makeRevenueQueryObj(ms, toMsExclusive, limitN);
        if (op === '<') return makeRevenueQueryObj(fromMs, ms, limitN);
        return makeRevenueQueryObj(fromMs, toMsExclusive, limitN);
      },
      // зачем запоминать поля: раньше двойник игнорировал аргументы select(),
      // поэтому пропуск денежных полей в проекции не всплывал в тестах —
      // бэкфилл молча писал бы 'unavailable' на каждый день.
      select: (...fields: string[]) => {
        selectedRevenueFields.splice(0, selectedRevenueFields.length, ...fields);
        return makeRevenueQueryObj(fromMs, toMsExclusive, limitN);
      },
      limit: (n: number) => makeRevenueQueryObj(fromMs, toMsExclusive, n),
      get: async () => {
        const filtered = revenueEvents.filter((e) => {
          const okFrom = fromMs === null || e.createdAtMs >= fromMs;
          const okTo = toMsExclusive === null || e.createdAtMs < toMsExclusive;
          return okFrom && okTo;
        });
        const limited = limitN !== null ? filtered.slice(0, limitN) : filtered;
        return {
          docs: limited.map((e) => ({
            id: e.id,
            // Отдаём только те поля, которые реально попросили в select() —
            // как это делает настоящий Firestore.
            data: () => {
              const full: Record<string, unknown> = {
                createdAt: { toMillis: () => e.createdAtMs },
                eventType: e.eventType,
                periodType: e.periodType,
                grossUsdMicros: e.grossUsdMicros ?? null,
                estimatedProceedsUsdMicros: e.estimatedProceedsUsdMicros ?? null,
                financialCoverage: e.financialCoverage ?? null,
                billingCadence: e.billingCadence ?? null,
              };
              if (selectedRevenueFields.length === 0) return full;
              const projected: Record<string, unknown> = {};
              for (const field of selectedRevenueFields) projected[field] = full[field];
              return projected;
            },
          })),
        };
      },
    };
  }

  const db = {
    collection: (name: string) => {
      if (name === 'users') return makeUsersQueryObj(null, null);
      if (name === 'revenuecat_premium_events') return makeRevenueQueryObj(null, null, null);
      return {
        doc: (id: string) => ({
          id,
          get: async () => ({ exists: stored.has(`${name}/${id}`), data: () => stored.get(`${name}/${id}`) }),
          set: async (data: Record<string, unknown>) => {
            stored.set(`${name}/${id}`, { ...(stored.get(`${name}/${id}`) || {}), ...data });
          },
        }),
      };
    },
    doc: (path: string) => {
      const [name, id] = path.split('/');
      return (db.collection(name) as any).doc(id);
    },
    batch: () => {
      const ops: Array<{ path: string; data: Record<string, unknown> }> = [];
      return {
        set: (docRef: { id: string; __collectionName?: string }, data: Record<string, unknown>) => {
          ops.push({ path: `${BUSINESS_TIER_HISTORY_COLLECTION}/${docRef.id}`, data });
        },
        commit: async () => {
          for (const op of ops) stored.set(op.path, { ...(stored.get(op.path) || {}), ...op.data });
        },
      };
    },
  };

  // users.count() aggregation stub (used only if the runner reads it — kept for API completeness)
  (db.collection('users') as any).count = () => ({ get: async () => ({ data: () => ({ count: sortedUsers.length }) }) });

  return { db: db as unknown as FirebaseFirestore.Firestore, stored, selectedRevenueFields };
}

describe('runBackfillStep — one continuable page of the once-only owner history backfill', () => {
  test('processes the first page, writes history points, and leaves a resumable cursor when more users remain', async () => {
    const users: FakeUser[] = Array.from({ length: 3 }, (_, i) => ({
      id: `u${String(i).padStart(3, '0')}`,
      created_at: Date.parse('2026-08-01T00:00:00.000Z') + i * 1000,
    }));
    const { db, stored } = makeFakeDb(users, []);
    const result = await runBackfillStep({ db, nowMs: 999, pageSize: 2 });

    expect(result.pagesProcessed).toBe(1);
    expect(result.usersScanned).toBe(2);
    expect(result.done).toBe(false);
    expect(result.cumulativeUsers).toBe(2);
    expect(stored.get(`${BUSINESS_TIER_HISTORY_COLLECTION}/2026-08-01`)).toMatchObject({ cumulativeUsers: 2, newUsers: 2 });
    expect(stored.get(BUSINESS_TIER_BACKFILL_STATE_DOC)).toMatchObject({ lastUserDocId: 'u001', done: false, cumulativeUsers: 2 });
  });

  test('the final short page marks the cursor done', async () => {
    const users: FakeUser[] = [{ id: 'u000', created_at: Date.parse('2026-08-01T00:00:00.000Z') }];
    const { db, stored } = makeFakeDb(users, []);
    const result = await runBackfillStep({ db, nowMs: 1, pageSize: 500 });
    expect(result.done).toBe(true);
    expect(stored.get(BUSINESS_TIER_BACKFILL_STATE_DOC)).toMatchObject({ done: true });
  });

  test('a repeated call after done is a safe no-op — never recomputes finished history', async () => {
    const users: FakeUser[] = [{ id: 'u000', created_at: Date.parse('2026-08-01T00:00:00.000Z') }];
    const { db } = makeFakeDb(users, []);
    await runBackfillStep({ db, nowMs: 1, pageSize: 500 });
    const second = await runBackfillStep({ db, nowMs: 2, pageSize: 500 });
    expect(second.pagesProcessed).toBe(0);
    expect(second.done).toBe(true);
  });

  test('cumulative users carries over across sequential page calls until a short page signals completion', async () => {
    // зачем: страница == pageSize сама по себе не доказывает конец коллекции —
    // done становится true только когда страница ПРОЩЕ pageSize (или дошла до нуля).
    // 5 пользователей / pageSize=2 => страницы 2, 2, 1(done).
    const users: FakeUser[] = Array.from({ length: 5 }, (_, i) => ({
      id: `u${String(i).padStart(3, '0')}`,
      created_at: Date.parse('2026-08-01T00:00:00.000Z') + i * 1000,
    }));
    const { db } = makeFakeDb(users, []);
    const first = await runBackfillStep({ db, nowMs: 1, pageSize: 2 });
    expect(first.cumulativeUsers).toBe(2);
    expect(first.done).toBe(false);
    const second = await runBackfillStep({ db, nowMs: 2, pageSize: 2 });
    expect(second.cumulativeUsers).toBe(4);
    expect(second.done).toBe(false);
    const third = await runBackfillStep({ db, nowMs: 3, pageSize: 2 });
    expect(third.cumulativeUsers).toBe(5);
    expect(third.done).toBe(true);
  });

  test('merges revenuecat events that fall within the page`s user-timestamp range', async () => {
    // зачем: диапазон запроса revenue — [min(created_at), max(created_at)] страницы users
    // включительно (runner делает maxMs+1 как toExclusive). Два пользователя на одном дне
    // задают широкий диапазон, событие в середине точно в него попадает.
    const day1 = Date.parse('2026-08-01T00:00:00.000Z');
    const users: FakeUser[] = [
      { id: 'u000', created_at: day1 },
      { id: 'u001', created_at: day1 + 60_000 },
    ];
    const revenue: FakeRevenueEvent[] = [
      { id: 'r1', createdAtMs: day1 + 500, eventType: 'NON_RENEWING_PURCHASE', periodType: null },
    ];
    const { db, stored } = makeFakeDb(users, revenue);
    await runBackfillStep({ db, nowMs: 1, pageSize: 500 });
    expect(stored.get(`${BUSINESS_TIER_HISTORY_COLLECTION}/2026-08-01`)).toMatchObject({ newPaying: 1 });
  });

  test('an already-done cursor short-circuits with zero Firestore page reads', async () => {
    const { db, stored } = makeFakeDb([], []);
    await (db.doc(BUSINESS_TIER_BACKFILL_STATE_DOC) as any).set({ done: true, cumulativeUsers: 42, lastUserDocId: null, lastCompletedDayKey: '2026-01-01', updatedAtMs: 1 });
    const result = await runBackfillStep({ db, nowMs: 2 });
    expect(result).toEqual({ pagesProcessed: 0, usersScanned: 0, pointsWritten: 0, done: true, lastCompletedDayKey: '2026-01-01', cumulativeUsers: 42 });
    void stored;
  });
});

describe('runBackfillStep — the money projection must actually request the money fields', () => {
  const day1 = Date.parse('2026-08-01T00:00:00.000Z');

  test('selects the pre-normalized financial fields, not just eventType/periodType', async () => {
    // зачем этот тест: без денежных полей в .select() Firestore вернёт их
    // undefined, parseRevenueEventRow схлопнет всё в null, и КАЖДЫЙ день
    // истории окажется 'unavailable' — честные суммы просто не доедут.
    const { db, selectedRevenueFields } = makeFakeDb(
      [{ id: 'u000', created_at: day1 }],
      [{ id: 'r1', createdAtMs: day1 + 500, eventType: 'RENEWAL', periodType: null }],
    );
    await runBackfillStep({ db, nowMs: 1, pageSize: 500 });
    expect(selectedRevenueFields).toEqual(expect.arrayContaining([
      'createdAt', 'eventType', 'periodType',
      'grossUsdMicros', 'estimatedProceedsUsdMicros', 'financialCoverage', 'billingCadence',
    ]));
  });

  test('real money on an event reaches the written history point', async () => {
    const { db, stored } = makeFakeDb(
      [{ id: 'u000', created_at: day1 }],
      [{
        id: 'r1', createdAtMs: day1 + 500, eventType: 'RENEWAL', periodType: null,
        grossUsdMicros: 4_990_000, estimatedProceedsUsdMicros: 3_493_000,
        financialCoverage: 'complete', billingCadence: 'monthly',
      }],
    );
    await runBackfillStep({ db, nowMs: 1, pageSize: 500 });
    expect(stored.get(`${BUSINESS_TIER_HISTORY_COLLECTION}/2026-08-01`)).toMatchObject({
      grossUsdMicros: 4_990_000,
      mrrEquivalentProceedsUsdMicros: 3_493_000,
      dayMoneyCoverage: 'complete',
    });
  });

  test('a payment hours after the only signup on the page is still captured', async () => {
    // зачем: диапазон брался как [minUserCreatedAt, maxUserCreatedAt] — платёж
    // вечером от утреннего регистранта выпадал из окна и терялся молча.
    // Теперь окно — сутки целиком, платёж в любое время дня попадает в точку.
    const { db, stored } = makeFakeDb(
      [{ id: 'u000', created_at: day1 + 60 * 60 * 1000 }], // регистрация в 01:00
      [{
        id: 'r1', createdAtMs: day1 + 20 * 60 * 60 * 1000, // оплата в 20:00 того же дня
        eventType: 'RENEWAL', periodType: null,
        grossUsdMicros: 4_990_000, estimatedProceedsUsdMicros: 3_493_000,
        financialCoverage: 'complete', billingCadence: 'monthly',
      }],
    );
    await runBackfillStep({ db, nowMs: 1, pageSize: 500 });
    expect(stored.get(`${BUSINESS_TIER_HISTORY_COLLECTION}/2026-08-01`)).toMatchObject({
      renewals: 1,
      grossUsdMicros: 4_990_000,
    });
  });

  test('a legacy event without money fields yields an unavailable day, not a fake zero-money day', async () => {
    const { db, stored } = makeFakeDb(
      [{ id: 'u000', created_at: day1 }],
      [{ id: 'r1', createdAtMs: day1 + 500, eventType: 'RENEWAL', periodType: null }],
    );
    await runBackfillStep({ db, nowMs: 1, pageSize: 500 });
    expect(stored.get(`${BUSINESS_TIER_HISTORY_COLLECTION}/2026-08-01`)).toMatchObject({
      dayMoneyCoverage: 'unavailable',
    });
  });
});
