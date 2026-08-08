import * as admin from 'firebase-admin';
import { controlContentStage } from '../stage_control_repository';

const projectId = process.env.GCLOUD_PROJECT || 'phraseman-content-factory-emulator';
const appName = `stage-control-${process.pid}`;
const app = admin.apps.find((candidate) => candidate?.name === appName) ?? admin.initializeApp({ projectId }, appName);
const db = app.firestore();
jest.setTimeout(60_000);

test('concurrent resume commits one audit and never changes provider attempts', async () => {
  const stageId = 'r12a-stage'; const stageRef = db.collection('content_factory_stages').doc(stageId);
  await stageRef.set({ state: 'paused', attempts: 4, generationAttempts: 2, controlRevision: 9 });
  const input = { stageId, action: 'resume' as const, actorUid: 'admin-1', role: 'owner', nowIso: '2026-07-13T00:00:00.000Z', serverTimestamp: admin.firestore.FieldValue.serverTimestamp(), deleteValue: admin.firestore.FieldValue.delete() };
  const settled = await Promise.allSettled([controlContentStage(db, input), controlContentStage(db, input)]);
  expect(settled.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
  expect(settled.filter((item) => item.status === 'rejected')).toHaveLength(1);
  expect((await stageRef.get()).data()).toMatchObject({ state: 'queued', attempts: 4, generationAttempts: 2, controlRevision: 10, lastControlAction: 'resume' });
  const audits = await db.collection('admin_log').where('entity.id', '==', stageId).get();
  expect(audits.size).toBe(1);
  expect(audits.docs[0].data()).toMatchObject({ action: 'content_factory.stage.resume', attemptDelta: 0, providerAttemptDelta: 0, before: { attempts: 4, generationAttempts: 2, controlRevision: 9 }, after: { attempts: 4, generationAttempts: 2, controlRevision: 10 } });
});

afterAll(async () => {
  for (const collection of ['content_factory_stages', 'admin_log']) { const snapshot = await db.collection(collection).get(); await Promise.all(snapshot.docs.map((doc) => doc.ref.delete())); }
  await db.terminate(); await app.delete();
});
