import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLink } from './cloud_sync';

// ── Types ──────────────────────────────────────────────────────────────────────

export type FriendEventType =
  | 'level_up'
  | 'lesson_complete'
  | 'achievement'
  | 'streak_milestone'
  | 'arena_rank_up'
  | 'arena_rank_down'
  | 'friend_gift_sent'
  | 'friend_gift_received';

export interface FriendEvent {
  id: string;
  uid: string;
  type: FriendEventType;
  ts: number;
  activityLikeCount?: number;
  /** Уровень (level_up); lesson_complete — не из квизов; achievement; streak_milestone; arena_rank_* */
  payload: Record<string, string | number>;
}

const CACHE_KEY = 'friends_activity_feed_v2';
const LEGACY_CACHE_KEYS = ['friends_activity_feed_v1'];
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
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

const getCurrentAuthUid = (): string | null => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/auth').default().currentUser?.uid ?? null;
  } catch { return null; }
};

/**
 * Self-registers users/{ownerStableId}/friend_auth_edges/{myAuthUid} so the my_events
 * read rule can verify the requester is a friend (rules can't map authUid -> stableId).
 * The create-gate in firestore.rules re-checks the owner->me friendship edge + identity,
 * so writing this is harmless if not actually friends (it would be rejected). Idempotent:
 * a 'merge: true' set on an existing edge is cheap; failures are swallowed (read still tries).
 */
async function ensureFriendAuthEdge(
  db: ReturnType<typeof getDb>,
  ownerStableId: string,
  myStableId: string,
  myAuthUid: string,
): Promise<void> {
  if (!db) return;
  try {
    await db
      .collection('users')
      .doc(ownerStableId)
      .collection('friend_auth_edges')
      .doc(myAuthUid)
      .set({ readerStableId: myStableId, createdAt: Date.now() }, { merge: true });
  } catch { /* not friends / transient — read will simply yield nothing for this owner */ }
}

// ── Write my own event ────────────────────────────────────────────────────────

/**
 * Friend activity is server-owned. Verified level/streak changes and gift events
 * are written by Cloud Functions, while this client hook remains as a no-op for
 * old call sites that used to write spoofable feed records.
 */
export async function writeFriendEvent(
  type: FriendEventType,
  payload: Record<string, string | number>,
): Promise<void> {
  // Friend activity writes are server-owned now; keep old call sites harmless.
  void type;
  void payload;
  return;
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

  // Перед чтением чужого my_events регистрируем reverse-edge friend_auth_edges, иначе
  // правило (rules не умеют authUid -> stableId) отвергнет чтение и лента будет пустой.
  // Нужны мой stableId + authUid + записанный firebaseAuthUid (forward-проверка правила).
  const myStableId = await ensureAnonUser().catch(() => null);
  const myAuthUid = getCurrentAuthUid();
  if (myStableId && myAuthUid) {
    await ensureStableAuthLink().catch(() => false);
    await Promise.all(
      friendUids.map(uid => ensureFriendAuthEdge(db, uid, myStableId, myAuthUid)),
    );
  }

  try {
    const perFriendSnaps = await Promise.all(
      friendUids.map(async uid => ({
        uid,
        snap: await db
          .collection('users')
          .doc(uid)
          .collection('my_events')
          .orderBy('ts', 'desc')
          .limit(MAX_EVENTS_PER_FRIEND)
          .get()
          .catch(() => null),
      })),
    );

    const events: FriendEvent[] = [];
    for (const { uid, snap } of perFriendSnaps) {
      if (!snap) continue;
      for (const doc of snap.docs as Array<{ id: string; data: () => Record<string, unknown> }>) {
        const d = doc.data();
        if (!d.type || !d.ts) continue;
        events.push({
          id: doc.id,
          uid,
          type: d.type as FriendEventType,
          ts: Number(d.ts),
          activityLikeCount: Math.max(0, Math.floor(Number(d.activityLikeCount ?? 0) || 0)),
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
    await AsyncStorage.multiRemove([CACHE_KEY, ...LEGACY_CACHE_KEYS]);
  } catch { /* ignore */ }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
