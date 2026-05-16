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
exports.arenaClubWarContribute = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const REGION = 'us-central1';
function readInt(value, fallback = 0) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) ? n : fallback;
}
function cleanName(name) {
    const s = String(name ?? '').replace(/\s+/g, ' ').trim();
    return (s || 'Phraseman').slice(0, 80);
}
function safeDocId(s) {
    return String(s || 'x').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'x';
}
function getWeekId() {
    const d = new Date();
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
function calcClubArenaPoints(params) {
    const score = Math.max(0, Math.min(20000, readInt(params.score, 0)));
    const total = Math.max(0, Math.min(100, readInt(params.totalQuestions, 0)));
    const correct = Math.max(0, Math.min(total, readInt(params.correctAnswers, 0)));
    const perfect = total > 0 && correct >= total;
    return { points: score + (params.won ? 250 : 0) + (perfect ? 150 : 0), perfect };
}
async function resolveStableUid(db, authUid) {
    const direct = await db.collection('users').doc(authUid).get().catch(() => null);
    if (direct?.exists)
        return authUid;
    const byAuth = await db.collection('users').where('firebaseAuthUid', '==', authUid).limit(1).get();
    if (!byAuth.empty)
        return byAuth.docs[0].id;
    return authUid;
}
async function assertNotBanned(db, stableUid) {
    const [userSnap, bannedSnap] = await Promise.all([
        db.collection('users').doc(stableUid).get().catch(() => null),
        db.collection('banned_users').doc(stableUid).get().catch(() => null),
    ]);
    if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
        throw new https_1.HttpsError('permission-denied', 'user_banned');
    }
}
function answerStats(player, session) {
    const answers = Array.isArray(player?.answers) ? player.answers : [];
    const correctAnswers = answers.filter((a) => a?.isCorrect === true).length;
    const sessionQuestions = Array.isArray(session?.questions) ? session.questions.length : 0;
    const totalQuestions = Math.max(sessionQuestions, answers.length);
    return { correctAnswers, totalQuestions };
}
exports.arenaClubWarContribute = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUid(db, authUid);
    await assertNotBanned(db, stableUid);
    const sessionId = String(request.data?.sessionId ?? '').trim();
    if (!sessionId || sessionId.length > 180)
        throw new https_1.HttpsError('invalid-argument', 'session_required');
    const weekId = getWeekId();
    const lbSnap = await db.collection('leaderboard').doc(stableUid).get();
    const lb = lbSnap.data() || {};
    const groupId = String(lb.groupId ?? '').trim();
    const groupWeekId = String(lb.groupWeekId ?? lb.weekId ?? '').trim();
    const leagueId = Math.max(0, readInt(lb.leagueId, 0));
    if (!groupId || groupWeekId !== weekId)
        return { ok: false, status: 'no_current_group' };
    const sessionRef = db.collection('arena_sessions').doc(sessionId);
    const playerRef = db.collection('session_players').doc(`${sessionId}_${authUid}`);
    const eventId = `${weekId}_${safeDocId(groupId)}`;
    const contributionId = `${weekId}_${safeDocId(sessionId)}_${safeDocId(stableUid)}`;
    const eventRef = db.collection('arena_club_events').doc(eventId);
    const contributionRef = db.collection('arena_club_contributions').doc(contributionId);
    const now = Date.now();
    return db.runTransaction(async (tx) => {
        const [sessionSnap, playerSnap, existingSnap, eventSnap] = await Promise.all([
            tx.get(sessionRef),
            tx.get(playerRef),
            tx.get(contributionRef),
            tx.get(eventRef),
        ]);
        if (existingSnap.exists) {
            return {
                ok: true,
                duplicate: true,
                weekId,
                groupId,
                leagueId,
                addedPoints: 0,
                totalPoints: Math.max(0, readInt(eventSnap.data()?.totalPoints, 0)),
            };
        }
        if (!sessionSnap.exists || !playerSnap.exists)
            throw new https_1.HttpsError('not-found', 'arena_session_not_found');
        const session = sessionSnap.data() || {};
        const player = playerSnap.data() || {};
        if (session.state !== 'finished')
            throw new https_1.HttpsError('failed-precondition', 'session_not_finished');
        const playerIds = Array.isArray(session.playerIds) ? session.playerIds.filter(Boolean) : [];
        if (!playerIds.includes(authUid) || player.playerId !== authUid) {
            throw new https_1.HttpsError('permission-denied', 'not_session_player');
        }
        if (typeof session.forfeitedBy === 'string' && session.forfeitedBy === authUid) {
            return { ok: false, status: 'forfeited', weekId, groupId, leagueId };
        }
        const playerDocs = [];
        for (const uid of playerIds) {
            const snap = uid === authUid ? playerSnap : await tx.get(db.collection('session_players').doc(`${sessionId}_${uid}`));
            playerDocs.push({ uid, score: Math.max(0, readInt(snap.data()?.score, 0)) });
        }
        const myScore = Math.max(0, readInt(player.score, 0));
        const topScore = Math.max(...playerDocs.map((p) => p.score), 0);
        const tiedTop = playerDocs.filter((p) => p.score === topScore).length > 1;
        const won = !tiedTop && myScore === topScore && !session.forfeitedBy;
        const { correctAnswers, totalQuestions } = answerStats(player, session);
        const { points, perfect } = calcClubArenaPoints({ score: myScore, won, correctAnswers, totalQuestions });
        if (points <= 0)
            return { ok: false, status: 'no_points', weekId, groupId, leagueId };
        const currentTotal = Math.max(0, readInt(eventSnap.data()?.totalPoints, 0));
        tx.set(eventRef, {
            weekId,
            groupId,
            leagueId,
            totalPoints: admin.firestore.FieldValue.increment(points),
            totalScore: admin.firestore.FieldValue.increment(myScore),
            wins: admin.firestore.FieldValue.increment(won ? 1 : 0),
            matches: admin.firestore.FieldValue.increment(1),
            perfectRounds: admin.firestore.FieldValue.increment(perfect ? 1 : 0),
            updatedAt: now,
            [`members.${stableUid}.uid`]: stableUid,
            [`members.${stableUid}.arenaUid`]: authUid,
            [`members.${stableUid}.name`]: cleanName(player.displayName),
            [`members.${stableUid}.points`]: admin.firestore.FieldValue.increment(points),
            [`members.${stableUid}.score`]: admin.firestore.FieldValue.increment(myScore),
            [`members.${stableUid}.wins`]: admin.firestore.FieldValue.increment(won ? 1 : 0),
            [`members.${stableUid}.matches`]: admin.firestore.FieldValue.increment(1),
            [`members.${stableUid}.perfectRounds`]: admin.firestore.FieldValue.increment(perfect ? 1 : 0),
            [`members.${stableUid}.updatedAt`]: now,
        }, { merge: true });
        tx.set(contributionRef, {
            weekId,
            groupId,
            leagueId,
            stableUid,
            arenaUid: authUid,
            sessionId,
            name: cleanName(player.displayName),
            score: myScore,
            points,
            won,
            perfect,
            correctAnswers,
            totalQuestions,
            createdAt: now,
        });
        return {
            ok: true,
            weekId,
            groupId,
            leagueId,
            addedPoints: points,
            totalPoints: currentTotal + points,
        };
    });
});
//# sourceMappingURL=arena_club_wars.js.map