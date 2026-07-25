"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const generation_execution_1 = require("../generation_execution");
const stage_lease_1 = require("../stage_lease");
const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG_PROJECT_ID || 'phraseman-content-factory-emulator';
const appName = `generation-races-${process.pid}`;
const app = admin.apps.find((candidate) => candidate?.name === appName)
    ?? admin.initializeApp({ projectId }, appName);
const db = app.firestore();
async function guardedTerminalCommit(collection, id, lease, outcome) {
    const entityRef = db.collection(collection).doc(id);
    const auditRef = db.collection('admin_log').doc(`audit-${collection}-${id}-${lease.attempt}-${lease.leaseToken}`);
    return (0, generation_execution_1.runGuardedGenerationTransaction)({
        lease, allowedStates: ['running', 'generated'],
        runTransaction: (handler) => db.runTransaction(handler),
        read: async (tx) => { const current = await tx.get(entityRef); return { current: current.exists ? current.data() ?? {} : null, context: undefined }; },
        commit: (tx) => {
            tx.update(entityRef, { state: outcome, leaseToken: admin.firestore.FieldValue.delete() });
            tx.create(auditRef, { entity: `${collection}/${id}`, attempt: lease.attempt, outcome });
        },
    });
}
describe.each(['content_factory_job_units', 'content_factory_stages'])('%s generation races', (collection) => {
    const ref = (id) => db.collection(collection).doc(`${id}-${process.pid}`);
    test('cancel during provider call rejects the stale result without audit', async () => {
        const entity = ref('cancel');
        await entity.set({ state: 'running', attempts: 1, leaseToken: 'lease-1' });
        await entity.update({ state: 'cancelled', leaseToken: admin.firestore.FieldValue.delete() });
        await expect(guardedTerminalCommit(collection, entity.id, { attempt: 1, leaseToken: 'lease-1' }, 'succeeded')).resolves.toBe(false);
        await expect(db.collection('admin_log').doc(`audit-${collection}-${entity.id}-1-lease-1`).get()).resolves.toMatchObject({ exists: false });
    });
    test('retry takeover rejects the stale worker and accepts only the current lease', async () => {
        const entity = ref('takeover');
        await entity.set({ state: 'running', attempts: 2, leaseToken: 'lease-2' });
        await expect(guardedTerminalCommit(collection, entity.id, { attempt: 1, leaseToken: 'lease-1' }, 'failed')).resolves.toBe(false);
        await expect(guardedTerminalCommit(collection, entity.id, { attempt: 2, leaseToken: 'lease-2' }, 'succeeded')).resolves.toBe(true);
        await expect(entity.get()).resolves.toMatchObject({ exists: true });
        expect((await entity.get()).data()?.state).toBe('succeeded');
    });
    test('expired lease takeover increments attempt and invalidates the old lease', async () => {
        const next = (0, stage_lease_1.acquireStageLease)({ state: 'running', attempts: 1, leaseToken: 'lease-expired', leaseExpiresAtMs: 1000 }, { nowMs: 2000, leaseMs: 60000, leaseToken: 'lease-current' });
        expect(next).toMatchObject({ action: 'run', attempt: 2, leaseToken: 'lease-current' });
    });
    test('a second terminal callback is a no-op and creates no second audit', async () => {
        const entity = ref('callback');
        const lease = { attempt: 1, leaseToken: 'lease-callback' };
        await entity.set({ state: 'running', attempts: 1, leaseToken: lease.leaseToken });
        await expect(guardedTerminalCommit(collection, entity.id, lease, 'succeeded')).resolves.toBe(true);
        await expect(guardedTerminalCommit(collection, entity.id, lease, 'failed')).resolves.toBe(false);
        const audits = await db.collection('admin_log').where('entity', '==', `${collection}/${entity.id}`).get();
        expect(audits.size).toBe(1);
        expect((await entity.get()).data()?.state).toBe('succeeded');
    });
    test('generated checkpoint is rejected after takeover without mutation', async () => {
        const entity = ref('checkpoint');
        await entity.set({ state: 'running', attempts: 2, leaseToken: 'lease-current' });
        const committed = await (0, generation_execution_1.runGuardedGenerationTransaction)({
            lease: { attempt: 1, leaseToken: 'lease-stale' }, allowedStates: ['running'],
            runTransaction: (handler) => db.runTransaction(handler),
            read: async (tx) => { const current = await tx.get(entity); return { current: current.data() ?? null, context: undefined }; },
            commit: (tx) => { tx.update(entity, { state: 'generated', generatedPayload: { stale: true } }); },
        });
        expect(committed).toBe(false);
        expect((await entity.get()).data()).toMatchObject({ state: 'running', attempts: 2, leaseToken: 'lease-current' });
    });
    test('duplicate audit collision rolls back the terminal state atomically', async () => {
        const entity = ref('duplicate');
        const lease = { attempt: 1, leaseToken: 'lease-duplicate' };
        const auditId = `audit-${collection}-${entity.id}-1-lease-duplicate`;
        await entity.set({ state: 'running', attempts: 1, leaseToken: lease.leaseToken });
        await db.collection('admin_log').doc(auditId).create({ preexisting: true });
        await expect(guardedTerminalCommit(collection, entity.id, lease, 'succeeded')).rejects.toBeDefined();
        expect((await entity.get()).data()).toMatchObject({ state: 'running', attempts: 1, leaseToken: lease.leaseToken });
    });
});
test('legacy terminal commit updates unit, job progress and audit atomically', async () => {
    const suffix = process.pid;
    const unitRef = db.collection('content_factory_job_units').doc(`atomic-${suffix}`);
    const jobRef = db.collection('content_factory_jobs').doc(`atomic-${suffix}`);
    const auditRef = db.collection('admin_log').doc(`atomic-${suffix}`);
    const lease = { attempt: 1, leaseToken: 'lease-atomic' };
    await unitRef.set({ state: 'running', attempts: 1, leaseToken: lease.leaseToken });
    await jobRef.set({ progress: { total: 1, completed: 0, failed: 0 } });
    await expect((0, generation_execution_1.runGuardedGenerationTransaction)({
        lease, allowedStates: ['running'], runTransaction: (handler) => db.runTransaction(handler),
        read: async (tx) => {
            const [unit, job] = await Promise.all([tx.get(unitRef), tx.get(jobRef)]);
            return { current: unit.data() ?? null, context: job.data() ?? {} };
        },
        commit: (tx) => {
            tx.update(unitRef, { state: 'succeeded', leaseToken: admin.firestore.FieldValue.delete() });
            tx.update(jobRef, { progress: { total: 1, completed: 1, failed: 0 } });
            tx.create(auditRef, { outcome: 'succeeded' });
        },
    })).resolves.toBe(true);
    expect((await unitRef.get()).data()?.state).toBe('succeeded');
    expect((await jobRef.get()).data()?.progress).toEqual({ total: 1, completed: 1, failed: 0 });
    expect((await auditRef.get()).exists).toBe(true);
});
test('forced transaction failure is normalized and writes nothing', async () => {
    const detail = new Error('private firestore detail');
    await expect((0, generation_execution_1.runGuardedGenerationTransaction)({
        lease: { attempt: 1, leaseToken: 'lease-failure' }, allowedStates: ['running'],
        runTransaction: async () => { throw detail; },
        read: async () => ({ current: null, context: undefined }),
        commit: async () => undefined,
    })).rejects.toMatchObject({ code: 'internal', message: 'generation_terminal_persistence_failed', cause: detail });
});
afterAll(async () => {
    await db.terminate();
    await app.delete();
});
//# sourceMappingURL=generation_races.emulator.test.js.map