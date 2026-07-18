"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stage_control_repository_1 = require("./stage_control_repository");
function fakeDb(stage) {
    const docs = new Map([['content_factory_stages/s1', stage]]);
    let auditCreates = 0;
    const ref = (path) => ({ path, id: path.split('/').at(-1) });
    const db = { collection: (name) => ({ doc: (id = `audit-${auditCreates + 1}`) => ref(`${name}/${id}`) }), runTransaction: async (handler) => handler({ get: async (document) => ({ exists: docs.has(document.path), data: () => docs.get(document.path) }), update: (document, patch) => docs.set(document.path, { ...(docs.get(document.path) ?? {}), ...patch }), create: (document, value) => { auditCreates += 1; docs.set(document.path, value); } }) };
    return { db, docs, auditCreates: () => auditCreates };
}
describe('content stage control repository', () => {
    it('records resume as a monotonic control event with zero attempt/provider delta', async () => {
        const { db, docs, auditCreates } = fakeDb({ state: 'paused', attempts: 3, generationAttempts: 2, controlRevision: 7 });
        const result = await (0, stage_control_repository_1.controlContentStage)(db, { stageId: 's1', action: 'resume', actorUid: 'admin', role: 'owner', nowIso: '2026-07-13T00:00:00.000Z', serverTimestamp: 'SERVER', deleteValue: 'DELETE' });
        expect(result).toEqual({ ok: true, stageId: 's1', state: 'queued', controlRevision: 8, attemptDelta: 0, providerAttemptDelta: 0 });
        expect(docs.get('content_factory_stages/s1')).toMatchObject({ state: 'queued', attempts: 3, generationAttempts: 2, controlRevision: 8, lastControlAction: 'resume' });
        expect([...docs.entries()].find(([path]) => path.startsWith('admin_log/'))?.[1]).toMatchObject({ action: 'content_factory.stage.resume', before: { state: 'paused', attempts: 3, generationAttempts: 2, controlRevision: 7 }, after: { state: 'queued', attempts: 3, generationAttempts: 2, controlRevision: 8 }, attemptDelta: 0, providerAttemptDelta: 0 });
        expect(auditCreates()).toBe(1);
    });
    it('rejects replay after the state has already advanced', async () => {
        const { db } = fakeDb({ state: 'queued', attempts: 1, generationAttempts: 1, controlRevision: 2 });
        await expect((0, stage_control_repository_1.controlContentStage)(db, { stageId: 's1', action: 'resume', actorUid: 'admin', role: 'owner', nowIso: '2026-07-13T00:00:00.000Z', serverTimestamp: 'SERVER', deleteValue: 'DELETE' })).rejects.toThrow('generation_stage_transition_invalid');
    });
});
//# sourceMappingURL=stage_control_repository.test.js.map