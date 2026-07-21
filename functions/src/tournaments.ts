// ═══════════════════════════════════════════════════════════════════════════
// tournaments.ts — Cloud Functions режима «Турниры» (Фаза 1 MVP, спека §11).
//
//   tournamentCreateRooms   — scheduler: комнаты за 10 мин до слота (§2);
//   tournamentJoin          — callable: билет/бесплатный вход, запись в комнату;
//   tournamentFillBots      — scheduler: добивка до 16 ботами за 30 сек до старта,
//                             отмена при < 8 живых с возвратом билета + 3 💎;
//   tournamentSubmitAnswers — callable: server-authoritative приём раунда
//                             (верификация по seed, батч одной записью на раунд);
//   tournamentFinalize      — callable (admin): места, призы, сезон, серии,
//                             идемпотентные reward_claims (авто-вызов из
//                             submitAnswers после последнего раунда);
//   tournamentClaimReward   — callable: идемпотентное получение награды.
//
// Cost-контролы (§11): одна CF-операция на раунд на игрока, без записей
// per-question, боты симулируются детерминированно по seed при добивке/
// финализации, сезон/банк пишутся инкрементами только на join/finalize.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import {
  BOT_PROFILES_COLLECTION,
  TOURNAMENT_BANK_COLLECTION,
  TOURNAMENT_CANCEL_COMPENSATION_GEMS,
  TOURNAMENT_CREATE_AHEAD_MS,
  TOURNAMENT_FILL_BOTS_AHEAD_MS,
  TOURNAMENT_MIN_REAL_PLAYERS,
  TOURNAMENT_ROOMS_COLLECTION,
  TOURNAMENT_ROOM_SIZE,
  TOURNAMENT_ROUND_MODE_KINDS,
  TOURNAMENT_SCHEDULE_COLLECTION,
  TOURNAMENT_SCHEDULE_CONFIG_DOC,
  TOURNAMENT_SEASONS_COLLECTION,
  TOURNAMENT_SEASON_ENTRIES_SUBCOLLECTION,
  TOURNAMENT_STATE_CANCELLED,
  TOURNAMENT_TASKS_COLLECTION,
  TOURNAMENT_REWARD_CLAIMS_SUBCOLLECTION,
  bankContributionGems,
  canCancelTournament,
  canTransitionTournament,
  computePlacements,
  dateKeyInTimezone,
  normalizeTournamentSchedule,
  nextTournamentState,
  prizeForPlace,
  roundSeed,
  roundStateFor,
  scoreAnswer,
  seasonPointsForPlace,
  seededShuffle,
  selectRoundTasks,
  simulateBotAnswers,
  slotStartMs,
  tournamentRoomId,
  tournamentWeekId,
  type BotProfile,
  type ScoreInput,
  type TournamentPlayer,
  type TournamentRoomDoc,
  type TournamentRound,
  type TournamentScheduleConfig,
  type TournamentState,
  type TournamentTask,
} from './tournament_core';

const REGION = 'us-central1';
const ROOM_SCAN_LIMIT = 50;
const DEFAULT_TASKS_PER_ROUND = 6;
const DEFAULT_MAX_MS_PER_TASK = 10_000;
const PLAYER_COLORS = ['#47C870', '#FFC800', '#FF5B6C', '#16B7D9', '#B78CFF', '#FF9F43'] as const;

type Row = Record<string, unknown>;

function sanitizeString(value: unknown, max: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function readInt(value: unknown, fallback = 0): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

async function resolveStableUid(db: FirebaseFirestore.Firestore, authUid: string): Promise<string> {
  const direct = await db.collection('users').doc(authUid).get().catch(() => null);
  if (direct?.exists) return authUid;
  const byAuth = await db.collection('users').where('firebaseAuthUid', '==', authUid).limit(1).get();
  if (!byAuth.empty) return byAuth.docs[0].id;
  return authUid;
}

async function assertNotBanned(db: FirebaseFirestore.Firestore, stableUid: string): Promise<void> {
  const [userSnap, bannedSnap] = await Promise.all([
    db.collection('users').doc(stableUid).get().catch(() => null),
    db.collection('banned_users').doc(stableUid).get().catch(() => null),
  ]);
  if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
    throw new HttpsError('permission-denied', 'user_banned');
  }
}

function readRoom(snap: FirebaseFirestore.DocumentSnapshot): TournamentRoomDoc {
  const d = snap.data() || {};
  return {
    roomId: snap.id,
    slotId: sanitizeString(d.slotId, 60),
    seed: sanitizeString(d.seed, 200),
    state: sanitizeString(d.state, 20) as TournamentRoomDoc['state'],
    startsAt: readInt(d.startsAt, 0),
    players: Array.isArray(d.players) ? d.players as TournamentPlayer[] : [],
    rounds: Array.isArray(d.rounds) ? d.rounds as TournamentRound[] : [],
    version: readInt(d.version, 0),
    createdAtMs: readInt(d.createdAtMs, 0),
    cancelledAtMs: readInt(d.cancelledAtMs, 0) || undefined,
    cancelReason: d.cancelReason ? sanitizeString(d.cancelReason, 80) : undefined,
  };
}

async function loadScheduleConfig(db: FirebaseFirestore.Firestore): Promise<TournamentScheduleConfig> {
  const snap = await db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc(TOURNAMENT_SCHEDULE_CONFIG_DOC).get();
  return normalizeTournamentSchedule(snap.data());
}

async function loadTasksByIds(db: FirebaseFirestore.Firestore, taskIds: string[]): Promise<Map<string, TournamentTask>> {
  const out = new Map<string, TournamentTask>();
  const snaps = await Promise.all(taskIds.map((id) => db.collection(TOURNAMENT_TASKS_COLLECTION).doc(id).get()));
  for (const snap of snaps) {
    if (!snap.exists) continue;
    const d = snap.data() || {};
    out.set(snap.id, {
      taskId: snap.id,
      mode: sanitizeString(d.mode, 40),
      isVoice: d.isVoice === true,
      difficulty: readInt(d.difficulty, 1),
      payload: d.payload && typeof d.payload === 'object' ? d.payload as Row : {},
      tags: Array.isArray(d.tags) ? d.tags.map((t) => sanitizeString(t, 40)) : [],
      verified: d.verified !== false,
    });
  }
  return out;
}

/**
 * Верификация ответа на сервере: канонический ответ хранится в пуле
 * `tournamentTasks/{taskId}.payload.correctAnswer` и клиенту не раскрывается
 * до конца раунда (rules: пул read=false, выдача заданий — только через
 * документ комнаты, где лежат taskIds + публичная часть payload).
 */
function isAnswerCorrect(task: TournamentTask | undefined, answer: unknown): boolean {
  if (!task) return false;
  const expected = task.payload?.correctAnswer;
  if (expected === undefined || expected === null) return false;
  return String(answer ?? '').trim() === String(expected).trim();
}

/** Серия/очки раунда: серия переносится между раундами (player.streak). */
function scorePlayerRound(answers: ScoreInput[], streakStart: number): { roundScore: number; correct: number; streakAfter: number } {
  let roundScore = 0;
  let correct = 0;
  let streak = Math.max(0, streakStart);
  for (const a of answers) {
    roundScore += scoreAnswer({ ...a, streakBefore: streak });
    if (a.correct) {
      correct += 1;
      streak += 1;
    } else {
      streak = 0;
    }
  }
  return { roundScore, correct, streakAfter: streak };
}

function advanceState(room: TournamentRoomDoc, target: TournamentState): void {
  let guard = 0;
  while (room.state !== target && guard < 16) {
    const next = nextTournamentState(room.state as TournamentState);
    if (!next || !canTransitionTournament(room.state, next)) {
      throw new HttpsError('failed-precondition', `bad_state_transition_${room.state}_to_${target}`);
    }
    room.state = next;
    guard += 1;
  }
}

// ── tournamentCreateRooms (scheduler, каждые 5 минут) ───────────────────────
//
// Идемпотентно: roomId детерминирован (slotId + timezone + дата), повторный
// тик просто находит существующую комнату. Для скелета региональность —
// конфигом слотов (timezone на слот), без гео-роутинга игроков.

export const tournamentCreateRooms = onSchedule(
  { schedule: '*/5 * * * *', timeZone: 'UTC', region: REGION },
  async () => {
    const db = admin.firestore();
    const cfg = await loadScheduleConfig(db);
    const nowMs = Date.now();

    for (const slot of cfg.slots) {
      if (!slot.enabled) continue;
      const dateKey = dateKeyInTimezone(nowMs, slot.timezone);
      const startsAt = slotStartMs(dateKey, slot.localTime, slot.timezone);
      const createAt = startsAt - TOURNAMENT_CREATE_AHEAD_MS;
      if (nowMs < createAt || nowMs >= startsAt) continue;

      const roomId = tournamentRoomId(slot.slotId, slot.timezone, dateKey);
      const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
      const existing = await roomRef.get();
      if (existing.exists) continue;

      const room: TournamentRoomDoc = {
        roomId,
        slotId: slot.slotId,
        seed: roomId,
        state: 'scheduled',
        startsAt,
        players: [],
        rounds: [],
        version: 0,
        createdAtMs: nowMs,
      };
      await roomRef.set({
        ...room,
        ticketsRequired: slot.ticketsRequired,
        timezone: slot.timezone,
      });
      console.log('[tournaments] room created', { roomId, slotId: slot.slotId, startsAt });
    }
  },
);

// ── tournamentJoin (callable) ───────────────────────────────────────────────
//
// Транзакция: валидация инвентаря билетов (или 1 free/нед), списание, запись
// в комнату, инкремент банка недели (20% стоимости билета, §9 КФ-4).
// Полная комната → resource-exhausted; отменённая → failed-precondition
// (возврат + 3 💎 «за ожидание» выполняет tournamentFillBots при отмене).

export const tournamentJoin = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUid(db, request.auth.uid);
  await assertNotBanned(db, stableUid);

  const roomId = sanitizeString(request.data?.roomId, 160);
  if (!roomId) throw new HttpsError('invalid-argument', 'room_required');

  const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
  const userRef = db.collection('users').doc(stableUid);
  const ticketsRef = userRef.collection('inventory').doc('tickets');
  const cfg = await loadScheduleConfig(db);
  const weekId = tournamentWeekId();
  const bankRef = db.collection(TOURNAMENT_BANK_COLLECTION).doc(weekId);

  return db.runTransaction(async (tx) => {
    const [roomSnap, userSnap, ticketsSnap] = await Promise.all([
      tx.get(roomRef),
      tx.get(userRef),
      tx.get(ticketsRef),
    ]);
    if (!roomSnap.exists) throw new HttpsError('not-found', 'room_not_found');
    const room = readRoom(roomSnap);

    if (room.state === TOURNAMENT_STATE_CANCELLED) {
      throw new HttpsError('failed-precondition', 'room_cancelled');
    }
    if (room.state !== 'scheduled' && room.state !== 'lobby') {
      throw new HttpsError('failed-precondition', 'room_already_started');
    }
    if (room.players.some((p) => !p.isBot && p.id === stableUid)) {
      return { ok: true, joined: true, alreadyJoined: true, roomId };
    }
    if (room.players.length >= TOURNAMENT_ROOM_SIZE) {
      throw new HttpsError('resource-exhausted', 'room_full');
    }

    const ticketsRequired = Math.max(1, readInt(roomSnap.data()?.ticketsRequired, 1));
    const user = userSnap.data() || {};
    const freeUsedWeek = sanitizeString(user.tournament_free_week, 12);
    const useFreeEntry = cfg.freeWeeklyEntry && ticketsRequired === 1 && freeUsedWeek !== weekId;
    const ticketsBefore = Math.max(0, readInt(ticketsSnap.data()?.count, 0));

    if (!useFreeEntry && ticketsBefore < ticketsRequired) {
      throw new HttpsError('failed-precondition', 'not_enough_tickets');
    }

    const name = sanitizeString(user.name || user.displayName, 48) || 'Player';
    const avatar = sanitizeString(user.avatar_emoji || user.avatar, 16) || '🙂';
    const player: TournamentPlayer = {
      id: stableUid,
      isBot: false,
      name,
      avatar,
      color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
      score: 0,
      streak: 0,
    };

    const nowMs = Date.now();
    if (useFreeEntry) {
      tx.set(userRef, { tournament_free_week: weekId, updatedAt: nowMs }, { merge: true });
    } else {
      tx.set(ticketsRef, { count: ticketsBefore - ticketsRequired, updatedAt: nowMs }, { merge: true });
      const contribution = bankContributionGems(ticketsRequired, cfg.ticketGemValue);
      if (contribution > 0) {
        tx.set(bankRef, {
          weekId,
          total: admin.firestore.FieldValue.increment(contribution),
          contributions: admin.firestore.FieldValue.increment(1),
          updatedAt: nowMs,
        }, { merge: true });
      }
    }

    tx.set(roomRef, {
      players: [...room.players, player],
      version: room.version + 1,
      updatedAt: nowMs,
    }, { merge: true });

    return {
      ok: true,
      joined: true,
      roomId,
      entry: useFreeEntry ? 'free_weekly' : 'ticket',
      ticketsLeft: useFreeEntry ? ticketsBefore : ticketsBefore - ticketsRequired,
    };
  });
});

// ── tournamentFillBots (scheduler, каждую минуту) ───────────────────────────
//
// За 30 сек до старта: живых < 8 → отмена с возвратом билетов + 3 💎
// компенсации каждому; иначе добивка ботами до 16 и перевод в round1.
// Раунды собираются здесь же: seeded random из пула (seed = roomId + roundNo).

async function cancelRoomWithRefunds(
  db: FirebaseFirestore.Firestore,
  roomRef: FirebaseFirestore.DocumentReference,
  room: TournamentRoomDoc,
  reason: string,
): Promise<void> {
  const nowMs = Date.now();
  const batch = db.bulkWriter();
  for (const p of room.players) {
    if (p.isBot || p.refunded) continue;
    const userRef = db.collection('users').doc(p.id);
    const ticketsRef = userRef.collection('inventory').doc('tickets');
    batch.set(ticketsRef, {
      count: admin.firestore.FieldValue.increment(1),
      updatedAt: nowMs,
    }, { merge: true });
    batch.set(userRef, {
      shards: admin.firestore.FieldValue.increment(TOURNAMENT_CANCEL_COMPENSATION_GEMS),
      shards_updated_at_ms: nowMs,
      shards_updated_op: 'earn',
      shards_updated_reason: 'tournament_cancel_compensation',
    }, { merge: true });
  }
  batch.update(roomRef, {
    state: TOURNAMENT_STATE_CANCELLED,
    cancelReason: reason,
    cancelledAtMs: nowMs,
    players: room.players.map((p) => (p.isBot ? p : { ...p, refunded: true })),
    version: room.version + 1,
  });
  await batch.close();
}

export const tournamentFillBots = onSchedule(
  { schedule: '* * * * *', timeZone: 'UTC', region: REGION },
  async () => {
    const db = admin.firestore();
    const nowMs = Date.now();
    const horizon = nowMs + TOURNAMENT_FILL_BOTS_AHEAD_MS;

    const snap = await db.collection(TOURNAMENT_ROOMS_COLLECTION)
      .where('state', 'in', ['scheduled', 'lobby'])
      .where('startsAt', '<=', horizon)
      .limit(ROOM_SCAN_LIMIT)
      .get();

    for (const doc of snap.docs) {
      const room = readRoom(doc);
      const realCount = room.players.filter((p) => !p.isBot).length;

      if (realCount < TOURNAMENT_MIN_REAL_PLAYERS) {
        if (!canCancelTournament(room.state)) continue;
        await cancelRoomWithRefunds(db, doc.ref, room, 'not_enough_players');
        console.log('[tournaments] room cancelled', { roomId: room.roomId, realCount });
        continue;
      }

      // Добивка ботами-персонами (детерминированный выбор по seed комнаты).
      const botsSnap = await db.collection(BOT_PROFILES_COLLECTION).limit(TOURNAMENT_ROOM_SIZE * 2).get();
      const allBots = botsSnap.docs.map((d) => ({ botId: d.id, ...(d.data() as Omit<BotProfile, 'botId'>) }));
      const picked = seededShuffle(allBots, `${room.seed}:botpick`);
      const needed = TOURNAMENT_ROOM_SIZE - room.players.length;
      const botPlayers: TournamentPlayer[] = picked.slice(0, Math.max(0, needed)).map((bot, i) => ({
        id: bot.botId,
        isBot: true,
        name: bot.name,
        avatar: bot.avatarEmoji,
        color: bot.color || PLAYER_COLORS[(room.players.length + i) % PLAYER_COLORS.length],
        score: 0,
        streak: 0,
      }));

      // Сет раундов из пула задач: seeded (roomId + roundNo), §5/§6.
      const tasksSnap = await db.collection(TOURNAMENT_TASKS_COLLECTION)
        .where('verified', '==', true)
        .limit(200)
        .get();
      const pool: TournamentTask[] = tasksSnap.docs.map((d) => ({
        taskId: d.id,
        mode: sanitizeString(d.data().mode, 40),
        isVoice: d.data().isVoice === true,
        difficulty: readInt(d.data().difficulty, 1),
        payload: d.data().payload && typeof d.data().payload === 'object' ? d.data().payload as Row : {},
        tags: Array.isArray(d.data().tags) ? d.data().tags : [],
        verified: true,
      }));

      const rounds: TournamentRound[] = TOURNAMENT_ROUND_MODE_KINDS.map((modeKind, idx) => {
        const roundNo = idx + 1;
        const tasks = selectRoundTasks({
          pool,
          roomId: room.roomId,
          roundNo,
          count: DEFAULT_TASKS_PER_ROUND,
          modeKind,
        });
        return {
          roundNo,
          mode: modeKind === 'single' && tasks.length > 0 ? tasks[0].mode : 'mix',
          taskIds: tasks.map((t) => t.taskId),
          results: {},
        };
      });

      advanceState(room, 'round1');
      await doc.ref.set({
        state: room.state,
        players: [...room.players, ...botPlayers],
        rounds,
        version: room.version + 1,
        filledBots: botPlayers.length,
        updatedAt: nowMs,
      }, { merge: true });
      console.log('[tournaments] room filled', {
        roomId: room.roomId, real: realCount, bots: botPlayers.length, rounds: rounds.length,
      });
    }
  },
);

// ── tournamentSubmitAnswers (callable) ──────────────────────────────────────
//
// Server-authoritative: клиент шлёт ответы раунда, сервер проверяет их по
// пулу (seed-детерминированный сет уже лежит в комнате), считает очки и
// ОДНОЙ записью батчит результат раунда (никаких per-question записей, §11).
// После round4, когда все живые сдали, комната авто-финализируется.

export const tournamentSubmitAnswers = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUid(db, request.auth.uid);
  await assertNotBanned(db, stableUid);

  const roomId = sanitizeString(request.data?.roomId, 160);
  const roundNo = readInt(request.data?.roundNo, 0);
  const rawAnswers = Array.isArray(request.data?.answers) ? request.data?.answers as Row[] : [];
  if (!roomId || roundNo < 1 || roundNo > 4) {
    throw new HttpsError('invalid-argument', 'room_and_round_required');
  }

  const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new HttpsError('not-found', 'room_not_found');
  const room = readRoom(roomSnap);

  const round = room.rounds.find((r) => r.roundNo === roundNo);
  if (!round) throw new HttpsError('not-found', 'round_not_found');
  if (room.state !== roundStateFor(roundNo)) {
    throw new HttpsError('failed-precondition', `round_not_active_${room.state}`);
  }
  const playerIdx = room.players.findIndex((p) => !p.isBot && p.id === stableUid);
  if (playerIdx < 0) throw new HttpsError('permission-denied', 'not_in_room');

  const existing = round.results?.[stableUid];
  if (existing) {
    return { ok: true, replay: true, roundScore: existing.roundScore, correct: existing.correct };
  }

  const tasksById = await loadTasksByIds(db, round.taskIds);
  const answersByTask = new Map<string, Row>();
  for (const a of rawAnswers.slice(0, round.taskIds.length)) {
    const taskId = sanitizeString(a?.taskId, 160);
    if (taskId) answersByTask.set(taskId, a);
  }

  const maxMs = DEFAULT_MAX_MS_PER_TASK;
  const inputs: ScoreInput[] = round.taskIds.map((taskId) => {
    const task = tasksById.get(taskId);
    const given = answersByTask.get(taskId);
    return {
      correct: given ? isAnswerCorrect(task, given.answer) : false,
      elapsedMs: Math.min(Math.max(0, readInt(given?.elapsedMs, maxMs)), maxMs),
      maxMs,
      streakBefore: 0,
      isVoice: task?.isVoice === true,
    };
  });

  const player = room.players[playerIdx];
  const { roundScore, correct, streakAfter } = scorePlayerRound(inputs, player.streak);
  const nowMs = Date.now();

  const nextPlayers = room.players.slice();
  nextPlayers[playerIdx] = { ...player, score: player.score + roundScore, streak: streakAfter };
  const nextRounds = room.rounds.map((r) => (r.roundNo === roundNo
    ? { ...r, results: { ...(r.results || {}), [stableUid]: { playerId: stableUid, correct, total: round.taskIds.length, roundScore, submittedAtMs: nowMs } } }
    : r));

  // Если все живые сдали раунд — переводим комнату дальше по стейт-машине.
  const realIds = nextPlayers.filter((p) => !p.isBot).map((p) => p.id);
  const submittedRound = nextRounds.find((r) => r.roundNo === roundNo)!;
  const allRealSubmitted = realIds.every((id) => !!submittedRound.results[id]);

  let nextState: TournamentState = room.state as TournamentState;
  if (allRealSubmitted) {
    const roomCursor = { ...room, state: room.state } as TournamentRoomDoc;
    if (roundNo < 4) {
      advanceState(roomCursor, roundStateFor(roundNo + 1)!);
    } else {
      advanceState(roomCursor, 'results');
    }
    nextState = roomCursor.state as TournamentState;
  }

  await roomRef.set({
    players: nextPlayers,
    rounds: nextRounds,
    state: nextState,
    version: room.version + 1,
    updatedAt: nowMs,
  }, { merge: true });

  if (nextState === 'results') {
    await finalizeTournamentRoom(db, roomId).catch((err) => {
      console.error('[tournaments] auto-finalize failed', { roomId, err });
    });
  }

  return { ok: true, roundScore, correct, total: round.taskIds.length, state: nextState };
});

// ── tournamentFinalize ──────────────────────────────────────────────────────
//
// Места (боты вне призов, §3), призы 50/25/10 💎 + билет + титул (§7),
// сезонные очки (§8), горячие серии (КФ-7), детерминированная симуляция ботов
// по seed, идемпотентные reward_claims. Повторный вызов безопасен: уже
// записанные claims не перезаписываются, state rewards не откатывается.

async function finalizeTournamentRoom(db: FirebaseFirestore.Firestore, roomId: string): Promise<{ ok: boolean }> {
  const roomRef = db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
  const snap = await roomRef.get();
  if (!snap.exists) throw new HttpsError('not-found', 'room_not_found');
  const room = readRoom(snap);
  if (room.state === TOURNAMENT_STATE_CANCELLED) throw new HttpsError('failed-precondition', 'room_cancelled');
  if (room.state === 'rewards' || room.state === 'closed') return { ok: true };
  if (room.state !== 'results' && room.state !== 'final') {
    throw new HttpsError('failed-precondition', `cannot_finalize_from_${room.state}`);
  }

  // Досимулировать ботов за все раунды, где у них нет результата.
  const tasksCache = new Map<string, TournamentTask>();
  const botPlayers = room.players.filter((p) => p.isBot);
  const rounds = room.rounds.map((r) => ({ ...r, results: { ...(r.results || {}) } }));
  const players = room.players.map((p) => ({ ...p }));
  const botProfiles = new Map(botPlayers.map((p) => {
    const bot: BotProfile = {
      botId: p.id,
      name: p.name,
      avatarEmoji: p.avatar,
      rank: 'silver',
      titles: [],
      winRate: 0.5,
      color: p.color,
    };
    return [p.id, bot];
  }));
  // winRate ботов читаем из botProfiles для честной симуляции.
  const profilesSnap = await db.collection(BOT_PROFILES_COLLECTION)
    .where(admin.firestore.FieldPath.documentId(), 'in', botPlayers.length > 0 ? botPlayers.map((p) => p.id).slice(0, 30) : ['_none_'])
    .get().catch(() => null);
  profilesSnap?.forEach((d) => {
    const data = d.data() as Partial<BotProfile>;
    const existing = botProfiles.get(d.id);
    if (existing) existing.winRate = typeof data.winRate === 'number' ? data.winRate : existing.winRate;
  });

  for (const round of rounds) {
    const missingBots = botPlayers.filter((p) => !round.results[p.id]);
    if (missingBots.length === 0) continue;
    const tasksById = await loadTasksByIds(db, round.taskIds);
    tasksById.forEach((v, k) => tasksCache.set(k, v));
    for (const bp of missingBots) {
      const profile = botProfiles.get(bp.id)!;
      const inputs = simulateBotAnswers(profile, {
        roomId,
        roundNo: round.roundNo,
        tasks: round.taskIds.map((id) => tasksById.get(id)).filter((t): t is TournamentTask => !!t),
        maxMsPerTask: DEFAULT_MAX_MS_PER_TASK,
      });
      const idx = players.findIndex((p) => p.id === bp.id);
      const { roundScore, correct, streakAfter } = scorePlayerRound(inputs, players[idx].streak);
      players[idx] = { ...players[idx], score: players[idx].score + roundScore, streak: streakAfter };
      round.results[bp.id] = {
        playerId: bp.id,
        correct,
        total: round.taskIds.length,
        roundScore,
        submittedAtMs: Date.now(),
      };
    }
  }

  const { realPlacements } = computePlacements(players);
  const weekId = tournamentWeekId(room.startsAt || Date.now());
  const nowMs = Date.now();
  const winnerPlace1 = realPlacements.find((p) => p.place === 1);

  const batch = db.batch();
  for (const { player, place } of realPlacements) {
    const prize = prizeForPlace(place);
    const seasonPoints = seasonPointsForPlace(place);

    const seasonRef = db.collection(TOURNAMENT_SEASONS_COLLECTION)
      .doc(weekId)
      .collection(TOURNAMENT_SEASON_ENTRIES_SUBCOLLECTION)
      .doc(player.id);
    batch.set(seasonRef, {
      uid: player.id,
      name: player.name,
      points: admin.firestore.FieldValue.increment(seasonPoints),
      tournamentsPlayed: admin.firestore.FieldValue.increment(1),
      bestPlace: place,
      updatedAt: nowMs,
    }, { merge: true });

    // Горячая серия: победа = место 1 среди живых (КФ-7).
    const userRef = db.collection('users').doc(player.id);
    batch.set(userRef, {
      tournament_hot_streak: place === 1
        ? admin.firestore.FieldValue.increment(1)
        : 0,
      tournament_best_place: place,
      updatedAt: nowMs,
    }, { merge: true });

    if (prize) {
      const claimRef = userRef.collection(TOURNAMENT_REWARD_CLAIMS_SUBCOLLECTION).doc(`tournament_${roomId}`);
      batch.set(claimRef, {
        uid: player.id,
        roomId,
        place,
        gems: prize.gems,
        ticketBack: prize.ticketBack,
        titleId: prize.titleId ?? null,
        avatarFrameId: prize.avatarFrameId ?? null,
        seasonPoints,
        claimed: false,
        createdAtMs: nowMs,
      });
    }
  }

  const roomCursor = { ...room, players, rounds } as TournamentRoomDoc;
  advanceState(roomCursor, 'rewards');
  batch.set(roomRef, {
    players,
    rounds,
    state: roomCursor.state,
    winnerUid: winnerPlace1?.player.id ?? null,
    finalizedAtMs: nowMs,
    version: room.version + 1,
  }, { merge: true });
  await batch.commit();

  console.log('[tournaments] finalized', { roomId, winner: winnerPlace1?.player.id, real: realPlacements.length });
  return { ok: true };
}

/** Ручной/восстановительный запуск финализации — только админ. */
export const tournamentFinalize = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const roomId = sanitizeString(request.data?.roomId, 160);
  if (!roomId) throw new HttpsError('invalid-argument', 'room_required');
  return finalizeTournamentRoom(admin.firestore(), roomId);
});

// ── tournamentClaimReward (callable, идемпотентно) ──────────────────────────
//
// Защита от подделки claim-документа клиентом (rules на reward_claims
// исторически позволяют владельцу create): сумма/состав приза НЕ берётся из
// claim-документа, а пересчитывается из финализированной комнаты
// (computePlacements + prizeForPlace). Claim-doc — только флаг идемпотентности.

export const tournamentClaimReward = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUid(db, request.auth.uid);
  await assertNotBanned(db, stableUid);

  const roomId = sanitizeString(request.data?.roomId, 160);
  if (!roomId) throw new HttpsError('invalid-argument', 'room_required');

  // Авторитетный источник приза — финализированная комната.
  const roomSnap = await db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId).get();
  if (!roomSnap.exists) throw new HttpsError('not-found', 'room_not_found');
  const room = readRoom(roomSnap);
  if (room.state !== 'rewards' && room.state !== 'closed') {
    throw new HttpsError('failed-precondition', 'room_not_finalized');
  }
  const { realPlacements } = computePlacements(room.players);
  const myPlacement = realPlacements.find((p) => p.player.id === stableUid);
  const prize = myPlacement ? prizeForPlace(myPlacement.place) : null;
  if (!myPlacement || !prize) throw new HttpsError('not-found', 'reward_not_found');

  const userRef = db.collection('users').doc(stableUid);
  const claimRef = userRef.collection(TOURNAMENT_REWARD_CLAIMS_SUBCOLLECTION).doc(`tournament_${roomId}`);
  const ticketsRef = userRef.collection('inventory').doc('tickets');

  return db.runTransaction(async (tx) => {
    const claimSnap = await tx.get(claimRef);
    const claim = claimSnap.data() || {};
    if (claimSnap.exists && claim.uid && claim.uid !== stableUid) {
      throw new HttpsError('permission-denied', 'claim_owner_mismatch');
    }
    if (claim.claimed === true) {
      return {
        ok: true,
        alreadyClaimed: true,
        place: myPlacement.place,
        gems: prize.gems,
        claimedAtMs: readInt(claim.claimedAtMs, 0),
      };
    }

    const nowMs = Date.now();
    const gems = Math.max(0, prize.gems);
    if (gems > 0) {
      tx.set(userRef, {
        shards: admin.firestore.FieldValue.increment(gems),
        shards_updated_at_ms: nowMs,
        shards_updated_op: 'earn',
        shards_updated_reason: 'tournament_prize',
      }, { merge: true });
      tx.set(userRef.collection('shard_log').doc(), {
        ts: new Date(nowMs).toISOString(),
        type: 'earn',
        amount: gems,
        reason: 'tournament_prize',
        roomId,
        place: myPlacement.place,
      });
    }
    if (prize.ticketBack) {
      tx.set(ticketsRef, {
        count: admin.firestore.FieldValue.increment(1),
        updatedAt: nowMs,
      }, { merge: true });
    }
    if (prize.titleId) {
      tx.set(userRef, {
        tournament_title: sanitizeString(prize.titleId, 60),
        tournament_titles_won: admin.firestore.FieldValue.increment(1),
      }, { merge: true });
    }
    tx.set(claimRef, {
      uid: stableUid,
      roomId,
      place: myPlacement.place,
      gems,
      ticketBack: prize.ticketBack,
      titleId: prize.titleId ?? null,
      claimed: true,
      claimedAtMs: nowMs,
    }, { merge: true });

    return {
      ok: true,
      alreadyClaimed: false,
      place: myPlacement.place,
      gems,
      ticketBack: prize.ticketBack,
      titleId: prize.titleId ?? null,
      claimedAtMs: nowMs,
    };
  });
});
