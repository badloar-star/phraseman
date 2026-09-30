import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function extract(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('friends tab gift interaction contract', () => {
  it('uses the approved minimal friend row routes', () => {
    const source = read('app/(tabs)/friends.tsx');

    expect(source).toContain("import FriendListRow from '../../components/friends_together/FriendListRow';");
    // зачем (аудит скорости 2026-08-22): renderItem раньше создавал новую
    // стрелочную обёртку на КАЖДЫЙ item при каждом рендере экрана — ломало
    // React.memo(FriendListRow). Теперь передаются стабильные by-uid обёртки
    // (useCallback с ref-lookup профиля), которые внутри всё равно зовут
    // openProfile(profile)/openFriendSheet(profile) — маршрут тот же.
    expect(source).toContain('onOpenProfile={openProfileByUid}');
    expect(source).toContain('onOpenDetails={openFriendSheetByUid}');
    expect(source).toContain('const openProfileByUid = useCallback((friendUid: string) => {');
    expect(source).toContain('if (profile) openProfile(profile);');
    expect(source).toContain('const openFriendSheetByUid = useCallback((friendUid: string) => {');
    expect(source).toContain('if (profile) openFriendSheet(profile);');
  });

  it('removes dense inline row actions after moving them into the details sheet', () => {
    const source = read('app/(tabs)/friends.tsx');
    expect(source).not.toContain('function FriendRow(');
    expect(source).not.toContain('function HighFiveButton(');
    expect(source).not.toContain('friend-row-actions-');
    expect(source).not.toContain('friend-together-incoming-');
    expect(source).not.toContain('friend-together-gift-ready-');
    expect(source).not.toContain('testID={`friend-together-nudge-${profile.uid}`}');
    expect(source).not.toContain('testID={`friend-high-five-${profile.uid}`}');
    expect(source).not.toContain('testID={`friend-gift-${profile.uid}`}');
    expect(source).not.toContain('testID={`friend-delete-${profile.uid}`}');
  });

  it('keeps every sheet action on the established friend handlers', () => {
    const source = read('app/(tabs)/friends.tsx');
    const sheet = extract(source, '{togetherSheetSession !== null && (() => {', "{friendsTogetherPolicy.enabled && levelUpModal");

    expect(source).not.toContain('openGiftPicker(action.profile);');
    expect(sheet).toContain('handleHighFive(friendProfile)');
    expect(source).toContain('handleDeleteConfirm(action.profile.uid, action.profile.name);');
    expect(sheet).toContain('handleNudgeFriend');
    expect(sheet).toContain('handleDevNudge');
    // зачем: D83 — Арена удалена, дуэли из шторки друга больше нет.
    expect(sheet).not.toContain("queueFirstFriendSheetAction(current, { kind: 'duel', profile: friendProfile })");
    expect(source).not.toContain("pathname: '/arena_friend_duel'");
  });

  it('keeps sheet availability and selected-friend cleanup independent from Together UI', () => {
    const source = read('app/(tabs)/friends.tsx');

    expect(source).toContain('{togetherSheetSession !== null && (() => {');
    expect(source).toContain('const togetherDisplay = pair && friendsTogetherUiEnabled');
    expect(source).toContain('isCurrentFriendSheetMember(session.uid, friends, currentDevBots)');
    expect(source).toContain('createFriendSheetSession(profile)');
    expect(source).toContain('resolveFriendSheetProfile(sheetSession, sortedFriends)');
  });

  it('uses current membership instead of the profile cache for selected-friend cleanup', () => {
    const source = read('app/(tabs)/friends.tsx');
    const cleanupEffect = source.indexOf('isCurrentFriendSheetMember(session.uid, friends, currentDevBots)');
    const cleanupSlice = source.slice(cleanupEffect, cleanupEffect + 420);

    expect(cleanupEffect).toBeGreaterThan(source.indexOf('const devBots = devBotsState.bots;'));
    expect(source.slice(cleanupEffect - 120, cleanupEffect + 280)).not.toContain('profiles[');
    expect(cleanupSlice.indexOf('setPendingTogetherSheetAction(null);')).toBeGreaterThanOrEqual(0);
    expect(cleanupSlice.indexOf('setPendingTogetherSheetAction(null);')).toBeLessThan(
      cleanupSlice.indexOf('if (!session.visible) return;'),
    );
  });

  it('transitions delete and duel only after the details sheet has closed its modal guard', () => {
    const source = read('app/(tabs)/friends.tsx');
    const sheet = extract(source, '{togetherSheetSession !== null && (() => {', "{friendsTogetherPolicy.enabled && levelUpModal");

    expect(source).toContain('const [pendingTogetherSheetAction, setPendingTogetherSheetAction]');
    expect(source).toContain('const action = pendingTogetherSheetAction;');
    expect(source).toContain('if (togetherSheetSession !== null || modalWedgeActive) return;');
    expect(source).not.toContain('openGiftPicker(action.profile);');
    expect(source).toContain('handleDeleteConfirm(action.profile.uid, action.profile.name);');
    expect(source).not.toContain("pathname: '/arena_friend_duel'");
    expect(sheet).not.toContain("queueFirstFriendSheetAction(current, { kind: 'gift', profile: friendProfile })");
    expect(sheet).toContain("queueFirstFriendSheetAction(current, { kind: 'delete', profile: friendProfile })");
    // зачем: D83 — Арена удалена, дуэли из шторки друга больше нет.
    expect(sheet).not.toContain("queueFirstFriendSheetAction(current, { kind: 'duel', profile: friendProfile })");
    expect(sheet).toContain('requestDismiss();');
    expect(sheet).toContain('onDismissed={() => setTogetherSheetSession(current => completeFriendSheetSession(current, friendUid))}');
  });

  it('reacts when every modal wedge clears so a queued sheet action cannot stall', () => {
    const source = read('app/(tabs)/friends.tsx');
    const guard = extract(source, 'const modalWedgeActive =', '  // ── Derived');
    const pendingEffect = extract(source, 'useEffect(() => {\n    const action = pendingTogetherSheetAction;', '  // ── Derived');

    for (const modalState of [
      'selectedPlayer !== null',
      'deleteTarget !== null',
      'addModalOpen',
      'togetherSheetSession !== null',
    ]) {
      expect(guard).toContain(modalState);
    }
    expect(guard).toContain('modalWedgeGuardRef.current = modalWedgeActive;');
    expect(pendingEffect).toContain('if (togetherSheetSession !== null || modalWedgeActive) return;');
    expect(pendingEffect).toMatch(/}, \[[^\]]*modalWedgeActive[^\]]*\]\);/);
  });

});
