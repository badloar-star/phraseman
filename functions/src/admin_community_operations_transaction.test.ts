import * as admin from 'firebase-admin';
import { adminApplyCommunityMutation, adminApproveCommunityMutation, adminGetCommunityOperationsWorkspace, adminPreviewCommunityMutation, adminRequestCommunityApproval, adminResumeCommunityBulk } from './admin_community_operations';
import { documentVersion } from './admin_native_operations';

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST; const PROJECT_ID = process.env.GCLOUD_PROJECT || 'phraseman-ea0b3'; const runIfEmulator = EMULATOR ? describe : describe.skip;
type Row = Record<string, unknown>; function request(data: Row, uid: string) { return { data, auth: { uid, token: { admin: true, adminRole: 'admin' } }, app: { appId: 'admin-native-test' }, rawRequest: {} } as never; }
async function clear() { await fetch(`http://${EMULATOR}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' }); }
async function approveAndApply(preview: Row, key: string) { await adminRequestCommunityApproval.run(request({ previewId: preview.previewId, confirmation: preview.confirmation }, 'admin-one')); await adminApproveCommunityMutation.run(request({ previewId: preview.previewId, reason: 'Second administrator verified canonical target' }, 'admin-two')); return adminApplyCommunityMutation.run(request({ previewId: preview.previewId, confirmation: preview.confirmation, idempotencyKey: key }, 'admin-one')); }
function validSubmission(authorStableId = 'queue-author'): Row { return { status: 'pending', authorStableId, payload: { studyTarget: 'en', sourceLang: 'ru', title: 'Queue pack', titleRu: 'Queue pack', titleUk: '', priceShards: 10, cards: Array.from({ length: 10 }, (_, index) => ({ id: `queue-card-${index}`, en: `Phrase ${index}`, ru: `Фраза ${index}` })) } }; }

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
    const db = admin.firestore(); const topic = { status: 'visible', title: 'Help' }; const queued = { status: 'pending', text: 'Message' }; await Promise.all([db.collection('help_board_topics').doc('topic-1').set(topic), db.collection('league_chat_moderation_queue').doc('message-1').set(queued)]);
    const helpPreview = await adminPreviewCommunityMutation.run(request({ action: 'help-topic-status', targetId: 'topic-1', reason: 'Hide after moderator review', expectedVersion: documentVersion('topic-1', topic), payload: { status: 'hidden' } }, 'admin-one')) as unknown as Row; await approveAndApply(helpPreview, 'community-help-1');
    const chatPreview = await adminPreviewCommunityMutation.run(request({ action: 'league-chat-status', targetId: 'message-1', reason: 'Message reviewed against league rules', expectedVersion: documentVersion('message-1', queued), payload: { status: 'rejected' } }, 'admin-one')) as unknown as Row; await approveAndApply(chatPreview, 'community-chat-1');
    expect((await db.collection('help_board_topics').doc('topic-1').get()).data()).toMatchObject({ status: 'hidden', moderatedBy: 'admin-one' }); expect((await db.collection('league_chat_moderation_queue').doc('message-1').get()).data()).toMatchObject({ status: 'rejected' }); expect((await db.collection('global_bans').get()).empty).toBe(true); expect((await db.collection('admin_log').get()).size).toBe(2);
  });

  it('loads the canonical Help Board moderation queue in the native workspace', async () => {
    const db = admin.firestore();
    await Promise.all([
      db.collection('help_board_topics').doc('topic-visible').set({ status: 'visible', title: 'Visible topic' }),
      db.collection('help_board_moderation_queue').doc('help-review-1').set({ targetType: 'topic', status: 'review', decision: 'pending', text: 'Needs review' }),
    ]);
    const workspace = await adminGetCommunityOperationsWorkspace.run(request({ capabilityId: 'help-board', limit: 20 }, 'admin-one')) as unknown as Row;
    expect((workspace.sections as Row).help_board_moderation_queue).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'help-review-1' })]));
  });

  it('writes canonical Help Board restrictions and visible admin topics', async () => {
    const db = admin.firestore();
    const restrictionPreview = await adminPreviewCommunityMutation.run(request({ action: 'help-restriction', targetId: 'help-user-1', reason: 'Repeated topic spam', expectedVersion: 'missing', payload: { restriction: 'restrict' } }, 'admin-one')) as unknown as Row;
    await approveAndApply(restrictionPreview, 'community-help-restrict-1');
    expect((await db.collection('help_board_restrictions').doc('help-user-1').get()).data()).toMatchObject({ uid: 'help-user-1', status: 'restricted', reason: 'Repeated topic spam', restrictedUntil: 0, updatedBy: 'admin-one' });

    const topicPreview = await adminPreviewCommunityMutation.run(request({ action: 'help-admin-post', targetId: 'admin-topic-1', reason: 'Publish an official Help Board answer', expectedVersion: 'missing', payload: { title: 'Official answer', body: 'A complete public Help Board answer.', targetLang: 'en', uiLang: 'ru', postAsName: 'Phraseman Support', compassEnabled: false } }, 'admin-one')) as unknown as Row;
    await approveAndApply(topicPreview, 'community-help-post-1');
    expect((await db.collection('help_board_topics').doc('admin-topic-1').get()).data()).toMatchObject({ schemaVersion: 1, policyVersion: 1, boardKey: 'en:ru', targetLang: 'en', uiLang: 'ru', title: 'Official answer', text: 'A complete public Help Board answer.', authorUid: 'admin:admin-one', authorName: 'Phraseman Support', status: 'visible', helpfulScore: 0, compassHelpfulScore: 0, commentCount: 0, reportCount: 0, bestScore: 0, adminAuthored: true, compassStatus: 'hidden' });
  });

  it('applies canonical league-chat mute, ban and clear states', async () => {
    const db = admin.firestore();
    const mutePreview = await adminPreviewCommunityMutation.run(request({ action: 'league-chat-restriction', targetId: 'chat-user-1', reason: 'Flooding chat', expectedVersion: 'missing', payload: { restriction: 'mute', durationHours: 24 } }, 'admin-one')) as unknown as Row;
    await approveAndApply(mutePreview, 'community-chat-mute-1');
    const muted = (await db.collection('league_chat_bans').doc('chat-user-1').get()).data() as Row;
    expect(muted).toMatchObject({ uid: 'chat-user-1', status: 'muted', reason: 'Flooding chat', updatedBy: 'admin-one' });
    expect(Number(muted.mutedUntil)).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);

    const clearPreview = await adminPreviewCommunityMutation.run(request({ action: 'league-chat-restriction', targetId: 'chat-user-1', reason: 'Restriction reviewed and cleared', expectedVersion: documentVersion('chat-user-1', muted), payload: { restriction: 'clear' } }, 'admin-one')) as unknown as Row;
    await approveAndApply(clearPreview, 'community-chat-clear-1');
    expect((await db.collection('league_chat_bans').doc('chat-user-1').get()).data()).toMatchObject({ status: 'cleared', mutedUntil: 0, clearedBy: 'admin-one' });

    const banPreview = await adminPreviewCommunityMutation.run(request({ action: 'league-chat-restriction', targetId: 'chat-user-2', reason: 'Repeated severe abuse', expectedVersion: 'missing', payload: { restriction: 'ban' } }, 'admin-one')) as unknown as Row;
    await approveAndApply(banPreview, 'community-chat-ban-1');
    expect((await db.collection('league_chat_bans').doc('chat-user-2').get()).data()).toMatchObject({ uid: 'chat-user-2', status: 'banned', mutedUntil: 0, updatedBy: 'admin-one' });
  });

  it('deletes and restores an existing visible league-chat message canonically', async () => {
    const db = admin.firestore(); const message = { groupId: 'group-1', weekId: '2026-W29', leagueId: 3, authorUid: 'chat-author', text: 'Visible message', status: 'visible', createdAt: 12345 };
    await db.collection('league_chat_messages').doc('visible-message-1').set(message);
    const deletePreview = await adminPreviewCommunityMutation.run(request({ action: 'league-chat-message-status', targetId: 'visible-message-1', reason: 'Moderator removed the message', expectedVersion: documentVersion('visible-message-1', message), payload: { status: 'deleted' } }, 'admin-one')) as unknown as Row;
    await approveAndApply(deletePreview, 'community-chat-delete-1');
    const deleted = (await db.collection('league_chat_messages').doc('visible-message-1').get()).data() as Row;
    expect(deleted).toMatchObject({ status: 'deleted', deletedBy: 'admin-one' });

    const restorePreview = await adminPreviewCommunityMutation.run(request({ action: 'league-chat-message-status', targetId: 'visible-message-1', reason: 'Moderator restored the message', expectedVersion: documentVersion('visible-message-1', deleted), payload: { status: 'visible' } }, 'admin-one')) as unknown as Row;
    await approveAndApply(restorePreview, 'community-chat-restore-1');
    const restored = (await db.collection('league_chat_messages').doc('visible-message-1').get()).data() as Row;
    expect(restored).toMatchObject({ status: 'visible', restoredBy: 'admin-one' });
    expect(restored.deletedAt).toBeUndefined();
  });

  it('requires missing versions for admin posts and creates a canonical league-chat message', async () => {
    const db = admin.firestore(); const existingTopic = { status: 'visible', title: 'Existing topic' };
    await db.collection('help_board_topics').doc('existing-topic-1').set(existingTopic);
    await expect(adminPreviewCommunityMutation.run(request({ action: 'help-admin-post', targetId: 'existing-topic-1', reason: 'Must not replace an existing topic', expectedVersion: documentVersion('existing-topic-1', existingTopic), payload: { title: 'Replacement', body: 'This must never overwrite the original.', targetLang: 'en', uiLang: 'ru' } }, 'admin-one'))).rejects.toMatchObject({ code: 'invalid-argument' });

    const messagePreview = await adminPreviewCommunityMutation.run(request({ action: 'league-chat-admin-message', targetId: 'admin-message-1', reason: 'Publish an official league-room message', expectedVersion: 'missing', payload: { roomId: 'group-9', weekId: '2026-W29', leagueId: 4, text: 'Official league update', postAsName: 'Phraseman Support' } }, 'admin-one')) as unknown as Row;
    await approveAndApply(messagePreview, 'community-chat-admin-message-1');
    expect((await db.collection('league_chat_messages').doc('admin-message-1').get()).data()).toMatchObject({ groupId: 'group-9', weekId: '2026-W29', leagueId: 4, authorUid: 'admin:admin-one', authorName: 'Phraseman Support', kind: 'user', text: 'Official league update', status: 'visible', reportCount: 0, adminAuthored: true, adminAuthoredBy: 'admin-one' });
  });

  it('publishes an admin Help Board reply and updates the topic atomically', async () => {
    const db = admin.firestore();
    const topic = { boardKey: 'en:ru', targetLang: 'en', uiLang: 'ru', title: 'Question', text: 'Topic text', status: 'visible', commentCount: 2, lastActivityAt: 1000, updatedAt: 1000 };
    const parent = { topicId: 'topic-reply-1', boardKey: 'en:ru', targetLang: 'en', uiLang: 'ru', text: 'Parent comment text', authorUid: 'help-user-2', authorName: 'Learner', status: 'visible', createdAt: 1200 };
    await Promise.all([
      db.collection('help_board_topics').doc('topic-reply-1').set(topic),
      db.collection('help_board_comments').doc('parent-comment-1').set(parent),
    ]);
    const preview = await adminPreviewCommunityMutation.run(request({ action: 'help-admin-comment', targetId: 'admin-comment-1', reason: 'Publish an official reply in the existing topic', expectedVersion: 'missing', payload: { topicId: 'topic-reply-1', replyToCommentId: 'parent-comment-1', body: 'Official reply to the learner.', postAsName: 'Phraseman Support' } }, 'admin-one')) as unknown as Row;
    await approveAndApply(preview, 'community-help-comment-1');
    const replay = await adminApplyCommunityMutation.run(request({ previewId: preview.previewId, confirmation: preview.confirmation, idempotencyKey: 'community-help-comment-1' }, 'admin-one')) as unknown as Row;
    expect(replay).toMatchObject({ replayed: true });
    expect((await db.collection('help_board_comments').doc('admin-comment-1').get()).data()).toMatchObject({ schemaVersion: 1, policyVersion: 1, topicId: 'topic-reply-1', boardKey: 'en:ru', targetLang: 'en', uiLang: 'ru', text: 'Official reply to the learner.', authorUid: 'admin:admin-one', authorName: 'Phraseman Support', replyToCommentId: 'parent-comment-1', replyToAuthorUid: 'help-user-2', replyToAuthorName: 'Learner', replyToText: 'Parent comment text', replyToIsCompass: false, status: 'visible', helpfulScore: 0, reportCount: 0, adminAuthored: true, adminAuthoredBy: 'admin-one' });
    const updatedTopic = (await db.collection('help_board_topics').doc('topic-reply-1').get()).data() as Row;
    expect(updatedTopic.commentCount).toBe(3);
    expect(Number(updatedTopic.lastActivityAt)).toBeGreaterThan(1000);
    expect((await db.collection('admin_log').where('action', '==', 'community.help-admin-comment').get()).size).toBe(1);
  });

  it('publishes community submissions from the unified moderator queue with the canonical inbox schema', async () => {
    const db = admin.firestore(); const queued = validSubmission(); await db.collection('community_pack_submissions').doc('queue-pack-1').set(queued);
    const preview = await adminPreviewCommunityMutation.run(request({ action: 'mod-queue-status', targetId: 'queue-pack-1', reason: 'Unified queue moderation completed', expectedVersion: documentVersion('queue-pack-1', queued), payload: { decision: 'approve', message: 'Queue approval' } }, 'admin-one')) as unknown as Row;
    await approveAndApply(preview, 'community-queue-pack-1');
    expect((await db.collection('community_pack_submissions').doc('queue-pack-1').get()).data()).toMatchObject({ status: 'approved', publishedPackId: 'queue-pack-1' });
    expect((await db.collection('community_packs').doc('queue-pack-1').get()).data()).toMatchObject({ listingStatus: 'published', authorStableId: 'queue-author', cardCount: 10 });
    const inbox = await db.collection('users').doc('queue-author').collection('community_seller_inbox').get();
    expect(inbox.docs[0]?.data()).toMatchObject({ type: 'moderation_result', result: 'approved', submissionId: 'queue-pack-1', message: 'Queue approval', seen: false });
    expect((await db.collection('admin_log').get()).size).toBe(1);
  });

  it('publishes approved league-chat queue rows as visible canonical messages in the same transaction', async () => {
    const db = admin.firestore(); const queued = { status: 'review', decision: 'pending', groupId: 'group-1', weekId: '2026-W29', leagueId: 3, authorUid: 'chat-author', authorAuthUid: 'auth-author', authorName: 'Author', authorAvatar: 'avatar-1', authorAura: 'aura-1', text: 'Reviewed message', normalizedText: 'reviewed message', moderationCategories: ['review'], moderationReasons: ['manual'], platform: 'android', appVersion: '1.5.43', createdAt: 12345 };
    await db.collection('league_chat_moderation_queue').doc('chat-approve-1').set(queued);
    const preview = await adminPreviewCommunityMutation.run(request({ action: 'league-chat-status', targetId: 'chat-approve-1', reason: 'League message reviewed', expectedVersion: documentVersion('chat-approve-1', queued), payload: { status: 'approved' } }, 'admin-one')) as unknown as Row;
    await approveAndApply(preview, 'community-chat-approve-1');
    const queueAfter = (await db.collection('league_chat_moderation_queue').doc('chat-approve-1').get()).data() as Row;
    expect(queueAfter).toMatchObject({ status: 'approved', decision: 'approved' });
    const messageId = String(queueAfter.publishedMessageId || ''); expect(messageId).not.toBe('');
    expect((await db.collection('league_chat_messages').doc(messageId).get()).data()).toMatchObject({ groupId: 'group-1', weekId: '2026-W29', leagueId: 3, authorUid: 'chat-author', authorAuthUid: 'auth-author', authorAura: 'aura-1', text: 'Reviewed message', status: 'visible', reportCount: 0, approvedFromQueueId: 'chat-approve-1', createdAt: 12345 });
    expect((await db.collection('admin_log').get()).size).toBe(1);
  });

  it('resyncs an Arena name and changes the wager flag with rollback metadata', async () => {
    const db = admin.firestore(); const profile = { displayName: 'Игрок', stats: { matchesPlayed: 0 } }; const wager = { rankedWagerEnabled: false, revision: 3 }; await Promise.all([db.collection('arena_profiles').doc('u1').set(profile), db.collection('users').doc('u1').set({ progress: { user_name: 'Canonical name' } }), db.collection('app_meta').doc('arena_feature_flags').set(wager)]);
    const namePreview = await adminPreviewCommunityMutation.run(request({ action: 'arena-profile-resync', targetId: 'u1', reason: 'Canonical user name verified', expectedVersion: documentVersion('u1', profile), payload: {} }, 'admin-one')) as unknown as Row; await approveAndApply(namePreview, 'community-arena-name-1');
    const wagerPreview = await adminPreviewCommunityMutation.run(request({ action: 'arena-wager-flag', targetId: 'arena_feature_flags', reason: 'Economy rollout approved', expectedVersion: documentVersion('arena_feature_flags', wager), payload: { enabled: true } }, 'admin-one')) as unknown as Row; await approveAndApply(wagerPreview, 'community-arena-wager-1');
    expect((await db.collection('arena_profiles').doc('u1').get()).data()).toMatchObject({ displayName: 'Canonical name' }); expect((await db.collection('app_meta').doc('arena_feature_flags').get()).data()).toMatchObject({ rankedWagerEnabled: true, rollbackBefore: wager }); expect((await db.collection('admin_log').get()).size).toBe(2);
  });
});
