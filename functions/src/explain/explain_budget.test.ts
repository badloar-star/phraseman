export {};

// ---- in-memory firestore fake (house pattern) ----
type DocData = Record<string, unknown>;
type FakeRef = { id: string; path: string; get: () => Promise<FakeSnap>; set: (d: DocData, o?: { merge?: boolean }) => Promise<void> };
type FakeSnap = { id: string; exists: boolean; data: () => DocData | undefined };

const docs = new Map<string, DocData>();

function refFor(path: string): FakeRef {
  return {
    id: path.split('/').pop() || path,
    path,
    get: async () => snapFor(path),
    set: async (data: DocData, opts?: { merge?: boolean }) => {
      docs.set(path, opts?.merge ? { ...(docs.get(path) ?? {}), ...data } : { ...data });
    },
  };
}
function snapFor(path: string): FakeSnap {
  const data = docs.get(path);
  return { id: path.split('/').pop() || path, exists: data !== undefined, data: () => data };
}
function fakeDb() {
  return {
    collection: (name: string) => ({ doc: (id?: string) => refFor(`${name}/${id ?? 'auto'}`) }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<FakeSnap>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const result = await fn({
        get: (ref) => ref.get(),
        set: (ref, data, opts) => {
          writes.push(() => docs.set(ref.path, opts?.merge ? { ...(docs.get(ref.path) ?? {}), ...data } : { ...data }));
        },
      });
      writes.forEach((w) => w());
      return result;
    },
  };
}

class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}
jest.mock('firebase-functions/v2/https', () => ({ HttpsError: FakeHttpsError }));
jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => fakeDb());
  return { firestore };
});

import {
  enforceUserGenLimit,
  enforceGlobalBudget,
  reserveExplainBudget,
  refundExplainBudgetReservation,
  GLOBAL_DAILY_CAP,
  GLOBAL_BUDGET_COLLECTION,
  USER_DAILY_GEN_CAP,
  USER_LIMIT_COLLECTION,
} from './explain_budget';

beforeEach(() => docs.clear());

const AUTH = 'auth-1';
const STABLE = 'stable-1';
// a fixed "now" inside one UTC day
const NOW = Date.UTC(2026, 5, 9, 12, 0, 0);

function firstDocIn(collection: string): DocData | undefined {
  for (const [path, data] of docs.entries()) {
    if (path.startsWith(`${collection}/`)) return data;
  }
  return undefined;
}

async function callUser(n: number, now = NOW): Promise<number> {
  let thrown = 0;
  for (let i = 0; i < n; i++) {
    try { await enforceUserGenLimit(AUTH, STABLE, now); } catch { thrown++; }
  }
  return thrown;
}

describe('enforceUserGenLimit — per-user daily cap, atomic', () => {
  it('allows up to USER_DAILY_GEN_CAP then throws resource-exhausted on the next', async () => {
    const thrown = await callUser(USER_DAILY_GEN_CAP + 1);
    expect(thrown).toBe(1); // only the (cap+1)th throws
  });

  it('each call increments (second persists on top of first → atomic check+increment, not check-only)', async () => {
    await enforceUserGenLimit(AUTH, STABLE, NOW); // used = 1
    await enforceUserGenLimit(AUTH, STABLE, NOW); // used = 2 (would be 1 if check-only ignored prior write)
    // exactly (cap - 2) more should succeed, then the rest throw
    const more = USER_DAILY_GEN_CAP; // fire cap more calls
    const thrown = await callUser(more);
    expect(thrown).toBe(2); // 2 already consumed ⇒ last 2 of these overflow the cap
  });

  it('resets on the next UTC day', async () => {
    await callUser(USER_DAILY_GEN_CAP); // exhaust today
    const nextDay = NOW + 24 * 60 * 60 * 1000;
    let threw = false;
    try { await enforceUserGenLimit(AUTH, STABLE, nextDay); } catch { threw = true; }
    expect(threw).toBe(false); // fresh day → allowed
  });
});

describe('enforceGlobalBudget — product-wide daily breaker, atomic', () => {
  // enforceGlobalBudget(cap, nowMs) — cap по умолчанию = GLOBAL_DAILY_CAP.
  async function callGlobal(n: number, now = NOW): Promise<number> {
    let thrown = 0;
    for (let i = 0; i < n; i++) {
      try { await enforceGlobalBudget(GLOBAL_DAILY_CAP, now); } catch { thrown++; }
    }
    return thrown;
  }

  it('allows up to GLOBAL_DAILY_CAP then throws on the next', async () => {
    const thrown = await callGlobal(GLOBAL_DAILY_CAP + 1);
    expect(thrown).toBe(1);
  });

  it('cap=0 disables the breaker (admin removed the cap)', async () => {
    // С cap=0 даже выше дефолтного капа ничего не бросает.
    let threw = false;
    try { await enforceGlobalBudget(0, NOW); } catch { threw = true; }
    expect(threw).toBe(false);
  });

  it('resets on the next UTC day', async () => {
    await callGlobal(GLOBAL_DAILY_CAP); // exhaust
    const nextDay = NOW + 24 * 60 * 60 * 1000;
    let threw = false;
    try { await enforceGlobalBudget(GLOBAL_DAILY_CAP, nextDay); } catch { threw = true; }
    expect(threw).toBe(false);
  });
});

describe('reserveExplainBudget / refundExplainBudgetReservation', () => {
  it('refunds both user and global counters when no generation happens', async () => {
    const reservation = await reserveExplainBudget(AUTH, STABLE, GLOBAL_DAILY_CAP, NOW);

    expect(firstDocIn(USER_LIMIT_COLLECTION)?.dailyCount).toBe(1);
    expect(firstDocIn(GLOBAL_BUDGET_COLLECTION)?.genCount).toBe(1);

    await refundExplainBudgetReservation(reservation, 'test_no_generation');

    expect(firstDocIn(USER_LIMIT_COLLECTION)?.dailyCount).toBe(0);
    expect(firstDocIn(GLOBAL_BUDGET_COLLECTION)?.genCount).toBe(0);
  });

  it('refunds user quota if the global breaker rejects after user reservation', async () => {
    docs.set(`${GLOBAL_BUDGET_COLLECTION}/2026-06-09`, { genCount: 1 });

    await expect(reserveExplainBudget(AUTH, STABLE, 1, NOW)).rejects.toThrow('explain_global_budget');

    expect(firstDocIn(USER_LIMIT_COLLECTION)?.dailyCount).toBe(0);
    expect(firstDocIn(GLOBAL_BUDGET_COLLECTION)?.genCount).toBe(1);
  });
});

describe('constants have explicit values (audit blocker)', () => {
  it('GLOBAL_DAILY_CAP and USER_DAILY_GEN_CAP are the raised post-audit values', () => {
    // Raised 2026-06-10 (audit F2/F3): cache was invalidated (every phrase a fresh miss for a
    // while) and post-answer use is "unlimited", so caps must be high enough to not bite real use.
    expect(GLOBAL_DAILY_CAP).toBe(3000);
    expect(USER_DAILY_GEN_CAP).toBe(50);
  });
});
