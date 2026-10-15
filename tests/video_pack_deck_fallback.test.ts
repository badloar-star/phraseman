// зачем (🔴 координатор 15.10): «Мои наборы» → набор ролика → «Тренировать» открывается с карточками, даже если документа community_packs/video_<id> нет — карточки из фраз ролика (кэш 6 ч).
import { readFileSync } from 'fs';
import path from 'path';
import { loadVideoPackFallbackCards, videoPhrasesToCardItems } from '../app/flashcards/video_pack_fallback';
import * as phrasesClient from '../app/video_phrases_client';

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8').split('\r\n').join('\n');
const PHRASES = [
  { id: 'p1', ordinal: 1, phrase: 'Take it easy', translation: 'Не напрягайся', explanation: 'Спокойно', startSec: 12.5 },
  { id: 'p2', ordinal: 2, phrase: 'No worries', translation: 'Не волнуйся', explanation: '' },
];

describe('карточки набора ролика из фраз', () => {
  afterEach(() => jest.restoreAllMocks());

  it('фразы превращаются в карточки с таймкодом', () => {
    const cards = videoPhrasesToCardItems('video_OHxgJuazJO0', PHRASES, 'en');
    expect(cards).toHaveLength(2);
    expect(cards[0].en).toBe('Take it easy');
    expect(cards[0].videoStartSec).toBe(12.5);
  });

  it('документа нет → N карточек из фраз (гость и вошедший — путь один, без авторизации)', async () => {
    jest.spyOn(phrasesClient, 'loadVideoPhrasesCached').mockResolvedValue({ phrases: PHRASES, from: 'memory' });
    const cards = await loadVideoPackFallbackCards('video_OHxgJuazJO0', 'en');
    expect(cards).toHaveLength(2);
  });

  it('не набор ролика → пусто, сеть не трогается', async () => {
    const spy = jest.spyOn(phrasesClient, 'loadVideoPhrasesCached');
    expect(await loadVideoPackFallbackCards('ugc_1', 'en')).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('сбой загрузки фраз → [] с причиной, без падения', async () => {
    jest.spyOn(phrasesClient, 'loadVideoPhrasesCached').mockRejectedValue(new Error('offline'));
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await loadVideoPackFallbackCards('video_OHxgJuazJO0', 'en')).toEqual([]);
  });

  it('только кэш (localOnly): сеть запрещена', async () => {
    const spy = jest.spyOn(phrasesClient, 'loadVideoPhrasesCached').mockImplementation(async (_id, options) => {
      await expect(options?.fetcher?.('x')).rejects.toThrow('local_only_no_network');
      return { phrases: PHRASES, from: 'disk' };
    });
    const cards = await loadVideoPackFallbackCards('video_OHxgJuazJO0', 'en', { cacheOnly: true });
    expect(cards).toHaveLength(2);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('подключение и 🟡 Ревизора', () => {
  it('deck_sources берёт запасной путь после сети и офлайн-кэша, лениво', () => {
    const src = read('app/flashcards/deck_sources.ts');
    expect(src).toContain('await videoFallbackCards(packId, studyTarget, false)');
    expect(src).toContain("await import('./video_pack_fallback')");
  });
  it('R60 (а) параллельные чтения с отметкой «нет документа»; (б) версия снимка в apply()', () => {
    expect(read('app/flashcards_my_packs.tsx')).toContain('await Promise.all(videoOwnedIds.map(');
    expect(read('app/community_packs/useOwnedPack.ts')).toContain('snapshot.version !== ownedPackIdsVersion()');
  });
  it('R47: надгробие пишется раньше списка', () => {
    const src = read('app/community_packs/communityOwnedStorage.ts');
    const start = src.indexOf('export async function removeCommunityOwnedPackId');
    const body = src.slice(start, start + 4000);
    expect(body.indexOf('await stampOwnedTombstone(id, true, studyTarget)')).toBeLessThan(body.indexOf('await AsyncStorage.setItem(key, JSON.stringify(next))'));
  });
  it('«Не удалось загрузить»: один заход с потолком, catch, safe-area', () => {
    const data = read('app/flashcards/useCollectionData.ts');
    expect(data).toContain('LOAD_GATE_TOTAL_MS');
    expect(data).toContain('[PACK-OPEN] cards_fetch FAILED');
    expect(read('app/flashcards/PackOpenFailedView.tsx')).toContain('insets.bottom');
  });
});

describe('доводка Ревизора a607a2e9c', () => {
  it('известное «документа нет» пропускает пустое чтение и сразу берёт фразы; первое «нет» помечается', () => {
    const src = read('app/flashcards/deck_sources.ts');
    expect(src).toContain('missingPackCache.isMissing(videoMissingKey, Date.now())');
    expect(src).toContain('missingPackCache.markMissing(videoMissingKey, Date.now())');
    expect(src.indexOf('missingPackCache.isMissing(videoMissingKey')).toBeLessThan(src.indexOf('const communityCards = await withTimeout('));
  });
});

describe('отметка «документа нет» — только при подтверждённом exists=false', () => {
  const load = (get: () => Promise<{ exists: boolean; data?: () => unknown }>) => {
    jest.resetModules();
    jest.doMock('@react-native-firebase/firestore', () => ({
      __esModule: true,
      default: () => ({ collection: () => ({ doc: () => ({ get }) }) }),
    }));
    jest.doMock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
    return require('../app/community_packs/communityFirestore') as typeof import('../app/community_packs/communityFirestore');
  };
  afterEach(() => { jest.dontMock('@react-native-firebase/firestore'); jest.dontMock('../app/config'); jest.resetModules(); });

  it('exists=false → подтверждено; таймаут/ошибка → нет', async () => {
    const missing = load(async () => ({ exists: false }));
    const t0 = Date.now();
    expect(await missing.fetchCommunityPackCards('video_AAAAAAAAAAA')).toEqual([]);
    expect(missing.communityCardsDocConfirmedMissingSince('video_AAAAAAAAAAA', t0)).toBe(true);

    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failing = load(async () => { throw new Error('network'); });
    const t1 = Date.now();
    expect(await failing.fetchCommunityPackCards('video_BBBBBBBBBBB')).toEqual([]);
    expect(failing.communityCardsDocConfirmedMissingSince('video_BBBBBBBBBBB', t1)).toBe(false);
  });
});

describe('подпись автора набора ролика — название канала (🟡 Ревизора 15.10)', () => {
  it('buildVideoPhraseSetPacks кладёт название канала в authorName; нет названия — пусто', () => {
    const { buildVideoPhraseSetPacks } = require('../app/video_phrase_set_packs') as typeof import('../app/video_phrase_set_packs');
    const sets = [{ videoId: 'OHxgJuazJO0', phraseCount: 5, publishedAtMs: 1 }, { videoId: 'AAAAAAAAAAA', phraseCount: 3, publishedAtMs: 2 }];
    const catalog = new Map([
      ['OHxgJuazJO0', { title: 'T', channelId: 'c1', packLanguage: 'en' as const, channelName: 'Professor Lingman' }],
      ['AAAAAAAAAAA', { title: 'U', channelId: 'c2', packLanguage: 'en' as const }],
    ]);
    const packs = buildVideoPhraseSetPacks(sets, catalog);
    expect(packs.find((p) => p.videoId === 'OHxgJuazJO0')?.authorName).toBe('Professor Lingman');
    expect(packs.find((p) => p.videoId === 'AAAAAAAAAAA')?.authorName).toBe('');
  });
});
