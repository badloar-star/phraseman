import {
  ArenaProfile, ArenaSession, SessionPlayer, LobbyChoice,
  ArenaRoom, MatchmakingEntry, ArenaQuestion,
  RankTier, RematchStatus, REMATCH_TTL_MS,
} from '../types/arena';
import { isArenaDuelReactionEmoji } from '../../constants/arena_duel_reaction_emojis';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';

const MATCHMAKING_META_POLL_MS = 30 * 1000;

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

function getFirestoreModule(): any | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default;
  } catch {
    return null;
  }
}

function getDb(): any | null {
  const firestore = getFirestoreModule();
  if (!firestore) return null;
  try {
    return firestore();
  } catch {
    return null;
  }
}

function requireDb(): any {
  const db = getDb();
  if (!db) throw new Error('firebase_unavailable');
  return db;
}

const col = {
  profiles: () => requireDb().collection('arena_profiles'),
  sessions: () => requireDb().collection('arena_sessions'),
  sessionPlayers: () => requireDb().collection('session_players'),
  rooms: () => requireDb().collection('arena_rooms'),
  queue: () => requireDb().collection('matchmaking_queue'),
  questions: () => requireDb().collection('arena_questions'),
  users: () => requireDb().collection('users'),
  /** Агрегат «сколько в поиске» — оновлює Cloud Function, див. functions/src/matchmaking.ts */
  matchmakingMeta: () => requireDb().doc('app_meta/matchmaking_searching'),
};

/**
 * Сохраняет expoPushToken в профиль пользователя users/{userId}.
 *
 * Раньше токен жил только во временной записи matchmaking_queue (joinMatchmakingQueue),
 * поэтому серверные функции (подарок от друга, завершение матча) не могли отправить
 * push — слать было некуда. Эта функция кладёт токен в постоянный документ users/{id},
 * откуда его читают friendSendGift и onArenaSessionFinished.
 *
 * Идемпотентна, merge — не затирает остальные поля. Тихо no-op без firestore.
 */
export async function saveExpoPushTokenToUser(userId: string, token: string): Promise<void> {
  const uid = String(userId ?? '').trim();
  const tok = String(token ?? '').trim();
  if (!uid || !tok || !getDb()) return;
  try {
    await col.users().doc(uid).set(
      { expoPushToken: tok, expoPushTokenUpdatedAt: Date.now() },
      { merge: true },
    );
  } catch {
    // Сохранение токена — не критичный путь; push просто не придёт в этой сессии.
  }
}

// ─── Профиль ──────────────────────────────────────────────────────────────────

export async function getArenaProfile(userId: string): Promise<ArenaProfile | null> {
  if (!getDb()) return null;
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
  if (!getDb()) return () => {};
  return col.profiles().doc(userId).onSnapshot((snap: any) => {
    if (snap && snap.exists) onUpdate(snap.data() as ArenaProfile);
  });
}

// ─── Сессия ───────────────────────────────────────────────────────────────────

export async function getSession(sessionId: string): Promise<ArenaSession | null> {
  if (!getDb()) return null;
  const snap = await col.sessions().doc(sessionId).get();
  return snap.exists ? (snap.data() as ArenaSession) : null;
}

export function subscribeSession(
  sessionId: string,
  onUpdate: (session: ArenaSession) => void
): () => void {
  if (!getDb()) return () => {};
  return col.sessions().doc(sessionId).onSnapshot((snap: any) => {
    if (snap && snap.exists) onUpdate(snap.data() as ArenaSession);
  });
}

// ─── Игрок в сессии ───────────────────────────────────────────────────────────

export function subscribeSessionPlayers(
  sessionId: string,
  onUpdate: (players: SessionPlayer[]) => void
): () => void {
  if (!getDb()) return () => {};
  return col.sessionPlayers()
    .where('sessionId', '==', sessionId)
    .onSnapshot((snap: any) => {
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
  const firestore = getFirestoreModule();
  if (!firestore) throw new Error('firebase_unavailable');
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

/** Реакция эмодзи сопернику в дуэли (поля читает клиент соперника по snapshot). */
export async function sendArenaDuelReact(
  sessionId: string,
  playerId: string,
  emoji: string,
): Promise<void> {
  if (!isArenaDuelReactionEmoji(emoji)) {
    throw new Error('sendArenaDuelReact: emoji not in whitelist');
  }
  const docId = `${sessionId}_${playerId}`;
  await col.sessionPlayers().doc(docId).update({
    arenaReactEmoji: emoji,
    arenaReactAt: Date.now(),
  });
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
  const db = requireDb();
  const ref = col.sessions().doc(sessionId);
  let success = false;
  await db.runTransaction(async (tx: any) => {
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
  if (!getDb()) return () => {};
  return col.queue().doc(userId).onSnapshot((snap: any) => {
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
  if (!getDb()) {
    onOthersCount(0);
    return () => {};
  }
  let active = true;
  const readTotal = async () => {
    try {
      const snap = await col.matchmakingMeta().get();
      const { inSearchFlow } = getPresence();
      const total = snap?.exists
        ? (snap.data() as { searchingCount?: number })?.searchingCount
        : 0;
      const n = typeof total === 'number' && total > 0 ? total : 0;
      if (active) onOthersCount(Math.max(0, n - (inSearchFlow ? 1 : 0)));
    } catch {
      if (active) onOthersCount(0);
    }
  };
  void readTotal();
  const id = setInterval(readTotal, MATCHMAKING_META_POLL_MS);
  return () => {
    active = false;
    clearInterval(id);
  };
}

/**
 * «У пошуку в мережі» — тільки агрегат `app_meta/matchmaking_searching`.
 * Не слухаємо всю `matchmaking_queue`: на великій аудиторії це множить Firestore reads.
 */
export function subscribeMatchmakingSearchingTotal(
  onTotal: (n: number) => void,
): () => void {
  if (!getDb()) {
    onTotal(0);
    return () => {};
  }
  let active = true;
  const readTotal = async () => {
    try {
      const snap = await col.matchmakingMeta().get();
      if (!snap || !snap.exists) {
        if (active) onTotal(0);
        return;
      }
      const n = (snap.data() as { searchingCount?: number })?.searchingCount;
      if (active) onTotal(typeof n === 'number' && n >= 0 ? n : 0);
    } catch {
      if (active) onTotal(0);
    }
  };
  void readTotal();
  const id = setInterval(readTotal, MATCHMAKING_META_POLL_MS);
  return () => {
    active = false;
    clearInterval(id);
  };
}

// ─── Приватные комнаты ────────────────────────────────────────────────────────

export async function createRoom(room: ArenaRoom): Promise<void> {
  await col.rooms().doc(room.code).set(room);
}

export async function joinRoom(code: string, userId: string): Promise<ArenaRoom | null> {
  const db = getDb();
  if (!db) return null;
  const ref = col.rooms().doc(code.toUpperCase());
  let result: ArenaRoom | null = null;

  await db.runTransaction(async (tx: any) => {
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
  if (!getDb()) return () => {};
  return col.rooms().doc(code).onSnapshot((snap: any) => {
    if (snap && snap.exists) onUpdate(snap.data() as ArenaRoom);
  });
}

// ─── Вопросы ──────────────────────────────────────────────────────────────────

export async function getQuestionsByLevel(
  level: string,
  count: number
): Promise<ArenaQuestion[]> {
  if (!getDb()) return [];
  const snap = await col.questions()
    .where('level', '==', level)
    .limit(count * 3) // берём с запасом, потом shuffle
    .get();

  const all: ArenaQuestion[] = snap.docs.map((d: any) => d.data() as ArenaQuestion);
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
    // Банк вопросов — только A1/A2/B1/B2 (C1 не существует). Держим B2, иначе
    // запрос вопросов уровня C1 ничего не вернёт. Синхронно с серверным
    // RANK_TO_QUESTION_LEVEL в functions/src/types.ts.
    legend: 'B2',
  };
  return map[tier];
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
