/**
 * Ревизор R47 (координатор 15.10): добавленный ЧУЖОЙ набор (из видео или сообщества) можно «убрать из моих» — локально, мгновенно, с надгробием для синка.
 * Сценарий: добавить чужой → убрать → «перезапуск» (экран читает хранилище заново) → набор не вернулся; серверное «удалить как автор» для чужого не зовётся.
 */
import { readFileSync } from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addCommunityPackToLibrary } from '../app/community_packs/communityPackActions';
import { loadCommunityOwnedPackIds, loadCommunityOwnedPackTitles, removeCommunityOwnedPackId } from '../app/community_packs/communityOwnedStorage';
import type { FlashcardMarketPack } from '../app/flashcards/marketplace';
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';

const asyncStorageMock = AsyncStorage as unknown as { __reset: () => void };

function foreignPack(id: string, extra: Partial<FlashcardMarketPack> = {}): FlashcardMarketPack {
  return {
    id, codeName: 'Code', titleRu: 'Чужой набор', titleUk: 'Чужий набір', titleEs: '', descriptionRu: '', descriptionUk: '', descriptionEs: '',
    category: 'slang', cardCount: 12, priceShards: 0, salesCount: 0, authorName: 'Author', isOfficial: false, isCommunityUgc: true,
    updatedAt: '2026-08-01T00:00:00.000Z', ...extra,
  };
}

describe('«Убрать из моих» для чужого набора', () => {
  beforeEach(() => { asyncStorageMock.__reset(); beginAccountGeneration('owner-test'); });
  afterEach(() => __resetAccountGenerationForTests());

  test('добавил чужой → убрал → при повторном чтении не вернулся; название тоже убрано', async () => {
    expect(await addCommunityPackToLibrary(foreignPack('video_pack_1'))).toBe('added');
    expect(await addCommunityPackToLibrary(foreignPack('other_pack'))).toBe('added');
    expect(await loadCommunityOwnedPackIds()).toEqual(['video_pack_1', 'other_pack']);
    expect(await removeCommunityOwnedPackId('video_pack_1')).toBe('removed');
    // «перезапуск»: экран читает хранилище заново
    expect(await loadCommunityOwnedPackIds()).toEqual(['other_pack']);
    expect(Object.keys(await loadCommunityOwnedPackTitles())).toEqual(['other_pack']);
  });

  test('набора нет в «моих» — ничего не пишем и отвечаем not_owned', async () => {
    expect(await removeCommunityOwnedPackId('nope')).toBe('not_owned');
    expect(await loadCommunityOwnedPackIds()).toEqual([]);
  });

  test('после «убрать» набор можно добавить снова', async () => {
    await addCommunityPackToLibrary(foreignPack('again'));
    await removeCommunityOwnedPackId('again');
    expect(await addCommunityPackToLibrary(foreignPack('again'))).toBe('added');
    expect(await loadCommunityOwnedPackIds()).toEqual(['again']);
  });
});

describe('экран: свой набор — «Удалить», чужой — «Убрать из моих»', () => {
  const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8').split('\r\n').join('\n');
  test('чужой набор не зовёт серверное удаление автора; откат при сбое; надгробие через снимок библиотеки', () => {
    const screen = read('app/flashcards_my_packs.tsx');
    expect(screen).toContain('const deletePackOwn = !!deletePackTarget && groups.created.some((item) => item.id === deletePackTarget.id);');
    expect(screen.indexOf('if (!deletePackOwn) {')).toBeLessThan(screen.indexOf('await deleteOwnPackEverywhere(pack, studyTarget);'));
    expect(screen).toContain("if (result !== 'removed') throw new Error(`remove_${result}`);");
    expect(read('app/community_packs/communityOwnedStorage.ts')).toContain('emitLibrarySnapshot(v2Owner, target, next, titles);');
    expect(read('app/flashcards/MyPacksV2.tsx')).toContain("actionsOwn ? 'trash-outline' : 'remove-circle-outline'");
  });
});
