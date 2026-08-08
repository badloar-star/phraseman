"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_provider_1 = require("./generation_provider");
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
            create(r, data) { writes.push(() => docs.set(r.path, data)); },
        });
        writes.forEach((write) => write());
        return result;
    },
};
describe('provider transport budget integration', () => {
    const originalFetch = global.fetch;
    let warn;
    beforeEach(() => { docs.clear(); warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
    afterEach(() => { global.fetch = originalFetch; warn.mockRestore(); });
    test('cap exhaustion stops an HTTP retry before its fetch', async () => {
        global.fetch = jest.fn(async () => new Response('retry', { status: 500 }));
        const nowMs = Date.UTC(2026, 6, 13, 12);
        const provider = (0, generation_provider_1.createOpenAiGenerationProvider)('test', { beforeProviderRequest: async (requestIndex) => { await (0, content_factory_budget_1.reserveContentFactoryBudget)(db, `stage-1:attempt:1:provider-request:${requestIndex}`, 1, nowMs); } });
        await expect(provider.generate({ model: 'fake', prompt: 'json', responseFormat: 'json_object' })).rejects.toMatchObject({ code: 'resource-exhausted' });
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(provider.getProviderRequestCount?.()).toBe(1);
    });
});
//# sourceMappingURL=provider_budget_integration.test.js.map