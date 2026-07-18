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
const shadow_judge_repository_1 = require("../shadow_judge_repository");
const review_fingerprint_1 = require("../review_fingerprint");
const projectId = process.env.GCLOUD_PROJECT || 'phraseman-content-factory-emulator';
const appName = `shadow-judge-${process.pid}`;
const app = admin.apps.find((candidate) => candidate?.name === appName) ?? admin.initializeApp({ projectId }, appName);
const db = app.firestore();
jest.setTimeout(60000);
test('concurrent human approval and judge commit cannot produce approved stage with unseen judge evidence', async () => {
    const stageId = 'r12c-stage';
    const stageRef = db.collection('content_factory_stages').doc(stageId);
    const stage = { state: 'needs_review', revision: 2, kind: 'challenge_questions', contentHash: 'a'.repeat(64), qaReceipt: { status: 'passed' } };
    await stageRef.set(stage);
    const expectedReviewFingerprint = (0, review_fingerprint_1.contentStageReviewFingerprint)(stageId, stage);
    const approve = db.runTransaction(async (tx) => { const snapshot = await tx.get(stageRef); const current = snapshot.data() ?? {}; if (current.state !== 'needs_review' || (0, review_fingerprint_1.contentStageReviewFingerprint)(stageId, current) !== expectedReviewFingerprint)
        return false; tx.update(stageRef, { state: 'approved', reviewedAtMs: Date.now() }); return true; });
    const judge = (0, shadow_judge_repository_1.commitShadowJudgeReceipt)(db, { stageId, contentHash: stage.contentHash, expectedRevision: 2, expectedReviewFingerprint, receipt: { status: 'advisory_pass', authority: 'advisory_only', requiresHumanReview: true }, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const [approved, judged] = await Promise.all([approve, judge]);
    const final = (await stageRef.get()).data() ?? {};
    expect([approved, judged].filter(Boolean)).toHaveLength(1);
    expect(final.state === 'approved' && Boolean(final.judgeReceipt)).toBe(false);
});
afterAll(async () => { const snapshot = await db.collection('content_factory_stages').get(); await Promise.all(snapshot.docs.map((doc) => doc.ref.delete())); await db.terminate(); await app.delete(); });
//# sourceMappingURL=shadow_judge.emulator.test.js.map