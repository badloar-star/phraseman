import * as admin from 'firebase-admin';
import {
  MatchmakingEntry, DuelSession, SessionPlayer,
  RankTier, SessionSize, RANK_TO_QUESTION_LEVEL, RANK_TIERS, rankToIndex,
} from './types';
import { expireStaleAcceptanceSessions } from './arena_pregame';
import { cleanupStaleArenaSessions, advanceStuckQuestionSessions, cleanupExpiredArenaRooms } from './arena_cleanup';
import { getLevelFromXP } from './xp_levels';
import { selectArenaPoolQuestions, type ArenaQuestionPoolRow } from './arena_question_pool_selection';
import { mergeArenaQuestionHistory } from './arena_question_history';

const db = admin.firestore();

/** Публичный агрегат для UI лобби: live-док, обновляется на каждом изменении очереди (CF). */
const APP_META_MATCHMAKING = 'app_meta/matchmaking_searching';

const RANKED_QUESTIONS_PER_MATCH = 10;
const QUESTION_TIMEOUT_MS = 40_000;
const STALE_ENTRY_MS = 15 * 60 * 1000; // remove entries older than 15 min
const QUEUE_WINDOW_LIMIT = 500;
const CLEANUP_WINDOW_LIMIT = 500;
/** Клиент должен сам удалить queue сразу после match; иначе cron убирает через 2 мин (см. matchedAt) */
const MATCHED_QUEUE_TTL_MS = 2 * 60 * 1000;
/** Документ с sessionId, но без matchedAt (legacy / сбой) — удаляем строку очереди по давности joinedAt */
const MATCHED_QUEUE_NO_MATCHED_AT_MS = 10 * 60 * 1000;
let lastPublishedSearchingCount: number | null = null;

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

/** id в об'єкті — завжди id Firestore-дока; userId дублює id, якщо в data немає. */
function docToQueueEntry(d: { id: string; data: () => unknown }): QueueEntry {
  const data = d.data() as MatchmakingEntry;
  return { ...data, id: d.id, userId: data.userId ?? d.id };
}

async function readQueueWindow(limit = QUEUE_WINDOW_LIMIT): Promise<QueueEntry[]> {
  const snap = await db
    .collection('matchmaking_queue')
    .orderBy('joinedAt')
    .limit(limit)
    .get();
  return snap.docs.map(d => docToQueueEntry(d));
}

// ─── Core matching logic ──────────────────────────────────────────────────────

export async function runMatchmaking(): Promise<void> {
  const now = Date.now();

  const entries = (await readQueueWindow())
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
  try {
    // Watchdog зависших вопросов ПЕРЕД stale-cleanup: завершает матчи нормально
    // (с наградами), если игрок отвалился посреди вопроса. Иначе сессия дожила бы
    // до 2ч stale-cleanup и оборвалась без наград.
    await advanceStuckQuestionSessions();
  } catch (e) {
    console.error('advanceStuckQuestionSessions', e);
  }
  try {
    await cleanupStaleArenaSessions();
  } catch (e) {
    console.error('cleanupStaleArenaSessions', e);
  }
  try {
    await cleanupExpiredArenaRooms();
  } catch (e) {
    console.error('cleanupExpiredArenaRooms', e);
  }
}

/** Сколько записей в matchmaking_queue ещё без sessionId (реально в поиске). */
export async function publishMatchmakingSearchingCount(): Promise<void> {
  let n = 0;
  try {
    const snap = await db.collection('matchmaking_queue').count().get();
    n = snap.data().count ?? 0;
  } catch {
    n = (await readQueueWindow()).filter(e => !e.sessionId).length;
  }
  if (lastPublishedSearchingCount === n) return;
  lastPublishedSearchingCount = n;
  await db.doc(APP_META_MATCHMAKING).set(
    { searchingCount: n, updatedAt: Date.now() },
    { merge: true },
  );
}

/** Документы с sessionId не попадают в stale-чистку по joinedAt; убираем по matchedAt или legacy без timestamp. */
async function cleanupOrphanedMatchedQueueEntries(now: number): Promise<void> {
  const snap = await db
    .collection('matchmaking_queue')
    .orderBy('joinedAt')
    .limit(CLEANUP_WINDOW_LIMIT)
    .get();
  if (snap.empty) return;
  const batch = db.batch();
  let n = 0;
  for (const doc of snap.docs) {
    const d = doc.data() as MatchmakingEntry & { matchedAt?: number };
    if (!d.sessionId) continue;
    const joinedAt = typeof d.joinedAt === 'number' ? d.joinedAt : 0;
    if (d.matchedAt != null) {
      if (now - d.matchedAt > MATCHED_QUEUE_TTL_MS) {
        batch.delete(doc.ref);
        n++;
        if (n >= 450) break;
      }
    } else if (joinedAt > 0 && now - joinedAt > MATCHED_QUEUE_NO_MATCHED_AT_MS) {
      batch.delete(doc.ref);
      n++;
      if (n >= 450) break;
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

  const all = (await readQueueWindow())
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
    questions: [],
    currentQuestionIndex: 0,
    questionStartedAt: null,
    questionTimeoutMs: QUESTION_TIMEOUT_MS,
    createdAt: now,
    acceptDeadlineAt: now + 15_000,
  };

  // Read XP + selected avatar for each player. Numeric legacy avatars are derived from XP;
  // custom avatars are stored as string values like `custom:...`.
  const userSnaps = await Promise.all(
    playersNorm.map(p => db.collection('users').doc(p.userId).get().catch(() => null)),
  );
  const avatarLevelByUid = new Map<string, number>();
  const avatarByUid = new Map<string, string>();
  const auraByUid = new Map<string, string>();
  for (let i = 0; i < playersNorm.length; i++) {
    const d = userSnaps[i]?.data() as Record<string, Record<string, string>> | undefined;
    const xp = parseInt(d?.progress?.user_total_xp ?? '0') || 0;
    const level = getLevelFromXP(xp);
    const avatarRaw = typeof d?.progress?.user_avatar === 'string' ? d.progress.user_avatar.trim() : '';
    const auraRaw = typeof d?.progress?.user_avatar_aura === 'string' ? d.progress.user_avatar_aura.trim() : '';
    avatarLevelByUid.set(playersNorm[i].userId, level);
    avatarByUid.set(playersNorm[i].userId, avatarRaw && !/^\d+$/.test(avatarRaw) ? avatarRaw : String(level));
    if (auraRaw) auraByUid.set(playersNorm[i].userId, auraRaw);
  }

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

    // The runtime pool is deliberately queried inside this transaction: the same
    // commit that creates the session also reads and advances each player's
    // recent-question history. A removed question can never enter a new session.
    const poolQuery = db.collection('arena_questions')
      .where('studyTarget', '==', 'en')
      .where('learnerSourceLocale', '==', 'ru')
      .where('level', '==', questionLevel)
      .where('availability', '==', 'active')
      .orderBy('rand')
      .limit(100);
    const [poolSnapshot, ...historySnapshots] = await Promise.all([
      tx.get(poolQuery),
      ...playersNorm.map((player) => tx.get(db.collection('arena_question_history').doc(player.userId))),
    ]);
    const rows = shuffleArray(poolSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ArenaQuestionPoolRow)));
    const recentIds = new Set(historySnapshots.flatMap((snapshot) => Array.isArray(snapshot.data()?.questionIds) ? snapshot.data()!.questionIds.map(String) : []));
    const selection = selectArenaPoolQuestions(rows, { studyTarget: 'en', learnerSourceLocale: 'ru', level: questionLevel, count: RANKED_QUESTIONS_PER_MATCH, excludedIds: recentIds });
    if (selection.ids.length !== RANKED_QUESTIONS_PER_MATCH || new Set(selection.ids).size !== RANKED_QUESTIONS_PER_MATCH) throw new Error(`Insufficient active arena pool for level ${questionLevel}`);
    session.questions = [...selection.ids];

    tx.set(sessionRef, session);

    for (const player of playersNorm) {
      const playerDoc = db.collection('session_players').doc(`${sessionId}_${player.userId}`);
      const sp: SessionPlayer = {
        sessionId,
        playerId: player.userId,
        displayName: player.displayName ?? 'Игрок',
        avatar: avatarByUid.get(player.userId) ?? String(avatarLevelByUid.get(player.userId) ?? 1),
        aura: auraByUid.get(player.userId),
        avatarLevel: avatarLevelByUid.get(player.userId) ?? 1,
        score: 0,
        answers: [],
        lobbyChoice: 'none',
      };
      tx.set(playerDoc, sp);
      tx.update(db.collection('matchmaking_queue').doc(player.userId), {
        sessionId,
        matchedAt,
      });
      const previous = Array.isArray(historySnapshots[playersNorm.indexOf(player)].data()?.questionIds) ? historySnapshots[playersNorm.indexOf(player)].data()!.questionIds.map(String) : [];
      tx.set(db.collection('arena_question_history').doc(player.userId), { questionIds: mergeArenaQuestionHistory(previous, selection.ids), updatedAtMs: now, lastSessionId: sessionId }, { merge: true });
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

/**
 * Ключ дедупликации по ВИДИМОМУ содержанию вопроса, а не по doc id. В банке
 * `arena_questions` встречаются документы с разными id, но полностью одинаковым
 * содержанием (текст + варианты + правильный). Без дедупликации один матч мог
 * вытянуть 4–7 визуально идентичных копий (баг «в разборе вопросов 3–7 одинаковые»).
 *
 * ВАЖНО: ключ включает набор вариантов (options), поэтому вопросы с одним текстом,
 * но РАЗНЫМИ вариантами/дистракторами (это разные задания) НЕ схлопываются. Пустой
 * ключ означает «нет текста» → такие документы уникальны по id, их не дедупим.
 */
function questionContentKey(d: {
  question?: unknown;
  options?: unknown;
  correct?: unknown;
}): string {
  const q = typeof d.question === 'string' ? d.question.trim().toLowerCase() : '';
  const c = typeof d.correct === 'string' ? d.correct.trim().toLowerCase() : '';
  const opts = Array.isArray(d.options)
    ? d.options.map((x) => String(x).trim().toLowerCase()).sort().join('¦')
    : '';
  return q === '' ? '' : `${q}||${opts}||${c}`;
}

/** Дедуп по смыслу вопроса, сохраняя порядок; первый победитель остаётся. */
function dedupByContent(
  docs: { id: string; data: () => Record<string, unknown> }[],
): { id: string; data: Record<string, unknown> }[] {
  const seen = new Set<string>();
  const out: { id: string; data: Record<string, unknown> }[] = [];
  for (const doc of docs) {
    const data = doc.data();
    const key = questionContentKey(data);
    // Пустой ключ (нет текста) не схлопываем — такие документы уникальны по id,
    // дедупим только осмысленные вопросы.
    if (key !== '' && seen.has(key)) continue;
    if (key !== '') seen.add(key);
    out.push({ id: doc.id, data });
  }
  return out;
}

/**
 * Один додатковий id для тай-брейку (нічия після основних 10 питань).
 * Повертає null, якщо в банку не знайшлося варіанта поза exclude.
 */
export async function pickOneQuestionExcluding(level: string, exclude: Set<string>): Promise<string | null> {
  const pivot = Math.random();
  const limit = 48;
  const [snapA, snapB] = await Promise.all([
    db.collection('arena_questions')
      .where('studyTarget', '==', 'en')
      .where('learnerSourceLocale', '==', 'ru')
      .where('level', '==', level)
      .where('availability', '==', 'active')
      .where('rand', '>=', pivot)
      .orderBy('rand')
      .limit(limit)
      .get(),
    db.collection('arena_questions')
      .where('studyTarget', '==', 'en')
      .where('learnerSourceLocale', '==', 'ru')
      .where('level', '==', level)
      .where('availability', '==', 'active')
      .where('rand', '<', pivot)
      .orderBy('rand')
      .limit(limit)
      .get(),
  ]);
  // Дедуп кандидатов по смыслу вопроса — чтобы тай-брейк не выдал контент-дубль
  // уже показанного вопроса (тот же баг «одинаковые вопросы», но на добор-вопросе).
  const pooled = shuffleArray(dedupByContent([...snapA.docs, ...snapB.docs]));
  for (const cand of pooled) {
    if (!exclude.has(cand.id)) return cand.id;
  }
  return null;
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
