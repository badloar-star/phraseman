// зачем (R57 #23, координатор 15.10): плейлист из «хвоста» каталога (вне 8 плейлистов снимка экрана видео) на медленной сети. Проверяем: 1) решение «что показать» по всем веткам (скелет, «грузится дольше обычного»,
// пустота, контент); 2) dev-задержка сети реально задерживает чтение полного списка и в стор-сборке выключена; 3) экран берёт решение из чистой функции и пишет журнал [VIDEO-PLAYLIST].
import fs from 'node:fs';
import path from 'node:path';

const asyncStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
}));
const fetchChannel = jest.fn(async () => ({ version: 'v1', videos: [], playlists: [{ id: 'tail', channelId: 'ch1', title: 'Хвост', description: '', url: 'u', itemCount: 2, order: 20, pageCount: 1 }] }));
jest.mock('../app/youtube_catalog_client', () => ({
  fetchYoutubeCatalogManifestWithReader: async () => ({ activeVersion: 'v1', channels: [{ id: 'ch1' }] }),
  fetchYoutubeChannelCatalogWithReader: () => fetchChannel(),
}));

import { PLAYLIST_SLOW_MS, playlistViewKind } from '../app/lingman_playlist_view_state';
import { getDevVideoNetworkDelayMs } from '../app/dev_video_network_delay';
import { loadAllChannelVideos, resetAllChannelVideosForTests } from '../app/all_channel_videos_source';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
type G = { __DEV_VIDEO_NETWORK_DELAY_MS__?: unknown };

describe('плейлист из «хвоста»: что показать на медленной сети', () => {
  const view = (hasPlaylist: boolean, videosCount: number, status: 'ready' | 'partial' | 'loading' | 'unavailable', waitedTooLong = false) => playlistViewKind({ hasPlaylist, videosCount, status, waitedTooLong });

  it('плейлиста нет, полный список ещё грузится — скелет (первый заход и «partial»: 20 роликов снимка плейлиста не содержат)', () => {
    expect(view(false, 0, 'loading')).toBe('skeleton');
    expect(view(false, 0, 'partial')).toBe('skeleton');
  });

  it('ждём дольше потолка — не вечный скелет, а «грузится дольше обычного» с «Повторить»; пришёл ответ — вид сам меняется', () => {
    expect(view(false, 0, 'loading', true)).toBe('slow');
    expect(view(false, 0, 'partial', true)).toBe('slow');
    expect(view(false, 0, 'ready', true)).toBe('empty'); // ответ пришёл позже — флаг ожидания уже не важен
    expect(view(true, 2, 'ready', true)).toBe('content');
  });

  it('сети и кэша нет (unavailable) и плейлиста нет — честная пустота с «Повторить», а не скелет', () => {
    expect(view(false, 0, 'unavailable')).toBe('empty');
  });

  it('полный список пришёл, плейлиста в нём нет — пустота; плейлист есть, роликов нет — пустой список с «Повторить»', () => {
    expect(view(false, 0, 'ready')).toBe('empty');
    expect(view(true, 0, 'ready')).toBe('content_empty');
  });

  it('плейлист есть, роликов ещё нет: скелет списка, затем «грузится дольше обычного»; ролики пришли — контент', () => {
    expect(view(true, 0, 'partial')).toBe('content_loading');
    expect(view(true, 0, 'partial', true)).toBe('content_slow');
    expect(view(true, 3, 'partial')).toBe('content');
  });

  it('потолок ожидания 15 с', () => {
    expect(PLAYLIST_SLOW_MS).toBe(15_000);
  });
});

describe('dev-задержка сети', () => {
  // в jest глобальный __DEV__ не определён — как dev-сборка включаем явно (в стор-сборке EXPO_PUBLIC_STORE_RELEASE=1 функция возвращает 0, ниже проверяется)
  beforeAll(() => { (globalThis as { __DEV__?: boolean }).__DEV__ = true; });
  afterAll(() => { delete (globalThis as { __DEV__?: boolean }).__DEV__; });
  afterEach(() => { delete (globalThis as G).__DEV_VIDEO_NETWORK_DELAY_MS__; jest.useRealTimers(); });

  it('число 0…120000 принимается, мусор и отрицательные — 0 с предупреждением, без значения — 0', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(getDevVideoNetworkDelayMs()).toBe(0);
    (globalThis as G).__DEV_VIDEO_NETWORK_DELAY_MS__ = 20000;
    expect(getDevVideoNetworkDelayMs()).toBe(20000);
    (globalThis as G).__DEV_VIDEO_NETWORK_DELAY_MS__ = -5;
    expect(getDevVideoNetworkDelayMs()).toBe(0);
    (globalThis as G).__DEV_VIDEO_NETWORK_DELAY_MS__ = '20000';
    expect(getDevVideoNetworkDelayMs()).toBe(0);
    (globalThis as G).__DEV_VIDEO_NETWORK_DELAY_MS__ = 999999;
    expect(getDevVideoNetworkDelayMs()).toBe(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('в стор-сборке задержка выключена даже при заданном значении', () => {
    (globalThis as G).__DEV_VIDEO_NETWORK_DELAY_MS__ = 20000;
    expect(read('app/dev_video_network_delay.ts')).toContain('__DEV__ === true && !IS_STORE_RELEASE');
  });

  it('чтение полного списка реально ждёт заданное время: до срока ответа нет, после — плейлист из «хвоста» на месте', async () => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    Object.keys(asyncStore).forEach((k) => delete asyncStore[k]);
    resetAllChannelVideosForTests();
    const generation = require('../app/account_generation');
    generation.beginAccountGeneration('user-1');
    const token = generation.captureAccountGeneration();
    (globalThis as G).__DEV_VIDEO_NETWORK_DELAY_MS__ = 20000;
    let settled = false;
    const pending = loadAllChannelVideos({ channelId: 'ch1', token, reader: { get: jest.fn(), list: jest.fn() }, nowMs: 1_000 }).then((list) => { settled = true; return list; });
    await jest.advanceTimersByTimeAsync(PLAYLIST_SLOW_MS); // экран уже показал бы «грузится дольше обычного»
    expect(settled).toBe(false);
    expect(fetchChannel).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(6_000);
    const list = await pending;
    expect(settled).toBe(true);
    expect(list?.playlists?.map((p) => p.id)).toEqual(['tail']);
  });
});

describe('экран плейлиста и источник', () => {
  it('источник вызывает dev-задержку до чтения и пишет журнал', () => {
    const src = read('app/all_channel_videos_source.ts');
    expect(src).toContain("import { getDevVideoNetworkDelayMs } from './dev_video_network_delay';");
    expect(src).toContain('const devDelayMs = getDevVideoNetworkDelayMs();');
    expect(src).toContain("'DEV: искусственная задержка сети'");
    expect(src.indexOf('getDevVideoNetworkDelayMs();')).toBeLessThan(src.indexOf('options.reader ?? await defaultReader()'));
  });

  it('экран берёт вид из playlistViewKind, ждёт не дольше PLAYLIST_SLOW_MS, «Повторить» сбрасывает ожидание, журнал [VIDEO-PLAYLIST]', () => {
    const screen = read('app/lingman_playlist.tsx');
    expect(screen).toContain("import { PLAYLIST_SLOW_MS, playlistViewKind } from './lingman_playlist_view_state';");
    expect(screen).toContain('const view = playlistViewKind({ hasPlaylist: !!playlist, videosCount: videos.length, status: allChannel.status, waitedTooLong });');
    expect(screen).toContain("view === 'slow'");
    expect(screen).toContain("view === 'content_slow'");
    expect(screen).toContain('const retry = () => { setWaitedTooLong(false); allChannel.refresh(); };');
    expect(screen).toContain('[VIDEO-PLAYLIST] медленно: полный список не пришёл');
    expect(screen).toContain('testID="youtube-playlist-slow"');
    expect(screen).toContain('slow: triLang(lang, {');
  });

  it('служебные модули в app/ имеют заглушку маршрута', () => {
    expect(read('app/dev_video_network_delay.ts')).toContain('export default function __DevVideoNetworkDelayRouteShim');
    expect(read('app/lingman_playlist_view_state.ts')).toContain('export default function __LingmanPlaylistViewStateRouteShim');
  });
});
