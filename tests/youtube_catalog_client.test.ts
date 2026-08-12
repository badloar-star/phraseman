import {
  buildYoutubeScreenSnapshot,
  catalogSnapshotsEqual,
  fetchYoutubeChannelCatalogWithReader,
  fetchYoutubeHomeFeatureWithReader,
  peekYoutubeCatalogScreenSnapshot,
  rememberYoutubeCatalogScreenSnapshot,
  revalidateYoutubeChannelCatalog,
  type YoutubeCatalogReader,
  type YoutubeChannelCatalog,
} from '../app/youtube_catalog_client';
import { __resetAccountGenerationForTests, beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import { resetScreenSnapshotStoreForTests } from '../app/screen_snapshot_store';

const version = 'v1';
const manifest = {
  schemaVersion: 1 as const,
  activeVersion: version,
  generatedAt: '2026-08-08T10:00:00.000Z',
  sourceRefreshedAt: '2026-08-08T10:00:00.000Z',
  defaultChannelId: 'english',
  localeDefaults: { en: 'english' },
  channels: [{ id: 'english', displayName: 'English', languageTags: ['en'], order: 0 }],
};

const channel = {
  id: 'english',
  youtubeChannelId: 'UC1234567890123456789012',
  displayName: 'English',
  handle: '@english',
  url: 'https://www.youtube.com/@english/videos',
  languageTags: ['en'],
  order: 0,
  activeEventVideoId: 'abcdefghijk',
  recentVideoIds: ['abcdefghijk', 'lmnopqrstuv'],
  playlistIds: ['PL1234567890'],
};

const videos = [
  { id: 'lmnopqrstuv', channelId: 'english', title: 'Second', description: '', thumbnailUrl: 'https://i.ytimg.com/vi/lmnopqrstuv/hqdefault.jpg', watchUrl: 'https://www.youtube.com/watch?v=lmnopqrstuv', state: 'video' as const, playlistIds: [] },
  { id: 'abcdefghijk', channelId: 'english', title: 'Premiere', description: '', thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg', watchUrl: 'https://www.youtube.com/watch?v=abcdefghijk', state: 'upcoming' as const, scheduledStartTime: '2026-08-08T20:00:00.000Z', playlistIds: ['PL1234567890'] },
];

const playlists = [{ id: 'PL1234567890', channelId: 'english', title: 'Start here', description: '', url: 'https://www.youtube.com/playlist?list=PL1234567890', itemCount: 2, order: 0, pageCount: 1 }];

function reader(overrides: Partial<YoutubeCatalogReader> = {}): YoutubeCatalogReader {
  return {
    get: jest.fn(async (path: string) => {
      if (path === 'youtube_catalog/public') return manifest;
      if (path === `youtube_catalog_snapshots/${version}`) return { status: 'ready', manifest };
      if (path.endsWith('/channels/english')) return channel;
      const videoId = path.match(/\/videos\/([^/]+)$/)?.[1];
      if (videoId) return videos.find((item) => item.id === videoId) ?? null;
      return null;
    }),
    list: jest.fn(async (path: string) => path.endsWith('/videos') ? videos : playlists),
    ...overrides,
  };
}

describe('YouTube catalog mobile client', () => {
  beforeEach(() => {
    __resetAccountGenerationForTests();
    resetScreenSnapshotStoreForTests();
  });

  it('uses bounded one-shot reads, validates documents and restores manifest order', async () => {
    const source = reader();
    const result = await fetchYoutubeChannelCatalogWithReader('english', source);

    expect(result.version).toBe(version);
    expect(result.videos.map((item) => item.id)).toEqual(['abcdefghijk', 'lmnopqrstuv']);
    expect(result.playlists.map((item) => item.id)).toEqual(['PL1234567890']);
    expect(result.activeEvent?.id).toBe('abcdefghijk');
    expect(source.get).toHaveBeenCalledTimes(3);
    expect(source.list).toHaveBeenCalledTimes(2);
    expect((source as Record<string, unknown>).onSnapshot).toBeUndefined();
  });

  it('rejects a malformed or incomplete active version', async () => {
    await expect(fetchYoutubeChannelCatalogWithReader('english', reader({
      get: jest.fn(async (path: string) => path === 'youtube_catalog/public' ? manifest : { status: 'building', manifest }),
    }))).rejects.toThrow('youtube_catalog_snapshot_not_ready');
  });

  it('loads one Home feature without listing full video or playlist collections', async () => {
    const source = reader();
    const result = await fetchYoutubeHomeFeatureWithReader('english', source, manifest);

    expect(result.video?.id).toBe('abcdefghijk');
    expect(result.video?.state).toBe('upcoming');
    expect(source.get).toHaveBeenCalledTimes(3);
    expect(source.list).not.toHaveBeenCalled();
  });

  it('does not commit a late response after account generation changes', async () => {
    beginAccountGeneration('alice');
    const token = captureAccountGeneration();
    let resolvePublic!: (value: unknown) => void;
    const publicRead = new Promise<unknown>((resolve) => { resolvePublic = resolve; });
    const source = reader({ get: jest.fn(async (path: string) => path === 'youtube_catalog/public' ? publicRead : path.endsWith('/channels/english') ? channel : { status: 'ready', manifest }) as never });
    const commit = jest.fn();
    const pending = revalidateYoutubeChannelCatalog({ channelId: 'english', token, reader: source, previous: null, commit });
    beginAccountGeneration('bob');
    resolvePublic(manifest);

    await expect(pending).resolves.toBeNull();
    expect(commit).not.toHaveBeenCalled();
  });

  it('hydrates a bounded cached first frame and skips identical quiet commits', async () => {
    beginAccountGeneration('alice');
    const token = captureAccountGeneration();
    const catalog = await fetchYoutubeChannelCatalogWithReader('english', reader());
    const expanded: YoutubeChannelCatalog = { ...catalog, videos: Array.from({ length: 80 }, (_, index) => ({ ...videos[index % 2], id: String(index).padStart(11, '0'), title: 'x'.repeat(500) })) };
    const compact = buildYoutubeScreenSnapshot(expanded);
    expect(compact.videos).toHaveLength(20);
    expect(compact.playlists.length).toBeLessThanOrEqual(8);
    expect(compact.videos.some((item) => item.id === 'abcdefghijk')).toBe(true);
    expect(JSON.stringify(compact).length).toBeLessThan(24_000);

    rememberYoutubeCatalogScreenSnapshot(token, compact);
    expect(peekYoutubeCatalogScreenSnapshot(token)?.version).toBe(version);
    expect(catalogSnapshotsEqual(compact, { ...compact })).toBe(true);

    const commit = jest.fn();
    await revalidateYoutubeChannelCatalog({
      channelId: 'english',
      token,
      reader: reader(),
      previous: buildYoutubeScreenSnapshot(catalog),
      commit,
    });
    expect(commit).not.toHaveBeenCalled();
  });
});
