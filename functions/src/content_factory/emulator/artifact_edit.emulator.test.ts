import * as admin from 'firebase-admin';
import { commitArtifactEditRevision } from '../../admin_content_stage_edits';
import { parseArtifactEditRequest, prepareArtifactEdit } from '../artifact_edit';
import { contentStageReviewFingerprint } from '../review_fingerprint';

const projectId = process.env.GCLOUD_PROJECT || 'phraseman-content-factory-emulator';
const appName = `content-factory-edit-${process.pid}`;
const app = admin.apps.find((candidate) => candidate?.name === appName) ?? admin.initializeApp({ projectId }, appName);
const db = app.firestore();
jest.setTimeout(30_000);

const item = (index: number) => ({ id: `q${index}`, prompt: `Question ${index}?`, choices: ['A', 'B', 'C', 'D'], correctIndex: 0, optionExplanations: ['a', 'b', 'c', 'd'], difficulty: index < 4 ? 'easy' : index < 8 ? 'medium' : 'hard', skillTag: 'travel', sourcePhraseIds: ['p1'] });

test('concurrent edit replay creates one immutable revision, correction event and audit', async () => {
  const requestId = `edit-race-${process.pid}`;
  const stageId = `${requestId}:quiz_questions:topic-1:r1`;
  const baseArtifact = { stage: 'quiz_questions', items: Array.from({ length: 10 }, (_, index) => item(index)) };
  const base = { stageId, requestId, kind: 'quiz_questions' as const, scopeId: 'topic-1', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', count: 10, revision: 1, artifactId: `artifact:${stageId}`, state: 'approved', objectPath: 'base.json', objectGeneration: '1', contentHash: 'a'.repeat(64), qaReceipt: { status: 'passed' }, groundingReceipt: { hash: 'g' }, judgeReceipt: { status: 'advisory_pass', contentHash: 'a'.repeat(64) }, judgeUpdatedAt: 123 };
  await db.collection('content_factory_stages').doc(stageId).set(base);
  const fingerprint = contentStageReviewFingerprint(stageId, base);
  const candidate = structuredClone(baseArtifact); candidate.items[0].prompt = 'Corrected question?';
  const request = parseArtifactEditRequest({ baseStageId: stageId, expectedBaseReviewFingerprint: fingerprint, idempotencyKey: 'edit-1', reason: 'Correct the first question', artifact: candidate });
  const prepared = prepareArtifactEdit(base, baseArtifact, candidate, request.idempotencyKey);
  const receipt = { objectPath: prepared.objectPath, contentHash: 'b'.repeat(64), objectGeneration: '2', byteSize: 100, referenceState: 'pending_commit' as const, finalizationKey: 'c'.repeat(64) };
  const args = { db, request, prepared, receipt, actorUid: 'editor-1', role: 'content_editor' as const };
  const results = await Promise.all([commitArtifactEditRevision(args), commitArtifactEditRevision(args)]);
  expect(results.filter((result) => result.replayed)).toHaveLength(1);
  const editedStage = (await db.collection('content_factory_stages').doc(prepared.newStageId).get()).data();
  expect(editedStage).toMatchObject({ state: 'needs_review', baseStageId: stageId, operatorCorrected: true, contentHash: receipt.contentHash });
  expect(editedStage).not.toHaveProperty('judgeReceipt');
  expect(editedStage).not.toHaveProperty('judgeUpdatedAt');
  expect((await db.collection('content_factory_correction_events').where('baseStageId', '==', stageId).get()).size).toBe(1);
  expect((await db.collection('admin_log').where('action', '==', 'content_factory.stage.artifact_edit').get()).docs.filter((doc) => doc.data().entity?.id === prepared.newStageId)).toHaveLength(1);
  expect((await db.collection('content_factory_stages').doc(stageId).get()).data()).toMatchObject({ revision: 1, contentHash: 'a'.repeat(64), state: 'approved' });

  await db.collection('content_factory_stages').doc(stageId).update({ qaReceipt: { status: 'failed' } });
  await expect(commitArtifactEditRevision({ ...args, request: { ...request, idempotencyKey: 'edit-2' } })).rejects.toMatchObject({ message: 'artifact_edit_base_fingerprint_stale' });
});

afterAll(async () => { await db.terminate(); await app.delete(); });
