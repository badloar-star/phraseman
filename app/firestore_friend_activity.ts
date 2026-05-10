import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser } from './cloud_sync';
import { getAuthUserId } from './user_id_policy';

// ── Types ──────────────────────────────────────────────────────────────────────

export type FriendEventType =
  | 'level_up'
  | 'lesson_complete'
  | 'achievement'
  | 'streak_milestone'
  | 'arena_rank_up'
  | 'arena_rank_down';

export interface FriendEvent {
  id: string;
  uid: string;
  type: FriendEventType;
  ts: number;
  /** Уровень (level_up); lesson_complete — не из квизов; achievement; streak_milestone; arena_rank_* */
  payload: Record<string, string | number>;
}

const CACHE_KEY = 'friends_activity_feed_v1';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 минут — не фетчим чаще
const MAX_EVENTS_PER_FRIEND = 15;

/** Стабильный id для level_up — клиент и Cloud Function пишут один документ, без дублей в ленте. */
function friendEventDocId(type: FriendEventType, payload: Record<string, string | number>): string {
  if (type === 'level_up') {
    const lv = Number(payload.level);
    if (Number.isFinite(lv)) return `level_up_${Math.trunc(lv)}`;
  }
  return `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── Firestore accessor ────────────────────────────────────────────────────────

const getDb = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    return require('@react-native-firebase/firestore').default();
  } catch { return null; }
};

// ── Write my own event ────────────────────────────────────────────────────────

/**
 * Записывает событие в users/{myUid}/my_events/{eventId}.
 * Хранит последние MAX_EVENTS_PER_FRIEND событий — старые удаляются.
 * Вызывается в точках: level_up (xp_manager), achievement (achievements.ts).
 * Квизы в ленту не пишутся (тип lesson_complete оставлен для старых записей / при желании — экран урока).
 * Перед записью кладём firebaseAuthUid на корень users/{uid} — иначе правила my_events
 * отклоняют запись, если синк ещё не успел (ensureAnonUser даёт stable id ≠ auth.uid).
 * Fire-and-forget: ошибки тихо игнорируются, чтобы не мешать основному флоу.
 */
export async function writeFriendEvent(
  type: FriendEventType,
  payload: Record<string, string | number>,
): Promise<void> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return;
  try {
    const myUid = await ensureAnonUser();
    if (!myUid) return;
    const db = getDb();
    if (!db) return;

    const firebaseAuthUidRow = getAuthUserId();
    if (firebaseAuthUidRow) {
      await db.collection('users').doc(myUid).set({ firebaseAuthUid: firebaseAuthUidRow }, { merge: true });
    }

    const eventId = friendEventDocId(type, payload);
    await db
      .collection('users')
      .doc(myUid)
      .collection('my_events')
      .doc(eventId)
      .set({ type, payload, ts: Date.now(), uid: myUid });

    // Cleanup: оставляем только последние MAX_EVENTS_PER_FRIEND штук
    void pruneOldEvents(db, myUid);
  } catch {
    /* ignore */
  }
}

async function pruneOldEvents(db: NonNullable<ReturnType<typeof getDb>>, myUid: string): Promise<void> {
  try {
    const snap = await db
      .collection('users')
      .doc(myUid)
      .collection('my_events')
      .orderBy('ts', 'desc')
      .get();

    const docs = snap.docs as Array<{ id: string; ref: { delete: () => Promise<void> } }>;
    if (docs.length <= MAX_EVENTS_PER_FRIEND) return;

    const toDelete = docs.slice(MAX_EVENTS_PER_FRIEND);
    await Promise.all(toDelete.map((d) => d.ref.delete()));
  } catch {
    /* ignore */
  }
}

// ── Read friends' activity feed ───────────────────────────────────────────────

interface FeedCache {
  events: FriendEvent[];
  fetchedAt: number;
}

/**
 * Загружает ленту активности друзей с SWR-кешем (30 мин).
 * @param friendUids — список uid друзей из subscribeToFriends
 * @param forceRefresh — игнорировать TTL и загрузить заново
 */
export async function fetchFriendsActivityFeed(
  friendUids: string[],
  forceRefresh = false,
): Promise<FriendEvent[]> {
  if (friendUids.length === 0) return [];

  // 1. Читаем кеш
  let cached: FeedCache | null = null;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) cached = JSON.parse(raw) as FeedCache;
  } catch { /* ignore */ }

  const now = Date.now();
  if (!forceRefresh && cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.events;
  }

  // 2. Фетч из Firestore
  const db = getDb();
  if (!db) return cached?.events ?? [];

  try {
    const perFriendSnaps = await Promise.all(
      friendUids.map(uid =>
        db
          .collection('users')
          .doc(uid)
          .collection('my_events')
          .orderBy('ts', 'desc')
          .limit(MAX_EVENTS_PER_FRIEND)
          .get()
          .catch(() => null),
      ),
    );

    const events: FriendEvent[] = [];
    for (const snap of perFriendSnaps) {
      if (!snap) continue;
      for (const doc of snap.docs as Array<{ id: string; data: () => Record<string, unknown> }>) {
        const d = doc.data();
        if (!d.type || !d.ts || !d.uid) continue;
        events.push({
          id: doc.id,
          uid: String(d.uid),
          type: d.type as FriendEventType,
          ts: Number(d.ts),
          payload: (d.payload as Record<string, string | number>) ?? {},
        });
      }
    }

    // Сортируем по убыванию времени
    events.sort((a, b) => b.ts - a.ts);

    const feed: FeedCache = { events, fetchedAt: now };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(feed));
    return events;
  } catch {
    return cached?.events ?? [];
  }
}

/** Принудительно сбросить кеш ленты (например после добавления нового друга). */
export async function invalidateFriendsActivityCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch { /* ignore */ }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
