import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function source(): string {
  return fs.readFileSync(path.join(root, 'app', 'firestore_friend_requests.ts'), 'utf8');
}

function exportedBlock(input: string, name: string, nextName: string): string {
  const start = input.indexOf(`export function ${name}`);
  const end = input.indexOf(nextName, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return input.slice(start, end);
}

describe('D66 friends realtime contract', () => {
  it('uses bounded one-shot reads for friends and pending requests', () => {
    const input = source();
    const friends = exportedBlock(input, 'subscribeToFriends', '// ── subscribeToIncomingRequests');
    const requests = exportedBlock(input, 'subscribeToIncomingRequests', '// ── cleanupStaleFriendData');

    expect(friends).toContain('.limit(500)');
    expect(friends).toContain('.get()');
    expect(friends).not.toContain('.onSnapshot(');
    expect(requests).toContain(".where('status', '==', 'pending')");
    expect(requests).toContain('.limit(200)');
    expect(requests).toContain('.get()');
    expect(requests).not.toContain('.onSnapshot(');
  });

  it('keeps one-shot results account-scoped, TTL-bound, and cancellable', () => {
    const input = source();
    const friends = exportedBlock(input, 'subscribeToFriends', '// ── subscribeToIncomingRequests');
    const requests = exportedBlock(input, 'subscribeToIncomingRequests', '// ── cleanupStaleFriendData');

    // зачем (владелец 21.10, №45 «сократить чтения Друзей»): кэш 30 мин; правило 17.10 «друзья мгновенно» держит проба
    // уведомлений на вкладке — событие дружбы сбрасывает кэш (invalidateFriendsSocialReadCaches).
    expect(input).toContain('export const FRIENDS_REALTIME_REPLACEMENT_TTL_MS = 30 * 60_000');
    expect(input).toContain('export function invalidateFriendsSocialReadCaches(');
    const tab = fs.readFileSync(path.join(root, 'app', '(tabs)', 'friends.tsx'), 'utf8');
    expect(tab).toContain("probeUserNotificationsHead('friends_focus')");
    expect(tab).toContain("row.type === 'friend_request' || row.type === 'friend_accepted'");
    expect(tab).toContain("invalidateFriendsSocialReadCaches('notification_friend_event')");
    expect(tab).toContain('friendsAccountStore.retry();');
    expect(tab).not.toContain('refreshUserNotificationsOnce({ minIntervalMs: 30_000 })');
    expect(input).toContain('friendReadCache');
    expect(friends).toContain('if (cancelled) return;');
    expect(requests).toContain('if (cancelled) return;');
  });

  it('runs the repair cleanup once a day and reads only what it may delete', () => {
    const input = source();
    const cleanup = input.slice(input.indexOf('// ── cleanupStaleFriendData'));

    // зачем (владелец 21.10, №45 шаг 6; Ревизор п.5): ремонт раз в сутки, заявки — только accepted, друзья — первые 20.
    expect(cleanup).toContain('const FRIEND_CLEANUP_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;');
    expect(cleanup).toContain(".where('status', '==', 'accepted')");
    expect(cleanup).toContain('.limit(FRIEND_CLEANUP_REVERSE_CHECK_LIMIT)');
    expect(cleanup).not.toContain("collection('friend_requests').get()");
    expect(cleanup).not.toContain("collection('friends').get()");
  });
});
