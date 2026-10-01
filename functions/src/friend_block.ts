// ═══════════════════════════════════════════════════════════════════════════
// friend_block.ts — минимальная блокировка пользователей в друзьях (Q41, PM-162-A2).
//
// зачем (владелец/координатор): «заблокировать при необходимости безопасно». Хранение:
// users/{me}/blocked/{actorUid} = { createdAt, source }. Пишет ТОЛЬКО сервер (rules:
// владелец читает, write false), поэтому клиент не может подделать/обойти лимит.
// Что блокировка делает: (1) «Привет» от заблокированного тихо не доставляется
// (friend_activity_likes.ts), (2) заявка в друзья от заблокированного отклоняется
// правилом Firestore (users/{target}/friend_requests create), (3) при блокировке
// входящая заявка от этого человека удаляется. Дружбу не трогаем — её удаляет
// существующий deleteFriend на клиенте.
// Лог: [FRIEND-BLOCK]. Экономия: идемпотентный повтор = 1 чтение; лимит считаем агрегатом count().
// ═══════════════════════════════════════════════════════════════════════════
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
export const FRIEND_BLOCKED_COLLECTION = 'blocked';
/** Потолок списка блокировок на одного человека. */
export const FRIEND_BLOCK_MAX = 500;
const MAX_ID_LEN = 160;

function cleanId(value: unknown): string {
  return String(value ?? '').trim();
}

/** Тот же формат id, что у friend_activity_likes: без `/`, `.`/`..` и зарезервированных `__x__`. */
export function cleanBlockActorId(value: unknown): string {
  const id = cleanId(value);
  if (!id || id.length > MAX_ID_LEN || id.includes('/') || id === '.' || id === '..') return '';
  if (/^__.*__$/.test(id)) return '';
  return id;
}

type BlockCall = { authUid: string; ownerUid: string; actorUid: string };

function readBlockCall(request: { auth?: { uid?: string } | null; data?: unknown }, action: string): BlockCall {
  if (!request.auth?.uid) {
    console.warn('[FRIEND-BLOCK] rejected: no auth', { action });
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const data = (request.data ?? {}) as Record<string, unknown>;
  const ownerUid = cleanBlockActorId(data.stableId);
  const actorUid = cleanBlockActorId(data.actorUid);
  if (!ownerUid || !actorUid) {
    console.warn('[FRIEND-BLOCK] rejected: bad ids', { action, hasOwner: Boolean(ownerUid), hasActor: Boolean(actorUid) });
    throw new HttpsError('invalid-argument', 'Valid stableId and actorUid required');
  }
  if (ownerUid === actorUid) {
    console.warn('[FRIEND-BLOCK] rejected: self', { action });
    throw new HttpsError('failed-precondition', 'Cannot block yourself');
  }
  return { authUid: request.auth.uid, ownerUid, actorUid };
}

/** Проверка, что stableId принадлежит вызывающему (как в friendLikeActivity). */
async function assertOwner(
  db: admin.firestore.Firestore,
  { authUid, ownerUid }: BlockCall,
  action: string,
): Promise<void> {
  const ownerSnap = await db.collection('users').doc(ownerUid).get();
  if (!ownerSnap.exists) {
    console.warn('[FRIEND-BLOCK] rejected: owner missing', { action });
    throw new HttpsError('not-found', 'User not found');
  }
  const data = ownerSnap.data() ?? {};
  const linked = typeof data.firebaseAuthUid === 'string' ? data.firebaseAuthUid : '';
  if (linked !== authUid && ownerUid !== authUid) {
    console.warn('[FRIEND-BLOCK] rejected: auth mismatch', { action });
    throw new HttpsError('permission-denied', 'User does not match auth');
  }
}

export const friendBlockUser = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const call = readBlockCall(request, 'block');
  const db = admin.firestore();
  await assertOwner(db, call, 'block');
  const blockedCol = db.collection('users').doc(call.ownerUid).collection(FRIEND_BLOCKED_COLLECTION);
  const ref = blockedCol.doc(call.actorUid);
  const existing = await ref.get();
  if (existing.exists) {
    console.log('[FRIEND-BLOCK] block: already blocked (idempotent)');
    return { ok: true, blocked: true, alreadyBlocked: true };
  }
  const countSnap = await blockedCol.count().get();
  const total = countSnap.data().count;
  if (total >= FRIEND_BLOCK_MAX) {
    console.warn('[FRIEND-BLOCK] block: limit reached', { total, max: FRIEND_BLOCK_MAX });
    throw new HttpsError('resource-exhausted', 'Block list limit reached');
  }
  const batch = db.batch();
  batch.set(ref, { createdAt: Date.now(), source: 'friends' });
  // зачем: заблокированный не должен оставаться во входящих заявках; удаление несуществующего документа безвредно.
  batch.delete(db.collection('users').doc(call.ownerUid).collection('friend_requests').doc(call.actorUid));
  await batch.commit();
  console.log('[FRIEND-BLOCK] block: done', { totalBefore: total });
  return { ok: true, blocked: true, alreadyBlocked: false };
});

export const friendUnblockUser = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const call = readBlockCall(request, 'unblock');
  const db = admin.firestore();
  await assertOwner(db, call, 'unblock');
  // delete() идемпотентен: отсутствие документа — не ошибка.
  await db.collection('users').doc(call.ownerUid).collection(FRIEND_BLOCKED_COLLECTION).doc(call.actorUid).delete();
  console.log('[FRIEND-BLOCK] unblock: done');
  return { ok: true, blocked: false };
});
