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
const admin_content_stage_edits_1 = require("../../admin_content_stage_edits");
const artifact_edit_1 = require("../artifact_edit");
const review_fingerprint_1 = require("../review_fingerprint");
const projectId = process.env.GCLOUD_PROJECT || 'phraseman-content-factory-emulator';
const appName = `content-factory-edit-${process.pid}`;
const app = admin.apps.find((candidate) => candidate?.name === appName) ?? admin.initializeApp({ projectId }, appName);
const db = app.firestore();
jest.setTimeout(30000);
const item = (index) => ({ id: `q${index}`, prompt: `Question ${index}?`, choices: ['A', 'B', 'C', 'D'], correctIndex: 0, optionExplanations: ['a', 'b', 'c', 'd'], difficulty: index < 4 ? 'easy' : index < 8 ? 'medium' : 'hard', skillTag: 'travel', sourcePhraseIds: ['p1'] });
test('concurrent edit replay creates one immutable revision, correction event and audit', async () => {
    const requestId = `edit-race-${process.pid}`;
    const stageId = `${requestId}:quiz_questions:topic-1:r1`;
    const baseArtifact = { stage: 'quiz_questions', items: Array.from({ length: 10 }, (_, index) => item(index)) };
    const base = { stageId, requestId, kind: 'quiz_questions', scopeId: 'topic-1', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', count: 10, revision: 1, artifactId: `artifact:${stageId}`, state: 'approved', objectPath: 'base.json', objectGeneration: '1', contentHash: 'a'.repeat(64), qaReceipt: { status: 'passed' }, groundingReceipt: { hash: 'g' }, judgeReceipt: { status: 'advisory_pass', contentHash: 'a'.repeat(64) }, judgeUpdatedAt: 123 };
    await db.collection('content_factory_stages').doc(stageId).set(base);
    const fingerprint = (0, review_fingerprint_1.contentStageReviewFingerprint)(stageId, base);
    const candidate = structuredClone(baseArtifact);
    candidate.items[0].prompt = 'Corrected question?';
    const request = (0, artifact_edit_1.parseArtifactEditRequest)({ baseStageId: stageId, expectedBaseReviewFingerprint: fingerprint, idempotencyKey: 'edit-1', reason: 'Correct the first question', artifact: candidate });
    const prepared = (0, artifact_edit_1.prepareArtifactEdit)(base, baseArtifact, candidate, request.idempotencyKey);
    const receipt = { objectPath: prepared.objectPath, contentHash: 'b'.repeat(64), objectGeneration: '2', byteSize: 100, referenceState: 'pending_commit', finalizationKey: 'c'.repeat(64) };
    const args = { db, request, prepared, receipt, actorUid: 'editor-1', role: 'content_editor' };
    const results = await Promise.all([(0, admin_content_stage_edits_1.commitArtifactEditRevision)(args), (0, admin_content_stage_edits_1.commitArtifactEditRevision)(args)]);
    expect(results.filter((result) => result.replayed)).toHaveLength(1);
    const editedStage = (await db.collection('content_factory_stages').doc(prepared.newStageId).get()).data();
    expect(editedStage).toMatchObject({ state: 'needs_review', baseStageId: stageId, operatorCorrected: true, contentHash: receipt.contentHash });
    expect(editedStage).not.toHaveProperty('judgeReceipt');
    expect(editedStage).not.toHaveProperty('judgeUpdatedAt');
    expect((await db.collection('content_factory_correction_events').where('baseStageId', '==', stageId).get()).size).toBe(1);
    expect((await db.collection('admin_log').where('action', '==', 'content_factory.stage.artifact_edit').get()).docs.filter((doc) => doc.data().entity?.id === prepared.newStageId)).toHaveLength(1);
    expect((await db.collection('content_factory_stages').doc(stageId).get()).data()).toMatchObject({ revision: 1, contentHash: 'a'.repeat(64), state: 'approved' });
    await db.collection('content_factory_stages').doc(stageId).update({ qaReceipt: { status: 'failed' } });
    await expect((0, admin_content_stage_edits_1.commitArtifactEditRevision)({ ...args, request: { ...request, idempotencyKey: 'edit-2' } })).rejects.toMatchObject({ message: 'artifact_edit_base_fingerprint_stale' });
});
afterAll(async () => { await db.terminate(); await app.delete(); });
//# sourceMappingURL=artifact_edit.emulator.test.js.map