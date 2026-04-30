import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';
import { calculateArenaPoints } from './arena_scoring';

admin.initializeApp();

// These imports must come AFTER initializeApp() — use require to control order
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runMatchmaking, tryMatchForUser, publishMatchmakingSearchingCount } = require('./matchmaking');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { syncLeaderboardFromUsers } = require('./sync_leaderboard');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { onPlayerAnswered, startSessionCountdown, onQuestionTimeout } = require('./game_loop');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { processLobbyAfterChoice } = require('./arena_pregame') as {
  processLobbyAfterChoice: (sessionId: string) => Promise<void>;
};

const PRIVATE_DUEL_QUESTION_COUNT = 10;
const LEVELS = ['I', 'II', 'III'] as const;
const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend'] as const;

async function pickArenaQuestions(count: number): Promise<string[]> {
  const db = admin.firestore();
  const snap = await db.collection('arena_questions').limit(Math.max(count * 3, count)).get();
  const ids = snap.docs.map((d) => d.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const out = ids.slice(0, count);
  if (out.length < count) {
    console.error(`pickArenaQuestions: need ${count} got ${out.length}`);
    throw new Error(`Insufficient arena_questions (need ${count}, got ${out.length})`);
  }
  return out;
}
// ─── Leaderboard sync ────────────────────────────────────────────────────────

export const syncLeaderboardCron = functions.scheduler.onSchedule(
  { schedule: 'every 2 hours', timeZone: 'UTC' },
  async () => { await syncLeaderboardFromUsers(); }
);

// ─── Matchmaking: instant trigger on queue write ──────────────────────────────

export const onMatchmakingWrite = functions.firestore.onDocumentWritten(
  'matchmaking_queue/{userId}',
  async (event) => {
    // tryMatch, потім один publish — клієнт тягне `app_meta/matchmaking_searching` (колекція
    // після матчу скидає «0 у пошуку», бо в доках з’являється sessionId).
    const after = event.data?.after;
    if (after?.exists) {
      const data = after.data() as { sessionId?: string } | undefined;
      if (!data?.sessionId) {
        const userId = event.params.userId as string;
        try {
          await tryMatchForUser(userId);
        } catch {
          // гонка транзакції — нормально
        }
      }
    }
    try {
      await publishMatchmakingSearchingCount();
    } catch (e) {
      console.error('publishMatchmakingSearchingCount', e);
    }
  }
);

// ─── Matchmaking: 1-min cron fallback for players who didn't trigger onWrite ──

export const matchmakingCron = functions.scheduler.onSchedule(
  { schedule: 'every 1 minutes', timeZone: 'UTC' },
  async () => { await runMatchmaking(); }
);

// ─── Arena room accept flow (server-authoritative session creation) ───────────
export const onArenaRoomMatched = functions.firestore.onDocumentUpdated(
  'arena_rooms/{roomId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;
    if (after.status !== 'matched') return;
    if (!after.hostId || !after.guestId) return;
    if (after.sessionId) return;
    if (before?.status === 'matched' && before?.sessionId) return;

    const db = admin.firestore();
    const roomId = event.params.roomId as string;
    const roomRef = event.data!.after.ref;
    const sessionRef = db.collection('arena_sessions').doc(roomId);
    const hostPlayerRef = db.collection('session_players').doc(`${roomId}_${after.hostId}`);
    const guestPlayerRef = db.collection('session_players').doc(`${roomId}_${after.guestId}`);
    const questions = await pickArenaQuestions(PRIVATE_DUEL_QUESTION_COUNT);
    const tPrivate = Date.now();

    await db.runTransaction(async (tx) => {
      const roomSnap = await tx.get(roomRef);
      const sessionSnap = await tx.get(sessionRef);
      if (!roomSnap.exists) return;
      const room = roomSnap.data() as {
        hostId: string;
        hostName?: string;
        guestId?: string;
        guestName?: string;
        status?: string;
        sessionId?: string | null;
      };

      if (room.status !== 'matched' || !room.guestId || !room.hostId) return;
      if (room.sessionId || sessionSnap.exists) return;

      tx.set(sessionRef, {
        id: roomId,
        type: 'private',
        size: 2,
        state: 'acceptance',
        rankTier: 'bronze',
        playerIds: [room.hostId, room.guestId],
        questions,
        currentQuestionIndex: 0,
        questionStartedAt: null,
        questionTimeoutMs: 40_000,
        createdAt: tPrivate,
        acceptDeadlineAt: tPrivate + 45_000,
      });

      tx.set(hostPlayerRef, {
        sessionId: roomId,
        playerId: room.hostId,
        displayName: room.hostName ?? 'Игрок',
        score: 0,
        answers: [],
        lobbyChoice: 'none',
      }, { merge: true });

      tx.set(guestPlayerRef, {
        sessionId: roomId,
        playerId: room.guestId,
        displayName: room.guestName ?? 'Игрок',
        score: 0,
        answers: [],
        lobbyChoice: 'none',
      }, { merge: true });

      tx.update(roomRef, { sessionId: roomId });
    });
  },
);

// ─── Pre-match: get_ready → countdown (через 2.5s після згоди) ──────────────

const GET_READY_TO_COUNTDOWN_MS = 2500;

export const onSessionGetReady = functions.firestore.onDocumentUpdated(
  'arena_sessions/{sessionId}',
  async (event) => {
    const before = event.data?.before.data() as { state?: string } | null | undefined;
    const after = event.data?.after.data() as { state?: string } | null | undefined;
    if (!after || after.state !== 'get_ready') return;
    if (before?.state === 'get_ready') return;
    const sessionId = event.params.sessionId as string;
    const ref = event.data!.after.ref;
    await new Promise<void>((r) => {
      setTimeout(r, GET_READY_TO_COUNTDOWN_MS);
    });
    const cur = await ref.get();
    const d = cur.data() as { state?: string } | undefined;
    if (d?.state !== 'get_ready') return;
    await ref.update({ state: 'countdown' });
  }
);

// ─── Accept / decline на session_players ────────────────────────────────────

export const onSessionPlayerLobby = functions.firestore.onDocumentUpdated(
  'session_players/{docId}',
  async (event) => {
    const before = event.data?.before.data() as { lobbyChoice?: string; sessionId?: string } | null | undefined;
    const after = event.data?.after.data() as { lobbyChoice?: string; sessionId?: string } | null | undefined;
    if (!after?.sessionId) return;
    if (after.lobbyChoice === before?.lobbyChoice) return;
    if (after.lobbyChoice !== 'accept' && after.lobbyChoice !== 'decline') return;
    try {
      await processLobbyAfterChoice(after.sessionId);
    } catch (e) {
      console.error('processLobbyAfterChoice', e);
    }
  }
);

// ─── Game loop ────────────────────────────────────────────────────────────────

export const onSessionCountdown = functions.firestore.onDocumentWritten(
  'arena_sessions/{sessionId}',
  async (event) => {
    const before = event.data?.before.exists ? event.data?.before.data() : null;
    const after = event.data?.after.data();
    if (!after) return;
    if (before?.state !== 'countdown' && after.state === 'countdown') {
      await startSessionCountdown(event.params.sessionId);
    }
  }
);

export const onAnswerSubmitted = functions.firestore.onDocumentUpdated(
  'session_players/{docId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    const prevCount = (before.answers as unknown[]).length;
    const nextCount = (after.answers as unknown[]).length;
    if (nextCount <= prevCount) return;
    const lastAnswer = (after.answers as { questionId: string; answer?: string | null; timeMs?: number; serverScored?: boolean }[])[nextCount - 1];
    if (!lastAnswer?.questionId) return;

    const playerRef = event.data!.after.ref;
    const db = admin.firestore();
    const sessionId = after.sessionId as string;

    await db.runTransaction(async (tx) => {
      const playerSnap = await tx.get(playerRef);
      if (!playerSnap.exists) return;
      const playerData = playerSnap.data() as {
        answers: Array<{
          questionId: string;
          answer?: string | null;
          timeMs?: number;
          serverScored?: boolean;
          isCorrect?: boolean;
          points?: number;
          bonus?: {
            speed: number;
            streak: number;
            first: number;
            outspeed: number;
          };
        }>;
        score?: number;
      };

      const answers = [...(playerData.answers || [])];
      if (answers.length === 0) return;
      const idx = answers.length - 1;
      const pending = answers[idx];
      if (!pending || pending.questionId !== lastAnswer.questionId) return;
      if (pending.serverScored) return;
      const previousAnswers = answers.slice(0, idx);
      let previousCorrectStreak = 0;
      for (let i = previousAnswers.length - 1; i >= 0; i -= 1) {
        if (!previousAnswers[i]?.isCorrect) break;
        previousCorrectStreak += 1;
      }
      const hasAnyCorrectBefore = previousAnswers.some((a) => a?.isCorrect);

      const questionSnap = await tx.get(db.collection('arena_questions').doc(lastAnswer.questionId));
      const correct = questionSnap.exists ? (questionSnap.data()?.correct as string | undefined) : undefined;
      if (!correct) return;

      const { isCorrect, points, bonus } = calculateArenaPoints(
        (pending.answer ?? null) as string | null,
        correct,
        typeof pending.timeMs === 'number' ? pending.timeMs : 0,
        {
          previousCorrectStreak,
          hasAnyCorrectBefore,
        },
      );

      answers[idx] = {
        ...pending,
        isCorrect,
        points,
        bonus,
        serverScored: true,
      };

      tx.update(playerRef, {
        answers,
        score: admin.firestore.FieldValue.increment(points),
      });
    });

    await onPlayerAnswered(sessionId, lastAnswer.questionId);
  }
);

// ─── Arena results finalization (server-authoritative) ───────────────────────
export const onArenaSessionFinished = functions.firestore.onDocumentUpdated(
  'arena_sessions/{sessionId}',
  async (event) => {
    const before = event.data?.before.data() as { state?: string; resultProcessedAt?: number } | undefined;
    const after = event.data?.after.data() as { state?: string; resultProcessedAt?: number; playerIds?: string[] } | undefined;
    if (!after) return;
    if (after.state !== 'finished') return;
    if (before?.state === 'finished' && after.resultProcessedAt) return;
    if (!after.playerIds || after.playerIds.length === 0) return;

    const db = admin.firestore();
    const sessionId = event.params.sessionId as string;
    const sessionRef = event.data!.after.ref;
    const DRAW_XP = 30;

    await db.runTransaction(async (tx) => {
      const freshSession = await tx.get(sessionRef);
      const freshData = freshSession.data() as {
        resultProcessedAt?: number;
        forfeitedBy?: string;
      } | undefined;
      if (!freshSession.exists || freshData?.resultProcessedAt) return;

      const forfeitedUid = typeof freshData?.forfeitedBy === 'string' && freshData.forfeitedBy.trim()
        ? freshData.forfeitedBy.trim()
        : '';

      // Firestore transaction rule: all reads must happen before any writes.
      // Считываем игроков внутри transaction, чтобы не ловить устаревшие score
      // в момент финализации (иначе won/isLast может считаться неверно).
      const playerIds = Array.isArray(after.playerIds) ? after.playerIds.filter(Boolean) as string[] : [];
      if (playerIds.length === 0) return;
      const playerSnapByUid = new Map<string, FirebaseFirestore.DocumentSnapshot>();
      for (const uid of playerIds) {
        const playerRef = db.collection('session_players').doc(`${sessionId}_${uid}`);
        playerSnapByUid.set(uid, await tx.get(playerRef));
      }
      const players: Array<{ playerId: string; displayName?: string; score: number }> = [];
      for (const uid of playerIds) {
        const d = playerSnapByUid.get(uid)?.data() as {
          playerId?: string;
          displayName?: string;
          score?: number | string;
        } | undefined;
        if (!d?.playerId) continue;
        players.push({
          playerId: d.playerId,
          displayName: d.displayName,
          score: Number(d.score ?? 0),
        });
      }
      if (players.length === 0) return;
      const sorted = [...players].sort((a, b) => b.score - a.score);
      // ── Детект ничьей ────────────────────────────────────────────────────────
      // Ничья = два или более игроков с максимальным счётом. Они не получают звёзд
      // и не «выигрывают» — чтобы при равных очках никто не ловил незаслуженный -1.
      // Сдача: forfeitedBy — не считаем ничью даже при равных очках у оставшихся.
      const topScore = sorted[0]?.score ?? 0;
      const lastScore = sorted[sorted.length - 1]?.score ?? 0;
      const tiedAtTopCount = sorted.filter((x) => x.score === topScore).length;
      const isDrawAtTop = !forfeitedUid && players.length > 1 && tiedAtTopCount > 1;

      // We need all profile snapshots first, because later we write to users/session/profile docs.
      const profileRefByUid = new Map<string, FirebaseFirestore.DocumentReference>();
      for (const p of players) {
        if (!p.playerId) continue;
        profileRefByUid.set(p.playerId, db.collection('arena_profiles').doc(p.playerId));
      }
      const profileSnapByUid = new Map<string, FirebaseFirestore.DocumentSnapshot>();
      for (const [uid, ref] of profileRefByUid) {
        profileSnapByUid.set(uid, await tx.get(ref));
      }

      const sessionUpdate: Record<string, unknown> = { resultProcessedAt: Date.now() };

      for (const p of players) {
        const uid = p.playerId;
        if (!uid) continue;
        const pScore = Number(p.score ?? 0);
        let isDraw = isDrawAtTop && pScore === topScore;
        let won = !isDraw && pScore === topScore;
        let isLast = !isDraw && pScore === lastScore && pScore !== topScore;
        if (forfeitedUid && playerIds.includes(forfeitedUid)) {
          if (uid === forfeitedUid) {
            isDraw = false;
            won = false;
            isLast = true;
          } else {
            const alive = players.filter((x) => x.playerId !== forfeitedUid);
            const aliveTop = alive.length ? Math.max(...alive.map((x) => x.score)) : 0;
            const aliveLast = alive.length ? Math.min(...alive.map((x) => x.score)) : 0;
            const tiedTopAlive = alive.filter((x) => x.score === aliveTop).length;
            const drawAmongAlive = alive.length > 1 && tiedTopAlive > 1;
            isDraw = drawAmongAlive && pScore === aliveTop;
            won = !isDraw && pScore === aliveTop;
            isLast = !isDraw && pScore === aliveLast && pScore !== aliveTop;
          }
        }
        const xpDelta = isDraw ? DRAW_XP : (won ? 50 : 15);

        const profileRef = profileRefByUid.get(uid) ?? db.collection('arena_profiles').doc(uid);
        const profileSnap = profileSnapByUid.get(uid);
        if (!profileSnap) continue;

        let oldStars = 0;
        let oldTier = 'bronze';
        let oldLevel = 'I';
        let newStars = 0;
        let newTier = 'bronze';
        let newLevel = 'I';
        let rankChanged = false;
        let promoted = false;

        if (!profileSnap.exists) {
          newStars = won ? 1 : 0;
          tx.set(profileRef, {
            userId: uid,
            displayName: p.displayName ?? 'Игрок',
            avatarId: '1',
            rank: { tier: 'bronze', level: 'I', stars: newStars },
            xp: xpDelta,
            stats: {
              matchesPlayed: 1,
              matchesWon: won ? 1 : 0,
              totalScore: p.score ?? 0,
              winStreak: won ? 1 : 0,
              bestWinStreak: won ? 1 : 0,
            },
            updatedAt: Date.now(),
          }, { merge: true });
        } else {
          const data = profileSnap.data() as {
            rank?: { stars?: number; tier?: string; level?: string };
            xp?: number;
            lastStreakShardAt?: number;
            stats?: {
              matchesPlayed?: number;
              matchesWon?: number;
              totalScore?: number;
              winStreak?: number;
              bestWinStreak?: number;
            };
          };
          oldStars = data.rank?.stars ?? 0;
          oldTier = data.rank?.tier ?? 'bronze';
          oldLevel = data.rank?.level ?? 'I';
          const curStreak = data.stats?.winStreak ?? 0;
          const bestStreak = data.stats?.bestWinStreak ?? 0;

          // Ничья — звёзды и ранг не меняются.
          newStars = isDraw ? oldStars : oldStars + (won ? 1 : isLast ? -1 : 0);
          newTier = oldTier;
          newLevel = oldLevel;

          if (newStars >= 3) {
            newStars = 0;
            const li = LEVELS.indexOf(oldLevel as (typeof LEVELS)[number]);
            if (li < LEVELS.length - 1 && li >= 0) {
              newLevel = LEVELS[li + 1];
            } else {
              newLevel = LEVELS[0];
              const ti = TIERS.indexOf(oldTier as (typeof TIERS)[number]);
              if (ti < TIERS.length - 1 && ti >= 0) newTier = TIERS[ti + 1];
            }
          } else if (newStars < 0) {
            newStars = 2;
            const li = LEVELS.indexOf(oldLevel as (typeof LEVELS)[number]);
            if (li > 0) {
              newLevel = LEVELS[li - 1];
            } else {
              const ti = TIERS.indexOf(oldTier as (typeof TIERS)[number]);
              if (ti > 0) {
                newTier = TIERS[ti - 1];
                newLevel = LEVELS[LEVELS.length - 1];
              } else {
                newStars = 0;
              }
            }
          }

          rankChanged = newTier !== oldTier || newLevel !== oldLevel;
          promoted = rankChanged && (
            TIERS.indexOf(newTier as (typeof TIERS)[number]) > TIERS.indexOf(oldTier as (typeof TIERS)[number])
            || (newTier === oldTier && LEVELS.indexOf(newLevel as (typeof LEVELS)[number]) > LEVELS.indexOf(oldLevel as (typeof LEVELS)[number]))
          );
          // Ничья сохраняет винстрик (но не увеличивает его). Поражение — обнуляет.
          const newStreak = won ? curStreak + 1 : isDraw ? curStreak : 0;
          const STREAK_SHARD_COOLDOWN_MS = 24 * 60 * 60 * 1000;
          const lastStreakShardAt = data.lastStreakShardAt ?? 0;
          const streakShardReady = Date.now() - lastStreakShardAt > STREAK_SHARD_COOLDOWN_MS;
          const rankUpStreakShardAwarded = promoted && newStreak >= 3 && streakShardReady;

          // displayName обновляем, если из сессии пришло осмысленное имя — иначе при первом матче
          // ставился дефолтный «Игрок» и больше не менялся даже после смены ника пользователем.
          const incomingDn = (p.displayName ?? '').trim();
          const dnPatch = incomingDn && incomingDn !== 'Игрок' ? { displayName: incomingDn } : {};

          tx.update(profileRef, {
            'rank.tier': newTier,
            'rank.level': newLevel,
            'rank.stars': newStars,
            xp: (data.xp ?? 0) + xpDelta,
            'stats.matchesPlayed': (data.stats?.matchesPlayed ?? 0) + 1,
            'stats.matchesWon': (data.stats?.matchesWon ?? 0) + (won ? 1 : 0),
            'stats.totalScore': (data.stats?.totalScore ?? 0) + (p.score ?? 0),
            'stats.winStreak': newStreak,
            'stats.bestWinStreak': Math.max(bestStreak, newStreak),
            ...dnPatch,
            ...(rankUpStreakShardAwarded ? { lastStreakShardAt: Date.now() } : {}),
            updatedAt: Date.now(),
          });
        }

        const historyRef = profileRef.collection('match_history').doc(sessionId);
        tx.set(historyRef, {
          createdAt: Date.now(),
          sessionId,
          won,
          isDraw,
          myScore: p.score ?? 0,
          oppScore: sorted.find((x) => x.playerId !== uid)?.score ?? 0,
          oppName: sorted.find((x) => x.playerId !== uid)?.displayName ?? 'Соперник',
          xpGained: xpDelta,
          starsChange: newStars - oldStars,
          rankBefore: { tier: oldTier, level: oldLevel, stars: oldStars },
          rankAfter: { tier: newTier, level: newLevel, stars: newStars },
        }, { merge: true });

        const resultRef = db.collection('arena_session_results').doc(`${sessionId}_${uid}`);
        tx.set(resultRef, {
          sessionId,
          userId: uid,
          won,
          isDraw,
          xpGained: xpDelta,
          oldStars,
          newStars,
          oldTier,
          oldLevel,
          newTier,
          newLevel,
          rankChanged,
          promoted,
          rankUpStreakShardAwarded: (() => {
            if (!profileSnap.exists) return false;
            const data = profileSnap.data() as { lastStreakShardAt?: number; stats?: { winStreak?: number } } | undefined;
            const curStreak = data?.stats?.winStreak ?? 0;
            const newStreak = won ? curStreak + 1 : 0;
            const STREAK_SHARD_COOLDOWN_MS = 24 * 60 * 60 * 1000;
            const lastStreakShardAt = data?.lastStreakShardAt ?? 0;
            const streakShardReady = Date.now() - lastStreakShardAt > STREAK_SHARD_COOLDOWN_MS;
            return promoted && newStreak >= 3 && streakShardReady;
          })(),
          updatedAt: Date.now(),
        }, { merge: true });
      }

      tx.update(sessionRef, sessionUpdate);
    });
  }
);

// ─── Rematch: создать новую сессию когда оппонент принял предложение ──────────
export const onArenaRematchAccepted = functions.firestore.onDocumentUpdated(
  'arena_sessions/{sessionId}',
  async (event) => {
    const before = event.data?.before.data() as {
      rematchOffer?: { status?: string; newSessionId?: string };
    } | undefined;
    const after = event.data?.after.data() as {
      rematchOffer?: { byUid?: string; byName?: string; status?: string; newSessionId?: string; ttlAt?: number };
      playerIds?: string[];
    } | undefined;
    if (!after?.rematchOffer) return;
    if (after.rematchOffer.status !== 'accepted') return;
    if (after.rematchOffer.newSessionId) return;
    if (before?.rematchOffer?.status === 'accepted' && before.rematchOffer?.newSessionId) return;
    if (!after.playerIds || after.playerIds.length !== 2) return;

    const oldSid = event.params.sessionId as string;
    const newSid = `rematch_${oldSid}_${Date.now()}`;
    const db = admin.firestore();
    const oldSessionRef = event.data!.after.ref;

    let questions: string[];
    try {
      questions = await pickArenaQuestions(PRIVATE_DUEL_QUESTION_COUNT);
    } catch (e) {
      console.error('rematch: pickArenaQuestions failed', e);
      await oldSessionRef.update({ 'rematchOffer.status': 'expired' });
      return;
    }

    // Pre-fetch имена игроков из старой sessionPlayers
    const oldPlayersSnap = await db
      .collection('session_players')
      .where('sessionId', '==', oldSid)
      .get();
    const nameByUid = new Map<string, string>();
    for (const doc of oldPlayersSnap.docs) {
      const d = doc.data() as { playerId?: string; displayName?: string };
      if (d.playerId) nameByUid.set(d.playerId, d.displayName ?? 'Игрок');
    }

    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(oldSessionRef);
      const f = fresh.data() as {
        rematchOffer?: { newSessionId?: string; status?: string };
        playerIds?: string[];
      } | undefined;
      if (!f?.rematchOffer) return;
      if (f.rematchOffer.newSessionId) return;
      if (f.rematchOffer.status !== 'accepted') return;

      const newRef = db.collection('arena_sessions').doc(newSid);
      const tCreated = Date.now();
      tx.set(newRef, {
        id: newSid,
        type: 'rematch',
        size: 2,
        state: 'countdown',
        rankTier: 'bronze',
        playerIds: after.playerIds,
        questions,
        currentQuestionIndex: 0,
        questionStartedAt: null,
        questionTimeoutMs: 40_000,
        createdAt: tCreated,
      });
      for (const uid of after.playerIds!) {
        tx.set(db.collection('session_players').doc(`${newSid}_${uid}`), {
          sessionId: newSid,
          playerId: uid,
          displayName: nameByUid.get(uid) ?? 'Игрок',
          score: 0,
          answers: [],
          lobbyChoice: 'none',
        });
      }
      tx.update(oldSessionRef, { 'rematchOffer.newSessionId': newSid });
    });

    // Запустить countdown как для обычной приватной комнаты
    try {
      await startSessionCountdown(newSid);
    } catch (e) {
      console.error('rematch: startSessionCountdown failed', e);
    }
  },
);

export const questionTimeout = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }
  const authHeader = req.headers.authorization ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const appCheckToken = (req.headers['x-firebase-appcheck'] as string | undefined) ?? '';
  if (!idToken || !appCheckToken) {
    res.status(401).send('Unauthorized');
    return;
  }
  try {
    await admin.auth().verifyIdToken(idToken);
    await admin.appCheck().verifyToken(appCheckToken);
  } catch {
    res.status(401).send('Unauthorized');
    return;
  }

  const { sessionId, questionIndex } = req.body as {
    sessionId: string;
    questionIndex: number;
  };
  if (!sessionId || questionIndex === undefined) {
    res.status(400).send('Bad request');
    return;
  }
  await onQuestionTimeout(sessionId, questionIndex);
  res.send('ok');
});

// ── Community (UGC) packs ─────────────────────────────────────────────────────
export {
  communitySubmitPackForReview,
  communityModerateSubmission,
  communityAdminModeratePack,
  communityFetchPackCardsIfAccessible,
  communityPurchasePack,
  communityListSellerInbox,
  communityMarkSellerInboxSeen,
  communityGetPackRatingSummary,
  communitySubmitPackRating,
} from './community_packs';

export { referralEnsureMyCode, referralApply, referralOnUserProgressUpdated } from './referral';

// ── Admin grant (типизированные награды из админки) ───────────────────────────
export { adminGrantReward } from './admin_grant';
