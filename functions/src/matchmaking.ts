import * as admin from 'firebase-admin';
import {
  MatchmakingEntry, DuelSession, SessionPlayer,
  RankTier, SessionSize, RANK_TO_QUESTION_LEVEL, RANK_TIERS, rankToIndex,
} from './types';
import { expireStaleAcceptanceSessions } from './arena_pregame';

const db = admin.firestore();

/** Публичный агрегат для UI лобби: live-док, обновляется на каждом изменении очереди (CF). */
const APP_META_MATCHMAKING = 'app_meta/matchmaking_searching';

const RANKED_QUESTIONS_PER_MATCH = 10;
const QUESTION_TIMEOUT_MS = 40_000;
const STALE_ENTRY_MS = 15 * 60 * 1000; // remove entries older than 15 min
/** Клиент должен сам удалить queue сразу после match; иначе cron убирает через 2 мин (см. matchedAt) */
const MATCHED_QUEUE_TTL_MS = 2 * 60 * 1000;

type QueueEntry = MatchmakingEntry & { id: string };

function queueUserId(e: QueueEntry): string {
  const u = e.userId;
  if (typeof u === 'string' && u.length > 0) return u;
  return e.id;
}

/** Уровень вопросов — по самому высокому рангу в лобби (не по первому игроку), иначе Silver спаренный с Bronze получал бы пул A1. */
function highestRankTierFromPlayers(players: (MatchmakingEntry & { id: string })[]): RankTier {
  let maxIdx = -1;
  for (const p of players) {
    const idx =
      typeof p.rankIndex === 'number'
        ? p.rankIndex
        : rankToIndex(p.rankTier, 'I');
    if (idx > maxIdx) maxIdx = idx;
  }
  if (maxIdx < 0) maxIdx = 0;
  const pos = Math.min(Math.floor(maxIdx / 3), RANK_TIERS.length - 1);
  return RANK_TIERS[pos];
}

function sameSessionSize(a: unknown, b: unknown): boolean {
  return Number(a) === Number(b);
}

/** id в об’єкті — завжди id Firestore-дока; userId дублює id, якщо в data немає. */
function docToQueueEntry(d: { id: string; data: () => unknown }): QueueEntry {
  const data = d.data() as MatchmakingEntry;
  return { ...data, id: d.id, userId: data.userId ?? d.id };
}

// ─── Core matching logic ──────────────────────────────────────────────────────

export async function runMatchmaking(): Promise<void> {
  const now = Date.now();

  const snap = await db.collection('matchmaking_queue').get();

  const entries = snap.docs
    .map(d => docToQueueEntry(d))
    .filter(e => !e.sessionId); // skip already-matched entries

  // Clean up stale entries
  const stale = entries.filter(e => now - e.joinedAt > STALE_ENTRY_MS);
  if (stale.length > 0) {
    const batch = db.batch();
    stale.forEach(e => batch.delete(db.collection('matchmaking_queue').doc(e.id)));
    await batch.commit();
  }

  const active = entries.filter(e => now - e.joinedAt <= STALE_ENTRY_MS);
  const enrichedActive = await enrichFromProfiles(active);

  for (const size of [2, 4] as SessionSize[]) {
    const group = enrichedActive.filter(e => sameSessionSize(e.size, size));
    await matchGroup(group, size);
  }

  await cleanupOrphanedMatchedQueueEntries(now);
  await publishMatchmakingSearchingCount();
  try {
    await expireStaleAcceptanceSessions();
  } catch {
    // non-fatal
  }
}

/** Сколько записей в matchmaking_queue ещё без sessionId (реально в поиске). */
export async function publishMatchmakingSearchingCount(): Promise<void> {
  const snap = await db.collection('matchmaking_queue').get();
  let n = 0;
  for (const doc of snap.docs) {
    const d = doc.data() as { sessionId?: string };
    if (!d.sessionId) n += 1;
  }
  await db.doc(APP_META_MATCHMAKING).set(
    { searchingCount: n, updatedAt: Date.now() },
    { merge: true },
  );
}

/** Документы с sessionId не попадают в stale-чистку; убираем, если клиент не удалил запись. */
async function cleanupOrphanedMatchedQueueEntries(now: number): Promise<void> {
  const snap = await db.collection('matchmaking_queue').get();
  if (snap.empty) return;
  const batch = db.batch();
  let n = 0;
  for (const doc of snap.docs) {
    const d = doc.data() as MatchmakingEntry & { matchedAt?: number };
    if (!d.sessionId) continue;
    if (d.matchedAt == null) continue; // старые документы без matchedAt — вручную в консоли или перезапись при новом матче
    if (now - d.matchedAt > MATCHED_QUEUE_TTL_MS) {
      batch.delete(doc.ref);
      n++;
      if (n >= 450) break; // лимит batch
    }
  }
  if (n > 0) await batch.commit();
}

// ─── Called on each new queue write for instant matching ─────────────────────

export async function tryMatchForUser(userId: string): Promise<void> {
  const userSnap = await db.collection('matchmaking_queue').doc(userId).get();
  if (!userSnap.exists) return;

  const uData = userSnap.data() as MatchmakingEntry;
  const userEntry: QueueEntry = {
    ...uData,
    id: userSnap.id,
    userId: uData.userId ?? userSnap.id,
  };
  if (userEntry.sessionId) return; // already matched

  const now = Date.now();
  const snap = await db.collection('matchmaking_queue').get();

  const all = snap.docs
    .map(d => docToQueueEntry(d))
    .filter(
      e =>
        !e.sessionId &&
        e.id !== userId &&
        sameSessionSize(e.size, userEntry.size),
    );

  const rankMap = await fetchProfileRankMap([queueUserId(userEntry), ...all.map(e => queueUserId(e))]);
  const userE = applyRankFromMap(userEntry, rankMap);
  const allE = all.map(e => applyRankFromMap(e, rankMap));

  const need = userE.size - 1;
  const pickedOthers = pickMatchCandidatesRelaxed(userE, allE, need);
  if (pickedOthers.length < need) return;

  const picked = [userE, ...pickedOthers];
  await createSession(picked, userE.size);
}

// ─── Cron-based batch matching ────────────────────────────────────────────────

async function matchGroup(
  entries: (MatchmakingEntry & { id: string })[],
  size: SessionSize,
): Promise<void> {
  const used = new Set<string>();

  for (const entry of entries) {
    if (used.has(queueUserId(entry as QueueEntry))) continue;

    const pool = entries.filter(
      e =>
        !used.has(queueUserId(e as QueueEntry)) &&
        queueUserId(e as QueueEntry) !== queueUserId(entry as QueueEntry),
    );
    const candidates = pickMatchCandidatesRelaxed(entry, pool, size - 1);

    if (candidates.length < size - 1) continue;

    const picked = [entry, ...candidates];
    picked.forEach(p => used.add(queueUserId(p as QueueEntry)));

    await createSession(picked, size);
  }
}

// ─── Rank-range filtering ─────────────────────────────────────────────────────

function rankFilteredCandidates(
  entry: MatchmakingEntry,
  pool: (MatchmakingEntry & { id: string })[],
): (MatchmakingEntry & { id: string })[] {
  const myIdx = entry.rankIndex ?? 0;
  const range = entry.searchRange ?? 2;

  return pool.filter(e => {
    const theirIdx = e.rankIndex ?? 0;
    const theirRange = e.searchRange ?? 2;
    const effectiveRange = Math.max(range, theirRange);
    return Math.abs(myIdx - theirIdx) <= effectiveRange;
  });
}

/** Сортуємо за близькістю рангу; при рівних — стабільно за userId. */
function sortByRankDistance(
  entry: MatchmakingEntry,
  arr: (MatchmakingEntry & { id: string })[],
): (MatchmakingEntry & { id: string })[] {
  const my = entry.rankIndex ?? 0;
  return [...arr].sort((a, b) => {
    const da = Math.abs((a.rankIndex ?? 0) - my);
    const db = Math.abs((b.rankIndex ?? 0) - my);
    if (da !== db) return da - db;
    return queueUserId(a as QueueEntry).localeCompare(queueUserId(b as QueueEntry));
  });
}

/**
 * Спочатку MMR-діапазон; якщо в пулі вже достатньо гравців, але всі «далекі» за рангом — матчимо
 * ближніх за індексом. Інакше при малій базі двоє тестерів ніколи не зустрінуться.
 */
function pickMatchCandidatesRelaxed(
  entry: MatchmakingEntry & { id: string },
  pool: (MatchmakingEntry & { id: string })[],
  need: number,
): (MatchmakingEntry & { id: string })[] {
  if (need <= 0) return [];
  const strict = rankFilteredCandidates(entry, pool);
  if (strict.length >= need) {
    return sortByRankDistance(entry, strict).slice(0, need);
  }
  if (pool.length < need) {
    return sortByRankDistance(entry, strict).slice(0, need);
  }
  return sortByRankDistance(entry, pool).slice(0, need);
}

// ─── Session creation ─────────────────────────────────────────────────────────

async function createSession(
  players: (MatchmakingEntry & { id: string })[],
  size: SessionSize,
): Promise<void> {
  const playersNorm: (MatchmakingEntry & { id: string; userId: string })[] = players.map(
    p => ({ ...p, userId: queueUserId(p as QueueEntry) }),
  );

  const rankTier = highestRankTierFromPlayers(playersNorm);
  const questionLevel = RANK_TO_QUESTION_LEVEL[rankTier];
  const questions = await pickQuestions(questionLevel, RANKED_QUESTIONS_PER_MATCH);

  const sessionRef = db.collection('arena_sessions').doc();
  const sessionId = sessionRef.id;

  const now = Date.now();
  const session: DuelSession = {
    id: sessionId,
    type: 'ranked',
    size,
    state: 'acceptance',
    rankTier,
    playerIds: playersNorm.map(p => p.userId),
    questions,
    currentQuestionIndex: 0,
    questionStartedAt: null,
    questionTimeoutMs: QUESTION_TIMEOUT_MS,
    createdAt: now,
    acceptDeadlineAt: now + 45_000,
  };

  const matchedAt = Date.now();

  // Use transaction to prevent double-matching race conditions
  await db.runTransaction(async (tx) => {
    // Verify all players are still unmatched
    for (const player of playersNorm) {
      const ref = db.collection('matchmaking_queue').doc(player.userId);
      const doc = await tx.get(ref);
      if (!doc.exists || doc.data()?.sessionId) {
        throw new Error(`Player ${player.userId} already matched — abort`);
      }
    }

    tx.set(sessionRef, session);

    for (const player of playersNorm) {
      const playerDoc = db.collection('session_players').doc(`${sessionId}_${player.userId}`);
      const sp: SessionPlayer = {
        sessionId,
        playerId: player.userId,
        displayName: player.displayName ?? 'Игрок',
        score: 0,
        answers: [],
        lobbyChoice: 'none',
      };
      tx.set(playerDoc, sp);
      tx.update(db.collection('matchmaking_queue').doc(player.userId), {
        sessionId,
        matchedAt,
      });
    }
  });

  // Send push notifications to players who provided a token
  await notifyPlayers(playersNorm, sessionId);
}

// ─── Push notifications ───────────────────────────────────────────────────────

async function notifyPlayers(
  players: (MatchmakingEntry & { id: string })[],
  sessionId: string,
): Promise<void> {
  const withToken = players.filter(p => p.expoPushToken);
  if (withToken.length === 0) return;

  const messages = withToken.map(p => ({
      to: p.expoPushToken as string,
      sound: 'default' as const,
      title: '⚔️ Соперник найден!',
      body: 'Нажми чтобы войти в игру',
      data: { type: 'arena_match' as const, sessionId, userId: p.userId },
    }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch {
    // Push failed — non-critical, player will see match via Firestore subscription
  }
}

// ─── Questions ────────────────────────────────────────────────────────────────

async function pickQuestions(level: string, count: number): Promise<string[]> {
  // Assign a random float [0,1) to each question at upload time (field: rand).
  // We pick a random pivot and fetch count*4 docs starting from it;
  // if not enough, wrap around from 0. This gives uniform random coverage
  // across the full question bank instead of always returning the first N docs.
  const pivot = Math.random();

  const [snapA, snapB] = await Promise.all([
    db.collection('arena_questions')
      .where('level', '==', level)
      .where('rand', '>=', pivot)
      .orderBy('rand')
      .limit(count * 4)
      .get(),
    db.collection('arena_questions')
      .where('level', '==', level)
      .where('rand', '<', pivot)
      .orderBy('rand')
      .limit(count * 4)
      .get(),
  ]);

  const ids = [
    ...snapA.docs.map(d => d.id),
    ...snapB.docs.map(d => d.id),
  ];

  const out = shuffleArray(ids).slice(0, count);
  if (out.length < count) {
    console.error(
      `pickQuestions: insufficient ids for level=${level} need=${count} got=${out.length}`,
    );
    throw new Error(`Insufficient arena_questions for level ${level} (need ${count}, got ${out.length})`);
  }
  return out;
}

// ─── Trusted rank from arena_profiles (client queue fields are not authoritative) ─

function isRankTier(s: string): s is RankTier {
  return (RANK_TIERS as string[]).includes(s);
}

async function fetchProfileRankMap(
  userIds: string[],
): Promise<Map<string, { rankIndex: number; rankTier: RankTier }>> {
  const out = new Map<string, { rankIndex: number; rankTier: RankTier }>();
  const unique = [...new Set(userIds)];
  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    const refs = chunk.map(uid => db.collection('arena_profiles').doc(uid));
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap, j) => {
      const uid = chunk[j];
      if (!snap.exists) return;
      const data = snap.data() as { rank?: { tier?: string; level?: string } } | undefined;
      const t = data?.rank?.tier;
      const lv = data?.rank?.level;
      if (!t || !lv || !isRankTier(t)) return;
      out.set(uid, { rankIndex: rankToIndex(t, lv), rankTier: t });
    });
  }
  return out;
}

function applyRankFromMap(
  entry: MatchmakingEntry & { id: string },
  map: Map<string, { rankIndex: number; rankTier: RankTier }>,
): MatchmakingEntry & { id: string } {
  const r = map.get(queueUserId(entry as QueueEntry));
  if (!r) return entry;
  return { ...entry, rankIndex: r.rankIndex, rankTier: r.rankTier };
}

async function enrichFromProfiles(
  entries: (MatchmakingEntry & { id: string })[],
): Promise<(MatchmakingEntry & { id: string })[]> {
  if (entries.length === 0) return entries;
  const map = await fetchProfileRankMap(entries.map(e => queueUserId(e as QueueEntry)));
  return entries.map(e => applyRankFromMap(e, map));
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
