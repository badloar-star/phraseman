import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import type { FlashcardMarketPack, FlashcardPackCategory } from '../flashcards/marketplace';
import { derivePackCodeName } from '../flashcards/marketplace';
import type { CardItem } from '../flashcards/types';
import { COMMUNITY_PACKS_COLLECTION } from './schema';
import { comparePacksBySocial, readPackSocialCounts } from './packSocial';
import { readPackCommentsCount } from './packComments';
import { callCommunityFetchPackCardsIfAccessible, isCommunityPacksCloudEnabled } from './functionsClient';
import { getCanonicalUserId } from '../user_id_policy';
import { UGC_CARD_THEME_DEFAULT_ID } from './ugcCardThemePresets';
import { normalizeUgcCardBackKey } from '../flashcards/cardBackCatalog';
import { storageStudyTarget, type RuntimeStudyTarget } from '../target_storage_keys';
import type { StudyTarget } from '../study_target';
import { isPackLanguage, normalizePackCardTexts, normalizePackLanguage, type PackLanguage } from '../flashcards/pack_languages';
import { DebugLogger } from '../debug-logger';

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

function communityPackDocLanguage(data: Record<string, unknown> | undefined): PackLanguage {
  return normalizePackLanguage(data?.packLanguage ?? data?.studyTarget);
}

function communityPackDocStudyTarget(data: Record<string, unknown> | undefined): StudyTarget {
  return storageStudyTarget(data?.studyTarget as RuntimeStudyTarget | undefined);
}

export function communityPackDocMatchesStudyTarget(
  data: Record<string, unknown> | undefined,
  studyTarget?: RuntimeStudyTarget,
): boolean {
  /** New community packs are filtered by their independent pack language, not the active study target. */
  if (isPackLanguage(data?.packLanguage)) return true;
  return communityPackDocStudyTarget(data) === storageStudyTarget(studyTarget);
}

export function mapCommunityPackDocToMarket(
  id: string,
  data: Record<string, unknown> | undefined,
  opts?: MapCommunityPackDocOptions,
): FlashcardMarketPack | null {
  if (!data) return null;
  const studyTarget = communityPackDocStudyTarget(data);
  if (!isPackLanguage(data.packLanguage) && studyTarget !== storageStudyTarget(opts?.studyTarget)) return null;
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
  const social = readPackSocialCounts(data);
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
    /** Легаси-поле ЖЕМЧУГА в документе игнорируем: наборы сообщества за жемчуг
     *  не продавались и не продаются. Их валюта — руны, поле ниже. */
    priceShards: 0,
    /**
     * Цена в РУНАХ, которую поставил автор (владелец 2026-09-17, экран 6-8
     * макета docs/design/runes/MAKET.html). Отменяет Cards 2.1 §1.2
     * «наборы сообщества бесплатны».
     *
     * зачем читать здесь: без этой строки цена, сохранённая автором, терялась
     * бы по дороге из Firestore — каталог и шит покупки всегда видели бы 0.
     * Класс бага «механизм есть, а данных не дали».
     *
     * Поля нет у старых наборов — они остаются бесплатными навсегда.
     */
    priceRunes: Math.max(0, num(data.priceRunes)),
    likesCount: social.likesCount,
    addedCount: social.addedCount,
    // зачем: счётчик откликов едет вместе с лайками из ТОГО ЖЕ документа —
    // так «💬 7» в списках не стоит ни одного дополнительного чтения.
    commentsCount: readPackCommentsCount(data),
    salesCount: Math.max(0, num(data.salesCount)),
    /**
     * Ник автора резолвится отдельно (`packAuthorNames.ts`): в документе набора
     * его нет, а раньше сюда клали обрезанный `authorStableId` — и пользователь
     * видел на экране набора сырой UID вместо ника.
     */
    authorName: '',
    authorStableId: authorSid || undefined,
    studyTarget,
    packLanguage: communityPackDocLanguage(data),
    listingStatus: st,
    isPendingUpdateReview: st === 'update_pending' || st === 'admin_revision_required',
    ugcCardThemeKey: String(data.cardThemeKey ?? '').trim() || undefined,
    ugcCardBackKey: normalizeUgcCardBackKey(String(data.cardBackKey ?? '').trim()),
    isOfficial: false,
    isCommunityUgc: true,
    updatedAt: typeof data.updatedAt === 'number' ? new Date(data.updatedAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Cards 2.1 §2.3: каталог сортируется по лайкам ↓, затем по числу добавлений ↓, затем по свежести.
 */
export function sortCommunityMarketPacksBySocial(a: FlashcardMarketPack, b: FlashcardMarketPack): number {
  return comparePacksBySocial(a, b);
}

/** @deprecated Cards 2.1 §2.3: сортировка по рейтингу заменена на сортировку по лайкам. */
export const sortCommunityMarketPacksByRating = sortCommunityMarketPacksBySocial;

/**
 * Тёплый кэш опубликованного каталога сообщества.
 *
 * зачем (Firebase-экономия): запрос читает до 80 документов, а зовут его хаб
 * карточек при КАЖДОМ фокусе и витрина «Лучшее у сообщества». Без кэша каждое
 * возвращение на экран стоило десятки чтений. Каталог сообщества меняется
 * медленно (модерация), поэтому 6 часов — безопасный TTL; pull-to-refresh и
 * явная кнопка «Повторить» проходят мимо кэша через `forceRemote`.
 */
const COMMUNITY_CATALOG_TTL_MS = 6 * 60 * 60 * 1000;
let _communityCatalogCache: {
  key: string;
  at: number;
  packs: FlashcardMarketPack[];
} | null = null;

let catalogGeneration = 0;
export function invalidateCommunityPackCatalog(): void { catalogGeneration += 1; _communityCatalogCache = null; }

/** Синхронный снимок для первого кадра. null — снимка нет, нужен спиннер. */
export function peekPublishedCommunityMarketPacks(
  studyTarget?: RuntimeStudyTarget,
): FlashcardMarketPack[] | null {
  const key = String(studyTarget ?? 'default');
  if (!_communityCatalogCache || _communityCatalogCache.key !== key) return null;
  if (Date.now() - _communityCatalogCache.at > COMMUNITY_CATALOG_TTL_MS) return null;
  return _communityCatalogCache.packs;
}

export async function loadPublishedCommunityMarketPacks(
  studyTarget?: RuntimeStudyTarget,
  opts?: { forceRemote?: boolean },
): Promise<FlashcardMarketPack[]> {
  const generation = catalogGeneration;
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return [];
  const cacheKey = String(studyTarget ?? 'default');
  if (!opts?.forceRemote) {
    const warm = peekPublishedCommunityMarketPacks(studyTarget);
    if (warm) return warm;
  }
  try {
    // Limit each language independently; a busy EN catalog must not starve FR/DE/ES.
    const languageSnapshots = await Promise.all((['en', 'fr', 'de', 'es'] as const).map(language => firestore()
      .collection(COMMUNITY_PACKS_COLLECTION)
      .where('listingStatus', 'in', ['published', 'update_pending'])
      .where('packLanguage', '==', language)
      .limit(40)
      .get()));
    const snap = await firestore()
      .collection(COMMUNITY_PACKS_COLLECTION)
      .where('listingStatus', 'in', ['published', 'update_pending'])
      .limit(80)
      .get();
    const docs = [...new Map([...languageSnapshots.flatMap(snapshot => snapshot.docs), ...snap.docs].map(doc => [doc.id, doc])).values()];
    const list = docs
      .map((d) => mapCommunityPackDocToMarket(d.id, d.data() as Record<string, unknown>, { studyTarget }))
      .filter(Boolean) as FlashcardMarketPack[];
    list.sort(sortCommunityMarketPacksBySocial);
    const out = (['en', 'fr', 'de', 'es'] as const).flatMap(language => list.filter(pack => normalizePackLanguage(pack.packLanguage) === language).slice(0, 40));
    if (generation !== catalogGeneration) return [];
    _communityCatalogCache = { key: cacheKey, at: Date.now(), packs: out };
    return out;
  } catch (e) {
    // зачем: вкладка «Сообщество» тихо показывала пустой список без единой
    // подсказки в логах — владелец видел 0 наборов при 2 published в базе.
    if (__DEV__) console.warn('[communityFirestore] loadPublishedCommunityMarketPacks failed', e);
    // Отказ сети не должен обнулять уже показанный каталог — отдаём прошлый снимок.
    return _communityCatalogCache?.key === cacheKey ? _communityCatalogCache.packs : [];
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
      if (st !== 'published' && st !== 'update_pending' && st !== 'admin_revision_required') continue;
      const m = mapCommunityPackDocToMarket(doc.id, doc.data() as Record<string, unknown>, { forCatalog: false, studyTarget });
      if (m) out.push(m);
    }
    return out;
  } catch (e) {
    if (__DEV__) console.warn('[communityFirestore] loadAuthorCommunityPacksPendingUpdate failed', e);
    return [];
  }
}

export type CommunityPackEditorSnapshot = {
  studyTarget: StudyTarget;
  packLanguage?: PackLanguage;
  title: string;
  description: string;
  cardThemeKey: string;
  cardBackKey: string;
  cards: {
    id: string;
    en: string;
    ru: string;
    uk: string;
    translationUk?: string;
    origin?: { source?: string; sourceId?: string; sourceTitle?: string };
    es?: string;
    sourceLocales?: {
      'pt-BR'?: string;
      vi?: string;
      id?: string;
      tr?: string;
      pl?: string;
    };
    richSchemaVersion?: 1;
    exampleTarget?: string;
    exampleSource?: string;
    note?: string;
    sourceReferences?: string[];
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
    if (!communityPackDocMatchesStudyTarget(d, studyTarget)) return null;
    if (String(d.authorStableId ?? '').trim() !== authorStableId) return null;
    const st = String(d.listingStatus ?? '');
    if (st !== 'published' && st !== 'update_pending' && st !== 'admin_revision_required') return null;
    const cardsRaw = Array.isArray(d.cards) ? d.cards : [];
    const cards = cardsRaw.map((raw: unknown, i: number) => {
      const c = raw as Record<string, unknown>;
      return {
        id: String(c.id ?? `c${i + 1}`).trim() || `c${i + 1}`,
        en: normalizePackCardTexts(c, normalizePackLanguage(d.packLanguage)).targetText,
        ru: normalizePackCardTexts(c, normalizePackLanguage(d.packLanguage)).translationText,
        uk: String(c.uk ?? '').trim(),
        translationUk: typeof c.translationUk === 'string' ? c.translationUk : undefined,
        origin: c.origin && typeof c.origin === 'object' ? c.origin as { source?: string; sourceId?: string; sourceTitle?: string } : undefined,
        es: String(c.es ?? '').trim() || undefined,
        sourceLocales: {
          'pt-BR': String((c.sourceLocales as Record<string, unknown> | undefined)?.['pt-BR'] ?? '').trim() || undefined,
          vi: String((c.sourceLocales as Record<string, unknown> | undefined)?.vi ?? '').trim() || undefined,
          id: String((c.sourceLocales as Record<string, unknown> | undefined)?.id ?? '').trim() || undefined,
          tr: String((c.sourceLocales as Record<string, unknown> | undefined)?.tr ?? '').trim() || undefined,
          pl: String((c.sourceLocales as Record<string, unknown> | undefined)?.pl ?? '').trim() || undefined,
        },
        richSchemaVersion: Number(c.richSchemaVersion) === 1 ? 1 as const : undefined,
        exampleTarget: String(c.exampleTarget ?? '').trim() || undefined,
        exampleSource: String(c.exampleSource ?? '').trim() || undefined,
        note: String(c.note ?? '').trim() || undefined,
        sourceReferences: Array.isArray(c.sourceReferences) ? c.sourceReferences.map(String).map((value) => value.trim()).filter(Boolean) : undefined,
      };
    });
    return {
      studyTarget: docStudyTarget,
      packLanguage: communityPackDocLanguage(d),
      title: String(d.titleRu ?? d.titleUk ?? d.titleEs ?? d.titlePtBr ?? d.titleVi ?? d.titleId ?? d.titleTr ?? d.titlePl ?? '').trim(),
      description: String(d.descriptionRu ?? d.descriptionUk ?? d.descriptionEs ?? d.descriptionPtBr ?? d.descriptionVi ?? d.descriptionId ?? d.descriptionTr ?? d.descriptionPl ?? '').trim(),
      cardThemeKey: String(d.cardThemeKey ?? UGC_CARD_THEME_DEFAULT_ID).trim() || UGC_CARD_THEME_DEFAULT_ID,
      cardBackKey: normalizeUgcCardBackKey(String(d.cardBackKey ?? '').trim()),
      cards,
    };
  } catch (e) {
    // зачем логируем (правило проекта «сперва логи», аудит 17.09.2026): немой
    // catch здесь означал, что автор открывает редактор СВОЕГО набора и видит
    // пустой экран без единой строки в логах — нельзя отличить отказ сети от
    // permission-denied или битых данных карточки.
    DebugLogger.warn('communityFirestore:authorEdit', `[PACK-EDIT] снимок набора для редактирования не получен packId=${packId}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/** Карточки из поля `cards` документа community_packs (как у CF при модерации). */
export function communityPackCardsToCardItems(packId: string, cards: unknown, packLanguage?: PackLanguage): CardItem[] {
  if (!Array.isArray(cards)) return [];
  const out: CardItem[] = [];
  for (const raw of cards) {
    if (!raw || typeof raw !== 'object') continue;
    const c = raw as Record<string, unknown>;
    const id = String(c.id ?? '').trim();
    const normalizedText = normalizePackCardTexts(c, normalizePackLanguage(packLanguage));
    const en = normalizedText.targetText;
    const ru = normalizedText.translationText;
    const es = String(c.es ?? '').trim();
    /** У `CommunityPackCardPayload` третя колонка — нотатка/опис (редактор), не український переклад фрази. */
    const descriptionNote = String(c.uk ?? '').trim();
    const richSchemaVersion = Number(c.richSchemaVersion) === 1 ? 1 as const : undefined;
    const exampleTarget = String(c.exampleTarget ?? c.exampleEn ?? '').trim();
    const exampleSource = String(c.exampleSource ?? c.exampleRu ?? '').trim();
    const note = String(c.note ?? c.description ?? descriptionNote).trim();
    const sourceReferences = Array.isArray(c.sourceReferences) ? c.sourceReferences.map(String).map((value) => value.trim()).filter(Boolean) : [];
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
      packLanguage: normalizePackLanguage(packLanguage),
      origin: c.origin && typeof c.origin === 'object' ? c.origin : undefined,
      sourceLocales,
      description: note || undefined,
      categoryId: 'custom',
      isSystem: true,
      source: 'lesson',
      sourceId: `DEV:${packId}`,
      richSchemaVersion,
      exampleTarget: exampleTarget || undefined,
      exampleSource: exampleSource || undefined,
      note: note || undefined,
      sourceReferences: sourceReferences.length ? sourceReferences : undefined,
      exampleEn: exampleTarget || undefined,
      exampleRu: exampleSource || undefined,
    } as CardItem;
    item.ru = ru;
    item.uk = String(c.translationUk ?? '').trim() || ru;
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
      return communityPackCardsToCardItems(packId, d.cards, communityPackDocLanguage(d));
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
        if (res?.cards?.length) return communityPackCardsToCardItems(packId, res.cards, communityPackDocLanguage(d));
      } catch (e) {
        // Набор снят админом: доступ к карточкам для уже добавивших даёт только
        // callable. Отказ здесь = пустой набор на экране, причину не глушим.
        DebugLogger.warn('communityFirestore:cards', `[PACK-CARDS] callable для снятого набора отказал packId=${packId}: ${e instanceof Error ? e.message : String(e)}`);
        return [];
      }
    }
    return [];
  } catch (e) {
    // зачем логируем (аудит 17.09.2026): человек открывал добавленный набор и
    // видел НОЛЬ карточек молча — ни строки в логах, хотя соседние функции
    // этого же файла уже пишут причину через DebugLogger.
    DebugLogger.warn('communityFirestore:cards', `[PACK-CARDS] карточки набора не прочитаны packId=${packId}: ${e instanceof Error ? e.message : String(e)}`);
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
  } catch (e) {
    if (__DEV__) console.warn('[communityFirestore] fetchCommunityPackMeta failed', packId, e);
    return null;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
