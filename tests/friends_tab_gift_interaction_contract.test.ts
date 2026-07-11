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

    expect(friendRow).toMatch(/<View\s+testID=\{`friend-row-\$\{profile\.uid\}`\}/);
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
    expect(requestSendGift).toContain('void handleSendGift(giftId, target, giftBalance);');
  });

  it('shows pending feedback without closing the gift sheet before the callable resolves', () => {
    const source = read('app/(tabs)/friends.tsx');
    const handleSendGift = extract(source, 'const handleSendGift = async', 'const requestSendGift');
    const sendCall = handleSendGift.indexOf('sendFriendGiftWithShards({');
    const closeSheet = handleSendGift.indexOf('setGiftTarget(null);', sendCall);
    const pendingToast = handleSendGift.indexOf("emitAppEvent('action_toast'");

    expect(pendingToast).toBeGreaterThanOrEqual(0);
    expect(closeSheet).toBeGreaterThanOrEqual(0);
    expect(pendingToast).toBeLessThan(sendCall);
    expect(closeSheet).toBeGreaterThan(sendCall);
  });
});
