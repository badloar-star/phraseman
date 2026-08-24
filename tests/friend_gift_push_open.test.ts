import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

describe('friend gift push opening', () => {
  test('push tap wakes the global gift host and bypasses the normal poll throttle', () => {
    const notifications = read('app/notifications.ts');
    const host = read('components/GlobalFriendGiftHost.tsx');

    const receivedStart = notifications.indexOf("case 'friend_gift_received':");
    const thanksStart = notifications.indexOf("case 'friend_gift_thanks':", receivedStart);
    const receivedBranch = notifications.slice(receivedStart, thanksStart);

    expect(receivedBranch).toContain("emitAppEvent('friend_gift_push_opened')");
    expect(receivedBranch).toContain("router.push('/(tabs)/friends')");
    expect(host).toContain("onAppEvent('friend_gift_push_opened'");
    expect(host).toContain('void poll(true)');
    expect(host).toContain('if (!force && now - last < POLL_INTERVAL_MS) return;');
    expect(host).toContain('if (force) forcePollPendingRef.current = true;');
    expect(host).toContain('if (forcePollPendingRef.current)');
  });
});
