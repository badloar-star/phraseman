// ═══════════════════════════════════════════════════════════════════════════
// video_pack_fallback.ts — карточки набора ролика из ФРАЗ ролика, когда документа сообщества `video_<id>` нет или он пуст.
//
// зачем (🔴 координатор 15.10, «Мои наборы» → набор ролика → «Тренировать»): тренировка грузила карточки только из community_packs/video_<id>
// (`if (!snap.exists) return []`) — без документа режим открывался пустым, а набор пропадал из списка колод. Тот же источник, что и мета набора
// (my_packs_video_meta.ts): фразы ролика `video_phrase_sets` с кэшем 6 ч (loadVideoPhrasesCached) — лишних чтений нет.
// Журнал: [DECK] video_fallback.
// ═══════════════════════════════════════════════════════════════════════════
import { loadVideoPhrasesCached } from '../video_phrases_client';
import { communityPackCardsToCardItems } from '../community_packs/communityFirestore';
import { normalizePackLanguage } from './pack_languages';
import { videoIdFromOwnedCommunityId } from './my_packs_video_meta';
import type { CardItem } from './types';
import type { VideoPhrase } from '../../shared/video_phrases_contract';

/** Фразы ролика → карточки тем же маппером, что и карточки документа сообщества (таймкод едет в videoStartSec). */
export function videoPhrasesToCardItems(packId: string, phrases: readonly VideoPhrase[], studyTarget?: string | null): CardItem[] {
  const cards = phrases.map((phrase) => ({
    id: phrase.id,
    en: phrase.phrase,
    ru: phrase.translation,
    note: phrase.explanation,
    ...(typeof phrase.startSec === 'number' ? { videoStartSec: phrase.startSec } : {}),
  }));
  return communityPackCardsToCardItems(packId, cards, normalizePackLanguage(studyTarget));
}

/**
 * Карточки набора ролика из фраз. `cacheOnly` — без сети (режим localOnly): только память/диск.
 * Не набор ролика (id не `video_<id>`) → [].
 */
export async function loadVideoPackFallbackCards(
  packId: string,
  studyTarget?: string | null,
  options: Readonly<{ cacheOnly?: boolean }> = {},
): Promise<CardItem[]> {
  const videoId = videoIdFromOwnedCommunityId(packId);
  if (!videoId) return [];
  try {
    if (options.cacheOnly) {
      // сеть запрещена: фетчер отказывает, и кэш (память или диск, любого возраста) отдаётся как есть
      const cached = await loadVideoPhrasesCached(videoId, { fetcher: async () => { throw new Error('local_only_no_network'); } }).catch((error: unknown) => {
        console.log(`[DECK] video_fallback pack=${packId} cache_only: кэша нет (${error instanceof Error ? error.message : String(error)})`); // guard-ok: причина
        return null;
      });
      const cards = cached ? videoPhrasesToCardItems(packId, cached.phrases, studyTarget) : [];
      console.log(`[DECK] video_fallback pack=${packId} source=cache_only:${cached?.from ?? 'none'} phrases=${cached?.phrases.length ?? 0} cards=${cards.length}`); // guard-ok: итог ветки
      return cards;
    }
    const { phrases, from } = await loadVideoPhrasesCached(videoId);
    const cards = videoPhrasesToCardItems(packId, phrases, studyTarget);
    console.log(`[DECK] video_fallback pack=${packId} source=${from} phrases=${phrases.length} cards=${cards.length}`); // guard-ok: итог ветки
    return cards;
  } catch (error: unknown) {
    console.warn(`[DECK] video_fallback pack=${packId} FAILED reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина сбоя
    return [];
  }
}
