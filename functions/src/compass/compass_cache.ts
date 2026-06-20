/**
 * Компас — кэш тёплого комментария дня. Клон паттерна explain_cache.
 *
 * Один комментарий на (подпись дня, язык) = одна генерация на ВЕСЬ продукт.
 * Подписей дня немного и они повторяются между учениками («новичок, слаб в
 * артиклях, день-ремонт»), поэтому ≥90% показов — из кэша, 0 токенов.
 *
 * SECURITY: пишет только Cloud Function (Admin SDK). firestore.rules: read public,
 * write false, delete admin. Клиент хэш не шлёт — сервер выводит из briefing-числа.
 */
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';

export const COMPASS_COLLECTION = 'compass_briefings';
export const COMPASS_LOCK_TTL_MS = 30_000;
export const COMPASS_SCHEMA_VERSION = 1;
export const COMPASS_REJECTED_RETRY_TTL_MS = 10 * 60_000;

export type CompassCacheStatus = 'pending' | 'ready' | 'rejected';

export interface CachedCompassComment {
  status: CompassCacheStatus;
  schemaVersion: number;
  comment?: string;
  lang?: string;
  reason?: string;
  model?: string;
  createdAtMs?: number;
  updatedAtMs?: number;
}

function isCurrentSchema(data: { schemaVersion?: number } | undefined | null): boolean {
  return Number(data?.schemaVersion ?? 0) >= COMPASS_SCHEMA_VERSION;
}

/**
 * Подпись дня = детерминированный отпечаток того, что определяет текст:
 * тип дня + список тем + грубый уровень. НЕ включает личные данные. Это и есть
 * ключ кэша: одинаковая подпись у тысяч учеников → одна генерация.
 */
export function compassSignature(input: {
  dayType: string;
  topics: string[];
  level: number;
}): string {
  const topics = [...input.topics].map((t) => t.trim().toLowerCase()).filter(Boolean).sort();
  return `${input.dayType}|lvl${Math.max(0, Math.floor(input.level))}|${topics.join(',')}`;
}

export function compassHashFor(signature: string, langKey: string): string {
  return createHash('sha256')
    .update(`${String(langKey ?? '').trim().toLowerCase()}|${String(signature ?? '').trim().toLowerCase()}`)
    .digest('hex')
    .slice(0, 40);
}

function docRef(hash: string) {
  return admin.firestore().collection(COMPASS_COLLECTION).doc(hash);
}

export function isRetryableRejected(
  data: { status?: string; updatedAtMs?: number } | null | undefined,
  nowMs: number,
): boolean {
  if (!data || data.status !== 'rejected') return false;
  return nowMs - Number(data.updatedAtMs ?? 0) > COMPASS_REJECTED_RETRY_TTL_MS;
}

export async function readCachedCompass(hash: string): Promise<CachedCompassComment | null> {
  const snap = await docRef(hash).get();
  const data = snap.data();
  if (!data) return null;
  if (!isCurrentSchema(data)) return null;
  return data as CachedCompassComment;
}

export async function claimCompassLock(hash: string, nowMs: number): Promise<boolean> {
  const ref = docRef(hash);
  const db = admin.firestore();
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as CachedCompassComment | undefined;
    if (data && isCurrentSchema(data)) {
      if (data.status === 'ready') return false;
      if (data.status === 'rejected' && !isRetryableRejected(data, nowMs)) return false;
      if (data.status === 'pending') {
        const stale = nowMs - Number(data.createdAtMs ?? 0) > COMPASS_LOCK_TTL_MS;
        if (!stale) return false;
      }
    }
    tx.set(ref, { status: 'pending', schemaVersion: COMPASS_SCHEMA_VERSION, reason: null, createdAtMs: nowMs, updatedAtMs: nowMs }, { merge: true });
    return true;
  });
}

export async function writeReadyCompass(hash: string, comment: string, meta: { lang: string; model?: string }): Promise<void> {
  await docRef(hash).set(
    { status: 'ready', schemaVersion: COMPASS_SCHEMA_VERSION, comment, lang: meta.lang, model: meta.model ?? null, reason: null, updatedAtMs: Date.now() },
    { merge: true },
  );
}

export async function writeRejectedCompass(hash: string, reason: string): Promise<void> {
  await docRef(hash).set({ status: 'rejected', schemaVersion: COMPASS_SCHEMA_VERSION, reason, updatedAtMs: Date.now() }, { merge: true });
}
