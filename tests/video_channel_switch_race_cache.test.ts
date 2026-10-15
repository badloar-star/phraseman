// Ревью TG-3BD963DD05D5 к пилюле языка «Видео»:
// R1 — поздний ответ каталога прежнего языка (en→es→en) не должен затирать текущий канал;
// R2 — снимки каналов в памяти: мгновенный возврат на язык и одно чтение вместо полного каталога;
//      без снимка — шапка нужного канала и скелетон, а не лента чужого языка.
import fs from 'node:fs';
import path from 'node:path';
import {
  peekYoutubeCatalogScreenSnapshot,
  revalidateYoutubeChannelCatalog,
  type YoutubeCatalogReader,
  type YoutubeCatalogScreenSnapshot,
} from '../app/youtube_catalog_client';
import { __resetAccountGenerationForTests, beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import { resetScreenSnapshotStoreForTests } from '../app/screen_snapshot_store';
import {
  YOUTUBE_CHANNEL_MEMORY_CACHE_LIMIT,
  peekYoutubeChannelMemorySnapshot,
  rememberYoutubeChannelMemorySnapshot,
  resetYoutubeChannelMemoryCacheForTests,
  resolveYoutubeChannelSwitchView,
  youtubeChannelMemoryCacheSizeForTests,
} from '../app/youtube_channel_memory_cache';

const version = 'v1';
const manifest = {
  schemaVersion: 1 as const,
  activeVersion: version,
  generatedAt: '2026-08-08T10:00:00.000Z',
  sourceRefreshedAt: '2026-08-08T10:00:00.000Z',
  defaultChannelId: 'english',
  localeDefaults: { en: 'english', es: 'spanish' },
  channels: [
    { id: 'english', displayName: 'English', languageTags: ['en'], order: 0 },
    { id: 'spanish', displayName: 'Español', avatarUrl: 'https://yt3.ggpht.com/es.jpg', languageTags: ['es'], order: 1 },
  ],
};

function channelDoc(id: string) {
  return {
    id,
    youtubeChannelId: id === 'english' ? 'UC1234567890123456789012' : 'UC2234567890123456789012',
    displayName: id === 'english' ? 'English' : 'Español',
    handle: `@${id}`,
    url: `https://www.youtube.com/@${id}/videos`,
    languageTags: [id === 'english' ? 'en' : 'es'],
    order: id === 'english' ? 0 : 1,
    recentVideoIds: [`${id.slice(0, 2)}aaaaaaaaa`],
    playlistIds: [],
  };
}

function videoDoc(channelId: string) {
  const id = `${channelId.slice(0, 2)}aaaaaaaaa`;
  return { id, channelId, title: `${channelId} video`, description: '', thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, watchUrl: `https://www.youtube.com/watch?v=${id}`, state: 'video' as const, playlistIds: [] };
}

/** Читатель, у которого ответ по каналу можно задержать — чтобы собрать гонку. */
function reader(gate?: Promise<void>): YoutubeCatalogReader {
  return {
    get: jest.fn(async (docPath: string) => {
      if (docPath === 'youtube_catalog/public') return manifest;
      if (docPath === `youtube_catalog_snapshots/${version}`) return { status: 'ready', manifest };
      const channelId = docPath.match(/\/channels\/([^/]+)$/)?.[1];
      if (channelId) {
        if (gate) await gate;
        return channelDoc(channelId);
      }
      return null;
    }),
    list: jest.fn(async (docPath: string) => {
      const channelId = docPath.match(/\/channels\/([^/]+)\//)?.[1] ?? 'english';
      return docPath.endsWith('/videos') ? [videoDoc(channelId)] : [];
    }),
  };
}

const ROOT = path.resolve(__dirname, '..');

beforeEach(() => {
  __resetAccountGenerationForTests();
  resetScreenSnapshotStoreForTests();
  resetYoutubeChannelMemoryCacheForTests();
});

describe('R1: поздний ответ прежнего языка не затирает текущий канал', () => {
  it('en→es→en: ответ es пришёл последним — отброшен, не в состоянии и не в сохранённом снимке', async () => {
    beginAccountGeneration('alice');
    const token = captureAccountGeneration();
    let seq = 0;
    let releaseSpanish!: () => void;
    const spanishGate = new Promise<void>((resolve) => { releaseSpanish = resolve; });
    const shown: string[] = [];
    const commit = (value: YoutubeCatalogScreenSnapshot) => { shown.push(value.channel.id); };

    const spanishSeq = ++seq; // тап «Español»
    const spanish = revalidateYoutubeChannelCatalog({ channelId: 'spanish', token, reader: reader(spanishGate), previous: null, commit, isCurrent: () => spanishSeq === seq });
    const englishSeq = ++seq; // сразу обратно «English»
    const english = await revalidateYoutubeChannelCatalog({ channelId: 'english', token, reader: reader(), previous: null, commit, isCurrent: () => englishSeq === seq });
    releaseSpanish();

    await expect(spanish).resolves.toBeNull();
    expect(english?.channel.id).toBe('english');
    expect(shown).toEqual(['english']);
    expect(peekYoutubeCatalogScreenSnapshot(token)?.channel.id).toBe('english');
  });

  it('экран сверяет номер загрузки после каждого await, в commit и в finally', () => {
    const screen = fs.readFileSync(path.join(ROOT, 'app/lingman_videos.tsx'), 'utf8');
    const load = screen.slice(screen.indexOf('const loadCatalog = useCallback'), screen.indexOf('}, [deepLinkedChannelId, loadLegacyFallback, renderAccountScope, studyTarget]);'));
    expect(load).toContain('const seq = ++loadSeqRef.current;');
    expect(load).toContain("if (!isCurrentLoad()) { logStale('manifest', ''); return; }");
    expect(load).toContain("if (!isCurrentLoad()) { logStale('preference', ''); return; }");
    expect(load).toContain("if (!isCurrentLoad()) { logStale('commit', channelId); return; }");
    expect(load).toContain("if (!isCurrentLoad()) { logStale('revalidate', channelId); return; }");
    expect(load).toContain("if (!isCurrentLoad()) { logStale('error', channelId); return; }");
    expect(load).toContain('isCurrent: isCurrentLoad');
    expect(load).toContain('if (isCurrentLoad() && (!renderAccountScope || settledScope === renderAccountScope))');
    expect(load).toContain('channel_load_stale seq=');
  });
});

describe('R2: снимки каналов в памяти', () => {
  it('возврат на язык со снимком той же версии — одно чтение манифеста, без полного каталога', async () => {
    beginAccountGeneration('alice');
    const token = captureAccountGeneration();
    const first = await revalidateYoutubeChannelCatalog({ channelId: 'english', token, reader: reader(), previous: null, commit: jest.fn() });
    rememberYoutubeChannelMemorySnapshot('alice', first!);
    const cached = peekYoutubeChannelMemorySnapshot('alice', 'english');
    const again = reader();
    const commit = jest.fn();
    const result = await revalidateYoutubeChannelCatalog({ channelId: 'english', token, reader: again, previous: cached, commit });
    expect(result).toBe(cached);
    expect(again.get).toHaveBeenCalledTimes(1);
    expect(again.list).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it('без снимка — шапка нужного канала по манифесту (лента скелетоном), чужой канал не показывается', async () => {
    beginAccountGeneration('alice');
    const token = captureAccountGeneration();
    const english = await revalidateYoutubeChannelCatalog({ channelId: 'english', token, reader: reader(), previous: null, commit: jest.fn() });
    const view = resolveYoutubeChannelSwitchView({ shown: english, manifest, targetChannelId: 'spanish', accountScope: 'alice' });
    expect(view.kind).toBe('pending');
    expect(view.kind === 'pending' ? view.channel?.displayName : null).toBe('Español');
    expect(view.kind === 'pending' ? view.channel?.avatarUrl : null).toBe('https://yt3.ggpht.com/es.jpg');
    rememberYoutubeChannelMemorySnapshot('alice', english!);
    const back = resolveYoutubeChannelSwitchView({ shown: null, manifest, targetChannelId: 'english', accountScope: 'alice' });
    expect(back.kind).toBe('cache');
    expect(resolveYoutubeChannelSwitchView({ shown: english, manifest, targetChannelId: 'english', accountScope: 'alice' }).kind).toBe('shown');
    // другой аккаунт снимок не видит
    expect(resolveYoutubeChannelSwitchView({ shown: null, manifest, targetChannelId: 'english', accountScope: 'bob' }).kind).toBe('pending');
  });

  it('кэш ограничен: держит не больше 5 каналов, вытесняет самый давний', () => {
    const base = { version, manifest, videos: [], playlists: [], fetchedAt: '2026-10-11T00:00:00.000Z' };
    for (let index = 0; index < YOUTUBE_CHANNEL_MEMORY_CACHE_LIMIT + 2; index += 1) {
      rememberYoutubeChannelMemorySnapshot('alice', { ...base, channel: { ...channelDoc('english'), id: `ch${index}` } } as YoutubeCatalogScreenSnapshot);
    }
    expect(YOUTUBE_CHANNEL_MEMORY_CACHE_LIMIT).toBe(5);
    expect(youtubeChannelMemoryCacheSizeForTests()).toBe(5);
    expect(peekYoutubeChannelMemorySnapshot('alice', 'ch0')).toBeNull();
    expect(peekYoutubeChannelMemorySnapshot('alice', 'ch6')).not.toBeNull();
  });

  it('экран: смена канала без снимка — скелетон и шапка по манифесту; RSS-лента чужого канала не подставляется', () => {
    const screen = fs.readFileSync(path.join(ROOT, 'app/lingman_videos.tsx'), 'utf8');
    expect(screen).toContain('const snapshot = !pendingChannel && loadedKey === currentRenderKey ? cachedSnapshot : null;');
    // 15.10 (Макеты c1_video3): шапка ожидаемого канала остаётся (канал нового языка по манифесту), но без промежуточного имени-метки; гонка не тронута — лента чужого канала по-прежнему не показывается
    expect(screen).toContain("? { ...pendingChannel, displayName: '' }");
    expect(screen).toContain(': legacyChannelSnapshot();');
    expect(screen).toContain('rememberYoutubeChannelMemorySnapshot(tokenScope, next);');
    expect(screen).toContain('if (switchingToUncachedChannel) {');
    expect(screen).toContain('testID="youtube-catalog-loading"');
  });
});
