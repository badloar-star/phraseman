/**
 * Удаление одной карточки из СВОЕГО опубликованного набора.
 *
 * зачем (сессия 3 «Карточки» через координатора 04.10): у раскрытой карточки своего набора есть «Удалить»
 * с тостом «Вернуть». Для опубликованного набора правка идёт только через сервер — клиенту правила
 * Firestore разрешают в community_packs лишь счётчики лайков. Схема дешёвая: «Вернуть» живёт на клиенте
 * 5 с и в сеть не уходит; сюда приходит ОДИН вызов на удаление, функции «вернуть» нет.
 * Каталог читает этот же документ набора, поэтому cards и cardCount меняются одной записью.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { syncFlashcardRegistryPackMutation } from './community_packs';

const COMMUNITY_PACKS = 'community_packs';
/** Тот же минимум, что при публикации (CARD_MIN в community_packs.ts, COMMUNITY_PACK_CARD_COUNT_MIN в приложении). */
export const COMMUNITY_PACK_CARD_COUNT_MIN = 10;
const LOG = '[PACK-CARD-REMOVE]';

export type PackCardRemoveRefusal =
  | 'pack_not_found'
  | 'not_author'
  | 'pack_removed'
  | 'update_pending'
  | 'not_published'
  | 'card_count';

export type PackCardRemoveResult =
  | Readonly<{ ok: true; status: 'removed' | 'not_found_already_removed'; cardCount: number }>
  | Readonly<{ ok: false; reason: PackCardRemoveRefusal; cardCount?: number }>;

export type PackCardRemovePlan =
  | Readonly<{ kind: 'refuse'; reason: PackCardRemoveRefusal; cardCount?: number }>
  | Readonly<{ kind: 'already_removed'; cardCount: number }>
  | Readonly<{ kind: 'remove'; cards: readonly unknown[]; removedIndex: number; cardCount: number; syncRegistry: boolean }>;

/**
 * Карточка в приложении живёт под id `<packId>_<id>`, в документе — под сырым `id`. Принимаем оба вида,
 * чтобы экран не ошибся форматом.
 */
export function normalizePackCardId(packId: string, cardId: string): string {
  const prefix = `${packId}_`;
  return cardId.startsWith(prefix) ? cardId.slice(prefix.length) : cardId;
}

function rawCardId(card: unknown): string {
  if (!card || typeof card !== 'object' || Array.isArray(card)) return '';
  return String((card as Record<string, unknown>).id ?? '').trim();
}

/** Чистое решение по документу набора — вся бизнес-логика без Firestore (её и проверяют тесты). */
export function planPackCardRemoval(
  pack: Readonly<Record<string, unknown>> | null,
  callerStableId: string,
  cardId: string,
): PackCardRemovePlan {
  if (!pack) return { kind: 'refuse', reason: 'pack_not_found' };
  if (String(pack.authorStableId ?? '').trim() !== callerStableId) return { kind: 'refuse', reason: 'not_author' };
  const status = String(pack.listingStatus ?? '');
  if (status === 'admin_removed') return { kind: 'refuse', reason: 'pack_removed' };
  // зачем: одобрение висящей заявки на правку перезапишет cards — удалённая карточка вернулась бы молча.
  if (status === 'update_pending') return { kind: 'refuse', reason: 'update_pending' };
  if (status !== 'published' && status !== 'admin_revision_required') return { kind: 'refuse', reason: 'not_published' };
  const cards = Array.isArray(pack.cards) ? pack.cards : [];
  const removedIndex = cards.findIndex((card) => rawCardId(card) === cardId);
  // Повтор вызова (очередь на устройстве переслала после обрыва связи) — не ошибка.
  if (removedIndex < 0) return { kind: 'already_removed', cardCount: cards.length };
  const remaining = cards.filter((_, index) => index !== removedIndex);
  if (remaining.length < COMMUNITY_PACK_CARD_COUNT_MIN) {
    return { kind: 'refuse', reason: 'card_count', cardCount: cards.length };
  }
  return { kind: 'remove', cards: remaining, removedIndex, cardCount: remaining.length, syncRegistry: status === 'published' };
}

export const communityAuthorRemoveCard = onCall({ region: 'us-central1', enforceAppCheck: ENFORCE_APP_CHECK }, async (request): Promise<PackCardRemoveResult> => {
  if (!request.auth) {
    console.warn(LOG, 'exit:unauthenticated');
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const packId = String(request.data?.packId ?? '').trim();
  const requestedCardId = String(request.data?.cardId ?? '').trim();
  if (!packId || !requestedCardId || packId.length > 200 || requestedCardId.length > 420) {
    console.warn(LOG, 'exit:invalid_argument', JSON.stringify({ packIdLength: packId.length, cardIdLength: requestedCardId.length }));
    throw new HttpsError('invalid-argument', 'packId and cardId required');
  }
  const cardId = normalizePackCardId(packId, requestedCardId);
  const db = admin.firestore();
  // зачем: автор — только тот, кто вошёл; присланный клиентом идентификатор не берём на веру.
  const stableId = await resolveStableUidForAuth(db, request.auth.uid, undefined, { requireKnownIdentity: true });
  console.log(LOG, 'enter', JSON.stringify({ packId, cardId, prefixedInput: cardId !== requestedCardId }));
  const packRef = db.collection(COMMUNITY_PACKS).doc(packId); // guard-ok: одно чтение документа по id, не запрос коллекции
  const startedAt = Date.now();
  try {
    const result = await db.runTransaction(async (tx): Promise<PackCardRemoveResult> => {
      const snap = await tx.get(packRef);
      const pack = snap.exists ? (snap.data() as Record<string, unknown>) : null;
      const plan = planPackCardRemoval(pack, stableId, cardId);
      if (plan.kind === 'refuse') {
        return plan.cardCount === undefined
          ? { ok: false, reason: plan.reason }
          : { ok: false, reason: plan.reason, cardCount: plan.cardCount };
      }
      if (plan.kind === 'already_removed') {
        return { ok: true, status: 'not_found_already_removed', cardCount: plan.cardCount };
      }
      if (plan.syncRegistry && pack) {
        const studyTarget = typeof pack.studyTarget === 'string' ? pack.studyTarget : undefined;
        await syncFlashcardRegistryPackMutation(
          tx,
          db,
          { id: packId, studyTarget, cards: Array.isArray(pack.cards) ? pack.cards : [] },
          { id: packId, studyTarget, cards: plan.cards },
        );
      }
      tx.update(packRef, { cards: plan.cards, cardCount: plan.cardCount, updatedAt: Date.now() });
      return { ok: true, status: 'removed', cardCount: plan.cardCount };
    });
    console.log(LOG, 'exit:result', JSON.stringify({ packId, cardId, ...result, ms: Date.now() - startedAt }));
    return result;
  } catch (error) {
    console.error(LOG, 'exit:transaction_failed', JSON.stringify({
      packId, cardId, ms: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error),
    }));
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'pack_card_remove_failed');
  }
});
