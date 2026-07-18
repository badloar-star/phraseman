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
const surface_convergence_repository_1 = require("../surface_convergence_repository");
const projectId = process.env.GCLOUD_PROJECT || 'phraseman-content-factory-emulator';
const appName = `arena-convergence-${process.pid}`;
const app = admin.apps.find((candidate) => candidate?.name === appName) ?? admin.initializeApp({ projectId }, appName);
const db = app.firestore();
jest.setTimeout(60000);
test('CAS kill switch and idempotent shadow receipt never mutate the authoritative Arena unit', async () => {
    const unitRef = db.collection('content_factory_job_units').doc('legacy-arena-unit');
    await Promise.all([
        unitRef.set({ state: 'succeeded', engineResolved: 'legacy', contentHash: 'f'.repeat(64) }),
        db.collection('content_factory_config').doc('surface_convergence').set({ arena: { mode: 'shadow', revision: 4, canaryBps: 0, comparatorVersion: 'arena-parity-v1', minimumEvidenceWindow: { comparisons: 200, jobs: 20, days: 7 }, disabledReason: null } }),
    ]);
    const receipt = { documentId: 'a'.repeat(64), surface: 'arena', unitId: unitRef.id, jobId: 'job-1', comparatorVersion: 'arena-parity-v1', configRevision: 4, complete: true, eligible: true };
    expect(await (0, surface_convergence_repository_1.persistArenaComparisonReceipt)(db, receipt, admin.firestore.FieldValue.serverTimestamp())).toMatchObject({ created: true });
    expect(await (0, surface_convergence_repository_1.persistArenaComparisonReceipt)(db, receipt, admin.firestore.FieldValue.serverTimestamp())).toMatchObject({ created: false });
    expect((await db.collection('content_factory_surface_comparisons').get()).size).toBe(1);
    const updated = await (0, surface_convergence_repository_1.updateArenaConvergenceConfig)(db, { expectedRevision: 4, mode: 'legacy', actorUid: 'admin-1', role: 'owner', disabledReason: 'emulator_stop', requestId: 'request-1', nowIso: '2026-07-13T00:00:00.000Z', serverTimestamp: admin.firestore.FieldValue.serverTimestamp() });
    expect(updated.arena).toMatchObject({ mode: 'legacy', revision: 5, canaryBps: 0 });
    await expect((0, surface_convergence_repository_1.updateArenaConvergenceConfig)(db, { expectedRevision: 4, mode: 'shadow', actorUid: 'admin-1', role: 'owner', disabledReason: '', requestId: 'request-2', nowIso: '2026-07-13T00:00:01.000Z', serverTimestamp: admin.firestore.FieldValue.serverTimestamp() })).rejects.toThrow('surface_convergence_revision_conflict');
    expect((await unitRef.get()).data()).toEqual({ state: 'succeeded', engineResolved: 'legacy', contentHash: 'f'.repeat(64) });
    expect((await db.collection('admin_log').where('action', '==', 'content_factory.arena.kill_switch').get()).size).toBe(1);
});
test('current revision query stays representative after more than 500 historical Arena units', async () => {
    const historical = Array.from({ length: 520 }, (_, index) => db.collection('content_factory_job_units').doc(`historical-${String(index).padStart(3, '0')}`));
    for (let offset = 0; offset < historical.length; offset += 400) {
        const batch = db.batch();
        historical.slice(offset, offset + 400).forEach((ref) => batch.set(ref, { surface: 'arena', engineRequested: 'shadow', configRevision: 3, comparatorVersion: 'arena-parity-v1' }));
        await batch.commit();
    }
    await db.collection('content_factory_job_units').doc('current-shadow-unit').set({ surface: 'arena', engineRequested: 'shadow', configRevision: 4, comparatorVersion: 'arena-parity-v1' });
    const current = await db.collection('content_factory_job_units').where('surface', '==', 'arena').where('engineRequested', '==', 'shadow').where('configRevision', '==', 4).where('comparatorVersion', '==', 'arena-parity-v1').limit(501).get();
    expect(current.docs.map((doc) => doc.id)).toEqual(['current-shadow-unit']);
    const historicalReceipts = Array.from({ length: 520 }, (_, index) => db.collection('content_factory_surface_comparisons').doc((index + 1).toString(16).padStart(64, '0')));
    for (let offset = 0; offset < historicalReceipts.length; offset += 400) {
        const batch = db.batch();
        historicalReceipts.slice(offset, offset + 400).forEach((ref) => batch.set(ref, { surface: 'arena', comparatorVersion: 'arena-parity-v1', configRevision: 3, unitId: `old-${ref.id}` }));
        await batch.commit();
    }
    await db.collection('content_factory_surface_comparisons').doc('e'.repeat(64)).set({ surface: 'arena', comparatorVersion: 'arena-parity-v1', configRevision: 4, unitId: 'current-shadow-unit' });
    const currentReceipts = await db.collection('content_factory_surface_comparisons').where('surface', '==', 'arena').where('comparatorVersion', '==', 'arena-parity-v1').where('configRevision', '==', 4).orderBy(admin.firestore.FieldPath.documentId()).limit(501).get();
    expect(currentReceipts.docs.map((doc) => doc.id)).toEqual(['a'.repeat(64), 'e'.repeat(64)]);
});
afterAll(async () => {
    for (const collection of ['content_factory_job_units', 'content_factory_config', 'content_factory_surface_comparisons', 'admin_log']) {
        const snapshot = await db.collection(collection).get();
        await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
    }
    await db.terminate();
    await app.delete();
});
//# sourceMappingURL=arena_surface_convergence.emulator.test.js.map