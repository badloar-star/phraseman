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

    expect(source).toContain('openGiftPicker(action.profile);');
    expect(sheet).toContain('handleHighFive(friendProfile)');
    expect(source).toContain('handleDeleteConfirm(action.profile.uid, action.profile.name);');
    expect(sheet).toContain('handleNudgeFriend');
    expect(sheet).toContain('handleDevNudge');
    expect(sheet).toContain("queueFirstFriendSheetAction(current, { kind: 'duel', profile: friendProfile })");
    expect(source).toContain("pathname: '/arena_friend_duel'");
    expect(source).toContain('friendStableUid: action.profile.uid');
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

  it('transitions gift and delete only after the details sheet has closed its modal guard', () => {
    const source = read('app/(tabs)/friends.tsx');
    const sheet = extract(source, '{togetherSheetSession !== null && (() => {', "{friendsTogetherPolicy.enabled && levelUpModal");

    expect(source).toContain('const [pendingTogetherSheetAction, setPendingTogetherSheetAction]');
    expect(source).toContain('const action = pendingTogetherSheetAction;');
    expect(source).toContain('if (togetherSheetSession !== null || modalWedgeActive) return;');
    expect(source).toContain('openGiftPicker(action.profile);');
    expect(source).toContain('handleDeleteConfirm(action.profile.uid, action.profile.name);');
    expect(source).toContain("pathname: '/arena_friend_duel'");
    expect(source).toContain('friendStableUid: action.profile.uid');
    expect(sheet).toContain("queueFirstFriendSheetAction(current, { kind: 'gift', profile: friendProfile })");
    expect(sheet).toContain("queueFirstFriendSheetAction(current, { kind: 'delete', profile: friendProfile })");
    expect(sheet).toContain("queueFirstFriendSheetAction(current, { kind: 'duel', profile: friendProfile })");
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
      'giftTarget !== null',
      'incomingGiftModal !== null',
      'friendQuestStarted !== null',
      'friendQuestCompleted !== null',
      'addModalOpen',
      'togetherSheetSession !== null',
    ]) {
      expect(guard).toContain(modalState);
    }
    expect(guard).toContain('modalWedgeGuardRef.current = modalWedgeActive;');
    expect(pendingEffect).toContain('if (togetherSheetSession !== null || modalWedgeActive) return;');
    expect(pendingEffect).toMatch(/}, \[[^\]]*modalWedgeActive[^\]]*\]\);/);
  });

  it('sends gifts from the sheet without opening a second confirm modal', () => {
    const source = read('app/(tabs)/friends.tsx');
    const requestSendGift = extract(source, 'const requestSendGift = (giftId: FriendGiftId) => {', 'const incomingReplyTarget');

    expect(source).not.toContain('giftConfirm');
    expect(source).not.toContain('friends-gift-confirm');
    expect(requestSendGift).toContain('const target = giftTarget;');
    expect(requestSendGift).not.toContain('await getShardsBalance()');
    expect(requestSendGift).toContain('const knownBalance = peekLastKnownShardsBalance();');
    expect(requestSendGift).toContain('const giftCost = giftCostForTarget(gift, target.uid);');
    expect(requestSendGift).toContain('knownBalance !== null && warmBalance < giftCost');
    expect(requestSendGift).toContain('void handleSendGift(giftId, target, knownBalance ?? Number.MAX_SAFE_INTEGER).finally');
  });

  it('closes the sheet and confirms the tap immediately while the callable continues in the background', () => {
    const source = read('app/(tabs)/friends.tsx');
    const handleSendGift = extract(source, 'const handleSendGift = async', 'const requestSendGift');
    const durableQueue = handleSendGift.indexOf('const queued = await enqueueFriendGiftSend');
    const backgroundCompletion = handleSendGift.indexOf('void queued.completion.then');
    const closeSheet = handleSendGift.indexOf('setGiftTarget(null);');
    const successToast = handleSendGift.indexOf("type: 'success'");
    const successFeedback = handleSendGift.lastIndexOf('showFeedback(', successToast);

    expect(closeSheet).toBeGreaterThanOrEqual(0);
    expect(successFeedback).toBeGreaterThan(closeSheet);
    expect(successToast).toBeGreaterThan(successFeedback);
    expect(durableQueue).toBeGreaterThanOrEqual(0);
    expect(backgroundCompletion).toBeGreaterThan(durableQueue);
    expect(closeSheet).toBeGreaterThan(durableQueue);
    expect(closeSheet).toBeLessThan(backgroundCompletion);
    expect(successFeedback).toBeLessThan(backgroundCompletion);
    expect(successToast).toBeLessThan(backgroundCompletion);
    expect(handleSendGift.slice(0, backgroundCompletion)).not.toContain('setGiftBalance(');
    expect(handleSendGift.slice(0, backgroundCompletion)).not.toContain('replaceShardsBalanceForAccountGeneration(');
    expect(handleSendGift).not.toContain('setSentGiftReceipt');
    expect(handleSendGift).not.toContain(['Аккаунт ещё', 'связывается', 'с облаком'].join(' '));
  });

  it('queues known-offline sends before background server delivery', () => {
    const source = read('app/(tabs)/friends.tsx');
    const handleSendGift = extract(source, 'const handleSendGift = async', 'const requestSendGift');
    const requestSendGift = extract(source, 'const requestSendGift = (giftId: FriendGiftId) => {', 'const incomingReplyTarget');

    expect(handleSendGift).not.toContain("getNetStatus() === 'offline'");
    expect(requestSendGift).not.toContain("getNetStatus() === 'offline'");
    expect(handleSendGift).toContain('enqueueFriendGiftSend({');
    expect(source).not.toContain('Нет интернета. Подключись к сети и попробуй ещё раз.');
  });

  it('does not claim an ambiguous network failure was uncharged', () => {
    const outbox = read('app/friend_gift_outbox.ts');
    const networkBranch = extract(
      outbox,
      "if (kind === 'network' || kind === 'unknown')",
      'await withAccountTransitionLock',
    );

    expect(networkBranch).not.toContain('не списан');
    expect(networkBranch).not.toContain('No se cobro');
    expect(networkBranch).not.toContain('not charged');
    expect(networkBranch).not.toContain('notifyDefinitiveFailure');
  });

  it('sends an incoming reply gift with the same non-blocking, offline-safe flow', () => {
    const source = read('app/(tabs)/friends.tsx');
    const handler = extract(
      source,
      'const handleIncomingGiftReply = useCallback',
      'const handleClaimFriendQuest = useCallback',
    );

    expect(handler).not.toContain('await getShardsBalance()');
    expect(handler).not.toContain("getNetStatus() === 'offline'");
    expect(handler).toContain('const knownBalance = peekLastKnownShardsBalance();');
    expect(handler).toContain('setIncomingGiftModal(null);');
    expect(handler).toContain('void handleSendGift(giftId, target, knownBalance ?? Number.MAX_SAFE_INTEGER).finally');
  });

  it('has no sending spinner or blocking sent-gift receipt modal', () => {
    const source = read('app/(tabs)/friends.tsx');

    expect(source).not.toContain('ActivityIndicator');
    expect(source).not.toContain('friend-gift-sent-modal');
    expect(source).not.toContain('sentGiftReceipt');
    expect(source).not.toContain('Отправляем подарок…');
  });

  it('awaits thanks RPC before one success and restores the modal on failure', () => {
    const source = read('app/(tabs)/friends.tsx');
    const handler = extract(
      source,
      'const handleIncomingGiftThanks = useCallback',
      'const handleIncomingGiftReply = useCallback',
    );
    const rpc = handler.indexOf('await sendFriendGiftThanks({');
    const successCopy = 'Thanks sent';
    const success = handler.indexOf(successCopy);
    const close = handler.indexOf('setIncomingGiftModal(null);');
    const catchBlock = handler.slice(handler.indexOf('} catch {'));

    expect(rpc).toBeGreaterThanOrEqual(0);
    expect(success).toBeGreaterThan(rpc);
    expect(close).toBeGreaterThan(rpc);
    expect(handler.match(new RegExp(successCopy, 'g'))).toHaveLength(1);
    expect(catchBlock.indexOf('setIncomingGiftModal(previousModal);')).toBeLessThan(
      catchBlock.indexOf('showFeedback('),
    );
  });

  it('shows a started friend quest directly after the background send resolves', () => {
    const source = read('app/(tabs)/friends.tsx');
    const handleSendGift = extract(source, 'const handleSendGift = async', 'const requestSendGift');

    expect(handleSendGift).toContain('setFriendQuestStarted(quest);');
    expect(source).toContain('visible={friendQuestStarted !== null}');
    expect(source).not.toContain('pendingFriendQuestStarted');
  });
});
