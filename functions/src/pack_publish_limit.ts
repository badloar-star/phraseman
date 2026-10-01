import { HttpsError } from 'firebase-functions/v2/https';

/**
 * зачем: Q55 / PM-018-A2 — защита от флуда каталога сообществом. Один человек
 * (Free и Plus одинаково) может опубликовать не больше 3 НОВЫХ наборов в сутки.
 * Правка уже опубликованного своего набора и повтор той же заявки (тот же
 * submissionKey) лимит не тратят. Админ лимитом не ограничен.
 *
 * Окно — календарные сутки UTC: счётчик `users/{stableId}/pack_publish_limits/community_pack`
 * = { dayKey: 'YYYY-MM-DD', count }. Скользящие 24 часа потребовали бы хранить
 * список меток времени; суточный счётчик — один документ и одна транзакция.
 * Минус: сброс в полночь UTC, а не через 24 ч после первой публикации.
 */
export const PACK_PUBLISH_DAILY_LIMIT = 3;
export const PACK_PUBLISH_LIMIT_COLLECTION = 'pack_publish_limits';
export const PACK_PUBLISH_LIMIT_DOC = 'community_pack';
export const PACK_PUBLISH_LIMIT_REASON = 'publish_daily_limit';

const DAY_MS = 86_400_000;
const LOG = '[PACK-PUBLISH-LIMIT]';

export function packPublishDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export type PackPublishQuota = Readonly<{
  allowed: boolean;
  dayKey: string;
  /** Сколько уже опубликовано в текущих сутках (до этой попытки). */
  usedBefore: number;
  /** Что записать в счётчик, если попытка пройдёт. */
  nextCount: number;
  resetAtMs: number;
}>;

/** Чистое решение: хватает ли человеку суточного лимита. Вход — документ счётчика (или undefined). */
export function evaluatePackPublishQuota(
  counter: Record<string, unknown> | undefined,
  nowMs: number,
  limit: number = PACK_PUBLISH_DAILY_LIMIT,
): PackPublishQuota {
  const dayKey = packPublishDayKey(nowMs);
  const sameDay = counter?.dayKey === dayKey;
  const rawCount = sameDay ? Number(counter?.count) : 0;
  const usedBefore = Number.isFinite(rawCount) && rawCount > 0 ? Math.floor(rawCount) : 0;
  const dayStart = Date.parse(`${dayKey}T00:00:00.000Z`);
  return {
    allowed: usedBefore < limit,
    dayKey,
    usedBefore,
    nextCount: usedBefore + 1,
    resetAtMs: dayStart + DAY_MS,
  };
}

type TxLike = {
  get(ref: FirebaseFirestore.DocumentReference): Promise<FirebaseFirestore.DocumentSnapshot>;
  set(ref: FirebaseFirestore.DocumentReference, data: Record<string, unknown>): unknown;
};

export type PackPublishSlot = Readonly<{
  ref: FirebaseFirestore.DocumentReference;
  quota: PackPublishQuota;
}>;

/**
 * ЧТЕНИЕ счётчика внутри транзакции (до любых записей транзакции) + решение.
 * Бросает resource-exhausted/publish_daily_limit, если лимит исчерпан.
 */
export async function readPackPublishSlot(
  tx: TxLike,
  db: FirebaseFirestore.Firestore,
  stableId: string,
  nowMs: number,
): Promise<PackPublishSlot> {
  const ref = db.collection('users').doc(stableId)
    .collection(PACK_PUBLISH_LIMIT_COLLECTION).doc(PACK_PUBLISH_LIMIT_DOC);
  const snap = await tx.get(ref);
  const quota = evaluatePackPublishQuota(snap.exists ? snap.data() : undefined, nowMs);
  if (!quota.allowed) {
    console.warn(`${LOG} отказ: stableId=${stableId} day=${quota.dayKey} used=${quota.usedBefore}/${PACK_PUBLISH_DAILY_LIMIT} resetAtMs=${quota.resetAtMs}`);
    throw new HttpsError(
      'resource-exhausted',
      PACK_PUBLISH_LIMIT_REASON,
      { reason: PACK_PUBLISH_LIMIT_REASON, limit: PACK_PUBLISH_DAILY_LIMIT, resetAtMs: quota.resetAtMs },
    );
  }
  console.log(`${LOG} слот занят: stableId=${stableId} day=${quota.dayKey} used=${quota.usedBefore}->${quota.nextCount}/${PACK_PUBLISH_DAILY_LIMIT}`);
  return { ref, quota };
}

/** ЗАПИСЬ счётчика — в той же транзакции, что и создание заявки. */
export function writePackPublishSlot(tx: TxLike, slot: PackPublishSlot, nowMs: number): void {
  tx.set(slot.ref, { dayKey: slot.quota.dayKey, count: slot.quota.nextCount, updatedAtMs: nowMs });
}
