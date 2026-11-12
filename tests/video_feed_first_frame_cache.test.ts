// Координатор 12.11, обход экранов (заход 3): вкладка «Видео» при открытии показывала сплошные скелетоны вместо кэша.
// Правило владельца — «каждый раздел мгновенно из кэша». Проверяем звено кэша: есть снимок — первый кадр берёт его
// с видео; снимка нет или он негоден — причина видна в журнале [VIDEO-FEED], а не теряется в немом catch.
import fs from 'node:fs';
import path from 'node:path';
import {
  peekYoutubeCatalogScreenSnapshot,
  probeYoutubeCatalogScreenSnapshot,
  revalidateYoutubeChannelCatalog,
  type YoutubeCatalogReader,
} from '../app/youtube_catalog_client';
import { __resetAccountGenerationForTests, beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import { rememberScreenSnapshot, resetScreenSnapshotStoreForTests, screenSnapshotKey } from '../app/screen_snapshot_store';

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
  id: 'english', youtubeChannelId: 'UC1234567890123456789012', displayName: 'English', handle: '@english',
  url: 'https://www.youtube.com/@english/videos', languageTags: ['en'], order: 0, recentVideoIds: ['enaaaaaaaaa'], playlistIds: [],
};
const video = {
  id: 'enaaaaaaaaa', channelId: 'english', title: 'English video', description: '', thumbnailUrl: 'https://i.ytimg.com/vi/enaaaaaaaaa/hqdefault.jpg',
  watchUrl: 'https://www.youtube.com/watch?v=enaaaaaaaaa', state: 'video' as const, playlistIds: [],
};

function reader(): YoutubeCatalogReader {
  return {
    get: jest.fn(async (docPath: string) => {
      if (docPath === 'youtube_catalog/public') return manifest;
      if (docPath === `youtube_catalog_snapshots/${version}`) return { status: 'ready', manifest };
      if (docPath.endsWith('/channels/english')) return channel;
      return null;
    }),
    list: jest.fn(async (docPath: string) => (docPath.endsWith('/videos') ? [video] : [])),
  };
}

const ROOT = path.resolve(__dirname, '..');
let warn: jest.SpyInstance;

beforeEach(() => {
  __resetAccountGenerationForTests();
  resetScreenSnapshotStoreForTests();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => warn.mockRestore());

describe('«Видео»: кэш есть → первый кадр с видео', () => {
  it('после загрузки каталога снимок лежит в кэше, и следующий вход берёт его сразу, с видео', async () => {
    beginAccountGeneration('alice');
    const token = captureAccountGeneration();
    const loaded = await revalidateYoutubeChannelCatalog({ channelId: 'english', token, reader: reader(), previous: null, commit: jest.fn() });
    expect(loaded?.videos.length).toBe(1);

    const probe = probeYoutubeCatalogScreenSnapshot(captureAccountGeneration());
    expect(probe.reason).toBe('hit');
    expect(probe.videos).toBe(1);
    expect(probe.channelId).toBe('english');
    expect(probe.snapshot?.videos[0]?.id).toBe('enaaaaaaaaa');
    expect(peekYoutubeCatalogScreenSnapshot(captureAccountGeneration())?.videos.length).toBe(1);
  });

  it('экран: первый кадр берёт снимок из кэша — каталог задан сразу, загрузки и скелетона нет', () => {
    const screen = fs.readFileSync(path.join(ROOT, 'app/lingman_videos.tsx'), 'utf8');
    expect(screen).toContain('const peeked = peekYoutubeCatalogScreenSnapshot(renderToken);');
    expect(screen).toContain('const missProbe = peeked ? null : probeYoutubeCatalogScreenSnapshot(renderToken);');
    expect(screen).toContain('const [catalog, setCatalog] = useState<YoutubeCatalogScreenSnapshot | null>(initialCatalog);');
    expect(screen).toContain('const [loading, setLoading] = useState(!initialCatalog);');
    // скелетон — только когда показать нечего: ни каталога, ни запасной ленты
    expect(screen).toContain(": (visibleLoading || issue === 'error') && !catalog && !snapshot ? 'skeleton'");
  });
});

describe('«Видео»: кэша нет — причина в журнале, а не немой catch', () => {
  it('аккаунт ещё не готов / записи нет — причина названа', () => {
    expect(probeYoutubeCatalogScreenSnapshot(captureAccountGeneration()).reason).toBe('account_not_ready');
    beginAccountGeneration('alice');
    expect(probeYoutubeCatalogScreenSnapshot(captureAccountGeneration()).reason).toBe('missing');
  });

  it('снимок не прошёл проверку — первый кадр без него, но причина в [VIDEO-FEED] cache:invalid', () => {
    beginAccountGeneration('alice');
    const token = captureAccountGeneration();
    // версия снимка не совпадает с версией в манифесте — такой снимок проверка отвергает
    rememberScreenSnapshot(screenSnapshotKey('youtube-catalog', token), {
      version: 'other', manifest, channel, videos: [video], playlists: [], fetchedAt: '2026-08-08T10:00:00.000Z',
    });
    const probe = probeYoutubeCatalogScreenSnapshot(token);
    expect(probe.snapshot).toBeNull();
    expect(probe.reason).toBe('invalid:youtube_catalog_cache_version_mismatch');
    expect(warn.mock.calls.some((call) => String(call[0]).includes('[VIDEO-FEED] cache:invalid'))).toBe(true);
  });

  it('слишком большой снимок не записывается — и это видно в журнале [SCREEN-SNAPSHOT]', () => {
    beginAccountGeneration('alice');
    const token = captureAccountGeneration();
    rememberScreenSnapshot(screenSnapshotKey('youtube-catalog', token), { big: 'x'.repeat(30_000) });
    expect(probeYoutubeCatalogScreenSnapshot(token).reason).toBe('missing');
    expect(warn.mock.calls.some((call) => String(call[0]).includes('[SCREEN-SNAPSHOT] remember:skipped') && String(call[1]).includes('too_large'))).toBe(true);
  });

  it('без кэша: один потолок D158 от первого скелетона, по нему «Сейчас недоступно», а не новый круг скелетонов', () => {
    const screen = fs.readFileSync(path.join(ROOT, 'app/lingman_videos.tsx'), 'utf8');
    const watchdog = screen.slice(screen.indexOf('const skeletonSinceRef = useRef<number | null>(null);'), screen.indexOf('const retryCatalogAfterUnavailable'));
    expect(watchdog).toContain('if (skeletonSinceRef.current === null) skeletonSinceRef.current = Date.now();');
    expect(watchdog).toContain('Math.max(0, LOAD_GATE_TOTAL_MS - waitedMs)');
    expect(watchdog).toContain('setCatalogExhausted(true);');
    // ветка «Сейчас недоступно» показывается при catalogExhausted, пока показать нечего
    expect(screen).toContain('catalogExhausted && !catalog && !snapshot ? (');
  });

  it('экран пишет вход, сеть и вид ленты под одним префиксом [VIDEO-FEED]', () => {
    const screen = fs.readFileSync(path.join(ROOT, 'app/lingman_videos.tsx'), 'utf8');
    for (const step of ["'[VIDEO-FEED] enter'", "'[VIDEO-FEED] net:start'", "'[VIDEO-FEED] net:done'", "'[VIDEO-FEED] net:error'", "'[VIDEO-FEED] view'"]) {
      expect([step, screen.includes(step)]).toEqual([step, true]);
    }
    const cache = fs.readFileSync(path.join(ROOT, 'app/youtube_catalog_cache.ts'), 'utf8');
    expect(cache).not.toMatch(/catch \{\s*return null;\s*\}/);
  });
});
