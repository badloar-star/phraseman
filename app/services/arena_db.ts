import firestore from '@react-native-firebase/firestore';
import {
  ArenaProfile, ArenaSession, SessionPlayer, LobbyChoice,
  ArenaRoom, MatchmakingEntry, ArenaQuestion,
  RankTier, RematchStatus, REMATCH_TTL_MS,
} from '../types/arena';

// ─── Коллекции ────────────────────────────────────────────────────────────────
//
//  arena_profiles/{userId}         — профиль, ранг, статистика
//  arena_sessions/{sessionId}      — активные и завершённые сессии
//  arena_players/{sessionId_userId} — ответы и очки игрока
//  arena_rooms/{code}              — приватные комнаты
//  matchmaking_queue/{userId}     — очередь поиска
//  arena_questions/{questionId}    — банк вопросов
//
// ─────────────────────────────────────────────────────────────────────────────

const db = firestore();

const col = {
  profiles: () => db.collection('arena_profiles'),
  sessions: () => db.collection('arena_sessions'),
  sessionPlayers: () => db.collection('session_players'),
  rooms: () => db.collection('arena_rooms'),
  queue: () => db.collection('matchmaking_queue'),
  questions: () => db.collection('arena_questions'),
  /** Агрегат «сколько в поиске» — оновлює Cloud Function, див. functions/src/matchmaking.ts */
  matchmakingMeta: () => db.doc('app_meta/matchmaking_searching'),
};

// ─── Профиль ──────────────────────────────────────────────────────────────────

export async function getArenaProfile(userId: string): Promise<ArenaProfile | null> {
  const snap = await col.profiles().doc(userId).get();
  return snap.exists ? (snap.data() as ArenaProfile) : null;
}

export async function createArenaProfile(profile: ArenaProfile): Promise<void> {
  await col.profiles().doc(profile.userId).set(profile);
}

export async function updateArenaProfile(
  userId: string,
  updates: Partial<ArenaProfile>
): Promise<void> {
  await col.profiles().doc(userId).update({
    ...updates,
    updatedAt: Date.now(),
  });
}

export function subscribeArenaProfile(
  userId: string,
  onUpdate: (profile: ArenaProfile) => void
): () => void {
  return col.profiles().doc(userId).onSnapshot(snap => {
    if (snap && snap.exists) onUpdate(snap.data() as ArenaProfile);
  });
}

// ─── Сессия ───────────────────────────────────────────────────────────────────

export async function getSession(sessionId: string): Promise<ArenaSession | null> {
  const snap = await col.sessions().doc(sessionId).get();
  return snap.exists ? (snap.data() as ArenaSession) : null;
}

export function subscribeSession(
  sessionId: string,
  onUpdate: (session: ArenaSession) => void
): () => void {
  return col.sessions().doc(sessionId).onSnapshot(snap => {
    if (snap && snap.exists) onUpdate(snap.data() as ArenaSession);
  });
}

// ─── Игрок в сессии ───────────────────────────────────────────────────────────

export function subscribeSessionPlayers(
  sessionId: string,
  onUpdate: (players: SessionPlayer[]) => void
): () => void {
  return col.sessionPlayers()
    .where('sessionId', '==', sessionId)
    .onSnapshot(snap => {
      if (!snap) return;
      const players = snap.docs.map((d: any) => d.data() as SessionPlayer);
      onUpdate(players);
    });
}

export async function submitAnswer(
  sessionId: string,
  playerId: string,
  questionId: string,
  answer: string | null,
  timeMs: number
): Promise<void> {
  const docId = `${sessionId}_${playerId}`;
  await col.sessionPlayers().doc(docId).update({
    answers: firestore.FieldValue.arrayUnion({
      questionId,
      answer,
      isCorrect: false, // Cloud Function пересчитает
      timeMs,
      points: 0,
    }),
    lastSeen: Date.now(),
  });
}

/** Один раз на вопрос: «на линии», без отдельного heartbeat по секундам. */
export async function touchSessionPlayerPresence(
  sessionId: string,
  playerId: string
): Promise<void> {
  const docId = `${sessionId}_${playerId}`;
  await col.sessionPlayers().doc(docId).update({ lastSeen: Date.now() });
}

export async function setSessionLobbyChoice(
  sessionId: string,
  playerId: string,
  choice: Exclude<LobbyChoice, 'none'>,
): Promise<void> {
  const docId = `${sessionId}_${playerId}`;
  await col.sessionPlayers().doc(docId).update({ lobbyChoice: choice });
}

// ─── Rematch ───────────────────────────────────────────────────────────────────

/**
 * Создаёт rematch-предложение на старой сессии. Идемпотентно: если уже есть pending,
 * у которого ttlAt в будущем — ничего не делаем (возвращаем false).
 */
export async function createRematchOffer(
  sessionId: string,
  byUid: string,
  byName: string,
): Promise<boolean> {
  const ref = col.sessions().doc(sessionId);
  let success = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const data = snap.data() as { rematchOffer?: { status?: string; ttlAt?: number } } | undefined;
    const cur = data?.rematchOffer;
    if (cur?.status === 'pending' && (cur.ttlAt ?? 0) > Date.now()) return;
    if (cur?.status === 'accepted' && cur && (cur as { newSessionId?: string }).newSessionId) return;
    const at = Date.now();
    tx.update(ref, {
      rematchOffer: {
        byUid,
        byName,
        at,
        ttlAt: at + REMATCH_TTL_MS,
        status: 'pending' as RematchStatus,
      },
    });
    success = true;
  });
  return success;
}

export async function setRematchStatus(
  sessionId: string,
  status: Exclude<RematchStatus, 'pending'>,
): Promise<void> {
  const ref = col.sessions().doc(sessionId);
  await ref.update({ 'rematchOffer.status': status });
}

// ─── Matchmaking queue ────────────────────────────────────────────────────────

/** Только поля из firestore.rules matchmakingQueueDocOk — без undefined и лишних ключей. */
export async function joinMatchmakingQueue(entry: MatchmakingEntry): Promise<void> {
  const uid = String(entry.userId ?? '').trim();
  if (!uid) throw new Error('joinMatchmakingQueue: empty userId');

  const size = entry.size === 4 ? 4 : 2;
  const joinedAt = Number(entry.joinedAt);
  if (!Number.isFinite(joinedAt) || joinedAt <= 0) {
    throw new Error('joinMatchmakingQueue: invalid joinedAt');
  }
  const rankIndex = Math.max(0, Math.min(23, Math.round(Number(entry.rankIndex ?? 0))));
  const searchRange = Math.max(1, Math.min(8, Math.round(Number(entry.searchRange ?? 2))));

  const payload: Record<string, unknown> = {
    userId: uid,
    rankTier: String(entry.rankTier),
    size,
    joinedAt,
    rankIndex,
    searchRange,
  };
  if (entry.expoPushToken != null && String(entry.expoPushToken).length > 0) {
    payload.expoPushToken = String(entry.expoPushToken);
  }
  if (entry.displayName != null && String(entry.displayName).trim().length > 0) {
    payload.displayName = String(entry.displayName).trim().slice(0, 120);
  }

  await col.queue().doc(uid).set(payload);
}

export async function leaveMatchmakingQueue(userId: string): Promise<void> {
  await col.queue().doc(userId).delete();
}

/** Одноразовий get після join — якщо CF встиг записати sessionId до onSnapshot, не губимо матч. */
export async function readMatchmakingQueueSessionId(userId: string): Promise<string | null> {
  try {
    const snap = await col.queue().doc(userId).get();
    if (!snap.exists) return null;
    const d = snap.data() as MatchmakingEntry & { sessionId?: string };
    const sid = d.sessionId;
    return typeof sid === 'string' && sid.length > 0 ? sid : null;
  } catch {
    return null;
  }
}

export function subscribeMatchmakingQueue(
  userId: string,
  onSessionFound: (sessionId: string) => void
): () => void {
  // Cloud Function создаёт сессию и пишет sessionId в запись очереди; сразу удаляем документ,
  // иначе запись с sessionId навсегда остаётся в коллекции (stale-чистка её не трогает).
  return col.queue().doc(userId).onSnapshot((snap) => {
    if (!snap || !snap.exists) return;
    const data = snap.data() as MatchmakingEntry & { sessionId?: string };
    if (!data.sessionId) return;
    onSessionFound(data.sessionId);
    col.queue().doc(userId).delete().catch(() => {});
  });
}

/**
 * Скільки **інших** гравців зараз у `matchmaking_queue` без `sessionId` (ще шукають матч).
 * `getPresence` викликається на кожен snapshot — передавайте getter з актуальними ref-ами.
 */
export function subscribeMatchmakingQueueOthersCount(
  getPresence: () => { userId: string | null; inSearchFlow: boolean },
  onOthersCount: (n: number) => void,
): () => void {
  return col.queue().onSnapshot(
    (snap) => {
      if (!snap) return;
      const { userId: myId, inSearchFlow } = getPresence();
      let n = 0;
      for (const doc of snap.docs) {
        const d = doc.data() as MatchmakingEntry & { sessionId?: string };
        if (!d?.userId || d.sessionId) continue;
        if (inSearchFlow && myId && doc.id === myId) continue;
        n += 1;
      }
      onOthersCount(n);
    },
    () => onOthersCount(0),
  );
}

/** Скільки документів у `matchmaking_queue` без `sessionId`. */
function countUnmatchedQueue(snap: { docs: { data: () => unknown }[] } | null): number {
  if (!snap) return 0;
  let n = 0;
  for (const doc of snap.docs) {
    const d = doc.data() as MatchmakingEntry & { sessionId?: string };
    if (!d?.userId || d.sessionId) continue;
    n += 1;
  }
  return n;
}

/**
 * «У пошуку в мережі» — `app_meta/matchmaking_searching` (якщо CF задеплоїв) + скан `matchmaking_queue`, беремо max.
 * Якщо meta-файлу немає, раніше UI був вічно 0; live queue показує реальну кількість.
 */
export function subscribeMatchmakingSearchingTotal(
  onTotal: (n: number) => void,
): () => void {
  let metaCount: number | null = null;
  let queueCount = 0;

  const emit = () => {
    const q = queueCount;
    const m = metaCount;
    if (m != null && m >= 0) {
      onTotal(Math.max(m, q));
    } else {
      onTotal(q);
    }
  };

  const unMeta = col.matchmakingMeta().onSnapshot(
    (snap) => {
      if (!snap || !snap.exists) {
        metaCount = null;
      } else {
        const n = (snap.data() as { searchingCount?: number })?.searchingCount;
        metaCount = typeof n === 'number' && n >= 0 ? n : null;
      }
      emit();
    },
    () => {
      metaCount = null;
      emit();
    },
  );
  const unQ = col.queue().onSnapshot(
    (snap) => {
      queueCount = countUnmatchedQueue(snap);
      emit();
    },
    () => {
      queueCount = 0;
      emit();
    },
  );
  return () => {
    unMeta();
    unQ();
  };
}

// ─── Приватные комнаты ────────────────────────────────────────────────────────

export async function createRoom(room: ArenaRoom): Promise<void> {
  await col.rooms().doc(room.code).set(room);
}

export async function joinRoom(code: string, userId: string): Promise<ArenaRoom | null> {
  const ref = col.rooms().doc(code.toUpperCase());
  let result: ArenaRoom | null = null;

  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;

    const room = snap.data() as ArenaRoom;
    if (room.status !== 'waiting') return;
    if (room.guestId === userId || room.hostId === userId) { result = room; return; }

    const updated: ArenaRoom = {
      ...room,
      guestId: userId,
      status: 'matched',
    };

    tx.update(ref, updated);
    result = updated;
  });

  return result;
}

export function subscribeRoom(
  code: string,
  onUpdate: (room: ArenaRoom) => void
): () => void {
  return col.rooms().doc(code).onSnapshot(snap => {
    if (snap && snap.exists) onUpdate(snap.data() as ArenaRoom);
  });
}

// ─── Вопросы ──────────────────────────────────────────────────────────────────

export async function getQuestionsByLevel(
  level: string,
  count: number
): Promise<ArenaQuestion[]> {
  const snap = await col.questions()
    .where('level', '==', level)
    .limit(count * 3) // берём с запасом, потом shuffle
    .get();

  const all = snap.docs.map(d => d.data() as ArenaQuestion);
  return shuffleArray(all).slice(0, count);
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function rankToQuestionLevel(tier: RankTier): string {
  const map: Record<RankTier, string> = {
    bronze: 'A1',
    silver: 'A1',
    gold: 'A2',
    platinum: 'A2',
    diamond: 'B1',
    master: 'B1',
    grandmaster: 'B2',
    legend: 'C1',
  };
  return map[tier];
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
