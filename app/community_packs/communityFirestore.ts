import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import type { FlashcardMarketPack, FlashcardPackCategory } from '../flashcards/marketplace';
import { derivePackCodeName } from '../flashcards/marketplace';
import type { CardItem } from '../flashcards/types';
import {
  COMMUNITY_PACKS_COLLECTION,
  COMMUNITY_PACK_PRICE_SHARDS_MIN,
} from './schema';
import { callCommunityFetchPackCardsIfAccessible, isCommunityPacksCloudEnabled } from './functionsClient';
import { getCanonicalUserId } from '../user_id_policy';
import { UGC_CARD_THEME_DEFAULT_ID } from './ugcCardThemePresets';

function num(v: unknown, d = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.floor(n) : d;
}

export type MapCommunityPackDocOptions = {
  /** false — для метаданных «мои / купленные» вне витрины (admin_revision_required, admin_removed). */
  forCatalog?: boolean;
};

export function mapCommunityPackDocToMarket(
  id: string,
  data: Record<string, unknown> | undefined,
  opts?: MapCommunityPackDocOptions,
): FlashcardMarketPack | null {
  if (!data) return null;
  const st = String(data.listingStatus ?? '');
  const forCatalog = opts?.forCatalog !== false;
  if (forCatalog) {
    if (st !== 'published' && st !== 'update_pending') return null;
  } else if (
    st !== 'published' &&
    st !== 'update_pending' &&
    st !== 'admin_revision_required' &&
    st !== 'admin_removed'
  ) {
    return null;
  }
  const titleRu = String(data.titleRu ?? '').trim();
  const titleUk = String(data.titleUk ?? '').trim();
  if (!titleRu || !titleUk) return null;
  const codeNameRaw = String(data.codeName ?? '').trim();
  const cat = (data.category as FlashcardPackCategory) ?? 'slang';
  const authorSid = String(data.authorStableId ?? '').trim();
  return {
    id,
    codeName: codeNameRaw || derivePackCodeName(id),
    titleRu,
    titleUk,
    titleEs: String(data.titleEs ?? ''),
    descriptionRu: String(data.descriptionRu ?? ''),
    descriptionUk: String(data.descriptionUk ?? ''),
    descriptionEs: String(data.descriptionEs ?? ''),
    category: cat,
    cardCount: Math.max(0, num(data.cardCount)),
    priceShards: Math.max(0, num(data.priceShards)),
    ratingAvg: Math.max(0, Math.min(5, num(data.ratingAvg))),
    ratingCount: Math.max(0, num(data.ratingCount)),
    salesCount: Math.max(0, num(data.salesCount)),
    authorName: authorSid ? authorSid.slice(0, 24) : 'Community',
    authorStableId: authorSid || undefined,
    listingStatus: st,
    isPendingUpdateReview: st === 'update_pending' || st === 'admin_revision_required',
    ugcCardThemeKey: String(data.cardThemeKey ?? '').trim() || undefined,
    isOfficial: false,
    isCommunityUgc: true,
    updatedAt: typeof data.updatedAt === 'number' ? new Date(data.updatedAt).toISOString() : new Date().toISOString(),
  };
}

/** Выше средний балл и при равенстве — больше число оценок; иначе свежее обновление. */
export function sortCommunityMarketPacksByRating(a: FlashcardMarketPack, b: FlashcardMarketPack): number {
  if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg;
  if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

export async function loadPublishedCommunityMarketPacks(): Promise<FlashcardMarketPack[]> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return [];
  try {
    const snap = await firestore()
      .collection(COMMUNITY_PACKS_COLLECTION)
      .where('listingStatus', '==', 'published')
      .limit(80)
      .get();
    const list = snap.docs
      .map((d) => mapCommunityPackDocToMarket(d.id, d.data() as Record<string, unknown>))
      .filter(Boolean) as FlashcardMarketPack[];
    list.sort(sortCommunityMarketPacksByRating);
    return list.slice(0, 40);
  } catch {
    return [];
  }
}

/** Набори автора в очікуванні повторної модерації після редагування. */
export async function loadAuthorCommunityPacksPendingUpdate(authorStableId: string): Promise<FlashcardMarketPack[]> {
  if (!authorStableId || IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return [];
  try {
    const snap = await firestore()
      .collection(COMMUNITY_PACKS_COLLECTION)
      .where('authorStableId', '==', authorStableId)
      .get();
    const out: FlashcardMarketPack[] = [];
    for (const doc of snap.docs) {
      const st = String(doc.data().listingStatus ?? '');
      if (st !== 'update_pending' && st !== 'admin_revision_required') continue;
      const m = mapCommunityPackDocToMarket(doc.id, doc.data() as Record<string, unknown>, { forCatalog: false });
      if (m) out.push(m);
    }
    return out;
  } catch {
    return [];
  }
}

export type CommunityPackEditorSnapshot = {
  title: string;
  description: string;
  priceShards: number;
  cardThemeKey: string;
  cards: Array<{ id: string; en: string; ru: string; uk: string }>;
};

export async function fetchCommunityPackForAuthorEdit(
  packId: string,
  authorStableId: string,
): Promise<CommunityPackEditorSnapshot | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED || !packId || !authorStableId) return null;
  try {
    const snap = await firestore().collection(COMMUNITY_PACKS_COLLECTION).doc(packId).get();
    if (!snap.exists) return null;
    const d = snap.data() as Record<string, unknown>;
    if (String(d.authorStableId ?? '').trim() !== authorStableId) return null;
    const st = String(d.listingStatus ?? '');
    if (st !== 'published' && st !== 'update_pending' && st !== 'admin_revision_required') return null;
    const cardsRaw = Array.isArray(d.cards) ? d.cards : [];
    const cards = cardsRaw.map((raw: unknown, i: number) => {
      const c = raw as Record<string, unknown>;
      return {
        id: String(c.id ?? `c${i + 1}`).trim() || `c${i + 1}`,
        en: String(c.en ?? '').trim(),
        ru: String(c.ru ?? '').trim(),
        uk: String(c.uk ?? '').trim(),
      };
    });
    const price = Math.floor(Number(d.priceShards));
    return {
      title: String(d.titleRu ?? d.titleUk ?? '').trim(),
      description: String(d.descriptionRu ?? d.descriptionUk ?? '').trim(),
      priceShards: Number.isFinite(price) ? price : COMMUNITY_PACK_PRICE_SHARDS_MIN,
      cardThemeKey: String(d.cardThemeKey ?? UGC_CARD_THEME_DEFAULT_ID).trim() || UGC_CARD_THEME_DEFAULT_ID,
      cards,
    };
  } catch {
    return null;
  }
}

/** Карточки из поля `cards` документа community_packs (как у CF при модерации). */
export function communityPackCardsToCardItems(packId: string, cards: unknown): CardItem[] {
  if (!Array.isArray(cards)) return [];
  const out: CardItem[] = [];
  for (const raw of cards) {
    if (!raw || typeof raw !== 'object') continue;
    const c = raw as Record<string, unknown>;
    const id = String(c.id ?? '').trim();
    const en = String(c.en ?? '').trim();
    const ru = String(c.ru ?? '').trim();
    /** У `CommunityPackCardPayload` третя колонка — нотатка/опис (редактор), не український переклад фрази. */
    const descriptionNote = String(c.uk ?? '').trim();
    if (!id || !en || !ru) continue;
    out.push({
      id: `${packId}_${id}`,
      en,
      ru,
      uk: ru,
      description: descriptionNote || undefined,
      categoryId: 'custom',
      isSystem: true,
      source: 'lesson',
      sourceId: `DEV:${packId}`,
    });
  }
  return out;
}

export async function fetchCommunityPackCards(packId: string): Promise<CardItem[]> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return [];
  try {
    const snap = await firestore().collection(COMMUNITY_PACKS_COLLECTION).doc(packId).get();
    if (!snap.exists) return [];
    const d = snap.data() as Record<string, unknown> | undefined;
    if (!d) return [];
    const st = String(d.listingStatus ?? '');
    if (st === 'published' || st === 'update_pending' || st === 'admin_revision_required') {
      return communityPackCardsToCardItems(packId, d.cards);
    }
    if (st === 'admin_removed' && isCommunityPacksCloudEnabled()) {
      const sid = await getCanonicalUserId();
      if (!sid) return [];
      try {
        const res = await callCommunityFetchPackCardsIfAccessible({ stableId: sid, packId });
        if (res?.cards?.length) return communityPackCardsToCardItems(packId, res.cards);
      } catch {
        return [];
      }
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchCommunityPackMeta(packId: string): Promise<FlashcardMarketPack | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    const snap = await firestore().collection(COMMUNITY_PACKS_COLLECTION).doc(packId).get();
    if (!snap.exists) return null;
    return mapCommunityPackDocToMarket(packId, snap.data() as Record<string, unknown>, { forCatalog: false });
  } catch {
    return null;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
