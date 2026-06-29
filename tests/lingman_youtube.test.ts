import {
  buildLingmanEmbedHtml,
  LINGMAN_CHANNEL_HANDLE,
  LINGMAN_CHANNEL_ID,
  LINGMAN_CHANNEL_URL,
  getLingmanYoutubeUnreadCount,
  getLingmanYoutubeWatchUrl,
  getTrustedLingmanYoutubeUrl,
  isLingmanLongFormVideo,
  LINGMAN_YOUTUBE_EMBED_BASE_URL,
  parseLingmanYoutubeFeed,
  parseYoutubeVideoId,
  parsePinnedVideos,
  mergePinnedVideos,
  type LingmanYoutubeVideo,
} from '../app/lingman_youtube';

function makeVideo(id: string): LingmanYoutubeVideo {
  return {
    id,
    title: id,
    description: '',
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    publishedAt: '2026-06-01T00:00:00+00:00',
    updatedAt: '2026-06-01T00:00:00+00:00',
    watchUrl: getLingmanYoutubeWatchUrl(id),
  };
}

describe('lingman_youtube', () => {
  it('points the catalog feed and channel button to the PHRASEMAN English channel', () => {
    expect(LINGMAN_CHANNEL_ID).toBe('UCNNVZbMkh4jrW6uluaaJTwA');
    expect(LINGMAN_CHANNEL_HANDLE).toBe('@PhrasemanENGLISH');
    expect(LINGMAN_CHANNEL_URL).toBe('https://www.youtube.com/@PhrasemanENGLISH/videos');
  });

  it('parses the YouTube RSS feed entries used by the catalog', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <yt:videoId>X7L3Xg3qITo</yt:videoId>
          <title>200 phrases</title>
          <published>2026-05-31T13:21:06+00:00</published>
          <updated>2026-05-31T14:37:55+00:00</updated>
          <media:group>
            <media:title>200 phrases</media:title>
            <media:thumbnail url="https://i1.ytimg.com/vi/X7L3Xg3qITo/hqdefault.jpg" width="480" height="360"/>
            <media:description>Practice phrases after the video.</media:description>
            <media:community>
              <media:statistics views="179"/>
            </media:community>
          </media:group>
        </entry>
      </feed>`;

    const videos = parseLingmanYoutubeFeed(xml);

    expect(videos).toEqual([
      {
        id: 'X7L3Xg3qITo',
        title: '200 phrases',
        description: 'Practice phrases after the video.',
        thumbnailUrl: 'https://i1.ytimg.com/vi/X7L3Xg3qITo/hqdefault.jpg',
        publishedAt: '2026-05-31T13:21:06+00:00',
        updatedAt: '2026-05-31T14:37:55+00:00',
        watchUrl: 'https://www.youtube.com/watch?v=X7L3Xg3qITo',
        viewCount: 179,
      },
    ]);
  });

  it('filters Shorts out of the catalog feed', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <yt:videoId>longVideo1</yt:videoId>
          <title>Long lesson</title>
          <published>2026-06-19T14:05:20+00:00</published>
          <updated>2026-06-19T14:12:17+00:00</updated>
          <media:group>
            <media:title>Long lesson</media:title>
            <media:description>Full lesson with examples.</media:description>
          </media:group>
        </entry>
        <entry>
          <yt:videoId>shortVideo1</yt:videoId>
          <title>Short clip</title>
          <published>2026-06-19T13:31:12+00:00</published>
          <updated>2026-06-19T13:48:03+00:00</updated>
          <media:group>
            <media:title>Short clip</media:title>
            <media:description>Fast clip #short</media:description>
          </media:group>
        </entry>
      </feed>`;

    expect(parseLingmanYoutubeFeed(xml).map((video) => video.id)).toEqual(['longVideo1']);
    expect(isLingmanLongFormVideo({ id: 'xdISurogEds', title: 'Any title', description: '' })).toBe(false);
  });

  it('builds an official YouTube embed without autoplay', () => {
    const html = buildLingmanEmbedHtml('X7L3Xg3qITo');

    expect(html).toContain('https://www.youtube.com/embed/X7L3Xg3qITo');
    expect(html).toContain('playsinline=1');
    expect(html).toContain(`origin=${encodeURIComponent(LINGMAN_YOUTUBE_EMBED_BASE_URL.replace(/\/$/, ''))}`);
    expect(html).toContain(`widget_referrer=${encodeURIComponent(LINGMAN_YOUTUBE_EMBED_BASE_URL)}`);
    expect(html).toContain('<meta name="referrer" content="strict-origin-when-cross-origin">');
    expect(html).not.toContain('autoplay=1');
    expect(html).not.toContain('modestbranding=1');
    expect(html).not.toContain(' autoplay;');
  });

  it('counts unread videos relative to the last opened latest video', () => {
    const videos = [
      { id: 'latest' },
      { id: 'middle' },
      { id: 'seen' },
    ].map((video) => ({
      ...video,
      title: video.id,
      description: '',
      thumbnailUrl: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
      publishedAt: '2026-05-31T13:21:06+00:00',
      updatedAt: '2026-05-31T13:21:06+00:00',
      watchUrl: getLingmanYoutubeWatchUrl(video.id),
    }));

    expect(getLingmanYoutubeUnreadCount([], null)).toBe(0);
    expect(getLingmanYoutubeUnreadCount(videos, null)).toBe(1);
    expect(getLingmanYoutubeUnreadCount(videos, 'latest')).toBe(0);
    expect(getLingmanYoutubeUnreadCount(videos, 'middle')).toBe(1);
    expect(getLingmanYoutubeUnreadCount(videos, 'seen')).toBe(2);
    expect(getLingmanYoutubeUnreadCount(videos, 'missing')).toBe(1);
  });

  it('only returns trusted YouTube URLs for external fallbacks', () => {
    expect(getLingmanYoutubeWatchUrl('X7L3Xg3qITo')).toBe('https://www.youtube.com/watch?v=X7L3Xg3qITo');
    expect(getTrustedLingmanYoutubeUrl('https://www.youtube.com/watch?v=X7L3Xg3qITo')).toBe('https://www.youtube.com/watch?v=X7L3Xg3qITo');
    expect(getTrustedLingmanYoutubeUrl('https://m.youtube.com/watch?v=X7L3Xg3qITo')).toBe('https://m.youtube.com/watch?v=X7L3Xg3qITo');
    expect(getTrustedLingmanYoutubeUrl('https://youtu.be/X7L3Xg3qITo')).toBe('https://youtu.be/X7L3Xg3qITo');
    expect(getTrustedLingmanYoutubeUrl('https://www.youtube.com/@PhrasemanENGLISH/videos')).toBe('https://www.youtube.com/@PhrasemanENGLISH/videos');
    expect(getTrustedLingmanYoutubeUrl('https://evil.example/watch?v=X7L3Xg3qITo', 'X7L3Xg3qITo')).toBe('https://www.youtube.com/watch?v=X7L3Xg3qITo');
    expect(getTrustedLingmanYoutubeUrl('javascript:alert(1)', 'X7L3Xg3qITo')).toBe('https://www.youtube.com/watch?v=X7L3Xg3qITo');
    expect(getTrustedLingmanYoutubeUrl('https://evil.example/watch?v=X7L3Xg3qITo')).toBeNull();
  });
});

describe('lingman_youtube pinned ("manual") videos', () => {
  it('extracts a videoId from any YouTube URL shape or a bare id', () => {
    expect(parseYoutubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeVideoId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    // мусор / неполный id → ''
    expect(parseYoutubeVideoId('https://example.com/foo')).toBe('');
    expect(parseYoutubeVideoId('not an id')).toBe('');
    expect(parseYoutubeVideoId('')).toBe('');
    expect(parseYoutubeVideoId(null)).toBe('');
  });

  it('parses the pinned-videos JSON (objects, strings, dedup, garbage tolerance)', () => {
    const raw = JSON.stringify([
      { id: 'https://youtu.be/aaaaaaaaaaa', title: 'First' },
      'https://www.youtube.com/watch?v=bbbbbbbbbbb',
      { url: 'ccccccccccc' },
      { id: 'aaaaaaaaaaa' }, // дубль первого → отбрасывается
      { id: 'nope' },        // невалидный id → отбрасывается
      42,                     // мусор → отбрасывается
    ]);
    const pins = parsePinnedVideos(raw);
    expect(pins.map((p) => p.id)).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc']);
    expect(pins[0].title).toBe('First');
    expect(pins[1].title).toBeUndefined();
  });

  it('returns no pins for empty/invalid JSON without throwing', () => {
    expect(parsePinnedVideos('')).toEqual([]);
    expect(parsePinnedVideos('not json')).toEqual([]);
    expect(parsePinnedVideos('{"not":"array"}')).toEqual([]);
    expect(parsePinnedVideos(null)).toEqual([]);
  });

  it('merges pinned videos to the FRONT and de-dups them out of the channel feed', () => {
    const pinned = [makeVideo('pin1'), makeVideo('pin2')];
    const feed = [makeVideo('pin2'), makeVideo('feedA'), makeVideo('feedB')];
    const merged = mergePinnedVideos(pinned, feed);
    // пины первыми, дубль pin2 убран из фида, порядок фида сохранён
    expect(merged.map((v) => v.id)).toEqual(['pin1', 'pin2', 'feedA', 'feedB']);
  });

  it('returns the feed unchanged when there are no pins', () => {
    const feed = [makeVideo('a'), makeVideo('b')];
    expect(mergePinnedVideos([], feed)).toBe(feed);
  });
});
