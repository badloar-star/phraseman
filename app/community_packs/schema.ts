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
import type { Lang } from '../../constants/i18n';
import { flashcardsCommunityPacksAvailableForTarget } from '../flashcards_target_gate';
import { storageStudyTarget, type RuntimeStudyTarget } from '../target_storage_keys';
import type { StudyTarget } from '../study_target';

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

/** Фиксированная цена UGC-набора в жемчуге. Пользователь и сохранённые документы её не задают. */
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
  sourceLocales?: {
    'pt-BR'?: string;
    vi?: string;
    id?: string;
    tr?: string;
    pl?: string;
  };
};

/** Ключ палитры карточек UGC — см. `ugcCardThemePresets.ts` / `getCommunityUgcPackPaywallTheme`. */
export type CommunityPackCardThemeKey = string;
/** Ключ рубашки карточек UGC — см. `flashcards/cardBackCatalog.ts`. */
export type CommunityPackCardBackKey = string;

export type CommunityPackSubmissionPayload = {
  /** Study target being taught. Legacy UGC is English; French is blocked until its source gate is approved. */
  studyTarget?: RuntimeStudyTarget;
  /** Одна мова: заголовок і опис (дублюються в titleRu/titleUk на бекенді). */
  title: string;
  description: string;
  cardThemeKey?: CommunityPackCardThemeKey;
  cardBackKey?: CommunityPackCardBackKey;
  /** Legacy transport field; reads and server writes always replace it with the fixed price. */
  readonly priceShards?: number;
  cards: CommunityPackCardPayload[];
  sourceLang?: Lang;
  /** Legacy — ігнорується, якщо задані title/description. */
  titleRu?: string;
  titleUk?: string;
  titleEs?: string;
  titlePtBr?: string;
  titleVi?: string;
  titleId?: string;
  titleTr?: string;
  titlePl?: string;
  descriptionRu?: string;
  descriptionUk?: string;
  descriptionEs?: string;
  descriptionPtBr?: string;
  descriptionVi?: string;
  descriptionId?: string;
  descriptionTr?: string;
  descriptionPl?: string;
};

export function normalizeCommunityPackStudyTarget(studyTarget?: RuntimeStudyTarget): StudyTarget {
  return storageStudyTarget(studyTarget);
}

export function communityPackStudyTargetSubmissionBlocked(studyTarget?: RuntimeStudyTarget): boolean {
  return !flashcardsCommunityPacksAvailableForTarget(studyTarget);
}

export function validateCommunityPackPayload(p: CommunityPackSubmissionPayload): string | null {
  if (communityPackStudyTargetSubmissionBlocked(p.studyTarget)) return 'study_target_gate';
  const title = String(p.title ?? p.titleRu ?? p.titleUk ?? p.titleEs ?? p.titlePtBr ?? p.titleVi ?? p.titleId ?? p.titleTr ?? p.titlePl ?? '').trim();
  const description = String(p.description ?? p.descriptionRu ?? p.descriptionUk ?? p.descriptionEs ?? p.descriptionPtBr ?? p.descriptionVi ?? p.descriptionId ?? p.descriptionTr ?? p.descriptionPl ?? '').trim();
  if (!title || !description) return 'title_or_desc';
  const n = p.cards?.length ?? 0;
  if (n < COMMUNITY_PACK_CARD_COUNT_MIN || n > COMMUNITY_PACK_CARD_COUNT_MAX) return 'card_count';
  for (const c of p.cards) {
    const hasSource = !!(
      String(c?.ru ?? '').trim() ||
      String(c?.es ?? '').trim() ||
      String(c?.sourceLocales?.['pt-BR'] ?? '').trim() ||
      String(c?.sourceLocales?.vi ?? '').trim() ||
      String(c?.sourceLocales?.id ?? '').trim() ||
      String(c?.sourceLocales?.tr ?? '').trim() ||
      String(c?.sourceLocales?.pl ?? '').trim()
    );
    if (!c?.id || !String(c.en).trim() || !hasSource) return 'card_fields';
  }
  return null;
}

/** Плоский payload для Cloud Function (titleRu = titleUk = title). */
export function buildCommunityPackPayloadForCloud(p: CommunityPackSubmissionPayload): Record<string, unknown> {
  const studyTarget = normalizeCommunityPackStudyTarget(p.studyTarget);
  const title = String(p.title ?? p.titleRu ?? p.titleUk ?? p.titleEs ?? '').trim();
  const description = String(p.description ?? p.descriptionRu ?? p.descriptionUk ?? p.descriptionEs ?? '').trim();
  const sourceLang = p.sourceLang ?? 'ru';
  const titleRu = sourceLang === 'ru' ? title : String(p.titleRu ?? '').trim();
  const titleUk = sourceLang === 'uk' ? title : String(p.titleUk ?? '').trim();
  const titleEs = sourceLang === 'es' ? title : String(p.titleEs ?? '').trim();
  const titlePtBr = sourceLang === 'pt-BR' ? title : String(p.titlePtBr ?? '').trim();
  const titleVi = sourceLang === 'vi' ? title : String(p.titleVi ?? '').trim();
  const titleId = sourceLang === 'id' ? title : String(p.titleId ?? '').trim();
  const titleTr = sourceLang === 'tr' ? title : String(p.titleTr ?? '').trim();
  const titlePl = sourceLang === 'pl' ? title : String(p.titlePl ?? '').trim();
  const descriptionRu = sourceLang === 'ru' ? description : String(p.descriptionRu ?? '').trim();
  const descriptionUk = sourceLang === 'uk' ? description : String(p.descriptionUk ?? '').trim();
  const descriptionEs = sourceLang === 'es' ? description : String(p.descriptionEs ?? '').trim();
  const descriptionPtBr = sourceLang === 'pt-BR' ? description : String(p.descriptionPtBr ?? '').trim();
  const descriptionVi = sourceLang === 'vi' ? description : String(p.descriptionVi ?? '').trim();
  const descriptionId = sourceLang === 'id' ? description : String(p.descriptionId ?? '').trim();
  const descriptionTr = sourceLang === 'tr' ? description : String(p.descriptionTr ?? '').trim();
  const descriptionPl = sourceLang === 'pl' ? description : String(p.descriptionPl ?? '').trim();
  return {
    studyTarget,
    title,
    description,
    sourceLang,
    titleRu,
    titleUk,
    titleEs,
    titlePtBr,
    titleVi,
    titleId,
    titleTr,
    titlePl,
    descriptionRu,
    descriptionUk,
    descriptionEs,
    descriptionPtBr,
    descriptionVi,
    descriptionId,
    descriptionTr,
    descriptionPl,
    priceShards: COMMUNITY_PACK_PRICE_SHARDS,
    cards: p.cards,
    cardThemeKey: String(p.cardThemeKey ?? '').trim() || undefined,
    cardBackKey: String(p.cardBackKey ?? '').trim() || undefined,
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
