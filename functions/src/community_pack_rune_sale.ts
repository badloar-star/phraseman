/**
 * communitySyncPackRuneSale — руны с покупки набора получает АВТОР набора.
 *
 * зачем (владелец, 2026-09-21, дословно): «начисление должно быть юзеры чьи
 * наборы покупаются, а не блять приложению». До этой функции покупка набора за
 * руны списывала их у покупателя и всё — автору не доставалось ничего, руны
 * просто исчезали. Экран создания при этом честно писал «руны остаются у
 * приложения»; владелец этот текст отменил вместе с самим правилом.
 *
 * ПОЧЕМУ ЗДЕСЬ СЕРВЕР, А НЕ ТЕЛЕФОН. Закон проекта — телефон авторитетен —
 * остаётся в силе для ПОКУПАТЕЛЯ: списание и открытие набора происходят в
 * кадре 0 на устройстве (`buyCommunityPackLocally`). Но автор — ДРУГОЙ человек,
 * его баланс лежит в его документе, и телефон покупателя не может и не должен
 * его менять. Поэтому начисление автору — единственная часть сделки, которая
 * обязана быть серверной.
 *
 * ЗАЩИТА ОТ НАКРУТКИ (главное в этом файле):
 * - автор и цена читаются ИЗ ДОКУМЕНТА НАБОРА, а не из запроса. Иначе
 *   модифицированный клиент прислал бы «автор = я, цена = 5 000» и начислял
 *   себе руны бесконечно;
 * - самопокупка запрещена: автор не может купить свой набор;
 * - stableId покупателя обязан принадлежать вызывающему (зеркало
 *   `userMatchesAuth` из ai_dialog_sync_purchase.ts);
 * - набор обязан быть опубликован: черновик или снятый набор не продаётся.
 *
 * Идемпотентность: opId `pack_sale:{packId}:{buyerStableId}` стабилен и не
 * зависит от попытки — повтор после обрыва сети не начислит автору дважды,
 * журнал отвергает вставку по тому же opId сам.
 *
 * Отказа «недостаточно рун» здесь нет и быть не может: решение о покупке уже
 * принято на телефоне покупателя, а отказ задним числом отнял бы у автора
 * заработанное (тот же закон, что в ai_dialog_sync_purchase.ts).
 *
 * App Check не включаем — запломбирован владельцем (callable_options.ts,
 * APP_CHECK_SEALED_BY_OWNER_2026_08_17).
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  commitStarOperations,
  normalizeStars,
  prepareStarOperations,
  type StarOpRequest,
} from './stars_ledger';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;

const COMMUNITY_PACKS = 'community_packs';
/** Чеки продаж: по ним видно, кто кому и сколько заплатил. */
const PACK_RUNE_SALES = 'community_pack_rune_sales';
/** Инбокс продавца — тот же, что у продаж за осколки. */
const SELLER_INBOX = 'seller_inbox';

/**
 * Доля платформы, в базисных пунктах. 1500 = 15% — ровно та же комиссия, что у
 * продажи набора за осколки (`PLATFORM_FEE_BPS` в community_packs.ts):
 * две валюты не должны иметь разную экономику за одно и то же действие.
 */
const PLATFORM_FEE_BPS = 1500;

/** Потолок цены — зеркало клиентского COMMUNITY_PACK_PRICE_MAX_RUNES. */
const MAX_PACK_PRICE_RUNES = 5000;

/** Доля автора после комиссии платформы. */
export function authorNetRunes(priceRunes: number): number {
  if (!Number.isFinite(priceRunes) || priceRunes <= 0) return 0;
  const price = Math.floor(priceRunes);
  const fee = Math.floor((price * PLATFORM_FEE_BPS) / 10_000);
  return Math.max(0, price - fee);
}

/**
 * Решение о сделке ОДНОЙ чистой функцией — чтобы защиты от накрутки можно было
 * проверить тестом, а не надеяться, что они не разъедутся. Всё, что здесь
 * запрещено, запрещено на сервере: клиент в этом решении не участвует.
 */
export type PackSaleDecision =
  | { ok: true; authorStableId: string; priceRunes: number; netRunes: number }
  | { ok: false; reason: PackSaleDenyReason };

export type PackSaleDenyReason =
  | 'pack_not_published'
  | 'pack_has_no_author'
  | 'cannot_buy_own_pack'
  | 'pack_is_not_paid'
  | 'author_net_is_zero';

export function decidePackSale(
  pack: { authorStableId?: unknown; priceRunes?: unknown; listingStatus?: unknown },
  buyerStableId: string,
): PackSaleDecision {
  const listingStatus = String(pack.listingStatus ?? '').trim();
  if (listingStatus !== 'published') return { ok: false, reason: 'pack_not_published' };

  const authorStableId = String(pack.authorStableId ?? '').trim();
  if (!authorStableId) return { ok: false, reason: 'pack_has_no_author' };
  // Самопокупка: иначе автор крутил бы себе руны собственным набором.
  if (authorStableId === buyerStableId) return { ok: false, reason: 'cannot_buy_own_pack' };

  // Цена ТОЛЬКО из документа набора: клиент её не присылает и присылать не
  // может — иначе назначил бы автору любую сумму.
  const priceRunes = Math.floor(Number(pack.priceRunes ?? 0));
  if (!Number.isFinite(priceRunes) || priceRunes <= 0 || priceRunes > MAX_PACK_PRICE_RUNES) {
    return { ok: false, reason: 'pack_is_not_paid' };
  }

  const netRunes = authorNetRunes(priceRunes);
  if (netRunes <= 0) return { ok: false, reason: 'author_net_is_zero' };

  return { ok: true, authorStableId, priceRunes, netRunes };
}

/** Зеркало welcome_gift.ts: stableId обязан принадлежать вызывающему. */
function userMatchesAuth(
  stableId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  authUid: string,
): boolean {
  if (!data || data.identityHidden === true) return false;
  const canonicalStableId = typeof data.canonicalStableId === 'string' ? data.canonicalStableId.trim() : '';
  if (canonicalStableId && canonicalStableId !== stableId) return false;
  const linkedAuthUid = typeof data?.firebaseAuthUid === 'string' ? data.firebaseAuthUid : '';
  return (linkedAuthUid && linkedAuthUid === authUid) || stableId === authUid;
}

/** Тот же ISO-ключ недели, что в welcome_gift.ts и ai_dialog_sync_purchase.ts. */
function isoWeekKey(nowMs: number): string {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const date = new Date(nowMs);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export const communitySyncPackRuneSale = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const authUid = request.auth.uid;

  const buyerStableId = String(request.data?.buyerStableId ?? '').trim();
  const packId = String(request.data?.packId ?? '').trim();
  if (!buyerStableId || !packId) {
    throw new HttpsError('invalid-argument', 'buyer_and_pack_required');
  }

  const db = admin.firestore();
  const packRef = db.collection(COMMUNITY_PACKS).doc(packId);
  const buyerRef = db.collection('users').doc(buyerStableId);
  // Один чек на пару «набор + покупатель»: вторая покупка того же набора тем же
  // человеком невозможна по построению ключа.
  const saleId = `${packId}__${buyerStableId}`;
  const saleRef = db.collection(PACK_RUNE_SALES).doc(saleId);

  return db.runTransaction(async (tx) => {
    // guard-ok: это чтение ТРЁХ конкретных документов по id (.doc(...)), а не
    // запрос коллекции — limit() к нему неприменим, читается ровно 3 документа.
    const [packSnap, buyerSnap, saleSnap] = await Promise.all([
      tx.get(packRef),
      tx.get(buyerRef),
      tx.get(saleRef),
    ]);

    if (!packSnap.exists) {
      console.log(`[PACK-SALE] denied pack_not_found pack=${packId} buyer=${buyerStableId}`);
      throw new HttpsError('not-found', 'pack_not_found');
    }
    if (!buyerSnap.exists) {
      console.log(`[PACK-SALE] denied buyer_not_found buyer=${buyerStableId}`);
      throw new HttpsError('not-found', 'buyer_not_found');
    }
    if (!userMatchesAuth(buyerStableId, buyerSnap.data(), authUid)) {
      console.log(`[PACK-SALE] denied buyer_mismatch buyer=${buyerStableId} auth=${authUid}`);
      throw new HttpsError('permission-denied', 'buyer_does_not_match_auth');
    }

    const pack = packSnap.data() as {
      authorStableId?: unknown;
      priceRunes?: unknown;
      listingStatus?: unknown;
    };

    const decision = decidePackSale(pack, buyerStableId);
    if (!decision.ok) {
      console.log(
        `[PACK-SALE] denied ${decision.reason} pack=${packId} buyer=${buyerStableId} `
        + `status=${String(pack.listingStatus)} price=${String(pack.priceRunes)}`,
      );
      throw new HttpsError('failed-precondition', decision.reason);
    }
    const { authorStableId, priceRunes, netRunes: net } = decision;

    if (saleSnap.exists) {
      // Повтор после обрыва сети — не вторая продажа.
      console.log(`[PACK-SALE] already_counted pack=${packId} buyer=${buyerStableId}`);
      return { ok: true, applied: 0, authorNetRunes: Number(saleSnap.data()?.authorNetRunes ?? 0) };
    }

    const now = Date.now();
    const authorRef = db.collection('users').doc(authorStableId);
    // guard-ok: чтение одного документа автора по id, не запрос коллекции.
    const authorSnap = await tx.get(authorRef);
    if (!authorSnap.exists) {
      console.log(`[PACK-SALE] denied author_not_found author=${authorStableId} pack=${packId}`);
      throw new HttpsError('failed-precondition', 'author_not_found');
    }

    const starOps: StarOpRequest[] = [{
      opId: `pack_sale:${packId}:${buyerStableId}`,
      delta: net,
      reason: 'community_pack_sale',
      sourceKind: 'community_pack_sale',
      sourceId: packId,
      ruleVersion: 1,
      earnedAtMs: now,
      meta: { packId, priceRunes, platformFeeRunes: priceRunes - net },
    }];

    const prepared = await prepareStarOperations(tx, db, authorStableId, authorSnap, starOps, {
      nowMs: now,
      activeSeasonId: '',
      weekKeyNow: isoWeekKey(now),
      authUid,
    });
    const committed = commitStarOperations(tx, prepared);

    // Чек продажи: по нему видно, кто кому заплатил. Нужен и для идемпотентности,
    // и для разбора накруток (один покупатель скупает наборы одного автора).
    // guard-ok: запись внутри транзакции. tx.set НЕ возвращает промис — его
    // нельзя ждать; атомарность и отказ обеспечивает сам runTransaction,
    // который бросит исключение на весь блок, если запись не прошла.
    tx.set(saleRef, {
      packId,
      buyerStableId,
      authorStableId,
      priceRunes,
      authorNetRunes: net,
      platformFeeRunes: priceRunes - net,
      createdAtMs: now,
    });

    // Счётчик продаж набора — им же считается популярность в каталоге.
    tx.update(packRef, {
      salesCount: admin.firestore.FieldValue.increment(1),
      updatedAt: now,
    });

    // Автор должен УВИДЕТЬ продажу, а не просто обнаружить выросший баланс.
    // Имени покупателя здесь нет намеренно: во внешние каналы и чужие инбоксы
    // персональные данные не уходят (правило проекта).
    tx.set(authorRef.collection(SELLER_INBOX).doc(saleId), {
      type: 'pack_sold_runes',
      packId,
      priceRunes,
      authorNetRunes: net,
      createdAt: now,
      seen: false,
    });

    console.log(
      `[PACK-SALE] ok pack=${packId} author=${authorStableId} buyer=${buyerStableId} `
      + `price=${priceRunes} net=${net} balance→${committed.balance}`,
    );

    return {
      ok: true,
      applied: 1,
      authorNetRunes: net,
      authorStars: committed.balance,
      authorStarsSeq: committed.seq,
    };
  });
});

/** Для тестов: нормализация баланса не должна разъехаться с журналом. */
export const __testables = { authorNetRunes, decidePackSale, normalizeStars, isoWeekKey };
