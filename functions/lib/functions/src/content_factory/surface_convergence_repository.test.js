"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const surface_convergence_repository_1 = require("./surface_convergence_repository");
function fakeDb(seed = {}) {
    const docs = new Map(Object.entries(seed));
    let writes = 0;
    const ref = (path) => ({ path, id: path.split('/').at(-1), collection: (name) => ({ doc: (id = 'audit-1') => ref(`${path}/${name}/${id}`) }) });
    const db = {
        collection: (name) => ({ doc: (id = 'audit-1') => ref(`${name}/${id}`) }),
        runTransaction: async (handler) => handler({
            get: async (document) => ({ exists: docs.has(document.path), data: () => docs.get(document.path), ref: document }),
            set: (document, data) => { writes += 1; docs.set(document.path, data); },
            create: (document, data) => { if (docs.has(document.path))
                throw new Error('already_exists'); writes += 1; docs.set(document.path, data); },
        }),
    };
    return { db, docs, writes: () => writes };
}
describe('surface convergence repository', () => {
    it('updates config with CAS and an audit in one transaction', async () => {
        const { db, docs } = fakeDb({ 'content_factory_config/surface_convergence': { arena: { mode: 'shadow', revision: 4, canaryBps: 0, comparatorVersion: 'arena-parity-v1', minimumEvidenceWindow: { comparisons: 200, jobs: 20, days: 7 }, disabledReason: null } } });
        const result = await (0, surface_convergence_repository_1.updateArenaConvergenceConfig)(db, { expectedRevision: 4, mode: 'legacy', actorUid: 'admin-1', role: 'owner', disabledReason: 'operator_stop', requestId: 'r1', nowIso: '2026-07-13T00:00:00.000Z', serverTimestamp: 'SERVER_TIME' });
        expect(result.arena).toMatchObject({ mode: 'legacy', revision: 5 });
        expect(docs.get('content_factory_config/surface_convergence')).toMatchObject({ arena: { mode: 'legacy', revision: 5 } });
        expect([...docs.entries()].find(([path]) => path.startsWith('admin_log/'))?.[1]).toMatchObject({ action: 'content_factory.arena.kill_switch', actorUid: 'admin-1' });
    });
    it('persists the same comparison receipt once without touching unit state', async () => {
        const { db, docs, writes } = fakeDb({ 'content_factory_job_units/u1': { state: 'succeeded', engineResolved: 'legacy' } });
        const receipt = { documentId: 'a'.repeat(64), unitId: 'u1', comparatorVersion: 'arena-parity-v1', eligible: true };
        expect(await (0, surface_convergence_repository_1.persistArenaComparisonReceipt)(db, receipt, 'SERVER_TIME')).toEqual({ created: true, documentId: receipt.documentId });
        expect(await (0, surface_convergence_repository_1.persistArenaComparisonReceipt)(db, receipt, 'SERVER_TIME')).toEqual({ created: false, documentId: receipt.documentId });
        expect(docs.get('content_factory_job_units/u1')).toEqual({ state: 'succeeded', engineResolved: 'legacy' });
        expect(writes()).toBe(1);
    });
});
//# sourceMappingURL=surface_convergence_repository.test.js.map