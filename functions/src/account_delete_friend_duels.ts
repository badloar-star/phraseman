import * as admin from 'firebase-admin';
import { createHash } from 'crypto';

/**
 * Удаление аккаунта и общие дуэли друзей: история остаётся у друга, удалённый — обезличен.
 *
 * ЗАМОК ВЛАДЕЛЬЦА 22.10: «Друг удалил аккаунт. Что видно в ваших общих дуэлях?» → «История остаётся, имя скрыто».
 * зачем: раньше удаление стирало дуэли и уведомления об итогах у друга целиком — у друга пропадала его же история.
 * Теперь законченные дуэли и уведомления об итоге остаются у выжившего друга, а uid, ник и аватар удалённого
 * убираются. uid входит в id документа дуэли и в id уведомления, поэтому запись перекладывается под новый id
 * (anon_<sha256 старого id>), а старая удаляется. Открытые вызовы ответить уже нельзя — они стираются как раньше.
 * Страховка: если шаг упадёт, общий шаг удаления (FIELD_QUERY_SPECS / notifications fromUid) сотрёт остатки —
 * при сбое теряется история, но не приватность.
 */

const LOG = '[ACCOUNT-DELETE]';
const BATCH = 200;
/** Итоги, которые остаются в истории друга. Вызов (duel_challenge) без ответа удалённого — не история. */
const KEPT_NOTIFICATION_ACTIONS: ReadonlySet<string> = new Set(['duel_result', 'duel_declined']);
const KEPT_DUEL_STATUSES: ReadonlySet<string> = new Set(['finished', 'declined', 'expired']);

type Doc = Readonly<Record<string, unknown>>;
type Stats = { docsDeleted: number; docsUpdated: number; queriesRun: number };

/** Новый id без uid: одинаков для дуэли и для ссылок на неё в уведомлениях. */
export function anonymizedDuelId(duelId: string): string {
  return `anon_${createHash('sha256').update(duelId).digest('hex').slice(0, 32)}`;
}

/** Обезличенная дуэль для выжившего друга; null — хранить нечего (открытая, чужая, оба удалены). */
export function anonymizeDuelDoc(data: Doc, deletedUid: string): Readonly<{ survivorUid: string; doc: Record<string, unknown> }> | null {
  const uids = Array.isArray(data.uids) ? data.uids.filter((u): u is string => typeof u === 'string') : [];
  if (!uids.includes(deletedUid)) return null;
  const survivorUid = uids.find((u) => u !== deletedUid) ?? null;
  if (!survivorUid || !KEPT_DUEL_STATUSES.has(String(data.status))) return null;
  const deletedRole = data.challengerUid === deletedUid ? 'challenger' : 'opponent';
  return Object.freeze({
    survivorUid,
    doc: {
      ...data,
      uids: [survivorUid],
      challengerUid: deletedRole === 'challenger' ? null : data.challengerUid,
      opponentUid: deletedRole === 'opponent' ? null : data.opponentUid,
      deletedPlayerRole: deletedRole,
      anonymizedAtMs: Date.now(),
    },
  });
}

/** Обезличенное уведомление об итоге у друга; null — не итог дуэли (стирается общим шагом). */
export function anonymizeDuelNotification(data: Doc): Readonly<{ newId: string; doc: Record<string, unknown> }> | null {
  const nav = data.nav && typeof data.nav === 'object' && !Array.isArray(data.nav) ? data.nav as Record<string, unknown> : null;
  const action = nav ? String(nav.action ?? '') : '';
  const duelId = nav && typeof nav.duelId === 'string' ? nav.duelId : '';
  if (!nav || !KEPT_NOTIFICATION_ACTIONS.has(action) || !duelId) return null;
  const anonDuelId = anonymizedDuelId(duelId);
  const eventId = `friend_${action}_${anonDuelId}`;
  const navRest = Object.fromEntries(Object.entries(nav).filter(([key]) => key !== 'actorStableUid'));
  return Object.freeze({
    newId: eventId,
    doc: {
      ...data,
      fromUid: '',
      fromName: '',
      fromAvatar: '',
      // зачем: телефон показывает «Удалённый игрок» вместо ника и аватара (клиент 8 · МОМЕНТЫ).
      fromDeleted: true,
      nav: { ...navRest, duelId: anonDuelId, eventId },
      updatedAt: Date.now(),
    },
  });
}

async function anonymizeDuels(db: admin.firestore.Firestore, deletedUid: string, stats: Stats): Promise<{ kept: number; dropped: number }> {
  let kept = 0;
  let dropped = 0;
  for (;;) {
    stats.queriesRun += 1;
    const snap = await db.collection('friend_duels').where('uids', 'array-contains', deletedUid).limit(BATCH).get();
    if (snap.empty) return { kept, dropped };
    const batch = db.batch();
    for (const doc of snap.docs) {
      const anon = anonymizeDuelDoc(doc.data(), deletedUid);
      if (anon) {
        batch.set(db.collection('friend_duels').doc(anonymizedDuelId(doc.id)), anon.doc);
        stats.docsUpdated += 1;
        kept += 1;
      } else {
        dropped += 1;
      }
      // зачем: каждая найденная дуэль уходит из выборки (переложена или стёрта) — цикл конечен.
      batch.delete(doc.ref);
      stats.docsDeleted += 1;
    }
    await batch.commit();
  }
}

async function anonymizeNotifications(db: admin.firestore.Firestore, deletedUid: string, stats: Stats): Promise<number> {
  let moved = 0;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    stats.queriesRun += 1;
    let query = db.collectionGroup('notifications').where('fromUid', '==', deletedUid).limit(BATCH);
    if (cursor) query = query.startAfter(cursor);
    const snap = await query.get();
    if (snap.empty) return moved;
    cursor = snap.docs[snap.docs.length - 1];
    const batch = db.batch();
    let writes = 0;
    for (const doc of snap.docs) {
      const anon = anonymizeDuelNotification(doc.data());
      // остальные уведомления удалённого стирает общий шаг collection_group_matches
      if (!anon) continue;
      batch.set(doc.ref.parent.doc(anon.newId), anon.doc);
      batch.delete(doc.ref);
      writes += 1;
    }
    if (writes > 0) {
      await batch.commit();
      stats.docsUpdated += writes;
      moved += writes;
    }
    if (snap.size < BATCH) return moved;
  }
}

/** Шаг удаления аккаунта: ДО field_matches/collection_group_matches, которые стёрли бы историю друга. */
export async function anonymizeFriendDuelsForDeletedPlayer(
  db: admin.firestore.Firestore,
  deletedUid: string,
  stats: Stats,
): Promise<void> {
  const duels = await anonymizeDuels(db, deletedUid, stats);
  const notifications = await anonymizeNotifications(db, deletedUid, stats);
  console.log(`${LOG} friend_duels anonymized ${JSON.stringify({ kept: duels.kept, dropped: duels.dropped, notifications })}`);
}
