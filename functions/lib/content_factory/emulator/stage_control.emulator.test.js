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
const stage_control_repository_1 = require("../stage_control_repository");
const projectId = process.env.GCLOUD_PROJECT || 'phraseman-content-factory-emulator';
const appName = `stage-control-${process.pid}`;
const app = admin.apps.find((candidate) => candidate?.name === appName) ?? admin.initializeApp({ projectId }, appName);
const db = app.firestore();
jest.setTimeout(60000);
test('concurrent resume commits one audit and never changes provider attempts', async () => {
    const stageId = 'r12a-stage';
    const stageRef = db.collection('content_factory_stages').doc(stageId);
    await stageRef.set({ state: 'paused', attempts: 4, generationAttempts: 2, controlRevision: 9 });
    const input = { stageId, action: 'resume', actorUid: 'admin-1', role: 'owner', nowIso: '2026-07-13T00:00:00.000Z', serverTimestamp: admin.firestore.FieldValue.serverTimestamp(), deleteValue: admin.firestore.FieldValue.delete() };
    const settled = await Promise.allSettled([(0, stage_control_repository_1.controlContentStage)(db, input), (0, stage_control_repository_1.controlContentStage)(db, input)]);
    expect(settled.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(settled.filter((item) => item.status === 'rejected')).toHaveLength(1);
    expect((await stageRef.get()).data()).toMatchObject({ state: 'queued', attempts: 4, generationAttempts: 2, controlRevision: 10, lastControlAction: 'resume' });
    const audits = await db.collection('admin_log').where('entity.id', '==', stageId).get();
    expect(audits.size).toBe(1);
    expect(audits.docs[0].data()).toMatchObject({ action: 'content_factory.stage.resume', attemptDelta: 0, providerAttemptDelta: 0, before: { attempts: 4, generationAttempts: 2, controlRevision: 9 }, after: { attempts: 4, generationAttempts: 2, controlRevision: 10 } });
});
afterAll(async () => {
    for (const collection of ['content_factory_stages', 'admin_log']) {
        const snapshot = await db.collection(collection).get();
        await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
    }
    await db.terminate();
    await app.delete();
});
//# sourceMappingURL=stage_control.emulator.test.js.map