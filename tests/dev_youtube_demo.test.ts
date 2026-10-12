// зачем (координатор 12.10, video-001/004/008/009/011): демо-каталог YouTube в памяти для съёмки «Видео» без сети. Сторож: снимок проходит настоящие парсеры контракта и настоящие
// функции клиента каталога, подмена работает только в dev, Firestore не вызывается.
import fs from 'node:fs';
import path from 'node:path';

import {
  buildDevYoutubeDemo,
  createDevYoutubeReader,
  DEV_DEMO_CHANNEL_ID,
  DEV_DEMO_EVENT_VIDEO_ID,
  getDevVideoPhrases,
  getDevYoutubeCatalogReader,
  resetDevYoutubeDemoForTests,
  setDevYoutubeDemo,
} from '../app/dev_youtube_demo';
import {
  fetchYoutubeChannelCatalogWithReader,
  fetchYoutubeHomeFeatureWithReader,
  fetchYoutubeHomeRailWithReader,
} from '../app/youtube_catalog_client';
import {
  parseYoutubeCatalogManifest,
  parseYoutubeChannelSnapshot,
  parseYoutubePlaylistSnapshot,
  parseYoutubeVideoSnapshot,
  resolveYoutubeChannelId,
} from '../shared/youtube_catalog_contract';
import { normalizeVideoPhraseList } from '../shared/video_phrases_contract';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const NOW = Date.UTC(2026, 9, 12, 20, 0, 0);

describe('dev_youtube_demo: снимок проходит контракт каталога', () => {
  for (const mode of ['catalog', 'catalog_upcoming'] as const) {
    it(`${mode}: манифест, канал, ролики и плейлисты проходят настоящие парсеры`, () => {
      const snapshot = buildDevYoutubeDemo(mode, NOW);
      expect(() => parseYoutubeCatalogManifest(snapshot.manifest)).not.toThrow();
      expect(() => parseYoutubeChannelSnapshot(snapshot.channel)).not.toThrow();
      for (const video of snapshot.videos) expect(() => parseYoutubeVideoSnapshot(video)).not.toThrow();
      for (const playlist of snapshot.playlists) expect(() => parseYoutubePlaylistSnapshot(playlist)).not.toThrow();
    });
  }

  it('премьера: catalog — «сейчас» (live, есть начало), catalog_upcoming — «скоро» (upcoming, есть расписание)', () => {
    const live = buildDevYoutubeDemo('catalog', NOW).videos.find((video) => video.id === DEV_DEMO_EVENT_VIDEO_ID);
    const upcoming = buildDevYoutubeDemo('catalog_upcoming', NOW).videos.find((video) => video.id === DEV_DEMO_EVENT_VIDEO_ID);
    expect(live).toMatchObject({ state: 'live' });
    expect(live?.actualStartTime).toBeTruthy();
    expect(upcoming).toMatchObject({ state: 'upcoming' });
    expect(Date.parse(upcoming!.scheduledStartTime!)).toBeGreaterThan(NOW);
  });

  it('один демо-канал отвечает на любой язык изучения (иначе при studyTarget≠en кадр пустой)', () => {
    const { manifest } = buildDevYoutubeDemo('catalog', NOW);
    for (const locale of ['en', 'es', 'fr', 'de', 'it', 'ru', 'uk', 'pt-BR']) {
      expect(resolveYoutubeChannelId(manifest, locale, null)).toBe(DEV_DEMO_CHANNEL_ID);
    }
  });
});

describe('dev_youtube_demo: настоящие функции клиента работают на читателе в памяти', () => {
  it('полный каталог канала: 7 роликов (премьера первой), 2 плейлиста, активное событие', async () => {
    const reader = createDevYoutubeReader('catalog', NOW);
    const catalog = await fetchYoutubeChannelCatalogWithReader(DEV_DEMO_CHANNEL_ID, reader);
    expect(catalog.videos).toHaveLength(7);
    expect(catalog.videos[0].id).toBe(DEV_DEMO_EVENT_VIDEO_ID);
    expect(catalog.playlists).toHaveLength(2);
    expect(catalog.activeEvent).toMatchObject({ id: DEV_DEMO_EVENT_VIDEO_ID, state: 'live' });
    // у каждого плейлиста есть ролики, а число в карточке совпадает с составом
    for (const playlist of catalog.playlists) {
      expect(playlist.itemCount).toBe(catalog.videos.filter((video) => video.playlistIds.includes(playlist.id)).length);
      expect(playlist.itemCount).toBeGreaterThan(0);
    }
  });

  it('лента Главной и «рекомендуемое» берут премьеру/свежий ролик тем же читателем', async () => {
    const reader = createDevYoutubeReader('catalog_upcoming', NOW);
    const manifest = buildDevYoutubeDemo('catalog_upcoming', NOW).manifest;
    const feature = await fetchYoutubeHomeFeatureWithReader(DEV_DEMO_CHANNEL_ID, reader, manifest);
    expect(feature.video).toMatchObject({ id: DEV_DEMO_EVENT_VIDEO_ID, state: 'upcoming' });
    const rail = await fetchYoutubeHomeRailWithReader(DEV_DEMO_CHANNEL_ID, reader, manifest, 4);
    expect(rail.videos).toHaveLength(4);
  });
});

describe('dev_youtube_demo: переключатель и фразы', () => {
  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    resetDevYoutubeDemoForTests();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('по умолчанию выключено; включение даёт читателя и фразы, снятие возвращает null', async () => {
    expect(getDevYoutubeCatalogReader()).toBeNull();
    expect(getDevVideoPhrases('devDemoVid0')).toBeNull();
    expect(setDevYoutubeDemo('catalog')).toBe(true);
    const reader = getDevYoutubeCatalogReader();
    expect(reader).not.toBeNull();
    await expect(reader!.get('youtube_catalog/public')).resolves.toMatchObject({ activeVersion: 'dev-demo-1' });
    expect(getDevVideoPhrases('devDemoVid0')).not.toBeNull();
    expect(setDevYoutubeDemo(null)).toBe(true);
    expect(getDevYoutubeCatalogReader()).toBeNull();
    expect(getDevVideoPhrases('devDemoVid0')).toBeNull();
  });

  it('фразы демо-роликов проходят контракт (таймкоды растут, номера подряд); чужой ролик — null', () => {
    setDevYoutubeDemo('catalog');
    for (const id of ['devDemoVid0', 'devDemoVid1', 'devDemoVid3', DEV_DEMO_EVENT_VIDEO_ID]) {
      const phrases = getDevVideoPhrases(id)!;
      expect(phrases.length).toBeGreaterThanOrEqual(4);
      expect(() => normalizeVideoPhraseList(id, phrases)).not.toThrow();
      const times = phrases.map((phrase) => phrase.startSec ?? -1);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
    }
    expect(getDevVideoPhrases('someOtherVid')).toBeNull();
  });

  it('в стор-сборке установка отклоняется, геттеры всегда null', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    expect(setDevYoutubeDemo('catalog')).toBe(false);
    expect(getDevYoutubeCatalogReader()).toBeNull();
    expect(getDevVideoPhrases('devDemoVid0')).toBeNull();
  });
});

describe('dev_youtube_demo: подключение и «без Firestore»', () => {
  it('клиент каталога и клиент фраз спрашивают подмену ПЕРВЫМ делом; сам модуль не трогает ни сеть, ни хранилище', () => {
    const client = read('app/youtube_catalog_client.ts');
    const body = client.slice(client.indexOf('async function createFirestoreReader'), client.indexOf('return {', client.indexOf('async function createFirestoreReader')));
    expect(body).toContain('const devReader = getDevYoutubeCatalogReader();');
    expect(body.indexOf('getDevYoutubeCatalogReader')).toBeLessThan(body.indexOf("import('@react-native-firebase/firestore')"));
    const phrases = read('app/video_phrases_client.ts');
    const fetchBody = phrases.slice(phrases.indexOf('export async function fetchPublishedVideoPhrases'));
    expect(fetchBody.indexOf('getDevVideoPhrases')).toBeLessThan(fetchBody.indexOf("import('@react-native-firebase/firestore')"));
    expect(read('app/dev_youtube_demo.ts')).not.toMatch(/AsyncStorage|@react-native-firebase|firestore\(|fetch\(/);
  });

  it('фикстура: catalog/catalog_upcoming включают каталог, empty/demo его снимают; значения разбираются, мусор отклоняется', () => {
    const fixtures = read('app/dev_state_fixtures.ts');
    expect(fixtures).toContain("pick('videopacks', ['empty', 'demo', 'catalog', 'catalog_upcoming'] as const)");
    expect(fixtures).toContain('setDevYoutubeDemo(youtubeOn ?');
    jest.isolateModules(() => {
      jest.doMock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(async () => null), setItem: jest.fn(), removeItem: jest.fn(), multiGet: jest.fn(async () => []), multiSet: jest.fn(), multiRemove: jest.fn(), getAllKeys: jest.fn(async () => []) } }));
      const { parseDevStateParams } = require('../app/dev_state_fixtures');
      expect(parseDevStateParams({ videopacks: 'catalog' }).request.videoPacks).toBe('catalog');
      expect(parseDevStateParams({ videopacks: 'catalog_upcoming' }).request.videoPacks).toBe('catalog_upcoming');
      expect(parseDevStateParams({ videopacks: 'zzz' }).rejected.videopacks).toBeTruthy();
    });
  });
});
