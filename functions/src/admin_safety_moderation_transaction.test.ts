import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  adminApplySafetyModerationMutation,
  adminApproveSafetyModerationMutation,
  adminListSafetyModerationApprovals,
  adminPreviewSafetyModerationMutation,
  adminResumeSafetyModerationBulk,
  buildSafetyModerationPreview,
  captureExactFields,
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

function reportBefore(id: string, value: Row): Row {
  return {
    ...projectUserReport(id, value),
    mutableFields: captureExactFields(value, ['status', 'reviewedAtMs', 'reviewedAt', 'reviewedBy', 'archivedAt', 'warningId']),
  };
}

async function previewThroughCallable(data: Row): Promise<{ previewId: string; preview: Row; response: Row }> {
  const result = await adminPreviewSafetyModerationMutation.run(request(data)) as unknown as Row;
  const previewId = String(result.previewId || '');
  const preview = (await admin.firestore().collection('admin_safety_moderation_previews').doc(previewId).get()).data() as Row;
  return { previewId, preview, response: result };
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
    const preview = buildSafetyModerationPreview(input, reportBefore('report-one', report), Date.now(), 'admin-one', 'admin') as unknown as Row;
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
    const preview = buildSafetyModerationPreview(input, reportBefore('report-stale', report), Date.now(), 'admin-one', 'admin') as unknown as Row;
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

  test('restores report fields exactly, deleting timestamps that did not exist before', async () => {
    const db = admin.firestore();
    const report = { reportedUid: 'user-restore', reporterUid: 'reporter-one', reason: 'spam', status: 'new', createdAtMs: 100 };
    await db.collection('user_reports').doc('report-restore').set(report);
    const change = await previewThroughCallable({
      action: 'report_set_status', targetId: 'report-restore', reason: 'Archive reviewed report', requestId: 'preview-restore-change', payload: { status: 'archived' },
    });
    const changed = await adminApplySafetyModerationMutation.run(request({
      previewId: change.previewId, confirmation: change.preview.confirmation, reason: change.preview.reason,
      requestId: 'apply-restore-change', idempotencyKey: 'operation-restore-change',
    })) as unknown as Row;
    const restore = await previewThroughCallable({
      action: 'restore_operation', targetId: String(changed.historyId), reason: 'Undo mistaken archive', requestId: 'preview-restore-exact', payload: { operationId: changed.historyId },
    });
    await adminApplySafetyModerationMutation.run(request({
      previewId: restore.previewId, confirmation: restore.preview.confirmation, reason: restore.preview.reason,
      requestId: 'apply-restore-exact', idempotencyKey: 'operation-restore-exact',
    }));

    const restored = (await db.collection('user_reports').doc('report-restore').get()).data();
    expect(restored).toMatchObject(report);
    for (const field of ['reviewedAtMs', 'reviewedAt', 'reviewedBy', 'archivedAt', 'warningId']) expect(restored).not.toHaveProperty(field);
    expect((await db.collection('admin_safety_moderation_history').doc(String(changed.historyId)).get()).data()).toMatchObject({ restoredBy: 'admin-one', restoreHistoryId: expect.any(String) });
  });

  test('restores safety disposition fields exactly after a reviewed signal is undone', async () => {
    const db = admin.firestore();
    const flag = { uid: 'user-flag-restore', category: 'self_harm', userText: 'redacted test context', createdAtMs: 100 };
    await db.collection('safety_flags').doc('flag-restore').set(flag);
    const change = await previewThroughCallable({
      action: 'safety_set_disposition', targetId: 'flag-restore', reason: 'Reviewed safety signal', requestId: 'preview-flag-change',
      payload: { handled: true, disposition: 'false_positive', note: 'Checked context' },
    });
    const changed = await adminApplySafetyModerationMutation.run(request({
      previewId: change.previewId, confirmation: change.preview.confirmation, reason: change.preview.reason,
      requestId: 'apply-flag-change', idempotencyKey: 'operation-flag-change',
    })) as unknown as Row;
    const restore = await previewThroughCallable({
      action: 'restore_operation', targetId: String(changed.historyId), reason: 'Undo safety disposition', requestId: 'preview-flag-restore', payload: { operationId: changed.historyId },
    });
    const flagHistory = (await db.collection('admin_safety_moderation_history').doc(String(changed.historyId)).get()).data() as Row;
    expect(((restore.response.before as Row).current as Row)).toEqual(flagHistory.after);
    await adminApplySafetyModerationMutation.run(request({
      previewId: restore.previewId, confirmation: restore.preview.confirmation, reason: restore.preview.reason,
      requestId: 'apply-flag-restore', idempotencyKey: 'operation-flag-restore',
    }));
    const restored = (await db.collection('safety_flags').doc('flag-restore').get()).data();
    expect(restored).toMatchObject(flag);
    for (const field of ['handled', 'disposition', 'handlingNote', 'handledBy', 'handledAtMs', 'handledAt']) expect(restored).not.toHaveProperty(field);
  });

  test('persists bulk progress in resumable chunks and completes idempotently', async () => {
    const db = admin.firestore();
    const targetIds = Array.from({ length: 205 }, (_, index) => `bulk-report-${index}`);
    const batch = db.batch();
    targetIds.forEach((id, index) => batch.set(db.collection('user_reports').doc(id), {
      reportedUid: `user-${index}`, reporterUid: 'reporter-bulk', reason: 'spam', status: 'new', createdAtMs: index + 1,
    }));
    await batch.commit();
    const preview = await previewThroughCallable({
      action: 'report_archive_bulk', targetId: 'bulk-selection', reason: 'Archive reviewed batch', requestId: 'preview-bulk', payload: { targetIds },
    });
    const applied = await adminApplySafetyModerationMutation.run(request({
      previewId: preview.previewId, confirmation: preview.preview.confirmation, reason: preview.preview.reason,
      requestId: 'apply-bulk', idempotencyKey: 'operation-bulk',
    })) as unknown as Row;
    expect(applied.bulk).toMatchObject({ status: 'running', targetCount: 205, processedCount: 200, remainingCount: 5 });
    const manifestId = String(applied.bulkManifestId);
    expect((await db.collection('admin_safety_moderation_bulk_operations').doc(manifestId).get()).data()).toMatchObject({ status: 'running', cursor: 200 });

    const resumeData = { manifestId, reason: 'Finish reviewed batch', requestId: 'resume-bulk', idempotencyKey: 'operation-resume-bulk' };
    const resumed = await adminResumeSafetyModerationBulk.run(request(resumeData)) as unknown as Row;
    const replayed = await adminResumeSafetyModerationBulk.run(request(resumeData)) as unknown as Row;
    expect(resumed.bulk).toMatchObject({ status: 'completed', processedCount: 205, remainingCount: 0 });
    expect(replayed).toMatchObject({ replayed: true, bulk: { status: 'completed', processedCount: 205 } });
    const archived = await db.collection('user_reports').where('status', '==', 'archived').get();
    expect(archived.size).toBe(205);
  });

  test('shows a reviewable approval packet to both accounts but only the second administrator can approve', async () => {
    const db = admin.firestore();
    await db.collection('admin_approval_requests').doc('approval-two-account').set({
      type: 'safety_moderation', status: 'pending', previewId: 'preview-two-account',
      action: 'user_ban', targetId: 'user-two-account', requestedBy: 'admin-one', requestedAtMs: Date.now(),
      expiresAtMs: Date.now() + 60_000, reason: 'Confirmed abuse', risk: 'Creates a global account block.', fingerprint: 'fingerprint-two-account',
    });
    const ownQueue = await adminListSafetyModerationApprovals.run(request({}, 'admin-one')) as unknown as Row;
    const secondQueue = await adminListSafetyModerationApprovals.run(request({}, 'admin-two')) as unknown as Row;
    expect((ownQueue.items as Row[])[0]).toMatchObject({ approvalId: 'approval-two-account', action: 'user_ban', targetId: 'user-two-account', reason: 'Confirmed abuse', risk: expect.stringContaining('global'), canApprove: false });
    expect((secondQueue.items as Row[])[0]).toMatchObject({ approvalId: 'approval-two-account', requestedBy: 'admin-one', fingerprint: 'fingerprint-two-account', canApprove: true });

    const approvalData = { approvalId: 'approval-two-account', reason: 'Independent review complete', requestId: 'approve-two-account', idempotencyKey: 'operation-approve-two-account' };
    await expect(adminApproveSafetyModerationMutation.run(request(approvalData, 'admin-one'))).rejects.toMatchObject({ code: 'failed-precondition', message: 'self_approval_forbidden' } satisfies Partial<HttpsError>);
    await expect(adminApproveSafetyModerationMutation.run(request(approvalData, 'admin-two'))).resolves.toMatchObject({ ok: true, replayed: false });
    expect((await db.collection('admin_approval_requests').doc('approval-two-account').get()).data()).toMatchObject({ status: 'approved', approvedBy: 'admin-two' });
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
    const banBefore = { uid: 'user-ban', ban: null, usersBanned: false, leaderboard, chatRestricted: false, banHistory: null, sourceReport: projectUserReport('report-ban', report) };
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
    const unbanBefore = { uid: 'user-ban', ban: banDoc, usersBanned: true, leaderboard: null, chatRestricted: false, banHistory, sourceReport: null };
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

  test('rejects a ban when its source report changes after preview', async () => {
    const db = admin.firestore();
    const report = { reportedUid: 'user-source-cas', reportedName: 'Alice', reporterUid: 'reporter-one', reason: 'abuse', status: 'new', createdAtMs: 100 };
    await Promise.all([
      db.collection('users').doc('user-source-cas').set({ progress: { user_name: 'Alice' }, banned: false }),
      db.collection('user_reports').doc('report-source-cas').set(report),
    ]);
    const input = parseSafetyModerationMutationInput({
      action: 'user_ban', targetId: 'user-source-cas', reason: 'Confirmed abuse', requestId: 'request-source-cas',
      payload: { name: 'Alice', sourceReportId: 'report-source-cas', source: 'user_report' },
    });
    const before = {
      uid: 'user-source-cas', ban: null, usersBanned: false, leaderboard: null, chatRestricted: false,
      banHistory: null, sourceReport: projectUserReport('report-source-cas', report),
    };
    const preview = buildSafetyModerationPreview(input, before, Date.now(), 'admin-one', 'admin') as unknown as Row;
    await Promise.all([
      seedPreview('preview-source-cas', preview),
      db.collection('admin_approval_requests').doc('approval-source-cas').set({
        type: 'safety_moderation', status: 'approved', requestedBy: 'admin-one', approvedBy: 'admin-two',
        previewId: 'preview-source-cas', fingerprint: preview.fingerprint, expiresAtMs: preview.expiresAtMs,
      }),
      db.collection('user_reports').doc('report-source-cas').update({ status: 'reviewed' }),
    ]);

    await expect(adminApplySafetyModerationMutation.run(request({
      previewId: 'preview-source-cas', approvalId: 'approval-source-cas', confirmation: preview.confirmation,
      reason: preview.reason, requestId: 'apply-source-cas', idempotencyKey: 'operation-source-cas',
    }))).rejects.toMatchObject({ code: 'failed-precondition', message: 'safety_target_changed' } satisfies Partial<HttpsError>);
    expect((await db.collection('banned_users').doc('user-source-cas').get()).exists).toBe(false);
  });

  test('rejects unban when the linked history belongs to another user', async () => {
    const db = admin.firestore();
    const foreignHistory = { action: 'user_ban', targetId: 'user-other', after: { banWrites: { history: { leaderboardBefore: { uid: 'user-other', points: 999 } } } } };
    const ban = { uid: 'user-history-cas', banHistoryId: 'history-other', reason: 'abuse' };
    await Promise.all([
      db.collection('users').doc('user-history-cas').set({ banned: true }),
      db.collection('banned_users').doc('user-history-cas').set(ban),
      db.collection('admin_safety_moderation_history').doc('history-other').set(foreignHistory),
    ]);
    const input = parseSafetyModerationMutationInput({
      action: 'user_unban', targetId: 'user-history-cas', reason: 'Appeal accepted', requestId: 'request-history-cas', payload: { historyId: 'history-other' },
    });
    const before = { uid: 'user-history-cas', ban, usersBanned: true, leaderboard: null, chatRestricted: false, banHistory: foreignHistory, sourceReport: null };
    const preview = buildSafetyModerationPreview(input, before, Date.now(), 'admin-one', 'admin') as unknown as Row;
    await Promise.all([
      seedPreview('preview-history-cas', preview),
      db.collection('admin_approval_requests').doc('approval-history-cas').set({
        type: 'safety_moderation', status: 'approved', requestedBy: 'admin-one', approvedBy: 'admin-two',
        previewId: 'preview-history-cas', fingerprint: preview.fingerprint, expiresAtMs: preview.expiresAtMs,
      }),
    ]);

    await expect(adminApplySafetyModerationMutation.run(request({
      previewId: 'preview-history-cas', approvalId: 'approval-history-cas', confirmation: preview.confirmation,
      reason: preview.reason, requestId: 'apply-history-cas', idempotencyKey: 'operation-history-cas',
    }))).rejects.toMatchObject({ code: 'failed-precondition', message: 'ban_history_target_mismatch' } satisfies Partial<HttpsError>);
    expect((await db.collection('banned_users').doc('user-history-cas').get()).exists).toBe(true);
    expect((await db.collection('leaderboard').doc('user-history-cas').get()).exists).toBe(false);
  });

  test('reclaims a tombstoned nickname without inheriting the former owner identity', async () => {
    const db = admin.firestore();
    const user = { firebaseAuthUid: 'auth-target', progress: { user_name: 'Old Name', user_name_lower: 'old name' }, banned: false };
    const report = { reportedUid: 'user-rename', reportedName: 'Old Name', reporterUid: 'reporter-one', reason: 'offensive_nickname', status: 'new', createdAtMs: 100 };
    await Promise.all([
      db.collection('users').doc('user-rename').set(user),
      db.collection('leaderboard').doc('user-rename').set({ uid: 'user-rename', name: 'Old Name', nameLower: 'old name', points: 10 }),
      db.collection('public_profiles').doc('user-rename').set({ uid: 'user-rename', name: 'Old Name', nameLower: 'old name' }),
      db.collection('name_index').doc('old name').set({ uid: 'user-rename', authUid: 'auth-target', name: 'Old Name', nameLower: 'old name' }),
      db.collection('name_index').doc('new name').set({ uid: 'deleted-user', authUid: 'deleted-auth', name: 'New Name', nameLower: 'new name', identityHidden: true }),
      db.collection('user_reports').doc('report-rename').set(report),
    ]);
    const input = parseSafetyModerationMutationInput({
      action: 'report_rename', targetId: 'report-rename', reason: 'Remove offensive nickname', requestId: 'request-rename',
      payload: { uid: 'user-rename', newName: 'New Name' },
    });
    const before = {
      uid: 'user-rename', currentName: 'Old Name', currentNameLower: 'old name', authUid: 'auth-target',
      oldNameOwnerUid: 'user-rename', newNameOwnerUid: 'deleted-user',
      leaderboard: { uid: 'user-rename', name: 'Old Name', nameLower: 'old name', points: 10 },
      publicProfile: { uid: 'user-rename', name: 'Old Name', nameLower: 'old name' },
      report: reportBefore('report-rename', report),
      userProgressFields: captureExactFields(user.progress, ['user_name', 'user_name_lower']),
      userIdentityFields: captureExactFields(user, ['updatedAt']),
      oldNameIndex: captureExactFields({ uid: 'user-rename', authUid: 'auth-target', name: 'Old Name', nameLower: 'old name' }, ['uid', 'name', 'nameLower', 'authUid', 'identityHidden', 'updatedAt']),
      newNameIndex: captureExactFields({ uid: 'deleted-user', authUid: 'deleted-auth', name: 'New Name', nameLower: 'new name', identityHidden: true }, ['uid', 'name', 'nameLower', 'authUid', 'identityHidden', 'updatedAt']),
      leaderboardIdentityFields: captureExactFields({ uid: 'user-rename', name: 'Old Name', nameLower: 'old name', points: 10 }, ['name', 'nameLower', 'updatedAt']),
      publicProfileIdentityFields: captureExactFields({ uid: 'user-rename', name: 'Old Name', nameLower: 'old name' }, ['uid', 'name', 'nameLower', 'updatedAt']),
    };
    const preview = buildSafetyModerationPreview(input, before, Date.now(), 'admin-one', 'admin') as unknown as Row;
    await Promise.all([
      seedPreview('preview-rename', preview),
      db.collection('admin_approval_requests').doc('approval-rename').set({
        type: 'safety_moderation', status: 'approved', requestedBy: 'admin-one', approvedBy: 'admin-two',
        previewId: 'preview-rename', fingerprint: preview.fingerprint, expiresAtMs: preview.expiresAtMs,
      }),
    ]);

    const renamed = await adminApplySafetyModerationMutation.run(request({
      previewId: 'preview-rename', approvalId: 'approval-rename', confirmation: preview.confirmation, reason: preview.reason,
      requestId: 'apply-rename', idempotencyKey: 'operation-rename',
    })) as unknown as Row;

    const index = (await db.collection('name_index').doc('new name').get()).data();
    expect(index).toMatchObject({ uid: 'user-rename', authUid: 'auth-target', name: 'New Name', nameLower: 'new name' });
    expect(index).not.toHaveProperty('identityHidden');
    expect((await db.collection('name_index').doc('old name').get()).exists).toBe(false);
    expect((await db.collection('user_reports').doc('report-rename').get()).data()).toMatchObject({ status: 'reviewed' });

    const restore = await previewThroughCallable({
      action: 'restore_operation', targetId: String(renamed.historyId), reason: 'Undo mistaken rename', requestId: 'preview-rename-restore', payload: { operationId: renamed.historyId },
    });
    const renameHistory = (await db.collection('admin_safety_moderation_history').doc(String(renamed.historyId)).get()).data() as Row;
    expect(((restore.response.before as Row).current as Row)).toEqual(renameHistory.after);
    expect(restore.preview).toMatchObject({ requiresApproval: true });
    await db.collection('admin_approval_requests').doc('approval-rename-restore').set({
      type: 'safety_moderation', status: 'approved', requestedBy: 'admin-one', approvedBy: 'admin-two',
      previewId: restore.previewId, fingerprint: restore.preview.fingerprint, expiresAtMs: restore.preview.expiresAtMs,
    });
    await adminApplySafetyModerationMutation.run(request({
      previewId: restore.previewId, approvalId: 'approval-rename-restore', confirmation: restore.preview.confirmation,
      reason: restore.preview.reason, requestId: 'apply-rename-restore', idempotencyKey: 'operation-rename-restore',
    }));

    expect((await db.collection('users').doc('user-rename').get()).data()).toMatchObject({ progress: { user_name: 'Old Name', user_name_lower: 'old name' } });
    expect((await db.collection('leaderboard').doc('user-rename').get()).data()).toMatchObject({ name: 'Old Name', nameLower: 'old name', points: 10 });
    expect((await db.collection('public_profiles').doc('user-rename').get()).data()).toMatchObject({ name: 'Old Name', nameLower: 'old name' });
    expect((await db.collection('name_index').doc('old name').get()).data()).toMatchObject({ uid: 'user-rename', authUid: 'auth-target', name: 'Old Name' });
    expect((await db.collection('name_index').doc('new name').get()).data()).toMatchObject({ uid: 'deleted-user', authUid: 'deleted-auth', identityHidden: true });
    const restoredReport = (await db.collection('user_reports').doc('report-rename').get()).data();
    expect(restoredReport).toMatchObject({ status: 'new' });
    expect(restoredReport).not.toHaveProperty('reviewedAtMs');
  });
});
