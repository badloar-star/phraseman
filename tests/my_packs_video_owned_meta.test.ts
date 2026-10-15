// зачем (🔴 R60, координатор 15.10): добавленный набор ролика виден в «Моих наборах» и без документа сообщества; смена владельца сбрасывает снимок id.
import { readFileSync } from 'fs';
import path from 'path';
import { buildOwnedVideoPackMeta, videoIdFromOwnedCommunityId } from '../app/flashcards/my_packs_video_meta';
import { ownedPackIdsVersion } from '../app/community_packs/owned_pack_ids_signal';
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';
import type { FlashcardMarketPack } from '../app/flashcards/marketplace';
import '../app/community_packs/useOwnedPack';

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8').split('\r\n').join('\n');
const phrase = { id: 'video:OHxgJuazJO0', videoId: 'OHxgJuazJO0', titleRu: 'САМЫЙ ЛЕГКИЙ способ', titleUk: 'x', titleEs: 'x', cardCount: 50, isCommunityUgc: false } as unknown as FlashcardMarketPack;

describe('набор ролика в «Моих наборах»', () => {
  it('video_<id> распознаётся, прочие id нет', () => {
    expect(videoIdFromOwnedCommunityId('video_OHxgJuazJO0')).toBe('OHxgJuazJO0');
    expect(videoIdFromOwnedCommunityId('video:OHxgJuazJO0')).toBeNull();
    expect(videoIdFromOwnedCommunityId('ugc_1')).toBeNull();
  });
  it('мета из набора фраз ролика: id как в «моих», 50 карточек', () => {
    const { pack, source } = buildOwnedVideoPackMeta({ packId: 'video_OHxgJuazJO0', phraseSetPacks: [phrase], communityDoc: null, storedTitle: undefined });
    expect(source).toBe('phrase_set');
    expect(pack.id).toBe('video_OHxgJuazJO0');
    expect(pack.cardCount).toBe(50);
    expect(pack.isCommunityUgc).toBe(true);
  });
  it('нет ни набора фраз, ни документа — берём сохранённое название, набор не пропадает', () => {
    const { pack, source } = buildOwnedVideoPackMeta({ packId: 'video_OHxgJuazJO0', phraseSetPacks: [], communityDoc: null, storedTitle: { titleRu: 'Мой ролик', titleUk: '', titleEs: '' } });
    expect(source).toBe('stored_title');
    expect(pack.titleRu).toBe('Мой ролик');
    expect(pack.videoId).toBe('OHxgJuazJO0');
  });
  it('экран не помечает наборы роликов «набора нет» и открывает их экраном ролика', () => {
    const screen = read('app/flashcards_my_packs.tsx');
    expect(screen).toContain('const regularMissing = missing.filter((id) => !videoOwnedIds.includes(id));');
    expect(screen).toContain("pathname: '/lingman_video_watch'");
  });
});

describe('смена владельца', () => {
  afterEach(() => __resetAccountGenerationForTests());
  it('выход A → вход B сигналит о смене состава id (снимок A стирается)', () => {
    beginAccountGeneration('owner-a');
    const before = ownedPackIdsVersion();
    beginAccountGeneration('owner-b');
    expect(ownedPackIdsVersion()).toBeGreaterThan(before);
  });
});
