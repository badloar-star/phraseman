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
  it('keeps friend row profile, gift, and delete as separate touch targets', () => {
    const source = read('app/(tabs)/friends.tsx');
    const friendRow = extract(source, 'function FriendRow', 'function RequestRow');

    expect(friendRow).toContain('testID={`friend-row-${profile.uid}`}');
    expect(friendRow).toContain('testID={`friend-row-profile-${profile.uid}`}');
    expect(friendRow).toContain('testID={`friend-gift-${profile.uid}`}');
    expect(friendRow).toContain('testID={`friend-delete-${profile.uid}`}');
    expect(friendRow).toContain('style={{ width: 44, height: 44');
    expect(friendRow).not.toContain('accessible={false}');
  });

  it('sends gifts from the sheet without opening a second confirm modal', () => {
    const source = read('app/(tabs)/friends.tsx');
    const requestSendGift = extract(source, 'const requestSendGift = (giftId: FriendGiftId) => {', 'const incomingReplyTarget');

    expect(source).not.toContain('giftConfirm');
    expect(source).not.toContain('friends-gift-confirm');
    expect(requestSendGift).toContain('const target = giftTarget;');
    expect(requestSendGift).not.toContain('await getShardsBalance()');
    expect(requestSendGift).toContain('const knownBalance = peekLastKnownShardsBalance();');
    expect(requestSendGift).toContain('knownBalance !== null && warmBalance < gift.costShards');
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

  it('stops known-offline sends before closing the sheet, showing success, or calling the server', () => {
    const source = read('app/(tabs)/friends.tsx');
    const handleSendGift = extract(source, 'const handleSendGift = async', 'const requestSendGift');
    const requestSendGift = extract(source, 'const requestSendGift = (giftId: FriendGiftId) => {', 'const incomingReplyTarget');
    const handleOffline = handleSendGift.indexOf("if (getNetStatus() === 'offline')");
    const requestOffline = requestSendGift.indexOf("if (getNetStatus() === 'offline')");

    expect(handleOffline).toBeGreaterThanOrEqual(0);
    expect(handleOffline).toBeLessThan(handleSendGift.indexOf('setGiftTarget(null);'));
    expect(handleOffline).toBeLessThan(handleSendGift.indexOf("type: 'success'"));
    expect(handleOffline).toBeLessThan(handleSendGift.indexOf('enqueueFriendGiftSend({'));
    expect(requestOffline).toBeGreaterThanOrEqual(0);
    expect(requestOffline).toBeLessThan(requestSendGift.indexOf('const warmBalance ='));
    expect(source).toContain('Нет интернета. Подключись к сети и попробуй ещё раз.');
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
    expect(handler).toContain("if (getNetStatus() === 'offline')");
    expect(handler.indexOf("if (getNetStatus() === 'offline')")).toBeLessThan(handler.indexOf('setIncomingGiftModal(null);'));
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
