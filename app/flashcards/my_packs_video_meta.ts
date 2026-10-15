// ═══════════════════════════════════════════════════════════════════════════
// my_packs_video_meta.ts — мета добавленного набора ролика для «Моих наборов» из ЛОКАЛЬНЫХ источников.
//
// зачем (🔴 R60, координатор 15.10; владелец: «добавил набор из видео, а тут набора нет»): «+» у набора ролика пишет в «мои» id `video_<id>`,
// а «Мои наборы» искали его в каталоге сообщества, потом документом `community_packs/video_<id>` — документа нет (наборы роликов собираются
// на клиенте из `video_phrase_sets`), id попадал в «набора нет» и кэшировался как отсутствующий. Здесь id набора ролика НИКОГДА не «отсутствует»:
// мета собирается из готового набора фраз ролика (кэш на диске, ≤1 чтение за 6 ч), затем из документа сообщества (если он есть),
// затем из сохранённого при добавлении названия. Журнал: [MY-PACKS] video_owned.
// ═══════════════════════════════════════════════════════════════════════════
import type { FlashcardMarketPack } from './marketplace';
import type { CommunityOwnedPackTitle } from '../community_packs/communityOwnedStorage';

const VIDEO_COMMUNITY_ID = /^video_([A-Za-z0-9_-]{11})$/;

/** `video_<id ролика>` → id ролика; любой другой id → null. */
export function videoIdFromOwnedCommunityId(packId: string): string | null {
  const match = VIDEO_COMMUNITY_ID.exec(packId);
  return match ? match[1] : null;
}

export type OwnedVideoMetaSource = 'phrase_set' | 'community_doc' | 'stored_title';

/**
 * Мета для списка: сначала готовый набор фраз ролика (id `video:<id>`), id заменяем на `video_<id>` — под ним набор лежит в «моих»
 * (удаление, ключи, тренировка идут по этому id). Названия нет нигде — берём сохранённое при добавлении, иначе id ролика.
 */
export function buildOwnedVideoPackMeta(input: {
  packId: string;
  phraseSetPacks: readonly FlashcardMarketPack[];
  communityDoc: FlashcardMarketPack | null;
  storedTitle: CommunityOwnedPackTitle | undefined;
}): { pack: FlashcardMarketPack; source: OwnedVideoMetaSource } {
  const videoId = videoIdFromOwnedCommunityId(input.packId) ?? '';
  const phrase = input.phraseSetPacks.find((pack) => pack.videoId === videoId);
  if (phrase) return { pack: { ...phrase, id: input.packId, isCommunityUgc: true }, source: 'phrase_set' };
  if (input.communityDoc) return { pack: input.communityDoc, source: 'community_doc' };
  const ru = input.storedTitle?.titleRu?.trim() || videoId || input.packId;
  const uk = input.storedTitle?.titleUk?.trim() || ru;
  const es = input.storedTitle?.titleEs?.trim() || uk;
  return {
    source: 'stored_title',
    pack: {
      id: input.packId, codeName: ru, titleRu: ru, titleUk: uk, titleEs: es,
      descriptionRu: '', descriptionUk: '', descriptionEs: '',
      category: 'daily', cardCount: 0, priceShards: 0, salesCount: 0, authorName: '', isOfficial: false, isCommunityUgc: true,
      listingStatus: 'published', videoId, videoTitle: ru, updatedAt: new Date(0).toISOString(),
    } as FlashcardMarketPack,
  };
}
