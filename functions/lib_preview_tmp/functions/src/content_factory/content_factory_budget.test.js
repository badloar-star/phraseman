"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const content_factory_budget_1 = require("./content_factory_budget");
const docs = new Map();
const ref = (path) => ({ path });
const db = {
    collection(name) { return { doc(id) { return ref(`${name}/${id}`); } }; },
    async runTransaction(fn) {
        const writes = [];
        const result = await fn({
            async get(r) { const value = docs.get(r.path); return { exists: value !== undefined, data: () => value }; },
            set(r, data, options) { writes.push(() => docs.set(r.path, options?.merge ? { ...(docs.get(r.path) ?? {}), ...data } : data)); },
            create(r, data) { writes.push(() => { if (docs.has(r.path))
                throw new Error('already_exists'); docs.set(r.path, data); }); },
        });
        writes.forEach((write) => write());
        return result;
    },
};
describe('content factory daily budget', () => {
    beforeEach(() => docs.clear());
    it('counts each paid unit once and replays the same reservation for free', async () => {
        const now = Date.UTC(2026, 6, 10, 12);
        expect(await (0, content_factory_budget_1.reserveContentFactoryBudget)(db, 'job-1:lesson:1', 1, now)).toEqual({ reserved: true, replayed: false });
        expect(await (0, content_factory_budget_1.reserveContentFactoryBudget)(db, 'job-1:lesson:1', 1, now)).toEqual({ reserved: true, replayed: true });
        await expect((0, content_factory_budget_1.reserveContentFactoryBudget)(db, 'job-1:quiz:1', 1, now)).rejects.toBeInstanceOf(https_1.HttpsError);
    });
    it('uses a safe deterministic per-day reservation id', () => {
        expect((0, content_factory_budget_1.contentFactoryBudgetDocId)('job-1:lesson:1', Date.UTC(2026, 6, 10))).toMatch(/^2026-07-10_[a-f0-9]{48}$/);
    });
});
//# sourceMappingURL=content_factory_budget.test.js.map