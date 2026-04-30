"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGrantReward = exports.referralOnUserProgressUpdated = exports.referralApply = exports.referralEnsureMyCode = exports.communitySubmitPackRating = exports.communityGetPackRatingSummary = exports.communityMarkSellerInboxSeen = exports.communityListSellerInbox = exports.communityPurchasePack = exports.communityFetchPackCardsIfAccessible = exports.communityAdminModeratePack = exports.communityModerateSubmission = exports.communitySubmitPackForReview = exports.questionTimeout = exports.onArenaRematchAccepted = exports.onArenaSessionFinished = exports.onAnswerSubmitted = exports.onSessionCountdown = exports.onSessionPlayerLobby = exports.onSessionGetReady = exports.onArenaRoomMatched = exports.matchmakingCron = exports.onMatchmakingWrite = exports.syncLeaderboardCron = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v2"));
const arena_scoring_1 = require("./arena_scoring");
admin.initializeApp();
// These imports must come AFTER initializeApp() — use require to control order
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runMatchmaking, tryMatchForUser, publishMatchmakingSearchingCount } = require('./matchmaking');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { syncLeaderboardFromUsers } = require('./sync_leaderboard');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { onPlayerAnswered, startSessionCountdown, onQuestionTimeout } = require('./game_loop');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { processLobbyAfterChoice } = require('./arena_pregame');
const PRIVATE_DUEL_QUESTION_COUNT = 10;
const LEVELS = ['I', 'II', 'III'];
const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend'];
async function pickArenaQuestions(count) {
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
exports.syncLeaderboardCron = functions.scheduler.onSchedule({ schedule: 'every 2 hours', timeZone: 'UTC' }, async () => { await syncLeaderboardFromUsers(); });
// ─── Matchmaking: instant trigger on queue write ──────────────────────────────
exports.onMatchmakingWrite = functions.firestore.onDocumentWritten('matchmaking_queue/{userId}', async (event) => {
    // tryMatch, потім один publish — клієнт тягне `app_meta/matchmaking_searching` (колекція
    // після матчу скидає «0 у пошуку», бо в доках з’являється sessionId).
    const after = event.data?.after;
    if (after?.exists) {
        const data = after.data();
        if (!data?.sessionId) {
            const userId = event.params.userId;
            try {
                await tryMatchForUser(userId);
            }
            catch {
                // гонка транзакції — нормально
            }
        }
    }
    try {
        await publishMatchmakingSearchingCount();
    }
    catch (e) {
        console.error('publishMatchmakingSearchingCount', e);
    }
});
// ─── Matchmaking: 1-min cron fallback for players who didn't trigger onWrite ──
exports.matchmakingCron = functions.scheduler.onSchedule({ schedule: 'every 1 minutes', timeZone: 'UTC' }, async () => { await runMatchmaking(); });
// ─── Arena room accept flow (server-authoritative session creation) ───────────
exports.onArenaRoomMatched = functions.firestore.onDocumentUpdated('arena_rooms/{roomId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after)
        return;
    if (after.status !== 'matched')
        return;
    if (!after.hostId || !after.guestId)
        return;
    if (after.sessionId)
        return;
    if (before?.status === 'matched' && before?.sessionId)
        return;
    const db = admin.firestore();
    const roomId = event.params.roomId;
    const roomRef = event.data.after.ref;
    const sessionRef = db.collection('arena_sessions').doc(roomId);
    const hostPlayerRef = db.collection('session_players').doc(`${roomId}_${after.hostId}`);
    const guestPlayerRef = db.collection('session_players').doc(`${roomId}_${after.guestId}`);
    const questions = await pickArenaQuestions(PRIVATE_DUEL_QUESTION_COUNT);
    const tPrivate = Date.now();
    await db.runTransaction(async (tx) => {
        const roomSnap = await tx.get(roomRef);
        const sessionSnap = await tx.get(sessionRef);
        if (!roomSnap.exists)
            return;
        const room = roomSnap.data();
        if (room.status !== 'matched' || !room.guestId || !room.hostId)
            return;
        if (room.sessionId || sessionSnap.exists)
            return;
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
            questionTimeoutMs: 40000,
            createdAt: tPrivate,
            acceptDeadlineAt: tPrivate + 45000,
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
});
// ─── Pre-match: get_ready → countdown (через 2.5s після згоди) ──────────────
const GET_READY_TO_COUNTDOWN_MS = 2500;
exports.onSessionGetReady = functions.firestore.onDocumentUpdated('arena_sessions/{sessionId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after || after.state !== 'get_ready')
        return;
    if (before?.state === 'get_ready')
        return;
    const sessionId = event.params.sessionId;
    const ref = event.data.after.ref;
    await new Promise((r) => {
        setTimeout(r, GET_READY_TO_COUNTDOWN_MS);
    });
    const cur = await ref.get();
    const d = cur.data();
    if (d?.state !== 'get_ready')
        return;
    await ref.update({ state: 'countdown' });
});
// ─── Accept / decline на session_players ────────────────────────────────────
exports.onSessionPlayerLobby = functions.firestore.onDocumentUpdated('session_players/{docId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after?.sessionId)
        return;
    if (after.lobbyChoice === before?.lobbyChoice)
        return;
    if (after.lobbyChoice !== 'accept' && after.lobbyChoice !== 'decline')
        return;
    try {
        await processLobbyAfterChoice(after.sessionId);
    }
    catch (e) {
        console.error('processLobbyAfterChoice', e);
    }
});
// ─── Game loop ────────────────────────────────────────────────────────────────
exports.onSessionCountdown = functions.firestore.onDocumentWritten('arena_sessions/{sessionId}', async (event) => {
    const before = event.data?.before.exists ? event.data?.before.data() : null;
    const after = event.data?.after.data();
    if (!after)
        return;
    if (before?.state !== 'countdown' && after.state === 'countdown') {
        await startSessionCountdown(event.params.sessionId);
    }
});
exports.onAnswerSubmitted = functions.firestore.onDocumentUpdated('session_players/{docId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const prevCount = before.answers.length;
    const nextCount = after.answers.length;
    if (nextCount <= prevCount)
        return;
    const lastAnswer = after.answers[nextCount - 1];
    if (!lastAnswer?.questionId)
        return;
    const playerRef = event.data.after.ref;
    const db = admin.firestore();
    const sessionId = after.sessionId;
    await db.runTransaction(async (tx) => {
        const playerSnap = await tx.get(playerRef);
        if (!playerSnap.exists)
            return;
        const playerData = playerSnap.data();
        const answers = [...(playerData.answers || [])];
        if (answers.length === 0)
            return;
        const idx = answers.length - 1;
        const pending = answers[idx];
        if (!pending || pending.questionId !== lastAnswer.questionId)
            return;
        if (pending.serverScored)
            return;
        const previousAnswers = answers.slice(0, idx);
        let previousCorrectStreak = 0;
        for (let i = previousAnswers.length - 1; i >= 0; i -= 1) {
            if (!previousAnswers[i]?.isCorrect)
                break;
            previousCorrectStreak += 1;
        }
        const hasAnyCorrectBefore = previousAnswers.some((a) => a?.isCorrect);
        const questionSnap = await tx.get(db.collection('arena_questions').doc(lastAnswer.questionId));
        const correct = questionSnap.exists ? questionSnap.data()?.correct : undefined;
        if (!correct)
            return;
        const { isCorrect, points, bonus } = (0, arena_scoring_1.calculateArenaPoints)((pending.answer ?? null), correct, typeof pending.timeMs === 'number' ? pending.timeMs : 0, {
            previousCorrectStreak,
            hasAnyCorrectBefore,
        });
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
});
// ─── Arena results finalization (server-authoritative) ───────────────────────
exports.onArenaSessionFinished = functions.firestore.onDocumentUpdated('arena_sessions/{sessionId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after)
        return;
    if (after.state !== 'finished')
        return;
    if (before?.state === 'finished' && after.resultProcessedAt)
        return;
    if (!after.playerIds || after.playerIds.length === 0)
        return;
    const db = admin.firestore();
    const sessionId = event.params.sessionId;
    const sessionRef = event.data.after.ref;
    const DRAW_XP = 30;
    await db.runTransaction(async (tx) => {
        const freshSession = await tx.get(sessionRef);
        const freshData = freshSession.data();
        if (!freshSession.exists || freshData?.resultProcessedAt)
            return;
        const forfeitedUid = typeof freshData?.forfeitedBy === 'string' && freshData.forfeitedBy.trim()
            ? freshData.forfeitedBy.trim()
            : '';
        // Firestore transaction rule: all reads must happen before any writes.
        // Считываем игроков внутри transaction, чтобы не ловить устаревшие score
        // в момент финализации (иначе won/isLast может считаться неверно).
        const playerIds = Array.isArray(after.playerIds) ? after.playerIds.filter(Boolean) : [];
        if (playerIds.length === 0)
            return;
        const playerSnapByUid = new Map();
        for (const uid of playerIds) {
            const playerRef = db.collection('session_players').doc(`${sessionId}_${uid}`);
            playerSnapByUid.set(uid, await tx.get(playerRef));
        }
        const players = [];
        for (const uid of playerIds) {
            const d = playerSnapByUid.get(uid)?.data();
            if (!d?.playerId)
                continue;
            players.push({
                playerId: d.playerId,
                displayName: d.displayName,
                score: Number(d.score ?? 0),
            });
        }
        if (players.length === 0)
            return;
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
        const profileRefByUid = new Map();
        for (const p of players) {
            if (!p.playerId)
                continue;
            profileRefByUid.set(p.playerId, db.collection('arena_profiles').doc(p.playerId));
        }
        const profileSnapByUid = new Map();
        for (const [uid, ref] of profileRefByUid) {
            profileSnapByUid.set(uid, await tx.get(ref));
        }
        const sessionUpdate = { resultProcessedAt: Date.now() };
        for (const p of players) {
            const uid = p.playerId;
            if (!uid)
                continue;
            const pScore = Number(p.score ?? 0);
            let isDraw = isDrawAtTop && pScore === topScore;
            let won = !isDraw && pScore === topScore;
            let isLast = !isDraw && pScore === lastScore && pScore !== topScore;
            if (forfeitedUid && playerIds.includes(forfeitedUid)) {
                if (uid === forfeitedUid) {
                    isDraw = false;
                    won = false;
                    isLast = true;
                }
                else {
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
            if (!profileSnap)
                continue;
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
            }
            else {
                const data = profileSnap.data();
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
                    const li = LEVELS.indexOf(oldLevel);
                    if (li < LEVELS.length - 1 && li >= 0) {
                        newLevel = LEVELS[li + 1];
                    }
                    else {
                        newLevel = LEVELS[0];
                        const ti = TIERS.indexOf(oldTier);
                        if (ti < TIERS.length - 1 && ti >= 0)
                            newTier = TIERS[ti + 1];
                    }
                }
                else if (newStars < 0) {
                    newStars = 2;
                    const li = LEVELS.indexOf(oldLevel);
                    if (li > 0) {
                        newLevel = LEVELS[li - 1];
                    }
                    else {
                        const ti = TIERS.indexOf(oldTier);
                        if (ti > 0) {
                            newTier = TIERS[ti - 1];
                            newLevel = LEVELS[LEVELS.length - 1];
                        }
                        else {
                            newStars = 0;
                        }
                    }
                }
                rankChanged = newTier !== oldTier || newLevel !== oldLevel;
                promoted = rankChanged && (TIERS.indexOf(newTier) > TIERS.indexOf(oldTier)
                    || (newTier === oldTier && LEVELS.indexOf(newLevel) > LEVELS.indexOf(oldLevel)));
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
                    if (!profileSnap.exists)
                        return false;
                    const data = profileSnap.data();
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
});
// ─── Rematch: создать новую сессию когда оппонент принял предложение ──────────
exports.onArenaRematchAccepted = functions.firestore.onDocumentUpdated('arena_sessions/{sessionId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after?.rematchOffer)
        return;
    if (after.rematchOffer.status !== 'accepted')
        return;
    if (after.rematchOffer.newSessionId)
        return;
    if (before?.rematchOffer?.status === 'accepted' && before.rematchOffer?.newSessionId)
        return;
    if (!after.playerIds || after.playerIds.length !== 2)
        return;
    const oldSid = event.params.sessionId;
    const newSid = `rematch_${oldSid}_${Date.now()}`;
    const db = admin.firestore();
    const oldSessionRef = event.data.after.ref;
    let questions;
    try {
        questions = await pickArenaQuestions(PRIVATE_DUEL_QUESTION_COUNT);
    }
    catch (e) {
        console.error('rematch: pickArenaQuestions failed', e);
        await oldSessionRef.update({ 'rematchOffer.status': 'expired' });
        return;
    }
    // Pre-fetch имена игроков из старой sessionPlayers
    const oldPlayersSnap = await db
        .collection('session_players')
        .where('sessionId', '==', oldSid)
        .get();
    const nameByUid = new Map();
    for (const doc of oldPlayersSnap.docs) {
        const d = doc.data();
        if (d.playerId)
            nameByUid.set(d.playerId, d.displayName ?? 'Игрок');
    }
    await db.runTransaction(async (tx) => {
        const fresh = await tx.get(oldSessionRef);
        const f = fresh.data();
        if (!f?.rematchOffer)
            return;
        if (f.rematchOffer.newSessionId)
            return;
        if (f.rematchOffer.status !== 'accepted')
            return;
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
            questionTimeoutMs: 40000,
            createdAt: tCreated,
        });
        for (const uid of after.playerIds) {
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
    }
    catch (e) {
        console.error('rematch: startSessionCountdown failed', e);
    }
});
exports.questionTimeout = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }
    const authHeader = req.headers.authorization ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const appCheckToken = req.headers['x-firebase-appcheck'] ?? '';
    if (!idToken || !appCheckToken) {
        res.status(401).send('Unauthorized');
        return;
    }
    try {
        await admin.auth().verifyIdToken(idToken);
        await admin.appCheck().verifyToken(appCheckToken);
    }
    catch {
        res.status(401).send('Unauthorized');
        return;
    }
    const { sessionId, questionIndex } = req.body;
    if (!sessionId || questionIndex === undefined) {
        res.status(400).send('Bad request');
        return;
    }
    await onQuestionTimeout(sessionId, questionIndex);
    res.send('ok');
});
// ── Community (UGC) packs ─────────────────────────────────────────────────────
var community_packs_1 = require("./community_packs");
Object.defineProperty(exports, "communitySubmitPackForReview", { enumerable: true, get: function () { return community_packs_1.communitySubmitPackForReview; } });
Object.defineProperty(exports, "communityModerateSubmission", { enumerable: true, get: function () { return community_packs_1.communityModerateSubmission; } });
Object.defineProperty(exports, "communityAdminModeratePack", { enumerable: true, get: function () { return community_packs_1.communityAdminModeratePack; } });
Object.defineProperty(exports, "communityFetchPackCardsIfAccessible", { enumerable: true, get: function () { return community_packs_1.communityFetchPackCardsIfAccessible; } });
Object.defineProperty(exports, "communityPurchasePack", { enumerable: true, get: function () { return community_packs_1.communityPurchasePack; } });
Object.defineProperty(exports, "communityListSellerInbox", { enumerable: true, get: function () { return community_packs_1.communityListSellerInbox; } });
Object.defineProperty(exports, "communityMarkSellerInboxSeen", { enumerable: true, get: function () { return community_packs_1.communityMarkSellerInboxSeen; } });
Object.defineProperty(exports, "communityGetPackRatingSummary", { enumerable: true, get: function () { return community_packs_1.communityGetPackRatingSummary; } });
Object.defineProperty(exports, "communitySubmitPackRating", { enumerable: true, get: function () { return community_packs_1.communitySubmitPackRating; } });
var referral_1 = require("./referral");
Object.defineProperty(exports, "referralEnsureMyCode", { enumerable: true, get: function () { return referral_1.referralEnsureMyCode; } });
Object.defineProperty(exports, "referralApply", { enumerable: true, get: function () { return referral_1.referralApply; } });
Object.defineProperty(exports, "referralOnUserProgressUpdated", { enumerable: true, get: function () { return referral_1.referralOnUserProgressUpdated; } });
// ── Admin grant (типизированные награды из админки) ───────────────────────────
var admin_grant_1 = require("./admin_grant");
Object.defineProperty(exports, "adminGrantReward", { enumerable: true, get: function () { return admin_grant_1.adminGrantReward; } });
//# sourceMappingURL=index.js.map