/**
 * Community (UGC) flashcard packs — схема коллекций и лимиты.
 * Запись в Firestore для черновиков/модерации/покупок — через Cloud Functions (см. functions/src/community_packs.ts).
 *
 * Callable (v2 HTTPS, регион по умолчанию проекта):
 * - communitySubmitPackForReview
 * - communityModerateSubmission (admin claim)
 * - communityPurchasePack
 * - communityListSellerInbox
 * - communityMarkSellerInboxSeen
 * - communityFetchPackCardsIfAccessible (карты при снятии с витрины / для покупателя)
 * - communityAdminModeratePack (admin claim; только админка)
 */

/** Опубликованные наборы (каталог «Сообщество»). */
export const COMMUNITY_PACKS_COLLECTION = 'community_packs';

/** Очередь на модерацию (полный дамп набора). */
export const COMMUNITY_PACK_SUBMISSIONS_COLLECTION = 'community_pack_submissions';

/** Черновики (резерв; клиент пока без прямой записи в rules). */
export const COMMUNITY_PACK_DRAFTS_COLLECTION = 'community_pack_drafts';

/** Покупки: идемпотентный ключ `${buyerStableId}__${packId}`. */
export const COMMUNITY_PACK_PURCHASES_COLLECTION = 'community_pack_purchases';

/** Оценки после покупки. */
export const COMMUNITY_PACK_RATINGS_COLLECTION = 'community_pack_ratings';

/** События для продавца (тост / модалка при следующем входе). Пишет только CF. */
export const COMMUNITY_SELLER_INBOX_SUBCOLLECTION = 'community_seller_inbox';

export const COMMUNITY_PACK_CARD_COUNT_MIN = 10;
export const COMMUNITY_PACK_CARD_COUNT_MAX = 50;

/** Фиксированная цена UGC-набора в осколках (единая для всех наборов от людей). */
export const COMMUNITY_PACK_PRICE_SHARDS = 10;

/** Доля «платформы» в осколках: базисные пункты (10000 = 100%). Например 1500 = 15% остаётся в экономике приложения (сжигание). */
export const COMMUNITY_PACK_PLATFORM_FEE_BPS = 1500;

export type CommunityPackListingStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'unlisted'
  /** Снято модератором до доработки; не в витрине, автор шлёт правку через CF. */
  | 'admin_revision_required'
  /** Мягкое удаление модератором; витрина скрыта, покупатели грузят карты через CF. */
  | 'admin_removed'
  /** Редактирование на проверке (как в бекенде). */
  | 'update_pending';

export type CommunityPackCardPayload = {
  id: string;
  en: string;
  ru?: string;
  uk?: string;
  es?: string;
};

/** Ключ палитры карточек UGC — см. `ugcCardThemePresets.ts` / `getCommunityUgcPackPaywallTheme`. */
export type CommunityPackCardThemeKey = string;

export type CommunityPackSubmissionPayload = {
  /** Одна мова: заголовок і опис (дублюються в titleRu/titleUk на бекенді). */
  title: string;
  description: string;
  cardThemeKey?: CommunityPackCardThemeKey;
  priceShards: number;
  cards: CommunityPackCardPayload[];
  sourceLang?: 'ru' | 'uk' | 'es';
  /** Legacy — ігнорується, якщо задані title/description. */
  titleRu?: string;
  titleUk?: string;
  titleEs?: string;
  descriptionRu?: string;
  descriptionUk?: string;
  descriptionEs?: string;
};

export function validateCommunityPackPayload(p: CommunityPackSubmissionPayload): string | null {
  const title = String(p.title ?? p.titleRu ?? p.titleUk ?? p.titleEs ?? '').trim();
  const description = String(p.description ?? p.descriptionRu ?? p.descriptionUk ?? p.descriptionEs ?? '').trim();
  if (!title || !description) return 'title_or_desc';
  const n = p.cards?.length ?? 0;
  if (n < COMMUNITY_PACK_CARD_COUNT_MIN || n > COMMUNITY_PACK_CARD_COUNT_MAX) return 'card_count';
  const price = Math.floor(Number(p.priceShards));
  if (!Number.isFinite(price) || price !== COMMUNITY_PACK_PRICE_SHARDS) {
    return 'price';
  }
  for (const c of p.cards) {
    const hasSource = !!(String(c?.ru ?? '').trim() || String(c?.es ?? '').trim());
    if (!c?.id || !String(c.en).trim() || !hasSource) return 'card_fields';
  }
  return null;
}

/** Плоский payload для Cloud Function (titleRu = titleUk = title). */
export function buildCommunityPackPayloadForCloud(p: CommunityPackSubmissionPayload): Record<string, unknown> {
  const title = String(p.title ?? p.titleRu ?? p.titleUk ?? p.titleEs ?? '').trim();
  const description = String(p.description ?? p.descriptionRu ?? p.descriptionUk ?? p.descriptionEs ?? '').trim();
  const sourceLang = p.sourceLang === 'es' || p.sourceLang === 'uk' ? p.sourceLang : 'ru';
  const titleRu = sourceLang === 'ru' ? title : String(p.titleRu ?? '').trim();
  const titleUk = sourceLang === 'uk' ? title : String(p.titleUk ?? '').trim();
  const titleEs = sourceLang === 'es' ? title : String(p.titleEs ?? '').trim();
  const descriptionRu = sourceLang === 'ru' ? description : String(p.descriptionRu ?? '').trim();
  const descriptionUk = sourceLang === 'uk' ? description : String(p.descriptionUk ?? '').trim();
  const descriptionEs = sourceLang === 'es' ? description : String(p.descriptionEs ?? '').trim();
  return {
    title,
    description,
    sourceLang,
    titleRu,
    titleUk,
    titleEs,
    descriptionRu,
    descriptionUk,
    descriptionEs,
    priceShards: COMMUNITY_PACK_PRICE_SHARDS,
    cards: p.cards,
    cardThemeKey: String(p.cardThemeKey ?? '').trim() || undefined,
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
