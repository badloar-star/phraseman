/**
 * Community (UGC) packs — Cloud Functions (источник правды для покупок и модерации).
 * Осколки только внутри приложения; вывода в фиат нет.
 */
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { ACCOUNT_DELETE_AUTH_MARKERS, ACCOUNT_DELETE_TOMBSTONES } from './account_delete_job';
import { applyFlashcardRegistryDocumentMutation, planFlashcardRegistryPackMutation } from './content_factory/flashcard_registry_mutations';
import { isCommunityPackLanguage, normalizeCommunityPackLanguage, type CommunityPackLanguage } from './community_pack_language';
import { enqueueCardTtsJob } from './card_tts_jobs';
import { readPackPublishSlot, writePackPublishSlot } from './pack_publish_limit';

const COMMUNITY_PACKS = 'community_packs';
const COMMUNITY_SUBMISSIONS = 'community_pack_submissions';
const COMMUNITY_PURCHASES = 'community_pack_purchases';
const COMMUNITY_RATINGS = 'community_pack_ratings';
const SELLER_INBOX = 'community_seller_inbox';
const FLASHCARD_SEMANTIC_KEYS = 'content_factory_flashcard_semantic_keys';
const FLASHCARD_REGISTRY_CONFIG = 'flashcard_semantic_registry';

// зачем (владелец 2026-09-21): AI-правка ОПУБЛИКОВАННЫХ наборов обязана двигать
// реестр дублей той же транзакцией — иначе карточки старой версии останутся в
// индексе навсегда (этот класс бага в проекте уже был). Экспорт, чтобы
// admin_community_pack_qa.ts не заводил вторую копию той же логики.
export async function syncFlashcardRegistryPackMutation(tx: FirebaseFirestore.Transaction, db: FirebaseFirestore.Firestore, previous: { id: string; studyTarget?: string; cards?: readonly unknown[] } | null, next: { id: string; studyTarget?: string; cards?: readonly unknown[] } | null) {
  const plan = planFlashcardRegistryPackMutation(previous, next).filter((item) => item.addSources.length || item.removeSources.length);
  if (!plan.length) return;
  const configRef = db.collection('content_factory_config').doc(FLASHCARD_REGISTRY_CONFIG);
  const [configSnapshot, ...snapshots] = await Promise.all([
    tx.get(configRef),
    ...plan.map((item) => tx.get(db.collection(FLASHCARD_SEMANTIC_KEYS).doc(item.docId))),
  ]);
  const config = configSnapshot.data() ?? {};
  const currentGeneration = Number.isSafeInteger(Number(config.catalogGeneration)) ? Number(config.catalogGeneration) : 0;
  const registryIsVerified = config.mode === 'registry'
    && config.manifestComplete === true
    && Number(config.verifiedGeneration) === currentGeneration;
  for (let index = 0; index < plan.length; index += 1) {
    const mutation = plan[index]; const ref = snapshots[index].ref; const current = snapshots[index].data() ?? {};
    if (snapshots[index].exists && (current.partitionKey !== mutation.partitionKey || current.canonicalKey !== mutation.canonicalKey)) throw new HttpsError('aborted', 'flashcard_registry_hash_collision');
    const next = applyFlashcardRegistryDocumentMutation(snapshots[index].exists ? { docId: mutation.docId, partitionKey: String(current.partitionKey), canonicalKey: String(current.canonicalKey), sources: Array.isArray(current.sources) ? current.sources as { packId: string; cardId: string }[] : [] } : null, mutation);
    if (next) tx.set(ref, { ...next, updatedAt: Date.now() }, { merge: true });
    else if (snapshots[index].exists) tx.delete(ref);
  }
  tx.set(configRef, registryIsVerified
    ? { catalogGeneration: currentGeneration + 1, verifiedGeneration: currentGeneration + 1, manifestComplete: true, updatedAt: Date.now() }
    : { catalogGeneration: currentGeneration + 1, manifestComplete: false, updatedAt: Date.now() }, { merge: true });
}

/** Снят с витрины по требованию модерации; автор может доработать и снова отправить на ревью. */
const LISTING_ADMIN_REVISION = 'admin_revision_required';
/** Мягкое удаление: не в маркете; покупатели сохраняют доступ к карточкам через CF. */
const LISTING_ADMIN_REMOVED = 'admin_removed';

const CARD_MIN = 10;
const CARD_MAX = 50;
/** Фиксированная цена UGC-набора (осколки). Клиент не может задать другую — подменяем здесь. */
/** Границы цены в рунах — зеркало клиента (app/flashcards/marketplace.ts). */
const UGC_PACK_PRICE_MAX_RUNES = 5000;
const UGC_PACK_PRICE_STEP_RUNES = 100;
/** Базис 10_000 = 100 %. Часть цены не передаётся автору (остаётся в экономике приложения). */
type CommunityStudyTarget = 'en' | 'fr';

const UGC_CARD_THEME_KEYS = new Set([
  'neon_lime',
  'aqua_pulse',
  'magenta_pop',
  'solar_gold',
  'violet_nebula',
  'ember_coal',
]);

type SubmissionPayload = {
  studyTarget?: 'en' | 'fr';
  packLanguage?: CommunityPackLanguage;
  title?: string;
  description?: string;
  sourceLang?: 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
  titleRu: string;
  titleUk: string;
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
  cardThemeKey?: string;
  readonly priceRunes?: unknown;
  cards: Array<{
    id: string;
    en: string;
    targetText?: string;
    translationText?: string;
    translationUk?: string;
    origin?: { source?: string; sourceId?: string; sourceTitle?: string };
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
    richSchemaVersion?: 1;
    exampleTarget?: string;
    exampleSource?: string;
    note?: string;
    sourceReferences?: string[];
  }>;
};

function preserveExistingRichCardFields(existing: unknown, incoming: SubmissionPayload['cards']): SubmissionPayload['cards'] {
  const byId = new Map((Array.isArray(existing) ? existing : []).filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item)).map((item) => [String(item.id ?? ''), item]));
  return incoming.map((card) => {
    const prior = byId.get(card.id); if (!prior) return card;
    const sourceReferences = card.sourceReferences?.length ? card.sourceReferences : Array.isArray(prior.sourceReferences) ? prior.sourceReferences.map(String).filter(Boolean) : undefined;
    return { ...card, richSchemaVersion: card.richSchemaVersion ?? (Number(prior.richSchemaVersion) === 1 ? 1 : undefined), exampleTarget: card.exampleTarget || String(prior.exampleTarget ?? '').trim() || undefined, exampleSource: card.exampleSource || String(prior.exampleSource ?? '').trim() || undefined, note: card.note || String(prior.note ?? '').trim() || undefined, sourceReferences };
  });
}

function normalizeCommunityPackStudyTarget(raw: unknown): CommunityStudyTarget {
  return raw === 'fr' ? 'fr' : 'en';
}

function requireMatchingPackStudyTarget(requested: unknown, pack: Record<string, unknown>): CommunityStudyTarget {
  const requestStudyTarget = normalizeCommunityPackStudyTarget(requested);
  const packStudyTarget = normalizeCommunityPackStudyTarget(pack.studyTarget);
  // зачем (D127): 'none' тоже независим от цели изучения — набор без языка виден всем.
  const independentPackLanguage = isCommunityPackLanguage(pack.packLanguage);
  if (requestStudyTarget !== packStudyTarget && !independentPackLanguage) {
    throw new HttpsError('failed-precondition', 'Pack study target mismatch');
  }
  return packStudyTarget;
}

function trimModeratorMessage(raw: unknown): string {
  const s = raw != null ? String(raw) : '';
  return s.trim().slice(0, 3500);
}

function moderatorMessageOrNull(s: string): string | null {
  const t = s.trim();
  return t ? t.slice(0, 3500) : null;
}

/**
 * Первое непустое значение из списка.
 *
 * зачем: заменяет цепочки `a ?? b ?? c` для локализованных полей. `??`
 * останавливается на пустой строке (она не null/undefined), из-за чего
 * заявка с заполненной не-русской локалью выглядела как «без названия».
 */
function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function normalizeSubmissionPayload(raw: SubmissionPayload): SubmissionPayload {
  const studyTarget = normalizeCommunityPackStudyTarget(raw.studyTarget);
  const packLanguage = normalizeCommunityPackLanguage(raw.packLanguage);
  if (studyTarget !== 'en' && !raw.packLanguage) {
    throw new HttpsError('failed-precondition', 'French community packs are source-gated');
  }
  const sourceLang = raw.sourceLang === 'uk' ||
    raw.sourceLang === 'es' ||
    raw.sourceLang === 'pt-BR' ||
    raw.sourceLang === 'vi' ||
    raw.sourceLang === 'id' ||
    raw.sourceLang === 'tr' ||
    raw.sourceLang === 'pl'
    ? raw.sourceLang
    : 'ru';
  // зачем: одобрение заявки падало с «title required», когда автор писал
  // не по-русски. `??` пропускает только null/undefined, а клиент кладёт в
  // пустые локали ИМЕННО пустую строку — цепочка обрывалась на titleRu === ''
  // и затирала настоящее название (titleUk) пустым значением.
  // Берём первое НЕпустое: заявка «Антоніми дієслів» (uk) висела с 18.08.2026.
  const titleSingle = firstNonEmpty(
    raw.title, raw.titleRu, raw.titleUk, raw.titleEs,
    raw.titlePtBr, raw.titleVi, raw.titleId, raw.titleTr, raw.titlePl,
  );
  let descSingle = firstNonEmpty(
    raw.description, raw.descriptionRu, raw.descriptionUk, raw.descriptionEs,
    raw.descriptionPtBr, raw.descriptionVi, raw.descriptionId, raw.descriptionTr, raw.descriptionPl,
  );
  if (!descSingle) {
    descSingle = titleSingle;
  }
  const titleRu = (sourceLang === 'ru' ? titleSingle : String(raw.titleRu ?? '').trim()).slice(0, 200);
  const titleUk = (sourceLang === 'uk' ? titleSingle : String(raw.titleUk ?? '').trim()).slice(0, 200);
  const titleEs = (sourceLang === 'es' ? titleSingle : String(raw.titleEs ?? '').trim()).slice(0, 200);
  const titlePtBr = (sourceLang === 'pt-BR' ? titleSingle : String(raw.titlePtBr ?? '').trim()).slice(0, 200);
  const titleVi = (sourceLang === 'vi' ? titleSingle : String(raw.titleVi ?? '').trim()).slice(0, 200);
  const titleId = (sourceLang === 'id' ? titleSingle : String(raw.titleId ?? '').trim()).slice(0, 200);
  const titleTr = (sourceLang === 'tr' ? titleSingle : String(raw.titleTr ?? '').trim()).slice(0, 200);
  const titlePl = (sourceLang === 'pl' ? titleSingle : String(raw.titlePl ?? '').trim()).slice(0, 200);
  // Per-field length caps: only card COUNT (10–50) and titles (200) were bounded,
  // so an authenticated user could inflate a submission doc toward Firestore's 1MB
  // limit with huge card/description strings. Cap generously — far above any real
  // card/description — so legitimate content is never clipped (DoS / storage abuse).
  const DESC_MAX = 3500;
  const descriptionRu = (sourceLang === 'ru' ? descSingle : String(raw.descriptionRu ?? '').trim()).slice(0, DESC_MAX);
  const descriptionUk = (sourceLang === 'uk' ? descSingle : String(raw.descriptionUk ?? '').trim()).slice(0, DESC_MAX);
  const descriptionEs = (sourceLang === 'es' ? descSingle : String(raw.descriptionEs ?? '').trim()).slice(0, DESC_MAX);
  const descriptionPtBr = (sourceLang === 'pt-BR' ? descSingle : String(raw.descriptionPtBr ?? '').trim()).slice(0, DESC_MAX);
  const descriptionVi = (sourceLang === 'vi' ? descSingle : String(raw.descriptionVi ?? '').trim()).slice(0, DESC_MAX);
  const descriptionId = (sourceLang === 'id' ? descSingle : String(raw.descriptionId ?? '').trim()).slice(0, DESC_MAX);
  const descriptionTr = (sourceLang === 'tr' ? descSingle : String(raw.descriptionTr ?? '').trim()).slice(0, DESC_MAX);
  const descriptionPl = (sourceLang === 'pl' ? descSingle : String(raw.descriptionPl ?? '').trim()).slice(0, DESC_MAX);
  if (!titleRu && !titleUk && !titleEs && !titlePtBr && !titleVi && !titleId && !titleTr && !titlePl) {
    throw new HttpsError('invalid-argument', 'title required');
  }
  if (!Array.isArray(raw.cards)) {
    throw new HttpsError('invalid-argument', 'cards must be an array');
  }
  const n = raw.cards.length;
  if (n < CARD_MIN || n > CARD_MAX) {
    throw new HttpsError('invalid-argument', `Cards must be ${CARD_MIN}–${CARD_MAX}`);
  }
  const CARD_FIELD_MAX = 1000; // generous per-card string cap (see DESC_MAX note above)
  const cards = raw.cards.map((c, i) => {
    const id = (String(c?.id ?? `c${i + 1}`).trim() || `c${i + 1}`).slice(0, 200);
    const targetText = firstNonEmpty(c?.targetText, c?.en).slice(0, CARD_FIELD_MAX);
    const translationText = firstNonEmpty(
      c?.translationText,
      c?.ru,
      c?.uk,
      c?.es,
      c?.sourceLocales?.['pt-BR'],
      c?.sourceLocales?.vi,
      c?.sourceLocales?.id,
      c?.sourceLocales?.tr,
      c?.sourceLocales?.pl,
    ).slice(0, CARD_FIELD_MAX);
    const en = targetText;
    const ru = String(c?.ru ?? '').trim().slice(0, CARD_FIELD_MAX) || translationText;
    const uk = String(c?.uk ?? '').trim().slice(0, CARD_FIELD_MAX);
    const es = String(c?.es ?? '').trim().slice(0, CARD_FIELD_MAX);
    const sourceLocales = {
      'pt-BR': String(c?.sourceLocales?.['pt-BR'] ?? '').trim().slice(0, CARD_FIELD_MAX),
      vi: String(c?.sourceLocales?.vi ?? '').trim().slice(0, CARD_FIELD_MAX),
      id: String(c?.sourceLocales?.id ?? '').trim().slice(0, CARD_FIELD_MAX),
      tr: String(c?.sourceLocales?.tr ?? '').trim().slice(0, CARD_FIELD_MAX),
      pl: String(c?.sourceLocales?.pl ?? '').trim().slice(0, CARD_FIELD_MAX),
    };
    const hasSource = !!translationText;
    if (!c?.id || !targetText || !hasSource) {
      throw new HttpsError('invalid-argument', 'Each card needs id, target text, and a source-language translation');
    }
    return {
      id,
      en,
      targetText,
      translationText,
      ...(String(c.translationUk ?? '').trim() ? { translationUk: String(c.translationUk).trim().slice(0, CARD_FIELD_MAX) } : {}),
      ...(c.origin && typeof c.origin === 'object' ? { origin: {
        source: String(c.origin.source ?? '').trim().slice(0, 50),
        sourceId: String(c.origin.sourceId ?? '').trim().slice(0, 200),
        sourceTitle: String(c.origin.sourceTitle ?? '').trim().slice(0, 200),
      } } : {}),
      ...(ru ? { ru } : {}),
      ...(uk ? { uk } : {}),
      ...(es ? { es } : {}),
      sourceLocales: {
        ...(sourceLocales['pt-BR'] ? { 'pt-BR': sourceLocales['pt-BR'] } : {}),
        ...(sourceLocales.vi ? { vi: sourceLocales.vi } : {}),
        ...(sourceLocales.id ? { id: sourceLocales.id } : {}),
        ...(sourceLocales.tr ? { tr: sourceLocales.tr } : {}),
        ...(sourceLocales.pl ? { pl: sourceLocales.pl } : {}),
      },
      ...(Number(c.richSchemaVersion) === 1 ? { richSchemaVersion: 1 as const } : {}),
      ...(String(c.exampleTarget ?? '').trim() ? { exampleTarget: String(c.exampleTarget).trim().slice(0, CARD_FIELD_MAX) } : {}),
      ...(String(c.exampleSource ?? '').trim() ? { exampleSource: String(c.exampleSource).trim().slice(0, CARD_FIELD_MAX) } : {}),
      ...(String(c.note ?? '').trim() ? { note: String(c.note).trim().slice(0, CARD_FIELD_MAX) } : {}),
      ...(Array.isArray(c.sourceReferences) ? { sourceReferences: [...new Set(c.sourceReferences.map(String).map((value) => value.trim().slice(0, 500)).filter(Boolean))].slice(0, 50) } : {}),
    };
  });
  let cardThemeKey = String(raw.cardThemeKey ?? 'neon_lime').trim();
  if (!UGC_CARD_THEME_KEYS.has(cardThemeKey)) {
    cardThemeKey = 'neon_lime';
  }
  return {
    studyTarget,
    packLanguage,
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
    // зачем (владелец 2026-09-21): цена в рунах, которую автор поставил
    // ползунком. Без неё документ набора всегда имел priceRunes=0, и
    // начисление автору (communitySyncPackRuneSale) отвергало КАЖДУЮ продажу
    // как pack_is_not_paid — механизм был бы мёртв целиком.
    priceRunes: normalizePackPriceRunes(raw.priceRunes),
    cards,
    cardThemeKey,
  };
}

/**
 * Цена набора в рунах: 0…5 000 с шагом 100 — зеркало клиентских границ
 * (COMMUNITY_PACK_PRICE_MIN/MAX/STEP_RUNES в app/flashcards/marketplace.ts).
 *
 * Мусор и выход за границы превращаются в 0 (бесплатный набор), а НЕ в отказ
 * публикации: автор не должен терять готовую заявку из-за битого поля.
 */
export function normalizePackPriceRunes(raw: unknown): number {
  const value = Math.floor(Number(raw ?? 0));
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value > UGC_PACK_PRICE_MAX_RUNES) return 0;
  return Math.round(value / UGC_PACK_PRICE_STEP_RUNES) * UGC_PACK_PRICE_STEP_RUNES;
}

function safeCardThemeKey(p: SubmissionPayload): string {
  const k = String(p.cardThemeKey ?? 'neon_lime').trim();
  return UGC_CARD_THEME_KEYS.has(k) ? k : 'neon_lime';
}

function submissionPayloadHash(payload: SubmissionPayload): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

/**
 * Отправка набора на модерацию (создаёт документ в community_pack_submissions).
 * Доверие к authorStableId — как к клиентским путям users/{stableId} в текущей архитектуре; усиление через auth-мост — отдельная задача.
 */
export const communitySubmitPackForReview = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const callerAuthUid = request.auth.uid;
  // зачем: Q55 — админские публикации суточный лимит наборов не трогает.
  const isAdminCaller = request.auth.token?.admin === true;
  const requestedAuthorStableId = String(request.data?.authorStableId ?? '').trim();
  const rawPayload = request.data?.payload as SubmissionPayload | undefined;
  let updatePackId = String(request.data?.updatePackId ?? '').trim();
  const submissionKey = String(request.data?.submissionKey ?? '').trim();
  const replacePending = request.data?.replacePending === true;
  if (!requestedAuthorStableId) {
    throw new HttpsError('invalid-argument', 'authorStableId required');
  }
  if (!rawPayload) {
    throw new HttpsError('invalid-argument', 'payload required');
  }
  if (submissionKey && !/^[A-Za-z0-9_-]{8,128}$/.test(submissionKey)) {
    throw new HttpsError('invalid-argument', 'submissionKey invalid');
  }
  const payload = normalizeSubmissionPayload(rawPayload);
  const payloadHash = submissionPayloadHash(payload);

  const db = admin.firestore();
  const authorStableId = await resolveStableUidForAuth(db, callerAuthUid, requestedAuthorStableId, {
    requireKnownIdentity: true,
  });
  const now = Date.now();

  // A lost response must not make the author's next save create another pack.
  if (updatePackId && submissionKey && replacePending) {
    const published = await db.collection(COMMUNITY_PACKS).doc(updatePackId).get();
    if (!published.exists) {
      const pendingCreate = await db.collection(COMMUNITY_SUBMISSIONS).doc(updatePackId).get();
      if (pendingCreate.exists && pendingCreate.data()?.authorStableId === authorStableId && pendingCreate.data()?.submissionKind === 'create') updatePackId = '';
    }
  }
  if (!updatePackId && submissionKey && replacePending) {
    const id = `create_${createHash('sha256').update(`${authorStableId}\0${submissionKey}`).digest('hex')}`;
    const prior = await db.collection(COMMUNITY_SUBMISSIONS).doc(id).get();
    if (prior.exists && prior.data()?.authorStableId === authorStableId && prior.data()?.publishedPackId) {
      updatePackId = String(prior.data()?.publishedPackId);
    }
  }

  if (updatePackId) {
    // зачем (владелец 17.09.2026: «правки публикуются сразу, без очереди на
    // модерацию — название, описание и все карточки»): раньше правка СВОЕГО
    // опубликованного набора уходила в community_pack_submissions со статусом
    // 'update_pending' и ждала admin-approve (communityModerateSubmission).
    // Теперь тот же перенос payload → community_packs, который раньше жил
    // только в approve-ветке ниже, выполняется здесь, сразу в этой транзакции.
    // Submission-запись сохраняется НИЖЕ со статусом 'approved' — не как очередь
    // на проверку, а как аудиторский след (previousPayloadSnapshot), которым
    // сверяют жалобу с историей правок.
    const subRef = db.collection(COMMUNITY_SUBMISSIONS).doc();
    const packRef = db.collection(COMMUNITY_PACKS).doc(updatePackId);
    const themeKey = safeCardThemeKey(payload);
    await db.runTransaction(async (tx) => {
      const pSnap = await tx.get(packRef);
      if (!pSnap.exists) {
        throw new HttpsError('not-found', 'Pack not found');
      }
      const pd = pSnap.data() as Record<string, unknown>;
      if (String(pd.authorStableId ?? '') !== authorStableId) {
        throw new HttpsError('permission-denied', 'Not your pack');
      }
      const st = String(pd.listingStatus ?? '');
      if (st !== 'published' && st !== 'update_pending' && st !== LISTING_ADMIN_REVISION) {
        throw new HttpsError('failed-precondition', 'Pack not editable');
      }
      const existingStudyTarget = normalizeCommunityPackStudyTarget(pd.studyTarget);
      if (existingStudyTarget !== normalizeCommunityPackStudyTarget(payload.studyTarget)) {
        throw new HttpsError('failed-precondition', 'Cannot change pack study target');
      }
      const previousPayloadSnapshot = {
        titleRu: pd.titleRu ?? '',
        titleUk: pd.titleUk ?? '',
        titleEs: pd.titleEs ?? '',
        titlePtBr: pd.titlePtBr ?? '',
        titleVi: pd.titleVi ?? '',
        titleId: pd.titleId ?? '',
        titleTr: pd.titleTr ?? '',
        titlePl: pd.titlePl ?? '',
        descriptionRu: pd.descriptionRu ?? '',
        descriptionUk: pd.descriptionUk ?? '',
        descriptionEs: pd.descriptionEs ?? '',
        descriptionPtBr: pd.descriptionPtBr ?? '',
        descriptionVi: pd.descriptionVi ?? '',
        descriptionId: pd.descriptionId ?? '',
        descriptionTr: pd.descriptionTr ?? '',
        descriptionPl: pd.descriptionPl ?? '',
        cards: pd.cards ?? [],
        cardThemeKey: pd.cardThemeKey ?? null,
        studyTarget: existingStudyTarget,
      };
      const cardsWithRichFallback = preserveExistingRichCardFields(pd.cards, payload.cards);
      await syncFlashcardRegistryPackMutation(
        tx,
        db,
        { id: updatePackId, studyTarget: existingStudyTarget, cards: Array.isArray(pd.cards) ? pd.cards : [] },
        { id: updatePackId, studyTarget: existingStudyTarget, cards: cardsWithRichFallback },
      );
      tx.set(subRef, {
        status: 'approved',
        authorStableId,
        submittedAt: now,
        reviewedAt: now,
        payload,
        submissionKind: 'edit',
        editTargetPackId: updatePackId,
        previousPayloadSnapshot,
        callerAuthUid,
        payloadHash,
        submissionKey: submissionKey || null,
        publishedPackId: updatePackId,
        // зачем поле: отличает автосогласованные правки от заявок, которые
        // реально прошли через communityModerateSubmission — жалобе и разбору
        // нужно видеть, что здесь никто не смотрел контент до публикации.
        autoApproved: true,
      });
      // guard-ok: tx.set БЕЗ merge — намеренно. `{ ...pd, ... }` разворачивает
      // ВСЕ существующие поля документа явно (тот же приём, что в approve-ветке
      // ниже), поэтому это полная, а не частичная перезапись. pendingSubmissionId
      // из pd НЕ копируется отдельно — простое отсутствие ключа в plain set()
      // убирает поле; FieldValue.delete() тут было бы ошибкой (он валиден только
      // для update()/set(merge:true)).
      const { pendingSubmissionId: _droppedPendingSubmissionId, ...packWithoutPendingSubmission } = pd;
      tx.set(packRef, {
        ...packWithoutPendingSubmission,
        listingStatus: 'published',
        authorStableId,
        submissionId: updatePackId,
        studyTarget: existingStudyTarget,
        packLanguage: payload.packLanguage,
        titleRu: payload.titleRu.trim(),
        titleUk: payload.titleUk.trim(),
        titleEs: (payload.titleEs ?? '').trim() || null,
        titlePtBr: (payload.titlePtBr ?? '').trim() || null,
        titleVi: (payload.titleVi ?? '').trim() || null,
        titleId: (payload.titleId ?? '').trim() || null,
        titleTr: (payload.titleTr ?? '').trim() || null,
        titlePl: (payload.titlePl ?? '').trim() || null,
        descriptionRu: (payload.descriptionRu ?? '').trim() || null,
        descriptionUk: (payload.descriptionUk ?? '').trim() || null,
        descriptionEs: (payload.descriptionEs ?? '').trim() || null,
        descriptionPtBr: (payload.descriptionPtBr ?? '').trim() || null,
        descriptionVi: (payload.descriptionVi ?? '').trim() || null,
        descriptionId: (payload.descriptionId ?? '').trim() || null,
        descriptionTr: (payload.descriptionTr ?? '').trim() || null,
        descriptionPl: (payload.descriptionPl ?? '').trim() || null,
        // зачем (владелец 2026-09-21): без этого поля начисление автору
        // отвергало бы КАЖДУЮ продажу как pack_is_not_paid.
        priceRunes: normalizePackPriceRunes(payload.priceRunes),
        cards: cardsWithRichFallback,
        cardCount: cardsWithRichFallback.length,
        cardThemeKey: themeKey,
        updatedAt: now,
      });
    });
    // зачем: D128 — новые карточки опубликованного набора озвучиваются в фоне.
    // Постановка не бросает и не задерживает ответ автору дольше одной записи;
    // воркер сам пропустит набор, если он не 'published' или без языка.
    await enqueueCardTtsJob(db, updatePackId, 'author_edit_published');
    return { submissionId: subRef.id };
  }

  const deterministicId = submissionKey
    ? `create_${createHash('sha256').update(`${authorStableId}\0${submissionKey}`).digest('hex')}`
    : '';
  const submissions = db.collection(COMMUNITY_SUBMISSIONS);
  const subRef = deterministicId ? submissions.doc(deterministicId) : submissions.doc();
  if (submissionKey) {
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(subRef);
      if (existing.exists) {
        const data = existing.data() as Record<string, unknown>;
        if (
          String(data.authorStableId ?? '') !== authorStableId
          || String(data.submissionKey ?? '') !== submissionKey
          || String(data.submissionKind ?? '') !== 'create'
        ) {
          throw new HttpsError('aborted', 'submission idempotency collision');
        }
        const storedPayload = data.payload as SubmissionPayload | undefined;
        if (data.status === 'cancelled') throw new HttpsError('failed-precondition', 'Publication withdrawn; start a new publication');
        const storedPayloadHash = String(data.payloadHash ?? '').trim()
          || (storedPayload ? submissionPayloadHash(normalizeSubmissionPayload(storedPayload)) : '');
        if (!storedPayloadHash || storedPayloadHash !== payloadHash) {
          if (replacePending && ['pending', 'needs_revision', 'rejected'].includes(String(data.status))) {
            tx.update(subRef, { status: 'pending', payload, payloadHash, submittedAt: now });
            return;
          }
          throw new HttpsError('failed-precondition', 'submission payload changed for this attempt');
        }
        if (replacePending && ['needs_revision', 'rejected'].includes(String(data.status))) {
          tx.update(subRef, { status: 'pending', submittedAt: now });
        }
        return;
      }
      // зачем: Q55 / PM-018-A2 — не более 3 НОВЫХ публикаций в сутки на человека.
      // Слот читается и тратится в этой же транзакции, что и создание заявки;
      // повтор той же заявки (existing.exists выше) сюда не доходит и слот не тратит.
      const slot = isAdminCaller ? null : await readPackPublishSlot(tx, db, authorStableId, now);
      tx.create(subRef, {
        status: 'pending',
        authorStableId,
        submittedAt: now,
        payload,
        submissionKind: 'create',
        submissionKey,
        payloadHash,
        callerAuthUid,
      });
      if (slot) writePackPublishSlot(tx, slot, now);
    });
  } else {
    // зачем: Q55 — без ключа идемпотентности каждая отправка = новая заявка,
    // поэтому слот лимита и заявка пишутся одной транзакцией.
    await db.runTransaction(async (tx) => {
      const slot = isAdminCaller ? null : await readPackPublishSlot(tx, db, authorStableId, now);
      tx.set(subRef, {
        status: 'pending',
        authorStableId,
        submittedAt: now,
        payload,
        submissionKind: 'create',
        callerAuthUid,
      });
      if (slot) writePackPublishSlot(tx, slot, now);
    });
  }
  return { submissionId: subRef.id };
});

/**
 * Модерация: approve | reject | request_changes. Только custom claim admin.
 * Опциональный moderatorMessage (и legacy rejectReason) — в заявке и в inbox автора.
 */
export const communityModerateSubmission = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const submissionId = String(request.data?.submissionId ?? '').trim();
  const action = String(request.data?.action ?? '').trim() as 'approve' | 'reject' | 'request_changes';
  const moderatorMessage = trimModeratorMessage(request.data?.moderatorMessage);
  const legacyReject = trimModeratorMessage(request.data?.rejectReason);
  const effectiveMessage = moderatorMessage || legacyReject;

  if (!submissionId || !['approve', 'reject', 'request_changes'].includes(action)) {
    throw new HttpsError('invalid-argument', 'submissionId and action approve|reject|request_changes required');
  }

  const db = admin.firestore();
  const subRef = db.collection(COMMUNITY_SUBMISSIONS).doc(submissionId);

  let approvedPackId: string | null = null;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(subRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Submission not found');
    }
    const d = snap.data() as {
      status?: string;
      authorStableId?: string;
      payload?: SubmissionPayload;
      editTargetPackId?: string;
      submissionKey?: string;
    };
    if (d.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'Submission is not pending');
    }
    const authorStableId = String(d.authorStableId ?? '').trim();
    const now = Date.now();
    const msgForInbox = moderatorMessageOrNull(effectiveMessage);

    const writeModerationInbox = (result: 'approved' | 'rejected' | 'revision_requested') => {
      if (!authorStableId) return;
      const studyTarget = normalizeCommunityPackStudyTarget(d.payload?.studyTarget);
      const inboxRef = db.collection('users').doc(authorStableId).collection(SELLER_INBOX).doc();
      tx.set(inboxRef, {
        type: 'moderation_result',
        result,
        submissionId,
        submissionKey: String(d.submissionKey ?? '').trim() || null,
        studyTarget,
        message: msgForInbox,
        titleRu: (d.payload?.titleRu ?? '').trim().slice(0, 200) || null,
        titleUk: (d.payload?.titleUk ?? '').trim().slice(0, 200) || null,
        titleEs: (d.payload?.titleEs ?? '').trim().slice(0, 200) || null,
        titlePtBr: (d.payload?.titlePtBr ?? '').trim().slice(0, 200) || null,
        titleVi: (d.payload?.titleVi ?? '').trim().slice(0, 200) || null,
        titleId: (d.payload?.titleId ?? '').trim().slice(0, 200) || null,
        titleTr: (d.payload?.titleTr ?? '').trim().slice(0, 200) || null,
        titlePl: (d.payload?.titlePl ?? '').trim().slice(0, 200) || null,
        createdAt: now,
        seen: false,
      });
    };

    const editTargetEarly = String(d.editTargetPackId ?? '').trim();
    if (editTargetEarly) {
      const target = await tx.get(db.collection(COMMUNITY_PACKS).doc(editTargetEarly));
      const current = target.data();
      if (!target.exists || current?.removedByAuthor === true || current?.listingStatus === LISTING_ADMIN_REMOVED
        || (current?.pendingSubmissionId && current.pendingSubmissionId !== submissionId)) {
        tx.update(subRef, { status: 'cancelled', reviewedAt: now });
        return;
      }
    }
    // Содержимое старого набора для восстановления реестра больше не читаем:
    // отправка правки его не снимает. Нужен только факт существования — по нему
    // возвращаем listingStatus обратно в 'published' при отказе.
    let editPackExistsForRestore = false;
    if (editTargetEarly && (action === 'reject' || action === 'request_changes')) {
      const ps = await tx.get(db.collection(COMMUNITY_PACKS).doc(editTargetEarly));
      editPackExistsForRestore = ps.exists;
    }

    if (action === 'reject') {
      // зачем (владелец 2026-09-04): восстанавливать записи реестра больше НЕ
      // НУЖНО — отправка правки их не снимает, старая версия всё это время
      // оставалась в индексе. Прежний вызов теперь ДУБЛИРОВАЛ бы её карточки.
      tx.update(subRef, {
        status: 'rejected',
        reviewedAt: now,
        rejectReason: effectiveMessage,
        moderatorMessage: msgForInbox,
      });
      if (editTargetEarly && editPackExistsForRestore) {
        tx.update(db.collection(COMMUNITY_PACKS).doc(editTargetEarly), {
          listingStatus: 'published',
          updatedAt: now,
        });
      }
      writeModerationInbox('rejected');
      return;
    }

    if (action === 'request_changes') {
      // зачем (владелец 2026-09-04): восстанавливать записи реестра больше НЕ
      // НУЖНО — отправка правки их не снимает, старая версия всё это время
      // оставалась в индексе. Прежний вызов теперь ДУБЛИРОВАЛ бы её карточки.
      tx.update(subRef, {
        status: 'needs_revision',
        reviewedAt: now,
        moderatorMessage: effectiveMessage,
      });
      if (editTargetEarly && editPackExistsForRestore) {
        tx.update(db.collection(COMMUNITY_PACKS).doc(editTargetEarly), {
          listingStatus: 'published',
          updatedAt: now,
        });
      }
      writeModerationInbox('revision_requested');
      return;
    }

    const rawPayload = d.payload;
    if (!rawPayload) {
      throw new HttpsError('failed-precondition', 'Submission has no payload');
    }
    const payload = normalizeSubmissionPayload(rawPayload);
    const themeKey = safeCardThemeKey(payload);
    const editTarget = String(d.editTargetPackId ?? '').trim();

    if (editTarget) {
      const packRef = db.collection(COMMUNITY_PACKS).doc(editTarget);
      const packSnap = await tx.get(packRef);
      if (!packSnap.exists) {
        throw new HttpsError('not-found', 'Pack to update not found');
      }
      const existing = (packSnap.data() ?? {}) as Record<string, unknown>;
      const existingStudyTarget = normalizeCommunityPackStudyTarget(existing.studyTarget);
      if (existingStudyTarget !== normalizeCommunityPackStudyTarget(payload.studyTarget)) {
        throw new HttpsError('failed-precondition', 'Cannot change pack study target');
      }
      const cardsWithRichFallback = preserveExistingRichCardFields(existing.cards, payload.cards);
      // зачем (владелец 2026-09-04): раньше старую версию снимали из реестра ещё
      // при ОТПРАВКЕ правки, поэтому здесь previous был null. Теперь отправка
      // ничего не снимает (автор не теряет витрину на время проверки), и замена
      // старых записей новыми происходит РОВНО ЗДЕСЬ, одной транзакцией: иначе
      // карточки прежней версии остались бы в индексе дублей навсегда.
      await syncFlashcardRegistryPackMutation(
        tx,
        db,
        { id: editTarget, studyTarget: existingStudyTarget, cards: Array.isArray(existing.cards) ? existing.cards : [] },
        { id: editTarget, studyTarget: existingStudyTarget, cards: cardsWithRichFallback },
      );
      tx.set(packRef, {
        ...existing,
        listingStatus: 'published',
        authorStableId: d.authorStableId ?? existing.authorStableId ?? null,
         submissionId: editTarget,
         studyTarget: existingStudyTarget,
         packLanguage: payload.packLanguage,
        titleRu: payload.titleRu.trim(),
        titleUk: payload.titleUk.trim(),
        titleEs: (payload.titleEs ?? '').trim() || null,
        titlePtBr: (payload.titlePtBr ?? '').trim() || null,
        titleVi: (payload.titleVi ?? '').trim() || null,
        titleId: (payload.titleId ?? '').trim() || null,
        titleTr: (payload.titleTr ?? '').trim() || null,
        titlePl: (payload.titlePl ?? '').trim() || null,
        descriptionRu: (payload.descriptionRu ?? '').trim() || null,
        descriptionUk: (payload.descriptionUk ?? '').trim() || null,
        descriptionEs: (payload.descriptionEs ?? '').trim() || null,
        descriptionPtBr: (payload.descriptionPtBr ?? '').trim() || null,
        descriptionVi: (payload.descriptionVi ?? '').trim() || null,
        descriptionId: (payload.descriptionId ?? '').trim() || null,
        descriptionTr: (payload.descriptionTr ?? '').trim() || null,
        descriptionPl: (payload.descriptionPl ?? '').trim() || null,
        // зачем (проверка 2026-09-21): без этой строки одобрение правки
        // сохраняло СТАРУЮ цену — `...existing` подставлял прежнее значение, и
        // автор, изменивший цену, молча оставался со старой. Поля не было
        // видно как баг: набор оставался платным, просто не по новой цене.
        priceRunes: normalizePackPriceRunes(payload.priceRunes),
        cards: cardsWithRichFallback,
        cardCount: cardsWithRichFallback.length,
        cardThemeKey: themeKey,
        updatedAt: now,
      });
      tx.update(subRef, {
        status: 'approved',
        reviewedAt: now,
        publishedPackId: editTarget,
        moderatorMessage: msgForInbox,
      });
      writeModerationInbox('approved');
      approvedPackId = editTarget;
      return;
    }

    const packRef = db.collection(COMMUNITY_PACKS).doc(submissionId);
    const packSnap = await tx.get(packRef);
    if (packSnap.exists) {
      throw new HttpsError('already-exists', 'Published pack already exists for this id');
    }

    await syncFlashcardRegistryPackMutation(tx, db, null, { id: submissionId, studyTarget: normalizeCommunityPackStudyTarget(payload.studyTarget), cards: payload.cards });

    tx.set(packRef, {
      listingStatus: 'published',
      authorStableId: d.authorStableId ?? null,
       submissionId,
       studyTarget: normalizeCommunityPackStudyTarget(payload.studyTarget),
       packLanguage: payload.packLanguage,
      titleRu: payload.titleRu.trim(),
      titleUk: payload.titleUk.trim(),
      titleEs: (payload.titleEs ?? '').trim() || null,
      titlePtBr: (payload.titlePtBr ?? '').trim() || null,
      titleVi: (payload.titleVi ?? '').trim() || null,
      titleId: (payload.titleId ?? '').trim() || null,
      titleTr: (payload.titleTr ?? '').trim() || null,
      titlePl: (payload.titlePl ?? '').trim() || null,
      descriptionRu: (payload.descriptionRu ?? '').trim() || null,
      descriptionUk: (payload.descriptionUk ?? '').trim() || null,
      descriptionEs: (payload.descriptionEs ?? '').trim() || null,
      descriptionPtBr: (payload.descriptionPtBr ?? '').trim() || null,
      descriptionVi: (payload.descriptionVi ?? '').trim() || null,
      descriptionId: (payload.descriptionId ?? '').trim() || null,
      descriptionTr: (payload.descriptionTr ?? '').trim() || null,
      descriptionPl: (payload.descriptionPl ?? '').trim() || null,
      // зачем (владелец 2026-09-21): цена автора доезжает до документа набора —
      // именно её читает communitySyncPackRuneSale при начислении.
      priceRunes: normalizePackPriceRunes(payload.priceRunes),
      cards: payload.cards,
      cardCount: payload.cards.length,
      cardThemeKey: themeKey,
      salesCount: 0,
      publishedAt: now,
      updatedAt: now,
    });

    tx.update(subRef, {
      status: 'approved',
      reviewedAt: now,
      publishedPackId: submissionId,
      moderatorMessage: msgForInbox,
    });
    writeModerationInbox('approved');
    approvedPackId = submissionId;
  });

  if (action === 'approve' && approvedPackId) {
    // зачем: D128 — одобренный набор озвучивается сразу, но в фоне
    // (card_tts_worker.ts): одобрение не ждёт OpenAI и не падает из-за него.
    await enqueueCardTtsJob(db, approvedPackId, 'moderation_approve');
  } else if (action === 'approve') {
    console.log('[CARD-TTS] enqueue:skip moderation — одобрение ничего не опубликовало', JSON.stringify({ submissionId }));
  }
  return { ok: true, publishedPackId: action === 'approve' ? approvedPackId : null };
});

function buildSellerInboxModerationRow(params: {
  result: 'revision_requested' | 'pack_removed';
  packId: string;
  studyTarget: CommunityStudyTarget;
  now: number;
  message: string | null;
  titleRu: string | null;
  titleUk: string | null;
  titleEs: string | null;
}): Record<string, unknown> {
  const row: Record<string, unknown> = {
    type: 'moderation_result',
    result: params.result,
    packId: params.packId,
    studyTarget: params.studyTarget,
    createdAt: params.now,
    seen: false,
  };
  if (params.message) row.message = params.message;
  if (params.titleRu) row.titleRu = params.titleRu;
  if (params.titleUk) row.titleUk = params.titleUk;
  if (params.titleEs) row.titleEs = params.titleEs;
  return row;
}

/**
 * Author-owned deletion is a soft removal: catalog visibility is revoked, while
 * already granted access can still read the immutable card snapshot.
 */
export const communityAuthorRemovePack = onCall({ region: 'us-central1', enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required');
  const requestedStableId = String(request.data?.authorStableId ?? '').trim();
  let packId = String(request.data?.packId ?? '').trim();
  const submissionKey = String(request.data?.submissionKey ?? '').trim();
  if (!requestedStableId || !packId) {
    throw new HttpsError('invalid-argument', 'authorStableId and packId required');
  }

  const db = admin.firestore();
  const stableId = await resolveStableUidForAuth(db, request.auth.uid, requestedStableId, {
    requireKnownIdentity: true,
  });
  const cancellingLocalAttempt = Boolean(submissionKey && packId.startsWith('local_pack_'));
  if (cancellingLocalAttempt) {
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(submissionKey)) throw new HttpsError('invalid-argument', 'submissionKey invalid');
    packId = `create_${createHash('sha256').update(`${stableId}\0${submissionKey}`).digest('hex')}`;
  }
  const packRef = db.collection(COMMUNITY_PACKS).doc(packId);
  await db.runTransaction(async (tx) => {
    const packSnap = await tx.get(packRef);
    if (!packSnap.exists) {
      const subRef = db.collection(COMMUNITY_SUBMISSIONS).doc(packId);
      const submission = await tx.get(subRef);
      if (!submission.exists) {
        if (!cancellingLocalAttempt) throw new HttpsError('not-found', 'Pack not found');
        // Withdrawal can beat a delayed first request. Reserve only this caller's
        // deterministic attempt, without uploading any private card contents.
        tx.create(subRef, {
          status: 'cancelled', authorStableId: stableId, submissionKind: 'create',
          submissionKey, callerAuthUid: request.auth!.uid, submittedAt: Date.now(), reviewedAt: Date.now(),
        });
        return;
      }
      if (submission.data()?.authorStableId !== stableId) throw new HttpsError('permission-denied', 'Not your pack');
      tx.update(subRef, { status: 'cancelled', reviewedAt: Date.now() });
      return;
    }
    const pack = packSnap.data() as Record<string, unknown>;
    if (String(pack.authorStableId ?? '').trim() !== stableId) {
      throw new HttpsError('permission-denied', 'Not your pack');
    }
    const status = String(pack.listingStatus ?? '');
    if (status === LISTING_ADMIN_REMOVED) return;
    if (status !== 'published' && status !== 'update_pending' && status !== LISTING_ADMIN_REVISION) {
      throw new HttpsError('failed-precondition', 'Pack cannot be removed in its current state');
    }
    const pending = await tx.get(db.collection(COMMUNITY_SUBMISSIONS).where('editTargetPackId', '==', packId).where('status', '==', 'pending'));
    if (status === 'published' || status === 'update_pending') {
      await syncFlashcardRegistryPackMutation(tx, db, {
        id: packId,
        studyTarget: normalizeCommunityPackStudyTarget(pack.studyTarget),
        cards: Array.isArray(pack.cards) ? pack.cards : [],
      }, null);
    }
    for (const submission of pending.docs) tx.update(submission.ref, { status: 'cancelled', reviewedAt: Date.now() });
    tx.update(packRef, {
      listingStatus: LISTING_ADMIN_REMOVED,
      removedByAuthor: true,
      removedAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  return { ok: true };
});

/**
 * Админ: снять набор с витрины на доработку или удалить (мягко). Inbox автору — как при модерации заявок.
 * Явный регион us-central1 — как getFunctions в админке и в приложении.
 */
export const communityAdminModeratePack = onCall({ region: 'us-central1', enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const packId = String(request.data?.packId ?? '').trim();
  const action = String(request.data?.action ?? '').trim() as 'require_revision' | 'remove';
  const moderatorMessage = trimModeratorMessage(request.data?.moderatorMessage);
  const msgForInbox = moderatorMessageOrNull(moderatorMessage);

  if (!packId || !['require_revision', 'remove'].includes(action)) {
    throw new HttpsError('invalid-argument', 'packId and action require_revision|remove required');
  }

  const db = admin.firestore();
  const packRef = db.collection(COMMUNITY_PACKS).doc(packId);

  const run = async () => {
    await db.runTransaction(async (tx) => {
      const packSnap = await tx.get(packRef);
      if (!packSnap.exists) {
        throw new HttpsError('not-found', 'Pack not found');
      }
      const pack = packSnap.data() as Record<string, unknown>;
      const st = String(pack.listingStatus ?? '');
      if (st === LISTING_ADMIN_REMOVED) {
        throw new HttpsError('failed-precondition', 'Pack already removed');
      }
      if (st !== 'published' && st !== 'update_pending' && st !== LISTING_ADMIN_REVISION) {
        throw new HttpsError('failed-precondition', 'Pack is not active for admin action');
      }
      const authorStableId = String(pack.authorStableId ?? '').trim();
      const studyTarget = normalizeCommunityPackStudyTarget(pack.studyTarget);
      const now = Date.now();
      const tRu = String(pack.titleRu ?? '').trim().slice(0, 200) || null;
      const tUk = String(pack.titleUk ?? '').trim().slice(0, 200) || null;
      const tEs = String(pack.titleEs ?? '').trim().slice(0, 200) || null;

      const writeInbox = (result: 'revision_requested' | 'pack_removed') => {
        if (!authorStableId) return;
        const inboxRef = db.collection('users').doc(authorStableId).collection(SELLER_INBOX).doc();
        tx.set(
          inboxRef,
          buildSellerInboxModerationRow({
            result,
            packId,
            studyTarget,
            now,
            message: msgForInbox,
            titleRu: tRu,
            titleUk: tUk,
            titleEs: tEs,
          }),
        );
      };

      const patchAdminMessage = (base: Record<string, unknown>) => {
        if (msgForInbox) {
          return { ...base, adminLastMessage: msgForInbox };
        }
        return { ...base, adminLastMessage: admin.firestore.FieldValue.delete() };
      };

      if (action === 'require_revision') {
        if (st === 'update_pending') {
          throw new HttpsError(
            'failed-precondition',
            'У набора уже висит заявка на правку в очереди — обработайте её во вкладке заявок.',
          );
        }
        if (st === 'published') await syncFlashcardRegistryPackMutation(tx, db, { id: packId, studyTarget, cards: Array.isArray(pack.cards) ? pack.cards : [] }, null);
        tx.update(packRef, patchAdminMessage({
          listingStatus: LISTING_ADMIN_REVISION,
          updatedAt: now,
          adminLastAction: 'require_revision',
          adminLastActionAt: now,
        }) as Record<string, unknown>);
        writeInbox('revision_requested');
        return;
      }

      if (st === 'update_pending') {
        throw new HttpsError(
          'failed-precondition',
          'У набора висит заявка на правку в очереди — сначала заявки.',
        );
      }

      if (st === 'published') await syncFlashcardRegistryPackMutation(tx, db, { id: packId, studyTarget, cards: Array.isArray(pack.cards) ? pack.cards : [] }, null);

      tx.update(packRef, patchAdminMessage({
        listingStatus: LISTING_ADMIN_REMOVED,
        updatedAt: now,
        adminLastAction: 'remove',
        adminLastActionAt: now,
      }) as Record<string, unknown>);
      writeInbox('pack_removed');
    });
  };

  try {
    await run();
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    const m = e instanceof Error ? e.message : String(e);
    console.error('communityAdminModeratePack failed', m, e);
    throw new HttpsError('internal', m || 'server');
  }

  return { ok: true };
});

/**
 * Карточки набора, если пользователь — автор (кроме admin_removed) или покупатель.
 */
export const communityFetchPackCardsIfAccessible = onCall({ region: 'us-central1', enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const requestedStableId = String(request.data?.stableId ?? '').trim();
  const packId = String(request.data?.packId ?? '').trim();
  const requestedStudyTarget = request.data?.studyTarget;
  if (!requestedStableId || !packId) {
    throw new HttpsError('invalid-argument', 'stableId and packId required');
  }

  const db = admin.firestore();
  const stableId = await resolveStableUidForAuth(db, request.auth.uid, requestedStableId, {
    requireKnownIdentity: true,
  });
  const packRef = db.collection(COMMUNITY_PACKS).doc(packId);
  const packSnap = await packRef.get();
  if (!packSnap.exists) {
    throw new HttpsError('not-found', 'Pack not found');
  }
  const pack = packSnap.data() as Record<string, unknown>;
  requireMatchingPackStudyTarget(requestedStudyTarget, pack);
  const st = String(pack.listingStatus ?? '');
  const authorStableId = String(pack.authorStableId ?? '').trim();

  if (stableId === authorStableId) {
    if (st === LISTING_ADMIN_REMOVED) {
      throw new HttpsError('permission-denied', 'Pack was removed');
    }
    const cards = Array.isArray(pack.cards) ? pack.cards : [];
    return { ok: true, cards };
  }

  const purchaseId = `${stableId}__${packId}`;
  const purSnap = await db.collection(COMMUNITY_PURCHASES).doc(purchaseId).get();
  if (!purSnap.exists) {
    throw new HttpsError('permission-denied', 'No access');
  }
  if (st !== 'published' && st !== 'update_pending' && st !== LISTING_ADMIN_REVISION && st !== LISTING_ADMIN_REMOVED) {
    throw new HttpsError('failed-precondition', 'Pack unavailable');
  }
  const cards = Array.isArray(pack.cards) ? pack.cards : [];
  return { ok: true, cards };
});

// зачем: D110 — админ-возврат покупки набора удалён
// решением владельца: платных продаж наборов больше нет, возвращать нечего.

// зачем: D140 (владелец 2026-10-01) — подарочные наборы удалены: callable
// communityRedeemPackGiftVoucher, flashcardPackGiftRedeem, flashcardPackGiftSyncState и
// flashcardPackGiftGrantGlobalBroadcast сняты вместе с погашением ваучеров (непогашенные
// ваучеры аннулированы). Уже полученные наборы остаются: их владение живёт в
// community_pack_purchases и локальной библиотеке, этот код их не трогал.

// зачем: D108 — мёртвый серверный розыгрыш подарков уровня (0 вызовов после снятия
// callables) удалён: он всё ещё выбирал косметику (cosmetic_avatar_*/premium_cosmetic_*).
// зачем: level-gift / level-spin pack callables (levelGiftReserve, levelGiftActivatePackGift, levelSpinActivatePackGift) удалены целиком — они были не экспортированы и лишь бросали level_*_retired; мёртвый код после throw ломал tsc и весь build functions

/**
 * Список непрочитанных событий продажи для автора (для модалки при входе).
 * Доверие к authorStableId — через подтверждённую личность автора.
 */
export const communityListSellerInbox = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const requestedAuthorStableId = String(request.data?.authorStableId ?? '').trim();
  if (!requestedAuthorStableId) {
    throw new HttpsError('invalid-argument', 'authorStableId required');
  }
  const limit = Math.min(50, Math.max(1, Math.floor(Number(request.data?.limit) || 20)));
  const afterEventId = String(request.data?.afterEventId ?? '').trim();
  if (afterEventId && !/^[A-Za-z0-9_-]{1,128}$/.test(afterEventId)) {
    throw new HttpsError('invalid-argument', 'afterEventId invalid');
  }

  const db = admin.firestore();
  const authorStableId = await resolveStableUidForAuth(db, request.auth.uid, requestedAuthorStableId, {
    requireKnownIdentity: true,
  });
  let inboxQuery = db
    .collection('users')
    .doc(authorStableId)
    .collection(SELLER_INBOX)
    .where('seen', '==', false)
    .orderBy(admin.firestore.FieldPath.documentId());
  if (afterEventId) inboxQuery = inboxQuery.startAfter(afterEventId);
  const snap = await inboxQuery.limit(limit).get();

  const events = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  const nextCursor = snap.docs.length === limit ? snap.docs[snap.docs.length - 1]?.id : undefined;
  return nextCursor ? { events, nextCursor } : { events };
});

/**
 * Пометить события inbox как просмотренные (для модалки «уже показали»).
 */
export const communityMarkSellerInboxSeen = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const requestedAuthorStableId = String(request.data?.authorStableId ?? '').trim();
  const eventIds = request.data?.eventIds as unknown;
  if (!requestedAuthorStableId || !Array.isArray(eventIds) || eventIds.length === 0) {
    throw new HttpsError('invalid-argument', 'authorStableId and eventIds[] required');
  }
  const ids = eventIds.map((x) => String(x).trim()).filter(Boolean).slice(0, 30);
  const db = admin.firestore();
  const authorStableId = await resolveStableUidForAuth(db, request.auth.uid, requestedAuthorStableId, {
    requireKnownIdentity: true,
  });
  const batch = db.batch();
  const now = Date.now();
  for (const id of ids) {
    const ref = db.collection('users').doc(authorStableId).collection(SELLER_INBOX).doc(id);
    batch.set(ref, { seen: true, seenAt: now }, { merge: true });
  }
  await batch.commit();
  return { ok: true };
});
