import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  adminApplySafetyModerationMutation,
  buildSafetyModerationPreview,
  parseSafetyModerationMutationInput,
} from './admin_safety_moderation';
import { projectUserReport } from './admin_safety_moderation_core';

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST;
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'phraseman-ea0b3';
const runIfEmulator = EMULATOR ? describe : describe.skip;

type Row = Record<string, unknown>;

function request(data: Row, uid = 'admin-one') {
  return {
    data,
    auth: { uid, token: { admin: true, adminRole: 'admin' } },
    app: { appId: 'emulator-admin-v2' },
    instanceIdToken: undefined,
    rawRequest: {},
  } as never;
}

async function clearFirestore(): Promise<void> {
  const response = await fetch(`http://${EMULATOR}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`emulator_clear_failed:${response.status}`);
}

async function seedPreview(id: string, preview: Row): Promise<void> {
  await admin.firestore().collection('admin_safety_moderation_previews').doc(id).set(preview);
}

runIfEmulator('Admin Safety & Moderation transactional integration', () => {
  beforeEach(async () => clearFirestore());
  afterAll(async () => Promise.all(admin.apps.filter((app): app is admin.app.App => Boolean(app)).map((app) => app.delete())));

  test('applies a report status change once and replays the same idempotency key without duplicate history', async () => {
    const db = admin.firestore();
    const report = { reportedUid: 'user-one', reportedName: 'Alice', reporterUid: 'reporter-one', reason: 'spam', status: 'new', createdAtMs: 100 };
    await db.collection('user_reports').doc('report-one').set(report);
    const input = parseSafetyModerationMutationInput({
      action: 'report_set_status', targetId: 'report-one', reason: 'Reviewed evidence', requestId: 'request-one', payload: { status: 'archived' },
    });
    const preview = buildSafetyModerationPreview(input, projectUserReport('report-one', report), Date.now(), 'admin-one', 'admin') as unknown as Row;
    await seedPreview('preview-one', preview);
    const data = { previewId: 'preview-one', confirmation: preview.confirmation, reason: preview.reason, requestId: 'apply-one', idempotencyKey: 'operation-one' };

    const first = await adminApplySafetyModerationMutation.run(request(data));
    const replay = await adminApplySafetyModerationMutation.run(request(data));

    expect(first).toMatchObject({ ok: true, action: 'report_set_status', targetId: 'report-one', replayed: false });
    expect(replay).toMatchObject({ ok: true, action: 'report_set_status', targetId: 'report-one', replayed: true, historyId: first.historyId });
    expect((await db.collection('user_reports').doc('report-one').get()).data()).toMatchObject({ status: 'archived', reviewedBy: 'admin-one' });
    expect((await db.collection('admin_safety_moderation_history').get()).size).toBe(1);
    expect((await db.collection('admin_log').get()).size).toBe(1);
  });

  test('rejects a stale preview atomically and leaves no operation or audit record', async () => {
    const db = admin.firestore();
    const report = { reportedUid: 'user-one', reporterUid: 'reporter-one', reason: 'spam', status: 'new', createdAtMs: 100 };
    await db.collection('user_reports').doc('report-stale').set(report);
    const input = parseSafetyModerationMutationInput({
      action: 'report_set_status', targetId: 'report-stale', reason: 'Reviewed evidence', requestId: 'request-stale', payload: { status: 'reviewed' },
    });
    const preview = buildSafetyModerationPreview(input, projectUserReport('report-stale', report), Date.now(), 'admin-one', 'admin') as unknown as Row;
    await seedPreview('preview-stale', preview);
    await db.collection('user_reports').doc('report-stale').update({ status: 'archived' });

    await expect(adminApplySafetyModerationMutation.run(request({
      previewId: 'preview-stale', confirmation: preview.confirmation, reason: preview.reason,
      requestId: 'apply-stale', idempotencyKey: 'operation-stale',
    }))).rejects.toMatchObject({ code: 'failed-precondition', message: 'safety_target_changed' } satisfies Partial<HttpsError>);

    expect((await db.collection('admin_command_operations').get()).empty).toBe(true);
    expect((await db.collection('admin_log').get()).empty).toBe(true);
    expect((await db.collection('admin_safety_moderation_previews').doc('preview-stale').get()).data()).not.toHaveProperty('consumedAtMs');
  });

  test('bans and unbans with separate approvals while restoring the captured leaderboard state', async () => {
    const db = admin.firestore();
    const user = { progress: { user_name: 'Alice' }, banned: false };
    const leaderboard = { uid: 'user-ban', name: 'Alice', points: 120, updatedAt: 10 };
    const report = { reportedUid: 'user-ban', reportedName: 'Alice', reporterUid: 'reporter-one', reason: 'abuse', status: 'new', createdAtMs: 100 };
    await Promise.all([
      db.collection('users').doc('user-ban').set(user),
      db.collection('leaderboard').doc('user-ban').set(leaderboard),
      db.collection('user_reports').doc('report-ban').set(report),
    ]);

    const banInput = parseSafetyModerationMutationInput({
      action: 'user_ban', targetId: 'user-ban', reason: 'Confirmed abuse', requestId: 'request-ban',
      payload: { name: 'Alice', sourceReportId: 'report-ban', source: 'user_report' },
    });
    const banBefore = { uid: 'user-ban', ban: null, usersBanned: false, leaderboard, chatRestricted: false, banHistory: null };
    const banPreview = buildSafetyModerationPreview(banInput, banBefore, Date.now(), 'admin-one', 'admin') as unknown as Row;
    await Promise.all([
      seedPreview('preview-ban', banPreview),
      db.collection('admin_approval_requests').doc('approval-ban').set({
        type: 'safety_moderation', status: 'approved', requestedBy: 'admin-one', approvedBy: 'admin-two',
        previewId: 'preview-ban', fingerprint: banPreview.fingerprint, expiresAtMs: banPreview.expiresAtMs,
      }),
    ]);
    const banned = await adminApplySafetyModerationMutation.run(request({
      previewId: 'preview-ban', approvalId: 'approval-ban', confirmation: banPreview.confirmation, reason: banPreview.reason,
      requestId: 'apply-ban', idempotencyKey: 'operation-ban',
    }));
    const banDoc = (await db.collection('banned_users').doc('user-ban').get()).data() as Row;
    const banHistory = (await db.collection('admin_safety_moderation_history').doc(String(banned.historyId)).get()).data() as Row;
    expect(banDoc).toMatchObject({ uid: 'user-ban', banHistoryId: banned.historyId, bannedBy: 'admin-one' });
    expect((await db.collection('users').doc('user-ban').get()).data()).toMatchObject({ banned: true });
    expect((await db.collection('leaderboard').doc('user-ban').get()).exists).toBe(false);
    expect((await db.collection('user_reports').doc('report-ban').get()).data()).toMatchObject({ status: 'banned' });

    const unbanInput = parseSafetyModerationMutationInput({
      action: 'user_unban', targetId: 'user-ban', reason: 'Appeal accepted', requestId: 'request-unban', payload: {},
    });
    const unbanBefore = { uid: 'user-ban', ban: banDoc, usersBanned: true, leaderboard: null, chatRestricted: false, banHistory };
    const unbanPreview = buildSafetyModerationPreview(unbanInput, unbanBefore, Date.now(), 'admin-one', 'admin') as unknown as Row;
    await Promise.all([
      seedPreview('preview-unban', unbanPreview),
      db.collection('admin_approval_requests').doc('approval-unban').set({
        type: 'safety_moderation', status: 'approved', requestedBy: 'admin-one', approvedBy: 'admin-two',
        previewId: 'preview-unban', fingerprint: unbanPreview.fingerprint, expiresAtMs: unbanPreview.expiresAtMs,
      }),
    ]);
    const unbanned = await adminApplySafetyModerationMutation.run(request({
      previewId: 'preview-unban', approvalId: 'approval-unban', confirmation: unbanPreview.confirmation, reason: unbanPreview.reason,
      requestId: 'apply-unban', idempotencyKey: 'operation-unban',
    }));

    expect(unbanned).toMatchObject({ ok: true, action: 'user_unban', replayed: false });
    expect((await db.collection('banned_users').doc('user-ban').get()).exists).toBe(false);
    expect((await db.collection('users').doc('user-ban').get()).data()).toMatchObject({ banned: false });
    expect((await db.collection('leaderboard').doc('user-ban').get()).data()).toEqual(leaderboard);
    expect((await db.collection('league_chat_bans').doc('user-ban').get()).exists).toBe(false);
  });
});
