import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import type { FlashcardMarketPack, FlashcardPackCategory } from '../flashcards/marketplace';
import { derivePackCodeName } from '../flashcards/marketplace';
import type { CardItem } from '../flashcards/types';
import { COMMUNITY_PACKS_COLLECTION, COMMUNITY_PACK_PRICE_SHARDS } from './schema';
import { callCommunityFetchPackCardsIfAccessible, isCommunityPacksCloudEnabled } from './functionsClient';
import { getCanonicalUserId } from '../user_id_policy';
import { UGC_CARD_THEME_DEFAULT_ID } from './ugcCardThemePresets';
import { normalizeUgcCardBackKey } from '../flashcards/cardBackCatalog';
import { storageStudyTarget, type RuntimeStudyTarget } from '../target_storage_keys';
import type { StudyTarget } from '../study_target';

function num(v: unknown, d = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.floor(n) : d;
}

export type MapCommunityPackDocOptions = {
  /** false — для метаданных «мои / купленные» вне витрины (admin_revision_required, admin_removed). */
  forCatalog?: boolean;
  /** Missing legacy docs are English; French docs must not leak into English and vice versa. */
  studyTarget?: RuntimeStudyTarget;
};

function communityPackDocStudyTarget(data: Record<string, unknown> | undefined): StudyTarget {
  return data?.studyTarget === 'fr' ? 'fr' : 'en';
}

export function communityPackDocMatchesStudyTarget(
  data: Record<string, unknown> | undefined,
  studyTarget?: RuntimeStudyTarget,
): boolean {
  return communityPackDocStudyTarget(data) === storageStudyTarget(studyTarget);
}

export function mapCommunityPackDocToMarket(
  id: string,
  data: Record<string, unknown> | undefined,
  opts?: MapCommunityPackDocOptions,
): FlashcardMarketPack | null {
  if (!data) return null;
  const studyTarget = communityPackDocStudyTarget(data);
  if (studyTarget !== storageStudyTarget(opts?.studyTarget)) return null;
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
  const titleEs = String(data.titleEs ?? '').trim();
  const titlePtBr = String(data.titlePtBr ?? '').trim();
  const titleVi = String(data.titleVi ?? '').trim();
  const titleId = String(data.titleId ?? '').trim();
  const titleTr = String(data.titleTr ?? '').trim();
  const titlePl = String(data.titlePl ?? '').trim();
  if (!titleRu && !titleUk && !titleEs && !titlePtBr && !titleVi && !titleId && !titleTr && !titlePl) return null;
  const codeNameRaw = String(data.codeName ?? '').trim();
  const cat = (data.category as FlashcardPackCategory) ?? 'slang';
  const authorSid = String(data.authorStableId ?? '').trim();
  return {
    id,
    codeName: codeNameRaw || derivePackCodeName(id),
    titleRu,
    titleUk,
    titleEs,
    titlePtBr,
    titleVi,
    titleId,
    titleTr,
    titlePl,
    descriptionRu: String(data.descriptionRu ?? ''),
    descriptionUk: String(data.descriptionUk ?? ''),
    descriptionEs: String(data.descriptionEs ?? ''),
    descriptionPtBr: String(data.descriptionPtBr ?? ''),
    descriptionVi: String(data.descriptionVi ?? ''),
    descriptionId: String(data.descriptionId ?? ''),
    descriptionTr: String(data.descriptionTr ?? ''),
    descriptionPl: String(data.descriptionPl ?? ''),
    category: cat,
    cardCount: Math.max(0, num(data.cardCount)),
    priceShards: COMMUNITY_PACK_PRICE_SHARDS,
    salesCount: Math.max(0, num(data.salesCount)),
    authorName: authorSid ? authorSid.slice(0, 24) : 'Community',
    authorStableId: authorSid || undefined,
    studyTarget,
    listingStatus: st,
    isPendingUpdateReview: st === 'update_pending' || st === 'admin_revision_required',
    ugcCardThemeKey: String(data.cardThemeKey ?? '').trim() || undefined,
    ugcCardBackKey: normalizeUgcCardBackKey(String(data.cardBackKey ?? '').trim()),
    isOfficial: false,
    isCommunityUgc: true,
    updatedAt: typeof data.updatedAt === 'number' ? new Date(data.updatedAt).toISOString() : new Date().toISOString(),
  };
}

/** Выше средний балл и при равенстве — больше число оценок; иначе свежее обновление. */
export function sortCommunityMarketPacksByRating(a: FlashcardMarketPack, b: FlashcardMarketPack): number {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

export async function loadPublishedCommunityMarketPacks(studyTarget?: RuntimeStudyTarget): Promise<FlashcardMarketPack[]> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return [];
  try {
    const snap = await firestore()
      .collection(COMMUNITY_PACKS_COLLECTION)
      .where('listingStatus', '==', 'published')
      .limit(80)
      .get();
    const list = snap.docs
      .map((d) => mapCommunityPackDocToMarket(d.id, d.data() as Record<string, unknown>, { studyTarget }))
      .filter(Boolean) as FlashcardMarketPack[];
    list.sort(sortCommunityMarketPacksByRating);
    return list.slice(0, 40);
  } catch {
    return [];
  }
}

/** Набори автора в очікуванні повторної модерації після редагування. */
export async function loadAuthorCommunityPacksPendingUpdate(
  authorStableId: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<FlashcardMarketPack[]> {
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
      const m = mapCommunityPackDocToMarket(doc.id, doc.data() as Record<string, unknown>, { forCatalog: false, studyTarget });
      if (m) out.push(m);
    }
    return out;
  } catch {
    return [];
  }
}

export type CommunityPackEditorSnapshot = {
  studyTarget: StudyTarget;
  title: string;
  description: string;
  priceShards: number;
  cardThemeKey: string;
  cardBackKey: string;
  cards: {
    id: string;
    en: string;
    ru: string;
    uk: string;
    es?: string;
    sourceLocales?: {
      'pt-BR'?: string;
      vi?: string;
      id?: string;
      tr?: string;
      pl?: string;
    };
  }[];
};

export async function fetchCommunityPackForAuthorEdit(
  packId: string,
  authorStableId: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<CommunityPackEditorSnapshot | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED || !packId || !authorStableId) return null;
  try {
    const snap = await firestore().collection(COMMUNITY_PACKS_COLLECTION).doc(packId).get();
    if (!snap.exists) return null;
    const d = snap.data() as Record<string, unknown>;
    const docStudyTarget = communityPackDocStudyTarget(d);
    if (docStudyTarget !== storageStudyTarget(studyTarget)) return null;
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
        es: String(c.es ?? '').trim() || undefined,
        sourceLocales: {
          'pt-BR': String((c.sourceLocales as Record<string, unknown> | undefined)?.['pt-BR'] ?? '').trim() || undefined,
          vi: String((c.sourceLocales as Record<string, unknown> | undefined)?.vi ?? '').trim() || undefined,
          id: String((c.sourceLocales as Record<string, unknown> | undefined)?.id ?? '').trim() || undefined,
          tr: String((c.sourceLocales as Record<string, unknown> | undefined)?.tr ?? '').trim() || undefined,
          pl: String((c.sourceLocales as Record<string, unknown> | undefined)?.pl ?? '').trim() || undefined,
        },
      };
    });
    return {
      studyTarget: docStudyTarget,
      title: String(d.titleRu ?? d.titleUk ?? d.titleEs ?? d.titlePtBr ?? d.titleVi ?? d.titleId ?? d.titleTr ?? d.titlePl ?? '').trim(),
      description: String(d.descriptionRu ?? d.descriptionUk ?? d.descriptionEs ?? d.descriptionPtBr ?? d.descriptionVi ?? d.descriptionId ?? d.descriptionTr ?? d.descriptionPl ?? '').trim(),
      priceShards: COMMUNITY_PACK_PRICE_SHARDS,
      cardThemeKey: String(d.cardThemeKey ?? UGC_CARD_THEME_DEFAULT_ID).trim() || UGC_CARD_THEME_DEFAULT_ID,
      cardBackKey: normalizeUgcCardBackKey(String(d.cardBackKey ?? '').trim()),
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
    const es = String(c.es ?? '').trim();
    /** У `CommunityPackCardPayload` третя колонка — нотатка/опис (редактор), не український переклад фрази. */
    const descriptionNote = String(c.uk ?? '').trim();
    const sourceLocales = {
      'pt-BR': String((c.sourceLocales as Record<string, unknown> | undefined)?.['pt-BR'] ?? '').trim() || undefined,
      vi: String((c.sourceLocales as Record<string, unknown> | undefined)?.vi ?? '').trim() || undefined,
      id: String((c.sourceLocales as Record<string, unknown> | undefined)?.id ?? '').trim() || undefined,
      tr: String((c.sourceLocales as Record<string, unknown> | undefined)?.tr ?? '').trim() || undefined,
      pl: String((c.sourceLocales as Record<string, unknown> | undefined)?.pl ?? '').trim() || undefined,
    };
    const hasSourceLocale = Object.values(sourceLocales).some((text) => !!String(text ?? '').trim());
    if (!id || !en || (!ru && !es && !hasSourceLocale)) continue;
    const item = {
      id: `${packId}_${id}`,
      en,
      sourceLocales,
      description: descriptionNote || undefined,
      categoryId: 'custom',
      isSystem: true,
      source: 'lesson',
      sourceId: `DEV:${packId}`,
    } as CardItem;
    item.ru = ru;
    item.uk = ru;
    item.es = es || undefined;
    out.push(item);
  }
  return out;
}

export async function fetchCommunityPackCards(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<CardItem[]> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return [];
  try {
    const snap = await firestore().collection(COMMUNITY_PACKS_COLLECTION).doc(packId).get();
    if (!snap.exists) return [];
    const d = snap.data() as Record<string, unknown> | undefined;
    if (!d) return [];
    if (!communityPackDocMatchesStudyTarget(d, studyTarget)) return [];
    const st = String(d.listingStatus ?? '');
    if (st === 'published' || st === 'update_pending' || st === 'admin_revision_required') {
      return communityPackCardsToCardItems(packId, d.cards);
    }
    if (st === 'admin_removed' && isCommunityPacksCloudEnabled()) {
      const sid = await getCanonicalUserId();
      if (!sid) return [];
      try {
        const res = await callCommunityFetchPackCardsIfAccessible({
          stableId: sid,
          packId,
          studyTarget: storageStudyTarget(studyTarget),
        });
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

export async function fetchCommunityPackMeta(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<FlashcardMarketPack | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    const snap = await firestore().collection(COMMUNITY_PACKS_COLLECTION).doc(packId).get();
    if (!snap.exists) return null;
    return mapCommunityPackDocToMarket(packId, snap.data() as Record<string, unknown>, { forCatalog: false, studyTarget });
  } catch {
    return null;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
