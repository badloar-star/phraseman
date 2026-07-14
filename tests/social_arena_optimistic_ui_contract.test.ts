import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('social and arena optimistic UI contracts', () => {
  it('keeps friend request accept/decline/delete optimistic with rollback paths', () => {
    const friends = read('app/(tabs)/friends.tsx');
    expect(friends).toContain('const handleAcceptRequest = useCallback');
    expect(friends).toContain('setRequests(prev => prev.filter(item => item.fromUid !== request.fromUid))');
    expect(friends).toContain('setFriends(prev => prev.some(friend => friend.uid === request.fromUid) ? prev : [...prev, optimisticFriend])');
    expect(friends).toContain('setRequests(prev => prev.some(item => item.fromUid === request.fromUid) ? prev : [request, ...prev])');
    expect(friends).toContain('setFriends(prev => prev.filter(friend => friend.uid !== target.uid))');
    expect(friends).toContain('[previousFriend, ...prev]');
  });

  it('keeps profile friend actions and arena invite/chat/rematch optimistic', () => {
    const profile = read('components/PlayerProfileModal.tsx');
    expect(profile).toContain('friendRequestSentUids');
    expect(profile).toContain('next.delete(targetUid)');
    expect(profile).toContain('next.add(removedUid)');

    const lobby = read('app/arena_lobby.tsx');
    expect(lobby).toContain('arenaInvitedFriendUids');
    expect(lobby).toContain('next.delete(friendStableUid)');

    const room = read('app/arena_room.tsx');
    expect(room).toContain('type OptimisticArenaRoomChatMessage');
    expect(room).toContain("localStatus: 'sending'");
    expect(room).toContain("localStatus: 'failed'");
    expect(room).toContain('visibleChatMessages');

    const results = read('app/arena_results.tsx');
    expect(results).toContain('optimisticRematchOffer');
    expect(results).toContain("status: 'pending'");
    expect(results).toContain("status: 'accepted'");
    expect(results).toContain("status: 'declined'");
  });

  it('keeps modal/settings/profile/avatar optimistic actions rollback-aware', () => {
    const broadcast = read('components/GlobalBroadcastModal.tsx');
    expect(broadcast).toContain('onClose();');
    expect(broadcast).toContain('claimAndDismissGlobalBroadcastModal(payload, studyTarget).then');

    const reportPack = read('components/ReportPackModal.tsx');
    expect(reportPack).toContain('setDone(true)');
    expect(reportPack).toContain('void onPackHiddenOnDevice?.(packId)');
    expect(reportPack).toContain('await onPackHiddenOnDevice?.(null)');

    const reportUser = read('components/ReportUserModal.tsx');
    expect(reportUser).toContain('setDone(true)');
    expect(reportUser).toContain("emitAppEvent('action_toast'");

    // Profile-card purchase is server-authoritative: update the visible card only after success.
    const profileCard = read('components/PlayerProfileModal.tsx');
    expect(profileCard).toContain('const result = await upgradeProfileCardLevel();');
    expect(profileCard).toContain('if (result.ok === true)');

    const avatar = read('app/avatar_select.tsx');
    expect(avatar).toContain('let appliedOptimistic = false');
    expect(avatar).toContain('setActiveAuraId(previousAuraId)');
    expect(avatar).toContain('setActiveAvatar(previousAvatar)');

    const notifications = read('app/settings_notifications.tsx');
    expect(notifications).toContain('const previous = s');
    expect(notifications).toContain('setSaved(true)');
    expect(notifications).toContain('setS(previous)');

    const communityCreate = read('app/community_pack_create.tsx');
    expect(communityCreate).toContain('Отправляем набор на проверку...');
    expect(communityCreate).toContain("if (updatePackId) {\n          safeRouterBack(router, '/flashcards' as any);");
  });
});
