import * as admin from 'firebase-admin';
import { commitShadowJudgeReceipt } from '../shadow_judge_repository';
import { contentStageReviewFingerprint } from '../review_fingerprint';

const projectId = process.env.GCLOUD_PROJECT || 'phraseman-content-factory-emulator';
const appName = `shadow-judge-${process.pid}`;
const app = admin.apps.find((candidate) => candidate?.name === appName) ?? admin.initializeApp({ projectId }, appName);
const db = app.firestore();
jest.setTimeout(60_000);

test('concurrent human approval and judge commit cannot produce approved stage with unseen judge evidence', async () => {
  const stageId = 'r12c-stage'; const stageRef = db.collection('content_factory_stages').doc(stageId); const stage = { state: 'needs_review', revision: 2, kind: 'arena_questions', contentHash: 'a'.repeat(64), qaReceipt: { status: 'passed' } };
  await stageRef.set(stage); const expectedReviewFingerprint = contentStageReviewFingerprint(stageId, stage);
  const approve = db.runTransaction(async (tx) => { const snapshot = await tx.get(stageRef); const current = snapshot.data() ?? {}; if (current.state !== 'needs_review' || contentStageReviewFingerprint(stageId, current) !== expectedReviewFingerprint) return false; tx.update(stageRef, { state: 'approved', reviewedAtMs: Date.now() }); return true; });
  const judge = commitShadowJudgeReceipt(db, { stageId, contentHash: stage.contentHash, expectedRevision: 2, expectedReviewFingerprint, receipt: { status: 'advisory_pass', authority: 'advisory_only', requiresHumanReview: true }, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  const [approved, judged] = await Promise.all([approve, judge]); const final = (await stageRef.get()).data() ?? {};
  expect([approved, judged].filter(Boolean)).toHaveLength(1);
  expect(final.state === 'approved' && Boolean(final.judgeReceipt)).toBe(false);
});

afterAll(async () => { const snapshot = await db.collection('content_factory_stages').get(); await Promise.all(snapshot.docs.map((doc) => doc.ref.delete())); await db.terminate(); await app.delete(); });
