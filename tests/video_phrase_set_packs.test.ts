// зачем (владелец 01.10): «Из видео» строится из готовых наборов фраз роликов
// (video_phrase_sets), а не из community_packs с videoId (их 0).
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/youtube_catalog_client', () => ({
  fetchYoutubeCatalogManifest: jest.fn(),
  fetchYoutubeChannelCatalog: jest.fn(),
}));

import {
  buildVideoPhraseSetPacks,
  isVideoPhraseSetPackId,
  packLanguageFromTags,
  videoChannelIdOf,
  videoIdFromPackId,
} from '../app/video_phrase_set_packs';

describe('video_phrase_set_packs', () => {
  it('строит набор на каждый ролик с фразами, с названием и языком канала', () => {
    const catalog = new Map([
      ['0zCqqr-1F6U', { title: 'English chain #1', channelId: 'ch_en', packLanguage: 'en' as const }],
    ]);
    const packs = buildVideoPhraseSetPacks([
      { videoId: '0zCqqr-1F6U', phraseCount: 296, publishedAtMs: 2 },
      { videoId: '2v44I8PBnNs', phraseCount: 100, publishedAtMs: 1 },
    ], catalog);
    expect(packs).toHaveLength(2);
    expect(packs[0].id).toBe('video:0zCqqr-1F6U');
    expect(packs[0].videoId).toBe('0zCqqr-1F6U');
    expect(packs[0].titleRu).toBe('English chain #1');
    expect(packs[0].cardCount).toBe(296);
    expect(packs[0].packLanguage).toBe('en');
    expect(videoChannelIdOf(packs[0])).toBe('ch_en');
    // ролик без записи в каталоге не пропадает — название = id
    expect(packs[1].titleRu).toBe('2v44I8PBnNs');
  });

  it('ролики без фраз и с битым id не попадают в список', () => {
    const packs = buildVideoPhraseSetPacks([
      { videoId: 'aR7abi7Z5i0', phraseCount: 0, publishedAtMs: 1 },
      { videoId: 'bad', phraseCount: 10, publishedAtMs: 1 },
    ], new Map());
    expect(packs).toHaveLength(0);
  });

  it('id набора ролика распознаётся и разбирается обратно', () => {
    expect(isVideoPhraseSetPackId('video:akd88_-uz1c')).toBe(true);
    expect(isVideoPhraseSetPackId('community-123')).toBe(false);
    expect(videoIdFromPackId('video:akd88_-uz1c')).toBe('akd88_-uz1c');
  });

  it('язык канала берётся из languageTags', () => {
    expect(packLanguageFromTags(['es-ES'])).toBe('es');
    expect(packLanguageFromTags(['de'])).toBe('de');
    expect(packLanguageFromTags([])).toBe('en');
  });
});
