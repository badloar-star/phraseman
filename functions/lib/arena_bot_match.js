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
exports.arenaBotMatchRecord = void 0;
/**
 * arenaBotMatchRecord — серверная запись результата БОТ-матча (Admin SDK).
 *
 * Зачем серверно: правила Firestore запрещают клиенту писать arena_profiles
 * (`allow write: if false`), поэтому прежняя клиентская запись бот-матчей молча
 * падала. Эта CF пишет ранг/XP/SR бот-матча от имени сервера (минует rules),
 * только в СВОЙ профиль (request.auth.uid) — никакой накрутки чужого.
 *
 * Математика — та же, что у PvP: applyStarDelta (ниже потолка) +
 * applySeasonRatingDelta (на Легенде III, бот = половина SR). Один источник правды.
 */
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const arena_rank_progression_1 = require("./arena_rank_progression");
const arena_season_1 = require("./arena_season");
const arena_season_config_1 = require("./arena_season_config");
const REGION = 'us-central1';
const DRAW_XP = 30;
const PLACEHOLDER_NAMES = new Set([
    'Игрок', 'Гравець', 'Jugador', 'Player', 'Соперник', 'Суперник', 'Opponent',
]);
function cleanName(raw) {
    const dn = String(raw ?? '').trim();
    if (!dn || PLACEHOLDER_NAMES.has(dn))
        return null;
    return dn.slice(0, 120);
}
function readNumber(raw, fallback = 0) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : fallback;
}
function readRank(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    return {
        tier: String(r.tier ?? 'bronze'),
        level: String(r.level ?? 'I'),
        stars: Math.max(0, Math.trunc(readNumber(r.stars, 0))),
    };
}
function replayBotMatchResult(history, profile) {
    const before = readRank(history.rankBefore);
    const after = readRank(history.rankAfter);
    const rankChanged = after.tier !== before.tier || after.level !== before.level;
    return {
        xpDelta: Math.max(0, Math.trunc(readNumber(history.xpGained, 0))),
        oldStars: before.stars,
        newStars: after.stars,
        oldTier: before.tier,
        newTier: after.tier,
        oldLevel: before.level,
        newLevel: after.level,
        rankChanged,
        promoted: rankChanged && (0, arena_season_1.rankIndex)(after.tier, after.level) > (0, arena_season_1.rankIndex)(before.tier, before.level),
        sr: readNumber(profile.sr, 0),
        peakSR: readNumber(profile.peakSR, 0),
        idempotentReplay: true,
    };
}
exports.arenaBotMatchRecord = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const uid = request.auth.uid; // запись ТОЛЬКО в свой профиль
    const d = (request.data ?? {});
    const sessionId = String(d.sessionId ?? '').trim();
    const won = d.won === true;
    const isLast = d.isLast === true;
    const isDraw = d.isDraw === true;
    const myScore = Math.max(0, Math.trunc(Number(d.myScore ?? 0)));
    const oppScore = Math.max(0, Math.trunc(Number(d.oppScore ?? 0)));
    const oppName = String(d.oppName ?? 'Соперник').slice(0, 120);
    const incomingName = cleanName(d.myName);
    if (!sessionId)
        throw new https_1.HttpsError('invalid-argument', 'session_required');
    const db = admin.firestore();
    const profileRef = db.collection('arena_profiles').doc(uid);
    const xpDelta = isDraw ? DRAW_XP : (won ? 50 : 15);
    const nowSeasonId = (0, arena_season_1.seasonIdForDate)(new Date());
    const outcome = isDraw ? 'draw' : won ? 'win' : isLast ? 'loss' : 'neutral';
    // Тюнинг SR из Firestore (fallback = дефолты). Читаем до транзакции.
    const seasonCfg = await (0, arena_season_config_1.resolveArenaSeasonConfig)(db);
    const historyRef = profileRef.collection('match_history').doc(sessionId);
    const result = await db.runTransaction(async (tx) => {
        const [snap, historySnap] = await Promise.all([
            tx.get(profileRef),
            tx.get(historyRef),
        ]);
        const data = (snap.exists ? snap.data() : {});
        if (historySnap.exists) {
            return replayBotMatchResult(historySnap.data() ?? {}, data);
        }
        const oldStars = data.rank?.stars ?? 0;
        const oldTier = data.rank?.tier ?? 'bronze';
        const oldLevel = data.rank?.level ?? 'I';
        const wasCeiling = oldTier === 'legend' && oldLevel === 'III';
        // На потолке звёзды не двигаем — работает SR.
        const starDelta = isDraw ? 0 : (won ? 1 : isLast ? -1 : 0);
        const progressed = (0, arena_rank_progression_1.applyStarDelta)({ tier: oldTier, level: oldLevel, stars: oldStars }, wasCeiling ? 0 : starDelta);
        const newTier = progressed.tier;
        const newLevel = progressed.level;
        const newStars = progressed.stars;
        const staleSeason = data.seasonId !== nowSeasonId;
        const curSr = staleSeason ? 0 : (data.sr ?? 0);
        const curPeak = staleSeason ? 0 : (data.peakSR ?? 0);
        const curPeakRankIdx = staleSeason ? 0 : (data.seasonPeakRankIndex ?? 0);
        const sr = wasCeiling
            ? (0, arena_season_1.applySeasonRatingDelta)(curSr, curPeak, outcome, true, seasonCfg) // бот = половина победы
            : { sr: curSr, peakSR: curPeak };
        const newPeakRankIdx = Math.max(curPeakRankIdx, (0, arena_season_1.rankIndex)(newTier, newLevel));
        const curStreak = data.stats?.winStreak ?? 0;
        const bestStreak = data.stats?.bestWinStreak ?? 0;
        const newStreak = won ? curStreak + 1 : isDraw ? curStreak : 0;
        const rankChanged = newTier !== oldTier || newLevel !== oldLevel;
        const promoted = rankChanged && (0, arena_season_1.rankIndex)(newTier, newLevel) > (0, arena_season_1.rankIndex)(oldTier, oldLevel);
        const update = {
            userId: uid,
            'rank.tier': newTier, 'rank.level': newLevel, 'rank.stars': newStars,
            sr: sr.sr, peakSR: sr.peakSR, seasonId: nowSeasonId, seasonPeakRankIndex: newPeakRankIdx,
            xp: (data.xp ?? 0) + xpDelta,
            'stats.matchesPlayed': (data.stats?.matchesPlayed ?? 0) + 1,
            'stats.matchesWon': (data.stats?.matchesWon ?? 0) + (won ? 1 : 0),
            'stats.totalScore': (data.stats?.totalScore ?? 0) + myScore,
            'stats.winStreak': newStreak,
            'stats.bestWinStreak': Math.max(bestStreak, newStreak),
            updatedAt: Date.now(),
        };
        if (incomingName)
            update.displayName = incomingName;
        tx.set(profileRef, update, { merge: true });
        if (wasCeiling) {
            tx.set(db.collection('arena_season_leaderboard').doc(nowSeasonId).collection('entries').doc(uid), { uid, sr: sr.sr, peakSR: sr.peakSR, updatedAt: Date.now() }, { merge: true });
        }
        // История матча (раньше писалась с клиента — теперь серверно).
        tx.set(historyRef, {
            sessionId,
            createdAt: Date.now(), oppName, myScore, oppScore, won, isDraw,
            xpGained: xpDelta,
            starsChange: rankChanged ? (promoted ? 1 : -1) : newStars - oldStars,
            rankBefore: { tier: oldTier, level: oldLevel, stars: oldStars },
            rankAfter: { tier: newTier, level: newLevel, stars: newStars },
            isBot: true,
        }, { merge: true });
        return {
            xpDelta,
            oldStars, newStars, oldTier, newTier, oldLevel, newLevel,
            rankChanged, promoted,
            sr: sr.sr, peakSR: sr.peakSR,
        };
    });
    return result;
});
//# sourceMappingURL=arena_bot_match.js.map