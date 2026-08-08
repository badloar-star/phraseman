import * as admin from 'firebase-admin';
import { createContentStageBulkPlan } from '../../admin_content_stage_bulk';
import { parseBulkStagePlanRequest } from '../bulk_stage_plan';

const projectId = process.env.GCLOUD_PROJECT || 'phraseman-content-factory-emulator';
const appName = `content-factory-bulk-${process.pid}`;
const app = admin.apps.find((candidate) => candidate?.name === appName) ?? admin.initializeApp({ projectId }, appName);
const db = app.firestore();
jest.setTimeout(30_000);

describe('atomic idempotent bulk plans', () => {
  test('concurrent identical calls create one plan, one stage set and one audit per stage', async () => {
    const requestId = `bulk-race-${process.pid}`;
    const input = parseBulkStagePlanRequest({ requestId, idempotencyKey: 'same-key', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Race test', kinds: ['lesson_outline'], lessonRange: { start: 1, end: 3 }, dependencyPolicy: 'approved_only' });
    const results = await Promise.all([createContentStageBulkPlan(db, input, 'editor-1', 'content_editor'), createContentStageBulkPlan(db, input, 'editor-1', 'content_editor')]);
    expect(results.filter((result) => result.replayed)).toHaveLength(1);
    expect((await db.collection('content_factory_bulk_plans').where('requestId', '==', requestId).get()).size).toBe(1);
    expect((await db.collection('content_factory_stages').where('requestId', '==', requestId).get()).size).toBe(3);
    const audits = await db.collection('admin_log').where('action', '==', 'content_factory.stage.bulk_create').get();
    expect(audits.docs.filter((doc) => String(doc.data().entity?.id ?? '').startsWith(`${requestId}:`))).toHaveLength(3);
  });

  test('conflicting replay and existing-stage conflict leave no partial plan', async () => {
    const requestId = `bulk-conflict-${process.pid}`;
    const original = parseBulkStagePlanRequest({ requestId, idempotencyKey: 'fixed-key', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Original', kinds: ['lesson_outline'], lessonRange: { start: 1, end: 1 }, dependencyPolicy: 'approved_only' });
    await createContentStageBulkPlan(db, original, 'editor-1', 'content_editor');
    const changed = parseBulkStagePlanRequest({ ...original, objective: 'Changed objective', lessonRange: undefined, scopes: ['lesson-1'] });
    await expect(createContentStageBulkPlan(db, changed, 'editor-1', 'content_editor')).rejects.toMatchObject({ message: 'bulk_stage_idempotency_conflict' });

    const secondRequest = `bulk-atomic-${process.pid}`;
    const stageId = `${secondRequest}:lesson_outline:lesson-1:r1`;
    await db.collection('content_factory_stages').doc(stageId).set({ requestId: 'other', kind: 'lesson_outline' });
    const atomic = parseBulkStagePlanRequest({ requestId: secondRequest, idempotencyKey: 'atomic-key', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Atomic', kinds: ['lesson_outline'], lessonRange: { start: 1, end: 2 }, dependencyPolicy: 'approved_only' });
    await expect(createContentStageBulkPlan(db, atomic, 'editor-1', 'content_editor')).rejects.toMatchObject({ message: 'bulk_stage_existing_stage_conflict' });
    expect((await db.collection('content_factory_bulk_plans').doc(`bulk:${secondRequest}:atomic-key`).get()).exists).toBe(false);
    expect((await db.collection('content_factory_stages').doc(`${secondRequest}:lesson_outline:lesson-2:r1`).get()).exists).toBe(false);
  });
});

afterAll(async () => { await db.terminate(); await app.delete(); });
