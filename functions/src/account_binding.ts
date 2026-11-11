// account_binding.ts — серверная привязка «Firebase Auth uid → стабильный аккаунт + поколение аккаунта».
//
// зачем: практика ошибок и её награды (mistake_practice_event_sync / mistake_practice_wallet_reward) читают привязку
// аккаунта через эти функции. Раньше они жили внутри серверного контура удалённого курса; курс убран, а привязка
// нужна живым функциям — поэтому она вынесена сюда без изменения поведения и кодов отказа.
import {
  accountStateFromSnapshots,
  assertAccountUsable,
} from './account_gate';
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

const ACCOUNT_DELETE_TOMBSTONES = 'account_deletion_tombstones';
const AUTH_LINKS = 'auth_links';

export type ProgressAccountBinding = Readonly<{
  stableUid: string;
  accountGeneration: number;
}>;

/** Firebase Auth UIDs are opaque, but must be non-empty and bounded. */
export function normalizeProgressAuthUid(value: unknown): string {
  if (typeof value !== 'string') {
    throw new HttpsError('unauthenticated', 'authentication_required');
  }
  const uid = value.trim();
  if (!uid || uid.length > 128) {
    throw new HttpsError('unauthenticated', 'authentication_required');
  }
  return uid;
}

export function normalizeProgressStableUid(value: unknown): string {
  if (typeof value !== 'string') {
    throw new HttpsError('failed-precondition', 'stable_id_required');
  }
  const stableUid = value.trim();
  if (
    !/^[A-Za-z0-9._-]{1,160}$/.test(stableUid) ||
    stableUid === '.' ||
    stableUid === '..'
  ) {
    throw new HttpsError('failed-precondition', 'stable_id_required');
  }
  return stableUid;
}

function normalizeProgressGeneration(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new HttpsError('failed-precondition', 'account_generation_unavailable');
  }
  return value as number;
}

export const INITIAL_ACCOUNT_GENERATION = 1;

/**
 * Заводит accountGeneration=1 первому обратившемуся аккаунту, у которого поля нет.
 *
 * зачем (инцидент 2026-08-24): поле читали пять серверных путей, но НЕ ПИСАЛ
 * НИКТО — ни регистрация, ни удаление аккаунта. На проде оно отсутствовало у
 * всех 1203 пользователей, поэтому progressSubmitEvent отвечал
 * `account_generation_unavailable`, клиент бесконечно клал событие обратно в
 * очередь, и серверный прогресс не работал ни у кого с самого начала
 * (0 принятых событий за всё время).
 *
 * Инициализация безопасна для смысла поля (счётчик пересозданий аккаунта):
 *  - транзакция пишет значение ТОЛЬКО когда его нет, существующее (в том числе
 *    поднятое будущим удалением/восстановлением) никогда не перезаписывается;
 *  - барьер удаления (tombstone) проверяется ДО инициализации, поэтому аккаунт
 *    «в процессе удаления» поля не получит;
 *  - гонка двух параллельных вызовов разрешается транзакцией: второй прочитает
 *    уже записанное значение.
 * Стоимость: одна запись на аккаунт за всю его жизнь.
 */
async function ensureAccountGeneration(
  db: admin.firestore.Firestore,
  stableUid: string,
  existing: unknown,
): Promise<number> {
  if (Number.isSafeInteger(existing) && (existing as number) >= 1) return existing as number;
  const userRef = db.collection('users').doc(stableUid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const current = snap.data()?.accountGeneration ?? snap.data()?.generation;
    if (Number.isSafeInteger(current) && (current as number) >= 1) return current as number;
    tx.set(userRef, { accountGeneration: INITIAL_ACCOUNT_GENERATION }, { merge: true });
    return INITIAL_ACCOUNT_GENERATION;
  });
}

/** Read a strict server-owned auth anchor, generation, and deletion barrier. */
export async function readProgressAccountBinding(
  db: admin.firestore.Firestore,
  authUid: string,
): Promise<ProgressAccountBinding> {
  const normalizedAuthUid = normalizeProgressAuthUid(authUid);
  const authLinkSnapshot = await db.collection(AUTH_LINKS).doc(normalizedAuthUid).get();
  if (!authLinkSnapshot.exists) {
    throw new HttpsError('failed-precondition', 'progress_identity_anchor_missing');
  }
  const stableUid = normalizeProgressStableUid(authLinkSnapshot.data()?.stable_id);
  const [userSnap, tombstoneSnap] = await Promise.all([
    db.collection('users').doc(stableUid).get(),
    db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableUid).get(),
  ]);
  // зачем через ЕДИНУЮ ДВЕРЬ (этап 1): прогресс в удаляемый аккаунт не пишем в
  // любом случае, но код отказа обязан быть честным — внутри 14 дней аккаунт
  // ещё можно вернуть, после них уже нет.
  assertAccountUsable(accountStateFromSnapshots({ marker: tombstoneSnap, subject: 'stable' }));
  const data = userSnap.data() ?? {};
  // accountGeneration — актуальное имя поля; generation принимается только как старое серверное поле.
  const accountGeneration = normalizeProgressGeneration(
    await ensureAccountGeneration(db, stableUid, data.accountGeneration ?? data.generation),
  );
  return Object.freeze({ stableUid, accountGeneration });
}
