import * as admin from 'firebase-admin';
import { adminApplyContentMutation, adminApproveContentMutation, adminPreviewContentMutation, adminRequestContentApproval } from './admin_content_operations';
import { documentVersion } from './admin_native_operations';

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST; const PROJECT_ID = process.env.GCLOUD_PROJECT || 'phraseman-ea0b3'; const runIfEmulator = EMULATOR ? describe : describe.skip;
type Row = Record<string, unknown>; function request(data: Row, uid: string) { return { data, auth: { uid, token: { admin: true, adminRole: 'admin' } }, app: { appId: 'admin-native-test' }, rawRequest: {} } as never; }
async function clear() { await fetch(`http://${EMULATOR}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' }); }

runIfEmulator('Admin Content Operations transactions', () => {
  beforeEach(clear); afterAll(async () => Promise.all(admin.apps.filter(Boolean).map((app) => app!.delete())));
  it('rejects stale content and applies a reviewed daily phrase with audit', async () => {
    const db = admin.firestore(); const before = { english: 'Old', scheduledDate: '', active: true, allowSave: true, savedCount: 7 };
    await db.collection('daily_phrases').doc('phrase-1').set(before);
    const preview = await adminPreviewContentMutation.run(request({ action: 'daily-phrase-upsert', targetId: 'phrase-1', reason: 'Editorial correction approved', expectedVersion: documentVersion('phrase-1', before), payload: { english: 'New phrase', meaning: 'Новая фраза', scheduledDate: '2026-07-14', order: 1, active: true, allowSave: false } }, 'admin-one')) as unknown as Row;
    await adminRequestContentApproval.run(request({ previewId: preview.previewId, confirmation: preview.confirmation }, 'admin-one'));
    await adminApproveContentMutation.run(request({ previewId: preview.previewId, reason: 'Second editor checked schedule' }, 'admin-two'));
    await db.collection('daily_phrases').doc('phrase-1').update({ meaning: 'concurrent change' });
    await expect(adminApplyContentMutation.run(request({ previewId: preview.previewId, confirmation: preview.confirmation, idempotencyKey: 'content-stale-1' }, 'admin-one'))).rejects.toMatchObject({ code: 'failed-precondition' });
    expect((await db.collection('admin_log').get()).empty).toBe(true);
  });

  it('notifies a community-pack author in the same reviewed mutation', async () => {
    const db = admin.firestore(); const before = { status: 'pending', authorStableId: 'author-1', title: 'Pack' }; await db.collection('community_pack_submissions').doc('submission-1').set(before);
    const preview = await adminPreviewContentMutation.run(request({ action: 'community-submission-decision', targetId: 'submission-1', reason: 'Moderation evidence reviewed', expectedVersion: documentVersion('submission-1', before), payload: { decision: 'request_changes', expectedStatus: 'pending', message: 'Fix card 3' } }, 'admin-one')) as unknown as Row;
    await adminRequestContentApproval.run(request({ previewId: preview.previewId, confirmation: preview.confirmation }, 'admin-one')); await adminApproveContentMutation.run(request({ previewId: preview.previewId, reason: 'Second moderator agrees' }, 'admin-two'));
    await adminApplyContentMutation.run(request({ previewId: preview.previewId, confirmation: preview.confirmation, idempotencyKey: 'content-pack-1' }, 'admin-one'));
    expect((await db.collection('community_pack_submissions').doc('submission-1').get()).data()).toMatchObject({ status: 'changes_requested' });
    expect((await db.collection('users').doc('author-1').collection('community_seller_inbox').get()).size).toBe(1); expect((await db.collection('admin_log').get()).size).toBe(1);
  });

  it('imports a version-checked daily-phrase batch and preserves rollback snapshots', async () => {
    const db = admin.firestore(); const existing = { english: 'Before', scheduledDate: '2026-07-10', savedCount: 9 };
    await db.collection('daily_phrases').doc('existing').set(existing);
    const preview = await adminPreviewContentMutation.run(request({ action: 'daily-phrase-import', targetId: 'import-1', reason: 'Reviewed CSV import', expectedVersion: 'missing', payload: { items: [
      { id: 'existing', english: 'After', literal: 'После', meaning: 'Затем', scheduledDate: '2026-07-15', order: 1, expectedVersion: documentVersion('existing', existing) },
      { id: 'new-one', english: 'New', literal: 'Новый', meaning: 'Новая фраза', scheduledDate: '2026-07-16', order: 2, expectedVersion: 'missing' },
    ] } }, 'admin-one')) as unknown as Row;
    await adminRequestContentApproval.run(request({ previewId: preview.previewId, confirmation: preview.confirmation }, 'admin-one')); await adminApproveContentMutation.run(request({ previewId: preview.previewId, reason: 'Second editor checked all rows' }, 'admin-two'));
    await adminApplyContentMutation.run(request({ previewId: preview.previewId, confirmation: preview.confirmation, idempotencyKey: 'content-import-1' }, 'admin-one'));
    expect((await db.collection('daily_phrases').doc('existing').get()).data()).toMatchObject({ english: 'After', savedCount: 9, rollbackBefore: existing });
    expect((await db.collection('daily_phrases').doc('new-one').get()).data()).toMatchObject({ english: 'New', scheduledDate: '2026-07-16' });
    expect((await db.collection('admin_native_bulk_manifests').doc('import-1').get()).data()).toMatchObject({ kind: 'daily-phrase-import', importedCount: 2 });
  });

  it('updates version-checked explanation reports in bulk without touching explanation caches', async () => {
    const db = admin.firestore(); const first = { status: 'new', cacheKey: 'cache-a' }; const second = { status: 'reviewing', cacheKey: 'cache-b' };
    await Promise.all([db.collection('explain_report_entries').doc('r1').set(first), db.collection('explain_report_entries').doc('r2').set(second), db.collection('explain_cache').doc('cache-a').set({ text: 'keep' })]);
    const preview = await adminPreviewContentMutation.run(request({ action: 'explain-reports-bulk', targetId: 'reports-1', reason: 'Reviewed duplicate reports', expectedVersion: 'missing', payload: { status: 'done', adminNote: 'Same root cause', items: [{ id: 'r1', expectedVersion: documentVersion('r1', first) }, { id: 'r2', expectedVersion: documentVersion('r2', second) }] } }, 'admin-one')) as unknown as Row;
    await adminRequestContentApproval.run(request({ previewId: preview.previewId, confirmation: preview.confirmation }, 'admin-one')); await adminApproveContentMutation.run(request({ previewId: preview.previewId, reason: 'Second editor checked report list' }, 'admin-two'));
    await adminApplyContentMutation.run(request({ previewId: preview.previewId, confirmation: preview.confirmation, idempotencyKey: 'content-reports-1' }, 'admin-one'));
    expect((await db.collection('explain_report_entries').doc('r1').get()).data()).toMatchObject({ status: 'done', adminNote: 'Same root cause' });
    expect((await db.collection('explain_report_entries').doc('r2').get()).data()).toMatchObject({ status: 'done' });
    expect((await db.collection('explain_cache').doc('cache-a').get()).data()).toEqual({ text: 'keep' });
  });

  it('deletes only the approved explanation cache target and leaves report evidence intact', async () => {
    const db = admin.firestore(); const cache = { status: 'ready', text: 'obsolete' }; await Promise.all([db.collection('phrase_explanations').doc('hash-1').set(cache), db.collection('explain_reports').doc('hash-1').set({ reportCount: 5 }), db.collection('explain_report_entries').doc('entry-1').set({ phraseHash: 'hash-1', status: 'new' })]);
    const preview = await adminPreviewContentMutation.run(request({ action: 'explain-cache-delete', targetId: 'hash-1', reason: 'Regeneration approved after report review', expectedVersion: documentVersion('hash-1', cache), payload: { cacheCollection: 'phrase_explanations' } }, 'admin-one')) as unknown as Row;
    await adminRequestContentApproval.run(request({ previewId: preview.previewId, confirmation: preview.confirmation }, 'admin-one')); await adminApproveContentMutation.run(request({ previewId: preview.previewId, reason: 'Second editor verified exact hash and collection' }, 'admin-two')); await adminApplyContentMutation.run(request({ previewId: preview.previewId, confirmation: preview.confirmation, idempotencyKey: 'content-cache-delete-1' }, 'admin-one'));
    expect((await db.collection('phrase_explanations').doc('hash-1').get()).exists).toBe(false); expect((await db.collection('explain_reports').doc('hash-1').get()).exists).toBe(true); expect((await db.collection('explain_report_entries').doc('entry-1').get()).exists).toBe(true); expect((await db.collection('admin_log').get()).size).toBe(1);
  });
});
