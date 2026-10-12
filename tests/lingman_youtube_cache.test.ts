import { __resetAccountGenerationForTests, ensureAccountGeneration } from '../app/account_generation';
import {
  beginLingmanSnapshotRequest, commitLingmanSnapshot, patchLingmanUnread,
  readLingmanSnapshot, resetLingmanSnapshotCacheForTests,
} from '../app/lingman_youtube_cache';

const snapshot = { videos: [], latestVideoId: 'v1', unreadCount: 2, fetchedAtMs: 1 };

describe('Lingman snapshot cache', () => {
  beforeEach(() => { __resetAccountGenerationForTests(); resetLingmanSnapshotCacheForTests(); });

  it('keeps stale catalog readable and isolates account/channel', () => {
    const token = ensureAccountGeneration('alice');
    const request = beginLingmanSnapshotRequest(token, 'channel-a');
    expect(commitLingmanSnapshot(request, snapshot, 1_000)).toBe(true);
    expect(readLingmanSnapshot(token, 'channel-a', 30_000)).toEqual({ value: snapshot, isFresh: true });
    expect(readLingmanSnapshot(token, 'channel-a', 70_000)).toEqual({ value: snapshot, isFresh: false });
    expect(readLingmanSnapshot(token, 'channel-b')).toBeNull();
    expect(readLingmanSnapshot(ensureAccountGeneration('bob'), 'channel-a')).toBeNull();
  });

  it('patches unread in cache and rejects superseded commits', () => {
    const token = ensureAccountGeneration('alice');
    const first = beginLingmanSnapshotRequest(token, 'channel-a');
    const latest = beginLingmanSnapshotRequest(token, 'channel-a');
    expect(commitLingmanSnapshot(first, snapshot)).toBe(false);
    expect(commitLingmanSnapshot(latest, snapshot)).toBe(true);
    expect(patchLingmanUnread(token, 'channel-a', 0)).toBe(true);
    expect(readLingmanSnapshot(token, 'channel-a')?.value.unreadCount).toBe(0);
  });

  it('screen masks account/channel changes and updates cached unread', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lingman_videos.tsx'), 'utf8');
    // зачем (перепрогон 12.10): маска стала строже — снимок скрыт и во время смены канала (!pendingChannel).
    expect(source).toContain('const snapshot = !pendingChannel && loadedKey === currentRenderKey ? cachedSnapshot : null');
    expect(source).toContain('const visibleLoading = loading || loadedKey !== currentRenderKey');
    // зачем (7b27ddbf6, откат значка при сбое markSeen): поколение аккаунта снимается один раз в seenToken и идёт и в
    // мгновенное обновление, и в откат — запись чужого аккаунта после смены по-прежнему невозможна.
    expect(source).toContain('const seenToken = captureAccountGeneration();');
    expect(source).toContain('patchLingmanUnread(seenToken, channel.channelId, nextUnread)');
    expect(source).toContain('patchLingmanUnread(seenToken, channel.channelId, unreadCount)');
    expect(source).toContain('if (isLingmanSnapshotRequestCurrent(request))');
    expect(source).toContain('setCachedSnapshot(committed?.value ?? next)');
  });

  it('late refresh cannot increase unread after local mark-seen mutation', () => {
    const token = ensureAccountGeneration('alice');
    const seed = beginLingmanSnapshotRequest(token, 'channel-a');
    expect(commitLingmanSnapshot(seed, snapshot)).toBe(true);
    const pendingRefresh = beginLingmanSnapshotRequest(token, 'channel-a');
    expect(patchLingmanUnread(token, 'channel-a', 0)).toBe(true);
    expect(commitLingmanSnapshot(pendingRefresh, { ...snapshot, unreadCount: 2 })).toBe(true);
    expect(readLingmanSnapshot(token, 'channel-a')?.value.unreadCount).toBe(0);
  });
});
