import * as admin from 'firebase-admin';
import { claimNextV2Stage, finishV2StageLease } from '../v2_stage_claim_adapter';

const PROJECT_ID = 'demo-phraseman-v2-stage-claim';
const COLLECTION = 'content_v2_generation_stages';

describe('V2 stage claim adapter on the Firestore emulator', () => {
  let app: admin.app.App;

  beforeAll(() => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Firestore emulator required');
    app = admin.initializeApp({ projectId: PROJECT_ID });
  });

  afterAll(async () => { await app?.delete(); });

  it('claims only a dependency-ready stage and leaves blocked work queued', async () => {
    const db = app.firestore();
    await db.collection(COLLECTION).doc('a-blocked').set({ jobId: 'job-order', stageId: 'a-blocked', dependsOn: ['z-prerequisite'], state: 'queued', attempts: 0, maxAttempts: 3 });
    await db.collection(COLLECTION).doc('b-ready').set({ jobId: 'job-order', stageId: 'b-ready', dependsOn: [], state: 'queued', attempts: 0, maxAttempts: 3 });
    await db.collection(COLLECTION).doc('z-prerequisite').set({ jobId: 'job-order', stageId: 'z-prerequisite', dependsOn: [], state: 'queued', attempts: 0, maxAttempts: 3 });
    const first = await claimNextV2Stage(db, { jobId: 'job-order', workerId: 'worker-1', nowMs: 100 });
    expect(first.lease?.stageId).toBe('b-ready');
    expect((await db.collection(COLLECTION).doc('a-blocked').get()).data()?.state).toBe('queued');
  });

  it('reclaims an expired lease and rejects completion from the superseded worker', async () => {
    const db = app.firestore();
    await db.collection(COLLECTION).doc('stale').set({ jobId: 'job-stale', stageId: 'stale', dependsOn: [], state: 'running', attempts: 1, maxAttempts: 3, leaseExpiresAtMs: 100 });
    const lease = await claimNextV2Stage(db, { jobId: 'job-stale', workerId: 'worker-2', nowMs: 200 });
    expect(lease.lease).toMatchObject({ stageId: 'stale', attempt: 2, workerId: 'worker-2' });
    const oldLease = { ...lease.lease!, workerId: 'worker-1', leaseToken: 'old-token' };
    await expect(finishV2StageLease(db, oldLease, 'succeed')).resolves.toBe(false);
    await expect(finishV2StageLease(db, lease.lease!, 'succeed')).resolves.toBe(true);
    expect((await db.collection(COLLECTION).doc('stale').get()).data()?.state).toBe('succeeded');
  });

  it('does not claim a stage whose retry budget is exhausted', async () => {
    const db = app.firestore();
    await db.collection(COLLECTION).doc('exhausted').set({ jobId: 'job-exhausted', stageId: 'exhausted', dependsOn: [], state: 'queued', attempts: 3, maxAttempts: 3 });
    await expect(claimNextV2Stage(db, { jobId: 'job-exhausted', workerId: 'worker-3', nowMs: 300 })).resolves.toMatchObject({ lease: null, reason: 'no_runnable_stage' });
  });
});
