/**
 * Источники сквозного поиска Карточек 2.0 — только то, что уже лежит на устройстве или в прогретых кэшах.
 *
 * зачем (координатор 11.10, экономия Firebase обязательна): поиск не должен будить сеть. Сохранённые и свои
 * карточки и свои наборы — с диска; каталог сообщества и ролики — только из уже прогретых снимков (peek),
 * без загрузки. Нет снимка — группа пустая, это честно: сеть подтянет её при обычном заходе в раздел.
 * Индекс строится один раз на открытие поиска; дальше каждая буква ищет в памяти (cards_search_index.ts).
 * Логи: [CARDS-SEARCH].
 */
import type { Lang } from '../../constants/i18n';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { buildCardsSearchIndex, type CardsSearchIndex, type SearchCardInput, type SearchPackInput } from './cards_search_index';
import { packTitleForInterface, type FlashcardMarketPack } from './marketplace';
import { resolveFlashcardBackText, type CardItem, type FlashcardContentLang } from './types';

const LOG = '[CARDS-SEARCH]';

function contentLang(lang: Lang): FlashcardContentLang {
  return (lang === 'en' ? 'ru' : lang) as FlashcardContentLang;
}

function packInput(pack: FlashcardMarketPack, lang: Lang): SearchPackInput {
  const isVideo = typeof pack.videoId === 'string' && pack.videoId.length > 0;
  return {
    id: pack.id,
    title: isVideo ? (pack.videoTitle || packTitleForInterface(pack, lang)) : packTitleForInterface(pack, lang),
    authorName: pack.authorName || undefined,
    cardCount: pack.cardCount,
    ...(pack.level ? { level: pack.level } : {}),
    ...(pack.previewWords ? { previewWords: pack.previewWords } : {}),
    isVideo,
    ...(isVideo ? { videoId: pack.videoId, videoDurationSec: pack.videoDurationSec } : {}),
  };
}

function cardInput(card: CardItem, lang: FlashcardContentLang, sourceKind: 'saved' | 'custom'): SearchCardInput | null {
  const text = String(card.en ?? '').trim();
  if (!card.id || !text) return null;
  return { id: card.id, text, translation: resolveFlashcardBackText(card, lang), sourceKind };
}

/** Собрать индекс из локальных источников. Сбой источника не роняет остальные — группа просто пустая. */
export async function loadCardsSearchIndex(lang: Lang, studyTarget?: RuntimeStudyTarget): Promise<CardsSearchIndex> {
  const startedAt = Date.now();
  const cl = contentLang(lang);
  const note = (source: string) => (error: unknown) => {
    console.warn(`${LOG} источник ${source} не прочитан — группа без него`, error instanceof Error ? error.message : String(error));
    return [] as never[];
  };

  const [saved, custom, localPacks] = await Promise.all([
    import('./saved_language_contour').then((m) => m.loadSelectedSavedContour(studyTarget)).catch(note('saved')),
    import('./custom_cards_store').then((m) => m.listCustomCards(studyTarget)).catch(note('custom')),
    import('../community_packs/localAuthorPacks')
      .then(async (m) => (await m.loadLocalAuthorPacks()).map((p) => m.localAuthorPackToMarketPack(p, studyTarget)))
      .catch(note('own_packs')),
  ]);
  const [catalog, videos] = await Promise.all([
    import('../community_packs/communityFirestore').then((m) => m.peekPublishedCommunityMarketPacks(studyTarget) ?? []).catch(note('catalog')),
    import('../video_phrase_set_packs').then((m) => m.peekVideoPhraseSetPacks() ?? []).catch(note('videos')),
  ]);

  const cards: SearchCardInput[] = [];
  for (const card of saved as unknown as CardItem[]) {
    const input = cardInput(card, cl, 'saved');
    if (input) cards.push(input);
  }
  for (const card of custom as CardItem[]) {
    const input = cardInput(card, cl, 'custom');
    if (input) cards.push(input);
  }
  const packs = [...(localPacks as FlashcardMarketPack[]), ...(catalog as FlashcardMarketPack[]), ...(videos as FlashcardMarketPack[])]
    .map((pack) => packInput(pack, lang));
  const index = buildCardsSearchIndex({ cards, packs });
  console.log(LOG, JSON.stringify({
    built: true,
    ms: Date.now() - startedAt,
    cards: index.cards.length,
    packs: index.packs.length,
    videos: index.videos.length,
    catalogFromCache: (catalog as unknown[]).length,
    videosFromCache: (videos as unknown[]).length,
  }));
  return index;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
