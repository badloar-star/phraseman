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
  GLOBAL_DAILY_CAP,
  USER_DAILY_GEN_CAP,
} from './explain_budget';

beforeEach(() => docs.clear());

const AUTH = 'auth-1';
const STABLE = 'stable-1';
// a fixed "now" inside one UTC day
const NOW = Date.UTC(2026, 5, 9, 12, 0, 0);

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
  async function callGlobal(n: number, now = NOW): Promise<number> {
    let thrown = 0;
    for (let i = 0; i < n; i++) {
      try { await enforceGlobalBudget(now); } catch { thrown++; }
    }
    return thrown;
  }

  it('allows up to GLOBAL_DAILY_CAP then throws on the next', async () => {
    const thrown = await callGlobal(GLOBAL_DAILY_CAP + 1);
    expect(thrown).toBe(1);
  });

  it('resets on the next UTC day', async () => {
    await callGlobal(GLOBAL_DAILY_CAP); // exhaust
    const nextDay = NOW + 24 * 60 * 60 * 1000;
    let threw = false;
    try { await enforceGlobalBudget(nextDay); } catch { threw = true; }
    expect(threw).toBe(false);
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
