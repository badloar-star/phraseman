// ════════════════════════════════════════════════════════════════════════════
// constellations/queue.ts — очередь и подбор (спек B1–B3).
//
// Отдельная constellation_queue (дуэльную matchmaking_queue НЕ трогаем, B1).
// Мгновенный матч на записи в очередь (4 живых), cron раз в минуту: добор
// ботами ждущих дольше bot_fill_delay (дефолт 30с), чистка протухших,
// watchdog фаз, live-счётчик поиска в app_meta (паттерн дуэльного подборщика).
// ════════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { resolveConstellationConfig } from './config';
import { constellationWatchdogTick, createConstellationMatch, type HumanEntry } from './match_service';

const db = admin.firestore();

const QUEUE = 'constellation_queue';
const APP_META_SEARCHING = 'app_meta/constellation_searching';
const QUEUE_WINDOW_LIMIT = 200;
const STALE_ENTRY_MS = 15 * 60 * 1000;
const MATCHED_TTL_MS = 2 * 60 * 1000;
/** Разрешённые ступени ставки (C3). */
const WAGER_TIERS = new Set([0, 1, 2, 5]);

interface QueueDoc {
  userId?: string;
  joinedAt?: number;
  displayName?: string;
  rankIndex?: number;
  searchRange?: number;
  expoPushToken?: string;
  wager?: number;
  matchId?: string | null;
  matchedAt?: number;
}

interface QueueEntry extends QueueDoc {
  id: string;
}

function toHuman(e: QueueEntry): HumanEntry {
  const out: HumanEntry = { userId: e.userId ?? e.id };
  if (typeof e.displayName === 'string') out.displayName = e.displayName;
  if (typeof e.rankIndex === 'number') out.rankIndex = e.rankIndex;
  if (typeof e.wager === 'number' && WAGER_TIERS.has(e.wager)) out.wager = e.wager;
  if (typeof e.expoPushToken === 'string') out.expoPushToken = e.expoPushToken;
  return out;
}

async function readQueueWindow(): Promise<QueueEntry[]> {
  const snap = await db.collection(QUEUE)
    .orderBy('joinedAt')
    .limit(QUEUE_WINDOW_LIMIT)
    .get();
  return snap.docs.map((d) => ({ ...(d.data() as QueueDoc), id: d.id }));
}

function rankDistance(a: QueueEntry, b: QueueEntry): number {
  return Math.abs((a.rankIndex ?? 0) - (b.rankIndex ?? 0));
}

/** Кандидаты в матч к entry: диапазон рангов с взаимным расширением, ближние первыми. */
function pickCandidates(entry: QueueEntry, pool: QueueEntry[], need: number): QueueEntry[] {
  const inRange = pool.filter((e) => {
    const range = Math.max(entry.searchRange ?? 3, e.searchRange ?? 3);
    return rankDistance(entry, e) <= range;
  });
  const source = inRange.length >= need ? inRange : pool; // малая база — матчим ближних
  return [...source]
    .sort((a, b) => rankDistance(entry, a) - rankDistance(entry, b) || a.id.localeCompare(b.id))
    .slice(0, need);
}

/** Мгновенная попытка собрать матч 4 живых при записи в очередь (B2: без экрана принятия). */
export async function tryMatchConstellationUser(userId: string): Promise<void> {
  const selfSnap = await db.collection(QUEUE).doc(userId).get();
  if (!selfSnap.exists) return;
  const self: QueueEntry = { ...(selfSnap.data() as QueueDoc), id: selfSnap.id };
  if (self.matchId) return;

  const pool = (await readQueueWindow())
    .filter((e) => !e.matchId && e.id !== userId);
  const others = pickCandidates(self, pool, 3);
  if (others.length < 3) return; // ботов доберёт cron после bot_fill_delay

  try {
    await createConstellationMatch([self, ...others].map(toHuman));
  } catch (e) {
    // Гонка транзакции (кто-то уже заматчен) — нормально, следующий триггер добьёт.
    console.warn('tryMatchConstellationUser race', e);
  }
}

/** Минутный cron: полные матчи → добор ботами → чистка → watchdog → счётчик. */
export async function constellationQueueCron(): Promise<void> {
  const now = Date.now();
  const cfg = await resolveConstellationConfig(db);
  const window = await readQueueWindow();

  // Протухшие записи поиска (игрок давно ушёл).
  const stale = window.filter((e) => !e.matchId && now - (e.joinedAt ?? 0) > STALE_ENTRY_MS);
  const matchedStale = window.filter(
    (e) => e.matchId && now - (e.matchedAt ?? e.joinedAt ?? 0) > MATCHED_TTL_MS,
  );
  if (stale.length + matchedStale.length > 0) {
    const batch = db.batch();
    for (const e of [...stale, ...matchedStale]) batch.delete(db.collection(QUEUE).doc(e.id));
    await batch.commit();
  }

  let waiting = window.filter(
    (e) => !e.matchId && now - (e.joinedAt ?? 0) <= STALE_ENTRY_MS,
  );

  // Сначала полные человеческие матчи.
  while (waiting.length >= 4) {
    const entry = waiting[0];
    const others = pickCandidates(entry, waiting.slice(1), 3);
    const picked = [entry, ...others];
    const pickedIds = new Set(picked.map((p) => p.id));
    waiting = waiting.filter((e) => !pickedIds.has(e.id));
    try {
      await createConstellationMatch(picked.map(toHuman));
    } catch (e) {
      console.warn('constellationQueueCron full-match race', e);
    }
  }

  // Добор ботами: ждут дольше bot_fill_delay → матч немедленно (B3, минимум 1 живой).
  const overdue = waiting.filter(
    (e) => now - (e.joinedAt ?? 0) >= cfg.matchmaking.botFillDelaySec * 1000,
  );
  while (overdue.length > 0) {
    const group = overdue.splice(0, 3); // до 3 людей в один бото-матч
    try {
      await createConstellationMatch(group.map(toHuman));
    } catch (e) {
      console.warn('constellationQueueCron bot-fill race', e);
    }
  }

  await constellationWatchdogTick();

  try {
    const count = (await db.collection(QUEUE).count().get()).data().count ?? 0;
    await db.doc(APP_META_SEARCHING).set({ searchingCount: count, updatedAt: now }, { merge: true });
  } catch (e) {
    console.warn('constellation searching count', e);
  }
}
