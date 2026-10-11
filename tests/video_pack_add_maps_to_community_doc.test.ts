/**
 * Баг владельца 11.10: «Видео → Наборы», «+» у набора Professor Lingman →
 * «Не удалось добавить набор · Проверь связь».
 *
 * Факт из журнала эмулятора: `[PACK-SOCIAL] добавление отклонено pack=video:cnrVN_uz7Sg причина=unavailable`.
 * Строка рисует общий «+», а набор фраз ролика (`app/video_phrase_set_packs.ts`, id `video:<videoId>`) собран
 * без `isCommunityUgc` → ранний отказ. По решению владельца 23.09 набор ролика — обычный документ
 * `community_packs/video_<videoId>` (сервер `functions/src/video_phrases.ts`), и добавляется именно он.
 */
import { readFileSync } from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addCommunityPackToLibrary,
  communityPackIdForVideoPhraseSet,
  VIDEO_COMMUNITY_PACK_ID_PREFIX,
  VIDEO_PHRASE_SET_PACK_ID_PREFIX,
} from '../app/community_packs/communityPackActions';
import { loadCommunityOwnedPackIds } from '../app/community_packs/communityOwnedStorage';
import type { FlashcardMarketPack } from '../app/flashcards/marketplace';
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';

const asyncStorageMock = AsyncStorage as unknown as { __reset: () => void };
const root = path.join(__dirname, '..');

function videoPhraseSetPack(videoId: string): FlashcardMarketPack {
  // Форма как в buildVideoPhraseSetPacks: официальный, без isCommunityUgc.
  return {
    id: `video:${videoId}`,
    codeName: 'Английский по-человечески',
    titleRu: 'Английский по-человечески', titleUk: 'Англійська по-людськи', titleEs: 'Inglés',
    descriptionRu: '', descriptionUk: '', descriptionEs: '',
    category: 'daily',
    cardCount: 100,
    priceShards: 0,
    salesCount: 0,
    authorName: '',
    isOfficial: true,
    updatedAt: '2026-10-11T00:00:00.000Z',
  } as FlashcardMarketPack;
}

describe('«+» у набора фраз ролика добавляет документ сообщества ролика', () => {
  beforeEach(() => {
    asyncStorageMock.__reset();
    beginAccountGeneration('owner-test');
  });
  afterEach(() => __resetAccountGenerationForTests());

  test('video:<id> добавляется как video_<id>, повторное нажатие — already_added', async () => {
    expect(await addCommunityPackToLibrary(videoPhraseSetPack('cnrVN_uz7Sg'))).toBe('added');
    expect(await loadCommunityOwnedPackIds()).toEqual(['video_cnrVN_uz7Sg']);
    expect(await addCommunityPackToLibrary(videoPhraseSetPack('cnrVN_uz7Sg'))).toBe('already_added');
    expect(await loadCommunityOwnedPackIds()).toEqual(['video_cnrVN_uz7Sg']);
  });

  test('сопоставление строгое: только id ролика YouTube из 11 символов', () => {
    expect(communityPackIdForVideoPhraseSet('video:cnrVN_uz7Sg')).toBe('video_cnrVN_uz7Sg');
    expect(communityPackIdForVideoPhraseSet('video:short')).toBeNull();
    expect(communityPackIdForVideoPhraseSet('video_cnrVN_uz7Sg')).toBeNull();
    expect(communityPackIdForVideoPhraseSet('official_wild_west_en')).toBeNull();
  });

  test('прочие официальные наборы по-прежнему не выдаются, и причина пишется в лог', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const official = { ...videoPhraseSetPack('cnrVN_uz7Sg'), id: 'official_wild_west_en' } as FlashcardMarketPack;
      expect(await addCommunityPackToLibrary(official)).toBe('unavailable');
      expect(warn.mock.calls.map((c) => String(c[0])).join('\n')).toContain('[PACK-ADD] unavailable reason=not_community_ugc pack=official_wild_west_en');
    } finally {
      warn.mockRestore();
    }
  });

  test('префиксы совпадают с исходниками клиента и сервера', () => {
    const client = readFileSync(path.join(root, 'app/video_phrase_set_packs.ts'), 'utf8');
    const server = readFileSync(path.join(root, 'functions/src/video_phrases.ts'), 'utf8');
    expect(client).toContain(`VIDEO_PHRASE_SET_PACK_PREFIX = '${VIDEO_PHRASE_SET_PACK_ID_PREFIX}'`);
    expect(server).toContain(`const videoPackId = (id: string) => \`${VIDEO_COMMUNITY_PACK_ID_PREFIX}\${id}\``);
  });

  test('текст отказа больше не отправляет «проверять связь»', () => {
    const bar = readFileSync(path.join(root, 'app/community_packs/CommunityPackSocialBar.tsx'), 'utf8');
    expect(bar).not.toContain('Не удалось добавить набор. Проверь связь');
    expect(bar).toContain('Этот набор пока нельзя добавить себе.');
  });
});
