import {
  clearLingmanVideoTitleHandoff,
  getLingmanVideoHandoffDebugSnapshotForTests,
  peekLingmanVideoHandoff,
  setLingmanVideoHandoff,
} from '../app/lingman_video_title_handoff';

describe('bounded Lingman video title handoff', () => {
  beforeEach(clearLingmanVideoTitleHandoff);

  test('repeated peeks preserve an immutable atomic context for remounts', () => {
    setLingmanVideoHandoff({ videoId: 'abc_123', channelId: 'channel_1', title: '  Catalog   title  ' }, 1_000);
    expect(peekLingmanVideoHandoff('wrong_1', 1_001)).toBeNull();
    const first = peekLingmanVideoHandoff('abc_123', 1_002);
    const remount = peekLingmanVideoHandoff('abc_123', 1_003);
    expect(first).toEqual({ videoId: 'abc_123', channelId: 'channel_1', title: 'Catalog title' });
    expect(remount).toEqual(first);
    expect(remount).not.toBe(first);
  });

  test('expires, clears, validates both ids, and replaces the single slot', () => {
    expect(setLingmanVideoHandoff({ videoId: 'bad id', channelId: 'channel_1', title: 'Title' }, 1_000)).toBe(false);
    expect(setLingmanVideoHandoff({ videoId: 'video_1', channelId: 'bad channel', title: 'Title' }, 1_000)).toBe(false);
    setLingmanVideoHandoff({ videoId: 'video_1', channelId: 'channel_1', title: 'First' }, 1_000);
    setLingmanVideoHandoff({ videoId: 'video_2', channelId: 'channel_2', title: 'Second' }, 1_001);
    expect(peekLingmanVideoHandoff('video_1', 1_002)).toBeNull();
    expect(peekLingmanVideoHandoff('video_2', 1_002)?.title).toBe('Second');
    setLingmanVideoHandoff({ videoId: 'video_3', channelId: 'channel_3', title: 'Third' }, 1_000);
    const expiredSnapshot = getLingmanVideoHandoffDebugSnapshotForTests();
    expect(peekLingmanVideoHandoff('video_3', 1_000 + 60_001)).toBeNull();
    expect(peekLingmanVideoHandoff('video_3', 1_000 + 60_002)).toBeNull();
    expect(getLingmanVideoHandoffDebugSnapshotForTests()).toEqual(expiredSnapshot);
    setLingmanVideoHandoff({ videoId: 'video_4', channelId: 'channel_4', title: 'Fourth' }, 2_000);
    clearLingmanVideoTitleHandoff();
    expect(peekLingmanVideoHandoff('video_4', 2_001)).toBeNull();
  });

  test('normalizes to 100 Unicode code points and rejects malformed surrogates', () => {
    const longTitle = `  ${'😀'.repeat(101)}   tail  `;
    expect(setLingmanVideoHandoff({ videoId: 'video_1', channelId: 'channel_1', title: longTitle }, 1_000)).toBe(true);
    expect(Array.from(peekLingmanVideoHandoff('video_1', 1_001)?.title ?? '')).toHaveLength(100);
    expect(setLingmanVideoHandoff({ videoId: 'video_2', channelId: 'channel_2', title: `bad\uD800title` }, 1_000)).toBe(false);
  });
});
