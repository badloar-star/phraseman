import * as admin from 'firebase-admin';
import { adminApplyCommunityMutation, adminApproveCommunityMutation, adminPreviewCommunityMutation, adminRequestCommunityApproval, adminResumeCommunityBulk } from './admin_community_operations';
import { documentVersion } from './admin_native_operations';

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST; const PROJECT_ID = process.env.GCLOUD_PROJECT || 'phraseman-ea0b3'; const runIfEmulator = EMULATOR ? describe : describe.skip;
type Row = Record<string, unknown>; function request(data: Row, uid: string) { return { data, auth: { uid, token: { admin: true, adminRole: 'admin' } }, app: { appId: 'admin-native-test' }, rawRequest: {} } as never; }
async function clear() { await fetch(`http://${EMULATOR}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' }); }
async function approveAndApply(preview: Row, key: string) { await adminRequestCommunityApproval.run(request({ previewId: preview.previewId, confirmation: preview.confirmation }, 'admin-one')); await adminApproveCommunityMutation.run(request({ previewId: preview.previewId, reason: 'Second administrator verified canonical target' }, 'admin-two')); return adminApplyCommunityMutation.run(request({ previewId: preview.previewId, confirmation: preview.confirmation, idempotencyKey: key }, 'admin-one')); }

runIfEmulator('Admin Community Operations transactions', () => {
  beforeEach(clear); afterAll(async () => Promise.all(admin.apps.filter(Boolean).map((app) => app!.delete())));
  it('builds a complete safe Arena manifest and resumes without deleting played profiles or users', async () => {
    const db = admin.firestore();
    for (let start = 0; start < 501; start += 250) { const batch = db.batch(); for (let index = start; index < Math.min(501, start + 250); index += 1) batch.set(db.collection('arena_profiles').doc(`p-${String(index).padStart(3, '0')}`), { displayName: 'Игрок', stats: { matchesPlayed: 0 } }); await batch.commit(); }
    await Promise.all([db.collection('arena_profiles').doc('played-flat').set({ displayName: 'Игрок', 'stats.matchesPlayed': 4 }), db.collection('users').doc('p-000').set({ progress: { user_name: 'Real account' } })]);
    const preview = await adminPreviewCommunityMutation.run(request({ action: 'arena-placeholder-cleanup', targetId: 'manifest-1', reason: 'Remove only exact zero-match placeholders', expectedVersion: 'missing', payload: {} }, 'admin-one')) as unknown as Row;
    expect((preview.payload as Row).total).toBe(501); expect((preview.payload as Row).targetIds).not.toContain('played-flat');
    await adminRequestCommunityApproval.run(request({ previewId: preview.previewId, confirmation: preview.confirmation }, 'admin-one')); await adminApproveCommunityMutation.run(request({ previewId: preview.previewId, reason: 'Manifest and exclusions reviewed' }, 'admin-two'));
    await adminApplyCommunityMutation.run(request({ previewId: preview.previewId, confirmation: preview.confirmation, idempotencyKey: 'community-manifest-1' }, 'admin-one'));
    const first = await adminResumeCommunityBulk.run(request({ manifestId: 'manifest-1', idempotencyKey: 'community-resume-1' }, 'admin-one')) as unknown as Row;
    const replay = await adminResumeCommunityBulk.run(request({ manifestId: 'manifest-1', idempotencyKey: 'community-resume-1' }, 'admin-one')) as unknown as Row;
    expect(first).toMatchObject({ deleted: 25, nextIndex: 25 }); expect(replay).toMatchObject({ replayed: true });
    await expect(adminResumeCommunityBulk.run(request({ manifestId: 'manifest-1', idempotencyKey: 'community-resume-1' }, 'admin-three'))).rejects.toMatchObject({ code: 'already-exists' });
    expect((await db.collection('users').doc('p-000').get()).exists).toBe(true); expect((await db.collection('arena_profiles').doc('played-flat').get()).exists).toBe(true);
    expect((await db.collection('admin_log').where('action', '==', 'community.arena-placeholder-cleanup.resume').get()).size).toBe(1);
  });

  it('closes a room and active members atomically with audit', async () => {
    const db = admin.firestore(); const room = { code: 'ROOM1', status: 'open' }; await db.collection('arena_rooms_live').doc('ROOM1').set(room); await db.collection('arena_room_members').doc('m1').set({ code: 'ROOM1', active: true });
    const preview = await adminPreviewCommunityMutation.run(request({ action: 'arena-room-close', targetId: 'ROOM1', reason: 'Stale room confirmed', expectedVersion: documentVersion('ROOM1', room), payload: {} }, 'admin-one')) as unknown as Row;
    await adminRequestCommunityApproval.run(request({ previewId: preview.previewId, confirmation: preview.confirmation }, 'admin-one')); await adminApproveCommunityMutation.run(request({ previewId: preview.previewId, reason: 'Second admin verified room' }, 'admin-two'));
    await adminApplyCommunityMutation.run(request({ previewId: preview.previewId, confirmation: preview.confirmation, idempotencyKey: 'community-room-1' }, 'admin-one'));
    expect((await db.collection('arena_rooms_live').doc('ROOM1').get()).data()).toMatchObject({ status: 'closed' }); expect((await db.collection('arena_room_members').doc('m1').get()).data()).toMatchObject({ active: false }); expect((await db.collection('admin_log').get()).size).toBe(1);
  });

  it('moderates Help Board and league chat without creating a global ban path', async () => {
    const db = admin.firestore(); const topic = { status: 'open', title: 'Help' }; const queued = { status: 'pending', text: 'Message' }; await Promise.all([db.collection('help_board_topics').doc('topic-1').set(topic), db.collection('league_chat_moderation_queue').doc('message-1').set(queued)]);
    const helpPreview = await adminPreviewCommunityMutation.run(request({ action: 'help-topic-status', targetId: 'topic-1', reason: 'Resolved answer verified', expectedVersion: documentVersion('topic-1', topic), payload: { status: 'resolved' } }, 'admin-one')) as unknown as Row; await approveAndApply(helpPreview, 'community-help-1');
    const chatPreview = await adminPreviewCommunityMutation.run(request({ action: 'league-chat-status', targetId: 'message-1', reason: 'Message reviewed against league rules', expectedVersion: documentVersion('message-1', queued), payload: { status: 'rejected' } }, 'admin-one')) as unknown as Row; await approveAndApply(chatPreview, 'community-chat-1');
    expect((await db.collection('help_board_topics').doc('topic-1').get()).data()).toMatchObject({ status: 'resolved' }); expect((await db.collection('league_chat_moderation_queue').doc('message-1').get()).data()).toMatchObject({ status: 'rejected' }); expect((await db.collection('global_bans').get()).empty).toBe(true); expect((await db.collection('admin_log').get()).size).toBe(2);
  });

  it('resyncs an Arena name and changes the wager flag with rollback metadata', async () => {
    const db = admin.firestore(); const profile = { displayName: 'Игрок', stats: { matchesPlayed: 0 } }; const wager = { rankedWagerEnabled: false, revision: 3 }; await Promise.all([db.collection('arena_profiles').doc('u1').set(profile), db.collection('users').doc('u1').set({ progress: { user_name: 'Canonical name' } }), db.collection('app_meta').doc('arena_feature_flags').set(wager)]);
    const namePreview = await adminPreviewCommunityMutation.run(request({ action: 'arena-profile-resync', targetId: 'u1', reason: 'Canonical user name verified', expectedVersion: documentVersion('u1', profile), payload: {} }, 'admin-one')) as unknown as Row; await approveAndApply(namePreview, 'community-arena-name-1');
    const wagerPreview = await adminPreviewCommunityMutation.run(request({ action: 'arena-wager-flag', targetId: 'arena_feature_flags', reason: 'Economy rollout approved', expectedVersion: documentVersion('arena_feature_flags', wager), payload: { enabled: true } }, 'admin-one')) as unknown as Row; await approveAndApply(wagerPreview, 'community-arena-wager-1');
    expect((await db.collection('arena_profiles').doc('u1').get()).data()).toMatchObject({ displayName: 'Canonical name' }); expect((await db.collection('app_meta').doc('arena_feature_flags').get()).data()).toMatchObject({ rankedWagerEnabled: true, rollbackBefore: wager }); expect((await db.collection('admin_log').get()).size).toBe(2);
  });
});
