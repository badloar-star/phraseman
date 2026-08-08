import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('social optimistic UI contracts', () => {
  it('keeps friend request accept/decline/delete optimistic with rollback paths', () => {
    const friends = read('app/(tabs)/friends.tsx');
    expect(friends).toContain('const handleAcceptRequest = useCallback');
    expect(friends).toContain('setRequests(prev => prev.filter(item => item.fromUid !== request.fromUid))');
    expect(friends).toContain('setFriends(prev => prev.some(friend => friend.uid === request.fromUid) ? prev : [...prev, optimisticFriend])');
    expect(friends).toContain('setRequests(prev => prev.some(item => item.fromUid === request.fromUid) ? prev : [request, ...prev])');
    expect(friends).toContain('setFriends(prev => prev.filter(friend => friend.uid !== target.uid))');
    expect(friends).toContain('[previousFriend, ...prev]');
  });

  it('keeps profile friend actions optimistic with rollback paths', () => {
    // Arena lobby/results were removed with the Arena decommission; profile friend
    // actions remain the live optimistic social surface.
    const profile = read('components/PlayerProfileModal.tsx');
    expect(profile).toContain('friendRequestSentUids');
    expect(profile).toContain('next.delete(targetUid)');
    expect(profile).toContain('next.add(removedUid)');
  });

  it('keeps modal/settings/profile/avatar actions rollback-aware or journal-safe', () => {
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

    // Avatar/aura purchase is NOT optimistic by design: it runs through a persisted
    // purchase intent (prepare -> idempotent shard charge -> grant ownership -> apply)
    // with crash recovery on mount. Success UI appears only after the real outcome;
    // failure surfaces an error toast (or a shards-shop redirect when insufficient),
    // so no rollback of a faked applied state is needed or allowed.
    const avatar = read('app/avatar_select.tsx');
    expect(avatar).toContain('resumePersistedCustomizationPurchase');
    expect(avatar).toContain('prepareCustomizationPurchase');
    expect(avatar).toContain('resumeCustomizationPurchase');
    expect(avatar).toContain("showToast('error', copy.purchaseError)");
    expect(avatar).toContain("router.push({ pathname: '/shards_shop', params: { source: 'avatar_customization' } } as any)");

    const notifications = read('app/settings_notifications.tsx');
    expect(notifications).toContain('const previous = s');
    expect(notifications).toContain('setSaved(true)');
    expect(notifications).toContain('setS(previous)');

    const communityCreate = read('app/community_pack_create.tsx');
    expect(communityCreate).toContain('Отправляем набор на проверку...');
    expect(communityCreate).toContain('if (updatePackId) {');
    expect(communityCreate).toContain("safeRouterBack(router, '/flashcards' as any);");
  });
});
