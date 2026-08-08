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
    const requestSendGift = extract(source, 'const requestSendGift = async (giftId: FriendGiftId) => {', 'const incomingReplyTarget');

    expect(source).not.toContain('giftConfirm');
    expect(source).not.toContain('friends-gift-confirm');
    expect(requestSendGift).toContain('const target = giftTarget;');
    expect(requestSendGift).toContain('await handleSendGift(giftId, target, freshBalance);');
  });

  it('shows only a pending receipt before the callable resolves without spending or replacing balance', () => {
    const source = read('app/(tabs)/friends.tsx');
    const handleSendGift = extract(source, 'const handleSendGift = async', 'const requestSendGift');
    const sendCall = handleSendGift.indexOf('sendFriendGiftWithShards({');
    const closeSheet = handleSendGift.indexOf('setGiftTarget(null);');
    const receipt = handleSendGift.indexOf('setSentGiftReceipt({');
    const pendingReceipt = handleSendGift.indexOf("status: 'pending'");

    expect(closeSheet).toBeGreaterThanOrEqual(0);
    expect(receipt).toBeGreaterThanOrEqual(0);
    expect(pendingReceipt).toBeGreaterThanOrEqual(0);
    expect(closeSheet).toBeLessThan(sendCall);
    expect(receipt).toBeLessThan(sendCall);
    expect(pendingReceipt).toBeLessThan(sendCall);
    expect(handleSendGift.slice(0, sendCall)).not.toContain('setGiftBalance(');
    expect(handleSendGift.slice(0, sendCall)).not.toContain('replaceShardsBalanceForAccountGeneration(');
    expect(handleSendGift).not.toContain(['Аккаунт ещё', 'связывается', 'с облаком'].join(' '));
  });

  it('does not claim an ambiguous network failure was uncharged', () => {
    const source = read('app/(tabs)/friends.tsx');
    const handleSendGift = extract(source, 'const handleSendGift = async', 'const requestSendGift');
    const networkBranch = handleSendGift.slice(handleSendGift.indexOf("kind === 'network'"));

    expect(networkBranch).not.toContain('не списан');
    expect(networkBranch).not.toContain('No se cobro');
    expect(networkBranch).not.toContain('not charged');
  });

  it('renders pending copy without a success checkmark or spent semantics until confirmation', () => {
    const source = read('app/(tabs)/friends.tsx');
    const sentGiftModal = extract(source, 'visible={sentGiftReceipt !== null}', 'visible={incomingGiftModal !== null}');

    expect(sentGiftModal).toContain("sentGiftReceipt?.status === 'pending'");
    expect(sentGiftModal).toContain("sentGiftReceipt?.status === 'pending' ? 'time-outline'");
    expect(sentGiftModal).toContain("sentGiftReceipt.status === 'confirmed'");
  });

  it('confirms gift success only after the callable resolves', () => {
    const source = read('app/(tabs)/friends.tsx');
    const handleSendGift = extract(source, 'const handleSendGift = async', 'const requestSendGift');
    const response = handleSendGift.indexOf('const res = await sendFriendGiftWithShards');
    const successToast = handleSendGift.indexOf("type: 'success'");
    const successFeedback = handleSendGift.lastIndexOf('showFeedback(', successToast);

    expect(response).toBeGreaterThanOrEqual(0);
    expect(successFeedback).toBeGreaterThan(response);
    expect(successToast).toBeGreaterThan(response);
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

  it('queues a started friend quest until the sent-gift modal has fully dismissed', () => {
    const source = read('app/(tabs)/friends.tsx');
    const handleSendGift = extract(source, 'const handleSendGift = async', 'const requestSendGift');
    const sentGiftModal = extract(source, 'visible={sentGiftReceipt !== null}', 'visible={incomingGiftModal !== null}');

    expect(source).toContain('const [pendingFriendQuestStarted, setPendingFriendQuestStarted]');
    expect(source).toContain('const sentGiftReceiptNativeVisibleRef = useRef(false);');
    expect(handleSendGift).toContain('sentGiftReceiptNativeVisibleRef.current = true;');
    expect(handleSendGift).toContain('if (sentGiftReceiptNativeVisibleRef.current) {');
    expect(handleSendGift).toContain('setPendingFriendQuestStarted(quest);');
    expect(handleSendGift).toContain('setFriendQuestStarted(quest);');
    expect(sentGiftModal).toContain('onDismiss={handleSentGiftReceiptDismissed}');
    expect(source).toContain('sentGiftReceiptNativeVisibleRef.current = false;');
    expect(source).toContain('visible={friendQuestStarted !== null && sentGiftReceipt === null}');
    expect(source).toContain('|| sentGiftReceipt !== null || pendingFriendQuestStarted !== null');
  });
});
