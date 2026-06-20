"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const docs = new Map();
function refFor(path) {
    return {
        id: path.split('/').pop() || path,
        path,
        get: async () => snapFor(path),
        set: async (data, opts) => {
            docs.set(path, opts?.merge ? { ...(docs.get(path) ?? {}), ...data } : { ...data });
        },
    };
}
function snapFor(path) {
    const data = docs.get(path);
    return { id: path.split('/').pop() || path, exists: data !== undefined, data: () => data };
}
function fakeDb() {
    return {
        collection: (name) => ({ doc: (id) => refFor(`${name}/${id ?? 'auto'}`) }),
        runTransaction: async (fn) => {
            const writes = [];
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
    constructor(code, message) { super(message); this.code = code; }
}
jest.mock('firebase-functions/v2/https', () => ({ HttpsError: FakeHttpsError }));
jest.mock('firebase-admin', () => {
    const firestore = jest.fn(() => fakeDb());
    return { firestore };
});
const explain_budget_1 = require("./explain_budget");
beforeEach(() => docs.clear());
const AUTH = 'auth-1';
const STABLE = 'stable-1';
// a fixed "now" inside one UTC day
const NOW = Date.UTC(2026, 5, 9, 12, 0, 0);
async function callUser(n, now = NOW) {
    let thrown = 0;
    for (let i = 0; i < n; i++) {
        try {
            await (0, explain_budget_1.enforceUserGenLimit)(AUTH, STABLE, now);
        }
        catch {
            thrown++;
        }
    }
    return thrown;
}
describe('enforceUserGenLimit — per-user daily cap, atomic', () => {
    it('allows up to USER_DAILY_GEN_CAP then throws resource-exhausted on the next', async () => {
        const thrown = await callUser(explain_budget_1.USER_DAILY_GEN_CAP + 1);
        expect(thrown).toBe(1); // only the (cap+1)th throws
    });
    it('each call increments (second persists on top of first → atomic check+increment, not check-only)', async () => {
        await (0, explain_budget_1.enforceUserGenLimit)(AUTH, STABLE, NOW); // used = 1
        await (0, explain_budget_1.enforceUserGenLimit)(AUTH, STABLE, NOW); // used = 2 (would be 1 if check-only ignored prior write)
        // exactly (cap - 2) more should succeed, then the rest throw
        const more = explain_budget_1.USER_DAILY_GEN_CAP; // fire cap more calls
        const thrown = await callUser(more);
        expect(thrown).toBe(2); // 2 already consumed ⇒ last 2 of these overflow the cap
    });
    it('resets on the next UTC day', async () => {
        await callUser(explain_budget_1.USER_DAILY_GEN_CAP); // exhaust today
        const nextDay = NOW + 24 * 60 * 60 * 1000;
        let threw = false;
        try {
            await (0, explain_budget_1.enforceUserGenLimit)(AUTH, STABLE, nextDay);
        }
        catch {
            threw = true;
        }
        expect(threw).toBe(false); // fresh day → allowed
    });
});
describe('enforceGlobalBudget — product-wide daily breaker, atomic', () => {
    // enforceGlobalBudget(cap, nowMs) — cap по умолчанию = GLOBAL_DAILY_CAP.
    async function callGlobal(n, now = NOW) {
        let thrown = 0;
        for (let i = 0; i < n; i++) {
            try {
                await (0, explain_budget_1.enforceGlobalBudget)(explain_budget_1.GLOBAL_DAILY_CAP, now);
            }
            catch {
                thrown++;
            }
        }
        return thrown;
    }
    it('allows up to GLOBAL_DAILY_CAP then throws on the next', async () => {
        const thrown = await callGlobal(explain_budget_1.GLOBAL_DAILY_CAP + 1);
        expect(thrown).toBe(1);
    });
    it('cap=0 disables the breaker (admin removed the cap)', async () => {
        // С cap=0 даже выше дефолтного капа ничего не бросает.
        let threw = false;
        try {
            await (0, explain_budget_1.enforceGlobalBudget)(0, NOW);
        }
        catch {
            threw = true;
        }
        expect(threw).toBe(false);
    });
    it('resets on the next UTC day', async () => {
        await callGlobal(explain_budget_1.GLOBAL_DAILY_CAP); // exhaust
        const nextDay = NOW + 24 * 60 * 60 * 1000;
        let threw = false;
        try {
            await (0, explain_budget_1.enforceGlobalBudget)(explain_budget_1.GLOBAL_DAILY_CAP, nextDay);
        }
        catch {
            threw = true;
        }
        expect(threw).toBe(false);
    });
});
describe('constants have explicit values (audit blocker)', () => {
    it('GLOBAL_DAILY_CAP and USER_DAILY_GEN_CAP are the raised post-audit values', () => {
        // Raised 2026-06-10 (audit F2/F3): cache was invalidated (every phrase a fresh miss for a
        // while) and post-answer use is "unlimited", so caps must be high enough to not bite real use.
        expect(explain_budget_1.GLOBAL_DAILY_CAP).toBe(3000);
        expect(explain_budget_1.USER_DAILY_GEN_CAP).toBe(50);
    });
});
//# sourceMappingURL=explain_budget.test.js.map