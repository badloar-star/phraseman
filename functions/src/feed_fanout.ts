/**
 * Fan-out ленты активности друзей (убирает N+1 на клиенте).
 *
 * Было: клиент на каждое открытие «Активности» делал N запросов users/{friendUid}/my_events
 * (+ N записей friend_auth_edges). Стало: сервер при появлении события в
 * users/{uid}/my_events/{eventId} копирует его в users/{friendUid}/feed/{eventId},
 * а клиент читает свою ленту ОДНИМ запросом users/{me}/feed orderBy ts desc limit 50.
 *
 * Запись в feed — только Admin SDK (rules: read owner, write false).
 * expiresAt — TTL-маркер для feedPruneCron (Firestore TTL policy можно включить
 * дополнительно по этому же полю — см. PATCHES.md).
 *
 * TODO(integration): fan-out покрывает только НОВЫЕ события. Для существующих
 * my_events нужен разовый backfill (скрипт по users/{uid}/my_events) — см. PATCHES.md.
 */
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

const REGION = 'us-central1';
const USERS = 'users';
/** Кап fan-out: сверх этого числа друзей событие не разносим (защита от аномалий). */
const MAX_FANOUT_FRIENDS = 500;
/** Сколько записей feed живут (30 дней), дальше чистит feedPruneCron / Firestore TTL. */
const FEED_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Лимит записей в одном batch (Firestore max 500 — держим запас). */
const BATCH_LIMIT = 450;
/** Страница чтения при prune collectionGroup-запросом. */
const PRUNE_PAGE_SIZE = 500;

interface FanoutEventData {
  type?: unknown;
  ts?: unknown;
  payload?: unknown;
  activityLikeCount?: unknown;
}

/**
 * my_events → feed всех друзей. Идемпотентно: docId в feed = исходный eventId,
 * повторная доставка триггера просто перезапишет тот же документ (merge).
 */
export const feedFanoutOnMyEvent = onDocumentCreated(
  { region: REGION, document: 'users/{uid}/my_events/{eventId}' },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const authorUid = String(event.params.uid ?? '').trim();
    if (!authorUid) return;
    const data = snap.data() as FanoutEventData;
    if (!data.type || !data.ts) return;

    const db = admin.firestore();
    const friendsSnap = await db
      .collection(USERS)
      .doc(authorUid)
      .collection('friends')
      .limit(MAX_FANOUT_FRIENDS)
      .get();
    if (friendsSnap.empty) return;

    const expiresAt = Date.now() + FEED_TTL_MS;
    const feedDoc = {
      uid: authorUid,
      type: data.type,
      ts: Number(data.ts),
      payload: (data.payload as Record<string, string | number> | undefined) ?? {},
      activityLikeCount: Math.max(0, Math.floor(Number(data.activityLikeCount ?? 0) || 0)),
      expiresAt,
    };

    let batch = db.batch();
    let pending = 0;
    let fanned = 0;
    for (const friendDoc of friendsSnap.docs) {
      const ref = db.collection(USERS).doc(friendDoc.id).collection('feed').doc(snap.id);
      batch.set(ref, feedDoc, { merge: true });
      pending += 1;
      fanned += 1;
      if (pending >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
    }
    if (pending > 0) await batch.commit();

    console.log(JSON.stringify({ event: 'feed_fanout', authorUid, eventId: snap.id, friends: fanned }));
  },
);

/**
 * Удаляет feed-записи с истёкшим expiresAt. Страницами по 500, пока не кончатся.
 * Экспортируется отдельно от cron — для тестов/ручного прогона.
 *
 * TODO(deploy): нужен composite-индекс collectionGroup(feed) на expiresAt — см. PATCHES.md.
 */
export async function pruneExpiredFeedBatch(): Promise<{ deleted: number }> {
  const db = admin.firestore();
  let deleted = 0;
  // Ограничиваем общий объём за прогон, чтобы cron не упирался в timeout на аномалиях.
  const maxPerRun = 20000;
  while (deleted < maxPerRun) {
    const snap = await db
      .collectionGroup('feed')
      .where('expiresAt', '<=', Date.now())
      .limit(PRUNE_PAGE_SIZE)
      .get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    deleted += snap.size;
    if (snap.size < PRUNE_PAGE_SIZE) break;
  }
  console.log(JSON.stringify({ event: 'feed_prune_done', deleted }));
  return { deleted };
}

export const feedPruneCron = functions.scheduler.onSchedule(
  { schedule: 'every 24 hours', timeZone: 'UTC', region: REGION, memory: '512MiB', timeoutSeconds: 540 },
  async () => {
    await pruneExpiredFeedBatch();
  },
);
