import { readFileSync } from 'fs';
import { join } from 'path';

// ── Firestore mock ────────────────────────────────────────────────────────────
// In-memory store: uid → doc data.
const userDocs = new Map<string, Record<string, unknown>>();

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv !== null && typeof sv === 'object' && !Array.isArray(sv) &&
      tv !== null && typeof tv === 'object' && !Array.isArray(tv)
    ) {
      result[key] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      result[key] = sv;
    }
  }
  return result;
}

const makeFakeBatch = () => {
  const ops: Array<() => void> = [];
  return {
    set: (ref: { _uid: string }, data: Record<string, unknown>, opts?: { merge?: boolean }) => {
      ops.push(() => {
        const existing = userDocs.get(ref._uid) ?? {};
        userDocs.set(ref._uid, opts?.merge ? deepMerge(existing, data) : { ...data });
      });
    },
    commit: jest.fn(async () => { ops.forEach(op => op()); ops.length = 0; }),
  };
};

// Build paginated query mock: returns docs in pages of PAGE_SIZE (200).
const buildQuery = (allDocs: Array<{ _uid: string; data: () => Record<string, unknown> }>, pageSize: number, startAfterDoc: { _uid: string } | null) => {
  let docs = allDocs;
  if (startAfterDoc) {
    const idx = docs.findIndex(d => d._uid === startAfterDoc._uid);
    docs = idx >= 0 ? docs.slice(idx + 1) : [];
  }
  const page = docs.slice(0, pageSize);
  return {
    get: async () => ({
      empty: page.length === 0,
      docs: page,
    }),
  };
};

jest.mock('firebase-admin', () => {
  const PAGE_SIZE = 200;
  const fakeFirestore = () => {
    const allDocs = () =>
      [...userDocs.entries()].map(([uid, data]) => ({
        _uid: uid,
        ref: { _uid: uid },
        data: () => data,
      }));
    return {
      collection: (col: string) => {
        if (col !== 'users') throw new Error(`Unexpected collection: ${col}`);
        return {
          orderBy: () => ({
            limit: (n: number) => {
              // .select() в Firestore возвращает тот же Query, только без тел документов.
              // Мок отражает это: цепочка продолжается, а data() отдаёт пустой объект —
              // ровно как в проде при выборке-по-ссылкам.
              const page = (docs: Array<{ _uid: string; ref: { _uid: string }; data: () => unknown }>) =>
                docs.map((d) => ({ ...d, data: () => ({}) }));
              const build = (projected: boolean) => ({
                get: async () => {
                  const slice = allDocs().slice(0, n);
                  return { empty: slice.length === 0, docs: projected ? page(slice) : slice };
                },
                select: () => build(true),
                startAfter: (lastDoc: { _uid: string }) => ({
                  get: async () => {
                    const all = allDocs();
                    const idx = all.findIndex(d => d._uid === lastDoc._uid);
                    const rest = idx >= 0 ? all.slice(idx + 1) : [];
                    const slice = rest.slice(0, n);
                    return { empty: slice.length === 0, docs: projected ? page(slice) : slice };
                  },
                  select: () => build(true),
                }),
              });
              return build(false);
            },
          }),
        };
      },
      batch: makeFakeBatch,
    };
  };
  return {
    firestore: fakeFirestore,
    initializeApp: jest.fn(),
  };
});

// ── Helper ────────────────────────────────────────────────────────────────────

function seedUsers(count: number, weeklyXp = '50', totalXp = '1000') {
  for (let i = 0; i < count; i++) {
    userDocs.set(`uid-${i}`, {
      progress: {
        user_total_xp: totalXp,
        weekly_xp: weeklyXp,
      },
    });
  }
}

beforeEach(() => {
  userDocs.clear();
  jest.resetModules();
  jest.mock('firebase-admin', () => {
    const PAGE_SIZE = 200;
    const allDocs = () =>
      [...userDocs.entries()].map(([uid, data]) => ({
        _uid: uid,
        ref: { _uid: uid },
        data: () => data,
      }));
    const fakeFirestore = () => ({
      collection: (col: string) => {
        if (col !== 'users') throw new Error(`Unexpected collection: ${col}`);
        return {
          orderBy: () => ({
            limit: (n: number) => {
              // См. комментарий у мока выше: .select() возвращает тот же Query,
              // но data() отдаёт пустой объект (тела документов не запрашиваются).
              const project = (docs: Array<{ _uid: string; ref: { _uid: string }; data: () => unknown }>) =>
                docs.map((d) => ({ ...d, data: () => ({}) }));
              const build = (projected: boolean) => ({
                get: async () => {
                  const slice = allDocs().slice(0, n);
                  return { empty: slice.length === 0, docs: projected ? project(slice) : slice };
                },
                select: () => build(true),
                startAfter: (lastDoc: { _uid: string }) => ({
                  get: async () => {
                    const all = allDocs();
                    const idx = all.findIndex(d => d._uid === lastDoc._uid);
                    const rest = idx >= 0 ? all.slice(idx + 1) : [];
                    const slice = rest.slice(0, PAGE_SIZE);
                    return { empty: slice.length === 0, docs: projected ? project(slice) : slice };
                  },
                  select: () => build(true),
                }),
              });
              return build(false);
            },
          }),
        };
      },
      batch: makeFakeBatch,
    });
    return { firestore: fakeFirestore, initializeApp: jest.fn() };
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

test('Test 1: resetWeeklyXp zeroes progress.weekly_xp for all users', async () => {
  seedUsers(10, '50', '1000');
  const { resetWeeklyXp } = require('./reset_weekly_xp');
  await resetWeeklyXp();
  for (const [, data] of userDocs) {
    expect((data.progress as Record<string, unknown>).weekly_xp).toBe('0');
  }
});

test('Test 2: resetWeeklyXp does NOT modify progress.user_total_xp', async () => {
  seedUsers(10, '50', '1000');
  const { resetWeeklyXp } = require('./reset_weekly_xp');
  await resetWeeklyXp();
  for (const [, data] of userDocs) {
    expect((data.progress as Record<string, unknown>).user_total_xp).toBe('1000');
  }
});

test('Test 3: resetWeeklyXp sets weekly_xp_period_start to current Monday ISO', async () => {
  seedUsers(5, '50', '500');
  const { resetWeeklyXp } = require('./reset_weekly_xp');
  await resetWeeklyXp();
  const today = new Date();
  const utcDay = today.getUTCDay();
  const daysSinceMonday = (utcDay + 6) % 7;
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - daysSinceMonday));
  const expected = `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
  for (const [, data] of userDocs) {
    expect((data.progress as Record<string, unknown>).weekly_xp_period_start).toBe(expected);
  }
});

test('Test 4: resetWeeklyXp processes more than 200 users (pagination)', async () => {
  seedUsers(500, '99', '2000');
  const { resetWeeklyXp } = require('./reset_weekly_xp');
  const result = await resetWeeklyXp();
  expect(result.updated).toBe(500);
  // Confirm all 500 were zeroed.
  let zeroCount = 0;
  for (const [, data] of userDocs) {
    if ((data.progress as Record<string, unknown>).weekly_xp === '0') zeroCount++;
  }
  expect(zeroCount).toBe(500);
});

test('Test 5: resetWeeklyXp skips users with no data field without throwing', async () => {
  userDocs.set('uid-empty', {} as Record<string, unknown>);
  const { resetWeeklyXp } = require('./reset_weekly_xp');
  await expect(resetWeeklyXp()).resolves.not.toThrow();
});

test('Test 6: functions/src/index.ts exports resetWeeklyXpCron with correct cron and UTC timezone', () => {
  const src = readFileSync(join(__dirname, 'index.ts'), 'utf8');
  expect(src).toContain('resetWeeklyXpCron');
  expect(src).toContain("'0 0 * * 1'");
  expect(src).toContain("timeZone: 'UTC'");
});
