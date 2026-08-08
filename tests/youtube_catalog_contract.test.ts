import {
  YOUTUBE_CATALOG_LIMITS,
  parseYoutubeCatalogManifest,
  parseYoutubeChannelId,
  parseYoutubeChannelSnapshot,
  parseYoutubeHandle,
  parseYoutubePlaylistPage,
  parseYoutubePlaylistSnapshot,
  parseYoutubeVideoSnapshot,
  resolveYoutubeChannelId,
  validateYoutubeCatalogConfig,
  type YoutubeCatalogConfig,
  type YoutubeCatalogManifest,
} from '../shared/youtube_catalog_contract';

const CHANNEL_EN = 'UCNNVZbMkh4jrW6uluaaJTwA';
const CHANNEL_PT = 'UCaaaaaaaaaaaaaaaaaaaaaa';

function configFixture(): YoutubeCatalogConfig {
  return {
    schemaVersion: 1,
    enabled: true,
    channels: [
      {
        id: 'channel-en',
        youtubeChannelId: CHANNEL_EN,
        enabled: true,
        order: 0,
        languageTags: ['en'],
        playlistOverrides: {},
        premiereOverrides: {},
      },
      {
        id: 'channel-pt',
        youtubeChannelId: CHANNEL_PT,
        enabled: true,
        order: 1,
        languageTags: ['pt-BR', 'pt'],
        playlistOverrides: {},
        premiereOverrides: {},
      },
    ],
    localeDefaults: { en: 'channel-en', pt: 'channel-pt', 'pt-BR': 'channel-pt' },
    updatedAt: '2026-08-08T12:00:00.000Z',
    updatedBy: 'owner',
  };
}

function manifestFixture(): YoutubeCatalogManifest {
  return {
    schemaVersion: 1,
    activeVersion: 'v_20260808_120000',
    generatedAt: '2026-08-08T12:00:00.000Z',
    sourceRefreshedAt: '2026-08-08T11:59:00.000Z',
    defaultChannelId: 'channel-en',
    localeDefaults: { en: 'channel-en', pt: 'channel-pt', 'pt-BR': 'channel-pt' },
    channels: [
      { id: 'channel-en', displayName: 'PHRASEMAN', languageTags: ['en'], order: 0 },
      { id: 'channel-pt', displayName: 'PHRASEMAN Português', languageTags: ['pt-BR'], order: 1 },
    ],
  };
}

describe('youtube catalog shared contract', () => {
  test('parses a YouTube channel id and handle from trusted input shapes', () => {
    expect(parseYoutubeChannelId(CHANNEL_EN)).toBe(CHANNEL_EN);
    expect(parseYoutubeChannelId(`https://www.youtube.com/channel/${CHANNEL_EN}/videos`)).toBe(CHANNEL_EN);
    expect(parseYoutubeChannelId('https://example.com/channel/not-youtube')).toBe('');
    expect(parseYoutubeHandle('https://www.youtube.com/@PhrasemanENGLISH/videos')).toBe('PhrasemanENGLISH');
    expect(parseYoutubeHandle('@PhrasemanENGLISH')).toBe('PhrasemanENGLISH');
  });

  test('resolves manual, exact locale, base locale, and default channel in order', () => {
    const manifest = manifestFixture();
    expect(resolveYoutubeChannelId(manifest, 'ru', 'channel-pt')).toBe('channel-pt');
    expect(resolveYoutubeChannelId(manifest, 'pt-BR', null)).toBe('channel-pt');
    expect(resolveYoutubeChannelId(manifest, 'pt-PT', null)).toBe('channel-pt');
    expect(resolveYoutubeChannelId(manifest, 'uk', null)).toBe('channel-en');
    expect(resolveYoutubeChannelId(manifest, 'ru', 'missing-channel')).toBe('channel-en');
  });

  test('rejects duplicate ids and disabled locale defaults', () => {
    const duplicate = configFixture();
    duplicate.channels[1] = { ...duplicate.channels[1], id: 'channel-en' };
    expect(() => validateYoutubeCatalogConfig(duplicate)).toThrow('channel_id_must_be_unique');

    const disabled = configFixture();
    disabled.channels[1] = { ...disabled.channels[1], enabled: false };
    expect(() => validateYoutubeCatalogConfig(disabled)).toThrow('locale_default_must_be_enabled');
  });

  test('rejects configs beyond bounded catalog limits', () => {
    const tooMany = configFixture();
    tooMany.channels = Array.from({ length: YOUTUBE_CATALOG_LIMITS.channels + 1 }, (_, index) => ({
      ...tooMany.channels[0],
      id: `channel-${index}`,
      youtubeChannelId: `UC${String(index).padStart(22, 'a')}`,
      order: index,
    }));
    tooMany.localeDefaults = {};
    expect(() => validateYoutubeCatalogConfig(tooMany)).toThrow('channels_limit_exceeded');
  });

  test('requires valid expiring premiere overrides', () => {
    const config = configFixture();
    config.channels[0] = {
      ...config.channels[0],
      premiereOverrides: {
        abc123def45: { titleOverride: 'Premiere', expiresAt: 'not-a-date' },
      },
    };
    expect(() => validateYoutubeCatalogConfig(config)).toThrow('premiere_override_expiry_invalid');
  });

  test('parses Firestore documents at runtime instead of trusting casts', () => {
    expect(parseYoutubeCatalogManifest(manifestFixture())).toEqual(manifestFixture());
    expect(() => parseYoutubeCatalogManifest({ ...manifestFixture(), activeVersion: '' }))
      .toThrow('manifest_active_version_invalid');

    expect(parseYoutubeChannelSnapshot({
      id: 'channel-en',
      youtubeChannelId: CHANNEL_EN,
      displayName: 'PHRASEMAN',
      handle: '@PhrasemanENGLISH',
      url: 'https://www.youtube.com/@PhrasemanENGLISH/videos',
      languageTags: ['en'],
      order: 0,
      recentVideoIds: ['abc123def45'],
      playlistIds: ['PL1234567890'],
    }).id).toBe('channel-en');

    expect(parseYoutubeVideoSnapshot({
      id: 'abc123def45',
      channelId: 'channel-en',
      title: 'Premiere',
      description: '',
      thumbnailUrl: 'https://i.ytimg.com/vi/abc123def45/hqdefault.jpg',
      watchUrl: 'https://www.youtube.com/watch?v=abc123def45',
      state: 'upcoming',
      scheduledStartTime: '2026-08-08T20:00:00.000Z',
      playlistIds: [],
    }).state).toBe('upcoming');

    expect(parseYoutubePlaylistSnapshot({
      id: 'PL1234567890',
      channelId: 'channel-en',
      title: 'Course',
      description: '',
      url: 'https://www.youtube.com/playlist?list=PL1234567890',
      itemCount: 1,
      order: 0,
      pageCount: 1,
    }).pageCount).toBe(1);

    expect(parseYoutubePlaylistPage({ page: 0, videoIds: ['abc123def45'] })).toEqual({
      page: 0,
      videoIds: ['abc123def45'],
    });
    expect(() => parseYoutubePlaylistPage({
      page: 0,
      videoIds: Array.from({ length: 51 }, (_, index) => `video-${index}`),
    })).toThrow('playlist_page_limit_exceeded');
  });
});
